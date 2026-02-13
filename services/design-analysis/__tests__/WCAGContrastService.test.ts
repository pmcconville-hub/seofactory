import { describe, it, expect } from 'vitest';
import {
  getRelativeLuminance,
  getContrastRatio,
  meetsWCAGAA,
  meetsWCAGAAA,
  findNearestPassingColor,
  parseColorToHex,
  isLargeText,
  auditStyleGuideContrast,
  autoFixContrastIssues,
} from '../WCAGContrastService';

// =============================================================================
// getRelativeLuminance
// =============================================================================

describe('getRelativeLuminance', () => {
  it('should return 0 for black', () => {
    expect(getRelativeLuminance('#000000')).toBeCloseTo(0, 4);
  });

  it('should return 1 for white', () => {
    expect(getRelativeLuminance('#ffffff')).toBeCloseTo(1, 4);
  });

  it('should return ~0.2126 for pure red', () => {
    expect(getRelativeLuminance('#ff0000')).toBeCloseTo(0.2126, 3);
  });

  it('should return ~0.7152 for pure green', () => {
    expect(getRelativeLuminance('#00ff00')).toBeCloseTo(0.7152, 3);
  });

  it('should return ~0.0722 for pure blue', () => {
    expect(getRelativeLuminance('#0000ff')).toBeCloseTo(0.0722, 3);
  });

  it('should handle mid-gray', () => {
    const lum = getRelativeLuminance('#808080');
    expect(lum).toBeGreaterThan(0.2);
    expect(lum).toBeLessThan(0.3);
  });
});

// =============================================================================
// getContrastRatio
// =============================================================================

describe('getContrastRatio', () => {
  it('should return 21:1 for black on white', () => {
    const ratio = getContrastRatio('#000000', '#ffffff');
    expect(ratio).toBeCloseTo(21, 0);
  });

  it('should return 21:1 for white on black (order independent for lighter/darker)', () => {
    const ratio = getContrastRatio('#ffffff', '#000000');
    expect(ratio).toBeCloseTo(21, 0);
  });

  it('should return 1:1 for same color', () => {
    expect(getContrastRatio('#336699', '#336699')).toBeCloseTo(1, 4);
  });

  it('should return 1:1 for black on black', () => {
    expect(getContrastRatio('#000000', '#000000')).toBeCloseTo(1, 4);
  });

  it('should return 1:1 for white on white', () => {
    expect(getContrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 4);
  });

  it('should compute known ratio for gray on white', () => {
    // #767676 on white is the classic minimum AA boundary (~4.54:1)
    const ratio = getContrastRatio('#767676', '#ffffff');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
    expect(ratio).toBeLessThan(5.0);
  });
});

// =============================================================================
// meetsWCAGAA
// =============================================================================

describe('meetsWCAGAA', () => {
  it('should pass for ratio >= 4.5 on normal text', () => {
    expect(meetsWCAGAA(4.5, false)).toBe(true);
    expect(meetsWCAGAA(5.0, false)).toBe(true);
  });

  it('should fail for ratio < 4.5 on normal text', () => {
    expect(meetsWCAGAA(4.4, false)).toBe(false);
    expect(meetsWCAGAA(3.0, false)).toBe(false);
  });

  it('should pass for ratio >= 3.0 on large text', () => {
    expect(meetsWCAGAA(3.0, true)).toBe(true);
    expect(meetsWCAGAA(4.0, true)).toBe(true);
  });

  it('should fail for ratio < 3.0 on large text', () => {
    expect(meetsWCAGAA(2.9, true)).toBe(false);
  });
});

// =============================================================================
// meetsWCAGAAA
// =============================================================================

describe('meetsWCAGAAA', () => {
  it('should pass for ratio >= 7.0 on normal text', () => {
    expect(meetsWCAGAAA(7.0, false)).toBe(true);
    expect(meetsWCAGAAA(10.0, false)).toBe(true);
  });

  it('should fail for ratio < 7.0 on normal text', () => {
    expect(meetsWCAGAAA(6.9, false)).toBe(false);
    expect(meetsWCAGAAA(4.5, false)).toBe(false);
  });

  it('should pass for ratio >= 4.5 on large text', () => {
    expect(meetsWCAGAAA(4.5, true)).toBe(true);
    expect(meetsWCAGAAA(7.0, true)).toBe(true);
  });

  it('should fail for ratio < 4.5 on large text', () => {
    expect(meetsWCAGAAA(4.4, true)).toBe(false);
  });
});

// =============================================================================
// parseColorToHex
// =============================================================================

