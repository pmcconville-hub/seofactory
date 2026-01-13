/**
 * Market Pattern Aggregator Service
 *
 * Aggregates patterns across multiple competitor extractions to derive
 * market benchmarks and content specifications for brief generation.
 *
 * Features:
 * - Quality scoring based on sample size
 * - Root/rare/unique attribute classification (70%+, 20-69%, <20%)
 * - Graceful fallbacks when data is insufficient
 * - Warning system for user notification
 *
 * Created: January 2026
 *
 * @module services/marketPatternAggregator
 */

import {
  ComprehensiveExtraction,
  ExtractionResult,
  isSuccessfulExtraction,
  MarketPatterns,
  ContentBenchmarks,
  StructureBenchmarks,
  VisualBenchmarks,
  TechnicalBenchmarks,
  SemanticBenchmarks,
  createDefaultMarketPatterns,
  ClassifiedSemanticTriple,
} from '../types/competitiveIntelligence';

// =============================================================================
// MAIN AGGREGATION FUNCTION
// =============================================================================

/**
 * Aggregate market patterns from multiple competitor extractions
 */
export function aggregateMarketPatterns(
  extractions: ExtractionResult[],
  totalRequested: number
): MarketPatterns {
  const warnings: string[] = [];

  // Filter successful extractions
  const successful = extractions.filter(isSuccessfulExtraction);
  const failed = extractions.length - successful.length;

  // Quality scoring based on sample size
  const dataQuality = calculateDataQuality(successful.length, totalRequested, warnings);

  // If no successful extractions, return defaults
  if (successful.length === 0) {
    return createDefaultMarketPatterns([
      `All ${failed} competitor extractions failed`,
      ...warnings,
    ]);
  }

  // Aggregate each category
  const content = aggregateContentBenchmarks(successful, warnings);
  const structure = aggregateStructureBenchmarks(successful, warnings);
  const visuals = aggregateVisualBenchmarks(successful, warnings);
  const technical = aggregateTechnicalBenchmarks(successful, warnings);
  const semantic = aggregateSemanticBenchmarks(successful, warnings);

  return {
    competitorsAnalyzed: successful.length,
    competitorsFailed: failed,
    totalRequested,
    dataQuality,
    analyzedAt: new Date(),
    warnings,

    content,
    structure,
    visuals,
    technical,
    semantic,
  };
}

// =============================================================================
// QUALITY SCORING
// =============================================================================

function calculateDataQuality(
  successCount: number,
  totalRequested: number,
  warnings: string[]
): MarketPatterns['dataQuality'] {
  if (successCount === 0) {
    warnings.push('No competitors could be analyzed - using default values');
    return 'none';
  }

  const successRate = successCount / Math.max(totalRequested, 1);

  if (successCount >= 5 && successRate >= 0.7) {
    return 'high';
  }

  if (successCount >= 3 && successRate >= 0.5) {
    warnings.push(`Only ${successCount}/${totalRequested} competitors analyzed - patterns may be less accurate`);
    return 'medium';
  }

  warnings.push(`Only ${successCount} competitor(s) analyzed - using limited data`);
  return 'low';
}

// =============================================================================
// CONTENT BENCHMARKS AGGREGATION
// =============================================================================

