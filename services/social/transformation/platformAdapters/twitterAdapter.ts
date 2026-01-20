/**
 * Twitter/X Platform Adapter
 *
 * Transforms content for X (Twitter) with thread support,
 * character limits, and platform-specific formatting.
 *
 * Fully localized - no hardcoded phrases.
 */

import type {
  SocialPost,
  SocialPostInput,
  ArticleTransformationSource,
  ThreadSegment,
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
 * Twitter-specific configuration
 */
export const TWITTER_CONFIG = {
  character_limit: 280,
  premium_limit: 25000,
  thread_max_segments: 25,
  hashtag_count: 2,
  link_length: 23,  // Twitter shortens all links to 23 chars
  image_specs: {
    card: { width: 1200, height: 628 },
    square: { width: 1080, height: 1080 }
  }
};

/**
 * Twitter/X content adapter
 */
export class TwitterAdapter {
  /**
   * Transform article to Twitter post/thread
   */
  transformFromArticle(
    source: ArticleTransformationSource,
    options: {
      template_type: 'hub_announcement' | 'key_takeaway' | 'entity_spotlight' | 'question_hook';
      use_thread: boolean;
      eav?: PostEAVTriple;
      brandedHashtags?: string[];
    }
  ): SocialPostInput {
    const lang = source.language;

    // Generate hashtags (1-2 for Twitter)
    const entities: ResolvedEntity[] = source.schema_entities.map(e => ({
      name: e.name,
      type: e.type,
      wikidata_id: e.wikidata_id
    }));

    const hashtagResult = hashtagGenerator.generateFromEntities(
      'twitter',
      entities,
      options.brandedHashtags
    );

    let content: string;
    let thread: ThreadSegment[] | undefined;

    if (options.use_thread) {
      thread = this.createThread(source, options.template_type, hashtagResult.hashtags, lang);
      content = thread[0]?.text || '';
    } else {
      content = this.createSingleTweet(source, options.template_type, options.eav, hashtagResult.hashtags, lang);
    }

    // Extract entities mentioned
    const entitiesMentioned = this.extractMentionedEntities(
      options.use_thread
        ? thread?.map(t => t.text).join(' ') || content
        : content,
      source.schema_entities.map(e => e.name)
    );

    // Image instructions
    const imageInstructions = this.createImageInstructions(source);

    return {
      topic_id: source.topic_id,
      job_id: source.job_id,
      platform: 'twitter',
      post_type: options.use_thread ? 'thread' : 'single',
      content_text: content,
      content_thread: thread,
      hashtags: hashtagResult.hashtags,
      image_instructions: imageInstructions,
      link_url: source.link_url,
      eav_triple: options.eav,
      entities_mentioned: entitiesMentioned
    };
  }

  /**
   * Create a thread from article content
   */
  private createThread(
    source: ArticleTransformationSource,
    templateType: string,
    hashtags: string[],
    lang?: string
  ): ThreadSegment[] {
    const thread: ThreadSegment[] = [];
    const hashtagText = hashtags.map(h => `#${h}`).join(' ');
    const phrases = socialLocalization.getPhrases(lang);

    // Tweet 1: Hook with hashtags
    const hook = this.createHook(source, lang);
    thread.push({
      index: 0,
      text: this.fitToLimit(`${hook}\n\n${hashtagText}\n\n🧵`)
    });

    // Middle tweets: Key takeaways (one per tweet)
    const takeaways = source.key_takeaways.slice(0, 5);
    takeaways.forEach((takeaway, i) => {
      thread.push({
        index: i + 1,
        text: this.fitToLimit(`${takeaway}`)
      });
    });

    // Final tweet: CTA with link (only if link provided)
    if (source.link_url) {
      thread.push({
        index: thread.length,
        text: this.fitToLimit(`${phrases.thread_cta} 👇\n\n${source.link_url}`)
      });
    }

    return thread;
  }

  /**
   * Create a single tweet
   */
  private createSingleTweet(
    source: ArticleTransformationSource,
    templateType: string,
    eav?: PostEAVTriple,
    hashtags: string[] = [],
    lang?: string
  ): string {
    const hashtagText = hashtags.length > 0
      ? ' ' + hashtags.map(h => `#${h}`).join(' ')
      : '';

    let content: string;

    switch (templateType) {
      case 'hub_announcement':
        content = this.createHubTweet(source, lang);
        break;
      case 'key_takeaway':
        content = this.createTakeawayTweet(source, lang);
        break;
      case 'entity_spotlight':
        content = this.createEntityTweet(source, eav, lang);
        break;
      case 'question_hook':
        content = this.createQuestionTweet(source, lang);
        break;
      default:
        content = this.createHubTweet(source, lang);
    }

    // Add hashtags and fit to limit
    return this.fitToLimit(`${content}${hashtagText}`);
  }

  /**
   * Create hub announcement tweet
   */
  private createHubTweet(source: ArticleTransformationSource, lang?: string): string {
    const entity = source.schema_entities[0]?.name;
    const takeaway = source.key_takeaways[0] || source.meta_description;

    // Keep it punchy for Twitter
    const shortTakeaway = takeaway.length > 150
      ? takeaway.substring(0, 147) + '...'
      : takeaway;

    const mainContent = entity ? `${entity}: ${shortTakeaway}` : shortTakeaway;

    return source.link_url
      ? `${mainContent}\n\n👇 ${source.link_url}`
      : mainContent;
  }

  /**
   * Create key takeaway tweet
   */
  private createTakeawayTweet(source: ArticleTransformationSource, lang?: string): string {
    const takeaway = source.key_takeaways[0] || source.meta_description;
    const shortTakeaway = takeaway.length > 200
      ? takeaway.substring(0, 197) + '...'
      : takeaway;

    return source.link_url
      ? `${shortTakeaway}\n\n${source.link_url}`
      : shortTakeaway;
  }

  /**
   * Create entity spotlight tweet
   */
  private createEntityTweet(
    source: ArticleTransformationSource,
    eav?: PostEAVTriple,
    lang?: string
  ): string {
    const phrases = socialLocalization.getPhrases(lang);

    if (eav) {
      const mainContent = `${eav.entity} ${this.formatAttribute(eav.attribute)} ${eav.value}.`;
      return source.link_url
        ? `${mainContent}\n\n${phrases.connector_more_details}: ${source.link_url}`
        : mainContent;
    }

    const entity = source.schema_entities[0];
    if (entity) {
      const takeaway = source.key_takeaways[0];
      const shortTakeaway = takeaway && takeaway.length > 150
        ? takeaway.substring(0, 147) + '...'
        : takeaway;

      const mainContent = `${entity.name}: ${shortTakeaway || phrases.hub_cta_learn_more}`;
      return source.link_url
        ? `${mainContent}\n\n${source.link_url}`
        : mainContent;
    }

    return this.createHubTweet(source, lang);
  }

  /**
   * Create question hook tweet
   */
  private createQuestionTweet(source: ArticleTransformationSource, lang?: string): string {
    const entity = source.schema_entities[0]?.name;
    const phrases = socialLocalization.getPhrases(lang);

    const question = entity
      ? socialLocalization.getPhrase('question_biggest_question', lang, { entity })
      : phrases.question_did_you_know;

    const mainContent = `${question}\n\n${phrases.question_surprise}`;

    return source.link_url
      ? `${mainContent} 👇\n\n${source.link_url}`
      : mainContent;
  }

  /**
   * Create hook for thread
   */
  private createHook(source: ArticleTransformationSource, lang?: string): string {
    const entity = source.schema_entities[0]?.name;
    const phrases = socialLocalization.getPhrases(lang);

    if (entity) {
      return socialLocalization.getPhrase('thread_hook_with_entity', lang, { entity });
    }

    if (source.title.length < 200) {
      return source.title;
    }

    return phrases.thread_hook_generic;
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

    // Use image selector to find optimal image for Twitter
    const selected = selectImageForPlatform(extendedPlaceholders, 'twitter', {
      preferHub: options?.isHub ?? true,
      postIndex: options?.postIndex ?? 0
    });

    if (!selected) {
      return {
        description: source.title,
        alt_text: source.title,
        dimensions: {
          width: TWITTER_CONFIG.image_specs.card.width,
          height: TWITTER_CONFIG.image_specs.card.height,
          aspect_ratio: '1.91:1'
        }
      };
    }

    // Check if selected image needs resizing
    const originalPlaceholder = source.image_placeholders.find(p => p.id === selected.placeholder_id);
    const needsResize = originalPlaceholder?.specs
      ? needsResizeForPlatform(originalPlaceholder.specs, 'twitter')
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
   * Fit content to Twitter character limit
   */
  private fitToLimit(content: string): string {
    if (content.length <= TWITTER_CONFIG.character_limit) {
      return content;
    }

    // Find a good break point
    const maxLength = TWITTER_CONFIG.character_limit - 3; // For "..."
    let cutPoint = content.lastIndexOf(' ', maxLength);

    if (cutPoint < maxLength * 0.5) {
      cutPoint = maxLength;
    }

    return content.substring(0, cutPoint) + '...';
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
   * Validate post meets Twitter requirements
   */
  validatePost(post: SocialPost): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (post.post_type === 'thread') {
      if (!post.content_thread || post.content_thread.length === 0) {
        issues.push('Thread has no segments');
      } else {
        post.content_thread.forEach((segment, i) => {
          if (segment.text.length > TWITTER_CONFIG.character_limit) {
            issues.push(`Tweet ${i + 1} exceeds ${TWITTER_CONFIG.character_limit} character limit`);
          }
        });

        if (post.content_thread.length > TWITTER_CONFIG.thread_max_segments) {
          issues.push(`Thread exceeds ${TWITTER_CONFIG.thread_max_segments} tweet limit`);
        }
      }
    } else {
      if (post.content_text.length > TWITTER_CONFIG.character_limit) {
        issues.push(`Content exceeds ${TWITTER_CONFIG.character_limit} character limit`);
      }
    }

    if ((post.hashtags?.length || 0) > TWITTER_CONFIG.hashtag_count) {
      issues.push(`Too many hashtags (max ${TWITTER_CONFIG.hashtag_count} recommended)`);
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Get character count info for content
   */
  getCharacterInfo(content: string): {
    total: number;
    remaining: number;
    exceeds_limit: boolean;
  } {
    // Account for link shortening
    const urlPattern = /https?:\/\/[^\s]+/g;
    const urls = content.match(urlPattern) || [];
    let adjustedLength = content.length;

    for (const url of urls) {
      adjustedLength = adjustedLength - url.length + TWITTER_CONFIG.link_length;
    }

    return {
      total: adjustedLength,
      remaining: Math.max(0, TWITTER_CONFIG.character_limit - adjustedLength),
      exceeds_limit: adjustedLength > TWITTER_CONFIG.character_limit
    };
  }

  /**
   * Get thread character info
   */
  getThreadInfo(thread: ThreadSegment[]): {
    total_tweets: number;
    total_characters: number;
    issues: string[];
  } {
    const issues: string[] = [];
    let totalChars = 0;

    thread.forEach((segment, i) => {
      const charInfo = this.getCharacterInfo(segment.text);
      totalChars += charInfo.total;

      if (charInfo.exceeds_limit) {
        issues.push(`Tweet ${i + 1} exceeds limit by ${charInfo.total - TWITTER_CONFIG.character_limit} chars`);
      }
    });

    return {
      total_tweets: thread.length,
      total_characters: totalChars,
      issues
    };
  }
}

// Export singleton instance
export const twitterAdapter = new TwitterAdapter();
