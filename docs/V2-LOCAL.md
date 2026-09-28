# V2 local development

The initial books-only milestone has been expanded. See [current functionality](V2-PARITY.md)
and [container setup, configuration, backup and migration](V2-CONTAINERS.md).

The existing local infra/.env remains gitignored, with development accounts and a separate database.
Run `npm run v2:up`, then open http://localhost:3200. The original v1 library is unchanged.

For code checks (Node 22 recommended):

- `npm ci`
- `npm run v2:install`
- `npm run v2:lint`
- `npm run v2:typecheck`
- `npm run v2:test` (set TEST_DATABASE_URL to a dedicated test DB for integration)
- `npm run v2:test:ui`
- `npm run v2:build`

Tests create and remove synthetic accounts only in the supplied test database. Never supply
the production connection string. Use compose.dev.yaml to expose test Postgres on loopback 55432.
