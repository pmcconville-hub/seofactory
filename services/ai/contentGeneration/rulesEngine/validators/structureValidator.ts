// services/ai/contentGeneration/rulesEngine/validators/structureValidator.ts

import { ValidationViolation, SectionGenerationContext } from '../../../../../types';

export class StructureValidator {
  /**
   * Validate S-P-O sentence structure
   * Central Entity should be the grammatical subject in many sentences
   */
  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const centralEntity = context.businessInfo?.seedKeyword?.toLowerCase() || '';

    if (!centralEntity) return violations;

    const sentences = content.split(/[.!?]+\s*/).filter(s => s.trim().length > 0);
    let entityAsSubjectCount = 0;

    sentences.forEach((sentence, idx) => {
      const trimmed = sentence.trim();
      const lowerSentence = trimmed.toLowerCase();

      // Check if sentence starts with the central entity (or part of it)
      const entityParts = centralEntity.split(/\s+/);
      const startsWithEntity = entityParts.some(part =>
        lowerSentence.startsWith(part) ||
        lowerSentence.startsWith('the ' + part)
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
