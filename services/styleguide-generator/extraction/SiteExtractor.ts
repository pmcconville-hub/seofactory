// services/styleguide-generator/extraction/SiteExtractor.ts
// Extracts brand data via HTTP fetch-proxy (CORS-safe).
// NOTE: Apify extraction was removed — it was slow (4+ min), expensive,
// required direct browser→api.apify.com calls (CORS blocked), and had a
// broken pageFunction regex. The fetch-proxy approach is fast and reliable.

import type { BrandAnalysis } from '../types';
import type { BusinessInfo } from '../../../types';
import { extractViaHttp } from './HttpExtractor';
import { analyzeHttpExtraction } from './ExtractionAnalyzer';

export interface ExtractionResult {
  analysis: BrandAnalysis;
  method: 'http-fetch';
}

/**
 * Extract brand data from a domain using HTTP fetch through the CORS proxy.
 */
export async function extractSite(
  domain: string,
  businessInfo: BusinessInfo,
  onProgress?: (message: string) => void,
): Promise<ExtractionResult> {
  const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');

  onProgress?.('Extracting via HTTP...');
  const raw = await extractViaHttp(cleanDomain, businessInfo);

  // Validate extraction produced meaningful data
  if (!raw.html || raw.html.length < 200) {
    throw new Error(
      `[SiteExtractor] Extraction returned insufficient data (${raw.html?.length || 0} chars). ` +
      `The website may be blocking requests or unreachable. Check the URL and try again.`
    );
  }

  const analysis = analyzeHttpExtraction(raw, cleanDomain);

  // Warn if confidence is very low (but still proceed with defaults)
  if (analysis.confidence < 0.35) {
    console.warn(
      `[SiteExtractor] Low extraction confidence (${analysis.confidence.toFixed(2)}). ` +
      `Colors/fonts may fall back to defaults.`
    );
    onProgress?.('Low extraction quality — some values will use defaults.');
  }

  return { analysis, method: 'http-fetch' };
}

/**
 * Merge AI vision personality data into an existing BrandAnalysis.
 * Called after initial extraction when AI screenshot analysis is available.
 */
export function mergePersonalityData(
  analysis: BrandAnalysis,
  personality: BrandAnalysis['personality'],
  industry?: string,
): BrandAnalysis {
  return {
    ...analysis,
    personality,
    industry: industry || analysis.industry,
  };
}
