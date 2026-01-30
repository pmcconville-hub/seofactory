/**
 * StandaloneCssGenerator
 *
 * Generates standalone CSS from extracted brand components.
 * Uses LITERAL CSS values from the target site - NO templates.
 *
 * The key principle: we use THEIR CSS, not our generated templates.
 * CRITICAL: Also includes ComponentStyles for agency-quality visual components.
 */

import type {
  ExtractedComponent,
  ExtractedTokens,
  SynthesizedComponent
} from '../../types/brandExtraction';
import { generateComponentStyles } from '../publishing/renderer/ComponentStyles';

export class StandaloneCssGenerator {
  /**
   * Generate standalone CSS from extracted components.
   * Prioritizes literal CSS from the target site.
   */
  generate(
    components: ExtractedComponent[],
    synthesized: SynthesizedComponent[],
    tokens: ExtractedTokens
  ): string {
    const sections: string[] = [];

    // Header
    sections.push('/* Brand CSS - Extracted from target site */');
    sections.push('');

    // CSS custom properties from extracted tokens
    sections.push('/* Extracted design tokens */');
    sections.push(this.generateRootTokens(tokens));
    sections.push('');

    // LITERAL CSS from extracted components - this is the key
    for (const component of components) {
      if (component.literalCss && component.literalCss.trim()) {
        // CRITICAL FIX: Filter out WordPress/theme-specific CSS before including
        const filteredCss = this.filterContaminatedCss(component.literalCss);
        if (filteredCss.trim()) {
          sections.push(`/* Extracted: ${component.visualDescription || 'Component'} */`);
          sections.push(filteredCss);
          sections.push('');
        }
      }
    }

    // Synthesized components (AI-generated for missing patterns)
    for (const synth of synthesized) {
      if (synth.generatedCss) {
        sections.push(`/* Synthesized: ${synth.visualDescription} */`);
        sections.push(synth.generatedCss);
        sections.push('');
      }
    }

    // Minimal base styles (only if no literal CSS was extracted)
    const hasLiteralCss = components.some(c => c.literalCss && c.literalCss.trim());
    if (!hasLiteralCss) {
      sections.push('/* Minimal base styles - no literal CSS was extracted */');
      sections.push(this.generateMinimalBase(tokens));
    }

    // CRITICAL FIX: Include ComponentStyles for agency-quality visual components
    // This ensures rich styling for .card, .feature-grid, .timeline, etc.
    const primaryColor = tokens.colors?.values?.find(c => c.usage?.includes('primary'))?.hex || '#3b82f6';
    const secondaryColor = tokens.colors?.values?.find(c => c.usage?.includes('secondary'))?.hex || '#64748b';
    const accentColor = tokens.colors?.values?.find(c => c.usage?.includes('accent'))?.hex || '#f59e0b';
    const bgColor = tokens.colors?.values?.find(c => c.usage?.includes('background'))?.hex || '#ffffff';
    const textColor = tokens.colors?.values?.find(c => c.usage?.includes('text'))?.hex || '#1f2937';
    const headingFont = tokens.typography?.headings?.fontFamily || 'system-ui, -apple-system, sans-serif';
    const bodyFont = tokens.typography?.body?.fontFamily || 'system-ui, -apple-system, sans-serif';

    sections.push('');
    sections.push('/* Agency-Quality Component Styles */');
    sections.push(generateComponentStyles({
      primaryColor,
      primaryDark: this.darkenColor(primaryColor),
      secondaryColor,
      accentColor,
      textColor,
      textMuted: '#6b7280',
      backgroundColor: bgColor,
      surfaceColor: '#f9fafb',
      borderColor: '#e5e7eb',
      headingFont,
      bodyFont,
      radiusSmall: tokens.borders?.radiusSmall || '4px',
      radiusMedium: tokens.borders?.radiusMedium || '8px',
      radiusLarge: tokens.borders?.radiusLarge || '16px',
    }));

    return sections.join('\n').trim();
  }

