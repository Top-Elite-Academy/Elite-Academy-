#!/usr/bin/env bash
# =============================================================================
# First deploy on the server: asks for the settings, generates the secrets,
# writes .env.production, then builds, migrates, seeds and starts everything.
#
#   cd /opt/elite-tech && ./scripts/server/configure.sh
#
# Any answer can be given in advance as an environment variable of the same
# name (e.g. DOMAIN=academy.example.com ./scripts/server/configure.sh).
# An existing .env.production is never overwritten: the script then only
# (re)deploys with it.
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/../.."

ENV_FILE=.env.production
TEMPLATE=.env.production.example
PROD="sh ./scripts/prod.sh"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }

# ask VAR "Question" [default] [secret]
ask() {
  local var=$1 question=$2 default=${3:-} secret=${4:-} answer
  if [ -n "${!var:-}" ]; then return; fi
  while true; do
    if [ -n "$secret" ]; then
      read -r -s -p "$question: " answer
      echo
    else
      read -r -p "$question${default:+ [$default]}: " answer
    fi
    answer=${answer:-$default}
    if [[ "$answer" == *"'"* ]]; then
      echo "  Please don't use the ' character."
    elif [ -n "$answer" ] || [ "$default" = "-" ]; then
      break
    fi
  done
  [ "$answer" = "-" ] && answer=""
  printf -v "$var" '%s' "$answer"
}

# set_var KEY VALUE: replaces KEY=… in the env file (adds it if missing). Values are quoted.
set_var() {
  KEY=$1 VALUE=$2 awk '
    BEGIN { key = ENVIRON["KEY"]; line = key "=\x27" ENVIRON["VALUE"] "\x27"; done = 0 }
    index($0, key "=") == 1 { if (!done) print line; done = 1; next }
    { print }
    END { if (!done) print line }
  ' "$ENV_FILE" > "$ENV_FILE.tmp" && mv "$ENV_FILE.tmp" "$ENV_FILE"
}

hex() { openssl rand -hex "$1"; }

if [ ! -f "$ENV_FILE" ]; then
  say "Elite Tech Academy — production settings"
  echo "Press Enter to accept the value in [brackets]. Passwords are not shown while you type."

  ask DOMAIN "Website domain (without https://)"
  ask ACME_EMAIL "Email for HTTPS certificate notices"

  say "File storage"
  echo "  1) on this server (free, uses the server's disk)"
  echo "  2) Cloudflare R2 (needs an R2 subscription and two access keys)"
  ask STORAGE_MODE "Choose 1 or 2" "1"

  say "Captcha (Cloudflare → Turnstile → your widget)"
  ask NEXT_PUBLIC_TURNSTILE_SITE_KEY "Turnstile SITE key"
  ask TURNSTILE_SECRET_KEY "Turnstile SECRET key" "" secret

  say "Email (SMTP)"
  ask SMTP_HOST "SMTP server" "in-v3.mailjet.com"
  ask SMTP_USER "SMTP user (Mailjet: API key)"
  ask SMTP_PASSWORD "SMTP password (Mailjet: secret key)" "" secret
  ask MAIL_FROM "Sender" "Elite Tech Academy <no-reply@${DOMAIN}>"

  say "Lesson videos (Cloudflare Stream) — type - to skip for now"
  ask CLOUDFLARE_ACCOUNT_ID "Cloudflare account ID" "-"
  if [ -n "$CLOUDFLARE_ACCOUNT_ID" ]; then
    ask CLOUDFLARE_STREAM_API_TOKEN "Stream API token" "" secret
    ask CLOUDFLARE_STREAM_CUSTOMER_CODE "Stream customer code (customer-xxxx)"
  fi

  say "First admin account"
  ask SEED_ADMIN_EMAIL "Admin email"
  ask SEED_ADMIN_PASSWORD "Admin password (min 10 characters)" "" secret

  cp "$TEMPLATE" "$ENV_FILE"
  chmod 600 "$ENV_FILE"

  set_var DOMAIN "$DOMAIN"
  set_var ACME_EMAIL "$ACME_EMAIL"
  set_var POSTGRES_PASSWORD "$(hex 32)"
  set_var REDIS_PASSWORD "$(hex 32)"
  set_var FIELD_ENCRYPTION_KEY "$(openssl rand -base64 32)"
  set_var NEXT_PUBLIC_TURNSTILE_SITE_KEY "$NEXT_PUBLIC_TURNSTILE_SITE_KEY"
  set_var TURNSTILE_SECRET_KEY "$TURNSTILE_SECRET_KEY"
  set_var SMTP_HOST "$SMTP_HOST"
  set_var SMTP_USER "$SMTP_USER"
  set_var SMTP_PASSWORD "$SMTP_PASSWORD"
  set_var MAIL_FROM "$MAIL_FROM"
  set_var SEED_ADMIN_EMAIL "$SEED_ADMIN_EMAIL"
  set_var SEED_ADMIN_PASSWORD "$SEED_ADMIN_PASSWORD"

  if [ "$STORAGE_MODE" = "1" ]; then
    files_domain="files.${DOMAIN}"
    storage_key="$(hex 10)"
    storage_secret="$(hex 32)"
    set_var COMPOSE_PROFILES "local-storage"
    set_var FILES_DOMAIN "$files_domain"
    set_var STORAGE_ENDPOINT "http://storage:9000"
    set_var STORAGE_PUBLIC_ENDPOINT "https://${files_domain}"
    set_var STORAGE_REGION "us-east-1"
    set_var STORAGE_ACCESS_KEY_ID "$storage_key"
    set_var STORAGE_SECRET_ACCESS_KEY "$storage_secret"
    # Backups go to a second bucket of the same storage. Keep Hetzner server
    # backups on as well: this copy is on the same disk.
    set_var BACKUP_S3_ENDPOINT "http://storage:9000"
    set_var BACKUP_S3_REGION "us-east-1"
    set_var BACKUP_S3_PROVIDER "Other"
    set_var BACKUP_S3_ACCESS_KEY_ID "$storage_key"
    set_var BACKUP_S3_SECRET_ACCESS_KEY "$storage_secret"
    media="https://${files_domain}"
  else
    ask R2_ACCOUNT_ID "Cloudflare account ID (for R2)"
    ask STORAGE_ACCESS_KEY_ID "R2 access key ID (files bucket)"
    ask STORAGE_SECRET_ACCESS_KEY "R2 secret access key (files bucket)" "" secret
    ask BACKUP_S3_ACCESS_KEY_ID "R2 access key ID (backups bucket)"
    ask BACKUP_S3_SECRET_ACCESS_KEY "R2 secret access key (backups bucket)" "" secret
    r2="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
    for key in STORAGE_ENDPOINT STORAGE_PUBLIC_ENDPOINT BACKUP_S3_ENDPOINT; do set_var "$key" "$r2"; done
    set_var STORAGE_ACCESS_KEY_ID "$STORAGE_ACCESS_KEY_ID"
    set_var STORAGE_SECRET_ACCESS_KEY "$STORAGE_SECRET_ACCESS_KEY"
    set_var BACKUP_S3_ACCESS_KEY_ID "$BACKUP_S3_ACCESS_KEY_ID"
    set_var BACKUP_S3_SECRET_ACCESS_KEY "$BACKUP_S3_SECRET_ACCESS_KEY"
    media="$r2"
  fi

  if [ -n "$CLOUDFLARE_ACCOUNT_ID" ]; then
    set_var CLOUDFLARE_ACCOUNT_ID "$CLOUDFLARE_ACCOUNT_ID"
    set_var CLOUDFLARE_STREAM_API_TOKEN "$CLOUDFLARE_STREAM_API_TOKEN"
    set_var CLOUDFLARE_STREAM_CUSTOMER_CODE "$CLOUDFLARE_STREAM_CUSTOMER_CODE"
  else
    # The API requires these values; uploads of lesson videos fail until real ones are set.
    set_var CLOUDFLARE_ACCOUNT_ID "not-configured"
    set_var CLOUDFLARE_STREAM_API_TOKEN "not-configured"
    set_var CLOUDFLARE_STREAM_CUSTOMER_CODE "not-configured"
  fi
  set_var MEDIA_ORIGINS "$media https://*.cloudflarestream.com https://upload.videodelivery.net"
  # The default ClamAV image is x86 only; its Debian variant also runs on ARM.
  case "$(uname -m)" in
    aarch64 | arm64) set_var CLAMAV_IMAGE "clamav/clamav-debian:1.4" ;;
  esac
  echo "Saved $ENV_FILE (readable by root only)."
