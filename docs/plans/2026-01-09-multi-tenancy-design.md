# Multi-Tenancy, RBAC, and Billing System Design

**Date:** 2026-01-09
**Status:** ✅ IMPLEMENTED (see Implementation Status section at end)
**Author:** Claude Code + User Collaboration

---

## Overview

This document describes the architecture for implementing multi-tenancy, role-based access control (RBAC), and multi-level billing in the CutTheCrap content generation platform.

### Key Requirements

1. Projects attachable to multiple users across organizations
2. Different authorization levels/roles with feature gating
3. External collaborators from different organizations
4. Multi-level billing (organization subscriptions + usage-based)
5. BYOK (Bring Your Own Keys) support with separate billing
6. Cost tracking at project/map level for client invoicing
7. Module-based feature unlocking
8. Configurable cost visibility per organization

---

## Section 1: Core Entity Model

```
┌─────────────────────────────────────────────────────────────┐
│                        USER                                  │
│  (auth.users - Supabase Auth)                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ belongs to (many-to-many)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    ORGANIZATION                              │
│  - Personal (implicit, 1:1 with user)                       │
│  - Team (explicit, multiple users)                          │
│  - Enterprise (advanced features)                           │
│                                                             │
│  Has: API Keys, Subscriptions, Billing Settings             │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ owns (one-to-many)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      PROJECT                                 │
│  - Inherits org API keys OR has own                         │
│  - Can invite external collaborators                        │
│  - Tracks costs per-project                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ contains (one-to-many)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    TOPICAL MAP                               │
│  - Can override project API keys                            │
│  - Granular cost tracking                                   │
│  - Usage thresholds (future)                                │
└─────────────────────────────────────────────────────────────┘
```

### Key Relationships

- **User ↔ Organization**: Many-to-many via `organization_members`
- **Organization → Project**: One-to-many ownership
- **Project ↔ User**: Many-to-many via `project_members` (for external collaborators)
- **Project → Topical Map**: One-to-many containment

---

## Section 2: Organization Tables

### organizations

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,  -- URL-friendly identifier
  type TEXT DEFAULT 'personal' CHECK (type IN ('personal', 'team', 'enterprise')),
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  settings JSONB DEFAULT '{}',
  billing_email TEXT,
  stripe_customer_id TEXT,  -- For subscription management
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Cost visibility configuration
  cost_visibility JSONB DEFAULT '{
    "admin_sees_all": true,
    "editor_sees_own": true,
    "viewer_sees_none": true,
    "external_can_see": false,
    "breakdown_level": "summary"
  }'
);

-- Personal orgs are auto-created, slug = user_id
CREATE UNIQUE INDEX idx_personal_org ON organizations(owner_id) WHERE type = 'personal';
```

### organization_members

```sql
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),

  -- Granular permission overrides (expand/restrict from base role)
  permission_overrides JSONB DEFAULT '{}',
  -- Example: {"can_manage_billing": true, "can_delete_projects": false}

  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,  -- NULL = pending invitation

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);
```

### organization_api_keys

```sql
CREATE TABLE organization_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,  -- 'anthropic', 'openai', 'gemini', etc.
  encrypted_key TEXT NOT NULL,  -- Encrypted with Supabase Vault
  key_source TEXT DEFAULT 'platform' CHECK (key_source IN ('platform', 'byok')),
  is_active BOOLEAN DEFAULT true,

  -- Usage tracking for billing
  usage_this_month JSONB DEFAULT '{"tokens": 0, "requests": 0, "cost_usd": 0}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, provider)
);
```

---

## Section 3: Project-Level Tables

### project_members (External Collaborators)

```sql
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Role for THIS project (independent of org role)
  role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  permission_overrides JSONB DEFAULT '{}',

  -- Source tracking
  source TEXT DEFAULT 'direct' CHECK (source IN ('org_member', 'direct', 'invitation')),

  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,

  UNIQUE(project_id, user_id)
);
```

### project_api_keys (Optional Overrides)

```sql
CREATE TABLE project_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  encrypted_key TEXT,  -- NULL = inherit from org
  key_source TEXT CHECK (key_source IN ('inherit', 'byok')),
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, provider)
);
```

### projects table modifications

```sql
ALTER TABLE projects
  ADD COLUMN organization_id UUID REFERENCES organizations(id),
  ADD COLUMN api_key_mode TEXT DEFAULT 'inherit'
    CHECK (api_key_mode IN ('inherit', 'project_specific', 'prompt_user'));
