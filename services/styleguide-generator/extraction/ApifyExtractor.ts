// services/styleguide-generator/extraction/ApifyExtractor.ts
// Wraps the existing StyleGuideExtractor for Apify Playwright DOM crawling.
// Converts RawStyleGuideExtraction → BrandAnalysis.

import { StyleGuideExtractor } from '../../design-analysis/StyleGuideExtractor';
import type { BrandAnalysis, ExtractedColor, ExtractedFont, ExtractedComponent } from '../types';

/**
 * Extract brand data using Apify Playwright scraper.
 * This path provides the highest quality data (computed CSS, screenshots).
 */
export async function extractViaApify(
  domain: string,
  apifyToken: string,
): Promise<BrandAnalysis> {
  const url = domain.startsWith('http') ? domain : `https://${domain}`;

  // Discover pages to analyze
  const pages = await StyleGuideExtractor.discoverPages(url, apifyToken);
  const pageUrls = [url, ...pages.slice(0, 2).map(p => p.url)]; // Homepage + 2 subpages

  // Extract raw style guide data
  const raw = await StyleGuideExtractor.extractStyleGuide(pageUrls, apifyToken);

  // ─── Colors ──────────────────────────────────────────────────────────
  const allExtracted: ExtractedColor[] = [];
  if (raw.colorMap) {
    for (const [hex, data] of Object.entries(raw.colorMap)) {
      allExtracted.push({
        hex,
        usage: data.sources.join(', '),
        frequency: data.count,
      });
    }
  }
  allExtracted.sort((a, b) => b.frequency - a.frequency);

  // Extract colors from element computed CSS as fallback
  if (allExtracted.length === 0) {
    const colorCounts = new Map<string, number>();
    for (const el of raw.elements) {
      const bgColor = el.computedCss?.['background-color'];
      const textColor = el.computedCss?.['color'];
      for (const color of [bgColor, textColor]) {
        if (color && !color.includes('rgba(0') && !color.includes('rgb(255')) {
          const hex = rgbToHex(color);
          if (hex) colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
        }
      }
    }
    for (const [hex, count] of colorCounts.entries()) {
      allExtracted.push({ hex, usage: 'computed', frequency: count });
    }
    allExtracted.sort((a, b) => b.frequency - a.frequency);
  }

  const primary = allExtracted[0]?.hex || '#3b82f6';
  const secondary = allExtracted[1]?.hex;
  const accent = allExtracted[2]?.hex;

  // ─── Fonts ──────────────────────────────────────────────────────────
  const fontFamilies = raw.googleFontFamilies || [];
  const headingFont: ExtractedFont = {
    family: fontFamilies[0] || 'system-ui',
    weights: [600, 700],
    googleFontsUrl: raw.googleFontsUrls?.[0],
  };
  const bodyFont: ExtractedFont = {
    family: fontFamilies[1] || fontFamilies[0] || 'system-ui',
    weights: [400, 500, 600],
    googleFontsUrl: raw.googleFontsUrls?.[0],
  };

  // ─── Sizes (from heading elements) ──────────────────────────────────
  const sizeMap: Record<string, string> = {
    h1: '2.5rem', h2: '2rem', h3: '1.75rem', h4: '1.5rem',
    h5: '1.25rem', h6: '1.125rem', body: '1rem', small: '0.875rem',
  };
  for (const el of raw.elements) {
    if (el.category === 'typography' && el.computedCss?.['font-size']) {
      const tag = el.elementTag?.toLowerCase();
      if (tag && tag in sizeMap) {
        sizeMap[tag] = el.computedCss['font-size'];
      }
    }
  }

  // ─── Shapes ──────────────────────────────────────────────────────────
  const buttonEls = raw.elements.filter(e => e.category === 'buttons');
  const cardEls = raw.elements.filter(e => e.category === 'cards');
  const buttonRadius = buttonEls[0]?.computedCss?.['border-radius'] || '8px';
  const cardRadius = cardEls[0]?.computedCss?.['border-radius'] || '12px';

  const buttonShadow = buttonEls[0]?.computedCss?.['box-shadow'] || '';
  const cardShadow = cardEls[0]?.computedCss?.['box-shadow'] || '';

  // ─── Components ─────────────────────────────────────────────────────
  const components: ExtractedComponent[] = [];
  const seenTypes = new Set<string>();
  for (const el of raw.elements) {
    if (!seenTypes.has(el.category)) {
      seenTypes.add(el.category);
      components.push({
        type: el.category,
        variant: el.subcategory || 'default',
        extractedCss: el.computedCss ? JSON.stringify(el.computedCss).slice(0, 500) : undefined,
        screenshotBase64: el.elementScreenshotBase64,
      });
    }
  }

  // ─── Brand Name ──────────────────────────────────────────────────────
  const titleEl = raw.elements.find(e => e.elementTag === 'TITLE' || e.category === 'branding');
  const brandName = deriveBrandNameFromDomain(domain);

  return {
    brandName,
    domain,
    industry: undefined,

    colors: {
      primary,
      secondary,
      accent,
      textDark: '#1a1a1a',
      textBody: '#374151',
      backgroundLight: '#ffffff',
      backgroundDark: '#111827',
      allExtracted,
    },

    typography: {
      headingFont,
      bodyFont,
      sizes: sizeMap as BrandAnalysis['typography']['sizes'],
      lineHeights: { heading: 1.25, body: 1.6 },
      letterSpacing: { h1: '-0.02em', h2: '-0.015em', h3: '-0.01em', body: '0' },
    },

    spacing: {
      sectionPadding: { desktop: '80px', mobile: '40px' },
      cardPadding: '24px',
      containerMaxWidth: '1200px',
      gaps: ['16px', '24px', '32px'],
    },

    shapes: {
      buttonRadius,
      cardRadius,
      imageRadius: '8px',
      inputRadius: '6px',
      shadows: {
        card: cardShadow || '0 2px 8px rgba(0,0,0,0.1)',
        button: buttonShadow || '0 1px 3px rgba(0,0,0,0.12)',
        elevated: '0 10px 25px rgba(0,0,0,0.15)',
      },
    },

    components,

    personality: {
      overall: 'professional',
      formality: 3,
      energy: 3,
      warmth: 3,
      toneOfVoice: '',
    },

    extractionMethod: 'apify',
    confidence: 0.9, // Apify gives high confidence
    screenshotBase64: raw.screenshotBase64,
    pagesAnalyzed: pageUrls,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function rgbToHex(rgb: string): string | null {
  const match = rgb.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!match) return null;
  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);
  // Skip near-black and near-white
  if (r + g + b < 30 || r + g + b > 735) return null;
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function deriveBrandNameFromDomain(domain: string): string {
  return domain
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .replace(/\.[a-z]{2,}$/i, '')
    .replace(/[.-]/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
