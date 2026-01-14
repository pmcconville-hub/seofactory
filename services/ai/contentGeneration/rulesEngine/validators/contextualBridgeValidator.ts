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
   * Validate contextual bridge between MAIN and SUPPLEMENTARY zones
   * Supplementary sections should have transitional language
   */
  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    // Only validate SUPPLEMENTARY sections
    if (context.section.content_zone !== 'SUPPLEMENTARY') {
      return violations;
    }

    // Get language-specific bridge patterns
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

    return violations;
  }
}

// Export for testing
export { MULTILINGUAL_BRIDGE_PATTERNS, getBridgePatterns };
