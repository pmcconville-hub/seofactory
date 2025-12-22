/**
 * Hero Image Composer Service
 *
 * Client-side canvas composition for hero images.
 * Renders layers to canvas and exports to various formats.
 */

import {
  HeroImageComposition,
  HeroLayerConfig,
  BackgroundLayerConfig,
  CentralObjectLayerConfig,
  TextOverlayLayerConfig,
  LogoLayerConfig,
  HeroImageMetadata
} from '../../../types';
import { embedMetadataInBlob, generateImageObjectSchema } from './metadataEmbedder';
import { validateComposition, canExport } from './semanticValidator';

// ============================================
// TYPES
// ============================================

export interface CompositionResult {
  success: boolean;
  blob?: Blob;
  dataUrl?: string;
  metadata?: HeroImageMetadata;
  schemaJson?: object;
  error?: string;
}

export interface CompositionOptions {
  format: 'jpeg' | 'webp' | 'png';
  quality: number;
  embedMetadata: boolean;
  generateSchema: boolean;
  pageUrl?: string;
}

// ============================================
// IMAGE LOADING CACHE
// ============================================

const imageCache = new Map<string, HTMLImageElement>();

/**
 * Load an image with caching
 */
async function loadImage(url: string): Promise<HTMLImageElement> {
  if (imageCache.has(url)) {
    return imageCache.get(url)!;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      imageCache.set(url, img);
      resolve(img);
    };

    img.onerror = () => {
      reject(new Error(`Failed to load image: ${url}`));
    };

    img.src = url;
  });
}

/**
 * Clear the image cache
 */
export function clearImageCache(): void {
  imageCache.clear();
}

// ============================================
// LAYER RENDERING
// ============================================

/**
 * Render background layer
 */
