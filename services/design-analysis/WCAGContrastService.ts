// =============================================================================
// WCAGContrastService — WCAG 2.1 Contrast Ratio Service
// =============================================================================
// Implements proper contrast ratio calculations per WCAG 2.1 spec.
// Provides auto-fix capabilities that preserve hue while adjusting lightness.

export interface WCAGContrastIssue {
  elementId: string;
  elementLabel: string;
  foreground: string;     // hex color
  background: string;     // hex color
  ratio: number;          // actual contrast ratio
  requiredRatio: number;  // required for AA or AAA
  isLargeText: boolean;
  level: 'AA' | 'AAA';
  suggestedFix: string;   // adjusted foreground hex
  originalForeground: string; // for undo
}

export interface WCAGAuditResult {
  issues: WCAGContrastIssue[];
  passCount: number;
  failCount: number;
  score: number;          // 0-100 percentage passing
}

// =============================================================================
// Color Conversion Helpers
// =============================================================================

/** Basic named CSS colors for parsing */
const NAMED_COLORS: Record<string, string> = {
  black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000',
  blue: '#0000ff', yellow: '#ffff00', cyan: '#00ffff', magenta: '#ff00ff',
  gray: '#808080', grey: '#808080', silver: '#c0c0c0', maroon: '#800000',
  olive: '#808000', lime: '#00ff00', aqua: '#00ffff', teal: '#008080',
  navy: '#000080', fuchsia: '#ff00ff', purple: '#800080', orange: '#ffa500',
  transparent: '',
};

/**
 * Parse any CSS color string (rgb(), rgba(), hex, named) to #rrggbb hex format.
 * Returns null if the color cannot be parsed or is transparent.
 */
export function parseColorToHex(color: string): string | null {
  if (!color) return null;
  const trimmed = color.trim().toLowerCase();

  if (trimmed === 'transparent' || trimmed === 'initial' || trimmed === 'inherit') {
    return null;
  }

  // Named colors
  if (NAMED_COLORS[trimmed] !== undefined) {
    return NAMED_COLORS[trimmed] || null;
  }

  // Hex formats: #rgb, #rrggbb, #rgba, #rrggbbaa
  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1);
    if (hex.length === 3) {
      return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
    }
    if (hex.length === 4) {
      // #rgba — ignore alpha
      return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
    }
    if (hex.length === 6) {
      return `#${hex}`;
    }
    if (hex.length === 8) {
      // #rrggbbaa — ignore alpha
      return `#${hex.slice(0, 6)}`;
    }
    return null;
  }

  // rgb(r, g, b) or rgb(r g b)
  const rgbMatch = trimmed.match(/^rgb\(\s*(\d+)\s*[,\s]\s*(\d+)\s*[,\s]\s*(\d+)\s*\)/);
  if (rgbMatch) {
    const r = Math.min(255, parseInt(rgbMatch[1]));
    const g = Math.min(255, parseInt(rgbMatch[2]));
    const b = Math.min(255, parseInt(rgbMatch[3]));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  // rgba(r, g, b, a) — check alpha, if 0 return null (transparent)
  const rgbaMatch = trimmed.match(/^rgba\(\s*(\d+)\s*[,\s]\s*(\d+)\s*[,\s]\s*(\d+)\s*[,/\s]\s*([\d.]+)\s*\)/);
  if (rgbaMatch) {
    const a = parseFloat(rgbaMatch[4]);
    if (a === 0) return null; // fully transparent
    const r = Math.min(255, parseInt(rgbaMatch[1]));
    const g = Math.min(255, parseInt(rgbaMatch[2]));
    const b = Math.min(255, parseInt(rgbaMatch[3]));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  // Bare "r, g, b" format (used by existing parseRgb in StyleGuideGenerator)
  const bareMatch = trimmed.match(/^(\d+)\s*,\s*(\d+)\s*,\s*(\d+)$/);
  if (bareMatch) {
    const r = Math.min(255, parseInt(bareMatch[1]));
    const g = Math.min(255, parseInt(bareMatch[2]));
    const b = Math.min(255, parseInt(bareMatch[3]));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  return null;
}

/** Convert hex color to RGB tuple [0-255] */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.startsWith('#') ? hex.slice(1) : hex;
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** Convert RGB [0-255] to hex */
function rgbToHex(r: number, g: number, b: number): string {
  return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
}

/** Convert RGB [0-255] to HSL [h:0-360, s:0-1, l:0-1] */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return [h * 360, s, l];
}

/** Convert HSL [h:0-360, s:0-1, l:0-1] to RGB [0-255] */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// =============================================================================
// WCAG 2.1 Calculations
// =============================================================================

/**
 * Calculate relative luminance per WCAG 2.1 definition.
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 *
 * @param hex - Color in #rrggbb format
 * @returns Relative luminance value between 0 (black) and 1 (white)
 */
export function getRelativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);

  // Convert to sRGB 0-1 range, then linearize
  const linearize = (c: number): number => {
    const srgb = c / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  };

  const rLin = linearize(r);
  const gLin = linearize(g);
  const bLin = linearize(b);

  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

