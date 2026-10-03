# Marqd

Your private catalog of books, movies, TV shows, and video games. Track ratings,
progress, favorites, and notes; explore recommendations, goals, and your library
through a physical shelf, gallery, or journal. Choose your palette and light/dark theme.

Marqd now lives on `main`. The former rebuild is the application, not a separate product.
The retired Next.js/Supabase app is preserved at Git tag `legacy-v1`.

## Run with Docker

```sh
cp infra/.env.example infra/.env
# Configure the password, URL, and optional API keys locally.
docker compose -f infra/compose.yaml up --build -d --wait
```

Open http://localhost:3200. On an existing install, keep your existing `infra/.env`.
See [container operations](docs/CONTAINERS.md) for homelab settings, HTTPS,
Google sign-in, SMTP, backups, restore, and upgrades. No Supabase or Vercel is required.

Existing Compose project/database names and JSON backup identifiers intentionally retain
`v2` internally so upgrades keep using the same data. Do not rename volumes or run
`docker compose down -v`. Old `v2:*` npm commands remain compatibility aliases.
Code promotion does not move legacy accounts or data. The Vercel integration is configured
to skip new builds; the previous hosted release is not replaced by this container app.

## Stack and development

React 19 + Vite + TypeScript, TanStack Query, themed Radix controls, Fastify API,
and PostgreSQL 17. nginx serves the frontend and proxies the API. The product name
is centralized in `packages/contracts/src/index.ts` (`BRAND.name`).

For local tools, use Node 22+:

```sh
npm ci
npm run install:apps
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
```

API integration tests require an isolated PostgreSQL database via `TEST_DATABASE_URL`.
Without it, database integration tests skip; CI always supplies a test database.
`npm run dev` builds and starts the Docker stack in the foreground; `npm run up` runs
it in the background. See [local development](docs/LOCAL.md).

## Documentation

- [Features and deployment checks](docs/FEATURES.md)
- [Architecture](docs/architecture.md) and [decisions](docs/adr/)
- [Private homelab deployment pipeline](docs/HOMELAB-DEPLOYMENT.md)
- [Product plan](docs/PLAN.md) — board games, Continue, and custom collections ([setup](docs/BOARD-GAMES.md))
- [Contributing](CONTRIBUTING.md)

The original build specification and rebuild plan remain historical references.
Features are decided as we go; we do not use GitHub issues for user-story tracking.
