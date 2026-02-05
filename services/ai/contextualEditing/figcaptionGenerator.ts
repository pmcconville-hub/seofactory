/**
 * Figcaption Generator
 *
 * Generates descriptive captions for images since all explanatory text
 * has been moved from AI-generated images to HTML figcaptions.
 *
 * This follows the photographic-first approach where:
 * - Photographic images get captions describing what they show
 * - Minimal diagrams get captions EXPLAINING what the diagram represents
 *   (since no text/labels can be rendered reliably on AI images)
 *
 * @module services/ai/contextualEditing/figcaptionGenerator
 */

import { callProviderWithFallback } from '../contentGeneration/providerUtils';
import { BusinessInfo } from '../../../types';
import { createLogger } from '../../../utils/debugLogger';

// Create namespaced logger
const log = createLogger('FigcaptionGen');

// ============================================================================
// TYPES
// ============================================================================

export interface FigcaptionRequest {
  /** Description of what the image shows */
  imageDescription: string;
  /** Image type: photographic, minimal-diagram, etc. */
  imageType: string;
  /** Heading of the section containing this image */
  sectionHeading: string;
  /** Content of the section (for context) */
  sectionContent: string;
  /** Alt text for the image */
  altText: string;
}

export interface FigcaptionResult {
  /** Generated figcaption text */
  caption: string;
  /** Length in characters */
  length: number;
}

// ============================================================================
// PROMPT BUILDING
// ============================================================================

/**
 * Build prompt for generating a figcaption
 */
function buildFigcaptionPrompt(
  request: FigcaptionRequest,
  language: string
): string {
  const isDiagram = request.imageType.toLowerCase().includes('diagram');

  const typeSpecificInstructions = isDiagram
    ? `This is a MINIMAL DIAGRAM with NO text labels. The figcaption must EXPLAIN what the diagram represents because viewers cannot read any labels on the image itself. Describe the relationship, process, or concept being visualized.`
    : `This is a PHOTOGRAPH. The figcaption should describe what the photo shows and connect it to the topic being discussed.`;

  return `You are an expert at writing figcaptions for images in SEO content.

## Task

Generate a figcaption for an image in a ${language} article.

## Image Details

- Type: ${request.imageType}
- Description: ${request.imageDescription}
- Alt text: ${request.altText}

## Section Context

Heading: ${request.sectionHeading}
Content excerpt: ${request.sectionContent.slice(0, 300)}...

## Instructions

${typeSpecificInstructions}

Write a figcaption that:
1. Is written in ${language}
2. Is between 50-150 characters
3. Adds value beyond the alt text
4. ${isDiagram ? 'EXPLAINS what the diagram shows (since there are no labels)' : 'Describes what the photograph depicts'}
5. Connects the image to the topic being discussed
6. Uses clear, descriptive language

## Output

Respond with ONLY the figcaption text. No quotes, no explanations, no formatting.`;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Generate a figcaption that provides the explanatory text
 * that would have been ON the image (but AI can't render reliably)
 *
 * @param request - The figcaption request with image and section context
 * @param businessInfo - Business info containing AI provider and language settings
 * @returns FigcaptionResult with the generated caption
 */
export async function generateFigcaption(
  request: FigcaptionRequest,
  businessInfo: BusinessInfo
): Promise<FigcaptionResult> {
  const language = businessInfo.language || 'Dutch';

  log.log(`Generating figcaption for ${request.imageType} image in ${language}`);

  try {
    const prompt = buildFigcaptionPrompt(request, language);

    const response = await callProviderWithFallback(
      businessInfo,
      prompt,
      2, // maxRetries
      30000 // 30s timeout - figcaptions are simple
    );

    // Clean the response
    let caption = response.trim();

    // Remove any quotes that might have been added
    if (caption.startsWith('"') && caption.endsWith('"')) {
      caption = caption.slice(1, -1);
    }
    if (caption.startsWith("'") && caption.endsWith("'")) {
      caption = caption.slice(1, -1);
    }

    // Truncate if too long (max 150 chars)
    if (caption.length > 150) {
      caption = caption.slice(0, 147) + '...';
    }

    log.log(`Generated figcaption (${caption.length} chars): ${caption.slice(0, 50)}...`);

    return {
      caption,
      length: caption.length,
    };
  } catch (error) {
    log.warn(`Failed to generate figcaption, falling back to alt text: ${error}`);

    // Fallback to alt text if AI call fails
    return {
      caption: request.altText,
      length: request.altText.length,
    };
  }
}

/**
 * Generate figcaptions for all images in content
 *
 * @param images - Array of image metadata with descriptions and types
 * @param sections - Array of section content with keys and headings
 * @param businessInfo - Business info containing AI provider settings
 * @returns Map of sectionKey+imageIndex to figcaption string
 */
export async function generateFigcaptionsForContent(
  images: Array<{
    description: string;
    type: string;
    altText: string;
    sectionKey: string;
    index?: number;
  }>,
  sections: Array<{
    key: string;
    heading: string;
    content: string;
  }>,
  businessInfo: BusinessInfo
): Promise<Map<string, string>> {
  const figcaptions = new Map<string, string>();

  log.log(`Generating figcaptions for ${images.length} images`);

  // Create a map of sections for quick lookup
  const sectionMap = new Map(sections.map(s => [s.key, s]));

  // Process images sequentially to avoid rate limiting
  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    const section = sectionMap.get(image.sectionKey);

    if (!section) {
      log.warn(`Section not found for image: ${image.sectionKey}`);
      figcaptions.set(`${image.sectionKey}-${image.index ?? i}`, image.altText);
      continue;
    }

    try {
      const result = await generateFigcaption(
        {
          imageDescription: image.description,
          imageType: image.type,
          sectionHeading: section.heading,
          sectionContent: section.content,
          altText: image.altText,
        },
        businessInfo
      );

      figcaptions.set(`${image.sectionKey}-${image.index ?? i}`, result.caption);
    } catch (error) {
      log.warn(`Failed to generate figcaption for image ${i}: ${error}`);
      figcaptions.set(`${image.sectionKey}-${image.index ?? i}`, image.altText);
    }

    // Small delay between requests to avoid rate limiting
    if (i < images.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  log.log(`Generated ${figcaptions.size} figcaptions`);

  return figcaptions;
}

/**
 * Generate a simple figcaption without AI (for fallback/offline use)
 *
 * @param imageDescription - Description of the image
 * @param imageType - Type of image
 * @param sectionHeading - Heading of the section
 * @returns A simple generated caption
 */
export function generateSimpleFigcaption(
  imageDescription: string,
  imageType: string,
  sectionHeading: string
): string {
  const isDiagram = imageType.toLowerCase().includes('diagram');

  if (isDiagram) {
    // For diagrams, try to extract key concept
    const conceptMatch = imageDescription.match(/(?:showing|illustrating|depicting)\s+(.+?)(?:\.|$)/i);
    if (conceptMatch) {
      return `Diagram: ${conceptMatch[1]}`;
    }
    return `Diagram visualizing ${sectionHeading.toLowerCase()}`;
  }

  // For photographs, create a simple descriptive caption
  const cleanDesc = imageDescription
    .replace(/^(a\s+)?(photograph|photo|image)\s+(of\s+)?/i, '')
    .trim();

  if (cleanDesc.length > 0 && cleanDesc.length <= 100) {
    return cleanDesc.charAt(0).toUpperCase() + cleanDesc.slice(1);
  }

  return `Image related to ${sectionHeading.toLowerCase()}`;
}
