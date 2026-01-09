# Multi-Tenancy Gap Analysis

**Date:** 2026-01-09
**Status:** Complete
**Purpose:** Comprehensive audit comparing current implementation against multi-tenancy design

---

## Executive Summary

This document identifies **critical gaps** between the current single-user implementation and the planned multi-tenancy system. The analysis covers database schema, RLS policies, API key management, frontend state, and security considerations.

### Risk Assessment

| Category | Severity | Count |
|----------|----------|-------|
| **CRITICAL** (Blocking for launch) | 🔴 | 8 |
| **HIGH** (Must fix before multi-user) | 🟠 | 6 |
| **MEDIUM** (Should fix for scalability) | 🟡 | 5 |
| **LOW** (Nice to have) | 🟢 | 4 |

---

## SECTION 1: Database Schema Gaps

### 1.1 Missing Tables (CRITICAL)

The following tables from the design document **do not exist**:

| Table | Purpose | Status |
|-------|---------|--------|
| `organizations` | Multi-tenant container for users | ❌ Missing |
| `organization_members` | User-org membership with roles | ❌ Missing |
| `organization_api_keys` | Encrypted API keys per org | ❌ Missing |
| `project_members` | External collaborator access | ❌ Missing |
| `project_api_keys` | Project-level key overrides | ❌ Missing |
| `modules` | Feature definitions | ❌ Missing |
| `organization_subscriptions` | Module subscriptions | ❌ Missing |
| `role_module_access` | Role-based feature gating | ❌ Missing |
| `invitations` | Invitation management | ❌ Missing |
| `cost_reports` (materialized view) | Cost aggregation | ❌ Missing |

### 1.2 Missing Columns on Existing Tables (CRITICAL)

**`projects` table:**
- Missing: `organization_id UUID REFERENCES organizations(id)`
- Missing: `api_key_mode TEXT` ('inherit', 'project_specific', 'prompt_user')
- Current: Only has `user_id` (single-user pattern)

**`topical_maps` table:**
- Missing: `organization_id` passthrough
- Current: Has redundant `user_id` (denormalized)

**`ai_usage_logs` table:**
- Missing: `organization_id UUID`
- Missing: `key_source TEXT` (platform/org_byok/project_byok)
- Missing: `billable_to TEXT`
- Missing: `billable_id UUID`
- Missing: `cost_usd DECIMAL(10,6)`
- Current: Basic logging without billing attribution

### 1.3 Missing Functions (HIGH)

| Function | Purpose |
|----------|---------|
| `is_org_member(org_id)` | Check organization membership |
| `get_org_role(org_id)` | Get user's role in organization |
| `has_project_access(proj_id)` | Check project access (org OR direct) |
| `get_project_role(proj_id)` | Get effective role for project |
| `can_use_feature(user_id, org_id, feature)` | Feature/module access check |
| `resolve_api_key(project_id, map_id, provider)` | Key hierarchy resolution |
| `can_view_costs(org_id, project_id)` | Cost visibility check |

---

## SECTION 2: Row Level Security Gaps

### 2.1 Current RLS Pattern (CRITICAL)

**Current pattern across ALL 59+ tables:**
```sql
CREATE POLICY "Users can view own X" ON table
  FOR SELECT USING (auth.uid() = user_id);
```

**Problem:** This pattern:
- Only supports single-user ownership
- Cannot express "user A invited user B to view this"
- Cannot express "user is member of organization that owns this"
- Makes collaboration impossible without data duplication

### 2.2 Tables Requiring RLS Overhaul

| Table | Current RLS | Required RLS |
|-------|-------------|--------------|
| `projects` | `user_id = auth.uid()` | `has_project_access(id)` |
| `topical_maps` | `user_id = auth.uid()` | `has_project_access(project_id)` |
| `topics` | Via topical_maps join | Via project access function |
| `content_briefs` | Via topics/maps join | Via project access function |
| `content_generation_jobs` | Via briefs join | Via project access function |
| `user_settings` | `user_id = auth.uid()` | Keep (personal) + org settings table |
| `ai_usage_logs` | `user_id = auth.uid()` | `can_view_costs(org_id)` |
| Plus 50+ more tables... | Single-user pattern | Organization-based access |

