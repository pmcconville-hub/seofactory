-- Migration: Create role_module_access table
-- Defines which organization roles can access which modules

CREATE TABLE IF NOT EXISTS role_module_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  can_use BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, module_id)
);

-- Add table comments
COMMENT ON TABLE role_module_access IS 'Defines which organization roles can access which modules';
COMMENT ON COLUMN role_module_access.can_use IS 'Whether this role can use this module when org has subscription';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_role_module_role ON role_module_access(role);
CREATE INDEX IF NOT EXISTS idx_role_module_module ON role_module_access(module_id);

-- Enable RLS
ALTER TABLE role_module_access ENABLE ROW LEVEL SECURITY;

-- Anyone can read role access rules (public configuration)
CREATE POLICY "Anyone can read role access" ON role_module_access
  FOR SELECT
  USING (true);

-- Only super admins can modify role access
CREATE POLICY "Super admins can manage role access" ON role_module_access
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_id = auth.uid()
      AND is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_id = auth.uid()
      AND is_super_admin = true
    )
  );

-- Seed default role/module access permissions
-- Core: all roles can use
-- Content Generation: owner, admin, editor can use (not viewer)
-- Advanced SEO: owner, admin, editor can use (not viewer)
-- Corpus Audit: owner, admin only
-- Enterprise: owner, admin only
INSERT INTO role_module_access (role, module_id, can_use) VALUES
  -- Core module - everyone can use
  ('owner', 'core', true),
  ('admin', 'core', true),
  ('editor', 'core', true),
  ('viewer', 'core', true),

  -- Content Generation - not viewers
  ('owner', 'content_generation', true),
  ('admin', 'content_generation', true),
  ('editor', 'content_generation', true),
  ('viewer', 'content_generation', false),

  -- Advanced SEO - not viewers
  ('owner', 'advanced_seo', true),
  ('admin', 'advanced_seo', true),
  ('editor', 'advanced_seo', true),
  ('viewer', 'advanced_seo', false),

  -- Corpus Audit - owner/admin only
  ('owner', 'corpus_audit', true),
  ('admin', 'corpus_audit', true),
  ('editor', 'corpus_audit', false),
  ('viewer', 'corpus_audit', false),

  -- Enterprise - owner/admin only
  ('owner', 'enterprise', true),
  ('admin', 'enterprise', true),
  ('editor', 'enterprise', false),
  ('viewer', 'enterprise', false)
ON CONFLICT (role, module_id) DO UPDATE SET
  can_use = EXCLUDED.can_use;