/**
 * Calculate contrast ratio between two colors.
 * Returns ratio in range 1:1 to 21:1
 *
 * @param fg - Foreground color in #rrggbb format
 * @param bg - Background color in #rrggbb format
 * @returns Contrast ratio (always >= 1)
 */
export function getContrastRatio(fg: string, bg: string): number {
  const lumFg = getRelativeLuminance(fg);
  const lumBg = getRelativeLuminance(bg);
  const lighter = Math.max(lumFg, lumBg);
  const darker = Math.min(lumFg, lumBg);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG AA.
 * Normal text: 4.5:1, Large text (>=18pt or bold >=14pt): 3:1
 */
export function meetsWCAGAA(ratio: number, isLargeTextFlag: boolean): boolean {
  return isLargeTextFlag ? ratio >= 3.0 : ratio >= 4.5;
}

/**
 * Check if contrast ratio meets WCAG AAA.
 * Normal text: 7:1, Large text: 4.5:1
 */
export function meetsWCAGAAA(ratio: number, isLargeTextFlag: boolean): boolean {
  return isLargeTextFlag ? ratio >= 4.5 : ratio >= 7.0;
}

/**
 * Determine if text is "large" per WCAG definition.
 * Large text: >= 18pt (24px) or bold >= 14pt (18.66px)
 */
export function isLargeText(fontSize: string, fontWeight: string): boolean {
  // Parse fontSize to pixels
  let sizeInPx = 16; // default browser font size
  if (fontSize) {
    const pxMatch = fontSize.match(/([\d.]+)\s*px/i);
    const ptMatch = fontSize.match(/([\d.]+)\s*pt/i);
    const remMatch = fontSize.match(/([\d.]+)\s*rem/i);
    const emMatch = fontSize.match(/([\d.]+)\s*em/i);
    if (pxMatch) sizeInPx = parseFloat(pxMatch[1]);
    else if (ptMatch) sizeInPx = parseFloat(ptMatch[1]) * (4 / 3); // 1pt = 1.333px
    else if (remMatch) sizeInPx = parseFloat(remMatch[1]) * 16;
    else if (emMatch) sizeInPx = parseFloat(emMatch[1]) * 16;
  }

  // Determine if bold: weight >= 700 or "bold"/"bolder"
  let isBold = false;
  if (fontWeight) {
    const w = fontWeight.trim().toLowerCase();
    if (w === 'bold' || w === 'bolder') {
      isBold = true;
    } else {
      const numWeight = parseInt(w);
      if (!isNaN(numWeight) && numWeight >= 700) {
        isBold = true;
      }
    }
  }

  // Large text: >= 24px (18pt), or bold and >= 14pt (18.66px)
  // Using 18.66 to handle floating-point precision from pt-to-px conversion (14pt * 4/3 = 18.666...)
  if (sizeInPx >= 24) return true;
  if (isBold && sizeInPx >= 18.66) return true;
  return false;
}

/**
 * Find the nearest color that passes the target contrast level.
 * Adjusts lightness while preserving hue and saturation.
 *
 * @param fg - Foreground color in #rrggbb format
 * @param bg - Background color in #rrggbb format
 * @param target - WCAG level to target ('AA' or 'AAA')
 * @param isLargeTextFlag - Whether the text is large per WCAG
 * @returns Adjusted foreground color in #rrggbb format
 */
export function findNearestPassingColor(
  fg: string,
  bg: string,
  target: 'AA' | 'AAA',
  isLargeTextFlag: boolean = false
): string {
  const requiredRatio = target === 'AAA'
    ? (isLargeTextFlag ? 4.5 : 7.0)
    : (isLargeTextFlag ? 3.0 : 4.5);

  // If already passes, return as-is
  const currentRatio = getContrastRatio(fg, bg);
  if (currentRatio >= requiredRatio) return fg;

  const [fgR, fgG, fgB] = hexToRgb(fg);
  const [h, s] = rgbToHsl(fgR, fgG, fgB);
  const bgLuminance = getRelativeLuminance(bg);

  // Determine direction: if background is dark, we need lighter text (increase L);
  // if background is light, we need darker text (decrease L).
  const shouldLighten = bgLuminance < 0.5;

  // Binary search on lightness
  let lo: number, hi: number;
  if (shouldLighten) {
    lo = rgbToHsl(fgR, fgG, fgB)[2]; // current lightness
    hi = 1.0;
  } else {
    lo = 0.0;
    hi = rgbToHsl(fgR, fgG, fgB)[2]; // current lightness
  }

  let bestHex = fg;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const [r, g, b] = hslToRgb(h, s, mid);
    const candidateHex = rgbToHex(r, g, b);
    const ratio = getContrastRatio(candidateHex, bg);

    if (ratio >= requiredRatio) {
      bestHex = candidateHex;
      // Try to get closer to the original (minimize change)
      if (shouldLighten) {
        hi = mid;
      } else {
        lo = mid;
      }
    } else {
      if (shouldLighten) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
  }

  // If binary search didn't find a passing color (e.g., saturation too high),
  // fall back to pure black or white
  const bestRatio = getContrastRatio(bestHex, bg);
  if (bestRatio < requiredRatio) {
    const blackRatio = getContrastRatio('#000000', bg);
    const whiteRatio = getContrastRatio('#ffffff', bg);
    return blackRatio >= requiredRatio ? '#000000' : '#ffffff';
  }

  return bestHex;
}

// =============================================================================
// Audit Functions
// =============================================================================

/**
 * Audit all style guide elements for WCAG contrast compliance.
 */
export function auditStyleGuideContrast(
  elements: Array<{
    id: string;
    label: string;
    computedCss: Record<string, string>;
    ancestorBackground?: { backgroundColor: string; backgroundImage: string };
  }>
): WCAGAuditResult {
  const issues: WCAGContrastIssue[] = [];
  let passCount = 0;
  let totalChecked = 0;

  for (const el of elements) {
    const fgRaw = el.computedCss.color;
    const bgRaw = el.computedCss.backgroundColor || el.ancestorBackground?.backgroundColor;

    if (!fgRaw || !bgRaw) continue;

    const fgHex = parseColorToHex(fgRaw);
    const bgHex = parseColorToHex(bgRaw);

    if (!fgHex || !bgHex) continue;

    totalChecked++;

    const largeText = isLargeText(
      el.computedCss.fontSize || '',
      el.computedCss.fontWeight || ''
    );

    const ratio = getContrastRatio(fgHex, bgHex);

    const passesAA = meetsWCAGAA(ratio, largeText);
    const passesAAA = meetsWCAGAAA(ratio, largeText);

    if (passesAA && passesAAA) {
      passCount++;
      continue;
    }

    if (passesAA) {
      // Passes AA but fails AAA — report as AAA issue
      passCount++; // Still counts as pass for AA
      const requiredRatio = largeText ? 4.5 : 7.0;
      const suggestedFix = findNearestPassingColor(fgHex, bgHex, 'AAA', largeText);
      issues.push({
        elementId: el.id,
        elementLabel: el.label,
        foreground: fgHex,
        background: bgHex,
        ratio: Math.round(ratio * 100) / 100,
        requiredRatio,
        isLargeText: largeText,
        level: 'AAA',
        suggestedFix,
        originalForeground: fgHex,
      });
    } else {
      // Fails AA (and therefore AAA)
      const requiredRatio = largeText ? 3.0 : 4.5;
      const suggestedFix = findNearestPassingColor(fgHex, bgHex, 'AA', largeText);
      issues.push({
        elementId: el.id,
        elementLabel: el.label,
        foreground: fgHex,
        background: bgHex,
        ratio: Math.round(ratio * 100) / 100,
        requiredRatio,
        isLargeText: largeText,
        level: 'AA',
        suggestedFix,
        originalForeground: fgHex,
      });
    }
  }

  const total = totalChecked;
  const failCount = issues.filter(i => i.level === 'AA').length;
  const score = total > 0 ? Math.round(((total - failCount) / total) * 100) : 100;

  return {
    issues,
    passCount,
    failCount,
    score,
  };
}

/**
 * Auto-fix all contrast issues. Returns fixed elements with undo data.
 */
export function autoFixContrastIssues(
  issues: WCAGContrastIssue[]
): Array<{
  elementId: string;
  original: string;
  fixed: string;
  newRatio: number;
}> {
  return issues.map(issue => {
    const newRatio = getContrastRatio(issue.suggestedFix, issue.background);
    return {
      elementId: issue.elementId,
      original: issue.originalForeground,
      fixed: issue.suggestedFix,
      newRatio: Math.round(newRatio * 100) / 100,
    };
  });
}
