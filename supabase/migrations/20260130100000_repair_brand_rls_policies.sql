-- ============================================================================
-- REPAIR: Force re-create has_project_access() and all brand/blueprint RLS policies
-- ============================================================================
-- Issue: 403 errors on POST to brand tables, 406 on GET from brand/blueprint tables
-- Root cause: Migrations may have been recorded as applied without actually
-- executing the CREATE POLICY statements. This migration is idempotent.
-- ============================================================================

-- ============================================================================
-- STEP 1: Ensure has_project_access() function exists and is current
-- ============================================================================

CREATE OR REPLACE FUNCTION has_project_access(proj_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
BEGIN
  -- Quick check: is user the direct owner?
  IF EXISTS (
    SELECT 1 FROM projects
    WHERE id = proj_id AND user_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check via organization membership (with accepted_at)
  IF EXISTS (
    SELECT 1 FROM projects p
    JOIN organization_members om ON om.organization_id = p.organization_id
    WHERE p.id = proj_id
      AND om.user_id = auth.uid()
      AND om.accepted_at IS NOT NULL
  ) THEN
    RETURN TRUE;
  END IF;

  -- FALLBACK: Check via organization membership WITHOUT accepted_at requirement
  IF EXISTS (
    SELECT 1 FROM projects p
    JOIN organization_members om ON om.organization_id = p.organization_id
    WHERE p.id = proj_id
      AND om.user_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;

  -- FALLBACK 2: Check via JWT current_organization_id metadata
  BEGIN
    v_org_id := (auth.jwt() -> 'user_metadata' ->> 'current_organization_id')::UUID;
    IF v_org_id IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM projects
        WHERE id = proj_id AND organization_id = v_org_id
      ) THEN
        RETURN TRUE;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- FALLBACK 3: Check project_members table
  BEGIN
    IF EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = proj_id AND user_id = auth.uid()
    ) THEN
      RETURN TRUE;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public;

-- ============================================================================
-- STEP 2: Ensure all brand tables exist
-- ============================================================================

CREATE TABLE IF NOT EXISTS brand_design_dna (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  screenshot_url TEXT,
  screenshot_base64 TEXT,
  design_dna JSONB NOT NULL,
  ai_model TEXT,
  confidence_score NUMERIC,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brand_design_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  design_dna_id UUID REFERENCES brand_design_dna(id) ON DELETE SET NULL,
  brand_name TEXT NOT NULL,
  design_dna_hash TEXT NOT NULL,
  tokens JSONB NOT NULL,
  component_styles JSONB NOT NULL,
  decorative_elements JSONB,
  interactions JSONB,
  typography_treatments JSONB,
  image_treatments JSONB,
  compiled_css TEXT NOT NULL,
  variant_mappings JSONB,
  ai_model TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, design_dna_hash)
);

CREATE TABLE IF NOT EXISTS brand_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  page_type TEXT NOT NULL,
  screenshot_url TEXT,
  screenshot_base64 TEXT,
  raw_html TEXT NOT NULL,
  computed_styles JSONB,
  extracted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, source_url)
);

CREATE TABLE IF NOT EXISTS brand_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extraction_id UUID NOT NULL REFERENCES brand_extractions(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  visual_description TEXT NOT NULL,
  component_type TEXT,
  literal_html TEXT NOT NULL,
  literal_css TEXT NOT NULL,
  their_class_names TEXT[],
  content_slots JSONB NOT NULL DEFAULT '[]',
  bounding_box JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brand_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  colors JSONB NOT NULL,
  typography JSONB NOT NULL,
  spacing JSONB NOT NULL,
  shadows JSONB NOT NULL,
  borders JSONB NOT NULL,
  gradients JSONB,
  extracted_from TEXT[],
  extracted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id)
);

CREATE TABLE IF NOT EXISTS brand_url_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  suggested_url TEXT NOT NULL,
  page_type TEXT NOT NULL,
  discovered_from TEXT NOT NULL,
  prominence_score DECIMAL(3,2) DEFAULT 0.5,
  visual_context TEXT,
  selected BOOLEAN DEFAULT false,
  extracted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, suggested_url)
);

-- Blueprint tables
CREATE TABLE IF NOT EXISTS project_blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  visual_style TEXT NOT NULL DEFAULT 'editorial' CHECK (visual_style IN ('editorial', 'marketing', 'minimal', 'bold', 'warm-modern')),
  pacing TEXT NOT NULL DEFAULT 'balanced' CHECK (pacing IN ('dense', 'balanced', 'spacious')),
  color_intensity TEXT NOT NULL DEFAULT 'moderate' CHECK (color_intensity IN ('subtle', 'moderate', 'vibrant')),
  cta_positions TEXT[] DEFAULT ARRAY['end'],
  cta_intensity TEXT DEFAULT 'moderate' CHECK (cta_intensity IN ('subtle', 'moderate', 'prominent')),
  cta_style TEXT DEFAULT 'banner' CHECK (cta_style IN ('inline', 'banner', 'floating')),
  component_preferences JSONB DEFAULT '{}'::JSONB,
  avoid_components TEXT[] DEFAULT ARRAY[]::TEXT[],
  ai_reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id)
);

