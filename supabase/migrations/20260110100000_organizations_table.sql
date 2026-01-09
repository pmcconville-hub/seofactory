-- supabase/migrations/20260110100000_organizations_table.sql
-- Core organizations table

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT DEFAULT 'personal' CHECK (type IN ('personal', 'team', 'enterprise')),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  settings JSONB DEFAULT '{}',
  billing_email TEXT,
  stripe_customer_id TEXT,
  cost_visibility JSONB DEFAULT '{
    "admin_sees_all": true,
    "editor_sees_own": true,
    "viewer_sees_none": true,
    "external_can_see": false,
    "breakdown_level": "summary"
  }',
  branding JSONB DEFAULT '{"color": null, "logo_url": null}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_personal_org_owner ON organizations(owner_id) WHERE type = 'personal';
CREATE INDEX idx_organizations_slug ON organizations(slug);

CREATE OR REPLACE FUNCTION update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_organizations_updated_at();

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
