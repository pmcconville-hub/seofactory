/**
 * Compliance Scorer Service
 *
 * Calculates overall semantic SEO compliance scores
 * for social posts and campaigns.
 */

import type {
  SocialPost,
  SocialCampaign,
  ComplianceCheckResult,
  PostComplianceReport,
  CampaignComplianceReport
} from '../../../types/social';
import { TARGET_COMPLIANCE_SCORE } from '../../../types/social';
import { entityConsistencyValidator } from './entityConsistencyValidator';
import { semanticDistanceCalculator } from './semanticDistanceCalculator';
import { eavExtractor } from './eavExtractor';

/**
 * Compliance rule weights
 */
const COMPLIANCE_WEIGHTS = {
  entity_consistency: 30,
  eav_architecture: 25,
  information_density: 20,
  semantic_distance: 15,
  hub_spoke_coverage: 10
};

/**
 * Information density thresholds
 */
const DENSITY_THRESHOLDS = {
  min_facts_per_100_chars: 2,
  max_filler_ratio: 0.15
};

/**
 * Compliance scorer for semantic SEO
 */
export class ComplianceScorer {
  /**
   * Score a single post
   */
  scorePost(
    post: SocialPost,
    expectedEntities: string[] = [],
    hubPost?: SocialPost
  ): PostComplianceReport {
    const checks: ComplianceCheckResult[] = [];

    // 1. Entity Consistency Check (30%)
    const entityResult = entityConsistencyValidator.validatePost(post, expectedEntities);
    checks.push({
      rule: 'Entity Consistency',
      passed: entityResult.score >= 70,
      score: Math.round(entityResult.score * 0.3),
      max_score: 30,
      message: entityResult.score >= 70
        ? `${entityResult.entities_found.length} entities mentioned consistently`
        : `Entity consistency issues: ${entityResult.issues.join('; ')}`,
      suggestions: entityResult.suggestions
    });

    // 2. EAV Architecture Check (25%)
    const eavCheck = this.checkEAVArchitecture(post);
    checks.push({
      rule: 'EAV Architecture',
      passed: eavCheck.score >= 70,
      score: Math.round(eavCheck.score * 0.25),
      max_score: 25,
      message: eavCheck.message,
      suggestions: eavCheck.suggestions
    });

    // 3. Information Density Check (20%)
    const densityCheck = this.checkInformationDensity(post);
    checks.push({
      rule: 'Information Density',
      passed: densityCheck.score >= 70,
      score: Math.round(densityCheck.score * 0.2),
      max_score: 20,
      message: densityCheck.message,
      suggestions: densityCheck.suggestions
    });

    // 4. Semantic Distance Check (15%) - only for spoke posts
    if (hubPost && !post.is_hub) {
      const distanceResult = semanticDistanceCalculator.calculateDistance(hubPost, post);
      const distanceScore = distanceResult.within_threshold ? 100 : (1 - distanceResult.distance) * 100;

      checks.push({
        rule: 'Semantic Distance',
        passed: distanceResult.within_threshold,
        score: Math.round(distanceScore * 0.15),
        max_score: 15,
        message: distanceResult.within_threshold
          ? `Distance ${distanceResult.distance} is within threshold`
          : `Distance ${distanceResult.distance} exceeds threshold`,
        suggestions: distanceResult.within_threshold
          ? []
          : ['Add shared entity mentions with hub post']
      });
    } else {
      // Hub posts get full semantic distance score
      checks.push({
        rule: 'Semantic Distance',
        passed: true,
        score: 15,
        max_score: 15,
        message: 'Hub post - semantic distance not applicable'
      });
    }

    // Calculate overall score
    const overallScore = checks.reduce((sum, check) => sum + check.score, 0);

    return {
      post_id: post.id,
      overall_score: overallScore,
      checks,
      entity_consistency: {
        score: entityResult.score,
        entities_found: entityResult.entities_found,
        ambiguous_pronouns: entityResult.ambiguous_pronouns
      },
      eav_architecture: {
        score: eavCheck.score,
        eav_count: post.eav_triple ? 1 : 0,
        eav_quality: post.eav_triple?.category || 'none'
      },
      information_density: {
        score: densityCheck.score,
        facts_per_100_chars: densityCheck.factsPerHundred,
        filler_word_ratio: densityCheck.fillerRatio,
        banned_phrases_found: densityCheck.bannedPhrases
      },
      semantic_distance: {
        score: hubPost && !post.is_hub
          ? (post.semantic_distance_from_hub
              ? (1 - post.semantic_distance_from_hub) * 100
              : 0)
          : 100,
        distance_from_hub: post.semantic_distance_from_hub || 0,
        within_threshold: !post.semantic_distance_from_hub || post.semantic_distance_from_hub <= 0.7
      }
    };
  }

