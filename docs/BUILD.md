# Marqd — MVP Build Spec (Implementation Handoff)

*Companion to `PLAN.md` (strategy). This doc is the **buildable spec** — hand it to an implementing
agent to produce the MVP in one pass. Written 2026-07-13.*

---

## How to use this document

You are building **Marqd**, a personal media-tracking web app. Build in the order given in
§13 (Build Order). Each task has **acceptance criteria** — a task is done only when they pass.
Do not skip the generic abstractions (§8): books/movies/TV/games must all flow through the *same*
engine, because new media types will be added later with zero schema changes.

**Steps marked 🧑 require the human** (creating accounts, obtaining API keys). Everything else is
code. If a 🧑 step is blocking, stop and ask for the key rather than hardcoding or faking it.

---

## 1. What we're building (MVP scope)

A single-user web app to catalog everything you've read/watched/played:
1. **Search** any supported media type and **add** items to your library (auto-filled metadata).
2. **Track status** (want / in-progress / done / abandoned), **rate** (half-stars), log **progress**
   and **notes**.
3. Browse a **unified, filterable, poster-forward library**.

Supported types at MVP: **book, movie, tv, game** (books + movies first; TV + games prove the engine).

### Non-goals for MVP (explicitly out of scope — stub, don't build)
- Auth / multiple users (single implicit user; see §7)
- Recommendations, social/sharing, imports (Goodreads/Letterboxd CSV)
- Native mobile app / barcode scanning
- Advanced stats dashboards

---

## 2. Decisions locked (override before building if you disagree)

| Decision | Choice | Why |
|----------|--------|-----|
| Auth for MVP | **None** — one implicit user (`DEFAULT_USER_ID`) | Keeps the one-pass build small; DB is multi-user-ready |
| First types built | **Books + Movies**, then TV + Games | Two unlike providers prove the abstraction early |
| Games API | **RAWG** (single key) | IGDB needs Twitch OAuth; defer that |
| Rendering | Next.js App Router, **Server Components + Server Actions** | Simple, no separate API layer for mutations |
| Styling | **Tailwind CSS**, warm-light "literary" theme, poster-forward | Andrew's pick; cover art pops on a warm neutral canvas |

---

## 3. Prerequisites (before coding)

- 🧑 **Node.js 20+** and npm installed.
- 🧑 **Supabase account** → create a project → copy **Project URL**, **anon key**, **service_role key**.
- 🧑 **TMDB account** (themoviedb.org) → Settings → API → copy the **API Read Access Token (v4)**.
- 🧑 **RAWG account** (rawg.io/apidocs) → copy the **API key**.
- Open Library and Google Books need **no key**.
- 🧑 **Vercel account** (for deploy, Task in §13).

---

## 4. Tech stack

- **Framework:** Next.js (latest, App Router) + TypeScript
- **Styling:** Tailwind CSS (latest) + CSS variables for theme tokens
- **DB + backend:** Supabase (Postgres). Client: `@supabase/supabase-js`
- **Icons:** `lucide-react`
- **Hosting:** Vercel
- **Metadata providers:** Open Library (books), TMDB (movies + tv), RAWG (games)

---

## 5. Project structure (target file tree)

```
marqd/
├─ app/
│  ├─ layout.tsx              # root layout, theme, nav shell
│  ├─ globals.css             # Tailwind + CSS variables (design tokens)
│  ├─ page.tsx                # HOME = unified library (grid + type filter)
│  ├─ search/page.tsx         # search across a chosen type, add to library
│  ├─ item/[id]/page.tsx      # item detail: status, rating, progress, notes
│  └─ api/
│     └─ search/route.ts      # GET ?type=&q=  → provider.search(), returns NormalizedItem[]
├─ components/
│  ├─ AppShell.tsx            # nav + layout frame
│  ├─ SearchBar.tsx
│  ├─ SearchResults.tsx       # provider results + "Add" button
│  ├─ LibraryGrid.tsx
│  ├─ MediaCard.tsx           # poster, title, stars, status badge
│  ├─ TypeFilter.tsx          # All / Books / Movies / TV / Games
│  ├─ StatusControl.tsx       # dropdown, type-aware labels
│  ├─ RatingStars.tsx         # half-star input + display
│  ├─ ProgressControl.tsx     # pages/episodes/percent per type
│  └─ EmptyState.tsx
├─ lib/
│  ├─ supabase/client.ts      # browser client
│  ├─ supabase/server.ts      # server client (service role, server-only)
│  ├─ providers/
│  │  ├─ types.ts             # NormalizedItem, MetadataProvider
│  │  ├─ openlibrary.ts
│  │  ├─ tmdb.ts              # exports movieProvider + tvProvider
│  │  ├─ rawg.ts
│  │  └─ registry.ts          # type → provider map
│  ├─ media-config.ts         # MediaTypeConfig per type (labels, status, progress)
│  ├─ actions.ts              # server actions (add/update/remove)
│  ├─ queries.ts              # library + item reads
│  └─ constants.ts            # DEFAULT_USER_ID, STATUSES
├─ supabase/schema.sql        # run once in Supabase SQL editor
├─ .env.local.example
└─ package.json
```

