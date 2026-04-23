#!/bin/sh
# --------------------------------------------------------------------
# DFT Portal — container entrypoint
#
#  1. Applies the Prisma schema to the connected database:
#       - `migrate deploy` if migrations exist,
#       - otherwise `db push` (acceptable because the schema is additive
#         for the initial deployment; swap to migrations in Faz 5).
#  2. Optionally runs the seed when RUN_SEED=true (first deploy only).
#  3. Hands off to the Next.js server via `exec "$@"`.
#
# The Prisma CLI is invoked directly through node so we do not need npx
# or a node_modules/.bin/ directory in the standalone runner image.
# --------------------------------------------------------------------
set -eu

PRISMA_CLI="node ./node_modules/prisma/build/index.js"

if [ -d "./prisma/migrations" ] && [ "$(ls -A ./prisma/migrations 2>/dev/null | wc -l)" -gt 0 ]; then
  echo "➜ prisma migrate deploy"
  $PRISMA_CLI migrate deploy
else
  echo "➜ prisma db push (no migrations dir yet)"
  $PRISMA_CLI db push --skip-generate
fi

if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "➜ Seeding (RUN_SEED=true)"
  # The seed is a TS file; we rely on tsx being available in the traced
  # bundle via `pnpm run db:seed` — but the standalone runner does not
  # ship tsx. Seeding from inside the container is therefore only viable
  # via a one-off `docker compose exec` with `npx tsx prisma/seed.ts`.
  echo "!! In-container seeding is disabled in standalone mode."
  echo "!! Run:  docker compose exec app sh -c 'node ./node_modules/prisma/build/index.js db push && ...'"
  echo "!! Or:   docker compose exec app node /app/prisma/seed.js  (if compiled)"
fi

exec "$@"
