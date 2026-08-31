# 0004. Single-user MVP with a multi-user-ready schema

- **Status:** Accepted
- **Date:** 2026-08-28

## Context

Marqd's first goal is a tool the developer uses daily; multi-user accounts are a later
(business) phase. Building authentication, sessions, and row-level security up front would slow
the path to a usable tool and add surface area before it earns its keep. But retrofitting a
per-user data model onto a single-user app later is painful, so the data model should be
multi-user-ready from day one even while the app has no login.

## Decision

The MVP will be **single-user with no authentication UI**. All tracking rows are attributed to a
single fixed user id (`DEFAULT_USER_ID` in `lib/constants.ts`). The schema is already
**multi-user-shaped**: `user_items` carries a `user_id` column and a `(user_id, media_item_id)`
uniqueness constraint. Row-level security is left **off** for the MVP and will be enabled when
auth lands.

## Consequences

- **Positive:** Fastest path to a daily-usable tool; no auth complexity before it's needed.
- **Positive:** Turning on multi-user later is additive — introduce Supabase Auth, replace
  `DEFAULT_USER_ID` reads with the authenticated user id, and enable RLS scoped by `auth.uid()` —
  without reshaping tables or migrating data.
- **Cost / risk:** With RLS off and a shared key path, the database must not be exposed as a
  public multi-tenant surface in this phase. Acceptable because the MVP is a personal, effectively
  single-tenant deployment. Enabling auth + RLS is tracked as the first step of the multi-user
  phase and will be recorded in its own ADR.

## Alternatives Considered

- **Full auth + RLS from the start:** correct end state, but premature — it delays the core tool
  and adds complexity before there are any other users.
- **No `user_id` at all (truly single-user schema):** marginally simpler now, but forces a
  painful data-model migration at the multi-user phase. Rejected.

---

> **Amendment ([ADR 0008](0008-enable-rls-deny-by-default.md)):** the RLS stance above ("left
> off for the MVP") was revised — RLS is now **enabled with a deny-by-default posture** (no
> policies). Server access via the `service_role` key is unaffected; the public anon key is
> locked out. The rest of this ADR still stands.
