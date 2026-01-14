# Multi-Tenancy UI Integration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate multi-tenancy UI components into the existing application, enabling organization switching, member management, invitation workflows, and cost visibility.

**Architecture:** The backend hooks (useOrganization, useInvitations, useApiKeys, usePermissions, useCosts, useOrganizationLeaderboard) are already complete. This plan adds UI components that consume these hooks, following the existing pattern of modals with tabbed navigation, EdgeToolbar integration, and AppStateContext.

**Tech Stack:** React 18, TypeScript, TailwindCSS, Supabase, existing Modal/Button/Input components from components/ui/

---

## Phase 1: Foundation Components

### Task 1: Create OrganizationProvider Context

**Files:**
- Create: `components/organization/OrganizationProvider.tsx`
- Modify: `App.tsx:656` (wrap with provider)

**Step 1: Create the OrganizationProvider component**

```typescript
// components/organization/OrganizationProvider.tsx
/**
 * OrganizationProvider
 *
 * Wraps the app to provide organization context globally.
 * Uses useOrganization hook and exposes via React Context.
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useOrganization } from '../../hooks/useOrganization';

type OrganizationContextType = ReturnType<typeof useOrganization>;

const OrganizationContext = createContext<OrganizationContextType | null>(null);

export function useOrganizationContext() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganizationContext must be used within OrganizationProvider');
  }
  return context;
}

interface OrganizationProviderProps {
  children: ReactNode;
}

export function OrganizationProvider({ children }: OrganizationProviderProps) {
  const organizationState = useOrganization();

  return (
    <OrganizationContext.Provider value={organizationState}>
      {children}
    </OrganizationContext.Provider>
  );
}
```

**Step 2: Create barrel export for organization components**

```typescript
// components/organization/index.ts
export { OrganizationProvider, useOrganizationContext } from './OrganizationProvider';
```

**Step 3: Integrate OrganizationProvider into App.tsx**

In `App.tsx`, add import and wrap the MainLayout:

```typescript
// Add import at top (around line 31)
import { OrganizationProvider } from './components/organization';

// Wrap MainLayout with OrganizationProvider (around line 656)
return (
    <AppStateContext.Provider value={{ state, dispatch }}>
        <OrganizationProvider>
            <MainLayout>
                {/* existing content */}
            </MainLayout>
        </OrganizationProvider>
    </AppStateContext.Provider>
);
```

**Step 4: Verify the app still renders**

Run: `npm run dev`
Expected: App loads without errors, no visual changes yet.

**Step 5: Commit**

```bash
git add components/organization/OrganizationProvider.tsx components/organization/index.ts App.tsx
git commit -m "feat(multi-tenancy): add OrganizationProvider context wrapper"
```

---

### Task 2: Create OrganizationSwitcher Component

**Files:**
- Create: `components/organization/OrganizationSwitcher.tsx`
- Modify: `components/organization/index.ts`

**Step 1: Create the OrganizationSwitcher dropdown component**

```typescript
// components/organization/OrganizationSwitcher.tsx
/**
 * OrganizationSwitcher
 *
 * Dropdown component for switching between organizations.
 * Shows current org name with chevron, expands to show all orgs.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useOrganizationContext } from './OrganizationProvider';
import { Loader } from '../ui/Loader';

interface OrganizationSwitcherProps {
  className?: string;
}

export function OrganizationSwitcher({ className = '' }: OrganizationSwitcherProps) {
  const {
    current,
    organizations,
    isLoading,
    isSwitching,
    switchOrganization,
    hasMultipleOrgs,
  } = useOrganizationContext();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleSwitch = async (orgId: string) => {
    if (orgId !== current?.id) {
      await switchOrganization(orgId);
    }
    setIsOpen(false);
  };

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 text-gray-400 ${className}`}>
        <Loader className="w-4 h-4" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  if (!current) {
    return null;
  }

  // Don't show dropdown if user only has one org
  if (!hasMultipleOrgs) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 ${className}`}>
        <OrgIcon type={current.type} />
        <span className="text-sm font-medium text-gray-200">{current.name}</span>
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-700/50 transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {isSwitching ? (
          <Loader className="w-4 h-4" />
        ) : (
          <OrgIcon type={current.type} />
        )}
        <span className="text-sm font-medium text-gray-200 max-w-[150px] truncate">
          {current.name}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute top-full left-0 mt-1 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-1 max-h-64 overflow-y-auto"
        >
          {organizations.map((org) => (
            <button
              key={org.id}
              role="option"
              aria-selected={org.id === current.id}
              onClick={() => handleSwitch(org.id)}
              className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-700/50 transition-colors ${
                org.id === current.id ? 'bg-blue-600/20 text-blue-400' : 'text-gray-200'
              }`}
            >
              <OrgIcon type={org.type} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{org.name}</div>
                <div className="text-xs text-gray-500 capitalize">{org.type}</div>
              </div>
              {org.id === current.id && (
                <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function OrgIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    personal: '👤',
    team: '👥',
    enterprise: '🏢',
  };
  return <span className="text-base">{icons[type] || '🏢'}</span>;
}
```

**Step 2: Export from barrel file**

```typescript
// components/organization/index.ts
export { OrganizationProvider, useOrganizationContext } from './OrganizationProvider';
export { OrganizationSwitcher } from './OrganizationSwitcher';
```

**Step 3: Verify component renders in isolation**

Add temporarily to App.tsx to test:
```typescript
{state.user && <OrganizationSwitcher className="fixed top-4 left-4 z-50" />}
```

Run: `npm run dev`
Expected: Organization switcher appears in top-left, shows current org, dropdown works.

**Step 4: Commit**

```bash
git add components/organization/OrganizationSwitcher.tsx components/organization/index.ts
git commit -m "feat(multi-tenancy): add OrganizationSwitcher dropdown component"
```

---

### Task 3: Integrate OrganizationSwitcher into ProjectSelectionScreen

**Files:**
- Modify: `components/screens/ProjectSelectionScreen.tsx`

**Step 1: Read current ProjectSelectionScreen structure**

Run: Read `components/screens/ProjectSelectionScreen.tsx` lines 1-100

**Step 2: Add OrganizationSwitcher to header**

Add import at top:
```typescript
import { OrganizationSwitcher } from '../organization';
```

In the header section (around line 44-69), add OrganizationSwitcher between title and user info:

```typescript
<header className="flex justify-between items-center mb-10">
  <div className="flex items-center gap-6">
    <div>
      <h1 className="text-4xl font-bold text-white">Holistic SEO Workbench</h1>
      <p className="text-lg text-gray-400 mt-2">Next-Gen SEO Strategy & Migration Platform</p>
    </div>
    <OrganizationSwitcher />
  </div>
  <div className="flex items-center gap-3">
    {/* existing user email, admin button, logout */}
  </div>
