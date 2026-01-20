/**
 * Image Selector for Social Media Posts
 *
 * Selects the optimal image for each platform based on:
 * - Aspect ratio requirements
 * - Image type (HERO for main posts, SECTION for detail posts)
 * - Availability of generated/uploaded images
 */

import type { SocialMediaPlatform } from '../../../types/social';

/**
 * Platform image requirements
 */
export const PLATFORM_IMAGE_REQUIREMENTS: Record<SocialMediaPlatform, {
  preferred_aspect_ratios: string[];
  optimal_dimensions: { width: number; height: number };
  orientation: 'landscape' | 'portrait' | 'square' | 'vertical';
  preferred_types: string[];
}> = {
  linkedin: {
    preferred_aspect_ratios: ['1.91:1', '1:1'],
    optimal_dimensions: { width: 1200, height: 627 },
    orientation: 'landscape',
    preferred_types: ['HERO', 'INFOGRAPHIC', 'CHART', 'SECTION']
  },
  twitter: {
    preferred_aspect_ratios: ['1.91:1', '16:9', '1:1'],
    optimal_dimensions: { width: 1200, height: 628 },
    orientation: 'landscape',
    preferred_types: ['HERO', 'CHART', 'INFOGRAPHIC', 'SECTION']
  },
  facebook: {
    preferred_aspect_ratios: ['1.91:1', '1:1', '4:5'],
    optimal_dimensions: { width: 1200, height: 628 },
    orientation: 'landscape',
    preferred_types: ['HERO', 'INFOGRAPHIC', 'SECTION']
  },
  instagram: {
    preferred_aspect_ratios: ['4:5', '1:1', '1.91:1'],
    optimal_dimensions: { width: 1080, height: 1350 },
    orientation: 'portrait',
    preferred_types: ['HERO', 'INFOGRAPHIC', 'SECTION', 'CHART']
  },
  pinterest: {
    preferred_aspect_ratios: ['2:3', '4:5', '1:1'],
    optimal_dimensions: { width: 1000, height: 1500 },
    orientation: 'vertical',
    preferred_types: ['INFOGRAPHIC', 'HERO', 'DIAGRAM', 'SECTION']
  }
};

/**
 * Image placeholder with extended properties
 */
export interface ImagePlaceholderExtended {
  id: string;
  type: string;
  alt_text: string;
  caption?: string;
  generated_url?: string;
  user_upload_url?: string;
  status?: 'placeholder' | 'generating' | 'uploaded' | 'generated' | 'error';
  specs?: {
    width: number;
    height: number;
    aspect_ratio?: string;
  };
}

/**
 * Selected image result
 */
export interface SelectedImage {
  placeholder_id: string;
  url?: string;
  alt_text: string;
  description: string;
  has_actual_image: boolean;
  recommended_dimensions: { width: number; height: number };
  aspect_ratio: string;
  match_score: number;
  type: string;
}

/**
 * Calculate aspect ratio match score
 * Returns 1.0 for perfect match, decreasing for worse matches
 */
function calculateAspectRatioScore(
  imageSpecs: { width: number; height: number; aspect_ratio?: string } | undefined,
  platformRequirements: typeof PLATFORM_IMAGE_REQUIREMENTS[SocialMediaPlatform]
): number {
  if (!imageSpecs) return 0.3; // Unknown dimensions get low score

  const imageRatio = imageSpecs.width / imageSpecs.height;
  const preferredRatios = platformRequirements.preferred_aspect_ratios;

  // Parse preferred ratios to numbers
  const targetRatios = preferredRatios.map(r => {
    const [w, h] = r.split(':').map(Number);
    return w / h;
  });

  // Find best match
  let bestScore = 0;
  for (let i = 0; i < targetRatios.length; i++) {
    const targetRatio = targetRatios[i];
    const diff = Math.abs(imageRatio - targetRatio) / targetRatio;
    // Score decreases with difference, priority decreases with index
    const priorityBonus = (preferredRatios.length - i) / preferredRatios.length;
    const score = Math.max(0, 1 - diff) * (0.5 + 0.5 * priorityBonus);
    bestScore = Math.max(bestScore, score);
  }

  return bestScore;
}

/**
 * Calculate type match score
 */
function calculateTypeScore(
  imageType: string,
  platformRequirements: typeof PLATFORM_IMAGE_REQUIREMENTS[SocialMediaPlatform]
): number {
  const preferredTypes = platformRequirements.preferred_types;
  const index = preferredTypes.indexOf(imageType);

  if (index === -1) return 0.3; // Unknown type

  // Score based on position in preference list
  return 1 - (index / preferredTypes.length) * 0.5;
}

/**
 * Calculate availability score
 * Images with actual URLs get higher scores
 */
function calculateAvailabilityScore(
  placeholder: ImagePlaceholderExtended
): number {
  if (placeholder.generated_url || placeholder.user_upload_url) {
    return 1.0; // Has actual image
  }
  if (placeholder.status === 'generating') {
    return 0.7; // Being generated
  }
  return 0.4; // Just a placeholder
}

