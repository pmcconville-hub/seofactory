/**
 * Metadata Embedder for Hero Images
 *
 * Embeds IPTC/EXIF metadata into image files using piexifjs
 * for client-side metadata embedding without server round-trips.
 *
 * Features:
 * - EXIF metadata (artist, copyright, description)
 * - IPTC metadata (creator, copyright, caption, headline, keywords)
 * - Schema.org ImageObject JSON generation
 * - Metadata extraction from existing images
 */

import piexif from 'piexifjs';
import {
  HeroImageMetadata,
  HeroIPTCMetadata,
  HeroEXIFMetadata,
  HeroSchemaOrgMetadata
} from '../../../types';

// ============================================
// TYPE DEFINITIONS FOR PIEXIFJS
// ============================================

// piexifjs doesn't have proper TypeScript types, so we define them here
type PiexifDict = {
  '0th': Record<number, string | number | number[]>;
  Exif: Record<number, string | number | number[]>;
  GPS: Record<number, string | number | number[]>;
  Interop: Record<number, string | number | number[]>;
  '1st': Record<number, string | number | number[]>;
  thumbnail: string | null;
};

// ============================================
// CONSTANTS
// ============================================

/**
 * EXIF IFD tags used for metadata
 * Reference: https://exiftool.org/TagNames/EXIF.html
 */
const EXIF_TAGS = {
  // IFD0 (0th) tags
  ImageDescription: 270,
  Make: 271,
  Model: 272,
  Software: 305,
  DateTime: 306,
  Artist: 315,
  Copyright: 33432,

  // EXIF IFD tags
  DateTimeOriginal: 36867,
  DateTimeDigitized: 36868,
  UserComment: 37510
} as const;

/**
 * IPTC tags - Note: piexifjs has limited IPTC support
 * We store IPTC data in EXIF UserComment as JSON fallback
 */
const IPTC_TAGS = {
  ObjectName: 5,
  EditStatus: 7,
  Urgency: 10,
  Category: 15,
  SupplementalCategory: 20,
  Keywords: 25,
  SpecialInstructions: 40,
  DateCreated: 55,
  TimeCreated: 60,
  Byline: 80,
  BylineTitle: 85,
  City: 90,
  SubLocation: 92,
  ProvinceState: 95,
  CountryCode: 100,
  Country: 101,
  OriginalTransmissionReference: 103,
  Headline: 105,
  Credit: 110,
  Source: 115,
  CopyrightNotice: 116,
  Caption: 120,
  Writer: 122
} as const;

// ============================================
// METADATA EMBEDDING
// ============================================

/**
 * Embed metadata into a JPEG image
 * Note: piexifjs only works with JPEG format
 *
 * @param imageDataUrl - Base64 data URL of the JPEG image
 * @param metadata - Metadata to embed
 * @returns Base64 data URL with embedded metadata
 */
