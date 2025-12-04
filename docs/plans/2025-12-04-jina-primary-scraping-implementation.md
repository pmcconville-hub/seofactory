# Jina-Primary Scraping Architecture Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the page extraction service to use Jina.ai as the primary semantic provider with Firecrawl as fallback, and Apify reserved for technical extraction.

**Architecture:** Create a provider router that intelligently selects between Jina (free, fast), Firecrawl (paid fallback), and Apify (technical/JS-heavy) based on extraction type and user preference. Keep existing provider implementations, add new routing layer.

**Tech Stack:** TypeScript, React, Supabase Edge Functions, Jina.ai API, Firecrawl API, Apify API

---

## Task 1: Add New Types

**Files:**
- Modify: `types.ts` (add after line ~1195, after ExtractedPageData interface)

**Step 1: Add ExtractionType and ScrapingProvider types**

Add these types to `types.ts` after the `ExtractedPageData` interface:

```typescript
// ============================================
// SCRAPING PROVIDER TYPES
// ============================================

export type ExtractionType =
  | 'semantic_only'   // Content, headings, word count - Jina primary
  | 'technical_only'  // Schema, links, status, performance - Apify primary
  | 'full_audit'      // Both technical + semantic in parallel
  | 'auto';           // Smart selection based on available keys (default)

export type ScrapingProvider = 'jina' | 'firecrawl' | 'apify';

export interface ProviderResult {
  provider: ScrapingProvider;
  success: boolean;
  error?: string;
  duration?: number;
}
```

**Step 2: Run build to verify types compile**

Run: `npm run build 2>&1 | grep -E "(error|Error|✓ built)"`
Expected: `✓ built in` with no errors

**Step 3: Commit**

```bash
git add types.ts
git commit -m "feat(types): add ExtractionType and ScrapingProvider types"
```

---

## Task 2: Create Provider Router Service

**Files:**
- Create: `services/scrapingProviderRouter.ts`
- Test: `services/__tests__/scrapingProviderRouter.test.ts`

**Step 1: Write the failing tests**

Create `services/__tests__/scrapingProviderRouter.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  selectProvidersForExtraction,
  getDefaultFallbackOrder,
  shouldForceApify,
} from '../scrapingProviderRouter';
import { ExtractionType, ScrapingProvider } from '../../types';

describe('scrapingProviderRouter', () => {
  describe('getDefaultFallbackOrder', () => {
    it('returns jina-first order for semantic_only', () => {
      const order = getDefaultFallbackOrder('semantic_only');
      expect(order).toEqual(['jina', 'firecrawl']);
    });

    it('returns apify-first order for technical_only', () => {
      const order = getDefaultFallbackOrder('technical_only');
      expect(order).toEqual(['apify', 'firecrawl']);
    });

    it('returns full order for full_audit', () => {
      const order = getDefaultFallbackOrder('full_audit');
      expect(order).toEqual(['jina', 'firecrawl', 'apify']);
    });

    it('returns jina-first for auto', () => {
      const order = getDefaultFallbackOrder('auto');
      expect(order).toEqual(['jina', 'firecrawl', 'apify']);
    });
  });

  describe('shouldForceApify', () => {
    it('returns true for known JS-heavy domains', () => {
      expect(shouldForceApify('https://www.linkedin.com/in/someone')).toBe(true);
      expect(shouldForceApify('https://twitter.com/user')).toBe(true);
      expect(shouldForceApify('https://www.amazon.com/product')).toBe(true);
    });

    it('returns false for regular domains', () => {
      expect(shouldForceApify('https://example.com')).toBe(false);
      expect(shouldForceApify('https://blog.company.com/post')).toBe(false);
    });

    it('handles custom force domains', () => {
      const customDomains = ['custom-spa.com'];
      expect(shouldForceApify('https://custom-spa.com/page', customDomains)).toBe(true);
    });
  });

  describe('selectProvidersForExtraction', () => {
    const allKeys = {
      jinaApiKey: 'jina-key',
      firecrawlApiKey: 'fc-key',
      apifyToken: 'apify-token',
    };

    it('filters to only available providers', () => {
      const result = selectProvidersForExtraction('semantic_only', {
        jinaApiKey: 'key',
        // no firecrawl or apify
      });
      expect(result).toEqual(['jina']);
    });

    it('respects preferredProvider when available', () => {
      const result = selectProvidersForExtraction('semantic_only', {
        ...allKeys,
        preferredProvider: 'firecrawl',
      });
      expect(result[0]).toBe('firecrawl');
    });

    it('skips preferred provider if key not available', () => {
      const result = selectProvidersForExtraction('semantic_only', {
        jinaApiKey: 'key',
        preferredProvider: 'firecrawl', // but no firecrawl key
      });
      expect(result).toEqual(['jina']);
    });

    it('forces apify for JS-heavy URLs', () => {
      const result = selectProvidersForExtraction('semantic_only', {
        ...allKeys,
        url: 'https://linkedin.com/in/user',
      });
      expect(result[0]).toBe('apify');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- services/__tests__/scrapingProviderRouter.test.ts`
