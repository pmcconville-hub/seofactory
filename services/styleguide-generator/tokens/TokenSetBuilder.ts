// services/styleguide-generator/tokens/TokenSetBuilder.ts
// Assembles a complete DesignTokenSet from a BrandAnalysis.
// 100% deterministic — no AI calls. All values derived from extracted data.

import type { DesignTokenSet, BrandAnalysis, TypographySizeSpec } from '../types';
import { generateColorScale, generateGrayScale, generateSemanticColors, hexToHSL } from './ColorScaleGenerator';
import { generatePrefix } from './PrefixGenerator';

// ============================================================================
// TYPOGRAPHY DEFAULTS
// ============================================================================

/** Default type scale when extraction data is incomplete */
const DEFAULT_TYPE_SIZES: Record<string, TypographySizeSpec> = {
  h1: { size: '2.5rem', weight: 700, lineHeight: 1.2, letterSpacing: '-0.025em' },
  h2: { size: '2rem', weight: 700, lineHeight: 1.25, letterSpacing: '-0.02em' },
  h3: { size: '1.75rem', weight: 600, lineHeight: 1.3, letterSpacing: '-0.015em' },
  h4: { size: '1.5rem', weight: 600, lineHeight: 1.35, letterSpacing: '-0.01em' },
  h5: { size: '1.25rem', weight: 600, lineHeight: 1.4, letterSpacing: '0' },
  h6: { size: '1.125rem', weight: 600, lineHeight: 1.4, letterSpacing: '0' },
  body: { size: '1rem', weight: 400, lineHeight: 1.6, letterSpacing: '0' },
  small: { size: '0.875rem', weight: 400, lineHeight: 1.5, letterSpacing: '0.01em' },
  label: { size: '0.875rem', weight: 500, lineHeight: 1.4, letterSpacing: '0.02em' },
  caption: { size: '0.75rem', weight: 400, lineHeight: 1.5, letterSpacing: '0.03em' },
};

// ============================================================================
// SPACING / RADIUS DERIVATION
// ============================================================================

/**
 * Parse a CSS size string (e.g., "16px", "1.5rem") to a numeric px value.
 * Falls back to provided default if parsing fails.
 */
function parseSizeToPx(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const numMatch = value.match(/^([\d.]+)\s*(px|rem|em)?$/i);
  if (!numMatch) return fallback;
  const num = parseFloat(numMatch[1]);
  const unit = (numMatch[2] || 'px').toLowerCase();
  if (unit === 'rem' || unit === 'em') return num * 16;
  return num;
}

/**
 * Derive radius scale from extracted shapes.
 * Uses the button radius as the "md" anchor and scales from there.
 */
function deriveRadiusScale(shapes: BrandAnalysis['shapes']): DesignTokenSet['radius'] {
  const buttonPx = parseSizeToPx(shapes.buttonRadius, 8);

  // If the button radius is very large, the brand prefers rounded
  // If small (< 4px), the brand prefers sharp
  const isRounded = buttonPx >= 12;
  const isSharp = buttonPx <= 3;

  if (isSharp) {
    return {
      sm: '2px', md: '4px', lg: '6px', xl: '8px', '2xl': '12px', full: '9999px',
    };
  }

  if (isRounded) {
    return {
      sm: '6px', md: '12px', lg: '16px', xl: '24px', '2xl': '32px', full: '9999px',
    };
  }

  // Default balanced scale
  return {
    sm: '4px', md: '8px', lg: '12px', xl: '16px', '2xl': '24px', full: '9999px',
  };
}

/**
 * Derive spacing scale from extracted spacing data.
 * Uses section padding as an anchor for the "lg" step.
 */
function deriveSpacingScale(spacing: BrandAnalysis['spacing']): DesignTokenSet['spacing'] {
  const sectionPx = parseSizeToPx(spacing.sectionPadding?.desktop, 64);

  // Use section padding as the "xl" anchor, derive the rest proportionally
  const base = Math.max(4, Math.round(sectionPx / 16)); // ~4px

  return {
    xs: `${base}px`,
    sm: `${base * 2}px`,
    md: `${base * 4}px`,
    lg: `${base * 6}px`,
    xl: `${base * 8}px`,
    '2xl': `${base * 12}px`,
    '3xl': `${base * 16}px`,
    '4xl': `${base * 24}px`,
  };
}

/**
 * Derive shadow scale using the primary brand color for tinted shadows.
 */
function deriveShadowScale(primaryHex: string): DesignTokenSet['shadows'] {
  const { h, s } = hexToHSL(primaryHex);
  // Tinted shadow uses brand hue with low saturation
  const shadowHue = h;
  const shadowSat = Math.min(s, 30);

  return {
    sm: `0 1px 2px 0 rgba(0,0,0,0.05)`,
    md: `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)`,
    lg: `0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)`,
    xl: `0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)`,
    colored: `0 4px 14px -3px hsla(${shadowHue}, ${shadowSat}%, 40%, 0.25)`,
    coloredLg: `0 10px 25px -5px hsla(${shadowHue}, ${shadowSat}%, 40%, 0.3)`,
    red: `0 4px 14px -3px rgba(220, 38, 38, 0.3)`,
    inner: `inset 0 2px 4px 0 rgba(0,0,0,0.06)`,
  };
}

// ============================================================================
// TOKEN SET BUILDER
// ============================================================================

/**
 * Build a complete DesignTokenSet from a BrandAnalysis.
 * This is the core transformation: raw extraction → structured design tokens.
 * 100% deterministic — no AI, no randomness.
 */
export function buildTokenSet(analysis: BrandAnalysis): DesignTokenSet {
  const prefix = generatePrefix(analysis.brandName);

  // ─── Colors ────────────────────────────────────────────────────────────
  const primaryScale = generateColorScale(analysis.colors.primary);
  const secondaryScale = analysis.colors.secondary
    ? generateColorScale(analysis.colors.secondary)
    : undefined;
  const accentScale = analysis.colors.accent
    ? generateColorScale(analysis.colors.accent)
    : undefined;
  const grayScale = generateGrayScale(analysis.colors.primary);
  const semanticColors = generateSemanticColors(analysis.colors.primary);

  // ─── Typography ────────────────────────────────────────────────────────
  const headingFamily = analysis.typography.headingFont.family || 'system-ui';
  const bodyFamily = analysis.typography.bodyFont.family || 'system-ui';

  // Build Google Fonts URL from extracted fonts
  const googleFontsUrl = buildGoogleFontsUrl(analysis.typography);

  // Merge extracted sizes with defaults
  const sizes = buildTypographySizes(analysis);

  // ─── Spacing, Radius, Shadows ──────────────────────────────────────────
  const spacing = deriveSpacingScale(analysis.spacing);
  const radius = deriveRadiusScale(analysis.shapes);
  const shadows = deriveShadowScale(analysis.colors.primary);

  return {
    prefix,
    colors: {
      primary: primaryScale,
      ...(secondaryScale && { secondary: secondaryScale }),
      ...(accentScale && { accent: accentScale }),
      gray: grayScale,
      semantic: semanticColors,
    },
    typography: {
      headingFont: formatFontFamily(headingFamily),
      bodyFont: formatFontFamily(bodyFamily),
      googleFontsUrl,
      sizes,
    },
    spacing,
    radius,
    shadows,
    transitions: {
      fast: '150ms ease',
      base: '250ms ease',
      slow: '400ms ease',
    },
    containers: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1440px',
    },
    zIndex: {
      base: 0,
      dropdown: 1000,
      sticky: 1020,
      overlay: 1040,
      modal: 1060,
      toast: 1080,
    },
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Format a font family name for CSS use.
 * Wraps multi-word names in quotes, adds generic fallback.
 */
function formatFontFamily(family: string): string {
  const trimmed = family.trim().replace(/['"]/g, '');
  if (!trimmed || trimmed === 'system-ui') return 'system-ui, sans-serif';

  // Check if it's already a generic family
  const generics = ['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui'];
  if (generics.includes(trimmed.toLowerCase())) return trimmed.toLowerCase();

  // Wrap in quotes if it contains spaces
  const quoted = trimmed.includes(' ') ? `'${trimmed}'` : trimmed;

  // Add appropriate generic fallback
  const isSerif = /serif/i.test(trimmed) && !/sans/i.test(trimmed);
  const generic = isSerif ? 'serif' : 'sans-serif';
  return `${quoted}, ${generic}`;
}

/**
 * Build a Google Fonts URL from extracted font data.
 */
function buildGoogleFontsUrl(typography: BrandAnalysis['typography']): string {
  // If either font already has a googleFontsUrl, use it directly
  if (typography.headingFont.googleFontsUrl) return typography.headingFont.googleFontsUrl;
  if (typography.bodyFont.googleFontsUrl) return typography.bodyFont.googleFontsUrl;

  const families: string[] = [];

  // Build heading font specifier
  if (typography.headingFont.family && typography.headingFont.family !== 'system-ui') {
    const weights = typography.headingFont.weights.length > 0
      ? typography.headingFont.weights.join(';')
      : '400;600;700';
    families.push(`family=${encodeURIComponent(typography.headingFont.family)}:wght@${weights}`);
  }

  // Build body font specifier (only if different from heading)
  if (
    typography.bodyFont.family &&
    typography.bodyFont.family !== 'system-ui' &&
    typography.bodyFont.family !== typography.headingFont.family
  ) {
    const weights = typography.bodyFont.weights.length > 0
      ? typography.bodyFont.weights.join(';')
      : '400;500;600';
    families.push(`family=${encodeURIComponent(typography.bodyFont.family)}:wght@${weights}`);
  }

  if (families.length === 0) return '';
  return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
}

/**
 * Merge extracted type sizes with defaults to produce the full 10-level type scale.
 */
function buildTypographySizes(
  analysis: BrandAnalysis
): DesignTokenSet['typography']['sizes'] {
  const extracted = analysis.typography.sizes;
  const headingLH = analysis.typography.lineHeights?.heading || 1.2;
  const bodyLH = analysis.typography.lineHeights?.body || 1.6;
  const ls = analysis.typography.letterSpacing || {};

  const result: Record<string, TypographySizeSpec> = {};

  for (const key of Object.keys(DEFAULT_TYPE_SIZES)) {
    const def = DEFAULT_TYPE_SIZES[key];
    const extractedSize = extracted[key as keyof typeof extracted];
    const isHeading = key.startsWith('h');

    result[key] = {
      size: extractedSize || def.size,
      weight: def.weight, // keep default weights (extraction rarely gives good weight data)
      lineHeight: isHeading ? headingLH : bodyLH,
      letterSpacing: ls[key as keyof typeof ls] || def.letterSpacing,
    };
  }

  return result as DesignTokenSet['typography']['sizes'];
}
