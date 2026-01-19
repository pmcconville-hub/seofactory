/**
 * Package Exporter
 *
 * Creates ZIP packages containing all campaign files
 * organized by platform.
 */

import type {
  SocialCampaign,
  SocialPost,
  SocialMediaPlatform,
  BulkExportPackage,
  PlatformExportFolder
} from '../../../types/social';
import { SOCIAL_PLATFORM_CONFIG } from '../../../types/social';
import { textExporter } from './textExporter';
import { jsonExporter } from './jsonExporter';
import { instructionGenerator } from '../transformation/instructionGenerator';

/**
 * Package export result
 */
export interface PackageExportResult {
  success: boolean;
  files: Map<string, string>;
  totalSize: number;
  error?: string;
}

/**
 * File entry for ZIP
 */
interface PackageFile {
  path: string;
  content: string;
}

/**
 * Package exporter for complete campaign bundles
 */
export class PackageExporter {
  /**
   * Create export package structure
   */
  createPackage(
    campaign: SocialCampaign,
    posts: SocialPost[]
  ): BulkExportPackage {
    // Create README
    const readme = textExporter.createReadme(campaign, posts);

    // Create campaign summary JSON
    const campaignSummary = JSON.parse(jsonExporter.exportCampaign(campaign, posts, {
      include_instructions: true,
      include_compliance: true,
      include_metadata: true,
      pretty_print: true
    }));

    // Group posts by platform
    const byPlatform = this.groupByPlatform(posts);

    // Create platform folders
    const platforms: BulkExportPackage['platforms'] = {};

    for (const [platform, platformPosts] of Object.entries(byPlatform)) {
      if (platformPosts.length === 0) continue;
      platforms[platform as SocialMediaPlatform] = this.createPlatformFolder(
        platform as SocialMediaPlatform,
        platformPosts
      );
    }

    // Create links file
    const links: Record<string, string> = {};
    for (const post of posts) {
      if (post.link_url) {
        const key = post.is_hub
          ? `hub_${post.platform}`
          : `spoke_${post.spoke_position}_${post.platform}`;
        links[key] = post.link_url;
      }
    }

    return {
      readme,
      campaign_summary: campaignSummary,
      platforms,
      assets: { links }
    };
  }

  /**
   * Generate all files for the package
   */
  generateFiles(
    campaign: SocialCampaign,
    posts: SocialPost[]
  ): PackageFile[] {
    const files: PackageFile[] = [];
    const slug = this.generateSlug(campaign.campaign_name || `campaign-${campaign.id.slice(0, 8)}`);
    const basePath = `social-campaign-${slug}`;

    // README
    files.push({
      path: `${basePath}/README.md`,
      content: textExporter.createReadme(campaign, posts)
    });

    // Campaign summary JSON
    files.push({
      path: `${basePath}/campaign-summary.json`,
      content: jsonExporter.exportCampaign(campaign, posts, {
        include_instructions: true,
        include_compliance: true,
        include_metadata: true,
        pretty_print: true
      })
    });

    // Group posts by platform
    const byPlatform = this.groupByPlatform(posts);

    // Platform folders
    for (const [platform, platformPosts] of Object.entries(byPlatform)) {
      if (platformPosts.length === 0) continue;

      const platformFolder = `${basePath}/${platform}`;
      const folderContent = this.createPlatformFolder(
        platform as SocialMediaPlatform,
        platformPosts
      );

      // Post content
      files.push({
        path: `${platformFolder}/post.txt`,
        content: folderContent.post_content
      });

      // Instructions
      files.push({
        path: `${platformFolder}/instructions.md`,
        content: folderContent.instructions
      });

      // Image requirements
      files.push({
        path: `${platformFolder}/image-requirements.md`,
        content: folderContent.image_requirements
      });

      // Thread content for Twitter
      if (folderContent.thread_content) {
        files.push({
          path: `${platformFolder}/thread.txt`,
          content: folderContent.thread_content
        });
      }

      // Carousel slides for Instagram
      if (folderContent.carousel_slides) {
        files.push({
          path: `${platformFolder}/carousel-slides.json`,
          content: JSON.stringify(folderContent.carousel_slides, null, 2)
        });
      }
    }

    // Links JSON
    const links: Record<string, string> = {};
    for (const post of posts) {
      if (post.link_url) {
        const key = post.is_hub
          ? `hub_${post.platform}`
          : `spoke_${post.spoke_position}_${post.platform}`;
        links[key] = post.link_url;
      }
    }

    files.push({
      path: `${basePath}/assets/links.json`,
      content: JSON.stringify(links, null, 2)
    });

    return files;
  }