### 2.3 RLS Policy Count

- **Current policies using `auth.uid() = user_id`:** 80+ occurrences
- **Policies requiring migration:** ALL of them
- **Estimated new policies needed:** 150+ (CRUD x tables x roles)

---

## SECTION 3: API Key Management Gaps

### 3.1 Current Implementation (CRITICAL SECURITY)

**Storage:**
```sql
-- user_settings table stores keys in PLAINTEXT columns
gemini_api_key TEXT,
openai_api_key TEXT,
anthropic_api_key TEXT,
-- ... 15+ more key columns
```

**Usage Flow:**
1. Keys stored in `user_settings` table (plaintext columns)
2. Keys loaded into React state (`BusinessInfo` type)
3. Keys passed through to service functions
4. Keys sent to Supabase Edge Functions (proxy)

**Security Issues:**
- Keys visible in browser DevTools (React state)
- Keys transmitted with each API call
- No server-side encryption (Supabase Vault not used)
- No key rotation support
- No audit trail of key usage
- No separation between platform keys and user BYOK

### 3.2 Required Implementation

**Per Design Document:**
```sql
CREATE TABLE organization_api_keys (
  encrypted_key TEXT NOT NULL,  -- Encrypted with Supabase Vault
  key_source TEXT CHECK (key_source IN ('platform', 'byok')),
  usage_this_month JSONB,
  -- ...
);
```

**Required Changes:**
1. Move keys from `user_settings` to `organization_api_keys`
2. Encrypt keys using Supabase Vault
3. Keys decrypted only in Edge Functions (server-side)
4. Track key usage for billing attribution
5. Implement key hierarchy resolution

### 3.3 BusinessInfo Type Pollution

**Current `types.ts` (lines 201-265):**
```typescript
export interface BusinessInfo {
  // API keys embedded directly in business context!
  geminiApiKey?: string;
  openAiApiKey?: string;
  anthropicApiKey?: string;
  // ...
}
```

**Problem:** API keys are mixed with semantic business information. This type is:
- Stored in `topical_maps.business_info` JSONB column
- Loaded into React state
- Passed around extensively in the codebase

**Required Separation:**
- `BusinessInfo` should contain ONLY business/SEO context
- API configuration should be in separate `ApiConfig` type
- Keys should never be in client-side React state

---

## SECTION 4: Frontend State Gaps

### 4.1 Missing State Structure

**Current `state/appState.ts`:**
```typescript
interface AppState {
  user: User | null;
  projects: Project[];
  selectedProjectId: string | null;
  selectedMapId: string | null;
  // ... single-user centric
}
```

**Required additions:**
```typescript
interface AppState {
  // NEW: Organization context
  currentOrganization: Organization | null;
  organizations: Organization[];
  organizationMemberships: OrganizationMember[];

  // NEW: Permissions (derived)
  permissions: PermissionFlags;

  // Existing (now scoped to org context)
  projects: Project[];
  // ...
}
```

### 4.2 Missing Hooks

| Hook | Purpose | Status |
|------|---------|--------|
| `useOrganization()` | Current org, switching, membership | ❌ Missing |
| `usePermissions()` | Permission checks | ❌ Missing |
| `useFeatureGate()` | Module access + upgrade prompts | ❌ Missing |
| `useCostVisibility()` | Cost dashboard access | ❌ Missing |
| `useApiKeys()` | Key resolution with billing | ❌ Missing |

### 4.3 Missing Components

