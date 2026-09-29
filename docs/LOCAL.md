# Marqd local development

The initial books-only milestone has been expanded. See [current functionality](FEATURES.md)
and [container setup, configuration, backup and migration](CONTAINERS.md).

The existing local infra/.env remains gitignored, with development accounts and a separate database.
Run `npm run up`, then open http://localhost:3200. Existing installations keep their current database and environment file.

For code checks (Node 22 recommended):

- `npm ci`
- `npm run install:apps`
- `npm run lint`
- `npm run typecheck`
- `npm run test` (set TEST_DATABASE_URL to a dedicated test DB for integration)
- `npm run test:ui`
- `npm run build`

Tests create and remove synthetic accounts only in the supplied test database. Never supply
the production connection string. Use a dedicated throwaway PostgreSQL instance for tests. compose.dev.yaml exposes the app database on loopback 55432 for development; that does not make it a disposable test database.
