import { describe, it, expect } from 'vitest';
import {
  toRendererTokens,
  generateCompiledCss,
  toBrandDesignSystem,
} from '../integration/rendererBridge';
import {
  getColorExpectations,
  getTypographyExpectations,
  isOnBrandColor,
  isOnBrandFont,
} from '../integration/auditBridge';
import type { DesignTokenSet } from '../types';

// ============================================================================
// Test fixture
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

// ============================================================================
// Renderer Bridge Tests
// ============================================================================

describe('toRendererTokens', () => {
  it('maps primary color to 400 step', () => {
    const result = toRendererTokens(makeTokens());
    expect(result.colors?.primary).toBe('#3b82f6');
  });

  it('maps heading and body fonts', () => {
    const result = toRendererTokens(makeTokens());
    expect(result.fonts?.heading).toContain('Montserrat');
    expect(result.fonts?.body).toContain('Open Sans');
  });

  it('maps gray scale for surface/text/border', () => {
    const result = toRendererTokens(makeTokens());
    expect(result.colors?.surface).toBe('#f9fafb');
    expect(result.colors?.text).toBe('#111827');
    expect(result.colors?.border).toBe('#e5e7eb');
  });
});

describe('generateCompiledCss', () => {
  it('produces CSS with custom properties', () => {
    const css = generateCompiledCss(makeTokens());
    expect(css).toContain('--test-primary-400');
    expect(css).toContain('#3b82f6');
  });

  it('includes typography rules', () => {
    const css = generateCompiledCss(makeTokens());
    expect(css).toContain('font-family: var(--test-font-heading)');
    expect(css).toContain('h1');
    expect(css).toContain('2.5rem');
  });

  it('includes button classes with prefix', () => {
    const css = generateCompiledCss(makeTokens());
    expect(css).toContain('.test-btn');
    expect(css).toContain('.test-btn-primary');
    expect(css).toContain('.test-btn-outline');
  });

  it('includes card classes with prefix', () => {
    const css = generateCompiledCss(makeTokens());
    expect(css).toContain('.test-card');
    expect(css).toContain('.test-card-body');
  });

  it('includes spacing custom properties', () => {
    const css = generateCompiledCss(makeTokens());
    expect(css).toContain('--test-space-md: 16px');
    expect(css).toContain('--test-space-lg: 24px');
  });

  it('includes alert classes', () => {
    const css = generateCompiledCss(makeTokens());
    expect(css).toContain('.test-alert');
    expect(css).toContain('.test-alert-success');
    expect(css).toContain('.test-alert-error');
  });
});

describe('toBrandDesignSystem', () => {
  it('creates a BrandDesignSystem-compatible object', () => {
    const bds = toBrandDesignSystem(makeTokens(), 'Test Brand', 'testbrand.com');
    expect(bds.compiledCss).toContain('.test-btn');
    expect(bds.brandName).toBe('Test Brand');
    expect(bds.sourceUrl).toBe('testbrand.com');
    expect(bds.generatedAt).toBeTruthy();
  });
});

// ============================================================================
// Audit Bridge Tests
// ============================================================================

describe('getColorExpectations', () => {
  it('returns primary hex from 400 step', () => {
    const exp = getColorExpectations(makeTokens());
    expect(exp.primaryHex).toBe('#3b82f6');
  });

  it('returns all primary shades', () => {
    const exp = getColorExpectations(makeTokens());
    expect(exp.primaryShades).toContain('#eff6ff');
    expect(exp.primaryShades).toContain('#3b82f6');
    expect(exp.primaryShades).toContain('#1e2a5e');
    expect(exp.primaryShades.length).toBe(10);
  });

  it('returns semantic colors', () => {
    const exp = getColorExpectations(makeTokens());
    expect(exp.successHex).toBe('#22c55e');
    expect(exp.errorHex).toBe('#ef4444');
  });
});

describe('getTypographyExpectations', () => {
  it('returns font families', () => {
    const exp = getTypographyExpectations(makeTokens());
    expect(exp.headingFontFamily).toContain('Montserrat');
    expect(exp.bodyFontFamily).toContain('Open Sans');
  });

  it('returns Google Fonts URL', () => {
    const exp = getTypographyExpectations(makeTokens());
    expect(exp.googleFontsUrl).toContain('fonts.googleapis.com');
  });
});

describe('isOnBrandColor', () => {
  it('recognizes primary colors', () => {
    expect(isOnBrandColor('#3b82f6', makeTokens())).toBe(true);
    expect(isOnBrandColor('#eff6ff', makeTokens())).toBe(true);
  });

  it('recognizes gray scale', () => {
    expect(isOnBrandColor('#f9fafb', makeTokens())).toBe(true);
  });

  it('recognizes semantic colors', () => {
    expect(isOnBrandColor('#22c55e', makeTokens())).toBe(true);
    expect(isOnBrandColor('#ef4444', makeTokens())).toBe(true);
  });

  it('recognizes common neutrals', () => {
    expect(isOnBrandColor('#ffffff', makeTokens())).toBe(true);
    expect(isOnBrandColor('#000000', makeTokens())).toBe(true);
  });

  it('rejects off-brand colors', () => {
    expect(isOnBrandColor('#ff00ff', makeTokens())).toBe(false);
    expect(isOnBrandColor('#123456', makeTokens())).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isOnBrandColor('#3B82F6', makeTokens())).toBe(true);
  });
});

describe('isOnBrandFont', () => {
  it('recognizes heading font', () => {
    expect(isOnBrandFont('Montserrat', makeTokens())).toBe(true);
  });

  it('recognizes body font', () => {
    expect(isOnBrandFont('Open Sans', makeTokens())).toBe(true);
  });

  it('recognizes system fonts', () => {
    expect(isOnBrandFont('system-ui', makeTokens())).toBe(true);
    expect(isOnBrandFont('sans-serif', makeTokens())).toBe(true);
  });

  it('rejects off-brand fonts', () => {
    expect(isOnBrandFont('Comic Sans MS', makeTokens())).toBe(false);
    expect(isOnBrandFont('Papyrus', makeTokens())).toBe(false);
  });

  it('handles quoted font names', () => {
    expect(isOnBrandFont("'Montserrat'", makeTokens())).toBe(true);
    expect(isOnBrandFont('"Open Sans"', makeTokens())).toBe(true);
  });
});