---

## 6. Data model — `supabase/schema.sql`

Run this in the Supabase SQL editor once. `type` is **text, not an enum**, so new media types
need no migration. Type-specific fields live in `metadata` / `progress` JSONB.

```sql
create extension if not exists "pgcrypto";

-- Global, shared metadata cache (one row per external item)
create table media_items (
  id             uuid primary key default gen_random_uuid(),
  type           text not null,                    -- 'book' | 'movie' | 'tv' | 'game' | (future)
  external_source text not null,                   -- 'openlibrary' | 'tmdb' | 'rawg'
  external_id    text not null,
  title          text not null,
  creators       text[] default '{}',              -- authors / directors / developers
  image_url      text,                             -- cover / poster
  release_year   int,
  metadata       jsonb not null default '{}',      -- page_count, runtime, seasons, platforms...
  created_at     timestamptz not null default now(),
  unique (external_source, external_id)
);

-- Per-user tracking record (the heart of the app)
create table user_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null,                     -- MVP: DEFAULT_USER_ID constant
  media_item_id uuid not null references media_items(id) on delete cascade,
  status        text not null default 'backlog',   -- backlog|in_progress|completed|abandoned
  rating        numeric(2,1),                       -- 0.5..5.0 (half-stars), nullable
  progress      jsonb not null default '{}',        -- {current_page,total_pages}|{season,episode}|{percent}
  notes         text,
  started_at    date,
  finished_at   date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, media_item_id)
);

create index on user_items (user_id, status);
create index on media_items (type);

-- MVP has no auth, so keep RLS OFF for now. When auth lands: enable RLS and scope by auth.uid().
```

---

## 7. The implicit user (MVP) — `lib/constants.ts`

```ts
// One fixed user for the single-user MVP. When auth lands, replace reads of this
// with the authenticated user id and enable RLS.
export const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';
export const STATUSES = ['backlog', 'in_progress', 'completed', 'abandoned'] as const;
export type Status = (typeof STATUSES)[number];
```

---

## 8. Core abstractions — `lib/providers/types.ts` + `lib/media-config.ts`

**Everything type-specific is data, not branching logic.** Adding a media type later = write one
provider + add one `MediaTypeConfig` entry. No other code changes.

```ts
// lib/providers/types.ts
export type MediaType = string; // open by design; MVP uses 'book'|'movie'|'tv'|'game'

export interface NormalizedItem {
  externalSource: string;      // 'openlibrary' | 'tmdb' | 'rawg'
  externalId: string;
  type: MediaType;
  title: string;
  creators: string[];
  imageUrl: string | null;
  releaseYear: number | null;
  metadata: Record<string, unknown>;
}

export interface MetadataProvider {
  type: MediaType;
  search(query: string): Promise<NormalizedItem[]>;
  getById(externalId: string): Promise<NormalizedItem | null>;
}
```

