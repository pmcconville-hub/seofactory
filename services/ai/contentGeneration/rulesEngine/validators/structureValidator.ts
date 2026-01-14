// services/ai/contentGeneration/rulesEngine/validators/structureValidator.ts

import { ValidationViolation, SectionGenerationContext } from '../../../../../types';
import { getLanguageName } from '../../../../../utils/languageUtils';
import { splitSentences } from '../../../../../utils/sentenceTokenizer';

/**
 * Multilingual article prefixes (definite/indefinite articles)
 * Used for checking entity as subject position
 */
const MULTILINGUAL_ARTICLE_PREFIXES: Record<string, string[]> = {
  'English': ['the ', 'a ', 'an '],
  'Dutch': ['de ', 'het ', 'een '],
  'German': ['der ', 'die ', 'das ', 'ein ', 'eine ', 'einer ', 'eines '],
  'French': ['le ', 'la ', 'les ', 'un ', 'une ', 'l\''],
  'Spanish': ['el ', 'la ', 'los ', 'las ', 'un ', 'una '],
};

/**
 * Get article prefixes for a specific language
 */
function getArticlePrefixes(language?: string): string[] {
  const langName = getLanguageName(language);
  return MULTILINGUAL_ARTICLE_PREFIXES[langName] || MULTILINGUAL_ARTICLE_PREFIXES['English'];
}

export class StructureValidator {
  /**
   * Validate S-P-O sentence structure
   * Central Entity should be the grammatical subject in many sentences
   */
  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const centralEntity = context.businessInfo?.seedKeyword?.toLowerCase() || '';

    if (!centralEntity) return violations;

    // Get language-specific article prefixes
    const language = context.language;
    const articlePrefixes = getArticlePrefixes(language);

    const sentences = splitSentences(content);
    let entityAsSubjectCount = 0;

    sentences.forEach((sentence, idx) => {
      const trimmed = sentence.trim();
      const lowerSentence = trimmed.toLowerCase();

      // Check if sentence starts with the central entity (or part of it)
      const entityParts = centralEntity.split(/\s+/);
      const startsWithEntity = entityParts.some(part =>
        lowerSentence.startsWith(part) ||
        // Check with language-specific article prefixes
        articlePrefixes.some(prefix => lowerSentence.startsWith(prefix + part))
      );

      if (startsWithEntity || lowerSentence.includes(centralEntity)) {
        entityAsSubjectCount++;
      }
    });

    // Warn if central entity is subject in less than 30% of sentences
    const entityRatio = sentences.length > 0 ? entityAsSubjectCount / sentences.length : 0;

    if (sentences.length >= 3 && entityRatio < 0.3) {
      violations.push({
        rule: 'ENTITY_AS_SUBJECT',
        text: `${Math.round(entityRatio * 100)}% entity subject ratio`,
        position: 0,
        suggestion: `Central entity "${context.businessInfo?.seedKeyword}" should be the grammatical subject in more sentences. Current: ${entityAsSubjectCount}/${sentences.length}`,
        severity: 'warning',
      });
    }

    return violations;
  }
}

// Export for testing
export { MULTILINGUAL_ARTICLE_PREFIXES, getArticlePrefixes };
