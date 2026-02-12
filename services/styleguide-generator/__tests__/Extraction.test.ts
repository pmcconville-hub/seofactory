import { describe, it, expect } from 'vitest';
import { analyzeHttpExtraction } from '../extraction/ExtractionAnalyzer';
import type { RawHttpExtraction } from '../extraction/HttpExtractor';

// ============================================================================
// ExtractionAnalyzer tests (unit testable without network)
// ============================================================================

function makeRawExtraction(overrides: Partial<RawHttpExtraction> = {}): RawHttpExtraction {
  return {
    html: '<html><head><title>B&M Dak-Totaal - Uw dakspecialist</title></head><body></body></html>',
    title: 'B&M Dak-Totaal - Uw dakspecialist',
    description: 'De specialist in dakbedekkingen',
    headings: [{ level: 1, text: 'Welkom bij B&M Dak-Totaal' }],
    links: [],
    images: [],
    colors: [
      { hex: '#6eb544', property: 'background-color', count: 15 },
      { hex: '#2b4c9b', property: 'color', count: 8 },
      { hex: '#f5a623', property: 'border-color', count: 3 },
    ],
    fonts: [
      { family: 'Montserrat', weights: [600, 700], source: 'css' },
      { family: 'Open Sans', weights: [400, 500], source: 'css' },
    ],
    sizes: [
      { element: 'h1', size: '2.5rem' },
      { element: 'h2', size: '2rem' },
      { element: 'h3', size: '1.75rem' },
    ],
    spacings: ['16px', '24px', '32px', '48px', '64px', '80px'],
    radii: ['4px', '8px', '12px'],
    shadows: ['0 2px 8px rgba(0,0,0,0.1)', '0 4px 12px rgba(0,0,0,0.15)'],
    googleFontsUrls: ['https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&family=Open+Sans:wght@400;500&display=swap'],
    pagesAnalyzed: ['https://benmdaktotaal.nl/'],
    ...overrides,
  };
}

describe('analyzeHttpExtraction', () => {
  it('extracts brand name from title', () => {
    const analysis = analyzeHttpExtraction(makeRawExtraction(), 'benmdaktotaal.nl');
    expect(analysis.brandName).toBe('B&M Dak-Totaal');
  });

  it('falls back to domain for brand name when title is empty', () => {
    const analysis = analyzeHttpExtraction(
      makeRawExtraction({ title: '' }),
      'benmdaktotaal.nl',
    );
    expect(analysis.brandName.toLowerCase()).toContain('benmdaktotaal');
  });

  it('extracts primary color from highest-frequency color', () => {
    const analysis = analyzeHttpExtraction(makeRawExtraction(), 'benmdaktotaal.nl');
    expect(analysis.colors.primary).toBe('#6eb544');
  });

  it('extracts secondary and accent colors', () => {
    const analysis = analyzeHttpExtraction(makeRawExtraction(), 'benmdaktotaal.nl');
    expect(analysis.colors.secondary).toBe('#2b4c9b');
    expect(analysis.colors.accent).toBe('#f5a623');
  });

  it('identifies heading and body fonts', () => {
    const analysis = analyzeHttpExtraction(makeRawExtraction(), 'benmdaktotaal.nl');
    expect(analysis.typography.headingFont.family).toBe('Montserrat');
    expect(analysis.typography.bodyFont.family).toBe('Open Sans');
  });

  it('preserves extracted font sizes', () => {
    const analysis = analyzeHttpExtraction(makeRawExtraction(), 'benmdaktotaal.nl');
    expect(analysis.typography.sizes.h1).toBe('2.5rem');
    expect(analysis.typography.sizes.h2).toBe('2rem');
  });

  it('sets Google Fonts URL on fonts', () => {
    const analysis = analyzeHttpExtraction(makeRawExtraction(), 'benmdaktotaal.nl');
    expect(analysis.typography.headingFont.googleFontsUrl).toContain('fonts.googleapis.com');
  });

  it('analyzes spacing from extracted values', () => {
    const analysis = analyzeHttpExtraction(makeRawExtraction(), 'benmdaktotaal.nl');
    expect(analysis.spacing.sectionPadding.desktop).toMatch(/\d+px/);
    expect(analysis.spacing.cardPadding).toMatch(/\d+px/);
  });

  it('analyzes shapes from extracted radii', () => {
    const analysis = analyzeHttpExtraction(makeRawExtraction(), 'benmdaktotaal.nl');
    expect(analysis.shapes.buttonRadius).toMatch(/\d+px/);
  });

  it('sets extraction method to http-fetch', () => {
    const analysis = analyzeHttpExtraction(makeRawExtraction(), 'benmdaktotaal.nl');
    expect(analysis.extractionMethod).toBe('http-fetch');
  });

  it('calculates confidence based on data richness', () => {
    const richAnalysis = analyzeHttpExtraction(makeRawExtraction(), 'benmdaktotaal.nl');
    expect(richAnalysis.confidence).toBeGreaterThan(0.7);

    const poorAnalysis = analyzeHttpExtraction(makeRawExtraction({
      colors: [],
      fonts: [],
      sizes: [],
      googleFontsUrls: [],
      radii: [],
      shadows: [],
      html: '',
    }), 'test.com');
    expect(poorAnalysis.confidence).toBeLessThan(0.5);
  });

  it('produces a complete BrandAnalysis structure', () => {
    const analysis = analyzeHttpExtraction(makeRawExtraction(), 'benmdaktotaal.nl');
    expect(analysis.brandName).toBeTruthy();
    expect(analysis.domain).toBe('benmdaktotaal.nl');
    expect(analysis.colors.primary).toBeTruthy();
    expect(analysis.typography.headingFont).toBeDefined();
    expect(analysis.typography.bodyFont).toBeDefined();
    expect(analysis.spacing.sectionPadding).toBeDefined();
    expect(analysis.shapes.buttonRadius).toBeTruthy();
    expect(analysis.personality).toBeDefined();
    expect(analysis.pagesAnalyzed.length).toBeGreaterThan(0);
  });

  it('handles minimal extraction gracefully', () => {
    const minimal = analyzeHttpExtraction(makeRawExtraction({
      colors: [],
      fonts: [],
      sizes: [],
      spacings: [],
      radii: [],
      shadows: [],
      googleFontsUrls: [],
    }), 'example.com');

    // Should still produce a valid analysis with defaults
    expect(minimal.colors.primary).toBeTruthy();
    expect(minimal.typography.headingFont.family).toBeTruthy();
    expect(minimal.shapes.buttonRadius).toBeTruthy();
  });
});

// ============================================================================
// SiteExtractor facade tests (structure only — no network calls)
// ============================================================================

describe('SiteExtractor module structure', () => {
  it('exports extractSite function', async () => {
    const mod = await import('../extraction/SiteExtractor');
    expect(mod.extractSite).toBeDefined();
    expect(typeof mod.extractSite).toBe('function');
  });

  it('exports mergePersonalityData function', async () => {
    const mod = await import('../extraction/SiteExtractor');
    expect(mod.mergePersonalityData).toBeDefined();
  });
});
