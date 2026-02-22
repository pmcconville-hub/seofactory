/**
 * Google URL Inspection Service
 *
 * Frontend wrapper for the url-inspection edge function.
 * Inspects URLs via GSC URL Inspection API and returns indexation status.
 *
 * Graceful fallback: returns empty array on failure.
 */

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

/**
 * Inspect a batch of URLs via the URL Inspection API edge function.
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

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/url-inspection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({ urls, siteUrl, accountId }),
    });

    if (!response.ok) {
      console.warn('[UrlInspectionService] Edge function error:', response.status);
      return [];
    }

    const data = await response.json();
    if (!data.ok || !data.results) {
      console.warn('[UrlInspectionService] Unexpected response:', data);
      return [];
    }

    return data.results;
  } catch (error) {
    console.warn('[UrlInspectionService] Failed:', error);
    return [];
  }
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
