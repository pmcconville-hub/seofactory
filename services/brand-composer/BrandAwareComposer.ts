/**
 * BrandAwareComposer
 *
 * Composes article content using extracted brand components.
 * Uses LITERAL HTML/CSS from the target site - NO TEMPLATES.
 *
 * The key principle: we use THEIR HTML structure and CSS, not ours.
 */

import { ComponentLibrary } from '../brand-extraction/ComponentLibrary';
import { ContentMatcher, type ContentBlock } from './ContentMatcher';
import { StandaloneCssGenerator } from './StandaloneCssGenerator';
import type {
  ExtractedComponent,
  ExtractedTokens,
  SynthesizedComponent,
  BrandReplicationOutput
} from '../../types/brandExtraction';

/**
 * Article section structure
 */
export interface ArticleSection {
  id: string;
  heading: string;
  headingLevel: number;
  content: string;
}

/**
 * Article content structure for composition
 */
export interface ArticleContent {
  title: string;
  sections: ArticleSection[];
}

/**
 * Constructor options for BrandAwareComposer
 */
export interface BrandAwareComposerOptions {
  projectId: string;
  aiProvider: string;
  apiKey: string;
}

/**
 * Fallback tokens when no brand extraction exists
 */
const FALLBACK_TOKENS: ExtractedTokens = {
  id: 'fallback',
  projectId: '',
  colors: {
    values: [
      { hex: '#1a1a2e', usage: 'primary', frequency: 1 },
      { hex: '#4a4a68', usage: 'secondary', frequency: 1 },
      { hex: '#f5f5f7', usage: 'background', frequency: 1 }
    ]
  },
  typography: {
    headings: {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontWeight: 700
    },
    body: {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontWeight: 400,
      lineHeight: 1.6
    }
  },
  spacing: {
    sectionGap: '2rem',
    cardPadding: '1.5rem',
    contentWidth: '800px'
  },
  shadows: {
    card: '0 2px 4px rgba(0,0,0,0.1)',
    elevated: '0 4px 12px rgba(0,0,0,0.15)'
  },
  borders: {
    radiusSmall: '4px',
    radiusMedium: '8px',
    radiusLarge: '12px',
    defaultColor: '#e0e0e0'
  },
  extractedFrom: [],
  extractedAt: new Date().toISOString()
};

/**
 * Minimal fallback CSS - only used when NO brand extraction exists.
 * This should rarely be used - the extracted CSS is the primary styling.
 */
const FALLBACK_CSS = `
/* Minimal Fallback - Extracted CSS should override */
.brand-article {
  font-family: system-ui, sans-serif;
  line-height: 1.6;
  color: #333;
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}
.brand-article h1, .brand-article h2, .brand-article h3 {
  font-weight: 700;
  line-height: 1.3;
  margin: 1.5rem 0 1rem;
}
.brand-article p { margin-bottom: 1rem; }
.brand-article a { color: #0066cc; }
`;

export class BrandAwareComposer {
  private projectId: string;
  private aiProvider: string;
  private apiKey: string;
  private componentLibrary: ComponentLibrary;
  private cssGenerator: StandaloneCssGenerator;

  constructor(options: BrandAwareComposerOptions) {
    this.projectId = options.projectId;
    this.aiProvider = options.aiProvider;
    this.apiKey = options.apiKey;
    this.componentLibrary = new ComponentLibrary(options.projectId);
    this.cssGenerator = new StandaloneCssGenerator();
  }

  /**
   * Convert markdown content to HTML.
   */
  private markdownToHtml(markdown: string): string {
    if (!markdown) return '';

    let html = markdown;

    // Convert markdown headings
    html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

    // Convert bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

    // Convert italic
    html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
    html = html.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>');

    // Convert links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Convert lists
    html = html.replace(/^[\-\*]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>[\s\S]*?<\/li>)(\n<li>[\s\S]*?<\/li>)*/g, (match) => {
      return '<ul>' + match + '</ul>';
    });
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

    // Convert paragraphs
    const paragraphs = html.split(/\n\n+/);
    html = paragraphs
      .map(p => {
        const trimmed = p.trim();
        if (
          trimmed.startsWith('<h') ||
          trimmed.startsWith('<ul') ||
          trimmed.startsWith('<ol') ||
          trimmed.startsWith('<li') ||
          trimmed.startsWith('<p') ||
          trimmed.startsWith('<div') ||
          trimmed.startsWith('<section') ||
          trimmed.startsWith('<img') ||
          trimmed.startsWith('<table')
        ) {
          return trimmed;
        }
        if (trimmed) {
          return `<p>${trimmed}</p>`;
        }
        return '';
      })
      .filter(p => p)
      .join('\n');

