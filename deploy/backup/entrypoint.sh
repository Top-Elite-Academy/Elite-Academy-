#!/bin/sh
# Entry point of the backup container. See the Dockerfile for the commands.
set -eu

: "${PGHOST:?PGHOST is required}"
: "${PGUSER:?PGUSER is required}"
: "${PGPASSWORD:?PGPASSWORD is required}"
: "${PGDATABASE:?PGDATABASE is required}"
: "${BACKUP_S3_ENDPOINT:?set BACKUP_S3_ENDPOINT in .env.production}"
: "${BACKUP_S3_BUCKET:?set BACKUP_S3_BUCKET in .env.production}"
: "${BACKUP_S3_ACCESS_KEY_ID:?set BACKUP_S3_ACCESS_KEY_ID in .env.production}"
: "${BACKUP_S3_SECRET_ACCESS_KEY:?set BACKUP_S3_SECRET_ACCESS_KEY in .env.production}"

# rclone reads the bucket settings from these variables (no config file, nothing on disk).
export RCLONE_CONFIG_BACKUP_TYPE=s3
export RCLONE_CONFIG_BACKUP_PROVIDER="${BACKUP_S3_PROVIDER:-Cloudflare}"
export RCLONE_CONFIG_BACKUP_ENDPOINT="$BACKUP_S3_ENDPOINT"
export RCLONE_CONFIG_BACKUP_REGION="${BACKUP_S3_REGION:-auto}"
export RCLONE_CONFIG_BACKUP_ACCESS_KEY_ID="$BACKUP_S3_ACCESS_KEY_ID"
export RCLONE_CONFIG_BACKUP_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET_ACCESS_KEY"
# R2 tokens limited to one bucket may not check or create buckets.
export RCLONE_CONFIG_BACKUP_NO_CHECK_BUCKET=true
export BACKUP_REMOTE="backup:${BACKUP_S3_BUCKET}/${BACKUP_PREFIX:-postgres}"

case "${1:-cron}" in
  cron)
    schedule="${BACKUP_CRON:-30 2 * * *}"
    echo "Backups scheduled: '$schedule' (TZ=${TZ:-UTC}), keeping ${BACKUP_RETENTION_DAYS:-14} days."
    # Output of the job goes to the container log (docker compose logs backup).
    echo "$schedule /usr/local/bin/backup.sh > /proc/1/fd/1 2>&1" > /etc/crontabs/root
    exec crond -f -l 8
    ;;
  backup)
    exec backup.sh
    ;;
  list)
    exec rclone lsl "$BACKUP_REMOTE"
    ;;
  restore)
    shift
    exec restore.sh "$@"
    ;;
  *)
    exec "$@"
    ;;
esac
