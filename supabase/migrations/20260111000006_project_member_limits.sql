-- Migration: Add usage limit columns to project_members
-- Enables setting cost limits for external collaborators on projects

-- Add usage limit columns
ALTER TABLE project_members
  ADD COLUMN IF NOT EXISTS monthly_usage_limit_usd DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS usage_this_month_usd DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS usage_reset_at TIMESTAMPTZ;

-- Add comments
COMMENT ON COLUMN project_members.monthly_usage_limit_usd IS 'Optional monthly cost limit in USD for this member. NULL means unlimited.';
COMMENT ON COLUMN project_members.usage_this_month_usd IS 'Current month usage tracked in USD. Reset monthly.';
COMMENT ON COLUMN project_members.usage_reset_at IS 'When the monthly usage was last reset.';

-- Function to check if external member is within usage limit
CREATE OR REPLACE FUNCTION check_external_usage_limit(
  p_project_id UUID,
  p_user_id UUID,
  p_estimated_cost DECIMAL
) RETURNS BOOLEAN AS $$
DECLARE
  v_limit DECIMAL;
  v_current DECIMAL;
  v_reset_at TIMESTAMPTZ;
BEGIN
  -- Get the member's limit and current usage
  SELECT monthly_usage_limit_usd, usage_this_month_usd, usage_reset_at
  INTO v_limit, v_current, v_reset_at
  FROM project_members
  WHERE project_id = p_project_id
    AND user_id = p_user_id
    AND source = 'direct';  -- Only external/direct added members

  -- If no record found, they're not an external member
  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;

  -- If no limit set, allow
  IF v_limit IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check if we need to reset (new month)
  IF v_reset_at IS NULL OR v_reset_at < DATE_TRUNC('month', NOW()) THEN
    v_current := 0;
  END IF;

  -- Check if within limit
  RETURN (v_current + p_estimated_cost) <= v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION check_external_usage_limit(UUID, UUID, DECIMAL) IS
  'Checks if an external collaborator is within their monthly usage limit for a project.';

-- Function to increment external member usage
CREATE OR REPLACE FUNCTION increment_external_usage(
  p_project_id UUID,
  p_user_id UUID,
  p_cost DECIMAL
) RETURNS void AS $$
BEGIN
  UPDATE project_members
  SET
    usage_this_month_usd = CASE
      WHEN usage_reset_at IS NULL OR usage_reset_at < DATE_TRUNC('month', NOW())
      THEN p_cost
      ELSE COALESCE(usage_this_month_usd, 0) + p_cost
    END,
    usage_reset_at = CASE
      WHEN usage_reset_at IS NULL OR usage_reset_at < DATE_TRUNC('month', NOW())
      THEN DATE_TRUNC('month', NOW())
      ELSE usage_reset_at
    END
  WHERE project_id = p_project_id
    AND user_id = p_user_id
    AND source = 'direct';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION increment_external_usage(UUID, UUID, DECIMAL) IS
  'Increments the monthly usage counter for an external collaborator.';

-- Trigger to auto-reset monthly usage on update
CREATE OR REPLACE FUNCTION reset_monthly_external_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-reset if it's a new month
  IF NEW.usage_reset_at IS NULL OR NEW.usage_reset_at < DATE_TRUNC('month', NOW()) THEN
    NEW.usage_this_month_usd := COALESCE(NEW.usage_this_month_usd, 0);
    NEW.usage_reset_at := DATE_TRUNC('month', NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_reset_external_usage ON project_members;
CREATE TRIGGER tr_reset_external_usage
  BEFORE UPDATE ON project_members
  FOR EACH ROW
  WHEN (NEW.source = 'direct')
  EXECUTE FUNCTION reset_monthly_external_usage();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_external_usage_limit TO authenticated;
GRANT EXECUTE ON FUNCTION increment_external_usage TO authenticated;

-- Create index for usage queries
CREATE INDEX IF NOT EXISTS idx_project_members_external_usage
  ON project_members(project_id, user_id, source)
  WHERE source = 'direct';
