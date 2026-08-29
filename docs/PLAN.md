# Marqd — Product & Business Plan

*Owner: Andrew · Started: 2026-07-12 · Status: Planning · Name locked: 2026-07-13*

> **Marqd** — *mark what you've experienced.* A universal personal media catalog. Name plays on
> "marque" (a badge of distinction) with a modern respelling. Availability checked: no consumer-app
> or exact-trademark collision in our category; phonetic neighbor "Marq" (Lucidpress) is a
> different, unrelated industry. TODO: secure domain (marqd.com, else getmarqd.com / marqd.app).

---

## 0. The one-line strategy

Build a **personal catalog / diary of everything you've experienced** — books, movies, TV,
games, and more — that's beautiful, fast, and unified. Use it daily, get it genuinely good, then
grow it into a freemium subscription business. The wedge is the *unified library across all media*,
which no single-medium giant can follow us into.

---

## 1. The market (why this can make money — and where the fights are)

Tracking is a **validated, monetizable market**, but each medium has an entrenched, *beloved*
leader. We are NOT trying to beat them at their own game (see §2).

| Medium | The giants | Their strength | How they earn |
|--------|-----------|----------------|---------------|
| **Books** | Goodreads (150M), StoryGraph (5M) | Catalog / community / stats | Ads+affiliate (GR); freemium $4.99/mo (SG) |
| **Movies** | Letterboxd | Obsessive review *culture* | Pro/Patron subscription + affiliate |
| **TV** | Trakt, TV Time, Serializd | Auto-scrobble, episode tracking | Subscription (Trakt VIP) |
| **Games** | Backloggd, HowLongToBeat | Backlog culture, playtime data | Ads / supporter tiers |
| **Everything** | *(no strong winner)* | — | — |

**Key takeaways:**
- Each single-medium leader wins *because* it's focused and nails one culture. A "track everything
  and beat all of them" app becomes **master of none** — that's the trap to avoid.
- The **"everything" column is empty.** No one owns the unified personal catalog. That's our lane.
- Proven revenue everywhere: **freemium subscription (~$5/mo) + affiliate links.** No ads needed.

---

## 2. Our angle & positioning  ← *locked*

**Positioning: a personal catalog / diary, not a social network.**
The heart of the app is *your* private, beautiful log of everything you've read, watched, and
played — with ratings and notes. Social/sharing is optional and comes much later, if ever.

