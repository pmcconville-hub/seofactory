// services/ai/contentGeneration/rulesEngine/validators/factConsistencyValidator.ts

import { SectionGenerationContext, ValidationViolation } from '../../../../../types';

/**
 * Lightweight fact consistency check.
 * Detects:
 * 1. Numeric claims not supported by brief data
 * 2. Contradictions with EAV triples (negation patterns)
 */
export class FactConsistencyValidator {
  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const brief = context.brief;
    if (!brief) return violations;

    // Check for unsupported statistics (numbers followed by %, million, billion, etc.)
    const statPatterns = /(\d+(?:\.\d+)?)\s*(%|percent|million|billion|thousand)/gi;
    let match;
    const briefText = JSON.stringify(brief).toLowerCase();

    while ((match = statPatterns.exec(content)) !== null) {
      const number = match[1];
      if (!briefText.includes(number)) {
        violations.push({
          rule: 'FACT_CONSISTENCY',
          text: `Statistic "${match[0]}" not found in brief data — may be hallucinated`,
          position: match.index,
          suggestion: 'Verify this statistic against source data or remove it.',
          severity: 'warning',
        });
      }
    }

    // Check for EAV contradictions (negation of known facts)
    const eavs = brief.eavs || [];
    const contentLower = content.toLowerCase();

    for (const eav of eavs) {
      const subject = eav.subject?.label?.toLowerCase();
      const relation = eav.predicate?.relation?.toLowerCase() || '';

      if (!subject || !relation) continue;
      if (!contentLower.includes(subject)) continue;

      // Look for negation of the EAV relationship
      const escapedSubject = subject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedRelation = relation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const negationPattern = new RegExp(
        `${escapedSubject}\\s+(?:does not|doesn't|is not|isn't|cannot|can't|never|no longer)\\s+${escapedRelation}`,
        'i'
      );

      if (negationPattern.test(content)) {
        violations.push({
          rule: 'FACT_CONSISTENCY',
          text: `Content negates EAV: "${eav.subject?.label} ${relation} ${eav.object?.value}"`,
          position: 0,
          suggestion: `The brief states "${eav.subject?.label} ${relation} ${eav.object?.value}". Remove the contradicting statement.`,
          severity: 'error',
        });
      }
    }

    return violations;
  }
}
