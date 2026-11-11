# Deploying Elite Tech Academy to production

This guide puts the whole platform on **one rented server** for the lowest monthly
cost. It assumes you have never run a server before. Follow the steps in order;
each one says what to type and what you should see.

```
 Visitor ──HTTPS──▶ Cloudflare (free: DNS, CDN, DDoS protection)
                        │  HTTPS, "Full (strict)"
                        ▼
 ┌──────────────── Hetzner server (Ubuntu 24.04, Docker) ────────────────┐
 │  caddy :80/:443  ──▶  web (Next.js)  ──/api/*──▶  api (NestJS + jobs)   │
 │  (only open ports)                                  │                  │
 │                         internal network: postgres · redis · clamav    │
 │  backup (nightly pg_dump) ─────────────────────────────────────────────┼──▶ R2 "backups" bucket
 └────────────────────────────────────────────────────────────────────────┘
       api ──▶ Cloudflare R2 "files" bucket (lesson files, videos)
       api ──▶ Brevo / Resend (SMTP, email)
```

The browser only ever talks to `https://DOMAIN`. The web app forwards `/api/*` to
the API inside Docker, exactly as in development (`apps/web/next.config.ts`).

| File                      | What it is                                                      |
| ------------------------- | --------------------------------------------------------------- |
| `docker-compose.prod.yml` | All services, health checks, memory limits, networks            |
| `apps/web/Dockerfile`     | Website image (Next.js standalone)                              |
| `apps/api/Dockerfile`     | API image; `--target migrate` builds the migration image        |
| `deploy/caddy/Caddyfile`  | HTTPS and the reverse proxy                                     |
| `deploy/backup/`          | Nightly backup, list and restore                                |
| `.env.production.example` | Every production setting, with how to generate each secret      |
| `scripts/prod.sh`         | Runs `docker compose` with the production files — always use it |

---

## 0. Production choices already made

The API checks its settings at start-up (`apps/api/src/config/env.schema.ts`)
and refuses unsafe ones in production. The production template is set up so
that it starts:

- **Payments: `PAYMENT_PROVIDER=disabled`.** No payment gateway is connected yet
  (the `test` provider is refused in production: its fake checkout would let
  anyone mark an order as paid). Booking a paid mentoring session answers
  "Online booking opens soon. Please contact us to book a session." and no order
  is created. Courses work as before (enquiry form + admin confirmation). When
  Cardcom / Tranzila / Grow is connected, implement `PaymentProvider`
  (`apps/api/src/modules/payments/payment-provider.ts`) and change this setting.
- **Videos: `VIDEO_PROVIDER=cloudflare` (Cloudflare Stream).** `local` is refused
  in production, and would not work behind Cloudflare anyway: a video is uploaded
  in one request and Cloudflare's free plan rejects requests over 100 MB. With
  Stream, the browser uploads straight to Cloudflare (resumable) and viewers get
  adaptive streaming. Cost: $5 per 1,000 minutes stored + $1 per 1,000 minutes
  watched (about $15/month for 10 hours of video watched 200 times).
- **Visitor IPs on server-rendered pages.** The web server passes the visitor's
  IP (`CLIENT_IP_HEADER`) to the API, so the per-IP rate limit counts each
  visitor rather than the web server.

Lesson files are capped at 100 MiB (≈ 105 MB); files close to that cap can be
rejected by Cloudflare's 100 MB limit (error 413).

## Quick path: the setup scripts

Steps 2.3–2.5 and 6–7 below are automated:

