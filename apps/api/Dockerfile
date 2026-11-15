# syntax=docker/dockerfile:1.7
# =============================================================================
# Elite Tech Academy — API image (NestJS + BullMQ workers in one process).
#
# Build from the repository root (the build needs the whole monorepo):
#   docker build -f apps/api/Dockerfile -t eta-api .
#   docker build -f apps/api/Dockerfile --target migrate -t eta-migrate .
#
# Targets:
#   runtime (default)  the API. Also runs the seed scripts (dist/scripts/*.js).
#   migrate            one-off: `prisma migrate deploy` against DATABASE_URL.
#
# No secrets are baked in: every setting is read from the environment at run
# time and validated by apps/api/src/config/env.schema.ts.
# =============================================================================

# Node 22 LTS, matching .nvmrc and CI (override with --build-arg NODE_IMAGE=…).
ARG NODE_IMAGE=node:22-alpine

# ---- base: Node + pnpm (version pinned by "packageManager" in package.json) ----
FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    TURBO_TELEMETRY_DISABLED=1
# openssl: Prisma detects the system's OpenSSL to pick the migration engine.
RUN apk add --no-cache openssl && corepack enable
WORKDIR /repo

# ---- prune: keep only @eta/api and the workspace packages it depends on ----
FROM base AS prune
COPY . .
# Root dependencies only (turbo, at the exact version in pnpm-lock.yaml).
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter elite-tech-academy
RUN pnpm exec turbo prune @eta/api --docker

# ---- build: install, generate the Prisma client, compile ----
FROM base AS build
# Package manifests first, so the dependency layer is cached between code changes.
# (out/json also holds the pruned pnpm-lock.yaml and pnpm-workspace.yaml.)
COPY --from=prune /repo/out/json/ ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile
COPY --from=prune /repo/out/full/ ./
# @eta/db's build runs `prisma generate`, so the client is generated here, at build time.
RUN pnpm exec turbo run build --filter=@eta/api
# Self-contained copies: production dependencies only for the API;
# @eta/db with its dev dependencies for the migration image (needs the Prisma CLI).
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm --filter @eta/api deploy --legacy --prod /out/api \
 && pnpm --filter @eta/db deploy --legacy /out/db \
 && cp -r packages/db/prisma packages/db/prisma.config.ts /out/db/
# The API needs only compiled code and run-time packages (drops the Prisma CLI that
# pnpm links as an optional peer; see the script for details).
COPY scripts/prune-runtime-deps.mjs /tmp/
RUN node /tmp/prune-runtime-deps.mjs /out/api \
 && cd /out/api && rm -rf src test *.mts eslint.config.mjs tsconfig*.json nest-cli.json Dockerfile

# ---- migrate: one-off database migrations ----
FROM ${NODE_IMAGE} AS migrate
RUN apk add --no-cache openssl
ENV NODE_ENV=production
WORKDIR /db
COPY --from=build /out/db ./
USER node
CMD ["node_modules/.bin/prisma", "migrate", "deploy"]

# ---- runtime: the API ----
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production
WORKDIR /app
# Files stay owned by root (read-only for the app); the process runs as "node".
COPY --from=build /out/api ./
USER node
EXPOSE 4000
CMD ["node", "dist/main.js"]
