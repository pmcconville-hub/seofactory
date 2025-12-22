/**
 * Format Converter Service
 *
 * Handles image format conversion and optimization.
 * Supports AVIF, WebP, JPEG, and PNG with quality settings.
 */

import imageCompression from 'browser-image-compression';

// ============================================
// TYPES
// ============================================

export interface ConversionOptions {
  format: 'avif' | 'webp' | 'jpeg' | 'png';
  quality: number; // 0-100
  maxWidth?: number;
  maxHeight?: number;
  maxSizeMB?: number;
}

export interface ConversionResult {
  success: boolean;
  blob?: Blob;
  dataUrl?: string;
  originalSize: number;
  newSize: number;
  compressionRatio: number;
  format: string;
  error?: string;
}

// ============================================
// FORMAT SUPPORT DETECTION
// ============================================

let avifSupported: boolean | null = null;
let webpSupported: boolean | null = null;

/**
 * Check if AVIF format is supported
 */
export async function isAvifSupported(): Promise<boolean> {
  if (avifSupported !== null) return avifSupported;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;

    // Try to export as AVIF
    const dataUrl = canvas.toDataURL('image/avif');
    avifSupported = dataUrl.startsWith('data:image/avif');
    return avifSupported;
  } catch {
    avifSupported = false;
    return false;
  }
}

/**
 * Check if WebP format is supported
 */
export async function isWebpSupported(): Promise<boolean> {
  if (webpSupported !== null) return webpSupported;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;

    const dataUrl = canvas.toDataURL('image/webp');
    webpSupported = dataUrl.startsWith('data:image/webp');
    return webpSupported;
  } catch {
    webpSupported = false;
    return false;
  }
}

/**
 * Get best supported format (AVIF > WebP > JPEG)
 */
export async function getBestFormat(): Promise<'avif' | 'webp' | 'jpeg'> {
  if (await isAvifSupported()) return 'avif';
  if (await isWebpSupported()) return 'webp';
  return 'jpeg';
}

// ============================================
// CONVERSION FUNCTIONS
// ============================================

/**
 * Convert image blob to specified format
 */
