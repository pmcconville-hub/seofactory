/**
 * Tests for useBrandComparison Hook — Pure computation functions
 */

import { describe, it, expect } from 'vitest';
import {
  computeColorDistance,
  computeTypographySimilarity,
  computeOverallSimilarity,
} from '../useBrandComparison';
import type { DesignDNA } from '../../types/designDna';

/**
 * Build a minimal DesignDNA fixture with only the fields needed for comparison.
 */
function buildDna(overrides: {
  primaryHex?: string;
  secondaryHex?: string;
  accentHex?: string;
  headingFamily?: string;
  bodyFamily?: string;
  headingStyle?: 'serif' | 'sans-serif' | 'display' | 'slab' | 'mono';
  headingWeight?: number;
  formality?: 1 | 2 | 3 | 4 | 5;
  energy?: 1 | 2 | 3 | 4 | 5;
  warmth?: 1 | 2 | 3 | 4 | 5;
} = {}): DesignDNA {
  return {
    colors: {
      primary: { hex: overrides.primaryHex || '#000000', usage: 'primary', confidence: 90 },
      primaryLight: { hex: '#333333', usage: 'primary-light', confidence: 80 },
      primaryDark: { hex: '#000000', usage: 'primary-dark', confidence: 80 },
      secondary: { hex: overrides.secondaryHex || '#555555', usage: 'secondary', confidence: 85 },
      accent: { hex: overrides.accentHex || '#AAAAAA', usage: 'accent', confidence: 85 },
      neutrals: { darkest: '#000', dark: '#333', medium: '#666', light: '#999', lightest: '#CCC' },
      semantic: { success: '#0f0', warning: '#ff0', error: '#f00', info: '#00f' },
      harmony: 'monochromatic',
      dominantMood: 'corporate',
      contrastLevel: 'medium',
    },
    typography: {
      headingFont: {
        family: overrides.headingFamily || 'Inter',
        fallback: 'sans-serif',
        weight: overrides.headingWeight ?? 700,
        style: overrides.headingStyle || 'sans-serif',
        character: 'modern',
      },
      bodyFont: {
        family: overrides.bodyFamily || 'Inter',
        fallback: 'sans-serif',
        weight: 400,
        style: 'sans-serif',
        lineHeight: 1.6,
      },
      scaleRatio: 1.25,
      baseSize: '16px',
      headingCase: 'none',
      headingLetterSpacing: 'normal',
      usesDropCaps: false,
      headingUnderlineStyle: 'none',
      linkStyle: 'underline',
    },
    spacing: { baseUnit: 8, density: 'comfortable', sectionGap: 'moderate', contentWidth: 'medium', whitespacePhilosophy: 'balanced' },
    shapes: {
      borderRadius: { style: 'subtle', small: '4px', medium: '8px', large: '16px', full: '9999px' },
      buttonStyle: 'soft',
      cardStyle: 'subtle-shadow',
      inputStyle: 'bordered',
    },
    effects: {
      shadows: { style: 'subtle', cardShadow: '', buttonShadow: '', elevatedShadow: '' },
      gradients: { usage: 'none', primaryGradient: '', heroGradient: '', ctaGradient: '' },
      backgrounds: { usesPatterns: false, usesTextures: false, usesOverlays: false },
      borders: { style: 'subtle', defaultColor: '#e5e7eb', accentBorderUsage: false },
    },
    decorative: {
      dividerStyle: 'line',
      usesFloatingShapes: false,
      usesCornerAccents: false,
      usesWaveShapes: false,
      usesGeometricPatterns: false,
      iconStyle: 'outline',
      decorativeAccentColor: '#000',
    },
    layout: {
      gridStyle: 'strict-12',
      alignment: 'left',
      heroStyle: 'contained',
      cardLayout: 'grid',
      ctaPlacement: 'inline',
      navigationStyle: 'standard',
    },
    motion: {
      overall: 'subtle',
      transitionSpeed: 'normal',
      easingStyle: 'ease',
      hoverEffects: { buttons: 'darken', cards: 'lift', links: 'underline' },
      scrollAnimations: false,
      parallaxEffects: false,
    },
    images: { treatment: 'natural', frameStyle: 'rounded', hoverEffect: 'none', aspectRatioPreference: '16:9' },
    componentPreferences: {
      preferredListStyle: 'bullets',
      preferredCardStyle: 'minimal',
      testimonialStyle: 'card',
      faqStyle: 'accordion',
      ctaStyle: 'button',
    },
    personality: {
      overall: 'corporate',
      formality: overrides.formality ?? 3,
      energy: overrides.energy ?? 3,
      warmth: overrides.warmth ?? 3,
      trustSignals: 'moderate',
    },
    confidence: { overall: 85, colorsConfidence: 90, typographyConfidence: 80, layoutConfidence: 85 },
    analysisNotes: [],
  };
}

