# 0014. V2 local API and database foundation

- **Status:** Accepted for the local first slice
- **Date:** 2026-09-26

## Context

The v2 design needs a real search, saved-library and editing flow on containerized infrastructure.
V1 remains on Supabase/Vercel while v2 needs an isolated database and authorization boundary.

## Decision

Use a React/Vite frontend, TanStack Query for request caching and optimistic tracking edits,
a Fastify TypeScript API, and PostgreSQL. Shared Zod schemas validate tracking on both sides.
Serve the frontend and API from one origin through unprivileged nginx. Use Node 22 containers.
The current room/gallery/journal/search switch is client-side; a URL router remains follow-up work.

For the local slice, use email/password accounts in the separate v2 database. Passwords use
Node scrypt with random salts; opaque random session tokens are held in HttpOnly, SameSite=Lax
cookies and only SHA-256 token hashes are stored in PostgreSQL. Sessions expire after seven days.
Validate Origin on all mutations, limit requests, and scope every library query by the verified
session owner. Optimistic version checks reject stale tracking writes rather than losing edits.

Registration is opt-in and the supplied local setup binds the web service to loopback only.
Secure cookies must be enabled for HTTPS deployments. No public account rollout is authorized
by this local implementation: email verification/recovery, Google OAuth, durable rate limits,
and existing Supabase account migration remain required follow-up decisions.

Use Open Library for book search and authoritative item lookup. Cache searches briefly, bound
the cache, serialize upstream requests, and time out slow requests. No provider keys are required.

## Consequences

The application runs without Supabase Cloud or Vercel and uses persistent Docker storage.
Identity is verified by a server-side database session lookup, never by trusting decoded claims.
API-enforced ownership replaces direct browser-to-Supabase access in this isolated slice; the
Postgres port is not published in the default deployment. The API is the security boundary.

Operating an auth system adds maintenance obligations. This slice is not ready for public
signups or migration. Self-hosted Supabase remains an alternative if OAuth/account migration
complexity outweighs the benefits of this smaller stack. Avoid porting password hashes until
compatibility has been proven. Preserve the existing production accounts throughout.

## Alternatives Considered

- Full self-hosted Supabase: preserves v1 auth/data API behavior but adds services not needed by
  this slice; re-evaluate when planning production account migration.
- Continue requiring Supabase Cloud: does not validate local-only application infrastructure.
- Store a user ID in a browser cookie: rejected; it does not prove identity or isolate users.

References: [Fastify](https://fastify.dev/docs/latest/Reference/Server/),
[Node crypto](https://nodejs.org/api/crypto.html),
[Open Library search](https://openlibrary.org/dev/docs/api/search).
