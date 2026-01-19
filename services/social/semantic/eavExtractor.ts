/**
 * EAV Extractor Service
 *
 * Selects and extracts Entity-Attribute-Value triples for social posts.
 * Prioritizes unique and rare EAVs to maximize information gain.
 */

import type {
  PostEAVTriple,
  ArticleTransformationSource
} from '../../../types/social';

/**
 * EAV selection criteria
 */
export interface EAVSelectionCriteria {
  preferred_category?: 'UNIQUE' | 'RARE' | 'ROOT' | 'COMMON';
  exclude_entities?: string[];
  exclude_attributes?: string[];
  max_value_length?: number;
}

/**
 * EAV extraction result
 */
export interface EAVExtractionResult {
  selected: PostEAVTriple | null;
  alternatives: PostEAVTriple[];
  reason: string;
}

/**
 * Priority scores for EAV categories
 */
const CATEGORY_PRIORITY: Record<string, number> = {
  'UNIQUE': 100,
  'RARE': 75,
  'ROOT': 50,
  'COMMON': 25
};

/**
 * EAV extractor for social posts
 */
export class EAVExtractor {
  /**
   * Select the best EAV for a post based on criteria
   */
  selectBest(
    source: ArticleTransformationSource,
    criteria: EAVSelectionCriteria = {},
    usedEAVs: Set<string> = new Set()
  ): EAVExtractionResult {
    const eavs = source.contextual_vectors;

    if (!eavs || eavs.length === 0) {
      return {
        selected: null,
        alternatives: [],
        reason: 'No EAVs available in source'
      };
    }

    // Filter and score EAVs
    const scoredEAVs = this.scoreEAVs(eavs, criteria, usedEAVs);

    if (scoredEAVs.length === 0) {
      return {
        selected: null,
        alternatives: [],
        reason: 'All EAVs filtered out by criteria'
      };
    }

    // Sort by score (descending)
    scoredEAVs.sort((a, b) => b.score - a.score);

    const selected = scoredEAVs[0].eav;
    const alternatives = scoredEAVs.slice(1, 4).map(s => s.eav);

    return {
      selected,
      alternatives,
      reason: `Selected ${selected.category} EAV with score ${scoredEAVs[0].score}`
    };
  }

  /**
   * Select EAVs for multiple posts (ensuring diversity)
   */
  selectForCampaign(
    source: ArticleTransformationSource,
    postCount: number,
    criteria: EAVSelectionCriteria = {}
  ): PostEAVTriple[] {
    const selected: PostEAVTriple[] = [];
    const usedEAVs = new Set<string>();

    for (let i = 0; i < postCount; i++) {
      const result = this.selectBest(source, criteria, usedEAVs);

      if (result.selected) {
        selected.push(result.selected);
        usedEAVs.add(this.getEAVKey(result.selected));
      }
    }

    return selected;
  }

  /**
   * Score EAVs based on criteria
   */
  private scoreEAVs(
    eavs: Array<{
      entity: string;
      attribute: string;
      value: string;
      category: 'UNIQUE' | 'RARE' | 'ROOT' | 'COMMON';
    }>,
    criteria: EAVSelectionCriteria,
    usedEAVs: Set<string>
  ): Array<{ eav: PostEAVTriple; score: number }> {
    const scored: Array<{ eav: PostEAVTriple; score: number }> = [];

    for (const eav of eavs) {
      const key = `${eav.entity}:${eav.attribute}`;

      // Skip used EAVs
      if (usedEAVs.has(key)) continue;

      // Skip excluded entities
      if (criteria.exclude_entities?.includes(eav.entity)) continue;

      // Skip excluded attributes
      if (criteria.exclude_attributes?.includes(eav.attribute)) continue;

      // Skip if value too long
      if (criteria.max_value_length && eav.value.length > criteria.max_value_length) continue;

      // Calculate score
      let score = CATEGORY_PRIORITY[eav.category] || 25;

      // Bonus for preferred category
      if (criteria.preferred_category && eav.category === criteria.preferred_category) {
        score += 20;
      }

      // Bonus for concise values (better for social)
      if (eav.value.length < 100) {
        score += 10;
      }

      // Bonus for values with numbers (more specific/credible)
      if (/\d+/.test(eav.value)) {
        score += 5;
      }

      // Penalty for generic attributes
      const genericAttributes = ['is', 'has', 'type', 'name'];
      if (genericAttributes.includes(eav.attribute.toLowerCase())) {
        score -= 10;
      }

      scored.push({
        eav: {
          entity: eav.entity,
          attribute: eav.attribute,
          value: eav.value,
          category: eav.category
        },
        score
      });
    }

    return scored;
  }

