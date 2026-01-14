// services/ai/contentGeneration/rulesEngine/validators/contextualBridgeValidator.ts

import { ValidationViolation, SectionGenerationContext } from '../../../../../types';
import { getLanguageName } from '../../../../../utils/languageUtils';
import { splitSentences } from '../../../../../utils/sentenceTokenizer';

/**
 * Multilingual bridge/transition patterns
 * Supports: English, Dutch, German, French, Spanish
 */
const MULTILINGUAL_BRIDGE_PATTERNS: Record<string, RegExp[]> = {
  'English': [
    /^(to|for|in order to|when|while|if|beyond|related to|in addition)/i,
    /^(building on|extending|furthermore|additionally|moreover)/i,
    /(ensure|enjoy|benefit|understand|consider|explore)/i,
  ],

  'Dutch': [
    /^(om|voor|om te|wanneer|terwijl|als|voorbij|gerelateerd aan|daarnaast)/i,
    /^(voortbouwend op|uitbreidend|bovendien|verder|daarenboven)/i,
    /(zorgen|genieten|profiteren|begrijpen|overwegen|verkennen)/i,
  ],

  'German': [
    /^(um|für|um zu|wenn|während|falls|darüber hinaus|in Bezug auf|zusätzlich)/i,
    /^(aufbauend auf|erweiternd|außerdem|weiterhin|darüber hinaus)/i,
    /(sicherstellen|genießen|profitieren|verstehen|berücksichtigen|erkunden)/i,
  ],

  'French': [
    /^(pour|afin de|quand|pendant que|si|au-delà|lié à|en plus)/i,
    /^(en s'appuyant sur|en étendant|de plus|en outre|par ailleurs)/i,
    /(assurer|profiter|bénéficier|comprendre|considérer|explorer)/i,
  ],

  'Spanish': [
    /^(para|con el fin de|cuando|mientras|si|más allá|relacionado con|además)/i,
    /^(basándose en|extendiendo|además|asimismo|por otra parte)/i,
    /(asegurar|disfrutar|beneficiarse|comprender|considerar|explorar)/i,
  ],
};

/**
 * Get bridge patterns for a specific language
 */
function getBridgePatterns(language?: string): RegExp[] {
  const langName = getLanguageName(language);
  return MULTILINGUAL_BRIDGE_PATTERNS[langName] || MULTILINGUAL_BRIDGE_PATTERNS['English'];
}

export class ContextualBridgeValidator {
  /**
   * Stopwords to ignore when extracting key terms from headings
   */
  private static readonly STOPWORDS = [
    'this', 'that', 'with', 'from', 'your', 'what', 'when', 'where', 'which', 'about',
    'have', 'will', 'they', 'them', 'their', 'there', 'here', 'also', 'just', 'only',
    'into', 'over', 'some', 'more', 'most', 'than', 'then', 'very', 'such',
    'before', 'after', 'during', 'between', 'under', 'above', 'below', 'through'
  ];

  /**
   * Validate contextual bridge between MAIN and SUPPLEMENTARY zones
   * - SUPPLEMENTARY sections should have transitional language
   * - MAIN sections should reference previous section for smooth flow
   */
  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    // Validate SUPPLEMENTARY sections for bridge language
    if (context.section.content_zone === 'SUPPLEMENTARY') {
      const language = context.language;
      const bridgePatterns = getBridgePatterns(language);

      const sentences = splitSentences(content);
      const firstSentence = sentences[0] || '';
      const hasBridge = bridgePatterns.some(p => p.test(firstSentence));

      if (!hasBridge) {
        violations.push({
          rule: 'CONTEXTUAL_BRIDGE_MISSING',
          text: firstSentence.substring(0, 50) + '...',
          position: 0,
          suggestion: 'SUPPLEMENTARY section should start with transitional language connecting to the main topic',
          severity: 'warning',
        });
      }
    }

    // Validate cross-section transitions for MAIN sections (when previousSection is available)
    if (context.previousSection && context.section.content_zone !== 'SUPPLEMENTARY') {
      const transitionQuality = this.checkCrossSectionTransition(
        content,
        context.previousSection,
        context.language
      );

      if (transitionQuality < 0.3) {
        violations.push({
          rule: 'CROSS_SECTION_TRANSITION',
          text: content.substring(0, 100) + '...',
          position: 0,
          suggestion: 'Section should reference concepts from previous section for better flow.',
          severity: 'warning',
        });
      }
    }

    return violations;
  }

  /**
   * Check if the first paragraph of content contains key terms from the previous section heading
   * Returns a quality score between 0 and 1
   */
  private static checkCrossSectionTransition(
    content: string,
    previousSection: { heading: string; content?: string },
    language?: string
  ): number {
    // Extract first paragraph (split by double newline)
    const firstPara = content.split('\n\n')[0] || '';

    // Extract key terms from previous section heading
    const prevTerms = this.extractKeyTerms(previousSection.heading);

    // If no terms to check, assume good transition
    if (prevTerms.length === 0) {
      return 1.0;
    }

    // Count how many terms from previous heading appear in first paragraph
    const matchCount = prevTerms.filter(term =>
      firstPara.toLowerCase().includes(term.toLowerCase())
    ).length;

    return matchCount / prevTerms.length;
  }

  /**
   * Extract meaningful key terms from a heading
   * Filters out short words (< 4 chars), common stopwords, and removes punctuation
   */
  private static extractKeyTerms(heading: string): string[] {
    return heading
      .toLowerCase()
      // Remove punctuation from words
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word =>
        word.length >= 4 &&
        !this.STOPWORDS.includes(word)
      );
  }
}

// Export for testing
export { MULTILINGUAL_BRIDGE_PATTERNS, getBridgePatterns };
