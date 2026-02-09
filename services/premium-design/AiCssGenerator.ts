// =============================================================================
// AiCssGenerator — AI-powered CSS generation from target website screenshot
// =============================================================================
// Phase 4: Deterministic base CSS + AI enhancement (not AI-from-scratch)

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
    const baseCss = this.generateDeterministicBase(crawledTokens);
    const htmlPreview = articleHtml.substring(0, 3000);
    const sectionManifest = this.extractSectionManifest(articleHtml);
    const prompt = this.buildInitialPrompt(crawledTokens, htmlPreview, sectionManifest, businessContext, baseCss);
    const aiEnhancedCss = await this.callVisionAI(targetScreenshot, null, prompt);
    let css = this.sanitizeCss(aiEnhancedCss);

    // Fallback: if AI returned garbage or near-empty, use the deterministic base
    if (css.length < 200) {
      console.warn('[AiCssGenerator] AI returned insufficient CSS, using deterministic base');
      css = baseCss;
    }

    // Inject Google Fonts @import
    if (crawledTokens.googleFontsUrl) {
      css = `@import url('${crawledTokens.googleFontsUrl}');\n\n${css}`;
    }

    return css;
  }

  async refineCss(
    currentCss: string,
    targetScreenshot: string,
    outputScreenshot: string,
    validationResult: ValidationResult,
    articleHtml?: string,
    crawledTokens?: CrawledCssTokens
  ): Promise<string> {
    const sectionManifest = articleHtml ? this.extractSectionManifest(articleHtml) : '';
    const prompt = this.buildRefinementPrompt(currentCss, validationResult, sectionManifest);
    const aiCss = await this.callVisionAI(targetScreenshot, outputScreenshot, prompt);
    let css = this.sanitizeCss(aiCss);

    // Re-inject Google Fonts @import if it was lost during refinement
    if (crawledTokens?.googleFontsUrl && !css.includes('@import')) {
      css = `@import url('${crawledTokens.googleFontsUrl}');\n\n${css}`;
    }

    return css;
  }

  // ─── Deterministic Base CSS Generator ───────────────────────────────────────
  // Builds ~200 lines of working CSS purely from token values — no AI needed.
  // This guarantees brand colors, fonts, radii, and shadows are correct.

  private generateDeterministicBase(tokens: CrawledCssTokens): string {
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

    return `:root {
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

/* === RESET & BASE === */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font-body); color: var(--brand-text); background: var(--brand-bg); line-height: 1.7; -webkit-font-smoothing: antialiased; }
img { max-width: 100%; height: auto; display: block; }
a { color: var(--brand-primary); text-decoration: underline; text-underline-offset: 2px; transition: color 0.2s; }
a:hover { color: var(--brand-secondary); }

/* === HERO === */
[data-hero] { background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); color: #fff; padding: 3.5rem 2rem; text-align: center; }
[data-hero] h1 { font-family: var(--font-heading); font-size: 2.5rem; font-weight: 800; line-height: 1.2; margin-bottom: 0.75rem; color: #fff; }
[data-hero-subtitle] { font-size: 1.15rem; opacity: 0.9; max-width: 600px; margin: 0 auto; }

/* === CONTENT LAYOUT === */
[data-content-body] { display: flex; flex-direction: column; gap: 1.5rem; max-width: 780px; margin: 0 auto; padding: 2rem 1.5rem; }

/* === TOC === */
nav.toc { background: var(--brand-surface); border-radius: var(--brand-radius); padding: 1.25rem 1.5rem; margin: 1rem auto; max-width: 780px; border: 1px solid var(--brand-border); font-size: 0.85rem; }
nav.toc .toc-title { font-weight: 700; font-size: 0.9rem; margin-bottom: 0.5rem; color: var(--brand-text); }
nav.toc ul { list-style: none; padding: 0; margin: 0; columns: 1; }
nav.toc li { padding: 0.2rem 0; }
nav.toc a { color: var(--brand-primary); text-decoration: none; }
nav.toc a:hover { text-decoration: underline; }
nav.toc[data-toc-compact] ul { columns: 2; column-gap: 2rem; }

/* === BASE SECTION CARD === */
section[data-section-id] { background: var(--brand-bg); border-radius: var(--brand-radius); padding: 2.5rem 2rem; margin-bottom: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06); transition: box-shadow 0.2s, transform 0.2s; }
section[data-section-id]:hover { box-shadow: var(--brand-shadow); }
[data-variant="surface"] { background: var(--brand-surface); border: 1px solid var(--brand-border); }

/* === VISUAL HIERARCHY — emphasis levels === */
[data-emphasis="hero"] { padding: 3rem 2.5rem; background: linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 8%, var(--brand-bg)), var(--brand-bg)); border-left: 5px solid var(--brand-primary); box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
[data-emphasis="hero"] h2 { font-size: 1.9rem; color: var(--brand-primary); }
[data-emphasis="featured"] { padding: 2.5rem 2rem; border-left: 4px solid var(--brand-accent); box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
[data-emphasis="featured"] h2 { font-size: 1.65rem; }
[data-emphasis="standard"] { padding: 2rem 1.75rem; }
[data-emphasis="supporting"] { padding: 1.5rem 1.5rem; opacity: 0.95; }
[data-emphasis="supporting"] h2 { font-size: 1.3rem; }
[data-emphasis="minimal"] { padding: 1.25rem 1.25rem; box-shadow: none; border: 1px solid var(--brand-border); }
[data-emphasis="minimal"] h2 { font-size: 1.2rem; }

/* === SECTION ROLES === */
[data-section-role="definition"] { border-left: 5px solid var(--brand-primary); background: linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 5%, white), var(--brand-bg)); }
[data-section-role="introduction"] [data-intro-text] { font-size: 1.2rem; line-height: 1.8; }
[data-section-role="faq"] { background: var(--brand-surface); }
[data-section-role="summary"] { background: var(--brand-surface); border: 1px dashed var(--brand-border); }

/* === TYPOGRAPHY === */
h1, h2, h3, h4 { font-family: var(--font-heading); color: var(--brand-text); line-height: 1.3; }
h2 { font-size: 1.5rem; font-weight: 700; padding-bottom: 0.75rem; border-bottom: 3px solid transparent; border-image: linear-gradient(90deg, var(--brand-primary), transparent) 1; margin-bottom: 1.5rem; }
h3 { font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; }
h4 { font-size: 1.1rem; font-weight: 600; color: var(--brand-primary); margin-bottom: 0.75rem; }
p { margin-bottom: 1rem; }

/* === INTRO TEXT === */
[data-intro-text] { font-size: 1.15rem; color: var(--brand-text-muted); line-height: 1.7; margin-bottom: 1.5rem; }

/* === PROSE SECTIONS === */
[data-prose-section] { border-left: 4px solid transparent; border-image: linear-gradient(180deg, var(--brand-primary), var(--brand-accent)) 1; }

/* === FEATURE GRID === */
[data-feature-grid] { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; }
[data-feature-grid] li { background: var(--brand-surface); border-radius: var(--brand-radius); padding: 1.5rem; border: 1px solid var(--brand-border); transition: box-shadow 0.2s, transform 0.2s; }
[data-feature-grid] li:hover { box-shadow: var(--brand-shadow); transform: translateY(-2px); }

/* === PULL QUOTE === */
[data-pull-quote] { font-size: 1.35rem; font-style: italic; text-align: center; color: var(--brand-text-muted); border-top: 3px solid var(--brand-primary); border-bottom: 3px solid var(--brand-primary); padding: 1.5rem 2rem; margin: 1.5rem 0; }

/* === STEP LIST === */
[data-step-list] { list-style: none; padding: 0; counter-reset: step-counter; }
[data-step-list] li { counter-increment: step-counter; position: relative; padding-left: 3.5rem; margin-bottom: 1.5rem; min-height: 2.5rem; }
[data-step-list] li::before { content: counter(step-counter); position: absolute; left: 0; top: 0; width: 2.2rem; height: 2.2rem; background: var(--brand-primary); color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9rem; }
[data-step-list] li::after { content: ''; position: absolute; left: 1.05rem; top: 2.4rem; width: 2px; height: calc(100% - 0.5rem); background: var(--brand-border); }
[data-step-list] li:last-child::after { display: none; }

/* === HIGHLIGHT BOX === */
[data-highlight-box] { background: var(--brand-surface); border-left: 4px solid var(--brand-accent); border-radius: var(--brand-radius); padding: 1.5rem; margin: 1rem 0; }

/* === COMPARISON TABLE === */
[data-comparison-table] { overflow: hidden; border-radius: var(--brand-radius); border: 1px solid var(--brand-border); }
[data-comparison-table] table { width: 100%; border-collapse: collapse; }
[data-comparison-table] thead { background: var(--brand-primary); color: #fff; }
[data-comparison-table] th { padding: 0.75rem 1rem; text-align: left; font-weight: 600; }
[data-comparison-table] td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--brand-border); }
[data-comparison-table] tbody tr:nth-child(even) { background: var(--brand-surface); }
[data-comparison-table] tbody tr:hover { background: color-mix(in srgb, var(--brand-primary) 5%, var(--brand-bg)); }

/* === FAQ === */
[data-content-type="faq"] details { border-bottom: 1px solid var(--brand-border); }
[data-content-type="faq"] summary { padding: 1rem 0; cursor: pointer; font-weight: 600; color: var(--brand-text); list-style: none; display: flex; justify-content: space-between; align-items: center; }
[data-content-type="faq"] summary::after { content: '+'; font-size: 1.3rem; color: var(--brand-primary); font-weight: 700; transition: transform 0.2s; }
[data-content-type="faq"] details[open] summary::after { content: '−'; }
[data-content-type="faq"] details > div, [data-content-type="faq"] details > p { padding: 0 0 1rem 0; color: var(--brand-text-muted); }

/* === CTA === */
[data-content-type="cta"] { background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); color: #fff; padding: 3rem 2rem; text-align: center; border-radius: var(--brand-radius); }
[data-content-type="cta"] h2, [data-content-type="cta"] h3 { color: #fff; border: none; }
[data-content-type="cta"] p { color: rgba(255,255,255,0.9); }
[data-cta-button] { display: inline-block; background: #fff; color: var(--brand-primary); padding: 0.85rem 2rem; border-radius: 999px; font-weight: 700; text-decoration: none; transition: transform 0.2s, box-shadow 0.2s; }
[data-cta-button]:hover { transform: scale(1.05); box-shadow: 0 4px 15px rgba(0,0,0,0.2); color: var(--brand-primary); }

/* === FOOTER === */
[data-article-footer] { text-align: center; padding: 2rem; margin-top: 2rem; border-top: 1px solid var(--brand-border); }
[data-footer-text] { color: var(--brand-text-muted); font-size: 0.85rem; }

/* === LISTS & BLOCKQUOTES === */
ul, ol { padding-left: 1.5rem; margin-bottom: 1rem; }
li { margin-bottom: 0.35rem; }
blockquote { border-left: 4px solid var(--brand-primary); padding: 1rem 1.5rem; margin: 1rem 0; color: var(--brand-text-muted); font-style: italic; background: var(--brand-surface); border-radius: 0 var(--brand-radius) var(--brand-radius) 0; }

/* === TABLES (general) === */
table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
th { background: var(--brand-surface); font-weight: 600; text-align: left; padding: 0.6rem 0.8rem; border-bottom: 2px solid var(--brand-border); }
td { padding: 0.6rem 0.8rem; border-bottom: 1px solid var(--brand-border); }

/* === RESPONSIVE === */
@media (max-width: 768px) {
  [data-hero] { padding: 2.5rem 1.25rem; }
  [data-hero] h1 { font-size: 2rem; }
  [data-content-body] { padding: 1rem; }
  [data-feature-grid] { grid-template-columns: 1fr; }
  nav.toc[data-toc-compact] ul { columns: 1; }
  section[data-section-id] { padding: 1.5rem 1.25rem; }
}
@media (max-width: 480px) {
  [data-hero] h1 { font-size: 1.7rem; }
  h2 { font-size: 1.3rem; }
  section[data-section-id] { padding: 1.25rem 1rem; }
}

/* === PRINT === */
@media print {
  body { color: #000; background: #fff; }
  [data-hero] { background: none; color: #000; border-bottom: 2px solid #000; }
  [data-hero] h1 { color: #000; }
  section[data-section-id] { box-shadow: none; border: 1px solid #ccc; break-inside: avoid; }
  a::after { content: " (" attr(href) ")"; font-size: 0.8em; color: #666; }
  [data-content-type="cta"] { background: none; color: #000; border: 2px solid #000; }
}`;
  }

  private buildInitialPrompt(
    tokens: CrawledCssTokens,
    htmlPreview: string,
    sectionManifest: string,
    businessContext?: BusinessContext,
    baseCss?: string
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

    return `You are a senior web designer. Study the target website screenshot and ENHANCE the base CSS below to more closely match the target website's visual style and energy.

## Brand Tokens

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

## Section Manifest (full article structure)

${sectionManifest}

${businessContext ? `Industry: ${businessContext.industry} | Audience: ${businessContext.audience}\n` : ''}
## HTML Preview (truncated)

\`\`\`html
${htmlPreview}
\`\`\`

## Current Base CSS (deterministic — DO NOT remove rules, only enhance)

\`\`\`css
${baseCss}
\`\`\`

## Enhancement Task

The base CSS uses correct brand tokens but looks generic. Study the screenshot and add:
1. **Visual personality** — gradient directions, shadow depths, border styles that match the screenshot
2. **Decorative touches** — brand-specific heading treatments, card hover effects, section transitions
3. **Layout refinements** — spacing adjustments, max-widths that match the target's rhythm
4. **Color intensity** — if the screenshot uses bold/saturated colors, increase intensity; if muted/elegant, reduce

Rules:
- Keep ALL existing rules — only add/modify properties
- Use the CSS custom properties (var(--brand-*))
- Target [data-*] selectors only (plus standard elements like h2, p, a)
- Return the COMPLETE CSS (base + your enhancements merged)
- 300-500 lines total
- Body/main text must always have high contrast — never make text unreadable
- Never use class selectors — only element and [data-*] attribute selectors

## Output

Return ONLY CSS. No markdown fences. No explanations. Start with \`:root {\`.`;
  }

  private buildRefinementPrompt(
    currentCss: string,
    validationResult: ValidationResult,
    sectionManifest: string
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
- Layout Sophistication: ${validationResult.layoutSophistication.score} — ${validationResult.layoutSophistication.notes}
${sectionManifest ? `\n## Section Manifest (full article structure)\n\n${sectionManifest}\n` : ''}
## Available data-* Selectors in the HTML

- \`[data-hero]\`, \`[data-hero-content]\`, \`[data-hero-subtitle]\` — Hero header
- \`[data-content-body]\` — Main content wrapper
- \`[data-section-id]\` — Every section
- \`[data-section-index="N"]\` — Section by index (0-based)
- \`[data-section-count="N"]\` — Total section count
- \`[data-content-type="..."]\` — Content type (prose, faq, steps, comparison, etc.)
- \`[data-section-role="..."]\` — Semantic role (introduction, definition, steps, faq, comparison, summary, list, explanation, etc.)
- \`[data-semantic-weight="1|2|3|4|5"]\` — Importance level (5=highest)
- \`[data-emphasis="hero|featured|standard|supporting|minimal"]\` — Visual treatment level
- \`[data-content-zone="SUPPLEMENTARY"]\` — Non-main content zone
- \`[data-variant="surface"]\` — Alternating surface sections
- \`[data-prose-section]\` — Prose-only sections (no enrichment hooks)
- \`[data-intro-text]\` — First paragraph after each h2
- \`[data-section-inner]\` — Inner wrapper in each section
- \`[data-feature-grid]\` — Short list as card grid
- \`[data-pull-quote]\` — Short blockquote
- \`[data-step-list]\` — Ordered list with step styling
- \`[data-highlight-box]\` — Important/tip callout
- \`[data-comparison-table]\` — Comparison table wrapper
- \`[data-cta-button]\` — CTA link button
- \`[data-toc-count="N"]\` — TOC section count
- \`[data-toc-compact]\` — Long TOC needing 2-column layout
- \`[data-article-footer]\`, \`[data-footer-text]\` — Footer

## Required Fixes
${fixes}

IMPORTANT: Visual hierarchy and brand match are critical.

If Layout Sophistication is below 75, you MUST add these visual hierarchy rules:
- \`[data-emphasis="hero"]\` → generous padding (3rem+), gradient/colored background tint, large heading (1.9rem), thick accent border, elevated shadow
- \`[data-emphasis="featured"]\` → accent left border (4px), slightly elevated shadow, larger heading
- \`[data-emphasis="standard"]\` → clean card with subtle shadow, normal heading
- \`[data-emphasis="supporting"]\` → compact padding (1.5rem), smaller heading, minimal decoration
- \`[data-emphasis="minimal"]\` → no shadow, tight padding, muted border only
- \`[data-section-role="definition"]\` → standout card with primary color accent
- \`[data-section-role="faq"]\` → surface background, accordion styling
- \`[data-prose-section]\` → decorative gradient left border
- \`[data-intro-text]\` → larger/muted text (1.15rem)
- h2 → decorative bottom gradient border
- nav.toc → compact (font-size 0.85rem, max-height controlled), use \`columns: 2\` if \`[data-toc-compact]\`
- At least 3 distinct visual treatments must be visible — if all sections look identical → score below 50

## Current CSS
\`\`\`css
${currentCss.substring(0, 10000)}
\`\`\`

IMAGE 1 = target website, IMAGE 2 = current output.

Apply ALL fixes. Return the COMPLETE revised CSS (not a diff). Enhance visual sophistication — the page should impress a design agency creative director. Keep text readable (dark on light or light on dark, never colored bg on body text).

Return ONLY CSS. No markdown fences. No explanations.`;
  }

  private extractSectionManifest(html: string): string {
    const lines: string[] = [];
    const sectionRegex = /<section[^>]*data-section-id="([^"]*)"[^>]*>/gi;
    let match;

    // Count H2s for TOC line
    const tocMatch = html.match(/data-toc-count="(\d+)"/);
    const tocCount = tocMatch ? parseInt(tocMatch[1]) : 0;
    if (tocCount > 0) {
      lines.push(`TOC: ${tocCount} sections${html.includes('data-toc-compact') ? ' (compact 2-col)' : ''}`);
    }

    while ((match = sectionRegex.exec(html)) !== null) {
      const tag = match[0];
      const indexMatch = tag.match(/data-section-index="(\d+)"/);
      const index = indexMatch ? indexMatch[1] : '?';

      // Extract new intelligence attributes
      const roleMatch = tag.match(/data-section-role="([^"]*)"/);
      const weightMatch = tag.match(/data-semantic-weight="(\d)"/);
      const emphasisMatch = tag.match(/data-emphasis="([^"]*)"/);
      const zoneMatch = tag.match(/data-content-zone="([^"]*)"/);

      const role = roleMatch ? roleMatch[1] : 'prose';
      const weight = weightMatch ? weightMatch[1] : '3';
      const emphasis = emphasisMatch ? emphasisMatch[1] : 'standard';
      const zone = zoneMatch ? zoneMatch[1] : 'MAIN';

      // Find heading text from section content
      const sectionStart = match.index;
      const sectionEnd = html.indexOf('</section>', sectionStart);
      const sectionContent = sectionEnd > sectionStart ? html.substring(sectionStart, sectionEnd) : '';
      const headingMatch = sectionContent.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
      const headingText = headingMatch ? headingMatch[1].replace(/<[^>]+>/g, '').trim() : '';

      // Find enrichment hooks
      const hooks: string[] = [];
      if (sectionContent.includes('data-feature-grid')) hooks.push('feature-grid');
      if (sectionContent.includes('data-pull-quote')) hooks.push('pull-quote');
      if (sectionContent.includes('data-step-list')) hooks.push('step-list');
      if (sectionContent.includes('data-highlight-box')) hooks.push('highlight-box');
      if (sectionContent.includes('data-comparison-table')) hooks.push('comparison-table');
      if (sectionContent.includes('data-intro-text')) hooks.push('intro-text');

      const hookStr = hooks.length > 0 ? ` {${hooks.join(', ')}}` : '';
      const zoneStr = zone !== 'MAIN' ? ` zone:${zone}` : '';

      // Build rich manifest line
      let line = `#${index} "${headingText}" [${role}] weight:${weight}/5 emphasis:${emphasis}${zoneStr}${hookStr}`;

      // Add design suggestion based on role + emphasis
      const suggestion = this.getDesignSuggestion(role, emphasis);
      if (suggestion) {
        line += `\n   -> ${suggestion}`;
      }

      lines.push(line);
    }

    // Check for CTA section
    if (html.includes('data-content-type="cta"')) {
      lines.push('#cta [cta] weight:3/5 emphasis:featured\n   -> Full-width gradient CTA banner with prominent button');
    }

    return lines.length > 0 ? lines.join('\n') : 'No sections detected';
  }

  /** Generate a design suggestion based on section role and emphasis level */
  private getDesignSuggestion(role: string, emphasis: string): string {
    const prefix = emphasis === 'hero' || emphasis === 'featured' ? `${emphasis.toUpperCase()}: ` : '';

    switch (role) {
      case 'introduction':
        return `${prefix}Lead paragraph with larger text, subtle background`;
      case 'definition':
        return `${prefix}Standout card with accent border, clear heading`;
      case 'explanation':
        return `${prefix}Clean prose section with readable typography`;
      case 'list':
        return `${prefix}Card grid layout for visual interest`;
      case 'steps':
        return `${prefix}Numbered step cards or timeline layout`;
      case 'comparison':
        return `${prefix}Styled table with branded headers`;
      case 'faq':
        return emphasis === 'supporting' || emphasis === 'minimal'
          ? 'SUPPORTING: Compact accordion cards'
          : `${prefix}Clean accordion cards with expand indicators`;
      case 'summary':
        return emphasis === 'supporting' || emphasis === 'minimal'
          ? 'SUPPORTING: Compact summary box'
          : `${prefix}Key takeaways card`;
      case 'testimonial':
        return `${prefix}Styled blockquote with decorative marks`;
      case 'data':
        return `${prefix}Data visualization with stat highlights`;
      default:
        return `${prefix}Visual card treatment`;
    }
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

    // Also strip @import lines from AI output — we inject our own
    const importIndex = css.indexOf('@import');
    const rootIndex = css.indexOf(':root');
    const articleIndex = css.indexOf('article');
    const bodyIndex = css.indexOf('body');
    const starIndex = css.indexOf('*');
    const firstSelector = Math.min(
      importIndex >= 0 ? importIndex : Infinity,
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
