# Marqd feature inventory and deployment checklist

Marqd is built in `apps/web`, `apps/api`, `packages/contracts` and `infra`. The legacy
Next.js application is preserved at Git tag `legacy-v1`. Code promotion does not migrate accounts or data.

## Implemented

- Books (Open Library first, Google Books fallback), movies/TV (TMDB), games (RAWG with
  best-effort Steam portrait covers). Configured providers are reported without exposing keys.
- Search by title or creator, exact-title ranking, duplicate identity filtering, detail preview,
  descriptions rendered as safe text/formatting, credits, genres and media facts.
- Add with chosen status; per-user library; ratings in half-star increments; favorites; notes;
  page/episode/season/percentage tracking; start/finish dates; remove an item with confirmation.
- Room/gallery/list/journal presentations, type/status filters, added/title/rating/year sorting,
  text search, dedicated favorites, incremental gallery rendering, client navigation and item links.
- Personalized Discover from highly rated/favorite/completed seeds, TMDB related titles,
  RAWG genre suggestions, creator-based book suggestions; cold-start books and provider failure states.
- Stats, annual per-type/all-media goals, profile editing, saved color palettes and light/dark mode.
- Goodreads/Letterboxd CSV review-and-import; half-star ratings, notes and dates; JSON library/goal
  export and restore. Existing entries are never replaced by import. JSON batches are transactional.
- Local password auth, revocable HttpOnly sessions, Google OAuth code flow with state/PKCE and
  ID-token validation, SMTP email confirmation/password recovery, one-use expiring hashed tokens,
  password-protected account deletion and per-user authorization on every private endpoint.
- Loading/error states, retry controls, save rollback, version conflict protection, reduced motion,
  skip link, responsive controls and application error boundary.

## Configuration and validation gates

Code availability is not the same as an activated integration. TMDB/RAWG keys are configured
in the current ignored local environment. Google client credentials, redirect URI and SMTP must
be configured by the deployment owner and exercised end-to-end before enabling public signups.
The local test account is for development only. No production Supabase credential is required.

The homelab task handles host networking, TLS, domain/VPN, proxy, scheduling and monitoring.
See [container handoff](CONTAINERS.md). This task supplies reproducible containers and
operator commands, not a deployment to an unspecified server.

## Intentional differences and remaining release work

- Study 02 replaces v1's dashboard/marketing layout. Navigation is client-side; the library is
  fetched once and cached. Gallery rendering is incremental; database pagination is not yet used.
- Legacy Supabase and current auth are separate. Supabase password hashes are not copied; owners establish Marqd
  identity via confirmation/recovery/Google, then import only their own library and goals.
- The offline converter retains original TV progress in metadata as well as season/episode fields.
  Review migrated progress/totals and catalog identities before cutover, especially any records
  affected by v1's movie/TV source-ID collision.
- External metadata and images still require internet access. Fonts currently use Google Fonts.
- Rate limits are per-process; use one API replica or provide shared ingress limiting before
  scaling. SMTP and OAuth network flows need a configured-service acceptance test.
- Provider catalogs can time out or apply quotas. Missing suggestions do not block navigation or
  tracking. CSV imports show unmatched rows for review; do not assume all rows matched.
- Before retiring a legacy deployment: user acceptance on desktop/mobile, final account/data migration rehearsal,
  backup restore drill on the target storage, verified auth delivery and an explicit cutover/rollback.

## Validation for this implementation

- API integration checks run against a dedicated PostgreSQL test database, including migration
  idempotence, per-user isolation, movie/TV ID separation, import deduplication, JSON export, goals,
  profile updates, single-use reset tokens, session revocation and password-confirmed account deletion.
- UI regressions cover navigation during loading, optimistic-save rollback, catalog selection,
  recovery while signed in, and closing saved item deep links.
- The retired Next.js tests are preserved in `legacy-v1`; current CI tests the containerized application.
- Browser checks exercised live Inception, Severance and Hades search, enriched show credits,
  stats and settings. No synthetic media was added to the existing local library.
- Backup restored to a separate database with matching account/library counts. The offline converter
  was rehearsed using synthetic owner-separated rows with dates, ratings, season/episode and goals.
- Real SMTP delivery and Google OAuth require deployment credentials; they were not exercised against
  external accounts. The final server's network, TLS and architecture remain the homelab task's checks.
