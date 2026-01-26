import { describe, it, expect, afterAll } from 'vitest';
import { PageCrawler } from '../PageCrawler';

describe('PageCrawler', () => {
  let crawler: PageCrawler;

  afterAll(async () => {
    if (crawler) await crawler.close();
  });

  describe('capturePage', () => {
    it('captures screenshot and HTML from a URL', async () => {
      crawler = new PageCrawler();
      const result = await crawler.capturePage('https://example.com');

      expect(result.sourceUrl).toBe('https://example.com');
      expect(result.rawHtml.toLowerCase()).toContain('<!doctype html>');
      expect(result.screenshotBase64).toBeTruthy();
      expect(result.screenshotBase64).toMatch(/^data:image\/png;base64,/);
      expect(result.pageType).toBe('homepage');
    }, 30000);
  });
});
