/**
 * Competitor Template Analyzer
 *
 * Analyzes competitor content structure to recommend the best template.
 * Uses SERP analysis data to understand what content structures rank well
 * for similar queries.
 *
 * Created: 2026-01-18 - Content Template Routing Task 26
 *
 * @module services/ai/contentGeneration/competitorTemplateAnalyzer
 */

import { TemplateName, TemplateConfig } from '../../../types/contentTemplates';
import { CONTENT_TEMPLATES, getTemplateByName } from '../../../config/contentTemplates';
import { ContentBrief } from '../../../types';

// =============================================================================
// Types
// =============================================================================

export interface CompetitorMetrics {
  /** Average word count of top competitors */
  avgWordCount: number;
  /** Average number of sections/headings */
  avgSections: number;
  /** Average number of images */
  avgImages?: number;
  /** Average number of lists */
  avgLists?: number;
  /** Average number of tables */
  avgTables?: number;
  /** Common heading patterns found */
  commonHeadings?: string[];
  /** Whether competitors use FAQ sections */
  hasFaq?: boolean;
  /** Whether competitors use comparison tables */
  hasComparison?: boolean;
  /** Whether competitors use step-by-step guides */
  hasSteps?: boolean;
}

export interface CompetitorAnalysisInput {
  /** SERP competitor metrics */
  competitorMetrics: CompetitorMetrics;
  /** Query/topic being analyzed */
  query?: string;
  /** Search intent */
  searchIntent?: 'informational' | 'commercial' | 'transactional' | 'navigational';
  /** Existing brief for context */
  brief?: Partial<ContentBrief>;
}

export interface CompetitorTemplateRecommendation {
  /** Recommended template */
  template: TemplateName;
  /** Template configuration */
  config: TemplateConfig;
  /** Confidence score (0-100) */
  confidence: number;
  /** Reasoning for recommendation */
  reasoning: string[];
  /** Suggested content length based on competitors */
  suggestedWordCount: {
    min: number;
    max: number;
  };
  /** Suggested section count */
  suggestedSections: {
    min: number;
    max: number;
  };
  /** Content elements to include based on competitor analysis */
  suggestedElements: {
    includeFaq: boolean;
    includeComparison: boolean;
    includeSteps: boolean;
    includeTables: boolean;
    includeImages: number;
  };
}

// =============================================================================
// Pattern Detection
// =============================================================================

/**
 * Detect content patterns from competitor metrics and headings
 */
function detectContentPatterns(metrics: CompetitorMetrics): {
  isDefinitional: boolean;
  isHowTo: boolean;
  isComparison: boolean;
  isProduct: boolean;
  isList: boolean;
} {
  const headings = (metrics.commonHeadings || []).map((h) => h.toLowerCase());

  // Check heading patterns
  const hasWhatIs = headings.some((h) => h.includes('what is') || h.includes('what are'));
  const hasHowTo = headings.some(
    (h) => h.includes('how to') || h.includes('steps') || h.includes('guide')
  );
  const hasVs = headings.some(
    (h) => h.includes(' vs ') || h.includes('comparison') || h.includes('compared')
  );
  const hasProduct = headings.some(
    (h) =>
      h.includes('price') ||
      h.includes('features') ||
      h.includes('specifications') ||
      h.includes('buy')
  );
  const hasList = headings.some(
    (h) => h.includes('best') || h.includes('top') || /\d+\s+(best|top|ways)/.test(h)
  );

  return {
    isDefinitional: hasWhatIs || (!hasHowTo && !hasVs && !hasProduct),
    isHowTo: hasHowTo || metrics.hasSteps || false,
    isComparison: hasVs || metrics.hasComparison || false,
    isProduct: hasProduct,
    isList: hasList,
  };
}

/**
 * Map detected patterns to template scores
 */
