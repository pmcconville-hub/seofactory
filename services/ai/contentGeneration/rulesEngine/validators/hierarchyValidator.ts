// services/ai/contentGeneration/rulesEngine/validators/hierarchyValidator.ts

import { ValidationViolation, BriefSection } from '../../../../../types';

export class HierarchyValidator {
  /**
   * Validate heading hierarchy - no level skips (H2→H4 is invalid)
   */
  static validateStructure(sections: BriefSection[]): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    let previousLevel = 1; // Start with H1

    const checkSections = (sectionList: BriefSection[], parentLevel: number) => {
      sectionList.forEach((section, idx) => {
        const currentLevel = section.level;

        // Check for level skips
        if (currentLevel > parentLevel + 1) {
          violations.push({
            rule: 'HIERARCHY_SKIP',
            text: section.heading,
            position: idx,
            suggestion: `Heading "${section.heading}" (H${currentLevel}) skips levels from H${parentLevel}. Use H${parentLevel + 1} instead.`,
            severity: 'error',
          });
        }

        // Check subsections recursively
        if (section.subsections && section.subsections.length > 0) {
          checkSections(section.subsections, currentLevel);
        }

        previousLevel = currentLevel;
      });
    };

    checkSections(sections, 1);

    return violations;
  }
}
