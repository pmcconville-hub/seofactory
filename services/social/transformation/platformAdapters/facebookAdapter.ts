/**
 * Facebook Platform Adapter
 *
 * Transforms content for Facebook with OG-optimized formatting
 * and engagement-focused content structure.
 *
 * Fully localized - no hardcoded phrases.
 */

import type {
  SocialPost,
  SocialPostInput,
  ArticleTransformationSource,
  ImageInstructions,
  PostEAVTriple
} from '../../../../types/social';
import { hashtagGenerator, type ResolvedEntity } from '../hashtagGenerator';
import { socialLocalization } from '../socialLocalization';
import {
  selectImageForPlatform,
  needsResizeForPlatform,
  type ImagePlaceholderExtended
} from '../imageSelector';

/**
 * Facebook-specific configuration
 */
export const FACEBOOK_CONFIG = {
  character_limit: 63206,
  optimal_length: 80,  // Posts under 80 chars get highest engagement
  preview_length: 500,  // Approximate preview before "See more"
  hashtag_count: 3,
  image_specs: {
    link_preview: { width: 1200, height: 628 },
    post: { width: 1200, height: 630 },
    square: { width: 1080, height: 1080 }
  }
};

/**
 * Facebook content adapter
 */
export class FacebookAdapter {
  /**
   * Transform article to Facebook post
   */
  transformFromArticle(
    source: ArticleTransformationSource,
    options: {
      template_type: 'hub_announcement' | 'key_takeaway' | 'entity_spotlight' | 'question_hook';
      eav?: PostEAVTriple;
      brandedHashtags?: string[];
    }
  ): SocialPostInput {
    const lang = source.language;

    // Generate hashtags
    const entities: ResolvedEntity[] = source.schema_entities.map(e => ({
      name: e.name,
      type: e.type,
      wikidata_id: e.wikidata_id
    }));

    const hashtagResult = hashtagGenerator.generateFromEntities(
      'facebook',
      entities,
      options.brandedHashtags
    );

    let content: string;

    switch (options.template_type) {
      case 'hub_announcement':
        content = this.createHubPost(source, lang);
        break;
      case 'key_takeaway':
        content = this.createTakeawayPost(source, lang);
        break;
      case 'entity_spotlight':
        content = this.createEntityPost(source, options.eav, lang);
        break;
      case 'question_hook':
        content = this.createQuestionPost(source, lang);
        break;
      default:
        content = this.createHubPost(source, lang);
    }

    // Add hashtags
    content = this.formatWithHashtags(content, hashtagResult.hashtags);

    // Extract mentioned entities
    const entitiesMentioned = this.extractMentionedEntities(
      content,
      source.schema_entities.map(e => e.name)
    );

    // Image instructions
    const imageInstructions = this.createImageInstructions(source);

    return {
      topic_id: source.topic_id,
      job_id: source.job_id,
      platform: 'facebook',
      post_type: 'single',
      content_text: content,
      hashtags: hashtagResult.hashtags,
      image_instructions: imageInstructions,
      link_url: source.link_url,
      eav_triple: options.eav,
      entities_mentioned: entitiesMentioned
    };
  }

  /**
   * Create hub announcement post
   */
  private createHubPost(source: ArticleTransformationSource, lang?: string): string {
    const entity = source.schema_entities[0]?.name;
    const takeaways = source.key_takeaways.slice(0, 3);
    const phrases = socialLocalization.getPhrases(lang);

    // Hook line
    let content = entity
      ? `${socialLocalization.getPhrase('hub_hook_with_entity', lang, { entity })}\n\n`
      : `${phrases.hub_hook_generic}\n\n`;

    // Add key points
    if (takeaways.length > 0) {
      content += takeaways.map(t => `✓ ${t}`).join('\n');
    }

    // Add link if available
    if (source.link_url) {
      content += `\n\n${phrases.connector_read_full} 👉 ${source.link_url}`;
    }

    return content;
  }

  /**
   * Create key takeaway post
   */
  private createTakeawayPost(source: ArticleTransformationSource, lang?: string): string {
    const takeaway = source.key_takeaways[0] || source.meta_description;
    const entity = source.schema_entities[0]?.name;
    const phrases = socialLocalization.getPhrases(lang);

    let content = '';

    if (entity) {
      content = `${socialLocalization.getPhrase('takeaway_intro_with_entity', lang, { entity })}\n\n`;
    }

    content += `"${takeaway}"`;

    if (source.link_url) {
      content += `\n\n${phrases.connector_get_details}: ${source.link_url}`;
    }

    return content;
  }

