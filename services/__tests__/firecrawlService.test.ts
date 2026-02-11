import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractPageWithFirecrawl, validateFirecrawlApiKey } from '../firecrawlService';

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
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => 'Service Unavailable',
      } as Response);
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            html: '<html><head><title>Test</title></head><body>Content</body></html>',
            markdown: '# Test\n\nContent',
            metadata: { title: 'Test', statusCode: 200 },
          },
        }),
      } as Response);

      const result = await extractPageWithFirecrawl('https://example.com', 'test-key', { maxRetries: 3, initialDelayMs: 100, backoffMultiplier: 2 });
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
        extractPageWithFirecrawl('https://example.com', 'test-key', { maxRetries: 2, initialDelayMs: 100, backoffMultiplier: 2 })
      ).rejects.toThrow('503');
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('logs console.warn for invalid JSON-LD and still extracts valid schemas', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      // Suppress console.log from the service
      vi.spyOn(console, 'log').mockImplementation(() => {});

      const htmlWithBadSchema = `<html><head>
        <script type="application/ld+json">NOT VALID JSON</script>
        <script type="application/ld+json">{"@type":"Organization","name":"Test"}</script>
      </head><body></body></html>`;

      const fetchSpy = vi.spyOn(global, 'fetch');
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            html: htmlWithBadSchema,
            markdown: '',
            metadata: { title: 'Test', statusCode: 200 },
          },
        }),
      } as Response);

      const result = await extractPageWithFirecrawl('https://example.com', 'test-key', { maxRetries: 1, initialDelayMs: 100, backoffMultiplier: 1 });

      // The invalid JSON should trigger a console.warn
      expect(warnSpy).toHaveBeenCalledWith(
        '[Firecrawl] Invalid schema JSON:',
        expect.any(String)
      );

      // The valid schema should still be extracted
      expect(result.schemaMarkup).toHaveLength(1);
      expect(result.schemaMarkup[0]).toEqual({ '@type': 'Organization', name: 'Test' });
      expect(result.schemaTypes).toEqual(['Organization']);
    });

    it('gracefully handles malformed URLs in links and images', async () => {
      // Suppress console output from the service
      vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      const htmlWithBadUrls = `<html><head></head><body>
        <a href="https://example.com/good">Good Link</a>
        <a href="http://[::1">Bad Link</a>
        <img src="https://example.com/img.png" alt="Good Image" />
        <img src="http://[::1" alt="Bad Image" />
      </body></html>`;

      const fetchSpy = vi.spyOn(global, 'fetch');
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            html: htmlWithBadUrls,
            markdown: '',
            metadata: { title: 'Test', statusCode: 200 },
          },
        }),
      } as Response);

      const result = await extractPageWithFirecrawl('https://example.com', 'test-key', { maxRetries: 1, initialDelayMs: 100, backoffMultiplier: 1 });

      // Only valid URLs should be present; malformed ones are silently skipped
      expect(result.internalLinks.some(l => l.href.includes('/good'))).toBe(true);
      expect(result.internalLinks.some(l => l.href.includes('[::1'))).toBe(false);
      expect(result.images.some(i => i.src.includes('img.png'))).toBe(true);
      expect(result.images.some(i => i.src.includes('[::1'))).toBe(false);
    });
  });

  describe('validateFirecrawlApiKey', () => {
    it('returns false when fetch throws a network error', async () => {
      // Suppress console output
      vi.spyOn(console, 'log').mockImplementation(() => {});

      const fetchSpy = vi.spyOn(global, 'fetch');
      fetchSpy.mockRejectedValueOnce(new Error('Network error'));

      const result = await validateFirecrawlApiKey('bad-key');
      expect(result).toBe(false);
    });

    it('returns false for 401 response', async () => {
      vi.spyOn(console, 'log').mockImplementation(() => {});

      const fetchSpy = vi.spyOn(global, 'fetch');
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response);

      const result = await validateFirecrawlApiKey('invalid-key');
      expect(result).toBe(false);
    });

    it('returns true for 200 response', async () => {
      vi.spyOn(console, 'log').mockImplementation(() => {});

      const fetchSpy = vi.spyOn(global, 'fetch');
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      } as Response);

      const result = await validateFirecrawlApiKey('valid-key');
      expect(result).toBe(true);
    });
  });
});