describe('parseColorToHex', () => {
  it('should parse #rrggbb format', () => {
    expect(parseColorToHex('#ff0000')).toBe('#ff0000');
    expect(parseColorToHex('#AABBCC')).toBe('#aabbcc');
  });

  it('should parse #rgb shorthand', () => {
    expect(parseColorToHex('#f00')).toBe('#ff0000');
    expect(parseColorToHex('#abc')).toBe('#aabbcc');
  });

  it('should parse rgb() format', () => {
    expect(parseColorToHex('rgb(255, 0, 0)')).toBe('#ff0000');
    expect(parseColorToHex('rgb(0, 128, 255)')).toBe('#0080ff');
  });

  it('should parse rgba() format', () => {
    expect(parseColorToHex('rgba(255, 0, 0, 1)')).toBe('#ff0000');
    expect(parseColorToHex('rgba(0, 128, 255, 0.5)')).toBe('#0080ff');
  });

  it('should return null for rgba with alpha=0 (transparent)', () => {
    expect(parseColorToHex('rgba(255, 0, 0, 0)')).toBe(null);
  });

  it('should parse named colors', () => {
    expect(parseColorToHex('black')).toBe('#000000');
    expect(parseColorToHex('white')).toBe('#ffffff');
    expect(parseColorToHex('red')).toBe('#ff0000');
  });

  it('should return null for transparent', () => {
    expect(parseColorToHex('transparent')).toBe(null);
  });

  it('should return null for empty/invalid input', () => {
    expect(parseColorToHex('')).toBe(null);
    expect(parseColorToHex('not-a-color')).toBe(null);
  });

  it('should handle bare "r, g, b" format', () => {
    expect(parseColorToHex('255, 0, 0')).toBe('#ff0000');
    expect(parseColorToHex('0, 0, 0')).toBe('#000000');
  });

  it('should handle #rrggbbaa format (ignoring alpha)', () => {
    expect(parseColorToHex('#ff0000ff')).toBe('#ff0000');
    expect(parseColorToHex('#00ff0080')).toBe('#00ff00');
  });
});

// =============================================================================
// isLargeText
// =============================================================================

describe('isLargeText', () => {
  it('should return true for >= 24px text', () => {
    expect(isLargeText('24px', '400')).toBe(true);
    expect(isLargeText('32px', '400')).toBe(true);
  });

  it('should return false for < 24px normal weight', () => {
    expect(isLargeText('16px', '400')).toBe(false);
    expect(isLargeText('23px', '400')).toBe(false);
  });

  it('should return true for bold >= 18.66px (14pt)', () => {
    expect(isLargeText('19px', '700')).toBe(true);
    expect(isLargeText('18.66px', 'bold')).toBe(true);
    expect(isLargeText('18.67px', 'bold')).toBe(true);
  });

  it('should return false for bold < 18.66px', () => {
    expect(isLargeText('18px', '700')).toBe(false);
    expect(isLargeText('16px', 'bold')).toBe(false);
  });

  it('should handle pt units (18pt = 24px)', () => {
    expect(isLargeText('18pt', '400')).toBe(true);
    expect(isLargeText('14pt', '700')).toBe(true);
  });

  it('should handle rem units (1.5rem = 24px)', () => {
    expect(isLargeText('1.5rem', '400')).toBe(true);
    expect(isLargeText('1rem', '400')).toBe(false);
  });

  it('should handle missing values with defaults', () => {
    expect(isLargeText('', '')).toBe(false); // default 16px normal
  });
});

// =============================================================================
// findNearestPassingColor
// =============================================================================

