import { describe, it, expect, beforeAll } from 'vitest';
import { buildTokenSet } from '../tokens/TokenSetBuilder';
import type { BrandAnalysis, SectionGeneratorContext } from '../types';

// Import ALL template sections (triggers registration)
import '../sections/templates/index';

import {
  getGenerator,
  getTemplateSectionIds,
  getRegistrationStats,
  generateTemplateSections,
} from '../sections/SectionRegistry';

// ============================================================================
// FIXTURE
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
      gaps: ['16px', '24px'],
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
// REGISTRATION COMPLETENESS
// ============================================================================

describe('Template section registration', () => {
  const templateIds = [1, 2, 3, 6, 8, 15, 20, 22, 23, 24, 37, 38, 42, 45, 46, 47, 48];

  it('all 17 template section IDs have registered generators', () => {
    for (const id of templateIds) {
      expect(getGenerator(id), `Section ${id} should be registered`).toBeDefined();
    }
  });

  it('getTemplateSectionIds returns exactly these IDs', () => {
    const ids = getTemplateSectionIds();
    expect(ids.sort((a, b) => a - b)).toEqual(templateIds);
  });

  it('registration stats show 17 registered', () => {
    const stats = getRegistrationStats();
    expect(stats.registered).toBeGreaterThanOrEqual(17);
    expect(stats.total).toBe(48);
  });
});

// ============================================================================
// GENERATION — Every template section produces valid output
// ============================================================================

describe('generateTemplateSections', () => {
  it('generates 17 sections', () => {
    const sections = generateTemplateSections(ctx);
    expect(sections).toHaveLength(17);
  });

  it('all sections have required fields', () => {
    const sections = generateTemplateSections(ctx);
    for (const section of sections) {
      expect(section.id).toBeGreaterThanOrEqual(1);
      expect(section.id).toBeLessThanOrEqual(48);
      expect(section.anchorId).toMatch(/^section-\d+$/);
      expect(section.title).toBeTruthy();
      expect(['foundation', 'extension', 'site-wide', 'reference']).toContain(section.category);
      expect(section.html).toBeTruthy();
      expect(section.html.length).toBeGreaterThan(100); // non-trivial HTML
      expect(section.classesGenerated).toBeDefined();
    }
  });

  it('all sections contain the sg-section wrapper', () => {
    const sections = generateTemplateSections(ctx);
    for (const section of sections) {
      expect(section.html).toContain('class="sg-section"');
      expect(section.html).toContain(`id="section-${section.id}"`);
    }
  });

  it('all sections contain the section title', () => {
    const sections = generateTemplateSections(ctx);
    for (const section of sections) {
      expect(section.html).toContain('sg-section-title');
      expect(section.html).toContain(`${section.id}.`);
    }
  });

  it('all sections contain a demo area', () => {
    const sections = generateTemplateSections(ctx);
    for (const section of sections) {
      expect(section.html).toContain('sg-demo');
    }
  });

  it('sections use the brand prefix in class names', () => {
    const sections = generateTemplateSections(ctx);
    const prefix = ctx.tokens.prefix;
    // At least the core sections (color, typography, backgrounds) should reference the prefix
    const coreSections = sections.filter(s => [1, 2, 3].includes(s.id));
    for (const section of coreSections) {
      expect(section.html).toContain(prefix);
    }
  });
});

// ============================================================================
// INDIVIDUAL SECTION SPOT CHECKS
// ============================================================================

describe('Individual section spot checks', () => {
  it('Section 6 (Images) has image treatment classes', () => {
    const gen = getGenerator(6)!;
    const section = gen(ctx);
    expect(section.html).toContain('img-rounded');
    expect(section.html).toContain('img-circle');
  });

  it('Section 8 (Badges) has semantic color badges', () => {
    const gen = getGenerator(8)!;
    const section = gen(ctx);
    expect(section.html).toContain('badge-primary');
    expect(section.html).toContain('badge-success');
  });

  it('Section 15 (Dividers) has gradient divider', () => {
    const gen = getGenerator(15)!;
    const section = gen(ctx);
    expect(section.html).toContain('linear-gradient');
    expect(section.html).toContain('divider');
  });

  it('Section 22 (Animations) has prefers-reduced-motion', () => {
    const gen = getGenerator(22)!;
    const section = gen(ctx);
    expect(section.html).toContain('prefers-reduced-motion');
  });

  it('Section 42 (Accessibility) has skip-link', () => {
    const gen = getGenerator(42)!;
    const section = gen(ctx);
    expect(section.html).toContain('skip-link');
    expect(section.html).toContain('sr-only');
  });

  it('Section 47 (Quick Reference) has a table', () => {
    const gen = getGenerator(47)!;
    const section = gen(ctx);
    expect(section.html).toContain('<table');
    expect(section.html).toContain('Category');
  });

  it('Section 48 (Version) shows brand name and domain', () => {
    const gen = getGenerator(48)!;
    const section = gen(ctx);
    // Brand name is in the raw demo HTML (not escaped), so & stays as &
    expect(section.html).toContain('B&M Dak-Totaal');
    expect(section.html).toContain('benmdaktotaal.nl');
  });
});