```ts
// lib/media-config.ts
import type { Status } from './constants';

export type ProgressKind = 'pages' | 'episodes' | 'percent' | 'none';

export interface MediaTypeConfig {
  type: string;
  label: string;            // "Book"
  labelPlural: string;      // "Books"
  icon: string;             // lucide icon name
  statusLabels: Record<Status, string>;
  progressKind: ProgressKind;
}

export const MEDIA_TYPES: MediaTypeConfig[] = [
  { type: 'book',  label: 'Book',  labelPlural: 'Books',  icon: 'BookOpen',
    statusLabels: { backlog: 'Want to Read', in_progress: 'Reading', completed: 'Read', abandoned: 'DNF' },
    progressKind: 'pages' },
  { type: 'movie', label: 'Movie', labelPlural: 'Movies', icon: 'Film',
    statusLabels: { backlog: 'Want to Watch', in_progress: 'Watching', completed: 'Watched', abandoned: 'Abandoned' },
    progressKind: 'none' },
  { type: 'tv',    label: 'TV',    labelPlural: 'TV Shows', icon: 'Tv',
    statusLabels: { backlog: 'Want to Watch', in_progress: 'Watching', completed: 'Watched', abandoned: 'Dropped' },
    progressKind: 'episodes' },
  { type: 'game',  label: 'Game',  labelPlural: 'Games',  icon: 'Gamepad2',
    statusLabels: { backlog: 'Want to Play', in_progress: 'Playing', completed: 'Played', abandoned: 'Dropped' },
    progressKind: 'percent' },
];

export const getConfig = (type: string) => MEDIA_TYPES.find(t => t.type === type)!;
```

```ts
// lib/providers/registry.ts
import { openLibraryProvider } from './openlibrary';
import { movieProvider, tvProvider } from './tmdb';
import { rawgProvider } from './rawg';
import type { MetadataProvider } from './types';

export const PROVIDERS: Record<string, MetadataProvider> = {
  book: openLibraryProvider,
  movie: movieProvider,
  tv: tvProvider,
  game: rawgProvider,
};
```

---

## 9. Provider specs (endpoints + field mapping)

Each provider maps an external API response to `NormalizedItem`. Fetch server-side only (keys stay secret).

### 9.1 Open Library (books) — no key
- **Search:** `GET https://openlibrary.org/search.json?q={q}&limit=20&fields=key,title,author_name,first_publish_year,cover_i,number_of_pages_median,isbn`
- Map each `doc`: `externalId=doc.key` (e.g. `/works/OL…W`), `title`, `creators=doc.author_name ?? []`,
  `releaseYear=doc.first_publish_year`, `imageUrl = doc.cover_i ? https://covers.openlibrary.org/b/id/{cover_i}-L.jpg : null`,
  `metadata={ pageCount: doc.number_of_pages_median, isbn: doc.isbn?.[0] }`.
- **getById:** `GET https://openlibrary.org{key}.json`.
- Fallback (optional): Google Books `https://www.googleapis.com/books/v1/volumes?q=` if a book is missing.

### 9.2 TMDB (movies + tv) — Bearer token `TMDB_ACCESS_TOKEN`
- Header: `Authorization: Bearer ${TMDB_ACCESS_TOKEN}`. Image base: `https://image.tmdb.org/t/p/w500`.
- **Movie search:** `GET https://api.themoviedb.org/3/search/movie?query={q}&include_adult=false`
  → map: `externalId=String(r.id)`, `title=r.title`, `releaseYear=year(r.release_date)`,
  `imageUrl = r.poster_path ? base+poster_path : null`, `metadata={ overview: r.overview }`. `creators=[]` (director needs a credits call — optional enhancement).
- **TV search:** `GET https://api.themoviedb.org/3/search/tv?query={q}` → same shape but `title=r.name`, `releaseYear=year(r.first_air_date)`.
- **getById (details, for runtime/seasons):** `/movie/{id}` or `/tv/{id}` → enrich `metadata`
  (`runtime`, `number_of_seasons`, `number_of_episodes`). Optional in MVP.

### 9.3 RAWG (games) — key `RAWG_API_KEY`
- **Search:** `GET https://api.rawg.io/api/games?key={RAWG_API_KEY}&search={q}&page_size=20`
  → map each `result`: `externalId=String(r.id)`, `title=r.name`, `releaseYear=year(r.released)`,
  `imageUrl=r.background_image`, `creators=[]`, `metadata={ platforms: r.platforms?.map(p=>p.platform.name), playtime: r.playtime }`.
