# 0002. Generic media engine (type as data, provider interface)

- **Status:** Accepted
- **Date:** 2026-08-28

## Context

Marqd tracks multiple media types (books, movies, TV, games) and must stay open to more later
(music, podcasts, comics, and possibly places). The naive approach — a `books` table, a `movies`
table, and type-specific code paths through the UI — makes every new media type a schema
migration plus scattered conditional logic, which does not scale and invites drift. The
different types also come from different metadata sources (Open Library, TMDB, RAWG) with
different response shapes, but share the same user-facing lifecycle: search → add → track status,
rating, progress, notes.

## Decision

We will model all media through **one generic engine**:

- A single **`MediaItem`** with `type` as a plain **string** (not an enum) and a **JSONB
  `metadata`** column for type-specific fields (page count, runtime, seasons, platforms). A
  single **`UserItem`** holds the per-user tracking record.
- A **`MetadataProvider`** interface (`search(query)` / `getById(id)`) that each source
  implements, returning a normalized `NormalizedItem`. A **type registry / config** declares each
  type's provider, status labels, and progress kind.

**Adding a new media type = write one provider + add one config entry. No schema migration, and
no changes to core components.** No media type may be special-cased in the schema or shared UI.

## Consequences

- **Positive:** New media types are cheap and low-risk; the schema and UI never fork per type.
  Type-specific data has a home (`metadata`) without polluting the relational model.
- **Positive:** A clean seam for testing — provider mappers are pure functions from an external
  response to `NormalizedItem`, easy to unit-test.
- **Cost:** JSONB fields are not schema-validated by the database; the provider layer is
  responsible for shaping `metadata` consistently. Cross-type queries on type-specific fields are
  less ergonomic than dedicated columns (acceptable — the app rarely needs them).

## Alternatives Considered

- **A table per media type:** simplest to reason about per type, but every new type is a
  migration + new code paths, and unified library/stats queries become UNION-heavy. Rejected as
  the opposite of the extensibility goal.
- **A rigid `type` enum + fixed columns for every field any type might need:** wide, sparse
  tables and a migration for every new field or type. Rejected.
- **Fully generic EAV (entity-attribute-value):** maximally flexible but painful to query and
  easy to misuse; JSONB gives most of the flexibility with far better ergonomics.
