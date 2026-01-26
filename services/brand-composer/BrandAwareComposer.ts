/**
 * BrandAwareComposer
 *
 * Composes article content using extracted brand components.
 * Produces styled HTML that matches the brand's visual identity
 * while preserving all SEO semantic markup.
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
 * Fallback CSS for when no components are available
 */
const FALLBACK_CSS = `
/* Fallback Brand Styles */
.brand-article {
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.6;
  color: #1a1a2e;
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.brand-article h1 {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: #1a1a2e;
}

.brand-article h2 {
  font-size: 1.75rem;
  font-weight: 600;
  margin-top: 2rem;
  margin-bottom: 1rem;
  color: #1a1a2e;
}

.brand-article h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  color: #4a4a68;
}

.brand-article p {
  margin-bottom: 1rem;
}

.brand-article .brand-section {
  margin-bottom: 2rem;
}
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
   * Compose article content into brand-styled HTML.
   *
   * @param content - The article content to compose
   * @returns Brand-styled HTML with standalone CSS
   */
  async compose(content: ArticleContent): Promise<BrandReplicationOutput> {
    const startTime = Date.now();

    // Load components from the library
    const components = await this.componentLibrary.getAll();
    const contentMatcher = new ContentMatcher(components);

    // Track components used and extractions
    const componentsUsed: BrandReplicationOutput['componentsUsed'] = [];
    const extractionsUsed = new Set<string>();
    let synthesizedCount = 0;

    // Build HTML sections
    const htmlSections: string[] = [];

    // Add title as H1
    htmlSections.push(this.renderTitle(content.title));

    // Process each section
    for (const section of content.sections) {
      const contentBlock: ContentBlock = {
        type: 'section',
        heading: section.heading,
        headingLevel: section.headingLevel,
        body: section.content
      };

      // Try to match to a component
      const match = await contentMatcher.matchContentToComponent(contentBlock);

      if (match) {
        // Use extracted component
        const renderedSection = this.renderWithComponent(section, match.component);
        htmlSections.push(renderedSection);

        componentsUsed.push({
          id: match.component.id,
          type: 'extracted',
          theirClasses: match.component.theirClassNames,
          ourClasses: match.component.theirClassNames.map(c => `brand-${c}`)
        });

        extractionsUsed.add(match.component.extractionId);
      } else {
        // Use fallback styling
        const renderedSection = this.renderWithFallback(section);
        htmlSections.push(renderedSection);
        synthesizedCount++;
      }
    }

    // Wrap in brand-article
    const html = `<article class="brand-article">\n${htmlSections.join('\n')}\n</article>`;

    // Generate CSS
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
   * Render the article title as H1.
   */
  private renderTitle(title: string): string {
    return `  <h1>${this.escapeHtml(title)}</h1>`;
  }

  /**
   * Render a section using an extracted component.
   * Preserves SEO semantic markup from the content.
   */
  private renderWithComponent(section: ArticleSection, component: ExtractedComponent): string {
    // Get the heading tag
    const headingTag = `h${section.headingLevel}`;

    // Build class names (their classes + brand-prefixed)
    const classNames = [
      ...component.theirClassNames,
      ...component.theirClassNames.map(c => `brand-${c}`)
    ].join(' ');

    // Render the section preserving SEO markup in content
    return `  <section class="${classNames} brand-section">
    <${headingTag}>${this.escapeHtml(section.heading)}</${headingTag}>
    ${section.content}
  </section>`;
  }

  /**
   * Render a section with fallback styling.
   * Preserves SEO semantic markup from the content.
   */
  private renderWithFallback(section: ArticleSection): string {
    const headingTag = `h${section.headingLevel}`;

    return `  <section class="brand-section">
    <${headingTag}>${this.escapeHtml(section.heading)}</${headingTag}>
    ${section.content}
  </section>`;
  }

  /**
   * Escape HTML special characters in text.
   * Used for headings and titles to prevent XSS.
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
}
