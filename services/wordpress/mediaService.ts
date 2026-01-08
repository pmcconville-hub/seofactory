/**
 * WordPress Media Service
 *
 * Handles image uploads to WordPress media library including:
 * - Uploading images from Cloudinary URLs
 * - Hero image management
 * - Section image handling
 * - Placeholder replacement in content
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  WordPressMedia,
  MediaUploadInput,
  MediaUploadResult,
  WordPressMediaType
} from '../../types/wordpress';
import { verifiedInsert } from '../verifiedDatabaseService';
import { getAuthenticatedClient } from './connectionService';

// ============================================================================
// Types
// ============================================================================

export interface UploadResult {
  success: boolean;
  media?: WordPressMedia;
  wpResult?: MediaUploadResult;
  error?: string;
}

export interface BulkUploadResult {
  success: boolean;
  uploaded: WordPressMedia[];
  failed: Array<{ input: MediaUploadInput; error: string }>;
}

export interface PlaceholderImage {
  placeholderId: string;
  type: WordPressMediaType;
  altText: string;
  caption?: string;
  appImageUrl?: string;
}

// ============================================================================
// Image Upload Functions
// ============================================================================

/**
 * Upload a single image to WordPress from a URL
 */
export async function uploadImageToWordPress(
  supabase: SupabaseClient,
  userId: string,
  connectionId: string,
  publicationId: string | undefined,
  input: MediaUploadInput
): Promise<UploadResult> {
  try {
    // Get authenticated client
    const clientResult = await getAuthenticatedClient(supabase, userId, connectionId);
    if ('error' in clientResult) {
      return { success: false, error: clientResult.error };
    }

    const { client } = clientResult;

    // Fetch the image from the source URL
    const imageResponse = await fetch(input.file_url);
    if (!imageResponse.ok) {
      return {
        success: false,
        error: `Failed to fetch image from ${input.file_url}: ${imageResponse.status}`
      };
    }

    const imageBlob = await imageResponse.blob();

    // Determine filename
    const filename = input.filename || extractFilename(input.file_url);

    // Upload to WordPress
    const uploadResult = await client.uploadMedia(
      imageBlob,
      filename,
      input.alt_text,
      input.caption
    );

    if (!uploadResult.success || !uploadResult.data) {
      return {
        success: false,
        error: uploadResult.error || 'WordPress upload failed'
      };
    }

    const wpMedia = uploadResult.data;

    // Save media record to our database
    const mediaData = {
      connection_id: connectionId,
      publication_id: publicationId || null,
      app_image_url: input.file_url,
      image_type: input.image_type || null,
      placeholder_id: input.placeholder_id || null,
      wp_media_id: wpMedia.id,
      wp_media_url: wpMedia.source_url,
      wp_thumbnail_url: wpMedia.media_details?.sizes?.thumbnail?.source_url || null,
      alt_text: input.alt_text || wpMedia.alt_text || null,
      caption: input.caption || null,
      width: wpMedia.media_details?.width || null,
      height: wpMedia.media_details?.height || null,
      file_size: null, // Not easily available from WP response
      mime_type: imageBlob.type || null
    };

    const insertResult = await verifiedInsert(
      supabase,
      { table: 'wordpress_media', operationDescription: 'save media record' },
      mediaData,
      '*'
    );

    if (!insertResult.success) {
      // Upload succeeded but record failed - return partial success
      console.warn('[WP Media] Upload succeeded but failed to save record:', insertResult.error);
      return {
        success: true,
        wpResult: {
          wp_media_id: wpMedia.id,
          wp_media_url: wpMedia.source_url,
          wp_thumbnail_url: wpMedia.media_details?.sizes?.thumbnail?.source_url,
          width: wpMedia.media_details?.width,
          height: wpMedia.media_details?.height
        },
        error: 'Image uploaded but tracking record failed to save'
      };
    }

    return {
      success: true,
      media: insertResult.data as unknown as WordPressMedia,
      wpResult: {
        wp_media_id: wpMedia.id,
        wp_media_url: wpMedia.source_url,
        wp_thumbnail_url: wpMedia.media_details?.sizes?.thumbnail?.source_url,
        width: wpMedia.media_details?.width,
        height: wpMedia.media_details?.height
      }
    };
  } catch (error) {
    console.error('[WP Media] Upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    };
  }
}

/**
 * Upload multiple images in sequence
 */
export async function uploadMultipleImages(
  supabase: SupabaseClient,
  userId: string,
  connectionId: string,
  publicationId: string | undefined,
  inputs: MediaUploadInput[]
): Promise<BulkUploadResult> {
  const uploaded: WordPressMedia[] = [];
  const failed: Array<{ input: MediaUploadInput; error: string }> = [];

  for (const input of inputs) {
    // Add small delay between uploads to avoid rate limiting
    if (uploaded.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const result = await uploadImageToWordPress(
      supabase,
      userId,
      connectionId,
      publicationId,
      input
    );

    if (result.success && result.media) {
      uploaded.push(result.media);
    } else {
      failed.push({
        input,
        error: result.error || 'Unknown error'
      });
    }
  }

  return {
    success: failed.length === 0,
    uploaded,
    failed
  };
}

/**
 * Upload hero image for a publication
 */
export async function uploadHeroImage(
  supabase: SupabaseClient,
  userId: string,
  connectionId: string,
  publicationId: string,
  imageUrl: string,
  altText: string,
  caption?: string
): Promise<UploadResult> {
  return uploadImageToWordPress(
    supabase,
    userId,
    connectionId,
    publicationId,
    {
      file_url: imageUrl,
      filename: 'hero-image.jpg',
      alt_text: altText,
      caption,
      image_type: 'hero',
      placeholder_id: 'hero'
    }
  );
}

// ============================================================================
// Placeholder Handling
// ============================================================================

/**
 * Parse image placeholders from content
 * Format: [IMAGE:type|alt:Description|caption:Caption text]
 */
export function parseImagePlaceholders(content: string): PlaceholderImage[] {
  const placeholders: PlaceholderImage[] = [];
  const regex = /\[IMAGE:([^\]|]+)(?:\|([^\]]*))?\]/g;

  let match;
  while ((match = regex.exec(content)) !== null) {
    const typeOrId = match[1];
    const params = match[2] || '';

    // Parse parameters
    const paramMap: Record<string, string> = {};
    params.split('|').forEach(param => {
      const [key, ...valueParts] = param.split(':');
      if (key && valueParts.length > 0) {
        paramMap[key.trim()] = valueParts.join(':').trim();
      }
    });

    // Determine type
    let type: WordPressMediaType = 'section';
    if (typeOrId === 'hero') type = 'hero';
    else if (typeOrId.includes('diagram')) type = 'diagram';
    else if (typeOrId.includes('infographic')) type = 'infographic';
    else if (typeOrId.includes('schema')) type = 'schema';

    placeholders.push({
      placeholderId: typeOrId,
      type,
      altText: paramMap.alt || `Image for ${typeOrId}`,
      caption: paramMap.caption
    });
  }

  return placeholders;
}

