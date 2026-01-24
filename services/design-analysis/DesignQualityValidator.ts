import type { DesignQualityValidation, DesignTokens } from '../../types/publishing';

interface ValidatorConfig {
  provider: 'gemini' | 'anthropic';
  apiKey: string;
  threshold?: number;
}

interface VisionAIResult {
  overallScore: number;
  colorMatch: { score: number; notes: string };
  typographyMatch: { score: number; notes: string };
  visualDepth: { score: number; notes: string };
  brandFit: { score: number; notes: string };
  suggestions?: string[];
}

/**
 * AI Vision-based Design Quality Validator
 *
 * Compares target website screenshot with generated output to validate
 * that the styled content matches the target brand's visual identity.
 *
 * Supports both Gemini and Claude vision APIs for flexibility.
 */
export class DesignQualityValidator {
  private config: ValidatorConfig;
  private threshold: number;

  constructor(config: ValidatorConfig) {
    this.config = config;
    this.threshold = config.threshold ?? 70;
  }

  /**
   * Validate that generated output matches target brand
   *
   * @param targetScreenshot - Base64 encoded screenshot of target website
   * @param outputScreenshot - Base64 encoded screenshot of generated output
   * @param extractedTokens - Design tokens extracted from target site
   * @returns Validation result with scores and suggestions
   */
  async validateBrandMatch(
    targetScreenshot: string,
    outputScreenshot: string,
    extractedTokens: Partial<DesignTokens>
  ): Promise<DesignQualityValidation> {
    const prompt = this.generateValidationPrompt(extractedTokens);

    const aiResult = await this.callVisionAI(
      targetScreenshot,
      outputScreenshot,
      prompt
    );

    return {
      overallScore: aiResult.overallScore,
      colorMatch: {
        score: aiResult.colorMatch.score,
        notes: aiResult.colorMatch.notes,
        passed: aiResult.colorMatch.score >= this.threshold
      },
      typographyMatch: {
        score: aiResult.typographyMatch.score,
        notes: aiResult.typographyMatch.notes,
        passed: aiResult.typographyMatch.score >= this.threshold
      },
      visualDepth: {
        score: aiResult.visualDepth.score,
        notes: aiResult.visualDepth.notes,
        passed: aiResult.visualDepth.score >= this.threshold
      },
      brandFit: {
        score: aiResult.brandFit.score,
        notes: aiResult.brandFit.notes,
        passed: aiResult.brandFit.score >= this.threshold
      },
      passesThreshold: aiResult.overallScore >= this.threshold,
      autoFixSuggestions: aiResult.overallScore < this.threshold
        ? this.generateAutoFixSuggestions(aiResult)
        : undefined
    };
  }

  /**
   * Generate the AI vision prompt for brand validation
   *
   * The prompt guides the AI to compare two screenshots and score
   * the visual similarity across multiple dimensions.
   */
  generateValidationPrompt(tokens: Partial<DesignTokens>): string {
    return `You are a design system quality auditor. Compare these two images:

IMAGE 1: Target website screenshot (the source brand to match)
IMAGE 2: Generated article preview (our styled output)

Extracted design tokens for reference:
- Primary color: ${tokens.colors?.primary || 'unknown'}
- Secondary color: ${tokens.colors?.secondary || 'unknown'}
- Accent color: ${tokens.colors?.accent || 'unknown'}
- Heading font: ${tokens.fonts?.heading || 'unknown'}
- Body font: ${tokens.fonts?.body || 'unknown'}

Evaluate how well the generated output matches the target's visual identity.

Score each category 0-100:

1. COLOR MATCH: Do the primary/accent colors in output match the target?
   - Is the same brand color visible in both?
   - Are color proportions similar?
   - Consider hue, saturation, and brightness alignment

2. TYPOGRAPHY MATCH: Do fonts convey the same personality?
   - Serif vs sans-serif alignment
   - Weight and style similarity
   - Overall typographic feel and hierarchy

3. VISUAL DEPTH: Similar use of shadows, gradients, elevation?
   - Card/element depth and layering
   - Background treatments
   - Visual separation between elements

4. BRAND FIT: Would the output feel "on brand" if placed on the target site?
   - Overall aesthetic alignment
   - Professional quality
   - Cohesive visual language

Return JSON:
{
  "overallScore": <weighted average 0-100>,
  "colorMatch": { "score": <0-100>, "notes": "<specific observation>" },
  "typographyMatch": { "score": <0-100>, "notes": "<specific observation>" },
  "visualDepth": { "score": <0-100>, "notes": "<specific observation>" },
  "brandFit": { "score": <0-100>, "notes": "<specific observation>" },
  "suggestions": ["<fix 1>", "<fix 2>"]
}`;
  }

  /**
   * Call AI vision API (Gemini or Claude)
   */
  private async callVisionAI(
    image1Base64: string,
    image2Base64: string,
    prompt: string
  ): Promise<VisionAIResult> {
    if (this.config.provider === 'gemini') {
      return this.callGeminiVision(image1Base64, image2Base64, prompt);
    } else {
      return this.callClaudeVision(image1Base64, image2Base64, prompt);
    }
  }

  /**
   * Call Gemini Vision API
   */
  private async callGeminiVision(
    img1: string,
    img2: string,
    prompt: string
  ): Promise<VisionAIResult> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { mimeType: 'image/jpeg', data: img1 } },
              { inlineData: { mimeType: 'image/jpeg', data: img2 } }
            ]
          }]
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    // Parse JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : this.getDefaultValidation();
  }

  /**
   * Call Claude Vision API
   */
  private async callClaudeVision(
    img1: string,
    img2: string,
    prompt: string
  ): Promise<VisionAIResult> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2024-01-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: img1
              }
            },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: img2
              }
            }
          ]
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : this.getDefaultValidation();
  }

  /**
   * Get default validation result when API fails
   */
  private getDefaultValidation(): VisionAIResult {
    return {
      overallScore: 50,
      colorMatch: { score: 50, notes: 'Unable to validate' },
      typographyMatch: { score: 50, notes: 'Unable to validate' },
      visualDepth: { score: 50, notes: 'Unable to validate' },
      brandFit: { score: 50, notes: 'Unable to validate' }
    };
  }

  /**
   * Generate actionable fix suggestions based on low scores
   */
  private generateAutoFixSuggestions(result: VisionAIResult): string[] {
    const suggestions: string[] = [];

    if (result.colorMatch.score < 70) {
      suggestions.push('Increase primary color saturation or adjust hue to match target');
    }
    if (result.typographyMatch.score < 70) {
      suggestions.push('Verify heading font is loading correctly (check Google Fonts link)');
    }
    if (result.visualDepth.score < 70) {
      suggestions.push('Increase shadow opacity (minimum 15% for subtle, 25% for featured)');
    }
    if (result.brandFit.score < 70) {
      suggestions.push('Review overall styling - may need different personality preset');
    }

    return suggestions;
  }
}