  /**
   * Get unique key for EAV
   */
  private getEAVKey(eav: PostEAVTriple): string {
    return `${eav.entity}:${eav.attribute}`;
  }

  /**
   * Validate EAV is suitable for social post
   */
  validateForSocial(eav: PostEAVTriple): {
    valid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check entity
    if (!eav.entity || eav.entity.length < 2) {
      issues.push('Entity name is missing or too short');
    }

    // Check attribute
    if (!eav.attribute || eav.attribute.length < 2) {
      issues.push('Attribute is missing or too short');
    }

    // Check value
    if (!eav.value || eav.value.length < 3) {
      issues.push('Value is missing or too short');
    }

    // Check value length for social
    if (eav.value && eav.value.length > 200) {
      suggestions.push('Consider shortening the value for social media');
    }

    // Check for ambiguous pronouns in value
    const pronouns = ['it', 'this', 'that', 'they', 'them'];
    const valueWords = eav.value.toLowerCase().split(/\s+/);
    const hasAmbiguousPronoun = valueWords.some(w => pronouns.includes(w));

    if (hasAmbiguousPronoun) {
      suggestions.push('Value contains ambiguous pronouns - consider replacing with explicit entity names');
    }

    return {
      valid: issues.length === 0,
      issues,
      suggestions
    };
  }

  /**
   * Format EAV as readable sentence
   */
  formatAsStatement(eav: PostEAVTriple): string {
    const attribute = this.formatAttribute(eav.attribute);
    return `${eav.entity} ${attribute} ${eav.value}`;
  }

  /**
   * Format attribute for natural reading
   */
  private formatAttribute(attribute: string): string {
    return attribute
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .toLowerCase()
      .trim();
  }

  /**
   * Get EAV category distribution in source
   */
  getCategoryDistribution(
    source: ArticleTransformationSource
  ): Record<string, number> {
    const distribution: Record<string, number> = {
      UNIQUE: 0,
      RARE: 0,
      ROOT: 0,
      COMMON: 0
    };

    for (const eav of source.contextual_vectors) {
      distribution[eav.category] = (distribution[eav.category] || 0) + 1;
    }

    return distribution;
  }

  /**
   * Get EAV coverage suggestions
   */
  getCoverageSuggestions(
    source: ArticleTransformationSource,
    usedEAVs: PostEAVTriple[]
  ): string[] {
    const suggestions: string[] = [];
    const distribution = this.getCategoryDistribution(source);
    const usedCategories = new Set(usedEAVs.map(e => e.category));

    // Check for unused UNIQUE EAVs
    if (distribution.UNIQUE > 0 && !usedCategories.has('UNIQUE')) {
      suggestions.push(`You have ${distribution.UNIQUE} UNIQUE EAV(s) not being used - these are highest priority`);
    }

    // Check for unused RARE EAVs
    if (distribution.RARE > 0 && !usedCategories.has('RARE')) {
      suggestions.push(`Consider using RARE EAVs for differentiation`);
    }

    // Check overall utilization
    const totalEAVs = Object.values(distribution).reduce((a, b) => a + b, 0);
    const usedCount = usedEAVs.length;
    const utilizationPercent = totalEAVs > 0 ? Math.round((usedCount / totalEAVs) * 100) : 0;

    if (utilizationPercent < 50 && totalEAVs > 3) {
      suggestions.push(`Only using ${utilizationPercent}% of available EAVs - consider adding more spoke posts`);
    }

    return suggestions;
  }
}

// Export singleton instance
export const eavExtractor = new EAVExtractor();
