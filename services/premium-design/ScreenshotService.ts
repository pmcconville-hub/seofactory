// =============================================================================
// ScreenshotService — Captures screenshots of rendered HTML using html2canvas
// =============================================================================

/**
 * Captures a screenshot of rendered HTML+CSS in a hidden iframe.
 * Uses lazy-loaded html2canvas (same pattern as pdfExportService).
 */
export class ScreenshotService {
  private html2canvasModule: typeof import('html2canvas') | null = null;

  /**
   * Lazy-load html2canvas to avoid bundle bloat.
   */
  private async loadHtml2Canvas() {
    if (!this.html2canvasModule) {
      this.html2canvasModule = await import('html2canvas');
    }
    return this.html2canvasModule.default;
  }

  /**
   * Render HTML+CSS in a hidden iframe and capture as base64 JPEG.
   *
   * @param html - The article HTML body content
   * @param css - The CSS stylesheet to apply
   * @returns base64-encoded JPEG string (without data: prefix)
   */
  async captureRenderedOutput(html: string, css: string): Promise<string> {
    const html2canvas = await this.loadHtml2Canvas();

    // Create hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:1200px;height:900px;border:none;opacity:0;pointer-events:none;';
    document.body.appendChild(iframe);

    try {
      const doc = iframe.contentDocument;
      if (!doc) throw new Error('Failed to access iframe document');

      // Write full HTML document into iframe
      doc.open();
      doc.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1200">
<style>${css}</style>
</head>
<body>${html}</body>
</html>`);
      doc.close();

      // Wait for fonts to load
      if (doc.fonts && doc.fonts.ready) {
        await doc.fonts.ready;
      }

      // Wait for CSS paint and layout
      await new Promise(resolve => setTimeout(resolve, 500));

      // Capture screenshot
      const canvas = await html2canvas(doc.body, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: 1200,
        windowWidth: 1200,
        logging: false,
      });

      // Convert to base64 JPEG
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      // Strip the data:image/jpeg;base64, prefix
      return dataUrl.replace(/^data:image\/jpeg;base64,/, '');
    } finally {
      // Clean up iframe
      document.body.removeChild(iframe);
    }
  }
}
