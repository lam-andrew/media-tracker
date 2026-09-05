# 0011. Stats computed in-app from tracking rows; yearly goals in a gated `user_goals` table

- **Status:** Accepted
- **Date:** 2026-09-05

## Context

Cross-media stats are a "secondary" scope item (`CLAUDE.md`): the unified library is the wedge, and
a year-in-numbers view (completions, ratings, genres) plus yearly targets is the first feature that
uses it. Two decisions needed settling: **where the numbers are computed**, and **how a new table
(goals) reaches an existing Supabase project** that was set up by pasting SQL by hand.

## Decision

- **Stats are computed in the app, not the database.** `lib/stats.ts` fetches the user's
  `user_items` (status, rating, dates, and the joined `media_items.type` + `metadata`) through the
  session-scoped client (RLS applies) and hands the rows to a **pure, unit-tested `computeStats`**.
  No views, RPCs, or aggregate SQL. Per-type breakdowns are seeded from `MEDIA_TYPES`, so a new
  media type flows into every stat with no code change (ADR 0002 still holds).
- **Goals live in a new `user_goals` table** (`supabase/migrations/0002-user-goals.sql`): one target
  per `(user_id, year, type)` with `type NULL` = all media, `unique nulls not distinct` so the
  all-media goal is unique too, RLS scoped to `auth.uid()` like `user_items`. Progress is derived
  from `computeStats` (completions in the goal's year), never stored.
- **The missing-table case is a soft gate, not a crash.** `getGoals` recognises PostgREST's
  "table does not exist" signals (`42P01` / `PGRST205` / the message text) and returns
  `{ available: false }`; the Stats page then renders a one-line setup notice naming the migration
  file in place of the goals form. Every other error still throws. All other stats render either way.

## Consequences

- **Positive:** Stats logic is testable and portable; nothing in the database to migrate when a
  stat changes. Goals need exactly one paste-and-run migration, and the app stays usable before it.
- **Trade-off:** Every Stats render pulls the user's full tracking set. Fine for a personal library
  (hundreds to low thousands of rows); if libraries grow far past that, move aggregation to a
  Postgres view or RPC with the same output shape as `computeStats`.
- **Follow-up:** the goals table is not yet in `supabase/schema.sql`; new projects run the
  migration as well. Fold it in when schema.sql is next revised.

## Alternatives Considered

- **Aggregate in SQL (views / RPC):** faster at scale, but harder to test and one more artifact to
  paste into Supabase by hand. Rejected for now; noted as the scale escape hatch.
- **Store goal progress on the goal row:** would need updating on every status change. Rejected —
  deriving it from the same rows keeps one source of truth.
- **Let a missing `user_goals` table throw:** simpler, but takes the whole Stats page down for
  anyone who hasn't run the migration. Rejected in favour of the gate.