  /**
   * Score an entire campaign
   */
  scoreCampaign(
    campaign: SocialCampaign,
    posts: SocialPost[],
    expectedEntities: string[] = []
  ): CampaignComplianceReport {
    const hubPost = posts.find(p => p.is_hub);
    const spokePosts = posts.filter(p => !p.is_hub);

    // Score each post
    const postReports: PostComplianceReport[] = [];
    for (const post of posts) {
      const report = this.scorePost(post, expectedEntities, hubPost);
      postReports.push(report);
    }

    // Calculate hub-spoke coverage score
    const coverageCheck = this.checkHubSpokeCoverage(campaign, posts);

    // Calculate cross-post entity consistency
    const campaignConsistency = entityConsistencyValidator.validateCampaign(
      campaign,
      posts,
      expectedEntities
    );

    // Calculate semantic distance analysis
    const distanceAnalysis = hubPost
      ? semanticDistanceCalculator.analyzeHubSpokeDistances(hubPost, spokePosts)
      : null;

    // Calculate overall score
    const avgPostScore = postReports.length > 0
      ? postReports.reduce((sum, r) => sum + r.overall_score, 0) / postReports.length
      : 0;

    // Weight: 60% individual post scores, 25% campaign consistency, 15% coverage
    const overallScore = Math.round(
      (avgPostScore * 0.6) +
      (campaignConsistency.score * 0.25) +
      (coverageCheck.score * 0.15)
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      overallScore,
      postReports,
      coverageCheck,
      campaignConsistency,
      distanceAnalysis
    );

    return {
      campaign_id: campaign.id,
      overall_score: overallScore,
      hub_spoke_coverage: {
        score: coverageCheck.score,
        has_hub: !!hubPost,
        spoke_count: spokePosts.length,
        eav_coverage: coverageCheck.eavCoverage
      },
      post_reports: postReports,
      recommendations
    };
  }

  /**
   * Check EAV architecture for a post
   */
  private checkEAVArchitecture(
    post: SocialPost
  ): {
    score: number;
    message: string;
    suggestions: string[];
  } {
    if (!post.eav_triple) {
      return {
        score: 50,
        message: 'No EAV triple assigned to this post',
        suggestions: ['Assign an EAV triple to communicate specific factual information']
      };
    }

    // Validate the EAV
    const validation = eavExtractor.validateForSocial(post.eav_triple);

    if (!validation.valid) {
      return {
        score: 60,
        message: `EAV has issues: ${validation.issues.join('; ')}`,
        suggestions: validation.suggestions
      };
    }

    // Score based on category
    const categoryScores: Record<string, number> = {
      'UNIQUE': 100,
      'RARE': 90,
      'ROOT': 75,
      'COMMON': 60
    };

    const score = categoryScores[post.eav_triple.category || 'COMMON'] || 60;

    return {
      score,
      message: `${post.eav_triple.category || 'COMMON'} EAV: "${post.eav_triple.entity} ${post.eav_triple.attribute}"`,
      suggestions: validation.suggestions
    };
  }

  /**
   * Check information density
   */
  private checkInformationDensity(
    post: SocialPost
  ): {
    score: number;
    message: string;
    suggestions: string[];
    factsPerHundred: number;
    fillerRatio: number;
    bannedPhrases: string[];
  } {
    const content = post.post_type === 'thread' && post.content_thread
      ? post.content_thread.map(t => t.text).join(' ')
      : post.content_text;

    // Count "facts" (sentences with specific information)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const factualSentences = sentences.filter(s => this.isFact(s));
    const factsPerHundred = content.length > 0
      ? (factualSentences.length / content.length) * 100
      : 0;

    // Calculate filler word ratio
    const words = content.toLowerCase().split(/\s+/);
    const fillerWords = ['very', 'really', 'just', 'actually', 'basically', 'simply', 'quite', 'rather'];
    const fillerCount = words.filter(w => fillerWords.includes(w)).length;
    const fillerRatio = words.length > 0 ? fillerCount / words.length : 0;

    // Find banned phrases
    const bannedPhrases = entityConsistencyValidator.validatePost(post, []).filler_phrases;

    // Calculate score
    let score = 100;

    // Penalty for low fact density
    if (factsPerHundred < DENSITY_THRESHOLDS.min_facts_per_100_chars) {
      score -= 20;
    }

    // Penalty for high filler ratio
    if (fillerRatio > DENSITY_THRESHOLDS.max_filler_ratio) {
      score -= Math.round((fillerRatio - DENSITY_THRESHOLDS.max_filler_ratio) * 100);
    }

    // Penalty for banned phrases
    score -= Math.min(bannedPhrases.length * 10, 30);

    const suggestions: string[] = [];

    if (factsPerHundred < DENSITY_THRESHOLDS.min_facts_per_100_chars) {
      suggestions.push('Add more specific facts, statistics, or concrete information');
    }

    if (fillerRatio > DENSITY_THRESHOLDS.max_filler_ratio) {
      suggestions.push('Remove filler words: very, really, just, actually, basically');
    }

    if (bannedPhrases.length > 0) {
      suggestions.push(`Remove banned phrases: ${bannedPhrases.slice(0, 2).join(', ')}`);
    }

    return {
      score: Math.max(0, score),
      message: score >= 70
        ? 'Information density is acceptable'
        : 'Low information density - add more facts, remove filler',
      suggestions,
      factsPerHundred: Math.round(factsPerHundred * 100) / 100,
      fillerRatio: Math.round(fillerRatio * 100) / 100,
      bannedPhrases
    };
  }