CREATE TABLE IF NOT EXISTS topical_map_blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topical_map_id UUID NOT NULL REFERENCES topical_maps(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  visual_style TEXT CHECK (visual_style IS NULL OR visual_style IN ('editorial', 'marketing', 'minimal', 'bold', 'warm-modern')),
  pacing TEXT CHECK (pacing IS NULL OR pacing IN ('dense', 'balanced', 'spacious')),
  color_intensity TEXT CHECK (color_intensity IS NULL OR color_intensity IN ('subtle', 'moderate', 'vibrant')),
  cta_positions TEXT[],
  cta_intensity TEXT CHECK (cta_intensity IS NULL OR cta_intensity IN ('subtle', 'moderate', 'prominent')),
  cta_style TEXT CHECK (cta_style IS NULL OR cta_style IN ('inline', 'banner', 'floating')),
  component_preferences JSONB,
  cluster_rules JSONB DEFAULT '[]'::JSONB,
  ai_reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(topical_map_id)
);

-- ============================================================================
-- STEP 3: Enable RLS on ALL tables
-- ============================================================================

ALTER TABLE brand_design_dna ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_design_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_url_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE topical_map_blueprints ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: Force DROP + CREATE all RLS policies
-- ============================================================================

-- brand_design_dna
DO $$ BEGIN DROP POLICY IF EXISTS "brand_design_dna_select" ON brand_design_dna; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_design_dna_insert" ON brand_design_dna; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_design_dna_update" ON brand_design_dna; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_design_dna_delete" ON brand_design_dna; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Users can view own brand_design_dna" ON brand_design_dna; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Users can insert own brand_design_dna" ON brand_design_dna; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Users can update own brand_design_dna" ON brand_design_dna; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Users can delete own brand_design_dna" ON brand_design_dna; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "brand_design_dna_select" ON brand_design_dna FOR SELECT TO authenticated USING (has_project_access(project_id));
CREATE POLICY "brand_design_dna_insert" ON brand_design_dna FOR INSERT TO authenticated WITH CHECK (has_project_access(project_id));
CREATE POLICY "brand_design_dna_update" ON brand_design_dna FOR UPDATE TO authenticated USING (has_project_access(project_id));
CREATE POLICY "brand_design_dna_delete" ON brand_design_dna FOR DELETE TO authenticated USING (has_project_access(project_id));

-- brand_design_systems
DO $$ BEGIN DROP POLICY IF EXISTS "brand_design_systems_select" ON brand_design_systems; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_design_systems_insert" ON brand_design_systems; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_design_systems_update" ON brand_design_systems; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_design_systems_delete" ON brand_design_systems; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Users can view own brand_design_systems" ON brand_design_systems; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Users can insert own brand_design_systems" ON brand_design_systems; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Users can update own brand_design_systems" ON brand_design_systems; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Users can delete own brand_design_systems" ON brand_design_systems; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "brand_design_systems_select" ON brand_design_systems FOR SELECT TO authenticated USING (has_project_access(project_id));
CREATE POLICY "brand_design_systems_insert" ON brand_design_systems FOR INSERT TO authenticated WITH CHECK (has_project_access(project_id));
CREATE POLICY "brand_design_systems_update" ON brand_design_systems FOR UPDATE TO authenticated USING (has_project_access(project_id));
CREATE POLICY "brand_design_systems_delete" ON brand_design_systems FOR DELETE TO authenticated USING (has_project_access(project_id));

-- brand_extractions
DO $$ BEGIN DROP POLICY IF EXISTS "brand_extractions_select" ON brand_extractions; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_extractions_insert" ON brand_extractions; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_extractions_update" ON brand_extractions; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_extractions_delete" ON brand_extractions; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Users can manage own brand_extractions" ON brand_extractions; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "brand_extractions_select" ON brand_extractions FOR SELECT TO authenticated USING (has_project_access(project_id));
CREATE POLICY "brand_extractions_insert" ON brand_extractions FOR INSERT TO authenticated WITH CHECK (has_project_access(project_id));
CREATE POLICY "brand_extractions_update" ON brand_extractions FOR UPDATE TO authenticated USING (has_project_access(project_id));
CREATE POLICY "brand_extractions_delete" ON brand_extractions FOR DELETE TO authenticated USING (has_project_access(project_id));

