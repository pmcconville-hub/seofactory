/**
 * Hub-Spoke Orchestrator
 *
 * Plans and coordinates the creation of hub-spoke social media campaigns.
 * Implements the 1 hub + 7 spokes model for maximum semantic coverage.
 */

import type {
  SocialMediaPlatform,
  SocialCampaign,
  SocialPost,
  SocialPostInput,
  ArticleTransformationSource,
  PlatformSelection,
  TransformationConfig,
  PostEAVTriple,
  SocialTemplateType
} from '../../../types/social';

/**
 * Hub-spoke plan result
 */
export interface HubSpokePlan {
  hub: PlannedPost;
  spokes: PlannedPost[];
  eav_assignments: Map<number, PostEAVTriple>;  // spoke position -> EAV
  total_posts: number;
  platforms_covered: SocialMediaPlatform[];
}

/**
 * Planned post before generation
 */
export interface PlannedPost {
  platform: SocialMediaPlatform;
  template_type: SocialTemplateType;
  is_hub: boolean;
  spoke_position?: number;
  assigned_eav?: PostEAVTriple;
  use_thread?: boolean;  // For Twitter
  use_carousel?: boolean;  // For Instagram
}

/**
 * EAV priority for spoke assignment
 */
const EAV_PRIORITY: Record<string, number> = {
  'UNIQUE': 1,
  'RARE': 2,
  'ROOT': 3,
  'COMMON': 4
};

/**
 * Orchestrates hub-spoke campaign planning
 */
export class HubSpokeOrchestrator {
  private maxSpokes = 7;

  /**
   * Create a hub-spoke plan from source and configuration
   */
  createPlan(
    source: ArticleTransformationSource,
    config: TransformationConfig
  ): HubSpokePlan {
    const enabledPlatforms = config.platforms.filter(p => p.enabled);

    if (enabledPlatforms.length === 0) {
      throw new Error('At least one platform must be enabled');
    }

    // Sort EAVs by priority
    const sortedEAVs = this.sortEAVsByPriority(source.contextual_vectors);

    // Create hub post plan
    const hub = this.planHubPost(config.hub_platform, enabledPlatforms);

    // Create spoke post plans
    const spokes = this.planSpokesPosts(
      enabledPlatforms,
      sortedEAVs,
      config.max_spoke_posts || this.maxSpokes
    );

    // Assign EAVs to spokes
    const eavAssignments = this.assignEAVsToSpokes(spokes, sortedEAVs);

    return {
      hub,
      spokes,
      eav_assignments: eavAssignments,
      total_posts: 1 + spokes.length,
      platforms_covered: [...new Set([hub.platform, ...spokes.map(s => s.platform)])]
    };
  }

  /**
   * Plan the hub post
   */
  private planHubPost(
    hubPlatform: SocialMediaPlatform,
    enabledPlatforms: PlatformSelection[]
  ): PlannedPost {
    const platformConfig = enabledPlatforms.find(p => p.platform === hubPlatform);

    return {
      platform: hubPlatform,
      template_type: 'hub_announcement',
      is_hub: true,
      use_thread: hubPlatform === 'twitter' && platformConfig?.post_count !== 1,
      use_carousel: hubPlatform === 'instagram' && platformConfig?.post_count !== 1
    };
  }

  /**
   * Plan spoke posts distributed across platforms
   */
  private planSpokesPosts(
    enabledPlatforms: PlatformSelection[],
    sortedEAVs: PostEAVTriple[],
    maxSpokes: number
  ): PlannedPost[] {
    const spokes: PlannedPost[] = [];
    let spokePosition = 1;

    // Template rotation for variety
    const spokeTemplates: SocialTemplateType[] = [
      'key_takeaway',
      'entity_spotlight',
      'question_hook',
      'stat_highlight',
      'tip_series'
    ];

    // Distribute posts across platforms
    for (const platformConfig of enabledPlatforms) {
      // Calculate posts for this platform (minus 1 if it's hub platform, but hub already created)
      let postsForPlatform = platformConfig.post_count;

      for (let i = 0; i < postsForPlatform && spokePosition <= maxSpokes; i++) {
        const templateType = spokeTemplates[(spokePosition - 1) % spokeTemplates.length];

        spokes.push({
          platform: platformConfig.platform,
          template_type: templateType,
          is_hub: false,
          spoke_position: spokePosition,
          use_thread: platformConfig.platform === 'twitter' && templateType === 'tip_series',
          use_carousel: platformConfig.platform === 'instagram' && templateType === 'tip_series'
        });

        spokePosition++;
      }
    }

    return spokes.slice(0, maxSpokes);
  }

  /**
   * Sort EAVs by priority (UNIQUE > RARE > ROOT > COMMON)
   */
  private sortEAVsByPriority(
    eavs: Array<{
      entity: string;
      attribute: string;
      value: string;
      category: 'UNIQUE' | 'RARE' | 'ROOT' | 'COMMON';
    }>
  ): PostEAVTriple[] {
    return [...eavs]
      .map(e => ({
        entity: e.entity,
        attribute: e.attribute,
        value: e.value,
        category: e.category
      }))
      .sort((a, b) => {
        const priorityA = EAV_PRIORITY[a.category || 'COMMON'] || 4;
        const priorityB = EAV_PRIORITY[b.category || 'COMMON'] || 4;
        return priorityA - priorityB;
      });
  }

