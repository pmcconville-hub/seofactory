// services/ai/contentGeneration/rulesEngine/attributeRanker.ts

import { BriefSection, AttributeCategory } from '../../../../types';

export class AttributeRanker {
  private static readonly CATEGORY_PRIORITY: Record<string, number> = {
    ROOT: 1,
    CORE_DEFINITION: 1, // Legacy alias
    UNIQUE: 2,
    SEARCH_DEMAND: 2, // Legacy alias
    RARE: 3,
    COMPETITIVE_EXPANSION: 3, // Legacy alias
    COMMON: 4,
    COMPOSITE: 4, // Legacy alias
  };

  /**
   * Order sections by attribute category, then by query priority
   * Order: ROOT → UNIQUE → RARE → COMMON
   */
  static orderSections(sections: BriefSection[]): BriefSection[] {
    // Create a copy to avoid mutating original
    const ordered = [...sections].sort((a, b) => {
      // First, sort by attribute category
      const categoryA = this.getCategoryPriority(a.attribute_category);
      const categoryB = this.getCategoryPriority(b.attribute_category);

      if (categoryA !== categoryB) {
        return categoryA - categoryB;
      }

      // Within same category, sort by query_priority (higher first)
      const priorityA = a.query_priority ?? 0;
      const priorityB = b.query_priority ?? 0;

      return priorityB - priorityA;
    });

    return ordered;
  }

  private static getCategoryPriority(category?: AttributeCategory): number {
    if (!category) return 999; // Unclassified goes last
    return this.CATEGORY_PRIORITY[category] ?? 999;
  }

  /**
   * Classify a section's attribute category based on heading analysis
   * Used when briefs don't have explicit classification
   */
  static inferCategory(heading: string, centralEntity: string): AttributeCategory {
    const lowerHeading = heading.toLowerCase();
    const lowerEntity = centralEntity.toLowerCase();

    // ROOT indicators: definitions, what is, overview
    if (
      lowerHeading.includes('what is') ||
      lowerHeading.includes('definition') ||
      lowerHeading.includes('overview') ||
      lowerHeading.includes('introduction') ||
      lowerHeading === lowerEntity
    ) {
      return 'ROOT';
    }

    // UNIQUE indicators: specific features, unique aspects
    if (
      lowerHeading.includes('unique') ||
      lowerHeading.includes('feature') ||
      lowerHeading.includes('advantage') ||
      lowerHeading.includes('vs') ||
      lowerHeading.includes('comparison')
    ) {
      return 'UNIQUE';
    }

    // RARE indicators: specific, technical, detailed
    if (
      lowerHeading.includes('technical') ||
      lowerHeading.includes('specification') ||
      lowerHeading.includes('detailed') ||
      lowerHeading.includes('advanced')
    ) {
      return 'RARE';
    }

    // Default to COMMON
    return 'COMMON';
  }
}
