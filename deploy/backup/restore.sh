#!/bin/sh
# Restores one backup into the database, replacing what is there now.
#   restore.sh latest
#   restore.sh eta-20261104T003000Z.dump
# Stop the api and web services first (docs/DEPLOY.md, "Restore a backup").
set -eu

choice="${1:-}"
if [ -z "$choice" ]; then
  echo "Usage: restore <backup file name | latest>   (see: list)" >&2
  exit 2
fi

if [ "$choice" = "latest" ]; then
  # Names contain a UTC timestamp, so the last one alphabetically is the newest.
  choice=$(rclone lsf --files-only "$BACKUP_REMOTE" | sort | tail -n 1)
  [ -n "$choice" ] || { echo "No backups found." >&2; exit 1; }
fi

file="/tmp/$choice"
trap 'rm -f "$file"' EXIT

echo "[restore] downloading $choice…"
rclone copyto "$BACKUP_REMOTE/$choice" "$file"
pg_restore --list "$file" > /dev/null

if [ "${RESTORE_CONFIRM:-}" != "yes" ]; then
  printf 'This REPLACES all data in database "%s" with %s. Type "yes" to continue: ' "$PGDATABASE" "$choice"
  read -r answer
  [ "$answer" = "yes" ] || { echo "Cancelled."; exit 1; }
fi

echo "[restore] restoring into ${PGDATABASE}…"
# --clean --if-exists: drop each object before recreating it. One transaction:
# if anything fails, the database is left exactly as it was.
pg_restore --clean --if-exists --no-owner --no-acl --single-transaction \
  --exit-on-error --dbname="$PGDATABASE" "$file"

echo "[restore] done. Start the app again (docs/DEPLOY.md)."