/**
 * Replace image placeholders in content with WordPress URLs
 */
export function replacePlaceholdersWithUrls(
  content: string,
  mediaMap: Map<string, WordPressMedia>
): string {
  let result = content;

  // Replace each placeholder with its WordPress image
  mediaMap.forEach((media, placeholderId) => {
    // Build the regex to match this placeholder
    const escapedId = placeholderId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\[IMAGE:${escapedId}[^\\]]*\\]`, 'g');

    // Build the HTML image tag
    const imgHtml = buildImageHtml(media);

    result = result.replace(regex, imgHtml);
  });

  return result;
}

/**
 * Build WordPress-compatible image HTML
 */
function buildImageHtml(media: WordPressMedia): string {
  const classes = ['wp-image-' + media.wp_media_id];

  // Add alignment class based on type
  if (media.image_type === 'hero') {
    classes.push('aligncenter', 'size-full');
  } else if (media.image_type === 'infographic') {
    classes.push('aligncenter', 'size-large');
  } else {
    classes.push('alignnone', 'size-medium');
  }

  let html = `<img src="${escapeHtml(media.wp_media_url)}" `;
  html += `alt="${escapeHtml(media.alt_text || '')}" `;
  html += `class="${classes.join(' ')}" `;

  if (media.width) html += `width="${media.width}" `;
  if (media.height) html += `height="${media.height}" `;

  html += '/>';

  // Wrap in figure if there's a caption
  if (media.caption) {
    html = `<figure class="wp-block-image">${html}<figcaption>${escapeHtml(media.caption)}</figcaption></figure>`;
  }

  return html;
}

// ============================================================================
// Media Retrieval
// ============================================================================

/**
 * Get all media for a publication
 */
export async function getMediaForPublication(
  supabase: SupabaseClient,
  publicationId: string
): Promise<WordPressMedia[]> {
  const { data, error } = await supabase
    .from('wordpress_media')
    .select('*')
    .eq('publication_id', publicationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[WP Media] Failed to fetch media:', error);
    return [];
  }

  return data || [];
}

/**
 * Get media by placeholder ID for a publication
 */
export async function getMediaByPlaceholder(
  supabase: SupabaseClient,
  publicationId: string,
  placeholderId: string
): Promise<WordPressMedia | null> {
  const { data } = await supabase
    .from('wordpress_media')
    .select('*')
    .eq('publication_id', publicationId)
    .eq('placeholder_id', placeholderId)
    .single();

  return data;
}

/**
 * Build a map of placeholder IDs to media for content replacement
 */
export async function buildPlaceholderMediaMap(
  supabase: SupabaseClient,
  publicationId: string
): Promise<Map<string, WordPressMedia>> {
  const media = await getMediaForPublication(supabase, publicationId);
  const map = new Map<string, WordPressMedia>();

  media.forEach(m => {
    if (m.placeholder_id) {
      map.set(m.placeholder_id, m);
    }
  });

  return map;
}

// ============================================================================
// Utilities
// ============================================================================

function extractFilename(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop() || 'image.jpg';

    // Remove any query parameters from filename
    return filename.split('?')[0];
  } catch {
    return 'image.jpg';
  }
}

function escapeHtml(text: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  return text.replace(/[&<>"']/g, char => escapeMap[char] || char);
}