| Component | Purpose | Status |
|-----------|---------|--------|
| `OrganizationSwitcher` | Switch between orgs | ❌ Missing |
| `OrganizationSettings` | Org configuration | ❌ Missing |
| `MemberManagement` | Invite/manage members | ❌ Missing |
| `RolePermissionEditor` | Permission overrides | ❌ Missing |
| `CostDashboard` | Usage/cost reporting | ❌ Missing |
| `FeatureGate` | Conditional rendering | ❌ Missing |
| `ModuleSelector` | Subscription management | ❌ Missing |
| `ApiKeySelector` | Key source selection | ❌ Missing |
| `InvitationFlow` | Send/receive invites | ❌ Missing |

---

## SECTION 5: Service Layer Gaps

### 5.1 Current API Key Usage Pattern

**Example from `services/geminiService.ts`:**
```typescript
export async function callGemini(prompt: string, businessInfo: BusinessInfo) {
  const apiKey = businessInfo.geminiApiKey;
  // Key used directly, no billing attribution
}
```

**Example from `services/anthropicService.ts`:**
```typescript
const response = await fetch(proxyUrl, {
  headers: {
    'x-anthropic-api-key': businessInfo.anthropicApiKey,
    // Key sent in clear, no tracking
  }
});
```

### 5.2 Required Service Changes

**Every AI service call must:**
1. Call `resolve_api_key()` to get key with billing info
2. Track `key_source` (platform/org_byok/project_byok)
3. Log usage with `billable_to` and `cost_usd`
4. Never have keys in function parameters

**Files requiring modification:**
- `services/geminiService.ts`
- `services/openAiService.ts`
- `services/anthropicService.ts`
- `services/perplexityService.ts`
- `services/openRouterService.ts`
- All files in `services/ai/` that use these services

### 5.3 Missing Services

| Service | Purpose | Status |
|---------|---------|--------|
| `organizationService.ts` | Org CRUD, member management | ❌ Missing |
| `invitationService.ts` | Invitation send/accept | ❌ Missing |
| `billingService.ts` | Subscription management | ❌ Missing |
| `costReportingService.ts` | Cost aggregation/export | ❌ Missing |
| `featureGateService.ts` | Module access checks | ❌ Missing |
| `apiKeyService.ts` | Key resolution with hierarchy | ❌ Missing |

---

## SECTION 6: Edge Function Gaps

### 6.1 Current Edge Functions

Located in `supabase/functions/`:
- `anthropic-proxy/` - Proxies Anthropic API
- `openai-proxy/` - Proxies OpenAI API
- `update-settings/` - Updates user settings

### 6.2 Required Edge Function Changes

**Proxy functions must:**
1. Resolve API key from database (not from request header)
2. Use Supabase Vault for decryption
3. Log usage with billing attribution
4. Validate user has access to requested project/org

**New Edge Functions needed:**
- `send-invitation/` - Email invitation with token
- `process-webhook/` - Stripe webhook handler
- `aggregate-costs/` - Daily cost aggregation cron

---

## SECTION 7: Security Gap Summary

### 7.1 Data Isolation (CRITICAL)

| Issue | Current | Required |
|-------|---------|----------|
| User A sees User B's projects | ❌ Possible if RLS bypassed | ✅ Organization-based isolation |
| API keys visible to collaborators | ❌ Keys in shared state | ✅ Server-side only |
| Cost data exposure | ❌ No cost visibility control | ✅ Per-role visibility config |
| Admin access | ❌ No admin concept | ✅ Role-based admin |

### 7.2 API Key Security (CRITICAL)

| Issue | Current | Required |
|-------|---------|----------|
| Keys in browser | ❌ In React state | ✅ Server-side only |
| Key encryption | ❌ Plaintext in DB | ✅ Supabase Vault |
| Key audit trail | ❌ None | ✅ Full usage logging |
| BYOK separation | ❌ Mixed with platform | ✅ Clear key_source tracking |

### 7.3 Access Control (HIGH)

| Issue | Current | Required |
|-------|---------|----------|
| Role enforcement | ❌ No roles | ✅ Owner/Admin/Editor/Viewer |
| Feature gating | ❌ All features available | ✅ Module-based access |
| External collaborators | ❌ Impossible | ✅ Project-level invitations |

---

## SECTION 8: Migration Complexity Assessment

