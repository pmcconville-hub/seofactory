// services/ai/contentGeneration/rulesEngine/validators/eavDensity.ts

import { ValidationViolation } from '../../../../../types';

export class EAVDensityValidator {
  // Minimum word count for a sentence to require full EAV
  private static readonly MIN_WORDS_FOR_EAV = 4;

  // Patterns indicating presence of Entity-Attribute-Value
  private static readonly EAV_PATTERNS = [
    // Entity + verb + value: "X is/are Y"
    /\b[A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)*\s+(?:is|are|was|were|has|have|had|requires?|needs?|provides?|offers?|contains?|includes?|weighs?|measures?|costs?|lasts?)\s+/i,
    // Entity + attribute + value: "The X of Y is Z"
    /\bThe\s+\w+\s+of\s+\w+\s+(?:is|are|measures?|equals?)/i,
    // Numeric values (strong EAV indicator)
    /\d+(?:\.\d+)?(?:\s*(?:percent|%|kg|lb|cm|mm|m|ft|hours?|minutes?|days?|weeks?|months?|years?))?/i,
  ];

  // Patterns indicating weak/empty sentences
  private static readonly WEAK_PATTERNS = [
    /^It\s+(?:is|was)\s+\w+\.$/i,
    /^Things?\s+(?:is|are|happen)/i,
    /^This\s+(?:is|was)\s+\w+\.$/i,
  ];

  static validate(content: string): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const sentences = this.splitSentences(content);

    sentences.forEach((sentence, index) => {
      const words = sentence.trim().split(/\s+/);

      // Skip very short sentences
      if (words.length < this.MIN_WORDS_FOR_EAV) return;

      // Check for weak patterns
      for (const pattern of this.WEAK_PATTERNS) {
        if (pattern.test(sentence)) {
          violations.push({
            rule: 'EAV_DENSITY',
            text: sentence,
            position: content.indexOf(sentence),
            suggestion: 'Sentence lacks Entity-Attribute-Value structure. Add specific entity, attribute, and measurable value.',
            severity: 'warning',
          });
          return;
        }
      }

      // Check if sentence has EAV structure
      const hasEAV = this.EAV_PATTERNS.some(pattern => pattern.test(sentence));

      if (!hasEAV && words.length >= 6) {
        violations.push({
          rule: 'EAV_DENSITY',
          text: sentence,
          position: content.indexOf(sentence),
          suggestion: 'Sentence may lack clear Entity-Attribute-Value. Ensure it contains: Entity (subject) + Attribute (verb/property) + Value (object/measurement).',
          severity: 'warning',
        });
      }
    });

    return violations;
  }

  static calculateDensity(content: string): number {
    const sentences = this.splitSentences(content);
    if (sentences.length === 0) return 0;

    let eavCount = 0;
    sentences.forEach(sentence => {
      const hasEAV = this.EAV_PATTERNS.some(pattern => pattern.test(sentence));
      if (hasEAV) eavCount++;
    });

    return Math.round((eavCount / sentences.length) * 100);
  }

  private static splitSentences(content: string): string[] {
    return content
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
}
