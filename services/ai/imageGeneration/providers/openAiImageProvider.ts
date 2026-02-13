// services/ai/imageGeneration/providers/openAiImageProvider.ts
import { ImagePlaceholder, BusinessInfo } from '../../../../types';
import { ImageProvider, ImageGenerationOptions, GenerationResult, ProviderConfig } from './types';
import {
  IMAGE_TYPE_PROMPTS,
  buildNoTextInstruction,
  getPromptModifiers,
  getAvoidTerms,
  normalizeImageType
} from '../../../../config/imageTypeRouting';
import { ImageStyle } from '../../../../types/contextualEditor';

const DEFAULT_TIMEOUT_MS = 60000; // 60 seconds for image generation

/**
 * Build the proxy URL from the Supabase project URL.
 */
function getProxyUrl(businessInfo: BusinessInfo): string | null {
  if (!businessInfo.supabaseUrl) return null;
  return `${businessInfo.supabaseUrl}/functions/v1/openai-image-proxy`;
}

/**
 * OpenAI DALL-E 3 Provider
 *
 * Uses OpenAI's image generation API via Supabase edge function proxy.
 * Passes the API key directly via x-openai-api-key header (same pattern
 * as the text proxy in openAiService.ts) — no JWT dependency.
 */
export const openAiImageProvider: ImageProvider = {
  name: 'dall-e-3',

  isAvailable(businessInfo: BusinessInfo): boolean {
    return !!businessInfo.openAiApiKey;
  },

  async generate(
    placeholder: ImagePlaceholder,
    options: ImageGenerationOptions,
    businessInfo: BusinessInfo,
    config?: ProviderConfig
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    const timeoutMs = config?.timeoutMs || DEFAULT_TIMEOUT_MS;

    if (!businessInfo.openAiApiKey) {
      return {
        success: false,
        error: 'OpenAI API key not configured. Add it in Settings → API Keys.',
        provider: this.name,
        durationMs: Date.now() - startTime,
      };
    }

    const prompt = buildImagePrompt(placeholder, options, businessInfo);
    const size = getSize(placeholder.specs.width, placeholder.specs.height);

    try {
      const proxyUrl = getProxyUrl(businessInfo);
      if (proxyUrl) {
        return await generateViaProxy(businessInfo, proxyUrl, prompt, size, timeoutMs, startTime);
      }
      // No proxy URL — won't work in browser (CORS), but keep as fallback for tests
      return await generateDirectly(businessInfo.openAiApiKey, prompt, size, timeoutMs, startTime);
    } catch (error) {
      let errorMessage = 'Unknown DALL-E error';

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = `DALL-E request timed out after ${timeoutMs / 1000} seconds.`;
        } else if (error.message.includes('content_policy')) {
          errorMessage = 'Image generation blocked by content policy. Try rephrasing the description.';
        } else if (error.message.includes('rate_limit') || error.message.includes('429')) {
          errorMessage = 'OpenAI rate limit reached. Please wait a moment and try again.';
        } else if (error.message.includes('invalid_api_key') || error.message.includes('401')) {
          errorMessage = 'OpenAI API key is invalid or expired. Check your API key in Settings.';
        } else if (error.message.includes('billing') || error.message.includes('quota')) {
          errorMessage = 'OpenAI billing/quota issue. Check your OpenAI account billing status.';
        } else if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
          errorMessage = 'CORS error: Image generation proxy not available. Please check your configuration.';
        } else {
          errorMessage = `DALL-E error: ${error.message}`;
        }
      }

      return {
        success: false,
        error: errorMessage,
        provider: 'dall-e-3',
        durationMs: Date.now() - startTime,
      };
    }
  },
};

/**
 * Generate image via Supabase proxy.
 *
 * Uses the exact same header pattern as the text proxy (openAiService.ts):
 *   - x-openai-api-key: the OpenAI API key (read directly from businessInfo)
 *   - apikey: the Supabase anon key (required by the API gateway for routing)
 */
async function generateViaProxy(
  businessInfo: BusinessInfo,
  proxyUrl: string,
  prompt: string,
  size: string,
  timeoutMs: number,
  startTime: number
): Promise<GenerationResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-openai-api-key': businessInfo.openAiApiKey,
        'apikey': businessInfo.supabaseAnonKey || '',
      },
      body: JSON.stringify({
        prompt,
        model: 'dall-e-3',
        size,
        quality: 'standard',
        style: 'natural',
        response_format: 'b64_json',
        n: 1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage = data?.error || `Proxy returned ${response.status}`;
      return {
        success: false,
        error: errorMessage,
        provider: 'dall-e-3',
        durationMs: Date.now() - startTime,
      };
    }

    if (!data?.success || !data?.data || data.data.length === 0) {
      return {
        success: false,
        error: data?.error || 'DALL-E returned no images',
        provider: 'dall-e-3',
        durationMs: Date.now() - startTime,
      };
    }

    const imageData = data.data[0];
    const b64Json = imageData.b64_json;

    if (!b64Json) {
      if (imageData.url) {
        const imgResponse = await fetch(imageData.url);
        const blob = await imgResponse.blob();
        return { success: true, blob, provider: 'dall-e-3', durationMs: Date.now() - startTime };
      }
      return { success: false, error: 'DALL-E returned empty image data', provider: 'dall-e-3', durationMs: Date.now() - startTime };
    }

    // Convert base64 to Blob
    const binaryString = atob(b64Json);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'image/png' });

    return { success: true, blob, provider: 'dall-e-3', durationMs: Date.now() - startTime };

  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Direct API call (fallback for non-browser environments / tests)
 */
