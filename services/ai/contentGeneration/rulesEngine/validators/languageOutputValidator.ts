// services/ai/contentGeneration/rulesEngine/validators/languageOutputValidator.ts
// S1 Rule: Language Output Validation
// Ensures generated content is in the expected language using frequency-based detection

import { ValidationViolation, SectionGenerationContext } from '../../../../../types';
import { getLanguageName } from '../../../../../utils/languageUtils';

export interface LanguageDetectionResult {
  isValid: boolean;
  detectedLanguage: string;
  confidence: number;
  expectedLanguage: string;
}

/**
 * Common words by language for detection (top 20 most frequent function words)
 * These are stop words / function words that appear frequently in each language
 */
const LANGUAGE_MARKERS: Record<string, string[]> = {
  'English': [
    'the', 'is', 'are', 'was', 'were', 'have', 'has', 'been', 'will', 'would',
    'could', 'should', 'with', 'that', 'this', 'from', 'they', 'which', 'their', 'what'
  ],
  'Dutch': [
    'de', 'het', 'een', 'van', 'en', 'in', 'is', 'op', 'te', 'dat',
    'die', 'voor', 'zijn', 'met', 'als', 'aan', 'er', 'maar', 'om', 'ook'
  ],
  'German': [
    'der', 'die', 'das', 'und', 'ist', 'von', 'zu', 'den', 'mit', 'sich',
    'des', 'auf', 'für', 'nicht', 'eine', 'als', 'auch', 'es', 'an', 'werden'
  ],
  'French': [
    'le', 'la', 'les', 'de', 'et', 'est', 'un', 'une', 'du', 'en',
    'que', 'qui', 'dans', 'pour', 'ce', 'pas', 'sur', 'sont', 'avec', 'plus'
  ],
  'Spanish': [
    'el', 'la', 'de', 'que', 'y', 'en', 'un', 'es', 'se', 'los',
    'del', 'las', 'por', 'con', 'una', 'para', 'al', 'no', 'son', 'su'
  ],
  'Italian': [
    'il', 'la', 'di', 'che', 'e', 'in', 'un', 'del', 'per', 'non',
    'sono', 'una', 'da', 'con', 'si', 'come', 'al', 'dei', 'più', 'della'
  ],
  'Portuguese': [
    'o', 'a', 'de', 'que', 'e', 'do', 'da', 'em', 'um', 'para',
    'com', 'não', 'uma', 'os', 'no', 'se', 'na', 'por', 'mais', 'as'
  ],
};

/**
 * Unique character patterns for languages (diacritics, special characters)
 * These provide additional signals for language detection
 */
const LANGUAGE_PATTERNS: Record<string, RegExp> = {
  'Dutch': /(ij|oe|ui|eu|aa|ee|oo|uu)/gi,
  'German': /[äöüßÄÖÜ]/g,
  'French': /[àâçéèêëîïôùûüÿœæ]/gi,
  'Spanish': /[áéíóúñ¿¡]/gi,
  'Italian': /[àèéìíîòóùú]/gi,
  'Portuguese': /[ãõáâéêíóôú]/gi,
};

/**
 * Minimum word count required for reliable language detection
 */
const MIN_WORDS_FOR_DETECTION = 10;

/**
 * Minimum confidence required to report a language mismatch violation
 */
const MIN_CONFIDENCE_FOR_VIOLATION = 0.6;

/**
 * LanguageOutputValidator - Validates that generated content is in the expected language (Rule S1)
 *
 * Uses a frequency-based approach to detect language:
 * 1. Counts occurrences of common function words (stop words) per language
 * 2. Boosts scores for language-specific character patterns (diacritics)
 * 3. Returns the highest-scoring language as the detected language
 */
export class LanguageOutputValidator {
  /**
   * Validate that content is in the expected language
   * @param content - The text content to analyze
   * @param expectedLanguage - Expected language (ISO code or full name)
   * @returns Detection result with validity, detected language, and confidence
   */
  static validate(content: string, expectedLanguage: string): LanguageDetectionResult {
    // Normalize expected language to full name using languageUtils
    const normalizedExpected = getLanguageName(expectedLanguage);

    // Tokenize content into words (lowercase, min length 2)
    const words = content.toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 1);

    // If content is too short, we can't reliably detect language
    if (words.length < MIN_WORDS_FOR_DETECTION) {
      return {
        isValid: true,
        detectedLanguage: normalizedExpected,
        confidence: 0.5,
        expectedLanguage: normalizedExpected,
      };
    }

    // Score each language based on word frequency
    const scores: Record<string, number> = {};

    for (const [lang, markers] of Object.entries(LANGUAGE_MARKERS)) {
      const markerSet = new Set(markers);
      const matchCount = words.filter(w => markerSet.has(w)).length;
      scores[lang] = matchCount / words.length;

      // Boost score if language-specific characters are found
      const pattern = LANGUAGE_PATTERNS[lang];
      if (pattern) {
        const patternMatches = (content.match(pattern) || []).length;
        // Weight diacritics as 10% of score boost relative to content length
        scores[lang] += (patternMatches / content.length) * 10;
      }
    }

    // Find highest scoring language
    let detectedLanguage = 'English';
    let highestScore = 0;

    for (const [lang, score] of Object.entries(scores)) {
      if (score > highestScore) {
        highestScore = score;
        detectedLanguage = lang;
      }
    }

    // Normalize confidence to 0-1 range
    const confidence = Math.min(highestScore * 5, 1);

    return {
      isValid: detectedLanguage === normalizedExpected,
      detectedLanguage,
      confidence,
      expectedLanguage: normalizedExpected,
    };
  }

  /**
   * Validate with violations for integration with RulesValidator
   * @param content - The text content to analyze
   * @param context - Section generation context containing language setting
   * @returns Array of validation violations (empty if valid)
   */
  static validateWithViolations(
    content: string,
    context: SectionGenerationContext
  ): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    // Default to English if no language specified
    const expectedLanguage = context.language || 'English';

    const result = this.validate(content, expectedLanguage);

    // Only report violations with sufficient confidence
    if (!result.isValid && result.confidence > MIN_CONFIDENCE_FOR_VIOLATION) {
      violations.push({
        rule: 'S1_LANGUAGE_OUTPUT',
        text: `Content appears to be in ${result.detectedLanguage} but should be ${result.expectedLanguage}`,
        position: 0,
        suggestion: `Rewrite content in ${result.expectedLanguage}. Current content detected as ${result.detectedLanguage} with ${Math.round(result.confidence * 100)}% confidence.`,
        severity: 'error',
      });
    }

    return violations;
  }
}
