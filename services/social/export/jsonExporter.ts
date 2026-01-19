/**
 * JSON Exporter
 *
 * Exports social campaigns and posts as structured JSON
 * for data portability and integrations.
 */

import type {
  SocialCampaign,
  SocialPost,
  CampaignExport,
  SocialMediaPlatform
} from '../../../types/social';

/**
 * JSON export options
 */
export interface JsonExportOptions {
  include_instructions?: boolean;
  include_compliance?: boolean;
  pretty_print?: boolean;
  include_metadata?: boolean;
}

/**
 * Export metadata
 */
interface ExportMetadata {
  exported_at: string;
  exporter_version: string;
  campaign_id: string;
  total_posts: number;
}

/**
 * JSON exporter for social campaigns
 */
export class JsonExporter {
  private version = '1.0.0';

  /**
   * Export single post as JSON
   */
  exportPost(
    post: SocialPost,
    options: JsonExportOptions = {}
  ): string {
    const {
      include_instructions = true,
      include_compliance = false,
      pretty_print = true
    } = options;

    const exportData: Record<string, unknown> = {
      id: post.id,
      platform: post.platform,
      post_type: post.post_type,
      is_hub: post.is_hub,
      spoke_position: post.spoke_position,
      content: {
        text: post.content_text,
        thread: post.content_thread,
        hashtags: post.hashtags,
        mentions: post.mentions
      },
      link: {
        url: post.link_url,
        utm_parameters: post.utm_parameters
      },
      status: post.status,
      created_at: post.created_at
    };

    if (include_instructions && post.posting_instructions) {
      exportData.instructions = {
        full: post.posting_instructions,
        optimal_time: post.optimal_posting_time
      };
    }

    if (include_compliance) {
      exportData.compliance = {
        score: post.semantic_compliance_score,
        eav_triple: post.eav_triple,
        entities_mentioned: post.entities_mentioned,
        semantic_distance: post.semantic_distance_from_hub
      };
    }

    if (post.image_instructions) {
      exportData.image = post.image_instructions;
    }

    return pretty_print
      ? JSON.stringify(exportData, null, 2)
      : JSON.stringify(exportData);
  }

  /**
   * Export full campaign as JSON
   */
  exportCampaign(
    campaign: SocialCampaign,
    posts: SocialPost[],
    options: JsonExportOptions = {}
  ): string {
    const {
      include_instructions = true,
      include_compliance = true,
      include_metadata = true,
      pretty_print = true
    } = options;

    // Group posts by platform
    const byPlatform: Record<SocialMediaPlatform, SocialPost[]> = {
      linkedin: [],
      twitter: [],
      facebook: [],
      instagram: [],
      pinterest: []
    };

    for (const post of posts) {
      byPlatform[post.platform].push(post);
    }

    // Find hub and spokes
    const hubPost = posts.find(p => p.is_hub);
    const spokePosts = posts.filter(p => !p.is_hub).sort((a, b) =>
      (a.spoke_position || 0) - (b.spoke_position || 0)
    );

    const exportData: Record<string, unknown> = {
      campaign: {
        id: campaign.id,
        name: campaign.campaign_name,
        hub_platform: campaign.hub_platform,
        status: campaign.status,
        utm: {
          source: campaign.utm_source,
          medium: campaign.utm_medium,
          campaign: campaign.utm_campaign
        },
        compliance_score: campaign.overall_compliance_score,
        created_at: campaign.created_at
      },
      structure: {
        hub: hubPost ? this.serializePost(hubPost, include_instructions, include_compliance) : null,
        spokes: spokePosts.map(p => this.serializePost(p, include_instructions, include_compliance))
      },
      by_platform: Object.fromEntries(
        Object.entries(byPlatform)
          .filter(([_, posts]) => posts.length > 0)
          .map(([platform, posts]) => [
            platform,
            posts.map(p => this.serializePost(p, include_instructions, include_compliance))
          ])
      ),
      links: this.extractLinks(posts)
    };

    if (include_metadata) {
      exportData.metadata = {
        exported_at: new Date().toISOString(),
        exporter_version: this.version,
        campaign_id: campaign.id,
        total_posts: posts.length
      } as ExportMetadata;
    }

    return pretty_print
      ? JSON.stringify(exportData, null, 2)
      : JSON.stringify(exportData);
  }