describe('findNearestPassingColor', () => {
  it('should return original color if already passes', () => {
    const result = findNearestPassingColor('#000000', '#ffffff', 'AA');
    expect(result).toBe('#000000');
  });

  it('should find a darker color when fg is too light on white bg', () => {
    // Light gray on white fails AA
    const result = findNearestPassingColor('#cccccc', '#ffffff', 'AA');
    const ratio = getContrastRatio(result, '#ffffff');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('should find a lighter color when fg is too dark on dark bg', () => {
    // Dark gray on black fails AA
    const result = findNearestPassingColor('#333333', '#000000', 'AA');
    const ratio = getContrastRatio(result, '#000000');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('should meet AAA requirement when target is AAA', () => {
    const result = findNearestPassingColor('#999999', '#ffffff', 'AAA');
    const ratio = getContrastRatio(result, '#ffffff');
    expect(ratio).toBeGreaterThanOrEqual(7.0);
  });

  it('should use large text thresholds when specified', () => {
    // For large text, AA only needs 3:1
    const result = findNearestPassingColor('#aaaaaa', '#ffffff', 'AA', true);
    const ratio = getContrastRatio(result, '#ffffff');
    expect(ratio).toBeGreaterThanOrEqual(3.0);
  });

  it('should preserve hue when adjusting', () => {
    // Red on white — adjusted should still be reddish
    const result = findNearestPassingColor('#ff9999', '#ffffff', 'AA');
    // Verify it passes
    const ratio = getContrastRatio(result, '#ffffff');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
    // Verify it's not pure black/white (hue preserved)
    expect(result).not.toBe('#000000');
    expect(result).not.toBe('#ffffff');
  });
});

// =============================================================================
// auditStyleGuideContrast
// =============================================================================

describe('auditStyleGuideContrast', () => {
  it('should return no issues for high-contrast elements', () => {
    const elements = [
      {
        id: '1',
        label: 'Heading',
        computedCss: { color: '#000000', backgroundColor: '#ffffff', fontSize: '16px', fontWeight: '400' },
      },
    ];
    const result = auditStyleGuideContrast(elements);
    expect(result.issues).toHaveLength(0);
    expect(result.passCount).toBe(1);
    expect(result.score).toBe(100);
  });

  it('should flag low contrast elements as AA failures', () => {
    const elements = [
      {
        id: '1',
        label: 'Light Text',
        computedCss: { color: '#cccccc', backgroundColor: '#ffffff', fontSize: '16px', fontWeight: '400' },
      },
    ];
    const result = auditStyleGuideContrast(elements);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues[0].level).toBe('AA');
    expect(result.failCount).toBeGreaterThan(0);
  });

  it('should skip elements without foreground color', () => {
    const elements = [
      {
        id: '1',
        label: 'No Color',
        computedCss: { backgroundColor: '#ffffff' },
      },
    ];
    const result = auditStyleGuideContrast(elements);
    expect(result.issues).toHaveLength(0);
  });

  it('should skip elements without background color', () => {
    const elements = [
      {
        id: '1',
        label: 'No Background',
        computedCss: { color: '#000000' },
      },
    ];
    const result = auditStyleGuideContrast(elements);
    expect(result.issues).toHaveLength(0);
  });

  it('should use ancestorBackground when backgroundColor is missing', () => {
    const elements = [
      {
        id: '1',
        label: 'Ancestor BG',
        computedCss: { color: '#cccccc', fontSize: '16px', fontWeight: '400' },
        ancestorBackground: { backgroundColor: '#ffffff', backgroundImage: '' },
      },
    ];
    const result = auditStyleGuideContrast(elements);
    // Light gray on white fails AA
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('should detect large text and use lower thresholds', () => {
    const elements = [
      {
        id: '1',
        label: 'Large Heading',
        computedCss: { color: '#767676', backgroundColor: '#ffffff', fontSize: '24px', fontWeight: '400' },
      },
    ];
    const result = auditStyleGuideContrast(elements);
    // #767676 on white is ~4.54:1 which passes AA for large text (3:1) and for normal text (4.5:1)
    // It should still be flagged for AAA at normal text level but passes AA
    const aaIssues = result.issues.filter(i => i.level === 'AA');
    expect(aaIssues).toHaveLength(0); // passes AA
  });

  it('should include suggested fix in issues', () => {
    const elements = [
      {
        id: '1',
        label: 'Low Contrast',
        computedCss: { color: '#dddddd', backgroundColor: '#ffffff', fontSize: '16px', fontWeight: '400' },
      },
    ];
    const result = auditStyleGuideContrast(elements);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues[0].suggestedFix).toBeDefined();
    expect(result.issues[0].suggestedFix).not.toBe(result.issues[0].foreground);
    // Verify the suggested fix actually passes
    const fixRatio = getContrastRatio(result.issues[0].suggestedFix, '#ffffff');
    expect(fixRatio).toBeGreaterThanOrEqual(result.issues[0].requiredRatio);
  });

  it('should compute score as percentage of AA-passing elements', () => {
    const elements = [
      {
        id: '1',
        label: 'Pass',
        computedCss: { color: '#000000', backgroundColor: '#ffffff', fontSize: '16px', fontWeight: '400' },
      },
      {
        id: '2',
        label: 'Fail',
        computedCss: { color: '#eeeeee', backgroundColor: '#ffffff', fontSize: '16px', fontWeight: '400' },
      },
    ];
    const result = auditStyleGuideContrast(elements);
    expect(result.score).toBe(50); // 1 out of 2 pass
  });
});

// =============================================================================
// autoFixContrastIssues
// =============================================================================

describe('autoFixContrastIssues', () => {
  it('should return fix data for each issue', () => {
    const issues = [
      {
        elementId: '1',
        elementLabel: 'Test',
        foreground: '#cccccc',
        background: '#ffffff',
        ratio: 1.6,
        requiredRatio: 4.5,
        isLargeText: false,
        level: 'AA' as const,
        suggestedFix: '#767676',
        originalForeground: '#cccccc',
      },
    ];
    const fixes = autoFixContrastIssues(issues);
    expect(fixes).toHaveLength(1);
    expect(fixes[0].elementId).toBe('1');
    expect(fixes[0].original).toBe('#cccccc');
    expect(fixes[0].fixed).toBe('#767676');
    expect(fixes[0].newRatio).toBeGreaterThan(1);
  });
});
