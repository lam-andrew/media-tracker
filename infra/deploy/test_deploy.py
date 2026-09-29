import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import deploy
from release import migration_hash


def manifest(commit="a", sequence=2, migration="c"):
    return {"version": 1, "commit": commit * 40, "sequence": sequence,
            "migrations": migration * 64,
            "images": {name: deploy.PREFIX + "-" + name + "@sha256:" + "d" * 64
                       for name in ("api", "web")}}


class ReleaseTests(unittest.TestCase):
    def test_digest_pinning(self):
        deploy.validate(manifest())
        for invalid in ("alpine:latest", deploy.PREFIX + "-api:latest",
                        "ghcr.io/attacker/api@sha256:" + "d" * 64):
            candidate = manifest()
            candidate["images"]["api"] = invalid
            with self.assertRaises(ValueError):
                deploy.validate(candidate)

    def test_invalid_metadata(self):
        for key, value in (("version", 2), ("sequence", True), ("sequence", -1),
                           ("commit", "../../config"), ("migrations", "")):
            candidate = manifest()
            candidate[key] = value
            with self.assertRaises(ValueError):
                deploy.validate(candidate)

    def test_decisions(self):
        current = manifest("b", 1)
        self.assertEqual(deploy.decision(current, manifest()), "deploy")
        self.assertEqual(deploy.decision(current, manifest("b")), "unchanged")
        self.assertEqual(deploy.decision(current, manifest(sequence=1)), "older")
        self.assertEqual(deploy.decision(current, manifest(migration="e")), "migration-review")

    def test_fingerprint_detects_name_and_content(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "001.sql"
            path.write_text("select 1;")
            first = migration_hash(temp)
            self.assertEqual(first, migration_hash(temp))
            path.write_text("select 2;")
            self.assertNotEqual(first, migration_hash(temp))
            path.rename(Path(temp) / "002.sql")
            self.assertNotEqual(first, migration_hash(temp))


class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.state = Path(self.directory.name)
        self.state_patch = patch.object(deploy, "STATE", self.state)
        self.state_patch.start()
        self.addCleanup(self.state_patch.stop)
        self.current = manifest("b", 1)
        self.target = manifest()
        self.calls = []

    def compose(self, release, *args, **kwargs):
        self.calls.append(args)
        if "pg_dump" in args:
            kwargs["stdout"].write(b"PGDMP-test-fixture")

    def test_success_backs_up_before_activate(self):
        def activate(release):
            self.assertTrue(list((self.state / "backups").glob("*.dump")))
            self.assertIn(("stop", "web", "api"), self.calls)
        with patch.object(deploy, "run"), patch.object(deploy, "compose", side_effect=self.compose), \
                patch.object(deploy, "activate", side_effect=activate), patch.object(deploy, "notify"):
            deploy.deploy(self.current, self.target)
        self.assertEqual(json.loads((self.state / "current.json").read_text()), self.target)
        self.assertFalse((self.state / "pending.json").exists())

    def test_failure_restores_previous_images_and_quarantines(self):
        with patch.object(deploy, "run"), patch.object(deploy, "compose", side_effect=self.compose), \
                patch.object(deploy, "activate", side_effect=[RuntimeError(), None]) as activate, \
                patch.object(deploy, "notify"):
            with self.assertRaises(RuntimeError):
                deploy.deploy(self.current, self.target)
        self.assertEqual(activate.call_args_list[1].args[0], self.current)
        self.assertTrue((self.state / "failed.json").exists())
        self.assertFalse((self.state / "pending.json").exists())

    def test_failed_recovery_keeps_pending_marker(self):
        with patch.object(deploy, "run"), patch.object(deploy, "compose", side_effect=self.compose), \
                patch.object(deploy, "activate", side_effect=RuntimeError()), patch.object(deploy, "notify"):
            with self.assertRaises(RuntimeError):
                deploy.deploy(self.current, self.target)
        self.assertTrue((self.state / "pending.json").exists())

    def test_schema_change_never_touches_docker(self):
        target = copy.deepcopy(self.target)
        target["migrations"] = "e" * 64
        with patch.object(deploy, "run") as run:
            with self.assertRaises(ValueError):
                deploy.deploy(self.current, target)
            run.assert_not_called()

    def test_pull_failure_leaves_running_app_alone(self):
        with patch.object(deploy, "run", side_effect=RuntimeError()), \
                patch.object(deploy, "compose") as compose:
            with self.assertRaises(RuntimeError):
                deploy.deploy(self.current, self.target)
            compose.assert_not_called()
        self.assertFalse((self.state / "pending.json").exists())

    def test_low_disk_space_never_stops_app(self):
        with patch.object(deploy.shutil, "disk_usage") as disk, patch.object(deploy, "run") as run:
            disk.return_value.free = 100
            with self.assertRaises(RuntimeError):
                deploy.deploy(self.current, self.target)
            run.assert_not_called()


if __name__ == "__main__":
    unittest.main()
