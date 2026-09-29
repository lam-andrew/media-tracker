# 0018 — Promote the containerized application to main

- Status: Accepted
- Date: 2026-09-28

## Context

The user approved promoting the rebuild to main and retiring the V2 product label while
setting up the homelab. Root commands/docs still targeted the legacy application.

## Decision

Make React/Vite + Fastify + PostgreSQL the sole active runtime. Preserve the previous
main revision at `legacy-v1`, remove obsolete runtime code/dependencies, and make root
scripts and CI target the current application. Remove development/separate-library copy.
Preserve internal database, Compose project, backup identifiers, and npm aliases to avoid
breaking existing installations. Disable new Vercel builds with ignoreCommand; deployment
is operator-managed Docker Compose. Board games are the next main feature, not part of this release.

## Consequences

Code promotion is separate from account/data migration and homelab deployment. No database
is deleted, renamed, or transferred. Existing env files and volumes continue working.
Optional Google/SMTP need operator configuration and acceptance tests. A code rollback is
available at the tag but does not roll back post-cutover data changes.

## Alternatives considered

Retaining two active apps makes default commands and documentation ambiguous. Renaming all
internal version strings would risk disconnecting persistent data or invalidating backups.
