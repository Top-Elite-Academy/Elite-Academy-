# syntax=docker/dockerfile:1.7
# =============================================================================
# Elite Tech Academy — web image (Next.js standalone server).
#
# Build from the repository root (the build needs the whole monorepo):
#   docker build -f apps/web/Dockerfile \
#     --build-arg API_INTERNAL_URL=http://api:4000 \
#     --build-arg WEB_ORIGIN=https://example.com \
#     --build-arg NEXT_PUBLIC_TURNSTILE_SITE_KEY=... \
#     -t eta-web .
#
# Build arguments are values Next.js fixes at BUILD time:
#   API_INTERNAL_URL                 target of the /api/* rewrite (next.config.ts)
#   NEXT_PUBLIC_TURNSTILE_SITE_KEY   inlined into the browser bundle
#   WEB_ORIGIN                       used by any page rendered at build time
# They are not secrets. Changing one means rebuilding the image.
# Runtime settings (WEB_ORIGIN, MEDIA_ORIGINS, API_INTERNAL_URL) come from the
# container environment.
# =============================================================================

# Node 22 LTS, matching .nvmrc and CI (override with --build-arg NODE_IMAGE=…).
ARG NODE_IMAGE=node:22-alpine

# ---- base: Node + pnpm (version pinned by "packageManager" in package.json) ----
FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    TURBO_TELEMETRY_DISABLED=1 \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo

# ---- prune: keep only @eta/web and the workspace packages it depends on ----
FROM base AS prune
COPY . .
# Root dependencies only (turbo, at the exact version in pnpm-lock.yaml).
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter elite-tech-academy
RUN pnpm exec turbo prune @eta/web --docker

# ---- build ----
FROM base AS build
# (out/json also holds the pruned pnpm-lock.yaml and pnpm-workspace.yaml.)
COPY --from=prune /repo/out/json/ ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile
COPY --from=prune /repo/out/full/ ./

ARG API_INTERNAL_URL
ARG WEB_ORIGIN
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV API_INTERNAL_URL=${API_INTERNAL_URL} \
    WEB_ORIGIN=${WEB_ORIGIN} \
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=${NEXT_PUBLIC_TURNSTILE_SITE_KEY} \
    NEXT_OUTPUT=standalone \
    NODE_ENV=production
RUN : "${API_INTERNAL_URL:?build arg API_INTERNAL_URL is required}" \
      "${WEB_ORIGIN:?build arg WEB_ORIGIN is required}" \
      "${NEXT_PUBLIC_TURNSTILE_SITE_KEY:?build arg NEXT_PUBLIC_TURNSTILE_SITE_KEY is required}" \
 && pnpm exec turbo run build --filter=@eta/web

# ---- runtime: only the traced standalone server, static assets and public files ----
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
WORKDIR /app
# Files stay owned by root (read-only for the app); the process runs as "node".
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
# The only place Next.js writes at run time (optimised-image cache).
RUN mkdir -p apps/web/.next/cache && chown node:node apps/web/.next/cache
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
