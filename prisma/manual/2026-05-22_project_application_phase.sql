-- Phase 13: add phased-application fields for ProjectApplicationRecord
-- Safe/idempotent migration

ALTER TABLE "ProjectApplicationRecord"
  ADD COLUMN IF NOT EXISTS "isPhased" boolean NOT NULL DEFAULT false;

ALTER TABLE "ProjectApplicationRecord"
  ADD COLUMN IF NOT EXISTS "applicationPhase" text;
