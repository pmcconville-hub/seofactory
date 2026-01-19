/**
 * UTM Generator Service
 *
 * Generates UTM parameters for social media links to enable
 * traffic attribution in analytics.
 */

import type {
  SocialMediaPlatform,
  UTMParameters,
  SocialCampaign
} from '../../../types/social';

export interface UTMConfig {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
}

/**
 * Generates UTM parameters for social media posts
 */
export class UTMGenerator {
  private defaultMedium = 'organic-social';

  /**
   * Generate UTM parameters for a specific platform
   */
  generateForPlatform(
    platform: SocialMediaPlatform,
    config: UTMConfig,
    postType?: 'hub' | 'spoke',
    spokePosition?: number
  ): UTMParameters {
    const source = config.source || platform;
    const medium = config.medium || this.defaultMedium;
    const campaign = config.campaign || 'social-campaign';

    // Generate content identifier for A/B tracking
    let content = config.content;
    if (!content) {
      if (postType === 'hub') {
        content = `hub-${platform}`;
      } else if (postType === 'spoke' && spokePosition) {
        content = `spoke-${spokePosition}-${platform}`;
      } else {
        content = platform;
      }
    }

    return {
      utm_source: source,
      utm_medium: medium,
      utm_campaign: this.sanitizeParam(campaign),
      utm_content: this.sanitizeParam(content)
    };
  }

  /**
   * Generate UTM parameters from campaign settings
   */
  generateFromCampaign(
    campaign: SocialCampaign,
    platform: SocialMediaPlatform,
    isHub: boolean,
    spokePosition?: number
  ): UTMParameters {
    return this.generateForPlatform(
      platform,
      {
        source: campaign.utm_source || platform,
        medium: campaign.utm_medium || this.defaultMedium,
        campaign: campaign.utm_campaign || campaign.campaign_name || `campaign-${campaign.id.slice(0, 8)}`
      },
      isHub ? 'hub' : 'spoke',
      spokePosition
    );
  }

  /**
   * Build a full URL with UTM parameters
   */
  buildUrlWithUTM(baseUrl: string, params: UTMParameters): string {
    const url = new URL(baseUrl);

    url.searchParams.set('utm_source', params.utm_source);
    url.searchParams.set('utm_medium', params.utm_medium);
    url.searchParams.set('utm_campaign', params.utm_campaign);

    if (params.utm_content) {
      url.searchParams.set('utm_content', params.utm_content);
    }
    if (params.utm_term) {
      url.searchParams.set('utm_term', params.utm_term);
    }

    return url.toString();
  }

  /**
   * Parse UTM parameters from a URL
   */
  parseFromUrl(url: string): UTMParameters | null {
    try {
      const parsedUrl = new URL(url);
      const source = parsedUrl.searchParams.get('utm_source');
      const medium = parsedUrl.searchParams.get('utm_medium');
      const campaign = parsedUrl.searchParams.get('utm_campaign');

      if (!source || !medium || !campaign) {
        return null;
      }

      return {
        utm_source: source,
        utm_medium: medium,
        utm_campaign: campaign,
        utm_content: parsedUrl.searchParams.get('utm_content') || undefined,
        utm_term: parsedUrl.searchParams.get('utm_term') || undefined
      };
    } catch {
      return null;
    }
  }

  /**
   * Generate campaign-specific UTM parameters for all platforms
   */
  generateForAllPlatforms(
    platforms: SocialMediaPlatform[],
    config: UTMConfig
  ): Record<SocialMediaPlatform, UTMParameters> {
    const result: Partial<Record<SocialMediaPlatform, UTMParameters>> = {};

    for (const platform of platforms) {
      result[platform] = this.generateForPlatform(platform, config);
    }

    return result as Record<SocialMediaPlatform, UTMParameters>;
  }

  /**
   * Sanitize a UTM parameter value
   * - Lowercase
   * - Replace spaces with hyphens
   * - Remove special characters
   */
  private sanitizeParam(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/g, '')
      .replace(/-+/g, '-')
      .substring(0, 100); // Reasonable max length
  }

  /**
   * Generate a suggested campaign name from topic title
   */
  generateCampaignName(topicTitle: string, date?: Date): string {
    const cleanTitle = this.sanitizeParam(topicTitle).substring(0, 50);
    const dateStr = (date || new Date()).toISOString().slice(0, 10);
    return `${cleanTitle}-${dateStr}`;
  }
}

// Export singleton instance
export const utmGenerator = new UTMGenerator();