- `scripts/server/bootstrap.sh` (run once as root on a fresh Ubuntu 24.04 server,
  or automatically from Hetzner's cloud-init "user data"): updates, SSH keys only,
  firewall, swap, Docker.
- `scripts/server/configure.sh`: asks for the domain, captcha keys, SMTP login and
  the first admin, generates every other secret, writes `.env.production`, then
  builds, migrates, seeds and starts everything.

**Without R2:** answer `1` to the storage question. Files are then kept on the
server (the `storage` service) and downloaded from `https://files.DOMAIN` (add a
DNS record `files` pointing at the server, like the main domain). Nightly backups
go to a second bucket of that same storage, so also turn on **Hetzner server
backups**. Moving to R2 later: copy the bucket with rclone, change the `STORAGE_*`
and `BACKUP_S3_*` settings, remove `COMPOSE_PROFILES` and `FILES_DOMAIN`.

## 1. What you need

- A **domain name** (e.g. from Namecheap, GoDaddy or an Israeli registrar).
- A **credit card** for Hetzner and Cloudflare (R2 asks for a card even on the free tier).
- A computer with a terminal: **Terminal** on macOS, **PowerShell** on Windows.
- About 2 hours for the first deploy.

Words used below:

- **server** — the computer you rent at Hetzner.
- **SSH** — how you log in to the server from your terminal.
- **DOMAIN** — your domain, e.g. `elitetech.co.il`. Replace it everywhere.
- **SERVER_IP** — the server's public IPv4 address, shown in the Hetzner console.

---

## 2. Create the server (Hetzner Cloud)

### 2.1 Make an SSH key on your computer (once)

An SSH key is a pair of files: a private key that stays on your computer and a
public key you give to the server. It replaces passwords.

```bash
ssh-keygen -t ed25519 -C "your-email@example.com"
```

Press Enter to accept the file location, and choose a passphrase. Then show the
**public** key (the `.pub` file) and copy the whole line:

```bash
cat ~/.ssh/id_ed25519.pub          # macOS / Linux
type $env:USERPROFILE\.ssh\id_ed25519.pub   # Windows PowerShell
```

### 2.2 Create the server

1. Sign up at <https://console.hetzner.com> and create a project ("Elite Tech").
2. **Security → SSH keys → Add SSH key**: paste the line you copied.
3. **Servers → Add server**:
   - **Location**: Falkenstein, Nuremberg or Helsinki (any EU location).
   - **Image**: Ubuntu 24.04.
   - **Type**: Shared vCPU, x86 (Intel/AMD) → **CX23** (2 vCPU, 4 GB RAM, 40 GB disk).
     If it cannot be ordered, take **CX33** (8 GB); then you can raise the memory
     limits at the end of `.env.production`. Prefer x86 over Arm (CAX) so every
     image (ClamAV in particular) is sure to run.
   - **Networking**: keep Public IPv4 and IPv6.
   - **SSH keys**: tick your key.
   - **Backups**: optional (+20 % of the server price). They are whole-disk
     snapshots and complement the database backups below.
   - **Name**: `elite-tech-prod`.
4. Create. Copy the **IPv4 address** (SERVER_IP) and the **IPv6 address**.

### 2.3 First login and basic hardening

```bash
ssh root@SERVER_IP
```

Answer `yes` to the fingerprint question. You are now on the server (the prompt
shows `root@elite-tech-prod`). Run:

```bash
# Updates, and security updates installed automatically from now on
apt update && apt -y upgrade
apt -y install unattended-upgrades git
dpkg-reconfigure -f noninteractive unattended-upgrades

# A normal user for daily work (replace "deploy" if you like)
adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh && cp /root/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh && chmod 700 /home/deploy/.ssh
echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/deploy

# SSH: keys only, no root login
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/; s/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart ssh

# 4 GB swap: room for building the images and for peaks (ClamAV is big)
fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
sysctl vm.swappiness=10 && echo 'vm.swappiness=10' > /etc/sysctl.d/99-swappiness.conf
```

**Before closing this window**, open a second terminal and check you can log in
as the new user: `ssh deploy@SERVER_IP`. From now on always log in as `deploy`.

### 2.4 Firewall (ufw)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable          # answer y
sudo ufw status          # shows 22, 80, 443 ALLOW
```

> Docker manages its own firewall rules for published ports and they are not
> filtered by ufw. That is why `docker-compose.prod.yml` publishes **only**
> Caddy's 80/443; Postgres, Redis, ClamAV, the API and the web app have no
> published port at all. Never add `ports:` to those services.

Optional extra layer: in the Hetzner console, **Firewalls → Create firewall**
with inbound TCP 22, 80, 443 and apply it to the server.

### 2.5 Install Docker

The official Docker packages for Ubuntu:

```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker deploy
```

Log out (`exit`) and back in, then check: `docker run --rm hello-world` prints
"Hello from Docker!".

### 2.6 Get the code

```bash
sudo mkdir -p /opt/elite-tech && sudo chown deploy:deploy /opt/elite-tech
git clone https://github.com/Top-Elite-Academy/Elite-Academy-.git /opt/elite-tech
cd /opt/elite-tech
```

> If you make the repository private again (recommended), add a read-only
> **deploy key**: `ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N ""`, paste
> `~/.ssh/github_deploy.pub` in GitHub → repository → Settings → Deploy keys,
> and clone with `git@github.com:Top-Elite-Academy/Elite-Academy-.git`
> (add `Host github.com` / `IdentityFile ~/.ssh/github_deploy` to `~/.ssh/config`).

---

## 3. Point the domain at the server (Cloudflare)

1. Sign up at <https://dash.cloudflare.com> → **Add a domain** → enter DOMAIN →
   **Free** plan.
2. Cloudflare shows two **nameservers**. At your domain registrar, replace the
   domain's nameservers with these two. It can take from minutes to a day; Cloudflare
   emails you when the domain is active.
3. **DNS → Records**, add:

   | Type | Name | Content                                   | Proxy status                |
   | ---- | ---- | ----------------------------------------- | --------------------------- |
   | A    | `@`  | SERVER_IP                                 | **DNS only** (grey) for now |
   | AAAA | `@`  | server IPv6 (from Hetzner, ends in `::1`) | **DNS only** (grey) for now |

   Grey at first lets Caddy get its certificate directly. You switch to proxied
   (orange) in step 8.

4. **SSL/TLS → Overview**: set encryption mode to **Full (strict)**.
5. **SSL/TLS → Edge Certificates**: turn **Always Use HTTPS off**. Caddy already
   redirects every `http://` request to `https://` itself, and leaving this off
   keeps Caddy's certificate renewals (which arrive over plain HTTP) working.
   Turn **Automatic HTTPS Rewrites** on, minimum TLS version 1.2.
6. **Turnstile → Add widget**: name "Elite Tech", hostname DOMAIN, mode
   "Managed". Keep the **site key** and **secret key** for step 6.

---

## 4. Create the R2 buckets and access keys (Cloudflare)

1. In Cloudflare: **R2 Object Storage** → subscribe (free tier: 10 GB stored,
   1 M writes and 10 M reads a month, no download fees). Copy the **Account ID**
   shown on the R2 page.
2. **Create bucket** `elite-tech-files` (location: Automatic). Leave public access
   **off** — the app only hands out short-lived signed links.
3. **Create bucket** `elite-tech-backups`. Public access **off**.
   Optional safety net: bucket → Settings → **Object lifecycle rules** → delete
   objects older than 30 days (the backup job itself deletes after 14 days).
4. **R2 → Manage API tokens → Create API token**, twice:
   - "elite-tech-files": permission **Object Read & Write**, apply to the bucket
     `elite-tech-files` only.
   - "elite-tech-backups": **Object Read & Write**, bucket `elite-tech-backups` only.

   For each, copy the **Access Key ID** and **Secret Access Key** (shown once).
   The endpoint is `https://ACCOUNT_ID.r2.cloudflarestorage.com`.

Two tokens mean that if the app's key ever leaks, it cannot touch the backups.

---

### 4.1 Cloudflare Stream (lesson videos)

1. **Images & Stream → Hosted videos**: subscribe to Stream (pay-as-you-go).
   The page shows your **customer subdomain**, `customer-xxxx.cloudflarestream.com`:
   `CLOUDFLARE_STREAM_CUSTOMER_CODE=customer-xxxx`.
2. **My Profile → API Tokens → Create token → Custom token**: permission
   **Account → Stream → Edit**, for your account only. Copy the token
   (`CLOUDFLARE_STREAM_API_TOKEN`).
3. `CLOUDFLARE_ACCOUNT_ID` is on **Account home** (also in the dashboard URL).

## 5. Email (SMTP): Mailjet, Brevo or Resend

The app sends sign-in, invitation, booking and password-reset emails through
SMTP. Free plans are enough to start (Brevo ≈ 300 emails/day; Resend ≈ 3,000/month,
100/day — check their sites for current limits).

> Hetzner blocks outgoing ports 25 and 465 on new servers. Use **port 587**
> with `SMTP_SECURE=false` (the connection is upgraded to TLS with STARTTLS).

**Mailjet**

1. Sign up at <https://app.mailjet.com>.
2. **Account settings → Senders & domains → Add domain**: DOMAIN. Mailjet shows
   an SPF value and a DKIM record. In Cloudflare **DNS → Records**:
   - add the DKIM TXT record exactly as shown (`mailjet._domainkey`);
   - if the domain already has an SPF record (`v=spf1 …`), do **not** add a
     second one: add `include:spf.mailjet.com` to the existing one, e.g.
     `v=spf1 include:secureserver.net include:spf.mailjet.com -all`.

   Back in Mailjet, **Check status** until both show as valid.

3. **Account settings → API key management**: the **API key** and **secret key**.
4. Settings: `SMTP_HOST=in-v3.mailjet.com`, `SMTP_PORT=587`,
   `SMTP_USER=<API key>`, `SMTP_PASSWORD=<secret key>`,
   `MAIL_FROM="Elite Tech Academy <no-reply@DOMAIN>"`.

**Brevo**

1. Sign up at <https://www.brevo.com>.
2. **Senders, Domains & Dedicated IPs → Domains → Add a domain**: DOMAIN.
   Brevo lists DNS records (Brevo code, DKIM, DMARC). Add each one in
   Cloudflare **DNS → Records** exactly as shown. Back in Brevo, **Verify**.
3. **SMTP & API → SMTP**: note the **login** and **Generate a new SMTP key**.
4. Settings: `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_PORT=587`,
   `SMTP_USER=<login>`, `SMTP_PASSWORD=<SMTP key>`,
   `MAIL_FROM="Elite Tech Academy <no-reply@DOMAIN>"`.

**Resend**

1. Sign up at <https://resend.com> → **Domains → Add domain** → add the DNS
   records it shows in Cloudflare → Verify.
2. **API Keys → Create** (permission "Sending access").
3. Settings: `SMTP_HOST=smtp.resend.com`, `SMTP_PORT=587`, `SMTP_USER=resend`,
   `SMTP_PASSWORD=<API key>`, `MAIL_FROM` on your verified domain.

---

## 6. Fill in the production settings

On the server:

```bash
cd /opt/elite-tech
cp .env.production.example .env.production
chmod 600 .env.production
nano .env.production        # Ctrl+O, Enter to save; Ctrl+X to quit
```

Fill every line marked **CHANGE ME**. Generate the secrets on the server:

```bash
openssl rand -hex 32        # POSTGRES_PASSWORD   (run again for REDIS_PASSWORD)
openssl rand -base64 32     # FIELD_ENCRYPTION_KEY
```

Save **FIELD_ENCRYPTION_KEY** and both R2 keys in a password manager too. If
FIELD_ENCRYPTION_KEY is lost, every user must set up two-step verification again,
even after restoring a backup.

Check that Docker reads the file without complaint (prints nothing on success):

```bash
./scripts/prod.sh config --quiet
```

---

## 7. First deploy, migrations and seed

```bash
cd /opt/elite-tech

# 7.1 Build the images (10–15 minutes the first time)
./scripts/prod.sh --profile ops build

# 7.2 Start the databases
./scripts/prod.sh up -d postgres redis

# 7.3 Create the tables (prisma migrate deploy)
./scripts/prod.sh run --rm migrate
#     → "All migrations have been successfully applied."

# 7.4 First admin + public catalogue (same as `pnpm db:seed`; safe to re-run)
./scripts/prod.sh run --rm seed
#     → "Created admin …"  and  "Seeded … programs …"

# 7.5 Start everything
./scripts/prod.sh up -d
./scripts/prod.sh ps
```

After a minute `ps` shows every service **Up (healthy)**, except `backup`
(no health check) and `clamav`, which stays "starting" for up to 10 minutes the
first time while it downloads its virus database.

Open `https://DOMAIN` in your browser. Sign in at `https://DOMAIN/en/login` with
SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD and set up two-step verification.

Then **remove `SEED_ADMIN_PASSWORD`** from `.env.production` (leave the line empty)
and apply: `./scripts/prod.sh up -d`.

---

## 8. Switch on Cloudflare's proxy

Once `https://DOMAIN` works:

1. Cloudflare **DNS → Records**: click each record (A and AAAA) → **Proxied** (orange).
2. Wait a minute and reload `https://DOMAIN`. The certificate in the browser is
   now Cloudflare's; Cloudflare checks Caddy's certificate behind it ("Full (strict)").
3. Check the real visitor IP is used: `./scripts/prod.sh logs caddy | tail` shows
   each request with `client_ip` = the visitor's address (not a Cloudflare one).

The server's IP is still public. To accept web traffic only from Cloudflare, add
a Hetzner Firewall allowing 80/443 only from Cloudflare's ranges
(<https://www.cloudflare.com/ips/>). Note that Caddy then renews its certificate
through Cloudflare, which works as long as "Always Use HTTPS" stays off.

---

## 9. Everyday operations

| Task                   | Command (in `/opt/elite-tech`)                                            |
| ---------------------- | ------------------------------------------------------------------------- |
| Status                 | `./scripts/prod.sh ps`                                                    |
| Logs of one service    | `./scripts/prod.sh logs -f --tail 100 api` (or `web`, `caddy`, `backup`…) |
| Restart one service    | `./scripts/prod.sh restart api`                                           |
| Memory per container   | `docker stats --no-stream`                                                |
| Disk space             | `df -h /` and `docker system df`                                          |
| Free disk (old images) | `docker image prune -f`                                                   |

A free uptime monitor (e.g. UptimeRobot) on `https://DOMAIN/api/health` emails
you if the site or its database goes down.

### 9.1 Update after a code change

```bash
cd /opt/elite-tech
git pull
export IMAGE_TAG=$(git rev-parse --short HEAD)    # images named after the commit
./scripts/prod.sh --profile ops build
./scripts/prod.sh run --rm migrate                 # applies new migrations, if any
./scripts/prod.sh up -d                            # replaces changed containers
./scripts/prod.sh ps
docker image prune -f
```

The site is unavailable for a few seconds while the containers are replaced.
Run the backup first for a risky update: `./scripts/prod.sh exec backup entrypoint.sh backup`.

**Roll back** to the previous version: `git checkout <previous commit>`, then
`export IMAGE_TAG=<previous short commit>` and `./scripts/prod.sh up -d` (no build
needed while the old images still exist). Migrations are not undone automatically.

If you change `DOMAIN` or `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, rebuild:
`./scripts/prod.sh up -d --build` (they are built into the website).

### 9.2 Backups

The `backup` container runs every night (`BACKUP_CRON`, default 02:30 in
`BACKUP_TZ`): `pg_dump` → compressed custom format → checked with `pg_restore` →
uploaded to the `elite-tech-backups` bucket → backups older than
`BACKUP_RETENTION_DAYS` (14) deleted.

```bash
./scripts/prod.sh exec backup entrypoint.sh backup   # back up now
./scripts/prod.sh exec backup entrypoint.sh list     # what is in the bucket
./scripts/prod.sh logs backup                        # last night's result
```

Run a backup by hand right after the first deploy and check it appears in `list`.

What is **not** in these backups: files and videos (they live in R2, which keeps
them durably), `.env.production` (keep a copy in your password manager) and the
Caddy certificates (re-issued automatically).

### 9.3 Restore a backup

This **replaces** the current database with the backup.

```bash
cd /opt/elite-tech
./scripts/prod.sh exec backup entrypoint.sh list      # pick a file, or use "latest"
./scripts/prod.sh stop web api                         # nobody writes during the restore
./scripts/prod.sh run --rm backup restore latest       # or: restore eta-20261104T003000Z.dump
#   → asks you to type "yes"
./scripts/prod.sh up -d
./scripts/prod.sh ps
```

The restore runs in a single transaction: if anything fails, the database is
left as it was. Restoring onto a **new** server: do steps 2–7.2, then 7.3
(`migrate`), then restore, then `up -d`.

---

## 10. Expected monthly cost

Prices checked November 2026, excluding VAT.

| Item                                    | Plan                             | Monthly            |
| --------------------------------------- | -------------------------------- | ------------------ |
| Hetzner CX23 (2 vCPU, 4 GB, 40 GB disk) | incl. IPv4 €0.50                 | **€5.99**          |
| Hetzner server backups                  | optional, +20 %                  | €1.10              |
| Cloudflare DNS, CDN, SSL, Turnstile     | Free                             | €0                 |
| Cloudflare R2 (files + backups)         | free up to 10 GB, then $0.015/GB | €0 at the start    |
| Mailjet, Brevo or Resend                | Free tier                        | €0                 |
| Domain                                  | yearly at the registrar          | ≈ €1               |
| **Total**                               |                                  | **≈ €7–8 / month** |

With 8 GB (CX33): €8.99 instead of €5.99. Add Cloudflare Stream usage for videos
(section 0). Hetzner raised prices in 2026 and some
server types were temporarily not orderable; check the console before you buy.

---

## 11. Troubleshooting

| Symptom                                         | Cause and fix                                                                                                                                                        |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api` keeps restarting                          | `./scripts/prod.sh logs api` lists every invalid setting ("Invalid environment configuration"). Fix `.env.production`, then `./scripts/prod.sh up -d`.               |
| Cloudflare error **526**                        | Caddy has no valid certificate yet. Set the DNS records to DNS only (grey), check `./scripts/prod.sh logs caddy`, wait for "certificate obtained", then proxy again. |
| "Too many redirects"                            | Cloudflare SSL mode is Flexible. Set **Full (strict)**.                                                                                                              |
| Emails do not arrive                            | `./scripts/prod.sh logs api \| grep -i mail`. Check port 587, `SMTP_SECURE=false`, the SMTP key, and that the sender domain is verified.                             |
| Uploaded files stay "being checked" for minutes | ClamAV is still downloading its database after the first start (`./scripts/prod.sh logs clamav`).                                                                    |
| Upload fails with 413                           | Cloudflare's 100 MB request limit (section 0).                                                                                                                       |
| Server slow, out of memory                      | `docker stats --no-stream`; check the swap file exists (`swapon --show`); consider CX33 and higher limits in `.env.production`.                                      |
| Disk full                                       | `docker system df`, `docker image prune -f`, `docker builder prune -f`.                                                                                              |
