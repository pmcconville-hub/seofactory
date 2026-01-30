/**
 * Semantic Renderer
 *
 * Renders semantic layout blueprints to design-agency quality HTML.
 * Uses transformed content structures to produce visually distinct components.
 *
 * @module services/semantic-layout/SemanticRenderer
 */

import type {
  SemanticLayoutBlueprint,
  BlueprintSection,
  BrandContext,
  RenderedArticle,
  RenderMetadata,
  TransformedContent,
  CardContent,
  ListContent,
  TimelineContent,
  TableContent,
  StatContent,
  FAQContent,
  ProseContent,
  ComponentType,
  VisualEmphasis,
  BackgroundTreatment,
  TOCBlueprint,
  ISemanticRenderer,
} from './types';

/**
 * Semantic Renderer
 *
 * Produces design-agency quality HTML from semantic layout blueprints.
 */
export class SemanticRenderer implements ISemanticRenderer {
  private brandContext: BrandContext;

  /**
   * Render a semantic layout blueprint to HTML
   */
  async render(
    blueprint: SemanticLayoutBlueprint,
    brandContext: BrandContext
  ): Promise<RenderedArticle> {
    this.brandContext = brandContext;

    const sections = blueprint.sections ?? [];
    const title = blueprint.document?.title ?? 'Untitled Article';

    console.log('[SemanticRenderer] Rendering blueprint:', {
      sections: sections.length,
      components: [...new Set(sections.map(s => s.layout.component))],
    });

    const parts: string[] = [];

    // Hero/Header
    parts.push(this.renderHero(title));

    // Table of Contents
    if (blueprint.toc && blueprint.toc.style !== 'none') {
      parts.push(this.renderTOC(blueprint.toc));
    }

    // Main content
    parts.push('<main class="article-main">');
    parts.push('<article class="article-content">');

    // Sections
    for (const section of sections) {
      parts.push(await this.renderSection(section));
    }

    parts.push('</article>');
    parts.push('</main>');

    // Footer accessories
    for (const accessory of (blueprint.footerAccessories ?? [])) {
      parts.push(this.renderFooterAccessory(accessory));
    }

    // Build full document
    const html = this.wrapInDocument(
      parts.join('\n'),
      title
    );

    // Get CSS
    const css = this.getCSS();

    // Calculate metadata
    const metadata = this.calculateMetadata(html, blueprint);

    return { html, css, metadata };
  }

  /**
   * Render hero section
   */
  private renderHero(title: string): string {
    return `
<header class="article-header">
  <div class="article-header-inner">
    <h1 class="article-title">${this.escapeHtml(title)}</h1>
  </div>
</header>`;
  }

  /**
   * Render table of contents
   */
  private renderTOC(toc: TOCBlueprint): string {
    if (toc.items.length === 0) return '';

    const renderItems = (items: typeof toc.items, depth = 0): string => {
      return items.map(item => `
        <li class="toc-item toc-level-${item.level}">
          <a href="#${item.id}" class="toc-link">${this.escapeHtml(item.text)}</a>
          ${item.children?.length ? `<ul class="toc-sublist">${renderItems(item.children, depth + 1)}</ul>` : ''}
        </li>
      `).join('\n');
    };

    const styleClass = toc.style === 'floating' ? 'toc-floating' : 'toc-inline';

    return `
<nav class="article-toc ${styleClass}" aria-label="Table of contents">
  <ul class="toc-list">
    ${renderItems(toc.items)}
  </ul>
</nav>`;
  }

