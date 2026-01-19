/**
 * Text Exporter
 *
 * Exports social posts and campaigns as plain text
 * or markdown documents.
 */

import type {
  SocialCampaign,
  SocialPost,
  SocialMediaPlatform
} from '../../../types/social';
import { SOCIAL_PLATFORM_CONFIG } from '../../../types/social';

/**
 * Text export options
 */
export interface TextExportOptions {
  format?: 'plain' | 'markdown';
  include_instructions?: boolean;
  include_image_specs?: boolean;
  include_compliance?: boolean;
  separator?: string;
}

/**
 * Text exporter for social campaigns
 */
export class TextExporter {
  /**
   * Export single post as text
   */
  exportPost(
    post: SocialPost,
    options: TextExportOptions = {}
  ): string {
    const {
      format = 'markdown',
      include_instructions = true,
      include_image_specs = true
    } = options;

    const platformName = SOCIAL_PLATFORM_CONFIG[post.platform]?.name || post.platform;
    const lines: string[] = [];

    // Header
    if (format === 'markdown') {
      lines.push(`# ${platformName} Post`);
      if (post.is_hub) {
        lines.push('**Hub Post**');
      } else if (post.spoke_position) {
        lines.push(`**Spoke Post #${post.spoke_position}**`);
      }
      lines.push('');
    } else {
      lines.push(`=== ${platformName.toUpperCase()} POST ===`);
      if (post.is_hub) lines.push('[HUB]');
      if (post.spoke_position) lines.push(`[SPOKE #${post.spoke_position}]`);
      lines.push('');
    }

    // Content
    if (format === 'markdown') {
      lines.push('## Content');
      lines.push('');
      lines.push('```');
      lines.push(post.content_text);
      lines.push('```');
    } else {
      lines.push('CONTENT:');
      lines.push('---');
      lines.push(post.content_text);
      lines.push('---');
    }
    lines.push('');

    // Thread content for Twitter
    if (post.post_type === 'thread' && post.content_thread) {
      if (format === 'markdown') {
        lines.push('## Thread');
        lines.push('');
        post.content_thread.forEach((segment, i) => {
          lines.push(`**Tweet ${i + 1}/${post.content_thread!.length}:**`);
          lines.push('```');
          lines.push(segment.text);
          lines.push('```');
          lines.push('');
        });
      } else {
        lines.push('THREAD:');
        post.content_thread.forEach((segment, i) => {
          lines.push(`[${i + 1}/${post.content_thread!.length}]`);
          lines.push(segment.text);
          lines.push('');
        });
      }
    }

    // Hashtags
    if (post.hashtags && post.hashtags.length > 0) {
      if (format === 'markdown') {
        lines.push('## Hashtags');
        lines.push('');
        lines.push(post.hashtags.map(h => `#${h}`).join(' '));
      } else {
        lines.push('HASHTAGS:');
        lines.push(post.hashtags.map(h => `#${h}`).join(' '));
      }
      lines.push('');
    }

    // Link
    if (post.link_url) {
      if (format === 'markdown') {
        lines.push('## Link');
        lines.push('');
        lines.push(post.link_url);
      } else {
        lines.push('LINK:');
        lines.push(post.link_url);
      }
      lines.push('');
    }

    // Instructions
    if (include_instructions && post.posting_instructions) {
      if (format === 'markdown') {
        lines.push('## Posting Instructions');
        lines.push('');
        lines.push(post.posting_instructions);
      } else {
        lines.push('INSTRUCTIONS:');
        lines.push(post.posting_instructions);
      }
      lines.push('');
    }

    // Image specs
    if (include_image_specs && post.image_instructions) {
      if (format === 'markdown') {
        lines.push('## Image Requirements');
        lines.push('');
        lines.push(`**Description:** ${post.image_instructions.description}`);
        lines.push(`**Alt Text:** ${post.image_instructions.alt_text}`);
        lines.push(`**Dimensions:** ${post.image_instructions.dimensions.width}x${post.image_instructions.dimensions.height} (${post.image_instructions.dimensions.aspect_ratio})`);
      } else {
        lines.push('IMAGE REQUIREMENTS:');
        lines.push(`Description: ${post.image_instructions.description}`);
        lines.push(`Alt Text: ${post.image_instructions.alt_text}`);
        lines.push(`Dimensions: ${post.image_instructions.dimensions.width}x${post.image_instructions.dimensions.height} (${post.image_instructions.dimensions.aspect_ratio})`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Export full campaign as text document
   */
  exportCampaign(
    campaign: SocialCampaign,
    posts: SocialPost[],
    options: TextExportOptions = {}
  ): string {
    const {
      format = 'markdown',
      include_instructions = true,
      include_image_specs = true,
      include_compliance = false,
      separator = '\n\n---\n\n'
    } = options;

    const lines: string[] = [];

    // Campaign header
    if (format === 'markdown') {
      lines.push(`# Social Media Campaign: ${campaign.campaign_name || 'Untitled'}`);
      lines.push('');
      lines.push(`**Created:** ${new Date(campaign.created_at).toLocaleDateString()}`);
      lines.push(`**Hub Platform:** ${campaign.hub_platform || 'Not set'}`);
      lines.push(`**Status:** ${campaign.status}`);
      if (campaign.overall_compliance_score) {
        lines.push(`**Compliance Score:** ${campaign.overall_compliance_score}%`);
      }
      lines.push('');
      lines.push('---');
      lines.push('');
    } else {
      lines.push(`======================================`);
      lines.push(`SOCIAL MEDIA CAMPAIGN: ${(campaign.campaign_name || 'Untitled').toUpperCase()}`);
      lines.push(`======================================`);
      lines.push('');
      lines.push(`Created: ${new Date(campaign.created_at).toLocaleDateString()}`);
      lines.push(`Hub Platform: ${campaign.hub_platform || 'Not set'}`);
      lines.push(`Status: ${campaign.status}`);
      if (campaign.overall_compliance_score) {
        lines.push(`Compliance Score: ${campaign.overall_compliance_score}%`);
      }
      lines.push('');
    }

    // Table of Contents
    if (format === 'markdown') {
      lines.push('## Table of Contents');
      lines.push('');

      const hubPost = posts.find(p => p.is_hub);
      if (hubPost) {
        const platformName = SOCIAL_PLATFORM_CONFIG[hubPost.platform]?.name || hubPost.platform;
        lines.push(`1. [Hub: ${platformName}](#hub-${hubPost.platform})`);
      }

      const spokePosts = posts.filter(p => !p.is_hub).sort((a, b) =>
        (a.spoke_position || 0) - (b.spoke_position || 0)
      );
      spokePosts.forEach((post, i) => {
        const platformName = SOCIAL_PLATFORM_CONFIG[post.platform]?.name || post.platform;
        lines.push(`${i + 2}. [Spoke ${post.spoke_position}: ${platformName}](#spoke-${post.spoke_position}-${post.platform})`);
      });

      lines.push('');
      lines.push('---');
      lines.push('');
    }

    // Hub post
    const hubPost = posts.find(p => p.is_hub);
    if (hubPost) {
      if (format === 'markdown') {
        lines.push(`<a name="hub-${hubPost.platform}"></a>`);
      }
      lines.push(this.exportPost(hubPost, { ...options, format }));
      lines.push(separator);
    }

    // Spoke posts
    const spokePosts = posts.filter(p => !p.is_hub).sort((a, b) =>
      (a.spoke_position || 0) - (b.spoke_position || 0)
    );

    for (const post of spokePosts) {
      if (format === 'markdown') {
        lines.push(`<a name="spoke-${post.spoke_position}-${post.platform}"></a>`);
      }
      lines.push(this.exportPost(post, { ...options, format }));
      lines.push(separator);
    }

    // UTM Links summary
    if (format === 'markdown') {
      lines.push('## All Links (with UTM)');
      lines.push('');
    } else {
      lines.push('ALL LINKS (WITH UTM):');
    }

    for (const post of posts) {
      if (post.link_url) {
        const label = post.is_hub
          ? `Hub (${post.platform})`
          : `Spoke ${post.spoke_position} (${post.platform})`;

        if (format === 'markdown') {
          lines.push(`- **${label}:** ${post.link_url}`);
        } else {
          lines.push(`${label}: ${post.link_url}`);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Export posts grouped by platform
   */
  exportByPlatform(
    posts: SocialPost[],
    options: TextExportOptions = {}
  ): Map<SocialMediaPlatform, string> {
    const { format = 'markdown' } = options;
    const byPlatform = new Map<SocialMediaPlatform, string>();

    // Group posts
    const grouped = new Map<SocialMediaPlatform, SocialPost[]>();
    for (const post of posts) {
      const existing = grouped.get(post.platform) || [];
      existing.push(post);
      grouped.set(post.platform, existing);
    }

    // Export each platform
    for (const [platform, platformPosts] of grouped) {
      const platformName = SOCIAL_PLATFORM_CONFIG[platform]?.name || platform;
      const lines: string[] = [];

      if (format === 'markdown') {
        lines.push(`# ${platformName} Posts`);
        lines.push('');
      } else {
        lines.push(`=== ${platformName.toUpperCase()} POSTS ===`);
        lines.push('');
      }

      for (const post of platformPosts) {
        lines.push(this.exportPost(post, options));
        lines.push('');
        if (format === 'markdown') {
          lines.push('---');
        } else {
          lines.push('---');
        }
        lines.push('');
      }

      byPlatform.set(platform, lines.join('\n'));
    }

    return byPlatform;
  }

  /**
   * Create a README for export package
   */
  createReadme(
    campaign: SocialCampaign,
    posts: SocialPost[]
  ): string {
    const hubPost = posts.find(p => p.is_hub);
    const spokePosts = posts.filter(p => !p.is_hub);
    const platforms = [...new Set(posts.map(p => p.platform))];

    const lines = [
      `# ${campaign.campaign_name || 'Social Media Campaign'}`,
      '',
      '## Overview',
      '',
      `This campaign was created on ${new Date(campaign.created_at).toLocaleDateString()}.`,
      '',
      '**Campaign Structure:**',
      `- 1 Hub Post (${hubPost?.platform || 'not set'})`,
      `- ${spokePosts.length} Spoke Posts`,
      `- ${platforms.length} Platforms: ${platforms.join(', ')}`,
      '',
      '## Quick Start',
      '',
      '1. Open the platform folder you want to post to',
      '2. Read `instructions.md` for step-by-step posting guide',
      '3. Copy content from `post.txt`',
      '4. Follow image requirements from `image-requirements.md`',
      '5. Post and track engagement!',
      '',
      '## Folder Structure',
      '',
      '```',
      '.',
    ];

    for (const platform of platforms) {
      lines.push(`├── ${platform}/`);
      lines.push(`│   ├── post.txt           # Post content`);
      lines.push(`│   ├── instructions.md    # Posting instructions`);
      lines.push(`│   └── image-requirements.md`);
    }

    lines.push('├── campaign-summary.json   # Full campaign data');
    lines.push('├── links.json              # All UTM-tagged links');
    lines.push('└── README.md               # This file');
    lines.push('```');
    lines.push('');
    lines.push('## UTM Tracking');
    lines.push('');
    lines.push('All links include UTM parameters for tracking:');
    lines.push(`- **Source:** ${campaign.utm_source || 'platform name'}`);
    lines.push(`- **Medium:** ${campaign.utm_medium || 'organic-social'}`);
    lines.push(`- **Campaign:** ${campaign.utm_campaign || campaign.campaign_name}`);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('*Generated by Holistic SEO Social Media Publisher*');

    return lines.join('\n');
  }

  /**
   * Download text as file (browser)
   */
  downloadAsFile(
    content: string,
    filename: string,
    mimeType: string = 'text/plain'
  ): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// Export singleton instance
export const textExporter = new TextExporter();
