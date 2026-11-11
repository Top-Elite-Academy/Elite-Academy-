# =============================================================================
# Elite Tech Academy — nightly PostgreSQL backup to a separate R2 bucket.
#
# pg_dump comes from the same major version as the server (postgres:17).
# rclone uploads to any S3-compatible bucket (Cloudflare R2) and deletes old
# backups. Settings come from the environment (see .env.production.example).
#
#   (default)   cron: one backup per BACKUP_CRON, keeping BACKUP_RETENTION_DAYS
#   backup      one backup now
#   list        the backups in the bucket
#   restore X   restore backup X (a file name from `list`, or "latest")
# =============================================================================

ARG POSTGRES_IMAGE=postgres:17-alpine
FROM ${POSTGRES_IMAGE}

RUN apk add --no-cache rclone tzdata

COPY --chmod=0755 backup.sh restore.sh entrypoint.sh /usr/local/bin/

ENTRYPOINT ["entrypoint.sh"]
CMD ["cron"]