Expected: FAIL with "Cannot find module '../scrapingProviderRouter'"

**Step 3: Write the implementation**

Create `services/scrapingProviderRouter.ts`:

```typescript
// services/scrapingProviderRouter.ts
// Intelligent provider selection for page extraction

import { ExtractionType, ScrapingProvider } from '../types';

// Known JS-heavy domains that require browser rendering
const DEFAULT_FORCE_APIFY_DOMAINS = [
  'linkedin.com',
  'twitter.com',
  'x.com',
  'amazon.com',
  'facebook.com',
  'instagram.com',
  'tiktok.com',
];

export interface ProviderSelectionConfig {
  jinaApiKey?: string;
  firecrawlApiKey?: string;
  apifyToken?: string;
  preferredProvider?: ScrapingProvider | 'auto';
  forceApifyDomains?: string[];
  url?: string;
}

/**
 * Get default fallback order based on extraction type
 */
export function getDefaultFallbackOrder(type: ExtractionType): ScrapingProvider[] {
  switch (type) {
    case 'semantic_only':
      // Semantic: Jina is best, Firecrawl as backup
      return ['jina', 'firecrawl'];
    case 'technical_only':
      // Technical: Apify has full data, Firecrawl partial
      return ['apify', 'firecrawl'];
    case 'full_audit':
    case 'auto':
    default:
      // Full: Try all in order of cost-effectiveness
      return ['jina', 'firecrawl', 'apify'];
  }
}

/**
 * Check if URL requires Apify (JS-heavy sites)
 */
export function shouldForceApify(
  url: string,
  customDomains?: string[]
): boolean {
  const domains = customDomains || DEFAULT_FORCE_APIFY_DOMAINS;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return domains.some(domain =>
      hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

/**
 * Get available providers based on API keys
 */
export function getAvailableProviders(
  config: ProviderSelectionConfig
): ScrapingProvider[] {
  const available: ScrapingProvider[] = [];
  if (config.jinaApiKey) available.push('jina');
  if (config.firecrawlApiKey) available.push('firecrawl');
  if (config.apifyToken) available.push('apify');
  return available;
}

/**
 * Select providers for extraction in priority order
 * Returns array of providers to try (first = primary, rest = fallbacks)
 */
export function selectProvidersForExtraction(
  type: ExtractionType,
  config: ProviderSelectionConfig
): ScrapingProvider[] {
  const available = getAvailableProviders(config);

  if (available.length === 0) {
    return [];
  }

  // Check if URL requires Apify
  if (config.url && shouldForceApify(config.url, config.forceApifyDomains)) {
    if (available.includes('apify')) {
      // Put Apify first, then others
      return ['apify', ...available.filter(p => p !== 'apify')];
    }
  }

  // Check for user preference
  if (config.preferredProvider && config.preferredProvider !== 'auto') {
    const preferred = config.preferredProvider;
    if (available.includes(preferred)) {
      // Put preferred first, then fallbacks
      const fallbacks = getDefaultFallbackOrder(type).filter(
        p => p !== preferred && available.includes(p)
      );
      return [preferred, ...fallbacks];
    }
  }

  // Use default order filtered by availability
  const defaultOrder = getDefaultFallbackOrder(type);
  return defaultOrder.filter(p => available.includes(p));
}

/**
 * Determine if we need parallel extraction (both technical + semantic)
 */
export function needsParallelExtraction(type: ExtractionType): boolean {
  return type === 'full_audit';
}

/**
 * Get the semantic provider from selected list
 */
export function getSemanticProvider(
  providers: ScrapingProvider[]
): ScrapingProvider | null {
  // Jina and Firecrawl can do semantic
  const semanticProviders: ScrapingProvider[] = ['jina', 'firecrawl'];
  return providers.find(p => semanticProviders.includes(p)) || null;
}

/**
 * Get the technical provider from selected list
 */
export function getTechnicalProvider(
  providers: ScrapingProvider[]
): ScrapingProvider | null {
  // Apify is best for technical, Firecrawl partial
  const technicalProviders: ScrapingProvider[] = ['apify', 'firecrawl'];
  return providers.find(p => technicalProviders.includes(p)) || null;
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- services/__tests__/scrapingProviderRouter.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add services/scrapingProviderRouter.ts services/__tests__/scrapingProviderRouter.test.ts
git commit -m "feat(scraping): add provider router for intelligent provider selection"
```

