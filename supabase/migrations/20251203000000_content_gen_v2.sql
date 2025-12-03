-- Content Generation V2: Settings, Prompt Templates, Versioning, Brief Compliance
-- Migration: 20251203000000_content_gen_v2.sql

-- ============================================================================
-- CONTENT GENERATION SETTINGS
-- User-configurable priorities and pass settings per map or global defaults
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_generation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  map_id UUID REFERENCES topical_maps(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default',
  is_default BOOLEAN DEFAULT false,

  -- Priority Weights (0-100, should sum to ~100 for normalization)
  priority_human_readability INTEGER DEFAULT 40 CHECK (priority_human_readability >= 0 AND priority_human_readability <= 100),
  priority_business_conversion INTEGER DEFAULT 25 CHECK (priority_business_conversion >= 0 AND priority_business_conversion <= 100),
  priority_machine_optimization INTEGER DEFAULT 20 CHECK (priority_machine_optimization >= 0 AND priority_machine_optimization <= 100),
  priority_factual_density INTEGER DEFAULT 15 CHECK (priority_factual_density >= 0 AND priority_factual_density <= 100),

  -- Tone & Style
  tone TEXT DEFAULT 'professional' CHECK (tone IN ('conversational', 'professional', 'academic', 'sales')),
  audience_expertise TEXT DEFAULT 'intermediate' CHECK (audience_expertise IN ('beginner', 'intermediate', 'expert')),

  -- Pass Configuration (JSONB for flexibility)
  pass_config JSONB DEFAULT '{
    "checkpoint_after_pass_1": false,
    "passes": {
      "pass_2_headers": {"enabled": true, "store_version": true},
      "pass_3_lists": {"enabled": true, "store_version": true},
      "pass_4_visuals": {"enabled": true, "store_version": true},
      "pass_5_micro": {"enabled": true, "store_version": true},
      "pass_6_discourse": {"enabled": true, "store_version": true},
      "pass_7_intro": {"enabled": true, "store_version": true},
      "pass_8_audit": {"enabled": true, "store_version": false}
    }
  }'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure only one default per user (without map_id)
CREATE UNIQUE INDEX idx_unique_user_default_setting
  ON content_generation_settings (user_id)
  WHERE is_default = true AND map_id IS NULL;

-- Index for fast lookup by user/map
CREATE INDEX idx_gen_settings_user ON content_generation_settings(user_id);
CREATE INDEX idx_gen_settings_map ON content_generation_settings(map_id) WHERE map_id IS NOT NULL;

-- RLS Policies
ALTER TABLE content_generation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own settings"
  ON content_generation_settings
  FOR ALL
  USING (auth.uid() = user_id);


-- ============================================================================
-- PROMPT TEMPLATES
-- User-customizable prompt overrides (hybrid: code defaults + DB overrides)
-- ============================================================================

