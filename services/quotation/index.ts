/**
 * Quotation Services Index
 *
 * Re-exports all quotation-related services for easy imports:
 * import { analyzeUrlForQuotation, calculateModulePrice } from '@/services/quotation';
 */

// URL Analysis
export {
  analyzeUrlForQuotation,
  quickAnalyzeUrl,
  extractDomain,
  type UrlAnalysisConfig,
  type AnalysisProgress,
  type ProgressCallback,
} from './urlAnalysisService';

// Pricing Engine
export {
  calculateModulePrice,
  calculateQuoteTotal,
  calculateKpiProjections,
  calculateRoi,
  getSiteMultiplier,
  getCompetitionMultiplier,
  createLineItem,
  generateQuoteLineItems,
  getModulesFromIds,
  buildPricingFactors,
  type PricingContext,
  type ModulePriceResult,
  type QuoteTotalResult,
} from './pricingEngine';

// Quote Export
export {
  generateQuoteHtml,
  generateQuotePdf,
  downloadQuoteHtml,
  openQuoteForPrint,
} from './quoteExportService';
