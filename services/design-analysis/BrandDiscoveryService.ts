import { runApifyActor, ApifyProxyConfig } from '../apifyService';
import type {
  BrandDiscoveryReport,
  DesignFinding,
  ExtractionConfidence,
  DesignTokens
} from '../../types/publishing';

// ── Color utility functions ──

/** Parse hex to {r,g,b} */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!match) return null;
  return { r: parseInt(match[1], 16), g: parseInt(match[2], 16), b: parseInt(match[3], 16) };
}

/** Mix a color with white at a given ratio (0-1, where 1 = all white) */
function tintColor(hex: string, ratio: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.min(255, Math.max(0, Math.round(rgb.r + (255 - rgb.r) * ratio)));
  const g = Math.min(255, Math.max(0, Math.round(rgb.g + (255 - rgb.g) * ratio)));
  const b = Math.min(255, Math.max(0, Math.round(rgb.b + (255 - rgb.b) * ratio)));
  return `#${[r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')}`;
}

/** Calculate relative luminance (0-1) */
function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  const [rs, gs, bs] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map(
    c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** Validate and normalize a color to 6-digit hex, or return fallback */
function normalizeHex(color: string, fallback: string): string {
  if (!color) return fallback;
  // Already 6-digit hex
  if (/^#[0-9a-f]{6}$/i.test(color)) return color.toLowerCase();
  // 3-digit hex
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    const expanded = color.slice(1).split('').map(c => c + c).join('');
    return `#${expanded}`.toLowerCase();
  }
  // Try rgb() conversion
  const rgbMatch = color.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    return `#${[rgbMatch[1], rgbMatch[2], rgbMatch[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('')}`;
  }
  return fallback;
}

// Use playwright-scraper which guarantees Playwright page object
const PLAYWRIGHT_SCRAPER_ACTOR_ID = 'apify/playwright-scraper';

/**
 * Enhanced Brand Discovery Service with screenshot capture and confidence scoring.
 * Analyzes target websites to extract design tokens with provenance tracking.
 */
