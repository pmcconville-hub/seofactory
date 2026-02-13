// =============================================================================
// Style Guide Persistence — Save/load style guides to Supabase
// =============================================================================
// Cached by hostname (not full URL). A style guide for nfir.nl/page-a
// also works for nfir.nl/page-b.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { StyleGuide, SavedStyleGuide } from '../../types/styleGuide';
import { uploadElementScreenshots, getScreenshotUrl } from './screenshotStorage';

/**
 * Save a style guide to the database.
 * Creates a new version if one already exists for this hostname.
 */
export async function saveStyleGuide(
  supabase: SupabaseClient,
  userId: string,
  styleGuide: StyleGuide,
  topicalMapId?: string
): Promise<SavedStyleGuide | null> {
  // Get current max version for this hostname
  const { data: existing } = await supabase
    .from('style_guides')
    .select('version')
    .eq('user_id', userId)
    .eq('hostname', styleGuide.hostname)
    .order('version', { ascending: false })
    .limit(1);

  const nextVersion = (existing?.[0]?.version ?? 0) + 1;

  // Upload element screenshots to Storage before inserting
  let screenshotStoragePaths: Record<string, string> | null = null;
  try {
    const pathsMap = await uploadElementScreenshots(
      supabase,
      styleGuide.hostname, // Use hostname as project key for style guides
      styleGuide.id,
      styleGuide.elements
    );
    if (pathsMap.size > 0) {
      screenshotStoragePaths = Object.fromEntries(pathsMap);
    }
  } catch (uploadErr) {
    console.warn('[styleGuidePersistence] Screenshot upload failed (continuing with base64):', uploadErr);
  }

  // Build style_guide payload — strip base64 from elements whose screenshots were uploaded
  const uploadedElementIds = new Set(
    screenshotStoragePaths ? Object.keys(screenshotStoragePaths) : []
  );
  const elementsForStorage = styleGuide.elements.map(el => {
    if (uploadedElementIds.has(el.id) && el.elementScreenshotBase64) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { elementScreenshotBase64: _stripped, ...rest } = el;
      return rest;
    }
    return el;
  });

  const record: Record<string, unknown> = {
    user_id: userId,
    hostname: styleGuide.hostname,
    source_url: styleGuide.sourceUrl,
    style_guide: {
      ...styleGuide,
      elements: elementsForStorage,
      version: nextVersion,
      screenshotBase64: styleGuide.screenshotBase64 || null,
    },
    version: nextVersion,
    screenshot_storage_paths: screenshotStoragePaths,
  };
  if (topicalMapId) {
    record.topical_map_id = topicalMapId;
  }

  const { data, error } = await supabase
    .from('style_guides')
    .insert(record)
    .select()
    .single();

  if (error) {
    console.error('[styleGuidePersistence] Failed to save style guide:', error);
    return null;
  }

  return data as unknown as SavedStyleGuide;
}

/**
 * Load the latest style guide for a hostname.
 */
export async function loadStyleGuide(
  supabase: SupabaseClient,
  userId: string,
  hostname: string,
  topicalMapId?: string
): Promise<SavedStyleGuide | null> {
  let query = supabase
    .from('style_guides')
    .select('*')
    .eq('user_id', userId)
    .eq('hostname', hostname);

  if (topicalMapId) {
    query = query.eq('topical_map_id', topicalMapId);
  }

  const { data, error } = await query
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  // Resolve element screenshot URLs from Storage paths
  const saved = data as unknown as SavedStyleGuide;
  if (saved.screenshot_storage_paths && saved.style_guide?.elements) {
    const paths = saved.screenshot_storage_paths;
    saved.style_guide.elements = saved.style_guide.elements.map(el => {
      const storagePath = paths[el.id];
      if (storagePath) {
        return {
          ...el,
          elementScreenshotUrl: getScreenshotUrl(supabase, storagePath),
        };
      }
      return el;
    });
  }

  return saved;
}

/**
 * Load all style guide versions for a hostname (lightweight — only metadata).
 */
export async function loadStyleGuideHistory(
  supabase: SupabaseClient,
  userId: string,
  hostname: string
): Promise<Pick<SavedStyleGuide, 'id' | 'version' | 'source_url' | 'created_at'>[]> {
  const { data, error } = await supabase
    .from('style_guides')
    .select('id, version, source_url, created_at')
    .eq('user_id', userId)
    .eq('hostname', hostname)
    .order('version', { ascending: false });

  if (error || !data) return [];
  return data as any[];
}

/**
 * Load a specific style guide version by its database ID.
 */
export async function loadStyleGuideById(
  supabase: SupabaseClient,
  styleGuideId: string
): Promise<SavedStyleGuide | null> {
  const { data, error } = await supabase
    .from('style_guides')
    .select('*')
    .eq('id', styleGuideId)
    .maybeSingle();

  if (error || !data) return null;

  // Resolve element screenshot URLs from Storage paths
  const saved = data as unknown as SavedStyleGuide;
  if (saved.screenshot_storage_paths && saved.style_guide?.elements) {
    const paths = saved.screenshot_storage_paths;
    saved.style_guide.elements = saved.style_guide.elements.map(el => {
      const storagePath = paths[el.id];
      if (storagePath) {
        return {
          ...el,
          elementScreenshotUrl: getScreenshotUrl(supabase, storagePath),
        };
      }
      return el;
    });
  }

  return saved;
}

/**
 * Load a specific version number for a hostname.
 */
export async function loadStyleGuideByVersion(
  supabase: SupabaseClient,
  userId: string,
  hostname: string,
  version: number
): Promise<SavedStyleGuide | null> {
  const { data, error } = await supabase
    .from('style_guides')
    .select('*')
    .eq('user_id', userId)
    .eq('hostname', hostname)
    .eq('version', version)
    .maybeSingle();

  if (error || !data) return null;

  // Resolve element screenshot URLs from Storage paths
  const saved = data as unknown as SavedStyleGuide;
  if (saved.screenshot_storage_paths && saved.style_guide?.elements) {
    const paths = saved.screenshot_storage_paths;
    saved.style_guide.elements = saved.style_guide.elements.map(el => {
      const storagePath = paths[el.id];
      if (storagePath) {
        return {
          ...el,
          elementScreenshotUrl: getScreenshotUrl(supabase, storagePath),
        };
      }
      return el;
    });
  }

  return saved;
}

/**
 * Delete a specific style guide version.
 */
export async function deleteStyleGuide(
  supabase: SupabaseClient,
  styleGuideId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('style_guides')
    .delete()
    .eq('id', styleGuideId);

  return !error;
}

/**
 * Extract hostname from a URL for cache key lookup.
 */
export function getHostnameFromUrl(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : 'https://' + url).hostname;
  } catch {
    return url;
  }
}
