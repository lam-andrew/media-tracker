"""Small pull-only controller. Installed/reviewed separately from app releases.

Never evaluates registry content as shell code, downloads deployment scripts, or
updates Postgres. Requires an explicitly adopted baseline and operator enable file.
"""

import argparse
import fcntl
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request

from release import migration_hash

CONFIG = Path("/etc/marqd-deploy")
STATE = Path("/var/lib/marqd-deploy")
PREFIX = "ghcr.io/lam-andrew/media-tracker"
PROJECT = "marqd-v2"  # Compatibility identifier: preserves existing DB/volume.


def run(args, **kwargs):
    # Do not echo commands/output: Docker/Compose errors can contain config data.
    result = subprocess.run(args, timeout=600, stderr=subprocess.PIPE,
                            stdout=kwargs.pop("stdout", subprocess.PIPE), **kwargs)
    if result.returncode:
        raise RuntimeError(f"{args[0]} operation failed (exit {result.returncode}); inspect locally")
    return result.stdout.decode().strip() if result.stdout else ""


def save(path, data):
    temp = path.with_suffix(".tmp")
    temp.write_text(json.dumps(data, indent=2) + "\n")
    temp.chmod(0o600)
    temp.replace(path)


def validate(manifest):
    if manifest.get("version") != 1:
        raise ValueError("Unsupported release format")
    for key, length in (("commit", 40), ("migrations", 64)):
        if not isinstance(manifest.get(key), str) or not re.fullmatch(f"[0-9a-f]{{{length}}}", manifest[key]):
            raise ValueError(f"Invalid {key}")
    if type(manifest.get("sequence")) is not int or manifest["sequence"] < 1:
        raise ValueError("Invalid release sequence")
    for service in ("api", "web"):
        expected = re.escape(PREFIX + "-" + service) + r"@sha256:[0-9a-f]{64}"
        if not re.fullmatch(expected, manifest.get("images", {}).get(service, "")):
            raise ValueError("Release references an unexpected or unpinned image")
    return manifest


def decision(current, target):
    if target["commit"] == current["commit"]:
        return "unchanged"
    if target["sequence"] <= current["sequence"]:
        return "older"
    if target["migrations"] != current["migrations"]:
        return "migration-review"
    return "deploy"


def compose(release, *args, **kwargs):
    env = dict(os.environ, MARQD_API_IMAGE=release["images"]["api"],
               MARQD_WEB_IMAGE=release["images"]["web"])
    return run(["docker", "compose", "--project-name", PROJECT,
                "--env-file", str(CONFIG / "app.env"), "-f", str(CONFIG / "compose.yaml"),
                *args], env=env, **kwargs)


