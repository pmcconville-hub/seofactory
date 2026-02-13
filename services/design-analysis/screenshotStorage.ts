// =============================================================================
// Screenshot Storage Service — Upload/download screenshots to Supabase Storage
// =============================================================================
// Moves screenshots from inline base64 (DB-bloating JSONB) to the
// 'brand-screenshots' Storage bucket, returning public URLs for display.

import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'brand-screenshots';

export interface ScreenshotUploadResult {
  storagePath: string;
  publicUrl: string;
}

/**
 * Detect MIME type from a base64 data-URI prefix or raw base64 string.
 * Returns { mimeType, extension, cleanBase64 } where cleanBase64 has the
 * `data:...;base64,` prefix stripped if present.
 */
export function parseBase64Screenshot(base64Data: string): {
  mimeType: string;
  extension: string;
  cleanBase64: string;
} {
  // Match data URI prefix: data:image/png;base64,...
  const prefixMatch = base64Data.match(/^data:(image\/\w+);base64,/);
  if (prefixMatch) {
    const mimeType = prefixMatch[1];
    const extension = mimeType === 'image/png' ? 'png'
      : mimeType === 'image/webp' ? 'webp'
      : 'jpg';
    return {
      mimeType,
      extension,
      cleanBase64: base64Data.slice(prefixMatch[0].length),
    };
  }

  // No prefix — try to sniff from the first few bytes of the raw base64
  // PNG starts with iVBOR, WebP starts with UklG (RIFF)
  if (base64Data.startsWith('iVBOR')) {
    return { mimeType: 'image/png', extension: 'png', cleanBase64: base64Data };
  }
  if (base64Data.startsWith('UklG')) {
    return { mimeType: 'image/webp', extension: 'webp', cleanBase64: base64Data };
  }

  // Default to JPEG
  return { mimeType: 'image/jpeg', extension: 'jpg', cleanBase64: base64Data };
}

/**
 * Build a storage path for a screenshot.
 * Format: {projectId}/{context}/{timestamp}.{ext}
 */
export function buildStoragePath(
  projectId: string,
  context: string,
  extension: string,
  suffix?: string
): string {
  const ts = Date.now();
  const safeSuffix = suffix ? `-${suffix}` : '';
  return `${projectId}/${context}/${ts}${safeSuffix}.${extension}`;
}

/**
 * Upload a base64 screenshot to Supabase Storage.
 * Returns the storage path and public URL, or null on failure.
 */
export async function uploadScreenshot(
  supabase: SupabaseClient,
  projectId: string,
  context: string,
  base64Data: string
): Promise<ScreenshotUploadResult | null> {
  try {
    const { mimeType, extension, cleanBase64 } = parseBase64Screenshot(base64Data);
    const storagePath = buildStoragePath(projectId, context, extension);

    // Convert base64 to Uint8Array for upload
    const binaryStr = atob(cleanBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, bytes, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      console.warn('[ScreenshotStorage] upload failed:', error.message);
      return null;
    }

    const publicUrl = getScreenshotUrl(supabase, storagePath);
    return { storagePath, publicUrl };
  } catch (err) {
    console.warn('[ScreenshotStorage] uploadScreenshot exception:', err);
    return null;
  }
}

/**
 * Get a public URL for a storage path.
 */
export function getScreenshotUrl(
  supabase: SupabaseClient,
  storagePath: string
): string {
  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Upload element screenshots from a style guide to Storage.
 * Returns a map of elementId -> storagePath.
 */
export async function uploadElementScreenshots(
  supabase: SupabaseClient,
  projectId: string,
  styleGuideId: string,
  elements: Array<{ id: string; elementScreenshotBase64?: string }>
): Promise<Map<string, string>> {
  const paths = new Map<string, string>();

  for (const element of elements) {
    if (!element.elementScreenshotBase64) continue;

    const result = await uploadScreenshot(
      supabase,
      projectId,
      `style-guide-element/${styleGuideId}`,
      element.elementScreenshotBase64
    );

    if (result) {
      paths.set(element.id, result.storagePath);
    }
  }

  return paths;
}

/**
 * Delete screenshots for a project/context prefix.
 */
export async function deleteScreenshots(
  supabase: SupabaseClient,
  projectId: string,
  context: string
): Promise<void> {
  try {
    const prefix = `${projectId}/${context}/`;
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET)
      .list(`${projectId}/${context}`);

    if (listError || !files || files.length === 0) return;

    const filePaths = files.map(f => `${prefix}${f.name}`);
    const { error: deleteError } = await supabase.storage
      .from(BUCKET)
      .remove(filePaths);

    if (deleteError) {
      console.warn('[ScreenshotStorage] deleteScreenshots error:', deleteError.message);
    }
  } catch (err) {
    console.warn('[ScreenshotStorage] deleteScreenshots exception:', err);
  }
}