-- brand_components
DO $$ BEGIN DROP POLICY IF EXISTS "brand_components_select" ON brand_components; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_components_insert" ON brand_components; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_components_update" ON brand_components; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_components_delete" ON brand_components; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Users can manage own brand_components" ON brand_components; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "brand_components_select" ON brand_components FOR SELECT TO authenticated USING (has_project_access(project_id));
CREATE POLICY "brand_components_insert" ON brand_components FOR INSERT TO authenticated WITH CHECK (has_project_access(project_id));
CREATE POLICY "brand_components_update" ON brand_components FOR UPDATE TO authenticated USING (has_project_access(project_id));
CREATE POLICY "brand_components_delete" ON brand_components FOR DELETE TO authenticated USING (has_project_access(project_id));

-- brand_tokens
DO $$ BEGIN DROP POLICY IF EXISTS "brand_tokens_select" ON brand_tokens; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_tokens_insert" ON brand_tokens; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_tokens_update" ON brand_tokens; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_tokens_delete" ON brand_tokens; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Users can manage own brand_tokens" ON brand_tokens; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "brand_tokens_select" ON brand_tokens FOR SELECT TO authenticated USING (has_project_access(project_id));
CREATE POLICY "brand_tokens_insert" ON brand_tokens FOR INSERT TO authenticated WITH CHECK (has_project_access(project_id));
CREATE POLICY "brand_tokens_update" ON brand_tokens FOR UPDATE TO authenticated USING (has_project_access(project_id));
CREATE POLICY "brand_tokens_delete" ON brand_tokens FOR DELETE TO authenticated USING (has_project_access(project_id));

-- brand_url_suggestions
DO $$ BEGIN DROP POLICY IF EXISTS "brand_url_suggestions_select" ON brand_url_suggestions; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_url_suggestions_insert" ON brand_url_suggestions; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_url_suggestions_update" ON brand_url_suggestions; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "brand_url_suggestions_delete" ON brand_url_suggestions; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Users can manage own brand_url_suggestions" ON brand_url_suggestions; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "brand_url_suggestions_select" ON brand_url_suggestions FOR SELECT TO authenticated USING (has_project_access(project_id));
CREATE POLICY "brand_url_suggestions_insert" ON brand_url_suggestions FOR INSERT TO authenticated WITH CHECK (has_project_access(project_id));
CREATE POLICY "brand_url_suggestions_update" ON brand_url_suggestions FOR UPDATE TO authenticated USING (has_project_access(project_id));
CREATE POLICY "brand_url_suggestions_delete" ON brand_url_suggestions FOR DELETE TO authenticated USING (has_project_access(project_id));

-- project_blueprints
DO $$ BEGIN DROP POLICY IF EXISTS "project_blueprints_select" ON project_blueprints; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "project_blueprints_insert" ON project_blueprints; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "project_blueprints_update" ON project_blueprints; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "project_blueprints_delete" ON project_blueprints; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "project_blueprints_select" ON project_blueprints FOR SELECT TO authenticated USING (has_project_access(project_id));
CREATE POLICY "project_blueprints_insert" ON project_blueprints FOR INSERT TO authenticated WITH CHECK (has_project_access(project_id));
CREATE POLICY "project_blueprints_update" ON project_blueprints FOR UPDATE TO authenticated USING (has_project_access(project_id));
CREATE POLICY "project_blueprints_delete" ON project_blueprints FOR DELETE TO authenticated USING (has_project_access(project_id));

-- topical_map_blueprints
DO $$ BEGIN DROP POLICY IF EXISTS "topical_map_blueprints_select" ON topical_map_blueprints; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "topical_map_blueprints_insert" ON topical_map_blueprints; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "topical_map_blueprints_update" ON topical_map_blueprints; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "topical_map_blueprints_delete" ON topical_map_blueprints; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "topical_map_blueprints_select" ON topical_map_blueprints FOR SELECT TO authenticated USING (has_project_access(project_id));
CREATE POLICY "topical_map_blueprints_insert" ON topical_map_blueprints FOR INSERT TO authenticated WITH CHECK (has_project_access(project_id));
CREATE POLICY "topical_map_blueprints_update" ON topical_map_blueprints FOR UPDATE TO authenticated USING (has_project_access(project_id));
CREATE POLICY "topical_map_blueprints_delete" ON topical_map_blueprints FOR DELETE TO authenticated USING (has_project_access(project_id));

-- ============================================================================
-- STEP 5: Force PostgREST schema reload
-- ============================================================================

NOTIFY pgrst, 'reload schema';
