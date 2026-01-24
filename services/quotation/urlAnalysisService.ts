/**
 * URL Analysis Service for Quotation Tool
 *
 * Analyzes a potential client's website to gather data for SEO quote generation.
 * Combines internal crawl data with SERP visibility data.
 */

import {
  UrlAnalysisResult,
  CrawlData,
  SerpData,
  AnalysisRecommendation,
  SiteSize,
  ServiceCategory,
  CompetitionLevel,
  PriorityLevel,
} from '../../types/quotation';
import { ApifyPageData, BusinessInfo } from '../../types';
import { extractMultiplePagesTechnicalData } from '../apifyService';
import { analyzeSerpForTopic, SerpMode } from '../serpService';

// =============================================================================
// Configuration
// =============================================================================

export interface UrlAnalysisConfig {
  apifyToken?: string;
  jinaApiKey?: string;
  firecrawlApiKey?: string;
  serpMode?: SerpMode;
  maxPagesToAnalyze?: number;
  proxyConfig?: {
    supabaseUrl: string;
    supabaseAnonKey: string;
  };
}

export interface AnalysisProgress {
  phase: 'crawling' | 'serp_analysis' | 'recommendations' | 'complete';
  progress: number;
  message: string;
}

export type ProgressCallback = (progress: AnalysisProgress) => void;

// =============================================================================
// Site Size Determination
// =============================================================================

/**
 * Determine site size based on page count
 */
function determineSiteSize(pageCount: number): SiteSize {
  if (pageCount <= 50) return 'small';
  if (pageCount <= 250) return 'medium';
  if (pageCount <= 1000) return 'large';
  return 'enterprise';
}

/**
 * Calculate complexity score based on technical factors
 */
function calculateComplexityScore(crawlData: CrawlData, serpData: SerpData): number {
  let score = 1;

  // Technical issues add complexity
  score += crawlData.technicalIssues.critical * 0.3;
  score += crawlData.technicalIssues.warnings * 0.1;

  // Competition level affects complexity
  if (serpData.competitionLevel === 'high') score += 0.5;
  else if (serpData.competitionLevel === 'medium') score += 0.25;

  // Lack of schema increases complexity
  if (!crawlData.hasSchema) score += 0.2;

  // Poor mobile optimization increases complexity
  if (!crawlData.mobileOptimized) score += 0.3;

  // Low visibility means more work needed
  if (serpData.visibilityScore < 20) score += 0.4;
  else if (serpData.visibilityScore < 50) score += 0.2;

  return Math.min(score, 3); // Cap at 3x
}

// =============================================================================
// Technical Analysis
// =============================================================================

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  }
}

/**
 * Analyze technical aspects of the site via crawl
 */
async function analyzeTechnicalData(
  url: string,
  config: UrlAnalysisConfig,
  onProgress?: ProgressCallback
): Promise<{ crawlData: CrawlData; pages: ApifyPageData[] }> {
  onProgress?.({
    phase: 'crawling',
    progress: 10,
    message: 'Starting site crawl...',
  });

  const domain = extractDomain(url);
  const startUrl = url.startsWith('http') ? url : `https://${url}`;

  // Default crawl data if no API key
  if (!config.apifyToken) {
    return {
      crawlData: {
        pageCount: 0,
        technicalIssues: { critical: 0, warnings: 0, notices: 0 },
        hasSchema: false,
        sslValid: startUrl.startsWith('https'),
        mobileOptimized: true,
      },
      pages: [],
    };
  }

  try {
    // Crawl the site
    const pages = await extractMultiplePagesTechnicalData(
      [startUrl],
      config.apifyToken,
      {
        maxPagesToAnalyze: config.maxPagesToAnalyze || 50,
        proxyConfig: config.proxyConfig,
      }
    );

    onProgress?.({
      phase: 'crawling',
      progress: 50,
      message: `Analyzed ${pages.length} pages`,
    });

    // Aggregate technical issues
    let critical = 0;
    let warnings = 0;
    let notices = 0;
    let hasAnySchema = false;
    let allMobileOptimized = true;

    for (const page of pages) {
      // Check for technical issues based on page data
      if (!page.title || page.title.length < 30) warnings++;
      if (!page.metaDescription || page.metaDescription.length < 100) warnings++;
      if (page.title && page.title.length > 60) notices++;
      if (page.metaDescription && page.metaDescription.length > 160) notices++;

      // Check for schema (simplified check)
      if (page.jsonLdSchemas && page.jsonLdSchemas.length > 0) {
        hasAnySchema = true;
      }

      // Check for critical issues
      if (!page.canonicalUrl) warnings++;
      if (page.statusCode && page.statusCode >= 400) critical++;

      // Check mobile viewport
      if (!page.metaViewport) {
        allMobileOptimized = false;
      }
    }

    // Check SSL (from first page)
    const sslValid = startUrl.startsWith('https');

    return {
      crawlData: {
        pageCount: pages.length,
        technicalIssues: { critical, warnings, notices },
        hasSchema: hasAnySchema,
        sslValid,
        mobileOptimized: allMobileOptimized,
      },
      pages,
    };
  } catch (error) {
    console.error('Technical analysis failed:', error);
    return {
      crawlData: {
        pageCount: 0,
        technicalIssues: { critical: 1, warnings: 0, notices: 0 },
        hasSchema: false,
        sslValid: startUrl.startsWith('https'),
        mobileOptimized: true,
      },
      pages: [],
    };
  }
}