/**
 * Select the best image for a specific platform
 */
export function selectImageForPlatform(
  images: ImagePlaceholderExtended[],
  platform: SocialMediaPlatform,
  options?: {
    preferHub?: boolean;
    postIndex?: number;
  }
): SelectedImage | null {
  if (!images || images.length === 0) {
    return null;
  }

  const requirements = PLATFORM_IMAGE_REQUIREMENTS[platform];
  const preferHub = options?.preferHub ?? true;
  const postIndex = options?.postIndex ?? 0;

  // Score each image
  const scoredImages = images.map((img, idx) => {
    const aspectScore = calculateAspectRatioScore(img.specs, requirements);
    const typeScore = calculateTypeScore(img.type, requirements);
    const availabilityScore = calculateAvailabilityScore(img);

    // Hub posts prefer HERO images, spoke posts can use others
    const hubBonus = preferHub && postIndex === 0 && img.type === 'HERO' ? 0.2 : 0;

    // For spoke posts, spread across different images
    const spokeBonus = !preferHub && idx === (postIndex % images.length) ? 0.1 : 0;

    const totalScore = (
      aspectScore * 0.35 +
      typeScore * 0.25 +
      availabilityScore * 0.40 +
      hubBonus +
      spokeBonus
    );

    return { image: img, score: totalScore, idx };
  });

  // Sort by score descending
  scoredImages.sort((a, b) => b.score - a.score);

  const best = scoredImages[0];
  if (!best) return null;

  const img = best.image;
  const url = img.generated_url || img.user_upload_url;

  return {
    placeholder_id: img.id,
    url,
    alt_text: img.alt_text,
    description: img.caption || img.alt_text,
    has_actual_image: !!url,
    recommended_dimensions: requirements.optimal_dimensions,
    aspect_ratio: requirements.preferred_aspect_ratios[0],
    match_score: best.score,
    type: img.type
  };
}

/**
 * Select images for all platforms in a campaign
 */
export function selectImagesForCampaign(
  images: ImagePlaceholderExtended[],
  platforms: SocialMediaPlatform[],
  hubPlatform: SocialMediaPlatform
): Record<SocialMediaPlatform, SelectedImage | null> {
  const result: Partial<Record<SocialMediaPlatform, SelectedImage | null>> = {};

  for (const platform of platforms) {
    const isHub = platform === hubPlatform;
    result[platform] = selectImageForPlatform(images, platform, {
      preferHub: isHub,
      postIndex: isHub ? 0 : platforms.indexOf(platform)
    });
  }

  return result as Record<SocialMediaPlatform, SelectedImage | null>;
}

/**
 * Get image instructions text when no actual image is available
 */
export function getImageInstructionsText(
  selected: SelectedImage | null,
  platform: SocialMediaPlatform
): string {
  if (!selected) {
    const req = PLATFORM_IMAGE_REQUIREMENTS[platform];
    return `Create an image at ${req.optimal_dimensions.width}×${req.optimal_dimensions.height} (${req.preferred_aspect_ratios[0]} aspect ratio)`;
  }

  if (selected.has_actual_image) {
    return `Use image: ${selected.url}`;
  }

  return `Image needed: ${selected.description}
Recommended size: ${selected.recommended_dimensions.width}×${selected.recommended_dimensions.height}
Aspect ratio: ${selected.aspect_ratio}
Alt text: ${selected.alt_text}`;
}

/**
 * Check if an image needs resizing for a platform
 */
export function needsResizeForPlatform(
  imageSpecs: { width: number; height: number } | undefined,
  platform: SocialMediaPlatform
): boolean {
  if (!imageSpecs) return true;

  const requirements = PLATFORM_IMAGE_REQUIREMENTS[platform];
  const targetRatio = requirements.optimal_dimensions.width / requirements.optimal_dimensions.height;
  const imageRatio = imageSpecs.width / imageSpecs.height;

  // Allow 5% tolerance
  const tolerance = 0.05;
  return Math.abs(imageRatio - targetRatio) / targetRatio > tolerance;
}

/**
 * Get resize recommendations for all platforms
 */
export function getResizeRecommendations(
  imageSpecs: { width: number; height: number },
  platforms: SocialMediaPlatform[]
): Array<{
  platform: SocialMediaPlatform;
  needs_resize: boolean;
  current: { width: number; height: number };
  recommended: { width: number; height: number };
  aspect_ratio: string;
}> {
  return platforms.map(platform => {
    const requirements = PLATFORM_IMAGE_REQUIREMENTS[platform];
    return {
      platform,
      needs_resize: needsResizeForPlatform(imageSpecs, platform),
      current: imageSpecs,
      recommended: requirements.optimal_dimensions,
      aspect_ratio: requirements.preferred_aspect_ratios[0]
    };
  });
}
