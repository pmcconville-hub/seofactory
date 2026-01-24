-- Design Profiles Migration
-- Created: 2026-01-24
-- Purpose: Store validated brand discovery results and design inheritance hierarchy

-- Design Profiles: Store validated brand discovery results
CREATE TABLE IF NOT EXISTS design_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_url TEXT,
    screenshot_url TEXT, -- Store in Supabase Storage, not base64
    brand_discovery JSONB NOT NULL, -- BrandDiscoveryReport
    user_overrides JSONB DEFAULT '{}',
    final_tokens JSONB NOT NULL, -- DesignTokens
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast project lookups
CREATE INDEX IF NOT EXISTS idx_design_profiles_project ON design_profiles(project_id);

-- RLS Policies
ALTER TABLE design_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their project design profiles" ON design_profiles;
CREATE POLICY "Users can manage their project design profiles"
    ON design_profiles
    FOR ALL
    USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- Design Preferences: Track learned user preferences
CREATE TABLE IF NOT EXISTS design_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    preference_type TEXT NOT NULL, -- component_choice, emphasis_change, etc.
    context TEXT NOT NULL, -- content type or situation
    choice TEXT NOT NULL, -- what user chose
    frequency INT DEFAULT 1,
    last_used TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_design_preferences_project ON design_preferences(project_id);
CREATE INDEX IF NOT EXISTS idx_design_preferences_type ON design_preferences(preference_type);

ALTER TABLE design_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their design preferences" ON design_preferences;
CREATE POLICY "Users can manage their design preferences"
    ON design_preferences
    FOR ALL
    USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- Project Design Defaults: Project-level settings
CREATE TABLE IF NOT EXISTS project_design_defaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    design_profile_id UUID REFERENCES design_profiles(id),
    default_personality TEXT DEFAULT 'modern-minimal',
    component_preferences JSONB DEFAULT '{}',
    spacing_preference TEXT DEFAULT 'normal',
    visual_intensity TEXT DEFAULT 'moderate',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE project_design_defaults ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their project design defaults" ON project_design_defaults;
CREATE POLICY "Users can manage their project design defaults"
    ON project_design_defaults
    FOR ALL
    USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- Topical Map Design Rules: Map-level overrides
CREATE TABLE IF NOT EXISTS topical_map_design_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topical_map_id UUID NOT NULL UNIQUE REFERENCES topical_maps(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    inherit_from_project BOOLEAN DEFAULT true,
    overrides JSONB DEFAULT '{}',
    cluster_rules JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_map_design_rules_project ON topical_map_design_rules(project_id);

ALTER TABLE topical_map_design_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their map design rules" ON topical_map_design_rules;
CREATE POLICY "Users can manage their map design rules"
    ON topical_map_design_rules
    FOR ALL
    USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- Triggers for updated_at (using existing function from initial_schema)
CREATE TRIGGER design_profiles_updated_at
    BEFORE UPDATE ON design_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER project_design_defaults_updated_at
    BEFORE UPDATE ON project_design_defaults
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER topical_map_design_rules_updated_at
    BEFORE UPDATE ON topical_map_design_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE design_profiles IS 'Stores validated brand discovery results and design tokens for projects';
COMMENT ON COLUMN design_profiles.brand_discovery IS 'BrandDiscoveryReport JSONB containing analyzed brand elements';
COMMENT ON COLUMN design_profiles.user_overrides IS 'User modifications to AI-discovered brand elements';
COMMENT ON COLUMN design_profiles.final_tokens IS 'DesignTokens JSONB with computed final design values';
COMMENT ON COLUMN design_profiles.screenshot_url IS 'URL to screenshot in Supabase Storage (not base64)';

COMMENT ON TABLE design_preferences IS 'Tracks learned user preferences for design choices';
COMMENT ON COLUMN design_preferences.preference_type IS 'Type of preference: component_choice, emphasis_change, etc.';
COMMENT ON COLUMN design_preferences.context IS 'Content type or situation where preference applies';
COMMENT ON COLUMN design_preferences.frequency IS 'How many times this preference has been chosen';

COMMENT ON TABLE project_design_defaults IS 'Project-level design settings and default profile';
COMMENT ON COLUMN project_design_defaults.default_personality IS 'Default design personality: modern-minimal, bold-expressive, etc.';
COMMENT ON COLUMN project_design_defaults.spacing_preference IS 'Spacing preference: compact, normal, generous';
COMMENT ON COLUMN project_design_defaults.visual_intensity IS 'Visual intensity level: minimal, moderate, high';

COMMENT ON TABLE topical_map_design_rules IS 'Map-level design overrides with cluster-specific rules';
COMMENT ON COLUMN topical_map_design_rules.inherit_from_project IS 'Whether to inherit settings from project defaults';
COMMENT ON COLUMN topical_map_design_rules.overrides IS 'Map-specific design overrides';
COMMENT ON COLUMN topical_map_design_rules.cluster_rules IS 'Cluster-specific design rules JSONB';
