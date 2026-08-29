# Marqd

> The repository is named `media-tracker` (generic on purpose); **Marqd** is the product's
> display name, configured in one place — [`lib/brand.ts`](lib/brand.ts) — so a rebrand is a
> one-line change.

**Marqd** is a personal media-tracking web app — a private catalog of everything you've
experienced across media. Search a **book, movie, TV show, or game**, add it to your library,
and track status, a half-star rating, progress, and notes, all in one beautiful, poster-forward
place. It's a personal tool first, built to grow into a freemium business later.

It is a **personal catalog, not a social network**: the wedge is the *unified cross-media
library* that single-medium apps (Goodreads, Letterboxd, Trakt) can't offer. Full strategy in
[`docs/PLAN.md`](docs/PLAN.md); the MVP build spec in [`docs/BUILD.md`](docs/BUILD.md).

---

## 1. Status

Early development. The app scaffold, design system, provider abstraction, and full
documentation + CI/CD standards are in place. Core MVP features (search/add, library, tracking)
are being built out — see [`docs/BUILD.md`](docs/BUILD.md) for the build order.

## 2. Architecture

A single **Next.js** application (React Server Components + server actions/route handlers) that
talks to a managed **Supabase** Postgres database and fetches item metadata from free public
APIs. The heart of the design is a **generic media engine**: one `MediaItem` model (`type` is a
string; type-specific fields live in a JSONB column) and one `MetadataProvider` interface, so a
new media type is a small addition rather than a rewrite.

- **Frontend + server:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Database:** Supabase (managed PostgreSQL) via `@supabase/supabase-js`
- **Metadata providers:** Open Library (books), TMDB (movies + TV), RAWG (games)
- **Hosting:** Vercel · **CI:** GitHub Actions

The C4 architecture diagrams (System Context + Container) live in
[`docs/architecture.md`](docs/architecture.md); the decisions behind the stack are recorded as
ADRs in [`docs/adr/`](docs/adr/).

## 3. Getting started

**Prerequisites:** Node.js 20+ and npm, Git. (Accounts/keys for Supabase, TMDB, and RAWG are
needed once data features are wired up — see [`docs/BUILD.md`](docs/BUILD.md) §3.)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (never commit real secrets)
cp .env.example .env.local        # then fill in values as features need them

# 3. Run the dev server
npm run dev                       # http://localhost:3000
```

## 4. Project structure

```
app/            Next.js App Router pages, layouts, API routes
components/      Presentational React components (AppShell, cards, controls)
lib/            Non-UI logic
  brand.ts        Product display name — the one place to rebrand
  constants.ts    DEFAULT_USER_ID, statuses
  providers/      Generic media engine: provider interface + per-source mappers
docs/           PLAN.md, BUILD.md, architecture.md (C4), adr/ (decision records)
.github/        CI/CD and security workflows, Dependabot
```

## 5. Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run format` / `format:check` | Prettier write / check |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest (run once) · `test:watch` to watch |

## 6. Documentation

- [`docs/PLAN.md`](docs/PLAN.md) — product & business strategy
- [`docs/BUILD.md`](docs/BUILD.md) — MVP build spec (schema, providers, tasks)
- [`docs/architecture.md`](docs/architecture.md) — C4 diagrams
- [`docs/adr/`](docs/adr/) — Architecture Decision Records
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — workflow, quality gates
- [`CLAUDE.md`](CLAUDE.md) — agent-facing working rules

## 7. License

[MIT](LICENSE) © Andrew Lam
