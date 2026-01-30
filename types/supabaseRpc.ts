// types/supabaseRpc.ts
// Typed wrappers for Supabase RPC function calls

import { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// RPC Return Types
// ============================================================================

export interface ClaimMigratedDataResult {
  success: boolean;
  claimed_projects: number;
  claimed_maps: number;
  claimed_topics: number;
  claimed_briefs: number;
}

export interface GetUserQuotaResult {
  tier: 'free' | 'pro' | 'enterprise';
  projects_used: number;
  projects_limit: number;
  maps_used: number;
  maps_limit: number;
  briefs_used: number;
  briefs_limit: number;
  ai_calls_used: number;
  ai_calls_limit: number;
}

export interface GetOrganizationStatsResult {
  total_users: number;
  active_users: number;
  total_projects: number;
  total_maps: number;
  total_briefs: number;
  total_articles: number;
}

export interface GetProjectStatsResult {
  map_count: number;
  topic_count: number;
  brief_count: number;
  article_count: number;
  total_word_count: number;
}

export interface InviteUserToOrganizationResult {
  success: boolean;
  invitation_id?: string;
  error?: string;
}

export interface AcceptInvitationResult {
  success: boolean;
  organization_id?: string;
  error?: string;
}

// ============================================================================
// Typed RPC Wrapper Functions
// ============================================================================

/**
 * Claim migrated data for the current user
 */
export async function claimMigratedData(
  supabase: SupabaseClient
): Promise<ClaimMigratedDataResult> {
  const { data, error } = await supabase.rpc('claim_migrated_data');
  if (error) throw new Error(`claim_migrated_data failed: ${error.message}`);
  return data as ClaimMigratedDataResult;
}

/**
 * Get current user's quota information
 */
export async function getUserQuota(
  supabase: SupabaseClient,
  userId: string
): Promise<GetUserQuotaResult | null> {
  const { data, error } = await supabase.rpc('get_user_quota', { user_id: userId });
  if (error) throw new Error(`get_user_quota failed: ${error.message}`);
  return data as GetUserQuotaResult | null;
}

/**
 * Get organization statistics
 */
export async function getOrganizationStats(
  supabase: SupabaseClient,
  orgId: string
): Promise<GetOrganizationStatsResult | null> {
  const { data, error } = await supabase.rpc('get_organization_stats', { org_id: orgId });
  if (error) throw new Error(`get_organization_stats failed: ${error.message}`);
  return data as GetOrganizationStatsResult | null;
}

/**
 * Get project statistics
 */
export async function getProjectStats(
  supabase: SupabaseClient,
  projectId: string
): Promise<GetProjectStatsResult | null> {
  const { data, error } = await supabase.rpc('get_project_stats', { project_id: projectId });
  if (error) throw new Error(`get_project_stats failed: ${error.message}`);
  return data as GetProjectStatsResult | null;
}

/**
 * Invite a user to an organization
 */
export async function inviteUserToOrganization(
  supabase: SupabaseClient,
  orgId: string,
  email: string,
  role: 'admin' | 'member' | 'viewer'
): Promise<InviteUserToOrganizationResult> {
  const { data, error } = await supabase.rpc('invite_user_to_organization', {
    org_id: orgId,
    user_email: email,
    user_role: role,
  });
  if (error) throw new Error(`invite_user_to_organization failed: ${error.message}`);
  return data as InviteUserToOrganizationResult;
}

/**
 * Accept an organization invitation
 */
export async function acceptInvitation(
  supabase: SupabaseClient,
  invitationId: string
): Promise<AcceptInvitationResult> {
  const { data, error } = await supabase.rpc('accept_invitation', {
    invitation_id: invitationId,
  });
  if (error) throw new Error(`accept_invitation failed: ${error.message}`);
  return data as AcceptInvitationResult;
}

// ============================================================================
// Generic RPC Helper
// ============================================================================

/**
 * Generic typed RPC call helper
 * Use this for one-off RPC calls that don't have a dedicated wrapper
 */
export async function callRpc<T>(
  supabase: SupabaseClient,
  functionName: string,
  params?: Record<string, unknown>
): Promise<T> {
  const { data, error } = params
    ? await supabase.rpc(functionName, params)
    : await supabase.rpc(functionName);

  if (error) {
    throw new Error(`RPC ${functionName} failed: ${error.message}`);
  }

  return data as T;
}
