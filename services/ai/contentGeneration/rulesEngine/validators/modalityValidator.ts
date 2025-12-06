// services/ai/contentGeneration/rulesEngine/validators/modalityValidator.ts

import { ValidationViolation, SectionGenerationContext } from '../../../../../types';

export class ModalityValidator {
  // Weak/uncertain modality patterns
  private static readonly UNCERTAIN_PATTERNS = [
    /\b(?:might|could)\s+be\b/gi,
    /\b(?:may|might)\s+(?:have|cause|lead|result)\b/gi,
    /\bmight\s+\w+/gi,
  ];

  // Patterns that are acceptable in possibility/risk contexts
  private static readonly POSSIBILITY_CONTEXTS = [
    'risk', 'danger', 'warning', 'caution', 'side effect',
    'potential', 'possible', 'exception', 'condition',
  ];

  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const heading = context.section.heading?.toLowerCase() || '';

    // Check if we're in a possibility context (risks, warnings, etc.)
    const isPossibilityContext = this.POSSIBILITY_CONTEXTS.some(
      term => heading.includes(term)
    );

    // If in possibility context, uncertain language is acceptable
    if (isPossibilityContext) {
      return violations;
    }

    // Check for uncertain modality
    for (const pattern of this.UNCERTAIN_PATTERNS) {
      const matches = content.matchAll(new RegExp(pattern.source, 'gi'));
      for (const match of matches) {
        violations.push({
          rule: 'MODALITY_UNCERTAINTY',
          text: match[0],
          position: match.index || 0,
          suggestion: `Replace uncertain "${match[0]}" with definitive "is/are" for facts, or use "can/may" only for genuine possibilities`,
          severity: 'warning',
        });
      }
    }

    return violations;
  }
}