- **getById:** `GET https://api.rawg.io/api/games/{id}?key={RAWG_API_KEY}`.

---

## 10. Server actions — `lib/actions.ts`

All mutations are Next.js server actions using the server Supabase client. `revalidatePath` after writes.

- `addToLibrary(item: NormalizedItem, status: Status)` — **upsert** into `media_items` on
  `(external_source, external_id)` → get `media_item_id` → insert `user_items`
  (`user_id=DEFAULT_USER_ID`, given status). If the user already has it, no-op / surface "already in library".
- `updateStatus(userItemId, status)` — also set `finished_at=today` when → `completed`, `started_at=today` when → `in_progress`.
- `updateRating(userItemId, rating | null)` — 0.5-step, 0.5–5.0.
- `updateProgress(userItemId, progress)` — JSONB blob per type's `progressKind`.
- `updateNotes(userItemId, notes)`.
- `removeFromLibrary(userItemId)`.

Reads in `lib/queries.ts`:
- `getLibrary(typeFilter?: string)` — join `user_items`+`media_items` for `DEFAULT_USER_ID`, optional type filter, newest first.
- `getItem(userItemId)` — single joined row.

---

## 11. Pages & UX behavior

- **`/` (Home = Library):** `TypeFilter` (All / Books / Movies / TV / Games) + responsive `LibraryGrid`
  of `MediaCard`s (poster, title, half-star rating, type-aware status badge). Card → `/item/[id]`.
  Empty state with a "Search to add your first item" CTA. Prominent "＋ Add" / search entry.
- **`/search`:** pick a **type** (segmented control), type a query → hits `/api/search?type=&q=` →
  `SearchResults` grid, each with an **Add** button (adds with default status `backlog`; a small
  status picker on add is a nice-to-have). Debounce input ~300ms. Show loading + empty states.
- **`/item/[id]`:** large poster + title + creators + year + type-specific metadata;
  `StatusControl` (type-aware labels), `RatingStars` (half-star), `ProgressControl`
  (pages/episodes/percent per `progressKind`; hidden when `none`), a `notes` textarea (autosave on blur),
  and a Remove action. All controls call server actions and reflect immediately.

---

## 12. Design system (make it beautiful — this is the differentiator)

**Direction: "Literary light" — warm, editorial, poster-forward.** A cream "paper" canvas, ink
text, a serif wordmark + titles for personality, antique-gold stars, and a classic burgundy accent.
Vibrant cover art (games, films) must pop against the warm neutral, so **give every poster a
hairline border** — otherwise light covers dissolve into the background. Flat surfaces only (no
gradients; no shadows beyond subtle borders / a faint hover lift). Put tokens in `globals.css` as
CSS variables; map into Tailwind.

```css
:root {
  --bg: #F5EFE3;          /* warm cream "paper" canvas */
  --surface: #FCFAF3;     /* cards */
  --surface-2: #EFE8DA;   /* hover / raised */
  --border: #E2D9C7;      /* hairline */
  --border-strong: #D6CAB2;
  --text: #2E2A24;        /* ink */
  --text-muted: #7A7263;  /* sepia-gray */
  --accent: #7A2E3A;      /* deep burgundy — classic, literary */
  --accent-strong: #8E3A47;
  --star: #B8863B;        /* antique gold */
}
```

- **Type:** editorial serif for the wordmark, item titles, and section headings — **Fraunces**
  (recommended) or Instrument Serif; UI/body text in **Inter**. Load both via `next/font`.
- **Cards:** small radius (~6px, book-like), 1px `--border` hairline **on every poster** (per note
  above), poster fills the tile, hover = subtle lift + `--accent` ring. Aspect ratios:
  books/movies/tv 2:3, games 16:9 — `object-cover` handles mixed ratios gracefully.
- **Chips/badges:** small radius (~4px); active filter = burgundy fill with cream text.
  **Stars** use `--star` (gold). Generous whitespace, fast transitions.
- **Layout:** max-width container, responsive grid (2 cols mobile → 5–6 desktop). Slim top nav with
  the **serif Marqd wordmark** + search.
- **States:** every list has loading skeletons + a friendly empty state. No layout shift on image load.
- **Dark mode:** optional and later — a warm-dark variant can be added; the light "paper" look is
  the primary brand identity.

