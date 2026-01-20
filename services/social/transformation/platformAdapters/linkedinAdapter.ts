/**
 * LinkedIn Platform Adapter
 *
 * Transforms content for LinkedIn with platform-specific
 * formatting, character limits, and best practices.
 *
 * Fully localized - no hardcoded phrases.
 */

import type {
  SocialPostInput,
  ArticleTransformationSource,
  ImageInstructions,
  PostEAVTriple,
  SocialPost
} from '../../../../types/social';
import { hashtagGenerator, type ResolvedEntity } from '../hashtagGenerator';
import { socialLocalization } from '../socialLocalization';

/**
 * LinkedIn-specific configuration
 */
export const LINKEDIN_CONFIG = {
  character_limit: 3000,
  preview_limit: 210,  // Characters shown before "see more"
  hashtag_count: 5,
  optimal_length: 1300,  // Sweet spot for engagement
  image_specs: {
    landscape: { width: 1200, height: 627 },
    square: { width: 1080, height: 1080 }
  }
};

/**
 * LinkedIn content adapter
 */
export class LinkedInAdapter {
  /**
   * Transform article to LinkedIn post
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
    let content: string;

    switch (options.template_type) {
      case 'hub_announcement':
        content = this.createHubAnnouncement(source, lang);
        break;
      case 'key_takeaway':
        content = this.createKeyTakeaway(source, lang);
        break;
      case 'entity_spotlight':
        content = this.createEntitySpotlight(source, options.eav, lang);
        break;
      case 'question_hook':
        content = this.createQuestionHook(source, lang);
        break;
      default:
        content = this.createHubAnnouncement(source, lang);
    }

    // Generate hashtags from entities
    const entities: ResolvedEntity[] = source.schema_entities.map(e => ({
      name: e.name,
      type: e.type,
      wikidata_id: e.wikidata_id
    }));

    const hashtagResult = hashtagGenerator.generateFromEntities(
      'linkedin',
      entities,
      options.brandedHashtags
    );

    // Extract entities mentioned in content
    const entitiesMentioned = this.extractMentionedEntities(
      content,
      source.schema_entities.map(e => e.name)
    );

    // Get image instructions from first placeholder
    const imageInstructions = this.createImageInstructions(source);

    return {
      topic_id: source.topic_id,
      job_id: source.job_id,
      platform: 'linkedin',
      post_type: 'single',
      content_text: this.formatContent(content, hashtagResult.hashtags),
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
  private createHubAnnouncement(source: ArticleTransformationSource, lang?: string): string {
    const entity = source.schema_entities[0]?.name;
    const phrases = socialLocalization.getPhrases(lang);

    // Hook line with entity if available
    const hookLine = entity
      ? socialLocalization.getPhrase('hub_hook_with_entity', lang, { entity })
      : (source.title.length < 100 ? source.title : phrases.hub_hook_generic);

    // Key points as bullet points
    const keyPoints = this.formatKeyTakeaways(source.key_takeaways.slice(0, 3));

    // CTA
    const cta = phrases.hub_cta_read_more;

    return `${hookLine}

${keyPoints}

${cta}

${source.link_url}`;
  }

  /**
   * Create key takeaway post (spoke)
   */
  private createKeyTakeaway(source: ArticleTransformationSource, lang?: string): string {
    const takeaway = source.key_takeaways[0] || source.meta_description;
    const mainEntity = source.schema_entities[0]?.name;
    const phrases = socialLocalization.getPhrases(lang);

    const intro = mainEntity
      ? socialLocalization.getPhrase('takeaway_intro_with_entity', lang, { entity: mainEntity })
      : phrases.takeaway_intro_generic;

    return `${intro}

${takeaway}

${phrases.connector_read_full}: ${source.link_url}`;
  }

  /**
   * Create entity spotlight post (spoke)
   */
  private createEntitySpotlight(
    source: ArticleTransformationSource,
    eav?: PostEAVTriple,
    lang?: string
  ): string {
    const phrases = socialLocalization.getPhrases(lang);

    if (!eav) {
      // Fallback to first entity
      const entity = source.schema_entities[0];
      if (entity) {
        return `${socialLocalization.getPhrase('spotlight_intro', lang, { entity: entity.name })}

${source.key_takeaways[0] || source.meta_description}

${phrases.hub_cta_learn_more}: ${source.link_url}`;
      }
      return this.createKeyTakeaway(source, lang);
    }

    const categoryText = socialLocalization.getCategory(eav.category, lang);

    return `${socialLocalization.getPhrase('spotlight_fact_intro', lang, { entity: eav.entity })} ${this.formatAttribute(eav.attribute)} ${eav.value}.

${socialLocalization.getPhrase('spotlight_category_fact', lang, { category: categoryText, entity: eav.entity })}

${phrases.hub_cta_deep_dive}: ${source.link_url}`;
  }

