-- Phase 1 (KPI foundation):
-- - KPI enums
-- - KPI tables
-- - AuditAction enum extensions
--
-- Safe to run multiple times.

BEGIN;

DO $$
BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'KPI_CUSTOM_CREATED';
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'KPI_CUSTOM_UPDATED';
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'KPI_CUSTOM_APPROVED';
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'KPI_CUSTOM_REJECTED';
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'KPI_CUSTOM_REVISED';
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'KPI_BASELINE_CHANGED';
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'KPI_EVIDENCE_ADDED';
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'KPI_METRIC_EVENT_CREATED';
END $$;

DO $$
BEGIN
  CREATE TYPE "KpiMetricCode" AS ENUM (
    'KPI_PROJECT_IDEA_TOTAL',
    'KPI_PROJECT_APPLICATION_TOTAL',
    'KPI_SUCCESSFUL_PROJECT_TOTAL',
    'KPI_EVENT_ATTENDED_TOTAL',
    'KPI_EVENT_ORGANIZED_TOTAL',
    'KPI_CONTENT_TOTAL',
    'KPI_STAKEHOLDER_TOTAL'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "KpiSourceType" AS ENUM (
    'PROJECT_IDEA',
    'PROJECT_APPLICATION',
    'SUCCESSFUL_PROJECT',
    'EVENT',
    'CONTENT',
    'STAKEHOLDER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "KpiCustomStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'COMPLETED',
    'OVERACHIEVED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "KpiApprovalStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "KpiAssigneeType" AS ENUM (
    'USER_SINGLE',
    'USER_MULTI',
    'GROUP'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "KpiRevisionField" AS ENUM (
    'TARGET_VALUE',
    'TARGET_DATE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "KpiEvidenceType" AS ENUM (
    'COMPLETED',
    'OVERACHIEVED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "KpiMetricEvent" (
  "id" TEXT PRIMARY KEY,
  "metricCode" "KpiMetricCode" NOT NULL,
  "groupId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "sourceType" "KpiSourceType" NOT NULL,
  "sourceId" TEXT NOT NULL,
  "delta" INTEGER NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KpiMetricEvent_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "KpiMetricEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "KpiMetricEvent_metricCode_sourceType_sourceId_delta_key"
  ON "KpiMetricEvent"("metricCode", "sourceType", "sourceId", "delta");
CREATE INDEX IF NOT EXISTS "KpiMetricEvent_groupId_metricCode_occurredAt_idx"
  ON "KpiMetricEvent"("groupId", "metricCode", "occurredAt");
CREATE INDEX IF NOT EXISTS "KpiMetricEvent_actorUserId_occurredAt_idx"
  ON "KpiMetricEvent"("actorUserId", "occurredAt");
CREATE INDEX IF NOT EXISTS "KpiMetricEvent_sourceType_sourceId_idx"
  ON "KpiMetricEvent"("sourceType", "sourceId");

CREATE TABLE IF NOT EXISTS "KpiCustom" (
  "id" TEXT PRIMARY KEY,
  "groupId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "baselineValue" DECIMAL(18,2),
  "baselineDate" TIMESTAMP(3),
  "targetValue" DECIMAL(18,2),
  "targetDate" TIMESTAMP(3),
  "actualValue" DECIMAL(18,2),
  "status" "KpiCustomStatus" NOT NULL DEFAULT 'DRAFT',
  "approvalStatus" "KpiApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "createdById" TEXT NOT NULL,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "KpiCustom_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "KpiCustom_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "KpiCustom_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "KpiCustom_groupId_createdAt_idx"
  ON "KpiCustom"("groupId", "createdAt");
CREATE INDEX IF NOT EXISTS "KpiCustom_status_approvalStatus_idx"
  ON "KpiCustom"("status", "approvalStatus");
CREATE INDEX IF NOT EXISTS "KpiCustom_createdById_createdAt_idx"
  ON "KpiCustom"("createdById", "createdAt");

CREATE TABLE IF NOT EXISTS "KpiCustomAssignee" (
  "id" TEXT PRIMARY KEY,
  "kpiId" TEXT NOT NULL,
  "assigneeType" "KpiAssigneeType" NOT NULL,
  "userId" TEXT,
  "groupId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KpiCustomAssignee_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "KpiCustom"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "KpiCustomAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "KpiCustomAssignee_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "KpiCustomAssignee_kpiId_assigneeType_idx"
  ON "KpiCustomAssignee"("kpiId", "assigneeType");
CREATE INDEX IF NOT EXISTS "KpiCustomAssignee_userId_idx"
  ON "KpiCustomAssignee"("userId");
CREATE INDEX IF NOT EXISTS "KpiCustomAssignee_groupId_idx"
  ON "KpiCustomAssignee"("groupId");

CREATE TABLE IF NOT EXISTS "KpiCustomRevision" (
  "id" TEXT PRIMARY KEY,
  "kpiId" TEXT NOT NULL,
  "field" "KpiRevisionField" NOT NULL,
  "oldValue" JSONB,
  "newValue" JSONB,
  "changedById" TEXT NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KpiCustomRevision_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "KpiCustom"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "KpiCustomRevision_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "KpiCustomRevision_kpiId_createdAt_idx"
  ON "KpiCustomRevision"("kpiId", "createdAt");
CREATE INDEX IF NOT EXISTS "KpiCustomRevision_changedById_createdAt_idx"
  ON "KpiCustomRevision"("changedById", "createdAt");

CREATE TABLE IF NOT EXISTS "KpiBaselineHistory" (
  "id" TEXT PRIMARY KEY,
  "kpiId" TEXT NOT NULL,
  "field" "KpiRevisionField" NOT NULL,
  "oldValue" JSONB,
  "newValue" JSONB,
  "changedById" TEXT NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KpiBaselineHistory_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "KpiCustom"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "KpiBaselineHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "KpiBaselineHistory_kpiId_createdAt_idx"
  ON "KpiBaselineHistory"("kpiId", "createdAt");
CREATE INDEX IF NOT EXISTS "KpiBaselineHistory_changedById_createdAt_idx"
  ON "KpiBaselineHistory"("changedById", "createdAt");

CREATE TABLE IF NOT EXISTS "KpiCustomEvidence" (
  "id" TEXT PRIMARY KEY,
  "kpiId" TEXT NOT NULL,
  "attachmentId" TEXT NOT NULL UNIQUE,
  "evidenceType" "KpiEvidenceType" NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KpiCustomEvidence_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "KpiCustom"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "KpiCustomEvidence_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "Attachment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "KpiCustomEvidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "KpiCustomEvidence_kpiId_evidenceType_createdAt_idx"
  ON "KpiCustomEvidence"("kpiId", "evidenceType", "createdAt");
CREATE INDEX IF NOT EXISTS "KpiCustomEvidence_uploadedById_createdAt_idx"
  ON "KpiCustomEvidence"("uploadedById", "createdAt");

COMMIT;