// =============================================================================
// SERP Analysis
// =============================================================================

/**
 * Analyze SERP visibility for the domain
 */
async function analyzeSerpVisibility(
  domain: string,
  config: UrlAnalysisConfig,
  businessInfo?: BusinessInfo,
  onProgress?: ProgressCallback
): Promise<SerpData> {
  onProgress?.({
    phase: 'serp_analysis',
    progress: 60,
    message: 'Analyzing SERP visibility...',
  });

  // Create minimal business info if not provided
  const info: BusinessInfo = businessInfo || {
    companyName: domain,
    websiteUrl: `https://${domain}`,
    targetMarket: 'United States',
    languageCode: 'en',
    industryVertical: 'Business',
  };

  try {
    // Use brand query to check visibility
    const brandQuery = domain.replace(/\.[^.]+$/, ''); // Remove TLD for brand search
    const result = await analyzeSerpForTopic(
      brandQuery,
      config.serpMode || 'fast',
      info
    );

    onProgress?.({
      phase: 'serp_analysis',
      progress: 80,
      message: 'SERP analysis complete',
    });

    if (!result.success || !result.data) {
      return {
        visibilityScore: 30, // Default moderate visibility
        keywordsRanking: 0,
        topKeywords: [],
        competitionLevel: 'medium',
      };
    }

    // Extract visibility metrics from result
    const visibilityScore = Math.round(
      100 - (result.summary.difficultyScore || 50)
    );

    // Determine competition level from difficulty
    let competitionLevel: CompetitionLevel = 'medium';
    if (result.summary.difficultyScore >= 70) {
      competitionLevel = 'high';
    } else if (result.summary.difficultyScore <= 30) {
      competitionLevel = 'low';
    }

    return {
      visibilityScore,
      keywordsRanking: result.summary.topCompetitors?.length || 0,
      topKeywords: result.summary.topCompetitors?.map((c, i) => ({
        keyword: brandQuery,
        position: c.position || i + 1,
        volume: 100, // Placeholder
      })) || [],
      competitionLevel,
    };
  } catch (error) {
    console.error('SERP analysis failed:', error);
    return {
      visibilityScore: 30,
      keywordsRanking: 0,
      topKeywords: [],
      competitionLevel: 'medium',
    };
  }
}

// =============================================================================
// Recommendations Generation
// =============================================================================

/**
 * Generate service recommendations based on analysis
 */