---

## Task 3: Add Retry Logic to Jina Service

**Files:**
- Modify: `services/jinaService.ts`
- Test: `services/__tests__/jinaService.test.ts`

**Step 1: Write the failing test**

Create `services/__tests__/jinaService.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractPageContent } from '../jinaService';

describe('jinaService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('extractPageContent', () => {
    it('throws error when API key is missing', async () => {
      await expect(extractPageContent('https://example.com', '')).rejects.toThrow(
        'Jina.ai API key is not configured'
      );
    });

    it('retries on 5xx errors', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');

      // First call fails with 503
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => 'Service Unavailable',
      } as Response);

      // Second call succeeds
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            title: 'Test',
            description: 'Test desc',
            content: '# Heading\n\nContent',
            url: 'https://example.com',
          },
        }),
      } as Response);

      const result = await extractPageContent('https://example.com', 'test-key');

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(result.title).toBe('Test');
    });

    it('throws after max retries', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');

      // All calls fail
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'Service Unavailable',
      } as Response);

      await expect(
        extractPageContent('https://example.com', 'test-key', undefined, { maxRetries: 2 })
      ).rejects.toThrow('503');

      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- services/__tests__/jinaService.test.ts`
Expected: FAIL (retry logic not implemented)

**Step 3: Add retry logic to jinaService.ts**

Add at top of file after imports:

```typescript
interface RetryConfig {
  maxRetries?: number;
  baseDelayMs?: number;
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  baseDelayMs: 1000,
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isRetryableError = (status: number): boolean => {
  return status >= 500 || status === 429;
};
```

Modify the `extractPageContent` function signature and add retry wrapper:

```typescript
export const extractPageContent = async (
  url: string,
  apiKey: string,
  proxyConfig?: ProxyConfig,
  retryConfig?: RetryConfig
): Promise<JinaExtraction> => {
  if (!apiKey) {
    throw new Error('Jina.ai API key is not configured.');
  }

  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      return await doExtraction(url, apiKey, proxyConfig);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      const statusMatch = lastError.message.match(/(\d{3})/);
      const status = statusMatch ? parseInt(statusMatch[1], 10) : 0;

      if (attempt < config.maxRetries && isRetryableError(status)) {
        const delay = config.baseDelayMs * Math.pow(2, attempt - 1);
        console.log(`[Jina] Retry ${attempt}/${config.maxRetries} after ${delay}ms for ${url}`);
        await sleep(delay);
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new Error('Max retries exceeded');
};

// Move existing extraction logic to internal function
const doExtraction = async (
  url: string,
  apiKey: string,
  proxyConfig?: ProxyConfig
): Promise<JinaExtraction> => {
  // ... existing code from extractPageContent ...
};
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- services/__tests__/jinaService.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add services/jinaService.ts services/__tests__/jinaService.test.ts
git commit -m "feat(jina): add retry logic with exponential backoff"
```

