#!/usr/bin/env bash
# Deploys one commit to the production server (docs/DEPLOY.md §9.1, automated).
#
# Run by .github/workflows/deploy.yml over SSH. The workflow pipes this file over
# stdin, so the copy on the server can change during `git checkout` without
# breaking the run:
#   ssh deploy@SERVER 'bash -s -- <commit-sha>' < scripts/server/deploy.sh
#
# By hand, on the server:
#   cd /opt/elite-tech && bash scripts/server/deploy.sh <commit-sha>
#
# Steps: fetch → check out the commit → build images → back up the database →
# migrate → replace containers → wait until healthy. If the new containers are
# not healthy, the previous version is started again (migrations are NOT undone,
# so keep them backwards compatible: add columns first, drop them a release later).
#
# Settings (environment variables):
#   APP_DIR      where the repository lives          (default /opt/elite-tech)
#   BRANCH       branch to fetch                     (default main)
#   SKIP_BACKUP  1 = no database backup before migrating (default 0)
set -Eeuo pipefail

SHA="${1:?usage: deploy.sh <commit-sha>}"
APP_DIR="${APP_DIR:-/opt/elite-tech}"
BRANCH="${BRANCH:-main}"
SKIP_BACKUP="${SKIP_BACKUP:-0}"
STATE_FILE=".git/deployed-commit" # last successful deploy; inside .git so never tracked

log() { printf '\n[deploy %s] %s\n' "$(date -u +%H:%M:%S)" "$*"; }
prod() { sh ./scripts/prod.sh "$@"; }

cd "$APP_DIR"

# One deploy at a time, even if two are started by hand.
exec 9>"/tmp/elite-tech-deploy.lock"
if ! flock -n 9; then
  echo "Another deploy is running." >&2
  exit 1
fi

[ -f .env.production ] || { echo "Missing $APP_DIR/.env.production" >&2; exit 1; }

log "Fetching $BRANCH"
git fetch --prune origin "$BRANCH"

# Only deploy commits that are on the deployed branch.
if ! git merge-base --is-ancestor "$SHA" "origin/$BRANCH"; then
  echo "Commit $SHA is not on origin/$BRANCH — refusing to deploy." >&2
  exit 1
fi
# A commit without the production files would take the site down.
git cat-file -e "$SHA:docker-compose.prod.yml" 2>/dev/null || {
  echo "Commit $SHA has no docker-compose.prod.yml — refusing to deploy." >&2
  exit 1
}

PREV_SHA="$(cat "$STATE_FILE" 2>/dev/null || git rev-parse HEAD)"
NEW_TAG="$(git rev-parse --short=12 "$SHA")"
PREV_TAG="$(git rev-parse --short=12 "$PREV_SHA")"
log "Deploying $NEW_TAG (now running: $PREV_TAG)"

rollback() {
  log "New version is not healthy — rolling back to $PREV_TAG"
  prod ps || true
  prod logs --tail 80 api web || true
  git checkout --quiet --force --detach "$PREV_SHA"
  export IMAGE_TAG="$PREV_TAG"
  if ! docker image inspect "elite-tech/web:$PREV_TAG" >/dev/null 2>&1; then
    prod --profile ops build # old images were removed; rebuild them
  fi
  prod up -d --wait --wait-timeout 300 caddy web api ||
    echo "ROLLBACK FAILED — check the server by hand (docs/DEPLOY.md §11)." >&2
  exit 1
}

git checkout --quiet --force --detach "$SHA"
export IMAGE_TAG="$NEW_TAG"

log "Checking the production settings"
prod config --quiet

log "Building images (web, api, migrate, backup)"
prod --profile ops build

if [ "$SKIP_BACKUP" != "1" ] && prod ps --status running --services | grep -qx backup; then
  log "Backing up the database before migrating"
  prod exec -T backup entrypoint.sh backup
fi

log "Applying database migrations"
prod up -d --wait postgres redis
prod run --rm migrate

log "Starting the new containers"
prod up -d || rollback
prod up -d --wait --wait-timeout 300 caddy web api || rollback

echo "$SHA" >"$STATE_FILE"
log "Healthy. Running containers:"
prod ps

# Keep the images of this and the previous release (for a fast rollback);
# remove older ones so the 40 GB disk does not fill up.
log "Removing old images"
for repo in web api migrate backup; do
  docker image ls "elite-tech/$repo" --format '{{.Tag}}' |
    grep -v -x -e "$NEW_TAG" -e "$PREV_TAG" -e latest |
    xargs -r -I{} docker image rm "elite-tech/$repo:{}" >/dev/null 2>&1 || true
done
docker image prune -f >/dev/null
docker builder prune -f --filter until=168h >/dev/null || true

log "Deployed $NEW_TAG"
