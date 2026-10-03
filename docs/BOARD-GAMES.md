# Board games and library tools

Marqd supports a distinct Board games catalog, ownership, ratings, notes, play count and
last-played date. Video games remains a separate category. Board-game boxes use the existing
shelf; they do not use completion percentages. Continue offers quick updates for in-progress
items. Collections group existing library items across media types without duplicating them.

## BoardGameGeek setup

1. Sign in to BoardGameGeek and open https://boardgamegeek.com/using_the_xml_api.
2. Register Marqd with an accurate description of its current personal homelab use and
   intended future commercial use. Follow their approval/token process. Commercial permission
   is separate; do not assume a personal token licenses monetization.
3. Add `BGG_API_TOKEN` to your server's existing protected app environment file. Never paste
   it into chat, commit it, or bake it into a frontend/container image.
4. Ensure the API service receives `BGG_API_TOKEN: ${BGG_API_TOKEN:-}`. The repository templates
   include this; the homelab deployer uses a frozen `/etc/marqd-deploy/compose.yaml`, so its
   operator must add that mapping there too. Adding only the env value will not pass it through.
5. Recreate the API using your homelab deployment procedure. Search for a known board game,
   open its details, and verify a saved entry's ownership and play tracking.

Without a token, the catalog reports that setup is needed. Existing saved board games and
other media keep working. Upstream requests are throttled/cached, so a fresh search can take
longer than cached browsing. The UI should respond immediately while results arrive.

## Supervised collection upgrade

`003-collections.sql` adds private collections and memberships. It does not rewrite existing
library entries. Your deployment controller will pause on the changed migration fingerprint.
Have the homelab task follow [deployment recovery/upgrade guidance](HOMELAB-DEPLOYMENT.md):
backup, restore rehearsal, supervised upgrade, verify account/library access and collections,
then reconcile the migration baseline. Do not delete review markers just to force deployment.

Verify that deleting a collection leaves its stories in the library and that an export/restore
retains memberships. Old backups without collections and board-game fields remain supported.