export const embedMetadataInJpeg = (
  imageDataUrl: string,
  metadata: HeroImageMetadata
): string => {
  try {
    // Validate input
    if (!imageDataUrl.startsWith('data:image/jpeg') && !imageDataUrl.startsWith('data:image/jpg')) {
      console.warn('[MetadataEmbedder] Image is not JPEG format. Converting or skipping metadata embedding.');
      // Return original if not JPEG
      return imageDataUrl;
    }

    // Create EXIF dict
    const exifDict: PiexifDict = {
      '0th': {},
      Exif: {},
      GPS: {},
      Interop: {},
      '1st': {},
      thumbnail: null
    };

    // Set 0th IFD (main image) tags
    if (metadata.exif?.imageDescription || metadata.altText) {
      exifDict['0th'][EXIF_TAGS.ImageDescription] = metadata.exif?.imageDescription || metadata.altText;
    }

    if (metadata.exif?.artist || metadata.iptc?.creator) {
      exifDict['0th'][EXIF_TAGS.Artist] = metadata.exif?.artist || metadata.iptc?.creator || '';
    }

    if (metadata.exif?.copyright || metadata.iptc?.copyright) {
      exifDict['0th'][EXIF_TAGS.Copyright] = metadata.exif?.copyright || metadata.iptc?.copyright || '';
    }

    // Set software tag
    exifDict['0th'][EXIF_TAGS.Software] = 'Holistic SEO Hero Image Editor';

    // Set datetime
    const now = new Date();
    const dateTimeStr = formatExifDateTime(now);
    exifDict['0th'][EXIF_TAGS.DateTime] = dateTimeStr;
    exifDict.Exif[EXIF_TAGS.DateTimeOriginal] = dateTimeStr;
    exifDict.Exif[EXIF_TAGS.DateTimeDigitized] = dateTimeStr;

    // Store IPTC data in UserComment as JSON (workaround for piexifjs IPTC limitation)
    if (metadata.iptc) {
      const iptcJson = JSON.stringify({
        creator: metadata.iptc.creator,
        copyright: metadata.iptc.copyright,
        caption: metadata.iptc.caption,
        headline: metadata.iptc.headline,
        keywords: metadata.iptc.keywords
      });
      // UserComment format: charset marker + text
      exifDict.Exif[EXIF_TAGS.UserComment] = `UNICODE\0${iptcJson}`;
    }

    // Generate EXIF binary
    const exifBytes = piexif.dump(exifDict);

    // Insert EXIF into image
    const newImageDataUrl = piexif.insert(exifBytes, imageDataUrl);

    return newImageDataUrl;
  } catch (error) {
    console.error('[MetadataEmbedder] Failed to embed metadata:', error);
    // Return original image on failure
    return imageDataUrl;
  }
};

/**
 * Embed metadata into an image blob
 * Converts to JPEG if necessary for metadata embedding
 *
 * @param blob - Image blob
 * @param metadata - Metadata to embed
 * @returns New blob with embedded metadata
 */
export const embedMetadataInBlob = async (
  blob: Blob,
  metadata: HeroImageMetadata
): Promise<Blob> => {
  try {
    // Convert blob to data URL
    const dataUrl = await blobToDataUrl(blob);

    // If not JPEG, we can't embed EXIF directly with piexifjs
    // The image should be converted to JPEG first by the caller
    if (!blob.type.includes('jpeg') && !blob.type.includes('jpg')) {
      console.warn('[MetadataEmbedder] Non-JPEG image. Metadata embedding skipped.');
      return blob;
    }

    // Embed metadata
    const newDataUrl = embedMetadataInJpeg(dataUrl, metadata);

    // Convert back to blob
    return dataUrlToBlob(newDataUrl);
  } catch (error) {
    console.error('[MetadataEmbedder] Failed to embed metadata in blob:', error);
    return blob;
  }
};

// ============================================
// METADATA EXTRACTION
// ============================================

/**
 * Extract EXIF metadata from a JPEG image
 *
 * @param imageDataUrl - Base64 data URL of the JPEG image
 * @returns Extracted metadata or null if extraction fails
 */
export const extractMetadata = (
  imageDataUrl: string
): Partial<HeroImageMetadata> | null => {
  try {
    if (!imageDataUrl.startsWith('data:image/jpeg') && !imageDataUrl.startsWith('data:image/jpg')) {
      return null;
    }

    const exifDict = piexif.load(imageDataUrl);

    const result: Partial<HeroImageMetadata> = {
      exif: {
        artist: exifDict['0th'][EXIF_TAGS.Artist] as string || '',
        copyright: exifDict['0th'][EXIF_TAGS.Copyright] as string || '',
        imageDescription: exifDict['0th'][EXIF_TAGS.ImageDescription] as string || ''
      }
    };

    // Try to extract IPTC from UserComment
    const userComment = exifDict.Exif[EXIF_TAGS.UserComment];
    if (userComment && typeof userComment === 'string') {
      try {
        // Remove charset marker and parse JSON
        const jsonStr = userComment.replace(/^(ASCII|UNICODE|JIS)\0/, '');
        const iptcData = JSON.parse(jsonStr);

        result.iptc = {
          creator: iptcData.creator || '',
          copyright: iptcData.copyright || '',
          caption: iptcData.caption || '',
          headline: iptcData.headline || '',
          keywords: iptcData.keywords || []
        };
      } catch {
        // UserComment is not our IPTC JSON, ignore
      }
    }

    // Use ImageDescription as altText if available
    if (result.exif?.imageDescription) {
      result.altText = result.exif.imageDescription;
    }

    return result;
  } catch (error) {
    console.error('[MetadataEmbedder] Failed to extract metadata:', error);
    return null;
  }
};

