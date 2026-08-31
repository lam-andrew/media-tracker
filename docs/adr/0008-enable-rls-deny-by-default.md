# 0008. Enable Row Level Security (deny-by-default) for the MVP

- **Status:** Accepted
- **Date:** 2026-08-28

## Context

[ADR 0004](0004-single-user-mvp.md) set the single-user MVP to run with Row Level Security
**off** for simplicity. But the anon/publishable key is exposed to the browser (it is a
`NEXT_PUBLIC_` value), and with RLS off, Supabase's auto-generated REST API lets anyone holding
that public key plus the project URL read and write the tables directly. Meanwhile, all of
Marqd's actual database access happens **server-side using the `service_role` key**, which
bypasses RLS entirely. So RLS-off buys no functionality — it only leaves a hole.

## Decision

Enable RLS on `media_items` and `user_items` with **no policies** (deny-by-default). The
`service_role` key (used only in server actions / route handlers) bypasses RLS, so Marqd's
server keeps full access; the public anon key is denied all access. Per-user policies scoped by
`auth.uid()` will be added when authentication lands. The `enable row level security` statements
live in `supabase/schema.sql` so the posture is reproducible.

## Consequences

- **Positive:** Closes the public-key read/write hole at zero functional cost — server access is
  unchanged. A safer default ahead of any public deployment.
- **Cost / caveat:** Any future *browser-side* Supabase read/write would silently return nothing
  until a matching policy exists. Keep database access server-side (which is already the
  architecture) until per-user policies are introduced with auth.

## Alternatives Considered

- **RLS off (the original 0004 posture):** simplest, but leaves the database writable by anyone
  with the public key once deployed. Rejected.
- **Full per-user policies now:** the correct end state, but premature — there is no auth and
  therefore no `auth.uid()` to scope policies by yet. Deferred to the auth phase.
