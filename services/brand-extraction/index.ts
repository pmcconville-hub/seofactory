/**
 * Brand Extraction Module
 *
 * Extracts literal HTML/CSS from target websites for brand replication.
 * NO template abstractions - stores actual code.
 *
 * NOTE: PageCrawler requires Playwright (Node.js only) and is NOT exported
 * for browser use. Use server-side API endpoints for page crawling.
 */

// PageCrawler is SERVER-SIDE ONLY (uses Playwright)
// Do NOT import in browser code - use API endpoints instead
// export { PageCrawler } from './PageCrawler';
export type { PageCrawlerConfig } from './PageCrawler';

export { ExtractionAnalyzer } from './ExtractionAnalyzer';

export { ComponentLibrary } from './ComponentLibrary';

export { UrlDiscoveryService } from './UrlDiscoveryService';
export type { UrlSuggestion, PageCrawlerLike } from './UrlDiscoveryService';

// Re-export types
export type {
  BrandExtraction,
  ExtractedComponent,
  ExtractedTokens,
  ExtractionAnalysisResult,
  ContentSlot,
  PageCaptureResult,
} from '../../types/brandExtraction';
