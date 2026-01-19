/**
 * Semantic Distance Calculator
 *
 * Calculates semantic distance between hub and spoke posts
 * to ensure coherent campaign structure.
 */

import type {
  SocialPost,
  PostEAVTriple
} from '../../../types/social';
import { MAX_SEMANTIC_DISTANCE, CROSS_PLATFORM_LINK_THRESHOLD } from '../../../types/social';

/**
 * Semantic distance result
 */
export interface SemanticDistanceResult {
  distance: number;  // 0-1, lower is closer
  within_threshold: boolean;
  shared_entities: string[];
  shared_keywords: string[];
  relationship_strength: 'strong' | 'moderate' | 'weak' | 'disconnected';
}

/**
 * Campaign distance analysis
 */
export interface CampaignDistanceAnalysis {
  hub_to_spoke_distances: Map<number, SemanticDistanceResult>;
  average_distance: number;
  max_distance: number;
  outliers: number[];  // Spoke positions with distance > threshold
  coverage_score: number;
  suggestions: string[];
}

/**
 * Calculates semantic distance for hub-spoke campaigns
 */
export class SemanticDistanceCalculator {
  /**
   * Calculate semantic distance between two posts
   */
  calculateDistance(
    postA: SocialPost,
    postB: SocialPost
  ): SemanticDistanceResult {
    // Extract entities from both posts
    const entitiesA = new Set(postA.entities_mentioned || []);
    const entitiesB = new Set(postB.entities_mentioned || []);

    // Extract keywords from content
    const keywordsA = this.extractKeywords(postA.content_text);
    const keywordsB = this.extractKeywords(postB.content_text);

    // Find shared elements
    const sharedEntities = [...entitiesA].filter(e => entitiesB.has(e));
    const sharedKeywords = [...keywordsA].filter(k => keywordsB.has(k));

    // Calculate base distance using Jaccard similarity
    const entitySimilarity = this.jaccardSimilarity(entitiesA, entitiesB);
    const keywordSimilarity = this.jaccardSimilarity(keywordsA, keywordsB);

    // Calculate EAV similarity if available
    let eavSimilarity = 0;
    if (postA.eav_triple && postB.eav_triple) {
      eavSimilarity = this.calculateEAVSimilarity(postA.eav_triple, postB.eav_triple);
    }

    // Weighted combination (entities most important for semantic SEO)
    const similarity = (entitySimilarity * 0.5) + (keywordSimilarity * 0.3) + (eavSimilarity * 0.2);
    const distance = 1 - similarity;

    // Determine relationship strength
    let relationship: 'strong' | 'moderate' | 'weak' | 'disconnected';
    if (distance < 0.3) {
      relationship = 'strong';
    } else if (distance < 0.5) {
      relationship = 'moderate';
    } else if (distance < MAX_SEMANTIC_DISTANCE) {
      relationship = 'weak';
    } else {
      relationship = 'disconnected';
    }

    return {
      distance: Math.round(distance * 1000) / 1000,
      within_threshold: distance <= MAX_SEMANTIC_DISTANCE,
      shared_entities: sharedEntities,
      shared_keywords: sharedKeywords.slice(0, 10),
      relationship_strength: relationship
    };
  }

  /**
   * Calculate distance from hub to all spokes
   */
  analyzeHubSpokeDistances(
    hubPost: SocialPost,
    spokePosts: SocialPost[]
  ): CampaignDistanceAnalysis {
    const distances = new Map<number, SemanticDistanceResult>();
    const outliers: number[] = [];
    let totalDistance = 0;
    let maxDistance = 0;

    for (const spoke of spokePosts) {
      if (!spoke.spoke_position) continue;

      const result = this.calculateDistance(hubPost, spoke);
      distances.set(spoke.spoke_position, result);
      totalDistance += result.distance;

      if (result.distance > maxDistance) {
        maxDistance = result.distance;
      }

      if (!result.within_threshold) {
        outliers.push(spoke.spoke_position);
      }
    }

    const avgDistance = spokePosts.length > 0
      ? totalDistance / spokePosts.length
      : 0;

    // Calculate coverage score
    const withinThreshold = spokePosts.length - outliers.length;
    const coverageScore = spokePosts.length > 0
      ? Math.round((withinThreshold / spokePosts.length) * 100)
      : 100;

    // Generate suggestions
    const suggestions = this.generateSuggestions(
      distances,
      outliers,
      avgDistance,
      hubPost
    );

    return {
      hub_to_spoke_distances: distances,
      average_distance: Math.round(avgDistance * 1000) / 1000,
      max_distance: Math.round(maxDistance * 1000) / 1000,
      outliers,
      coverage_score: coverageScore,
      suggestions
    };
  }

