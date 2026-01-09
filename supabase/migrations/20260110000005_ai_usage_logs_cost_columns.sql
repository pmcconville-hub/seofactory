-- supabase/migrations/20260110000005_ai_usage_logs_cost_columns.sql
-- Add billing attribution columns to ai_usage_logs

-- Add new columns for billing attribution (cost_usd already exists)
ALTER TABLE ai_usage_logs
  ADD COLUMN IF NOT EXISTS key_source TEXT CHECK (key_source IN ('platform', 'org_byok', 'project_byok')),
  ADD COLUMN IF NOT EXISTS billable_to TEXT CHECK (billable_to IN ('platform', 'organization', 'project')),
  ADD COLUMN IF NOT EXISTS billable_id UUID,
  ADD COLUMN IF NOT EXISTS is_external_usage BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Create trigger to auto-calculate cost on insert (uses correct column names)
CREATE OR REPLACE FUNCTION calculate_usage_cost()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate if cost_usd is 0 or NULL and we have token counts
  IF (NEW.cost_usd IS NULL OR NEW.cost_usd = 0) AND NEW.tokens_in IS NOT NULL AND NEW.tokens_out IS NOT NULL THEN
    NEW.cost_usd := calculate_ai_cost(
      NEW.provider,
      NEW.model,
      NEW.tokens_in,
      NEW.tokens_out,
      COALESCE(NEW.created_at, NOW())
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_calculate_usage_cost ON ai_usage_logs;

CREATE TRIGGER tr_calculate_usage_cost
  BEFORE INSERT ON ai_usage_logs
  FOR EACH ROW
  EXECUTE FUNCTION calculate_usage_cost();

-- Index for billing queries
CREATE INDEX IF NOT EXISTS idx_usage_org_billing
  ON ai_usage_logs(organization_id, billable_to, created_at DESC);
