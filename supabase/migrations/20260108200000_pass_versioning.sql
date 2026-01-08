-- Migration: Add per-pass content versioning and audit auto-fix support
-- This enables rollback to any previous pass and tracks applied fixes

-- Add per-pass content versioning to sections
ALTER TABLE content_generation_sections
ADD COLUMN IF NOT EXISTS pass_contents JSONB DEFAULT '{}';

COMMENT ON COLUMN content_generation_sections.pass_contents IS 'Stores content after each pass: {"pass_1": "...", "pass_2": "...", etc.}';

-- Add audit issues storage to jobs
ALTER TABLE content_generation_jobs
ADD COLUMN IF NOT EXISTS audit_issues JSONB DEFAULT '[]';

COMMENT ON COLUMN content_generation_jobs.audit_issues IS 'Array of audit issues with suggested fixes';

-- Create auto-fix history table for tracking applied fixes
CREATE TABLE IF NOT EXISTS content_generation_fixes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES content_generation_jobs(id) ON DELETE CASCADE,
  issue_type TEXT NOT NULL,
  issue_id TEXT, -- UUID of the specific audit issue
  section_id UUID REFERENCES content_generation_sections(id) ON DELETE SET NULL,
  original_content TEXT,
  fixed_content TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  applied_by UUID REFERENCES auth.users(id),
  reverted_at TIMESTAMPTZ,
  reverted_by UUID REFERENCES auth.users(id)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_content_generation_fixes_job_id ON content_generation_fixes(job_id);
CREATE INDEX IF NOT EXISTS idx_content_generation_fixes_section_id ON content_generation_fixes(section_id);

-- RLS for fixes table
ALTER TABLE content_generation_fixes ENABLE ROW LEVEL SECURITY;

-- Users can view fixes for their own jobs
CREATE POLICY "Users can view their own fixes"
  ON content_generation_fixes FOR SELECT
  USING (
    job_id IN (
      SELECT cgj.id FROM content_generation_jobs cgj
      JOIN content_briefs cb ON cgj.brief_id = cb.id
      WHERE cb.user_id = auth.uid()
    )
  );

-- Users can insert fixes for their own jobs
CREATE POLICY "Users can insert their own fixes"
  ON content_generation_fixes FOR INSERT
  WITH CHECK (
    applied_by = auth.uid()
    AND job_id IN (
      SELECT cgj.id FROM content_generation_jobs cgj
      JOIN content_briefs cb ON cgj.brief_id = cb.id
      WHERE cb.user_id = auth.uid()
    )
  );

-- Users can update (revert) their own fixes
CREATE POLICY "Users can update their own fixes"
  ON content_generation_fixes FOR UPDATE
  USING (
    job_id IN (
      SELECT cgj.id FROM content_generation_jobs cgj
      JOIN content_briefs cb ON cgj.brief_id = cb.id
      WHERE cb.user_id = auth.uid()
    )
  );

-- Function to rollback to a specific pass
CREATE OR REPLACE FUNCTION rollback_to_pass(p_job_id UUID, p_pass_number INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE content_generation_sections
  SET current_content = pass_contents->('pass_' || p_pass_number::text)
  WHERE job_id = p_job_id
    AND pass_contents ? ('pass_' || p_pass_number::text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION rollback_to_pass(UUID, INTEGER) TO authenticated;
