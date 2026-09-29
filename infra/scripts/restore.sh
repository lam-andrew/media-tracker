#!/bin/sh
# Restore to a NEW database only. Never overwrite the running library.
set -eu
infra_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
backup_file=${1:?Usage: restore.sh BACKUP.dump NEW_DATABASE_NAME}
restore_db=${2:?Choose a new database name, for example marqd_restore_20260927}
case "$restore_db" in marqd_restore_*) ;; *) echo 'Database must start with marqd_restore_'; exit 1;; esac
case "$restore_db" in *[!a-z0-9_]*) echo 'Use only lowercase letters, numbers and underscores'; exit 1;; esac
[ -f "$backup_file" ]
docker compose -f "$infra_dir/compose.yaml" exec -T db createdb -U marqd "$restore_db"
docker compose -f "$infra_dir/compose.yaml" exec -T db pg_restore -U marqd -d "$restore_db" --no-owner --exit-on-error < "$backup_file"
printf 'Restored to separate database %s. The running library is unchanged.\n' "$restore_db"