function scoreTemplatesFromPatterns(
  patterns: ReturnType<typeof detectContentPatterns>,
  metrics: CompetitorMetrics,
  intent?: string
): Map<TemplateName, number> {
  const scores = new Map<TemplateName, number>();

  // Initialize all templates with base score
  Object.keys(CONTENT_TEMPLATES).forEach((name) => {
    scores.set(name as TemplateName, 50);
  });

  // Boost scores based on patterns
  if (patterns.isDefinitional) {
    scores.set('DEFINITIONAL', (scores.get('DEFINITIONAL') || 0) + 30);
  }

  if (patterns.isHowTo) {
    scores.set('PROCESS_HOWTO', (scores.get('PROCESS_HOWTO') || 0) + 35);
  }

  if (patterns.isComparison) {
    scores.set('COMPARISON', (scores.get('COMPARISON') || 0) + 35);
  }

  if (patterns.isProduct) {
    scores.set('ECOMMERCE_PRODUCT', (scores.get('ECOMMERCE_PRODUCT') || 0) + 30);
    scores.set('SAAS_FEATURE', (scores.get('SAAS_FEATURE') || 0) + 20);
  }

  if (patterns.isList) {
    scores.set('LISTING_DIRECTORY', (scores.get('LISTING_DIRECTORY') || 0) + 25);
  }

  // Adjust based on content metrics
  if ((metrics.avgTables || 0) > 1) {
    scores.set('COMPARISON', (scores.get('COMPARISON') || 0) + 15);
    scores.set('ECOMMERCE_PRODUCT', (scores.get('ECOMMERCE_PRODUCT') || 0) + 10);
  }

  if (metrics.hasFaq) {
    scores.set('DEFINITIONAL', (scores.get('DEFINITIONAL') || 0) + 10);
    scores.set('HEALTHCARE_YMYL', (scores.get('HEALTHCARE_YMYL') || 0) + 10);
  }

  // Adjust based on search intent
  if (intent === 'commercial' || intent === 'transactional') {
    scores.set('ECOMMERCE_PRODUCT', (scores.get('ECOMMERCE_PRODUCT') || 0) + 20);
    scores.set('COMPARISON', (scores.get('COMPARISON') || 0) + 15);
  }

  if (intent === 'informational') {
    scores.set('DEFINITIONAL', (scores.get('DEFINITIONAL') || 0) + 15);
    scores.set('PROCESS_HOWTO', (scores.get('PROCESS_HOWTO') || 0) + 10);
  }

  return scores;
}

// =============================================================================
// Main Function
// =============================================================================

/**
 * Analyze competitor content to recommend the best template
 *
 * Uses SERP competitor metrics to understand what content structures
 * are ranking well and recommends a template that matches.
 *
 * @param input - Competitor analysis input
 * @returns Template recommendation with reasoning
 */
export function analyzeCompetitorsForTemplate(
  input: CompetitorAnalysisInput
): CompetitorTemplateRecommendation {
  const { competitorMetrics, searchIntent, brief } = input;

  // Detect content patterns
  const patterns = detectContentPatterns(competitorMetrics);

  // Score templates based on patterns
  const scores = scoreTemplatesFromPatterns(patterns, competitorMetrics, searchIntent);

  // Find best template
  let bestTemplate: TemplateName = 'DEFINITIONAL';
  let bestScore = 0;

  scores.forEach((score, template) => {
    if (score > bestScore) {
      bestScore = score;
      bestTemplate = template;
    }
  });

  const config = getTemplateByName(bestTemplate)!;

  // Build reasoning
  const reasoning: string[] = [];
  const selectedTemplate = bestTemplate as string; // Avoid type narrowing issues

  if (patterns.isDefinitional && selectedTemplate === 'DEFINITIONAL') {
    reasoning.push('Competitors use definitional content structure');
  }
  if (patterns.isHowTo && selectedTemplate === 'PROCESS_HOWTO') {
    reasoning.push('Competitors use step-by-step guide format');
  }
  if (patterns.isComparison && selectedTemplate === 'COMPARISON') {
    reasoning.push('Competitors use comparison tables and vs. content');
  }
  if (patterns.isProduct && (selectedTemplate === 'ECOMMERCE_PRODUCT' || selectedTemplate === 'SAAS_FEATURE')) {
    reasoning.push('Competitors focus on product features and specifications');
  }

  reasoning.push(
    `Competitors average ${competitorMetrics.avgWordCount} words and ${competitorMetrics.avgSections} sections`
  );

  if (competitorMetrics.hasFaq) {
    reasoning.push('FAQ sections are common among competitors');
  }
  if ((competitorMetrics.avgTables || 0) > 0) {
    reasoning.push('Competitors frequently use tables for data presentation');
  }

  // Calculate suggested content specs
  const wordBuffer = 0.2; // 20% buffer
  const suggestedWordCount = {
    min: Math.round(competitorMetrics.avgWordCount * (1 - wordBuffer)),
    max: Math.round(competitorMetrics.avgWordCount * (1 + wordBuffer)),
  };

  const suggestedSections = {
    min: Math.max(config.minSections, Math.floor(competitorMetrics.avgSections * 0.8)),
    max: Math.min(config.maxSections, Math.ceil(competitorMetrics.avgSections * 1.2)),
  };

  // Suggested elements
  const suggestedElements = {
    includeFaq: competitorMetrics.hasFaq || false,
    includeComparison: competitorMetrics.hasComparison || patterns.isComparison,
    includeSteps: competitorMetrics.hasSteps || patterns.isHowTo,
    includeTables: (competitorMetrics.avgTables || 0) > 0,
    includeImages: competitorMetrics.avgImages || 2,
  };

  // Normalize confidence to 0-100
  const confidence = Math.min(100, Math.max(0, bestScore));

  return {
    template: bestTemplate,
    config,
    confidence,
    reasoning,
    suggestedWordCount,
    suggestedSections,
    suggestedElements,
  };
}

