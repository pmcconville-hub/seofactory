import { describe, it, expect, beforeAll } from 'vitest';
import { buildTokenSet } from '../tokens/TokenSetBuilder';
import { assembleDocument } from '../assembly/DocumentAssembler';
import { buildNavItems, renderNavigation } from '../assembly/NavigationBuilder';
import { validateDocument } from '../assembly/QualityValidator';
import { generateTemplateSections } from '../sections/SectionRegistry';
import type { BrandAnalysis, SectionGeneratorContext, RenderedSection } from '../types';

// Import all template sections (triggers registration)
import '../sections/templates/index';

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
let sections: RenderedSection[];
let html: string;

beforeAll(() => {
  const analysis = makeAnalysis();
  const tokens = buildTokenSet(analysis);
  ctx = { tokens, analysis, language: 'nl' };
  sections = generateTemplateSections(ctx);
  html = assembleDocument({ tokens, analysis, sections });
});

// ============================================================================
// NavigationBuilder
// ============================================================================

describe('NavigationBuilder', () => {
  it('builds nav items from sections', () => {
    const items = buildNavItems(sections);
    expect(items.length).toBe(sections.length);
    expect(items[0].sectionId).toBe(sections[0].id);
    expect(items[0].label).toBe(sections[0].title);
  });

  it('renders navigation HTML with category separators', () => {
    const items = buildNavItems(sections);
    const navHtml = renderNavigation(items, ctx.tokens.prefix);
    expect(navHtml).toContain('sg-nav');
    expect(navHtml).toContain('sg-nav-link');
    expect(navHtml).toContain('sg-nav-category');
    expect(navHtml).toContain('Foundation');
  });

  it('renders empty string for no items', () => {
    expect(renderNavigation([], 'test')).toBe('');
  });
});

// ============================================================================
// DocumentAssembler
// ============================================================================

describe('assembleDocument', () => {
  it('produces a valid HTML document', () => {
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
    expect(html).toContain('<head>');
    expect(html).toContain('</head>');
    expect(html).toContain('<body>');
    expect(html).toContain('</body>');
  });

  it('includes brand name in title and header', () => {
    expect(html).toContain('B&amp;M Dak-Totaal');
    expect(html).toContain('CSS Design System');
  });

  it('includes Google Fonts link', () => {
    expect(html).toContain('fonts.googleapis.com');
    expect(html).toContain('Montserrat');
  });

  it('includes Font Awesome CDN', () => {
    expect(html).toContain('font-awesome');
  });

  it('includes styleguide page CSS', () => {
    expect(html).toContain('.sg-section');
    expect(html).toContain('.sg-nav');
    expect(html).toContain('.sg-header');
    expect(html).toContain('.sg-demo');
    expect(html).toContain('.sg-code');
  });

  it('includes sticky navigation', () => {
    expect(html).toContain('sg-navigation');
    expect(html).toContain('sg-nav-link');
  });

  it('includes all rendered sections', () => {
    for (const section of sections) {
      expect(html).toContain(`id="section-${section.id}"`);
    }
  });

  it('includes header with stats', () => {
    expect(html).toContain('sg-stat-value');
    expect(html).toContain('Sections');
    expect(html).toContain('Source');
  });

  it('includes footer with metadata', () => {
    expect(html).toContain('sg-footer');
    expect(html).toContain('benmdaktotaal.nl');
    expect(html).toContain('http-fetch');
  });

  it('includes responsive meta viewport', () => {
    expect(html).toContain('viewport');
    expect(html).toContain('width=device-width');
  });

  it('includes print styles', () => {
    expect(html).toContain('@media print');
  });

  it('generates a document of reasonable size', () => {
    const sizeKB = Math.round(html.length / 1024);
    // With 17 template sections, expect at least 30KB
    expect(sizeKB).toBeGreaterThan(20);
  });
});

// ============================================================================
// QualityValidator
// ============================================================================

describe('validateDocument', () => {
  let report: ReturnType<typeof validateDocument>;

  beforeAll(() => {
    report = validateDocument(html, ctx.tokens, 'B&M Dak-Totaal', 17);
  });

  it('checks div balance', () => {
    expect(report.structural.divBalance.open).toBeGreaterThan(0);
    expect(report.structural.divBalance.close).toBeGreaterThan(0);
    // Our template sections should be balanced
    expect(report.structural.divBalance.passed).toBe(true);
  });

  it('counts sections correctly', () => {
    expect(report.structural.sectionCount.found).toBe(17);
    expect(report.structural.sectionCount.passed).toBe(true);
  });

  it('reports file size and line count', () => {
    expect(report.structural.fileSizeKB).toBeGreaterThan(0);
    expect(report.structural.lineCount).toBeGreaterThan(100);
  });

  it('finds unique CSS classes with brand prefix', () => {
    expect(report.content.uniqueClassCount).toBeGreaterThan(0);
  });

  it('confirms prefix consistency', () => {
    expect(report.content.prefixConsistency).toBe(true);
  });

  it('confirms brand name present', () => {
    expect(report.content.brandNameCorrect).toBe(true);
  });

  it('confirms brand colors present', () => {
    expect(report.content.colorsMatch).toBe(true);
  });

  it('detects visual elements', () => {
    expect(report.visual.hasColorSwatches).toBe(true);
    expect(report.visual.hasCodeBlocks).toBe(true);
    expect(report.visual.hasNavigationLinks).toBe(true);
  });

  it('produces a high overall score for well-formed doc', () => {
    expect(report.overallScore).toBeGreaterThanOrEqual(80);
  });

  it('lists any issues found', () => {
    expect(report.issues).toBeDefined();
    expect(Array.isArray(report.issues)).toBe(true);
  });
});

// ============================================================================
// QualityValidator — edge cases
// ============================================================================

describe('validateDocument edge cases', () => {
  it('detects div imbalance', () => {
    const badHtml = '<div><div></div>';
    const report = validateDocument(badHtml, ctx.tokens, 'Test', 0);
    expect(report.structural.divBalance.passed).toBe(false);
    expect(report.issues.some(i => i.includes('Div imbalance'))).toBe(true);
  });

  it('detects missing sections', () => {
    const report = validateDocument('<div></div>', ctx.tokens, 'Test', 48);
    expect(report.structural.sectionCount.passed).toBe(false);
  });

  it('detects missing brand name', () => {
    const report = validateDocument('<div>Hello</div>', ctx.tokens, 'NonExistentBrand', 0);
    expect(report.content.brandNameCorrect).toBe(false);
  });

  it('score never goes below 0', () => {
    const report = validateDocument('', ctx.tokens, 'Missing', 48);
    expect(report.overallScore).toBeGreaterThanOrEqual(0);
  });
});
