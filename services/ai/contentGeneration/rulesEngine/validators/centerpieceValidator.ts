// services/ai/contentGeneration/rulesEngine/validators/centerpieceValidator.ts

import { ValidationViolation, SectionGenerationContext } from '../../../../../types';

export class CenterpieceValidator {
  private static readonly CENTERPIECE_CHAR_LIMIT = 400;

  // Definition patterns: "X is a Y"
  private static readonly DEFINITION_PATTERNS = [
    /\b\w+(?:\s+\w+)*\s+(?:is|are)\s+(?:a|an|the)\s+/i,
    /\b\w+(?:\s+\w+)*\s+(?:refers? to|means?|defines?)\s+/i,
  ];

  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const centralEntity = context.businessInfo?.seedKeyword || '';

    if (!centralEntity) return violations;

    const first400 = content.substring(0, this.CENTERPIECE_CHAR_LIMIT);
    const entityLower = centralEntity.toLowerCase();

    // Check if central entity appears in first 400 chars
    const entityInFirst400 = first400.toLowerCase().includes(entityLower);

    if (!entityInFirst400) {
      violations.push({
        rule: 'CENTERPIECE_DELAYED',
        text: first400.substring(0, 100) + '...',
        position: 0,
        suggestion: `Central entity "${centralEntity}" must appear in the first 400 characters with a direct definition. Start with "${centralEntity} is a..."`,
        severity: 'error',
      });
      return violations;
    }

    // Check if there's a proper definition structure
    const hasDefinition = this.DEFINITION_PATTERNS.some(pattern => {
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
        suggestion: `First 400 characters must contain a direct definition: "${centralEntity} is a [category] that [function]"`,
        severity: 'warning',
      });
    }

    return violations;
  }
}