  /**
   * Export campaign for import into scheduling tools
   */
  exportForSchedulingTool(
    campaign: SocialCampaign,
    posts: SocialPost[],
    toolFormat: 'buffer' | 'hootsuite' | 'generic' = 'generic'
  ): string {
    const exportData = posts.map(post => {
      const base = {
        platform: this.mapPlatformName(post.platform, toolFormat),
        content: post.content_text,
        link: post.link_url,
        hashtags: post.hashtags
      };

      if (toolFormat === 'buffer') {
        return {
          ...base,
          media: post.image_instructions ? [{
            description: post.image_instructions.description,
            alt_text: post.image_instructions.alt_text
          }] : []
        };
      }

      if (toolFormat === 'hootsuite') {
        return {
          text: post.content_text,
          socialProfile: post.platform,
          mediaUrls: [],
          scheduledSendTime: null
        };
      }

      return base;
    });

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Serialize post for export
   */
  private serializePost(
    post: SocialPost,
    includeInstructions: boolean,
    includeCompliance: boolean
  ): Record<string, unknown> {
    const serialized: Record<string, unknown> = {
      id: post.id,
      platform: post.platform,
      type: post.post_type,
      is_hub: post.is_hub,
      spoke_position: post.spoke_position,
      content: post.content_text,
      thread: post.content_thread,
      hashtags: post.hashtags,
      link: post.link_url,
      utm: post.utm_parameters,
      status: post.status
    };

    if (includeInstructions) {
      serialized.instructions = post.posting_instructions;
      serialized.optimal_time = post.optimal_posting_time;
    }

    if (includeCompliance) {
      serialized.compliance = {
        score: post.semantic_compliance_score,
        eav: post.eav_triple,
        entities: post.entities_mentioned,
        distance: post.semantic_distance_from_hub
      };
    }

    if (post.image_instructions) {
      serialized.image = post.image_instructions;
    }

    return serialized;
  }

  /**
   * Extract all links with UTM parameters
   */
  private extractLinks(posts: SocialPost[]): Record<string, string> {
    const links: Record<string, string> = {};

    for (const post of posts) {
      if (post.link_url) {
        const key = post.is_hub
          ? `hub_${post.platform}`
          : `spoke_${post.spoke_position}_${post.platform}`;
        links[key] = post.link_url;
      }
    }

    return links;
  }

  /**
   * Map platform name for external tools
   */
  private mapPlatformName(
    platform: SocialMediaPlatform,
    toolFormat: string
  ): string {
    if (toolFormat === 'buffer') {
      const bufferNames: Record<SocialMediaPlatform, string> = {
        linkedin: 'linkedin',
        twitter: 'twitter',
        facebook: 'facebook',
        instagram: 'instagram',
        pinterest: 'pinterest'
      };
      return bufferNames[platform];
    }

    if (toolFormat === 'hootsuite') {
      const hootsuiteNames: Record<SocialMediaPlatform, string> = {
        linkedin: 'LINKEDIN',
        twitter: 'TWITTER',
        facebook: 'FACEBOOK',
        instagram: 'INSTAGRAM',
        pinterest: 'PINTEREST'
      };
      return hootsuiteNames[platform];
    }

    return platform;
  }

  /**
   * Parse JSON export back to objects
   */
  parseExport(jsonString: string): {
    campaign?: Partial<SocialCampaign>;
    posts: Partial<SocialPost>[];
    metadata?: ExportMetadata;
  } | null {
    try {
      const data = JSON.parse(jsonString);

      if (data.campaign && data.structure) {
        // Full campaign export
        const posts: Partial<SocialPost>[] = [];

        if (data.structure.hub) {
          posts.push(this.parsePost(data.structure.hub));
        }

        if (data.structure.spokes) {
          for (const spoke of data.structure.spokes) {
            posts.push(this.parsePost(spoke));
          }
        }

        return {
          campaign: data.campaign,
          posts,
          metadata: data.metadata
        };
      }

      // Single post export
      if (data.id && data.platform) {
        return {
          posts: [this.parsePost(data)]
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Parse post data
   */
  private parsePost(data: Record<string, unknown>): Partial<SocialPost> {
    return {
      id: data.id as string,
      platform: data.platform as SocialMediaPlatform,
      post_type: (data.type || data.post_type) as SocialPost['post_type'],
      is_hub: data.is_hub as boolean,
      spoke_position: data.spoke_position as number | undefined,
      content_text: (data.content as string) || (data.content as { text: string })?.text,
      content_thread: data.thread as SocialPost['content_thread'],
      hashtags: data.hashtags as string[],
      link_url: data.link as string,
      utm_parameters: data.utm as SocialPost['utm_parameters'],
      posting_instructions: data.instructions as string,
      optimal_posting_time: data.optimal_time as string,
      status: (data.status as SocialPost['status']) || 'draft'
    };
  }
}

// Export singleton instance
export const jsonExporter = new JsonExporter();
