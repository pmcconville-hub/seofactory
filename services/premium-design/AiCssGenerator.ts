// =============================================================================
// AiCssGenerator — AI-powered CSS generation from target website screenshot
// =============================================================================

import type { CrawledCssTokens, ValidationResult, PremiumDesignConfig, BusinessContext } from './types';

export class AiCssGenerator {
  private config: PremiumDesignConfig;

  constructor(config: PremiumDesignConfig) {
    this.config = config;
  }

  async generateInitialCss(
    targetScreenshot: string,
    crawledTokens: CrawledCssTokens,
    articleHtml: string,
    businessContext?: BusinessContext
  ): Promise<string> {
    const htmlPreview = articleHtml.substring(0, 6000);
    const sectionTypes = this.extractSectionTypes(articleHtml);
    const prompt = this.buildInitialPrompt(crawledTokens, htmlPreview, sectionTypes, businessContext);
    const css = await this.callVisionAI(targetScreenshot, null, prompt);
    return this.sanitizeCss(css);
  }

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

  private buildInitialPrompt(
    tokens: CrawledCssTokens,
    htmlPreview: string,
    sectionTypes: string[],
    businessContext?: BusinessContext
  ): string {
    const primary = tokens.colors.find(c => c.usage === 'primary')?.hex || '#1a1a2e';
    const secondary = tokens.colors.find(c => c.usage === 'secondary')?.hex || '#16213e';
    const accent = tokens.colors.find(c => c.usage === 'accent')?.hex || primary;
    const bg = tokens.colors.find(c => c.usage === 'background')?.hex || '#ffffff';
    const text = tokens.colors.find(c => c.usage === 'text')?.hex || '#1a1a1a';
    const textMuted = tokens.colors.find(c => c.usage === 'text-muted')?.hex || '#6b7280';
    const surface = tokens.colors.find(c => c.usage === 'surface')?.hex || '#f9fafb';
    const border = tokens.colors.find(c => c.usage === 'border')?.hex || '#e5e7eb';
    const headingFont = tokens.fonts.find(f => f.usage === 'heading')?.family || 'system-ui, sans-serif';
    const bodyFont = tokens.fonts.find(f => f.usage === 'body')?.family || 'system-ui, sans-serif';
    const radius = tokens.borderRadius[0] || '8px';
    const shadow = tokens.shadows[0] || '0 4px 6px rgba(0,0,0,0.07)';

    return `You are a senior web designer at a top design agency. Study the screenshot of the target website carefully. Your job is to write CSS that makes an article page feel like a native page on that website — matching its exact visual DNA: color palette, typography, spacing rhythm, and visual sophistication.

SCREENSHOT: The attached image is the target website. Observe its:
- Header/hero styling, background treatment
- Card/section styling patterns, shadows, borders
- Button and link styling
- Whitespace rhythm and spacing patterns
- Decorative elements (gradients, borders, subtle backgrounds)

## Extracted Brand Tokens

:root {
  --brand-primary: ${primary};
  --brand-secondary: ${secondary};
  --brand-accent: ${accent};
  --brand-bg: ${bg};
  --brand-text: ${text};
  --brand-text-muted: ${textMuted};
  --brand-surface: ${surface};
  --brand-border: ${border};
  --brand-radius: ${radius};
  --brand-shadow: ${shadow};
  --font-heading: ${headingFont};
  --font-body: ${bodyFont};
}

## HTML to style (truncated)

\`\`\`html
${htmlPreview}
\`\`\`

Content types present: ${sectionTypes.join(', ')}
${businessContext ? `Industry: ${businessContext.industry} | Audience: ${businessContext.audience}` : ''}

## Design Requirements — Agency Quality

Write a COMPLETE CSS stylesheet (300-600 lines, quality over quantity). The result must look like a premium editorial page designed by a professional agency, NOT a generic blog.

### Mandatory Design Patterns

1. **Page structure**: White/light background body, centered content column (max-width: 720px), generous vertical rhythm (section margins: 3-4rem)

2. **Hero header**: The article \`header\` must be visually prominent — use a subtle background gradient or tinted band using the brand primary color at low opacity (5-12%). Add generous padding (3rem+). The h1 should be large (2.2-2.8rem), bold, with tight line-height.

3. **Section cards**: Alternate some sections with a subtle surface background (\`var(--brand-surface)\`) and rounded corners (\`var(--brand-radius)\`) with padding to create visual rhythm. NOT every section — roughly every 2nd or 3rd.

4. **Table of Contents (nav.toc)**: Styled as a compact sidebar-style card with surface background, clear visual separation, and brand-colored active links.

5. **Typography hierarchy**: Clear visual distinction between h1 > h2 > h3 > h4. Use heading font for headings, body font for text. h2 should have a decorative left border or underline using brand primary.

6. **Links**: Brand primary color, no underline by default, underline on hover. Subtle transition.

7. **Tables**: Clean with horizontal borders only (no grid), alternating row backgrounds, rounded container.

8. **Blockquotes**: Left border in brand primary, subtle surface background, italic.

9. **FAQ sections** (\`[data-content-type="faq"]\`): details/summary styled as expandable cards with brand-colored marker and hover effects.

10. **CTA section** (\`[data-content-type="cta"]\`): Prominent card with brand primary background, white text, rounded corners, centered content, subtle shadow. Must look like a conversion element.

11. **Visual separators**: Use subtle \`::after\` pseudo-elements on sections for decorative dividers (thin lines, dots, or gradient fades — match the brand's style from the screenshot).

12. **Images/figures**: Full-width within content, subtle border-radius, optional subtle shadow. Captions in muted text, small font.

13. **Lists**: Custom styled bullets/numbers using brand color. Adequate spacing between items.

14. **Responsive**: At 768px reduce font sizes, stack elements. At 480px further reduce padding.

15. **Print**: Clean black-on-white, show URLs after links, hide decorative elements.

### Critical Rules

- Use the exact brand token values from :root variables above
- Target semantic elements and \`[data-*]\` attribute selectors — no class names
- Do NOT apply solid brand color as background to text sections (this makes text unreadable)
- White or very light backgrounds for text content sections, brand colors only for accents, borders, and CTAs
- The body/main text must always have high contrast (dark text on light bg or vice versa)

## Output

Return ONLY CSS. No markdown fences. No explanations. Start with \`:root {\`.`;
  }

