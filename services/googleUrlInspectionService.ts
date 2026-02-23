/**
 * Google URL Inspection Service
 *
 * Frontend wrapper for the url-inspection edge function.
 * Inspects URLs via GSC URL Inspection API and returns indexation status.
 *
 * Graceful fallback: returns empty array on failure.
 */

import { getSupabaseClient } from './supabaseClient';

export interface UrlInspectionResult {
  url: string;
  verdict: string;
  indexingState: string;
  lastCrawlTime?: string;
  pageFetchState?: string;
  robotsTxtState?: string;
  coverageState?: string;
  error?: string;
}

export interface IndexationSummary {
  indexed: number;
  blocked: number;
  errors: number;
  total: number;
}

const BATCH_SIZE = 10; // Keep batches small to avoid edge function timeouts

/**
 * Inspect a batch of URLs via the URL Inspection API edge function.
 * Automatically chunks large batches to avoid gateway timeouts.
 */
export async function inspectUrls(
  urls: string[],
  siteUrl: string,
  accountId: string,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<UrlInspectionResult[]> {
  if (!urls.length || !siteUrl || !accountId) {
    return [];
  }

  const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);
  const allResults: UrlInspectionResult[] = [];

  // Process in small batches to avoid edge function timeouts (504)
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    try {
      const { data, error } = await supabase.functions.invoke('url-inspection', {
        body: { urls: batch, siteUrl, accountId },
      });

      if (error) {
        console.warn(`[UrlInspectionService] Batch ${i / BATCH_SIZE + 1} error:`, error);
        continue;
      }

      if (data?.ok && data?.results) {
        allResults.push(...data.results);
      } else {
        console.warn(`[UrlInspectionService] Batch ${i / BATCH_SIZE + 1} unexpected response:`, data);
      }
    } catch (error) {
      console.warn(`[UrlInspectionService] Batch ${i / BATCH_SIZE + 1} failed:`, error);
    }
  }

  return allResults;
}

/**
 * Summarize URL inspection results into counts.
 */
export function getIndexationSummary(results: UrlInspectionResult[]): IndexationSummary {
  const summary: IndexationSummary = { indexed: 0, blocked: 0, errors: 0, total: results.length };

  for (const result of results) {
    if (result.error || result.verdict === 'ERROR') {
      summary.errors++;
    } else if (result.verdict === 'PASS' || result.indexingState === 'INDEXING_ALLOWED') {
      summary.indexed++;
    } else if (
      result.robotsTxtState === 'DISALLOWED' ||
      result.verdict === 'FAIL' ||
      result.indexingState === 'BLOCKED_BY_META_TAG' ||
      result.indexingState === 'BLOCKED_BY_HTTP_HEADER' ||
      result.indexingState === 'BLOCKED_BY_ROBOTS_TXT'
    ) {
      summary.blocked++;
    } else {
      // Other states (e.g., NEUTRAL, VERDICT_UNSPECIFIED)
      summary.errors++;
    }
  }

  return summary;
}