  /**
   * Create question hook post (spoke)
   */
  private createQuestionHook(source: ArticleTransformationSource, lang?: string): string {
    const entity = source.schema_entities[0]?.name;
    const phrases = socialLocalization.getPhrases(lang);
    const takeaway = source.key_takeaways[0] || source.meta_description;

    const question = entity
      ? socialLocalization.getPhrase('question_common_misconception', lang, { entity })
      : phrases.question_what_if;

    return `${question}

${phrases.question_surprise}

${takeaway}

${phrases.hub_cta_full_analysis}: ${source.link_url}`;
  }

  /**
   * Format key takeaways as bullet points
   */
  private formatKeyTakeaways(takeaways: string[]): string {
    if (takeaways.length === 0) return '';

    return takeaways
      .map(t => `→ ${t}`)
      .join('\n\n');
  }

  /**
   * Format attribute for natural reading
   */
  private formatAttribute(attribute: string): string {
    // Convert camelCase or snake_case to readable
    return attribute
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .toLowerCase()
      .trim();
  }

  /**
   * Create image instructions from source
   */
  private createImageInstructions(
    source: ArticleTransformationSource
  ): ImageInstructions | undefined {
    const placeholder = source.image_placeholders[0];

    if (!placeholder) {
      return {
        description: `${source.title}`,
        alt_text: source.title,
        dimensions: {
          width: LINKEDIN_CONFIG.image_specs.landscape.width,
          height: LINKEDIN_CONFIG.image_specs.landscape.height,
          aspect_ratio: '1.91:1'
        }
      };
    }

    return {
      description: placeholder.caption || placeholder.alt_text,
      alt_text: placeholder.alt_text,
      dimensions: {
        width: LINKEDIN_CONFIG.image_specs.landscape.width,
        height: LINKEDIN_CONFIG.image_specs.landscape.height,
        aspect_ratio: '1.91:1'
      },
      source_placeholder_id: placeholder.id
    };
  }

  /**
   * Format content with hashtags
   */
  private formatContent(content: string, hashtags: string[]): string {
    // Ensure content doesn't exceed limit
    let formattedContent = content;

    // Calculate space needed for hashtags
    const hashtagText = hashtags.map(h => `#${h}`).join(' ');
    const maxContentLength = LINKEDIN_CONFIG.character_limit - hashtagText.length - 4; // 4 for newlines

    if (formattedContent.length > maxContentLength) {
      formattedContent = formattedContent.substring(0, maxContentLength - 3) + '...';
    }

    // Add hashtags at end
    if (hashtags.length > 0) {
      formattedContent += `\n\n${hashtagText}`;
    }

    return formattedContent;
  }

  /**
   * Extract entities mentioned in content
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
   * Validate post meets LinkedIn requirements
   */
  validatePost(post: SocialPost): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (post.content_text.length > LINKEDIN_CONFIG.character_limit) {
      issues.push(`Content exceeds ${LINKEDIN_CONFIG.character_limit} character limit`);
    }

    if ((post.hashtags?.length || 0) > LINKEDIN_CONFIG.hashtag_count) {
      issues.push(`Too many hashtags (max ${LINKEDIN_CONFIG.hashtag_count})`);
    }

    // Check for entity mentions (semantic compliance)
    if (!post.entities_mentioned || post.entities_mentioned.length === 0) {
      issues.push('No entities explicitly mentioned - may hurt semantic clarity');
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
    preview_visible: number;
    exceeds_preview: boolean;
  } {
    return {
      total: content.length,
      remaining: Math.max(0, LINKEDIN_CONFIG.character_limit - content.length),
      preview_visible: Math.min(content.length, LINKEDIN_CONFIG.preview_limit),
      exceeds_preview: content.length > LINKEDIN_CONFIG.preview_limit
    };
  }
}

// Export singleton instance
export const linkedinAdapter = new LinkedInAdapter();
