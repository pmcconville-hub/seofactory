/**
 * Pricing Engine for SEO Quotation Tool
 *
 * Calculates prices based on service modules, site characteristics,
 * and competitive factors. Generates KPI projections and ROI calculations.
 */

import {
  ServiceModule,
  QuoteLineItem,
  KpiProjection,
  RoiCalculation,
  PricingFactors,
  UrlAnalysisResult,
  SiteSize,
  CompetitionLevel,
  ServiceCategory,
} from '../../types/quotation';
import { SERVICE_MODULES, getModuleById } from '../../config/quotation/modules';

// =============================================================================
// Types
// =============================================================================

export interface PricingContext {
  siteSize: SiteSize;
  complexityScore: number;
  competitionLevel: CompetitionLevel;
  urgency: 'standard' | 'expedited';
  region?: string;
}

export interface ModulePriceResult {
  priceMin: number;
  priceMax: number;
  multiplier: number;
  factors: string[];
}

export interface QuoteTotalResult {
  subtotal: number;
  discount: number;
  totalMin: number;
  totalMax: number;
  oneTimeMin: number;
  oneTimeMax: number;
  recurringMin: number;
  recurringMax: number;
}

// =============================================================================
// Multiplier Functions
// =============================================================================

/**
 * Get price multiplier based on site size
 */
export function getSiteMultiplier(siteSize: SiteSize): number {
  const multipliers: Record<SiteSize, number> = {
    small: 1.0,
    medium: 1.3,
    large: 1.6,
    enterprise: 2.2,
  };
  return multipliers[siteSize];
}

/**
 * Get price multiplier based on competition level
 */
export function getCompetitionMultiplier(level: CompetitionLevel): number {
  const multipliers: Record<CompetitionLevel, number> = {
    low: 1.0,
    medium: 1.15,
    high: 1.35,
  };
  return multipliers[level];
}

/**
 * Get urgency multiplier
 */
function getUrgencyMultiplier(urgency: 'standard' | 'expedited'): number {
  return urgency === 'expedited' ? 1.5 : 1.0;
}

/**
 * Get complexity multiplier (normalized from score)
 */
function getComplexityMultiplier(score: number): number {
  // Score ranges from 1-3, convert to multiplier 1.0-1.4
  return 1 + (score - 1) * 0.2;
}

// =============================================================================
// Price Calculation
// =============================================================================

/**
 * Calculate price for a single module given context
 */
export function calculateModulePrice(
  module: ServiceModule,
  context: PricingContext
): ModulePriceResult {
  const factors: string[] = [];
  let multiplier = 1.0;

  // Site size factor
  const siteMultiplier = getSiteMultiplier(context.siteSize);
  if (siteMultiplier > 1.0) {
    multiplier *= siteMultiplier;
    factors.push(`Site size (${context.siteSize}): ${siteMultiplier}x`);
  }

  // Competition factor
  const competitionMultiplier = getCompetitionMultiplier(context.competitionLevel);
  if (competitionMultiplier > 1.0) {
    multiplier *= competitionMultiplier;
    factors.push(`Competition (${context.competitionLevel}): ${competitionMultiplier}x`);
  }

  // Complexity factor
  if (context.complexityScore > 1.2) {
    const complexityMultiplier = getComplexityMultiplier(context.complexityScore);
    multiplier *= complexityMultiplier;
    factors.push(`Complexity: ${complexityMultiplier.toFixed(2)}x`);
  }

  // Urgency factor
  const urgencyMultiplier = getUrgencyMultiplier(context.urgency);
  if (urgencyMultiplier > 1.0) {
    multiplier *= urgencyMultiplier;
    factors.push(`Expedited delivery: ${urgencyMultiplier}x`);
  }

  // Calculate final prices
  const priceMin = Math.round(module.basePriceMin * multiplier);
  const priceMax = Math.round(module.basePriceMax * multiplier);

  return {
    priceMin,
    priceMax,
    multiplier,
    factors,
  };
}

/**
 * Create a line item from a module and pricing context
 */
export function createLineItem(
  moduleId: string,
  context: PricingContext,
  quantity: number = 1
): QuoteLineItem | null {
  const moduleData = getModuleById(moduleId);
  if (!moduleData) {
    console.warn(`Module not found: ${moduleId}`);
    return null;
  }

  const module: ServiceModule = {
    ...moduleData,
    id: moduleData.id,
  };

  const priceResult = calculateModulePrice(module, context);

  return {
    moduleId: module.id,
    moduleName: module.name,
    category: module.category,
    quantity,
    unitPriceMin: priceResult.priceMin,
    unitPriceMax: priceResult.priceMax,
    appliedMultiplier: priceResult.multiplier,
    totalMin: priceResult.priceMin * quantity,
    totalMax: priceResult.priceMax * quantity,
    isRecurring: module.isRecurring,
    recurringInterval: module.recurringInterval,
    deliverables: module.deliverables,
  };
}

/**
 * Calculate total for a set of line items
 */