function aggregateContentBenchmarks(
  extractions: ComprehensiveExtraction[],
  warnings: string[]
): ContentBenchmarks {
  // Collect word counts
  const wordCounts = extractions.map(e => e.content.wordCount);
  const avgWordCount = Math.round(average(wordCounts));
  const minWordCount = Math.min(...wordCounts);
  const maxWordCount = Math.max(...wordCounts);

  // Word count confidence based on source
  const htmlSources = extractions.filter(e => e.content.wordCountSource === 'html').length;
  const wordCountConfidence: ContentBenchmarks['wordCountConfidence'] =
    htmlSources >= extractions.length * 0.7 ? 'high' :
    htmlSources >= extractions.length * 0.4 ? 'medium' : 'low';

  if (wordCountConfidence !== 'high') {
    warnings.push(`Word count confidence: ${wordCountConfidence} (${htmlSources}/${extractions.length} from HTML)`);
  }

  // Calculate recommended word count (aim for slightly above average)
  const recommendedWordCount = Math.round(avgWordCount * 1.1);

  // Paragraph and heading counts
  const avgParagraphs = Math.round(average(extractions.map(e => e.content.paragraphCount)));
  const avgHeadings = Math.round(average(extractions.map(e => e.structure.h2Count + e.structure.h3Count)));
  const avgSentenceLength = Math.round(average(extractions.map(e => e.content.avgSentenceLength)));

  // Audience level distribution
  const audienceLevelDistribution: Record<string, number> = {};
  for (const e of extractions) {
    const level = e.content.audienceLevel;
    audienceLevelDistribution[level] = (audienceLevelDistribution[level] || 0) + 1;
  }

  // Convert to percentages
  for (const level of Object.keys(audienceLevelDistribution)) {
    audienceLevelDistribution[level] = Math.round(
      (audienceLevelDistribution[level] / extractions.length) * 100
    );
  }

  // Find dominant audience level
  const dominantAudienceLevel = Object.entries(audienceLevelDistribution)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'intermediate';

  return {
    avgWordCount,
    wordCountRange: { min: minWordCount, max: maxWordCount },
    recommendedWordCount,
    wordCountConfidence,
    avgParagraphs,
    avgHeadings,
    avgSentenceLength,
    audienceLevelDistribution,
    dominantAudienceLevel,
  };
}

// =============================================================================
// STRUCTURE BENCHMARKS AGGREGATION
// =============================================================================

function aggregateStructureBenchmarks(
  extractions: ComprehensiveExtraction[],
  warnings: string[]
): StructureBenchmarks {
  // Heading pattern frequency
  const patternCounts: Record<string, number> = {};
  for (const e of extractions) {
    const pattern = e.structure.headingPattern;
    patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
  }

  const commonHeadingPatterns = Object.entries(patternCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([pattern]) => pattern);

  // Average heading counts
  const avgH2Count = Math.round(average(extractions.map(e => e.structure.h2Count)));
  const avgH3Count = Math.round(average(extractions.map(e => e.structure.h3Count)));

  // TOC and FAQ percentages
  const hasTocCount = extractions.filter(e => e.structure.hasTableOfContents).length;
  const hasTocPercentage = Math.round((hasTocCount / extractions.length) * 100);

  const hasFaqCount = extractions.filter(e => e.structure.hasFaq).length;
  const hasFaqPercentage = Math.round((hasFaqCount / extractions.length) * 100);

  // Dominant content template
  const templateCounts: Record<string, number> = {};
  for (const e of extractions) {
    const template = e.structure.contentTemplate;
    templateCounts[template] = (templateCounts[template] || 0) + 1;
  }

  const dominantContentTemplate = Object.entries(templateCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'guide';

  return {
    commonHeadingPatterns,
    avgH2Count,
    avgH3Count,
    hasTocPercentage,
    hasFaqPercentage,
    dominantContentTemplate,
  };
}

// =============================================================================
// VISUAL BENCHMARKS AGGREGATION
// =============================================================================

function aggregateVisualBenchmarks(
  extractions: ComprehensiveExtraction[],
  warnings: string[]
): VisualBenchmarks {
  // Image counts
  const imageCounts = extractions.map(e => e.visuals.imageCount);
  const avgImageCount = Math.round(average(imageCounts));
  const minImageCount = Math.min(...imageCounts);
  const maxImageCount = Math.max(...imageCounts);

  // Recommended: aim for above average but reasonable
  const recommendedImageCount = Math.min(Math.max(avgImageCount + 2, 5), 15);

  // Video percentage
  const hasVideoCount = extractions.filter(e => e.visuals.hasVideo).length;
  const hasVideoPercentage = Math.round((hasVideoCount / extractions.length) * 100);

  // Average table count
  const avgTableCount = Math.round(average(extractions.map(e => e.visuals.tableCount)));

  // Common image types
  const typeCounts: Record<string, number> = {};
  for (const e of extractions) {
    for (const img of e.visuals.images) {
      typeCounts[img.type] = (typeCounts[img.type] || 0) + 1;
    }
  }

  const commonImageTypes = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type]) => type)
    .filter(type => type !== 'unknown');

  return {
    avgImageCount,
    imageCountRange: { min: minImageCount, max: maxImageCount },
    recommendedImageCount,
    hasVideoPercentage,
    avgTableCount,
    commonImageTypes,
  };
}

// =============================================================================
// TECHNICAL BENCHMARKS AGGREGATION
// =============================================================================

