/**
 * CleanArticleRenderer
 *
 * Generates design-agency quality HTML output WITHOUT templates.
 *
 * KEY PRINCIPLES:
 * - NO template classes (no ctc-*, no preset components)
 * - HTML structure is derived from CONTENT (sections, headings, lists, tables)
 * - CSS uses ACTUAL brand values (hex colors, font names, pixels)
 * - Each brand produces UNIQUE output
 * - Standalone HTML that works without external dependencies
 */

import type { DesignDNA } from '../../../types/designDna';

// ============================================================================
// TYPES
// ============================================================================

export interface ArticleSection {
  id: string;
  heading?: string;
  headingLevel?: number;
  content: string;
}

export interface ArticleInput {
  title: string;
  sections: ArticleSection[];
}

export interface CleanRenderOutput {
  html: string;
  css: string;
  fullDocument: string; // Complete standalone HTML document
}

interface ParsedContent {
  type: 'paragraph' | 'heading' | 'list' | 'table' | 'image' | 'blockquote';
  level?: number; // for headings
  items?: string[]; // for lists
  rows?: string[][]; // for tables
  headers?: string[]; // for tables
  src?: string; // for images
  alt?: string; // for images
  text?: string; // for paragraph/blockquote
  raw: string;
}

// ============================================================================
// MAIN RENDERER
// ============================================================================

export class CleanArticleRenderer {
  private designDna: DesignDNA;
  private brandName: string;

  constructor(designDna: DesignDNA, brandName: string = 'Brand') {
    this.designDna = designDna;
    this.brandName = brandName;
  }

  /**
   * Render article content to clean, professional HTML
   */
  render(article: ArticleInput): CleanRenderOutput {
    const css = this.generateCSS();
    const html = this.generateHTML(article);
    const fullDocument = this.wrapInDocument(html, css, article.title);

    return { html, css, fullDocument };
  }

  // ============================================================================
  // HTML GENERATION - Built from content, NOT templates
  // ============================================================================

  private generateHTML(article: ArticleInput): string {
    const parts: string[] = [];

    // Hero section - built dynamically from title
    parts.push(this.buildHero(article.title));

    // Table of contents - built from actual section headings
    const tocItems = article.sections
      .filter(s => s.heading)
      .map((s, i) => ({ id: s.id || `section-${i}`, heading: s.heading! }));

    if (tocItems.length > 2) {
      parts.push(this.buildTableOfContents(tocItems));
    }

    // Main content
    parts.push('<main>');
    parts.push('<article>');

    // Each section - HTML built from parsing the actual content
    for (let i = 0; i < article.sections.length; i++) {
      const section = article.sections[i];
      const isFirst = i === 0;
      const isAlternate = i % 2 === 1;

      parts.push(this.buildSection(section, isFirst, isAlternate));
    }

    parts.push('</article>');
    parts.push('</main>');

    // CTA - only if configured (no hardcoded content)
    // CTA content should come from the brief/business info, not hardcoded here
    // For now, we skip the CTA - it can be added when proper content is available
    // parts.push(this.buildCTA());

    return parts.join('\n');
  }

  /**
   * Build hero section - minimal semantic HTML, NO badges or decorative elements
   */
  private buildHero(title: string): string {
    // Simple, semantic hero - just the title, no badges, no decorations
    return `
<header class="article-header">
  <h1>${this.escapeHtml(title)}</h1>
</header>`;
  }

  /**
   * Build table of contents from actual headings - semantic navigation
   * NO hardcoded text, NO numbered badges
   */
  private buildTableOfContents(items: { id: string; heading: string }[], language: string = 'en'): string {
    const listItems = items.map((item) =>
      `<li><a href="#${item.id}">${this.escapeHtml(item.heading)}</a></li>`
    ).join('\n');

    // Minimal semantic TOC - let CSS handle any styling
    return `
<nav class="article-toc" aria-label="Table of contents">
  <ul>
${listItems}
  </ul>
</nav>`;
  }

