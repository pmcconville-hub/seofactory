-- Migration: Create modules table for billing/subscription system
-- This table defines the available feature modules that organizations can subscribe to

CREATE TABLE IF NOT EXISTS modules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly_usd DECIMAL(10,2) DEFAULT 0,
  price_yearly_usd DECIMAL(10,2) DEFAULT 0,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add table comment
COMMENT ON TABLE modules IS 'Feature modules available for organization subscription';
COMMENT ON COLUMN modules.id IS 'Unique module identifier (e.g., core, content_generation)';
COMMENT ON COLUMN modules.features IS 'Array of feature flags included in this module';
COMMENT ON COLUMN modules.price_monthly_usd IS 'Monthly subscription price in USD';
COMMENT ON COLUMN modules.price_yearly_usd IS 'Yearly subscription price in USD (typically discounted)';

-- Seed default modules
INSERT INTO modules (id, name, description, price_monthly_usd, price_yearly_usd, features, sort_order) VALUES
  ('core', 'Core Platform', 'Project management, topical maps, basic briefs', 0, 0, '["projects", "topical_maps", "basic_briefs"]', 1),
  ('content_generation', 'Content Generation', '10-pass article system with audit and schema', 49, 470, '["content_generation", "audit_system", "schema_generation"]', 2),
  ('advanced_seo', 'Advanced SEO', 'Competitor analysis, SERP tracking, gap analysis', 29, 278, '["competitor_analysis", "serp_tracking", "gap_analysis"]', 3),
  ('corpus_audit', 'Corpus Audit', 'Full-site semantic analysis', 19, 182, '["corpus_audit", "semantic_analysis"]', 4),
  ('enterprise', 'Enterprise', 'API access, webhooks, SSO, audit logs', 99, 950, '["api_access", "webhooks", "sso", "advanced_audit"]', 5)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly_usd = EXCLUDED.price_monthly_usd,
  price_yearly_usd = EXCLUDED.price_yearly_usd,
  features = EXCLUDED.features,
  sort_order = EXCLUDED.sort_order;

-- Enable RLS
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

-- Anyone can read modules (public catalog)
CREATE POLICY "Anyone can read modules" ON modules
  FOR SELECT
  USING (true);

-- Only super admins can modify modules
CREATE POLICY "Super admins can manage modules" ON modules
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

-- Create index for active modules lookup
CREATE INDEX IF NOT EXISTS idx_modules_active ON modules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_modules_sort ON modules(sort_order);