async function generateDirectly(
  apiKey: string,
  prompt: string,
  size: string,
  timeoutMs: number,
  startTime: number
): Promise<GenerationResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size,
        quality: 'standard',
        response_format: 'b64_json',
        style: 'natural',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        success: false,
        error: data?.error?.message || 'Image generation failed',
        provider: 'dall-e-3',
        durationMs: Date.now() - startTime,
      };
    }

    if (!data?.data || data.data.length === 0) {
      return { success: false, error: 'DALL-E returned no images', provider: 'dall-e-3', durationMs: Date.now() - startTime };
    }

    const imageData = data.data[0];
    const b64Json = imageData.b64_json;

    if (!b64Json) {
      if (imageData.url) {
        const imgResponse = await fetch(imageData.url);
        const blob = await imgResponse.blob();
        return { success: true, blob, provider: 'dall-e-3', durationMs: Date.now() - startTime };
      }
      return { success: false, error: 'DALL-E returned empty image data', provider: 'dall-e-3', durationMs: Date.now() - startTime };
    }

    const binaryString = atob(b64Json);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'image/png' });

    return { success: true, blob, provider: 'dall-e-3', durationMs: Date.now() - startTime };

  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Get style description for prompt
 */
function getStyleDescription(style?: string): string {
  switch (style) {
    case 'photorealistic':
      return 'Photorealistic, professional photography style, natural lighting';
    case 'illustration':
      return 'Digital illustration style, clean vector-like artwork';
    case 'cartoon':
      return 'Cartoon style, colorful and playful, friendly illustration';
    case 'minimal':
      return 'Minimalist design, simple shapes, clean and modern';
    case 'artistic':
      return 'Artistic style, creative and expressive, unique visual approach';
    case 'technical':
      return 'Technical illustration style, precise and detailed, educational';
    default:
      return 'Professional, clean, suitable for web publication';
  }
}

/**
 * Build a detailed prompt for DALL-E image generation
 * Uses photographic-first routing configuration
 */
function buildImagePrompt(
  placeholder: ImagePlaceholder,
  options: ImageGenerationOptions,
  businessInfo: BusinessInfo
): string {
  const parts: string[] = [];

  const normalizedType = normalizeImageType(placeholder.type as ImageStyle);
  const mapping = IMAGE_TYPE_PROMPTS[normalizedType];
  const avoidTerms = getAvoidTerms(normalizedType);

  if (mapping?.tier === 'minimal-diagram') {
    parts.push('Minimal diagram with simple geometric shapes');
  } else {
    parts.push('Professional photograph');
  }

  if (options.style) {
    parts.push(getStyleDescription(options.style));
  }

  const promptModifiers = getPromptModifiers(normalizedType);
  parts.push(promptModifiers.join(', '));

  let filteredDescription = placeholder.description;
  for (const term of avoidTerms) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    filteredDescription = filteredDescription.replace(regex, '');
  }
  filteredDescription = filteredDescription.replace(/\s+/g, ' ').trim();

  if (filteredDescription) {
    parts.push(filteredDescription);
  }

  if (options.textOverlay) {
    parts.push(`The image should visually represent the concept: "${options.textOverlay}"`);
  }

  if (options.additionalPrompt) {
    parts.push(options.additionalPrompt);
  }

  if (options.customInstructions) {
    parts.push(options.customInstructions);
  }

  if (businessInfo.industry) {
    parts.push(`Context: ${businessInfo.industry} industry`);
  }

  if (businessInfo.brandKit?.colors?.primary) {
    parts.push(`Consider incorporating the color ${businessInfo.brandKit.colors.primary} where appropriate.`);
  }

  if (!options.style) {
    parts.push('Professional quality, clean composition, suitable for a website hero image or blog post.');
  }

  parts.push(buildNoTextInstruction(normalizedType));

  return parts.join('. ');
}

/**
 * Convert width/height to DALL-E 3 supported size
 * DALL-E 3 supports: 1024x1024, 1024x1792 (portrait), 1792x1024 (landscape)
 */
function getSize(width: number, height: number): '1024x1024' | '1024x1792' | '1792x1024' {
  const ratio = width / height;

  if (ratio > 1.3) {
    return '1792x1024'; // Landscape
  } else if (ratio < 0.7) {
    return '1024x1792'; // Portrait
  }
  return '1024x1024'; // Square
}

export default openAiImageProvider;
