// =============================================================================
// AiCssGenerator — AI-powered CSS generation from target website screenshot
// =============================================================================
// Uses multi-provider AI vision to generate a complete CSS stylesheet that
// matches a target website's visual identity, targeting semantic HTML elements.

import type { CrawledCssTokens, ValidationResult, PremiumDesignConfig, BusinessContext } from './types';

/**
 * Generates CSS stylesheets using AI vision models.
 * Supports Gemini, Anthropic (Claude), and OpenAI providers.
 */
export class AiCssGenerator {
  private config: PremiumDesignConfig;

  constructor(config: PremiumDesignConfig) {
    this.config = config;
  }

  /**
   * Generate initial CSS based on target website screenshot and crawled tokens.
   */
  async generateInitialCss(
    targetScreenshot: string,
    crawledTokens: CrawledCssTokens,
    articleHtml: string,
    businessContext?: BusinessContext
  ): Promise<string> {
    const htmlPreview = articleHtml.substring(0, 8000);
    const sectionTypes = this.extractSectionTypes(articleHtml);

    const prompt = this.buildInitialPrompt(crawledTokens, htmlPreview, sectionTypes, businessContext);

    const css = await this.callVisionAI(targetScreenshot, null, prompt);
    return this.sanitizeCss(css);
  }

  /**
   * Refine existing CSS based on comparison between target and current output.
   */
  async refineCss(
    currentCss: string,
    targetScreenshot: string,
    outputScreenshot: string,
    validationResult: ValidationResult
  ): Promise<string> {
    const prompt = this.buildRefinementPrompt(currentCss, validationResult);
    const css = await this.callVisionAI(targetScreenshot, outputScreenshot, prompt);
    return this.sanitizeCss(css);
  }

  /**
   * Build the initial CSS generation prompt.
   */
  private buildInitialPrompt(
    tokens: CrawledCssTokens,
    htmlPreview: string,
    sectionTypes: string[],
    businessContext?: BusinessContext
  ): string {
    const colorList = tokens.colors.map(c => `  ${c.hex} (${c.usage}, from: ${c.source})`).join('\n');
    const fontList = tokens.fonts.map(f => `  ${f.family} (weight: ${f.weight}, ${f.usage})`).join('\n');
    const radiusList = tokens.borderRadius.join(', ') || 'none detected';
    const shadowList = tokens.shadows.join('; ') || 'none detected';
    const spacingList = tokens.spacingPatterns.join(', ') || 'none detected';
    const varList = Object.entries(tokens.cssVariables).map(([k, v]) => `  ${k}: ${v}`).join('\n') || 'none';

    return `You are an expert CSS designer. Generate a COMPLETE CSS stylesheet for an article page that matches the visual identity shown in the screenshot.

## Target Brand Design Tokens (extracted from the website)

**Colors:**
${colorList}

**Fonts:**
${fontList}

**Border Radius:** ${radiusList}
**Shadows:** ${shadowList}
**Spacing Patterns:** ${spacingList}

**CSS Variables found:**
${varList}

## Article HTML Structure (first 8000 chars)

\`\`\`html
${htmlPreview}
\`\`\`

## Section Content Types Detected
${sectionTypes.join(', ')}

${businessContext ? `## Business Context
- Industry: ${businessContext.industry}
- Audience: ${businessContext.audience}
- Purpose: ${businessContext.articlePurpose}
` : ''}

## CSS Requirements

1. Write a COMPLETE, self-contained CSS stylesheet (2000-4000 lines target)
2. Target semantic elements ONLY — no class selectors. Use:
   - Element selectors: \`article\`, \`section\`, \`h1\`–\`h4\`, \`p\`, \`ul\`, \`ol\`, \`table\`, \`blockquote\`, \`figure\`, \`nav\`, \`details\`, \`summary\`
   - Attribute selectors: \`[data-content-type="faq"]\`, \`[data-content-type="cta"]\`, \`[data-section-id]\`
3. Use the EXACT hex color values and font families from the tokens above
4. Include:
   - \`:root\` CSS variables derived from the brand tokens
   - Responsive breakpoints at 768px and 1024px
   - Hover states and focus-visible styles for accessibility
   - Print styles (\`@media print\`)
   - Dark mode (\`@media (prefers-color-scheme: dark)\`) — derive from brand colors
5. Add decorative elements ONLY via CSS \`::before\`/\`::after\` pseudo-elements (no HTML changes)
6. Scope ALL rules under \`article\` to prevent style leaks
7. Handle all section content types: prose, FAQ (\`details/summary\`), comparison tables, step lists, checklists, CTA
8. Style the \`nav.toc\` (table of contents) with brand colors

## Output Format

Return ONLY the CSS code. No markdown fences, no explanations. Just pure CSS starting with \`:root {\`.`;
  }