CREATE TABLE IF NOT EXISTS prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Prompt identification
  prompt_key TEXT NOT NULL, -- e.g., 'pass_1_section', 'pass_2_headers', 'pass_3_lists'
  name TEXT NOT NULL,
  description TEXT,

  -- The template content (uses {{variables}} syntax)
  template_content TEXT NOT NULL,

  -- Variables available in this template (for UI display)
  available_variables JSONB DEFAULT '[]'::jsonb,

  -- Version tracking for template history
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  parent_version_id UUID REFERENCES prompt_templates(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure unique active prompt per key per user
CREATE UNIQUE INDEX idx_unique_active_prompt
  ON prompt_templates (user_id, prompt_key)
  WHERE is_active = true;

-- Index for fast lookup
CREATE INDEX idx_prompt_templates_user ON prompt_templates(user_id, prompt_key);
CREATE INDEX idx_prompt_templates_active ON prompt_templates(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own prompts"
  ON prompt_templates
  FOR ALL
  USING (auth.uid() = user_id);


-- ============================================================================
-- CONTENT VERSIONS
-- Stores draft versions after each pass for revert capability
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES content_generation_jobs(id) ON DELETE CASCADE NOT NULL,

  -- Version identification
  pass_number INTEGER NOT NULL CHECK (pass_number >= 1 AND pass_number <= 8),
  version_number INTEGER NOT NULL DEFAULT 1,

  -- The actual content at this version
  content TEXT NOT NULL,
  word_count INTEGER,

  -- Compliance audit results for this version
  compliance_audit JSONB,
  compliance_score INTEGER CHECK (compliance_score >= 0 AND compliance_score <= 100),

  -- Snapshot of settings used for this version (for reproducibility)
  settings_snapshot JSONB,
  prompt_used TEXT,

  -- Version lifecycle
  is_active BOOLEAN DEFAULT true,
  reverted_at TIMESTAMPTZ,
  reverted_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one active version per pass per job
CREATE UNIQUE INDEX idx_unique_active_version
  ON content_versions (job_id, pass_number)
  WHERE is_active = true;

-- Fast lookup by job and pass
CREATE INDEX idx_content_versions_job ON content_versions(job_id, pass_number);
CREATE INDEX idx_content_versions_active ON content_versions(is_active) WHERE is_active = true;

-- RLS Policies (access via job ownership)
ALTER TABLE content_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access versions for their jobs"
  ON content_versions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM content_generation_jobs j
      WHERE j.id = content_versions.job_id
      AND j.user_id = auth.uid()
    )
  );


-- ============================================================================
-- BRIEF COMPLIANCE CHECKS
-- Stores brief validation results and auto-suggestions
-- ============================================================================

CREATE TABLE IF NOT EXISTS brief_compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID REFERENCES content_briefs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Overall check results
  check_results JSONB NOT NULL,
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),

  -- Missing fields and auto-suggestions
  missing_fields JSONB DEFAULT '[]'::jsonb,
  auto_suggestions JSONB DEFAULT '[]'::jsonb,

  -- Whether suggestions were applied
  suggestions_applied BOOLEAN DEFAULT false,
  applied_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX idx_brief_compliance_brief ON brief_compliance_checks(brief_id);
CREATE INDEX idx_brief_compliance_user ON brief_compliance_checks(user_id);

-- RLS Policies
ALTER TABLE brief_compliance_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their brief compliance checks"
  ON brief_compliance_checks
  FOR ALL
  USING (auth.uid() = user_id);


-- ============================================================================
-- ADD SETTINGS REFERENCE TO EXISTING JOBS TABLE
-- ============================================================================

ALTER TABLE content_generation_jobs
  ADD COLUMN IF NOT EXISTS settings_id UUID REFERENCES content_generation_settings(id) ON DELETE SET NULL;

-- Index for the new column
CREATE INDEX IF NOT EXISTS idx_jobs_settings ON content_generation_jobs(settings_id)
  WHERE settings_id IS NOT NULL;


-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to new tables
DROP TRIGGER IF EXISTS update_content_generation_settings_updated_at ON content_generation_settings;
CREATE TRIGGER update_content_generation_settings_updated_at
  BEFORE UPDATE ON content_generation_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_prompt_templates_updated_at ON prompt_templates;
CREATE TRIGGER update_prompt_templates_updated_at
  BEFORE UPDATE ON prompt_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- PRESETS: Insert default content generation setting presets
-- ============================================================================

-- Note: These will be inserted when a user first accesses settings.
-- The application will check for existence and create if needed.

COMMENT ON TABLE content_generation_settings IS 'User content generation preferences including priority weights and pass configuration';
COMMENT ON TABLE prompt_templates IS 'User-customizable prompt templates that override code defaults';
COMMENT ON TABLE content_versions IS 'Version history for content at each pass, enabling revert capability';
COMMENT ON TABLE brief_compliance_checks IS 'Brief validation results with auto-suggestions for missing fields';
