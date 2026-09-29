# 0019 — Pull-based homelab deployment

Status: accepted for implementation; activation requires operator acceptance.

## Decision

After CI passes for a push to main, GitHub-hosted Actions builds amd64 API and web
images and publishes them to private GHCR packages. A scratch release image carries
a manifest of both immutable digests, source commit, CI sequence, and migration
fingerprint. Publishing its `homelab` tag is the promotion operation. PRs cannot publish.

The homelab pulls this channel with a read-only registry credential. A locally
installed controller accepts only this repo's image names and digest references.
It never runs scripts supplied by the channel, updates itself, or exposes a webhook.
Docker access is effectively root; the fixed controller must be reviewed accordingly.

Before replacing API/web, it pulls both images, checks disk space, stops application
writes, and creates/inspects a PostgreSQL dump. It preserves the existing database,
Compose project, server secrets, and volumes. No Postgres upgrade is automated.
It checks both web and database-backed API health before recording success.

A differing migration fingerprint is held for human review. Automatic image rollback
is restricted to unchanged migration sets; it is not a database restore. Failed
releases are quarantined; interrupted deployments block until operator review.

## Consequences

No inbound internet ports, homelab GitHub runner, or GitHub-held SSH credentials.
Only the registry credential lives on the host; runtime secrets remain server-side.
Updates cause a brief application interruption, not a host or VM restart.
Local dumps consume disk and are not disaster recovery. Retention/off-host encrypted
backup is a separate operator decision. A local monitoring service cannot report
loss of the entire host/internet. Package privacy must be verified before activation.
Workflow/config/controller changes require operator review; images alone cannot
silently change host ports, volume mappings, or the deployment mechanism.
