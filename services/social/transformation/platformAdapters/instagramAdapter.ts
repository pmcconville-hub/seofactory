/**
 * Instagram Platform Adapter
 *
 * Transforms content for Instagram with carousel support,
 * visual-first approach, and optimal hashtag strategy.
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
    const lang = source.language;

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
      carouselSlides = this.createCarouselSlides(source, lang);
      content = this.createCarouselCaption(source, lang);
    } else {
      switch (options.template_type) {
        case 'hub_announcement':
          content = this.createHubCaption(source, lang);
          break;
        case 'key_takeaway':
          content = this.createTakeawayCaption(source, lang);
          break;
        case 'entity_spotlight':
          content = this.createEntityCaption(source, options.eav, lang);
          break;
        case 'question_hook':
          content = this.createQuestionCaption(source, lang);
          break;
        case 'listicle':
          content = this.createListicleCaption(source, lang);
          break;
        default:
          content = this.createHubCaption(source, lang);
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
  createCarouselSlides(source: ArticleTransformationSource, lang?: string): CarouselSlide[] {
    const slides: CarouselSlide[] = [];
    const entity = source.schema_entities[0]?.name;
    const phrases = socialLocalization.getPhrases(lang);

    // Slide 1: Title/Hook
    slides.push({
      index: 0,
      type: 'text_on_image',
      headline: entity
        ? socialLocalization.getPhrase('carousel_cover_with_entity', lang, { entity })
        : (source.title.length < 60 ? source.title : phrases.carousel_cover_generic),
      body_text: phrases.carousel_swipe_cta + ' →',
      image_description: `Cover slide: ${entity || source.title}`
    });

    // Middle slides: Key takeaways (one per slide)
    const takeaways = source.key_takeaways.slice(0, 7);
    takeaways.forEach((takeaway, i) => {
      slides.push({
        index: i + 1,
        type: 'text_on_image',
        headline: `${i + 1}.`,
        body_text: takeaway,
        image_description: `Slide ${i + 1}: ${takeaway.substring(0, 50)}...`
      });
    });

    // Final slide: CTA
    slides.push({
      index: slides.length,
      type: 'text_on_image',
      headline: phrases.carousel_final_cta,
      body_text: phrases.engagement_link_in_bio + ' 📱',
      image_description: `CTA slide: ${phrases.engagement_link_in_bio}`
    });

    return slides.slice(0, INSTAGRAM_CONFIG.carousel_max_slides);
  }

  /**
   * Create caption for carousel post
   */
  private createCarouselCaption(source: ArticleTransformationSource, lang?: string): string {
    const entity = source.schema_entities[0]?.name;
    const phrases = socialLocalization.getPhrases(lang);

    let caption = entity
      ? `${socialLocalization.getPhrase('carousel_slides_explained', lang, { entity, count: source.key_takeaways.length + 2 })} 📚\n\n`
      : `${phrases.hub_hook_generic} 📚\n\n`;

    caption += `${phrases.carousel_swipe_cta}:\n`;
    source.key_takeaways.slice(0, 5).forEach((_, i) => {
      caption += `📍 ${phrases.takeaway_intro_generic.replace(':', '')} ${i + 1}\n`;
    });

    caption += `\n💡 ${phrases.engagement_save_post}\n`;
    caption += `🔗 ${phrases.engagement_link_in_bio}`;

    return caption;
  }

  /**
   * Create hub announcement caption
   */
  private createHubCaption(source: ArticleTransformationSource, lang?: string): string {
    const entity = source.schema_entities[0]?.name;
    const takeaway = source.key_takeaways[0] || source.meta_description;
    const phrases = socialLocalization.getPhrases(lang);

    let caption = '';

    if (entity) {
      caption = `${socialLocalization.getPhrase('hub_hook_with_entity', lang, { entity })} ⬇️\n\n`;
    }

    caption += `${takeaway}\n\n`;
    caption += `💡 ${phrases.engagement_save_post}\n`;
    caption += `🔗 ${phrases.engagement_link_in_bio}`;

    return caption;
  }

  /**
   * Create key takeaway caption
   */
  private createTakeawayCaption(source: ArticleTransformationSource, lang?: string): string {
    const takeaway = source.key_takeaways[0] || source.meta_description;
    const phrases = socialLocalization.getPhrases(lang);

    return `📌 ${takeaway}\n\n${phrases.engagement_double_tap}\n\n🔗 ${phrases.engagement_link_in_bio}`;
  }

  /**
   * Create entity spotlight caption
   */
  private createEntityCaption(
    source: ArticleTransformationSource,
    eav?: PostEAVTriple,
    lang?: string
  ): string {
    const phrases = socialLocalization.getPhrases(lang);

    if (eav) {
      const categoryText = socialLocalization.getCategory(eav.category, lang);
      return `✨ ${eav.entity}\n\n${this.formatAttribute(eav.attribute)}: ${eav.value}\n\n${socialLocalization.getPhrase('spotlight_category_fact', lang, { category: categoryText, entity: eav.entity })}\n\n💡 ${phrases.engagement_save_post}\n🔗 ${phrases.engagement_link_in_bio}`;
    }

    const entity = source.schema_entities[0];
    if (entity) {
      return `${socialLocalization.getPhrase('spotlight_intro', lang, { entity: entity.name })} ✨\n\n${source.key_takeaways[0] || source.meta_description}\n\n💡 ${phrases.engagement_save_post}\n🔗 ${phrases.engagement_link_in_bio}`;
    }

    return this.createHubCaption(source, lang);
  }

  /**
   * Create question hook caption
   */
  private createQuestionCaption(source: ArticleTransformationSource, lang?: string): string {
    const entity = source.schema_entities[0]?.name;
    const phrases = socialLocalization.getPhrases(lang);

    const question = entity
      ? socialLocalization.getPhrase('question_biggest_question', lang, { entity })
      : phrases.question_did_you_know;

    return `${question} 🤔\n\n${phrases.engagement_comment} ⬇️\n\n${source.key_takeaways[0] || ''}\n\n🔗 ${phrases.engagement_link_in_bio}`;
  }

  /**
   * Create listicle caption
   */
  private createListicleCaption(source: ArticleTransformationSource, lang?: string): string {
    const entity = source.schema_entities[0]?.name;
    const takeaways = source.key_takeaways.slice(0, 5);
    const phrases = socialLocalization.getPhrases(lang);

    let caption = entity
      ? socialLocalization.getPhrase('listicle_intro_with_entity', lang, { count: takeaways.length, entity }) + '\n\n'
      : socialLocalization.getPhrase('listicle_intro_generic', lang, { count: takeaways.length }) + '\n\n';

    takeaways.forEach((t, i) => {
      caption += `${i + 1}. ${t}\n`;
    });

    caption += `\n💡 ${phrases.engagement_save_post}\n🔗 ${phrases.engagement_link_in_bio}`;

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
   * Create image instructions using optimal image selection
   */
  private createImageInstructions(
    source: ArticleTransformationSource,
    isCarousel: boolean,
    options?: { isHub?: boolean; postIndex?: number }
  ): ImageInstructions {
    const specs = INSTAGRAM_CONFIG.image_specs.portrait;

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

    // Use image selector to find optimal image for Instagram
    const selected = selectImageForPlatform(extendedPlaceholders, 'instagram', {
      preferHub: options?.isHub ?? true,
      postIndex: options?.postIndex ?? 0
    });

    if (!selected) {
      return {
        description: isCarousel
          ? `${source.key_takeaways.length + 2} carousel slides: Cover, ${source.key_takeaways.length} key points, CTA`
          : source.title,
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
      ? needsResizeForPlatform(originalPlaceholder.specs, 'instagram')
      : true;

    return {
      description: isCarousel
        ? `${source.key_takeaways.length + 2} carousel slides: Cover, ${source.key_takeaways.length} key points, CTA`
        : selected.description,
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