async function renderBackgroundLayer(
  ctx: CanvasRenderingContext2D,
  layer: BackgroundLayerConfig,
  canvasWidth: number,
  canvasHeight: number
): Promise<void> {
  if (!layer.visible) return;

  ctx.globalAlpha = layer.opacity / 100;

  if (layer.imageUrl) {
    try {
      const img = await loadImage(layer.imageUrl);

      // Cover the entire canvas while maintaining aspect ratio
      const imgAspect = img.width / img.height;
      const canvasAspect = canvasWidth / canvasHeight;

      let drawWidth: number;
      let drawHeight: number;
      let offsetX: number;
      let offsetY: number;

      if (imgAspect > canvasAspect) {
        // Image is wider - fit to height
        drawHeight = canvasHeight;
        drawWidth = canvasHeight * imgAspect;
        offsetX = (canvasWidth - drawWidth) / 2;
        offsetY = 0;
      } else {
        // Image is taller - fit to width
        drawWidth = canvasWidth;
        drawHeight = canvasWidth / imgAspect;
        offsetX = 0;
        offsetY = (canvasHeight - drawHeight) / 2;
      }

      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    } catch (error) {
      console.warn('[Composer] Failed to render background image:', error);
      // Fill with placeholder color
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
  } else if (layer.source === 'color') {
    // Solid color background
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  ctx.globalAlpha = 1;
}

/**
 * Render central object layer
 */
async function renderCentralObjectLayer(
  ctx: CanvasRenderingContext2D,
  layer: CentralObjectLayerConfig,
  canvasWidth: number,
  canvasHeight: number
): Promise<void> {
  if (!layer.visible || !layer.imageUrl) return;

  ctx.globalAlpha = layer.opacity / 100;

  try {
    const img = await loadImage(layer.imageUrl);

    // Calculate position in pixels
    const x = (layer.position.x / 100) * canvasWidth;
    const y = (layer.position.y / 100) * canvasHeight;
    const width = (layer.position.width / 100) * canvasWidth;
    const height = (layer.position.height / 100) * canvasHeight;

    // Preserve aspect ratio (contain)
    const imgAspect = img.width / img.height;
    const boxAspect = width / height;

    let drawWidth: number;
    let drawHeight: number;
    let drawX: number;
    let drawY: number;

    if (imgAspect > boxAspect) {
      // Image is wider - fit to width
      drawWidth = width;
      drawHeight = width / imgAspect;
      drawX = x;
      drawY = y + (height - drawHeight) / 2;
    } else {
      // Image is taller - fit to height
      drawHeight = height;
      drawWidth = height * imgAspect;
      drawX = x + (width - drawWidth) / 2;
      drawY = y;
    }

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  } catch (error) {
    console.warn('[Composer] Failed to render central object:', error);
  }

  ctx.globalAlpha = 1;
}

/**
 * Render text overlay layer
 */
function renderTextOverlayLayer(
  ctx: CanvasRenderingContext2D,
  layer: TextOverlayLayerConfig,
  canvasWidth: number,
  canvasHeight: number
): void {
  if (!layer.visible || !layer.text) return;

  ctx.globalAlpha = layer.opacity / 100;

  // Calculate position in pixels
  const x = (layer.position.x / 100) * canvasWidth;
  const y = (layer.position.y / 100) * canvasHeight;
  const width = (layer.position.width / 100) * canvasWidth;
  const height = (layer.position.height / 100) * canvasHeight;

  // Draw background if set
  if (layer.backgroundColor && layer.backgroundColor !== 'transparent') {
    ctx.fillStyle = layer.backgroundColor;
    ctx.fillRect(x, y, width, height);
  }

  // Setup text style
  const fontSize = layer.fontSize || 48;
  const scaledFontSize = Math.round((fontSize / 1200) * canvasWidth); // Scale relative to 1200px width

  ctx.font = `${layer.fontWeight || 700} ${scaledFontSize}px ${layer.fontFamily || 'sans-serif'}`;
  ctx.fillStyle = layer.textColor || '#ffffff';
  ctx.textBaseline = 'middle';

  // Text alignment
  let textX: number;
  const padding = (layer.padding || 16) * (canvasWidth / 1200);

  switch (layer.textAlign || 'center') {
    case 'left':
      ctx.textAlign = 'left';
      textX = x + padding;
      break;
    case 'right':
      ctx.textAlign = 'right';
      textX = x + width - padding;
      break;
    case 'center':
    default:
      ctx.textAlign = 'center';
      textX = x + width / 2;
      break;
  }

  // Word wrapping
  const maxWidth = width - padding * 2;
  const lineHeight = scaledFontSize * 1.2;
  const words = layer.text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  // Center lines vertically
  const totalTextHeight = lines.length * lineHeight;
  const textY = y + height / 2;
  let currentY = textY - totalTextHeight / 2 + lineHeight / 2;

  for (const line of lines) {
    ctx.fillText(line, textX, currentY);
    currentY += lineHeight;
  }

  ctx.globalAlpha = 1;
}

/**
 * Render logo layer
 */
async function renderLogoLayer(
  ctx: CanvasRenderingContext2D,
  layer: LogoLayerConfig,
  canvasWidth: number,
  canvasHeight: number
): Promise<void> {
  if (!layer.visible || !layer.imageUrl) return;

  ctx.globalAlpha = layer.opacity / 100;

  try {
    const img = await loadImage(layer.imageUrl);

    // Calculate position in pixels
    const x = (layer.position.x / 100) * canvasWidth;
    const y = (layer.position.y / 100) * canvasHeight;
    const width = (layer.position.width / 100) * canvasWidth;
    const height = (layer.position.height / 100) * canvasHeight;

    // Preserve aspect ratio (contain)
    const imgAspect = img.width / img.height;
    const boxAspect = width / height;

    let drawWidth: number;
    let drawHeight: number;
    let drawX: number;
    let drawY: number;

    if (imgAspect > boxAspect) {
      drawWidth = width;
      drawHeight = width / imgAspect;
      drawX = x;
      drawY = y + (height - drawHeight) / 2;
    } else {
      drawHeight = height;
      drawWidth = height * imgAspect;
      drawX = x + (width - drawWidth) / 2;
      drawY = y;
    }

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  } catch (error) {
    console.warn('[Composer] Failed to render logo:', error);
  }

  ctx.globalAlpha = 1;
}

// ============================================
// MAIN COMPOSITION FUNCTION
// ============================================

/**
 * Compose hero image from composition data
 */
export async function composeHeroImage(
  composition: HeroImageComposition,
  options: Partial<CompositionOptions> = {}
): Promise<CompositionResult> {
  const {
    format = 'jpeg',
    quality = 0.92,
    embedMetadata = true,
    generateSchema = true,
    pageUrl = ''
  } = options;

  try {
    // Validate composition
    const validation = validateComposition(composition);
    if (!canExport(composition)) {
      return {
        success: false,
        error: `Cannot export: ${validation.errors.join(', ')}`
      };
    }

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = composition.canvasWidth;
    canvas.height = composition.canvasHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { success: false, error: 'Failed to get canvas context' };
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Sort layers by zIndex
    const sortedLayers = [...composition.layers].sort((a, b) => a.zIndex - b.zIndex);

    // Render each layer
    for (const layer of sortedLayers) {
      switch (layer.type) {
        case 'background':
          await renderBackgroundLayer(ctx, layer, canvas.width, canvas.height);
          break;
        case 'centralObject':
          await renderCentralObjectLayer(ctx, layer, canvas.width, canvas.height);
          break;
        case 'textOverlay':
          renderTextOverlayLayer(ctx, layer, canvas.width, canvas.height);
          break;
        case 'logo':
          await renderLogoLayer(ctx, layer, canvas.width, canvas.height);
          break;
      }
    }

    // Export to blob
    const mimeType = `image/${format}`;
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => b ? resolve(b) : reject(new Error('Failed to create blob')),
        mimeType,
        quality
      );
    });

    // Embed metadata if requested and format supports it
    let finalBlob = blob;
    if (embedMetadata && format === 'jpeg') {
      finalBlob = await embedMetadataInBlob(blob, composition.metadata);
    }

    // Generate Schema.org JSON if requested
    let schemaJson: object | undefined;
    if (generateSchema) {
      schemaJson = generateImageObjectSchema(composition.metadata, '', pageUrl);
    }

    // Convert to data URL for convenience
    const dataUrl = await blobToDataUrl(finalBlob);

    return {
      success: true,
      blob: finalBlob,
      dataUrl,
      metadata: composition.metadata,
      schemaJson
    };
  } catch (error) {
    console.error('[Composer] Composition failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Quick preview render (no metadata, lower quality)
 */
export async function renderPreview(
  composition: HeroImageComposition,
  maxWidth: number = 600
): Promise<string | null> {
  try {
    // Calculate preview dimensions
    const aspectRatio = composition.canvasWidth / composition.canvasHeight;
    const previewWidth = Math.min(maxWidth, composition.canvasWidth);
    const previewHeight = previewWidth / aspectRatio;

    // Create scaled canvas
    const canvas = document.createElement('canvas');
    canvas.width = previewWidth;
    canvas.height = previewHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Scale context
    const scale = previewWidth / composition.canvasWidth;
    ctx.scale(scale, scale);

    // Sort and render layers
    const sortedLayers = [...composition.layers].sort((a, b) => a.zIndex - b.zIndex);

    for (const layer of sortedLayers) {
      switch (layer.type) {
        case 'background':
          await renderBackgroundLayer(ctx, layer, composition.canvasWidth, composition.canvasHeight);
          break;
        case 'centralObject':
          await renderCentralObjectLayer(ctx, layer, composition.canvasWidth, composition.canvasHeight);
          break;
        case 'textOverlay':
          renderTextOverlayLayer(ctx, layer, composition.canvasWidth, composition.canvasHeight);
          break;
        case 'logo':
          await renderLogoLayer(ctx, layer, composition.canvasWidth, composition.canvasHeight);
          break;
      }
    }

    return canvas.toDataURL('image/jpeg', 0.7);
  } catch (error) {
    console.error('[Composer] Preview render failed:', error);
    return null;
  }
}

/**
 * Render single layer for preview
 */
export async function renderLayerPreview(
  layer: HeroLayerConfig,
  canvasWidth: number,
  canvasHeight: number
): Promise<string | null> {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Render layer
    switch (layer.type) {
      case 'background':
        await renderBackgroundLayer(ctx, layer, canvasWidth, canvasHeight);
        break;
      case 'centralObject':
        await renderCentralObjectLayer(ctx, layer, canvasWidth, canvasHeight);
        break;
      case 'textOverlay':
        renderTextOverlayLayer(ctx, layer, canvasWidth, canvasHeight);
        break;
      case 'logo':
        await renderLogoLayer(ctx, layer, canvasWidth, canvasHeight);
        break;
    }

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('[Composer] Layer preview failed:', error);
    return null;
  }
}

// ============================================
// UTILITIES
// ============================================

/**
 * Convert Blob to Data URL
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Preload all images used in a composition
 */
export async function preloadCompositionImages(
  composition: HeroImageComposition
): Promise<void> {
  const urls: string[] = [];

  for (const layer of composition.layers) {
    if ('imageUrl' in layer && layer.imageUrl) {
      urls.push(layer.imageUrl);
    }
  }

  await Promise.all(urls.map(url => loadImage(url).catch(() => null)));
}
