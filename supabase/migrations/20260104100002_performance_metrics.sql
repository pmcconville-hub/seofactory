-- Performance Metrics Table
-- Tracks operation timing for performance analysis and optimization

CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES content_generation_jobs(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('PASS', 'SECTION', 'CHECKPOINT', 'ASSEMBLY', 'VALIDATION', 'PARSE', 'RENDER', 'OTHER')),
  operation TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  success BOOLEAN NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_performance_metrics_job_id ON performance_metrics(job_id);
CREATE INDEX idx_performance_metrics_session_id ON performance_metrics(session_id);
CREATE INDEX idx_performance_metrics_category ON performance_metrics(category);
CREATE INDEX idx_performance_metrics_operation ON performance_metrics(operation);
CREATE INDEX idx_performance_metrics_created_at ON performance_metrics(created_at DESC);

-- GIN index for JSONB metadata queries
CREATE INDEX idx_performance_metrics_metadata ON performance_metrics USING GIN (metadata);

-- Composite indexes for common queries
CREATE INDEX idx_performance_metrics_category_success ON performance_metrics(category, success);
CREATE INDEX idx_performance_metrics_job_category ON performance_metrics(job_id, category);

-- Enable RLS
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own metrics
CREATE POLICY "Users can insert performance metrics"
  ON performance_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to view metrics associated with their jobs
CREATE POLICY "Users can view their performance metrics"
  ON performance_metrics
  FOR SELECT
  TO authenticated
  USING (
    job_id IS NULL OR
    EXISTS (
      SELECT 1 FROM content_generation_jobs cgj
      WHERE cgj.id = performance_metrics.job_id
      AND cgj.user_id = auth.uid()
    )
  );

-- Allow service role full access
CREATE POLICY "Service role has full access to performance metrics"
  ON performance_metrics
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Auto-cleanup function for metrics older than 30 days
CREATE OR REPLACE FUNCTION cleanup_old_performance_metrics()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM performance_metrics
  WHERE created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_old_performance_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_performance_metrics() TO service_role;

-- Aggregation view for quick performance summaries
CREATE OR REPLACE VIEW performance_summary AS
SELECT
  job_id,
  category,
  operation,
  COUNT(*) as call_count,
  AVG(duration_ms)::INTEGER as avg_duration_ms,
  MIN(duration_ms) as min_duration_ms,
  MAX(duration_ms) as max_duration_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms)::INTEGER as median_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::INTEGER as p95_duration_ms,
  SUM(CASE WHEN success THEN 1 ELSE 0 END)::FLOAT / COUNT(*) * 100 as success_rate,
  MIN(created_at) as first_call,
  MAX(created_at) as last_call
FROM performance_metrics
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY job_id, category, operation;

COMMENT ON TABLE performance_metrics IS 'Tracks operation timing for performance analysis';
COMMENT ON COLUMN performance_metrics.category IS 'Operation category: PASS, SECTION, CHECKPOINT, etc.';
COMMENT ON COLUMN performance_metrics.operation IS 'Specific operation name (e.g., pass_1, section_abc123)';
COMMENT ON COLUMN performance_metrics.duration_ms IS 'Operation duration in milliseconds';
COMMENT ON COLUMN performance_metrics.metadata IS 'Additional context: passNumber, sectionId, tokenCount, etc.';