### 8.1 Breaking Changes

**These changes WILL break existing functionality:**

1. **API key location change** - Services expect keys in `BusinessInfo`
2. **RLS policy replacement** - All 80+ policies need updating
3. **State structure change** - Components expect `user_id` pattern
4. **Database schema changes** - New required columns/tables

### 8.2 Data Migration Requirements

1. **Create personal org for each user** (~100% of users)
2. **Move projects under personal orgs** (~100% of projects)
3. **Migrate API keys to org_api_keys** (~100% of keys)
4. **Update ai_usage_logs with org_id** (~100% of logs)
5. **Backfill cost_usd on historical usage** (estimate only)

### 8.3 Estimated Scope

| Task | Files | Complexity |
|------|-------|------------|
| Database migrations | 10+ new migrations | HIGH |
| RLS policy updates | 59 tables | HIGH |
| Type definitions | types.ts + new files | MEDIUM |
| Service layer updates | 20+ service files | HIGH |
| State management | appState.ts + reducers | HIGH |
| UI components | 30+ new components | HIGH |
| Edge functions | 5+ functions | MEDIUM |
| Testing | All features | HIGH |

**Total estimated effort:** Significant (see design document for phased approach)

---

## SECTION 9: Priority Matrix

### 9.1 Phase 1: Foundation (MUST HAVE)

| Gap | Impact | Effort | Priority |
|-----|--------|--------|----------|
| Create organization tables | Blocking | Medium | 🔴 P0 |
| Create organization_members | Blocking | Medium | 🔴 P0 |
| Add organization_id to projects | Blocking | Low | 🔴 P0 |
| Create RLS helper functions | Blocking | Medium | 🔴 P0 |
| Personal org auto-creation | Blocking | Medium | 🔴 P0 |
| Basic org switcher UI | Blocking | Medium | 🔴 P0 |

### 9.2 Phase 2: Collaboration (MUST HAVE)

| Gap | Impact | Effort | Priority |
|-----|--------|--------|----------|
| project_members table | Collaboration | Medium | 🟠 P1 |
| invitations table | Collaboration | Medium | 🟠 P1 |
| Invitation flow UI | Collaboration | Medium | 🟠 P1 |
| Role-based RLS policies | Security | High | 🟠 P1 |

### 9.3 Phase 3: Billing (SHOULD HAVE)

| Gap | Impact | Effort | Priority |
|-----|--------|--------|----------|
| organization_api_keys table | Billing | Medium | 🟡 P2 |
| Key resolution function | Billing | Medium | 🟡 P2 |
| API key migration | Security | High | 🟡 P2 |
| modules/subscriptions tables | Billing | Medium | 🟡 P2 |
| Cost tracking updates | Billing | Medium | 🟡 P2 |

### 9.4 Phase 4: Polish (NICE TO HAVE)

| Gap | Impact | Effort | Priority |
|-----|--------|--------|----------|
| Cost visibility configuration | UX | Low | 🟢 P3 |
| CSV/Excel export | UX | Low | 🟢 P3 |
| Feature gate animations | UX | Low | 🟢 P3 |
| Advanced role permissions | Flexibility | Medium | 🟢 P3 |

---

## SECTION 10: Recommendations

### 10.1 Critical Path

1. **Database schema first** - All other changes depend on this
2. **RLS helper functions** - Required for new policies
3. **Data migration** - Create personal orgs for existing users
4. **Update RLS policies** - Replace all single-user patterns
5. **Frontend state** - Add organization context
6. **Service layer** - Update API key usage
7. **UI components** - Build org management UI
8. **Testing** - Comprehensive access control testing

### 10.2 Risk Mitigation

1. **30-day parallel operation** - Keep old user_id columns as fallback
2. **Feature flags** - Enable multi-tenancy per-user for testing
3. **Automated testing** - RLS policy test suite
4. **Rollback plan** - Documented procedure for each phase

### 10.3 Non-Negotiables Before Launch

