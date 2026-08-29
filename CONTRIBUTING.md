# Contributing to Marqd

Marqd (repo: `media-tracker`) is a solo project built to professional standards — this guide
documents the workflow so the process is reproducible and reads clearly. Please read
[`CLAUDE.md`](CLAUDE.md) (the working rulebook) and [`README.md`](README.md) (overview) first.

## Prerequisites

- **Node.js 20+** and **npm**
- **Git**
- Accounts/API keys for **Supabase**, **TMDB**, and **RAWG** once data features are wired up
  (see [`docs/BUILD.md`](docs/BUILD.md) §3). Open Library needs no key.

## Getting started

```bash
npm install
cp .env.example .env.local     # fill in values as features need them; never commit secrets
npm run dev                    # http://localhost:3000
```

## Branch & PR flow

1. Branch off `main` with a descriptive name: `feat/library-grid`, `fix/...`, `docs/...`,
   `chore/...`.
2. Make focused commits; keep each change scoped to one logical unit.
3. Open a **pull request** into `main`.
4. **CI must pass** (lint + format + type-check + tests + build) before merge.
5. Merge to `main` (squash or merge commit — keep history readable).

> **No user-story issue tracking.** Unlike some projects, Marqd does not track features as
> GitHub issues or a project board. Features are decided and implemented as we go; significant
> decisions are recorded as ADRs (see below), not tickets.

## Quality gates & pre-commit hooks

Quality gates run both locally and in CI. Set them up once:

```bash
npm install                    # tools: ESLint, Prettier, TypeScript, Vitest
pip install pre-commit         # (or: brew install pre-commit)
pre-commit install --install-hooks
```

Fast checks (format, lint, type-check) run on **commit**; the test suite runs on **push**.

**What runs**

| Gate | Command |
|---|---|
| Lint | `npm run lint` |
| Format | `npm run format:check` |
| Types | `npm run typecheck` |
| Tests | `npm run test` |
| Build | `npm run build` |

Run any by hand, or all hooks across the repo with `pre-commit run --all-files`.

## Testing expectations

- **New non-trivial logic ships with Vitest coverage** — provider mappers and pure helpers
  especially (they're the parts most likely to break silently).
- Component tests use Vitest + Testing Library.
- Run `npm run test` locally before opening a PR (pre-commit runs it on push).

## Security scanning

On every push/PR (and weekly), CI runs **gitleaks** (secrets), **npm audit** (dependency
vulnerabilities), **Trivy** (filesystem vuln/secret/misconfig), and **CodeQL** (SAST for
TypeScript). **Dependabot** opens dependency-update PRs. Findings surface in the repository's
**Security** tab and as PRs. Note: CodeQL and Trivy SARIF uploads require a **public** repository
or GitHub Advanced Security — on a private repo those jobs run but the upload step is skipped.

## CI/CD

CI (`.github/workflows/ci.yml`) installs dependencies and runs lint, format-check, type-check,
tests, and a production build on every push and PR. **Deployment is handled by Vercel's native
Git integration** (preview deploys on PRs, production on merge to `main`) rather than a GitHub
Actions deploy job — see [ADR 0006](docs/adr/0006-deployment-via-vercel.md). The
`deploy.yml` workflow is a documented placeholder.

## Architecture & documentation rules

- **Keep every media type flowing through the generic engine** — never special-case a type in
  the schema or shared UI (see [ADR 0002](docs/adr/0002-generic-media-engine.md)).
- **Write or update an ADR** for any architecturally significant decision (`docs/adr/`, using
  `0000-template.md`). To reverse a decision, add a new ADR that supersedes it — do not rewrite
  history. See `CLAUDE.md` for when to write vs. skip an ADR.
- **Keep the C4 diagrams current** in [`docs/architecture.md`](docs/architecture.md) when the
  architecture changes; keep them consistent with `README.md` §2.
- **Respect the scope tiers** (core → secondary → stretch). Protect the core; new ideas go to
  the backlog, not the current work.

## Data & secrets hygiene

- **Never commit secrets.** All credentials/config come from environment variables via
  `.env.local` (git-ignored); document new variables in `.env.example`.
- All metadata sources are free/public APIs.