  /**
   * Assign EAVs to spoke posts
   * Each spoke gets a unique EAV when possible
   */
  private assignEAVsToSpokes(
    spokes: PlannedPost[],
    sortedEAVs: PostEAVTriple[]
  ): Map<number, PostEAVTriple> {
    const assignments = new Map<number, PostEAVTriple>();
    const usedEAVs = new Set<string>();

    for (const spoke of spokes) {
      if (!spoke.spoke_position) continue;

      // Find next unused EAV
      for (const eav of sortedEAVs) {
        const eavKey = `${eav.entity}:${eav.attribute}`;

        if (!usedEAVs.has(eavKey)) {
          assignments.set(spoke.spoke_position, eav);
          usedEAVs.add(eavKey);

          // Also assign to the spoke object
          spoke.assigned_eav = eav;
          break;
        }
      }
    }

    return assignments;
  }

  /**
   * Get optimal platform distribution for a given number of posts
   */
  getOptimalDistribution(
    platforms: SocialMediaPlatform[],
    totalPosts: number
  ): Record<SocialMediaPlatform, number> {
    const distribution: Record<string, number> = {};

    // Priority order for platforms
    const priorityOrder: SocialMediaPlatform[] = [
      'linkedin',   // Professional, high engagement
      'twitter',    // Real-time, threads
      'instagram',  // Visual, carousels
      'facebook',   // Community
      'pinterest'   // Evergreen
    ];

    // Filter to enabled platforms in priority order
    const orderedPlatforms = priorityOrder.filter(p => platforms.includes(p));

    // Distribute posts
    let remaining = totalPosts;
    let platformIndex = 0;

    while (remaining > 0 && orderedPlatforms.length > 0) {
      const platform = orderedPlatforms[platformIndex % orderedPlatforms.length];
      distribution[platform] = (distribution[platform] || 0) + 1;
      remaining--;
      platformIndex++;
    }

    return distribution;
  }

  /**
   * Validate a hub-spoke plan
   */
  validatePlan(plan: HubSpokePlan): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Must have hub
    if (!plan.hub) {
      issues.push('Plan must have a hub post');
    }

    // Check EAV coverage
    if (plan.spokes.length > 0 && plan.eav_assignments.size === 0) {
      issues.push('No EAVs assigned to spoke posts - content may lack semantic depth');
    }

    // Check for duplicate platforms without variety
    const platformCounts = new Map<SocialMediaPlatform, number>();
    for (const spoke of plan.spokes) {
      const count = platformCounts.get(spoke.platform) || 0;
      platformCounts.set(spoke.platform, count + 1);
    }

    for (const [platform, count] of platformCounts) {
      if (count > 3) {
        issues.push(`Platform ${platform} has ${count} posts - consider diversifying`);
      }
    }

    // Check spoke positions are sequential
    const positions = plan.spokes
      .map(s => s.spoke_position)
      .filter((p): p is number => p !== undefined)
      .sort((a, b) => a - b);

    for (let i = 0; i < positions.length; i++) {
      if (positions[i] !== i + 1) {
        issues.push('Spoke positions should be sequential starting from 1');
        break;
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Calculate semantic coverage of a plan
   */
  calculateCoverage(
    plan: HubSpokePlan,
    totalAvailableEAVs: number
  ): {
    eav_coverage_percent: number;
    platform_diversity: number;
    unique_eavs_used: number;
  } {
    const uniqueEAVs = plan.eav_assignments.size;
    const uniquePlatforms = plan.platforms_covered.length;
    const maxPlatforms = 5;

    return {
      eav_coverage_percent: totalAvailableEAVs > 0
        ? Math.round((uniqueEAVs / totalAvailableEAVs) * 100)
        : 0,
      platform_diversity: Math.round((uniquePlatforms / maxPlatforms) * 100),
      unique_eavs_used: uniqueEAVs
    };
  }

  /**
   * Suggest improvements to a plan
   */
  suggestImprovements(
    plan: HubSpokePlan,
    source: ArticleTransformationSource
  ): string[] {
    const suggestions: string[] = [];

    // Check EAV utilization
    const unusedEAVs = source.contextual_vectors.length - plan.eav_assignments.size;
    if (unusedEAVs > 0 && plan.spokes.length < this.maxSpokes) {
      suggestions.push(`Add ${Math.min(unusedEAVs, this.maxSpokes - plan.spokes.length)} more spoke posts to cover more EAVs`);
    }

    // Check platform diversity
    if (plan.platforms_covered.length < 3) {
      const missing = ['linkedin', 'twitter', 'instagram', 'facebook', 'pinterest']
        .filter(p => !plan.platforms_covered.includes(p as SocialMediaPlatform))
        .slice(0, 2);

      if (missing.length > 0) {
        suggestions.push(`Consider adding posts for: ${missing.join(', ')}`);
      }
    }

    // Check for thread/carousel opportunities
    if (!plan.spokes.some(s => s.use_thread) && source.key_takeaways.length >= 3) {
      suggestions.push('Consider a Twitter thread to cover multiple key takeaways');
    }

    if (!plan.spokes.some(s => s.use_carousel) && source.key_takeaways.length >= 3) {
      suggestions.push('Consider an Instagram carousel for visual storytelling');
    }

    return suggestions;
  }
}

// Export singleton instance
export const hubSpokeOrchestrator = new HubSpokeOrchestrator();