  /**
   * Darken a hex color by a percentage.
   */
  private darkenColor(hex: string, percent: number = 20): string {
    // Remove # if present
    hex = hex.replace(/^#/, '');

    // Parse hex to RGB
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    // Darken
    r = Math.max(0, Math.floor(r * (1 - percent / 100)));
    g = Math.max(0, Math.floor(g * (1 - percent / 100)));
    b = Math.max(0, Math.floor(b * (1 - percent / 100)));

    // Convert back to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * Generate CSS custom properties from extracted tokens.
   */
  private generateRootTokens(tokens: ExtractedTokens): string {
    const properties: string[] = [];

    // Colors
    if (tokens.colors?.values) {
      tokens.colors.values.forEach((color, index) => {
        const varName = color.usage
          ? `--brand-${color.usage.replace(/\s+/g, '-').replace(/[^a-z0-9-]/gi, '').toLowerCase()}`
          : `--brand-color-${index}`;
        properties.push(`  ${varName}: ${color.hex};`);
      });
    }

    // Typography
    if (tokens.typography) {
      if (tokens.typography.headings) {
        properties.push(`  --brand-font-heading: ${tokens.typography.headings.fontFamily};`);
        properties.push(`  --brand-font-weight-heading: ${tokens.typography.headings.fontWeight};`);
      }
      if (tokens.typography.body) {
        properties.push(`  --brand-font-body: ${tokens.typography.body.fontFamily};`);
        properties.push(`  --brand-font-weight-body: ${tokens.typography.body.fontWeight};`);
        properties.push(`  --brand-line-height: ${tokens.typography.body.lineHeight};`);
      }
    }

    // Spacing
    if (tokens.spacing) {
      if (tokens.spacing.sectionGap) properties.push(`  --brand-spacing-section: ${tokens.spacing.sectionGap};`);
      if (tokens.spacing.cardPadding) properties.push(`  --brand-spacing-card: ${tokens.spacing.cardPadding};`);
      if (tokens.spacing.contentWidth) properties.push(`  --brand-content-width: ${tokens.spacing.contentWidth};`);
    }

    // Shadows
    if (tokens.shadows) {
      if (tokens.shadows.card) properties.push(`  --brand-shadow-card: ${tokens.shadows.card};`);
      if (tokens.shadows.elevated) properties.push(`  --brand-shadow-elevated: ${tokens.shadows.elevated};`);
    }

    // Borders
    if (tokens.borders) {
      if (tokens.borders.radiusSmall) properties.push(`  --brand-radius-sm: ${tokens.borders.radiusSmall};`);
      if (tokens.borders.radiusMedium) properties.push(`  --brand-radius-md: ${tokens.borders.radiusMedium};`);
      if (tokens.borders.radiusLarge) properties.push(`  --brand-radius-lg: ${tokens.borders.radiusLarge};`);
      if (tokens.borders.defaultColor) properties.push(`  --brand-border-color: ${tokens.borders.defaultColor};`);
    }

    if (properties.length === 0) {
      return ':root { /* No tokens extracted */ }';
    }

    return `:root {\n${properties.join('\n')}\n}`;
  }

  /**
   * Generate minimal base styles using extracted tokens.
   * Only used when no literal CSS was extracted.
   */
  private generateMinimalBase(tokens: ExtractedTokens): string {
    const primaryColor = tokens.colors?.values?.find(c => c.usage?.includes('primary'))?.hex || '#333';
    const fontFamily = tokens.typography?.body?.fontFamily || 'system-ui, sans-serif';
    const lineHeight = tokens.typography?.body?.lineHeight || 1.6;

    return `
.brand-article {
  font-family: ${fontFamily};
  line-height: ${lineHeight};
  color: ${primaryColor};
  max-width: var(--brand-content-width, 800px);
  margin: 0 auto;
  padding: var(--brand-spacing-card, 1.5rem);
}
.brand-article h1, .brand-article h2, .brand-article h3 {
  font-family: var(--brand-font-heading, ${fontFamily});
  font-weight: var(--brand-font-weight-heading, 700);
  line-height: 1.3;
}
.brand-article p { margin-bottom: 1rem; }
.brand-article a { color: ${primaryColor}; }
`;
  }

  /**
   * Filter out WordPress/CMS-specific CSS selectors that contaminate output.
   * Removes Astra theme, WP blocks, and other irrelevant framework CSS.
   */
  private filterContaminatedCss(css: string): string {
    if (!css) return '';

    let filtered = css;

    // WordPress/Astra theme selectors - these are site-specific, not brand
    const wpPatterns = [
      // Astra theme
      /\.ast-[a-zA-Z0-9_-]+\s*\{[^}]*\}/g,
      /\.astra-[a-zA-Z0-9_-]+\s*\{[^}]*\}/g,
      // WordPress blocks
      /\.wp-block-[a-zA-Z0-9_-]+\s*\{[^}]*\}/g,
      /\.wp-[a-zA-Z0-9_-]+\s*\{[^}]*\}/g,
      // WordPress admin
      /\.wp-admin[^{]*\{[^}]*\}/g,
      // Elementor
      /\.elementor-[a-zA-Z0-9_-]+\s*\{[^}]*\}/g,
      // Divi
      /\.et_pb_[a-zA-Z0-9_-]+\s*\{[^}]*\}/g,
      /\.et-[a-zA-Z0-9_-]+\s*\{[^}]*\}/g,
      // Cookie consent related
      /\.CybotCookiebot[a-zA-Z0-9_-]*\s*\{[^}]*\}/g,
      /\.CookiebotDialog[a-zA-Z0-9_-]*\s*\{[^}]*\}/g,
      /\#CybotCookiebot[a-zA-Z0-9_-]*\s*\{[^}]*\}/g,
      /\.onetrust-[a-zA-Z0-9_-]+\s*\{[^}]*\}/g,
      /\.ot-sdk-[a-zA-Z0-9_-]+\s*\{[^}]*\}/g,
      /\.cc-[a-zA-Z0-9_-]+\s*\{[^}]*\}/g,
      // Yoast
      /\.yoast-[a-zA-Z0-9_-]+\s*\{[^}]*\}/g,
      // WPForms
      /\.wpforms-[a-zA-Z0-9_-]+\s*\{[^}]*\}/g,
      // Contact Form 7
      /\.wpcf7-[a-zA-Z0-9_-]+\s*\{[^}]*\}/g,
      // Gravity Forms
      /\.gform_[a-zA-Z0-9_-]+\s*\{[^}]*\}/g,
      // WooCommerce
      /\.woocommerce[a-zA-Z0-9_-]*\s*\{[^}]*\}/g,
      // Data attribute selectors that are WordPress-specific
      /\[data-section="section-header[^{]+\{[^}]*\}/g,
      /\[data-elementor[^{]+\{[^}]*\}/g,
    ];

    let removedCount = 0;
    for (const pattern of wpPatterns) {
      const before = filtered.length;
      filtered = filtered.replace(pattern, '');
      if (filtered.length !== before) {
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`[StandaloneCssGenerator] Filtered ${removedCount} contaminated CSS patterns`);
    }

    // Clean up empty lines and excessive whitespace
    filtered = filtered.replace(/\n\s*\n\s*\n/g, '\n\n');

    return filtered.trim();
  }
}