Why this wins:
- It's the one thing the giants **structurally cannot copy** — their identity is single-medium.
- It sidesteps competing with Letterboxd's/Goodreads' community culture (a fight we'd lose).
- The value compounds with use: the more of your life you log, the more irreplaceable it becomes.

We are new to these apps — an advantage. We build the clean, unified tool we personally want and
let daily use reveal the deeper features.

---

## 3. Core principle: extensible by design

Andrew's key requirement: **flexibility to add any media type later.** So the architecture is
built around a *generic* media model from day one — books, movies, TV, and games are just the
first four registered types. Adding music, podcasts, comics, board games, etc. later =
**register a new type + a metadata provider, with no schema migration and no rewrite.**

This is the single most important technical decision, and it's cheap now / painful to retrofit —
which is exactly why we're deciding it up front.

---

## 4. Product vision & phases

### Phase 1 — Personal tool (MVP)  ← *build this first*
The generic engine, proven end-to-end. Core loop, identical across every media type:
- **Add an item** via search (auto-fills poster/cover, title, creators, year) — no manual typing
- **Track status** — generic states shown with type-aware labels:
  - `backlog` → "Want to Read / Watch / Play"
  - `in_progress` → "Reading / Watching / Playing"
  - `completed` → "Read / Watched / Played"
  - `abandoned` → "DNF / Dropped"
- **Rate** (half-stars) and **log progress** (page / episode / % — a generic progress field)
- **See the unified library** — everything in one place, filter by type, sort, looking beautiful

**Recommended first slice:** ship the engine with **books + movies** first — two very different
providers (Open Library vs TMDB) that prove the abstraction actually generalizes. Then **TV and
games fall out cheaply** as additional registered providers. (We *can* do all four at launch;
starting with two just de-risks the abstraction faster.)

### Phase 2 — Make it *mine*
- Cross-media stats & goals (items/year, by type, by genre, pace, patterns)
- Notes, quotes & highlights per item
- Series/season tracking (TV), re-reads/re-watches/replays, mood/vibe tags
- "Where to watch / buy" surfaced on each item
- **Recommendations (content-based)** built on your highly-rated items — see §5a
- Whatever we personally miss after living with Phase 1

### Phase 3 — Multi-user + business
- Accounts, cloud sync, privacy controls
- Imports (Goodreads CSV, Letterboxd CSV, Trakt) to steal users from every vertical at once
- Optional light social/sharing
- **Monetization turns on** (see §6)

---

## 5. Technical architecture

**Web-first** (Next.js + Tailwind + Supabase), architected so a React Native/Expo **mobile** app
(with barcode scanning for books) reuses the same backend later. Web = tracking *this month*;
mobile once proven.

### The generic media engine
- **`MediaItem`** — shared global metadata for anything:
  `id, type, title, image_url, creators[], release_year, external_ids{}, metadata{}`
  - `type` is data-driven (book / movie / tv / game / …), not hardcoded logic.
  - `metadata` is a **JSONB** column holding type-specific fields (book `page_count`, movie
    `runtime`, tv `seasons/episodes`, game `platforms`) — so a new type needs **no migration**.
- **`UserItem`** — the personal tracking record (the heart of the app):
  `id, user_id, media_item_id, status, rating, progress, started_at, finished_at, created_at`
- **`MetadataProvider` interface** — `search(query)` + `getById(id)`, returning normalized
  `MediaItem`s. One implementation per source:
  - Books → **Open Library** (free, no key); Google Books fallback
  - Movies + TV → **TMDB** (free; the standard, with posters/cast/episodes/where-to-watch)
  - Games → **IGDB** (Twitch) or **RAWG**
  - *Adding music/podcasts/etc. later = write one new provider. That's the whole cost.*
- **Type registry** — each media type declares its provider, its type-specific fields, and its
  status labels in one config object. Adding a type edits config, not the schema or core code.

### Stack
- **Frontend:** Next.js (React) + TypeScript + Tailwind CSS — great on desktop *and* phone browser
- **Backend/DB:** Supabase (hosted Postgres + auth + storage); free tier covers Phase 1–2
- **Hosting:** Vercel (free tier)
- **Later — mobile:** React Native / Expo on the same Supabase backend + native barcode scanning

---

## 5a. Recommendation system (Phase 2 → 3)

A key planned feature and a likely **premium** hook. The differentiator: because we track across
*all* media, we can build a **cross-media taste graph** no single-medium app can — "you loved
these literary sci-fi novels *and* these cerebral films → try this game / show."

- **Phase 2 — content-based, single-user:** recommend from your own highly-rated items using item
  attributes (genre, creators, tags, mood) pulled from the metadata providers. Works with just
  your data. No cross-user data needed.
- **Phase 3 — collaborative, multi-user:** "readers/watchers with taste like yours also loved…"
  once there's a user base. Higher quality, needs scale.
- **Design now:** ratings + tags + genre live on `MediaItem.metadata` / `UserItem` from day one so
  the recommender has clean data to learn from later. (Market note: StoryGraph markets "no
  generative AI" recs — some users prefer transparent algorithmic recs; we can offer that.)

## 6. Monetization roadmap (Phase 3+)

Nothing turns on until the tool is loved (starting with you). Then, in order of proven-ness:

1. **Affiliate links** — per item: books → Bookshop.org (~10%) / Amazon; movies & TV → "where to
   watch" (JustWatch-style, a genuine feature *and* revenue); games → store links. Passive,
   non-annoying.
2. **Freemium subscription (~$3–5/mo)** — free tracking forever; paid unlocks advanced cross-media
   stats, **cross-media recommendations (§5a)**, unlimited items, custom themes, export.
   StoryGraph/Letterboxd both prove this works.
3. **B2B / later** — tools for authors, studios, publishers once there's an audience.

**Guiding rule:** free tier must be genuinely useful. People pay to go *deeper*, never to unlock
basic tracking.

---

## 7. Milestones

- [ ] **M0 — Plan approved** (this doc)
- [ ] **M1 — Scaffold**: Next.js + Tailwind + Supabase, generic schema, deployed empty to Vercel
- [ ] **M2 — Provider abstraction + search**: add a book (Open Library) and a movie (TMDB) to a shelf
- [ ] **M3 — Core loop done**: statuses, progress, ratings, unified library view → *use it daily*
- [ ] **M4 — Make it beautiful**: the design pass that becomes the differentiator
- [ ] **M5 — Add TV + games** (proves extensibility) + **stats & notes** (Phase 2)
- [ ] **M6 — Accounts + imports** (Phase 3), open to a few friends
- [ ] **M7 — Monetization on**: affiliate links, then subscription

---

## 8. Risks & how we handle them

- **Master-of-none** (biggest risk) → we don't compete on any single medium's community; we win
  on the *unified personal catalog* the giants can't offer. Positioning is the whole defense.
- **Scope creep from many media types** → the generic engine means types are cheap; still, ship
  books+movies first and add the rest incrementally.
- **Building too much before using it** → Phase 1 core loop is deliberately tiny.
- **Metadata gaps** → provider fallbacks (Google Books) + manual add.
- **Motivation over months** → you're user #1 and use it daily; that's the forcing function.

---

## 9. Open decisions

- ~~**Name & branding**~~ ✅ **LOCKED: Marqd** (2026-07-13). Availability checked — clear in the
  consumer-media category. Remaining: secure the domain (marqd.com preferred; getmarqd.com /
  marqd.app fallbacks) and the App Store / Play Store name.
- **Media vs. Experiences (the "soul" question):** core identity stays **media** for now
  (books/movies/TV/games/music/…). **Places / restaurants / hotels / travel** are a possible
  *later* expansion — the generic engine supports them as just another provider (Google Places),
  so the door stays open. Caveat: the `backlog→in-progress→completed` model fits media but needs a
  "want to go / been" variant for places. Deferred, not rejected.
- Initial launch slice: books+movies first (recommended) vs all four at once.
- Deeper differentiator after 2–3 weeks of use (cross-media stats vs notes/journaling vs recs).
- Affiliate partners (Bookshop vs Amazon; JustWatch for where-to-watch) — decide at Phase 3.
