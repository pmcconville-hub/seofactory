/**
 * Centralized API Endpoints
 *
 * Single source of truth for all external API base URLs used across the application.
 * Import from here instead of hardcoding URLs in individual services.
 *
 * Note: API keys are managed separately via import.meta.env.VITE_* variables.
 */

export const API_ENDPOINTS = {
  // --- AI Providers ---
  ANTHROPIC: 'https://api.anthropic.com/v1/messages',
  OPENAI: 'https://api.openai.com/v1/chat/completions',
  OPENROUTER: 'https://openrouter.ai/api/v1/chat/completions',
  OPENROUTER_MODELS: 'https://openrouter.ai/api/v1/models',
  PERPLEXITY: 'https://api.perplexity.ai/chat/completions',

  // --- Content & Scraping ---
  APIFY: 'https://api.apify.com/v2',
  FIRECRAWL_SCRAPE: 'https://api.firecrawl.dev/v1/scrape',
  FIRECRAWL_SCRAPE_V0: 'https://api.firecrawl.dev/v0/scrape',
  JINA_READER: 'https://r.jina.ai/',

  // --- Search & SEO ---
  SPACESERP: 'https://api.spaceserp.com',
  DATAFORSEO_SERP: 'https://api.dataforseo.com/v3/serp/google/organic/live/advanced',
  DATAFORSEO_SEARCH_VOLUME: 'https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live',

  // --- Media & Assets ---
  CLOUDINARY: 'https://api.cloudinary.com/v1_1',
  MARKUPGO: 'https://api.markupgo.com/api/v1/image',
} as const;

export type ApiEndpointKey = keyof typeof API_ENDPOINTS;