  /**
   * Render a single section
   */
  private async renderSection(section: BlueprintSection): Promise<string> {
    const { layout, heading, transformation, accessories } = section;

    // Build section classes
    const classes = [
      'section',
      `section-${transformation.targetComponent}`,
      `emphasis-${layout.emphasis}`,
      `width-${layout.width}`,
      `bg-${layout.background}`,
    ].join(' ');

    // Render content based on transformation
    const contentHtml = this.renderTransformedContent(transformation.transformedContent);

    // Render heading
    const headingHtml = heading.text
      ? `<h${heading.level} id="${heading.id}" class="section-heading heading-${this.getHeadingSize(layout.emphasis)}">${this.escapeHtml(heading.text)}</h${heading.level}>`
      : '';

    // Render accessories
    const beforeAccessories = accessories
      .filter(a => a.position === 'before')
      .map(a => this.renderAccessory(a))
      .join('\n');

    const afterAccessories = accessories
      .filter(a => a.position === 'after')
      .map(a => this.renderAccessory(a))
      .join('\n');

    // Build section HTML
    return `
<section id="${section.id}" class="${classes}" data-component="${layout.component}">
  <div class="section-container">
    ${beforeAccessories}
    ${headingHtml}
    <div class="section-content">
      ${contentHtml}
    </div>
    ${afterAccessories}
  </div>
</section>`;
  }

  /**
   * Render transformed content based on type
   */
  private renderTransformedContent(content: TransformedContent): string {
    switch (content.type) {
      case 'cards':
        return this.renderCards(content as CardContent);
      case 'list':
        return this.renderList(content as ListContent);
      case 'timeline':
        return this.renderTimeline(content as TimelineContent);
      case 'table':
        return this.renderTable(content as TableContent);
      case 'stats':
        return this.renderStats(content as StatContent);
      case 'faq':
        return this.renderFAQ(content as FAQContent);
      case 'prose':
      default:
        return this.renderProse(content as ProseContent);
    }
  }

  /**
   * Render feature cards
   */
  private renderCards(content: CardContent): string {
    const items = content.items.map(item => `
      <div class="feature-card card-elevation-1">
        ${item.icon ? `<div class="feature-icon">${this.getIconSvg(item.icon)}</div>` : ''}
        <h3 class="feature-title">${this.escapeHtml(item.title)}</h3>
        <p class="feature-description">${this.escapeHtml(item.description)}</p>
        ${item.link ? `<a href="${item.link}" class="feature-link">Learn more →</a>` : ''}
      </div>
    `).join('\n');

    return `<div class="feature-grid columns-${content.columns}">${items}</div>`;
  }

  /**
   * Render list content
   */
  private renderList(content: ListContent): string {
    const tag = content.ordered ? 'ol' : 'ul';
    const items = content.items.map(item => {
      const subItems = item.subItems?.length
        ? `<ul class="sub-list">${item.subItems.map(si => `<li>${this.escapeHtml(si)}</li>`).join('')}</ul>`
        : '';
      return `<li class="list-item">${this.processInlineMarkdown(item.text)}${subItems}</li>`;
    }).join('\n');

    return `
      ${content.introSentence ? `<p class="list-intro">${this.escapeHtml(content.introSentence)}</p>` : ''}
      <${tag} class="styled-list">${items}</${tag}>
    `;
  }

  /**
   * Render timeline
   */
  private renderTimeline(content: TimelineContent): string {
    const items = content.items.map((item, i) => `
      <div class="timeline-item">
        <div class="timeline-marker">
          <span class="timeline-marker-text">${this.escapeHtml(item.marker)}</span>
        </div>
        <div class="timeline-content">
          <h4 class="timeline-title">${this.escapeHtml(item.title)}</h4>
          <p class="timeline-text">${this.processInlineMarkdown(item.content)}</p>
        </div>
      </div>
    `).join('\n');

    return `<div class="timeline">${items}</div>`;
  }