</header>
```

**Step 3: Verify integration**

Run: `npm run dev`
Navigate to Project Selection screen.
Expected: Organization switcher appears next to title, switching orgs works.

**Step 4: Commit**

```bash
git add components/screens/ProjectSelectionScreen.tsx
git commit -m "feat(multi-tenancy): integrate OrganizationSwitcher into project selection header"
```

---

## Phase 2: Organization Settings Tab

### Task 4: Create OrganizationSettingsTab Component

**Files:**
- Create: `components/organization/OrganizationSettingsTab.tsx`
- Modify: `components/organization/index.ts`

**Step 1: Create the settings tab component**

```typescript
// components/organization/OrganizationSettingsTab.tsx
/**
 * OrganizationSettingsTab
 *
 * Settings tab content for organization management.
 * Shows org info, members list, and quick actions.
 */

import React, { useState, useEffect } from 'react';
import { useOrganizationContext } from './OrganizationProvider';
import { usePermissions } from '../../hooks/usePermissions';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Loader } from '../ui/Loader';
import { getSupabaseClient } from '../../services/supabaseClient';

interface OrganizationSettingsTabProps {
  onOpenMemberManagement?: () => void;
  onOpenInvitations?: () => void;
}

export function OrganizationSettingsTab({
  onOpenMemberManagement,
  onOpenInvitations,
}: OrganizationSettingsTabProps) {
  const { current: organization, membership, isLoading } = useOrganizationContext();
  const { isAdmin, isOwner, can } = usePermissions();
  const supabase = getSupabaseClient();

  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [projectCount, setProjectCount] = useState<number | null>(null);

  // Load counts on mount
  useEffect(() => {
    async function loadCounts() {
      if (!organization) return;

      try {
        // Get member count
        const { count: members } = await supabase
          .from('organization_members')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
          .not('accepted_at', 'is', null);
        setMemberCount(members ?? 0);

        // Get project count
        const { count: projects } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organization.id);
        setProjectCount(projects ?? 0);
      } catch (err) {
        console.error('Failed to load org counts:', err);
      }
    }

    loadCounts();
  }, [organization, supabase]);

  if (isLoading || !organization) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Organization Info */}
      <section>
        <h3 className="text-lg font-semibold text-gray-200 mb-4">Organization</h3>
        <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-400 text-xs uppercase tracking-wider">Name</Label>
              <p className="text-gray-200 font-medium">{organization.name}</p>
            </div>
            <div>
              <Label className="text-gray-400 text-xs uppercase tracking-wider">Type</Label>
              <p className="text-gray-200 capitalize">{organization.type}</p>
            </div>
            <div>
              <Label className="text-gray-400 text-xs uppercase tracking-wider">Your Role</Label>
              <p className="text-gray-200 capitalize">{membership?.role || 'Unknown'}</p>
            </div>
            <div>
              <Label className="text-gray-400 text-xs uppercase tracking-wider">Slug</Label>
              <p className="text-gray-400 font-mono text-sm">{organization.slug}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section>
        <h3 className="text-lg font-semibold text-gray-200 mb-4">Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Members"
            value={memberCount}
            icon="👥"
          />
          <StatCard
            label="Projects"
            value={projectCount}
            icon="📁"
          />
          <StatCard
            label="Your Role"
            value={membership?.role}
            icon="🎭"
          />
          <StatCard
            label="Type"
            value={organization.type}
            icon={organization.type === 'personal' ? '👤' : organization.type === 'team' ? '👥' : '🏢'}
          />
        </div>
      </section>

      {/* Quick Actions */}
      {isAdmin && (
        <section>
          <h3 className="text-lg font-semibold text-gray-200 mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            {can('canManageMembers') && onOpenMemberManagement && (
              <Button
                variant="secondary"
                onClick={onOpenMemberManagement}
              >
                👥 Manage Members
              </Button>
            )}
            {can('canManageMembers') && onOpenInvitations && (
              <Button
                variant="secondary"
                onClick={onOpenInvitations}
              >
                ✉️ Send Invitation
              </Button>
            )}
            {can('canViewCosts') && (
              <Button
                variant="secondary"
                onClick={() => {/* TODO: open costs modal */}}
              >
                💰 View Costs
              </Button>
            )}
            {can('canConfigureApiKeys') && (
              <Button
                variant="secondary"
                onClick={() => {/* TODO: open API keys modal */}}
              >
                🔑 API Keys
              </Button>
            )}
          </div>
        </section>
      )}

      {/* Permissions Summary for non-admins */}
      {!isAdmin && (
        <section>
          <h3 className="text-lg font-semibold text-gray-200 mb-4">Your Permissions</h3>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <ul className="space-y-2 text-sm">
              <PermissionRow label="View Projects" allowed={can('canViewProjects')} />
              <PermissionRow label="Create Projects" allowed={can('canCreateProjects')} />
              <PermissionRow label="Generate Content" allowed={can('canUseContentGeneration')} />
              <PermissionRow label="Export Data" allowed={can('canExportData')} />
              <PermissionRow label="View Costs" allowed={can('canViewCosts')} />
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number | null | undefined; icon: string }) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-200 capitalize">
        {value === null ? <Loader className="w-4 h-4" /> : value ?? '-'}
      </p>
    </div>
  );
}

function PermissionRow({ label, allowed }: { label: string; allowed: boolean }) {
  return (
    <li className="flex items-center gap-2">
      <span className={allowed ? 'text-green-400' : 'text-gray-500'}>
        {allowed ? '✓' : '✗'}
      </span>
      <span className={allowed ? 'text-gray-200' : 'text-gray-500'}>{label}</span>
    </li>
  );
}
```

**Step 2: Export from barrel file**

```typescript
// components/organization/index.ts
export { OrganizationProvider, useOrganizationContext } from './OrganizationProvider';
export { OrganizationSwitcher } from './OrganizationSwitcher';
export { OrganizationSettingsTab } from './OrganizationSettingsTab';
```

**Step 3: Commit**

```bash
git add components/organization/OrganizationSettingsTab.tsx components/organization/index.ts
git commit -m "feat(multi-tenancy): add OrganizationSettingsTab component"
```

---

### Task 5: Integrate Organization Tab into SettingsModal

**Files:**
- Modify: `components/modals/SettingsModal.tsx`

**Step 1: Read current SettingsModal structure**

Review the tab structure in SettingsModal.tsx (tabs: 'ai' | 'services' | 'wordpress' | 'health')

**Step 2: Add 'organization' to tab type**

```typescript
const [activeTab, setActiveTab] = useState<'ai' | 'services' | 'wordpress' | 'organization' | 'health'>('ai');
```

**Step 3: Add import for OrganizationSettingsTab**

```typescript
import { OrganizationSettingsTab } from '../organization';
```

**Step 4: Add tab button in navigation sidebar**

After the WordPress tab button, add:
```typescript
<TabButton tab="organization" label="Organization" id="tab-organization" />
```

**Step 5: Add tab content panel**

In the main content area, add:
```typescript
{activeTab === 'organization' && <OrganizationSettingsTab />}
```

**Step 6: Verify integration**

Run: `npm run dev`
Open Settings modal.
Expected: "Organization" tab appears, shows org info when clicked.

**Step 7: Commit**

```bash
git add components/modals/SettingsModal.tsx
git commit -m "feat(multi-tenancy): add Organization tab to SettingsModal"
```

---

## Phase 3: Member Management

### Task 6: Create MemberList Component

**Files:**
- Create: `components/organization/MemberList.tsx`
- Modify: `components/organization/index.ts`

**Step 1: Create the MemberList component**

```typescript
// components/organization/MemberList.tsx
/**
 * MemberList
 *
 * Displays organization members with role badges.
 * Allows role changes and removal for admins.
 */

