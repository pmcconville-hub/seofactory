/**
 * Auto Template Selector
 *
 * Enhances template selection using historical performance data.
 * Combines AI routing with learned performance metrics to recommend
 * the best template for a given context.
 *
 * Created: 2026-01-18 - Content Template Routing Task 25
 *
 * @module services/ai/contentGeneration/autoTemplateSelector
 */

import { selectTemplate } from './templateRouter';
import { getTemplatePerformanceStats, TemplateStats } from '../../templateAnalyticsService';
import { TemplateName, TemplateSelectionResult, TemplateRouterInput, TemplateConfig } from '../../../types/contentTemplates';
import { getTemplateByName } from '../../../config/contentTemplates';
import { WebsiteType } from '../../../types';

// =============================================================================
// Types
// =============================================================================

export interface AutoSelectionInput extends TemplateRouterInput {
  /** Use historical performance data */
  useHistoricalData?: boolean;
  /** Minimum sample size to consider historical data */
  minSampleSize?: number;
  /** Weight for historical score vs AI confidence (0-1) */
  historicalWeight?: number;
}

export interface AutoSelectionResult extends TemplateSelectionResult {
  /** Whether historical data influenced the selection */
  usedHistoricalData: boolean;
  /** Historical performance metrics if available */
  historicalMetrics?: {
    sampleSize: number;
    avgAuditScore: number;
    avgComplianceScore: number;
  };
  /** Combined confidence (AI + historical) */
  combinedConfidence: number;
}

