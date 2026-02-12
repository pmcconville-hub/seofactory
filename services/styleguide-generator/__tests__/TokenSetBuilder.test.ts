import { describe, it, expect } from 'vitest';
import { buildTokenSet } from '../tokens/TokenSetBuilder';
import type { BrandAnalysis } from '../types';

// ============================================================================
// TEST FIXTURES
// ============================================================================

function makeBrandAnalysis(overrides: Partial<BrandAnalysis> = {}): BrandAnalysis {
  return {
    brandName: 'B&M Dak-Totaal',
    domain: 'benmdaktotaal.nl',
    tagline: 'Uw dakspecialist',
    industry: 'construction',
    colors: {
      primary: '#6EB544',
      secondary: '#2B4C9B',
      accent: '#F5A623',
      textDark: '#1a1a1a',
      textBody: '#333333',
      backgroundLight: '#ffffff',
      backgroundDark: '#1a1a1a',
      allExtracted: [
        { hex: '#6EB544', usage: 'buttons', frequency: 12 },
        { hex: '#2B4C9B', usage: 'headings', frequency: 8 },
      ],
    },
    typography: {
      headingFont: { family: 'Montserrat', weights: [600, 700], googleFontsUrl: '' },
      bodyFont: { family: 'Open Sans', weights: [400, 500, 600], googleFontsUrl: '' },
      sizes: {
        h1: '2.5rem', h2: '2rem', h3: '1.75rem', h4: '1.5rem',
        h5: '1.25rem', h6: '1.125rem', body: '1rem', small: '0.875rem',
      },
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
      buttonRadius: '8px',
      cardRadius: '12px',
      imageRadius: '8px',
      inputRadius: '6px',
      shadows: {
        card: '0 2px 8px rgba(0,0,0,0.1)',
        button: '0 1px 3px rgba(0,0,0,0.12)',
        elevated: '0 10px 25px rgba(0,0,0,0.15)',
      },
    },
    components: [],
    personality: {
      overall: 'professional',
      formality: 3,
      energy: 3,
      warmth: 4,
      toneOfVoice: 'professional but approachable',
    },
    extractionMethod: 'http-fetch',
    confidence: 0.85,
    pagesAnalyzed: ['https://benmdaktotaal.nl/'],
    ...overrides,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('buildTokenSet', () => {
  const analysis = makeBrandAnalysis();
  const tokens = buildTokenSet(analysis);

  // ─── PREFIX ─────────────────────────────────────────────────────────────
  it('generates correct prefix from brand name', () => {
    // B&M Dak-Totaal → b, m, dak, totaal → "bmdt"
    expect(tokens.prefix).toBe('bmdt');
  });

  it('generates different prefix for different brands', () => {
    const tokens2 = buildTokenSet(makeBrandAnalysis({ brandName: 'Resultaatmakers' }));
    expect(tokens2.prefix).toBe('res');
  });

  // ─── COLOR SCALES ───────────────────────────────────────────────────────
  it('generates primary color scale with brand color at 400', () => {
    expect(tokens.colors.primary[400]).toBe('#6EB544');
    expect(tokens.colors.primary[50]).toMatch(/^#[0-9a-f]{6}$/);
    expect(tokens.colors.primary[900]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('generates secondary scale when secondary color exists', () => {
    expect(tokens.colors.secondary).toBeDefined();
    expect(tokens.colors.secondary![400]).toBe('#2B4C9B');
  });

  it('generates accent scale when accent color exists', () => {
    expect(tokens.colors.accent).toBeDefined();
    expect(tokens.colors.accent![400]).toBe('#F5A623');
  });

  it('omits secondary/accent when not in analysis', () => {
    const minimal = buildTokenSet(makeBrandAnalysis({
      colors: {
        primary: '#6EB544',
        textDark: '#1a1a1a',
        textBody: '#333333',
        backgroundLight: '#ffffff',
        backgroundDark: '#1a1a1a',
        allExtracted: [],
      },
    }));
    expect(minimal.colors.secondary).toBeUndefined();
    expect(minimal.colors.accent).toBeUndefined();
  });

  it('generates brand-warmth-tinted gray scale', () => {
    const gray50 = tokens.colors.gray[50];
    const gray900 = tokens.colors.gray[900];
    expect(gray50).toMatch(/^#[0-9a-f]{6}$/);
    expect(gray900).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('generates semantic colors avoiding primary hue conflicts', () => {
    expect(tokens.colors.semantic.success).toMatch(/^#[0-9a-f]{6}$/);
    expect(tokens.colors.semantic.error).toMatch(/^#[0-9a-f]{6}$/);
    expect(tokens.colors.semantic.warning).toMatch(/^#[0-9a-f]{6}$/);
    expect(tokens.colors.semantic.info).toMatch(/^#[0-9a-f]{6}$/);
    expect(tokens.colors.semantic.whatsapp).toBe('#25D366');
  });

  // ─── TYPOGRAPHY ─────────────────────────────────────────────────────────
  it('formats heading font with fallback', () => {
    expect(tokens.typography.headingFont).toBe('Montserrat, sans-serif');
  });

  it('formats body font with quotes and fallback for multi-word names', () => {
    expect(tokens.typography.bodyFont).toBe("'Open Sans', sans-serif");
  });

  it('generates Google Fonts URL with both families', () => {
    expect(tokens.typography.googleFontsUrl).toContain('fonts.googleapis.com/css2');
    expect(tokens.typography.googleFontsUrl).toContain('Montserrat');
    expect(tokens.typography.googleFontsUrl).toContain('Open%20Sans');
  });

  it('handles system-ui fonts gracefully', () => {
    const systemTokens = buildTokenSet(makeBrandAnalysis({
      typography: {
        headingFont: { family: 'system-ui', weights: [], googleFontsUrl: '' },
        bodyFont: { family: 'system-ui', weights: [], googleFontsUrl: '' },
        sizes: {
          h1: '2.5rem', h2: '2rem', h3: '1.75rem', h4: '1.5rem',
          h5: '1.25rem', h6: '1.125rem', body: '1rem', small: '0.875rem',
        },
        lineHeights: { heading: 1.2, body: 1.6 },
        letterSpacing: { h1: '0', h2: '0', h3: '0', body: '0' },
      },
    }));
    expect(systemTokens.typography.headingFont).toBe('system-ui, sans-serif');
    expect(systemTokens.typography.googleFontsUrl).toBe('');
  });

  it('has all 10 typography size levels', () => {
    const levels = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'body', 'small', 'label', 'caption'];
    for (const level of levels) {
      const spec = tokens.typography.sizes[level as keyof typeof tokens.typography.sizes];
      expect(spec).toBeDefined();
      expect(spec.size).toBeTruthy();
      expect(spec.weight).toBeGreaterThan(0);
      expect(spec.lineHeight).toBeGreaterThan(0);
    }
  });

  it('uses extracted sizes over defaults', () => {
    // Analysis has h1: '2.5rem'
    expect(tokens.typography.sizes.h1.size).toBe('2.5rem');
  });

  it('provides defaults for label and caption (not in extraction)', () => {
    expect(tokens.typography.sizes.label.size).toBe('0.875rem');
    expect(tokens.typography.sizes.caption.size).toBe('0.75rem');
  });

  // ─── SPACING ─────────────────────────────────────────────────────────────
  it('generates 8-step spacing scale', () => {
    const keys = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'] as const;
    for (const key of keys) {
      expect(tokens.spacing[key]).toMatch(/^\d+px$/);
    }
  });

  it('spacing values increase monotonically', () => {
    const keys = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'] as const;
    const values = keys.map(k => parseInt(tokens.spacing[k]));
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });

  // ─── RADIUS ──────────────────────────────────────────────────────────────
  it('generates 6-step radius scale', () => {
    const keys = ['sm', 'md', 'lg', 'xl', '2xl', 'full'] as const;
    for (const key of keys) {
      expect(tokens.radius[key]).toMatch(/^\d+px$|^9999px$/);
    }
  });

  it('radius "full" is always 9999px', () => {
    expect(tokens.radius.full).toBe('9999px');
  });

  it('uses sharp radii for low border-radius brands', () => {
    const sharpTokens = buildTokenSet(makeBrandAnalysis({
      shapes: {
        buttonRadius: '2px', cardRadius: '2px', imageRadius: '0',
        inputRadius: '2px', shadows: { card: '', button: '', elevated: '' },
      },
    }));
    expect(parseInt(sharpTokens.radius.md)).toBeLessThanOrEqual(4);
  });

  it('uses rounded radii for high border-radius brands', () => {
    const roundedTokens = buildTokenSet(makeBrandAnalysis({
      shapes: {
        buttonRadius: '16px', cardRadius: '24px', imageRadius: '16px',
        inputRadius: '12px', shadows: { card: '', button: '', elevated: '' },
      },
    }));
    expect(parseInt(roundedTokens.radius.md)).toBeGreaterThanOrEqual(12);
  });

  // ─── SHADOWS ─────────────────────────────────────────────────────────────
  it('generates all 8 shadow tokens', () => {
    const keys = ['sm', 'md', 'lg', 'xl', 'colored', 'coloredLg', 'red', 'inner'] as const;
    for (const key of keys) {
      expect(tokens.shadows[key]).toBeTruthy();
    }
  });

  it('colored shadow uses brand hue', () => {
    expect(tokens.shadows.colored).toContain('hsla(');
  });

  // ─── TRANSITIONS ─────────────────────────────────────────────────────────
  it('generates 3 transition speeds', () => {
    expect(tokens.transitions.fast).toContain('ms');
    expect(tokens.transitions.base).toContain('ms');
    expect(tokens.transitions.slow).toContain('ms');
  });

  // ─── CONTAINERS ──────────────────────────────────────────────────────────
  it('generates 5 container sizes', () => {
    const keys = ['sm', 'md', 'lg', 'xl', '2xl'] as const;
    for (const key of keys) {
      expect(tokens.containers[key]).toMatch(/^\d+px$/);
    }
  });

  // ─── Z-INDEX ─────────────────────────────────────────────────────────────
  it('generates z-index scale with increasing values', () => {
    expect(tokens.zIndex.base).toBeLessThan(tokens.zIndex.dropdown);
    expect(tokens.zIndex.dropdown).toBeLessThan(tokens.zIndex.sticky);
    expect(tokens.zIndex.sticky).toBeLessThan(tokens.zIndex.overlay);
    expect(tokens.zIndex.overlay).toBeLessThan(tokens.zIndex.modal);
    expect(tokens.zIndex.modal).toBeLessThan(tokens.zIndex.toast);
  });

  // ─── FULL STRUCTURE ──────────────────────────────────────────────────────
  it('produces a complete DesignTokenSet with all required fields', () => {
    expect(tokens.prefix).toBeTruthy();
    expect(tokens.colors).toBeDefined();
    expect(tokens.colors.primary).toBeDefined();
    expect(tokens.colors.gray).toBeDefined();
    expect(tokens.colors.semantic).toBeDefined();
    expect(tokens.typography).toBeDefined();
    expect(tokens.spacing).toBeDefined();
    expect(tokens.radius).toBeDefined();
    expect(tokens.shadows).toBeDefined();
    expect(tokens.transitions).toBeDefined();
    expect(tokens.containers).toBeDefined();
    expect(tokens.zIndex).toBeDefined();
  });
});
