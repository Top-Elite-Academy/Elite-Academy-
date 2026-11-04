# Elite Tech Academy

Learning platform: public website, student area, admin and CRM. The product
specification is [docs/SPEC.md](docs/SPEC.md); decisions are recorded in [docs/adr/](docs/adr/).

## Requirements

- Node.js 22.12+ and pnpm 10 (`npm install -g pnpm@10`)
- Docker Desktop (runs Postgres, Redis and Mailpit locally)

## Run it locally

```bash
pnpm install
cp .env.example .env          # then fill FIELD_ENCRYPTION_KEY and SEED_ADMIN_PASSWORD (see comments)
pnpm db:up                    # Postgres, Redis and Mailpit in Docker
pnpm db:migrate               # create the tables
pnpm db:seed                  # create the first admin (from SEED_ADMIN_* in .env)
pnpm dev                      # web on http://localhost:3000, API on http://localhost:4000
```

| What                   | Where                                                           |
| ---------------------- | --------------------------------------------------------------- |
| Website                | http://localhost:3000 (redirects to `/en`; also `/ar`, `/he`)   |
| Sign in                | http://localhost:3000/en/login (not linked in the header in v1) |
| API docs (OpenAPI)     | http://localhost:4000/api/docs                                  |
| Emails sent by the app | http://localhost:8025 (Mailpit)                                 |

The first admin sign-in asks you to set up two-step verification with an
authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…).

## Commands

| Command                 | What it does                                                      |
| ----------------------- | ----------------------------------------------------------------- |
| `pnpm dev`              | Run web + API in watch mode                                       |
| `pnpm start`            | Build, then run web + API at full speed (no reload on edits)      |
| `pnpm build`            | Production build of every package                                 |
| `pnpm lint`             | ESLint everywhere + the RTL logical-CSS check                     |
| `pnpm typecheck`        | TypeScript (strict) everywhere                                    |
| `pnpm test`             | Unit tests (no Docker needed)                                     |
| `pnpm test:integration` | API tests against Docker Postgres/Redis (uses a separate test DB) |
| `pnpm test:e2e`         | Builds the web app and runs Playwright + axe accessibility checks |
| `pnpm format`           | Prettier                                                          |
| `pnpm db:up / db:down`  | Start / stop the Docker services                                  |

First time running e2e tests: `pnpm --filter @eta/web exec playwright install chromium`.

## Project structure

```
apps/
  web/        Next.js (App Router), next-intl (en/ar/he), Tailwind
    messages/         every UI text, one file per language
    src/app/[locale]/ pages; (public) group = header + footer frame
    src/components/   ui/, layout/, forms/, auth/, brand/, account/
    src/config/       navigation links, contact details
    src/styles/       design tokens (colours, fonts) — the only place they are defined
    e2e/              Playwright tests
  api/        NestJS modular monolith
    src/config/       env schema (validated at startup) → typed AppConfig
    src/common/       prisma, redis, crypto, errors, guards (CSRF, rate limit, roles), access policy
    src/modules/      auth, users, invitations, audit, consent, mail, health
    test/             integration tests
packages/
  db/         Prisma schema + migrations
  shared/     Zod schemas, roles, locales, API types — used by both web and API
  tsconfig/, eslint-config/
```

## Rules of the codebase

- **Text:** never hard-code UI text — add it to `apps/web/messages/{en,ar,he}.json` (lint and tests enforce this and that the three files have the same keys).
- **RTL:** use logical CSS (`ms-`, `pe-`, `start-`, `text-start`), never `left`/`right` (`pnpm lint` checks).
- **Config:** every setting comes from `.env`, validated by `apps/api/src/config/env.schema.ts`; document new variables in `.env.example`.
- **Security:** the server decides access. Every route needs a session unless marked `@Public()`; use `@Roles()` and `AccessPolicy` for ownership. See [SECURITY.md](SECURITY.md).
- **Validation:** request bodies are validated with the shared Zod schemas; never accept roles, prices or ids of other users from the browser.
# Elite-Academy-
