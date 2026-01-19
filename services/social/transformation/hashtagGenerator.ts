/**
 * Hashtag Generator Service
 *
 * Generates platform-optimized hashtags from schema entities
 * and content topics.
 */

import type {
  SocialMediaPlatform,
  EntityHashtagMapping,
  HashtagStrategy
} from '../../../types/social';

/**
 * Entity with Wikidata resolution
 */
export interface ResolvedEntity {
  name: string;
  type: string;
  wikidata_id?: string;
}

/**
 * Hashtag generation result
 */
export interface HashtagResult {
  hashtags: string[];
  primary: string[];
  secondary: string[];
  branded: string[];
  total_count: number;
}

/**
 * Platform-specific hashtag configurations
 */
const PLATFORM_HASHTAG_CONFIG: Record<SocialMediaPlatform, {
  optimal_count: number;
  max_count: number;
  include_branded: boolean;
  include_niche: boolean;
}> = {
  linkedin: {
    optimal_count: 5,
    max_count: 5,
    include_branded: true,
    include_niche: true
  },
  twitter: {
    optimal_count: 2,
    max_count: 2,
    include_branded: false,
    include_niche: true
  },
  facebook: {
    optimal_count: 3,
    max_count: 3,
    include_branded: true,
    include_niche: true
  },
  instagram: {
    optimal_count: 5,
    max_count: 30,
    include_branded: true,
    include_niche: true
  },
  pinterest: {
    optimal_count: 0,
    max_count: 0,
    include_branded: false,
    include_niche: false
  }
};

/**
 * Generates platform-optimized hashtags from entities and topics
 */
export class HashtagGenerator {
  private entityMappings: Map<string, EntityHashtagMapping[]> = new Map();

  /**
   * Load entity-to-hashtag mappings
   */
  loadMappings(mappings: EntityHashtagMapping[]): void {
    this.entityMappings.clear();

    for (const mapping of mappings) {
      const key = this.normalizeEntityName(mapping.entity_name);
      const existing = this.entityMappings.get(key) || [];
      existing.push(mapping);
      this.entityMappings.set(key, existing);
    }
  }

  /**
   * Generate hashtags for a platform from entities
   */
  generateFromEntities(
    platform: SocialMediaPlatform,
    entities: ResolvedEntity[],
    brandedHashtags?: string[]
  ): HashtagResult {
    const config = PLATFORM_HASHTAG_CONFIG[platform];

    // Pinterest doesn't use hashtags - return empty
    if (platform === 'pinterest') {
      return {
        hashtags: [],
        primary: [],
        secondary: [],
        branded: [],
        total_count: 0
      };
    }

    const primary: string[] = [];
    const secondary: string[] = [];
    const branded: string[] = brandedHashtags ? [...brandedHashtags] : [];

    // Generate from entities
    for (const entity of entities) {
      const mapping = this.findMapping(entity.name, platform);

      if (mapping) {
        // Use mapped hashtags
        if (!primary.includes(mapping.primary_hashtag)) {
          primary.push(mapping.primary_hashtag);
        }
        if (mapping.secondary_hashtags) {
          for (const tag of mapping.secondary_hashtags) {
            if (!secondary.includes(tag)) {
              secondary.push(tag);
            }
          }
        }
        if (mapping.branded_hashtags) {
          for (const tag of mapping.branded_hashtags) {
            if (!branded.includes(tag)) {
              branded.push(tag);
            }
          }
        }
      } else {
        // Generate hashtag from entity name
        const generated = this.entityToHashtag(entity.name);
        if (generated && !primary.includes(generated)) {
          primary.push(generated);
        }

        // Generate type-based hashtag if applicable
        if (entity.type) {
          const typeTag = this.entityTypeToHashtag(entity.type);
          if (typeTag && !secondary.includes(typeTag)) {
            secondary.push(typeTag);
          }
        }
      }
    }

    // Combine and limit to platform max
    const allHashtags = this.combineAndLimit(
      primary,
      secondary,
      branded,
      config
    );

    return {
      hashtags: allHashtags,
      primary: primary.slice(0, config.optimal_count),
      secondary: secondary.slice(0, Math.max(0, config.max_count - primary.length)),
      branded: config.include_branded ? branded.slice(0, 2) : [],
      total_count: allHashtags.length
    };
  }