  /**
   * Check if a sentence contains factual information
   */
  private isFact(sentence: string): boolean {
    const s = sentence.trim().toLowerCase();

    // Contains numbers (statistics, dates, amounts)
    if (/\d+/.test(s)) return true;

    // Contains comparison words
    if (/\b(more|less|better|worse|faster|slower|higher|lower|greater)\b/.test(s)) return true;

    // Contains specific terms (not filler)
    if (/\b(because|therefore|results|shows|proves|indicates|means|causes)\b/.test(s)) return true;

    // Contains entity names (capitalized words mid-sentence)
    const words = sentence.split(/\s+/);
    for (let i = 1; i < words.length; i++) {
      if (/^[A-Z][a-z]+/.test(words[i])) return true;
    }

    return false;
  }

  /**
   * Check hub-spoke coverage
   */
  private checkHubSpokeCoverage(
    campaign: SocialCampaign,
    posts: SocialPost[]
  ): {
    score: number;
    eavCoverage: number;
    message: string;
  } {
    const hubPost = posts.find(p => p.is_hub);
    const spokePosts = posts.filter(p => !p.is_hub);

    let score = 100;

    // Must have a hub
    if (!hubPost) {
      score -= 30;
    }

    // Should have spokes
    if (spokePosts.length === 0) {
      score -= 20;
    } else if (spokePosts.length < 3) {
      score -= 10;
    }

    // Check EAV coverage (unique EAVs used)
    const usedEAVs = new Set(
      posts
        .filter(p => p.eav_triple)
        .map(p => `${p.eav_triple!.entity}:${p.eav_triple!.attribute}`)
    );
    const eavCoverage = Math.min(100, (usedEAVs.size / 7) * 100);  // Assume 7 ideal EAVs

    // Platform diversity
    const platforms = new Set(posts.map(p => p.platform));
    if (platforms.size < 2) {
      score -= 10;
    }

    const message = hubPost
      ? `Hub + ${spokePosts.length} spokes across ${platforms.size} platforms`
      : 'Missing hub post';

    return {
      score: Math.max(0, score),
      eavCoverage: Math.round(eavCoverage),
      message
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    overallScore: number,
    postReports: PostComplianceReport[],
    coverageCheck: { score: number; eavCoverage: number; message: string },
    consistency: { score: number; consistent_entities: string[]; inconsistent_entities: string[]; suggestions: string[] },
    distanceAnalysis: { average_distance: number; outliers: number[]; suggestions: string[] } | null
  ): string[] {
    const recommendations: string[] = [];

    // Overall score recommendation
    if (overallScore < TARGET_COMPLIANCE_SCORE) {
      recommendations.push(
        `Overall score ${overallScore} is below target ${TARGET_COMPLIANCE_SCORE} - review suggestions below`
      );
    }

    // Entity consistency recommendations
    if (consistency.inconsistent_entities.length > 0) {
      recommendations.push(
        `Inconsistent entities across posts: ${consistency.inconsistent_entities.join(', ')}`
      );
    }
    recommendations.push(...consistency.suggestions);

    // Coverage recommendations
    if (coverageCheck.eavCoverage < 50) {
      recommendations.push(
        `EAV coverage is ${coverageCheck.eavCoverage}% - consider adding more spoke posts with unique EAVs`
      );
    }

    // Semantic distance recommendations
    if (distanceAnalysis && distanceAnalysis.outliers.length > 0) {
      recommendations.push(
        `Spoke posts ${distanceAnalysis.outliers.join(', ')} are semantically distant - add shared entities`
      );
    }

    // Post-specific recommendations
    const lowScoringPosts = postReports.filter(r => r.overall_score < 70);
    if (lowScoringPosts.length > 0) {
      const postIds = lowScoringPosts.map(r => r.post_id.slice(0, 8)).join(', ');
      recommendations.push(
        `${lowScoringPosts.length} post(s) need attention (IDs: ${postIds}...)`
      );
    }

    return recommendations.slice(0, 7);  // Limit to 7 recommendations
  }

  /**
   * Get compliance status label
   */
  getComplianceStatus(score: number): {
    status: 'excellent' | 'good' | 'needs_work' | 'poor';
    label: string;
    color: string;
  } {
    if (score >= 90) {
      return { status: 'excellent', label: 'Excellent', color: 'green' };
    }
    if (score >= TARGET_COMPLIANCE_SCORE) {
      return { status: 'good', label: 'Good', color: 'blue' };
    }
    if (score >= 60) {
      return { status: 'needs_work', label: 'Needs Work', color: 'yellow' };
    }
    return { status: 'poor', label: 'Poor', color: 'red' };
  }
}

// Export singleton instance
export const complianceScorer = new ComplianceScorer();
