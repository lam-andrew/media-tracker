# 0007. Metadata providers: Open Library, TMDB, RAWG

- **Status:** Accepted
- **Date:** 2026-08-28

## Context

Each media type needs an external source of metadata (title, creators, cover/poster art,
release year, and a few type-specific fields) behind the generic provider interface
(see [ADR 0002](0002-generic-media-engine.md)). As a solo project on free tiers, we want
reliable sources with good coverage and minimal authentication complexity, and we want to keep
each source swappable so a bad choice is cheap to reverse.

## Decision

We will use these free metadata providers, one per media type, each implemented behind the
`MetadataProvider` interface:

- **Books → Open Library** (`openlibrary.org`). No API key required.
- **Movies + TV → TMDB** (The Movie Database). One source covers both types; uses a v4 API Read
  Access Token (`TMDB_ACCESS_TOKEN`), kept server-side. Attribution required.
- **Games → RAWG** (`rawg.io`). Single API key (`RAWG_API_KEY`), kept server-side.
- **Books fallback → Google Books** may be added later for items Open Library lacks.

All calls run server-side; keys never reach the browser. Fetched metadata is cached in
`media_items` on add, which also reduces repeat calls against free-tier limits.

## Consequences

- **Positive:** Zero cost for a personal MVP. Good coverage per type; TMDB covers two media types
  with one integration. RAWG's single-key auth is simpler than the alternative's OAuth.
- **Positive:** Because each source sits behind the provider interface, swapping one (or adding a
  fallback) touches only that provider file, not callers.
- **Cost / caveats:** Free tiers carry rate limits and terms — TMDB requires attribution in the
  UI; RAWG's free tier is bounded (~20k requests/month) and commercial use at scale may require a
  paid agreement. These are acceptable for a personal tool and revisited if Marqd commercializes
  (a new ADR would record any change).

## Alternatives Considered

- **IGDB for games:** richer game data, but requires Twitch OAuth (client id/secret + token
  exchange) — more setup than a single RAWG key. Deferred; could supersede this ADR later if game
  data quality demands it.
- **OMDb for movies:** simpler but smaller/less rich than TMDB and does not cover TV as well.
- **Google Books as the primary book source:** viable, but Open Library needs no key and is
  sufficient; Google Books is kept in reserve as a fallback.
- **A single "everything" metadata source:** none exists with good coverage across books, movies,
  TV, and games — the per-type provider approach is what the generic engine is designed for.
