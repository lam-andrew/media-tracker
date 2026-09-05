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

**Live at https://media-tracker-two-plum.vercel.app** (auto-deployed from `main`; CI green).

- **Accounts:** Google sign-in or email/password; password reset; delete account. Every row is
  scoped to its owner by Postgres row-level security.
- **Search & add** across books, movies, TV, and games; three result layouts.
- **Library:** poster grid with type tabs, status chips, sort, and an instant text filter;
  **favorites**; item pages with status, half-star rating, progress, notes, and rich metadata.
- **Discover:** cross-media recommendations with reasons ("Because you loved …"), addable in place.
- **Stats & goals:** this-year tiles, completions by month, rating distribution, library
  breakdown, top genres, and yearly targets.
- **Imports:** Goodreads and Letterboxd CSV exports, matched against the metadata providers.
- Light ("Literary light") and dark ("Warm dark") themes; keyboard-accessible; fast — one
  database round-trip per page or click ([ADR 0010](docs/adr/0010-cookie-session-identity-no-per-request-auth-roundtrip.md)).

Backlog and parked ideas (shelf view, more media types, affiliate links, custom domain) live in
[`docs/PLAN.md`](docs/PLAN.md) and `CLAUDE.md` → "Current status".

## 2. Architecture

A single **Next.js** application (React Server Components + server actions/route handlers) that
talks to managed **Supabase** Postgres + Auth and fetches item metadata from free public APIs.
The heart of the design is a **generic media engine**: one `MediaItem` model (`type` is a
string; type-specific fields live in a JSONB column) and one `MetadataProvider` interface, so a
new media type is a small addition rather than a rewrite.

- **Frontend + server:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Database + auth:** Supabase (managed PostgreSQL with RLS; Supabase Auth) via `@supabase/ssr`
- **Metadata providers:** Open Library (books; Google Books as backup), TMDB (movies + TV),
  RAWG (games)
- **Hosting:** Vercel · **CI:** GitHub Actions

The C4 architecture diagrams (System Context + Container) live in
[`docs/architecture.md`](docs/architecture.md); the decisions behind the stack are recorded as
ADRs in [`docs/adr/`](docs/adr/).

## 3. Getting started

**Prerequisites:** Node.js 20+ and npm, Git, a Supabase project, and free API keys for TMDB and
RAWG (see [`.env.example`](.env.example) for where each value comes from).

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (never commit real secrets)
cp .env.example .env.local        # then fill in the values

# 3. Create the database (paste into the Supabase SQL editor, in order)
#    supabase/schema.sql, supabase/policies.sql, then each file in supabase/migrations/

# 4. Run the dev server
npm run dev                       # http://localhost:3000
```

Sign-in providers are configured in the Supabase dashboard (Authentication → Providers); for
Google, add the Supabase callback URL to your Google Cloud OAuth client.

## 4. Project structure

```
app/            Next.js App Router: (app)/ is the signed-in shell — discover, search, library,
                favorites, item/[id], stats, import, settings; login/ and auth/ are public
components/     UI by area (dashboard, library, item, discover, stats, import, media, toast)
lib/            Non-UI logic
  brand.ts        Product display name — the one place to rebrand
  auth.ts         getSessionUser (cookie, no network) / getUser (verified)
  actions.ts      Server actions for tracking; auth-actions, goal-actions, import-actions
  queries.ts      Session-scoped reads (RLS applies)
  providers/      Generic media engine: provider interface + per-source mappers + registry
  recommend.ts    Cross-media recommender · stats.ts · goals.ts · library-view.ts
  import/         CSV parser, Goodreads/Letterboxd adapters, matching
supabase/       schema.sql, policies.sql, migrations/
docs/           PLAN.md, BUILD.md, architecture.md (C4), adr/ (decision records)
.github/        CI/CD and security workflows, Dependabot
```

## 5. Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm run start` | Production build / serve it |
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
- [`CLAUDE.md`](CLAUDE.md) — agent-facing working rules and current status

## 7. License

[MIT](LICENSE) © Andrew Lam
