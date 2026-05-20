-- Add optional start/end datetime fields to Notice while keeping legacy eventAt.

BEGIN;

ALTER TABLE "Notice"
  ADD COLUMN IF NOT EXISTS "eventStartAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "eventEndAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Notice_eventStartAt_idx" ON "Notice"("eventStartAt");
CREATE INDEX IF NOT EXISTS "Notice_eventEndAt_idx" ON "Notice"("eventEndAt");

COMMIT;
