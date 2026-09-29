"""Build a non-secret manifest; never copy server configuration into images."""

import hashlib
import json
import os
from pathlib import Path


def migration_hash(directory):
    digest = hashlib.sha256()
    for path in sorted(Path(directory).glob("*.sql")):
        digest.update(path.name.encode() + b"\0" + path.read_bytes() + b"\0")
    return digest.hexdigest()


if __name__ == "__main__":
    prefix = os.environ["IMAGE_PREFIX"]
    print(json.dumps({
        "version": 1,
        "commit": os.environ["GITHUB_SHA"],
        "sequence": int(os.environ["GITHUB_RUN_NUMBER"]),
        "migrations": migration_hash("infra/migrations"),
        "images": {
            "api": prefix + "-api@" + os.environ["API_DIGEST"],
            "web": prefix + "-web@" + os.environ["WEB_DIGEST"],
        },
    }, indent=2))
