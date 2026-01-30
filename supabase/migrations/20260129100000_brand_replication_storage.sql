-- ============================================================================
-- BRAND REPLICATION STORAGE TABLES
-- ============================================================================
-- Migration: 20260129100000_brand_replication_storage.sql
-- Purpose: Add tables for persisting brand replication pipeline data:
--   - AI-generated components (from Phase 2 CodeGen)
--   - Section design decisions (from Phase 3 Intelligence)
--   - Validation results (from Phase 4 Validation)
-- ============================================================================

-- ============================================================================
-- TABLE 1: brand_replication_components
-- Stores AI-generated components per brand (not the same as brand_components
-- which stores extracted literal HTML/CSS from the source site).
-- ============================================================================

CREATE TABLE IF NOT EXISTS brand_replication_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL,  -- References project_id (brand is per project)
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Component identity
  name TEXT NOT NULL,
  purpose TEXT NOT NULL,
  usage_context TEXT NOT NULL,

  -- Generated code
  css TEXT NOT NULL,
  html_template TEXT NOT NULL,
  preview_html TEXT,

  -- Source and scoring
  source_component JSONB NOT NULL,  -- DiscoveredComponent from Phase 1
  match_score NUMERIC(5,4) NOT NULL DEFAULT 0,  -- 0-1 score
  variants JSONB NOT NULL DEFAULT '[]'::jsonb,  -- ComponentVariant[]

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure component names are unique per brand
  CONSTRAINT brand_replication_components_unique UNIQUE (brand_id, name)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_brand_rep_components_brand ON brand_replication_components(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_rep_components_project ON brand_replication_components(project_id);
CREATE INDEX IF NOT EXISTS idx_brand_rep_components_name ON brand_replication_components(name);

-- ============================================================================
-- TABLE 2: brand_replication_decisions
-- Stores section-level design decisions for each article.
-- ============================================================================

CREATE TABLE IF NOT EXISTS brand_replication_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  article_id TEXT NOT NULL,  -- Can be job_id, topic_id, or external ID
  section_id TEXT NOT NULL,

  -- Section info
  section_heading TEXT NOT NULL,

  -- Component assignment
  component_id UUID REFERENCES brand_replication_components(id) ON DELETE SET NULL,
  component_name TEXT NOT NULL,  -- Denormalized for quick access
  variant TEXT,

  -- Layout specification
  layout JSONB NOT NULL,  -- {columns, width, emphasis}

  -- AI reasoning
  reasoning TEXT NOT NULL,
  semantic_role TEXT NOT NULL,
  content_mapping JSONB,  -- {title?, items?, ctaText?, ctaUrl?, etc.}
  confidence NUMERIC(5,4) NOT NULL DEFAULT 0,  -- 0-1 score

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one decision per section per article per brand
  CONSTRAINT brand_replication_decisions_unique UNIQUE (brand_id, article_id, section_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_brand_rep_decisions_brand ON brand_replication_decisions(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_rep_decisions_project ON brand_replication_decisions(project_id);
CREATE INDEX IF NOT EXISTS idx_brand_rep_decisions_article ON brand_replication_decisions(article_id);
CREATE INDEX IF NOT EXISTS idx_brand_rep_decisions_brand_article ON brand_replication_decisions(brand_id, article_id);

-- ============================================================================
-- TABLE 3: brand_replication_validations
-- Stores validation results for rendered articles.
-- ============================================================================

CREATE TABLE IF NOT EXISTS brand_replication_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  article_id TEXT NOT NULL,

  -- Score breakdowns
  scores JSONB NOT NULL,  -- {brandMatch, designQuality, userExperience, overall}

  -- WOW factor checklist
  wow_factor_checklist JSONB NOT NULL,  -- WowFactorItem[]

  -- Pass/fail
  passes_threshold BOOLEAN NOT NULL DEFAULT false,

  -- Improvement suggestions
  suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,  -- string[]

  -- Metadata
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'partial', 'failed')),
  errors JSONB,  -- string[] if any errors occurred

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: latest validation per article per brand
  CONSTRAINT brand_replication_validations_unique UNIQUE (brand_id, article_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_brand_rep_validations_brand ON brand_replication_validations(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_rep_validations_project ON brand_replication_validations(project_id);
CREATE INDEX IF NOT EXISTS idx_brand_rep_validations_article ON brand_replication_validations(article_id);
CREATE INDEX IF NOT EXISTS idx_brand_rep_validations_passes ON brand_replication_validations(passes_threshold);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE brand_replication_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_replication_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_replication_validations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES using has_project_access() for organization support
-- ============================================================================

-- brand_replication_components policies
CREATE POLICY "brand_replication_components_select" ON brand_replication_components
  FOR SELECT TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "brand_replication_components_insert" ON brand_replication_components
  FOR INSERT TO authenticated
  WITH CHECK (has_project_access(project_id));

CREATE POLICY "brand_replication_components_update" ON brand_replication_components
  FOR UPDATE TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "brand_replication_components_delete" ON brand_replication_components
  FOR DELETE TO authenticated
  USING (has_project_access(project_id));

-- brand_replication_decisions policies
CREATE POLICY "brand_replication_decisions_select" ON brand_replication_decisions
  FOR SELECT TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "brand_replication_decisions_insert" ON brand_replication_decisions
  FOR INSERT TO authenticated
  WITH CHECK (has_project_access(project_id));

CREATE POLICY "brand_replication_decisions_update" ON brand_replication_decisions
  FOR UPDATE TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "brand_replication_decisions_delete" ON brand_replication_decisions
  FOR DELETE TO authenticated
  USING (has_project_access(project_id));

-- brand_replication_validations policies
CREATE POLICY "brand_replication_validations_select" ON brand_replication_validations
  FOR SELECT TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "brand_replication_validations_insert" ON brand_replication_validations
  FOR INSERT TO authenticated
  WITH CHECK (has_project_access(project_id));

CREATE POLICY "brand_replication_validations_update" ON brand_replication_validations
  FOR UPDATE TO authenticated
  USING (has_project_access(project_id));

CREATE POLICY "brand_replication_validations_delete" ON brand_replication_validations
  FOR DELETE TO authenticated
  USING (has_project_access(project_id));

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION (if not already exists)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_brand_replication_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at on tables that have it
DROP TRIGGER IF EXISTS brand_replication_components_updated_at ON brand_replication_components;
CREATE TRIGGER brand_replication_components_updated_at
  BEFORE UPDATE ON brand_replication_components
  FOR EACH ROW
  EXECUTE FUNCTION update_brand_replication_updated_at();

DROP TRIGGER IF EXISTS brand_replication_decisions_updated_at ON brand_replication_decisions;
CREATE TRIGGER brand_replication_decisions_updated_at
  BEFORE UPDATE ON brand_replication_decisions
  FOR EACH ROW
  EXECUTE FUNCTION update_brand_replication_updated_at();

-- ============================================================================
-- TABLE COMMENTS
-- ============================================================================

COMMENT ON TABLE brand_replication_components IS 'AI-generated components for brand replication (Phase 2 output)';
COMMENT ON TABLE brand_replication_decisions IS 'Section-level design decisions per article (Phase 3 output)';
COMMENT ON TABLE brand_replication_validations IS 'Quality validation results per article (Phase 4 output)';

COMMENT ON COLUMN brand_replication_components.brand_id IS 'Brand identifier (typically project_id)';
COMMENT ON COLUMN brand_replication_components.source_component IS 'DiscoveredComponent from Phase 1 discovery';
COMMENT ON COLUMN brand_replication_components.match_score IS 'AI confidence score 0-1 for brand match quality';
COMMENT ON COLUMN brand_replication_components.variants IS 'Array of ComponentVariant objects';

COMMENT ON COLUMN brand_replication_decisions.layout IS 'Layout spec: {columns: 1-4, width: narrow/medium/wide/full, emphasis: hero/featured/standard/supporting/minimal}';
COMMENT ON COLUMN brand_replication_decisions.semantic_role IS 'The semantic role of this section (e.g., introduction, key_points, conclusion)';
COMMENT ON COLUMN brand_replication_decisions.content_mapping IS 'Maps section content to component slots';

COMMENT ON COLUMN brand_replication_validations.scores IS 'Score breakdowns: {brandMatch, designQuality, userExperience, overall}';
COMMENT ON COLUMN brand_replication_validations.wow_factor_checklist IS 'Array of WowFactorItem with pass/fail status';

-- ============================================================================
-- NOTIFY POSTGREST TO RELOAD SCHEMA
-- ============================================================================

NOTIFY pgrst, 'reload schema';
