/**
 * ContentMatcher
 *
 * Matches semantic content blocks to extracted brand components.
 * Uses heuristics based on content type, heading level, visual descriptions,
 * and content slot compatibility.
 */

import type { ExtractedComponent, ComponentMatch, ContentSlot } from '../../types/brandExtraction';

/**
 * Content block structure for matching
 */
export interface ContentBlock {
  type: 'section' | 'paragraph' | 'list' | 'quote' | 'image' | 'cta' | 'faq';
  heading?: string;
  headingLevel?: number;
  body?: string;
  items?: string[];
  imageUrl?: string;
  imageAlt?: string;
}

/**
 * Keyword mappings for component types based on visual descriptions
 */
const COMPONENT_TYPE_KEYWORDS: Record<string, string[]> = {
  hero: ['hero', 'banner', 'header', 'landing', 'main heading', 'large heading', 'splash'],
  section: ['section', 'content', 'text block', 'article', 'body'],
  card: ['card', 'tile', 'box', 'panel', 'feature'],
  list: ['list', 'bullet', 'enumeration', 'items'],
  cta: ['cta', 'call to action', 'button', 'action'],
  quote: ['quote', 'testimonial', 'blockquote', 'citation'],
  faq: ['faq', 'accordion', 'question', 'answer', 'expandable'],
  image: ['image', 'photo', 'picture', 'visual', 'media', 'gallery'],
};

/**
 * Heading level to component type mapping
 */
const HEADING_LEVEL_COMPONENT_MAP: Record<number, string[]> = {
  1: ['hero', 'header', 'banner'],
  2: ['section', 'content'],
  3: ['card', 'subsection'],
  4: ['subsection', 'detail'],
  5: ['detail'],
  6: ['detail'],
};

export class ContentMatcher {
  private components: ExtractedComponent[];

  constructor(components: ExtractedComponent[]) {
    this.components = components;
  }

  /**
   * Match content to the most appropriate component
   */
  async matchContentToComponent(content: ContentBlock): Promise<ComponentMatch | null> {
    if (this.components.length === 0) {
      return null;
    }

    const scores = this.components.map(component => ({
      component,
      score: this.calculateMatchScore(content, component),
    }));

    // Sort by score descending
    scores.sort((a, b) => b.score.total - a.score.total);

    const best = scores[0];

    // Minimum confidence threshold
    if (best.score.total < 0.1) {
      return null;
    }

    return {
      component: best.component,
      confidence: best.score.total,
      matchReason: this.buildMatchReason(best.score),
    };
  }

  /**
   * Calculate match score between content and component
   */
  private calculateMatchScore(
    content: ContentBlock,
    component: ExtractedComponent
  ): MatchScore {
    const scores: MatchScore = {
      contentTypeScore: 0,
      headingLevelScore: 0,
      visualDescriptionScore: 0,
      contentSlotScore: 0,
      total: 0,
    };

    // Score based on visual description keywords
    scores.visualDescriptionScore = this.scoreVisualDescription(content, component);

    // Score based on heading level
    if (content.headingLevel !== undefined) {
      scores.headingLevelScore = this.scoreHeadingLevel(content.headingLevel, component);
    }

    // Score based on content type
    scores.contentTypeScore = this.scoreContentType(content.type, component);

    // Score based on content slot compatibility
    scores.contentSlotScore = this.scoreContentSlots(content, component);

    // Calculate weighted total
    scores.total = this.calculateWeightedTotal(scores);

    return scores;
  }

  /**
   * Score based on visual description keyword matching
   */
  private scoreVisualDescription(content: ContentBlock, component: ExtractedComponent): number {
    const description = component.visualDescription.toLowerCase();
    const componentType = component.componentType?.toLowerCase() || '';

    let score = 0;

    // Check content type keywords
    const typeKeywords = COMPONENT_TYPE_KEYWORDS[content.type] || [];
    for (const keyword of typeKeywords) {
      if (description.includes(keyword) || componentType.includes(keyword)) {
        score += 0.3;
      }
    }

    // Check heading level keywords if applicable
    if (content.headingLevel !== undefined) {
      const levelKeywords = HEADING_LEVEL_COMPONENT_MAP[content.headingLevel] || [];
      for (const keyword of levelKeywords) {
        if (description.includes(keyword) || componentType.includes(keyword)) {
          score += 0.25;
        }
      }
    }

    // Cap at 1.0
    return Math.min(score, 1.0);
  }

