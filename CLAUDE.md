@AGENTS.md

# CLAUDE.md — Marqd (media-tracker)

Agent-facing context and working rules for this repository. Every Claude Code session
should read this file first. Human-facing project detail lives in `README.md`; this file
is the concise rulebook. If anything here conflicts with a user instruction in-session,
follow the user, but flag the conflict.

> **Naming:** the repository/package is named generically (`media-tracker`). The product's
> display name ("Marqd") lives in **one place — `lib/brand.ts`** — so a rebrand is a one-line
> change. Never hardcode the product name in components, metadata, or copy; read `BRAND.name`.

---

## Project in one paragraph

**Marqd** is a personal media-tracking web app: a private catalog/diary of everything you've
experienced across media — **books, movies, TV, and games** to start, and extensible to any
media type later. You search an item, add it to your library, set a status, half-star rating,
progress, and notes, and browse a unified, poster-forward library. It is a **personal tool
first**, built to grow into a freemium business (subscription + affiliate) once it's loved.
Positioning is a **personal catalog, not a social network** — the wedge is the unified
cross-media library the single-medium giants (Goodreads, Letterboxd, Trakt) can't offer. The
full strategy is in `docs/PLAN.md`; the MVP build spec is in `docs/BUILD.md`.

## Scope tiers — DO NOT BLUR

- **Core (committed):** the single-user MVP — generic media engine, search + add via metadata
  providers, status/rating/progress/notes tracking, unified library view. Books + movies first,
  then TV + games (proves the engine extends).
- **Secondary (after core is stable):** cross-media stats, notes/highlights, and
  content-based recommendations from highly-rated items.
- **Stretch (backlog; only if core finishes early):** accounts/multi-user + auth, imports
  (Goodreads/Letterboxd CSV), light social, native mobile app, affiliate/"where to watch",
  and additional media types (music, podcasts, places). Do NOT build unless explicitly told to.

When in doubt: protect the core, defer everything else to the backlog.

## Stack (see `docs/adr/`)

Next.js 16 (App Router) + TypeScript + React 19 · Tailwind CSS v4 · Supabase (managed
PostgreSQL) · deployed on Vercel · Vitest + Testing Library for tests · metadata from free
public APIs (Open Library for books, TMDB for movies/TV, RAWG for games), each behind the same
provider interface.

## Architecture rule — the generic media engine

Everything type-specific is **data, not branching logic**. All media types flow through one
engine: a generic `MediaItem` (`type` is a plain string; type-specific fields live in a JSONB
`metadata` column) plus a `MetadataProvider` interface (`search` / `getById`). **Adding a new
media type = write one provider + one config entry — no schema migration, no changes to core
components.** Never special-case a media type in the schema or shared UI. See
[ADR 0002](docs/adr/0002-generic-media-engine.md) and `docs/BUILD.md` §8.

---

## Documentation standards (industry-aligned; enforced by this file)

### 1. Architecture Decision Records (ADRs) — REQUIRED

- Location: `docs/adr/`, named `NNNN-short-title.md` (zero-padded, e.g. `0007-add-redis-cache.md`).
- Template: `docs/adr/0000-template.md`.
- Each ADR contains: **Title · Status** (Proposed / Accepted / Superseded by NNNN) **· Date ·
  Context · Decision · Consequences · Alternatives Considered**.
