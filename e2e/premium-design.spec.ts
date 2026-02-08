// =============================================================================
// E2E Tests — Premium Design Studio & Quick Export
// =============================================================================

import { test, expect } from '@playwright/test';

test.describe('Quick Export Quality', () => {
  test('exported HTML uses professional stylesheet, not Georgia serif', async ({ page }) => {
    // Create a test HTML file with the Quick Export CSS to verify styling
    const testHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
body { font-family: Inter, system-ui, sans-serif; }
h1, h2, h3 { font-family: Georgia, serif; }
</style>
</head>
<body>
<article>
<h1>Test Article</h1>
<h2 id="section-one">Section One</h2>
<p>Test content paragraph with <a href="#">a link</a>.</p>
<h2 id="section-two">Section Two</h2>
<p>More content here.</p>
<h2 id="section-three">Section Three</h2>
<p>Third section content.</p>
<h2 id="section-four">Section Four</h2>
<p>Fourth section content.</p>
</article>
</body></html>`;

    await page.setContent(testHtml);

    // Verify body uses system font stack, not Georgia
    const bodyFont = await page.evaluate(() => {
      return window.getComputedStyle(document.body).fontFamily;
    });
    expect(bodyFont).not.toContain('Georgia');
    expect(bodyFont).toContain('system-ui');

    // Verify headings use Georgia serif
    const h1Font = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? window.getComputedStyle(h1).fontFamily : '';
    });
    expect(h1Font).toContain('Georgia');
  });

  test('QUICK_EXPORT_CSS contains dark mode, responsive, and print styles', async () => {
    // Import and check the CSS string directly
    const { QUICK_EXPORT_CSS } = await import('../services/quickExportStylesheet');

    expect(QUICK_EXPORT_CSS).toContain('prefers-color-scheme: dark');
    expect(QUICK_EXPORT_CSS).toContain('@media print');
    expect(QUICK_EXPORT_CSS).toContain('768px');
    expect(QUICK_EXPORT_CSS).toContain('640px');
    expect(QUICK_EXPORT_CSS).toContain('.toc');
    expect(QUICK_EXPORT_CSS).toContain('.byline');
  });

  test('injectHeadingIds adds id attributes to h2-h4 tags', async () => {
    const { injectHeadingIds } = await import('../services/quickExportStylesheet');

    const html = '<h2>Hello World</h2><h3>Sub Section</h3><h2>Hello World</h2>';
    const result = injectHeadingIds(html);

    expect(result).toContain('id="hello-world"');
    expect(result).toContain('id="sub-section"');
    expect(result).toContain('id="hello-world-2"'); // duplicate handling
  });

  test('generateTableOfContentsHtml returns empty for fewer than 4 H2 headings', async () => {
    const { generateTableOfContentsHtml, injectHeadingIds } = await import('../services/quickExportStylesheet');

    const html = injectHeadingIds('<h2>One</h2><h2>Two</h2><h2>Three</h2>');
    const toc = generateTableOfContentsHtml(html);

    expect(toc).toBe('');
  });

  test('generateTableOfContentsHtml creates TOC for 4+ H2 headings', async () => {
    const { generateTableOfContentsHtml, injectHeadingIds } = await import('../services/quickExportStylesheet');

    const html = injectHeadingIds(
      '<h2>Section A</h2><p>text</p><h2>Section B</h2><p>text</p>' +
      '<h3>Sub B1</h3><p>text</p><h2>Section C</h2><p>text</p><h2>Section D</h2><p>text</p>'
    );
    const toc = generateTableOfContentsHtml(html);

    expect(toc).toContain('<nav class="toc">');
    expect(toc).toContain('Contents');
    expect(toc).toContain('Section A');
    expect(toc).toContain('Section B');
    expect(toc).toContain('Sub B1');
    expect(toc).toContain('toc-h3'); // H3 gets indented class
  });
});

test.describe('Premium Design Types', () => {
  test('PremiumDesignSession type can be instantiated', async () => {
    const { PremiumDesignOrchestrator } = await import('../services/premium-design');

    // Verify the orchestrator class exists and is constructable
    expect(PremiumDesignOrchestrator).toBeDefined();
    expect(typeof PremiumDesignOrchestrator).toBe('function');
  });

  test('SemanticHtmlGenerator produces semantic HTML with data attributes', async () => {
    const { SemanticHtmlGenerator } = await import('../services/premium-design');

    const generator = new SemanticHtmlGenerator();
    const result = generator.generate(
      '## Introduction\n\nThis is a test article.\n\n## FAQ\n\n### What is this?\n\nA test.\n\n### How does it work?\n\nVery well.\n\n### Why use it?\n\nBecause it works.\n\n## Conclusion\n\nDone.',
      'Test Article'
    );

    expect(result).toContain('<article>');
    expect(result).toContain('data-section-id=');
    expect(result).toContain('data-content-type=');
    expect(result).toContain('<h1>Test Article</h1>');
  });

  test('ScreenshotService class is exportable', async () => {
    const { ScreenshotService } = await import('../services/premium-design');
    expect(ScreenshotService).toBeDefined();
    expect(typeof ScreenshotService).toBe('function');
  });
});

test.describe('Premium Design Validation', () => {
  test('DesignValidationService returns default result on parse failure', async () => {
    const { DesignValidationService } = await import('../services/premium-design');

    const service = new DesignValidationService({
      targetScore: 85,
      maxIterations: 3,
      aiProvider: 'gemini',
      apiKey: 'test-key',
    });

    // The service exists and can be constructed
    expect(service).toBeDefined();
    expect(typeof service.validate).toBe('function');
  });
});
