// services/ai/contentGeneration/rulesEngine/validators/queryOrderingValidator.ts

import { ValidationViolation, SectionGenerationContext, BriefSection } from '../../../../../types';

/**
 * QueryOrderingValidator - Validates that sections are ordered by query probability.
 *
 * Framework rule: Sections should be ordered by search volume/probability,
 * with the highest-probability queries addressed first. This aligns with
 * the "most important information first" principle and optimizes for
 * user engagement and IR zone positioning.
 *
 * Uses query_priority from brief data when available, falling back to
 * attribute_category ordering (UNIQUE > ROOT > RARE > COMMON).
 */

const CATEGORY_PRIORITY: Record<string, number> = {
  'UNIQUE': 1,
  'ROOT': 2,
  'RARE': 3,
  'COMMON': 4,
};

export class QueryOrderingValidator {
  /**
   * Validate section ordering matches query probability.
   * Only runs during full-article audit (needs all sections).
   */
  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const sections = context.allSections;

    if (!sections || sections.length < 3) return violations;

    // Check if sections have query priority data
    const hasQueryPriority = sections.some(s =>
      s.query_priority != null && s.query_priority > 0
    );

    if (hasQueryPriority) {
      return this.validateByQueryPriority(sections);
    }

    // Fallback: validate by attribute category ordering
    return this.validateByCategoryOrder(sections);
  }

  /**
   * Validate sections are ordered by query priority (descending).
   */
  private static validateByQueryPriority(sections: BriefSection[]): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const sectionsWithVolume = sections
      .map((s, i) => ({ section: s, index: i, volume: s.query_priority || 0 }))
      .filter(s => s.volume > 0);

    if (sectionsWithVolume.length < 2) return violations;

    // Check for significant ordering violations
    let inversions = 0;
    for (let i = 0; i < sectionsWithVolume.length - 1; i++) {
      if (sectionsWithVolume[i].volume < sectionsWithVolume[i + 1].volume) {
        // A later section has higher volume — it should come first
        const diff = sectionsWithVolume[i + 1].volume - sectionsWithVolume[i].volume;
        // Only flag significant inversions (>20% difference)
        if (diff > sectionsWithVolume[i + 1].volume * 0.2) {
          inversions++;
        }
      }
    }

    if (inversions > 0) {
      violations.push({
        rule: 'QUERY_ORDERING',
        text: `${inversions} section ordering inversion(s) by search volume`,
        position: 0,
        suggestion: `Sections should be ordered by search volume (highest first). Found ${inversions} cases where a lower-volume section precedes a higher-volume one.`,
        severity: 'info',
      });
    }

    return violations;
  }

  /**
   * Validate sections follow attribute category ordering:
   * UNIQUE → ROOT → RARE → COMMON
   */
  private static validateByCategoryOrder(sections: BriefSection[]): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const sectionsWithCategory = sections
      .map((s, i) => ({
        section: s,
        index: i,
        priority: CATEGORY_PRIORITY[s.attribute_category || ''] || 5,
      }))
      .filter(s => s.priority < 5);

    if (sectionsWithCategory.length < 3) return violations;

    let inversions = 0;
    for (let i = 0; i < sectionsWithCategory.length - 1; i++) {
      if (sectionsWithCategory[i].priority > sectionsWithCategory[i + 1].priority) {
        inversions++;
      }
    }

    // Allow some inversions (contextual flow may justify reordering)
    const inversionRatio = inversions / (sectionsWithCategory.length - 1);
    if (inversionRatio > 0.3) {
      violations.push({
        rule: 'QUERY_ORDERING_CATEGORY',
        text: `${inversions} attribute category ordering inversions`,
        position: 0,
        suggestion: 'Sections should generally follow UNIQUE → ROOT → RARE → COMMON ordering. Consider reordering to address highest-priority attributes first.',
        severity: 'info',
      });
    }

    return violations;
  }
}
