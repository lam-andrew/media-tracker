# Marqd homelab deployment

## What is automated

Push/merge to main → CI quality/integration/container checks → private GHCR images →
one release manifest → host checks every five minutes → local database backup →
replace API/web together → health checks → optional Discord result.

The image prefix is `ghcr.io/lam-andrew/media-tracker`: packages have `-api`, `-web`,
and `-release` suffixes. Only the release package uses the mutable `homelab` channel;
app containers always use digests. Package visibility must remain **private**.
Publishing uses GitHub's built-in workflow token, never a runtime API key.
CI's main deployment gate includes production dependency audits; the separate Security
and CodeQL workflows remain additional reporting/checks, not dependencies of publishing.

## One-time operator installation (not automatic)

Do not execute this runbook blindly on a new host. It adopts an EXISTING healthy
Compose deployment with the compatibility identifiers in `infra/compose.yaml`.
Confirm the intended VM, account/library, port 3200, project, and storage first.
Keep the server's existing env file; do not copy the developer's complete `.env`.

1. Install reviewed `deploy.py` and `release.py` under `/opt/marqd-deploy/`, root-owned
   and not writable by the app. Install `infra/deploy/compose.yaml` as
   `/etc/marqd-deploy/compose.yaml`. This is a frozen host config, not fetched on each update.
2. Create `/etc/marqd-deploy` (0700), `/etc/marqd-deploy/docker` (0700), and
   `/var/lib/marqd-deploy` (0700). Copy the EXISTING server env to
   `/etc/marqd-deploy/app.env` (0600). Keep registration disabled and loopback binding.
3. Create a classic GitHub PAT with only `read:packages` for the package owner.
   Authenticate Docker interactively using `--password-stdin` and
   `DOCKER_CONFIG=/etc/marqd-deploy/docker`. Do not paste credentials into chat,
   command arguments, shell history, GitHub Actions, or source control.
   Docker's saved credential is not encrypted: root-only permissions are essential.
   Plan expiry/rotation. Verify private pulls work before enabling automation.
4. Optionally store a dedicated Discord webhook in
   `/etc/marqd-deploy/discord-webhook` (0600). Without it, results go to the journal
   only. Kuma's existing notification setting is not read or copied by this script.
5. Adopt the current deployment, using its actual source/migrations and exact commit:

   ```sh
   python3 /opt/marqd-deploy/deploy.py --adopt /opt/marqd/infra/migrations --commit COMMIT_SHA
   ```

   This records running image IDs as the first rollback target, checks health, and
   refuses to overwrite an existing baseline. It does not start the timer.

6. Install the provided service/timer under `/etc/systemd/system/`, reload systemd,
   verify package privacy, baseline, database dump/recovery and target manifest.
   Then create `/etc/marqd-deploy/enabled` and perform one supervised service run.
   Only after healthy app/login/library checks enable/start `marqd-deploy.timer`.

## Operations and recovery

- Inspect: `systemctl status marqd-deploy.timer` and `journalctl -u marqd-deploy.service`.
- Pause: `systemctl stop marqd-deploy.timer`; remove the enable marker to prevent
  accidental manual starts. Stopping the timer does not abort an in-flight deployment.
- Local state: `/var/lib/marqd-deploy/{current,previous,pending,failed,migration-review}.json`.
- Local dumps: `/var/lib/marqd-deploy/backups/`, root-only; no automatic deletion.
  Less than 2 GiB free blocks updates. Copy encrypted dumps off-host and establish
  retention before relying on this for important data. A successful archive listing
  is NOT a tested restore.
- A failed pull leaves the running app unchanged. A failed activation attempts the
  previous images only when migration fingerprints match; both API and web restart.
- A `pending.json` after interruption or failed recovery deliberately blocks retries.
  Inspect actual containers/database, restore service and reconcile state manually.
  Do not simply delete the marker or repeatedly restart an unknown release.
- A `failed.json` quarantines that commit; a new eligible commit may deploy. Retrying
  the same commit is an explicit operator decision after diagnosing the failure.
- New or changed migration files require review, a restore rehearsal, backup and
  supervised upgrade. Reconcile the baseline only after verifying that upgrade.
  Never automatically restore an old dump over newer user writes.

## Naming compatibility

Visible labels use **Marqd**. The existing `marqd-v2` Compose project, `marqd_v2`
database, and corresponding Docker volume/container names are intentional stable
identifiers. Changing them creates another deployment rather than renaming data.
An operator may use `/opt/marqd` as an alias for the old source directory.
