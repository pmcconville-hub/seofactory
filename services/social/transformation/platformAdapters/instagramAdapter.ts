/**
 * Instagram Platform Adapter
 *
 * Transforms content for Instagram with carousel support,
 * visual-first approach, and optimal hashtag strategy.
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
 * Instagram-specific configuration
 */
export const INSTAGRAM_CONFIG = {
  character_limit: 2200,
  preview_limit: 125,  // Characters before "more"
  bio_limit: 150,
  hashtag_count: 5,  // Optimal (can use up to 30)
  max_hashtags: 30,
  carousel_max_slides: 10,
  image_specs: {
    portrait: { width: 1080, height: 1350, ratio: '4:5' },
    square: { width: 1080, height: 1080, ratio: '1:1' },
    landscape: { width: 1080, height: 608, ratio: '1.91:1' },
    story: { width: 1080, height: 1920, ratio: '9:16' }
  }
};

/**
 * Carousel slide content
 */
export interface CarouselSlide {
  index: number;
  type: 'image' | 'text_on_image';
  headline?: string;
  body_text?: string;
  image_description: string;
}

/**
 * Instagram content adapter
 */
export class InstagramAdapter {
  /**
   * Transform article to Instagram post
   */
  transformFromArticle(
    source: ArticleTransformationSource,
    options: {
      template_type: 'hub_announcement' | 'key_takeaway' | 'entity_spotlight' | 'question_hook' | 'listicle';
      use_carousel: boolean;
      eav?: PostEAVTriple;
      brandedHashtags?: string[];
    }
  ): SocialPostInput {
    // Generate hashtags
    const entities: ResolvedEntity[] = source.schema_entities.map(e => ({
      name: e.name,
      type: e.type,
      wikidata_id: e.wikidata_id
    }));

    const hashtagResult = hashtagGenerator.generateFromEntities(
      'instagram',
      entities,
      options.brandedHashtags
    );

    let content: string;
    let carouselSlides: CarouselSlide[] | undefined;

    if (options.use_carousel) {
      carouselSlides = this.createCarouselSlides(source);
      content = this.createCarouselCaption(source);
    } else {
      switch (options.template_type) {
        case 'hub_announcement':
          content = this.createHubCaption(source);
          break;
        case 'key_takeaway':
          content = this.createTakeawayCaption(source);
          break;
        case 'entity_spotlight':
          content = this.createEntityCaption(source, options.eav);
          break;
        case 'question_hook':
          content = this.createQuestionCaption(source);
          break;
        case 'listicle':
          content = this.createListicleCaption(source);
          break;
        default:
          content = this.createHubCaption(source);
      }
    }

    // Add hashtags
    content = this.formatWithHashtags(content, hashtagResult.hashtags);

    // Extract mentioned entities
    const entitiesMentioned = this.extractMentionedEntities(
      content,
      source.schema_entities.map(e => e.name)
    );

    // Image instructions
    const imageInstructions = this.createImageInstructions(source, options.use_carousel);

    return {
      topic_id: source.topic_id,
      job_id: source.job_id,
      platform: 'instagram',
      post_type: options.use_carousel ? 'carousel' : 'single',
      content_text: content,
      hashtags: hashtagResult.hashtags,
      image_instructions: imageInstructions,
      link_url: source.link_url,
      eav_triple: options.eav,
      entities_mentioned: entitiesMentioned
    };
  }

  /**
   * Create carousel slides from article content
   */
  createCarouselSlides(source: ArticleTransformationSource): CarouselSlide[] {
    const slides: CarouselSlide[] = [];
    const entity = source.schema_entities[0]?.name;

    // Slide 1: Title/Hook
    slides.push({
      index: 0,
      type: 'text_on_image',
      headline: entity
        ? `${entity}: What You Need to Know`
        : source.title.length < 60 ? source.title : 'What You Need to Know',
      body_text: 'Swipe to learn more →',
      image_description: `Cover slide with bold title about ${entity || 'the topic'}`
    });

    // Middle slides: Key takeaways (one per slide)
    const takeaways = source.key_takeaways.slice(0, 7);
    takeaways.forEach((takeaway, i) => {
      slides.push({
        index: i + 1,
        type: 'text_on_image',
        headline: `${i + 1}.`,
        body_text: takeaway,
        image_description: `Slide with key point: ${takeaway.substring(0, 50)}...`
      });
    });

    // Final slide: CTA
    slides.push({
      index: slides.length,
      type: 'text_on_image',
      headline: 'Want More?',
      body_text: 'Link in bio for the full guide 📱',
      image_description: 'Call-to-action slide directing to link in bio'
    });

    return slides.slice(0, INSTAGRAM_CONFIG.carousel_max_slides);
  }

  /**
   * Create caption for carousel post
   */
  private createCarouselCaption(source: ArticleTransformationSource): string {
    const entity = source.schema_entities[0]?.name;

    let caption = entity
      ? `${entity} explained in ${source.key_takeaways.length + 2} slides 📚\n\n`
      : `Essential insights you need to see 📚\n\n`;

    caption += 'Swipe through to learn:\n';
    source.key_takeaways.slice(0, 5).forEach((_, i) => {
      caption += `📍 Key insight ${i + 1}\n`;
    });

    caption += '\n💡 Save this post for later!\n';
    caption += '🔗 Full guide linked in bio';

    return caption;
  }

