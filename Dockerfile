# syntax=docker/dockerfile:1.7
#
# DFT Portal — production Dockerfile
# --------------------------------------------------------------------
# Multi-stage, Next.js 15 standalone, pnpm, Prisma, @node-rs/argon2
# (native module → Debian slim, not Alpine, to avoid glibc/musl edge cases).
# Image size ≈ 300–350 MB.
# --------------------------------------------------------------------

ARG NODE_VERSION=22.20.0
ARG PNPM_VERSION=10.19.0

# ======================================================================
# Base layer — Node + pnpm + openssl (needed by Prisma engine on Debian)
# ======================================================================
FROM node:${NODE_VERSION}-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates tini \
 && rm -rf /var/lib/apt/lists/*

# ======================================================================
# Dependencies — install everything (dev + prod) for the build stage.
# ======================================================================
FROM base AS deps
WORKDIR /app
# Allow prisma/argon2 postinstall scripts that we approved in package.json.
COPY package.json pnpm-lock.yaml ./
COPY prisma/schema.prisma ./prisma/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod=false

# ======================================================================
# Builder — generate Prisma client, compile Next in standalone mode.
# ======================================================================
FROM base AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Opt into standalone output; skipped on Windows dev (pnpm symlink EPERM).
ENV BUILD_STANDALONE=true
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate
RUN pnpm build

# ======================================================================
# Runner — minimal runtime image.
# Ships: Next standalone + static + public + Prisma CLI/engine + schema.
# ======================================================================
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs

# Next.js standalone output (server + traced @prisma/client for app runtime)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma schema — needed by the CLI at startup for db push / migrate deploy.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Prisma CLI — installed globally via npm rather than copied from the
# pnpm-built `node_modules/` (pnpm stores deps under `.pnpm/` with
# symlinks that don't survive a plain Docker COPY). Global install gives
# us a clean, non-symlinked `/usr/local/bin/prisma` for the entrypoint.
# App runtime uses the traced `@prisma/client` already inside the Next
# standalone output.
ARG PRISMA_VERSION=6.19.3
RUN npm install -g prisma@${PRISMA_VERSION} \
 && npm cache clean --force

# Persistent upload dir — mount a named volume here in docker-compose.
RUN mkdir -p /app/storage/uploads && chown -R nextjs:nodejs /app/storage

# Entrypoint: applies the schema, then hands off to the Next server.
COPY --chown=nextjs:nodejs docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok||r.status===307||r.status===302?0:1)).catch(()=>process.exit(1))"

# `tini` reaps zombie processes and forwards signals cleanly to the app.
ENTRYPOINT ["/usr/bin/tini", "--", "docker-entrypoint.sh"]
CMD ["node", "server.js"]