---

## 13. Build order (do in sequence; each must pass its acceptance criteria)

**Task 0 — Prereqs 🧑:** ensure Node 20+, and collect Supabase URL + anon + service_role keys,
`TMDB_ACCESS_TOKEN`, `RAWG_API_KEY`. Create `.env.local` from `.env.local.example`.

**Task 1 — Scaffold + theme.** `npx create-next-app@latest marqd` (TypeScript, App Router, Tailwind,
`src/`? no — use flat `app/`). Add `lucide-react`. Implement `globals.css` tokens (§12), root
`layout.tsx` with fonts + `AppShell`.
*Accept:* app runs at localhost, literary-light theme (cream canvas) + serif wordmark visible, no console errors.

**Task 2 — Supabase.** Add `@supabase/supabase-js`; create `lib/supabase/client.ts` +
`server.ts`. Run `supabase/schema.sql` in the project. Seed nothing.
*Accept:* server client can `select` from `user_items` (returns empty array, no error).

**Task 3 — Provider engine (books + movies).** Implement `types.ts`, `media-config.ts`,
`openlibrary.ts`, `tmdb.ts` (movie + tv exports), `registry.ts`, and `app/api/search/route.ts`.
*Accept:* `GET /api/search?type=book&q=dune` and `?type=movie&q=dune` each return normalized
results with titles + poster/cover URLs.

**Task 4 — Search + Add.** `/search` page with type selector, debounced input, `SearchResults`,
and `addToLibrary` server action (upsert media_item → insert user_item).
*Accept:* searching and clicking **Add** creates rows in `media_items` + `user_items`; re-adding
the same item doesn't duplicate.

**Task 5 — Library.** Home `/` with `getLibrary`, `TypeFilter`, `LibraryGrid`, `MediaCard`,
`EmptyState`.
*Accept:* added items appear as poster cards with correct type-aware status label; type filter works;
empty state shows when filtered to a type with no items.

**Task 6 — Item detail + tracking.** `/item/[id]` with `StatusControl`, `RatingStars` (half-star),
`ProgressControl` (per `progressKind`), notes autosave, remove. Wire all server actions +
`started_at`/`finished_at` logic.
*Accept:* changing status/rating/progress/notes persists across reload; setting `completed` stamps
`finished_at`; Remove deletes the `user_item`. **← MVP is usable here; start using it daily.**

**Task 7 — Prove extensibility: add TV + Games.** Confirm `tvProvider` works; implement `rawg.ts`;
they're already registered in `registry.ts` + `media-config.ts`.
*Accept:* TV and Game items search, add, display with correct labels ("Want to Play" etc.) and
progress kinds — **with no changes to the schema or core components.** This validates the engine.

**Task 8 — Polish.** Loading skeletons, error/empty states everywhere, responsive check
(mobile → desktop), image fallback for missing posters, keyboard-friendly search.
*Accept:* no layout shift on load; looks good at 375px and 1440px; no unhandled errors.

**Task 9 — Deploy 🧑.** Push to GitHub; import to Vercel; set env vars; deploy.
*Accept:* live URL loads the library; search/add/track work in production.

---

## 14. Definition of done (MVP)

- Can search books, movies, TV, and games and add them to one unified library.
- Can set status, half-star rating, progress, and notes per item; changes persist.
- Library is filterable by type and looks polished (dark, poster-forward) on mobile + desktop.
- Adding a hypothetical 5th type would require only a new provider file + one `MEDIA_TYPES` entry
  (verify by reading the code — no schema/component changes needed).
- Deployed to a live Vercel URL.

---

## 15. Post-MVP hooks (leave clean seams; do NOT build now)

- **Auth/multi-user:** replace `DEFAULT_USER_ID` with `auth.uid()`, enable RLS scoped by user.
- **Notes/highlights:** promote `notes` to a child `item_notes` table (many per item).
- **Stats & recommendations:** ratings + genres already stored → content-based recs later (`PLAN.md` §5a).
- **Affiliate / where-to-watch:** item detail is the surface for Bookshop/JustWatch links.
- **Mobile app:** React Native/Expo reusing this Supabase backend + providers.
```
