# ADR 0015: V2 media parity and portable container delivery

- Status: Accepted
- Date: 2026-09-27

## Context

The user wants v2 to replace v1 functionally, then run on a homelab managed by a separate task.
The first slice only tracked books. V1 also supported movie/TV/game metadata, creator search,
recommendations, stats/goals, CSV import and cloud-backed account management.

## Decision

Port the provider and CSV normalization logic into the v2 runtime without importing Next.js or
Supabase. Use a generic media contract, include media type in catalog identity, and retain tracking
in JSONB. Add a checksum migration ledger and an owner-scoped JSON backup/import format. Reuse
one cached library across immediately rendered client views. Provider enrichment remains separate.

Extend the local account service with Google authorization code + PKCE/state validation using
Google's authentication library and SMTP one-use verification/recovery links using Nodemailer.
Store only token hashes; recovery revokes sessions. Do not copy Supabase password hashes or infer
ownership from an unverified email. External credentials are deployment configuration, not code.

Keep web/API/Postgres containers separate. Expose only web by default; parameterize origin, binding,
port and service integrations. Supply backup, non-destructive restore and offline migration tooling.
The homelab task owns networking, TLS, scheduling and final service configuration.

## Consequences

Core data stays local; metadata, covers, fonts, Google and SMTP still require configured external
services. Public deployment requires real OAuth/SMTP acceptance tests. The current limiter is
per-process; one API replica is the supported initial topology. V1 is not removed until acceptance
and account/data cutover are explicitly completed.

## Alternatives considered

Keeping Supabase would simplify identity reuse but retain a cloud runtime dependency. A separate
identity server would add operational work to this small deployment. Silent account linking by
email alone would risk taking over an unverified local account and is rejected.

## References

- https://developers.google.com/identity/protocols/oauth2/web-server
- https://nodemailer.com/smtp
- https://developer.themoviedb.org/reference/search-movie
- https://rawg.io/apidocs
