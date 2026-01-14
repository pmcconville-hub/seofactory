// utils/sentenceTokenizer.ts

/**
 * Robust sentence tokenizer that handles common abbreviations, decimal numbers,
 * and initials without incorrectly splitting on their periods.
 *
 * This utility is designed to fix the naive `.split(/[.!?]+/)` approach used
 * in content validators, which breaks on abbreviations like "Dr. Smith" or
 * "The U.S. economy".
 */

/**
 * Abbreviations that typically appear BEFORE a name or noun (never end a sentence).
 * When these appear followed by period + space + capital, it's NOT a sentence boundary.
 */
const PREFIX_ABBREVIATIONS = [
  // Honorifics and titles that precede names
  'Dr', 'Mr', 'Mrs', 'Ms', 'Prof', 'Rev', 'Gen', 'Col', 'Lt', 'Capt',
  // Latin abbreviations that typically continue
  'vs',
];

// Unique placeholder characters
const PLACEHOLDER = '\u0000';
const SENTENCE_BOUNDARY = '\u0001';

/**
 * Splits text into individual sentences while preserving abbreviations,
 * decimal numbers, and initials.
 *
 * @param content - The text content to split into sentences
 * @returns An array of sentences, trimmed of leading/trailing whitespace
 *
 * @example
 * ```ts
 * splitSentences('Dr. Smith is here. He is nice.')
 * // Returns: ['Dr. Smith is here.', 'He is nice.']
 *
 * splitSentences('The value is 3.14. That is pi.')
 * // Returns: ['The value is 3.14.', 'That is pi.']
 * ```
 */
export function splitSentences(content: string): string[] {
  if (!content || !content.trim()) {
    return [];
  }

  let processed = content;
  const replacements: Array<{ placeholder: string; original: string }> = [];
  let placeholderIndex = 0;

  // Helper to create and track a placeholder
  const createPlaceholder = (original: string): string => {
    const ph = `${PLACEHOLDER}${placeholderIndex}${PLACEHOLDER}`;
    placeholderIndex++;
    replacements.push({ placeholder: ph, original });
    return ph;
  };

  // Step 1: Protect multi-period abbreviations when they DON'T end a sentence
  // e.g., i.e., U.S., U.K., Ph.D., M.D. followed by lowercase letter
  // Note: Use 'g' flag only (not 'gi') to keep lookahead case-sensitive
  const multiPeriodAbbrs = [
    { pattern: 'e\\.g', caseSensitive: false },
    { pattern: 'i\\.e', caseSensitive: false },
    { pattern: 'U\\.S', caseSensitive: true },
    { pattern: 'U\\.K', caseSensitive: true },
    { pattern: 'Ph\\.D', caseSensitive: true },
    { pattern: 'M\\.D', caseSensitive: true },
    { pattern: 'B\\.A', caseSensitive: true },
    { pattern: 'B\\.S', caseSensitive: true },
    { pattern: 'M\\.A', caseSensitive: true },
    { pattern: 'M\\.S', caseSensitive: true },
    { pattern: 'a\\.m', caseSensitive: false },
    { pattern: 'p\\.m', caseSensitive: false },
  ];
  for (const { pattern: abbr, caseSensitive } of multiPeriodAbbrs) {
    // Protect only when followed by space + lowercase (continuation in same sentence)
    // For case-insensitive abbrs, we match both cases but still require lowercase after
    if (caseSensitive) {
      const regex = new RegExp(`\\b${abbr}\\.\\s+(?=[a-z])`, 'g');
      processed = processed.replace(regex, (match) => createPlaceholder(match));
    } else {
      // Match both e.g./E.G., i.e./I.E., a.m./A.M., p.m./P.M.
      const regexLower = new RegExp(`\\b${abbr.toLowerCase()}\\.\\s+(?=[a-z])`, 'g');
      const regexUpper = new RegExp(`\\b${abbr.toUpperCase()}\\.\\s+(?=[a-z])`, 'g');
      processed = processed.replace(regexLower, (match) => createPlaceholder(match));
      processed = processed.replace(regexUpper, (match) => createPlaceholder(match));
    }
  }

  // Step 2: Protect initials (e.g., J.K. Rowling, J.R.R. Tolkien)
  // Match sequences of capital letter + period followed by name
  processed = processed.replace(/\b([A-Z]\.\s*)+(?=[A-Z][a-z])/g, (match) => createPlaceholder(match));

  // Step 3: Protect decimal numbers
  processed = processed.replace(/\d+\.\d+/g, (match) => createPlaceholder(match));

  // Step 4: Protect "et al." when followed by lowercase (continuation)
  // Note: Use 'g' flag only (not 'gi') to keep lookahead case-sensitive
  processed = processed.replace(/\bet\s+al\.\s+(?=[a-z])/g, (match) => createPlaceholder(match));
  processed = processed.replace(/\bEt\s+al\.\s+(?=[a-z])/g, (match) => createPlaceholder(match));
  processed = processed.replace(/\bET\s+AL\.\s+(?=[a-z])/g, (match) => createPlaceholder(match));

  // Step 5: Protect PREFIX abbreviations followed by capital letter (NOT sentence boundary)
  // E.g., "Dr. Smith" - the capital S is a name, not a new sentence
  for (const abbr of PREFIX_ABBREVIATIONS) {
    // Match abbreviation + period + space(s) + any letter (continuation)
    const pattern = new RegExp(`\\b${abbr}\\.\\s+(?=[A-Za-z])`, 'gi');
    processed = processed.replace(pattern, (match) => createPlaceholder(match));
  }

  // Step 6: Protect corporate suffixes ONLY when followed by lowercase
  // Inc., Ltd., Corp., etc. CAN end sentences when followed by capital
  // Note: We use 'g' flag only (not 'gi') because the lookahead (?=[a-z])
  // needs to be case-sensitive to distinguish sentence boundaries
  const corporateSuffixes = ['Inc', 'Ltd', 'Corp', 'Co', 'LLC', 'Jr', 'Sr', 'etc', 'al'];
  for (const suffix of corporateSuffixes) {
    // Match both cases of the suffix (Inc/inc, Ltd/ltd, etc.) but require lowercase after
    const patternLower = new RegExp(`\\b${suffix.toLowerCase()}\\.\\s+(?=[a-z])`, 'g');
    const patternUpper = new RegExp(`\\b${suffix}\\.\\s+(?=[a-z])`, 'g');
    processed = processed.replace(patternLower, (match) => createPlaceholder(match));
    processed = processed.replace(patternUpper, (match) => createPlaceholder(match));
  }

  // Step 7: Handle ellipsis as sentence terminator when followed by space and capital
  processed = processed.replace(/\.{3,}\s+(?=[A-Z])/g, '...' + SENTENCE_BOUNDARY);

  // Step 8: Mark sentence boundaries (punctuation + whitespace + capital letter)
  // This is the main splitting logic
  processed = processed.replace(/([.!?])(\s+)(?=[A-Z])/g, '$1' + SENTENCE_BOUNDARY);

  // Step 9: Split on the boundary marker
  const rawSentences = processed.split(SENTENCE_BOUNDARY);

  // Step 10: Restore all placeholders and clean up
  const result = rawSentences
    .map(sentence => {
      let restored = sentence;

      // Restore all placeholders
      for (const { placeholder, original } of replacements) {
        restored = restored.split(placeholder).join(original);
      }

      return restored.trim();
    })
    .filter(s => s.length > 0);

  return result;
}