// =============================================================================
// computeColorDistance tests
// =============================================================================
describe('computeColorDistance', () => {
  it('returns 0 for identical color palettes', () => {
    const dna = buildDna({ primaryHex: '#FF0000', secondaryHex: '#00FF00', accentHex: '#0000FF' });
    expect(computeColorDistance(dna, dna)).toBe(0);
  });

  it('returns > 0 for different color palettes', () => {
    const dnaA = buildDna({ primaryHex: '#FF0000', secondaryHex: '#00FF00', accentHex: '#0000FF' });
    const dnaB = buildDna({ primaryHex: '#00FFFF', secondaryHex: '#FF00FF', accentHex: '#FFFF00' });
    const distance = computeColorDistance(dnaA, dnaB);
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThanOrEqual(100);
  });

  it('returns 0 when both use exact same hex values', () => {
    const dnaA = buildDna({ primaryHex: '#112233', secondaryHex: '#445566', accentHex: '#778899' });
    const dnaB = buildDna({ primaryHex: '#112233', secondaryHex: '#445566', accentHex: '#778899' });
    expect(computeColorDistance(dnaA, dnaB)).toBe(0);
  });

  it('returns maximum distance for black vs white palette', () => {
    const dnaA = buildDna({ primaryHex: '#000000', secondaryHex: '#000000', accentHex: '#000000' });
    const dnaB = buildDna({ primaryHex: '#FFFFFF', secondaryHex: '#FFFFFF', accentHex: '#FFFFFF' });
    const distance = computeColorDistance(dnaA, dnaB);
    // Should be 100 (max distance)
    expect(distance).toBe(100);
  });

  it('handles lowercase and uppercase hex', () => {
    const dnaA = buildDna({ primaryHex: '#ff0000', secondaryHex: '#00ff00', accentHex: '#0000ff' });
    const dnaB = buildDna({ primaryHex: '#FF0000', secondaryHex: '#00FF00', accentHex: '#0000FF' });
    expect(computeColorDistance(dnaA, dnaB)).toBe(0);
  });

  it('computes a moderate distance for slightly different palettes', () => {
    const dnaA = buildDna({ primaryHex: '#FF0000', secondaryHex: '#00FF00', accentHex: '#0000FF' });
    const dnaB = buildDna({ primaryHex: '#EE1111', secondaryHex: '#11EE11', accentHex: '#1111EE' });
    const distance = computeColorDistance(dnaA, dnaB);
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(20); // Should be relatively small for similar colors
  });
});

