/**
 * Pinterest Platform Adapter
 *
 * Transforms content for Pinterest with keyword-focused
 * descriptions, Rich Pin optimization, and vertical image specs.
 *
 * Fully localized - no hardcoded phrases.
 *
 * Note: Pinterest is fundamentally different from other social platforms.
 * It's a visual search engine, not a social feed. Content strategy:
 * - Keywords > Hashtags (Pinterest indexes keywords, not hashtags)
 * - Evergreen > Timely (Pins live for months/years)
 * - Descriptive > Conversational (for search discovery)
 * - Vertical images > Horizontal (2:3 ratio performs best)
 */

import type {
  SocialPost,
  SocialPostInput,
  ArticleTransformationSource,
  ImageInstructions,
  PostEAVTriple
} from '../../../../types/social';
import { socialLocalization } from '../socialLocalization';
import {
  selectImageForPlatform,
  needsResizeForPlatform,
  type ImagePlaceholderExtended
} from '../imageSelector';

/**
 * Pinterest-specific configuration
 */
export const PINTEREST_CONFIG = {
  description_limit: 500,
  title_limit: 100,
  // Pinterest doesn't use hashtags - uses keywords instead
  hashtag_count: 0,
  image_specs: {
    standard: { width: 1000, height: 1500, ratio: '2:3' },
    square: { width: 1000, height: 1000, ratio: '1:1' }
  }
};

/**
 * Pinterest content adapter
 */
export class PinterestAdapter {
  /**
   * Transform article to Pinterest Pin
   */
  transformFromArticle(
    source: ArticleTransformationSource,
    options: {
      template_type: 'hub_announcement' | 'key_takeaway' | 'entity_spotlight' | 'tip_series';
      eav?: PostEAVTriple;
    }
  ): SocialPostInput {
    const lang = source.language;
    let title: string;
    let description: string;

    switch (options.template_type) {
      case 'hub_announcement':
        ({ title, description } = this.createHubPin(source, lang));
        break;
      case 'key_takeaway':
        ({ title, description } = this.createTakeawayPin(source, lang));
        break;
      case 'entity_spotlight':
        ({ title, description } = this.createEntityPin(source, options.eav, lang));
        break;
      case 'tip_series':
        ({ title, description } = this.createTipPin(source, lang));
        break;
      default:
        ({ title, description } = this.createHubPin(source, lang));
    }

    // Combine title and description for content_text
    // Pinterest uses separate title and description, but we store as one
    const content = `${title}\n\n${description}`;

    // Extract keywords (these replace hashtags for Pinterest)
    const keywords = this.extractKeywords(source);

    // Extract mentioned entities
    const entitiesMentioned = this.extractMentionedEntities(
      content,
      source.schema_entities.map(e => e.name)
    );

    // Image instructions (vertical format for Pinterest)
    const imageInstructions = this.createImageInstructions(source);

    return {
      topic_id: source.topic_id,
      job_id: source.job_id,
      platform: 'pinterest',
      post_type: 'pin',
      content_text: content,
      // Pinterest doesn't use hashtags - store keywords differently
      hashtags: [], // Empty for Pinterest
      image_instructions: imageInstructions,
      link_url: source.link_url,
      eav_triple: options.eav,
      entities_mentioned: entitiesMentioned
    };
  }

  /**
   * Create hub/main Pin
   */
  private createHubPin(source: ArticleTransformationSource, lang?: string): { title: string; description: string } {
    const entity = source.schema_entities[0]?.name;
    const keywords = this.extractKeywords(source);
    const phrases = socialLocalization.getPhrases(lang);

    // Title: Keyword-rich, benefit-focused
    let title = source.title;
    if (title.length > PINTEREST_CONFIG.title_limit) {
      title = title.substring(0, PINTEREST_CONFIG.title_limit - 3) + '...';
    }

    // Description: Keyword-optimized for search
    let description = '';

    if (entity) {
      description += `${socialLocalization.getPhrase('pin_learn_about', lang, { entity })}. `;
    }

    // Add key takeaways as benefits
    const takeaways = source.key_takeaways.slice(0, 3);
    if (takeaways.length > 0) {
      description += `${phrases.pin_discover}: `;
      description += takeaways.map(t => this.shortenTakeaway(t)).join(' | ');
      description += '. ';
    }

    // Add keyword phrases for search
    description += `\n\n${keywords.join(' | ')}`;

    return {
      title: this.optimizeTitle(title),
      description: this.truncateDescription(description)
    };
  }