- **Write or update an ADR whenever a design, infrastructure, or architecture decision is made
  or changed.** Never change architecture silently. To reverse a past decision, add a new ADR
  that supersedes the old one (set the old one's status to "Superseded by NNNN") — do not edit
  history.
- When an ADR changes the stack, architecture, or scope, update `README.md` to match.

**When to WRITE an ADR:** architecturally significant choices — anything affecting structure,
data flow, external interfaces, cross-cutting concerns, security, deployment, or long-term
maintainability (e.g. adding auth, changing the provider contract, adding a new engine,
choosing a hosting model).

**When to SKIP an ADR:** decisions that are tiny, low-risk, self-contained, easily reversible,
temporary (spikes/experiments), or already covered by an existing ADR or standard. Don't
document routine coding choices — that creates noise, not signal.

### 2. Architecture diagrams — C4 model via Mermaid

- Use the **C4 model**, kept as **Mermaid** in markdown so it renders natively on GitHub and
  stays version-controlled as text.
- Maintain at least **Level 1 (System Context)** and **Level 2 (Container)** in
  `docs/architecture.md`. Add **Level 3 (Component)** only where the detail earns its place
  (likely the generic media engine, once it grows internal structure).
- Keep diagrams in sync with reality; a stale diagram is worse than none.

### 3. Baseline repo hygiene

- `README.md` (overview, setup, architecture) — keep current.
- `LICENSE` (MIT).
- `CONTRIBUTING.md` (setup, branch/PR flow, quality gates) — even solo, it documents the workflow.
- `docs/PLAN.md` (strategy) and `docs/BUILD.md` (MVP build spec) — the product source of truth.

---

## Conventions

- Feature branch → PR → CI must pass → merge to `main`.
- **We do NOT track user stories as GitHub issues or a project board.** Features are decided and
  implemented as we go — keep momentum, write the code, record significant decisions as ADRs.
  (This is a deliberate difference from other projects.)
- **Commit often and push regularly.** Prefer small, focused commits; push the working branch to
  `origin` after each logical unit of work, not just at session end — so progress is backed up,
  visible on GitHub, and exercised by CI early.
- **Never hardcode the product name.** Read it from `lib/brand.ts` (`BRAND.name`).
- Never commit secrets; external services are configured via environment variables (`.env.local`,
  git-ignored; document new vars in `.env.example`).
- New non-trivial logic ships with Vitest coverage. Provider mappers and pure helpers especially.
- Keep every media type flowing through the generic engine (see Architecture rule).
- Design direction is **"Literary light"** (warm cream canvas, ink text, serif display type,
  gold stars, burgundy accent, poster-forward with a hairline border on every cover). Tokens live
  in `app/globals.css`; see `docs/BUILD.md` §12. Don't drift from it without a reason.

## Current status

**Live:** https://media-tracker-two-plum.vercel.app (Vercel Git integration; `main` auto-deploys).
CI green on `main`. ADRs 0001–0012.

**Done and on `main`:**

- Design system (Literary light + Warm dark, persisted toggle), sidebar shell, toasts, branded
  404s and an in-shell error boundary, keyboard focus ring + reduced-motion, skip link.
- Generic media engine + providers behind one interface: Open Library (primary) with Google
  Books as backup for books, TMDB (movie + TV), RAWG (games). `GET /api/search` (rate-limited).
- **Auth (multi-user):** Supabase Auth — Google OAuth + email/password, password reset, delete
  account; RLS scopes every row to `auth.uid()`. Hot-path identity comes from the session cookie
  (no per-request auth round-trip) — see **ADR 0010**; `getUser()` only where identity must be
  proven (admin-client deletes, Settings).
- **Library:** poster grid, type tabs, status chips, sort (added/rating/title/year), instant text
  filter (URL-synced via History API), favorites, item page with status / half-star rating /
  progress / notes and streamed provider enrichment (page is interactive before slow providers
  answer). `loading.tsx` skeletons on every data page.
- **Discover:** cross-media recommendations with reasons ("Because you loved …"), direct
  add-to-library from the card, per-seed rows; cold-start "popular reads" row.
- **Stats & goals** (`/stats`): in-app aggregation (ADR 0011) + yearly goals in `user_goals`
  (migration `supabase/migrations/0002-user-goals.sql`; the page shows a one-line setup notice
  until it's run).
- **Imports** (`/import`): Goodreads + Letterboxd CSV → parse client-side → match via providers
  (ISBN-first for books) → bulk commit with status/rating/dates; never overwrites existing rows.

**Performance rule (learned the hard way, ADR 0010):** never add a `supabase.auth.getUser()` to a
hot path — it's a network round-trip (~80–190 ms from Vercel). Use `getSessionUser()`. Middleware
exposes a `Server-Timing: session` header for measuring. Measure before theorizing.

**🧑 One-time user steps still pending:** run migration `0002-user-goals.sql` (enables goals);
optional `GOOGLE_BOOKS_API_KEY` (makes Google Books usable as the fast primary — flip the order
in `lib/providers/book.ts`).

**Backlog (not started):** email/SMTP activation, custom domain, durable rate limiting,
affiliate/"where to watch", public shareable lists, more media types (music/podcasts/places),
and the parked **shelf view** (refs in `docs/PLAN.md`).

> Local: `npm run dev -- -p 3100` (port 3000 is a different project). A production build can
> be previewed with `npm run start -- -p 3101`.