fi

# Read back what the deploy needs.
setting() { sed -n "s/^$1=//p" "$ENV_FILE" | tail -n 1 | sed "s/^'\(.*\)'$/\1/; s/^\"\(.*\)\"$/\1/"; }
DOMAIN=$(setting DOMAIN)
FILES_DOMAIN=$(setting FILES_DOMAIN)
POSTGRES_USER=$(setting POSTGRES_USER)
POSTGRES_DB=$(setting POSTGRES_DB)

if [ -n "$FILES_DOMAIN" ]; then
  cp deploy/caddy/sites-available/files.caddy deploy/caddy/sites-enabled/files.caddy
fi

say "Building the images (10–15 minutes the first time)…"
$PROD --profile ops build

say "Starting the databases…"
$PROD up -d postgres redis
if [ -n "$FILES_DOMAIN" ]; then
  $PROD up -d storage
  key=$(setting STORAGE_ACCESS_KEY_ID)
  secret=$(setting STORAGE_SECRET_ACCESS_KEY)
  for bucket in "$(setting STORAGE_BUCKET)" "$(setting BACKUP_S3_BUCKET)"; do
    $PROD run --rm --no-deps backup \
      rclone mkdir ":s3,provider=Other,endpoint='http://storage:9000',access_key_id=$key,secret_access_key=$secret:$bucket"
  done
fi

say "Creating the database tables…"
$PROD run --rm migrate

say "Creating the first admin and the catalogue…"
$PROD run --rm seed
# The admin exists now: the password does not need to stay on the server.
set_var SEED_ADMIN_PASSWORD ""

say "Starting everything…"
$PROD up -d
sleep 20
$PROD ps

say "Done."
echo "Website:  https://${DOMAIN}   (sign in at https://${DOMAIN}/en/login)"
[ -n "$FILES_DOMAIN" ] && echo "Files:    https://${FILES_DOMAIN}  (needs a DNS record like the main domain)"
echo "Logs:     ./scripts/prod.sh logs -f api"
echo "Backup now: ./scripts/prod.sh exec backup entrypoint.sh backup"
echo "Database used: ${POSTGRES_DB} (user ${POSTGRES_USER})"
