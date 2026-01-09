-- supabase/migrations/20260110000004_organization_audit_log.sql
-- Audit log for tracking sensitive organization operations

CREATE TABLE IF NOT EXISTS organization_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  target_email TEXT,
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_org_time ON organization_audit_log(organization_id, created_at DESC);
CREATE INDEX idx_audit_actor ON organization_audit_log(actor_id, created_at DESC);
CREATE INDEX idx_audit_action ON organization_audit_log(action, created_at DESC);

ALTER TABLE organization_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON organization_audit_log
  FOR ALL TO service_role
  USING (true);
