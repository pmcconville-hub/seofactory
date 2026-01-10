-- Migration: Create organization_subscriptions table
-- Links organizations to their subscribed modules with billing status

CREATE TABLE IF NOT EXISTS organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL REFERENCES modules(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, module_id)
);

-- Add table comments
COMMENT ON TABLE organization_subscriptions IS 'Tracks which modules each organization is subscribed to';
COMMENT ON COLUMN organization_subscriptions.status IS 'Subscription status: active, canceled, past_due, trialing';
COMMENT ON COLUMN organization_subscriptions.stripe_subscription_id IS 'Stripe subscription ID for billing integration';
COMMENT ON COLUMN organization_subscriptions.cancel_at_period_end IS 'If true, subscription will cancel at period end';

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_org_subs_org ON organization_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_subs_status ON organization_subscriptions(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_org_subs_stripe ON organization_subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- Enable RLS
ALTER TABLE organization_subscriptions ENABLE ROW LEVEL SECURITY;

-- Org members can view their organization's subscriptions
CREATE POLICY "Org members can view subscriptions" ON organization_subscriptions
  FOR SELECT
  USING (is_org_member(organization_id));

-- Admins and owners can manage subscriptions
CREATE POLICY "Admins can manage subscriptions" ON organization_subscriptions
  FOR ALL
  USING (get_org_role(organization_id) IN ('owner', 'admin'))
  WITH CHECK (get_org_role(organization_id) IN ('owner', 'admin'));

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_org_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_org_subscription_updated
  BEFORE UPDATE ON organization_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_org_subscription_timestamp();

-- Auto-grant core module to all existing organizations
INSERT INTO organization_subscriptions (organization_id, module_id, status, current_period_start)
SELECT id, 'core', 'active', NOW()
FROM organizations
WHERE NOT EXISTS (
  SELECT 1 FROM organization_subscriptions os
  WHERE os.organization_id = organizations.id
  AND os.module_id = 'core'
)
ON CONFLICT (organization_id, module_id) DO NOTHING;

-- Function to auto-grant core module to new organizations
CREATE OR REPLACE FUNCTION auto_grant_core_module()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO organization_subscriptions (organization_id, module_id, status, current_period_start)
  VALUES (NEW.id, 'core', 'active', NOW())
  ON CONFLICT (organization_id, module_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-grant core module on organization creation
DROP TRIGGER IF EXISTS tr_auto_grant_core_module ON organizations;
CREATE TRIGGER tr_auto_grant_core_module
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION auto_grant_core_module();