1. ✅ API keys MUST be server-side only
2. ✅ RLS MUST prevent cross-organization data access
3. ✅ Billing attribution MUST be 100% accurate
4. ✅ External collaborators MUST only see invited projects
5. ✅ Cost visibility MUST respect organization configuration

---

## SECTION 11: Current vs Target Architecture

### Current Architecture
```
┌─────────────┐
│    User     │
└──────┬──────┘
       │ user_id = auth.uid()
       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Project   │────▶│ Topical Map │────▶│    Topic    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       │ user_id           │ user_id (redundant)
       │                   │
       ▼                   │
┌─────────────┐            │
│ user_settings│◀──────────┘
│ (API keys)   │
└─────────────┘
```

### Target Architecture
```
┌─────────────┐
│    User     │
└──────┬──────┘
       │ member of
       ▼
┌─────────────────────────────┐
│       Organization          │
│ (Personal OR Team)          │
│ ├─ API Keys (encrypted)     │
│ ├─ Subscriptions            │
│ └─ Cost Settings            │
└──────────────┬──────────────┘
               │ owns
               ▼
┌─────────────────────────────┐
│          Project            │◀───── External Collaborators
│ ├─ organization_id          │       (project_members)
│ └─ api_key_mode             │
└──────────────┬──────────────┘
               │ contains
               ▼
┌─────────────────────────────┐
│       Topical Map           │
│ (inherits org context)      │
└──────────────┬──────────────┘
               │
               ▼
         ┌─────────┐
         │  Topic  │
         └────┬────┘
              │
              ▼
       ┌─────────────┐
       │Content Brief│
       └─────────────┘
```

---

## Appendix A: Files Requiring Modification

### Database/Migrations
- `supabase/migrations/` - 10+ new migration files needed

### Types
- `types.ts` - Major restructuring required
- New files: `types/organization.ts`, `types/billing.ts`, `types/permissions.ts`

### State Management
- `state/appState.ts` - Add organization context
- New reducers for organization actions

### Services (API Key changes)
- `services/geminiService.ts`
- `services/openAiService.ts`
- `services/anthropicService.ts`
- `services/perplexityService.ts`
- `services/openRouterService.ts`
- All files in `services/ai/`

### New Services
- `services/organizationService.ts`
- `services/invitationService.ts`
- `services/billingService.ts`
- `services/featureGateService.ts`
- `services/apiKeyService.ts`

### Hooks
- New: `hooks/useOrganization.ts`
- New: `hooks/usePermissions.ts`
- New: `hooks/useFeatureGate.ts`
- Update: All hooks using `user_id` pattern

### Components (New)
- `components/organization/OrganizationSwitcher.tsx`
- `components/organization/OrganizationSettings.tsx`
- `components/organization/MemberManagement.tsx`
- `components/organization/InvitationFlow.tsx`
- `components/billing/CostDashboard.tsx`
- `components/billing/ModuleSelector.tsx`
- `components/settings/ApiKeySelector.tsx`
- `components/shared/FeatureGate.tsx`

### Edge Functions
- Update: `supabase/functions/anthropic-proxy/`
- Update: `supabase/functions/openai-proxy/`
- New: `supabase/functions/send-invitation/`
- New: `supabase/functions/stripe-webhook/`

---

## Appendix B: SQL Migration Sequence

```
1. 20260110_100000_organizations.sql
2. 20260110_100001_organization_members.sql
3. 20260110_100002_organization_api_keys.sql
4. 20260110_100003_project_members.sql
5. 20260110_100004_project_api_keys.sql
6. 20260110_100005_modules.sql
7. 20260110_100006_organization_subscriptions.sql
8. 20260110_100007_invitations.sql
9. 20260110_100008_rls_helper_functions.sql
10. 20260110_100009_migrate_to_organizations.sql
11. 20260110_100010_new_rls_policies.sql
12. 20260110_100011_cost_reports_view.sql
```

---

**Document Status:** Complete
**Next Steps:** Review with stakeholders, prioritize Phase 1 implementation