  /**
   * Render table
   */
  private renderTable(content: TableContent): string {
    const headerCells = content.headers.map(h =>
      `<th>${this.escapeHtml(h)}</th>`
    ).join('');

    const rows = content.rows.map(row => {
      const cells = row.map((cell, i) =>
        content.highlightFirstColumn && i === 0
          ? `<th scope="row">${this.escapeHtml(cell)}</th>`
          : `<td>${this.escapeHtml(cell)}</td>`
      ).join('');
      return `<tr>${cells}</tr>`;
    }).join('\n');

    return `
      <div class="table-wrapper">
        ${content.caption ? `<p class="table-caption">${this.escapeHtml(content.caption)}</p>` : ''}
        <table class="styled-table">
          <thead><tr>${headerCells}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  /**
   * Render statistics
   */
  private renderStats(content: StatContent): string {
    const items = content.items.map(item => `
      <div class="stat-item">
        <div class="stat-value">${this.escapeHtml(item.value)}</div>
        <div class="stat-label">${this.escapeHtml(item.label)}</div>
        ${item.description ? `<div class="stat-description">${this.escapeHtml(item.description)}</div>` : ''}
        ${item.trend ? `<div class="stat-trend stat-trend-${item.trend}">${item.trend === 'up' ? '↑' : item.trend === 'down' ? '↓' : '→'}</div>` : ''}
      </div>
    `).join('\n');

    return `<div class="stat-grid stat-layout-${content.layout}">${items}</div>`;
  }

  /**
   * Render FAQ
   */
  private renderFAQ(content: FAQContent): string {
    if (content.style === 'accordion') {
      const items = content.items.map((item, i) => `
        <details class="faq-item">
          <summary class="faq-question">${this.escapeHtml(item.question)}</summary>
          <div class="faq-answer">${this.processInlineMarkdown(item.answer)}</div>
        </details>
      `).join('\n');

      return `<div class="faq-accordion">${items}</div>`;
    } else {
      const items = content.items.map(item => `
        <div class="faq-card">
          <div class="faq-question">${this.escapeHtml(item.question)}</div>
          <div class="faq-answer">${this.processInlineMarkdown(item.answer)}</div>
        </div>
      `).join('\n');

      return `<div class="faq-cards">${items}</div>`;
    }
  }

  /**
   * Render prose content
   */
  private renderProse(content: ProseContent): string {
    const paragraphs = content.paragraphs.map(p =>
      `<p>${this.processInlineMarkdown(p)}</p>`
    ).join('\n');

    if (content.leadParagraph) {
      return `
        <p class="lead-paragraph">${this.processInlineMarkdown(content.leadParagraph)}</p>
        ${content.paragraphs.slice(1).map(p => `<p>${this.processInlineMarkdown(p)}</p>`).join('\n')}
      `;
    }

    return `<div class="prose">${paragraphs}</div>`;
  }

  /**
   * Render section accessory
   */
  private renderAccessory(accessory: BlueprintSection['accessories'][0]): string {
    switch (accessory.type) {
      case 'callout':
        return `
          <aside class="callout callout-${(accessory.content as any).type || 'insight'}">
            <div class="callout-content">${this.escapeHtml((accessory.content as any).text || '')}</div>
          </aside>
        `;

      case 'stat-highlight':
        const stats = (accessory.content as any).stats || [];
        return `
          <div class="stat-highlight-inline">
            ${stats.map((s: any) => `
              <div class="stat-inline">
                <span class="stat-value">${s.value}</span>
                <span class="stat-label">${s.label}</span>
              </div>
            `).join('')}
          </div>
        `;

      case 'cta-inline':
        return `
          <div class="cta-inline cta-${(accessory.content as any).type || 'secondary'}">
            <span class="cta-text">${this.escapeHtml((accessory.content as any).text || '')}</span>
          </div>
        `;

      default:
        return '';
    }
  }

  /**
   * Render footer accessory
   */
  private renderFooterAccessory(accessory: SemanticLayoutBlueprint['footerAccessories'][0]): string {
    switch (accessory.type) {
      case 'cta':
        return `
          <aside class="article-cta">
            <h2>${this.escapeHtml((accessory.content as any).heading || '')}</h2>
            <p>${this.escapeHtml((accessory.content as any).text || '')}</p>
            <div class="cta-actions">
              <a href="#" class="cta-button cta-primary">Get Started</a>
            </div>
          </aside>
        `;

      case 'related-posts':
        return `
          <aside class="related-posts">
            <h3>Related Articles</h3>
            <div class="related-posts-placeholder">[Related posts will be loaded dynamically]</div>
          </aside>
        `;

      default:
        return '';
    }
  }

  /**
   * Get heading size class from emphasis
   */
  private getHeadingSize(emphasis: VisualEmphasis): string {
    const sizeMap: Record<VisualEmphasis, string> = {
      hero: 'xl',
      featured: 'lg',
      standard: 'md',
      supporting: 'sm',
      minimal: 'xs',
    };
    return sizeMap[emphasis] || 'md';
  }

  /**
   * Get icon SVG (placeholder - would use icon library in production)
   */
  private getIconSvg(iconName: string): string {
    // Return a simple placeholder icon
    // In production, this would use a proper icon library
    return `<span class="icon icon-${iconName}" aria-hidden="true">●</span>`;
  }

  /**
   * Wrap content in full HTML document
   */
  private wrapInDocument(html: string, title: string): string {
    const fontsUrl = this.getGoogleFontsUrl();

    return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)}</title>
  ${fontsUrl ? `<link href="${fontsUrl}" rel="stylesheet">` : ''}
  <style>
${this.getCSS()}
  </style>
</head>
<body>
${html}
</body>
</html>`;
  }

