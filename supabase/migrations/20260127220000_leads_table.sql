-- Lead Capture Table
-- Stores leads from public quote calculator and other lead generation forms

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contact information
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  phone TEXT,

  -- Lead source tracking
  source TEXT DEFAULT 'quote_calculator',
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- Context data (quote info, analysis results, etc.)
  context_data JSONB DEFAULT '{}',

  -- Lead status
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'closed')),

  -- Organization assignment (for CRM integration)
  assigned_to UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_organization ON leads(organization_id);

-- Updated_at trigger
CREATE TRIGGER tr_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_quotation_updated_at();

-- RLS policies
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Allow anonymous/public inserts for lead capture forms
CREATE POLICY "leads_public_insert" ON leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Authenticated users can view leads for their organization
CREATE POLICY "leads_select" ON leads
  FOR SELECT TO authenticated
  USING (
    organization_id IS NULL
    OR organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Org members can update leads for their organization
CREATE POLICY "leads_update" ON leads
  FOR UPDATE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Only admins can delete leads
CREATE POLICY "leads_delete" ON leads
  FOR DELETE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );
