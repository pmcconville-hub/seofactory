// services/styleguide-generator/extraction/ExtractionAnalyzer.ts
// Normalizes raw extraction data (from HTTP or Apify) into BrandAnalysis.

import type { BrandAnalysis, ExtractedColor, ExtractedFont } from '../types';
import type { RawHttpExtraction, ExtractedCssFont } from './HttpExtractor';

// ============================================================================
// ANALYSIS FROM HTTP EXTRACTION
// ============================================================================

/**
 * Normalize HTTP extraction data into a structured BrandAnalysis.
 */
export function analyzeHttpExtraction(
  raw: RawHttpExtraction,
  domain: string,
): BrandAnalysis {
  // ─── Brand Identity ──────────────────────────────────────────────────
  const brandName = deriveBrandName(raw.title, domain);

  // ─── Colors ──────────────────────────────────────────────────────────
  const colorAnalysis = analyzeColors(raw.colors);

  // ─── Typography ──────────────────────────────────────────────────────
  const typoAnalysis = analyzeTypography(raw.fonts, raw.sizes, raw.googleFontsUrls);

  // ─── Spacing ─────────────────────────────────────────────────────────
  const spacingAnalysis = analyzeSpacing(raw.spacings);

  // ─── Shapes ──────────────────────────────────────────────────────────
  const shapesAnalysis = analyzeShapes(raw.radii, raw.shadows);

  return {
    brandName,
    domain,
    tagline: raw.description || undefined,
    industry: undefined, // Determined later by AI or manually

    colors: colorAnalysis,

    typography: typoAnalysis,

    spacing: spacingAnalysis,

    shapes: shapesAnalysis,

    components: [],  // Populated by AI analysis or Apify path

    personality: {
      overall: 'professional',
      formality: 3,
      energy: 3,
      warmth: 3,
      toneOfVoice: '',
    },

    extractionMethod: 'http-fetch',
    confidence: calculateConfidence(raw),
    pagesAnalyzed: raw.pagesAnalyzed,
  };
}

// ============================================================================
// BRAND NAME DERIVATION
// ============================================================================

function deriveBrandName(title: string, domain: string): string {
  if (title) {
    // Use part before separator (|, –, —, or " - " with spaces around dash)
    const parts = title.split(/\s*[|–—]\s*|\s+-\s+/);
    const candidate = parts[0].trim();
    if (candidate.length >= 2 && candidate.length <= 60) return candidate;
  }

  // Derive from domain: strip TLD and www
  const domainName = domain
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .replace(/\.[a-z]{2,}$/i, '')
    .replace(/[.-]/g, ' ');

  return domainName.charAt(0).toUpperCase() + domainName.slice(1);
}

// ============================================================================
// COLOR ANALYSIS
// ============================================================================

function analyzeColors(colors: RawHttpExtraction['colors']): BrandAnalysis['colors'] {
  const allExtracted: ExtractedColor[] = colors.map(c => ({
    hex: c.hex,
    usage: c.property,
    frequency: c.count,
  }));

  // Top color by frequency is primary
  const primary = colors[0]?.hex || '#3b82f6';  // blue fallback
  const secondary = colors[1]?.hex;
  const accent = colors[2]?.hex;

  return {
    primary,
    secondary,
    accent,
    textDark: '#1a1a1a',
    textBody: '#374151',
    backgroundLight: '#ffffff',
    backgroundDark: '#111827',
    allExtracted,
  };
}

// ============================================================================
// TYPOGRAPHY ANALYSIS
// ============================================================================

function analyzeTypography(
  fonts: ExtractedCssFont[],
  sizes: RawHttpExtraction['sizes'],
  googleFontsUrls: string[],
): BrandAnalysis['typography'] {
  // Determine heading and body fonts
  let headingFont: ExtractedFont = { family: 'system-ui', weights: [600, 700] };
  let bodyFont: ExtractedFont = { family: 'system-ui', weights: [400, 500] };

  if (fonts.length >= 2) {
    // First font is typically heading (less common, used for impact)
    // But if one has heavier weights, that's likely heading
    const sorted = [...fonts].sort((a, b) => {
      const aMaxWeight = Math.max(...(a.weights.length > 0 ? a.weights : [400]));
      const bMaxWeight = Math.max(...(b.weights.length > 0 ? b.weights : [400]));
      return bMaxWeight - aMaxWeight;
    });
    headingFont = { family: sorted[0].family, weights: sorted[0].weights };
    bodyFont = { family: sorted[1].family, weights: sorted[1].weights };
  } else if (fonts.length === 1) {
    headingFont = { family: fonts[0].family, weights: fonts[0].weights };
    bodyFont = { family: fonts[0].family, weights: fonts[0].weights };
  }

  // Set Google Fonts URLs
  if (googleFontsUrls.length > 0) {
    headingFont.googleFontsUrl = googleFontsUrls[0];
    bodyFont.googleFontsUrl = googleFontsUrls[0];
  }

  // Map extracted sizes to heading levels
  const sizeMap: Record<string, string> = {
    h1: '2.5rem', h2: '2rem', h3: '1.75rem', h4: '1.5rem',
    h5: '1.25rem', h6: '1.125rem', body: '1rem', small: '0.875rem',
  };
  for (const s of sizes) {
    const key = s.element.replace('.', '');
    if (key in sizeMap) sizeMap[key] = s.size;
  }

  return {
    headingFont,
    bodyFont,
    sizes: sizeMap as BrandAnalysis['typography']['sizes'],
    lineHeights: { heading: 1.25, body: 1.6 },
    letterSpacing: { h1: '-0.02em', h2: '-0.015em', h3: '-0.01em', body: '0' },
  };
}

// ============================================================================
// SPACING ANALYSIS
// ============================================================================

function analyzeSpacing(spacings: string[]): BrandAnalysis['spacing'] {
  // Find the most common large spacing value for section padding
  const pxValues = spacings
    .filter(s => s.endsWith('px'))
    .map(s => parseInt(s))
    .filter(n => !isNaN(n))
    .sort((a, b) => a - b);

  const largePx = pxValues.filter(v => v >= 40);
  const sectionPaddingDesktop = largePx.length > 0 ? `${largePx[Math.floor(largePx.length / 2)]}px` : '80px';

  const medPx = pxValues.filter(v => v >= 16 && v <= 32);
  const cardPadding = medPx.length > 0 ? `${medPx[Math.floor(medPx.length / 2)]}px` : '24px';

  return {
    sectionPadding: {
      desktop: sectionPaddingDesktop,
      mobile: `${Math.round(parseInt(sectionPaddingDesktop) * 0.5)}px`,
    },
    cardPadding,
    containerMaxWidth: '1200px',
    gaps: ['16px', '24px', '32px'],
  };
}

// ============================================================================
// SHAPES ANALYSIS
// ============================================================================

function analyzeShapes(
  radii: string[],
  shadows: string[],
): BrandAnalysis['shapes'] {
  // Find median radius for buttons/cards
  const radiusPx = radii
    .filter(r => r.endsWith('px'))
    .map(r => parseInt(r))
    .filter(n => !isNaN(n) && n < 50) // Exclude 9999px etc.
    .sort((a, b) => a - b);

  const medianRadius = radiusPx.length > 0
    ? `${radiusPx[Math.floor(radiusPx.length / 2)]}px`
    : '8px';

  return {
    buttonRadius: medianRadius,
    cardRadius: medianRadius,
    imageRadius: medianRadius,
    inputRadius: medianRadius,
    shadows: {
      card: shadows[0] || '0 2px 8px rgba(0,0,0,0.1)',
      button: shadows[1] || '0 1px 3px rgba(0,0,0,0.12)',
      elevated: shadows[2] || '0 10px 25px rgba(0,0,0,0.15)',
    },
  };
}

// ============================================================================
// CONFIDENCE
// ============================================================================

function calculateConfidence(raw: RawHttpExtraction): number {
  let score = 0.3; // Base confidence for any extraction

  if (raw.colors.length >= 3) score += 0.15;
  if (raw.fonts.length >= 1) score += 0.15;
  if (raw.sizes.length >= 3) score += 0.1;
  if (raw.googleFontsUrls.length >= 1) score += 0.1;
  if (raw.radii.length >= 1) score += 0.05;
  if (raw.shadows.length >= 1) score += 0.05;
  if (raw.html.length > 5000) score += 0.1;

  return Math.min(1, score);
}