export function calculateQuoteTotal(
  lineItems: QuoteLineItem[],
  discountPercent: number = 0
): QuoteTotalResult {
  let oneTimeMin = 0;
  let oneTimeMax = 0;
  let recurringMin = 0;
  let recurringMax = 0;

  for (const item of lineItems) {
    if (item.isRecurring) {
      recurringMin += item.totalMin;
      recurringMax += item.totalMax;
    } else {
      oneTimeMin += item.totalMin;
      oneTimeMax += item.totalMax;
    }
  }

  const subtotal = (oneTimeMin + oneTimeMax) / 2 + (recurringMin + recurringMax) / 2;
  const discount = subtotal * (discountPercent / 100);

  // Apply discount proportionally
  const discountMultiplier = 1 - discountPercent / 100;
  const totalMin = Math.round((oneTimeMin + recurringMin) * discountMultiplier);
  const totalMax = Math.round((oneTimeMax + recurringMax) * discountMultiplier);

  return {
    subtotal: Math.round(subtotal),
    discount: Math.round(discount),
    totalMin,
    totalMax,
    oneTimeMin: Math.round(oneTimeMin * discountMultiplier),
    oneTimeMax: Math.round(oneTimeMax * discountMultiplier),
    recurringMin: Math.round(recurringMin * discountMultiplier),
    recurringMax: Math.round(recurringMax * discountMultiplier),
  };
}

// =============================================================================
// KPI Projections
// =============================================================================

/**
 * KPI metric definitions for display
 */
const KPI_METRICS: Record<string, { label: string; unit: string }> = {
  organic_traffic: { label: 'Organic Traffic Growth', unit: '%' },
  keywords_top_10: { label: 'Keywords in Top 10', unit: 'keywords' },
  domain_authority: { label: 'Domain Authority Gain', unit: 'points' },
  conversion_rate: { label: 'Conversion Rate Improvement', unit: '%' },
  local_pack_appearances: { label: 'Local Pack Appearances', unit: 'appearances' },
};

/**
 * Calculate KPI projections based on selected modules
 */
export function calculateKpiProjections(
  selectedModules: ServiceModule[],
  analysisData?: UrlAnalysisResult
): KpiProjection[] {
  // Aggregate KPI contributions from all modules
  const aggregatedKpis: Record<
    string,
    { impactMin: number; impactMax: number; confidence: number; timeframeMonths: number }
  > = {};

  for (const module of selectedModules) {
    for (const contribution of module.kpiContributions) {
      const existing = aggregatedKpis[contribution.metric];
      if (existing) {
        // Combine impacts (with diminishing returns)
        existing.impactMin += contribution.impactMin * 0.7;
        existing.impactMax += contribution.impactMax * 0.7;
        existing.confidence = Math.min(
          0.9,
          (existing.confidence + contribution.confidence) / 2
        );
        existing.timeframeMonths = Math.max(
          existing.timeframeMonths,
          contribution.timeframeMonths
        );
      } else {
        aggregatedKpis[contribution.metric] = {
          impactMin: contribution.impactMin,
          impactMax: contribution.impactMax,
          confidence: contribution.confidence,
          timeframeMonths: contribution.timeframeMonths,
        };
      }
    }
  }

  // Convert to projections array
  const projections: KpiProjection[] = [];

  for (const [metric, data] of Object.entries(aggregatedKpis)) {
    const metricInfo = KPI_METRICS[metric] || { label: metric, unit: '' };

    // Get current value from analysis if available
    let current: number | null = null;
    if (analysisData) {
      if (metric === 'organic_traffic') {
        current = 0; // Would need analytics integration
      } else if (metric === 'keywords_top_10') {
        current = analysisData.serpData.keywordsRanking;
      } else if (metric === 'domain_authority') {
        current = null; // Would need domain metrics integration
      }
    }

    projections.push({
      metric,
      label: metricInfo.label,
      current,
      projectedMin: Math.round(data.impactMin),
      projectedMax: Math.round(data.impactMax),
      confidence: Math.round(data.confidence * 100) / 100,
      timeframeMonths: data.timeframeMonths,
      unit: metricInfo.unit,
    });
  }

  // Sort by confidence (highest first)
  return projections.sort((a, b) => b.confidence - a.confidence);
}

// =============================================================================
// ROI Calculation
// =============================================================================

/**
 * Calculate ROI based on investment and projected outcomes
 */
