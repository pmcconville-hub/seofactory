
import { runApifyActor, ApifyProxyConfig } from '../apifyService';

export interface RawDesignTokens {
  colors: {
    background: string;
    text: string;
    primary: string; // link color
    secondary: string; // usually h1 color or button color
    accent: string;
  };
  typography: {
    bodyFont: string;
    headingFont: string;
    baseFontSize: string;
  };
  components: {
    button: {
      backgroundColor: string;
      color: string;
      borderRadius: string;
    };
    card: {
      backgroundColor: string;
      borderRadius: string;
      boxShadow: string;
    };
  };
}

const WEB_SCRAPER_ACTOR_ID = 'apify/web-scraper';

/**
 * Service to analyze a target website's design system using browser automation.
 * Extracts computed styles for typography, colors, and core components.
 */
export const DesignAnalyzer = {
  /**
   * extracting raw computed styles from a URL
   */
  async analyzeUrl(url: string, apiToken: string, proxyConfig?: ApifyProxyConfig): Promise<RawDesignTokens | null> {
    if (!apiToken) {
      throw new Error('Apify API token is required for design analysis');
    }

    // Define the browser-side function to extract styles
    const pageFunction = `
      async function pageFunction(context) {
        const { request, page, log } = context;
        await page.waitForLoadState('networkidle');

        // Helper: Check if color is neutral (white, black, gray)
        const isNeutral = (c) => {
          if (!c || c.includes('rgba(0, 0, 0, 0)')) return true;
          const rgbStr = c.match(/\\d+/g);
          if (!rgbStr) return true;
          const [r, g, b] = rgbStr.map(Number);
          if (r === 255 && g === 255 && b === 255) return true;
          if (r === 0 && g === 0 && b === 0) return true;
          // Gray detection: all channels similar
          if (Math.abs(r-g) < 15 && Math.abs(g-b) < 15 && Math.abs(r-b) < 15) return true;
          return false;
        };

        // Helper: Convert RGB to hex
        const rgbToHex = (c) => {
          if (!c) return null;
          if (c.startsWith('#')) return c;
          const match = c.match(/\\d+/g);
          if (!match || match.length < 3) return null;
          const [r, g, b] = match.map(Number);
          return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
        };

        // 1. EXTRACT CSS CUSTOM PROPERTIES (highest confidence for modern sites)
        const extractCssVariables = () => {
          const vars = {};
          try {
            const rootStyles = getComputedStyle(document.documentElement);
            const colorVarNames = [
              '--primary', '--primary-color', '--accent', '--accent-color',
              '--brand', '--brand-color', '--theme-color', '--main-color',
              '--color-primary', '--color-accent', '--wp--preset--color--primary',
              '--global-palette1', '--global-palette2', // Kadence theme
              '--ast-global-color-0', '--ast-global-color-1' // Astra theme
            ];
            colorVarNames.forEach(name => {
              const val = rootStyles.getPropertyValue(name).trim();
              if (val && !isNeutral(val)) {
                vars[name] = val;
              }
            });
          } catch (e) {
            console.warn('[DesignAnalyzer] CSS variable extraction failed:', e?.message || e);
          }
          return vars;
        };

        // 2. FIND PRIMARY BUTTON (expanded selectors for WordPress/Elementor)
        const findPrimaryButton = () => {
          const btnSelectors = [
            // WordPress core
            '.wp-block-button__link', '.wp-element-button',
            // Elementor
            '.elementor-button', '[class*="elementor-button"]', '.e-button',
            // Kadence
            '.kb-button', '.kb-btn', '[class*="kb-button"]',
            // Astra
            '.ast-button', '[class*="ast-button"]',
            // Generic
            'button[class*="primary"]', '.btn-primary', 'a.button',
            'a[class*="btn"]', 'a[class*="button"]',
            'button:not([class*="close"]):not([class*="dismiss"])',
            // CTA sections
            '.cta a', '.hero a[href]', '[class*="cta"] a'
          ];
          for (const sel of btnSelectors) {
            try {
              const el = document.querySelector(sel);
              if (el) {
                const s = window.getComputedStyle(el);
                const bg = s.backgroundColor;
                if (bg && bg !== 'rgba(0, 0, 0, 0)' && !isNeutral(bg) && s.display !== 'none') {
                  return el;
                }
              }
            } catch (e) {
              console.warn('[DesignAnalyzer] Button selector failed:', sel, e?.message || e);
            }
          }
          return null;
        };

        // 3. FREQUENCY ANALYSIS (improved element selection)
        const analyzeColorFrequency = () => {
          const colorCounts = {};
          const bgCounts = {};

          const elements = Array.from(document.querySelectorAll(
            'h1, h2, h3, button, a[href], [class*="btn"], [class*="button"], ' +
            '.elementor-widget, [class*="cta"], [class*="primary"], [class*="accent"], ' +
            'nav a, header a, .wp-block-button__link'
          )).slice(0, 200);

          elements.forEach(el => {
            const style = window.getComputedStyle(el);
            const color = style.color;
            const bg = style.backgroundColor;

            if (!isNeutral(color)) {
              colorCounts[color] = (colorCounts[color] || 0) + 1;
            }
            if (!isNeutral(bg)) {
              bgCounts[bg] = (bgCounts[bg] || 0) + 2; // Higher weight for backgrounds
            }
          });

          return { colorCounts, bgCounts };
        };

        const getMostFrequent = (counts) => {
          const entries = Object.entries(counts);
          if (entries.length === 0) return null;
          return entries.sort((a, b) => b[1] - a[1])[0][0];
        };

        // Execute extraction
        const cssVars = extractCssVariables();
        const { colorCounts, bgCounts } = analyzeColorFrequency();
        const bodyStyle = window.getComputedStyle(document.body);
        const h1 = document.querySelector('h1') || document.querySelector('h2');
        const h1Style = h1 ? window.getComputedStyle(h1) : bodyStyle;
        const primBtn = findPrimaryButton();
        const btnStyle = primBtn ? window.getComputedStyle(primBtn) : null;

        // 4. RESOLVE BRAND COLOR (priority order)
        let brandColor = null;
        let brandSource = 'fallback';

        // Priority 1: CSS custom properties
        const cssVarKeys = Object.keys(cssVars);
        if (cssVarKeys.length > 0) {
          const primaryVar = cssVarKeys.find(k => k.includes('primary') || k.includes('brand') || k.includes('palette1'));
          if (primaryVar) {
            brandColor = cssVars[primaryVar];
            brandSource = 'css_variable';
          }
        }

        // Priority 2: Button background
        if (!brandColor && btnStyle) {
          const btnBg = btnStyle.backgroundColor;
          if (btnBg && !isNeutral(btnBg)) {
            brandColor = btnBg;
            brandSource = 'button';
          }
        }

        // Priority 3: Link colors (often the brand color)
        if (!brandColor) {
          const links = document.querySelectorAll('a[href]:not([class*="logo"]):not([class*="nav"])');
          for (const link of Array.from(links).slice(0, 20)) {
            const style = window.getComputedStyle(link);
            const color = style.color;
            if (color && !isNeutral(color)) {
              brandColor = color;
              brandSource = 'link_color';
              break;
            }
          }
        }

        // Priority 4: Frequency analysis
        if (!brandColor) {
          brandColor = getMostFrequent(bgCounts) || getMostFrequent(colorCounts);
          if (brandColor) brandSource = 'frequency';
        }

        // Priority 5: Final fallback - vibrant orange
        if (!brandColor || isNeutral(brandColor)) {
          brandColor = 'rgb(234, 88, 12)';
          brandSource = 'fallback';
        }

        // Convert to hex
        brandColor = rgbToHex(brandColor) || brandColor;

        // Theme detection
        const rgb = bodyStyle.backgroundColor.match(/\\d+/g);
        const luma = rgb ? (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) : 255;
        const isDark = luma < 128;

        return {
          colors: {
            background: bodyStyle.backgroundColor || '#ffffff',
            text: bodyStyle.color || '#000000',
            primary: brandColor,
            secondary: h1Style.color || '#18181b',
            isDark
          },
          typography: {
            bodyFont: bodyStyle.fontFamily || 'sans-serif',
            headingFont: h1Style.fontFamily || 'sans-serif',
            baseFontSize: bodyStyle.fontSize || '16px'
          },
          components: {
            button: btnStyle ? {
              backgroundColor: btnStyle.backgroundColor,
              color: btnStyle.color,
              borderRadius: btnStyle.borderRadius,
              fontFamily: btnStyle.fontFamily
            } : null
          },
          _debug: {
            brandSource,
            cssVarsFound: cssVarKeys,
            frequencyTopColors: Object.entries(colorCounts).slice(0, 3),
            frequencyTopBgs: Object.entries(bgCounts).slice(0, 3)
          }
        };
      }
    `;

    const runInput = {
      startUrls: [{ url }],
      pageFunction,
      proxyConfiguration: {
        useApifyProxy: true,
      },
      maxConcurrency: 1, // Single page analysis, no need for parallel
      maxRequestsPerCrawl: 1,
      linkSelector: '', // Don't crawl links
    };

    try {
      const results = await runApifyActor(WEB_SCRAPER_ACTOR_ID, apiToken, runInput, proxyConfig);

      if (!results || results.length === 0) {
        console.warn('[DesignAnalyzer] No results returned from Apify');
        return null;
      }

      const data = results[0];

      // Map scraping result to RawDesignTokens interface
      // Note: The structure returned from pageFunction matches what we put in `return {...}` inside it.
      // But we need to ensure defaults if things are missing

      // Log debug info if available
      if (data._debug) {
        console.log('[DesignAnalyzer] Brand detection:', {
          source: data._debug.brandSource,
          cssVars: data._debug.cssVarsFound,
          topColors: data._debug.frequencyTopColors,
          topBgs: data._debug.frequencyTopBgs
        });
      }

      // Use vibrant orange as fallback instead of dark gray
      const fallbackPrimary = '#ea580c';

      return {
        colors: {
          background: data.colors?.background || '#ffffff',
          text: data.colors?.text || '#18181b',
          primary: data.colors?.primary || fallbackPrimary,
          secondary: data.colors?.secondary || '#18181b',
          accent: data.colors?.primary || fallbackPrimary
        },
        typography: {
          bodyFont: data.typography?.bodyFont || 'system-ui, sans-serif',
          headingFont: data.typography?.headingFont || 'system-ui, sans-serif',
          baseFontSize: data.typography?.baseFontSize || '16px'
        },
        components: {
          button: {
            backgroundColor: data.components?.button?.backgroundColor || fallbackPrimary,
            color: data.components?.button?.color || '#ffffff',
            borderRadius: data.components?.button?.borderRadius || '8px'
          },
          card: {
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }
        }
      };

    } catch (error) {
      console.error('[DesignAnalyzer] Failed to analyze design:', error);
      throw error;
    }
  }
};
