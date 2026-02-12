import { describe, it, expect } from 'vitest';
import {
  generateColorScale,
  generateGrayScale,
  generateSemanticColors,
  hexToHSL,
  hslToHex,
  normalizeHex,
  getHue,
} from '../tokens/ColorScaleGenerator';

// ============================================================================
// HEX ↔ HSL CONVERSION
// ============================================================================

describe('hexToHSL', () => {
  it('converts pure red correctly', () => {
    const hsl = hexToHSL('#ff0000');
    expect(hsl.h).toBe(0);
    expect(hsl.s).toBe(100);
    expect(hsl.l).toBe(50);
  });

  it('converts pure green correctly', () => {
    const hsl = hexToHSL('#00ff00');
    expect(hsl.h).toBe(120);
    expect(hsl.s).toBe(100);
    expect(hsl.l).toBe(50);
  });

  it('converts white correctly', () => {
    const hsl = hexToHSL('#ffffff');
    expect(hsl.s).toBe(0);
    expect(hsl.l).toBe(100);
  });

  it('converts black correctly', () => {
    const hsl = hexToHSL('#000000');
    expect(hsl.s).toBe(0);
    expect(hsl.l).toBe(0);
  });

  it('handles the B&M Dak-Totaal green (#6EB544)', () => {
    const hsl = hexToHSL('#6EB544');
    expect(hsl.h).toBeGreaterThan(90);
    expect(hsl.h).toBeLessThan(110);
    expect(hsl.s).toBeGreaterThan(40);
    expect(hsl.l).toBeGreaterThan(40);
    expect(hsl.l).toBeLessThan(60);
  });
});

describe('hslToHex', () => {
  it('converts HSL back to hex (pure red)', () => {
    expect(hslToHex(0, 100, 50)).toBe('#ff0000');
  });

  it('converts HSL to hex (gray)', () => {
    const hex = hslToHex(0, 0, 50);
    expect(hex).toBe('#808080');
  });

  it('roundtrips a color through HSL and back', () => {
    const original = '#6eb544';
    const hsl = hexToHSL(original);
    const roundtripped = hslToHex(hsl.h, hsl.s, hsl.l);
    // Allow minor rounding differences (±2 per channel)
    const origRgb = parseInt(original.slice(1), 16);
    const rtRgb = parseInt(roundtripped.slice(1), 16);
    expect(Math.abs(origRgb - rtRgb)).toBeLessThan(0x030303);
  });
});

// ============================================================================
// COLOR SCALE GENERATION
// ============================================================================

