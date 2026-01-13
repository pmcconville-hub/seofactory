-- Add competitor_specs column to content_briefs table
-- This stores competitor analysis data from enhanced brief generation

ALTER TABLE content_briefs
ADD COLUMN IF NOT EXISTS competitor_specs JSONB DEFAULT NULL;

-- Add index for querying by data quality
CREATE INDEX IF NOT EXISTS idx_content_briefs_competitor_specs_quality
ON content_briefs ((competitor_specs->>'dataQuality'))
WHERE competitor_specs IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN content_briefs.competitor_specs IS
'Competitor-derived specifications from enhanced brief generation. Contains targetWordCount, requiredTopics, differentiationTopics, rootAttributes, rareAttributes, benchmarks, etc.';