  /**
   * Create hub announcement caption
   */
  private createHubCaption(source: ArticleTransformationSource): string {
    const entity = source.schema_entities[0]?.name;
    const takeaway = source.key_takeaways[0] || source.meta_description;

    let caption = '';

    if (entity) {
      caption = `Everything you need to know about ${entity} ⬇️\n\n`;
    }

    caption += `${takeaway}\n\n`;
    caption += '💡 Save this post!\n';
    caption += '🔗 Link in bio for the complete guide';

    return caption;
  }

  /**
   * Create key takeaway caption
   */
  private createTakeawayCaption(source: ArticleTransformationSource): string {
    const takeaway = source.key_takeaways[0] || source.meta_description;

    return `📌 ${takeaway}\n\nDouble tap if you found this helpful!\n\n🔗 More insights in bio`;
  }

  /**
   * Create entity spotlight caption
   */
  private createEntityCaption(
    source: ArticleTransformationSource,
    eav?: PostEAVTriple
  ): string {
    if (eav) {
      return `✨ ${eav.entity}\n\n${this.formatAttribute(eav.attribute)}: ${eav.value}\n\nThis is one of the ${eav.category?.toLowerCase() || 'key'} facts that sets this apart.\n\n💡 Save for later\n🔗 Deep dive in bio`;
    }

    const entity = source.schema_entities[0];
    if (entity) {
      return `Let's talk about ${entity.name} ✨\n\n${source.key_takeaways[0] || source.meta_description}\n\n💡 Save this!\n🔗 Full guide in bio`;
    }

    return this.createHubCaption(source);
  }

  /**
   * Create question hook caption
   */
  private createQuestionCaption(source: ArticleTransformationSource): string {
    const entity = source.schema_entities[0]?.name;

    const question = entity
      ? `What's your biggest question about ${entity}? 🤔`
      : `What's one thing you wish you knew? 🤔`;

    return `${question}\n\nDrop it in the comments! ⬇️\n\nMeanwhile, check out what we've learned:\n${source.key_takeaways[0] || ''}\n\n🔗 More in bio`;
  }

  /**
   * Create listicle caption
   */
  private createListicleCaption(source: ArticleTransformationSource): string {
    const entity = source.schema_entities[0]?.name;
    const takeaways = source.key_takeaways.slice(0, 5);

    let caption = entity
      ? `${takeaways.length} things to know about ${entity}:\n\n`
      : `${takeaways.length} insights you need:\n\n`;

    takeaways.forEach((t, i) => {
      caption += `${i + 1}. ${t}\n`;
    });

    caption += '\n💡 Save for later\n🔗 Full breakdown in bio';

    return caption;
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
   * Create image instructions
   */
  private createImageInstructions(
    source: ArticleTransformationSource,
    isCarousel: boolean
  ): ImageInstructions {
    const placeholder = source.image_placeholders[0];
    const specs = INSTAGRAM_CONFIG.image_specs.portrait;

    const baseDescription = placeholder?.alt_text || source.title;

    return {
      description: isCarousel
        ? `Create ${source.key_takeaways.length + 2} carousel slides: Cover, ${source.key_takeaways.length} key points, CTA`
        : `Create an engaging visual for: ${baseDescription}`,
      alt_text: placeholder?.alt_text || source.title,
      dimensions: {
        width: specs.width,
        height: specs.height,
        aspect_ratio: specs.ratio
      },
      source_placeholder_id: placeholder?.id
    };
  }

  /**
   * Format content with hashtags
   */
  private formatWithHashtags(content: string, hashtags: string[]): string {
    if (hashtags.length === 0) return content;

    const hashtagText = hashtags.map(h => `#${h}`).join(' ');

    // Instagram: hashtags can go in caption or first comment
    // We'll put them at the end of caption with spacing
    return `${content}\n\n.\n.\n.\n\n${hashtagText}`;
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
   * Validate post meets Instagram requirements
   */
  validatePost(post: SocialPost): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (post.content_text.length > INSTAGRAM_CONFIG.character_limit) {
      issues.push(`Caption exceeds ${INSTAGRAM_CONFIG.character_limit} character limit`);
    }

    if ((post.hashtags?.length || 0) > INSTAGRAM_CONFIG.max_hashtags) {
      issues.push(`Too many hashtags (max ${INSTAGRAM_CONFIG.max_hashtags})`);
    }

    // Best practices check
    const previewText = post.content_text.substring(0, INSTAGRAM_CONFIG.preview_limit);
    if (!previewText.includes('\n') && previewText.length > 100) {
      issues.push('Consider adding line breaks for readability in preview');
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
    preview_text: string;
    exceeds_preview: boolean;
  } {
    return {
      total: content.length,
      remaining: Math.max(0, INSTAGRAM_CONFIG.character_limit - content.length),
      preview_text: content.substring(0, INSTAGRAM_CONFIG.preview_limit),
      exceeds_preview: content.length > INSTAGRAM_CONFIG.preview_limit
    };
  }
}

// Export singleton instance
export const instagramAdapter = new InstagramAdapter();