interface TemplateScore {
  template: TemplateName;
  aiScore: number;
  historicalScore: number;
  combinedScore: number;
  sampleSize: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_MIN_SAMPLE_SIZE = 5;
const DEFAULT_HISTORICAL_WEIGHT = 0.3; // 30% historical, 70% AI
const PERFORMANCE_SCORE_WEIGHT = 0.6; // Audit score weight
const COMPLIANCE_SCORE_WEIGHT = 0.4; // Compliance score weight

// =============================================================================
// Main Function
// =============================================================================

/**
 * Select template using AI routing enhanced with historical performance
 *
 * Combines the deterministic AI routing with learned performance metrics
 * to provide better template recommendations over time.
 *
 * @param input - Selection input including context and options
 * @returns Enhanced selection result with historical data influence
 */
export async function autoSelectTemplate(
  input: AutoSelectionInput
): Promise<AutoSelectionResult> {
  const {
    useHistoricalData = true,
    minSampleSize = DEFAULT_MIN_SAMPLE_SIZE,
    historicalWeight = DEFAULT_HISTORICAL_WEIGHT,
    ...routerInput
  } = input;

  // Get base AI recommendation
  const aiResult = selectTemplate(routerInput);

  // If historical data is disabled, return AI result directly
  if (!useHistoricalData) {
    return {
      ...aiResult,
      usedHistoricalData: false,
      combinedConfidence: aiResult.confidence,
    };
  }

  // Fetch historical performance data
  let historicalStats: Record<string, TemplateStats> = {};
  try {
    const statsResult = await getTemplatePerformanceStats();
    if (statsResult.success) {
      historicalStats = statsResult.stats;
    }
  } catch (error) {
    console.warn('[AutoSelector] Failed to fetch historical stats:', error);
  }

  // If no historical data, return AI result
  if (Object.keys(historicalStats).length === 0) {
    return {
      ...aiResult,
      usedHistoricalData: false,
      combinedConfidence: aiResult.confidence,
    };
  }

  // Calculate combined scores for AI recommended template and alternatives
  const candidates = [
    aiResult.template.templateName,
    ...aiResult.alternatives.map((a) => a.templateName),
  ];

  const scores: TemplateScore[] = candidates.map((templateName) => {
    const aiScore = getAIScore(templateName, aiResult);
    const historical = historicalStats[templateName];
    const hasEnoughSamples = historical && historical.count >= minSampleSize;

    const historicalScore = hasEnoughSamples
      ? calculateHistoricalScore(historical)
      : 50; // Default neutral score

    const combinedScore = hasEnoughSamples
      ? aiScore * (1 - historicalWeight) + historicalScore * historicalWeight
      : aiScore;

    return {
      template: templateName,
      aiScore,
      historicalScore,
      combinedScore,
      sampleSize: historical?.count || 0,
    };
  });

  // Sort by combined score
  scores.sort((a, b) => b.combinedScore - a.combinedScore);
  const bestScore = scores[0];

  // Check if historical data changed the recommendation
  const aiWinner = aiResult.template.templateName;
  const combinedWinner = bestScore.template;
  const recommendationChanged = aiWinner !== combinedWinner;

  // Get the winning template's config
  const winningTemplate: TemplateConfig =
    combinedWinner === aiWinner
      ? aiResult.template
      : getTemplateByName(combinedWinner) || aiResult.template;

  // Build reasoning
  const reasoning = [...aiResult.reasoning];
  if (recommendationChanged) {
    const historical = historicalStats[combinedWinner];
    reasoning.unshift(
      `Historical data suggests ${combinedWinner} (${historical.count} samples, ${historical.avgAuditScore}% avg audit score)`
    );
  }

  // Build historical metrics if available
  const winnerStats = historicalStats[combinedWinner];
  const historicalMetrics = winnerStats && winnerStats.count >= minSampleSize
    ? {
        sampleSize: winnerStats.count,
        avgAuditScore: winnerStats.avgAuditScore,
        avgComplianceScore: winnerStats.avgComplianceScore,
      }
    : undefined;

  return {
    template: winningTemplate,
    confidence: Math.round(bestScore.combinedScore),
    reasoning,
    alternatives: aiResult.alternatives.filter(
      (a) => a.templateName !== combinedWinner
    ),
    usedHistoricalData: Object.keys(historicalStats).some(
      (k) => historicalStats[k].count >= minSampleSize
    ),
    historicalMetrics,
    combinedConfidence: Math.round(bestScore.combinedScore),
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get AI confidence score for a template
 *
 * Note: Alternatives don't have confidence scores, so we use a diminishing
 * confidence based on position in the alternatives array.
 */
function getAIScore(
  templateName: TemplateName,
  aiResult: TemplateSelectionResult
): number {
  if (templateName === aiResult.template.templateName) {
    return aiResult.confidence;
  }

  const alternativeIndex = aiResult.alternatives.findIndex(
    (a) => a.templateName === templateName
  );

  // Alternatives get lower scores based on position
  if (alternativeIndex >= 0) {
    // First alternative gets 70% of main confidence, second 60%, etc.
    const confidenceMultiplier = Math.max(0.4, 0.8 - alternativeIndex * 0.1);
    return Math.round(aiResult.confidence * confidenceMultiplier);
  }

  return 50; // Not found, neutral score
}

/**
 * Calculate historical performance score (0-100)
 */
function calculateHistoricalScore(stats: TemplateStats): number {
  // Combine audit score and compliance score
  const performanceScore =
    stats.avgAuditScore * PERFORMANCE_SCORE_WEIGHT +
    stats.avgComplianceScore * COMPLIANCE_SCORE_WEIGHT;

  // Penalize high override rates (users didn't like the recommendation)
  const overridePenalty = stats.overrideRate * 0.1;

  return Math.max(0, Math.min(100, performanceScore - overridePenalty));
}

/**
 * Get best template for a website type based on historical data
 *
 * Useful for getting quick recommendations without full context.
 *
 * @param websiteType - The website type to get recommendation for
 * @returns Best performing template for this website type
 */
export async function getBestTemplateForWebsiteType(
  websiteType: WebsiteType
): Promise<{ template: TemplateName; score: number } | null> {
  try {
    const statsResult = await getTemplatePerformanceStats();
    if (!statsResult.success || Object.keys(statsResult.stats).length === 0) {
      return null;
    }

    // Find template with highest historical score
    let bestTemplate: TemplateName | null = null;
    let bestScore = 0;

    for (const [name, stats] of Object.entries(statsResult.stats)) {
      if (stats.count < DEFAULT_MIN_SAMPLE_SIZE) continue;

      const score = calculateHistoricalScore(stats);
      if (score > bestScore) {
        bestScore = score;
        bestTemplate = name as TemplateName;
      }
    }

    if (!bestTemplate) return null;

    return { template: bestTemplate, score: bestScore };
  } catch (error) {
    console.error('[AutoSelector] Failed to get best template:', error);
    return null;
  }
}

/**
 * Get templates ranked by historical performance
 *
 * @param minSamples - Minimum sample size to include template
 * @returns Sorted array of templates with scores
 */
export async function getTemplatesRankedByPerformance(
  minSamples: number = DEFAULT_MIN_SAMPLE_SIZE
): Promise<Array<{ template: TemplateName; score: number; samples: number }>> {
  try {
    const statsResult = await getTemplatePerformanceStats();
    if (!statsResult.success) return [];

    const ranked = Object.entries(statsResult.stats)
      .filter(([, stats]) => stats.count >= minSamples)
      .map(([name, stats]) => ({
        template: name as TemplateName,
        score: calculateHistoricalScore(stats),
        samples: stats.count,
      }))
      .sort((a, b) => b.score - a.score);

    return ranked;
  } catch (error) {
    console.error('[AutoSelector] Failed to rank templates:', error);
    return [];
  }
}