  private buildRefinementPrompt(
    currentCss: string,
    validationResult: ValidationResult
  ): string {
    const fixes = validationResult.cssFixInstructions
      .map((fix, i) => `${i + 1}. ${fix}`)
      .join('\n');

    return `You are refining a CSS stylesheet to better match a target website design.

## Current Scores
- Overall: ${validationResult.overallScore}/100
- Color Match: ${validationResult.colorMatch.score} — ${validationResult.colorMatch.notes}
- Typography: ${validationResult.typographyMatch.score} — ${validationResult.typographyMatch.notes}
- Spacing: ${validationResult.spacingMatch.score} — ${validationResult.spacingMatch.notes}
- Visual Depth: ${validationResult.visualDepth.score} — ${validationResult.visualDepth.notes}
- Brand Fit: ${validationResult.brandFit.score} — ${validationResult.brandFit.notes}

## Required Fixes
${fixes}

## Current CSS
\`\`\`css
${currentCss.substring(0, 10000)}
\`\`\`

IMAGE 1 = target website, IMAGE 2 = current output.

Apply ALL fixes. Return the COMPLETE revised CSS (not a diff). Maintain professional editorial quality — the page must look like it was designed by an agency, not auto-generated. Keep text readable (dark on light or light on dark, never colored bg on body text).

Return ONLY CSS. No markdown fences. No explanations.`;
  }

  private extractSectionTypes(html: string): string[] {
    const types = new Set<string>();
    const regex = /data-content-type="([^"]+)"/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      types.add(match[1]);
    }
    return Array.from(types);
  }

  private async callVisionAI(
    image1Base64: string,
    image2Base64: string | null,
    prompt: string
  ): Promise<string> {
    switch (this.config.aiProvider) {
      case 'gemini': return this.callGemini(image1Base64, image2Base64, prompt);
      case 'anthropic': return this.callClaude(image1Base64, image2Base64, prompt);
      case 'openai': return this.callOpenAI(image1Base64, image2Base64, prompt);
      default: return this.callGemini(image1Base64, image2Base64, prompt);
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
          generationConfig: { maxOutputTokens: 8192, temperature: 0.4 },
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
      body: JSON.stringify({ model, max_tokens: 8192, messages: [{ role: 'user', content }] }),
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
      body: JSON.stringify({ model, max_tokens: 8192, messages: [{ role: 'user', content }] }),
    });
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  private sanitizeCss(raw: string): string {
    let css = raw.trim();
    css = css.replace(/^```(?:css)?\s*/i, '').replace(/\s*```\s*$/i, '');

    const rootIndex = css.indexOf(':root');
    const articleIndex = css.indexOf('article');
    const bodyIndex = css.indexOf('body');
    const starIndex = css.indexOf('*');
    const firstSelector = Math.min(
      rootIndex >= 0 ? rootIndex : Infinity,
      articleIndex >= 0 ? articleIndex : Infinity,
      bodyIndex >= 0 ? bodyIndex : Infinity,
      starIndex >= 0 ? starIndex : Infinity
    );
    if (firstSelector !== Infinity && firstSelector > 0) {
      css = css.substring(firstSelector);
    }

    return css;
  }
}
