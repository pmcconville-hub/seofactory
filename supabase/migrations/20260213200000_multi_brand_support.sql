-- Multi-Brand Support Migration
-- Adds topical_map_id to brand tables for multi-brand management per topical map

-- Add topical_map_id to brand tables for multi-brand support
ALTER TABLE brand_design_dna
  ADD COLUMN IF NOT EXISTS topical_map_id UUID REFERENCES topical_maps(id) ON DELETE SET NULL;

ALTER TABLE brand_design_systems
  ADD COLUMN IF NOT EXISTS topical_map_id UUID REFERENCES topical_maps(id) ON DELETE SET NULL;

ALTER TABLE style_guides
  ADD COLUMN IF NOT EXISTS topical_map_id UUID REFERENCES topical_maps(id) ON DELETE SET NULL;

-- Add is_active flag to brand_design_dna for selecting active brand per map
ALTER TABLE brand_design_dna
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Indexes for efficient topical map lookups
CREATE INDEX IF NOT EXISTS idx_brand_dna_topical_map ON brand_design_dna(topical_map_id);
CREATE INDEX IF NOT EXISTS idx_brand_systems_topical_map ON brand_design_systems(topical_map_id);
CREATE INDEX IF NOT EXISTS idx_style_guides_topical_map ON style_guides(topical_map_id);

-- Drop old unique constraint on brand_design_systems and recreate with topical_map_id
-- (Use DO block for safety)
DO $$
BEGIN
  -- Try to drop old constraint
  ALTER TABLE brand_design_systems DROP CONSTRAINT IF EXISTS brand_design_systems_project_id_design_dna_hash_key;
EXCEPTION WHEN OTHERS THEN
  -- Ignore if doesn't exist
  NULL;
END $$;

-- New unique: one system per project+map+hash
CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_systems_project_map_hash
  ON brand_design_systems(project_id, COALESCE(topical_map_id, '00000000-0000-0000-0000-000000000000'::uuid), design_dna_hash);
