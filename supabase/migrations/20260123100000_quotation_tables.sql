-- supabase/migrations/20260123000000_quotation_tables.sql
-- SEO Quotation Tool - Database Foundation

-- Service module definitions (catalog of available services)
CREATE TABLE IF NOT EXISTS quotation_service_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN (
    'semantic_seo', 'traditional_seo', 'content', 'offsite',
    'paid_ads', 'ai_llm', 'local_seo', 'retainers'
  )),
  name TEXT NOT NULL,
  description TEXT,
  base_price_min NUMERIC NOT NULL,
  base_price_max NUMERIC NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  recurring_interval TEXT CHECK (recurring_interval IN ('monthly', 'quarterly')),
  kpi_contributions JSONB DEFAULT '[]',
  deliverables JSONB DEFAULT '[]',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quotation_modules_category ON quotation_service_modules(category);
CREATE INDEX idx_quotation_modules_active ON quotation_service_modules(is_active);

-- Package presets (bundled services at discount)
CREATE TABLE IF NOT EXISTS quotation_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  included_modules JSONB NOT NULL DEFAULT '[]',
  base_price NUMERIC NOT NULL,
  discount_percent NUMERIC DEFAULT 0,
  target_site_sizes TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quotation_packages_active ON quotation_packages(is_active);

-- Main quotes table with CRM-lite features
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),

  -- Client info
  client_name TEXT,
  client_email TEXT,
  client_company TEXT,
  client_domain TEXT,

  -- Analysis snapshot
  analysis_data JSONB,
  questionnaire_responses JSONB,

  -- Quote details
  selected_package_id UUID REFERENCES quotation_packages(id),
  line_items JSONB NOT NULL DEFAULT '[]',
  pricing_factors JSONB,
  subtotal NUMERIC,
  discount_percent NUMERIC DEFAULT 0,
  total_min NUMERIC,
  total_max NUMERIC,
  kpi_projections JSONB DEFAULT '[]',
  roi_calculation JSONB,

  -- Status tracking
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'
  )),
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,

  -- Versioning
  version INTEGER DEFAULT 1,
  parent_quote_id UUID REFERENCES quotes(id),

  notes TEXT,
  internal_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quotes_organization ON quotes(organization_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_client_domain ON quotes(client_domain);
CREATE INDEX idx_quotes_created_at ON quotes(created_at DESC);

-- Quote activity log for tracking interactions
CREATE TABLE IF NOT EXISTS quote_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'created', 'sent', 'viewed', 'revised', 'accepted', 'rejected', 'note_added', 'status_changed'
  )),
  details JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quote_activities_quote ON quote_activities(quote_id);
CREATE INDEX idx_quote_activities_type ON quote_activities(activity_type);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_quotation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_quotation_modules_updated_at
  BEFORE UPDATE ON quotation_service_modules
  FOR EACH ROW
  EXECUTE FUNCTION update_quotation_updated_at();

CREATE TRIGGER tr_quotation_packages_updated_at
  BEFORE UPDATE ON quotation_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_quotation_updated_at();

CREATE TRIGGER tr_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_quotation_updated_at();

-- RLS policies
ALTER TABLE quotation_service_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_activities ENABLE ROW LEVEL SECURITY;

-- Service modules and packages are readable by all authenticated users
CREATE POLICY "quotation_modules_select" ON quotation_service_modules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "quotation_packages_select" ON quotation_packages
  FOR SELECT TO authenticated USING (true);

-- Quotes are accessible by organization members
CREATE POLICY "quotes_select" ON quotes
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "quotes_insert" ON quotes
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "quotes_update" ON quotes
  FOR UPDATE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "quotes_delete" ON quotes
  FOR DELETE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Quote activities follow quotes access
CREATE POLICY "quote_activities_select" ON quote_activities
  FOR SELECT TO authenticated
  USING (
    quote_id IN (
      SELECT id FROM quotes WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "quote_activities_insert" ON quote_activities
  FOR INSERT TO authenticated
  WITH CHECK (
    quote_id IN (
      SELECT id FROM quotes WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Admin policies for modules and packages (only super admins or org admins can modify)
CREATE POLICY "quotation_modules_admin" ON quotation_service_modules
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_id = auth.uid() AND is_super_admin = true
    )
  );

CREATE POLICY "quotation_packages_admin" ON quotation_packages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_id = auth.uid() AND is_super_admin = true
    )
  );