  /**
   * Get Google Fonts URL
   */
  private getGoogleFontsUrl(): string | null {
    const fonts: string[] = [];
    const headingFont = this.brandContext.typography.headingFont;
    const bodyFont = this.brandContext.typography.bodyFont;

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

  /**
   * Get complete CSS
   */
  private getCSS(): string {
    // If brand system has compiled CSS, use it
    if (this.brandContext.designSystem?.compiledCss) {
      return `${this.brandContext.designSystem.compiledCss}\n\n${this.getComponentCSS()}`;
    }

    // Otherwise generate from brand context
    return this.generateBrandCSS() + '\n\n' + this.getComponentCSS();
  }

  /**
   * Generate CSS from brand context
   */
  private generateBrandCSS(): string {
    const { colorPalette, typography } = this.brandContext;

    return `
/* ==========================================================================
   Brand CSS - Generated for ${this.brandContext.brandName}
   ========================================================================== */

:root {
  --color-primary: ${colorPalette.primary};
  --color-secondary: ${colorPalette.secondary};
  --color-accent: ${colorPalette.accent};
  --color-background: ${colorPalette.background};
  --color-text: ${colorPalette.text};
  --font-heading: ${typography.headingFont};
  --font-body: ${typography.bodyFont};
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { font-size: ${typography.baseFontSize}; scroll-behavior: smooth; }

body {
  font-family: var(--font-body), -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 1rem;
  line-height: 1.7;
  color: var(--color-text);
  background-color: var(--color-background);
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading), Georgia, serif;
  font-weight: 700;
  line-height: 1.3;
  margin-bottom: 1rem;
}

h1 { font-size: 2.5rem; }
h2 { font-size: 1.875rem; margin-top: 2.5rem; }
h3 { font-size: 1.5rem; margin-top: 2rem; }
h4 { font-size: 1.25rem; margin-top: 1.5rem; }

p { margin-bottom: 1.25rem; max-width: 70ch; }

a { color: var(--color-primary); text-decoration: none; transition: color 0.2s; }
a:hover { color: var(--color-secondary); text-decoration: underline; }

strong { font-weight: 600; }
`;
  }

  /**
   * Get component-specific CSS
   */
  private getComponentCSS(): string {
    return `
/* ==========================================================================
   Component Styles
   ========================================================================== */

/* Article Structure */
.article-header {
  padding: 4rem 2rem;
  background: linear-gradient(135deg, var(--color-background) 0%, #ffffff 100%);
  border-bottom: 4px solid var(--color-primary);
}

.article-header-inner {
  max-width: 900px;
  margin: 0 auto;
}

.article-title {
  font-size: 2.5rem;
  margin: 0;
}

.article-main {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 2rem;
}

.article-content {
  padding: 2rem 0;
}

/* TOC */
.article-toc {
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 8px;
  margin: 2rem 0;
}

.article-toc.toc-floating {
  position: sticky;
  top: 1rem;
}

.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.toc-item {
  margin-bottom: 0.5rem;
}

.toc-link {
  display: block;
  padding: 0.25rem 0;
  color: inherit;
  border-bottom: 1px solid transparent;
}

.toc-link:hover {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
  text-decoration: none;
}

/* Sections */
.section {
  padding: 2rem 0;
  border-bottom: 1px solid #f0f0f0;
}

.section:last-child {
  border-bottom: none;
}

.section-container {
  max-width: 100%;
}

.section-heading {
  margin-bottom: 1.5rem;
}

.heading-xl { font-size: 2.25rem; }
.heading-lg { font-size: 1.75rem; }
.heading-md { font-size: 1.5rem; }
.heading-sm { font-size: 1.25rem; }
.heading-xs { font-size: 1.125rem; }

/* Emphasis Styles */
.emphasis-hero {
  padding: 4rem 2rem;
  background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
  border-radius: 12px;
  margin: 2rem 0;
  position: relative;
}

.emphasis-hero::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--color-primary), var(--color-accent, var(--color-primary)));
  border-radius: 12px 12px 0 0;
}

.emphasis-featured {
  padding: 3rem 2rem;
  background: #f9fafb;
  border-radius: 8px;
  margin: 1.5rem 0;
  border-left: 4px solid var(--color-primary);
}

.emphasis-standard {
  padding: 2rem 0;
}

.emphasis-supporting {
  padding: 1.5rem 0;
}

.emphasis-minimal {
  padding: 1rem 0;
}

/* Background Treatments */
.bg-gradient {
  background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
}

.bg-subtle-gray {
  background: #f9fafb;
  margin: 0 -2rem;
  padding: 2rem;
  border-radius: 0;
}

.bg-solid-primary {
  background: var(--color-primary);
  color: #ffffff;
}

/* Feature Cards */
.feature-grid {
  display: grid;
  gap: 1.5rem;
}

.feature-grid.columns-2 { grid-template-columns: repeat(2, 1fr); }
.feature-grid.columns-3 { grid-template-columns: repeat(3, 1fr); }
.feature-grid.columns-4 { grid-template-columns: repeat(4, 1fr); }

@media (max-width: 768px) {
  .feature-grid.columns-2,
  .feature-grid.columns-3,
  .feature-grid.columns-4 {
    grid-template-columns: 1fr;
  }
}

.feature-card {
  padding: 1.5rem;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  transition: transform 0.2s, box-shadow 0.2s;
}

.feature-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
}

.feature-icon {
  width: 48px;
  height: 48px;
  background: var(--color-primary);
  color: #ffffff;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  font-size: 1.5rem;
}

.feature-title {
  font-size: 1.125rem;
  margin-bottom: 0.5rem;
}

.feature-description {
  color: #6b7280;
  font-size: 0.95rem;
  margin-bottom: 0;
}

/* Timeline */
.timeline {
  position: relative;
  padding-left: 2rem;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--color-primary);
}

.timeline-item {
  position: relative;
  padding-bottom: 2rem;
}

.timeline-item:last-child {
  padding-bottom: 0;
}

.timeline-marker {
  position: absolute;
  left: -2rem;
  width: 2.5rem;
  height: 2.5rem;
  background: var(--color-primary);
  color: #ffffff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.875rem;
  transform: translateX(-50%);
}

.timeline-content {
  padding-left: 1rem;
}

.timeline-title {
  font-size: 1.125rem;
  margin-bottom: 0.5rem;
}

.timeline-text {
  color: #6b7280;
  margin-bottom: 0;
}

/* Stats */
.stat-grid {
  display: grid;
  gap: 1.5rem;
}

.stat-layout-grid {
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
}

.stat-layout-inline {
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
}

.stat-layout-featured {
  grid-template-columns: 1fr;
  text-align: center;
}

.stat-item {
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 8px;
  text-align: center;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--color-primary);
  line-height: 1;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.95rem;
  color: #6b7280;
}

.stat-description {
  font-size: 0.875rem;
  color: #9ca3af;
  margin-top: 0.5rem;
}

/* Tables */
.table-wrapper {
  overflow-x: auto;
  margin: 1.5rem 0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.table-caption {
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.styled-table {
  width: 100%;
  border-collapse: collapse;
}

.styled-table thead {
  background: var(--color-primary);
  color: #ffffff;
}

.styled-table th,
.styled-table td {
  padding: 1rem;
  text-align: left;
}

.styled-table tbody tr {
  border-bottom: 1px solid #f0f0f0;
}

.styled-table tbody tr:hover {
  background: #f9fafb;
}

/* FAQ */
.faq-accordion,
.faq-cards {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.faq-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.faq-question {
  padding: 1rem 1.5rem;
  font-weight: 600;
  cursor: pointer;
  background: #f9fafb;
  list-style: none;
}

.faq-question::-webkit-details-marker {
  display: none;
}

.faq-answer {
  padding: 1rem 1.5rem;
  background: #ffffff;
}

.faq-card {
  padding: 1.5rem;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.faq-card .faq-question {
  background: transparent;
  padding: 0;
  margin-bottom: 0.5rem;
}

.faq-card .faq-answer {
  padding: 0;
  color: #6b7280;
}

/* Lists */
.styled-list {
  padding-left: 1.5rem;
  margin: 1rem 0;
}

.list-intro {
  font-weight: 500;
  margin-bottom: 0.75rem;
}

.list-item {
  margin-bottom: 0.75rem;
  line-height: 1.6;
}

/* Prose */
.prose p {
  margin-bottom: 1.25rem;
}

.lead-paragraph {
  font-size: 1.125rem;
  color: #374151;
  line-height: 1.8;
}

/* Callouts */
.callout {
  padding: 1.5rem;
  border-radius: 8px;
  margin: 1.5rem 0;
  border-left: 4px solid;
}

.callout-insight {
  background: #eff6ff;
  border-color: #3b82f6;
}

.callout-warning {
  background: #fef3c7;
  border-color: #f59e0b;
}

.callout-tip {
  background: #ecfdf5;
  border-color: #10b981;
}

/* CTA */
.article-cta {
  max-width: 900px;
  margin: 3rem auto;
  padding: 2.5rem;
  background: #f9fafb;
  border-radius: 12px;
  text-align: center;
}

.article-cta h2 {
  margin-top: 0;
}

.cta-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 1.5rem;
}

.cta-button {
  padding: 0.875rem 2rem;
  border-radius: 6px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
}

.cta-primary {
  background: var(--color-primary);
  color: #ffffff;
}

.cta-primary:hover {
  opacity: 0.9;
  text-decoration: none;
}

/* Responsive */
@media (max-width: 768px) {
  .article-header { padding: 2rem 1rem; }
  .article-title { font-size: 1.75rem; }
  .article-main { padding: 0 1rem; }
  .emphasis-hero { padding: 2.5rem 1.5rem; }
  .emphasis-featured { padding: 2rem 1.5rem; }
  .stat-value { font-size: 2rem; }
}
`;
  }

  /**
   * Calculate render metadata
   */
  private calculateMetadata(html: string, blueprint: SemanticLayoutBlueprint): RenderMetadata {
    // Count words in text content
    const textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = textContent.split(' ').length;

    // Count components
    const sections = blueprint.sections ?? [];
    const componentCount: Record<ComponentType, number> = {} as Record<ComponentType, number>;
    for (const section of sections) {
      const comp = section.layout.component;
      componentCount[comp] = (componentCount[comp] || 0) + 1;
    }

    // Count DOM nodes (rough estimate)
    const domNodeCount = (html.match(/<[^/][^>]*>/g) || []).length;

    // Calculate text to code ratio
    const textToCodeRatio = textContent.length / html.length;

    return {
      wordCount,
      componentCount,
      sectionCount: sections.length,
      estimatedReadTime: Math.ceil(wordCount / 200),
      domNodeCount,
      textToCodeRatio,
    };
  }

  /**
   * Process inline markdown
   */
  private processInlineMarkdown(text: string): string {
    let result = text;

    // Bold
    result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    result = result.replace(/__([^_]+)__/g, '<strong>$1</strong>');

    // Italic
    result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    result = result.replace(/_([^_]+)_/g, '<em>$1</em>');

    // Links
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    return result;
  }

  /**
   * Escape HTML
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