---

## Task 4: Add Retry Logic to Firecrawl Service

**Files:**
- Modify: `services/firecrawlService.ts`
- Test: `services/__tests__/firecrawlService.test.ts`

**Step 1: Write the failing test**

Create `services/__tests__/firecrawlService.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractPageWithFirecrawl } from '../firecrawlService';

describe('firecrawlService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('extractPageWithFirecrawl', () => {
    it('retries on 5xx errors', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');

      // First call fails with 503
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => 'Service Unavailable',
      } as Response);

      // Second call succeeds
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            html: '<html><head><title>Test</title></head><body>Content</body></html>',
            markdown: '# Test\n\nContent',
            metadata: {
              title: 'Test',
              statusCode: 200,
            },
          },
        }),
      } as Response);

      const result = await extractPageWithFirecrawl('https://example.com', 'test-key', { maxRetries: 3 });

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(result.title).toBe('Test');
    });

    it('throws after max retries', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');

      fetchSpy.mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'Service Unavailable',
      } as Response);

      await expect(
        extractPageWithFirecrawl('https://example.com', 'test-key', { maxRetries: 2 })
      ).rejects.toThrow('503');

      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- services/__tests__/firecrawlService.test.ts`
Expected: FAIL (retry logic not implemented)

**Step 3: Add retry logic to firecrawlService.ts**

Add near top of file:

```typescript
interface RetryConfig {
  maxRetries?: number;
  baseDelayMs?: number;
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  baseDelayMs: 1000,
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isRetryableError = (status: number): boolean => {
  return status >= 500 || status === 429;
};
```

Update `extractPageWithFirecrawl` signature and add retry:

```typescript
export const extractPageWithFirecrawl = async (
  url: string,
  apiKey: string,
  retryConfig?: RetryConfig
): Promise<ApifyPageData> => {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      return await doFirecrawlExtraction(url, apiKey);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const statusMatch = lastError.message.match(/\((\d{3})\)/);
      const status = statusMatch ? parseInt(statusMatch[1], 10) : 0;

      if (attempt < config.maxRetries && isRetryableError(status)) {
        const delay = config.baseDelayMs * Math.pow(2, attempt - 1);
        console.log(`[Firecrawl] Retry ${attempt}/${config.maxRetries} after ${delay}ms for ${url}`);
        await sleep(delay);
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new Error('Max retries exceeded');
};

// Move existing logic to internal function
const doFirecrawlExtraction = async (
  url: string,
  apiKey: string
): Promise<ApifyPageData> => {
  // ... existing extractPageWithFirecrawl code ...
};
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- services/__tests__/firecrawlService.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add services/firecrawlService.ts services/__tests__/firecrawlService.test.ts
git commit -m "feat(firecrawl): add retry logic with exponential backoff"
```

---

## Task 5: Refactor pageExtractionService with Provider Router

**Files:**
- Modify: `services/pageExtractionService.ts`
- Test: `services/__tests__/pageExtractionService.test.ts`

**Step 1: Write the failing tests**

