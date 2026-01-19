/**
 * Instruction Generator Service
 *
 * Generates platform-specific posting instructions
 * for manual publishing workflow.
 */

import type {
  SocialMediaPlatform,
  SocialPost,
  PlatformPostingGuide,
  ImageInstructions
} from '../../../types/social';

/**
 * Instruction generation result
 */
export interface InstructionResult {
  full_instructions: string;
  quick_steps: string[];
  image_requirements: string;
  best_practices: string;
  optimal_time: string;
}

/**
 * Default platform guides (used when database guides unavailable)
 */
const DEFAULT_GUIDES: Record<SocialMediaPlatform, Partial<PlatformPostingGuide>> = {
  linkedin: {
    posting_instructions: `## LinkedIn Posting Instructions

### Steps to Post
1. Go to linkedin.com and click "Start a post"
2. Paste the content
3. Click the image icon and upload your image
4. Review that hashtags are at the end of the post
5. Click "Post"

### Image Requirements
- Landscape: 1200x627 pixels
- Square: 1080x1080 pixels
- Format: JPG or PNG, max 5MB`,
    best_practices: `- Posts under 300 characters get 12% higher engagement
- Engage with comments within the first hour
- Use line breaks for readability
- Tag relevant people and companies`,
    optimal_times: { days: ['Tuesday', 'Wednesday', 'Thursday'], hours: ['10am-12pm', '2pm-4pm'] }
  },
  twitter: {
    posting_instructions: `## X/Twitter Posting Instructions

### Steps to Post
1. Go to x.com and click the compose button
2. Paste the content
3. For threads: click the "+" to add more tweets
4. Attach image if applicable
5. Click "Post" or "Post all" for threads

### Image Requirements
- Card image: 1200x628 pixels
- Format: JPG, PNG, or GIF, max 5MB`,
    best_practices: `- Threads get 3x more engagement than single tweets
- First tweet should hook attention in first 5 words
- Post during peak hours for your audience
- Engage with replies quickly`,
    optimal_times: { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], hours: ['8am-10am', '12pm-1pm'] }
  },
  facebook: {
    posting_instructions: `## Facebook Posting Instructions

### Steps to Post
1. Go to your Facebook Page
2. Click "Create post"
3. Paste the content
4. Add your image or let the link preview generate
5. Click "Post"

### Image Requirements
- Link preview: 1200x628 pixels
- Format: JPG or PNG, max 4MB`,
    best_practices: `- Posts with images get 2.3x more engagement
- Keep text under 80 characters for best engagement
- Respond to comments to boost reach
- Use Facebook native video when possible`,
    optimal_times: { days: ['Wednesday', 'Thursday', 'Friday'], hours: ['1pm-4pm'] }
  },
  instagram: {
    posting_instructions: `## Instagram Posting Instructions

### Steps to Post
1. Open Instagram app (mobile recommended)
2. Tap the + icon to create a post
3. Select your image(s) for single or carousel
4. Add your caption
5. Add hashtags at the end or in first comment
6. Tap "Share"

### Image Requirements
- Portrait (recommended): 1080x1350 pixels (4:5)
- Square: 1080x1080 pixels
- Format: JPG or PNG, max 8MB`,
    best_practices: `- First 125 characters appear before "more"
- Use 3-5 relevant hashtags for best reach
- Post carousels for higher engagement
- Stories disappear after 24 hours`,
    optimal_times: { days: ['Monday', 'Wednesday', 'Friday'], hours: ['11am-1pm', '7pm-9pm'] }
  },
  pinterest: {
    posting_instructions: `## Pinterest Pin Instructions

### Steps to Create a Pin
1. Go to pinterest.com and click "+"
2. Select "Create Pin"
3. Upload your vertical image
4. Add a keyword-rich title (max 100 chars)
5. Write a description with relevant keywords
6. Add destination link
7. Select relevant board
8. Click "Publish"

### Image Requirements
- Vertical 2:3 ratio: 1000x1500 pixels
- Format: JPG or PNG, max 32MB`,
    best_practices: `- Pinterest is a search engine - use keywords, not hashtags
- Vertical images perform best (2:3 ratio)
- Include clear, readable text on images
- Pin consistently over time`,
    optimal_times: { days: ['Saturday', 'Sunday'], hours: ['8pm-11pm'] }
  }
};

/**
 * Generates posting instructions for social media posts
 */
