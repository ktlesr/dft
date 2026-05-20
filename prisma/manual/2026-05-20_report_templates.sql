-- Report templates for admin-managed downloadable files
-- Scope:
-- - GENEL  -> visible to all active users under "Raporlar"
-- - GROUPS -> visible only to users whose groupId is in targetGroupIds

BEGIN;

DO $$
BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REPORT_TEMPLATE_CREATED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ReportTemplate" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "scope" TEXT NOT NULL,
  "targetGroupIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "ReportTemplate_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE "Attachment"
  ADD COLUMN IF NOT EXISTS "reportTemplateId" TEXT;

DO $$
BEGIN
  ALTER TABLE "Attachment"
    ADD CONSTRAINT "Attachment_reportTemplateId_fkey"
    FOREIGN KEY ("reportTemplateId") REFERENCES "ReportTemplate"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "ReportTemplate_createdById_idx"
  ON "ReportTemplate"("createdById");

CREATE INDEX IF NOT EXISTS "ReportTemplate_scope_createdAt_idx"
  ON "ReportTemplate"("scope", "createdAt");

CREATE INDEX IF NOT EXISTS "Attachment_reportTemplateId_idx"
  ON "Attachment"("reportTemplateId");

COMMIT;