import React, { useState, useEffect } from 'react';
import { useOrganizationContext } from './OrganizationProvider';
import { usePermissions } from '../../hooks/usePermissions';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Loader } from '../ui/Loader';
import { getSupabaseClient } from '../../services/supabaseClient';
import { OrganizationMember, OrganizationRole } from '../../types';

interface MemberWithUser extends OrganizationMember {
  user?: {
    email: string;
    raw_user_meta_data?: {
      full_name?: string;
      name?: string;
      avatar_url?: string;
    };
  };
}

interface MemberListProps {
  onInviteClick?: () => void;
}

export function MemberList({ onInviteClick }: MemberListProps) {
  const { current: organization } = useOrganizationContext();
  const { isAdmin, isOwner, can } = usePermissions();
  const supabase = getSupabaseClient();

  const [members, setMembers] = useState<MemberWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Load members
  useEffect(() => {
    async function loadMembers() {
      if (!organization) return;

      setIsLoading(true);
      setError(null);

      try {
        const { data, error: queryError } = await supabase
          .from('organization_members')
          .select(`
            *,
            user:user_id (
              email,
              raw_user_meta_data
            )
          `)
          .eq('organization_id', organization.id)
          .not('accepted_at', 'is', null)
          .order('created_at', { ascending: true });

        if (queryError) throw queryError;
        setMembers(data || []);
      } catch (err) {
        console.error('Failed to load members:', err);
        setError(err instanceof Error ? err.message : 'Failed to load members');
      } finally {
        setIsLoading(false);
      }
    }

    loadMembers();
  }, [organization, supabase]);

  const handleRoleChange = async (memberId: string, newRole: OrganizationRole) => {
    if (!organization || !can('canManageMembers')) return;

    setUpdatingId(memberId);
    try {
      const { error: updateError } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (updateError) throw updateError;

      setMembers(prev => prev.map(m =>
        m.id === memberId ? { ...m, role: newRole } : m
      ));

      // Log audit event
      await supabase.rpc('log_audit_event', {
        p_org_id: organization.id,
        p_action: 'member.role_changed',
        p_target_type: 'member',
        p_target_id: memberId,
        p_new_value: { role: newRole },
      });
    } catch (err) {
      console.error('Failed to update role:', err);
      setError(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!organization || !can('canManageMembers')) return;

    const member = members.find(m => m.id === memberId);
    if (!member) return;

    // Can't remove owner
    if (member.role === 'owner') {
      setError('Cannot remove the organization owner');
      return;
    }

    if (!confirm(`Remove ${member.user?.email || 'this member'} from the organization?`)) {
      return;
    }

    setUpdatingId(memberId);
    try {
      const { error: deleteError } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (deleteError) throw deleteError;

      setMembers(prev => prev.filter(m => m.id !== memberId));

      // Log audit event
      await supabase.rpc('log_audit_event', {
        p_org_id: organization.id,
        p_action: 'member.removed',
        p_target_type: 'member',
        p_target_id: memberId,
        p_target_email: member.user?.email,
      });
    } catch (err) {
      console.error('Failed to remove member:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setUpdatingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Header with invite button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-200">
          Members ({members.length})
        </h3>
        {can('canManageMembers') && onInviteClick && (
          <Button variant="secondary" onClick={onInviteClick}>
            + Invite Member
          </Button>
        )}
      </div>

      {/* Member list */}
      <div className="space-y-2">
        {members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            canManage={can('canManageMembers') && member.role !== 'owner'}
            isUpdating={updatingId === member.id}
            onRoleChange={(role) => handleRoleChange(member.id, role)}
            onRemove={() => handleRemove(member.id)}
          />
        ))}
      </div>

      {members.length === 0 && (
        <p className="text-gray-500 text-center py-8">No members found.</p>
      )}
    </div>
  );
}

interface MemberRowProps {
  member: MemberWithUser;
  canManage: boolean;
  isUpdating: boolean;
  onRoleChange: (role: OrganizationRole) => void;
  onRemove: () => void;
}

function MemberRow({ member, canManage, isUpdating, onRoleChange, onRemove }: MemberRowProps) {
  const name = member.user?.raw_user_meta_data?.full_name
    || member.user?.raw_user_meta_data?.name
    || member.user?.email?.split('@')[0]
    || 'Unknown';

  const roleColors: Record<OrganizationRole, string> = {
    owner: 'bg-purple-600 text-purple-100',
    admin: 'bg-blue-600 text-blue-100',
    editor: 'bg-green-600 text-green-100',
    viewer: 'bg-gray-600 text-gray-100',
  };

  return (
    <div className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-3">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 font-medium">
        {name.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-gray-200 font-medium truncate">{name}</p>
        <p className="text-gray-500 text-sm truncate">{member.user?.email}</p>
      </div>

      {/* Role */}
      {canManage && !isUpdating ? (
        <Select
          value={member.role}
          onChange={(e) => onRoleChange(e.target.value as OrganizationRole)}
          className="w-28 text-sm"
        >
          <option value="admin">Admin</option>
          <option value="editor">Editor</option>
          <option value="viewer">Viewer</option>
        </Select>
      ) : (
        <span className={`px-2 py-1 rounded text-xs font-medium ${roleColors[member.role]}`}>
          {member.role}
        </span>
      )}

      {/* Actions */}
      {canManage && (
        <button
          onClick={onRemove}
          disabled={isUpdating}
          className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/30 rounded transition-colors"
          title="Remove member"
        >
          {isUpdating ? <Loader className="w-4 h-4" /> : '✕'}
        </button>
      )}
    </div>
  );
}
```

**Step 2: Export from barrel file**

```typescript
// Add to components/organization/index.ts
export { MemberList } from './MemberList';
```

**Step 3: Commit**

```bash
git add components/organization/MemberList.tsx components/organization/index.ts
git commit -m "feat(multi-tenancy): add MemberList component for organization members"
```

---

### Task 7: Create InviteMemberModal Component

**Files:**
- Create: `components/organization/InviteMemberModal.tsx`
- Modify: `components/organization/index.ts`

**Step 1: Create the InviteMemberModal component**

```typescript
// components/organization/InviteMemberModal.tsx
/**
 * InviteMemberModal
 *
 * Modal for sending organization invitations.
 * Collects email, role, and optional message.
 */

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Loader } from '../ui/Loader';
import { useOrganizationContext } from './OrganizationProvider';
import { useInvitations } from '../../hooks/useInvitations';
import { OrganizationRole } from '../../types';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function InviteMemberModal({ isOpen, onClose, onSuccess }: InviteMemberModalProps) {
  const { current: organization } = useOrganizationContext();
  const { createInvitation, isLoading, error } = useInvitations();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrganizationRole>('editor');
  const [message, setMessage] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!organization) {
      setLocalError('No organization selected');
      return;
    }

    if (!email.trim()) {
      setLocalError('Email is required');
      return;
    }

    if (!email.includes('@')) {
      setLocalError('Please enter a valid email address');
      return;
    }

    const invitation = await createInvitation({
      type: 'organization',
      organization_id: organization.id,
      email: email.trim(),
      role,
      message: message.trim() || undefined,
    });

    if (invitation) {
      // Reset form
      setEmail('');
      setRole('editor');
      setMessage('');
      onSuccess?.();
      onClose();
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole('editor');
    setMessage('');
    setLocalError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Invite Team Member"
      description={`Invite someone to join ${organization?.name || 'your organization'}`}
      maxWidth="max-w-md"
      zIndex="z-[70]"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" form="invite-form" disabled={isLoading}>
            {isLoading ? <Loader className="w-5 h-5" /> : 'Send Invitation'}
          </Button>
        </div>
      }
    >
      <form id="invite-form" onSubmit={handleSubmit} className="space-y-4">
        {(localError || error) && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
            {localError || error}
          </div>
        )}

        <div>
          <Label htmlFor="invite-email">Email Address</Label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@example.com"
            required
          />
        </div>

        <div>
          <Label htmlFor="invite-role">Role</Label>
          <Select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as OrganizationRole)}
          >
            <option value="admin">Admin - Full access except billing</option>
            <option value="editor">Editor - Create and edit content</option>
            <option value="viewer">Viewer - Read-only access</option>
          </Select>
          <p className="text-xs text-gray-500 mt-1">
            You can change their role later.
          </p>
        </div>

        <div>
          <Label htmlFor="invite-message">Personal Message (optional)</Label>
          <Textarea
            id="invite-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a personal note to the invitation..."
            rows={3}
          />
        </div>

        <div className="bg-gray-800/50 rounded-lg p-3 text-sm text-gray-400">
          <p>
            An invitation link will be created that expires in 7 days.
            The invitee will need to sign up or log in to accept.
          </p>
        </div>
      </form>
    </Modal>
  );
}
```

**Step 2: Export from barrel file**

```typescript
// Add to components/organization/index.ts
export { InviteMemberModal } from './InviteMemberModal';
```

**Step 3: Commit**

```bash
git add components/organization/InviteMemberModal.tsx components/organization/index.ts
git commit -m "feat(multi-tenancy): add InviteMemberModal component"
```

---

### Task 8: Create MemberManagementModal Component

**Files:**
- Create: `components/organization/MemberManagementModal.tsx`
- Modify: `components/organization/index.ts`

**Step 1: Create the MemberManagementModal that combines MemberList and InviteMemberModal**

```typescript
// components/organization/MemberManagementModal.tsx
/**
 * MemberManagementModal
 *
 * Full-featured modal for managing organization members.
 * Shows member list and pending invitations.
 */

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { MemberList } from './MemberList';
import { InviteMemberModal } from './InviteMemberModal';
import { useOrganizationContext } from './OrganizationProvider';
import { useInvitations } from '../../hooks/useInvitations';
import { usePermissions } from '../../hooks/usePermissions';
import { InvitationWithInviter } from '../../types';

