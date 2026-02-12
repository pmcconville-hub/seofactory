import { describe, it, expect, beforeAll } from 'vitest';
import { buildTokenSet } from '../tokens/TokenSetBuilder';
import type { BrandAnalysis, SectionGeneratorContext, RenderedSection } from '../types';

// Import sections (side-effect: registers them)
import { colorPaletteGenerator } from '../sections/templates/colorPalette';
import { typographyGenerator } from '../sections/templates/typography';
import { sectionBackgroundsGenerator } from '../sections/templates/sectionBackgrounds';
import { getGenerator } from '../sections/SectionRegistry';

// ============================================================================
// SHARED FIXTURE
// ============================================================================

function makeAnalysis(): BrandAnalysis {
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
      allExtracted: [],
    },
    typography: {
      headingFont: { family: 'Montserrat', weights: [600, 700] },
      bodyFont: { family: 'Open Sans', weights: [400, 500, 600] },
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
      buttonRadius: '8px', cardRadius: '12px', imageRadius: '8px', inputRadius: '6px',
      shadows: { card: '', button: '', elevated: '' },
    },
    components: [],
    personality: { overall: 'professional', formality: 3, energy: 3, warmth: 4, toneOfVoice: '' },
    extractionMethod: 'http-fetch',
    confidence: 0.85,
    pagesAnalyzed: ['https://benmdaktotaal.nl/'],
  };
}

let ctx: SectionGeneratorContext;

beforeAll(() => {
  const analysis = makeAnalysis();
  const tokens = buildTokenSet(analysis);
  ctx = { tokens, analysis, language: 'nl' };
});

// ============================================================================
// Section 1: Color Palette
// ============================================================================

describe('Section 1: Color Palette', () => {
  let section: RenderedSection;

  beforeAll(() => {
    section = colorPaletteGenerator(ctx);
  });

  it('has correct metadata', () => {
    expect(section.id).toBe(1);
    expect(section.anchorId).toBe('section-1');
    expect(section.title).toBe('Color Palette');
    expect(section.category).toBe('foundation');
  });

  it('contains section wrapper with correct ID', () => {
    expect(section.html).toContain('id="section-1"');
    expect(section.html).toContain('1. Color Palette');
  });

  it('shows all 10 primary color steps', () => {
    expect(section.html).toContain('#6EB544'); // primary-400
    expect(section.html).toContain('400');
    expect(section.html).toContain('50');
    expect(section.html).toContain('900');
  });

  it('shows secondary and accent scales', () => {
    expect(section.html).toContain('#2B4C9B'); // secondary-400
    expect(section.html).toContain('#F5A623'); // accent-400
    expect(section.html).toContain('Secondary');
    expect(section.html).toContain('Accent');
  });

  it('shows gray scale', () => {
    expect(section.html).toContain('Gray');
  });

  it('shows semantic colors', () => {
    expect(section.html).toContain('success');
    expect(section.html).toContain('error');
    expect(section.html).toContain('warning');
    expect(section.html).toContain('info');
    expect(section.html).toContain('whatsapp');
    expect(section.html).toContain('#25D366');
  });

  it('generates CSS custom properties', () => {
    expect(section.html).toContain(':root {');
    expect(section.html).toContain(`--${ctx.tokens.prefix}-primary-400`);
    expect(section.html).toContain(`--${ctx.tokens.prefix}-gray-50`);
  });

  it('has non-empty classesGenerated', () => {
    expect(section.classesGenerated.length).toBeGreaterThan(0);
  });

  it('is registered in the section registry', () => {
    expect(getGenerator(1)).toBe(colorPaletteGenerator);
  });
});

// ============================================================================
// Section 2: Typography
// ============================================================================

describe('Section 2: Typography', () => {
  let section: RenderedSection;

  beforeAll(() => {
    section = typographyGenerator(ctx);
  });

  it('has correct metadata', () => {
    expect(section.id).toBe(2);
    expect(section.anchorId).toBe('section-2');
    expect(section.title).toBe('Typography');
    expect(section.category).toBe('foundation');
  });

  it('shows heading and body font names', () => {
    expect(section.html).toContain('Montserrat');
    expect(section.html).toContain('Open Sans');
  });

  it('shows font weights', () => {
    expect(section.html).toContain('600');
    expect(section.html).toContain('700');
  });

  it('shows all heading levels', () => {
    expect(section.html).toContain('H1');
    expect(section.html).toContain('H2');
    expect(section.html).toContain('H3');
    expect(section.html).toContain('H4');
    expect(section.html).toContain('H5');
    expect(section.html).toContain('H6');
  });

  it('shows body, small, label, and caption levels', () => {
    expect(section.html).toContain('BODY');
    expect(section.html).toContain('SMALL');
    expect(section.html).toContain('LABEL');
    expect(section.html).toContain('CAPTION');
  });

  it('includes sample text for each level', () => {
    expect(section.html).toContain('Main Page Heading');
    expect(section.html).toContain('Body text is used for paragraphs');
  });

  it('generates CSS classes for each level', () => {
    const prefix = ctx.tokens.prefix;
    expect(section.html).toContain(`.${prefix}-h1`);
    expect(section.html).toContain(`.${prefix}-body`);
  });

  it('has classesGenerated with 10 entries', () => {
    expect(section.classesGenerated).toHaveLength(10);
  });

  it('is registered in the section registry', () => {
    expect(getGenerator(2)).toBe(typographyGenerator);
  });
});

// ============================================================================
// Section 3: Section Backgrounds
// ============================================================================

describe('Section 3: Section Backgrounds', () => {
  let section: RenderedSection;

  beforeAll(() => {
    section = sectionBackgroundsGenerator(ctx);
  });

  it('has correct metadata', () => {
    expect(section.id).toBe(3);
    expect(section.anchorId).toBe('section-3');
    expect(section.title).toBe('Section Backgrounds');
    expect(section.category).toBe('foundation');
  });

  it('shows multiple background variants', () => {
    expect(section.html).toContain('White');
    expect(section.html).toContain('Light Gray');
    expect(section.html).toContain('Primary Tint');
    expect(section.html).toContain('Primary');
    expect(section.html).toContain('Dark');
    expect(section.html).toContain('Gradient Primary');
  });

  it('uses actual brand colors in demos', () => {
    // Primary-400 hex should appear
    expect(section.html).toContain(ctx.tokens.colors.primary[400]);
    // Gray-900 should appear
    expect(section.html).toContain(ctx.tokens.colors.gray[900]);
  });

  it('includes gradient backgrounds', () => {
    expect(section.html).toContain('linear-gradient');
  });

  it('generates CSS code for each variant', () => {
    const prefix = ctx.tokens.prefix;
    expect(section.html).toContain(`.${prefix}-section-white`);
    expect(section.html).toContain(`.${prefix}-section-dark`);
    expect(section.html).toContain(`.${prefix}-section-gradient`);
  });

  it('has 8 background class variants', () => {
    expect(section.classesGenerated).toHaveLength(8);
  });

  it('includes WCAG warning', () => {
    expect(section.html).toContain('WCAG');
  });

  it('is registered in the section registry', () => {
    expect(getGenerator(3)).toBe(sectionBackgroundsGenerator);
  });
});