Create `services/__tests__/pageExtractionService.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractSinglePage, getExtractionTypeForUseCase } from '../pageExtractionService';

// Mock the provider services
vi.mock('../jinaService', () => ({
  extractPageContent: vi.fn(),
  generateContentHash: vi.fn(() => 'hash123'),
}));

vi.mock('../firecrawlService', () => ({
  extractPageWithFirecrawl: vi.fn(),
}));

vi.mock('../apifyService', () => ({
  extractMultiplePagesTechnicalData: vi.fn(),
}));

import { extractPageContent } from '../jinaService';
import { extractPageWithFirecrawl } from '../firecrawlService';
import { extractMultiplePagesTechnicalData } from '../apifyService';

describe('pageExtractionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getExtractionTypeForUseCase', () => {
    it('returns semantic_only for content analysis', () => {
      expect(getExtractionTypeForUseCase('competitor_analysis')).toBe('semantic_only');
      expect(getExtractionTypeForUseCase('content_quality')).toBe('semantic_only');
    });

    it('returns technical_only for technical audits', () => {
      expect(getExtractionTypeForUseCase('schema_audit')).toBe('technical_only');
      expect(getExtractionTypeForUseCase('link_audit')).toBe('technical_only');
      expect(getExtractionTypeForUseCase('performance')).toBe('technical_only');
    });

    it('returns full_audit for comprehensive checks', () => {
      expect(getExtractionTypeForUseCase('topic_progress')).toBe('full_audit');
      expect(getExtractionTypeForUseCase('full_seo')).toBe('full_audit');
    });
  });

  describe('extractSinglePage', () => {
    it('uses Jina as primary for semantic_only', async () => {
      (extractPageContent as any).mockResolvedValue({
        title: 'Test',
        content: 'Content',
        headings: [],
        links: [],
        images: [],
        schema: [],
        wordCount: 100,
        readingTime: 1,
      });

      const result = await extractSinglePage('https://example.com', {
        jinaApiKey: 'jina-key',
        firecrawlApiKey: 'fc-key',
        extractionType: 'semantic_only',
      });

      expect(extractPageContent).toHaveBeenCalled();
      expect(extractPageWithFirecrawl).not.toHaveBeenCalled();
      expect(result.primaryProvider).toBe('jina');
    });

    it('falls back to Firecrawl when Jina fails', async () => {
      (extractPageContent as any).mockRejectedValue(new Error('Jina 503'));
      (extractPageWithFirecrawl as any).mockResolvedValue({
        url: 'https://example.com',
        statusCode: 200,
        title: 'Test',
        metaDescription: '',
        canonical: '',
        robotsMeta: '',
        schemaMarkup: [],
        schemaTypes: [],
        ttfbMs: 0,
        loadTimeMs: 0,
        htmlSizeKb: 10,
        domNodes: 100,
        html: '<html></html>',
        internalLinks: [],
        externalLinks: [],
        images: [],
      });

      const result = await extractSinglePage('https://example.com', {
        jinaApiKey: 'jina-key',
        firecrawlApiKey: 'fc-key',
        extractionType: 'semantic_only',
      });

      expect(extractPageContent).toHaveBeenCalled();
      expect(extractPageWithFirecrawl).toHaveBeenCalled();
      expect(result.fallbackUsed).toBe('firecrawl');
    });

    it('respects preferredProvider', async () => {
      (extractPageWithFirecrawl as any).mockResolvedValue({
        url: 'https://example.com',
        statusCode: 200,
        title: 'Test',
        metaDescription: '',
        canonical: '',
        robotsMeta: '',
        schemaMarkup: [],
        schemaTypes: [],
        ttfbMs: 0,
        loadTimeMs: 0,
        htmlSizeKb: 10,
        domNodes: 100,
        html: '<html></html>',
        internalLinks: [],
        externalLinks: [],
        images: [],
      });

      const result = await extractSinglePage('https://example.com', {
        jinaApiKey: 'jina-key',
        firecrawlApiKey: 'fc-key',
        preferredProvider: 'firecrawl',
        extractionType: 'semantic_only',
      });

      expect(extractPageWithFirecrawl).toHaveBeenCalled();
      expect(extractPageContent).not.toHaveBeenCalled();
      expect(result.primaryProvider).toBe('firecrawl');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- services/__tests__/pageExtractionService.test.ts`
Expected: FAIL (new functions not implemented)

**Step 3: Update pageExtractionService.ts**

Add imports and new interface at top:

```typescript
import {
  selectProvidersForExtraction,
  getSemanticProvider,
  getTechnicalProvider,
  needsParallelExtraction,
} from './scrapingProviderRouter';
import { ExtractionType, ScrapingProvider, ProviderResult } from '../types';
```

Update `ExtractionConfig` interface:

```typescript
export interface ExtractionConfig {
  // API Keys
  jinaApiKey?: string;
  firecrawlApiKey?: string;
  apifyToken?: string;

  // NEW: Extraction strategy
  extractionType?: ExtractionType;

  // NEW: Provider selection
  preferredProvider?: ScrapingProvider | 'auto';
  enableFallback?: boolean;
  forceApifyDomains?: string[];

  // Existing
  batchSize?: number;
  timeoutMs?: number;
  proxyConfig?: {
    supabaseUrl: string;
    supabaseAnonKey: string;
  };
}
```

