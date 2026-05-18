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

# ─── Faz 7 pre-migration: `GroupCode` enum → plain text ───────────
#
# `Group.code` used to be the Prisma `GroupCode` enum (5 fixed values).
# Faz 7 moved admin group management fully to runtime (free-form codes),
# which means the column type changes from `"GroupCode"` to `text`.
# Postgres has no built-in enum→text implicit cast, so `prisma db push`
# refuses the conversion. We apply a one-shot idempotent ALTER here
# before handing off to Prisma; both pre- and post-migration databases
# tolerate re-running this block.
if [ -n "${DATABASE_URL:-}" ]; then
  echo "➜ ensuring Group.code is text (Faz 7 pre-migration)"
  node - <<'NODE'
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  try {
    // Check current column type — bail out fast if it's already text.
    const [{ data_type }] = await p.$queryRawUnsafe(
      `SELECT data_type FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'Group'
           AND column_name = 'code'`,
    );
    if (data_type === 'USER-DEFINED') {
      await p.$executeRawUnsafe(
        `ALTER TABLE "Group" ALTER COLUMN code TYPE text USING code::text`,
      );
      await p.$executeRawUnsafe(`DROP TYPE IF EXISTS "GroupCode"`);
      console.log('   Group.code altered to text; GroupCode enum dropped.');
    } else {
      console.log('   Group.code already ' + data_type + ' — skipping.');
    }
  } catch (e) {
    // Swallow "relation does not exist" on a fresh DB — Prisma will
    // create the table shortly. Any other error should bubble up.
    if (!String(e.message).includes('does not exist')) throw e;
    console.log('   Group table not present yet — skipping.');
  } finally {
    await p.$disconnect();
  }
})();
NODE
fi

if [ -d "./prisma/migrations" ] && [ "$(ls -A ./prisma/migrations 2>/dev/null | wc -l)" -gt 0 ]; then
  echo "➜ prisma migrate deploy"
  prisma migrate deploy
else
  # Faz 9: yeni `User.username` unique kolonu nullable; mevcut satırlar
  # NULL, Postgres NULL'ları unique ihlali saymaz → gerçekte veri kaybı
  # yok ama Prisma muhafazakar davranıp uyarı veriyor. `--accept-data-loss`
  # ile bu uyarı yok sayılır.
  #
  # Uzun vadede `prisma migrate dev` ile versiyonlanmış migration'lara
  # geçilmesi önerilir; o zaman bu bayrak gerekmez.
  echo "➜ prisma db push (no migrations dir yet)"
  prisma db push --skip-generate --accept-data-loss
fi

exec "$@"
