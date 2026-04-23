#!/bin/sh
# --------------------------------------------------------------------
# DFT Portal — container entrypoint
#
#  1. Applies the Prisma schema to the connected database:
#       - `migrate deploy` if migrations exist,
#       - otherwise `db push` (acceptable because the schema is additive
#         for the initial deployment).
#  2. Hands off to the Next.js server via `exec "$@"`.
#
# The Prisma CLI is installed globally in the runner image (see Dockerfile)
# so we just call `prisma` directly — no pnpm symlink gymnastics required.
# App-runtime `@prisma/client` lives inside the traced Next standalone
# output already, so we do not need to duplicate it in node_modules here.
# --------------------------------------------------------------------
set -eu

if [ -d "./prisma/migrations" ] && [ "$(ls -A ./prisma/migrations 2>/dev/null | wc -l)" -gt 0 ]; then
  echo "➜ prisma migrate deploy"
  prisma migrate deploy
else
  echo "➜ prisma db push (no migrations dir yet)"
  prisma db push --skip-generate
fi

exec "$@"
