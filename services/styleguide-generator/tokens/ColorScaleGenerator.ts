// services/styleguide-generator/tokens/ColorScaleGenerator.ts
// Deterministic color scale generation from a single hex color.
// Produces Tailwind-style 50-900 scales using HSL interpolation.

import type { ColorScale, SemanticColors } from '../types';

// ============================================================================
// HEX ↔ HSL CONVERSION UTILITIES
// ============================================================================

interface HSL {
  h: number;  // 0-360
  s: number;  // 0-100
  l: number;  // 0-100
}

/** Parse a 3 or 6 digit hex string to {r, g, b} (0-255) */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

/** Convert hex to HSL */
export function hexToHSL(hex: string): HSL {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: l * 100 };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  if (rn === max) {
    h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  } else if (gn === max) {
    h = ((bn - rn) / d + 2) / 6;
  } else {
    h = ((rn - gn) / d + 4) / 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/** Convert HSL to hex */
export function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100;
  const ln = l / 100;

  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;

  let rn: number, gn: number, bn: number;
  if (h < 60) { rn = c; gn = x; bn = 0; }
  else if (h < 120) { rn = x; gn = c; bn = 0; }
  else if (h < 180) { rn = 0; gn = c; bn = x; }
  else if (h < 240) { rn = 0; gn = x; bn = c; }
  else if (h < 300) { rn = x; gn = 0; bn = c; }
  else { rn = c; gn = 0; bn = x; }

  const r = Math.round((rn + m) * 255);
  const g = Math.round((gn + m) * 255);
  const b = Math.round((bn + m) * 255);

  return '#' + [r, g, b].map(c => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('');
}

// ============================================================================
// COLOR SCALE GENERATION
// ============================================================================

/**
 * Generate a 50-900 color scale from a single brand hex color.
 * The input hex becomes the 400 step. Lighter steps go up from there,
 * darker steps go down. Uses HSL interpolation for perceptually even results.
 *
 * Light steps (50-300): Reduce saturation progressively, increase lightness
 * Dark steps (500-900): Slightly boost saturation, reduce lightness
 */
export function generateColorScale(brandHex: string): ColorScale {
  const hsl = hexToHSL(brandHex);
  const { h, s, l } = hsl;

  return {
    50:  hslToHex(h, Math.max(s * 0.30, 5),  97),
    100: hslToHex(h, Math.max(s * 0.40, 8),  93),
    200: hslToHex(h, Math.max(s * 0.55, 12), 85),
    300: hslToHex(h, Math.max(s * 0.70, 18), 72),
    400: brandHex,  // ★ The brand color itself
    500: hslToHex(h, Math.min(s * 1.05, 100), l * 0.85),
    600: hslToHex(h, Math.min(s * 1.10, 100), l * 0.72),
    700: hslToHex(h, Math.min(s * 1.10, 100), l * 0.55),
    800: hslToHex(h, Math.min(s * 1.05, 100), l * 0.38),
    900: hslToHex(h, Math.min(s * 0.95, 100), l * 0.22),
  };
}

/**
 * Generate a brand-warmth-tinted gray scale.
 * Cool brands (blue/purple primary) → blue-tinted grays
 * Warm brands (red/orange/yellow primary) → warm-tinted grays
 * Neutral brands (green) → neutral grays with very subtle tint
 */
export function generateGrayScale(primaryHex: string): ColorScale {
  const { h } = hexToHSL(primaryHex);

  // Determine tint based on primary hue
  const isWarm = (h >= 0 && h <= 60) || h >= 300;
  const isCool = h >= 180 && h <= 270;
  const tintHue = isWarm ? 30 : isCool ? 220 : 0;
  const tintSaturation = 3;  // very subtle — grays should stay gray

  return {
    50:  hslToHex(tintHue, tintSaturation, 98),
    100: hslToHex(tintHue, tintSaturation, 96),
    200: hslToHex(tintHue, tintSaturation, 91),
    300: hslToHex(tintHue, tintSaturation, 82),
    400: hslToHex(tintHue, tintSaturation, 64),
    500: hslToHex(tintHue, tintSaturation, 45),
    600: hslToHex(tintHue, tintSaturation, 32),
    700: hslToHex(tintHue, tintSaturation, 25),
    800: hslToHex(tintHue, tintSaturation, 17),
    900: hslToHex(tintHue, tintSaturation, 10),
  };
}

/**
 * Generate semantic/functional colors, avoiding conflicts with the primary brand color.
 * If the primary is greenish, success becomes teal instead.
 * If the primary is bluish, info becomes indigo instead.
 */
export function generateSemanticColors(primaryHex: string): SemanticColors {
  const { h } = hexToHSL(primaryHex);

  const isGreenish = h >= 80 && h <= 160;
  const isBlueish = h >= 200 && h <= 260;
  const isRedish = (h >= 0 && h <= 20) || h >= 340;

  return {
    success: isGreenish ? '#0d9488' : '#10b981',     // teal if primary is green
    error: isRedish ? '#be123c' : '#dc2626',          // rose if primary is red
    warning: '#f59e0b',                                // amber (rarely conflicts)
    info: isBlueish ? '#6366f1' : '#3b82f6',          // indigo if primary is blue
    whatsapp: '#25D366',                               // fixed WhatsApp green
  };
}

// ============================================================================
// UTILITY: Get hue from hex (convenience re-export)
// ============================================================================

export function getHue(hex: string): number {
  return hexToHSL(hex).h;
}

/**
 * Validate that a string is a valid 3 or 6 digit hex color.
 * Returns normalized 6-digit hex with # prefix, or null if invalid.
 */
export function normalizeHex(input: string): string | null {
  if (!input) return null;
  let hex = input.trim();
  if (!hex.startsWith('#')) hex = '#' + hex;
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    const h = hex.slice(1);
    return '#' + h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return hex.toLowerCase();
  }
  return null;
}