function aggregateTechnicalBenchmarks(
  extractions: ComprehensiveExtraction[],
  warnings: string[]
): TechnicalBenchmarks {
  // Schema type frequency
  const schemaTypeCounts: Record<string, number> = {};
  for (const e of extractions) {
    for (const schemaType of e.technical.schemaTypes) {
      schemaTypeCounts[schemaType] = (schemaTypeCounts[schemaType] || 0) + 1;
    }
  }

  const commonSchemaTypes = Object.entries(schemaTypeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type]) => type);

  // Schema presence percentage
  const hasSchemaCount = extractions.filter(e => e.technical.schemaTypes.length > 0).length;
  const schemaPresencePercentage = Math.round((hasSchemaCount / extractions.length) * 100);

  // About mentions percentage
  const hasAboutCount = extractions.filter(e => e.technical.hasAboutMentions).length;
  const hasAboutMentionsPercentage = Math.round((hasAboutCount / extractions.length) * 100);

  // Recommended schema types (at least Article, plus any common types)
  const recommendedSchemaTypes = ['Article', ...commonSchemaTypes.slice(0, 2)]
    .filter((type, index, self) => self.indexOf(type) === index);

  return {
    commonSchemaTypes,
    schemaPresencePercentage,
    hasAboutMentionsPercentage,
    recommendedSchemaTypes,
  };
}

// =============================================================================
// SEMANTIC BENCHMARKS AGGREGATION
// =============================================================================

