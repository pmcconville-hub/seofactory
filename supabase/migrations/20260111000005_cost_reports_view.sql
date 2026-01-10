-- Migration: Create cost_reports materialized view
-- Pre-aggregated cost data for faster dashboard queries

-- Drop if exists (for re-running)
DROP MATERIALIZED VIEW IF EXISTS cost_reports CASCADE;

-- Create materialized view for aggregated cost data
CREATE MATERIALIZED VIEW cost_reports AS
SELECT
  organization_id,
  DATE_TRUNC('day', created_at)::DATE AS report_date,
  provider,
  model,
  project_id,
  map_id,
  COALESCE(key_source, 'platform') AS key_source,
  COALESCE(billable_to, 'platform') AS billable_to,
  user_id,
  operation,
  COUNT(*) AS request_count,
  SUM(tokens_in) AS total_tokens_in,
  SUM(tokens_out) AS total_tokens_out,
  SUM(tokens_in + tokens_out) AS total_tokens,
  SUM(cost_usd) AS total_cost_usd,
  COUNT(*) FILTER (WHERE success = false) AS error_count,
  AVG(duration_ms)::INTEGER AS avg_duration_ms
FROM ai_usage_logs
WHERE organization_id IS NOT NULL
GROUP BY
  organization_id,
  DATE_TRUNC('day', created_at)::DATE,
  provider,
  model,
  project_id,
  map_id,
  COALESCE(key_source, 'platform'),
  COALESCE(billable_to, 'platform'),
  user_id,
  operation;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX idx_cost_reports_pk ON cost_reports (
  organization_id,
  report_date,
  provider,
  model,
  COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(map_id, '00000000-0000-0000-0000-000000000000'::uuid),
  key_source,
  billable_to,
  COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(operation, 'unknown')
);

-- Additional indexes for common queries
CREATE INDEX idx_cost_reports_org_date ON cost_reports (organization_id, report_date DESC);
CREATE INDEX idx_cost_reports_provider ON cost_reports (organization_id, provider);
CREATE INDEX idx_cost_reports_project ON cost_reports (organization_id, project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_cost_reports_user ON cost_reports (organization_id, user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_cost_reports_billable ON cost_reports (organization_id, billable_to, report_date DESC);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_cost_reports()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY cost_reports;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION refresh_cost_reports() IS
  'Refreshes the cost_reports materialized view. Should be called hourly via pg_cron or external scheduler.';

-- Function to get organization cost summary (uses materialized view)
CREATE OR REPLACE FUNCTION get_org_cost_summary(
  p_org_id UUID,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
  total_cost_usd DECIMAL,
  total_requests BIGINT,
  total_tokens BIGINT,
  by_provider JSONB,
  by_user JSONB,
  by_project JSONB,
  daily_trend JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH base_data AS (
    SELECT * FROM cost_reports
    WHERE organization_id = p_org_id
      AND report_date >= p_start_date
      AND report_date <= p_end_date
  ),
  provider_agg AS (
    SELECT jsonb_agg(jsonb_build_object(
      'provider', provider,
      'cost', SUM(total_cost_usd),
      'requests', SUM(request_count)
    )) AS data
    FROM base_data
    GROUP BY provider
  ),
  user_agg AS (
    SELECT jsonb_agg(jsonb_build_object(
      'user_id', user_id,
      'cost', SUM(total_cost_usd),
      'requests', SUM(request_count)
    )) AS data
    FROM base_data
    WHERE user_id IS NOT NULL
    GROUP BY user_id
  ),
  project_agg AS (
    SELECT jsonb_agg(jsonb_build_object(
      'project_id', project_id,
      'cost', SUM(total_cost_usd),
      'requests', SUM(request_count)
    )) AS data
    FROM base_data
    WHERE project_id IS NOT NULL
    GROUP BY project_id
  ),
  daily_agg AS (
    SELECT jsonb_agg(jsonb_build_object(
      'date', report_date,
      'cost', SUM(total_cost_usd),
      'requests', SUM(request_count)
    ) ORDER BY report_date) AS data
    FROM base_data
    GROUP BY report_date
  )
  SELECT
    COALESCE(SUM(bd.total_cost_usd), 0) AS total_cost_usd,
    COALESCE(SUM(bd.request_count), 0) AS total_requests,
    COALESCE(SUM(bd.total_tokens), 0) AS total_tokens,
    COALESCE((SELECT data FROM provider_agg), '[]'::jsonb) AS by_provider,
    COALESCE((SELECT data FROM user_agg), '[]'::jsonb) AS by_user,
    COALESCE((SELECT data FROM project_agg), '[]'::jsonb) AS by_project,
    COALESCE((SELECT data FROM daily_agg), '[]'::jsonb) AS daily_trend
  FROM base_data bd;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_org_cost_summary(UUID, DATE, DATE) IS
  'Returns aggregated cost summary for an organization using the materialized cost_reports view.';

-- Create a table to track refresh queue (for incremental refresh optimization)
CREATE TABLE IF NOT EXISTS cost_reports_refresh_queue (
  id SERIAL PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id)
);

COMMENT ON TABLE cost_reports_refresh_queue IS
  'Tracks which organizations have new data that requires cost_reports refresh.';

-- Enable RLS on refresh queue (only service role should access)
ALTER TABLE cost_reports_refresh_queue ENABLE ROW LEVEL SECURITY;

-- Only super admins can view refresh queue
CREATE POLICY "Super admins can view refresh queue" ON cost_reports_refresh_queue
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_id = auth.uid()
      AND is_super_admin = true
    )
  );

-- Initial population of the view
REFRESH MATERIALIZED VIEW cost_reports;