  /**
   * Build a content section - HTML structure from PARSING the content
   */
  private buildSection(section: ArticleSection, isFirst: boolean, isAlternate: boolean): string {
    const sectionClass = isAlternate ? 'section section-alt' : 'section';
    const sectionId = section.id || '';

    // Parse the content to understand its structure
    const parsedBlocks = this.parseContent(section.content);

    // Build HTML from parsed content
    const contentHtml = parsedBlocks.map(block => this.renderBlock(block)).join('\n');

    // Build section with heading if present
    const headingHtml = section.heading
      ? `<h${section.headingLevel || 2}>${this.escapeHtml(section.heading)}</h${section.headingLevel || 2}>`
      : '';

    return `
<section id="${sectionId}" class="${sectionClass}">
  <div class="section-inner">
    ${headingHtml}
    ${contentHtml}
  </div>
</section>`;
  }

  /**
   * Parse content string into structured blocks
   * This analyzes WHAT the content contains, not which template to use
   */
  private parseContent(content: string): ParsedContent[] {
    const blocks: ParsedContent[] = [];

    // Split by double newlines to get blocks
    const rawBlocks = content.split(/\n\n+/).filter(b => b.trim());

    for (const raw of rawBlocks) {
      const trimmed = raw.trim();

      // Check for markdown heading
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/m);
      if (headingMatch) {
        blocks.push({
          type: 'heading',
          level: headingMatch[1].length,
          text: headingMatch[2],
          raw: trimmed
        });
        continue;
      }

      // Check for image (markdown or HTML)
      const imgMatch = trimmed.match(/!\[([^\]]*)\]\(([^)]+)\)|<img[^>]+src=["']([^"']+)["'][^>]*>/);
      if (imgMatch) {
        blocks.push({
          type: 'image',
          alt: imgMatch[1] || '',
          src: imgMatch[2] || imgMatch[3] || '',
          raw: trimmed
        });
        continue;
      }

      // Check for markdown table
      if (trimmed.includes('|') && trimmed.split('\n').length > 1) {
        const tableData = this.parseMarkdownTable(trimmed);
        if (tableData) {
          blocks.push({
            type: 'table',
            headers: tableData.headers,
            rows: tableData.rows,
            raw: trimmed
          });
          continue;
        }
      }

      // Check for list (markdown)
      if (/^[\*\-\+]\s+/m.test(trimmed) || /^\d+\.\s+/m.test(trimmed)) {
        const items = trimmed
          .split('\n')
          .filter(line => /^[\*\-\+\d\.]\s*/.test(line.trim()))
          .map(line => line.replace(/^[\*\-\+]\s+/, '').replace(/^\d+\.\s+/, '').trim());

        if (items.length > 0) {
          blocks.push({
            type: 'list',
            items,
            raw: trimmed
          });
          continue;
        }
      }

      // Check for blockquote
      if (trimmed.startsWith('>')) {
        blocks.push({
          type: 'blockquote',
          text: trimmed.replace(/^>\s*/gm, ''),
          raw: trimmed
        });
        continue;
      }

      // Default: paragraph
      blocks.push({
        type: 'paragraph',
        text: trimmed,
        raw: trimmed
      });
    }

    return blocks;
  }

  /**
   * Parse markdown table into structured data
   */
  private parseMarkdownTable(content: string): { headers: string[]; rows: string[][] } | null {
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length < 2) return null;

    // First line is headers
    const headers = lines[0].split('|').map(h => h.trim()).filter(h => h);

    // Skip separator line (contains ---)
    const dataLines = lines.slice(1).filter(l => !l.includes('---'));

    const rows = dataLines.map(line =>
      line.split('|').map(cell => cell.trim()).filter(c => c)
    );

    return { headers, rows };
  }

  /**
   * Render a parsed block to HTML - dynamic, not templated
   */
  private renderBlock(block: ParsedContent): string {
    switch (block.type) {
      case 'heading':
        return `<h${block.level}>${this.processInlineMarkdown(block.text || '')}</h${block.level}>`;

      case 'paragraph':
        return `<p>${this.processInlineMarkdown(block.text || '')}</p>`;

      case 'image':
        return `<figure><img src="${block.src}" alt="${this.escapeHtml(block.alt || '')}" loading="lazy"><figcaption>${this.escapeHtml(block.alt || '')}</figcaption></figure>`;

      case 'list':
        const listItems = (block.items || [])
          .map(item => `<li>${this.processInlineMarkdown(item)}</li>`)
          .join('\n');
        return `<ul>${listItems}</ul>`;

      case 'table':
        return this.renderTable(block.headers || [], block.rows || []);

      case 'blockquote':
        return `<blockquote><p>${this.processInlineMarkdown(block.text || '')}</p></blockquote>`;

      default:
        return `<p>${this.processInlineMarkdown(block.raw)}</p>`;
    }
  }

  /**
   * Render table from data - built dynamically
   */
  private renderTable(headers: string[], rows: string[][]): string {
    const headerCells = headers.map(h => `<th>${this.processInlineMarkdown(h)}</th>`).join('');
    const headerRow = `<tr>${headerCells}</tr>`;

    const bodyRows = rows.map(row => {
      const cells = row.map(cell => `<td>${this.processInlineMarkdown(cell)}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('\n');

    return `
<div class="table-wrapper">
  <table>
    <thead>${headerRow}</thead>
    <tbody>${bodyRows}</tbody>
  </table>
</div>`;
  }

  /**
   * Process inline markdown (bold, italic, links)
   */
  private processInlineMarkdown(text: string): string {
    let result = text;

    // Bold: **text** or __text__
    result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    result = result.replace(/__([^_]+)__/g, '<strong>$1</strong>');

    // Italic: *text* or _text_
    result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    result = result.replace(/_([^_]+)_/g, '<em>$1</em>');

    // Links: [text](url)
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    return result;
  }

  /**
   * Build CTA section - ONLY if CTA content is provided
   * NO hardcoded text whatsoever
   */
  private buildCTA(ctaConfig?: { heading?: string; text?: string; primaryText?: string; primaryUrl?: string; secondaryText?: string; secondaryUrl?: string }): string {
    // If no CTA config provided, return empty - don't inject hardcoded content
    if (!ctaConfig || (!ctaConfig.heading && !ctaConfig.primaryText)) {
      return '';
    }

    const parts: string[] = ['<aside class="article-cta">'];

    if (ctaConfig.heading) {
      parts.push(`<h2>${this.escapeHtml(ctaConfig.heading)}</h2>`);
    }
    if (ctaConfig.text) {
      parts.push(`<p>${this.escapeHtml(ctaConfig.text)}</p>`);
    }

    const hasButtons = ctaConfig.primaryText || ctaConfig.secondaryText;
    if (hasButtons) {
      parts.push('<div class="cta-actions">');
      if (ctaConfig.primaryText && ctaConfig.primaryUrl) {
        parts.push(`<a href="${ctaConfig.primaryUrl}" class="cta-primary">${this.escapeHtml(ctaConfig.primaryText)}</a>`);
      }
      if (ctaConfig.secondaryText && ctaConfig.secondaryUrl) {
        parts.push(`<a href="${ctaConfig.secondaryUrl}" class="cta-secondary">${this.escapeHtml(ctaConfig.secondaryText)}</a>`);
      }
      parts.push('</div>');
    }

    parts.push('</aside>');
    return parts.join('\n');
  }

  // ============================================================================
  // CSS GENERATION - Actual values, NOT CSS variables pointing to templates
  // ============================================================================

  private generateCSS(): string {
    // Extract ACTUAL values from DesignDNA
    const primary = this.getColor('primary');
    const primaryLight = this.getColor('primaryLight');
    const primaryDark = this.getColor('primaryDark');
    const secondary = this.getColor('secondary');
    const accent = this.getColor('accent');

    const textDark = this.getNeutral('dark');
    const textMedium = this.getNeutral('medium');
    const textLight = this.getNeutral('light');
    const bgLight = this.getNeutral('lightest');
    const border = this.getNeutral('light');

    const headingFont = this.getFont('heading');
    const bodyFont = this.getFont('body');

    const radiusSm = this.getRadius('small');
    const radiusMd = this.getRadius('medium');
    const radiusLg = this.getRadius('large');

    // Generate CSS with ACTUAL values embedded
    return `
/* ==========================================================================
   Clean Article Styles - Generated for ${this.brandName}
   Brand Primary: ${primary}
   ========================================================================== */

/* Reset */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* Base Typography */
html { font-size: 16px; scroll-behavior: smooth; }

body {
  font-family: ${bodyFont};
  font-size: 1rem;
  line-height: 1.7;
  color: ${textDark};
  background-color: #ffffff;
  -webkit-font-smoothing: antialiased;
}

/* Headings */
h1, h2, h3, h4, h5, h6 {
  font-family: ${headingFont};
  font-weight: 700;
  color: ${primaryDark};
  line-height: 1.3;
  margin-bottom: 1rem;
}

h1 { font-size: 2.5rem; }
h2 { font-size: 1.875rem; margin-top: 2.5rem; }
h3 { font-size: 1.5rem; margin-top: 2rem; }
h4 { font-size: 1.25rem; margin-top: 1.5rem; }

p { margin-bottom: 1.25rem; max-width: 70ch; }

a { color: ${primary}; text-decoration: none; transition: color 0.2s; }
a:hover { color: ${primaryDark}; text-decoration: underline; }

strong { font-weight: 600; color: ${primaryDark}; }

/* Article Header - clean, semantic */
.article-header {
  padding: 3rem 2rem;
  background: ${bgLight};
  border-bottom: 3px solid ${primary};
}

.article-header h1 {
  max-width: 900px;
  margin: 0 auto;
  font-size: 2.5rem;
  color: ${primaryDark};
}

/* Table of Contents - minimal semantic styling */
.article-toc {
  max-width: 900px;
  margin: 2rem auto;
  padding: 1.5rem 2rem;
  border-left: 3px solid ${primary};
  background: ${bgLight};
}

.article-toc ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.article-toc li a {
  color: ${textDark};
  padding: 0.5rem 0;
  display: block;
  border-bottom: 1px solid transparent;
  transition: all 0.2s;
}

.article-toc li a:hover {
  color: ${primary};
  border-bottom-color: ${primary};
  text-decoration: none;
}

/* Main Content */
main {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 2rem;
}

article {
  padding: 2rem 0;
}

/* Sections */
.section {
  padding: 3rem 0;
  border-bottom: 1px solid ${bgLight};
}

.section:last-child {
  border-bottom: none;
}

.section-alt {
  background: ${bgLight};
  margin: 0 -2rem;
  padding: 3rem 2rem;
  border-radius: ${radiusMd};
}

.section-inner {
  max-width: 100%;
}

/* Lists */
ul, ol {
  padding-left: 1.5rem;
  margin-bottom: 1.5rem;
}

li {
  margin-bottom: 0.5rem;
  line-height: 1.6;
}

ul li::marker {
  color: ${primary};
}

/* Tables */
.table-wrapper {
  overflow-x: auto;
  margin: 2rem 0;
  border-radius: ${radiusMd};
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}

thead {
  background: ${primary};
  color: #ffffff;
}

th {
  padding: 1rem;
  text-align: left;
  font-weight: 600;
}

td {
  padding: 1rem;
  border-bottom: 1px solid ${bgLight};
}

tbody tr:hover {
  background: ${bgLight};
}

/* Images */
figure {
  margin: 2rem 0;
}

figure img {
  width: 100%;
  height: auto;
  border-radius: ${radiusMd};
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

figcaption {
  font-size: 0.875rem;
  color: ${textMedium};
  text-align: center;
  margin-top: 0.75rem;
}

/* Blockquotes */
blockquote {
  border-left: 4px solid ${primary};
  padding: 1.5rem 2rem;
  margin: 2rem 0;
  background: ${bgLight};
  border-radius: 0 ${radiusMd} ${radiusMd} 0;
}

blockquote p {
  font-size: 1.1rem;
  font-style: italic;
  color: ${textMedium};
  margin-bottom: 0;
}

/* CTA - only rendered if content provided */
.article-cta {
  max-width: 900px;
  margin: 3rem auto;
  padding: 2rem;
  background: ${bgLight};
  border-radius: ${radiusMd};
  text-align: center;
}

.article-cta h2 {
  color: ${primaryDark};
  margin-top: 0;
}

.cta-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 1.5rem;
}

.cta-primary, .cta-secondary {
  padding: 0.75rem 1.5rem;
  border-radius: ${radiusSm};
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
}

.cta-primary {
  background: ${primary};
  color: #ffffff;
}

.cta-primary:hover {
  background: ${primaryDark};
  text-decoration: none;
}

.cta-secondary {
  background: transparent;
  color: ${primary};
  border: 1px solid ${primary};
}

.cta-secondary:hover {
  background: ${primary};
  color: #ffffff;
  text-decoration: none;
}

/* Responsive */
@media (max-width: 768px) {
  .article-header { padding: 2rem 1rem; }
  .article-header h1 { font-size: 1.75rem; }

  .article-toc { margin: 1.5rem 1rem; padding: 1rem; }

  main { padding: 0 1rem; }

  .section-alt { margin: 0 -1rem; padding: 2rem 1rem; }

  h2 { font-size: 1.5rem; }
  h3 { font-size: 1.25rem; }

  .article-cta { margin: 2rem 1rem; padding: 1.5rem; }

  .cta-actions { flex-direction: column; }
  .cta-primary, .cta-secondary { width: 100%; text-align: center; }
}
`;
  }

  // ============================================================================
  // DOCUMENT WRAPPER
  // ============================================================================

  private wrapInDocument(html: string, css: string, title: string): string {
    const headingFont = this.getFont('heading');
    const bodyFont = this.getFont('body');

    // Determine Google Fonts to load
    const fontsToLoad = this.getGoogleFontsUrl();

    return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)}</title>
  ${fontsToLoad ? `<link href="${fontsToLoad}" rel="stylesheet">` : ''}
  <style>
${css}
  </style>
</head>
<body>
${html}
</body>
</html>`;
  }

  // ============================================================================
  // HELPER METHODS - Extract actual values from DesignDNA
  // ============================================================================

  private getColor(type: 'primary' | 'primaryLight' | 'primaryDark' | 'secondary' | 'accent'): string {
    const colors = this.designDna.colors || {};
    const defaults: Record<string, string> = {
      primary: '#3b82f6',
      primaryLight: '#93c5fd',
      primaryDark: '#1e40af',
      secondary: '#64748b',
      accent: '#f59e0b'
    };

    const color = colors[type];
    if (!color) return defaults[type];
    if (typeof color === 'string') return color;
    return color.hex || defaults[type];
  }

  private getNeutral(level: 'darkest' | 'dark' | 'medium' | 'light' | 'lightest'): string {
    const neutrals = this.designDna.colors?.neutrals || {};
    const defaults: Record<string, string> = {
      darkest: '#111827',
      dark: '#374151',
      medium: '#6b7280',
      light: '#e5e7eb',
      lightest: '#f9fafb'
    };
    return neutrals[level] || defaults[level];
  }

  private getFont(type: 'heading' | 'body'): string {
    const typography = this.designDna.typography || {};
    const font = type === 'heading' ? typography.headingFont : typography.bodyFont;

    if (!font) {
      return type === 'heading' ? "'Georgia', serif" : "'Open Sans', Arial, sans-serif";
    }

    const family = font.family || (type === 'heading' ? 'Georgia' : 'Open Sans');
    const fallback = font.fallback || (type === 'heading' ? 'serif' : 'sans-serif');

    return `'${family}', ${fallback}`;
  }

  private getRadius(size: 'small' | 'medium' | 'large'): string {
    const shapes = this.designDna.shapes || {};
    const borderRadius = shapes.borderRadius;

    const defaults: Record<string, string> = {
      small: '4px',
      medium: '8px',
      large: '16px'
    };

    if (!borderRadius || typeof borderRadius !== 'object') {
      return defaults[size];
    }

    return borderRadius[size] || defaults[size];
  }

  private getGoogleFontsUrl(): string | null {
    const typography = this.designDna.typography || {};
    const fonts: string[] = [];

    const headingFont = typography.headingFont?.family;
    const bodyFont = typography.bodyFont?.family;

    // Common Google Fonts - add to URL if detected
    const googleFonts = ['Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Roboto Slab',
      'Playfair Display', 'Merriweather', 'Source Sans Pro', 'Raleway', 'Poppins',
      'Nunito', 'Ubuntu', 'Work Sans', 'Fira Sans', 'Inter'];

    if (headingFont && googleFonts.some(f => headingFont.includes(f))) {
      fonts.push(headingFont.replace(/\s+/g, '+') + ':wght@400;700');
    }

    if (bodyFont && bodyFont !== headingFont && googleFonts.some(f => bodyFont.includes(f))) {
      fonts.push(bodyFont.replace(/\s+/g, '+') + ':wght@400;600');
    }

    if (fonts.length === 0) return null;

    return `https://fonts.googleapis.com/css2?family=${fonts.join('&family=')}&display=swap`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * Render article to clean, design-agency quality HTML
 *
 * @param article - Article content (title + sections)
 * @param designDna - Brand design DNA (colors, fonts, etc.)
 * @param brandName - Name of the brand (for display)
 * @returns Complete standalone HTML document
 */
export function renderCleanArticle(
  article: ArticleInput,
  designDna: DesignDNA,
  brandName: string = 'Brand'
): CleanRenderOutput {
  const renderer = new CleanArticleRenderer(designDna, brandName);
  return renderer.render(article);
}
