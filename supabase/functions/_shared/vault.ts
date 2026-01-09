/**
 * Vault Integration Utilities for Edge Functions
 *
 * Provides secure API key storage, retrieval, and hierarchy resolution
 * using Supabase Vault for encryption.
 *
 * Created: 2026-01-09 - Multi-tenancy Phase 3
 */

// deno-lint-ignore-file no-explicit-any

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getEnvVar } from './utils.ts';

// ============================================================================
// Types
// ============================================================================

export interface ApiKeyInfo {
  key: string;
  keySource: 'platform' | 'org_byok' | 'project_byok';
  billableTo: 'platform' | 'organization' | 'project';
  billableId: string;
}

export interface UsageLogParams {
  organizationId: string;
  projectId: string;
  mapId?: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  keySource: string;
  billableTo: string;
  billableId: string;
  operation?: string;
}

// ============================================================================
// Supabase Admin Client
// ============================================================================

let _adminClient: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient {
  if (!_adminClient) {
    const supabaseUrl = getEnvVar('SUPABASE_URL') || getEnvVar('PROJECT_URL');
    const serviceRoleKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    _adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _adminClient;
}

// ============================================================================
// API Key Functions
// ============================================================================

/**
 * Get decrypted API key for a project and provider using hierarchy resolution
 */
export async function getApiKey(
  projectId: string,
  provider: string
): Promise<ApiKeyInfo | null> {
  const supabase = getAdminClient();

  // 1. Resolve API key using hierarchy function
  const { data: keyInfo, error: resolveError } = await supabase
    .rpc('resolve_api_key', {
      p_project_id: projectId,
      p_provider: provider,
    })
    .single();

  if (resolveError || !keyInfo) {
    console.warn(`No API key found for project ${projectId}, provider ${provider}`);
    return null;
  }

  // 2. Decrypt the key using vault function
  const { data: decryptedKey, error: decryptError } = await supabase
    .rpc('get_secret', { p_secret_id: keyInfo.encrypted_key });

  if (decryptError || !decryptedKey) {
    console.error('Failed to decrypt API key:', decryptError);
    return null;
  }

  return {
    key: decryptedKey,
    keySource: keyInfo.key_source,
    billableTo: keyInfo.billable_to,
    billableId: keyInfo.billable_id,
  };
}

/**
 * Store an API key in Vault and update the reference
 */
export async function storeApiKey(
  organizationId: string,
  provider: string,
  apiKey: string,
  source: 'platform' | 'byok'
): Promise<string | null> {
  const supabase = getAdminClient();

  // 1. Store in vault
  const { data: secretId, error: storeError } = await supabase
    .rpc('store_secret', {
      p_secret: apiKey,
      p_name: `org:${organizationId}:${provider}`,
      p_description: `API key for ${provider}`,
    });

  if (storeError) {
    console.error('Failed to store secret:', storeError);
    return null;
  }

  // 2. Update organization_api_keys reference
  const { error: upsertError } = await supabase
    .from('organization_api_keys')
    .upsert(
      {
        organization_id: organizationId,
        provider,
        encrypted_key: secretId,
        key_source: source,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id,provider' }
    );

  if (upsertError) {
    console.error('Failed to update API key reference:', upsertError);
    // Try to clean up the stored secret
    await supabase.rpc('delete_secret', { p_secret_id: secretId });
    return null;
  }

  return secretId;
}

/**
 * Store a project-level API key override
 */
export async function storeProjectApiKey(
  projectId: string,
  provider: string,
  apiKey: string
): Promise<string | null> {
  const supabase = getAdminClient();

  // 1. Store in vault
  const { data: secretId, error: storeError } = await supabase
    .rpc('store_secret', {
      p_secret: apiKey,
      p_name: `project:${projectId}:${provider}`,
      p_description: `Project API key for ${provider}`,
    });

  if (storeError) {
    console.error('Failed to store secret:', storeError);
    return null;
  }

  // 2. Update project_api_keys reference
  const { error: upsertError } = await supabase
    .from('project_api_keys')
    .upsert(
      {
        project_id: projectId,
        provider,
        encrypted_key: secretId,
        key_source: 'byok',
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'project_id,provider' }
    );

  if (upsertError) {
    console.error('Failed to update project API key reference:', upsertError);
    await supabase.rpc('delete_secret', { p_secret_id: secretId });
    return null;
  }

  return secretId;
}

/**
 * Rotate an API key (store new, delete old)
 */
export async function rotateApiKey(
  organizationId: string,
  provider: string,
  newApiKey: string
): Promise<boolean> {
  const supabase = getAdminClient();

  // 1. Get old key reference
  const { data: oldKey } = await supabase
    .from('organization_api_keys')
    .select('encrypted_key')
    .eq('organization_id', organizationId)
    .eq('provider', provider)
    .single();

  // 2. Store new key
  const newSecretId = await storeApiKey(organizationId, provider, newApiKey, 'byok');
  if (!newSecretId) return false;

  // 3. Delete old secret if it existed
  if (oldKey?.encrypted_key) {
    await supabase.rpc('delete_secret', { p_secret_id: oldKey.encrypted_key });
  }

  // 4. Log audit event
  await supabase.rpc('log_audit_event', {
    p_org_id: organizationId,
    p_action: 'api_key.rotated',
    p_target_type: 'api_key',
    p_new_value: { provider },
  });

  return true;
}

// ============================================================================
// Usage Logging
// ============================================================================

/**
 * Log AI usage with billing attribution
 */
export async function logUsage(params: UsageLogParams): Promise<void> {
  const supabase = getAdminClient();

  const { error } = await supabase.from('ai_usage_logs').insert({
    organization_id: params.organizationId,
    project_id: params.projectId,
    map_id: params.mapId,
    provider: params.provider,
    model: params.model,
    input_tokens: params.inputTokens,
    output_tokens: params.outputTokens,
    key_source: params.keySource,
    billable_to: params.billableTo,
    billable_id: params.billableId,
    operation: params.operation,
    // cost_usd will be calculated by trigger
  });

  if (error) {
    console.error('Failed to log usage:', error);
  }
}

/**
 * Update usage counters on API key records
 */
export async function updateKeyUsageCounters(
  keySource: string,
  billableId: string,
  provider: string,
  tokens: number,
  costUsd: number
): Promise<void> {
  const supabase = getAdminClient();

  const table = keySource.includes('project') ? 'project_api_keys' : 'organization_api_keys';
  const idColumn = keySource.includes('project') ? 'project_id' : 'organization_id';

  // Update usage_this_month counters
  const { data: current } = await supabase
    .from(table)
    .select('usage_this_month')
    .eq(idColumn, billableId)
    .eq('provider', provider)
    .single();

  if (current) {
    const usage = current.usage_this_month || { tokens: 0, requests: 0, cost_usd: 0 };
    await supabase
      .from(table)
      .update({
        usage_this_month: {
          tokens: (usage.tokens || 0) + tokens,
          requests: (usage.requests || 0) + 1,
          cost_usd: (usage.cost_usd || 0) + costUsd,
        },
        last_used_at: new Date().toISOString(),
      })
      .eq(idColumn, billableId)
      .eq('provider', provider);
  }
}
