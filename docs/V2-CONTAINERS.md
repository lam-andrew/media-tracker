# Portable container handoff

## Deliverable

Three services, built independently of the inherited Next.js application:

- `web`: Vite/React static assets served by unprivileged nginx, container port 8080.
- `api`: Node 22/Fastify, container port 3201, only reachable inside the Compose network.
- `db`: PostgreSQL 17, persistent `postgres-data` volume; no published DB port by default.

Dockerfiles do not pin a CPU platform; official base images support normal amd64/arm64 builds.
Only the local machine's architecture has been exercised. Run the build on the destination
architecture as part of deployment acceptance. The server needs Docker with Compose; Node/npm
on the host is not needed to build or run the application.

## Run on any Docker host

From the repository's v2 branch:

```sh
cp infra/.env.example infra/.env
# Edit infra/.env locally; never commit it.
docker compose -f infra/compose.yaml up --build -d --wait
```

Set a random URL-safe `POSTGRES_PASSWORD` before first startup (hex is convenient).
Set `APP_ORIGIN` to the exact browser origin, including scheme and non-default port.
Set `BIND_ADDRESS` and `WEB_PORT` for the destination proxy/network; default is loopback:3200.
The homelab session owns proxy/TLS/public exposure. For HTTPS set `COOKIE_SECURE=true`.
Mutations require a matching Origin. Forward `/api` and normal web paths to the same web service;
nginx handles API forwarding and SPA history fallback. The API and database need no host port.
The optional `compose.dev.yaml` publishes DB port 55432 on loopback for testing only.

Set `TMDB_ACCESS_TOKEN` and `RAWG_API_KEY` for media search. `GOOGLE_BOOKS_API_KEY` is optional
for the fallback catalog. These values are used by the API, never baked into frontend assets.
Catalog provider timeouts and missing keys surface in the UI without blocking saved-library access.

## Authentication configuration

Default registration is closed. `ALLOW_REGISTRATION=true` permits new accounts; turn it off
again if you only want existing users. For confirmed signups set `REQUIRE_EMAIL_CONFIRMATION=true`
and supply SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD and SMTP_FROM.
SMTP uses TLS or required STARTTLS. Startup refuses confirmation mode without the basic SMTP
configuration. Test delivery, confirmation, password reset, expired links and logout on the final URL.

Google login needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET. Register this exact redirect URI:
`APP_ORIGIN/api/auth/google/callback`. No Supabase callback is used. OAuth only links an existing
email account automatically if that local account was already verified. Verify local email first
when transitioning to Google. Closed registration still allows existing linked accounts to log in.
A Google-only account must set a password using recovery before password-confirmed account deletion.

## Health, upgrades and shutdown

```sh
docker compose -f infra/compose.yaml ps
curl --fail http://localhost:3200/api/health
docker compose -f infra/compose.yaml logs --tail=100 api
docker compose -f infra/compose.yaml stop
```

Web `/healthz` checks the web server; API `/api/health` also checks Postgres. The API runs migrations
under a PostgreSQL advisory transaction lock with a checksum ledger. Never edit an applied migration;
add the next numbered SQL file. Back up before upgrades. Stop does not delete volumes. Avoid `down -v`.
Use a fixed git commit/release for deployment; do not deploy a moving branch unattended.

## Backup and restoration

```sh
./infra/scripts/backup.sh /secure/backup/directory
./infra/scripts/restore.sh /secure/backup/directory/marqd-TIMESTAMP.dump marqd_restore_drill
```

The backup script writes a PostgreSQL custom-format dump with restrictive file permissions.
Schedule it and copy encrypted backups off-host in the homelab task. Backups contain private user data,
password hashes and sessions: protect them like the live database. No automatic retention/deletion is
performed. A user JSON export is portable library data, not a replacement for a whole-database backup.

Restoration deliberately creates a new database; it refuses to overwrite the running library.
Check row counts, migration history and logins there before switching DATABASE_URL in a controlled
maintenance window. To switch the API to a restored database, supply a deployment Compose override
for its DATABASE_URL; do not change POSTGRES_DB expecting an existing volume to be renamed.
An old application image does not undo a schema change or preserve newer writes: rollback planning
must include a data backup and a write freeze, not just a previous git commit.

## Moving v1 data

Export joined user_items/media_items and goals using a read-only query scoped to one user UUID:

```sql
select jsonb_build_object(
  'items', (select coalesce(jsonb_agg(to_jsonb(u) || jsonb_build_object('media_items',to_jsonb(m))),'[]'::jsonb)
    from user_items u join media_items m on m.id=u.media_item_id where u.user_id='SOURCE_USER_UUID'),
  'goals', (select coalesce(jsonb_agg(to_jsonb(g)),'[]'::jsonb) from user_goals g where g.user_id='SOURCE_USER_UUID')
);
```

Save the JSON object (not a CSV wrapper), then run offline:

```sh
python3 infra/scripts/convert-v1.py source.json converted.json --user-id SOURCE_USER_UUID
```

The converter rejects missing media and will not overwrite an existing output file. It never connects
to Supabase and filters explicitly by source owner. Sign into the intended destination account and use
Import to review/load the converted backup. Never import a shared multi-user export into one account.
Passwords/OAuth identities are not transferred by this data converter. Rehearse on a separate local
account, compare counts/ratings/notes/dates/progress/goals, then repeat during a v1 write freeze at cutover.
Production exports must be kept outside the repo and deleted according to the owner's retention policy.
