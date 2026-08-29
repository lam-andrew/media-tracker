# Marqd — Architecture

This document describes Marqd's architecture using the [C4 model](https://c4model.com/).
Diagrams are kept as **Mermaid** in Markdown so they render natively on GitHub and stay
version-controlled as text. Keep them consistent with `README.md` §2 and with the Architecture
Decision Records in [`docs/adr/`](adr/). A stale diagram is worse than none — update it whenever
the architecture changes.

Currently maintained levels:

- **Level 1 — System Context:** Marqd as a black box among its user and external systems.
- **Level 2 — Container:** the runnable/deployable pieces and how they talk.

Level 3 (Component) diagrams are added only where the detail earns its place — most likely the
generic media engine, once it grows enough internal structure (registry, per-type config,
multiple providers).

---

## Level 1 — System Context

Who and what Marqd interacts with. Marqd lets one person catalog everything they've read,
watched, and played; it is a personal catalog, not a social network.

```mermaid
C4Context
    title System Context — Marqd

    Person(user, "Media Tracker", "A reader/viewer/player who wants one private catalog of everything they've experienced, with ratings and notes.")

    System(marqd, "Marqd", "Personal media catalog. Search and add books, movies, TV, and games; track status, rating, progress, and notes in a unified library.")

    System_Ext(openlibrary, "Open Library API", "Free public source of book metadata (covers, authors, page counts).")
    System_Ext(tmdb, "TMDB API", "Free source of movie and TV metadata (posters, cast, runtime).")
    System_Ext(rawg, "RAWG API", "Free source of video-game metadata (art, platforms, playtime).")
    System_Ext(supabase, "Supabase", "Managed PostgreSQL (and, later, auth) storing the user's library.")

    Rel(user, marqd, "Searches, adds items, tracks and rates them", "HTTPS")
    Rel(marqd, openlibrary, "Fetches book metadata", "HTTPS")
    Rel(marqd, tmdb, "Fetches movie/TV metadata", "HTTPS")
    Rel(marqd, rawg, "Fetches game metadata", "HTTPS")
    Rel(marqd, supabase, "Reads/writes the library", "SQL / HTTPS")

    UpdateLayoutConfig($c4ShapeInRow="2", $c4BoundaryInRow="1")
```

**Notes**

- All metadata sources are free/public APIs. All external calls and any credentials stay
  server-side (in server actions / route handlers), never in the browser.
- Media types are pluggable: each external metadata source is reached through the same
  provider interface (see [ADR 0002](adr/0002-generic-media-engine.md)).

---

## Level 2 — Container

The runnable/deployable units. Marqd is a single Next.js application deployed on Vercel; the
database is a managed Supabase service. There is no self-hosted infrastructure
(see [ADR 0003](adr/0003-managed-services-no-docker.md)).

```mermaid
C4Container
    title Container Diagram — Marqd

    Person(user, "Media Tracker", "Catalogs what they've experienced.")

    System_Boundary(marqd, "Marqd") {
        Container(webapp, "Web application", "Next.js 16, React 19, TypeScript", "Server-rendered UI + server actions/route handlers in one deployable. Presentation (library grid, search, item detail) and orchestration (calls providers, reads/writes the DB). External API keys stay here, server-side.")

        Container(engine, "Generic media engine", "TypeScript module", "MetadataProvider interface + per-source mappers (Open Library, TMDB, RAWG) + type registry/config. A new media type plugs in here without schema or UI changes.")
    }

    ContainerDb(db, "Supabase PostgreSQL", "Postgres", "media_items (shared metadata cache) + user_items (per-user tracking). Managed service; multi-user-ready schema.")

    System_Ext(openlibrary, "Open Library API", "Book metadata.")
    System_Ext(tmdb, "TMDB API", "Movie + TV metadata.")
    System_Ext(rawg, "RAWG API", "Game metadata.")

    Rel(user, webapp, "Uses", "HTTPS")
    Rel(webapp, engine, "Invokes providers (in-process)")
    Rel(webapp, db, "Reads/writes library", "SQL via supabase-js")
    Rel(engine, openlibrary, "Fetches + normalizes", "HTTPS")
    Rel(engine, tmdb, "Fetches + normalizes", "HTTPS")
    Rel(engine, rawg, "Fetches + normalizes", "HTTPS")

    UpdateLayoutConfig($c4ShapeInRow="2", $c4BoundaryInRow="1")
```

**Notes**

- **One deployable:** unlike a split frontend/backend, the Next.js app is both. Server actions
  and route handlers run server-side and are where provider calls and DB access happen.
- **CI/CD (outside the boundary):** GitHub Actions runs quality gates and security scans on every
  push; **Vercel** builds and deploys the app from Git (preview on PRs, production on merge to
  `main`) — see [ADR 0006](adr/0006-deployment-via-vercel.md).
- **Data layer:** `media_items` is global/shared metadata; `user_items` is the personal tracking
  record. This split keeps the schema multi-user-ready even though the MVP is single-user
  (see [ADR 0004](adr/0004-single-user-mvp.md)).

---

## Level 3 — Component

Not yet maintained. When the generic media engine grows enough internal structure (registry,
per-type config, several providers with shared normalization), add a Level 3 component diagram
for it here.

---

## Change log

- **2026-08-28** — Initial C4 Level 1 (System Context) and Level 2 (Container) diagrams created
  alongside the project scaffold and documentation standards.
