// services/styleguide-generator/tokens/PrefixGenerator.ts
// Derives a short CSS class prefix from the brand name.
// Examples: "B&M Dak-Totaal" → "bm", "Resultaatmakers" → "rm", "ILG Food Group" → "ilg"

// Common words to skip when building a prefix from brand name words
const STOP_WORDS = new Set([
  'the', 'de', 'het', 'van', 'en', 'and', 'of', 'für', 'die', 'das',
  'group', 'groep', 'company', 'co', 'inc', 'ltd', 'bv', 'nv',
]);

/**
 * Generate a 2-4 character lowercase CSS class prefix from a brand name.
 *
 * Strategy:
 * 1. Split brand name into "significant" words (strip stop words, punctuation)
 * 2. If multiple words: take first letter of each (up to 4)
 * 3. If single word: take first 2-3 letters
 * 4. If result is < 2 chars, pad from original name
 * 5. Ensure result is valid CSS identifier start (a-z)
 */
export function generatePrefix(brandName: string): string {
  if (!brandName || !brandName.trim()) return 'sg'; // fallback: "styleguide"

  // Clean: remove special chars but keep word boundaries
  const cleaned = brandName
    .replace(/[&+]/g, ' ')          // & and + become word separators
    .replace(/['']/g, '')           // apostrophes removed
    .replace(/[^a-zA-Z0-9\s-]/g, '') // strip remaining special chars
    .trim();

  if (!cleaned) return 'sg';

  // Split into words, filter stop words
  const words = cleaned
    .split(/[\s-]+/)
    .map(w => w.toLowerCase())
    .filter(w => w.length > 0 && !STOP_WORDS.has(w));

  if (words.length === 0) {
    // All words were stop words — use first 2 chars of original cleaned
    const fallback = cleaned.replace(/[\s-]/g, '').toLowerCase();
    return fallback.slice(0, 2) || 'sg';
  }

  let prefix: string;

  if (words.length === 1) {
    // Single word: take first 2-3 chars
    // If word is 4+ chars take 3; if 2-3 chars take 2
    const word = words[0];
    prefix = word.length >= 4 ? word.slice(0, 3) : word.slice(0, 2);
  } else {
    // Multiple words: first letter of each significant word (up to 4)
    prefix = words
      .slice(0, 4)
      .map(w => w[0])
      .join('');
  }

  // Ensure minimum 2 chars
  if (prefix.length < 2) {
    const fallback = cleaned.replace(/[\s-]/g, '').toLowerCase();
    prefix = fallback.slice(0, 2);
  }

  // Ensure starts with a letter (valid CSS identifier)
  if (!/^[a-z]/.test(prefix)) {
    prefix = 'x' + prefix.slice(0, 3);
  }

  // Ensure only lowercase a-z (no digits in prefix for cleaner CSS)
  prefix = prefix.replace(/[^a-z]/g, '');

  // Final bounds: 2-4 chars
  if (prefix.length < 2) return 'sg';
  return prefix.slice(0, 4);
}