export function calculateRoi(
  totalInvestment: number,
  kpiProjections: KpiProjection[],
  customerValue: number,
  currentMonthlyLeads: number = 0
): RoiCalculation {
  // Find traffic growth projection
  const trafficProjection = kpiProjections.find(
    (p) => p.metric === 'organic_traffic'
  );
  const conversionProjection = kpiProjections.find(
    (p) => p.metric === 'conversion_rate'
  );

  // Estimate additional leads
  // Base assumption: 2% of traffic converts, average 1000 monthly visitors
  const baseMonthlyVisitors = 1000;
  const baseConversionRate = 0.02;

  const trafficGrowthMin = trafficProjection?.projectedMin || 10;
  const trafficGrowthMax = trafficProjection?.projectedMax || 30;
  const conversionBoostMin = conversionProjection?.projectedMin || 0;
  const conversionBoostMax = conversionProjection?.projectedMax || 1;

  // Calculate new visitors
  const newVisitorsMin = baseMonthlyVisitors * (trafficGrowthMin / 100);
  const newVisitorsMax = baseMonthlyVisitors * (trafficGrowthMax / 100);

  // Calculate new conversion rate
  const newConversionRateMin = baseConversionRate * (1 + conversionBoostMin / 100);
  const newConversionRateMax = baseConversionRate * (1 + conversionBoostMax / 100);

  // Calculate additional leads
  const additionalLeadsMin = Math.round(
    newVisitorsMin * newConversionRateMin
  );
  const additionalLeadsMax = Math.round(
    newVisitorsMax * newConversionRateMax
  );

  // Calculate projected revenue (annual)
  const projectedRevenueMin = additionalLeadsMin * customerValue * 12;
  const projectedRevenueMax = additionalLeadsMax * customerValue * 12;

  // Calculate ROI
  const roiMin =
    totalInvestment > 0
      ? Math.round(((projectedRevenueMin - totalInvestment) / totalInvestment) * 100)
      : 0;
  const roiMax =
    totalInvestment > 0
      ? Math.round(((projectedRevenueMax - totalInvestment) / totalInvestment) * 100)
      : 0;

  // Calculate payback period
  const monthlyRevenueMin = projectedRevenueMin / 12;
  const monthlyRevenueMax = projectedRevenueMax / 12;
  const paybackMonthsMin =
    monthlyRevenueMax > 0 ? Math.ceil(totalInvestment / monthlyRevenueMax) : 24;
  const paybackMonthsMax =
    monthlyRevenueMin > 0 ? Math.ceil(totalInvestment / monthlyRevenueMin) : 36;

  return {
    customerValue,
    currentMonthlyLeads,
    projectedAdditionalLeadsMin: additionalLeadsMin,
    projectedAdditionalLeadsMax: additionalLeadsMax,
    projectedRevenueMin,
    projectedRevenueMax,
    investmentTotal: totalInvestment,
    roiMin: Math.max(roiMin, -100), // Cap at -100%
    roiMax,
    paybackMonthsMin: Math.max(paybackMonthsMin, 1),
    paybackMonthsMax: Math.min(paybackMonthsMax, 36),
  };
}

// =============================================================================
// Pricing Factors Builder
// =============================================================================

/**
 * Build pricing factors from analysis data
 */
export function buildPricingFactors(
  analysisData: UrlAnalysisResult,
  urgency: 'standard' | 'expedited' = 'standard',
  region?: string
): PricingFactors {
  const appliedMultipliers: PricingFactors['appliedMultipliers'] = [];

  const siteMultiplier = getSiteMultiplier(analysisData.siteSize);
  if (siteMultiplier > 1.0) {
    appliedMultipliers.push({
      name: 'Site Size',
      value: siteMultiplier,
      reason: `${analysisData.siteSize} site (${analysisData.crawlData.pageCount} pages)`,
    });
  }

  const competitionMultiplier = getCompetitionMultiplier(
    analysisData.serpData.competitionLevel
  );
  if (competitionMultiplier > 1.0) {
    appliedMultipliers.push({
      name: 'Competition Level',
      value: competitionMultiplier,
      reason: `${analysisData.serpData.competitionLevel} competition in SERP`,
    });
  }

  if (analysisData.complexityScore > 1.2) {
    const complexityMultiplier = getComplexityMultiplier(
      analysisData.complexityScore
    );
    appliedMultipliers.push({
      name: 'Technical Complexity',
      value: complexityMultiplier,
      reason: `${analysisData.crawlData.technicalIssues.critical} critical issues to address`,
    });
  }

  if (urgency === 'expedited') {
    appliedMultipliers.push({
      name: 'Expedited Delivery',
      value: 1.5,
      reason: 'Rush timeline requested',
    });
  }

  return {
    siteSize: analysisData.siteSize,
    complexityScore: analysisData.complexityScore,
    competitionLevel: analysisData.serpData.competitionLevel,
    urgency,
    region,
    appliedMultipliers,
  };
}

// =============================================================================
// Full Quote Generation
// =============================================================================

/**
 * Generate complete quote line items from module IDs
 */
export function generateQuoteLineItems(
  moduleIds: string[],
  context: PricingContext
): QuoteLineItem[] {
  const lineItems: QuoteLineItem[] = [];

  for (const moduleId of moduleIds) {
    const lineItem = createLineItem(moduleId, context);
    if (lineItem) {
      lineItems.push(lineItem);
    }
  }

  return lineItems;
}

/**
 * Get module objects from IDs
 */
export function getModulesFromIds(moduleIds: string[]): ServiceModule[] {
  const modules: ServiceModule[] = [];

  for (const id of moduleIds) {
    const moduleData = getModuleById(id);
    if (moduleData) {
      modules.push({
        ...moduleData,
        id: moduleData.id,
      });
    }
  }

  return modules;
}
