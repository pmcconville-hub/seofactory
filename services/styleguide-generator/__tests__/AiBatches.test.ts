import { describe, it, expect } from 'vitest';
import {
  buildTokenSummary,
  buildBrandSummary,
  parseAiBatchResponse,
  registerAiSections,
} from '../sections/ai-batches/aiSectionUtils';
import { BATCH_A_SPECS } from '../sections/ai-batches/batchA-core';
import { BATCH_B_SPECS } from '../sections/ai-batches/batchB-content';
import { BATCH_C_SPECS } from '../sections/ai-batches/batchC-site';
import { BATCH_D_SPECS } from '../sections/ai-batches/batchD-guidelines';
import { getSectionsByBatch, getGenerator } from '../sections/SectionRegistry';
import type { DesignTokenSet, BrandAnalysis } from '../types';

// ============================================================================
// Test fixtures
// ============================================================================

function makeTokens(): DesignTokenSet {
  return {
    prefix: 'test',
    colors: {
      primary: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#3b82f6', 500: '#2563eb', 600: '#1d4ed8', 700: '#1e40af', 800: '#1e3a8a', 900: '#1e2a5e' },
      gray: { 50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb', 300: '#d1d5db', 400: '#9ca3af', 500: '#6b7280', 600: '#4b5563', 700: '#374151', 800: '#1f2937', 900: '#111827' },
      semantic: { success: '#22c55e', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6', whatsapp: '#25D366' },
    },
    typography: {
      headingFont: "'Montserrat', sans-serif",
      bodyFont: "'Open Sans', sans-serif",
      googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&family=Open+Sans:wght@400;500&display=swap',
      sizes: {
        h1: { size: '2.5rem', weight: 700, lineHeight: 1.2, letterSpacing: '-0.02em' },
        h2: { size: '2rem', weight: 700, lineHeight: 1.25, letterSpacing: '-0.015em' },
        h3: { size: '1.75rem', weight: 600, lineHeight: 1.3, letterSpacing: '-0.01em' },
        h4: { size: '1.5rem', weight: 600, lineHeight: 1.35, letterSpacing: '0' },
        h5: { size: '1.25rem', weight: 600, lineHeight: 1.4, letterSpacing: '0' },
        h6: { size: '1.125rem', weight: 600, lineHeight: 1.45, letterSpacing: '0' },
        body: { size: '1rem', weight: 400, lineHeight: 1.6, letterSpacing: '0' },
        small: { size: '0.875rem', weight: 400, lineHeight: 1.5, letterSpacing: '0' },
        label: { size: '0.875rem', weight: 500, lineHeight: 1.4, letterSpacing: '0.01em' },
        caption: { size: '0.75rem', weight: 400, lineHeight: 1.5, letterSpacing: '0.02em' },
      },
    },
    spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px', '2xl': '48px', '3xl': '64px', '4xl': '80px' },
    radius: { sm: '4px', md: '8px', lg: '12px', xl: '16px', '2xl': '24px', full: '9999px' },
    shadows: {
      sm: '0 1px 2px rgba(0,0,0,0.05)',
      md: '0 4px 6px rgba(0,0,0,0.1)',
      lg: '0 10px 15px rgba(0,0,0,0.1)',
      xl: '0 20px 25px rgba(0,0,0,0.15)',
      colored: '0 4px 14px rgba(59,130,246,0.3)',
      coloredLg: '0 10px 25px rgba(59,130,246,0.25)',
      red: '0 4px 14px rgba(239,68,68,0.3)',
      inner: 'inset 0 2px 4px rgba(0,0,0,0.06)',
    },
    transitions: { fast: '150ms ease', base: '250ms ease', slow: '400ms ease' },
    containers: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px' },
    zIndex: { base: 0, dropdown: 100, sticky: 200, overlay: 300, modal: 400, toast: 500 },
  };
}

function makeAnalysis(): BrandAnalysis {
  return {
    brandName: 'Test Brand',
    domain: 'testbrand.com',
    industry: 'technology',
    colors: {
      primary: '#3b82f6', secondary: '#8b5cf6', accent: '#f59e0b',
      textDark: '#1a1a1a', textBody: '#374151', backgroundLight: '#ffffff', backgroundDark: '#111827',
      allExtracted: [],
    },
    typography: {
      headingFont: { family: 'Montserrat', weights: [600, 700] },
      bodyFont: { family: 'Open Sans', weights: [400, 500] },
      sizes: { h1: '2.5rem', h2: '2rem', h3: '1.75rem', h4: '1.5rem', h5: '1.25rem', h6: '1.125rem', body: '1rem', small: '0.875rem' },
      lineHeights: { heading: 1.25, body: 1.6 },
      letterSpacing: { h1: '-0.02em', h2: '-0.015em', h3: '-0.01em', body: '0' },
    },
    spacing: { sectionPadding: { desktop: '80px', mobile: '40px' }, cardPadding: '24px', containerMaxWidth: '1200px', gaps: ['16px', '24px', '32px'] },
    shapes: { buttonRadius: '8px', cardRadius: '12px', imageRadius: '8px', inputRadius: '6px', shadows: { card: '0 2px 8px rgba(0,0,0,0.1)', button: '0 1px 3px rgba(0,0,0,0.12)', elevated: '0 10px 25px rgba(0,0,0,0.15)' } },
    components: [],
    personality: { overall: 'professional', formality: 3, energy: 3, warmth: 3, toneOfVoice: '' },
    extractionMethod: 'http-fetch',
    confidence: 0.8,
    pagesAnalyzed: ['https://testbrand.com/'],
  };
}

// ============================================================================
// Token/Brand Summary Tests
// ============================================================================

describe('buildTokenSummary', () => {
  it('includes CSS prefix', () => {
    const summary = buildTokenSummary(makeTokens());
    expect(summary).toContain('CSS PREFIX: .test-*');
  });

  it('includes primary colors', () => {
    const summary = buildTokenSummary(makeTokens());
    expect(summary).toContain('#3b82f6');
    expect(summary).toContain('(brand color)');
  });

  it('includes typography fonts', () => {
    const summary = buildTokenSummary(makeTokens());
    expect(summary).toContain('Montserrat');
    expect(summary).toContain('Open Sans');
  });

  it('includes radius and shadows', () => {
    const summary = buildTokenSummary(makeTokens());
    expect(summary).toContain('sm=4px');
    expect(summary).toContain('SHADOWS:');
  });
});

describe('buildBrandSummary', () => {
  it('includes brand name and domain', () => {
    const summary = buildBrandSummary(makeAnalysis());
    expect(summary).toContain('BRAND: Test Brand');
    expect(summary).toContain('DOMAIN: testbrand.com');
  });

  it('includes personality metrics', () => {
    const summary = buildBrandSummary(makeAnalysis());
    expect(summary).toContain('FORMALITY: 3/5');
    expect(summary).toContain('ENERGY: 3/5');
    expect(summary).toContain('WARMTH: 3/5');
  });

  it('includes industry', () => {
    const summary = buildBrandSummary(makeAnalysis());
    expect(summary).toContain('INDUSTRY: technology');
  });
});

// ============================================================================
// Response Parsing Tests
// ============================================================================

describe('parseAiBatchResponse', () => {
  const sampleResponse = `
=== SECTION 4 ===
\`\`\`html
<div class="test-btn test-btn-primary">Primary Button</div>
<div class="test-btn test-btn-secondary">Secondary Button</div>
\`\`\`
\`\`\`css
.test-btn {
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
}
.test-btn-primary {
  background: #3b82f6;
  color: #fff;
}
.test-btn-secondary {
  background: transparent;
  border: 1px solid #3b82f6;
}
\`\`\`

=== SECTION 5 ===
\`\`\`html
<div class="test-card">
  <div class="test-card-body">Card content</div>
</div>
\`\`\`
\`\`\`css
.test-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.test-card-body {
  padding: 24px;
}
\`\`\`
`;

  it('parses multiple sections from response', () => {
    const results = parseAiBatchResponse(sampleResponse, [4, 5]);
    expect(results.size).toBe(2);
    expect(results.has(4)).toBe(true);
    expect(results.has(5)).toBe(true);
  });

  it('extracts HTML from code blocks', () => {
    const results = parseAiBatchResponse(sampleResponse, [4, 5]);
    const section4 = results.get(4)!;
    expect(section4.demoHtml).toContain('test-btn-primary');
    expect(section4.demoHtml).toContain('Primary Button');
  });

  it('extracts CSS from code blocks', () => {
    const results = parseAiBatchResponse(sampleResponse, [4, 5]);
    const section4 = results.get(4)!;
    expect(section4.cssCode).toContain('.test-btn {');
    expect(section4.cssCode).toContain('background: #3b82f6');
  });

  it('extracts class names from CSS (excluding sg- prefix)', () => {
    const results = parseAiBatchResponse(sampleResponse, [4, 5]);
    const section4 = results.get(4)!;
    expect(section4.classNames).toContain('test-btn');
    expect(section4.classNames).toContain('test-btn-primary');
    expect(section4.classNames).toContain('test-btn-secondary');
  });

  it('deduplicates class names', () => {
    const results = parseAiBatchResponse(sampleResponse, [4]);
    const section4 = results.get(4)!;
    const uniqueNames = new Set(section4.classNames);
    expect(section4.classNames.length).toBe(uniqueNames.size);
  });

  it('handles missing sections gracefully', () => {
    const results = parseAiBatchResponse(sampleResponse, [4, 5, 99]);
    expect(results.has(99)).toBe(false);
    expect(results.size).toBe(2);
  });

  it('handles empty response', () => {
    const results = parseAiBatchResponse('', [4, 5]);
    expect(results.size).toBe(0);
  });
});

// ============================================================================
// Section Registration Tests
// ============================================================================

describe('registerAiSections', () => {
  it('registers sections from AI output', () => {
    const specs = [BATCH_A_SPECS[0]]; // Section 4 (Buttons)
    const outputs = new Map([
      [4, {
        sectionId: 4,
        demoHtml: '<button class="test-btn">Click</button>',
        cssCode: '.test-btn { padding: 8px; }',
        classNames: ['test-btn'],
      }],
    ]);

    registerAiSections(specs, outputs);
    const gen = getGenerator(4);
    expect(gen).toBeDefined();

    const section = gen!({
      tokens: makeTokens(),
      analysis: makeAnalysis(),
      language: 'en',
    });
    expect(section.id).toBe(4);
    expect(section.title).toBe('Buttons');
    expect(section.html).toContain('test-btn');
    expect(section.classesGenerated).toContain('test-btn');
  });

  it('registers placeholder for missing AI output', () => {
    const specs = [BATCH_A_SPECS[2]]; // Section 7 (Lists)
    const emptyOutputs = new Map<number, { sectionId: number; demoHtml: string; cssCode: string; classNames: string[] }>();

    registerAiSections(specs, emptyOutputs);
    const gen = getGenerator(7);
    expect(gen).toBeDefined();

    const section = gen!({
      tokens: makeTokens(),
      analysis: makeAnalysis(),
      language: 'en',
    });
    expect(section.id).toBe(7);
    expect(section.html).toContain('future pass');
    expect(section.classesGenerated).toEqual([]);
  });
});

// ============================================================================
// Batch Spec Integrity Tests
// ============================================================================

describe('Batch specs integrity', () => {
  it('Batch A has 6 sections matching registry', () => {
    expect(BATCH_A_SPECS.length).toBe(6);
    const registryIds = getSectionsByBatch('ai-batchA');
    const specIds = BATCH_A_SPECS.map(s => s.id);
    expect(specIds).toEqual(registryIds);
  });

  it('Batch B has 8 sections matching registry', () => {
    expect(BATCH_B_SPECS.length).toBe(8);
    const registryIds = getSectionsByBatch('ai-batchB');
    const specIds = BATCH_B_SPECS.map(s => s.id);
    expect(specIds).toEqual(registryIds);
  });

  it('Batch C has 12 sections matching registry', () => {
    expect(BATCH_C_SPECS.length).toBe(12);
    const registryIds = getSectionsByBatch('ai-batchC');
    const specIds = BATCH_C_SPECS.map(s => s.id);
    expect(specIds).toEqual(registryIds);
  });

  it('Batch D has 5 sections matching registry', () => {
    expect(BATCH_D_SPECS.length).toBe(5);
    const registryIds = getSectionsByBatch('ai-batchD');
    const specIds = BATCH_D_SPECS.map(s => s.id);
    expect(specIds).toEqual(registryIds);
  });

  it('all AI sections total 31 (48 - 17 template)', () => {
    const total = BATCH_A_SPECS.length + BATCH_B_SPECS.length + BATCH_C_SPECS.length + BATCH_D_SPECS.length;
    expect(total).toBe(31);
  });

  it('no duplicate section IDs across batches', () => {
    const allIds = [
      ...BATCH_A_SPECS.map(s => s.id),
      ...BATCH_B_SPECS.map(s => s.id),
      ...BATCH_C_SPECS.map(s => s.id),
      ...BATCH_D_SPECS.map(s => s.id),
    ];
    const uniqueIds = new Set(allIds);
    expect(allIds.length).toBe(uniqueIds.size);
  });

  it('every spec has required fields', () => {
    const allSpecs = [...BATCH_A_SPECS, ...BATCH_B_SPECS, ...BATCH_C_SPECS, ...BATCH_D_SPECS];
    for (const spec of allSpecs) {
      expect(spec.id).toBeGreaterThan(0);
      expect(spec.title.length).toBeGreaterThan(0);
      expect(spec.category.length).toBeGreaterThan(0);
      expect(spec.description.length).toBeGreaterThan(0);
    }
  });
});