  /**
   * Build the refinement prompt with specific fix instructions.
   */
  private buildRefinementPrompt(
    currentCss: string,
    validationResult: ValidationResult
  ): string {
    const fixes = validationResult.cssFixInstructions
      .map((fix, i) => `${i + 1}. ${fix}`)
      .join('\n');

    return `You are an expert CSS designer reviewing and refining a stylesheet.

## Current Scores
- Overall: ${validationResult.overallScore}/100
- Color Match: ${validationResult.colorMatch.score}/100 — ${validationResult.colorMatch.notes}
- Typography: ${validationResult.typographyMatch.score}/100 — ${validationResult.typographyMatch.notes}
- Spacing: ${validationResult.spacingMatch.score}/100 — ${validationResult.spacingMatch.notes}
- Visual Depth: ${validationResult.visualDepth.score}/100 — ${validationResult.visualDepth.notes}
- Brand Fit: ${validationResult.brandFit.score}/100 — ${validationResult.brandFit.notes}

## Specific CSS Fixes Required
${fixes}

## Current CSS (to revise)
\`\`\`css
${currentCss.substring(0, 12000)}
\`\`\`

## Instructions

The first image is the TARGET website design. The second image is the CURRENT output of the CSS above.

Apply ALL the specific fixes listed above. Return a COMPLETE revised CSS stylesheet (not a diff).
Keep everything that works well. Fix what doesn't match.

Return ONLY the CSS code. No markdown fences, no explanations.`;
  }

  /**
   * Extract section content types from HTML for the prompt.
   */
  private extractSectionTypes(html: string): string[] {
    const types = new Set<string>();
    const regex = /data-content-type="([^"]+)"/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      types.add(match[1]);
    }
    return Array.from(types);
  }

  /**
   * Call the AI vision API based on configured provider.
   */
  private async callVisionAI(
    image1Base64: string,
    image2Base64: string | null,
    prompt: string
  ): Promise<string> {
    switch (this.config.aiProvider) {
      case 'gemini':
        return this.callGemini(image1Base64, image2Base64, prompt);
      case 'anthropic':
        return this.callClaude(image1Base64, image2Base64, prompt);
      case 'openai':
        return this.callOpenAI(image1Base64, image2Base64, prompt);
      default:
        return this.callGemini(image1Base64, image2Base64, prompt);
    }
  }

  private async callGemini(img1: string, img2: string | null, prompt: string): Promise<string> {
    const model = this.config.model || 'gemini-2.0-flash';
    const parts: any[] = [{ text: prompt }];
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: img1 } });
    if (img2) parts.push({ inlineData: { mimeType: 'image/jpeg', data: img2 } });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { maxOutputTokens: 16384, temperature: 0.3 },
        }),
      }
    );

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  private async callClaude(img1: string, img2: string | null, prompt: string): Promise<string> {
    const model = this.config.model || 'claude-sonnet-4-20250514';
    const content: any[] = [
      { type: 'text', text: prompt },
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img1 } },
    ];
    if (img2) {
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img2 } });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2024-01-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 16384,
        messages: [{ role: 'user', content }],
      }),
    });

    const data = await response.json();
    return data.content?.[0]?.text || '';
  }

  private async callOpenAI(img1: string, img2: string | null, prompt: string): Promise<string> {
    const model = this.config.model || 'gpt-4o';
    const content: any[] = [
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${img1}` } },
    ];
    if (img2) {
      content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${img2}` } });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 16384,
        messages: [{ role: 'user', content }],
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * Clean up AI-generated CSS: strip markdown fences, validate basic structure.
   */
  private sanitizeCss(raw: string): string {
    let css = raw.trim();

    // Strip markdown code fences
    css = css.replace(/^```(?:css)?\s*/i, '').replace(/\s*```\s*$/i, '');

    // Strip any leading explanation text before CSS
    const rootIndex = css.indexOf(':root');
    const articleIndex = css.indexOf('article');
    const starIndex = css.indexOf('*');
    const firstSelector = Math.min(
      rootIndex >= 0 ? rootIndex : Infinity,
      articleIndex >= 0 ? articleIndex : Infinity,
      starIndex >= 0 ? starIndex : Infinity
    );
    if (firstSelector !== Infinity && firstSelector > 0) {
      css = css.substring(firstSelector);
    }

    return css;
  }
}