  /**
   * Generate hashtags from topic and keywords
   */
  generateFromKeywords(
    platform: SocialMediaPlatform,
    keywords: string[],
    brandedHashtags?: string[]
  ): HashtagResult {
    const config = PLATFORM_HASHTAG_CONFIG[platform];

    if (platform === 'pinterest') {
      return {
        hashtags: [],
        primary: [],
        secondary: [],
        branded: [],
        total_count: 0
      };
    }

    const primary: string[] = [];
    const secondary: string[] = [];
    const branded: string[] = brandedHashtags ? [...brandedHashtags] : [];

    for (const keyword of keywords) {
      const tag = this.keywordToHashtag(keyword);
      if (tag) {
        if (primary.length < config.optimal_count) {
          primary.push(tag);
        } else {
          secondary.push(tag);
        }
      }
    }

    const allHashtags = this.combineAndLimit(
      primary,
      secondary,
      branded,
      config
    );

    return {
      hashtags: allHashtags,
      primary,
      secondary,
      branded: config.include_branded ? branded : [],
      total_count: allHashtags.length
    };
  }

  /**
   * Format hashtags for platform output
   */
  formatForPlatform(
    platform: SocialMediaPlatform,
    hashtags: string[],
    placement: 'inline' | 'end' | 'comment' = 'end'
  ): string {
    if (hashtags.length === 0) {
      return '';
    }

    const formatted = hashtags
      .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
      .join(' ');

    if (placement === 'inline') {
      return formatted;
    }

    return `\n\n${formatted}`;
  }

  /**
   * Find a mapping for an entity and platform
   */
  private findMapping(
    entityName: string,
    platform: SocialMediaPlatform
  ): EntityHashtagMapping | undefined {
    const normalized = this.normalizeEntityName(entityName);
    const mappings = this.entityMappings.get(normalized);

    if (!mappings) return undefined;

    return mappings.find(m => m.platform === platform);
  }

  /**
   * Normalize entity name for mapping lookup
   */
  private normalizeEntityName(name: string): string {
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  /**
   * Convert entity name to hashtag
   */
  private entityToHashtag(entityName: string): string | null {
    const cleaned = entityName
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim();

    if (!cleaned) return null;

    // CamelCase for multi-word
    const words = cleaned.split(/\s+/);
    if (words.length > 1) {
      return words
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join('');
    }

    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
  }

  /**
   * Convert entity type to hashtag
   */
  private entityTypeToHashtag(entityType: string): string | null {
    const typeHashtags: Record<string, string> = {
      'Person': 'Expert',
      'Organization': 'Business',
      'Product': 'Product',
      'Service': 'Services',
      'Place': 'Location',
      'Event': 'Events',
      'CreativeWork': 'Content',
      'SoftwareApplication': 'Software',
      'MedicalCondition': 'Health',
      'Recipe': 'Recipe'
    };

    return typeHashtags[entityType] || null;
  }

  /**
   * Convert keyword to hashtag
   */
  private keywordToHashtag(keyword: string): string | null {
    const cleaned = keyword
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim();

    if (!cleaned || cleaned.length < 2) return null;

    // Remove common stop words
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'];
    const words = cleaned.split(/\s+/).filter(w => !stopWords.includes(w.toLowerCase()));

    if (words.length === 0) return null;

    // CamelCase
    return words
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Combine and limit hashtags based on platform config
   */
  private combineAndLimit(
    primary: string[],
    secondary: string[],
    branded: string[],
    config: typeof PLATFORM_HASHTAG_CONFIG[SocialMediaPlatform]
  ): string[] {
    const result: string[] = [];

    // Add primary hashtags first
    for (const tag of primary) {
      if (result.length >= config.max_count) break;
      if (!result.includes(tag)) {
        result.push(tag);
      }
    }

    // Add branded if enabled and room
    if (config.include_branded) {
      for (const tag of branded) {
        if (result.length >= config.max_count) break;
        if (!result.includes(tag)) {
          result.push(tag);
        }
      }
    }

    // Fill remaining with secondary
    for (const tag of secondary) {
      if (result.length >= config.max_count) break;
      if (!result.includes(tag)) {
        result.push(tag);
      }
    }

    return result;
  }

  /**
   * Get recommended hashtag count for platform
   */
  getRecommendedCount(platform: SocialMediaPlatform): number {
    return PLATFORM_HASHTAG_CONFIG[platform].optimal_count;
  }

  /**
   * Get max hashtag count for platform
   */
  getMaxCount(platform: SocialMediaPlatform): number {
    return PLATFORM_HASHTAG_CONFIG[platform].max_count;
  }
}

// Export singleton instance
export const hashtagGenerator = new HashtagGenerator();