interface MemberManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MemberManagementModal({ isOpen, onClose }: MemberManagementModalProps) {
  const { current: organization } = useOrganizationContext();
  const { getOrganizationInvitations, revokeInvitation, resendInvitation, isLoading: inviteLoading } = useInvitations();
  const { can } = usePermissions();

  const [activeTab, setActiveTab] = useState<'members' | 'pending'>('members');
  const [pendingInvitations, setPendingInvitations] = useState<InvitationWithInviter[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load pending invitations
  useEffect(() => {
    async function loadInvitations() {
      if (!organization || !isOpen) return;
      const invitations = await getOrganizationInvitations(organization.id);
      setPendingInvitations(invitations);
    }
    loadInvitations();
  }, [organization, isOpen, getOrganizationInvitations, refreshKey]);

  const handleRevoke = async (invitationId: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;

    const success = await revokeInvitation(invitationId);
    if (success) {
      setPendingInvitations(prev => prev.filter(i => i.id !== invitationId));
    }
  };

  const handleResend = async (invitationId: string) => {
    const success = await resendInvitation(invitationId);
    if (success) {
      setRefreshKey(prev => prev + 1);
    }
  };

  const handleInviteSuccess = () => {
    setRefreshKey(prev => prev + 1);
    setActiveTab('pending');
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Team Members"
        description={`Manage members of ${organization?.name || 'your organization'}`}
        maxWidth="max-w-2xl"
        zIndex="z-[60]"
      >
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700 mb-6">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'members'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Members
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Pending Invitations
            {pendingInvitations.length > 0 && (
              <span className="bg-amber-600 text-white text-xs px-2 py-0.5 rounded-full">
                {pendingInvitations.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'members' && (
          <MemberList
            key={refreshKey}
            onInviteClick={() => setIsInviteModalOpen(true)}
          />
        )}

        {activeTab === 'pending' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-200">
                Pending ({pendingInvitations.length})
              </h3>
              {can('canManageMembers') && (
                <Button variant="secondary" onClick={() => setIsInviteModalOpen(true)}>
                  + Invite Member
                </Button>
              )}
            </div>

            {inviteLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader className="w-8 h-8" />
              </div>
            ) : pendingInvitations.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No pending invitations.
              </p>
            ) : (
              <div className="space-y-2">
                {pendingInvitations.map((invitation) => (
                  <InvitationRow
                    key={invitation.id}
                    invitation={invitation}
                    onRevoke={() => handleRevoke(invitation.id)}
                    onResend={() => handleResend(invitation.id)}
                    canManage={can('canManageMembers')}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={handleInviteSuccess}
      />
    </>
  );
}

interface InvitationRowProps {
  invitation: InvitationWithInviter;
  onRevoke: () => void;
  onResend: () => void;
  canManage: boolean;
}

function InvitationRow({ invitation, onRevoke, onResend, canManage }: InvitationRowProps) {
  const expiresAt = new Date(invitation.expires_at);
  const isExpired = expiresAt < new Date();
  const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-3">
      {/* Email */}
      <div className="flex-1 min-w-0">
        <p className="text-gray-200 font-medium truncate">{invitation.email}</p>
        <p className="text-gray-500 text-sm">
          Role: <span className="capitalize">{invitation.role}</span>
          {' • '}
          {isExpired ? (
            <span className="text-red-400">Expired</span>
          ) : (
            <span>Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</span>
          )}
        </p>
      </div>

      {/* Actions */}
      {canManage && (
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={onResend}
            className="text-xs px-2 py-1"
          >
            Resend
          </Button>
          <button
            onClick={onRevoke}
            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/30 rounded transition-colors"
            title="Revoke invitation"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Export from barrel file**

```typescript
// Add to components/organization/index.ts
export { MemberManagementModal } from './MemberManagementModal';
```

**Step 3: Commit**

```bash
git add components/organization/MemberManagementModal.tsx components/organization/index.ts
git commit -m "feat(multi-tenancy): add MemberManagementModal with tabs for members and invitations"
```

---

### Task 9: Wire Up Member Management to Settings

**Files:**
- Modify: `components/organization/OrganizationSettingsTab.tsx`
- Modify: `components/modals/SettingsModal.tsx`

**Step 1: Add state for member management modal in SettingsModal**

In SettingsModal.tsx, add:
```typescript
import { MemberManagementModal } from '../organization';

// Add state
const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
```

**Step 2: Update OrganizationSettingsTab to receive callback**

Ensure onOpenMemberManagement prop is used:
```typescript
{activeTab === 'organization' && (
  <OrganizationSettingsTab
    onOpenMemberManagement={() => setIsMemberModalOpen(true)}
  />
)}
```

**Step 3: Add MemberManagementModal to SettingsModal**

After the main Modal closing tag:
```typescript
<MemberManagementModal
  isOpen={isMemberModalOpen}
  onClose={() => setIsMemberModalOpen(false)}
/>
```

**Step 4: Verify integration**

Run: `npm run dev`
Open Settings > Organization tab > Click "Manage Members"
Expected: Member management modal opens, shows members and pending invitations.

**Step 5: Commit**

```bash
git add components/modals/SettingsModal.tsx components/organization/OrganizationSettingsTab.tsx
git commit -m "feat(multi-tenancy): wire up MemberManagementModal to Settings"
```

---

## Phase 4: Pending User Invitations

### Task 10: Create PendingInvitationsBanner Component

**Files:**
- Create: `components/organization/PendingInvitationsBanner.tsx`
- Modify: `components/organization/index.ts`

**Step 1: Create the banner component**

```typescript
// components/organization/PendingInvitationsBanner.tsx
/**
 * PendingInvitationsBanner
 *
 * Shows banner when user has pending invitations to organizations/projects.
 * Displayed at top of project selection screen.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { useInvitations } from '../../hooks/useInvitations';
import { Invitation } from '../../types';

interface PendingInvitationsBannerProps {
  onAccept?: (orgId?: string, projectId?: string) => void;
}

export function PendingInvitationsBanner({ onAccept }: PendingInvitationsBannerProps) {
  const {
    getPendingInvitationsForUser,
    acceptInvitation,
    declineInvitation,
    isLoading
  } = useInvitations();

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadInvitations() {
      const pending = await getPendingInvitationsForUser();
      setInvitations(pending);
    }
    loadInvitations();
  }, [getPendingInvitationsForUser]);

  const handleAccept = async (invitation: Invitation) => {
    setProcessingId(invitation.id);
    const result = await acceptInvitation(invitation.token);

    if (result?.success) {
      setInvitations(prev => prev.filter(i => i.id !== invitation.id));
      onAccept?.(result.organization_id, result.project_id);
    }
    setProcessingId(null);
  };

  const handleDecline = async (invitation: Invitation) => {
    if (!confirm('Are you sure you want to decline this invitation?')) return;

    setProcessingId(invitation.id);
    const success = await declineInvitation(invitation.token);

    if (success) {
      setInvitations(prev => prev.filter(i => i.id !== invitation.id));
    }
    setProcessingId(null);
  };

  if (isLoading && invitations.length === 0) {
    return null; // Don't show loading state for banner
  }

  if (invitations.length === 0) {
    return null;
  }

  return (
    <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-6">
      <h3 className="text-blue-300 font-semibold mb-3 flex items-center gap-2">
        <span className="text-xl">✉️</span>
        You have {invitations.length} pending invitation{invitations.length !== 1 ? 's' : ''}
      </h3>

      <div className="space-y-3">
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3"
          >
            <div>
              <p className="text-gray-200">
                {invitation.type === 'organization' ? (
                  <>Invitation to join an organization</>
                ) : (
                  <>Invitation to collaborate on a project</>
                )}
              </p>
              <p className="text-sm text-gray-400">
                Role: <span className="capitalize">{invitation.role}</span>
                {invitation.message && (
                  <>
                    {' • '}
                    <span className="italic">"{invitation.message}"</span>
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => handleDecline(invitation)}
                disabled={processingId === invitation.id}
                className="text-sm"
              >
                Decline
              </Button>
              <Button
                onClick={() => handleAccept(invitation)}
                disabled={processingId === invitation.id}
                className="text-sm"
              >
                {processingId === invitation.id ? (
                  <Loader className="w-4 h-4" />
                ) : (
                  'Accept'
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Export from barrel file**

```typescript
// Add to components/organization/index.ts
export { PendingInvitationsBanner } from './PendingInvitationsBanner';
```

**Step 3: Commit**

```bash
git add components/organization/PendingInvitationsBanner.tsx components/organization/index.ts
git commit -m "feat(multi-tenancy): add PendingInvitationsBanner for user invitation acceptance"
```

---

### Task 11: Integrate PendingInvitationsBanner into ProjectSelectionScreen

**Files:**
- Modify: `components/screens/ProjectSelectionScreen.tsx`

**Step 1: Import the banner**

```typescript
import { OrganizationSwitcher, PendingInvitationsBanner } from '../organization';
```

**Step 2: Add banner after header**

After the header section, before the project grid:
```typescript
<PendingInvitationsBanner
  onAccept={() => {
    // Refresh organizations after accepting
    window.location.reload();
  }}
/>
```

**Step 3: Verify integration**

Run: `npm run dev`
Expected: Banner appears if user has pending invitations, Accept/Decline work.

**Step 4: Commit**

```bash
git add components/screens/ProjectSelectionScreen.tsx
git commit -m "feat(multi-tenancy): show PendingInvitationsBanner on project selection screen"
```

---

## Phase 5: Cost Dashboard

### Task 12: Create CostSummaryWidget Component

**Files:**
- Create: `components/organization/CostSummaryWidget.tsx`
- Modify: `components/organization/index.ts`

**Step 1: Create the cost summary widget**

```typescript
// components/organization/CostSummaryWidget.tsx
/**
 * CostSummaryWidget
 *
 * Displays current month's AI usage costs.
 * Shows total cost, tokens, and breakdown by provider.
 */

import React, { useState, useEffect } from 'react';
import { useCosts, CostSummary, CostByProvider } from '../../hooks/useCosts';
import { usePermissions } from '../../hooks/usePermissions';
import { Loader } from '../ui/Loader';

interface CostSummaryWidgetProps {
  className?: string;
  onViewDetails?: () => void;
}

export function CostSummaryWidget({ className = '', onViewDetails }: CostSummaryWidgetProps) {
  const { getCurrentMonthCosts, getCostReport, canViewCosts, isLoading } = useCosts();
  const { can } = usePermissions();

  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [byProvider, setByProvider] = useState<CostByProvider[]>([]);

  useEffect(() => {
    async function loadCosts() {
      if (!canViewCosts) return;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const report = await getCostReport(startOfMonth, endOfMonth);
      if (report) {
        setSummary(report.summary);
        setByProvider(report.byProvider.slice(0, 3)); // Top 3 providers
      }
    }

    loadCosts();
  }, [canViewCosts, getCostReport]);

  if (!canViewCosts) {
    return null;
  }

  if (isLoading && !summary) {
    return (
      <div className={`bg-gray-800/50 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-center py-4">
          <Loader className="w-6 h-6" />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800/50 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-200">
          💰 This Month's Usage
        </h3>
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            View Details →
          </button>
        )}
      </div>

      {summary ? (
        <>
          {/* Total Cost */}
          <div className="mb-4">
            <p className="text-3xl font-bold text-gray-100">
              ${summary.totalCost.toFixed(2)}
            </p>
            <p className="text-sm text-gray-400">
              {summary.totalTokens.toLocaleString()} tokens • {summary.totalRequests.toLocaleString()} requests
            </p>
          </div>

          {/* Provider Breakdown */}
          {byProvider.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 uppercase tracking-wider">By Provider</p>
              {byProvider.map((provider) => (
                <div key={provider.provider} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ProviderIcon provider={provider.provider} />
                    <span className="text-sm text-gray-300 capitalize">{provider.provider}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-200">${provider.cost.toFixed(2)}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({provider.percentage.toFixed(0)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="text-gray-500 text-center py-4">No usage data available.</p>
      )}
    </div>
  );
}

function ProviderIcon({ provider }: { provider: string }) {
  const colors: Record<string, string> = {
    anthropic: 'bg-orange-600',
    openai: 'bg-green-600',
    google: 'bg-blue-600',
    perplexity: 'bg-purple-600',
    openrouter: 'bg-cyan-600',
  };

  return (
    <div className={`w-3 h-3 rounded-full ${colors[provider] || 'bg-gray-600'}`} />
  );
}
```

**Step 2: Export from barrel file**

```typescript
// Add to components/organization/index.ts
export { CostSummaryWidget } from './CostSummaryWidget';
```

**Step 3: Commit**

```bash
git add components/organization/CostSummaryWidget.tsx components/organization/index.ts
git commit -m "feat(multi-tenancy): add CostSummaryWidget for monthly usage display"
```

---

### Task 13: Create CostDashboardModal Component

**Files:**
- Create: `components/organization/CostDashboardModal.tsx`
- Modify: `components/organization/index.ts`

**Step 1: Create the full cost dashboard modal**

```typescript
// components/organization/CostDashboardModal.tsx
/**
 * CostDashboardModal
 *
 * Full cost dashboard with filtering, charts, and CSV export.
 */

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Loader } from '../ui/Loader';
import { useCosts, CostReport } from '../../hooks/useCosts';
import { useOrganizationContext } from './OrganizationProvider';

interface CostDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type DateRange = 'this_week' | 'this_month' | 'last_month' | 'last_90_days' | 'custom';

export function CostDashboardModal({ isOpen, onClose }: CostDashboardModalProps) {
  const { current: organization } = useOrganizationContext();
  const { getCostReport, downloadCsv, isLoading, canViewCosts } = useCosts();

  const [dateRange, setDateRange] = useState<DateRange>('this_month');
  const [report, setReport] = useState<CostReport | null>(null);

  useEffect(() => {
    async function loadReport() {
      if (!isOpen || !canViewCosts) return;

      const { start, end } = getDateRange(dateRange);
      const data = await getCostReport(start, end);
      setReport(data);
    }

    loadReport();
  }, [isOpen, dateRange, canViewCosts, getCostReport]);

  const handleExport = () => {
    if (report) {
      downloadCsv(report, `cost-report-${dateRange}-${organization?.slug || 'org'}.csv`);
    }
  };

  if (!canViewCosts) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Cost Dashboard" maxWidth="max-w-4xl">
        <p className="text-gray-500 text-center py-8">
          You don't have permission to view cost data.
        </p>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cost Dashboard"
      description={`AI usage costs for ${organization?.name || 'your organization'}`}
      maxWidth="max-w-4xl"
      zIndex="z-[60]"
      footer={
        <div className="flex justify-between w-full">
          <Button variant="secondary" onClick={handleExport} disabled={!report}>
            📥 Export CSV
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      {/* Date Range Selector */}
      <div className="flex items-center justify-between mb-6">
        <Select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as DateRange)}
          className="w-48"
        >
          <option value="this_week">This Week</option>
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="last_90_days">Last 90 Days</option>
        </Select>

        {isLoading && <Loader className="w-5 h-5" />}
      </div>

      {report ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <SummaryCard
              label="Total Cost"
              value={`$${report.summary.totalCost.toFixed(2)}`}
              icon="💰"
            />
            <SummaryCard
              label="Total Tokens"
              value={report.summary.totalTokens.toLocaleString()}
              icon="🔤"
            />
            <SummaryCard
              label="Total Requests"
              value={report.summary.totalRequests.toLocaleString()}
              icon="📊"
            />
          </div>

          {/* By Provider */}
          <section>
            <h3 className="text-lg font-semibold text-gray-200 mb-3">By Provider</h3>
            <div className="bg-gray-800/50 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left px-4 py-2 text-gray-400">Provider</th>
                    <th className="text-right px-4 py-2 text-gray-400">Cost</th>
                    <th className="text-right px-4 py-2 text-gray-400">Tokens</th>
                    <th className="text-right px-4 py-2 text-gray-400">Requests</th>
                    <th className="text-right px-4 py-2 text-gray-400">%</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byProvider.map((p) => (
                    <tr key={p.provider} className="border-b border-gray-700/50">
                      <td className="px-4 py-2 text-gray-200 capitalize">{p.provider}</td>
                      <td className="px-4 py-2 text-right text-gray-200">${p.cost.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right text-gray-400">{p.tokens.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right text-gray-400">{p.requests}</td>
                      <td className="px-4 py-2 text-right text-gray-400">{p.percentage.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* By Project */}
          <section>
            <h3 className="text-lg font-semibold text-gray-200 mb-3">By Project</h3>
            <div className="bg-gray-800/50 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left px-4 py-2 text-gray-400">Project</th>
                    <th className="text-right px-4 py-2 text-gray-400">Cost</th>
                    <th className="text-right px-4 py-2 text-gray-400">Tokens</th>
                    <th className="text-right px-4 py-2 text-gray-400">Requests</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byProject.slice(0, 10).map((p) => (
                    <tr key={p.projectId} className="border-b border-gray-700/50">
                      <td className="px-4 py-2 text-gray-200 truncate max-w-[200px]">{p.projectName}</td>
                      <td className="px-4 py-2 text-right text-gray-200">${p.cost.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right text-gray-400">{p.tokens.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right text-gray-400">{p.requests}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8" />
        </div>
      )}
    </Modal>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-200">{value}</p>
    </div>
  );
}

function getDateRange(range: DateRange): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  switch (range) {
    case 'this_week': {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end };
    }
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return { start, end: monthEnd };
    }
    case 'last_90_days': {
      const start = new Date(now);
      start.setDate(now.getDate() - 90);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    default:
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end };
  }
}
```

**Step 2: Export from barrel file**

```typescript
// Add to components/organization/index.ts
export { CostDashboardModal } from './CostDashboardModal';
```

**Step 3: Commit**

```bash
git add components/organization/CostDashboardModal.tsx components/organization/index.ts
git commit -m "feat(multi-tenancy): add CostDashboardModal with filtering and export"
```

---

### Task 14: Wire Up Cost Dashboard to Organization Settings

**Files:**
- Modify: `components/organization/OrganizationSettingsTab.tsx`
- Modify: `components/modals/SettingsModal.tsx`

**Step 1: Add cost dashboard modal state to SettingsModal**

```typescript
import { CostDashboardModal } from '../organization';

const [isCostModalOpen, setIsCostModalOpen] = useState(false);
```

**Step 2: Pass callback to OrganizationSettingsTab**

```typescript
{activeTab === 'organization' && (
  <OrganizationSettingsTab
    onOpenMemberManagement={() => setIsMemberModalOpen(true)}
    onOpenCostDashboard={() => setIsCostModalOpen(true)}
  />
)}
```

**Step 3: Update OrganizationSettingsTab to use callback**

Add prop:
```typescript
interface OrganizationSettingsTabProps {
  onOpenMemberManagement?: () => void;
  onOpenInvitations?: () => void;
  onOpenCostDashboard?: () => void;
}
```

Update button:
```typescript
{can('canViewCosts') && onOpenCostDashboard && (
  <Button
    variant="secondary"
    onClick={onOpenCostDashboard}
  >
    💰 View Costs
  </Button>
)}
```

**Step 4: Add CostDashboardModal to SettingsModal**

```typescript
<CostDashboardModal
  isOpen={isCostModalOpen}
  onClose={() => setIsCostModalOpen(false)}
/>
```

**Step 5: Verify integration**

Run: `npm run dev`
Open Settings > Organization > Click "View Costs"
Expected: Cost dashboard modal opens with usage data.

**Step 6: Commit**

```bash
git add components/modals/SettingsModal.tsx components/organization/OrganizationSettingsTab.tsx
git commit -m "feat(multi-tenancy): wire up CostDashboardModal to Organization settings"
```

---

## Phase 6: Feature Gate Component

### Task 15: Create FeatureGate Component

**Files:**
- Create: `components/organization/FeatureGate.tsx`
- Modify: `components/organization/index.ts`

**Step 1: Create the FeatureGate wrapper component**

```typescript
// components/organization/FeatureGate.tsx
/**
 * FeatureGate
 *
 * Wrapper component that conditionally renders children based on feature flags.
 * Shows fallback content if feature is disabled.
 */

import React, { ReactNode } from 'react';
import { useFeatureGate } from '../../hooks/usePermissions';

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
  showLoader?: boolean;
}

export function FeatureGate({
  feature,
  children,
  fallback = null,
  showLoader = false,
}: FeatureGateProps) {
  const { enabled, loading } = useFeatureGate(feature);

  if (loading && showLoader) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="w-5 h-5 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!enabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * PermissionGate
 *
 * Wrapper that conditionally renders based on user permissions.
 */
import { usePermissions, Permission } from '../../hooks/usePermissions';

interface PermissionGateProps {
  permission: Permission | Permission[];
  requireAll?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate({
  permission,
  requireAll = false,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { can, canAny, canAll } = usePermissions();

  const hasPermission = Array.isArray(permission)
    ? (requireAll ? canAll(permission) : canAny(permission))
    : can(permission);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
```

**Step 2: Export from barrel file**

```typescript
// Add to components/organization/index.ts
export { FeatureGate, PermissionGate } from './FeatureGate';
```

**Step 3: Commit**

```bash
git add components/organization/FeatureGate.tsx components/organization/index.ts
git commit -m "feat(multi-tenancy): add FeatureGate and PermissionGate wrapper components"
```

---

## Phase 7: Create New Organization

### Task 16: Create CreateOrganizationModal Component

**Files:**
- Create: `components/organization/CreateOrganizationModal.tsx`
- Modify: `components/organization/index.ts`

**Step 1: Create the modal component**

```typescript
// components/organization/CreateOrganizationModal.tsx
/**
 * CreateOrganizationModal
 *
 * Modal for creating a new team or enterprise organization.
 */

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Select } from '../ui/Select';
import { Loader } from '../ui/Loader';
import { useOrganizationContext } from './OrganizationProvider';
import { OrganizationType } from '../../types';

interface CreateOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (orgId: string) => void;
}

export function CreateOrganizationModal({ isOpen, onClose, onSuccess }: CreateOrganizationModalProps) {
  const { createOrganization, switchOrganization } = useOrganizationContext();

  const [name, setName] = useState('');
  const [type, setType] = useState<'team' | 'enterprise'>('team');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Organization name is required');
      return;
    }

    if (name.trim().length < 2) {
      setError('Organization name must be at least 2 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      const org = await createOrganization(name.trim(), type);
      if (org) {
        await switchOrganization(org.id);
        setName('');
        setType('team');
        onSuccess?.(org.id);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setType('team');
    setError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Organization"
      description="Create a new team or enterprise organization to collaborate with others."
      maxWidth="max-w-md"
      zIndex="z-[70]"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="create-org-form" disabled={isSubmitting}>
            {isSubmitting ? <Loader className="w-5 h-5" /> : 'Create Organization'}
          </Button>
        </div>
      }
    >
      <form id="create-org-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div>
          <Label htmlFor="org-name">Organization Name</Label>
          <Input
            id="org-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Awesome Team"
            required
            autoFocus
          />
        </div>

        <div>
          <Label htmlFor="org-type">Organization Type</Label>
          <Select
            id="org-type"
            value={type}
            onChange={(e) => setType(e.target.value as 'team' | 'enterprise')}
          >
            <option value="team">Team - For small to medium teams</option>
            <option value="enterprise">Enterprise - For larger organizations</option>
          </Select>
          <p className="text-xs text-gray-500 mt-1">
            {type === 'team'
              ? 'Ideal for teams of 2-20 members.'
              : 'Advanced features for larger organizations.'}
          </p>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-3 text-sm text-gray-400">
          <p className="font-medium text-gray-300 mb-1">What happens next:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>You'll be the owner of this organization</li>
            <li>You can invite team members immediately</li>
            <li>Projects will be created under this organization</li>
          </ul>
        </div>
      </form>
    </Modal>
  );
}
```

**Step 2: Export from barrel file**

```typescript
// Add to components/organization/index.ts
export { CreateOrganizationModal } from './CreateOrganizationModal';
```

**Step 3: Commit**

```bash
git add components/organization/CreateOrganizationModal.tsx components/organization/index.ts
git commit -m "feat(multi-tenancy): add CreateOrganizationModal component"
```

---

### Task 17: Add "Create Organization" to OrganizationSwitcher

**Files:**
- Modify: `components/organization/OrganizationSwitcher.tsx`

**Step 1: Import CreateOrganizationModal**

```typescript
import { CreateOrganizationModal } from './CreateOrganizationModal';
```

**Step 2: Add state for modal**

```typescript
const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
```

**Step 3: Add "Create Organization" button to dropdown**

After the organization list in the dropdown, add:
```typescript
<div className="border-t border-gray-700 mt-1 pt-1">
  <button
    onClick={() => {
      setIsOpen(false);
      setIsCreateModalOpen(true);
    }}
    className="w-full flex items-center gap-3 px-4 py-2 text-left text-gray-400 hover:bg-gray-700/50 hover:text-gray-200 transition-colors"
  >
    <span className="text-base">➕</span>
    <span className="text-sm">Create Organization</span>
  </button>
</div>
```

**Step 4: Add modal to component**

Before the final closing tag:
```typescript
<CreateOrganizationModal
  isOpen={isCreateModalOpen}
  onClose={() => setIsCreateModalOpen(false)}
/>
```

**Step 5: Verify integration**

Run: `npm run dev`
Click organization switcher dropdown > "Create Organization"
Expected: Modal opens, can create new org.

**Step 6: Commit**

```bash
git add components/organization/OrganizationSwitcher.tsx
git commit -m "feat(multi-tenancy): add 'Create Organization' option to switcher dropdown"
```

---

## Phase 8: Final Integration

### Task 18: Update Organization Barrel Export

**Files:**
- Modify: `components/organization/index.ts`

**Step 1: Verify all exports are present**

```typescript
// components/organization/index.ts
/**
 * Organization Components
 *
 * Multi-tenancy UI components for organization management.
 */

export { OrganizationProvider, useOrganizationContext } from './OrganizationProvider';
export { OrganizationSwitcher } from './OrganizationSwitcher';
export { OrganizationSettingsTab } from './OrganizationSettingsTab';
export { MemberList } from './MemberList';
export { InviteMemberModal } from './InviteMemberModal';
export { MemberManagementModal } from './MemberManagementModal';
export { PendingInvitationsBanner } from './PendingInvitationsBanner';
export { CostSummaryWidget } from './CostSummaryWidget';
export { CostDashboardModal } from './CostDashboardModal';
export { FeatureGate, PermissionGate } from './FeatureGate';
export { CreateOrganizationModal } from './CreateOrganizationModal';
```

**Step 2: Commit**

```bash
git add components/organization/index.ts
git commit -m "feat(multi-tenancy): finalize organization components barrel export"
```

---

### Task 19: Run Full Integration Test

**Step 1: Start development server**

Run: `npm run dev`

**Step 2: Test organization switcher**

1. Log in
2. Navigate to Project Selection
3. Verify OrganizationSwitcher appears in header
4. Click dropdown, verify organizations list
5. Create new organization via dropdown
6. Switch between organizations

**Step 3: Test member management**

1. Open Settings modal
2. Go to Organization tab
3. Click "Manage Members"
4. Verify member list loads
5. Send test invitation
6. Check pending invitations tab

**Step 4: Test cost dashboard**

1. In Organization settings, click "View Costs"
2. Verify cost data loads
3. Change date range filter
4. Export CSV

**Step 5: Test pending invitations**

1. Create invitation to a test email
2. Log out
3. Log in as invited user
4. Verify PendingInvitationsBanner appears
5. Accept invitation

**Step 6: Document any issues found**

If issues found, create follow-up tasks.

**Step 7: Commit final verification**

```bash
git add -A
git commit -m "feat(multi-tenancy): complete UI integration with all components"
```

---

### Task 20: Create Final Summary

**Step 1: Run build to verify no type errors**

Run: `npm run build`
Expected: Build succeeds with no errors.

**Step 2: Push all changes**

```bash
git push origin master
```

**Step 3: Create summary of completed work**

Document:
- Components created
- Integration points
- Known limitations
- Future enhancements

---

## Implementation Status

> **Last Updated:** 2026-01-14

### Task Completion Status

| Phase | Task | Status |
|-------|------|--------|
| Phase 1 | Task 1: OrganizationProvider | ✅ COMPLETE |
| Phase 1 | Task 2: OrganizationSwitcher | ✅ COMPLETE |
| Phase 1 | Task 3: Integrate into ProjectSelectionScreen | ✅ COMPLETE |
| Phase 2 | Task 4: OrganizationSettingsTab | ✅ COMPLETE |
| Phase 2 | Task 5: Integrate into SettingsModal | ✅ COMPLETE |
| Phase 3 | Task 6: MemberList | ✅ COMPLETE |
| Phase 3 | Task 7: InviteMemberModal | ✅ COMPLETE |
| Phase 3 | Task 8: MemberManagementModal | ✅ COMPLETE |
| Phase 3 | Task 9: Wire Up to Settings | ✅ COMPLETE |
| Phase 4 | Task 10: PendingInvitationsBanner | ✅ COMPLETE |
| Phase 4 | Task 11: Integrate into ProjectSelectionScreen | ✅ COMPLETE |
| Phase 5 | Task 12: CostSummaryWidget | ✅ COMPLETE |
| Phase 5 | Task 13: CostDashboardModal | ✅ COMPLETE |
| Phase 5 | Task 14: Wire Up Cost Dashboard | ✅ COMPLETE |
| Phase 6 | Task 15: FeatureGate Component | ✅ COMPLETE |
| Phase 7 | Task 16: CreateOrganizationModal | ✅ COMPLETE |
| Phase 7 | Task 17: Add to OrganizationSwitcher | ✅ COMPLETE |
| Phase 8 | Task 18: Update Barrel Export | ✅ COMPLETE |
| Phase 8 | Task 19: Integration Test | ⚠️ PENDING |
| Phase 8 | Task 20: Final Summary | ⚠️ PENDING |

### Additional Components Created (Beyond Plan)

| Component | Purpose |
|-----------|---------|
| OrganizationApiKeysModal | Manage org-level API keys |
| SubscriptionBillingTab | Subscription management tab |
| SubscriptionBillingModal | Full billing modal |
| AdminOnly | Role-based gate component |
| OwnerOnly | Owner-only gate component |
| EditAccess | Edit permission gate |

### Related RLS Migration (Added 2026-01-14)

**Migration:** `20260114000000_fix_foundation_pages_rls.sql`
- Fixed foundation_pages RLS for multi-tenancy
- Fixed navigation_structures RLS for multi-tenancy
- Fixed navigation_sync_status RLS for multi-tenancy
- Updated create_foundation_pages function with access check

---

## Summary

This plan creates the following components:

| Component | Purpose |
|-----------|---------|
| OrganizationProvider | Context wrapper for organization state |
| OrganizationSwitcher | Dropdown to switch between orgs |
| OrganizationSettingsTab | Settings tab for org management |
| MemberList | Display/manage organization members |
| InviteMemberModal | Send organization invitations |
| MemberManagementModal | Full member management with tabs |
| PendingInvitationsBanner | Show pending invitations to user |
| CostSummaryWidget | Monthly cost summary widget |
| CostDashboardModal | Full cost dashboard with export |
| FeatureGate | Feature flag wrapper component |
| PermissionGate | Permission-based wrapper component |
| CreateOrganizationModal | Create new organizations |

**Integration Points:**
- App.tsx: OrganizationProvider wraps MainLayout
- ProjectSelectionScreen: OrganizationSwitcher + PendingInvitationsBanner
- SettingsModal: Organization tab + MemberManagementModal + CostDashboardModal

**Existing Hooks Used:**
- useOrganization
- useInvitations
- useApiKeys
- usePermissions
- useCosts
- useOrganizationLeaderboard