Add helper function:

```typescript
/**
 * Get recommended extraction type for a use case
 */
export function getExtractionTypeForUseCase(
  useCase: 'competitor_analysis' | 'topic_progress' | 'schema_audit' |
           'link_audit' | 'content_quality' | 'performance' | 'full_seo'
): ExtractionType {
  switch (useCase) {
    case 'competitor_analysis':
    case 'content_quality':
      return 'semantic_only';
    case 'schema_audit':
    case 'link_audit':
    case 'performance':
      return 'technical_only';
    case 'topic_progress':
    case 'full_seo':
    default:
      return 'full_audit';
  }
}
```

Update `extractSinglePage` function:

```typescript
export const extractSinglePage = async (
  url: string,
  config: ExtractionConfig
): Promise<ExtractedPageData> => {
  const {
    jinaApiKey,
    firecrawlApiKey,
    apifyToken,
    extractionType = 'auto',
    preferredProvider,
    enableFallback = true,
    forceApifyDomains,
    proxyConfig,
  } = config;

  // Select providers based on config
  const providers = selectProvidersForExtraction(extractionType, {
    jinaApiKey,
    firecrawlApiKey,
    apifyToken,
    preferredProvider,
    forceApifyDomains,
    url,
  });

  if (providers.length === 0) {
    throw new Error('No scraping providers configured. Please provide at least one API key.');
  }

  let semantic: JinaExtraction | null = null;
  let technical: ApifyPageData | null = null;
  const errors: string[] = [];
  let primaryProvider: ScrapingProvider = providers[0];
  let fallbackUsed: ScrapingProvider | undefined;

  // Handle parallel extraction for full_audit
  if (needsParallelExtraction(extractionType)) {
    const semanticProvider = getSemanticProvider(providers);
    const technicalProvider = getTechnicalProvider(providers);

    const results = await Promise.allSettled([
      semanticProvider ? extractWithProvider(url, semanticProvider, config) : null,
      technicalProvider && technicalProvider !== semanticProvider
        ? extractWithProvider(url, technicalProvider, config)
        : null,
    ]);

    // Process semantic result
    if (results[0].status === 'fulfilled' && results[0].value) {
      const { data, provider } = results[0].value;
      if ('content' in data) {
        semantic = data;
        primaryProvider = provider;
      } else {
        technical = data;
      }
    } else if (results[0].status === 'rejected') {
      errors.push(`${semanticProvider}: ${results[0].reason}`);
    }

    // Process technical result
    if (results[1].status === 'fulfilled' && results[1].value) {
      const { data } = results[1].value;
      if ('statusCode' in data) {
        technical = data;
      }
    } else if (results[1].status === 'rejected') {
      errors.push(`${technicalProvider}: ${results[1].reason}`);
    }
  } else {
    // Sequential extraction with fallback
    for (const provider of providers) {
      try {
        const { data } = await extractWithProvider(url, provider, config);

        if ('content' in data) {
          semantic = data;
        } else {
          technical = data;
        }

        if (provider !== providers[0]) {
          fallbackUsed = provider;
        }
        primaryProvider = provider;
        break; // Success, stop trying
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`${provider}: ${msg}`);

        if (!enableFallback) break;
      }
    }
  }

  const contentForHash = semantic?.content || technical?.html || '';
  const contentHash = generateContentHash(contentForHash);

  return {
    url,
    technical,
    semantic,
    contentHash,
    extractedAt: Date.now(),
    primaryProvider,
    fallbackUsed,
    errors: errors.length > 0 ? errors : undefined,
  };
};

// Helper to extract with specific provider
async function extractWithProvider(
  url: string,
  provider: ScrapingProvider,
  config: ExtractionConfig
): Promise<{ data: JinaExtraction | ApifyPageData; provider: ScrapingProvider }> {
  switch (provider) {
    case 'jina':
      if (!config.jinaApiKey) throw new Error('Jina API key not configured');
      const jinaResult = await jinaExtractPage(url, config.jinaApiKey, config.proxyConfig);
      return { data: jinaResult, provider: 'jina' };

    case 'firecrawl':
      if (!config.firecrawlApiKey) throw new Error('Firecrawl API key not configured');
      const fcResult = await extractPageWithFirecrawl(url, config.firecrawlApiKey);
      return { data: fcResult, provider: 'firecrawl' };

    case 'apify':
      if (!config.apifyToken) throw new Error('Apify token not configured');
      const apifyResults = await extractMultiplePagesTechnicalData([url], config.apifyToken);
      if (!apifyResults[0]) throw new Error('Apify returned no data');
      return { data: apifyResults[0], provider: 'apify' };

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- services/__tests__/pageExtractionService.test.ts`
Expected: All tests PASS

