# 0009. Supabase Auth for multi-user (Google OAuth + email/password)

- **Status:** Accepted
- **Date:** 2026-08-31

## Context

Marqd began as a single-user MVP ([ADR 0004](0004-single-user-mvp.md)) with all data under a
constant `DEFAULT_USER_ID`. To let each person keep their own private library — and to make the
app safe to share — it needs real authentication and per-user data isolation. The data and
row-level security already live in Supabase; a separate auth vendor would require bridging its
tokens into Supabase RLS.

## Decision

We will use **Supabase Auth**, with **Google OAuth as the primary method and email/password as a
fallback** (both run on the same auth system). Sessions are cookie-based via `@supabase/ssr`:

- A **session-scoped server client** (anon key + the request's auth cookie) is used for all
  normal database access, so every query runs *as the signed-in user* and RLS applies. A
  service-role admin client remains only for scripts/maintenance.
- **Middleware** refreshes the session on each request and gates access: signed-out visitors are
  redirected to `/login`; `/login` and `/auth/*` (the OAuth callback) are public.
- **RLS policies** (`supabase/policies.sql`): `user_items` is scoped to `auth.uid()`;
  `media_items` (shared metadata cache) is readable/insertable by any authenticated user.
- App routes live under a `app/(app)/` route group behind an auth guard; `/login` sits outside it.

This amends the RLS posture from [ADR 0008](0008-enable-rls-deny-by-default.md): policies now
exist (scoped to the user) rather than deny-all, and the app uses the user-scoped client instead
of the service-role client for data access.

## Consequences

- **Positive:** Real per-user privacy enforced at the database (not just app logic). Google
  sign-in is low-friction; email/password needs no external setup. Auth integrates natively with
  Supabase RLS — no token bridging.
- **Cost / follow-up:** Google OAuth requires a one-time provider setup (Google Cloud credentials +
  Supabase provider config + redirect URLs). Email confirmation must be configured (or disabled
  for a smooth MVP). Existing `DEFAULT_USER_ID` data must be migrated to real accounts.

## Alternatives Considered

- **Clerk / Auth0 / Firebase Auth:** more prebuilt UI/features, but a separate vendor and extra
  work to feed their tokens into Supabase RLS. Rejected — Supabase Auth is already in the stack.
- **Auth.js (NextAuth):** flexible and free, but we would own session/user storage and still have
  to bridge to RLS. Rejected for the same reason.
- **Stay single-user:** simplest, but cannot support the business phase or safe sharing. Rejected.
