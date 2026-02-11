/**
 * Scraping Configuration
 *
 * Centralized selectors and settings for HTML fetching / scraping.
 * Used by htmlFetcherService and any future scraping utilities.
 *
 * @module config/scrapingConfig
 */

/**
 * CSS selectors for elements that should be removed from scraped pages.
 * Targets cookie consent banners, GDPR popups, and similar overlays
 * that add noise to extracted content.
 */
export const REMOVE_SELECTORS = [
  '#CybotCookiebotDialog',
  '#onetrust-consent-sdk',
  '.cc-window',
  '.cc-banner',
  '#cookie-notice',
  '#cookie-banner',
  '.cookie-consent-banner',
  '.consent-banner',
] as const;

/**
 * Pre-joined selector string ready for use in CSS selector APIs
 * (e.g. Jina X-Remove-Selector header).
 */
export const REMOVE_SELECTORS_STRING = REMOVE_SELECTORS.join(', ');

/**
 * CSS selectors to wait for before considering a page loaded.
 * Used with Jina's X-Wait-For-Selector header.
 */
export const WAIT_FOR_SELECTORS = [
  'main',
  'article',
  '.content',
  '#content',
  'body',
] as const;

/**
 * Pre-joined wait-for selector string.
 */
export const WAIT_FOR_SELECTORS_STRING = WAIT_FOR_SELECTORS.join(', ');
