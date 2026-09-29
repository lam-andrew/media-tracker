# Contributing to Marqd

Read [AGENTS.md](AGENTS.md) and [README.md](README.md). Use Node 22+, npm,
and Docker Compose. Configuration lives in ignored `infra/.env`.

```sh
npm ci
npm run install:apps
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
```

API integration tests require a dedicated PostgreSQL database in TEST_DATABASE_URL.
CI supplies one and builds both containers. Local tests without it skip database coverage.
Never use a live library database for tests.

Use feature branches and PRs into main. CI must pass before merge. Significant architecture
changes require an ADR and updated README/C4 diagrams. New non-trivial behavior needs tests;
visual changes should also be checked in the browser. Preserve keyboard and mobile usability.

Features are chosen as we go, without GitHub issue-based user stories.

Optional hooks: install pre-commit and run `pre-commit install --install-hooks`.
Hooks run formatting/lint/types on commit and tests on push. Security scanning and dependency
updates are configured in .github. Deployment is operator-managed through Docker Compose;
GitHub does not deploy to the homelab. See [container operations](docs/CONTAINERS.md).
