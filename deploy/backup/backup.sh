#!/bin/sh
# One backup: pg_dump (compressed custom format) → check → upload → delete old backups.
# Needs the variables exported by entrypoint.sh.
set -eu

retention_days="${BACKUP_RETENTION_DAYS:-14}"
name="${PGDATABASE}-$(date -u +%Y%m%dT%H%M%SZ).dump"
file="/tmp/$name"
trap 'rm -f "$file"' EXIT

echo "[backup] $(date -u +%FT%TZ) dumping database ${PGDATABASE}…"
# -Fc: compressed, restorable table by table with pg_restore.
pg_dump --format=custom --compress=9 --no-owner --no-acl --file="$file"

# A dump that pg_restore cannot read is not a backup.
pg_restore --list "$file" > /dev/null
size=$(du -h "$file" | cut -f1)

echo "[backup] uploading $name ($size)…"
rclone copyto "$file" "$BACKUP_REMOTE/$name"

echo "[backup] deleting backups older than ${retention_days} days…"
rclone delete --min-age "${retention_days}d" "$BACKUP_REMOTE"

echo "[backup] done: $name"