  /**
   * Create entity spotlight post
   */
  private createEntityPost(
    source: ArticleTransformationSource,
    eav?: PostEAVTriple,
    lang?: string
  ): string {
    const phrases = socialLocalization.getPhrases(lang);

    if (eav) {
      const categoryText = socialLocalization.getCategory(eav.category, lang);
      let content = `${phrases.question_did_you_know}\n\n${eav.entity} ${this.formatAttribute(eav.attribute)} ${eav.value}.\n\n${socialLocalization.getPhrase('spotlight_category_fact', lang, { category: categoryText, entity: eav.entity })}`;
      if (source.link_url) {
        content += `\n\n${phrases.hub_cta_learn_more}: ${source.link_url}`;
      }
      return content;
    }

    const entity = source.schema_entities[0];
    if (entity) {
      let content = `${socialLocalization.getPhrase('spotlight_intro', lang, { entity: entity.name })}\n\n${source.key_takeaways[0] || source.meta_description}`;
      if (source.link_url) {
        content += `\n\n${phrases.hub_cta_full_analysis}: ${source.link_url}`;
      }
      return content;
    }

    return this.createHubPost(source, lang);
  }

  /**
   * Create question hook post
   */
  private createQuestionPost(source: ArticleTransformationSource, lang?: string): string {
    const entity = source.schema_entities[0]?.name;
    const phrases = socialLocalization.getPhrases(lang);

    const question = entity
      ? socialLocalization.getPhrase('question_common_misconception', lang, { entity })
      : phrases.question_what_if;

    let content = `${question}\n\n${phrases.engagement_comment} 👇`;

    if (source.link_url) {
      content += `\n\n${phrases.connector_get_details}: ${source.link_url}`;
    }

    return content;
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
   * Create image instructions using optimal image selection
   */
  private createImageInstructions(
    source: ArticleTransformationSource,
    options?: { isHub?: boolean; postIndex?: number }
  ): ImageInstructions | undefined {
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

    // Use image selector to find optimal image for Facebook
    const selected = selectImageForPlatform(extendedPlaceholders, 'facebook', {
      preferHub: options?.isHub ?? true,
      postIndex: options?.postIndex ?? 0
    });

    if (!selected) {
      return {
        description: source.title,
        alt_text: source.title,
        dimensions: {
          width: FACEBOOK_CONFIG.image_specs.link_preview.width,
          height: FACEBOOK_CONFIG.image_specs.link_preview.height,
          aspect_ratio: '1.91:1'
        }
      };
    }

    // Check if selected image needs resizing
    const originalPlaceholder = source.image_placeholders.find(p => p.id === selected.placeholder_id);
    const needsResize = originalPlaceholder?.specs
      ? needsResizeForPlatform(originalPlaceholder.specs, 'facebook')
      : true;

    return {
      description: selected.description,
      alt_text: selected.alt_text,
      dimensions: {
        width: selected.recommended_dimensions.width,
        height: selected.recommended_dimensions.height,
        aspect_ratio: selected.aspect_ratio
      },
      source_placeholder_id: selected.placeholder_id,
      image_url: selected.url,
      needs_resize: needsResize
    };
  }

  /**
   * Format content with hashtags
   */
  private formatWithHashtags(content: string, hashtags: string[]): string {
    if (hashtags.length === 0) return content;

    const hashtagText = hashtags.map(h => `#${h}`).join(' ');
    return `${content}\n\n${hashtagText}`;
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
   * Validate post meets Facebook requirements
   */
  validatePost(post: SocialPost): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (post.content_text.length > FACEBOOK_CONFIG.character_limit) {
      issues.push(`Content exceeds ${FACEBOOK_CONFIG.character_limit} character limit`);
    }

    if ((post.hashtags?.length || 0) > FACEBOOK_CONFIG.hashtag_count) {
      issues.push(`Too many hashtags (max ${FACEBOOK_CONFIG.hashtag_count} recommended)`);
    }

    // Engagement warning for long posts
    if (post.content_text.length > FACEBOOK_CONFIG.optimal_length * 2) {
      issues.push('Consider shortening - posts under 80 chars get 66% more engagement');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Get character count info
   */
  getCharacterInfo(content: string): {
    total: number;
    remaining: number;
    engagement_optimal: boolean;
    preview_cutoff: boolean;
  } {
    return {
      total: content.length,
      remaining: Math.max(0, FACEBOOK_CONFIG.character_limit - content.length),
      engagement_optimal: content.length <= FACEBOOK_CONFIG.optimal_length,
      preview_cutoff: content.length > FACEBOOK_CONFIG.preview_length
    };
  }
}

// Export singleton instance
export const facebookAdapter = new FacebookAdapter();
