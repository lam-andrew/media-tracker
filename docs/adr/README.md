# Architecture Decision Records

This directory holds Marqd's Architecture Decision Records (ADRs): short documents that capture
an architecturally significant decision, its context, and its consequences.

## Conventions

- Files are named `NNNN-short-title.md` with a zero-padded, monotonically increasing number.
- Every ADR uses [`0000-template.md`](0000-template.md) and contains: **Title · Status · Date ·
  Context · Decision · Consequences · Alternatives Considered**.
- **Status** is one of `Proposed`, `Accepted`, or `Superseded by NNNN`.
- Decisions are **append-only**: to reverse one, add a new ADR that supersedes it and set the old
  ADR's status to `Superseded by NNNN`. Never rewrite a past decision's history.
- Write an ADR for architecturally significant choices (structure, data flow, external interfaces,
  cross-cutting concerns, security, deployment, scope). Skip ADRs for tiny, low-risk, easily
  reversible, or already-covered decisions. See `CLAUDE.md` → "Documentation standards".

## Index

| ADR | Title | Status |
|---|---|---|
| [0000](0000-template.md) | Template | — |
| [0001](0001-nextjs-supabase-stack.md) | Next.js + TypeScript + Supabase stack | Accepted |
| [0002](0002-generic-media-engine.md) | Generic media engine (type as data, provider interface) | Accepted |
| [0003](0003-managed-services-no-docker.md) | Managed services (Vercel + Supabase), no self-hosted Docker | Accepted |
| [0004](0004-single-user-mvp.md) | Single-user MVP with a multi-user-ready schema | Accepted |
| [0005](0005-quality-gates-and-security-scanning.md) | CI quality gates and security scanning | Accepted |
| [0006](0006-deployment-via-vercel.md) | Deployment via Vercel's Git integration | Accepted |
| [0007](0007-metadata-providers.md) | Metadata providers: Open Library, TMDB, RAWG | Accepted |
| [0008](0008-enable-rls-deny-by-default.md) | Enable Row Level Security (deny-by-default) for the MVP | Accepted |
| [0009](0009-supabase-auth-multi-user.md) | Supabase Auth for multi-user (Google OAuth + email/password) | Accepted |
| [0010](0010-cookie-session-identity-no-per-request-auth-roundtrip.md) | Request identity from the session cookie, not a per-request auth round-trip | Accepted |
| [0011](0011-stats-and-yearly-goals.md) | Stats computed in-app; yearly goals in a gated `user_goals` table | Accepted |