```

---

## Section 4: Row Level Security (RLS)

### Helper Functions

```sql
-- Check if user is member of an organization
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND accepted_at IS NOT NULL
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Get user's role in an organization
CREATE OR REPLACE FUNCTION get_org_role(org_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM organization_members
  WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND accepted_at IS NOT NULL;
$$ LANGUAGE sql SECURITY DEFINER;

-- Check if user has access to a project (via org OR direct membership)
CREATE OR REPLACE FUNCTION has_project_access(proj_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    -- Access via organization membership
    SELECT 1 FROM projects p
    JOIN organization_members om ON om.organization_id = p.organization_id
    WHERE p.id = proj_id
      AND om.user_id = auth.uid()
      AND om.accepted_at IS NOT NULL
  ) OR EXISTS (
    -- Direct project membership (external collaborators)
    SELECT 1 FROM project_members
    WHERE project_id = proj_id
      AND user_id = auth.uid()
      AND accepted_at IS NOT NULL
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Get effective role for a project
CREATE OR REPLACE FUNCTION get_project_role(proj_id UUID)
RETURNS TEXT AS $$
  SELECT COALESCE(
    -- Direct project role takes precedence
    (SELECT role FROM project_members
     WHERE project_id = proj_id AND user_id = auth.uid() AND accepted_at IS NOT NULL),
    -- Fall back to org role
    (SELECT om.role FROM projects p
     JOIN organization_members om ON om.organization_id = p.organization_id
     WHERE p.id = proj_id AND om.user_id = auth.uid() AND om.accepted_at IS NOT NULL)
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

### RLS Policies

```sql
-- Organizations: See orgs you're a member of
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  USING (is_org_member(id) OR owner_id = auth.uid());

CREATE POLICY "Owners and admins can update organization"
  ON organizations FOR UPDATE
  USING (get_org_role(id) IN ('owner', 'admin'));

-- Projects: Access via org membership OR direct project membership
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view accessible projects"
  ON projects FOR SELECT
  USING (has_project_access(id));

CREATE POLICY "Editors+ can update projects"
  ON projects FOR UPDATE
  USING (get_project_role(id) IN ('owner', 'admin', 'editor'));

CREATE POLICY "Admins+ can delete projects"
  ON projects FOR DELETE
  USING (get_project_role(id) IN ('owner', 'admin'));

-- Topical Maps: Inherit from project access
ALTER TABLE topical_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view maps in accessible projects"
  ON topical_maps FOR SELECT
  USING (has_project_access(project_id));

CREATE POLICY "Editors+ can modify maps"
  ON topical_maps FOR ALL
  USING (get_project_role(project_id) IN ('owner', 'admin', 'editor'));
```

---

## Section 5: Modules & Subscription System

### modules

```sql
CREATE TABLE modules (
  id TEXT PRIMARY KEY,  -- 'core', 'advanced_seo', 'competitor_analysis', etc.
  name TEXT NOT NULL,
  description TEXT,
  base_price_monthly DECIMAL(10,2),

  -- Features this module unlocks
  features JSONB NOT NULL,
  -- Example: ["content_generation", "flow_validation", "schema_generation"]

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data
INSERT INTO modules (id, name, base_price_monthly, features) VALUES
  ('core', 'Core Platform', 0, '["project_management", "topical_maps", "basic_briefs"]'),
  ('content_gen', 'Content Generation', 49, '["content_generation", "10_pass_system", "audit"]'),
  ('advanced_seo', 'Advanced SEO', 29, '["competitor_analysis", "serp_tracking", "gap_analysis"]'),
  ('enterprise', 'Enterprise', 199, '["api_access", "webhooks", "sso", "audit_logs"]');
```

### organization_subscriptions

```sql
CREATE TABLE organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  module_id TEXT REFERENCES modules(id),

  tier TEXT DEFAULT 'standard' CHECK (tier IN ('standard', 'professional', 'enterprise')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing')),

  -- Stripe integration
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,

  -- Billing cycle
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,

  -- Usage limits (NULL = unlimited)
  usage_limits JSONB DEFAULT '{}',
  -- Example: {"monthly_generations": 100, "monthly_tokens": 1000000}

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, module_id)
);
```

### role_module_access

```sql
CREATE TABLE role_module_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,  -- 'admin', 'editor', 'viewer'
  module_id TEXT REFERENCES modules(id),

  is_allowed BOOLEAN DEFAULT true,

  UNIQUE(organization_id, role, module_id)
);

-- Default: All modules allowed for all roles (org configures restrictions)
```

### Feature Check Function

```sql
CREATE OR REPLACE FUNCTION can_use_feature(
  p_user_id UUID,
  p_organization_id UUID,
  p_feature TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
  v_module_id TEXT;
BEGIN
  -- Get user's role in org
  SELECT role INTO v_role
  FROM organization_members
  WHERE organization_id = p_organization_id
    AND user_id = p_user_id
    AND accepted_at IS NOT NULL;

  IF v_role IS NULL THEN RETURN FALSE; END IF;

  -- Find which module provides this feature
  SELECT id INTO v_module_id
  FROM modules
  WHERE features ? p_feature
    AND is_active = true
  LIMIT 1;

  IF v_module_id IS NULL THEN RETURN FALSE; END IF;

  -- Check org has active subscription to this module
  IF NOT EXISTS (
    SELECT 1 FROM organization_subscriptions
    WHERE organization_id = p_organization_id
      AND module_id = v_module_id
      AND status = 'active'
  ) THEN RETURN FALSE; END IF;

  -- Check role is allowed to use this module
  IF EXISTS (
    SELECT 1 FROM role_module_access
    WHERE organization_id = p_organization_id
      AND role = v_role
      AND module_id = v_module_id
      AND is_allowed = false
  ) THEN RETURN FALSE; END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Section 6: API Key Hierarchy & Billing Attribution

### Key Resolution Function

```sql
CREATE OR REPLACE FUNCTION resolve_api_key(
  p_project_id UUID,
  p_map_id UUID,
  p_provider TEXT
)
RETURNS TABLE (
  key_source TEXT,
  encrypted_key TEXT,
  billable_to TEXT,
  billable_id UUID
) AS $$
BEGIN
  -- Priority 1: Map-specific BYOK (if exists and project allows)
  -- Priority 2: Project-specific BYOK
  -- Priority 3: Organization key
  -- Priority 4: Platform key (charged to org)

  RETURN QUERY
  WITH project_info AS (
    SELECT p.id, p.organization_id, p.api_key_mode
    FROM projects p WHERE p.id = p_project_id
  )
  SELECT
    CASE
      WHEN pak.key_source = 'byok' THEN 'project_byok'
      WHEN oak.key_source = 'byok' THEN 'org_byok'
      WHEN oak.key_source = 'platform' THEN 'platform'
      ELSE 'platform'
    END as key_source,
    COALESCE(pak.encrypted_key, oak.encrypted_key) as encrypted_key,
    CASE
      WHEN pak.key_source = 'byok' THEN 'project'
      WHEN oak.key_source = 'byok' THEN 'organization'
      ELSE 'platform'
    END as billable_to,
    CASE
      WHEN pak.key_source = 'byok' THEN p_project_id
      ELSE pi.organization_id
    END as billable_id
  FROM project_info pi
  LEFT JOIN project_api_keys pak
    ON pak.project_id = pi.id AND pak.provider = p_provider AND pak.is_active
  LEFT JOIN organization_api_keys oak
    ON oak.organization_id = pi.organization_id AND oak.provider = p_provider AND oak.is_active
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### ai_usage_logs table modifications

```sql
ALTER TABLE ai_usage_logs
  ADD COLUMN organization_id UUID REFERENCES organizations(id),
  ADD COLUMN key_source TEXT,  -- 'platform', 'org_byok', 'project_byok'
  ADD COLUMN billable_to TEXT,  -- 'platform', 'organization', 'project'
  ADD COLUMN billable_id UUID,  -- ID of entity responsible for cost
  ADD COLUMN cost_usd DECIMAL(10,6);  -- Calculated cost
```

### Billing Attribution Logic

```typescript
// In AI service layer, BEFORE making API call:
async function getApiKeyWithBilling(projectId: string, mapId: string, provider: string) {
  const { data } = await supabase.rpc('resolve_api_key', {
    p_project_id: projectId,
    p_map_id: mapId,
    p_provider: provider
  });

  return {
    key: decrypt(data.encrypted_key),
    billing: {
      source: data.key_source,
      billableTo: data.billable_to,
      billableId: data.billable_id
    }
  };
}

// AFTER API call, log with billing attribution:
await supabase.from('ai_usage_logs').insert({
  ...usageData,
  organization_id: billing.billableId,
  key_source: billing.source,
  billable_to: billing.billableTo,
  billable_id: billing.billableId,
  cost_usd: calculateCost(tokens, provider)
});
```

---

## Section 7: Cost Visibility & Reporting

### cost_reports materialized view

```sql
CREATE MATERIALIZED VIEW cost_reports AS
SELECT
  organization_id,
  project_id,
  map_id,
  DATE_TRUNC('day', created_at) as date,
  DATE_TRUNC('month', created_at) as month,
  provider,
  key_source,
  billable_to,

  -- Aggregated metrics
  COUNT(*) as request_count,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(cost_usd) as total_cost_usd,

  -- Breakdown by operation
  operation_type,
  COUNT(*) FILTER (WHERE success = true) as successful_requests,
  COUNT(*) FILTER (WHERE success = false) as failed_requests

FROM ai_usage_logs
WHERE created_at > NOW() - INTERVAL '90 days'
GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9;

-- Refresh daily via cron
CREATE INDEX idx_cost_reports_org ON cost_reports(organization_id, month);
CREATE INDEX idx_cost_reports_project ON cost_reports(project_id, month);
```

### Cost Visibility RLS

```sql
CREATE OR REPLACE FUNCTION can_view_costs(
  p_organization_id UUID,
  p_project_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
  v_visibility JSONB;
BEGIN
  -- Get user's role and org visibility settings
  SELECT om.role, o.cost_visibility
  INTO v_role, v_visibility
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.organization_id = p_organization_id
    AND om.user_id = auth.uid()
    AND om.accepted_at IS NOT NULL;

  -- Check based on role
  IF v_role IN ('owner', 'admin') THEN
    RETURN (v_visibility->>'admin_sees_all')::boolean;
  ELSIF v_role = 'editor' THEN
    RETURN (v_visibility->>'editor_sees_own')::boolean;
  ELSIF v_role = 'viewer' THEN
    RETURN NOT (v_visibility->>'viewer_sees_none')::boolean;
  END IF;

  -- External collaborators
  IF p_project_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id AND user_id = auth.uid()
  ) THEN
    RETURN (v_visibility->>'external_can_see')::boolean;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### API Endpoint for Cost Data

```typescript
// GET /api/costs?org_id=...&project_id=...&period=month
async function getCostReport(req) {
  const { org_id, project_id, period } = req.query;

  // Check visibility permissions
  const canView = await supabase.rpc('can_view_costs', {
    p_organization_id: org_id,
    p_project_id: project_id
  });

  if (!canView) throw new ForbiddenError();

  // Query materialized view with appropriate filters
  let query = supabase
    .from('cost_reports')
    .select('*')
    .eq('organization_id', org_id);

  if (project_id) query = query.eq('project_id', project_id);
  if (period === 'month') query = query.eq('month', startOfMonth(new Date()));

  return query;
}
```

---

## Section 8: Invitation System

### invitations table

```sql
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What type of invitation
  type TEXT NOT NULL CHECK (type IN ('organization', 'project')),

  -- Target (one will be set based on type)
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Invitee
  email TEXT NOT NULL,
  role TEXT NOT NULL,  -- Role to assign upon acceptance

  -- Security
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),

  -- Metadata
  invited_by UUID REFERENCES auth.users(id) NOT NULL,
  message TEXT,  -- Optional personal message

  -- Lifecycle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,

  -- Constraints
  CHECK (
    (type = 'organization' AND organization_id IS NOT NULL AND project_id IS NULL) OR
    (type = 'project' AND project_id IS NOT NULL)
  )
);

CREATE INDEX idx_invitations_email ON invitations(email) WHERE accepted_at IS NULL;
CREATE INDEX idx_invitations_token ON invitations(token) WHERE accepted_at IS NULL;
```

### Invitation Acceptance Flow

```typescript
// POST /api/invitations/accept
async function acceptInvitation(token: string, userId: string) {
  // 1. Validate token
  const { data: invitation } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!invitation) throw new Error('Invalid or expired invitation');

  // 2. Create membership based on type
  if (invitation.type === 'organization') {
    await supabase.from('organization_members').insert({
      organization_id: invitation.organization_id,
      user_id: userId,
      role: invitation.role,
      invited_by: invitation.invited_by,
      invited_at: invitation.created_at,
      accepted_at: new Date().toISOString()
    });
  } else {
    await supabase.from('project_members').insert({
      project_id: invitation.project_id,
      user_id: userId,
      role: invitation.role,
      source: 'invitation',
      invited_by: invitation.invited_by,
      invited_at: invitation.created_at,
      accepted_at: new Date().toISOString()
    });
  }

  // 3. Mark invitation as accepted
  await supabase
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id);

  return { success: true, type: invitation.type };
}
```

### Email Notification (Edge Function)

```typescript
// supabase/functions/send-invitation/index.ts
Deno.serve(async (req) => {
  const { invitationId } = await req.json();

  const { data: invitation } = await supabase
    .from('invitations')
    .select('*, inviter:invited_by(email, raw_user_meta_data)')
    .eq('id', invitationId)
    .single();

  const acceptUrl = `${APP_URL}/accept-invite?token=${invitation.token}`;

  await sendEmail({
    to: invitation.email,
    subject: `You've been invited to collaborate`,
    html: `
      <p>${invitation.inviter.raw_user_meta_data.name} invited you to join
         ${invitation.type === 'organization' ? 'their organization' : 'a project'}.</p>
      <p>Role: ${invitation.role}</p>
      ${invitation.message ? `<p>Message: ${invitation.message}</p>` : ''}
      <a href="${acceptUrl}">Accept Invitation</a>
      <p>This invitation expires in 7 days.</p>
    `
  });
});
```

---

## Section 9: Migration Plan

### Phase 1: Create Tables (Non-Breaking)

```sql
-- Run as migration: 20260109_multi_tenancy_tables.sql