/**
 * Remove all EXIF metadata from a JPEG image
 *
 * @param imageDataUrl - Base64 data URL of the JPEG image
 * @returns Data URL with metadata stripped
 */
export const stripMetadata = (imageDataUrl: string): string => {
  try {
    if (!imageDataUrl.startsWith('data:image/jpeg') && !imageDataUrl.startsWith('data:image/jpg')) {
      return imageDataUrl;
    }

    return piexif.remove(imageDataUrl);
  } catch (error) {
    console.error('[MetadataEmbedder] Failed to strip metadata:', error);
    return imageDataUrl;
  }
};

// ============================================
// SCHEMA.ORG GENERATION
// ============================================

/**
 * Generate Schema.org ImageObject JSON-LD
 *
 * @param metadata - Hero image metadata
 * @param imageUrl - Public URL of the image
 * @param pageUrl - URL of the page containing the image
 * @returns JSON-LD object for ImageObject
 */
export const generateImageObjectSchema = (
  metadata: HeroImageMetadata,
  imageUrl: string,
  pageUrl: string
): HeroSchemaOrgMetadata => {
  const schema: HeroSchemaOrgMetadata = {
    '@type': 'ImageObject',
    contentUrl: imageUrl,
    name: metadata.iptc?.headline || metadata.altText || 'Hero Image',
    description: metadata.iptc?.caption || metadata.altText || '',
    author: {
      '@type': 'Organization',
      name: metadata.iptc?.creator || metadata.exif?.artist || ''
    },
    copyrightHolder: {
      '@type': 'Organization',
      name: metadata.iptc?.creator || metadata.exif?.artist || ''
    }
  };

  // Add copyright year if available
  if (metadata.iptc?.copyright || metadata.exif?.copyright) {
    const copyrightText = metadata.iptc?.copyright || metadata.exif?.copyright || '';
    const yearMatch = copyrightText.match(/\d{4}/);
    if (yearMatch) {
      schema.copyrightYear = parseInt(yearMatch[0], 10);
    }
  }

  // Add license if available
  if (metadata.schemaOrg?.license) {
    schema.license = metadata.schemaOrg.license;
  }

  // Add encoding format
  if (metadata.fileName) {
    if (metadata.fileName.endsWith('.avif')) {
      schema.encodingFormat = 'image/avif';
    } else if (metadata.fileName.endsWith('.webp')) {
      schema.encodingFormat = 'image/webp';
    } else if (metadata.fileName.endsWith('.jpg') || metadata.fileName.endsWith('.jpeg')) {
      schema.encodingFormat = 'image/jpeg';
    } else if (metadata.fileName.endsWith('.png')) {
      schema.encodingFormat = 'image/png';
    }
  }

  // Add URL reference
  schema.url = imageUrl;

  // Add isPartOf if page URL provided
  if (pageUrl) {
    schema.isPartOf = {
      '@type': 'WebPage',
      url: pageUrl
    };
  }

  return schema;
};

/**
 * Generate complete JSON-LD script for embedding in HTML
 *
 * @param metadata - Hero image metadata
 * @param imageUrl - Public URL of the image
 * @param pageUrl - URL of the page containing the image
 * @returns JSON-LD script string
 */
export const generateJsonLdScript = (
  metadata: HeroImageMetadata,
  imageUrl: string,
  pageUrl: string
): string => {
  const schema = generateImageObjectSchema(metadata, imageUrl, pageUrl);

  return `<script type="application/ld+json">
${JSON.stringify({
  '@context': 'https://schema.org',
  ...schema
}, null, 2)}
</script>`;
};

// ============================================
// ALT TEXT GENERATION
// ============================================

