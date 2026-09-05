# 0010. Establish request identity from the session cookie, not a per-request auth round-trip

- **Status:** Accepted
- **Date:** 2026-09-05

## Context

Every interaction in Marqd felt sluggish — roughly a second from click to response. Measured in
production (`Server-Timing` from the middleware, signed-in probe), the cause was not rendering or
the framework but **serial network round-trips from the Vercel function to Supabase Auth**:

| Interaction                 | Serial hops | Composition                                                     |
| --------------------------- | ----------- | --------------------------------------------------------------- |
| Button click (server action) | **3**       | middleware `getUser()` → action `getUser()` again → the DB write |
| Navigation to a data page    | **2**       | middleware `getUser()` → the page's query                        |
| Search keystroke / prefetch  | +1          | middleware `getUser()` before anything else                     |

`supabase.auth.getUser()` is a network call that asks Supabase Auth to validate the token. The
`@supabase/ssr` starter pattern runs it on **every request** in middleware and again inside every
action, costing **76–186 ms per hop** from Vercel (iad1). Two of the three hops per click carried
no security value: the database call that follows already carries the real token and Supabase
verifies it under RLS ([ADR 0008](0008-enable-rls-deny-by-default.md),
[ADR 0009](0009-supabase-auth-multi-user.md)).

## Decision

Identity on the hot path comes from the **session cookie's JWT, read locally — no network**:

- **Middleware** uses `auth.getSession()` (cookie read) and decodes the JWT's `sub`/`exp` to decide
  the login redirect. `getSession()` only calls out when the access token has expired and must be
  refreshed (~hourly); refreshed cookies flow back through `setAll`. This amends the middleware
  line of ADR 0009 ("refreshes the session on each request" → "refreshes only when expired").
- **`getSessionUser()`** (`lib/auth.ts`) is the request-scoped identity for layouts, pages, and
  server actions: cookie read + JWT decode, wrapped in React `cache()` so one request reads it once.
- **`getUser()`** (verified; one network hop) is **reserved** for the few places identity itself
  must be proven server-side: `deleteAccount` (which drives the service-role admin client) and the
  account Settings page (needs `created_at`, which is not a JWT claim).
- `lib/jwt.ts` decodes payloads without verifying signatures and says so loudly in its docs.

**Why this is safe.** Authorization never rests on the decoded claims. Every data read/write goes
through the session-scoped client carrying the *actual* token; Supabase verifies its signature and
RLS scopes rows to `auth.uid()` from that verified token. A forged or tampered cookie therefore
gets past the login redirect and no further — every query returns nothing or errors. The one
operation that bypasses RLS (admin-client account deletion) keeps the verified check.

## Consequences

- **Positive:** Button clicks drop from 3 serial Supabase hops to 1; navigations from 2 to 1;
  prefetches and search requests stop paying an auth hop at all. Middleware cost falls from
  ~80–190 ms to ~0 ms per request (visible in the `Server-Timing: session` header).
- **Positive:** No new secrets or configuration; nothing for the user to set up.
- **Trade-off:** The login *redirect* can be fooled by a forged cookie, which reveals only the
  app shell (not data). Accepted: the shell is not sensitive, and the alternative is paying a
  network hop for a cosmetic guarantee.
- **Follow-up (optional hardening):** verify the JWT locally in middleware — `jose` with the
  project's JWT secret (needs `SUPABASE_JWT_SECRET`), or `auth.getClaims()` once the Supabase
  client is upgraded (requires Node ≥ 20.19 for its WebSocket dependency). Either restores a
  cryptographic guard at the edge with no per-request round-trip.

## Alternatives Considered

- **Keep `getUser()` everywhere (status quo):** correct but pays 2 needless hops per click.
  Rejected — this was the sluggishness.
- **Switch frameworks:** would not remove a single Supabase hop; the cost is in the auth pattern,
  not in Next.js. Rejected.
- **Local JWT verification now (`jose` + JWT secret):** cryptographically stronger at the edge,
  but requires a new secret the user must provision. Deferred to the follow-up above; the current
  design is already safe because RLS is the real boundary.
- **Move data access into the browser (client → Supabase directly):** removes the server hop
  entirely, but exposes provider keys or needs a proxy anyway, and gives up server rendering and
  streaming. Rejected for now.
