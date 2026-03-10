-- Fix: content_generation_jobs status CHECK constraint is missing 'audit_failed' and 'checkpoint'
-- These statuses are used by the content generation pipeline:
--   'audit_failed' — set by pass8Audit when quality score is below threshold
--   'checkpoint'   — set by validation gate when manual review is required

ALTER TABLE content_generation_jobs
DROP CONSTRAINT IF EXISTS content_generation_jobs_status_check;

ALTER TABLE content_generation_jobs
ADD CONSTRAINT content_generation_jobs_status_check
CHECK (status IN ('pending', 'in_progress', 'paused', 'completed', 'failed', 'cancelled', 'audit_failed', 'checkpoint'));