function aggregateSemanticBenchmarks(
  extractions: ComprehensiveExtraction[],
  warnings: string[]
): SemanticBenchmarks {
  // Collect all topics/attributes from all extractions
  const attributeFrequency: Map<string, number> = new Map();
  const allTopics: string[] = [];

  for (const e of extractions) {
    // Collect EAV attributes (using predicate.relation as the attribute)
    for (const triple of e.semantic.eavTriples) {
      const attr = triple.predicate.relation.toLowerCase();
      attributeFrequency.set(attr, (attributeFrequency.get(attr) || 0) + 1);
    }

    // Collect discussed topics
    for (const topic of e.semantic.topicsDiscussed) {
      const normalizedTopic = topic.toLowerCase();
      if (!allTopics.includes(normalizedTopic)) {
        allTopics.push(normalizedTopic);
      }
      attributeFrequency.set(normalizedTopic, (attributeFrequency.get(normalizedTopic) || 0) + 1);
    }
  }

  const totalCompetitors = extractions.length;

  // Classify attributes by coverage
  const rootAttributes: { attribute: string; coverage: number }[] = [];
  const rareAttributes: { attribute: string; coverage: number }[] = [];
  const uniqueOpportunities: string[] = [];

  for (const [attribute, count] of attributeFrequency.entries()) {
    const coverage = Math.round((count / totalCompetitors) * 100);

    if (coverage >= 70) {
      // Root: 70%+ coverage (definitional, expected)
      rootAttributes.push({ attribute, coverage });
    } else if (coverage >= 20) {
      // Rare: 20-69% coverage (authority signal)
      rareAttributes.push({ attribute, coverage });
    } else {
      // Unique: <20% coverage (differentiation opportunity)
      uniqueOpportunities.push(attribute);
    }
  }

  // Sort by coverage
  rootAttributes.sort((a, b) => b.coverage - a.coverage);
  rareAttributes.sort((a, b) => b.coverage - a.coverage);

  // Required topics: attributes that are root (must have)
  const requiredTopics = rootAttributes.slice(0, 10).map(a => a.attribute);

  // Differentiation topics: rare attributes that could set us apart
  const differentiationTopics = [
    ...rareAttributes.slice(0, 5).map(a => a.attribute),
    ...uniqueOpportunities.slice(0, 5),
  ];

  // Add warning if semantic data is thin
  if (rootAttributes.length === 0 && rareAttributes.length === 0) {
    warnings.push('Limited semantic data - using heading-based topic proxy');
  }

  return {
    rootAttributes: rootAttributes.slice(0, 15),
    rareAttributes: rareAttributes.slice(0, 15),
    uniqueOpportunities: uniqueOpportunities.slice(0, 10),
    requiredTopics,
    differentiationTopics,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate average of numbers array
 */
function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

/**
 * Calculate median of numbers array
 */
function median(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculate standard deviation
 */
function standardDeviation(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const avg = average(numbers);
  const squareDiffs = numbers.map(n => Math.pow(n - avg, 2));
  return Math.sqrt(average(squareDiffs));
}

// =============================================================================
// PATTERN COMPARISON UTILITIES
// =============================================================================

/**
 * Compare our content against market patterns
 */
export function compareToMarket(
  ourMetrics: {
    wordCount: number;
    imageCount: number;
    h2Count: number;
    schemaTypes: string[];
    topics: string[];
  },
  market: MarketPatterns
): {
  wordCountGap: number;
  wordCountStatus: 'below' | 'at' | 'above';
  imageGap: number;
  imageStatus: 'below' | 'at' | 'above';
  headingGap: number;
  missingTopics: string[];
  differentiationOpportunities: string[];
  recommendations: string[];
} {
  const recommendations: string[] = [];

  // Word count comparison
  const wordCountGap = market.content.recommendedWordCount - ourMetrics.wordCount;
  let wordCountStatus: 'below' | 'at' | 'above' = 'at';
  if (wordCountGap > 300) {
    wordCountStatus = 'below';
    recommendations.push(`Increase word count by ~${wordCountGap} words to match competitors`);
  } else if (wordCountGap < -500) {
    wordCountStatus = 'above';
    recommendations.push('Content is longer than competitors - ensure quality over quantity');
  }

  // Image comparison
  const imageGap = market.visuals.recommendedImageCount - ourMetrics.imageCount;
  let imageStatus: 'below' | 'at' | 'above' = 'at';
  if (imageGap > 2) {
    imageStatus = 'below';
    recommendations.push(`Add ${imageGap} more images to match competitors`);
  } else if (imageGap < -3) {
    imageStatus = 'above';
  }

  // Heading comparison
  const headingGap = market.structure.avgH2Count - ourMetrics.h2Count;
  if (headingGap > 2) {
    recommendations.push(`Add ${headingGap} more H2 sections to match structure`);
  }

  // Topic coverage
  const ourTopicsLower = ourMetrics.topics.map(t => t.toLowerCase());
  const missingTopics = market.semantic.requiredTopics
    .filter(topic => !ourTopicsLower.includes(topic.toLowerCase()));

  if (missingTopics.length > 0) {
    recommendations.push(`Cover missing required topics: ${missingTopics.slice(0, 3).join(', ')}`);
  }

  // Differentiation opportunities
  const differentiationOpportunities = market.semantic.differentiationTopics
    .filter(topic => !ourTopicsLower.includes(topic.toLowerCase()));

  if (differentiationOpportunities.length > 0) {
    recommendations.push(`Stand out by covering: ${differentiationOpportunities.slice(0, 3).join(', ')}`);
  }

  return {
    wordCountGap,
    wordCountStatus,
    imageGap,
    imageStatus,
    headingGap,
    missingTopics,
    differentiationOpportunities,
    recommendations,
  };
}

/**
 * Generate content specifications from market patterns
 */
export function generateContentSpecs(market: MarketPatterns): {
  targetWordCount: { min: number; target: number; max: number };
  targetImageCount: { min: number; target: number; max: number };
  targetH2Count: { min: number; target: number };
  requiredSchemaTypes: string[];
  requiredTopics: string[];
  differentiationTopics: string[];
  contentTemplate: string;
  audienceLevel: string;
  warnings: string[];
} {
  return {
    targetWordCount: {
      min: Math.round(market.content.avgWordCount * 0.8),
      target: market.content.recommendedWordCount,
      max: Math.round(market.content.avgWordCount * 1.5),
    },
    targetImageCount: {
      min: Math.max(market.visuals.imageCountRange.min, 3),
      target: market.visuals.recommendedImageCount,
      max: Math.min(market.visuals.imageCountRange.max + 2, 20),
    },
    targetH2Count: {
      min: Math.max(market.structure.avgH2Count - 2, 4),
      target: market.structure.avgH2Count + 1,
    },
    requiredSchemaTypes: market.technical.recommendedSchemaTypes,
    requiredTopics: market.semantic.requiredTopics,
    differentiationTopics: market.semantic.differentiationTopics,
    contentTemplate: market.structure.dominantContentTemplate,
    audienceLevel: market.content.dominantAudienceLevel,
    warnings: market.warnings,
  };
}
