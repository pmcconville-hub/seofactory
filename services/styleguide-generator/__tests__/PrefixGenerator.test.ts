import { describe, it, expect } from 'vitest';
import { generatePrefix } from '../tokens/PrefixGenerator';

describe('generatePrefix', () => {
  it('extracts initials from multi-word brand names', () => {
    // B&M Dak-Totaal → b, m, dak, totaal → "bmdt" (4 initials, max 4)
    expect(generatePrefix('B&M Dak-Totaal')).toBe('bmdt');
  });

  it('extracts initials from a two-word name', () => {
    expect(generatePrefix('Green Paints')).toBe('gp');
  });

  it('extracts initials from a three-word name', () => {
    // ILG → "i", Food → "f", Group is stop word → "if"
    expect(generatePrefix('ILG Food Group')).toBe('if');
  });

  it('uses first 2-3 chars for single-word brands', () => {
    expect(generatePrefix('Resultaatmakers')).toBe('res');
  });

  it('uses 2 chars for short single-word brands', () => {
    expect(generatePrefix('Uber')).toBe('ube');
  });

  it('handles brands with ampersands', () => {
    expect(generatePrefix('Tom & Jerry')).toBe('tj');
  });

  it('returns "sg" for empty input', () => {
    expect(generatePrefix('')).toBe('sg');
  });

  it('returns "sg" for whitespace-only input', () => {
    expect(generatePrefix('   ')).toBe('sg');
  });

  it('strips special characters', () => {
    const prefix = generatePrefix('Café Del Mar');
    expect(prefix).toMatch(/^[a-z]{2,4}$/);
  });

  it('always returns 2-4 lowercase chars', () => {
    const names = [
      'B&M Dak-Totaal', 'Resultaatmakers', 'ILG Food Group',
      'A', 'Very Long Brand Name With Many Words',
      'ALLCAPS', '123 Numbers First',
    ];
    for (const name of names) {
      const prefix = generatePrefix(name);
      expect(prefix.length).toBeGreaterThanOrEqual(2);
      expect(prefix.length).toBeLessThanOrEqual(4);
      expect(prefix).toMatch(/^[a-z]+$/);
    }
  });

  it('skips common stop words', () => {
    // "The" and "of" are stop words
    const prefix = generatePrefix('The University of Amsterdam');
    expect(prefix).toBe('ua');
  });

  it('handles hyphenated words as separate', () => {
    const prefix = generatePrefix('Dak-Totaal');
    expect(prefix).toBe('dt');
  });

  it('handles names starting with numbers gracefully', () => {
    const prefix = generatePrefix('123 Brand');
    // Numbers get stripped, so it should fallback cleanly
    expect(prefix).toMatch(/^[a-z]{2,4}$/);
  });
});