/**
 * Quick competitor-based template check
 *
 * Returns whether the current template matches competitor patterns.
 *
 * @param currentTemplate - Currently selected template
 * @param competitorMetrics - SERP competitor metrics
 * @returns Match assessment
 */
export function assessTemplateCompetitorFit(
  currentTemplate: TemplateName,
  competitorMetrics: CompetitorMetrics
): {
  isGoodFit: boolean;
  fitScore: number;
  suggestion?: TemplateName;
  reason?: string;
} {
  const analysis = analyzeCompetitorsForTemplate({ competitorMetrics });

  if (analysis.template === currentTemplate) {
    return {
      isGoodFit: true,
      fitScore: analysis.confidence,
    };
  }

  // Check if current template is still reasonable (within 15 points)
  const patterns = detectContentPatterns(competitorMetrics);
  const scores = scoreTemplatesFromPatterns(patterns, competitorMetrics);
  const currentScore = scores.get(currentTemplate) || 50;

  if (analysis.confidence - currentScore < 15) {
    return {
      isGoodFit: true,
      fitScore: currentScore,
    };
  }

  return {
    isGoodFit: false,
    fitScore: currentScore,
    suggestion: analysis.template,
    reason: `Competitor analysis suggests ${analysis.template} may perform better (${analysis.reasoning[0]})`,
  };
}

/**
 * Extract competitor metrics from a brief's SERP analysis
 *
 * Helper to convert brief data to CompetitorMetrics format.
 *
 * @param brief - Content brief with SERP analysis
 * @returns Competitor metrics or defaults
 */
export function extractMetricsFromBrief(brief: Partial<ContentBrief>): CompetitorMetrics {
  const serpAnalysis = brief.serpAnalysis || {};
  const competitorHeadings = (serpAnalysis as any).competitorHeadings || [];

  return {
    avgWordCount: (brief as any).competitorMetrics?.avgWordCount || 1500,
    avgSections: (brief as any).competitorMetrics?.avgSections || 6,
    avgImages: (brief as any).competitorMetrics?.avgImages,
    avgLists: (brief as any).competitorMetrics?.avgLists,
    avgTables: (brief as any).competitorMetrics?.avgTables,
    commonHeadings: competitorHeadings,
    hasFaq: competitorHeadings.some(
      (h: string) => h.toLowerCase().includes('faq') || h.toLowerCase().includes('question')
    ),
    hasComparison: competitorHeadings.some((h: string) =>
      h.toLowerCase().includes('vs') || h.toLowerCase().includes('comparison')
    ),
    hasSteps: competitorHeadings.some(
      (h: string) =>
        h.toLowerCase().includes('step') ||
        h.toLowerCase().includes('how to') ||
        /^\d+\./.test(h)
    ),
  };
}
