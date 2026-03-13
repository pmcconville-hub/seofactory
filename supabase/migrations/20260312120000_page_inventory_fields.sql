-- Page Inventory Fields
-- Adds fields for topic-to-page consolidation decisions

ALTER TABLE topics ADD COLUMN IF NOT EXISTS search_volume integer;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS search_volume_source text;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS page_decision text;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS page_decision_confidence real;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS page_decision_reasoning text;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS consolidation_target_id uuid REFERENCES topics(id);
ALTER TABLE topics ADD COLUMN IF NOT EXISTS extracted_keyword text;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS competitor_heading_frequency integer;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS competitor_has_dedicated_url boolean;

ALTER TABLE topical_maps ADD COLUMN IF NOT EXISTS page_inventory jsonb;

-- No RLS changes needed: topics already has RLS via has_project_access()
-- New columns on existing tables inherit existing RLS policies