export class InstructionGenerator {
  private guides: Map<SocialMediaPlatform, PlatformPostingGuide> = new Map();

  /**
   * Load platform guides from database
   */
  loadGuides(guides: PlatformPostingGuide[]): void {
    this.guides.clear();
    for (const guide of guides) {
      this.guides.set(guide.platform, guide);
    }
  }

  /**
   * Generate complete instructions for a post
   */
  generateForPost(post: SocialPost, linkWithUTM: string): InstructionResult {
    const guide = this.guides.get(post.platform) || DEFAULT_GUIDES[post.platform];

    const quickSteps = this.generateQuickSteps(post);
    const imageRequirements = this.generateImageRequirements(post);
    const bestPractices = guide.best_practices || '';
    const optimalTime = this.formatOptimalTime(guide.optimal_times);

    const fullInstructions = this.buildFullInstructions(
      post,
      guide,
      quickSteps,
      imageRequirements,
      linkWithUTM
    );

    return {
      full_instructions: fullInstructions,
      quick_steps: quickSteps,
      image_requirements: imageRequirements,
      best_practices: bestPractices,
      optimal_time: optimalTime
    };
  }

  /**
   * Generate quick step list for a platform
   */
  private generateQuickSteps(post: SocialPost): string[] {
    switch (post.platform) {
      case 'linkedin':
        return [
          'Go to linkedin.com → "Start a post"',
          'Paste content',
          'Add image (1200x627 or 1080x1080)',
          'Verify hashtags at end',
          'Click "Post"'
        ];

      case 'twitter':
        if (post.post_type === 'thread' && post.content_thread) {
          return [
            'Go to x.com → compose',
            `Paste Tweet 1, click "+" for thread (${post.content_thread.length} tweets)`,
            'Paste each subsequent tweet',
            'Add image to first tweet if available',
            'Click "Post all"'
          ];
        }
        return [
          'Go to x.com → compose',
          'Paste content',
          'Add image (1200x628)',
          'Click "Post"'
        ];

      case 'facebook':
        return [
          'Go to Facebook Page → "Create post"',
          'Paste content',
          'Add image or wait for link preview',
          'Click "Post"'
        ];

      case 'instagram':
        if (post.post_type === 'carousel') {
          return [
            'Open Instagram app',
            'Tap + → select multiple images',
            'Apply filters if desired',
            'Paste caption with hashtags',
            'Tap "Share"'
          ];
        }
        return [
          'Open Instagram app',
          'Tap + → select image',
          'Apply filters if desired',
          'Paste caption with hashtags',
          'Tap "Share"'
        ];

      case 'pinterest':
        return [
          'Go to pinterest.com → "+"',
          'Select "Create Pin"',
          'Upload vertical image (1000x1500)',
          'Add keyword-rich title & description',
          'Add destination link',
          'Select board → "Publish"'
        ];

      default:
        return ['Paste content', 'Add image', 'Publish'];
    }
  }

  /**
   * Generate image requirements text
   */
  private generateImageRequirements(post: SocialPost): string {
    const specs = this.getImageSpecs(post.platform);

    if (post.image_instructions) {
      return this.formatImageInstructionsWithSpecs(post.image_instructions, specs);
    }

    return specs;
  }

  /**
   * Get image specifications for a platform
   */
  private getImageSpecs(platform: SocialMediaPlatform): string {
    switch (platform) {
      case 'linkedin':
        return `**Recommended Image Sizes:**
- Landscape: 1200 x 627 pixels
- Square: 1080 x 1080 pixels
- Format: JPG or PNG
- Max file size: 5MB`;

      case 'twitter':
        return `**Recommended Image Sizes:**
- Card/Preview: 1200 x 628 pixels
- In-stream: 1200 x 675 pixels
- Format: JPG, PNG, or GIF
- Max file size: 5MB (images), 15MB (GIF)`;

      case 'facebook':
        return `**Recommended Image Sizes:**
- Link preview: 1200 x 628 pixels
- Post image: 1200 x 630 pixels
- Format: JPG or PNG
- Max file size: 4MB`;

      case 'instagram':
        return `**Recommended Image Sizes:**
- Portrait (best): 1080 x 1350 pixels (4:5)
- Square: 1080 x 1080 pixels
- Landscape: 1080 x 608 pixels
- Stories: 1080 x 1920 pixels
- Format: JPG or PNG
- Max file size: 8MB`;

      case 'pinterest':
        return `**Recommended Image Sizes:**
- Standard Pin: 1000 x 1500 pixels (2:3 ratio)
- Square Pin: 1000 x 1000 pixels
- Format: JPG or PNG
- Max file size: 32MB`;

      default:
        return 'Check platform guidelines for image specifications.';
    }
  }

