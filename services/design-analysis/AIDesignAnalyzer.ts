import type { DesignDNA, DesignDNAExtractionResult } from '../../types/designDna';
import { DESIGN_DNA_EXTRACTION_PROMPT } from './prompts/designDnaPrompt';

interface AIDesignAnalyzerConfig {
  provider: 'gemini' | 'anthropic';
  apiKey: string;
  model?: string;
}

interface ProviderInfo {
  provider: 'gemini' | 'anthropic';
  model: string;
}

/**
 * AI Vision-based Design DNA Analyzer
 *
 * Extracts complete design system from website screenshots using AI Vision.
 * This is the primary method for understanding a brand's visual identity.
 *
 * Supported providers:
 * - Gemini 2.0 Flash (default for gemini)
 * - Claude Sonnet 4 (default for anthropic)
 */
export class AIDesignAnalyzer {
  private config: AIDesignAnalyzerConfig;
  private defaultModels = {
    gemini: 'gemini-2.0-flash',
    anthropic: 'claude-sonnet-4-20250514'
  };

  constructor(config: AIDesignAnalyzerConfig) {
    this.config = config;
  }

  /**
   * Get provider and model information
   */
  getProviderInfo(): ProviderInfo {
    return {
      provider: this.config.provider,
      model: this.config.model || this.defaultModels[this.config.provider]
    };
  }

  /**
   * Extract Design DNA from a website screenshot
   */
  async extractDesignDNA(
    screenshotBase64: string,
    sourceUrl: string
  ): Promise<DesignDNAExtractionResult> {
    const startTime = Date.now();
    const prompt = this.generateExtractionPrompt();

    let designDna: DesignDNA;

    if (this.config.provider === 'gemini') {
      designDna = await this.callGeminiVision(screenshotBase64, prompt);
    } else {
      designDna = await this.callClaudeVision(screenshotBase64, prompt);
    }

    const { model } = this.getProviderInfo();

    return {
      designDna,
      screenshotBase64,
      sourceUrl,
      extractedAt: new Date().toISOString(),
      aiModel: model,
      processingTimeMs: Date.now() - startTime
    };
  }

  /**
   * Generate the extraction prompt for Design DNA analysis
   */
  generateExtractionPrompt(): string {
    return DESIGN_DNA_EXTRACTION_PROMPT;
  }

  /**
   * Generate a validation prompt for color checking
   */
  generateValidationPrompt(extractedColors: Record<string, string>): string {
    const colorJson = JSON.stringify(extractedColors, null, 2);
    return `Validate these extracted colors against the screenshot:
${colorJson}

Compare each color to what you actually see in the screenshot.

Return JSON:
{
  "isValid": boolean,
  "corrections": { "colorName": "#hex" },
  "confidence": 0-100,
  "notes": "explanation of any differences found"
}

IMPORTANT: Only suggest corrections if the extracted value is CLEARLY wrong. Return only valid JSON.`;
  }

  /**
   * Parse AI response and extract JSON
   * Handles both clean JSON and markdown-wrapped responses
   */
  parseAIResponse(text: string): unknown {
    // Try to find JSON object in the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from AI response');
    }

    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      throw new Error('Failed to extract JSON from AI response');
    }
  }

  /**
   * Call Gemini Vision API
   */
  private async callGeminiVision(
    imageBase64: string,
    prompt: string
  ): Promise<DesignDNA> {
    const model = this.config.model || this.defaultModels.gemini;
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${this.config.apiKey}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    return this.parseAIResponse(text) as DesignDNA;
  }

  /**
   * Call Claude Vision API
   */
  private async callClaudeVision(
    imageBase64: string,
    prompt: string
  ): Promise<DesignDNA> {
    const model = this.config.model || this.defaultModels.anthropic;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2024-01-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: 8192,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageBase64
              }
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '{}';

    return this.parseAIResponse(text) as DesignDNA;
  }

  /**
   * Validate extracted colors against the screenshot
   * Uses AI Vision to confirm color accuracy
   */
  async validateColors(
    screenshotBase64: string,
    extractedColors: Record<string, string>
  ): Promise<{
    isValid: boolean;
    corrections: Record<string, string>;
    confidence: number;
  }> {
    const prompt = this.generateValidationPrompt(extractedColors);

    let result;
    if (this.config.provider === 'gemini') {
      result = await this.callGeminiVision(screenshotBase64, prompt);
    } else {
      result = await this.callClaudeVision(screenshotBase64, prompt);
    }

    return result as unknown as {
      isValid: boolean;
      corrections: Record<string, string>;
      confidence: number;
    };
  }

  /**
   * Extract specific design elements from a screenshot
   * Useful for targeted analysis of specific components
   */
  async extractElements(
    screenshotBase64: string,
    elements: ('colors' | 'typography' | 'spacing' | 'shapes' | 'effects')[]
  ): Promise<Partial<DesignDNA>> {
    const elementPrompts: Record<string, string> = {
      colors: 'Extract ALL colors: primary, secondary, accent, neutrals (dark to light), and semantic colors. Return hex values.',
      typography: 'Extract typography: heading font family/weight/style, body font, scale ratio, special treatments.',
      spacing: 'Analyze spacing: density, section gaps, content width, whitespace philosophy.',
      shapes: 'Identify shapes: border radius style (sharp/rounded/pill), button/card/input styles.',
      effects: 'Identify visual effects: shadows, gradients, background patterns, border treatments.'
    };

    const elementDescriptions = elements.map(el => {
      const title = el.charAt(0).toUpperCase() + el.slice(1);
      return `## ${title}\n${elementPrompts[el]}`;
    }).join('\n\n');

    const focusedPrompt = `Analyze this screenshot and extract the following design elements:

${elementDescriptions}

Return a JSON object with only these properties. Use exact CSS values where possible.`;

    if (this.config.provider === 'gemini') {
      return await this.callGeminiVision(screenshotBase64, focusedPrompt) as Partial<DesignDNA>;
    } else {
      return await this.callClaudeVision(screenshotBase64, focusedPrompt) as Partial<DesignDNA>;
    }
  }
}