/**
 * Generate descriptive alt text from metadata
 *
 * @param metadata - Hero image metadata
 * @param entityName - Central entity name (if available)
 * @param h1Text - Page H1 text (if available)
 * @returns Generated alt text
 */
export const generateAltText = (
  metadata: Partial<HeroImageMetadata>,
  entityName?: string,
  h1Text?: string
): string => {
  const parts: string[] = [];

  // Start with entity name if available
  if (entityName) {
    parts.push(entityName);
  }

  // Add headline or H1
  if (metadata.iptc?.headline) {
    parts.push(metadata.iptc.headline);
  } else if (h1Text && !parts.some(p => p.toLowerCase() === h1Text.toLowerCase())) {
    parts.push(h1Text);
  }

  // Add caption context if different from headline
  if (metadata.iptc?.caption &&
      metadata.iptc.caption !== metadata.iptc?.headline &&
      !parts.some(p => p.toLowerCase() === metadata.iptc?.caption?.toLowerCase())) {
    // Just take first part of caption
    const captionPart = metadata.iptc.caption.split('.')[0];
    if (captionPart.length < 50) {
      parts.push(captionPart);
    }
  }

  // Add creator attribution
  const creator = metadata.iptc?.creator || metadata.exif?.artist;
  if (creator && parts.length < 3) {
    parts.push(`by ${creator}`);
  }

  // Combine parts
  if (parts.length === 0) {
    return 'Hero image';
  }

  return parts.join(' - ');
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format date for EXIF DateTime field
 * Format: "YYYY:MM:DD HH:MM:SS"
 */
const formatExifDateTime = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}:${month}:${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * Convert Blob to Data URL
 */
const blobToDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
};

/**
 * Convert Data URL to Blob
 */
const dataUrlToBlob = (dataUrl: string): Blob => {
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
};

/**
 * Validate IPTC metadata completeness
 *
 * @param iptc - IPTC metadata to validate
 * @returns Validation result with missing fields
 */
export const validateIPTCCompleteness = (
  iptc: Partial<HeroIPTCMetadata>
): { isComplete: boolean; missingFields: string[] } => {
  const missingFields: string[] = [];

  if (!iptc.creator) missingFields.push('creator');
  if (!iptc.copyright) missingFields.push('copyright');
  if (!iptc.caption) missingFields.push('caption');
  if (!iptc.headline) missingFields.push('headline');

  return {
    isComplete: missingFields.length === 0,
    missingFields
  };
};

/**
 * Validate EXIF metadata completeness
 *
 * @param exif - EXIF metadata to validate
 * @returns Validation result with missing fields
 */
export const validateEXIFCompleteness = (
  exif: Partial<HeroEXIFMetadata>
): { isComplete: boolean; missingFields: string[] } => {
  const missingFields: string[] = [];

  if (!exif.artist) missingFields.push('artist');
  if (!exif.copyright) missingFields.push('copyright');
  if (!exif.imageDescription) missingFields.push('imageDescription');

  return {
    isComplete: missingFields.length === 0,
    missingFields
  };
};

/**
 * Create metadata from business info and content context
 */
export const createMetadataFromBusinessInfo = (
  businessName: string,
  topicTitle: string,
  entityName?: string,
  keywords?: string[]
): HeroImageMetadata => {
  const year = new Date().getFullYear();
  const altText = generateAltText({}, entityName, topicTitle);

  return {
    iptc: {
      creator: businessName,
      copyright: `Copyright ${year} ${businessName}`,
      caption: altText,
      headline: topicTitle.substring(0, 64),
      keywords: keywords || []
    },
    exif: {
      artist: businessName,
      copyright: `Copyright ${year} ${businessName}`,
      imageDescription: altText
    },
    schemaOrg: {
      '@type': 'ImageObject',
      contentUrl: '',
      name: topicTitle,
      description: altText,
      author: {
        '@type': 'Organization',
        name: businessName
      },
      copyrightHolder: {
        '@type': 'Organization',
        name: businessName
      }
    },
    altText,
    fileName: `${topicTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-hero.avif`
  };
};
