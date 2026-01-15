// services/ai/contentGeneration/rulesEngine/validators/centerpieceValidator.ts

import { ValidationViolation, SectionGenerationContext } from '../../../../../types';
import { getLanguageName } from '../../../../../utils/languageUtils';

/**
 * Multilingual centerpiece patterns
 * Supports: English, Dutch, German, French, Spanish
 */
interface LanguageCenterpiecePatterns {
  definitionPatterns: RegExp[];
  definitiveVerbsPattern: RegExp;
  introHeadingPatterns: string[];
  articlePrefix: string;  // "a/an/the" equivalent
}

const MULTILINGUAL_CENTERPIECE_PATTERNS: Record<string, LanguageCenterpiecePatterns> = {
  'English': {
    definitionPatterns: [
      /\b\w+(?:\s+\w+)*\s+(?:is|are)\s+(?:a|an|the)\s+/i,
      /\b\w+(?:\s+\w+)*\s+(?:refers? to|means?|defines?)\s+/i,
    ],
    definitiveVerbsPattern: /\b(is|are|was|were|means|refers?\s+to|defines?|represents?|consists?\s+of|involves?|requires?|includes?|provides?|offers?)\b/i,
    introHeadingPatterns: ['introduction', 'what is', 'overview'],
    articlePrefix: '(?:a|an|the)\\s+',
  },

  'Dutch': {
    definitionPatterns: [
      /\b\w+(?:\s+\w+)*\s+(?:is|zijn)\s+(?:een|de|het)\s+/i,
      /\b\w+(?:\s+\w+)*\s+(?:verwijst?\s+naar|betekent?|definieert?)\s+/i,
    ],
    definitiveVerbsPattern: /\b(is|zijn|was|waren|betekent|verwijst?\s+naar|definieert?|vertegenwoordigt?|bestaat?\s+uit|omvat|vereist?|bevat|biedt)\b/i,
    introHeadingPatterns: ['inleiding', 'introductie', 'wat is', 'wat zijn', 'overzicht'],
    articlePrefix: '(?:een|de|het)\\s+',
  },

  'German': {
    definitionPatterns: [
      /\b\w+(?:\s+\w+)*\s+(?:ist|sind)\s+(?:ein|eine|der|die|das)\s+/i,
      /\b\w+(?:\s+\w+)*\s+(?:bezieht?\s+sich\s+auf|bedeutet?|definiert?)\s+/i,
    ],
    definitiveVerbsPattern: /\b(ist|sind|war|waren|bedeutet|bezieht?\s+sich\s+auf|definiert?|repräsentiert?|besteht?\s+aus|umfasst|erfordert?|enthält|bietet)\b/i,
    introHeadingPatterns: ['einleitung', 'einführung', 'was ist', 'was sind', 'überblick'],
    articlePrefix: '(?:ein|eine|einer|eines|der|die|das)\\s+',
  },

  'French': {
    definitionPatterns: [
      /\b\w+(?:\s+\w+)*\s+(?:est|sont)\s+(?:un|une|le|la|les)\s+/i,
      /\b\w+(?:\s+\w+)*\s+(?:fait\s+référence\s+à|signifie?|définit?)\s+/i,
    ],
    definitiveVerbsPattern: /\b(est|sont|était|étaient|signifie|fait\s+référence\s+à|définit?|représente?|consiste?\s+en|implique?|nécessite?|comprend|fournit|offre)\b/i,
    introHeadingPatterns: ['introduction', 'qu\'est-ce que', 'aperçu', 'présentation'],
    articlePrefix: '(?:un|une|le|la|les)\\s+',
  },

  'Spanish': {
    definitionPatterns: [
      /\b\w+(?:\s+\w+)*\s+(?:es|son)\s+(?:un|una|el|la|los|las)\s+/i,
      /\b\w+(?:\s+\w+)*\s+(?:se\s+refiere\s+a|significa?|define?)\s+/i,
    ],
    definitiveVerbsPattern: /\b(es|son|era|eran|significa|se\s+refiere\s+a|define?|representa?|consiste?\s+en|implica?|requiere?|incluye|proporciona|ofrece)\b/i,
    introHeadingPatterns: ['introducción', 'qué es', 'qué son', 'visión general', 'presentación'],
    articlePrefix: '(?:un|una|el|la|los|las)\\s+',
  },
};

/**
 * Get centerpiece patterns for a specific language
 */
function getCenterpiecePatterns(language?: string): LanguageCenterpiecePatterns {
  const langName = getLanguageName(language);
  return MULTILINGUAL_CENTERPIECE_PATTERNS[langName] || MULTILINGUAL_CENTERPIECE_PATTERNS['English'];
}

export class CenterpieceValidator {
  private static readonly CENTERPIECE_CHAR_LIMIT = 400;
  private static readonly HEADING_ANSWER_THRESHOLD = 0.4; // 40% of heading terms must appear

  // Common stopwords and question words to filter out when extracting heading keywords
  private static readonly STOPWORDS = new Set([
    // English stopwords
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used',
    'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
    'through', 'during', 'before', 'after', 'above', 'below', 'between',
    'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither',
    'not', 'only', 'own', 'same', 'than', 'too', 'very', 'just',
    'about', 'this', 'that', 'these', 'those', 'it', 'its',
    'you', 'your', 'yours', 'we', 'our', 'ours', 'they', 'their', 'theirs',
    'i', 'me', 'my', 'mine', 'he', 'him', 'his', 'she', 'her', 'hers',
    // Question words
    'what', 'which', 'who', 'whom', 'whose', 'when', 'where', 'why', 'how',
    'much', 'many', 'often', 'long',
  ]);

  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const centralEntity = context.businessInfo?.seedKeyword || '';

