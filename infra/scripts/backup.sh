#!/bin/sh
set -eu
umask 077
infra_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
backup_dir=${1:-"$infra_dir/backups"}
mkdir -p "$backup_dir"
backup_file="$backup_dir/marqd-$(date -u +%Y%m%dT%H%M%SZ).dump"
docker compose -f "$infra_dir/compose.yaml" exec -T db pg_dump -U marqd -d marqd_v2 -Fc > "$backup_file.tmp"
mv "$backup_file.tmp" "$backup_file"
printf 'Backup saved: %s\n' "$backup_file"
