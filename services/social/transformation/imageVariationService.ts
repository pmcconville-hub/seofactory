/**
 * Image Variation Service
 *
 * Generates platform-specific image variations from source images.
 * Handles resizing, cropping, and format optimization for each social platform.
 */

import type { SocialMediaPlatform } from '../../../types/social';
import { PLATFORM_IMAGE_REQUIREMENTS } from './imageSelector';
import { convertFormat, getImageDimensions } from '../../ai/imageGeneration/formatConverter';

/**
 * Variation generation options
 */
export interface VariationOptions {
  sourceUrl: string;
  platform: SocialMediaPlatform;
  cropMode?: 'fit' | 'fill' | 'center';
  quality?: number;
}

/**
 * Variation result
 */
export interface VariationResult {
  success: boolean;
  dataUrl?: string;
  blob?: Blob;
  dimensions: {
    width: number;
    height: number;
    aspect_ratio: string;
  };
  originalDimensions?: {
    width: number;
    height: number;
  };
  error?: string;
}

/**
 * Fetch image as blob from URL
 */
async function fetchImageAsBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  return response.blob();
}

/**
 * Create canvas with image
 */
async function loadImageToCanvas(blob: Blob): Promise<{
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  img: HTMLImageElement;
}> {
  const url = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      resolve({ canvas, ctx, img });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Crop/resize image to target dimensions
 */
function cropAndResize(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  mode: 'fit' | 'fill' | 'center'
): void {
  const sourceWidth = img.width;
  const sourceHeight = img.height;
  const targetRatio = targetWidth / targetHeight;
  const sourceRatio = sourceWidth / sourceHeight;

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  let sx = 0, sy = 0, sw = sourceWidth, sh = sourceHeight;
  let dx = 0, dy = 0, dw = targetWidth, dh = targetHeight;

  if (mode === 'fit') {
    // Fit entire image, may have letterboxing
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    if (sourceRatio > targetRatio) {
      // Source is wider - fit to width
      dw = targetWidth;
      dh = targetWidth / sourceRatio;
      dy = (targetHeight - dh) / 2;
    } else {
      // Source is taller - fit to height
      dh = targetHeight;
      dw = targetHeight * sourceRatio;
      dx = (targetWidth - dw) / 2;
    }
  } else if (mode === 'fill' || mode === 'center') {
    // Fill canvas, crop excess
    if (sourceRatio > targetRatio) {
      // Source is wider - crop sides
      sw = sourceHeight * targetRatio;
      sx = (sourceWidth - sw) / 2;
    } else {
      // Source is taller - crop top/bottom
      sh = sourceWidth / targetRatio;
      sy = (sourceHeight - sh) / 2;
    }
  }

  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

/**
 * Generate a platform-specific image variation
 */
export async function generatePlatformVariation(
  options: VariationOptions
): Promise<VariationResult> {
  const { sourceUrl, platform, cropMode = 'fill', quality = 90 } = options;
  const requirements = PLATFORM_IMAGE_REQUIREMENTS[platform];

  try {
    // Fetch source image
    const blob = await fetchImageAsBlob(sourceUrl);
    const originalDimensions = await getImageDimensions(blob);

    // Load to canvas
    const { canvas, ctx, img } = await loadImageToCanvas(blob);

    // Crop and resize
    cropAndResize(
      ctx,
      canvas,
      img,
      requirements.optimal_dimensions.width,
      requirements.optimal_dimensions.height,
      cropMode
    );

    // Convert to blob
    const resultBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => b ? resolve(b) : reject(new Error('Failed to create blob')),
        'image/jpeg',
        quality / 100
      );
    });

    // Convert to optimized format
    const converted = await convertFormat(resultBlob, {
      format: 'webp',
      quality,
      maxWidth: requirements.optimal_dimensions.width,
      maxHeight: requirements.optimal_dimensions.height
    });

    if (!converted.success) {
      throw new Error(converted.error || 'Conversion failed');
    }

    return {
      success: true,
      dataUrl: converted.dataUrl,
      blob: converted.blob,
      dimensions: {
        width: requirements.optimal_dimensions.width,
        height: requirements.optimal_dimensions.height,
        aspect_ratio: requirements.preferred_aspect_ratios[0]
      },
      originalDimensions
    };
  } catch (error) {
    console.error('[ImageVariationService] Failed to generate variation:', error);
    return {
      success: false,
      dimensions: {
        width: requirements.optimal_dimensions.width,
        height: requirements.optimal_dimensions.height,
        aspect_ratio: requirements.preferred_aspect_ratios[0]
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generate variations for multiple platforms
 */
export async function generateMultiplePlatformVariations(
  sourceUrl: string,
  platforms: SocialMediaPlatform[],
  options?: { cropMode?: 'fit' | 'fill' | 'center'; quality?: number }
): Promise<Record<SocialMediaPlatform, VariationResult>> {
  const results: Partial<Record<SocialMediaPlatform, VariationResult>> = {};

  for (const platform of platforms) {
    results[platform] = await generatePlatformVariation({
      sourceUrl,
      platform,
      cropMode: options?.cropMode,
      quality: options?.quality
    });
  }

  return results as Record<SocialMediaPlatform, VariationResult>;
}

/**
 * Check if image needs resizing for platform
 */
export function analyzeImageForPlatform(
  imageUrl: string | undefined,
  imageDimensions: { width: number; height: number } | undefined,
  platform: SocialMediaPlatform
): {
  hasImage: boolean;
  needsResize: boolean;
  currentRatio: string | null;
  targetRatio: string;
  recommendation: string;
} {
  const requirements = PLATFORM_IMAGE_REQUIREMENTS[platform];

  if (!imageUrl || !imageDimensions) {
    return {
      hasImage: false,
      needsResize: true,
      currentRatio: null,
      targetRatio: requirements.preferred_aspect_ratios[0],
      recommendation: 'No image available. Generate or upload an image.'
    };
  }

  const currentRatio = imageDimensions.width / imageDimensions.height;
  const targetRatio = requirements.optimal_dimensions.width / requirements.optimal_dimensions.height;
  const ratioDiff = Math.abs(currentRatio - targetRatio) / targetRatio;

  const needsResize = ratioDiff > 0.05; // 5% tolerance

  let recommendation: string;
  if (!needsResize) {
    recommendation = 'Image dimensions are optimal for this platform.';
  } else if (currentRatio > targetRatio) {
    recommendation = `Image is too wide (${imageDimensions.width}x${imageDimensions.height}). Generate a ${requirements.orientation} variation for best results.`;
  } else {
    recommendation = `Image is too tall (${imageDimensions.width}x${imageDimensions.height}). Generate a ${requirements.orientation} variation for best results.`;
  }

  return {
    hasImage: true,
    needsResize,
    currentRatio: `${imageDimensions.width}:${imageDimensions.height}`,
    targetRatio: requirements.preferred_aspect_ratios[0],
    recommendation
  };
}

/**
 * Get platform image requirements summary
 */
export function getPlatformImageSummary(platform: SocialMediaPlatform): {
  dimensions: string;
  aspectRatio: string;
  orientation: string;
  tips: string[];
} {
  const req = PLATFORM_IMAGE_REQUIREMENTS[platform];

  const tips: string[] = [];
  switch (platform) {
    case 'linkedin':
      tips.push('Landscape images work best for link posts');
      tips.push('Professional, clean imagery performs well');
      break;
    case 'twitter':
      tips.push('Images are cropped to 16:9 in the timeline');
      tips.push('Keep important content in the center');
      break;
    case 'facebook':
      tips.push('Square and landscape formats both work well');
      tips.push('Avoid text-heavy images (20% text rule)');
      break;
    case 'instagram':
      tips.push('Portrait (4:5) gets more screen space in feeds');
      tips.push('High-quality, visually striking images perform best');
      break;
    case 'pinterest':
      tips.push('Vertical 2:3 pins get 60% more repins');
      tips.push('Use text overlays for how-to and listicle content');
      break;
  }

  return {
    dimensions: `${req.optimal_dimensions.width} × ${req.optimal_dimensions.height}`,
    aspectRatio: req.preferred_aspect_ratios[0],
    orientation: req.orientation,
    tips
  };
}
