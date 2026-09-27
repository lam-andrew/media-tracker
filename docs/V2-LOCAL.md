# Run the v2 local slice

## Start

Requires Docker Compose. No cloud keys or v1 credentials are needed.

1. Copy `infra/.env.example` to `infra/.env`.
2. Replace `POSTGRES_PASSWORD` with a random URL-safe value (for example, 24 random bytes in hex).
3. Set `APP_ORIGIN` to the exact URL you will open, including scheme and port. Default:
   `http://localhost:3200`. Mutating requests from another origin are deliberately rejected.
4. Run `npm run v2:up` from the repository root.
5. Open http://localhost:3200 and create a **separate development account** yourself.

The local workspace has already been provisioned with a generated database password in a
mode-0600 gitignored `infra/.env`. It is not copied into container images or committed.

The stack contains PostgreSQL, a non-root Node API and an unprivileged nginx web container.
Only the web port is bound, on 127.0.0.1. Data persists in the `marqd-v2_postgres-data` named volume.
`npm run v2:stop` stops containers without deleting data. Do not use `down -v` unless you intend
to erase this development database. The API applies the idempotent initial schema at startup;
future schema changes need numbered migrations and a migration ledger before deployment.

## What works

- Email/password sign-up (explicitly enabled locally), login, logout and persistent sessions.
- Open Library book search with cancellation of obsolete UI queries, five-minute cache and
  provider timeouts. Search results are not demo titles.
- Preview, add as a chosen status, duplicate prevention and a persistent per-user library.
- Study 02 room, gallery and journal over the same data; first eight room items, all in gallery.
- Half-star ratings, page progress, favorites, notes and statuses. Save feedback is immediate;
  failed saves restore the cache, and version conflicts do not overwrite newer data.
- Daylight and evening presentation; keyboard focus and reduced-motion support.

No v1 data or accounts have been imported. Movie/TV/game providers, Google sign-in, recovery,
email confirmation, palette settings, imports, goals, recommendations, URL routing, pagination,
and validated large-library performance are not yet ported. The API is not ready for public
signups. Existing user accounts will need an explicit migration plan.

## Checks

Use Node 22 or newer for local API tooling. The host's old Node 20 may emit engine warnings;
container builds use Node 22 regardless.

- `npm run v2:install`
- `npm run v2:lint`
- `npm run v2:typecheck`
- `npm run v2:test` (database integration skips without TEST_DATABASE_URL)
- `npm run v2:test:ui` (requires root `npm ci`)
- `npm run v2:build`

Integration tests must use a dedicated test database. They create random `@example.invalid`
accounts and delete only those fixtures. CI provisions `marqd_test`; the test suite checks
unauthenticated access, cross-user reads/writes, CSRF origin rejection, password verification,
revocation, optimistic conflicts, duplicate adds and tracking persistence across login.

For host development, use `infra/compose.dev.yaml` alongside the main Compose file to expose
Postgres on loopback port 55432; run the API with DATABASE_URL and the matching APP_ORIGIN,
then `npm run dev --prefix apps/web`. Do not reuse the production database URL.

## Before homelab exposure

Configure HTTPS at your reverse proxy, APP_ORIGIN, COOKIE_SECURE=true, and
ALLOW_REGISTRATION=false until public account hardening is complete. Add durable rate limiting,
backup/restore drills, resource limits, migrations and recovery/OAuth decisions. Current fonts
and cover images still load from external providers. Local hosting is not offline operation.

## Verified first milestone

Local validation: four API tests including real PostgreSQL account isolation and persistence;
two UI tests covering navigation with a pending library request and rollback after a failed
save; all 126 inherited v1 tests; both application builds; lint, formatting and type checks.
The Docker stack passes health checks, and a live Open Library search/description lookup for
Eragon succeeded. The signup screen was visually inspected. A full signed-in browser walkthrough
with the user's own local account and large-library performance measurements remain to do.
