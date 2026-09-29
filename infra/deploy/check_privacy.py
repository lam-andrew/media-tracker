"""Fail closed if a pre-existing container package is not private."""

import json
import os
import urllib.error
import urllib.request

owner, repository = os.environ["GITHUB_REPOSITORY"].lower().split("/")
for suffix in ("api", "web", "release"):
    name = repository + "-" + suffix
    request = urllib.request.Request(
        f"https://api.github.com/users/{owner}/packages/container/{name}",
        headers={"Authorization": "Bearer " + os.environ["GH_TOKEN"],
                 "Accept": "application/vnd.github+json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            package = json.load(response)
    except urllib.error.HTTPError as error:
        if error.code == 404:
            continue  # A newly created GHCR package defaults to private.
        raise SystemExit(f"Cannot verify package visibility: HTTP {error.code}") from None
    if package.get("visibility") != "private":
        raise SystemExit(f"Refusing publication to non-private package: {name}")
print("Existing package visibility checks passed")
