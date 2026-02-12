// services/styleguide-generator/storage/StyleguideStorage.ts
// Persists styleguide HTML to Supabase Storage and tokens to the topical map record.

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../supabaseClient';
import type { DesignTokenSet, BrandStyleguideData, BrandAnalysis } from '../types';

const BUCKET_NAME = 'styleguides';

let supabase: SupabaseClient | null = null;

/**
 * Initialize storage with Supabase credentials.
 * Must be called before any storage operations.
 */
export function initStyleguideStorage(url: string, key: string): void {
  supabase = getSupabaseClient(url, key);
}

function getClient(): SupabaseClient {
  if (!supabase) throw new Error('[StyleguideStorage] Not initialized. Call initStyleguideStorage first.');
  return supabase;
}

// ============================================================================
// HTML STORAGE (Supabase Storage bucket)
// ============================================================================

/**
 * Upload styleguide HTML to Supabase Storage.
 * Returns the storage path (not a full URL).
 */
export async function uploadStyleguideHtml(
  projectId: string,
  mapId: string,
  html: string,
): Promise<string> {
  const client = getClient();
  const storagePath = `${projectId}/${mapId}/styleguide.html`;

  const blob = new Blob([html], { type: 'text/html; charset=utf-8' });

  const { error } = await client.storage
    .from(BUCKET_NAME)
    .upload(storagePath, blob, {
      contentType: 'text/html; charset=utf-8',
      upsert: true,
    });

  if (error) {
    throw new Error(`[StyleguideStorage] Upload failed: ${error.message}`);
  }

  return storagePath;
}

/**
 * Get the public URL for a stored styleguide.
 */
export function getStyleguideUrl(storagePath: string): string {
  const client = getClient();
  const { data } = client.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Download styleguide HTML from storage.
 */
export async function downloadStyleguideHtml(storagePath: string): Promise<string> {
  const client = getClient();

  const { data, error } = await client.storage
    .from(BUCKET_NAME)
    .download(storagePath);

  if (error) {
    throw new Error(`[StyleguideStorage] Download failed: ${error.message}`);
  }

  return await data.text();
}

/**
 * Delete a stored styleguide.
 */
export async function deleteStyleguideHtml(storagePath: string): Promise<void> {
  const client = getClient();

  const { error } = await client.storage
    .from(BUCKET_NAME)
    .remove([storagePath]);

  if (error) {
    throw new Error(`[StyleguideStorage] Delete failed: ${error.message}`);
  }
}

// ============================================================================
// TOKEN STORAGE (topical_maps JSONB column)
// ============================================================================

/**
 * Save BrandStyleguideData (tokens + analysis metadata) to a topical map record.
 * Stores in the `styleguide_data` JSONB column.
 */
export async function saveStyleguideData(
  mapId: string,
  data: BrandStyleguideData,
): Promise<void> {
  const client = getClient();

  const { error } = await client
    .from('topical_maps')
    .update({ styleguide_data: data as unknown as Record<string, unknown> })
    .eq('id', mapId);

  if (error) {
    // Column may not exist yet (pre-migration)
    if (error.message.includes('styleguide_data') || error.code === '42703') {
      console.warn('[StyleguideStorage] styleguide_data column not found — migration may be pending');
      return;
    }
    throw new Error(`[StyleguideStorage] Save failed: ${error.message}`);
  }
}

/**
 * Load BrandStyleguideData from a topical map record.
 * Returns null if no data exists.
 */
export async function loadStyleguideData(
  mapId: string,
): Promise<BrandStyleguideData | null> {
  const client = getClient();

  const { data, error } = await client
    .from('topical_maps')
    .select('styleguide_data')
    .eq('id', mapId)
    .single();

  if (error) {
    if (error.message.includes('styleguide_data') || error.code === '42703') {
      return null; // Column doesn't exist yet
    }
    throw new Error(`[StyleguideStorage] Load failed: ${error.message}`);
  }

  return (data?.styleguide_data as unknown as BrandStyleguideData) || null;
}

/**
 * Extract just the DesignTokenSet from stored styleguide data.
 * Convenience method for consumers that only need tokens.
 */
export async function loadDesignTokens(mapId: string): Promise<DesignTokenSet | null> {
  const data = await loadStyleguideData(mapId);
  return data?.designTokens || null;
}

/**
 * Check whether a styleguide has been generated for a given map.
 */
export async function hasStyleguide(mapId: string): Promise<boolean> {
  const data = await loadStyleguideData(mapId);
  return data !== null && !!data.htmlStorageKey;
}