export const BrandDiscoveryService = {
  /**
   * Analyze a URL and generate a complete Brand Discovery Report
   */
  async analyze(url: string, apiToken: string, proxyConfig?: ApifyProxyConfig): Promise<BrandDiscoveryReport> {
    if (!apiToken) {
      throw new Error('Apify API token is required');
    }

    // Ensure URL has protocol - Apify requires full URLs
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const pageFunction = `
      async function pageFunction(context) {
        const { request, page, log } = context;

        try {
          log.info('Starting page analysis for:', request.url);

          // Wait for page to be ready (with timeout)
          await page.waitForLoadState('domcontentloaded', { timeout: 30000 });

          // Additional wait for JS-heavy sites
          await page.waitForTimeout(2000);

          // CRITICAL: Dismiss cookie consent dialogs before capturing screenshots
          // Without this, extracted components are contaminated with cookie dialog HTML
          log.info('Dismissing cookie consent dialogs...');
          try {
            // Try common cookie consent accept buttons (multi-language)
            const cookieAcceptSelectors = [
              // Cookiebot (NFIR and many EU sites)
              '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
              '#CybotCookiebotDialogBodyButtonAccept',
              '[id*="CookiebotDialog"] button[id*="Allow"]',
              '[id*="CookiebotDialog"] button[id*="Accept"]',
              // OneTrust
              '#onetrust-accept-btn-handler',
              '.onetrust-close-btn-handler',
              // CookieYes
              '.cky-btn-accept',
              // Generic patterns (English)
              'button:has-text("Accept all")',
              'button:has-text("Accept All")',
              'button:has-text("Allow all")',
              'button:has-text("Allow All")',
              'button:has-text("Accept cookies")',
              'button:has-text("Accept Cookies")',
              'button:has-text("I agree")',
              'button:has-text("Got it")',
              'button:has-text("OK")',
              // Generic patterns (Dutch - common for .nl sites)
              'button:has-text("Accepteren")',
              'button:has-text("Alles accepteren")',
              'button:has-text("Alle cookies accepteren")',
              'button:has-text("Akkoord")',
              'button:has-text("Toestaan")',
              'button:has-text("Alles toestaan")',
              // Generic patterns (German)
              'button:has-text("Alle akzeptieren")',
              'button:has-text("Akzeptieren")',
              'button:has-text("Zustimmen")',
              // Generic patterns (French)
              'button:has-text("Tout accepter")',
              'button:has-text("Accepter")',
              // Broad fallback
              '[class*="cookie"] button:has-text("Accept")',
              '[class*="cookie"] button:has-text("OK")',
              '[class*="consent"] button:has-text("Accept")',
              '[id*="cookie"] button:has-text("Accept")',
              '[id*="consent"] button:has-text("Accept")',
            ];

            for (const selector of cookieAcceptSelectors) {
              try {
                const btn = await page.$(selector);
                if (btn) {
                  const isVisible = await btn.isVisible().catch(() => false);
                  if (isVisible) {
                    await btn.click({ timeout: 3000 });
                    log.info('Dismissed cookie consent via:', selector);
                    await page.waitForTimeout(1000); // Wait for dialog to close
                    break;
                  }
                }
              } catch (e) {
                // Selector not found or not clickable, try next
              }
            }
          } catch (e) {
            log.info('Cookie consent dismissal attempt completed (may not have been present)');
          }

          // Wait for any animations/transitions after cookie dismissal
          await page.waitForTimeout(500);

          log.info('Page loaded, capturing screenshot...');

          // Capture screenshot
          const screenshot = await page.screenshot({
            type: 'jpeg',
            quality: 80,
            fullPage: false
          });
          const screenshotBase64 = screenshot.toString('base64');

          log.info('Screenshot captured, size:', screenshotBase64.length, 'chars');

          // Extract design data from the page using page.evaluate()
          // This runs in the browser context where document/window are available
          log.info('Extracting design data from DOM...');

          const designData = await page.evaluate(() => {
            // Helper: Check if color is neutral (white, black, gray)
            const isNeutral = (c) => {
              if (!c || c.includes('rgba(0, 0, 0, 0)')) return true;

              let r, g, b;

              // Handle hex colors
              if (c.startsWith('#')) {
                const hex = c.replace('#', '');
                const fullHex = hex.length === 3
                  ? hex.split('').map(ch => ch + ch).join('')
                  : hex;
                r = parseInt(fullHex.slice(0, 2), 16);
                g = parseInt(fullHex.slice(2, 4), 16);
                b = parseInt(fullHex.slice(4, 6), 16);
              } else {
                // Handle rgb/rgba
                const match = c.match(/\\d+/g);
                if (!match || match.length < 3) return true;
                [r, g, b] = match.map(Number);
              }

              if (r === 255 && g === 255 && b === 255) return true;
              if (r === 0 && g === 0 && b === 0) return true;
              // Gray detection: all channels similar
              if (Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && Math.abs(r - b) < 15) return true;
              return false;
            };

            // Helper: Convert RGB to hex
            const rgbToHex = (c) => {
              if (!c) return null;
              if (c.startsWith('#')) return c.toLowerCase();
              const match = c.match(/\\d+/g);
              if (!match || match.length < 3) return null;
              const [r, g, b] = match.map(Number);
              return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
            };

            // Extract CSS custom properties from :root
            const extractCssVariables = () => {
              const vars = {};
              try {
                const rootStyles = getComputedStyle(document.documentElement);
                const colorVarNames = [
                  '--primary', '--primary-color', '--accent', '--accent-color',
                  '--brand', '--brand-color', '--theme-color', '--main-color',
                  '--color-primary', '--color-accent', '--wp--preset--color--primary',
                  '--global-palette1', '--global-palette2'
                ];
                colorVarNames.forEach(name => {
                  const val = rootStyles.getPropertyValue(name).trim();
                  if (val && !isNeutral(val)) {
                    vars[name] = val;
                  }
                });
              } catch (e) {
                console.warn('[BrandDiscovery] CSS variable extraction failed:', e?.message || e);
              }
              return vars;
            };

            // Color extraction
            const results = { primary: null, secondary: null, accent: null, background: null };
            const sources = { primary: 'fallback', secondary: 'fallback', accent: 'fallback', background: 'element' };

            // 1. Try CSS custom properties
            const cssVars = extractCssVariables();
            const cssVarKeys = Object.keys(cssVars);
            if (cssVarKeys.length > 0) {
              const primaryVar = cssVarKeys.find(k => k.includes('primary') || k.includes('brand'));
              const accentVar = cssVarKeys.find(k => k.includes('accent'));
              if (primaryVar) {
                results.primary = cssVars[primaryVar];
                sources.primary = 'css_variable';
              }
              if (accentVar && accentVar !== primaryVar) {
                results.accent = cssVars[accentVar];
                sources.accent = 'css_variable';
              }
            }

            // 2. Try button colors
            if (!results.primary) {
              const btnSelectors = [
                '.wp-block-button__link', '.wp-element-button',
                '.elementor-button', '[class*="elementor-button"]', '.e-button',
                '.kb-button', '.kb-btn', '[class*="kb-button"]',
                'button[class*="primary"]', '.btn-primary', 'a.button',
                'a[class*="btn"]', 'a[class*="button"]', 'button:not([class*="close"])',
                '.cta a', '.hero a[href]', '[class*="cta"] a'
              ];

              for (const sel of btnSelectors) {
                try {
                  const btn = document.querySelector(sel);
                  if (btn) {
                    const style = window.getComputedStyle(btn);
                    const bg = style.backgroundColor;
                    if (bg && !isNeutral(bg)) {
                      results.primary = bg;
                      sources.primary = 'button';
                      break;
                    }
                  }
                } catch (e) {
                  console.warn('[BrandDiscovery] Button selector failed:', sel, e?.message || e);
                }
              }
            }

            // 3. Try link colors
            if (!results.primary) {
              const links = document.querySelectorAll('a[href]:not([class*="logo"]):not([class*="nav"])');
              for (const link of Array.from(links).slice(0, 20)) {
                const style = window.getComputedStyle(link);
                const color = style.color;
                if (color && !isNeutral(color)) {
                  results.primary = color;
                  sources.primary = 'link_color';
                  break;
                }
              }
            }

            // 4. Heading color for secondary
            const h1 = document.querySelector('h1, h2');
            if (h1) {
              const color = window.getComputedStyle(h1).color;
              results.secondary = color || '#18181b';
              sources.secondary = isNeutral(color) ? 'heading_neutral' : 'heading';
            }

            // 5. Background from body
            results.background = window.getComputedStyle(document.body).backgroundColor || '#ffffff';

            // 6. Frequency analysis fallback
            if (!results.primary) {
              const colors = {};
              const elements = document.querySelectorAll(
                'a, button, [class*="btn"], [class*="button"], nav a, header a, ' +
                '.elementor-widget, [class*="cta"], [class*="primary"], [class*="accent"]'
              );
              elements.forEach(el => {
                const style = window.getComputedStyle(el);
                const bg = style.backgroundColor;
                const color = style.color;
                if (!isNeutral(bg)) {
                  colors[bg] = (colors[bg] || 0) + 2;
                }
                if (!isNeutral(color)) {
                  colors[color] = (colors[color] || 0) + 1;
                }
              });
              const sorted = Object.entries(colors).sort((a, b) => b[1] - a[1]);
              if (sorted.length > 0) {
                results.primary = sorted[0][0];
                sources.primary = 'frequency';
              }
            }

            // 7. Final fallback
            if (!results.primary || isNeutral(results.primary)) {
              results.primary = 'rgb(234, 88, 12)';
              sources.primary = 'fallback';
            }

            // 8. Accent defaults to primary
            if (!results.accent) {
              results.accent = results.primary;
              sources.accent = sources.primary;
            }

            // Convert all to hex
            Object.keys(results).forEach(key => {
              if (results[key]) {
                const hex = rgbToHex(results[key]);
                if (hex) results[key] = hex;
              }
            });

            // Typography extraction
            const typoH1 = document.querySelector('h1, h2');
            const typography = {
              heading: typoH1 ? window.getComputedStyle(typoH1).fontFamily : 'system-ui, sans-serif',
              body: window.getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif',
              baseSize: window.getComputedStyle(document.body).fontSize || '16px'
            };
            const typographySources = {
              heading: typoH1 ? 'h1_element' : 'fallback',
              body: 'body_element'
            };

            // Google Fonts detection - extract actual web font imports
            const googleFontsUrls = [];
            try {
              // Check <link> tags for Google Fonts
              const links = document.querySelectorAll('link[href*="fonts.googleapis.com"], link[href*="fonts.gstatic.com"]');
              links.forEach(link => {
                const href = link.getAttribute('href');
                if (href) googleFontsUrls.push(href);
              });
              // Check <style> tags for @import Google Fonts
              const styles = document.querySelectorAll('style');
              styles.forEach(style => {
                const text = style.textContent || '';
                const importMatches = text.match(/@import\\s+url\\(['"]?(https?:\\/\\/fonts\\.googleapis\\.com[^'")]+)['"]?\\)/g);
                if (importMatches) {
                  importMatches.forEach(m => {
                    const urlMatch = m.match(/url\\(['"]?(https?:\\/\\/fonts\\.googleapis\\.com[^'")]+)['"]?\\)/);
                    if (urlMatch) googleFontsUrls.push(urlMatch[1]);
                  });
                }
              });
              // Extract font family names from Google Fonts URLs
              const fontFamilies = [];
              googleFontsUrls.forEach(url => {
                const familyMatches = url.match(/family=([^&]+)/g);
                if (familyMatches) {
                  familyMatches.forEach(fm => {
                    const name = fm.replace('family=', '').split(':')[0].replace(/\\+/g, ' ');
                    if (name && !fontFamilies.includes(name)) fontFamilies.push(name);
                  });
                }
              });
              if (fontFamilies.length > 0) {
                // Override computed fonts with actual Google Fonts
                typography.googleFonts = fontFamilies;
                typography.googleFontsUrl = googleFontsUrls[0]; // Primary URL for @import
                // Map detected Google Fonts to heading/body
                if (fontFamilies.length >= 2) {
                  typography.heading = "'" + fontFamilies[0] + "', sans-serif";
                  typography.body = "'" + fontFamilies[1] + "', sans-serif";
                } else if (fontFamilies.length === 1) {
                  typography.heading = "'" + fontFamilies[0] + "', sans-serif";
                  typography.body = "'" + fontFamilies[0] + "', sans-serif";
                }
                console.log('[BrandDiscovery] Google Fonts detected:', fontFamilies.join(', '));
              }
            } catch (e) {
              console.warn('[BrandDiscovery] Google Fonts detection failed:', e?.message || e);
            }

            // Component extraction
            const btn = document.querySelector('button, .btn, a.button, [class*="button"]');
            const card = document.querySelector('.card, [class*="card"], article, .wp-block-group');
            const components = {
              button: btn ? {
                borderRadius: window.getComputedStyle(btn).borderRadius || '4px',
                source: 'button_element'
              } : { borderRadius: '8px', source: 'fallback' },
              shadow: card ? {
                style: window.getComputedStyle(card).boxShadow || 'none',
                source: 'card_element'
              } : { style: '0 4px 6px rgba(0,0,0,0.1)', source: 'fallback' }
            };

            return {
              colors: results,
              colorSources: sources,
              typography,
              typographySources,
              components,
              googleFontsUrl: typography.googleFontsUrl || null,
              googleFonts: typography.googleFonts || []
            };
          });

          log.info('Extraction complete, returning data');

          return {
            screenshotBase64,
            colors: designData.colors,
            colorSources: designData.colorSources,
            typography: designData.typography,
            typographySources: designData.typographySources,
            components: designData.components,
            googleFontsUrl: designData.googleFontsUrl || null,
            googleFonts: designData.googleFonts || [],
            url: request.url
          };
        } catch (error) {
          log.error('Page analysis failed:', error.message);
          return {
            error: error.message,
            url: request.url,
            screenshotBase64: null
          };
        }
      }
    `;

    const runInput = {
      startUrls: [{ url }],
      pageFunction,
      // Playwright-scraper native options
      proxyConfiguration: { useApifyProxy: true },
      maxConcurrency: 1,
      maxRequestsPerCrawl: 1,
      // Don't follow links - just process the given URL
      linkSelector: '',
      // Browser settings
      launchContext: {
        launchOptions: {
          headless: true,
        },
      },
      // Increase timeout for slow sites
      navigationTimeoutSecs: 60,
      requestHandlerTimeoutSecs: 60,
    };

    console.log('[BrandDiscovery] Starting Apify playwright-scraper for URL:', url);
    const results = await runApifyActor(PLAYWRIGHT_SCRAPER_ACTOR_ID, apiToken, runInput, proxyConfig);

    console.log('[BrandDiscovery] Apify returned', results?.length || 0, 'results');

    if (!results || results.length === 0) {
      throw new Error('No results from brand analysis - Apify returned empty dataset');
    }

    const firstResult = results[0];

    // Check if the pageFunction reported an error
    if (firstResult.error) {
      console.error('[BrandDiscovery] Page analysis error:', firstResult.error);
      throw new Error(`Page analysis failed: ${firstResult.error}`);
    }

    // Check if screenshot was captured
    if (!firstResult.screenshotBase64) {
      console.error('[BrandDiscovery] No screenshot in result:', Object.keys(firstResult));
      throw new Error('Screenshot capture failed - no image data returned');
    }

    console.log('[BrandDiscovery] Screenshot captured, size:', firstResult.screenshotBase64.length, 'chars');

    return this.buildReport(url, firstResult);
  },

  /**
   * Calculate confidence level based on extraction source
   */
  calculateConfidence(field: string, source: string): ExtractionConfidence {
    const highConfidenceSources = ['button', 'button_element', 'h1_element', 'body_element', 'heading', 'css_variable', 'link_color'];
    const mediumConfidenceSources = ['frequency', 'card_element', 'element'];

    if (highConfidenceSources.includes(source)) return 'found';
    if (mediumConfidenceSources.includes(source)) return 'guessed';
    return 'defaulted';
  },

  /**
   * Build complete Brand Discovery Report from raw extraction data
   */
  buildReport(url: string, data: any): BrandDiscoveryReport {
    const makeFinding = (value: string, source: string): DesignFinding => ({
      value,
      confidence: this.calculateConfidence('', source),
      source
    });

    const findings = {
      primaryColor: makeFinding(
        data.colors?.primary || '#ea580c',
        data.colorSources?.primary || 'fallback'
      ),
      secondaryColor: makeFinding(
        data.colors?.secondary || '#18181b',
        data.colorSources?.secondary || 'fallback'
      ),
      accentColor: makeFinding(
        data.colors?.accent || data.colors?.primary || '#ea580c',
        data.colorSources?.accent || data.colorSources?.primary || 'fallback'
      ),
      backgroundColor: makeFinding(
        data.colors?.background || '#ffffff',
        'element'
      ),
      headingFont: makeFinding(
        data.typography?.heading || 'system-ui, sans-serif',
        data.typographySources?.heading || 'fallback'
      ),
      bodyFont: makeFinding(
        data.typography?.body || 'system-ui, sans-serif',
        data.typographySources?.body || 'body_element'
      ),
      borderRadius: makeFinding(
        data.components?.button?.borderRadius || '8px',
        data.components?.button?.source || 'fallback'
      ),
      shadowStyle: makeFinding(
        data.components?.shadow?.style || '0 4px 6px rgba(0,0,0,0.1)',
        data.components?.shadow?.source || 'fallback'
      )
    };

    // Calculate overall confidence score (0-100)
    const confidenceValues = Object.values(findings).map(f =>
      f.confidence === 'found' ? 100 : f.confidence === 'guessed' ? 60 : 20
    );
    const overallConfidence = Math.round(
      confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length
    );

    // Validate and normalize all color findings before deriving tokens
    findings.primaryColor.value = normalizeHex(findings.primaryColor.value, '#ea580c');
    findings.secondaryColor.value = normalizeHex(findings.secondaryColor.value, '#18181b');
    findings.accentColor.value = normalizeHex(findings.accentColor.value, findings.primaryColor.value);
    findings.backgroundColor.value = normalizeHex(findings.backgroundColor.value, '#ffffff');

    // Derive surface/text/border colors from actual brand colors (not hardcoded grays)
    const bg = findings.backgroundColor.value;
    const primary = findings.primaryColor.value;
    const secondary = findings.secondaryColor.value;
    const bgLum = luminance(bg);
    const isDark = bgLum < 0.4;

    const derivedTokens: DesignTokens = {
      colors: {
        primary: primary,
        secondary: secondary,
        accent: findings.accentColor.value,
        background: bg,
        // Derived from actual brand colors — not hardcoded
        surface: isDark ? tintColor(bg, 0.08) : tintColor(primary, 0.95),
        text: isDark ? '#f1f5f9' : tintColor(secondary, 0.1),
        textMuted: isDark ? '#94a3b8' : tintColor(secondary, 0.55),
        border: isDark ? tintColor(bg, 0.15) : tintColor(primary, 0.85),
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444'
      },
      fonts: {
        heading: findings.headingFont.value,
        body: findings.bodyFont.value,
        mono: 'JetBrains Mono, monospace'
      },
      spacing: {
        sectionGap: 'normal',
        contentWidth: 'standard',
        paragraphSpacing: 'normal'
      },
      borderRadius: 'rounded',
      shadows: 'subtle',
      typography: {
        headingWeight: 'bold',
        bodyLineHeight: 'normal',
        headingLineHeight: 'tight'
      }
    };

    return {
      id: `discovery-${Date.now()}`,
      targetUrl: url,
      screenshotBase64: data.screenshotBase64,
      analyzedAt: new Date().toISOString(),
      findings,
      overallConfidence,
      derivedTokens,
      googleFontsUrl: data.googleFontsUrl || null,
      googleFonts: data.googleFonts || [],
    };
  }
};