**Step 5: Run full test suite**

Run: `npm test`
Expected: All 330+ tests PASS

**Step 6: Commit**

```bash
git add services/pageExtractionService.ts services/__tests__/pageExtractionService.test.ts
git commit -m "feat(extraction): refactor to use provider router with fallback chain"
```

---

## Task 6: Update ExtractedPageData Type

**Files:**
- Modify: `types.ts`

**Step 1: Update ExtractedPageData interface**

Find the `ExtractedPageData` interface in `types.ts` and update:

```typescript
// Unified extraction result from pageExtractionService
export interface ExtractedPageData {
  url: string;
  technical: ApifyPageData | null;
  semantic: JinaExtraction | null;
  contentHash: string;
  extractedAt: number;

  // NEW: Provider tracking
  primaryProvider: ScrapingProvider;
  fallbackUsed?: ScrapingProvider;

  errors?: string[];
}
```

**Step 2: Run build to verify types**

Run: `npm run build 2>&1 | grep -E "(error|Error|✓ built)"`
Expected: `✓ built in` with no errors

**Step 3: Commit**

```bash
git add types.ts
git commit -m "feat(types): add provider tracking to ExtractedPageData"
```

---

## Task 7: Update Site Analysis Service V2

**Files:**
- Modify: `services/siteAnalysisServiceV2.ts`

**Step 1: Update extraction calls to use new config**

Find extraction calls and update to include `extractionType`:

```typescript
// In extractPagesForProject or similar functions, update:
const results = await extractPages(urls, {
  jinaApiKey: config.jinaApiKey,
  firecrawlApiKey: config.firecrawlApiKey,
  apifyToken: config.apifyToken,
  extractionType: 'full_audit', // For site analysis, get everything
  proxyConfig: config.proxyConfig,
});
```

**Step 2: Run build**

Run: `npm run build`
Expected: Success

**Step 3: Run tests**

Run: `npm test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add services/siteAnalysisServiceV2.ts
git commit -m "feat(site-analysis): update to use extraction types"
```

---

## Task 8: Final Integration Test

**Files:**
- None (manual verification)

**Step 1: Run full build**

Run: `npm run build`
Expected: Success with no errors

**Step 2: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 3: Verify types**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 4: Create final commit**

```bash
git add -A
git commit -m "feat: complete jina-primary scraping architecture

- Add ExtractionType and ScrapingProvider types
- Create scrapingProviderRouter for intelligent provider selection
- Add retry logic to Jina and Firecrawl services
- Refactor pageExtractionService with fallback chain
- Update ExtractedPageData to track which provider was used
- Keep Firecrawl as fallback, Jina as primary semantic provider
- Apify reserved for technical extraction and JS-heavy sites

Closes: scraping-architecture-refactor"
```

---

## Verification Checklist

After all tasks complete, verify:

- [ ] `npm run build` succeeds
- [ ] `npm test` - all tests pass
- [ ] `npx tsc --noEmit` - no type errors
- [ ] New types exported from types.ts
- [ ] Provider router correctly prioritizes Jina → Firecrawl → Apify
- [ ] Retry logic works for 5xx errors
- [ ] Fallback chain executes when primary fails
- [ ] ExtractedPageData includes provider tracking
