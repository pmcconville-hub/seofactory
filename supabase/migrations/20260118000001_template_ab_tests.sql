-- Template A/B Testing Migration
-- Created: 2026-01-18
-- Purpose: Infrastructure for A/B testing different content templates

-- Create A/B test configuration table
CREATE TABLE IF NOT EXISTS template_ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Test variants
    control_template VARCHAR(50) NOT NULL,
    variant_template VARCHAR(50) NOT NULL,

    -- Configuration
    traffic_split DECIMAL(3,2) DEFAULT 0.50, -- 0.50 = 50/50 split
    is_active BOOLEAN DEFAULT TRUE,

    -- Targeting (null = all)
    website_types VARCHAR(50)[], -- null = all types
    min_authority_score INTEGER,

    -- Duration
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,

    -- Results (updated periodically)
    control_count INTEGER DEFAULT 0,
    variant_count INTEGER DEFAULT 0,
    control_avg_audit_score DECIMAL(5,2),
    variant_avg_audit_score DECIMAL(5,2),
    statistical_significance DECIMAL(5,4),

    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create individual test assignments table
CREATE TABLE IF NOT EXISTS template_ab_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES template_ab_tests(id) ON DELETE CASCADE,
    job_id UUID REFERENCES content_generation_jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),

    assigned_variant VARCHAR(20) NOT NULL CHECK (assigned_variant IN ('control', 'variant')),
    assigned_template VARCHAR(50) NOT NULL,

    -- Outcome metrics (updated after generation)
    audit_score INTEGER,
    template_compliance_score INTEGER,
    generation_time_ms INTEGER,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_ab_tests_active ON template_ab_tests(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_ab_assignments_test ON template_ab_assignments(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_assignments_job ON template_ab_assignments(job_id);
CREATE INDEX IF NOT EXISTS idx_ab_assignments_user ON template_ab_assignments(user_id);

-- Enable RLS
ALTER TABLE template_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_ab_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for A/B tests (viewing allowed for authenticated users, management for admins)
DROP POLICY IF EXISTS "Authenticated users can view AB tests" ON template_ab_tests;
CREATE POLICY "Authenticated users can view AB tests"
ON template_ab_tests FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can manage AB tests" ON template_ab_tests;
CREATE POLICY "Admins can manage AB tests"
ON template_ab_tests FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM user_settings
        WHERE user_id = auth.uid()
        AND is_super_admin = TRUE
    )
);

-- RLS policies for assignments (users can see their own)
DROP POLICY IF EXISTS "Users can view own AB assignments" ON template_ab_assignments;
CREATE POLICY "Users can view own AB assignments"
ON template_ab_assignments FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert AB assignments" ON template_ab_assignments;
CREATE POLICY "System can insert AB assignments"
ON template_ab_assignments FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "System can update AB assignments" ON template_ab_assignments;
CREATE POLICY "System can update AB assignments"
ON template_ab_assignments FOR UPDATE
USING (auth.uid() = user_id);

-- Function to update test statistics
CREATE OR REPLACE FUNCTION update_ab_test_stats(p_test_id UUID)
RETURNS VOID AS $$
DECLARE
    v_control_count INTEGER;
    v_variant_count INTEGER;
    v_control_avg DECIMAL(5,2);
    v_variant_avg DECIMAL(5,2);
BEGIN
    -- Count and average for control
    SELECT COUNT(*), COALESCE(AVG(audit_score), 0)
    INTO v_control_count, v_control_avg
    FROM template_ab_assignments
    WHERE test_id = p_test_id
    AND assigned_variant = 'control'
    AND completed_at IS NOT NULL;

    -- Count and average for variant
    SELECT COUNT(*), COALESCE(AVG(audit_score), 0)
    INTO v_variant_count, v_variant_avg
    FROM template_ab_assignments
    WHERE test_id = p_test_id
    AND assigned_variant = 'variant'
    AND completed_at IS NOT NULL;

    -- Update test record
    UPDATE template_ab_tests
    SET
        control_count = v_control_count,
        variant_count = v_variant_count,
        control_avg_audit_score = v_control_avg,
        variant_avg_audit_score = v_variant_avg,
        updated_at = NOW()
    WHERE id = p_test_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE template_ab_tests IS 'Configuration for A/B tests comparing different content templates';
COMMENT ON TABLE template_ab_assignments IS 'Individual user assignments to A/B test variants';
COMMENT ON COLUMN template_ab_tests.traffic_split IS 'Fraction of traffic to send to control (0.5 = 50% control, 50% variant)';
COMMENT ON COLUMN template_ab_tests.statistical_significance IS 'P-value for test results significance';
