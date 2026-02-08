// =============================================================================
// SemanticHtmlGenerator — Converts markdown draft to clean semantic HTML
// =============================================================================
// Produces unstyled HTML5 using only semantic elements and data-* attributes.
// The AI CSS generator targets these elements directly (no CSS classes).

import { convertMarkdownToSemanticHtml } from '../contentAssemblyService';
import { injectHeadingIds, generateTableOfContentsHtml } from '../quickExportStylesheet';
import type { BusinessContext } from './types';

/** Content type patterns detected in sections */
type ContentType = 'prose' | 'faq' | 'comparison' | 'timeline' | 'steps' | 'checklist' | 'cta';

interface SectionInfo {
  id: string;
  heading: string;
  headingLevel: number;
  contentType: ContentType;
  html: string;
}

/**
 * Generates clean, unstyled semantic HTML from a markdown article draft.
 * Uses `data-content-type` and `data-section-id` attributes for AI CSS targeting.
 */
export class SemanticHtmlGenerator {
  /**
   * Convert markdown article to semantic HTML document body.
   * Returns the inner `<article>` HTML (no `<html>`, `<head>`, etc.).
   */
  generate(
    markdown: string,
    title: string,
    businessContext?: BusinessContext
  ): string {
    // Convert markdown to base HTML
    let baseHtml = convertMarkdownToSemanticHtml(markdown, { semantic: true });

    // Inject heading IDs for anchor linking
    baseHtml = injectHeadingIds(baseHtml);

    // Generate TOC
    const tocHtml = generateTableOfContentsHtml(baseHtml);

    // Split into sections and detect content types
    const sections = this.splitIntoSections(baseHtml);

    // Build semantic article
    const sectionsHtml = sections
      .map(s => `<section data-section-id="${s.id}" data-content-type="${s.contentType}">\n${s.html}\n</section>`)
      .join('\n\n');

    // Optional CTA section
    const ctaHtml = businessContext?.ctaText
      ? `\n<section data-content-type="cta">\n<div>\n<p>${this.escapeHtml(businessContext.ctaText)}</p>\n${businessContext.ctaUrl ? `<a href="${this.escapeHtml(businessContext.ctaUrl)}">${this.escapeHtml(businessContext.ctaText)}</a>` : ''}\n</div>\n</section>`
      : '';

    return `<article>\n<header>\n<h1>${this.escapeHtml(title)}</h1>\n</header>\n${tocHtml ? tocHtml + '\n' : ''}${sectionsHtml}${ctaHtml}\n</article>`;
  }

  /**
   * Split HTML content into logical sections based on h2 headings.
   * Detects content type for each section.
   */
  private splitIntoSections(html: string): SectionInfo[] {
    const sections: SectionInfo[] = [];

    // Split on h2 boundaries. Each section starts with an h2.
    // Content before the first h2 is the "intro" section.
    const h2Regex = /(<h2[^>]*>[\s\S]*?<\/h2>)/gi;
    const parts = html.split(h2Regex);

    let sectionIndex = 0;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (!part) continue;

      // Check if this is a heading
      const headingMatch = part.match(/<h2[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/h2>/i);

      if (headingMatch) {
        // This is a heading; combine with the next part (body content)
        const headingId = headingMatch[1];
        const headingText = headingMatch[2].replace(/<[^>]+>/g, '').trim();
        const bodyContent = (i + 1 < parts.length && !parts[i + 1].match(/^<h2/i)) ? parts[i + 1].trim() : '';
        if (bodyContent) i++; // skip the body part

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
        // Intro content before first h2
        sections.push({
          id: 'intro',
          heading: '',
          headingLevel: 0,
          contentType: 'prose',
          html: part,
        });
        sectionIndex++;
      } else {
        // Orphaned content — append to previous section or create new
        if (sections.length > 0) {
          sections[sections.length - 1].html += '\n' + part;
        }
      }
    }

    // If no sections found, wrap everything as prose
    if (sections.length === 0) {
      sections.push({
        id: 'content',
        heading: '',
        headingLevel: 0,
        contentType: 'prose',
        html,
      });
    }

    return sections;
  }

  /**
   * Detect the content type of a section based on its HTML patterns.
   */
  private detectContentType(html: string, heading: string): ContentType {
    const lowerHtml = html.toLowerCase();
    const lowerHeading = heading.toLowerCase();

    // FAQ detection: contains <details>/<summary> or Q&A patterns
    if (lowerHtml.includes('<details') || lowerHtml.includes('<summary')) return 'faq';
    if (/faq|frequently asked|veelgestelde vragen|q&a/.test(lowerHeading)) return 'faq';
    // FAQ by question pattern: multiple heading-like questions
    const questionCount = (html.match(/<h[34][^>]*>[^<]*\?/gi) || []).length;
    if (questionCount >= 3) return 'faq';

    // Comparison detection: has a <table> with comparison characteristics
    if (lowerHtml.includes('<table') && /vergelijk|compar|vs\.?|versus|verschil|difference/.test(lowerHeading)) return 'comparison';

    // Steps detection: ordered list or numbered step patterns
    if (lowerHtml.includes('<ol') && /stap|step|how to|hoe|guide|handleiding|process|procedure/.test(lowerHeading)) return 'steps';

    // Timeline detection
    if (/tijdlijn|timeline|history|geschied|evolution|ontwikkeling/.test(lowerHeading)) return 'timeline';

    // Checklist detection: unordered list with action items
    if (lowerHtml.includes('<ul') && /checklist|requirements|vereisten|must|essenti/.test(lowerHeading)) return 'checklist';

    return 'prose';
  }

  /**
   * Optionally wrap content in semantic elements based on content type.
   * For FAQ sections, convert Q&A patterns to <details>/<summary>.
   */
  private wrapContentType(html: string, contentType: ContentType): string {
    if (contentType === 'faq' && !html.includes('<details')) {
      // Convert h3/h4 questions followed by paragraphs into <details>/<summary>
      return html.replace(
        /<(h[34])[^>]*>([\s\S]*?\?)<\/\1>\s*(<p>[\s\S]*?<\/p>)/gi,
        '<details><summary>$2</summary>\n$3\n</details>'
      );
    }
    return html;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
