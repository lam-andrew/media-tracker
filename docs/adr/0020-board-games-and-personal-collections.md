# 0020 — Board games, Continue, and personal collections

- Status: Accepted
- Date: 2026-10-02

## Context

The user selected board games, a Continue section, and custom collections as the next
improvements. Marqd now deploys to a homelab from CI-published main releases.

## Decision

Add boardgame as a distinct media type, with BoardGameGeek XML API2 behind a server-only
provider. Keep the token optional: saved-library access remains available without catalog
configuration. Queue and cache requests to respect provider limits; parse XML through a
maintained parser and validate external identifiers. Live BGG access requires an approved token.

Store optional ownership, play count, and last-played date in existing tracking JSON. Old
records and backups remain valid. Ownership and play status are independent; count is not a
completion percentage. Render board-game boxes within the stable shelf layout.

Continue surfaces in-progress items and uses existing optimistic tracking/version checks.
Custom collections belong to an account and can contain multiple media types. A library entry
can belong to multiple collections. Collection deletion never deletes library records. SQL
foreign keys and API checks enforce ownership; collection memberships cascade when items or
accounts are removed. Export collections by media identity, not installation-specific row IDs,
and restore memberships after library entries exist.

## Consequences

A new additive migration requires supervised homelab upgrade under the existing deployment
controller policy. Add BGG_API_TOKEN to both server env and frozen host Compose configuration.
Do not rename the existing database/volume or bypass migration review. No live provider token
is required for mocked tests. Confirm commercial BGG permission before monetization.

## Alternatives considered

Treating board games as video games confuses completion and ownership. Storing collections only
in browser preferences loses them on other devices. Storing exported UUID memberships would
break cross-account or cross-installation restores. Blocking library navigation on metadata
would regress responsiveness.
