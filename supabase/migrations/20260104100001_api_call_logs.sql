-- API Call Logs Table
-- Captures all external API calls for performance analysis and debugging

CREATE TABLE IF NOT EXISTS api_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES content_generation_jobs(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('AI_PROVIDER', 'SCRAPER', 'SERP', 'ENTITY', 'DATABASE', 'OTHER')),
  provider TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
  duration_ms INTEGER,
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'error')),
  status_code INTEGER,
  request_size INTEGER,
  response_size INTEGER,
  token_count INTEGER,
  retry_count INTEGER DEFAULT 0,
  error_type TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_api_call_logs_job_id ON api_call_logs(job_id);
CREATE INDEX idx_api_call_logs_session_id ON api_call_logs(session_id);
CREATE INDEX idx_api_call_logs_provider ON api_call_logs(provider);
CREATE INDEX idx_api_call_logs_category ON api_call_logs(category);
CREATE INDEX idx_api_call_logs_status ON api_call_logs(status);
CREATE INDEX idx_api_call_logs_created_at ON api_call_logs(created_at DESC);

-- Composite index for common queries
CREATE INDEX idx_api_call_logs_provider_status ON api_call_logs(provider, status);

-- Enable RLS
ALTER TABLE api_call_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own logs
CREATE POLICY "Users can insert API call logs"
  ON api_call_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to view logs associated with their jobs
CREATE POLICY "Users can view their API call logs"
  ON api_call_logs
  FOR SELECT
  TO authenticated
  USING (
    job_id IS NULL OR
    EXISTS (
      SELECT 1 FROM content_generation_jobs cgj
      WHERE cgj.id = api_call_logs.job_id
      AND cgj.user_id = auth.uid()
    )
  );

-- Allow service role full access
CREATE POLICY "Service role has full access to API call logs"
  ON api_call_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Auto-cleanup function for logs older than 30 days
CREATE OR REPLACE FUNCTION cleanup_old_api_call_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM api_call_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_old_api_call_logs() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_api_call_logs() TO service_role;

COMMENT ON TABLE api_call_logs IS 'Logs all external API calls for performance monitoring and debugging';
COMMENT ON COLUMN api_call_logs.category IS 'API category: AI_PROVIDER, SCRAPER, SERP, ENTITY, DATABASE, OTHER';
COMMENT ON COLUMN api_call_logs.provider IS 'Specific provider: gemini, anthropic, openai, jina, firecrawl, etc.';
COMMENT ON COLUMN api_call_logs.endpoint IS 'API endpoint or operation name';
COMMENT ON COLUMN api_call_logs.duration_ms IS 'Call duration in milliseconds';
COMMENT ON COLUMN api_call_logs.token_count IS 'Token count for AI provider calls';
COMMENT ON COLUMN api_call_logs.error_type IS 'Categorized error type: RATE_LIMIT, TIMEOUT, AUTH, etc.';
