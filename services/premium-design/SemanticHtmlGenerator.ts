// =============================================================================
// SemanticHtmlGenerator — Converts markdown draft to design-ready semantic HTML
// =============================================================================
// Produces rich HTML5 with semantic elements, data-* attributes, and structural
// wrappers that give the AI CSS generator enough surface area to create
// agency-quality visual designs.

import { convertMarkdownToSemanticHtml } from '../contentAssemblyService';
import { injectHeadingIds, generateTableOfContentsHtml } from '../quickExportStylesheet';
import type { BusinessContext } from './types';

type ContentType = 'prose' | 'faq' | 'comparison' | 'timeline' | 'steps' | 'checklist' | 'cta';

interface SectionInfo {
  id: string;
  heading: string;
  headingLevel: number;
  contentType: ContentType;
  html: string;
}

export class SemanticHtmlGenerator {
  generate(
    markdown: string,
    title: string,
    businessContext?: BusinessContext
  ): string {
    let baseHtml = convertMarkdownToSemanticHtml(markdown, { semantic: true });
    baseHtml = injectHeadingIds(baseHtml);
    const tocHtml = generateTableOfContentsHtml(baseHtml);
    const sections = this.splitIntoSections(baseHtml);

    // Build semantic article with design-friendly structure
    const sectionsHtml = sections
      .map((s, i) => {
        // Mark alternating sections for visual rhythm
        const variant = i % 3 === 1 ? ' data-variant="surface"' : '';
        return `<section data-section-id="${s.id}" data-content-type="${s.contentType}"${variant}>\n<div data-section-inner>\n${s.html}\n</div>\n</section>`;
      })
      .join('\n\n');

    // CTA section at the bottom
    const ctaHtml = businessContext?.ctaText
      ? `\n<section data-content-type="cta">\n<div data-section-inner>\n<p>${this.esc(businessContext.ctaText)}</p>\n${businessContext.ctaUrl ? `<a href="${this.esc(businessContext.ctaUrl)}" data-cta-button>${this.esc(businessContext.ctaText)}</a>` : ''}\n</div>\n</section>`
      : '';

    // Wrap in article with header and footer zones
    return `<article>
<header data-hero>
<h1>${this.esc(title)}</h1>
</header>
${tocHtml ? tocHtml + '\n' : ''}
<div data-content-body>
${sectionsHtml}${ctaHtml}
</div>
<footer data-article-footer>
<p data-footer-text>Published article</p>
</footer>
</article>`;
  }

  private splitIntoSections(html: string): SectionInfo[] {
    const sections: SectionInfo[] = [];
    const h2Regex = /(<h2[^>]*>[\s\S]*?<\/h2>)/gi;
    const parts = html.split(h2Regex);
    let sectionIndex = 0;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (!part) continue;

      const headingMatch = part.match(/<h2[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/h2>/i);

      if (headingMatch) {
        const headingId = headingMatch[1];
        const headingText = headingMatch[2].replace(/<[^>]+>/g, '').trim();
        const bodyContent = (i + 1 < parts.length && !parts[i + 1].match(/^<h2/i)) ? parts[i + 1].trim() : '';
        if (bodyContent) i++;

        const fullHtml = part + '\n' + bodyContent;
        const contentType = this.detectContentType(fullHtml, headingText);

        sections.push({
          id: headingId || `section-${sectionIndex}`,
          heading: headingText,
          headingLevel: 2,
          contentType,
          html: this.wrapContentType(fullHtml, contentType),
        });
        sectionIndex++;
      } else if (sectionIndex === 0) {
        sections.push({
          id: 'intro',
          heading: '',
          headingLevel: 0,
          contentType: 'prose',
          html: part,
        });
        sectionIndex++;
      } else {
        if (sections.length > 0) {
          sections[sections.length - 1].html += '\n' + part;
        }
      }
    }

    if (sections.length === 0) {
      sections.push({ id: 'content', heading: '', headingLevel: 0, contentType: 'prose', html });
    }

    return sections;
  }

  private detectContentType(html: string, heading: string): ContentType {
    const lH = html.toLowerCase();
    const lHd = heading.toLowerCase();

    if (lH.includes('<details') || lH.includes('<summary')) return 'faq';
    if (/faq|frequently asked|veelgestelde vragen|q&a/.test(lHd)) return 'faq';
    if ((html.match(/<h[34][^>]*>[^<]*\?/gi) || []).length >= 3) return 'faq';
    if (lH.includes('<table') && /vergelijk|compar|vs\.?|versus|verschil|difference/.test(lHd)) return 'comparison';
    if (lH.includes('<ol') && /stap|step|how to|hoe|guide|handleiding|process|procedure/.test(lHd)) return 'steps';
    if (/tijdlijn|timeline|history|geschied|evolution/.test(lHd)) return 'timeline';
    if (lH.includes('<ul') && /checklist|requirements|vereisten|must|essenti/.test(lHd)) return 'checklist';
    return 'prose';
  }

  private wrapContentType(html: string, contentType: ContentType): string {
    if (contentType === 'faq' && !html.includes('<details')) {
      return html.replace(
        /<(h[34])[^>]*>([\s\S]*?\?)<\/\1>\s*(<p>[\s\S]*?<\/p>)/gi,
        '<details><summary>$2</summary>\n$3\n</details>'
      );
    }
    return html;
  }

  private esc(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