export async function convertFormat(
  blob: Blob,
  options: ConversionOptions
): Promise<ConversionResult> {
  const originalSize = blob.size;

  try {
    const { format, quality, maxWidth, maxHeight, maxSizeMB } = options;

    // Check format support
    if (format === 'avif' && !(await isAvifSupported())) {
      console.warn('[FormatConverter] AVIF not supported, falling back to WebP');
      return convertFormat(blob, { ...options, format: 'webp' });
    }

    if (format === 'webp' && !(await isWebpSupported())) {
      console.warn('[FormatConverter] WebP not supported, falling back to JPEG');
      return convertFormat(blob, { ...options, format: 'jpeg' });
    }

    // Get mime type
    const mimeType = getMimeType(format);

    // Create image from blob
    const img = await blobToImage(blob);

    // Calculate dimensions
    let targetWidth = img.width;
    let targetHeight = img.height;

    if (maxWidth && img.width > maxWidth) {
      const scale = maxWidth / img.width;
      targetWidth = maxWidth;
      targetHeight = Math.round(img.height * scale);
    }

    if (maxHeight && targetHeight > maxHeight) {
      const scale = maxHeight / targetHeight;
      targetHeight = maxHeight;
      targetWidth = Math.round(targetWidth * scale);
    }

    // Create canvas and draw image
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    // Convert to blob
    let newBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => b ? resolve(b) : reject(new Error('Failed to create blob')),
        mimeType,
        quality / 100
      );
    });

    // Additional compression if maxSizeMB specified and size exceeds
    if (maxSizeMB && newBlob.size > maxSizeMB * 1024 * 1024) {
      const compressionOptions = {
        maxSizeMB,
        maxWidthOrHeight: Math.max(targetWidth, targetHeight),
        useWebWorker: true,
        fileType: mimeType
      };

      const file = new File([newBlob], `image.${format}`, { type: mimeType });
      const compressedFile = await imageCompression(file, compressionOptions);
      newBlob = compressedFile;
    }

    // Create data URL
    const dataUrl = await blobToDataUrl(newBlob);

    return {
      success: true,
      blob: newBlob,
      dataUrl,
      originalSize,
      newSize: newBlob.size,
      compressionRatio: originalSize / newBlob.size,
      format
    };
  } catch (error) {
    console.error('[FormatConverter] Conversion failed:', error);
    return {
      success: false,
      originalSize,
      newSize: 0,
      compressionRatio: 0,
      format: options.format,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Convert data URL to specified format
 */
export async function convertDataUrl(
  dataUrl: string,
  options: ConversionOptions
): Promise<ConversionResult> {
  const blob = dataUrlToBlob(dataUrl);
  return convertFormat(blob, options);
}

/**
 * Optimize image for web (auto-select best format)
 */
export async function optimizeForWeb(
  blob: Blob,
  options?: Partial<ConversionOptions>
): Promise<ConversionResult> {
  const format = await getBestFormat();

  return convertFormat(blob, {
    format,
    quality: options?.quality ?? 85,
    maxWidth: options?.maxWidth,
    maxHeight: options?.maxHeight,
    maxSizeMB: options?.maxSizeMB ?? 2 // Default 2MB max
  });
}

/**
 * Create responsive image set
 */
export async function createResponsiveSet(
  blob: Blob,
  widths: number[] = [400, 800, 1200, 1600],
  format?: 'avif' | 'webp' | 'jpeg'
): Promise<Map<number, ConversionResult>> {
  const targetFormat = format || await getBestFormat();
  const results = new Map<number, ConversionResult>();

  for (const width of widths) {
    const result = await convertFormat(blob, {
      format: targetFormat,
      quality: 85,
      maxWidth: width
    });
    results.set(width, result);
  }

  return results;
}

// ============================================
// COMPRESSION
// ============================================

/**
 * Compress image to target size
 */
export async function compressToSize(
  blob: Blob,
  targetSizeMB: number,
  format?: 'avif' | 'webp' | 'jpeg'
): Promise<ConversionResult> {
  const targetFormat = format || await getBestFormat();

  const options = {
    maxSizeMB: targetSizeMB,
    maxWidthOrHeight: 2400,
    useWebWorker: true,
    fileType: getMimeType(targetFormat)
  };

  try {
    const file = new File([blob], `image.${targetFormat}`, { type: getMimeType(targetFormat) });
    const compressedFile = await imageCompression(file, options);

    return {
      success: true,
      blob: compressedFile,
      dataUrl: await blobToDataUrl(compressedFile),
      originalSize: blob.size,
      newSize: compressedFile.size,
      compressionRatio: blob.size / compressedFile.size,
      format: targetFormat
    };
  } catch (error) {
    return {
      success: false,
      originalSize: blob.size,
      newSize: 0,
      compressionRatio: 0,
      format: targetFormat,
      error: error instanceof Error ? error.message : 'Compression failed'
    };
  }
}

// ============================================
// FORMAT UTILITIES
// ============================================

/**
 * Get MIME type for format
 */
export function getMimeType(format: string): string {
  switch (format.toLowerCase()) {
    case 'avif':
      return 'image/avif';
    case 'webp':
      return 'image/webp';
    case 'png':
      return 'image/png';
    case 'jpeg':
    case 'jpg':
      return 'image/jpeg';
    default:
      return 'image/jpeg';
  }
}

/**
 * Get file extension for format
 */
export function getExtension(format: string): string {
  switch (format.toLowerCase()) {
    case 'avif':
      return '.avif';
    case 'webp':
      return '.webp';
    case 'png':
      return '.png';
    case 'jpeg':
    case 'jpg':
    default:
      return '.jpg';
  }
}

/**
 * Detect format from MIME type or data URL
 */
export function detectFormat(input: string | Blob): string {
  if (typeof input === 'string') {
    // Data URL
    if (input.startsWith('data:image/avif')) return 'avif';
    if (input.startsWith('data:image/webp')) return 'webp';
    if (input.startsWith('data:image/png')) return 'png';
    if (input.startsWith('data:image/jpeg') || input.startsWith('data:image/jpg')) return 'jpeg';
    return 'unknown';
  } else {
    // Blob
    if (input.type.includes('avif')) return 'avif';
    if (input.type.includes('webp')) return 'webp';
    if (input.type.includes('png')) return 'png';
    if (input.type.includes('jpeg') || input.type.includes('jpg')) return 'jpeg';
    return 'unknown';
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Convert Blob to Image element
 */
function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

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
 * Convert Data URL to Blob
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new Blob([u8arr], { type: mime });
}

/**
 * Get image dimensions from blob
 */
export async function getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  const img = await blobToImage(blob);
  return { width: img.width, height: img.height };
}

/**
 * Calculate estimated file size for given quality
 */
export function estimateFileSize(
  originalSize: number,
  quality: number,
  format: string
): number {
  // Rough estimation based on format and quality
  const formatMultiplier = {
    avif: 0.5,
    webp: 0.65,
    jpeg: 0.8,
    png: 1.0
  };

  const qualityMultiplier = quality / 100;
  const baseMultiplier = formatMultiplier[format as keyof typeof formatMultiplier] || 0.8;

  return Math.round(originalSize * baseMultiplier * qualityMultiplier);
}