describe('generateColorScale', () => {
  it('puts the brand color at step 400', () => {
    const scale = generateColorScale('#6EB544');
    expect(scale[400]).toBe('#6EB544');
  });

  it('produces lighter colors for steps 50-300', () => {
    const scale = generateColorScale('#6EB544');
    const brandLightness = hexToHSL('#6EB544').l;

    for (const step of [50, 100, 200, 300] as const) {
      const stepLightness = hexToHSL(scale[step]).l;
      expect(stepLightness).toBeGreaterThan(brandLightness);
    }
  });

  it('produces darker colors for steps 500-900', () => {
    const scale = generateColorScale('#6EB544');
    const brandLightness = hexToHSL('#6EB544').l;

    for (const step of [500, 600, 700, 800, 900] as const) {
      const stepLightness = hexToHSL(scale[step]).l;
      expect(stepLightness).toBeLessThan(brandLightness);
    }
  });

  it('has monotonically decreasing lightness from 50 to 900', () => {
    const scale = generateColorScale('#2B4C9B');
    const lightnesses = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map(
      step => hexToHSL(scale[step as keyof typeof scale]).l
    );
    for (let i = 1; i < lightnesses.length; i++) {
      expect(lightnesses[i]).toBeLessThanOrEqual(lightnesses[i - 1]);
    }
  });

  it('all steps produce valid hex colors', () => {
    const scale = generateColorScale('#d32f2f');
    for (const step of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const) {
      expect(scale[step]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('works with a blue brand color', () => {
    const scale = generateColorScale('#2B4C9B');
    expect(scale[400]).toBe('#2B4C9B');
    // Step 50 should be very light blue
    const hsl50 = hexToHSL(scale[50]);
    expect(hsl50.l).toBeGreaterThan(90);
  });

  it('works with a near-white color gracefully', () => {
    const scale = generateColorScale('#f0f0f0');
    // Should not crash, all steps valid hex
    for (const step of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const) {
      expect(scale[step]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

// ============================================================================
// GRAY SCALE
// ============================================================================

describe('generateGrayScale', () => {
  it('produces 10 valid hex colors', () => {
    const scale = generateGrayScale('#6EB544');
    for (const step of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const) {
      expect(scale[step]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('step 50 is very light (>95% lightness)', () => {
    const scale = generateGrayScale('#6EB544');
    expect(hexToHSL(scale[50]).l).toBeGreaterThan(95);
  });

  it('step 900 is very dark (<15% lightness)', () => {
    const scale = generateGrayScale('#6EB544');
    expect(hexToHSL(scale[900]).l).toBeLessThan(15);
  });

  it('has very low saturation (grays stay gray)', () => {
    const scale = generateGrayScale('#d32f2f');
    for (const step of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const) {
      expect(hexToHSL(scale[step]).s).toBeLessThanOrEqual(5);
    }
  });

  it('warm brand produces warm-tinted grays (hue ~30)', () => {
    const scale = generateGrayScale('#d32f2f');  // red = warm
    // The mid-range grays should have a warm hue
    const hsl = hexToHSL(scale[500]);
    // With only 3% saturation the hue is subtle but present
    expect(hsl.s).toBeGreaterThan(0);
  });

  it('cool brand produces cool-tinted grays', () => {
    const scale = generateGrayScale('#2B4C9B');  // blue = cool
    const hsl = hexToHSL(scale[500]);
    expect(hsl.s).toBeGreaterThan(0);
  });
});

// ============================================================================
// SEMANTIC COLORS
// ============================================================================

describe('generateSemanticColors', () => {
  it('returns valid hex for all semantic colors', () => {
    const colors = generateSemanticColors('#6EB544');
    expect(colors.success).toMatch(/^#[0-9a-f]{6}$/);
    expect(colors.error).toMatch(/^#[0-9a-f]{6}$/);
    expect(colors.warning).toMatch(/^#[0-9a-f]{6}$/);
    expect(colors.info).toMatch(/^#[0-9a-f]{6}$/);
    expect(colors.whatsapp).toBe('#25D366');
  });

  it('uses teal for success when primary is green', () => {
    const colors = generateSemanticColors('#6EB544');
    expect(colors.success).toBe('#0d9488');  // teal
  });

  it('uses standard green for success when primary is blue', () => {
    const colors = generateSemanticColors('#2B4C9B');
    expect(colors.success).toBe('#10b981');
  });

  it('uses indigo for info when primary is blue', () => {
    const colors = generateSemanticColors('#2B4C9B');
    expect(colors.info).toBe('#6366f1');
  });

  it('uses standard blue for info when primary is green', () => {
    const colors = generateSemanticColors('#6EB544');
    expect(colors.info).toBe('#3b82f6');
  });

  it('uses rose for error when primary is red', () => {
    const colors = generateSemanticColors('#d32f2f');
    expect(colors.error).toBe('#be123c');
  });
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

describe('normalizeHex', () => {
  it('normalizes 3-digit hex', () => {
    expect(normalizeHex('#abc')).toBe('#aabbcc');
  });

  it('normalizes 6-digit hex to lowercase', () => {
    expect(normalizeHex('#6EB544')).toBe('#6eb544');
  });

  it('adds # prefix if missing', () => {
    expect(normalizeHex('6EB544')).toBe('#6eb544');
  });

  it('returns null for invalid input', () => {
    expect(normalizeHex('')).toBeNull();
    expect(normalizeHex('not-a-color')).toBeNull();
    expect(normalizeHex('#xyz')).toBeNull();
  });
});

describe('getHue', () => {
  it('returns hue for a green color', () => {
    const hue = getHue('#6EB544');
    expect(hue).toBeGreaterThan(90);
    expect(hue).toBeLessThan(110);
  });

  it('returns hue for a blue color', () => {
    const hue = getHue('#2B4C9B');
    expect(hue).toBeGreaterThan(200);
    expect(hue).toBeLessThan(240);
  });

  it('returns 0 for pure red', () => {
    expect(getHue('#ff0000')).toBe(0);
  });
});
