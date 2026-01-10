-- Migration: Add cost report refresh trigger
-- Queues organizations for cost_reports materialized view refresh when new usage is logged

-- Create trigger function to queue cost refresh
CREATE OR REPLACE FUNCTION queue_cost_refresh()
RETURNS TRIGGER AS $$
BEGIN
  -- Only queue if we have an organization_id
  IF NEW.organization_id IS NOT NULL THEN
    INSERT INTO cost_reports_refresh_queue (organization_id, queued_at)
    VALUES (NEW.organization_id, NOW())
    ON CONFLICT (organization_id) DO UPDATE SET queued_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS tr_queue_cost_refresh ON ai_usage_logs;

-- Create trigger on ai_usage_logs inserts
CREATE TRIGGER tr_queue_cost_refresh
  AFTER INSERT ON ai_usage_logs
  FOR EACH ROW
  EXECUTE FUNCTION queue_cost_refresh();

-- Function to process the refresh queue (call from scheduled job)
CREATE OR REPLACE FUNCTION process_cost_refresh_queue()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Count pending refreshes
  SELECT COUNT(*) INTO v_count FROM cost_reports_refresh_queue;

  -- If there are pending refreshes, do a full refresh
  IF v_count > 0 THEN
    -- Refresh the materialized view
    REFRESH MATERIALIZED VIEW CONCURRENTLY cost_reports;

    -- Clear the queue
    DELETE FROM cost_reports_refresh_queue;
  END IF;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION process_cost_refresh_queue() IS
  'Processes pending cost report refresh requests. Call from scheduled job every 15-60 minutes.';

-- Grant execute to service role only (for scheduled jobs)
REVOKE EXECUTE ON FUNCTION process_cost_refresh_queue FROM PUBLIC;
GRANT EXECUTE ON FUNCTION process_cost_refresh_queue TO service_role;

-- Alternative: Function to do targeted refresh for a specific org
-- (For real-time needs, not as efficient as batched refresh)
CREATE OR REPLACE FUNCTION refresh_org_costs(p_org_id UUID)
RETURNS void AS $$
BEGIN
  -- For now, we do full refresh since Postgres doesn't support partial matview refresh
  -- In production, consider using a regular table with incremental updates instead
  REFRESH MATERIALIZED VIEW CONCURRENTLY cost_reports;

  -- Remove this org from the queue
  DELETE FROM cost_reports_refresh_queue WHERE organization_id = p_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION refresh_org_costs(UUID) IS
  'Refreshes cost reports for a specific organization. Triggers full matview refresh.';

-- Grant execute to authenticated users (with RLS protection on underlying data)
GRANT EXECUTE ON FUNCTION refresh_org_costs TO authenticated;