  /**
   * Calculate Jaccard similarity between two sets
   */
  private jaccardSimilarity<T>(setA: Set<T>, setB: Set<T>): number {
    if (setA.size === 0 && setB.size === 0) return 1;

    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);

    return intersection.size / union.size;
  }

  /**
   * Calculate similarity between two EAV triples
   */
  private calculateEAVSimilarity(
    eavA: PostEAVTriple,
    eavB: PostEAVTriple
  ): number {
    let similarity = 0;

    // Same entity = high similarity
    if (eavA.entity.toLowerCase() === eavB.entity.toLowerCase()) {
      similarity += 0.5;
    } else if (
      eavA.entity.toLowerCase().includes(eavB.entity.toLowerCase()) ||
      eavB.entity.toLowerCase().includes(eavA.entity.toLowerCase())
    ) {
      similarity += 0.3;
    }

    // Same attribute = moderate similarity
    if (eavA.attribute.toLowerCase() === eavB.attribute.toLowerCase()) {
      similarity += 0.3;
    }

    // Same category = slight similarity
    if (eavA.category === eavB.category) {
      similarity += 0.2;
    }

    return similarity;
  }

  /**
   * Extract keywords from content
   */
  private extractKeywords(content: string): Set<string> {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
      'these', 'those', 'it', 'its', 'they', 'them', 'their', 'we', 'our',
      'you', 'your', 'i', 'my', 'me', 'more', 'most', 'some', 'any', 'no',
      'not', 'only', 'just', 'also', 'very', 'so', 'too', 'then', 'now',
      'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'every'
    ]);

    // Extract words, filter stop words and short words
    const words = content
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w));

    return new Set(words);
  }

  /**
   * Generate improvement suggestions
   */
  private generateSuggestions(
    distances: Map<number, SemanticDistanceResult>,
    outliers: number[],
    avgDistance: number,
    hubPost: SocialPost
  ): string[] {
    const suggestions: string[] = [];

    // Suggestions for outliers
    if (outliers.length > 0) {
      suggestions.push(
        `Spokes ${outliers.join(', ')} are semantically distant from hub - ` +
        `add shared entity mentions`
      );
    }

    // Suggestion for high average distance
    if (avgDistance > 0.5) {
      suggestions.push(
        'Average semantic distance is high - ensure all spoke posts ' +
        'reference the main topic entity'
      );
    }

    // Suggestion for disconnected posts
    for (const [position, result] of distances) {
      if (result.relationship_strength === 'disconnected') {
        suggestions.push(
          `Spoke ${position} appears disconnected - add explicit mentions of ` +
          `"${hubPost.entities_mentioned?.[0] || 'the main entity'}"`
        );
      }
    }

    // Suggestion for weak relationships
    const weakCount = [...distances.values()]
      .filter(r => r.relationship_strength === 'weak').length;

    if (weakCount > distances.size / 2) {
      suggestions.push(
        'Many spoke posts have weak connection to hub - ' +
        'consider using more consistent terminology'
      );
    }

    return suggestions;
  }

  /**
   * Check if cross-platform linking is recommended
   */
  shouldCrossLink(
    postA: SocialPost,
    postB: SocialPost
  ): { recommended: boolean; reason: string } {
    const result = this.calculateDistance(postA, postB);

    if (result.distance <= CROSS_PLATFORM_LINK_THRESHOLD) {
      return {
        recommended: true,
        reason: `Semantic distance ${result.distance} is within cross-link threshold (${CROSS_PLATFORM_LINK_THRESHOLD})`
      };
    }

    return {
      recommended: false,
      reason: `Semantic distance ${result.distance} exceeds cross-link threshold - linking may confuse audiences`
    };
  }

  /**
   * Calculate entity family coverage
   * (how well the campaign covers the entity's attributes)
   */
  calculateEntityFamilyCoverage(
    posts: SocialPost[],
    entityName: string
  ): {
    coverage_percent: number;
    attributes_covered: string[];
    missing_attributes: string[];
  } {
    const attributesCovered = new Set<string>();

    for (const post of posts) {
      if (post.eav_triple && post.eav_triple.entity.toLowerCase() === entityName.toLowerCase()) {
        attributesCovered.add(post.eav_triple.attribute);
      }
    }

    // Without knowing the full attribute set, return what we have
    return {
      coverage_percent: attributesCovered.size > 0 ? 100 : 0,
      attributes_covered: [...attributesCovered],
      missing_attributes: []  // Would need full schema to determine
    };
  }
}

// Export singleton instance
export const semanticDistanceCalculator = new SemanticDistanceCalculator();