  /**
   * Create key takeaway Pin
   */
  private createTakeawayPin(source: ArticleTransformationSource, lang?: string): { title: string; description: string } {
    const takeaway = source.key_takeaways[0] || source.meta_description;
    const entity = source.schema_entities[0]?.name;
    const keywords = this.extractKeywords(source);
    const phrases = socialLocalization.getPhrases(lang);

    // Title: The takeaway itself (if short enough) or a benefit statement
    let title = takeaway.length <= PINTEREST_CONFIG.title_limit
      ? takeaway
      : entity
        ? `${entity}: ${phrases.pin_key_insight}`
        : phrases.pin_key_insight;

    // Description: Expand on the takeaway with keywords
    let description = takeaway;
    if (entity) {
      description += `\n\n${socialLocalization.getPhrase('pin_learn_about', lang, { entity })}.`;
    }
    description += `\n\n${keywords.join(' | ')}`;

    return {
      title: this.optimizeTitle(title),
      description: this.truncateDescription(description)
    };
  }

  /**
   * Create entity spotlight Pin
   */
  private createEntityPin(
    source: ArticleTransformationSource,
    eav?: PostEAVTriple,
    lang?: string
  ): { title: string; description: string } {
    const keywords = this.extractKeywords(source);
    const phrases = socialLocalization.getPhrases(lang);

    if (eav) {
      const categoryText = socialLocalization.getCategory(eav.category, lang);
      const title = `${eav.entity}: ${this.formatAttribute(eav.attribute)}`;
      const description = `${eav.entity} ${this.formatAttribute(eav.attribute)} ${eav.value}.\n\n${socialLocalization.getPhrase('spotlight_category_fact', lang, { category: categoryText, entity: eav.entity })}\n\n${keywords.join(' | ')}`;

      return {
        title: this.optimizeTitle(title),
        description: this.truncateDescription(description)
      };
    }

    const entity = source.schema_entities[0];
    if (entity) {
      const title = socialLocalization.getPhrase('pin_complete_guide', lang, { entity: entity.name });
      const description = `${socialLocalization.getPhrase('pin_complete_guide', lang, { entity: entity.name })}. ${source.key_takeaways[0] || source.meta_description}\n\n${keywords.join(' | ')}`;

      return {
        title: this.optimizeTitle(title),
        description: this.truncateDescription(description)
      };
    }

    return this.createHubPin(source, lang);
  }

  /**
   * Create tip Pin
   */
  private createTipPin(source: ArticleTransformationSource, lang?: string): { title: string; description: string } {
    const entity = source.schema_entities[0]?.name;
    const takeaways = source.key_takeaways.slice(0, 5);
    const keywords = this.extractKeywords(source);

    // Title
    const title = entity
      ? socialLocalization.getPhrase('pin_tips_title', lang, { count: takeaways.length, entity })
      : socialLocalization.getPhrase('listicle_intro_generic', lang, { count: takeaways.length }).replace(':', '');

    // Description: List format with keywords
    let description = '';
    takeaways.forEach((t, i) => {
      description += `${i + 1}. ${this.shortenTakeaway(t)}\n`;
    });
    description += `\n${keywords.join(' | ')}`;

    return {
      title: this.optimizeTitle(title),
      description: this.truncateDescription(description)
    };
  }

  /**
   * Extract keywords from source (replaces hashtags for Pinterest)
   */
  private extractKeywords(source: ArticleTransformationSource): string[] {
    const keywords: string[] = [];

    // Add entity names
    for (const entity of source.schema_entities) {
      if (!keywords.includes(entity.name)) {
        keywords.push(entity.name);
      }

      // Add entity type if relevant
      if (entity.type && !['Thing', 'CreativeWork'].includes(entity.type)) {
        const typeKeyword = entity.type.replace(/([A-Z])/g, ' $1').trim();
        if (!keywords.includes(typeKeyword)) {
          keywords.push(typeKeyword);
        }
      }
    }

    // Extract keywords from EAVs
    for (const eav of source.contextual_vectors.slice(0, 3)) {
      if (!keywords.includes(eav.entity)) {
        keywords.push(eav.entity);
      }
    }

    // Limit and clean keywords
    return keywords
      .slice(0, 10)
      .map(k => k.trim())
      .filter(k => k.length > 2 && k.length < 50);
  }

  /**
   * Optimize title for Pinterest search
   */
  private optimizeTitle(title: string): string {
    // Remove trailing punctuation except ?
    let optimized = title.replace(/[.!]+$/, '');

    // Ensure it fits
    if (optimized.length > PINTEREST_CONFIG.title_limit) {
      optimized = optimized.substring(0, PINTEREST_CONFIG.title_limit - 3) + '...';
    }

    return optimized;
  }

