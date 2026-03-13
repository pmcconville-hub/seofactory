// services/ai/competitorHeadingAnalyzer.ts
// Analyzes competitor pages for H2/H3 heading frequency and dedicated URL patterns

import type { BusinessInfo } from '../../types';
import type { AppAction } from '../../state/appState';
import { extractPageContent } from '../jinaService';

export interface CompetitorHeadingResult {
  headingFrequency: number; // how many competitor pages include this keyword as H2/H3
  hasDedicatedUrl: boolean; // does any competitor have /keyword-slug/ URL
}

const MAX_PAGES_TO_SCRAPE = 20;

// Delay between requests to avoid rate limiting (ms)
const REQUEST_DELAY_MS = 200;

/**
 * Analyze competitor pages for heading coverage and URL patterns.
 * Uses Jina via fetch-proxy for scraping (headings with levels).
 * Rate-limited to MAX_PAGES_TO_SCRAPE total pages.
 *
 * @param keywords - Keywords to check across competitor pages
 * @param competitorUrls - Competitor page URLs to scrape (from SERP or sitemap)
 * @param businessInfo - Business context (must include jinaApiKey, supabaseUrl, supabaseAnonKey)
 * @param dispatch - React dispatch for logging
 * @returns Map<keyword, CompetitorHeadingResult>
 */
export async function analyzeCompetitorHeadings(
  keywords: string[],
  competitorUrls: string[],
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<AppAction>
): Promise<Map<string, CompetitorHeadingResult>> {
  const results = new Map<string, CompetitorHeadingResult>();

  // Initialize results for all keywords
  for (const keyword of keywords) {
    results.set(keyword, { headingFrequency: 0, hasDedicatedUrl: false });
  }

  if (competitorUrls.length === 0 || keywords.length === 0) {
    return results;
  }

  if (!businessInfo.jinaApiKey) {
    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'CompetitorHeadingAnalyzer',
        message: 'Jina API key not configured — skipping competitor heading analysis',
        status: 'warning',
        timestamp: Date.now(),
      },
    });
    return results;
  }

  // Limit pages to scrape
  const urlsToScrape = competitorUrls.slice(0, MAX_PAGES_TO_SCRAPE);

  dispatch({
    type: 'LOG_EVENT',
    payload: {
      service: 'CompetitorHeadingAnalyzer',
      message: `Analyzing ${urlsToScrape.length} competitor pages for ${keywords.length} keywords`,
      status: 'info',
      timestamp: Date.now(),
    },
  });

  // Build keyword slug lookup for URL matching
  const keywordSlugs = new Map<string, string>();
  for (const keyword of keywords) {
    const slug = keyword.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    keywordSlugs.set(keyword, slug);
  }

  // Build proxyConfig from businessInfo (required for CORS — browser must go through fetch-proxy)
  const proxyConfig = {
    supabaseUrl: businessInfo.supabaseUrl,
    supabaseAnonKey: businessInfo.supabaseAnonKey,
  };

  // Scrape competitor pages using Jina through the proxy
  let scrapedCount = 0;

  for (let i = 0; i < urlsToScrape.length; i++) {
    const url = urlsToScrape[i];
    try {
      const extraction = await extractPageContent(
        url,
        businessInfo.jinaApiKey,
        proxyConfig
      );
      scrapedCount++;

      if (!extraction || !extraction.headings) continue;

      // Check each keyword against this page's headings and URL
      for (const keyword of keywords) {
        const result = results.get(keyword)!;
        const keywordLower = keyword.toLowerCase();
        const keywordSlug = keywordSlugs.get(keyword)!;

        // Check headings (H2/H3) for keyword presence
        const hasHeading = extraction.headings.some(
          (h) =>
            (h.level === 2 || h.level === 3) &&
            h.text.toLowerCase().includes(keywordLower)
        );

        if (hasHeading) {
          result.headingFrequency++;
        }

        // Check URL for dedicated slug pattern
        const urlLower = url.toLowerCase();
        if (
          urlLower.includes(`/${keywordSlug}/`) ||
          urlLower.endsWith(`/${keywordSlug}`)
        ) {
          result.hasDedicatedUrl = true;
        }
      }
    } catch (err) {
      console.warn(`[CompetitorHeadingAnalyzer] Failed to scrape ${url}:`, err);
    }

    // Rate limiting delay between requests
    if (i < urlsToScrape.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
    }
  }

  dispatch({
    type: 'LOG_EVENT',
    payload: {
      service: 'CompetitorHeadingAnalyzer',
      message: `Scraped ${scrapedCount}/${urlsToScrape.length} competitor pages. Keywords with heading matches: ${[...results.values()].filter((r) => r.headingFrequency > 0).length}/${keywords.length}`,
      status: 'success',
      timestamp: Date.now(),
    },
  });

  return results;
}