    // Get language-specific patterns
    const language = context.language;
    const patterns = getCenterpiecePatterns(language);

    // Check if this is an intro section using language-specific patterns
    const headingLower = context.section?.heading?.toLowerCase() || '';
    const isIntroSection = context.section?.level === 1 ||
                          patterns.introHeadingPatterns.some(p => headingLower.includes(p));

    // First sentence check for ALL sections using language-specific patterns
    const firstSentence = this.extractFirstSentence(content);
    if (firstSentence && !patterns.definitiveVerbsPattern.test(firstSentence)) {
      violations.push({
        rule: 'FIRST_SENTENCE_NO_DEFINITIVE_VERB',
        text: firstSentence.substring(0, 100) + (firstSentence.length > 100 ? '...' : ''),
        position: 0,
        suggestion: `First sentence lacks definitive verb. Start with a direct definition using appropriate verbs for the language.`,
        severity: isIntroSection ? 'error' : 'warning',  // Error for intro, warning for others
      });
    }

    // For NON-intro sections, validate first sentence answers the heading's implied question
    if (!isIntroSection && firstSentence && context.section?.heading) {
      const headingAnswerViolation = this.validateHeadingAnswer(firstSentence, context.section.heading, centralEntity);
      if (headingAnswerViolation) {
        violations.push(headingAnswerViolation);
      }
    }

    // Centerpiece checks only for intro sections or when entity is provided
    if (!centralEntity) return violations;

    // Extended centerpiece validation for intro sections
    if (isIntroSection) {
      const first400 = content.substring(0, this.CENTERPIECE_CHAR_LIMIT);
      const entityLower = centralEntity.toLowerCase();

      // Check if central entity appears in first 400 chars
      const entityInFirst400 = first400.toLowerCase().includes(entityLower);

      if (!entityInFirst400) {
        violations.push({
          rule: 'CENTERPIECE_DELAYED',
          text: first400.substring(0, 100) + '...',
          position: 0,
          suggestion: `Central entity "${centralEntity}" must appear in the first 400 characters with a direct definition.`,
          severity: 'error',
        });
        return violations;
      }

      // Check if there's a proper definition structure using language-specific patterns
      const hasDefinition = patterns.definitionPatterns.some(pattern => {
        const match = first400.match(pattern);
        if (match) {
          // Verify the definition is about the central entity
          const beforeMatch = first400.substring(0, match.index || 0);
          return beforeMatch.toLowerCase().includes(entityLower) ||
                 match[0].toLowerCase().includes(entityLower.split(' ')[0]);
        }
        return false;
      });

      if (!hasDefinition) {
        violations.push({
          rule: 'CENTERPIECE_NO_DEFINITION',
          text: first400.substring(0, 100) + '...',
          position: 0,
          suggestion: `First 400 characters must contain a direct definition of "${centralEntity}"`,
          severity: 'error',  // Elevated to error for intro sections
        });
      }
    }

    return violations;
  }

  /**
   * Validate that the first sentence answers the heading's implied question.
   * Extracts key terms from heading and checks if they appear in the first sentence.
   */
  private static validateHeadingAnswer(
    firstSentence: string,
    heading: string,
    centralEntity: string
  ): ValidationViolation | null {
    // Extract key terms from heading (removing question words and stopwords)
    const headingTerms = this.extractKeyTerms(heading);

    // If heading has no meaningful terms, skip validation
    if (headingTerms.length === 0) {
      return null;
    }

    // Check how many heading terms appear in the first sentence
    const sentenceLower = firstSentence.toLowerCase();
    const matchedTerms = headingTerms.filter(term => {
      // Check for whole word match or start of word (for plurals, verb forms)
      const termPattern = new RegExp(`\\b${this.escapeRegex(term)}`, 'i');
      return termPattern.test(sentenceLower);
    });

    // Calculate match ratio based on heading terms only
    const matchRatio = matchedTerms.length / headingTerms.length;

    // If less than 40% of heading terms appear, flag as violation
    if (matchRatio < this.HEADING_ANSWER_THRESHOLD) {
      return {
        rule: 'HEADING_ANSWER_MISSING',
        text: firstSentence.substring(0, 100) + (firstSentence.length > 100 ? '...' : ''),
        position: 0,
        suggestion: `First sentence must directly answer the heading's question. Include key terms: ${headingTerms.slice(0, 5).join(', ')}`,
        severity: 'warning',
      };
    }

    return null;
  }

  /**
   * Extract key terms from a string, filtering out stopwords and question words.
   */
  private static extractKeyTerms(text: string): string[] {
    if (!text) return [];

    // Split into words, lowercase, and filter
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')  // Remove punctuation
      .split(/\s+/)
      .filter(word =>
        word.length > 2 &&
        !this.STOPWORDS.has(word)
      );

    return [...new Set(words)];  // Remove duplicates
  }

  /**
   * Escape special regex characters in a string.
   */
  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Extract the first sentence from content
   */
  private static extractFirstSentence(content: string): string {
    const trimmed = content.trim();
    // Match first sentence ending with . ! or ?
    const match = trimmed.match(/^[^.!?]+[.!?]/);
    return match ? match[0].trim() : trimmed.split('\n')[0].trim();
  }
}

// Export for testing
export { MULTILINGUAL_CENTERPIECE_PATTERNS, getCenterpiecePatterns };