    return html;
  }

  /**
   * Compose article content using extracted brand components.
   *
   * CRITICAL: Uses LITERAL HTML/CSS from target site, NOT templates.
   */
  async compose(
    content: ArticleContent,
    directComponents?: ExtractedComponent[]
  ): Promise<BrandReplicationOutput> {
    const startTime = Date.now();

    // Use direct components if provided, otherwise load from database
    const components = directComponents && directComponents.length > 0
      ? directComponents
      : await this.componentLibrary.getAll();

    console.log('[BrandAwareComposer] Using', components.length, 'components',
      directComponents ? '(DIRECT)' : '(from database)');

    const contentMatcher = new ContentMatcher(components);

    // Track components used
    const componentsUsed: BrandReplicationOutput['componentsUsed'] = [];
    const extractionsUsed = new Set<string>();
    let synthesizedCount = 0;

    // Build HTML sections
    const htmlSections: string[] = [];

    // Add title as H1
    htmlSections.push(`  <h1>${this.escapeHtml(content.title)}</h1>`);

    // Process each section
    for (const section of content.sections) {
      // Convert markdown to HTML
      const htmlContent = this.markdownToHtml(section.content);

      const contentBlock: ContentBlock = {
        type: 'section',
        heading: section.heading,
        headingLevel: section.headingLevel,
        body: htmlContent
      };

      const htmlSection: ArticleSection = {
        ...section,
        content: htmlContent
      };

      // Try to match to a component
      const match = await contentMatcher.matchContentToComponent(contentBlock);

      if (match && match.component.literalHtml && this.isUsableLiteralHtml(match.component.literalHtml)) {
        // USE LITERAL HTML from target site
        const renderedSection = this.renderWithLiteralHtml(htmlSection, match.component);
        htmlSections.push(renderedSection);

        componentsUsed.push({
          id: match.component.id,
          type: 'extracted',
          theirClasses: match.component.theirClassNames,
          ourClasses: match.component.theirClassNames // Use their classes directly
        });

        extractionsUsed.add(match.component.extractionId);
      } else if (match) {
        // Have component but no usable literal HTML
        // Use semantic HTML with their extracted class names
        const renderedSection = this.renderSemanticWithTheirClasses(htmlSection, match.component);
        htmlSections.push(renderedSection);

        componentsUsed.push({
          id: match.component.id,
          type: 'extracted',
          theirClasses: match.component.theirClassNames,
          ourClasses: match.component.theirClassNames
        });

        extractionsUsed.add(match.component.extractionId);
      } else {
        // No match at all - use minimal semantic HTML
        const renderedSection = this.renderMinimalSemantic(htmlSection);
        htmlSections.push(renderedSection);
        synthesizedCount++;
      }
    }

    // Wrap in article
    const html = `<article class="brand-article">\n${htmlSections.join('\n')}\n</article>`;

    // Generate CSS - primarily from extracted literal CSS
    const standaloneCss = components.length > 0
      ? this.cssGenerator.generate(components, [], FALLBACK_TOKENS)
      : FALLBACK_CSS;

    const renderTime = Date.now() - startTime;

    return {
      html,
      standaloneCss,
      componentsUsed,
      metadata: {
        brandProjectId: this.projectId,
        extractionsUsed: Array.from(extractionsUsed),
        synthesizedCount,
        renderTime
      }
    };
  }

  /**
   * Check if literal HTML is usable (not cookie content, not too short/long)
   */
  private isUsableLiteralHtml(html: string): boolean {
    if (!html || html.trim() === '') return false;
    if (html.trim().startsWith('<!--')) return false;
    if (html.length < 50) return false;
    if (html.length > 50000) return false;
    if (!html.includes('<') || !html.includes('>')) return false;
    if (this.containsCookieContent(html)) return false;
    return true;
  }

  /**
   * Render a section using LITERAL HTML from the extracted component.
   * This is the key to design-agency quality - we use THEIR HTML, not ours.
   */
  private renderWithLiteralHtml(section: ArticleSection, component: ExtractedComponent): string {
    let html = component.literalHtml;
    const headingTag = `h${section.headingLevel}`;

    // Inject our content into their HTML structure
    // Replace headings
    const headingPattern = /<h([1-6])([^>]*)>([^<]*)<\/h\1>/gi;
    let headingReplaced = false;
    html = html.replace(headingPattern, (match, level, attrs, _text) => {
      if (!headingReplaced) {
        headingReplaced = true;
        return `<h${level}${attrs}>${this.escapeHtml(section.heading)}</h${level}>`;
      }
      return ''; // Remove other headings
    });

    // If no heading found, prepend one
    if (!headingReplaced) {
      const firstTag = html.match(/^(\s*<[^>]+>)/);
      if (firstTag) {
        html = html.replace(firstTag[0], `${firstTag[0]}\n    <${headingTag}>${this.escapeHtml(section.heading)}</${headingTag}>`);
      }
    }

    // Replace paragraph content
    const paragraphPattern = /<p([^>]*)>[\s\S]*?<\/p>/gi;
    let contentInjected = false;
    html = html.replace(paragraphPattern, (match, attrs) => {
      if (!contentInjected) {
        contentInjected = true;
        return section.content;
      }
      return ''; // Remove other paragraphs
    });

    // If no paragraph, append content
    if (!contentInjected) {
      const closingTag = html.match(/<\/(section|div|article)>\s*$/i);
      if (closingTag) {
        html = html.replace(closingTag[0], `  ${section.content}\n${closingTag[0]}`);
      } else {
        html += `\n${section.content}`;
      }
    }

    return html;
  }

  /**
   * Render semantic HTML using their extracted class names.
   * Used when literal HTML extraction failed but we have their CSS.
   */
  private renderSemanticWithTheirClasses(section: ArticleSection, component: ExtractedComponent): string {
    const headingTag = `h${section.headingLevel}`;
    const classNames = component.theirClassNames.filter(c => c && c.trim()).join(' ');

    // Minimal semantic HTML with their class names - their CSS styles it
    return `<section class="${classNames}">
    <${headingTag}>${this.escapeHtml(section.heading)}</${headingTag}>
    ${section.content}
  </section>`;
  }

  /**
   * Render minimal semantic HTML when no brand extraction available.
   */
  private renderMinimalSemantic(section: ArticleSection): string {
    const headingTag = `h${section.headingLevel}`;

    return `  <section>
    <${headingTag}>${this.escapeHtml(section.heading)}</${headingTag}>
    ${section.content}
  </section>`;
  }

  /**
   * Escape HTML special characters.
   */
  private escapeHtml(text: string): string {
    const escapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return text.replace(/[&<>"']/g, char => escapeMap[char]);
  }

  /**
   * Check if HTML contains cookie consent content.
   * Detects both content keywords AND consent manager class patterns.
   */
  private containsCookieContent(html: string): boolean {
    // CRITICAL FIX: Check for known consent manager class/id patterns FIRST
    // These are class names, not content - the original check missed them
    const cookieClassPatterns = [
      /CybotCookiebot/i,
      /CookiebotDialog/i,
      /onetrust/i,
      /cookieyes/i,
      /cc-window/i,           // Cookie Consent library
      /cookie-notice/i,
      /cookie-banner/i,
      /cookie-consent/i,
      /gdpr-cookie/i,
      /cookie-law/i,
      /eupopup/i,             // EU Cookie Law popup
      /tarteaucitron/i,       // French cookie manager
    ];

    for (const pattern of cookieClassPatterns) {
      if (pattern.test(html)) {
        console.log(`[BrandAwareComposer] Detected cookie class pattern: ${pattern}`);
        return true;
      }
    }

    // Check for content keywords (lowered threshold from 3 to 1)
    const lowerHtml = html.toLowerCase();
    const cookieKeywords = [
      'cookie policy', 'cookie consent', 'gdpr', 'privacy policy',
      'storage duration', 'http cookie', 'consent manager', 'tracking pixel',
      'accept cookies', 'reject cookies', 'manage cookies', 'cookie preferences',
      'necessary cookies', 'functional cookies', 'analytics cookies',
      'marketing cookies', 'cookie settings'
    ];

    for (const keyword of cookieKeywords) {
      if (lowerHtml.includes(keyword)) {
        console.log(`[BrandAwareComposer] Detected cookie keyword: ${keyword}`);
        return true;
      }
    }

    return false;
  }
}
