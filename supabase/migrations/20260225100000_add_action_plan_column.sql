-- Add action_plan JSONB column to topical_maps
-- Stores the strategic action plan for the Content Briefs pipeline step
-- Structure: { status, entries: [...], strategicSummary, generatedAt, approvedAt }

ALTER TABLE topical_maps
ADD COLUMN IF NOT EXISTS action_plan jsonb DEFAULT NULL;

COMMENT ON COLUMN topical_maps.action_plan IS 'Strategic action plan with per-topic action types, wave assignments, and AI rationales';
