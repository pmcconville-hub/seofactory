-- supabase/migrations/20260110300000_project_api_keys_table.sql
-- Project-level API key overrides (Phase 3)

CREATE TABLE IF NOT EXISTS project_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  encrypted_key UUID,  -- Reference to vault.secrets.id, NULL = inherit from org
  key_source TEXT DEFAULT 'inherit' CHECK (key_source IN ('inherit', 'byok')),
  is_active BOOLEAN DEFAULT TRUE,
  usage_this_month JSONB DEFAULT '{"tokens": 0, "requests": 0, "cost_usd": 0}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  UNIQUE(project_id, provider)
);

CREATE INDEX idx_project_api_keys_project ON project_api_keys(project_id);
CREATE INDEX idx_project_api_keys_provider ON project_api_keys(provider) WHERE is_active = TRUE;

CREATE TRIGGER tr_project_api_keys_updated_at
  BEFORE UPDATE ON project_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_organizations_updated_at();

ALTER TABLE project_api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Project admins can view API keys"
  ON project_api_keys FOR SELECT
  TO authenticated
  USING (get_project_role(project_id) IN ('owner', 'admin'));

CREATE POLICY "Project admins can manage API keys"
  ON project_api_keys FOR ALL
  TO authenticated
  USING (get_project_role(project_id) IN ('owner', 'admin'));