// =============================================================================
// computeTypographySimilarity tests
// =============================================================================
describe('computeTypographySimilarity', () => {
  it('returns 100 for identical typography', () => {
    const dna = buildDna({ headingFamily: 'Inter', bodyFamily: 'Inter', headingStyle: 'sans-serif', headingWeight: 700 });
    expect(computeTypographySimilarity(dna, dna)).toBe(100);
  });

  it('returns < 100 when heading fonts differ', () => {
    const dnaA = buildDna({ headingFamily: 'Inter', bodyFamily: 'Inter' });
    const dnaB = buildDna({ headingFamily: 'Georgia', bodyFamily: 'Inter' });
    const similarity = computeTypographySimilarity(dnaA, dnaB);
    expect(similarity).toBeLessThan(100);
    expect(similarity).toBeGreaterThanOrEqual(0);
  });

  it('returns < 100 when body fonts differ', () => {
    const dnaA = buildDna({ headingFamily: 'Inter', bodyFamily: 'Inter' });
    const dnaB = buildDna({ headingFamily: 'Inter', bodyFamily: 'Georgia' });
    const similarity = computeTypographySimilarity(dnaA, dnaB);
    expect(similarity).toBeLessThan(100);
    expect(similarity).toBe(70); // only -30 for body font difference
  });

  it('deducts for different heading styles', () => {
    const dnaA = buildDna({ headingStyle: 'sans-serif' });
    const dnaB = buildDna({ headingStyle: 'serif' });
    const similarity = computeTypographySimilarity(dnaA, dnaB);
    expect(similarity).toBe(80); // -20 for style difference
  });

  it('deducts for weight difference', () => {
    const dnaA = buildDna({ headingWeight: 400 });
    const dnaB = buildDna({ headingWeight: 700 });
    const similarity = computeTypographySimilarity(dnaA, dnaB);
    expect(similarity).toBeLessThan(100);
  });

  it('returns 0 when everything is different', () => {
    const dnaA = buildDna({ headingFamily: 'Inter', bodyFamily: 'Inter', headingStyle: 'sans-serif', headingWeight: 400 });
    const dnaB = buildDna({ headingFamily: 'Georgia', bodyFamily: 'Merriweather', headingStyle: 'serif', headingWeight: 900 });
    const similarity = computeTypographySimilarity(dnaA, dnaB);
    expect(similarity).toBe(0);
  });

  it('is case-insensitive for font family comparison', () => {
    const dnaA = buildDna({ headingFamily: 'inter', bodyFamily: 'ROBOTO' });
    const dnaB = buildDna({ headingFamily: 'Inter', bodyFamily: 'Roboto' });
    expect(computeTypographySimilarity(dnaA, dnaB)).toBe(100);
  });
});

// =============================================================================
// computeOverallSimilarity tests
// =============================================================================
describe('computeOverallSimilarity', () => {
  it('returns 100 for identical metrics', () => {
    const result = computeOverallSimilarity(0, 100, { formality: 0, energy: 0, warmth: 0 });
    expect(result).toBe(100);
  });

  it('returns 0 for maximum differences', () => {
    const result = computeOverallSimilarity(100, 0, { formality: 4, energy: 4, warmth: 4 });
    expect(result).toBe(0);
  });

  it('weights color and typography equally at 40% each', () => {
    // Only color difference: 50% different
    const colorOnly = computeOverallSimilarity(50, 100, { formality: 0, energy: 0, warmth: 0 });
    // (100-50)*0.4 + 100*0.4 + 100*0.2 = 20 + 40 + 20 = 80
    expect(colorOnly).toBe(80);

    // Only typography difference: 50% similar
    const typoOnly = computeOverallSimilarity(0, 50, { formality: 0, energy: 0, warmth: 0 });
    // 100*0.4 + 50*0.4 + 100*0.2 = 40 + 20 + 20 = 80
    expect(typoOnly).toBe(80);
  });

  it('personality contributes 20% of the score', () => {
    // All personality dimensions maxed out in difference
    const result = computeOverallSimilarity(0, 100, { formality: 4, energy: 4, warmth: 4 });
    // (100)*0.4 + (100)*0.4 + max(0, 100-120)*0.2 = 40 + 40 + 0 = 80
    expect(result).toBe(80);
  });

  it('returns reasonable value for moderate differences', () => {
    const result = computeOverallSimilarity(30, 70, { formality: 1, energy: -1, warmth: 0 });
    // (100-30)*0.4 + 70*0.4 + max(0, 100-20)*0.2 = 28 + 28 + 16 = 72
    expect(result).toBe(72);
  });
});