  /**
   * Score based on heading level matching
   */
  private scoreHeadingLevel(headingLevel: number, component: ExtractedComponent): number {
    const description = component.visualDescription.toLowerCase();
    const componentType = component.componentType?.toLowerCase() || '';
    const html = component.literalHtml.toLowerCase();

    // H1 should match hero components
    if (headingLevel === 1) {
      const heroIndicators = ['hero', 'banner', 'header', 'main', 'landing'];
      for (const indicator of heroIndicators) {
        if (description.includes(indicator) || componentType.includes(indicator) || html.includes(indicator)) {
          return 0.5;
        }
      }
      // Check if HTML contains h1
      if (html.includes('<h1') || html.includes('class="hero"')) {
        return 0.4;
      }
    }

    // H2 should match section components
    if (headingLevel === 2) {
      const sectionIndicators = ['section', 'content', 'body'];
      for (const indicator of sectionIndicators) {
        if (description.includes(indicator) || componentType.includes(indicator)) {
          return 0.4;
        }
      }
      if (html.includes('<h2')) {
        return 0.3;
      }
    }

    // H3+ for subsections
    if (headingLevel >= 3) {
      const subIndicators = ['card', 'subsection', 'item'];
      for (const indicator of subIndicators) {
        if (description.includes(indicator) || componentType.includes(indicator)) {
          return 0.3;
        }
      }
    }

    return 0;
  }

  /**
   * Score based on content type matching
   */
  private scoreContentType(contentType: string, component: ExtractedComponent): number {
    const description = component.visualDescription.toLowerCase();
    const componentTypeStr = component.componentType?.toLowerCase() || '';

    const keywords = COMPONENT_TYPE_KEYWORDS[contentType] || [];

    for (const keyword of keywords) {
      if (description.includes(keyword) || componentTypeStr.includes(keyword)) {
        return 0.4;
      }
    }

    // Fallback: section type is versatile
    if (contentType === 'section' && (description.includes('section') || description.includes('content'))) {
      return 0.3;
    }

    return 0;
  }

  /**
   * Score based on content slot compatibility
   */
  private scoreContentSlots(content: ContentBlock, component: ExtractedComponent): number {
    if (component.contentSlots.length === 0) {
      return 0.1; // Small score for components without defined slots
    }

    let matchedSlots = 0;
    const requiredSlots = component.contentSlots.filter(s => s.required);

    // Check if content can fill the slots
    for (const slot of component.contentSlots) {
      if (this.contentFitsSlot(content, slot)) {
        matchedSlots++;
      }
    }

    // Score based on matched slots
    const matchRatio = matchedSlots / component.contentSlots.length;

    // Penalize if required slots can't be filled
    const requiredMatchable = requiredSlots.filter(s => this.contentFitsSlot(content, s)).length;
    const requiredPenalty = requiredSlots.length > 0
      ? (requiredSlots.length - requiredMatchable) * 0.2
      : 0;

    return Math.max(0, matchRatio * 0.5 - requiredPenalty);
  }

  /**
   * Check if content can fill a specific slot
   */
  private contentFitsSlot(content: ContentBlock, slot: ContentSlot): boolean {
    switch (slot.type) {
      case 'text':
        return !!(content.heading || content.body);
      case 'html':
        return !!content.body;
      case 'image':
        return !!(content.imageUrl || content.type === 'image');
      case 'list':
        return !!(content.items && content.items.length > 0) || content.type === 'list';
      case 'link':
        return !!content.body; // Links can be derived from content
      default:
        return false;
    }
  }

  /**
   * Calculate weighted total score
   */
  private calculateWeightedTotal(scores: MatchScore): number {
    const weights = {
      visualDescriptionScore: 0.35,
      headingLevelScore: 0.30,
      contentTypeScore: 0.20,
      contentSlotScore: 0.15,
    };

    return (
      scores.visualDescriptionScore * weights.visualDescriptionScore +
      scores.headingLevelScore * weights.headingLevelScore +
      scores.contentTypeScore * weights.contentTypeScore +
      scores.contentSlotScore * weights.contentSlotScore
    );
  }

  /**
   * Build human-readable match reason
   */
  private buildMatchReason(scores: MatchScore): string {
    const reasons: string[] = [];

    if (scores.visualDescriptionScore > 0.2) {
      reasons.push('visual description match');
    }
    if (scores.headingLevelScore > 0.2) {
      reasons.push('heading level match');
    }
    if (scores.contentTypeScore > 0.2) {
      reasons.push('content type match');
    }
    if (scores.contentSlotScore > 0.2) {
      reasons.push('content slot compatibility');
    }

    return reasons.length > 0
      ? `Matched based on: ${reasons.join(', ')}`
      : 'Low confidence match based on available components';
  }
}

/**
 * Internal score breakdown
 */
interface MatchScore {
  contentTypeScore: number;
  headingLevelScore: number;
  visualDescriptionScore: number;
  contentSlotScore: number;
  total: number;
}