  /**
   * Create platform folder content
   */
  private createPlatformFolder(
    platform: SocialMediaPlatform,
    posts: SocialPost[]
  ): PlatformExportFolder {
    const platformName = SOCIAL_PLATFORM_CONFIG[platform]?.name || platform;

    // Combine all post content
    const postContentLines: string[] = [];
    let threadContent: string | undefined;
    let carouselSlides: object | undefined;

    for (const post of posts) {
      const label = post.is_hub ? 'HUB POST' : `SPOKE ${post.spoke_position}`;
      postContentLines.push(`=== ${label} ===`);
      postContentLines.push('');
      postContentLines.push(post.content_text);
      postContentLines.push('');

      if (post.hashtags && post.hashtags.length > 0) {
        postContentLines.push(`Hashtags: ${post.hashtags.map(h => `#${h}`).join(' ')}`);
        postContentLines.push('');
      }

      if (post.link_url) {
        postContentLines.push(`Link: ${post.link_url}`);
        postContentLines.push('');
      }

      postContentLines.push('---');
      postContentLines.push('');

      // Thread content for Twitter
      if (post.post_type === 'thread' && post.content_thread) {
        const threadLines: string[] = [];
        threadLines.push(`Thread for ${label}:`);
        threadLines.push('');
        post.content_thread.forEach((segment, i) => {
          threadLines.push(`[Tweet ${i + 1}/${post.content_thread!.length}]`);
          threadLines.push(segment.text);
          threadLines.push('');
        });
        threadContent = threadLines.join('\n');
      }

      // Carousel slides for Instagram
      if (post.post_type === 'carousel' && post.image_instructions) {
        // Would need carousel slide data from Instagram adapter
        carouselSlides = {
          post_id: post.id,
          slide_count: 10,  // Placeholder
          description: post.image_instructions.description
        };
      }
    }

    // Generate instructions
    const instructionsLines: string[] = [
      `# ${platformName} Posting Instructions`,
      '',
      '## Quick Steps',
      ''
    ];

    // Get instructions from first post
    const firstPost = posts[0];
    if (firstPost) {
      const instructions = instructionGenerator.generateForPost(
        firstPost,
        firstPost.link_url || ''
      );

      instructions.quick_steps.forEach((step, i) => {
        instructionsLines.push(`${i + 1}. ${step}`);
      });

      instructionsLines.push('');
      instructionsLines.push('## Best Practices');
      instructionsLines.push('');
      instructionsLines.push(instructions.best_practices);
      instructionsLines.push('');
      instructionsLines.push('## Optimal Posting Time');
      instructionsLines.push('');
      instructionsLines.push(instructions.optimal_time);
    }

    // Generate image requirements
    const imageLines: string[] = [
      `# ${platformName} Image Requirements`,
      ''
    ];

    for (const post of posts) {
      if (post.image_instructions) {
        const label = post.is_hub ? 'Hub Post' : `Spoke ${post.spoke_position}`;
        imageLines.push(`## ${label}`);
        imageLines.push('');
        imageLines.push(`**Description:** ${post.image_instructions.description}`);
        imageLines.push('');
        imageLines.push(`**Alt Text:** ${post.image_instructions.alt_text}`);
        imageLines.push('');
        imageLines.push(`**Dimensions:** ${post.image_instructions.dimensions.width}x${post.image_instructions.dimensions.height} (${post.image_instructions.dimensions.aspect_ratio})`);
        imageLines.push('');
        imageLines.push('---');
        imageLines.push('');
      }
    }

    // Add platform-specific specs
    imageLines.push('## Platform Specifications');
    imageLines.push('');
    imageLines.push(this.getPlatformImageSpecs(platform));

    return {
      post_content: postContentLines.join('\n'),
      instructions: instructionsLines.join('\n'),
      image_requirements: imageLines.join('\n'),
      thread_content: threadContent,
      carousel_slides: carouselSlides
    };
  }

  /**
   * Get platform image specifications
   */
  private getPlatformImageSpecs(platform: SocialMediaPlatform): string {
    const specs: Record<SocialMediaPlatform, string> = {
      linkedin: `**LinkedIn Image Specs:**
- Landscape: 1200 x 627 pixels
- Square: 1080 x 1080 pixels
- Format: JPG or PNG
- Max size: 5MB`,

      twitter: `**X/Twitter Image Specs:**
- Card: 1200 x 628 pixels
- In-stream: 1200 x 675 pixels
- Format: JPG, PNG, or GIF
- Max size: 5MB (images), 15MB (GIF)`,

      facebook: `**Facebook Image Specs:**
- Link preview: 1200 x 628 pixels
- Post image: 1200 x 630 pixels
- Format: JPG or PNG
- Max size: 4MB`,

      instagram: `**Instagram Image Specs:**
- Portrait (best): 1080 x 1350 pixels (4:5)
- Square: 1080 x 1080 pixels
- Stories: 1080 x 1920 pixels
- Format: JPG or PNG
- Max size: 8MB`,

      pinterest: `**Pinterest Image Specs:**
- Standard Pin: 1000 x 1500 pixels (2:3)
- Square Pin: 1000 x 1000 pixels
- Format: JPG or PNG
- Max size: 32MB`
    };

    return specs[platform] || 'Check platform guidelines for image specifications.';
  }

  /**
   * Group posts by platform
   */
  private groupByPlatform(posts: SocialPost[]): Record<SocialMediaPlatform, SocialPost[]> {
    const grouped: Record<SocialMediaPlatform, SocialPost[]> = {
      linkedin: [],
      twitter: [],
      facebook: [],
      instagram: [],
      pinterest: []
    };

    for (const post of posts) {
      grouped[post.platform].push(post);
    }

    return grouped;
  }

  /**
   * Generate URL-safe slug
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);
  }

  /**
   * Calculate total package size
   */
  calculatePackageSize(files: PackageFile[]): number {
    return files.reduce((total, file) => total + file.content.length, 0);
  }

  /**
   * Create downloadable ZIP (requires external ZIP library)
   * This method provides the structure; actual ZIP creation
   * should use JSZip or similar in the frontend
   */
  getZipStructure(
    campaign: SocialCampaign,
    posts: SocialPost[]
  ): { files: PackageFile[]; totalSize: number } {
    const files = this.generateFiles(campaign, posts);
    const totalSize = this.calculatePackageSize(files);

    return { files, totalSize };
  }
}

// Export singleton instance
export const packageExporter = new PackageExporter();
