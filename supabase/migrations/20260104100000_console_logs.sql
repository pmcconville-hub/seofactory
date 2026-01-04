-- Console Logs Table
-- Captures console.error, console.warn, and uncaught exceptions for analysis

CREATE TABLE IF NOT EXISTS console_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES content_generation_jobs(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('error', 'warn', 'info', 'debug')),
  message TEXT NOT NULL,
  stack TEXT,
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_console_logs_job_id ON console_logs(job_id);
CREATE INDEX idx_console_logs_level ON console_logs(level);
CREATE INDEX idx_console_logs_session_id ON console_logs(session_id);
CREATE INDEX idx_console_logs_created_at ON console_logs(created_at DESC);

-- GIN index for JSONB context queries
CREATE INDEX idx_console_logs_context ON console_logs USING GIN (context);

-- Enable RLS
ALTER TABLE console_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own logs
CREATE POLICY "Users can insert console logs"
  ON console_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to view logs associated with their jobs
CREATE POLICY "Users can view their console logs"
  ON console_logs
  FOR SELECT
  TO authenticated
  USING (
    job_id IS NULL OR
    EXISTS (
      SELECT 1 FROM content_generation_jobs cgj
      WHERE cgj.id = console_logs.job_id
      AND cgj.user_id = auth.uid()
    )
  );

-- Allow service role full access
CREATE POLICY "Service role has full access to console logs"
  ON console_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Auto-cleanup function for logs older than 30 days
CREATE OR REPLACE FUNCTION cleanup_old_console_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM console_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_old_console_logs() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_console_logs() TO service_role;

COMMENT ON TABLE console_logs IS 'Captures console errors and warnings for debugging and analysis';
COMMENT ON COLUMN console_logs.session_id IS 'Browser session identifier for grouping related logs';
COMMENT ON COLUMN console_logs.level IS 'Log level: error, warn, info, debug';
COMMENT ON COLUMN console_logs.context IS 'Additional context: passNumber, operation, errorType, provider, etc.';