def notify(message):
    print(message, flush=True)
    hook = CONFIG / "discord-webhook"
    if not hook.exists():
        return
    # Only fixed operational messages and commit IDs, never URLs/exception bodies.
    url = hook.read_text().strip()
    if not re.fullmatch(r"https://discord\.com/api/webhooks/[0-9]+/[A-Za-z0-9_-]+", url):
        print("Discord notification configuration invalid", flush=True)
        return
    request = urllib.request.Request(url, data=json.dumps({"content": message}).encode(),
                                     headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            response.read()
    except Exception:
        print("Discord delivery failed; inspect locally", flush=True)


def candidate():
    channel = PREFIX + "-release:homelab"
    run(["docker", "pull", channel])
    image_id = run(["docker", "image", "inspect", "--format", "{{.Id}}", channel])
    # Create but NEVER START this scratch container: extract data, not executable code.
    container = run(["docker", "create", image_id, "/unused"])
    try:
        with tempfile.TemporaryDirectory() as temp:
            destination = Path(temp) / "release.json"
            run(["docker", "cp", container + ":/release.json", str(destination)])
            if destination.stat().st_size > 16384:
                raise ValueError("Oversized release manifest")
            return validate(json.loads(destination.read_text()))
    finally:
        run(["docker", "rm", container])


def healthy():
    for path in ("healthz", "api/health"):
        with urllib.request.urlopen("http://127.0.0.1:3200/" + path, timeout=10) as response:
            if response.status != 200:
                raise RuntimeError("Marqd health check failed")
            if path == "api/health" and json.load(response).get("status") != "ok":
                raise RuntimeError("Marqd database health check failed")


def activate(release):
    # Recreate web too: nginx must resolve the recreated API's new Docker address.
    compose(release, "up", "-d", "--no-build", "--no-deps", "--force-recreate",
            "--pull", "never", "--wait", "--wait-timeout", "120", "api", "web")
    healthy()


def deploy(current, target):
    if decision(current, target) != "deploy":
        raise ValueError("Release is not eligible for automatic deployment")
    if shutil.disk_usage(STATE).free < 2 * 1024**3:
        raise RuntimeError("Less than 2 GiB free; refusing deployment")
    for image in target["images"].values():
        run(["docker", "pull", image])
    # Record an interrupted deployment before touching application containers.
    # On crash/reboot a pending marker blocks automatic retries for operator review.
    save(STATE / "pending.json", target)
    try:
        compose(current, "stop", "web", "api")
        backup = STATE / "backups" / (time.strftime("%Y%m%dT%H%M%SZ", time.gmtime()) + ".dump")
        backup.parent.mkdir(mode=0o700, exist_ok=True)
        with backup.open("xb") as output:
            compose(current, "exec", "-T", "db", "pg_dump", "-U", "marqd", "-d", "marqd_v2", "-Fc", stdout=output)
        with backup.open("rb") as data:
            if data.read(5) != b"PGDMP":
                raise RuntimeError("Database dump header invalid")
        # This checks archive readability, not a full restore rehearsal.
        with backup.open("rb") as data:
            compose(current, "exec", "-T", "db", "pg_restore", "--list", stdin=data)
        save(STATE / "previous.json", current)
        activate(target)
    except Exception:
        try:
            activate(current)  # Only allowed because migration fingerprints match.
        except Exception:
            notify("Marqd deployment and recovery failed; operator action required.")
            raise RuntimeError("Recovery failed; pending deployment left for review") from None
        save(STATE / "failed.json", target)
        (STATE / "pending.json").unlink()
        notify("Marqd update failed; previous application images restored.")
        raise RuntimeError("Deployment failed and was rolled back") from None
    save(STATE / "current.json", target)
    (STATE / "pending.json").unlink()
    notify("Marqd deployed successfully: " + target["commit"][:12])


def adopt(directory, commit):
    if (STATE / "current.json").exists() or (CONFIG / "enabled").exists():
        raise ValueError("Baseline already adopted or automation enabled")
    if not re.fullmatch(r"[0-9a-f]{40}", commit):
        raise ValueError("Invalid baseline commit")
    if not list(Path(directory).glob("*.sql")):
        raise ValueError("Baseline migration directory is empty")
    images = {}
    for service in ("api", "web"):
        images[service] = run(["docker", "inspect", "--format", "{{.Image}}", f"{PROJECT}-{service}-1"])
        if not re.fullmatch(r"sha256:[0-9a-f]{64}", images[service]):
            raise ValueError("Invalid running image ID")
    healthy()
    save(STATE / "current.json", {"version": 1, "commit": commit, "sequence": 0,
                                "migrations": migration_hash(directory), "images": images})
    print("Running images adopted; automation remains disabled")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--adopt", metavar="MIGRATIONS_DIRECTORY")
    parser.add_argument("--commit")
    args = parser.parse_args()
    os.umask(0o077)
    STATE.mkdir(mode=0o700, parents=True, exist_ok=True)
    with (STATE / "lock").open("w") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return
        if args.adopt:
            adopt(args.adopt, args.commit or "")
            return
        if not (CONFIG / "enabled").exists():
            print("Automatic deployment disabled")
            return
        if (STATE / "pending.json").exists():
            raise RuntimeError("Interrupted deployment requires operator review")
        current = json.loads((STATE / "current.json").read_text())
        target = candidate()
        failed = STATE / "failed.json"
        if failed.exists() and json.loads(failed.read_text())["commit"] == target["commit"]:
            print("Failed release quarantined; waiting for a new commit or operator review")
            return
        action = decision(current, target)
        if action == "migration-review":
            review = STATE / "migration-review.json"
            if not review.exists() or json.loads(review.read_text())["commit"] != target["commit"]:
                save(review, target)
                notify("Marqd update held for database migration review: " + target["commit"][:12])
        elif action == "deploy":
            deploy(current, target)
        else:
            print("No newer eligible Marqd release")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        # Do not print exception content: it could contain secrets returned by tools.
        notify("Marqd deployment check failed (" + type(error).__name__ + "); inspect locally.")
        sys.exit(1)
