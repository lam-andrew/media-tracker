# 0003. Managed services (Vercel + Supabase), no self-hosted Docker

- **Status:** Accepted
- **Date:** 2026-08-28

## Context

The application must run somewhere with a database. One established pattern (used in a sibling
project) is Docker + Docker Compose with a self-hosted PostgreSQL, chosen there to stay
provider-agnostic and avoid cloud lock-in. Marqd's context is different: a solo maintainer
building a personal tool that should be deployable and daily-usable with minimal operational
burden, on a free tier, with the shortest path from commit to a live URL.

## Decision

We will use **managed services**: **Vercel** for hosting/build/deploy and **Supabase** for the
managed PostgreSQL database (and later auth/storage). We will **not** self-host via Docker/Docker
Compose. Local development runs the Next.js dev server directly (`npm run dev`) against a Supabase
project; no local database container is required.

## Consequences

- **Positive:** Near-zero ops — no container orchestration, no database to run or back up
  manually, HTTPS and previews out of the box. Fastest path to a live, shareable app.
- **Positive:** CI is simpler and faster (Node steps, no image builds).
- **Cost:** Vendor coupling to Vercel and Supabase, and reliance on their free-tier limits. This
  is mitigated because the app is a standard Next.js project (portable to other hosts) and
  Supabase is standard PostgreSQL (portable data). If lock-in ever becomes a real constraint, a
  future ADR can supersede this one and move to self-hosting.
- **Cost:** No single `docker compose up` to boot the whole stack; contributors configure a
  Supabase project and `.env.local` instead (documented in `docs/BUILD.md` §3).

## Alternatives Considered

- **Docker + Docker Compose + self-hosted Postgres (provider-agnostic):** maximum portability and
  no vendor lock-in, but materially more setup and ops for a solo personal tool, and a slower path
  to first deploy. Deferred; revisit only if vendor limits or lock-in become a real problem.
- **Vercel + a non-Supabase managed Postgres (e.g. Neon):** viable, but Supabase bundles auth and
  storage we will want for the multi-user phase, reducing future integration work.
