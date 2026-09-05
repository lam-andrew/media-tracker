# 0012. Book metadata: Open Library primary, Google Books backup (composite provider)

- **Status:** Accepted
- **Date:** 2026-09-05

## Context

[ADR 0007](0007-metadata-providers.md) chose Open Library as the sole book source. In use, its
search endpoint is slow (~1.5 s per query) — the largest single contributor to "search feels
slow". Google Books answers the same queries in ~0.15 s with richer inline data (descriptions,
categories), but **without an API key** it enforces a tight per-IP quota, and on Vercel every
request egresses from a shared IP: it began returning `429` in normal use, which killed book
search outright when it was the only source. The user chose not to provision a key for now.

## Decision

Books are served by a **composite provider** (`lib/providers/book.ts`) registered for the
`book` type:

- **Open Library is primary** — reliable, no key, consistent ~1.5 s.
- **Google Books is the backup** — used when Open Library errors or returns nothing.
- `getById` routes by id shape: Open Library work keys (`/works/…`) go to Open Library; Google
  volume ids go to Google Books. Items saved from either source keep enriching.
- An optional `GOOGLE_BOOKS_API_KEY` is read by the Google Books provider. If it is ever set,
  the fast path becomes trustworthy and the two calls in `bookProvider.search` should be
  swapped to make Google Books primary (a one-line change, documented in `.env.example`).

The composite keeps the `MetadataProvider` contract, so nothing else in the engine changes.

## Consequences

- **Positive:** book search never hard-fails on a single upstream; the provider set is still
  data behind one interface. A future key upgrade is a trivial reorder, not a rewrite.
- **Trade-off:** book search stays on the slower path until a key exists. Accepted by the user.
- **Follow-up:** revisit when book search volume grows — a key (or a cache in front of Open
  Library) is the lever.

## Alternatives Considered

- **Google Books only:** fastest, but brittle without a key (this is what broke). Rejected.
- **Google Books primary with Open Library fallback:** fast when quota allows, but on a shared
  IP the common case becomes "fail, then fall back" — slower than Open Library alone. Rejected
  without a key.
- **Require the API key:** a user-provisioned secret for a personal tool; deferred by the user.
