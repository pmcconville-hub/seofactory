-- Template Analytics Migration
-- Created: 2026-01-18
-- Purpose: Track template selection and performance metrics for content generation

-- Add template fields to content_generation_jobs
ALTER TABLE content_generation_jobs
ADD COLUMN IF NOT EXISTS selected_template VARCHAR(50),
ADD COLUMN IF NOT EXISTS template_confidence INTEGER,
ADD COLUMN IF NOT EXISTS depth_mode VARCHAR(20),
ADD COLUMN IF NOT EXISTS template_compliance_score INTEGER;

-- Create template analytics table
CREATE TABLE IF NOT EXISTS content_template_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES content_generation_jobs(id) ON DELETE CASCADE,
    brief_id UUID,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Template selection data
    selected_template VARCHAR(50) NOT NULL,
    template_confidence INTEGER,
    ai_recommended_template VARCHAR(50),
    user_overrode_recommendation BOOLEAN DEFAULT FALSE,

    -- Generation metrics
    generation_time_ms INTEGER,
    total_passes_completed INTEGER,
    final_audit_score INTEGER,
    template_compliance_score INTEGER,

    -- Content metrics
    final_word_count INTEGER,
    final_section_count INTEGER,
    target_word_count_min INTEGER,
    target_word_count_max INTEGER,

    -- Depth settings
    depth_mode VARCHAR(20),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Performance tracking (can be updated later)
    post_publish_views INTEGER,
    post_publish_engagement DECIMAL(5,2)
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_template_analytics_template ON content_template_analytics(selected_template);
CREATE INDEX IF NOT EXISTS idx_template_analytics_user ON content_template_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_template_analytics_created ON content_template_analytics(created_at);

-- Enable RLS
ALTER TABLE content_template_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can only see their own analytics
DROP POLICY IF EXISTS "Users can view own template analytics" ON content_template_analytics;
CREATE POLICY "Users can view own template analytics"
ON content_template_analytics FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own template analytics" ON content_template_analytics;
CREATE POLICY "Users can insert own template analytics"
ON content_template_analytics FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own template analytics" ON content_template_analytics;
CREATE POLICY "Users can update own template analytics"
ON content_template_analytics FOR UPDATE
USING (auth.uid() = user_id);

-- Comment on table
COMMENT ON TABLE content_template_analytics IS 'Tracks template selection and performance metrics for content generation jobs';
COMMENT ON COLUMN content_template_analytics.user_overrode_recommendation IS 'True if user selected a different template than AI recommended';
COMMENT ON COLUMN content_template_analytics.post_publish_views IS 'Views after publishing (updated externally)';
