// services/styleguide-generator/extraction/SiteExtractor.ts
// Facade: chooses Apify or HTTP extraction path based on available credentials.

import type { BrandAnalysis } from '../types';
import type { BusinessInfo } from '../../../types';
import { extractViaHttp } from './HttpExtractor';
import { analyzeHttpExtraction } from './ExtractionAnalyzer';
import { extractViaApify } from './ApifyExtractor';

export interface ExtractionResult {
  analysis: BrandAnalysis;
  method: 'apify' | 'http-fetch';
}

/**
 * Extract brand data from a domain.
 * Tries Apify first (if token available), falls back to HTTP extraction.
 */
export async function extractSite(
  domain: string,
  businessInfo: BusinessInfo,
  onProgress?: (message: string) => void,
): Promise<ExtractionResult> {
  const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');

  // Path 1: Apify (if token available)
  const apifyToken = (businessInfo as unknown as Record<string, unknown>).apifyToken as string | undefined;
  if (apifyToken) {
    try {
      onProgress?.('Extracting with Apify Playwright scraper...');
      const analysis = await extractViaApify(cleanDomain, apifyToken);
      return { analysis, method: 'apify' };
    } catch (e) {
      console.warn('[SiteExtractor] Apify extraction failed, falling back to HTTP:', e);
      onProgress?.('Apify extraction failed, falling back to HTTP...');
    }
  }

  // Path 2: HTTP fetch (Jina → direct fetch)
  onProgress?.('Extracting via HTTP...');
  const raw = await extractViaHttp(cleanDomain, businessInfo);
  const analysis = analyzeHttpExtraction(raw, cleanDomain);

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
