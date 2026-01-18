-- Template Versioning Migration
-- Created: 2026-01-18
-- Purpose: Track template configuration versions for rollback capability

-- Create template versions table
CREATE TABLE IF NOT EXISTS template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Template identification
    template_name VARCHAR(50) NOT NULL,
    version_number INTEGER NOT NULL,

    -- Version metadata
    label VARCHAR(100),
    description TEXT,

    -- Full template configuration (JSON)
    config JSONB NOT NULL,

    -- Version status
    is_active BOOLEAN DEFAULT FALSE,
    is_default BOOLEAN DEFAULT FALSE,

    -- Rollback tracking
    rolled_back_from UUID REFERENCES template_versions(id),
    rolled_back_at TIMESTAMP WITH TIME ZONE,
    rollback_reason TEXT,

    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    activated_at TIMESTAMP WITH TIME ZONE,
    deactivated_at TIMESTAMP WITH TIME ZONE,

    -- Ensure unique version numbers per template
    UNIQUE(template_name, version_number)
);

-- Create template version history table for audit trail
CREATE TABLE IF NOT EXISTS template_version_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Reference to version
    version_id UUID REFERENCES template_versions(id) ON DELETE CASCADE,
    template_name VARCHAR(50) NOT NULL,

    -- Action tracking
    action VARCHAR(20) NOT NULL CHECK (action IN ('created', 'activated', 'deactivated', 'rolled_back', 'deleted')),

    -- Before/after state
    previous_active_version_id UUID REFERENCES template_versions(id),

    -- User and timestamp
    performed_by UUID REFERENCES auth.users(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Additional context
    notes TEXT
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_template_versions_name ON template_versions(template_name);
CREATE INDEX IF NOT EXISTS idx_template_versions_active ON template_versions(template_name, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_template_version_history_version ON template_version_history(version_id);
CREATE INDEX IF NOT EXISTS idx_template_version_history_template ON template_version_history(template_name);

-- Enable RLS
ALTER TABLE template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_version_history ENABLE ROW LEVEL SECURITY;

-- RLS policies - authenticated users can view, admins can manage
DROP POLICY IF EXISTS "Authenticated users can view template versions" ON template_versions;
CREATE POLICY "Authenticated users can view template versions"
ON template_versions FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can manage template versions" ON template_versions;
CREATE POLICY "Admins can manage template versions"
ON template_versions FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM user_settings
        WHERE user_id = auth.uid()
        AND is_super_admin = TRUE
    )
);

DROP POLICY IF EXISTS "Authenticated users can view version history" ON template_version_history;
CREATE POLICY "Authenticated users can view version history"
ON template_version_history FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "System can insert version history" ON template_version_history;
CREATE POLICY "System can insert version history"
ON template_version_history FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Function to get the active version of a template
CREATE OR REPLACE FUNCTION get_active_template_version(p_template_name VARCHAR(50))
RETURNS JSONB AS $$
DECLARE
    v_config JSONB;
BEGIN
    SELECT config INTO v_config
    FROM template_versions
    WHERE template_name = p_template_name
    AND is_active = TRUE
    LIMIT 1;

    RETURN v_config;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to activate a template version
CREATE OR REPLACE FUNCTION activate_template_version(
    p_version_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_template_name VARCHAR(50);
    v_previous_active_id UUID;
BEGIN
    -- Get template name from version
    SELECT template_name INTO v_template_name
    FROM template_versions
    WHERE id = p_version_id;

    IF v_template_name IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Get current active version
    SELECT id INTO v_previous_active_id
    FROM template_versions
    WHERE template_name = v_template_name
    AND is_active = TRUE;

    -- Deactivate current active version
    UPDATE template_versions
    SET is_active = FALSE, deactivated_at = NOW()
    WHERE template_name = v_template_name
    AND is_active = TRUE;

    -- Activate new version
    UPDATE template_versions
    SET is_active = TRUE, activated_at = NOW()
    WHERE id = p_version_id;

    -- Record in history
    INSERT INTO template_version_history (
        version_id,
        template_name,
        action,
        previous_active_version_id,
        performed_by
    ) VALUES (
        p_version_id,
        v_template_name,
        'activated',
        v_previous_active_id,
        COALESCE(p_user_id, auth.uid())
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to rollback to a previous version
CREATE OR REPLACE FUNCTION rollback_template_version(
    p_template_name VARCHAR(50),
    p_target_version_id UUID,
    p_reason TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_version_id UUID;
BEGIN
    -- Get current active version
    SELECT id INTO v_current_version_id
    FROM template_versions
    WHERE template_name = p_template_name
    AND is_active = TRUE;

    IF v_current_version_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Deactivate current version
    UPDATE template_versions
    SET
        is_active = FALSE,
        deactivated_at = NOW(),
        rolled_back_from = v_current_version_id,
        rolled_back_at = NOW(),
        rollback_reason = p_reason
    WHERE id = v_current_version_id;

    -- Activate target version
    UPDATE template_versions
    SET is_active = TRUE, activated_at = NOW()
    WHERE id = p_target_version_id;

    -- Record rollback in history
    INSERT INTO template_version_history (
        version_id,
        template_name,
        action,
        previous_active_version_id,
        performed_by,
        notes
    ) VALUES (
        p_target_version_id,
        p_template_name,
        'rolled_back',
        v_current_version_id,
        COALESCE(p_user_id, auth.uid()),
        p_reason
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE template_versions IS 'Stores versioned template configurations for rollback capability';
COMMENT ON TABLE template_version_history IS 'Audit trail for template version changes';
COMMENT ON FUNCTION get_active_template_version IS 'Returns the active template configuration as JSONB';
COMMENT ON FUNCTION activate_template_version IS 'Activates a specific template version, deactivating the current one';
COMMENT ON FUNCTION rollback_template_version IS 'Rolls back to a previous template version with reason tracking';
