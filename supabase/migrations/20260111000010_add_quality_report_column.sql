-- supabase/migrations/20260111000010_add_quality_report_column.sql
-- Add comprehensive quality_report column to content_generation_jobs

-- Add quality_report JSONB column to store full quality report data
ALTER TABLE public.content_generation_jobs
  ADD COLUMN IF NOT EXISTS quality_report JSONB;

-- Add index for querying by quality score
CREATE INDEX IF NOT EXISTS idx_content_generation_jobs_quality_score
  ON public.content_generation_jobs ((quality_report->>'overallScore'));

-- Add comment explaining the structure
COMMENT ON COLUMN public.content_generation_jobs.quality_report IS
'Full quality report data including:
{
  "overallScore": number (0-100),
  "categoryScores": { "A": number, "B": number, ... },
  "violations": [{ "rule": string, "text": string, "severity": string, "suggestion": string }],
  "passDeltas": [{ "passNumber": number, "rulesFixed": [], "rulesRegressed": [], "netChange": number }],
  "systemicChecks": [{ "checkId": string, "name": string, "status": "pass"|"warning"|"fail", "value": string }],
  "generatedAt": timestamp,
  "generationMode": "autonomous"|"supervised"
}';

-- Function to extract overall score for easier querying
CREATE OR REPLACE FUNCTION get_quality_score(job_id UUID)
RETURNS NUMERIC AS $$
  SELECT COALESCE(
    (quality_report->>'overallScore')::NUMERIC,
    final_audit_score
  )
  FROM content_generation_jobs
  WHERE id = job_id;
$$ LANGUAGE SQL STABLE;
