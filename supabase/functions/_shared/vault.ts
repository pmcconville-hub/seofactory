// supabase/functions/_shared/vault.ts
// Shared utilities for Vault operations
//
// Used by edge functions that need to securely store/retrieve secrets
// These functions wrap the Supabase Vault RPCs
//
// deno-lint-ignore-file no-explicit-any

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Store a new secret in Vault
 *
 * @param client - Supabase client (must have service role for Vault access)
 * @param secret - The secret value to store
 * @param name - A unique name for the secret
 * @param description - Optional description of the secret
 * @returns The UUID of the stored secret
 */
export async function storeSecret(
  client: SupabaseClient,
  secret: string,
  name: string,
  description?: string
): Promise<{ secretId: string | null; error: string | null }> {
  try {
    const { data, error } = await client.rpc('store_secret', {
      p_secret: secret,
      p_name: name,
      p_description: description || null,
    });

    if (error) {
      console.error('[vault] store_secret error:', error);
      return { secretId: null, error: error.message };
    }

    return { secretId: data as string, error: null };
  } catch (err: any) {
    console.error('[vault] store_secret exception:', err);
    return { secretId: null, error: err.message || 'Unknown error' };
  }
}

/**
 * Retrieve a secret from Vault
 *
 * @param client - Supabase client (must have service role for Vault access)
 * @param secretId - The UUID of the secret to retrieve
 * @returns The decrypted secret value
 */
export async function getSecret(
  client: SupabaseClient,
  secretId: string
): Promise<{ secret: string | null; error: string | null }> {
  try {
    const { data, error } = await client.rpc('get_secret', {
      p_secret_id: secretId,
    });

    if (error) {
      console.error('[vault] get_secret error:', error);
      return { secret: null, error: error.message };
    }

    return { secret: data as string, error: null };
  } catch (err: any) {
    console.error('[vault] get_secret exception:', err);
    return { secret: null, error: err.message || 'Unknown error' };
  }
}

/**
 * Rotate an existing secret (create new, mark old as obsolete)
 *
 * @param client - Supabase client (must have service role for Vault access)
 * @param oldSecretId - The UUID of the old secret
 * @param newSecret - The new secret value
 * @returns The UUID of the new secret
 */
export async function rotateSecret(
  client: SupabaseClient,
  oldSecretId: string,
  newSecret: string
): Promise<{ secretId: string | null; error: string | null }> {
  try {
    const { data, error } = await client.rpc('rotate_secret', {
      p_old_secret_id: oldSecretId,
      p_new_secret: newSecret,
    });

    if (error) {
      console.error('[vault] rotate_secret error:', error);
      return { secretId: null, error: error.message };
    }

    return { secretId: data as string, error: null };
  } catch (err: any) {
    console.error('[vault] rotate_secret exception:', err);
    return { secretId: null, error: err.message || 'Unknown error' };
  }
}

/**
 * Delete a secret from Vault
 *
 * @param client - Supabase client (must have service role for Vault access)
 * @param secretId - The UUID of the secret to delete
 * @returns Success status
 */
export async function deleteSecret(
  client: SupabaseClient,
  secretId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await client.rpc('delete_secret', {
      p_secret_id: secretId,
    });

    if (error) {
      console.error('[vault] delete_secret error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('[vault] delete_secret exception:', err);
    return { success: false, error: err.message || 'Unknown error' };
  }
}

/**
 * API key validation patterns for different providers
 */
export const API_KEY_PATTERNS: Record<string, { prefix: string; minLength: number }> = {
  anthropic: { prefix: 'sk-ant-', minLength: 40 },
  openai: { prefix: 'sk-', minLength: 20 },
  google: { prefix: 'AIza', minLength: 30 },
  perplexity: { prefix: 'pplx-', minLength: 30 },
  openrouter: { prefix: 'sk-or-', minLength: 30 },
};

/**
 * Validate an API key format for a given provider
 */
export function validateApiKey(
  provider: string,
  apiKey: string
): { valid: boolean; error?: string } {
  const pattern = API_KEY_PATTERNS[provider];

  if (!pattern) {
    return { valid: false, error: `Unknown provider: ${provider}` };
  }

  if (!apiKey.startsWith(pattern.prefix)) {
    return { valid: false, error: `${provider} keys should start with "${pattern.prefix}"` };
  }

  if (apiKey.length < pattern.minLength) {
    return { valid: false, error: `${provider} key appears too short` };
  }

  return { valid: true };
}

/**
 * Mask an API key for display (show first few and last few chars)
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 12) {
    return '****';
  }
  const prefix = apiKey.substring(0, 8);
  const suffix = apiKey.substring(apiKey.length - 4);
  return `${prefix}...${suffix}`;
}
