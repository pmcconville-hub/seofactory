/**
 * LinkedIn Platform Adapter
 *
 * Transforms content for LinkedIn with platform-specific
 * formatting, character limits, and best practices.
 */

import type {
  SocialPost,
  SocialPostInput,
  ArticleTransformationSource,
  ImageInstructions,
  PostEAVTriple
} from '../../../../types/social';
import { hashtagGenerator, type ResolvedEntity } from '../hashtagGenerator';

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
    let content: string;

    switch (options.template_type) {
      case 'hub_announcement':
        content = this.createHubAnnouncement(source);
        break;
      case 'key_takeaway':
        content = this.createKeyTakeaway(source);
        break;
      case 'entity_spotlight':
        content = this.createEntitySpotlight(source, options.eav);
        break;
      case 'question_hook':
        content = this.createQuestionHook(source);
        break;
      default:
        content = this.createHubAnnouncement(source);
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
  private createHubAnnouncement(source: ArticleTransformationSource): string {
    const hookLine = this.createHookLine(source);
    const keyPoints = this.formatKeyTakeaways(source.key_takeaways.slice(0, 3));
    const cta = this.createCTA(source);

    return `${hookLine}

${keyPoints}

${cta}

${source.link_url}`;
  }

  /**
   * Create key takeaway post (spoke)
   */
  private createKeyTakeaway(source: ArticleTransformationSource): string {
    const takeaway = source.key_takeaways[0] || source.meta_description;
    const mainEntity = source.schema_entities[0]?.name || '';

    return `${mainEntity ? `When it comes to ${mainEntity}, ` : ''}here's what you need to know:

${takeaway}

This matters because understanding this can transform how you approach your work.

Read the full breakdown: ${source.link_url}`;
  }

  /**
   * Create entity spotlight post (spoke)
   */
  private createEntitySpotlight(
    source: ArticleTransformationSource,
    eav?: PostEAVTriple
  ): string {
    if (!eav) {
      // Fallback to first entity
      const entity = source.schema_entities[0];
      if (entity) {
        return `Let's talk about ${entity.name}.

${source.key_takeaways[0] || source.meta_description}

Learn more: ${source.link_url}`;
      }
      return this.createKeyTakeaway(source);
    }

    return `${eav.entity} ${this.formatAttribute(eav.attribute)} ${eav.value}.

This is a ${eav.category?.toLowerCase() || 'key'} fact that can change how you think about ${eav.entity}.

Deep dive: ${source.link_url}`;
  }

  /**
   * Create question hook post (spoke)
   */
  private createQuestionHook(source: ArticleTransformationSource): string {
    const entity = source.schema_entities[0]?.name || 'this topic';
    const question = this.generateQuestion(source);

    return `${question}

Most people get this wrong about ${entity}.

Here's what the data actually shows:

${source.key_takeaways[0] || source.meta_description}

Full analysis: ${source.link_url}`;
  }

  /**
   * Generate a compelling question from source
   */
  private generateQuestion(source: ArticleTransformationSource): string {
    const entity = source.schema_entities[0]?.name;
    const title = source.title;

    // Try to create a question from the title
    if (title.toLowerCase().includes('how')) {
      return title.endsWith('?') ? title : `${title}?`;
    }

    if (entity) {
      return `What's the most misunderstood thing about ${entity}?`;
    }

    return `What if everything you knew about this was wrong?`;
  }

  /**
   * Create compelling hook line
   */
  private createHookLine(source: ArticleTransformationSource): string {
    const entity = source.schema_entities[0]?.name;

    if (entity) {
      return `${entity}: What nobody tells you (but everyone should know)`;
    }

    // Use title if it's compelling, otherwise create one
    if (source.title.length < 100) {
      return source.title;
    }

    return `New insights you don't want to miss`;
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
   * Create call-to-action
   */
  private createCTA(source: ArticleTransformationSource): string {
    const options = [
      'Read the full guide below ↓',
      'Dive deeper into the details ↓',
      'Get the complete breakdown ↓',
      'See the full analysis ↓'
    ];

    return options[Math.floor(Math.random() * options.length)];
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
        description: `Create a professional image representing "${source.title}"`,
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
