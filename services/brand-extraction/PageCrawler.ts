import { chromium, type Browser, type Page } from 'playwright';

export interface PageCaptureResult {
  sourceUrl: string;
  pageType: 'homepage' | 'service' | 'article' | 'contact' | 'other';
  rawHtml: string;
  screenshotBase64: string;
  computedStyles: Record<string, Record<string, string>>;
  capturedAt: string;
}

export interface PageCrawlerConfig {
  headless?: boolean;
  timeout?: number;
  viewport?: { width: number; height: number };
}

export class PageCrawler {
  private config: Required<PageCrawlerConfig>;
  private browser: Browser | null = null;

  constructor(config: PageCrawlerConfig = {}) {
    this.config = {
      headless: config.headless ?? true,
      timeout: config.timeout ?? 30000,
      viewport: config.viewport ?? { width: 1440, height: 900 }
    };
  }

  async capturePage(url: string): Promise<PageCaptureResult> {
    const browser = await this.getBrowser();
    const context = await browser.newContext({ viewport: this.config.viewport });
    const page = await context.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: this.config.timeout });
      await page.waitForTimeout(1000);

      const screenshotBuffer = await page.screenshot({ fullPage: true, type: 'png' });
      const screenshotBase64 = `data:image/png;base64,${screenshotBuffer.toString('base64')}`;
      const rawHtml = await page.content();
      const computedStyles = await this.extractComputedStyles(page);
      const pageType = this.detectPageType(url);

      return {
        sourceUrl: url,
        pageType,
        rawHtml,
        screenshotBase64,
        computedStyles,
        capturedAt: new Date().toISOString()
      };
    } finally {
      await context.close();
    }
  }

  private async extractComputedStyles(page: Page): Promise<Record<string, Record<string, string>>> {
    return await page.evaluate(() => {
      const styles: Record<string, Record<string, string>> = {};
      const selectors = ['body', 'h1', 'h2', 'h3', 'p', 'a', 'button'];
      const props = ['color', 'backgroundColor', 'fontFamily', 'fontSize', 'fontWeight', 'padding', 'borderRadius', 'boxShadow'];

      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el) {
          const computed = window.getComputedStyle(el);
          const extracted: Record<string, string> = {};
          for (const prop of props) {
            const value = computed.getPropertyValue(prop.replace(/([A-Z])/g, '-$1').toLowerCase());
            if (value && value !== 'none' && value !== 'normal') {
              extracted[prop] = value;
            }
          }
          if (Object.keys(extracted).length > 0) {
            styles[selector] = extracted;
          }
        }
      }
      return styles;
    });
  }

  private detectPageType(url: string): PageCaptureResult['pageType'] {
    const path = new URL(url).pathname.toLowerCase();
    if (path === '/' || path === '/index.html') return 'homepage';
    if (path.includes('contact') || path.includes('kontakt')) return 'contact';
    if (path.includes('blog') || path.includes('article') || path.includes('nieuws')) return 'article';
    if (path.includes('service') || path.includes('dienst')) return 'service';
    return 'other';
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: this.config.headless });
    }
    return this.browser;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
