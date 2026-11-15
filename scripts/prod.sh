#!/bin/sh
# Runs `docker compose` for production with the right files (docs/DEPLOY.md).
#   ./scripts/prod.sh up -d --build
#   ./scripts/prod.sh run --rm migrate
#   ./scripts/prod.sh logs -f api
# ENV_FILE picks another settings file (default: .env.production).
set -eu

cd "$(dirname "$0")/.."
export ENV_FILE="${ENV_FILE:-.env.production}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE — create it from .env.production.example (docs/DEPLOY.md)." >&2
  exit 1
fi

exec docker compose --env-file "$ENV_FILE" -f docker-compose.prod.yml "$@"