function generateRecommendations(
  crawlData: CrawlData,
  serpData: SerpData
): AnalysisRecommendation[] {
  const recommendations: AnalysisRecommendation[] = [];

  // Technical SEO recommendations
  if (crawlData.technicalIssues.critical > 0) {
    recommendations.push({
      category: 'traditional_seo',
      priority: 'critical',
      description: `Fix ${crawlData.technicalIssues.critical} critical technical issues affecting crawlability`,
      estimatedImpact: 'High impact on organic visibility',
    });
  }

  if (!crawlData.hasSchema) {
    recommendations.push({
      category: 'traditional_seo',
      priority: 'high',
      description: 'Implement structured data (JSON-LD) for rich snippets',
      estimatedImpact: 'Improved SERP appearance and CTR',
    });
  }

  if (!crawlData.mobileOptimized) {
    recommendations.push({
      category: 'traditional_seo',
      priority: 'critical',
      description: 'Mobile optimization required for Google mobile-first indexing',
      estimatedImpact: 'Essential for modern SEO',
    });
  }

  if (crawlData.technicalIssues.warnings > 5) {
    recommendations.push({
      category: 'traditional_seo',
      priority: 'medium',
      description: 'Address on-page SEO issues (titles, meta descriptions)',
      estimatedImpact: 'Improved click-through rates',
    });
  }

  // Semantic SEO recommendations
  recommendations.push({
    category: 'semantic_seo',
    priority: 'high',
    description: 'Develop topical authority through entity-based content strategy',
    estimatedImpact: 'Long-term ranking improvements',
  });

  if (serpData.competitionLevel === 'high') {
    recommendations.push({
      category: 'semantic_seo',
      priority: 'high',
      description: 'Competitive niche requires comprehensive EAV optimization',
      estimatedImpact: 'Differentiation from competitors',
    });
  }

  // Content recommendations
  if (crawlData.pageCount < 20) {
    recommendations.push({
      category: 'content',
      priority: 'high',
      description: 'Expand content footprint with targeted article production',
      estimatedImpact: 'More ranking opportunities',
    });
  }

  recommendations.push({
    category: 'content',
    priority: 'medium',
    description: 'Content refresh and optimization for existing pages',
    estimatedImpact: 'Quick wins for existing rankings',
  });

  // Off-site recommendations
  if (serpData.visibilityScore < 50) {
    recommendations.push({
      category: 'offsite',
      priority: 'medium',
      description: 'Build domain authority through quality backlinks',
      estimatedImpact: 'Improved domain metrics',
    });
  }

  // AI/LLM recommendations
  recommendations.push({
    category: 'ai_llm',
    priority: 'low',
    description: 'Optimize content for AI model citations and mentions',
    estimatedImpact: 'Future-proofing for AI search',
  });

  // Local SEO (conditional)
  if (crawlData.pageCount < 100) {
    recommendations.push({
      category: 'local_seo',
      priority: 'medium',
      description: 'Local SEO optimization for geo-targeted visibility',
      estimatedImpact: 'Local search dominance',
    });
  }

  // Sort by priority
  const priorityOrder: Record<PriorityLevel, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return recommendations.sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );
}

// =============================================================================
// Main Analysis Function
// =============================================================================

/**
 * Analyze a URL for quotation purposes
 *
 * @param url - The URL to analyze (domain or full URL)
 * @param config - API configuration
 * @param businessInfo - Optional business context
 * @param onProgress - Optional progress callback
 * @returns Analysis result for quote generation
 */
export async function analyzeUrlForQuotation(
  url: string,
  config: UrlAnalysisConfig,
  businessInfo?: BusinessInfo,
  onProgress?: ProgressCallback
): Promise<UrlAnalysisResult> {
  const domain = extractDomain(url);

  onProgress?.({
    phase: 'crawling',
    progress: 0,
    message: 'Starting analysis...',
  });

  // Run technical and SERP analysis
  const [technicalResult, serpData] = await Promise.all([
    analyzeTechnicalData(url, config, onProgress),
    analyzeSerpVisibility(domain, config, businessInfo, onProgress),
  ]);

  const { crawlData } = technicalResult;

  onProgress?.({
    phase: 'recommendations',
    progress: 90,
    message: 'Generating recommendations...',
  });

  // Generate recommendations
  const recommendations = generateRecommendations(crawlData, serpData);

  // Determine site size and complexity
  const siteSize = determineSiteSize(crawlData.pageCount);
  const complexityScore = calculateComplexityScore(crawlData, serpData);

  onProgress?.({
    phase: 'complete',
    progress: 100,
    message: 'Analysis complete',
  });

  return {
    domain,
    crawlData,
    serpData,
    recommendations,
    siteSize,
    complexityScore,
    analyzedAt: new Date().toISOString(),
  };
}

// =============================================================================
// Quick Analysis (No API required)
// =============================================================================

/**
 * Quick analysis without API calls - uses heuristics
 * Useful for public calculator mode
 */
export function quickAnalyzeUrl(url: string): UrlAnalysisResult {
  const domain = extractDomain(url);

  // Default values for quick mode
  const crawlData: CrawlData = {
    pageCount: 50, // Assume medium-small site
    technicalIssues: { critical: 0, warnings: 3, notices: 5 },
    hasSchema: false,
    sslValid: true,
    mobileOptimized: true,
  };

  const serpData: SerpData = {
    visibilityScore: 40,
    keywordsRanking: 10,
    topKeywords: [],
    competitionLevel: 'medium',
  };

  return {
    domain,
    crawlData,
    serpData,
    recommendations: generateRecommendations(crawlData, serpData),
    siteSize: 'small',
    complexityScore: 1.2,
    analyzedAt: new Date().toISOString(),
  };
}

// =============================================================================
// Exports
// =============================================================================

export { extractDomain };