-- 1. Create all new tables
CREATE TABLE organizations (...);
CREATE TABLE organization_members (...);
CREATE TABLE organization_api_keys (...);
CREATE TABLE project_members (...);
CREATE TABLE project_api_keys (...);
CREATE TABLE modules (...);
CREATE TABLE organization_subscriptions (...);
CREATE TABLE role_module_access (...);
CREATE TABLE invitations (...);

-- 2. Add new columns to existing tables (nullable for now)
ALTER TABLE projects ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE ai_usage_logs ADD COLUMN organization_id UUID;
-- etc.

-- 3. Create helper functions
CREATE FUNCTION is_org_member(...);
CREATE FUNCTION has_project_access(...);
-- etc.
```

### Phase 2: Data Migration

```sql
-- Run as migration: 20260109_migrate_to_orgs.sql

-- 1. Create personal organization for each user
INSERT INTO organizations (name, slug, type, owner_id)
SELECT
  COALESCE(raw_user_meta_data->>'name', email) || '''s Workspace',
  id::text,  -- Use user_id as slug for personal orgs
  'personal',
  id
FROM auth.users;

-- 2. Add users as owners of their personal orgs
INSERT INTO organization_members (organization_id, user_id, role, accepted_at)
SELECT o.id, o.owner_id, 'owner', NOW()
FROM organizations o WHERE o.type = 'personal';

-- 3. Migrate projects to organizations
UPDATE projects p
SET organization_id = o.id
FROM organizations o
WHERE o.owner_id = p.user_id AND o.type = 'personal';

-- 4. Migrate API keys from user_settings to organization_api_keys
INSERT INTO organization_api_keys (organization_id, provider, encrypted_key, key_source)
SELECT
  o.id,
  key,
  value,
  'byok'
FROM user_settings us
CROSS JOIN LATERAL jsonb_each_text(us.api_keys) AS kv(key, value)
JOIN organizations o ON o.owner_id = us.user_id
WHERE us.api_keys IS NOT NULL AND us.api_keys != '{}';

-- 5. Give all existing users 'core' module subscription
INSERT INTO organization_subscriptions (organization_id, module_id, status)
SELECT id, 'core', 'active' FROM organizations;
```

### Phase 3: Enable New RLS Policies

```sql
-- Run as migration: 20260109_enable_new_rls.sql

-- 1. Drop old RLS policies
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can modify own projects" ON projects;

-- 2. Create new policies
CREATE POLICY "Users can view accessible projects" ON projects ...;
CREATE POLICY "Editors+ can update projects" ON projects ...;

-- 3. Enable RLS on new tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
-- etc.
```

### Phase 4: Cleanup (After 30-Day Validation)

```sql
-- Run manually after validation period

-- 1. Remove old user_id columns (after verifying no code references)
ALTER TABLE projects DROP COLUMN user_id;
ALTER TABLE topical_maps DROP COLUMN user_id;

-- 2. Make organization_id NOT NULL
ALTER TABLE projects ALTER COLUMN organization_id SET NOT NULL;

-- 3. Remove old api_keys from user_settings
ALTER TABLE user_settings DROP COLUMN api_keys;
```

---

## Section 10: Frontend Architecture Changes

### New State Structure

```typescript
// state/appState.ts - Updated shape
interface AppState {
  // NEW: Current context
  currentOrganization: Organization | null;
  currentProject: Project | null;
  currentMap: TopicalMap | null;

  // NEW: User's memberships
  organizations: Organization[];
  organizationMemberships: OrganizationMember[];

  // NEW: Permissions (derived from role + overrides)
  permissions: {
    canManageBilling: boolean;
    canInviteMembers: boolean;
    canDeleteProjects: boolean;
    canUseContentGeneration: boolean;
    // ... feature flags
  };

  // Existing (scoped to current context)
  projects: Project[];
  maps: TopicalMap[];
  topics: Topic[];
  // ...
}
```

### New Hooks

```typescript
// hooks/useOrganization.ts
export function useOrganization() {
  const { state, dispatch } = useAppState();

  return {
    current: state.currentOrganization,
    all: state.organizations,
    membership: state.organizationMemberships.find(
      m => m.organization_id === state.currentOrganization?.id
    ),
    switch: (orgId: string) => dispatch({ type: 'SET_ORGANIZATION', payload: orgId }),
    // ...
  };
}

// hooks/usePermissions.ts
export function usePermissions() {
  const { state } = useAppState();

  const can = useCallback((action: string) => {
    return state.permissions[action] ?? false;
  }, [state.permissions]);

  return { can, permissions: state.permissions };
}

// hooks/useFeatureGate.ts
export function useFeatureGate(feature: string) {
  const { can } = usePermissions();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check module subscription + role access
    checkFeatureAccess(feature).then(setLoading(false));
  }, [feature]);

  return {
    enabled: can(`use_${feature}`),
    loading,
    UpgradePrompt: () => <ModuleUpgradeModal feature={feature} />
  };
}
```

### UI Components

```typescript
// components/OrganizationSwitcher.tsx
export function OrganizationSwitcher() {
  const { current, all, switch: switchOrg } = useOrganization();

  return (
    <Dropdown>
      <DropdownTrigger>
        {current?.name} <ChevronDown />
      </DropdownTrigger>
      <DropdownContent>
        {all.map(org => (
          <DropdownItem key={org.id} onClick={() => switchOrg(org.id)}>
            {org.name}
            {org.type === 'personal' && <Badge>Personal</Badge>}
          </DropdownItem>
        ))}
        <DropdownSeparator />
        <DropdownItem onClick={createNewOrg}>
          <Plus /> Create Organization
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}

// components/FeatureGate.tsx
export function FeatureGate({ feature, children, fallback }) {
  const { enabled, loading, UpgradePrompt } = useFeatureGate(feature);

  if (loading) return <Skeleton />;
  if (!enabled) return fallback ?? <UpgradePrompt />;
  return children;
}

// Usage:
<FeatureGate feature="content_generation">
  <ContentGenerationPanel />
</FeatureGate>
```

### API Key Selection UI

```typescript
// components/settings/ApiKeySelector.tsx
export function ApiKeySelector({ projectId, provider }) {
  const [mode, setMode] = useState<'inherit' | 'byok' | 'prompt'>('inherit');
  const { current: org } = useOrganization();

  return (
    <RadioGroup value={mode} onChange={setMode}>
      <Radio value="inherit">
        Use organization key
        {org.apiKeys[provider] && <Badge color="green">Configured</Badge>}
      </Radio>
      <Radio value="byok">
        Use project-specific key
        <Input type="password" placeholder="Enter API key" />
      </Radio>
      <Radio value="prompt">
        Ask me each time (for testing different keys)
      </Radio>
    </RadioGroup>
  );
}
```

### Cost Dashboard

```typescript
// components/billing/CostDashboard.tsx
export function CostDashboard() {
  const { can } = usePermissions();
  const { current: org } = useOrganization();
  const [costs, setCosts] = useState(null);

  if (!can('view_costs')) {
    return <AccessDenied message="You don't have permission to view costs" />;
  }

  return (
    <div>
      <MonthSelector />
      <CostSummaryCards data={costs?.summary} />

      <Tabs>
        <Tab label="By Project">
          <ProjectCostTable data={costs?.byProject} />
        </Tab>
        <Tab label="By Provider">
          <ProviderCostChart data={costs?.byProvider} />
        </Tab>
        <Tab label="Usage Log">
          <UsageLogTable data={costs?.logs} />
        </Tab>
      </Tabs>

      {can('export_costs') && (
        <Button onClick={exportToCsv}>Export for Invoicing</Button>
      )}
    </div>
  );
}
```

---

## Section 11: WordPress Integration Adaptation

**Status:** Added 2026-01-09 (Gap Analysis Resolution)

The WordPress Integration system (designed in `2025-01-08-wordpress-integration-plan.md`) requires updates for multi-tenancy.

### wordpress_connections Table Update

```sql
-- Original design (single-user):
-- CREATE TABLE wordpress_connections (
--     user_id UUID NOT NULL REFERENCES auth.users(id),
--     ...
-- );

-- Multi-tenant design:
CREATE TABLE wordpress_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,  -- Optional project scope

  site_url TEXT NOT NULL,
  site_name TEXT,

  -- Authentication (encrypted via Vault)
  auth_type TEXT DEFAULT 'application_password' CHECK (auth_type IN ('application_password', 'jwt', 'oauth')),
  encrypted_credentials TEXT NOT NULL,  -- Vault secret ID

  -- Connection status
  is_active BOOLEAN DEFAULT true,
  last_connected_at TIMESTAMPTZ,
  last_error TEXT,

  -- Audit
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, site_url)
);

-- RLS: Access via organization membership
ALTER TABLE wordpress_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_can_view_wp_connections"
  ON wordpress_connections FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "admins_can_manage_wp_connections"
  ON wordpress_connections FOR ALL
  USING (get_org_role(organization_id) IN ('owner', 'admin'));
```

### Publication Status Visibility

```sql
-- wordpress_publications inherits access from content_briefs
ALTER TABLE wordpress_publications
  ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Backfill from content_briefs → topics → topical_maps → projects
UPDATE wordpress_publications wp
SET organization_id = p.organization_id
FROM content_briefs cb
JOIN topics t ON t.id = cb.topic_id
JOIN topical_maps tm ON tm.id = t.map_id
JOIN projects p ON p.id = tm.project_id
WHERE wp.content_brief_id = cb.id;
```

### Webhook Authentication

```typescript
// Edge function: wordpress-webhook/index.ts
Deno.serve(async (req) => {
  const signature = req.headers.get('x-wp-webhook-signature');
  const { site_url, event, payload } = await req.json();

  // Find connection by site_url
  const { data: connection } = await supabase
    .from('wordpress_connections')
    .select('id, organization_id, encrypted_credentials')
    .eq('site_url', site_url)
    .single();

  if (!connection) return new Response('Unknown site', { status: 404 });

  // Verify signature using stored webhook secret
  const secret = await decryptFromVault(connection.encrypted_credentials);
  if (!verifyHmac(signature, payload, secret.webhook_secret)) {
    return new Response('Invalid signature', { status: 401 });
  }

  // Process event with org context
  await processWebhookEvent(connection.organization_id, event, payload);
});
```

---

## Section 12: Quality Enforcement System Adaptation

**Status:** Added 2026-01-09 (Gap Analysis Resolution)

The Quality Enforcement System tables require organization context for proper multi-tenant isolation.

### Table Updates

```sql
-- quality_analytics_daily needs org context
ALTER TABLE quality_analytics_daily
  ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Backfill from existing data
UPDATE quality_analytics_daily qad
SET organization_id = p.organization_id
FROM content_briefs cb
JOIN topics t ON t.id = cb.topic_id
JOIN topical_maps tm ON tm.id = t.map_id
JOIN projects p ON p.id = tm.project_id
WHERE qad.content_brief_id = cb.id;

-- RLS policy
CREATE POLICY "analytics_via_org" ON quality_analytics_daily
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  );
```

### Organization-Specific Quality Thresholds (Future)

```sql
-- For future: allow orgs to customize quality thresholds
CREATE TABLE organization_quality_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Override default thresholds
  min_word_count INT,
  max_word_count INT,
  min_heading_ratio DECIMAL(3,2),
  min_paragraph_length INT,
  max_consecutive_short_paragraphs INT,

  -- Custom rules (JSONB for flexibility)
  custom_rules JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id)
);
```

### Portfolio Analytics Aggregation

```sql
-- Organization-level quality metrics view
CREATE VIEW organization_quality_metrics AS
SELECT
  o.id as organization_id,
  o.name as organization_name,
  COUNT(DISTINCT cb.id) as total_briefs,
  COUNT(DISTINCT cgj.id) as total_generations,
  AVG(cgj.audit_score) as avg_audit_score,
  AVG(qad.overall_score) as avg_quality_score,
  COUNT(*) FILTER (WHERE cgj.audit_score >= 80) as high_quality_count
FROM organizations o
JOIN projects p ON p.organization_id = o.id
JOIN topical_maps tm ON tm.project_id = p.id
JOIN topics t ON t.map_id = tm.id
JOIN content_briefs cb ON cb.topic_id = t.id
LEFT JOIN content_generation_jobs cgj ON cgj.content_brief_id = cb.id
LEFT JOIN quality_analytics_daily qad ON qad.content_brief_id = cb.id
GROUP BY o.id, o.name;
```

---

## Section 13: AI Pricing & Cost Calculation

**Status:** Added 2026-01-09 (Gap Analysis Resolution)

Accurate cost tracking requires a pricing rates table and calculation functions.

### ai_pricing_rates Table

```sql
CREATE TABLE ai_pricing_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,  -- 'anthropic', 'openai', 'google', 'perplexity'
  model TEXT NOT NULL,     -- 'claude-3-opus', 'gpt-4-turbo', etc.

  -- Pricing per 1K tokens (in USD)
  input_rate_per_1k DECIMAL(10,8) NOT NULL,
  output_rate_per_1k DECIMAL(10,8) NOT NULL,

  -- Validity period (prices change over time)
  effective_from DATE NOT NULL,
  effective_to DATE,  -- NULL = currently active

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(provider, model, effective_from)
);

-- Seed current pricing (as of 2026-01)
INSERT INTO ai_pricing_rates (provider, model, input_rate_per_1k, output_rate_per_1k, effective_from) VALUES
  -- Anthropic
  ('anthropic', 'claude-3-opus-20240229', 0.015, 0.075, '2024-02-29'),
  ('anthropic', 'claude-3-sonnet-20240229', 0.003, 0.015, '2024-02-29'),
  ('anthropic', 'claude-3-haiku-20240307', 0.00025, 0.00125, '2024-03-07'),
  ('anthropic', 'claude-3-5-sonnet-20241022', 0.003, 0.015, '2024-10-22'),

  -- OpenAI
  ('openai', 'gpt-4-turbo', 0.01, 0.03, '2024-04-01'),
  ('openai', 'gpt-4o', 0.005, 0.015, '2024-05-13'),
  ('openai', 'gpt-4o-mini', 0.00015, 0.0006, '2024-07-18'),

  -- Google
  ('google', 'gemini-1.5-pro', 0.00125, 0.005, '2024-05-01'),
  ('google', 'gemini-1.5-flash', 0.000075, 0.0003, '2024-05-01'),

  -- Perplexity
  ('perplexity', 'llama-3.1-sonar-large-128k-online', 0.001, 0.001, '2024-07-01');

-- Index for fast lookups
CREATE INDEX idx_pricing_lookup ON ai_pricing_rates(provider, model, effective_from DESC);
```

### Cost Calculation Function

```sql
CREATE OR REPLACE FUNCTION calculate_ai_cost(
  p_provider TEXT,
  p_model TEXT,
  p_input_tokens INT,
  p_output_tokens INT,
  p_timestamp TIMESTAMPTZ DEFAULT NOW()
) RETURNS DECIMAL(10,6) AS $$
DECLARE
  v_input_rate DECIMAL(10,8);
  v_output_rate DECIMAL(10,8);
BEGIN
  -- Get rate effective at the time of the request
  SELECT input_rate_per_1k, output_rate_per_1k
  INTO v_input_rate, v_output_rate
  FROM ai_pricing_rates
  WHERE provider = p_provider
    AND model = p_model
    AND effective_from <= p_timestamp::DATE
    AND (effective_to IS NULL OR effective_to >= p_timestamp::DATE)
  ORDER BY effective_from DESC
  LIMIT 1;

  -- If no rate found, return NULL (requires manual review)
  IF v_input_rate IS NULL THEN
    RAISE WARNING 'No pricing rate found for % / %', p_provider, p_model;
    RETURN NULL;
  END IF;

  -- Calculate cost
  RETURN (p_input_tokens / 1000.0 * v_input_rate) +
         (p_output_tokens / 1000.0 * v_output_rate);
END;
$$ LANGUAGE plpgsql STABLE;
```

### Usage Logging with Cost

```sql
-- Trigger to auto-calculate cost on insert
CREATE OR REPLACE FUNCTION calculate_usage_cost()
RETURNS TRIGGER AS $$
BEGIN
  NEW.cost_usd := calculate_ai_cost(
    NEW.provider,
    NEW.model,
    NEW.input_tokens,
    NEW.output_tokens,
    NEW.created_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_calculate_usage_cost
  BEFORE INSERT ON ai_usage_logs
  FOR EACH ROW
  EXECUTE FUNCTION calculate_usage_cost();
```

---

## Section 14: Supabase Vault Implementation

**Status:** Added 2026-01-09 (Gap Analysis Resolution)

All API keys and sensitive credentials must be encrypted using Supabase Vault.

### Enable Vault Extension

```sql
-- Enable in Supabase dashboard or via migration
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- Grant access to service role only
GRANT USAGE ON SCHEMA vault TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA vault TO service_role;
```

### Encryption Functions

```sql
-- Store a secret and return its ID
CREATE OR REPLACE FUNCTION store_secret(
  p_secret TEXT,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_secret_id UUID;
BEGIN
  INSERT INTO vault.secrets (secret, name, description)
  VALUES (p_secret, p_name, p_description)
  RETURNING id INTO v_secret_id;

  RETURN v_secret_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Retrieve a decrypted secret (only callable from edge functions)
CREATE OR REPLACE FUNCTION get_secret(p_secret_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_secret TEXT;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE id = p_secret_id;

  RETURN v_secret;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete a secret
CREATE OR REPLACE FUNCTION delete_secret(p_secret_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM vault.secrets WHERE id = p_secret_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rotate a secret (store new, return new ID, caller deletes old)
CREATE OR REPLACE FUNCTION rotate_secret(
  p_old_secret_id UUID,
  p_new_secret TEXT
) RETURNS UUID AS $$
DECLARE
  v_new_id UUID;
  v_name TEXT;
  v_description TEXT;
BEGIN
  -- Get metadata from old secret
  SELECT name, description INTO v_name, v_description
  FROM vault.secrets WHERE id = p_old_secret_id;

  -- Create new secret
  v_new_id := store_secret(p_new_secret, v_name, v_description);

  -- Delete old secret
  PERFORM delete_secret(p_old_secret_id);

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Edge Function Pattern for API Keys

```typescript
// supabase/functions/_shared/vault.ts
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

export async function getApiKey(
  organizationId: string,
  provider: string
): Promise<{ key: string; source: string } | null> {
  // 1. Get the encrypted key reference
  const { data: keyRecord } = await supabaseAdmin
    .from('organization_api_keys')
    .select('encrypted_key, key_source')
    .eq('organization_id', organizationId)
    .eq('provider', provider)
    .eq('is_active', true)
    .single();

  if (!keyRecord) return null;

  // 2. Decrypt using vault function
  const { data: decrypted } = await supabaseAdmin
    .rpc('get_secret', { p_secret_id: keyRecord.encrypted_key });

  return {
    key: decrypted,
    source: keyRecord.key_source
  };
}

export async function storeApiKey(
  organizationId: string,
  provider: string,
  apiKey: string,
  source: 'platform' | 'byok'
): Promise<void> {
  // 1. Store in vault
  const { data: secretId } = await supabaseAdmin
    .rpc('store_secret', {
      p_secret: apiKey,
      p_name: `${organizationId}:${provider}`,
      p_description: `API key for ${provider}`
    });

  // 2. Store reference in organization_api_keys
  await supabaseAdmin
    .from('organization_api_keys')
    .upsert({
      organization_id: organizationId,
      provider,
      encrypted_key: secretId,
      key_source: source,
      is_active: true
    }, { onConflict: 'organization_id,provider' });
}
```

### API Proxy with Vault Integration

```typescript
// supabase/functions/anthropic-proxy/index.ts
import { getApiKey } from '../_shared/vault.ts';
import { logUsage } from '../_shared/usage.ts';

Deno.serve(async (req) => {
  const { organizationId, projectId, mapId, messages, model } = await req.json();

  // 1. Verify user access to organization
  const user = await getUser(req);
  if (!await hasOrgAccess(user.id, organizationId)) {
    return new Response('Forbidden', { status: 403 });
  }

  // 2. Resolve API key with hierarchy
  const keyInfo = await resolveApiKey(projectId, mapId, 'anthropic');
  if (!keyInfo) {
    return new Response('No API key configured', { status: 400 });
  }

  // 3. Make API call
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': keyInfo.key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({ model, messages })
  });

  const result = await response.json();

  // 4. Log usage with billing attribution
  await logUsage({
    organization_id: organizationId,
    project_id: projectId,
    map_id: mapId,
    provider: 'anthropic',
    model,
    input_tokens: result.usage.input_tokens,
    output_tokens: result.usage.output_tokens,
    key_source: keyInfo.source,
    billable_to: keyInfo.billableTo,
    billable_id: keyInfo.billableId
  });

  return new Response(JSON.stringify(result));
});
```

---

## Section 15: Security Enhancements

**Status:** Added 2026-01-09 (Gap Analysis Resolution)

### 15.1 Invitation Rate Limiting

```sql
-- Rate limit function
CREATE OR REPLACE FUNCTION check_invitation_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_recent_count INT;
  v_org_limit INT := 20;  -- 20 invitations per hour per org
  v_user_limit INT := 50; -- 50 invitations per hour per user
BEGIN
  -- Check org-level rate limit
  SELECT COUNT(*) INTO v_recent_count
  FROM invitations
  WHERE organization_id = NEW.organization_id
    AND created_at > NOW() - INTERVAL '1 hour';

  IF v_recent_count >= v_org_limit THEN
    RAISE EXCEPTION 'Organization invitation rate limit exceeded (% per hour)', v_org_limit;
  END IF;

  -- Check user-level rate limit
  SELECT COUNT(*) INTO v_recent_count
  FROM invitations
  WHERE invited_by = NEW.invited_by
    AND created_at > NOW() - INTERVAL '1 hour';

  IF v_recent_count >= v_user_limit THEN
    RAISE EXCEPTION 'User invitation rate limit exceeded (% per hour)', v_user_limit;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_invitation_rate_limit
  BEFORE INSERT ON invitations
  FOR EACH ROW
  EXECUTE FUNCTION check_invitation_rate_limit();
```

### 15.2 Organization Audit Log

```sql
CREATE TABLE organization_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id),

  -- What happened
  action TEXT NOT NULL,
  -- Actions: 'member.invited', 'member.removed', 'member.role_changed',
  --          'api_key.created', 'api_key.rotated', 'api_key.deleted',
  --          'settings.updated', 'project.created', 'project.deleted',
  --          'subscription.changed', 'billing.updated'

  -- What was affected
  target_type TEXT,  -- 'member', 'project', 'api_key', 'settings', 'subscription'
  target_id UUID,
  target_email TEXT, -- For member actions (email may not have user_id yet)

  -- Change details
  old_value JSONB,
  new_value JSONB,

  -- Context
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_audit_org_time ON organization_audit_log(organization_id, created_at DESC);
CREATE INDEX idx_audit_actor ON organization_audit_log(actor_id, created_at DESC);
CREATE INDEX idx_audit_action ON organization_audit_log(action, created_at DESC);

-- RLS: Only admins can view audit log
ALTER TABLE organization_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_view_audit_log" ON organization_audit_log
  FOR SELECT
  USING (get_org_role(organization_id) IN ('owner', 'admin'));
```

### Audit Logging Helper Function

```sql
CREATE OR REPLACE FUNCTION log_audit_event(
  p_org_id UUID,
  p_action TEXT,
  p_target_type TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_target_email TEXT DEFAULT NULL,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO organization_audit_log (
    organization_id, actor_id, action,
    target_type, target_id, target_email,
    old_value, new_value
  ) VALUES (
    p_org_id, auth.uid(), p_action,
    p_target_type, p_target_id, p_target_email,
    p_old_value, p_new_value
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 15.3 Session Management with Organization Context

```sql
-- Function to get current org from JWT metadata
CREATE OR REPLACE FUNCTION current_org_id()
RETURNS UUID AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'current_organization_id')::UUID;
$$ LANGUAGE sql STABLE;

-- Function to get current org role from JWT
CREATE OR REPLACE FUNCTION current_org_role()
RETURNS TEXT AS $$
  SELECT auth.jwt() -> 'user_metadata' ->> 'current_organization_role';
$$ LANGUAGE sql STABLE;
```

```typescript
// Frontend: Update session when switching orgs
async function switchOrganization(orgId: string) {
  // Get user's role in the org
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', orgId)
    .eq('user_id', user.id)
    .single();

  // Update user metadata (persists in JWT on next refresh)
  await supabase.auth.updateUser({
    data: {
      current_organization_id: orgId,
      current_organization_role: membership.role
    }
  });

  // Refresh session to get new JWT
  await supabase.auth.refreshSession();
}
```

---

## Section 16: Rollback Procedures

**Status:** Added 2026-01-09 (Gap Analysis Resolution)

Each migration phase has documented rollback procedures.

### Phase 1 Rollback: Foundation Tables

```sql
-- ROLLBACK: 20260110_phase1_foundation.sql
-- Run this if Phase 1 needs to be reverted

-- 1. Drop new RLS policies first
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Owners and admins can update organization" ON organizations;
DROP POLICY IF EXISTS "Users can view accessible projects" ON projects;
-- ... (all new policies)

-- 2. Remove columns from existing tables
ALTER TABLE projects DROP COLUMN IF EXISTS organization_id;
ALTER TABLE projects DROP COLUMN IF EXISTS api_key_mode;

-- 3. Drop helper functions
DROP FUNCTION IF EXISTS is_org_member(UUID);
DROP FUNCTION IF EXISTS get_org_role(UUID);
DROP FUNCTION IF EXISTS has_project_access(UUID);
DROP FUNCTION IF EXISTS get_project_role(UUID);

-- 4. Drop new tables (in dependency order)
DROP TABLE IF EXISTS organization_audit_log;
DROP TABLE IF EXISTS invitations;
DROP TABLE IF EXISTS role_module_access;
DROP TABLE IF EXISTS organization_subscriptions;
DROP TABLE IF EXISTS modules;
DROP TABLE IF EXISTS project_api_keys;
DROP TABLE IF EXISTS project_members;
DROP TABLE IF EXISTS organization_api_keys;
DROP TABLE IF EXISTS organization_members;
DROP TABLE IF EXISTS organizations;

-- 5. Re-enable old RLS policies
-- (restore from backup or re-run original migrations)
```

### Phase 2 Rollback: Data Migration

```sql
-- ROLLBACK: 20260110_phase2_data_migration.sql
-- WARNING: This will lose organization associations

-- 1. Restore user_id on projects (if column was kept)
UPDATE projects p
SET user_id = o.owner_id
FROM organizations o
WHERE p.organization_id = o.id;

-- 2. Restore API keys to user_settings
-- (This is lossy - org keys go back to individual users)
UPDATE user_settings us
SET api_keys = (
  SELECT jsonb_object_agg(oak.provider, vault.get_secret(oak.encrypted_key))
  FROM organization_api_keys oak
  JOIN organizations o ON o.id = oak.organization_id
  WHERE o.owner_id = us.user_id AND o.type = 'personal'
)
WHERE EXISTS (
  SELECT 1 FROM organizations o
  WHERE o.owner_id = us.user_id AND o.type = 'personal'
);

-- 3. Clear organization_id from projects
UPDATE projects SET organization_id = NULL;
```

### Phase 3 Rollback: Billing Integration

```sql
-- ROLLBACK: 20260110_phase3_billing.sql

-- 1. Remove cost tracking columns from ai_usage_logs
ALTER TABLE ai_usage_logs DROP COLUMN IF EXISTS cost_usd;
ALTER TABLE ai_usage_logs DROP COLUMN IF EXISTS billable_to;
ALTER TABLE ai_usage_logs DROP COLUMN IF EXISTS billable_id;
ALTER TABLE ai_usage_logs DROP COLUMN IF EXISTS key_source;

-- 2. Drop pricing table
DROP TABLE IF EXISTS ai_pricing_rates;

-- 3. Drop cost reports view
DROP MATERIALIZED VIEW IF EXISTS cost_reports;

-- 4. Remove vault secrets (careful - this deletes encrypted data)
-- Only run if you have backups!
DELETE FROM vault.secrets WHERE name LIKE '%:%';  -- org:provider format
```

### Emergency Rollback Script

```bash
#!/bin/bash
# emergency_rollback.sh
# Run from Supabase CLI or dashboard SQL editor

PHASE=$1

if [ "$PHASE" == "all" ]; then
  echo "Rolling back all phases..."
  supabase db reset  # WARNING: Full reset
elif [ "$PHASE" == "1" ]; then
  echo "Rolling back Phase 1..."
  psql $DATABASE_URL -f ./rollback/phase1_rollback.sql
elif [ "$PHASE" == "2" ]; then
  echo "Rolling back Phase 2..."
  psql $DATABASE_URL -f ./rollback/phase2_rollback.sql
elif [ "$PHASE" == "3" ]; then
  echo "Rolling back Phase 3..."
  psql $DATABASE_URL -f ./rollback/phase3_rollback.sql
else
  echo "Usage: ./emergency_rollback.sh [1|2|3|all]"
fi
```

---

## Section 17: Data Verification Queries

**Status:** Added 2026-01-09 (Gap Analysis Resolution)

Run these queries after each migration phase to verify data integrity.

### Phase 1 Verification

```sql
-- V1.1: All users have a personal organization
SELECT 'FAIL: Users without personal org' as check, u.id, u.email
FROM auth.users u
LEFT JOIN organizations o ON o.owner_id = u.id AND o.type = 'personal'
WHERE o.id IS NULL;
-- Expected: 0 rows

-- V1.2: All personal org owners are members
SELECT 'FAIL: Org owner not a member' as check, o.id, o.name
FROM organizations o
LEFT JOIN organization_members om ON om.organization_id = o.id AND om.user_id = o.owner_id
WHERE om.id IS NULL;
-- Expected: 0 rows

-- V1.3: All projects have organization_id
SELECT 'FAIL: Project without org' as check, COUNT(*)
FROM projects WHERE organization_id IS NULL;
-- Expected: count = 0

-- V1.4: RLS functions exist
SELECT 'FAIL: Missing function' as check, p.proname
FROM (VALUES ('is_org_member'), ('get_org_role'), ('has_project_access'), ('get_project_role')) AS expected(proname)
LEFT JOIN pg_proc p ON p.proname = expected.proname
WHERE p.proname IS NULL;
-- Expected: 0 rows
```

### Phase 2 Verification

```sql
-- V2.1: API keys migrated to organizations
SELECT 'FAIL: API key not migrated' as check, us.user_id,
       jsonb_object_keys(us.api_keys) as provider
FROM user_settings us
CROSS JOIN LATERAL jsonb_object_keys(us.api_keys)
LEFT JOIN organizations o ON o.owner_id = us.user_id AND o.type = 'personal'
LEFT JOIN organization_api_keys oak ON oak.organization_id = o.id
  AND oak.provider = jsonb_object_keys
WHERE us.api_keys IS NOT NULL
  AND us.api_keys != '{}'
  AND oak.id IS NULL;
-- Expected: 0 rows

-- V2.2: Vault secrets exist for all org API keys
SELECT 'FAIL: Missing vault secret' as check, oak.id, oak.organization_id, oak.provider
FROM organization_api_keys oak
LEFT JOIN vault.secrets vs ON vs.id = oak.encrypted_key::uuid
WHERE vs.id IS NULL;
-- Expected: 0 rows

-- V2.3: No orphaned project members
SELECT 'FAIL: Orphaned project member' as check, pm.id
FROM project_members pm
LEFT JOIN projects p ON p.id = pm.project_id
WHERE p.id IS NULL;
-- Expected: 0 rows
```

### Phase 3 Verification

```sql
-- V3.1: All recent AI usage has cost calculated
SELECT 'FAIL: Usage without cost' as check, COUNT(*)
FROM ai_usage_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND cost_usd IS NULL;
-- Expected: 0 (or very low for unknown models)

-- V3.2: All AI usage has organization attribution
SELECT 'FAIL: Usage without org' as check, COUNT(*)
FROM ai_usage_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND organization_id IS NULL;
-- Expected: 0

-- V3.3: Cost reports materialized view is populated
SELECT 'FAIL: Empty cost reports' as check, COUNT(*)
FROM cost_reports;
-- Expected: > 0 if there's been AI usage

-- V3.4: All active subscriptions have valid modules
SELECT 'FAIL: Invalid subscription' as check, os.id
FROM organization_subscriptions os
LEFT JOIN modules m ON m.id = os.module_id
WHERE os.status = 'active' AND m.id IS NULL;
-- Expected: 0 rows
```

### Automated Verification Runner

```typescript
// scripts/verify-migration.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const verificationQueries = {
  'V1.1': `SELECT COUNT(*) FROM auth.users u LEFT JOIN organizations o ON o.owner_id = u.id AND o.type = 'personal' WHERE o.id IS NULL`,
  'V1.2': `SELECT COUNT(*) FROM organizations o LEFT JOIN organization_members om ON om.organization_id = o.id AND om.user_id = o.owner_id WHERE om.id IS NULL`,
  // ... all queries
};

async function runVerification(phase: number) {
  const results: { check: string; passed: boolean; count: number }[] = [];

  for (const [check, query] of Object.entries(verificationQueries)) {
    if (!check.startsWith(`V${phase}`)) continue;

    const { data, error } = await supabase.rpc('exec_sql', { sql: query });
    const count = data?.[0]?.count ?? 0;

    results.push({
      check,
      passed: count === 0,
      count
    });
  }

  const failed = results.filter(r => !r.passed);
  if (failed.length > 0) {
    console.error('❌ Verification failed:', failed);
    process.exit(1);
  }

  console.log(`✅ Phase ${phase} verification passed`);
}
```

---

## Section 18: Neo4j Multi-Tenancy Strategy

**Status:** Added 2026-01-09 (Decision Made)

**Decision:** Single Neo4j instance with organization prefixes on node labels.

### Implementation Approach

```cypher
// Node labels include org_id prefix for isolation
// Example: org_abc123_Topic, org_abc123_Entity

// Creating a topic node
CREATE (t:org_${orgId}_Topic {
  id: $topicId,
  name: $name,
  organization_id: $orgId
})

// Query patterns MUST include org prefix
MATCH (t:org_${orgId}_Topic {id: $topicId})
RETURN t

// Relationships are org-scoped by default (both nodes have same org)
MATCH (t:org_${orgId}_Topic)-[r:RELATES_TO]->(e:org_${orgId}_Entity)
RETURN t, r, e
```

### Neo4j Service Wrapper

```typescript
// services/neo4jService.ts
export class Neo4jOrgService {
  constructor(
    private driver: Driver,
    private organizationId: string
  ) {}

  private labelFor(type: string): string {
    return `org_${this.organizationId}_${type}`;
  }

  async createTopic(topic: Topic): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(`
        CREATE (t:${this.labelFor('Topic')} {
          id: $id,
          name: $name,
          organization_id: $orgId
        })
      `, {
        id: topic.id,
        name: topic.name,
        orgId: this.organizationId
      });
    } finally {
      await session.close();
    }
  }

  async findRelatedTopics(topicId: string): Promise<Topic[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (t:${this.labelFor('Topic')} {id: $topicId})
              -[:RELATES_TO*1..2]-
              (related:${this.labelFor('Topic')})
        RETURN DISTINCT related
      `, { topicId });

      return result.records.map(r => r.get('related').properties);
    } finally {
      await session.close();
    }
  }
}
```

### Cross-Organization Prevention

```typescript
// Middleware to ensure org isolation
function createNeo4jMiddleware(orgId: string) {
  return {
    beforeQuery(query: string) {
      // Validate no cross-org label access
      const labelPattern = /:(org_[a-z0-9]+_\w+)/gi;
      const labels = query.match(labelPattern) || [];

      for (const label of labels) {
        const labelOrgId = label.match(/org_([a-z0-9]+)_/i)?.[1];
        if (labelOrgId && labelOrgId !== orgId) {
          throw new Error(`Cross-organization access denied: ${label}`);
        }
      }
    }
  };
}
```

### Migration for Existing Data

```typescript
// Migrate existing user-scoped Neo4j data to org-scoped
async function migrateNeo4jToOrgs() {
  // 1. Get all users with their personal org IDs
  const { data: users } = await supabase
    .from('organizations')
    .select('owner_id, id')
    .eq('type', 'personal');

  const userToOrg = new Map(users.map(u => [u.owner_id, u.id]));

  // 2. For each user's existing Neo4j data, relabel
  for (const [userId, orgId] of userToOrg) {
    await neo4j.session().run(`
      MATCH (n)
      WHERE n.user_id = $userId
      SET n.organization_id = $orgId
      WITH n, labels(n) as oldLabels
      CALL apoc.create.addLabels(n, ['org_' + $orgId + '_' + oldLabels[0]]) YIELD node
      RETURN count(node)
    `, { userId, orgId });
  }
}
```

---

## Section 19: Gamification Organization Scope

**Status:** Added 2026-01-09 (Decision Made)

**Decision:** Individual scores + Organization leaderboards.

### Database Schema Additions

```sql
-- Organization-level scores (aggregated from members)
CREATE TABLE organization_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Aggregated metrics
  total_score INT DEFAULT 0,
  total_articles_generated INT DEFAULT 0,
  total_high_quality_articles INT DEFAULT 0,  -- audit_score >= 80
  avg_audit_score DECIMAL(5,2),

  -- Leaderboard position (updated by cron)
  global_rank INT,

  -- Time-boxed scores
  score_this_week INT DEFAULT 0,
  score_this_month INT DEFAULT 0,

  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id)
);

-- Organization achievements
CREATE TABLE organization_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,  -- 'first_100_articles', 'quality_streak_10', etc.
  earned_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, achievement_id)
);

-- Weekly/Monthly leaderboard snapshots
CREATE TABLE organization_leaderboard_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  period_type TEXT NOT NULL CHECK (period_type IN ('week', 'month')),
  period_start DATE NOT NULL,
  rank INT NOT NULL,
  score INT NOT NULL,

  UNIQUE(organization_id, period_type, period_start)
);
```

### Score Aggregation Function

```sql
CREATE OR REPLACE FUNCTION update_organization_scores()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate org score when individual score changes
  UPDATE organization_scores os
  SET
    total_score = (
      SELECT COALESCE(SUM(gs.total_score), 0)
      FROM gamification_scores gs
      JOIN organization_members om ON om.user_id = gs.user_id
      WHERE om.organization_id = os.organization_id
        AND om.accepted_at IS NOT NULL
    ),
    total_articles_generated = (
      SELECT COUNT(*)
      FROM content_generation_jobs cgj
      JOIN content_briefs cb ON cb.id = cgj.content_brief_id
      JOIN topics t ON t.id = cb.topic_id
      JOIN topical_maps tm ON tm.id = t.map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE p.organization_id = os.organization_id
        AND cgj.status = 'completed'
    ),
    avg_audit_score = (
      SELECT AVG(cgj.audit_score)
      FROM content_generation_jobs cgj
      JOIN content_briefs cb ON cb.id = cgj.content_brief_id
      JOIN topics t ON t.id = cb.topic_id
      JOIN topical_maps tm ON tm.id = t.map_id
      JOIN projects p ON p.id = tm.project_id
      WHERE p.organization_id = os.organization_id
        AND cgj.audit_score IS NOT NULL
    ),
    updated_at = NOW()
  WHERE os.organization_id = (
    SELECT om.organization_id
    FROM organization_members om
    WHERE om.user_id = NEW.user_id
    LIMIT 1
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_org_scores
  AFTER INSERT OR UPDATE ON gamification_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_scores();
```

### Frontend Components

```typescript
// components/gamification/OrganizationLeaderboard.tsx
export function OrganizationLeaderboard() {
  const { current: org } = useOrganization();
  const [leaderboard, setLeaderboard] = useState<OrgScore[]>([]);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'all'>('month');

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3>Organization Leaderboard</h3>
        <ToggleGroup value={timeframe} onChange={setTimeframe}>
          <ToggleItem value="week">This Week</ToggleItem>
          <ToggleItem value="month">This Month</ToggleItem>
          <ToggleItem value="all">All Time</ToggleItem>
        </ToggleGroup>
      </div>

      <div className="space-y-2">
        {leaderboard.map((entry, idx) => (
          <LeaderboardRow
            key={entry.organization_id}
            rank={idx + 1}
            name={entry.organization_name}
            score={entry.total_score}
            isCurrentOrg={entry.organization_id === org?.id}
          />
        ))}
      </div>

      {org && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h4>Your Organization</h4>
          <div className="grid grid-cols-3 gap-4 mt-2">
            <Stat label="Rank" value={`#${org.leaderboardRank}`} />
            <Stat label="Team Score" value={org.totalScore} />
            <Stat label="Avg Quality" value={`${org.avgAuditScore}%`} />
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Section 20: External Collaborator Billing

**Status:** Added 2026-01-09 (Decision Made)

**Decision:** Usage-based billing - Guests are free but their AI usage is billed to the inviting organization.

### Implementation

```sql
-- Track that a user is an external collaborator on a project
-- (already exists in project_members with source = 'invitation')

-- AI usage logs already have organization_id, which is the billing target
-- External collaborators generate usage attributed to the project's org

-- Add column to track if usage was by external collaborator
ALTER TABLE ai_usage_logs
  ADD COLUMN is_external_usage BOOLEAN DEFAULT FALSE;
```

### Usage Attribution Logic

```typescript
// services/aiUsageService.ts
export async function logAiUsage(params: {
  userId: string;
  projectId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}) {
  // 1. Get project's organization
  const { data: project } = await supabase
    .from('projects')
    .select('organization_id')
    .eq('id', params.projectId)
    .single();

  // 2. Check if user is external collaborator
  const { data: membership } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', project.organization_id)
    .eq('user_id', params.userId)
    .single();

  const isExternal = !membership;  // Not an org member = external

  // 3. Log usage - always billed to project's org
  await supabase.from('ai_usage_logs').insert({
    user_id: params.userId,
    project_id: params.projectId,
    organization_id: project.organization_id,  // Billing target
    provider: params.provider,
    model: params.model,
    input_tokens: params.inputTokens,
    output_tokens: params.outputTokens,
    is_external_usage: isExternal,
    billable_to: 'organization',
    billable_id: project.organization_id
  });
}
```

### Cost Dashboard External Usage View

```typescript
// In CostDashboard component, add external usage breakdown
const externalUsageSummary = useMemo(() => {
  const external = costs.filter(c => c.is_external_usage);
  return {
    totalCost: external.reduce((sum, c) => sum + c.cost_usd, 0),
    byUser: groupBy(external, 'user_id'),
    byProject: groupBy(external, 'project_id')
  };
}, [costs]);

// UI
<Tab label="External Usage">
  <Alert type="info">
    These costs were incurred by external collaborators (guests)
    invited to your projects. They are billed to your organization.
  </Alert>

  <Table>
    <TableHeader>
      <Column>Collaborator</Column>
      <Column>Project</Column>
      <Column>Requests</Column>
      <Column>Cost</Column>
    </TableHeader>
    {externalUsageSummary.byUser.map(user => (
      <TableRow>
        <Cell>{user.email}</Cell>
        <Cell>{user.projectName}</Cell>
        <Cell>{user.requestCount}</Cell>
        <Cell>${user.totalCost.toFixed(2)}</Cell>
      </TableRow>
    ))}
  </Table>

  <div className="mt-4 text-sm text-gray-600">
    Tip: You can set usage limits per external collaborator in
    Project Settings → Member Permissions
  </div>
</Tab>
```

### Usage Limits for External Collaborators (Optional)

```sql
-- Add usage limit to project_members
ALTER TABLE project_members
  ADD COLUMN monthly_usage_limit_usd DECIMAL(10,2),  -- NULL = unlimited
  ADD COLUMN usage_this_month_usd DECIMAL(10,2) DEFAULT 0;

-- Check limit before allowing AI usage
CREATE OR REPLACE FUNCTION check_external_usage_limit(
  p_user_id UUID,
  p_project_id UUID,
  p_estimated_cost DECIMAL(10,6)
) RETURNS BOOLEAN AS $$
DECLARE
  v_limit DECIMAL(10,2);
  v_current DECIMAL(10,2);
BEGIN
  SELECT monthly_usage_limit_usd, usage_this_month_usd
  INTO v_limit, v_current
  FROM project_members
  WHERE project_id = p_project_id
    AND user_id = p_user_id
    AND source = 'invitation';  -- External collaborator

  -- If not external or no limit set, allow
  IF NOT FOUND OR v_limit IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check if within limit
  RETURN (v_current + p_estimated_cost) <= v_limit;
END;
$$ LANGUAGE plpgsql;
```

---

## Implementation Priority

### Phase 0: Pre-Implementation (NEW)
1. ✅ Address critical gaps (Sections 11-20)
2. Enable Supabase Vault extension
3. Create feature flag table
4. Create audit log table
5. Populate AI pricing rates
6. Backup current database
7. Test rollback scripts in staging

### Phase 1: Foundation
1. Database tables and migrations
2. Auto-create personal organizations for existing users
3. Basic RLS policies
4. RLS helper functions
5. Organization switcher UI

### Phase 2: Collaboration
6. Invitation system
7. Project member management
8. Role-based UI restrictions
9. Invitation rate limiting

### Phase 3: Billing & Keys
10. API key migration to Vault
11. Key hierarchy resolution
12. Cost tracking with pricing rates
13. External collaborator usage attribution

### Phase 4: Integration
14. WordPress integration adaptation
15. Quality enforcement adaptation
16. Neo4j multi-tenancy migration
17. Gamification organization scope

### Phase 5: Polish
18. Cost visibility configuration
19. Export features
20. Organization leaderboards
21. Testing and bug fixes

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Data migration success rate | 100% |
| RLS policy coverage | All tables |
| Feature gate compliance | No unauthorized access |
| Cost attribution accuracy | 100% of API calls logged |
| Invitation acceptance rate | Track for UX improvements |
| Vault encryption coverage | All API keys |
| Rollback test success | All phases tested in staging |
| External collaborator tracking | 100% usage attributed |

---

## Appendix A: Role Permissions Matrix

| Permission | Owner | Admin | Editor | Viewer | External |
|------------|-------|-------|--------|--------|----------|
| View projects | ✅ | ✅ | ✅ | ✅ | ✅* |
| Create projects | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete projects | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage members | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage billing | ✅ | ✅** | ❌ | ❌ | ❌ |
| View costs | ✅ | ✅ | Config | Config | ❌ |
| Configure API keys | ✅ | ✅ | ❌ | ❌ | ❌ |
| Use content generation | ✅ | ✅ | ✅ | ❌ | ✅*** |
| Export data | ✅ | ✅ | ✅ | ❌ | ❌ |
| View audit log | ✅ | ✅ | ❌ | ❌ | ❌ |

*External: Only projects they're invited to
**Admin billing access configurable per organization
***External: Usage billed to inviting organization

---

## Appendix B: Decision Log

| Decision | Options Considered | Chosen | Rationale | Date |
|----------|-------------------|--------|-----------|------|
| Neo4j Multi-Tenancy | Separate DBs, Single instance w/ prefixes, User-scoped | Single instance w/ prefixes | Cost-effective, simpler ops while maintaining isolation | 2026-01-09 |
| Gamification Scope | Individual only, +Org leaderboards, +Global | Individual + Org leaderboards | Encourages both personal and team engagement | 2026-01-09 |
| External Collaborator Billing | Seat limit, Free w/ limits, Usage-based | Usage-based | Fair billing - guests free but their usage billed to org | 2026-01-09 |

---

## Appendix C: New Tables Summary

| Table | Purpose | Phase |
|-------|---------|-------|
| `organizations` | Multi-tenant container | 1 |
| `organization_members` | User-org membership | 1 |
| `organization_api_keys` | Encrypted API keys | 1 |
| `project_members` | External collaborators | 2 |
| `project_api_keys` | Project key overrides | 2 |
| `modules` | Feature definitions | 3 |
| `organization_subscriptions` | Module subscriptions | 3 |
| `role_module_access` | Role-based gating | 3 |
| `invitations` | Invitation management | 2 |
| `ai_pricing_rates` | Cost calculation | 3 |
| `organization_audit_log` | Security audit trail | 1 |
| `organization_scores` | Gamification aggregates | 4 |
| `organization_achievements` | Team achievements | 4 |
| `organization_leaderboard_history` | Leaderboard snapshots | 4 |
| `organization_quality_settings` | Custom quality thresholds | Future |
| `feature_flags` | Gradual rollout | 0 |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-09 | Initial design document |
| 2.0 | 2026-01-09 | Added Sections 11-20 addressing gap analysis findings |
| 2.1 | 2026-01-14 | Added implementation status tracking |

---

## Implementation Status

> **Last Updated:** 2026-01-14

### Phase Implementation Progress

| Phase | Description | Status | Implementation Doc |
|-------|-------------|--------|-------------------|
| Phase 0 | Pre-requisites (Vault, feature flags, audit, pricing) | ✅ COMPLETE | `2026-01-09-multi-tenancy-phase0-phase1-implementation.md` |
| Phase 1 | Core organization tables, RLS, personal org migration | ✅ COMPLETE | `2026-01-09-multi-tenancy-phase0-phase1-implementation.md` |
| Phase 2 | Invitations, project members, project API keys | ✅ COMPLETE | Migrations deployed |
| Phase 3 | Modules, subscriptions, feature gating | ✅ COMPLETE | Migrations deployed |
| Phase 4 | Gamification (org leaderboards) | ✅ COMPLETE | Migrations deployed |

### Frontend Implementation Progress

| Component Area | Status | Implementation Doc |
|---------------|--------|-------------------|
| Organization hooks (useOrganization, usePermissions, useCosts, etc.) | ✅ COMPLETE | `hooks/useOrganization.ts`, etc. |
| Organization UI components (14 components) | ✅ COMPLETE | `2026-01-10-multi-tenancy-ui-integration.md` |
| App.tsx OrganizationProvider integration | ✅ COMPLETE | `App.tsx:692` |
| Settings modal Organization tab | ✅ COMPLETE | `components/modals/SettingsModal.tsx` |
| Project selection integration | ✅ COMPLETE | `components/screens/ProjectSelectionScreen.tsx` |

### RLS Policy Migrations

| Table | Multi-tenancy RLS | Migration |
|-------|------------------|-----------|
| organizations | ✅ | `20260110100004_organization_rls_policies.sql` |
| organization_members | ✅ | `20260110100004_organization_rls_policies.sql` |
| projects | ✅ | `20260110170000_fix_org_rls_policies.sql` |
| topical_maps | ✅ | `20260110170000_fix_org_rls_policies.sql` |
| topics | ✅ | `20260110170000_fix_org_rls_policies.sql` |
| content_briefs | ✅ | `20260110170000_fix_org_rls_policies.sql` |
| content_generation_jobs | ✅ | `20260110170000_fix_org_rls_policies.sql` |
| content_generation_sections | ✅ | `20260110170000_fix_org_rls_policies.sql` |
| ai_usage_logs | ✅ | `20260110170000_fix_org_rls_policies.sql` |
| site_analysis_* tables | ✅ | `20260112000000_fix_site_analysis_rls.sql` |
| foundation_pages | ✅ | `20260114000000_fix_foundation_pages_rls.sql` |
| navigation_structures | ✅ | `20260114000000_fix_foundation_pages_rls.sql` |
| navigation_sync_status | ✅ | `20260114000000_fix_foundation_pages_rls.sql` |

### Remaining Work

| Item | Status | Notes |
|------|--------|-------|
| Full E2E integration testing | ⚠️ PENDING | Manual testing recommended |
| WordPress multi-site connection UI | ⚠️ PENDING | Backend ready, UI not integrated |
| Billing/Stripe integration | ⚠️ PENDING | Tables ready, Stripe webhooks not connected |
