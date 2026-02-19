-- Add pipeline_state JSONB column to topical_maps
-- Stores the unified SEO pipeline step statuses, approvals, wave config, and mode
ALTER TABLE topical_maps ADD COLUMN IF NOT EXISTS pipeline_state JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN topical_maps.pipeline_state IS 'Unified SEO pipeline state: step statuses, approvals, wave config, greenfield/existing mode';
