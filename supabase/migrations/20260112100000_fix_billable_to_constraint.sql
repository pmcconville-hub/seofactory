-- Migration: Fix billable_to constraint to include 'user' value
-- The telemetry service uses 'user' for user-provided API keys (BYOK)

-- Drop the old constraint and add a new one with 'user' included
ALTER TABLE ai_usage_logs
  DROP CONSTRAINT IF EXISTS ai_usage_logs_billable_to_check;

ALTER TABLE ai_usage_logs
  ADD CONSTRAINT ai_usage_logs_billable_to_check
  CHECK (billable_to IN ('platform', 'organization', 'project', 'user'));

-- Also fix key_source to allow 'user_byok' which is used in the code
ALTER TABLE ai_usage_logs
  DROP CONSTRAINT IF EXISTS ai_usage_logs_key_source_check;

ALTER TABLE ai_usage_logs
  ADD CONSTRAINT ai_usage_logs_key_source_check
  CHECK (key_source IN ('platform', 'org_byok', 'project_byok', 'user_byok', 'unknown'));
