// services/brand-replication/phase1-discovery/ScreenshotCapture.ts

import type { Screenshot, DiscoveryInput } from '../interfaces';

export interface ScreenshotCaptureConfig {
  viewport: { width: number; height: number };
  fullPage: boolean;
  timeout: number;
  waitForSelector?: string;
  outputDir: string;
}

export class ScreenshotCapture {
  private config: ScreenshotCaptureConfig;

  constructor(config: Partial<ScreenshotCaptureConfig> = {}) {
    this.config = {
      viewport: config.viewport ?? { width: 1400, height: 900 },
      fullPage: config.fullPage ?? true,
      timeout: config.timeout ?? 30000,
      waitForSelector: config.waitForSelector,
      outputDir: config.outputDir ?? './tmp/screenshots',
    };
  }

  async capturePages(input: DiscoveryInput): Promise<Screenshot[]> {
    // Dynamic import playwright to avoid bundling issues
    const { chromium } = await import('playwright');

    const screenshots: Screenshot[] = [];
    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: this.config.viewport });

    try {
      const pagesToCapture = input.pagesToAnalyze ?? await this.discoverPages(input.brandUrl);

      for (const url of pagesToCapture.slice(0, input.options?.maxPages ?? 10)) {
        try {
          const page = await context.newPage();
          await page.goto(url, { waitUntil: 'networkidle', timeout: this.config.timeout });

          if (this.config.waitForSelector) {
            await page.waitForSelector(this.config.waitForSelector, { timeout: 5000 }).catch(() => {});
          }

          // Wait a bit for any animations to settle
          await page.waitForTimeout(1000);

          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `${input.brandId}_${timestamp}_${this.urlToFilename(url)}.png`;
          const path = `${this.config.outputDir}/${filename}`;

          await page.screenshot({ path, fullPage: this.config.fullPage });

          screenshots.push({
            url,
            path,
            timestamp: new Date().toISOString(),
            viewport: this.config.viewport,
          });

          await page.close();
        } catch (error) {
          console.error(`Failed to capture ${url}:`, error);
        }
      }
    } finally {
      await browser.close();
    }

    return screenshots;
  }

  private async discoverPages(baseUrl: string): Promise<string[]> {
    // Simple page discovery - get homepage and linked pages
    const { chromium } = await import('playwright');
    const browser = await chromium.launch();
    const page = await browser.newPage();

    const pages = new Set<string>([baseUrl]);

    try {
      await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: this.config.timeout });

      const links = await page.$$eval('a[href]', (anchors, base) => {
        const baseUrl = new URL(base);
        return anchors
          .map(a => a.getAttribute('href'))
          .filter((href): href is string => !!href)
          .map(href => {
            try {
              const url = new URL(href, base);
              return url.origin === baseUrl.origin ? url.href : null;
            } catch {
              return null;
            }
          })
          .filter((url): url is string => !!url);
      }, baseUrl);

      links.forEach(link => pages.add(link.split('#')[0].split('?')[0]));
    } finally {
      await browser.close();
    }

    return Array.from(pages).slice(0, 20);
  }

  private urlToFilename(url: string): string {
    return new URL(url).pathname.replace(/\//g, '_').replace(/^_/, '') || 'home';
  }
}