  /**
   * Format image instructions with platform specs
   */
  private formatImageInstructionsWithSpecs(
    instructions: ImageInstructions,
    specs: string
  ): string {
    return `**Suggested Image:**
${instructions.description}

**Alt Text:**
${instructions.alt_text}

**Dimensions:**
${instructions.dimensions.width} x ${instructions.dimensions.height} pixels (${instructions.dimensions.aspect_ratio})

---

${specs}`;
  }

  /**
   * Format optimal posting time
   */
  private formatOptimalTime(times?: { days: string[]; hours: string[] }): string {
    if (!times || !times.days || !times.hours) {
      return 'Check your analytics for best posting times';
    }

    const days = times.days.join(', ');
    const hours = times.hours.join(' or ');

    return `Best times: ${days} at ${hours}`;
  }

  /**
   * Build full instructions document
   */
  private buildFullInstructions(
    post: SocialPost,
    guide: Partial<PlatformPostingGuide>,
    quickSteps: string[],
    imageRequirements: string,
    linkWithUTM: string
  ): string {
    const platformName = this.getPlatformDisplayName(post.platform);

    let instructions = `# ${platformName} Posting Instructions

## Content
\`\`\`
${post.content_text}
\`\`\`
`;

    // Add thread content for Twitter
    if (post.post_type === 'thread' && post.content_thread) {
      instructions += `\n## Thread Content\n`;
      for (const segment of post.content_thread) {
        instructions += `\n**Tweet ${segment.index + 1}:**\n\`\`\`\n${segment.text}\n\`\`\`\n`;
      }
    }

    // Add hashtags if present
    if (post.hashtags && post.hashtags.length > 0) {
      instructions += `\n## Hashtags\n${post.hashtags.map(t => `#${t}`).join(' ')}\n`;
    }

    // Quick steps
    instructions += `\n## Quick Steps\n`;
    quickSteps.forEach((step, i) => {
      instructions += `${i + 1}. ${step}\n`;
    });

    // Image requirements
    instructions += `\n## Image Requirements\n${imageRequirements}\n`;

    // Best practices
    if (guide.best_practices) {
      instructions += `\n## Best Practices\n${guide.best_practices}\n`;
    }

    // Optimal time
    instructions += `\n## Optimal Posting Time\n${this.formatOptimalTime(guide.optimal_times as { days: string[]; hours: string[] })}\n`;

    // Link
    instructions += `\n## Link (with UTM tracking)\n${linkWithUTM}\n`;

    return instructions;
  }

  /**
   * Get display name for platform
   */
  private getPlatformDisplayName(platform: SocialMediaPlatform): string {
    const names: Record<SocialMediaPlatform, string> = {
      linkedin: 'LinkedIn',
      twitter: 'X (Twitter)',
      facebook: 'Facebook',
      instagram: 'Instagram',
      pinterest: 'Pinterest'
    };
    return names[platform];
  }

  /**
   * Generate instructions summary for multiple posts
   */
  generateCampaignSummary(posts: SocialPost[]): string {
    const byPlatform = new Map<SocialMediaPlatform, SocialPost[]>();

    for (const post of posts) {
      const existing = byPlatform.get(post.platform) || [];
      existing.push(post);
      byPlatform.set(post.platform, existing);
    }

    let summary = '# Campaign Posting Summary\n\n';

    for (const [platform, platformPosts] of byPlatform) {
      const name = this.getPlatformDisplayName(platform);
      summary += `## ${name} (${platformPosts.length} post${platformPosts.length > 1 ? 's' : ''})\n`;

      for (const post of platformPosts) {
        const label = post.is_hub ? '**HUB POST**' : `Spoke ${post.spoke_position || ''}`;
        const preview = post.content_text.substring(0, 100).replace(/\n/g, ' ');
        summary += `- ${label}: "${preview}..."\n`;
      }

      summary += '\n';
    }

    return summary;
  }
}

// Export singleton instance
export const instructionGenerator = new InstructionGenerator();