  /**
   * Truncate description to limit
   */
  private truncateDescription(description: string): string {
    if (description.length <= PINTEREST_CONFIG.description_limit) {
      return description;
    }

    return description.substring(0, PINTEREST_CONFIG.description_limit - 3) + '...';
  }

  /**
   * Shorten takeaway for inline use
   */
  private shortenTakeaway(takeaway: string): string {
    if (takeaway.length <= 80) return takeaway;
    return takeaway.substring(0, 77) + '...';
  }

  /**
   * Format attribute for natural reading
   */
  private formatAttribute(attribute: string): string {
    return attribute
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .toLowerCase()
      .trim();
  }

  /**
   * Create image instructions using optimal image selection (vertical format)
   */
  private createImageInstructions(
    source: ArticleTransformationSource,
    options?: { isHub?: boolean; postIndex?: number }
  ): ImageInstructions {
    const specs = PINTEREST_CONFIG.image_specs.standard;
    const entity = source.schema_entities[0]?.name;

    // Convert placeholders to extended format for image selection
    const extendedPlaceholders: ImagePlaceholderExtended[] = source.image_placeholders.map(p => ({
      id: p.id,
      type: p.type || 'SECTION',
      alt_text: p.alt_text,
      caption: p.caption,
      generated_url: p.generated_url,
      user_upload_url: p.user_upload_url,
      status: p.status,
      specs: p.specs
    }));

    // Use image selector to find optimal image for Pinterest
    const selected = selectImageForPlatform(extendedPlaceholders, 'pinterest', {
      preferHub: options?.isHub ?? true,
      postIndex: options?.postIndex ?? 0
    });

    if (!selected) {
      return {
        description: entity
          ? `${entity} - vertical Pin image`
          : `${source.title} (vertical Pin)`,
        alt_text: source.title,
        dimensions: {
          width: specs.width,
          height: specs.height,
          aspect_ratio: specs.ratio
        }
      };
    }

    // Check if selected image needs resizing
    const originalPlaceholder = source.image_placeholders.find(p => p.id === selected.placeholder_id);
    const needsResize = originalPlaceholder?.specs
      ? needsResizeForPlatform(originalPlaceholder.specs, 'pinterest')
      : true;

    return {
      description: `${selected.description} (vertical Pin)`,
      alt_text: selected.alt_text,
      dimensions: {
        width: specs.width,
        height: specs.height,
        aspect_ratio: specs.ratio
      },
      source_placeholder_id: selected.placeholder_id,
      image_url: selected.url,
      needs_resize: needsResize
    };
  }

  /**
   * Extract mentioned entities
   */
  private extractMentionedEntities(content: string, entityNames: string[]): string[] {
    const mentioned: string[] = [];
    const contentLower = content.toLowerCase();

    for (const name of entityNames) {
      if (contentLower.includes(name.toLowerCase())) {
        mentioned.push(name);
      }
    }

    return mentioned;
  }

  /**
   * Validate Pin meets Pinterest requirements
   */
  validatePost(post: SocialPost): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Split content back into title and description
    const lines = post.content_text.split('\n\n');
    const title = lines[0] || '';
    const description = lines.slice(1).join('\n\n');

    if (title.length > PINTEREST_CONFIG.title_limit) {
      issues.push(`Title exceeds ${PINTEREST_CONFIG.title_limit} character limit`);
    }

    if (description.length > PINTEREST_CONFIG.description_limit) {
      issues.push(`Description exceeds ${PINTEREST_CONFIG.description_limit} character limit`);
    }

    // Pinterest shouldn't have hashtags
    if (post.hashtags && post.hashtags.length > 0) {
      issues.push('Pinterest uses keywords, not hashtags - remove hashtags');
    }

    // Check for keyword presence
    const hasKeywords = /[A-Z][a-z]+/.test(description);
    if (!hasKeywords) {
      issues.push('Add keyword phrases to description for Pinterest search');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Get title and description from content
   */
  parseContent(content: string): { title: string; description: string } {
    const parts = content.split('\n\n');
    return {
      title: parts[0] || '',
      description: parts.slice(1).join('\n\n')
    };
  }

  /**
   * Get character count info
   */
  getCharacterInfo(content: string): {
    title_length: number;
    title_remaining: number;
    description_length: number;
    description_remaining: number;
  } {
    const { title, description } = this.parseContent(content);

    return {
      title_length: title.length,
      title_remaining: Math.max(0, PINTEREST_CONFIG.title_limit - title.length),
      description_length: description.length,
      description_remaining: Math.max(0, PINTEREST_CONFIG.description_limit - description.length)
    };
  }
}

// Export singleton instance
export const pinterestAdapter = new PinterestAdapter();
