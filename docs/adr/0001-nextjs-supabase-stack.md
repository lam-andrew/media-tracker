# 0001. Next.js + TypeScript + Supabase stack

- **Status:** Accepted
- **Date:** 2026-08-28

## Context

Marqd is a personal media-tracking web app intended to be usable daily by a single developer
first, then grow into a multi-user freemium product. The near-term need is a fast path to a
working, beautiful, poster-forward web app that runs on both desktop and phone browsers, with
low operational overhead for a solo maintainer. The longer-term need is a clean upgrade path to
accounts, cloud sync, and eventually a mobile app that can reuse the same backend. The app is
metadata- and UI-heavy rather than compute-heavy: it fetches item metadata from public APIs and
stores lightweight tracking records.

## Decision

We will build Marqd as a single **Next.js 16 (App Router)** application in **TypeScript** with
**React 19** and **Tailwind CSS v4**, backed by **Supabase** (managed PostgreSQL) accessed via
`@supabase/supabase-js`. Server-side work (metadata fetching, database access) runs in Next.js
**server actions and route handlers** within the same app; the browser never holds API keys.

## Consequences

- **Positive:** One language and one deployable across UI and server logic — minimal context
  switching for a solo developer and the fastest route to a daily-usable tool. Next.js server
  components/actions keep secrets server-side by default.
- **Positive:** Supabase gives a real Postgres plus first-class auth and storage on a free tier,
  so adding accounts and cloud sync later is configuration, not a re-platform. The same backend
  can serve a future React Native/Expo mobile app.
- **Positive:** A managed DB + Vercel hosting means near-zero ops for a solo maintainer.
- **Cost:** Coupling to Supabase and Vercel as vendors (mitigated: Postgres is portable and
  Next.js can be hosted elsewhere). Next.js 16 is newer than some tooling expects; toolchain
  versions must be chosen with care.

## Alternatives Considered

- **Self-hosted Python/FastAPI + React + Docker/Postgres** (the pattern used in a sibling
  project): excellent rigor and provider-agnostic, but heavier operationally than a solo
  personal tool needs, and slower to a first usable build. Recorded separately in
  [ADR 0003](0003-managed-services-no-docker.md).
- **Next.js + a hand-rolled Node/Postgres backend:** more control, but reproduces auth, storage,
  and hosting that Supabase provides for free.
- **Local-only (SQLite / no server):** simplest to start, but throws away the multi-user upgrade
  path that is the whole point of building toward a business.
