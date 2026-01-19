/**
 * Clipboard Exporter
 *
 * Copies social post content to clipboard in ready-to-paste format.
 */

import type {
  SocialPost,
  SocialMediaPlatform,
  SinglePostExport
} from '../../../types/social';
import { instructionGenerator } from '../transformation/instructionGenerator';
import { utmGenerator } from '../transformation/utmGenerator';

/**
 * Clipboard export result
 */
export interface ClipboardExportResult {
  success: boolean;
  content: string;
  format: 'text' | 'markdown';
  error?: string;
}

/**
 * Clipboard exporter for social posts
 */
export class ClipboardExporter {
  /**
   * Export single post content for clipboard
   */
  formatForClipboard(
    post: SocialPost,
    options: {
      include_hashtags?: boolean;
      include_link?: boolean;
      format?: 'text' | 'markdown';
    } = {}
  ): string {
    const {
      include_hashtags = true,
      include_link = true,
      format = 'text'
    } = options;

    let content = '';

    // Handle thread format for Twitter
    if (post.post_type === 'thread' && post.content_thread) {
      content = this.formatThread(post.content_thread, format);
    } else {
      content = post.content_text;
    }

    // Add hashtags if not already in content
    if (include_hashtags && post.hashtags && post.hashtags.length > 0) {
      const hashtagText = post.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ');
      if (!content.includes(hashtagText)) {
        content += `\n\n${hashtagText}`;
      }
    }

    // Ensure link is present if requested
    if (include_link && post.link_url && !content.includes(post.link_url)) {
      content += `\n\n${post.link_url}`;
    }

    return content;
  }

  /**
   * Format thread for clipboard
   */
  private formatThread(
    thread: Array<{ index: number; text: string }>,
    format: 'text' | 'markdown'
  ): string {
    if (format === 'markdown') {
      return thread
        .map((t, i) => `**Tweet ${i + 1}/${thread.length}:**\n${t.text}`)
        .join('\n\n---\n\n');
    }

    return thread
      .map((t, i) => `[${i + 1}/${thread.length}]\n${t.text}`)
      .join('\n\n');
  }

  /**
   * Export post with full instructions
   */
  formatWithInstructions(
    post: SocialPost,
    linkUrl: string
  ): SinglePostExport {
    // Build UTM link if not already present
    const linkWithUTM = post.utm_parameters
      ? utmGenerator.buildUrlWithUTM(linkUrl, post.utm_parameters)
      : linkUrl;

    // Generate instructions
    const instructions = instructionGenerator.generateForPost(post, linkWithUTM);

    return {
      post,
      instructions: instructions.full_instructions,
      image_requirements: instructions.image_requirements,
      link_with_utm: linkWithUTM
    };
  }

  /**
   * Format post for specific platform clipboard copy
   */
  formatForPlatform(
    post: SocialPost,
    platform: SocialMediaPlatform
  ): string {
    switch (platform) {
      case 'linkedin':
        return this.formatForLinkedIn(post);
      case 'twitter':
        return this.formatForTwitter(post);
      case 'facebook':
        return this.formatForFacebook(post);
      case 'instagram':
        return this.formatForInstagram(post);
      case 'pinterest':
        return this.formatForPinterest(post);
      default:
        return this.formatForClipboard(post);
    }
  }

  /**
   * Format for LinkedIn
   */
  private formatForLinkedIn(post: SocialPost): string {
    let content = post.content_text;

    // LinkedIn prefers hashtags at the end
    if (post.hashtags && post.hashtags.length > 0) {
      const hashtagText = post.hashtags.slice(0, 5).map(h => `#${h}`).join(' ');
      if (!content.endsWith(hashtagText)) {
        content = content.replace(/\n\n#[\w\s#]+$/, '');  // Remove existing hashtags
        content += `\n\n${hashtagText}`;
      }
    }

    return content;
  }

  /**
   * Format for Twitter
   */
  private formatForTwitter(post: SocialPost): string {
    if (post.post_type === 'thread' && post.content_thread) {
      // For threads, format each tweet separately
      return this.formatThread(post.content_thread, 'text');
    }

    // For single tweets, ensure under 280 chars
    let content = post.content_text;

    // Hashtags integrated in Twitter, not at end
    if (post.hashtags && post.hashtags.length > 0 && post.hashtags.length <= 2) {
      // Already should be in content for Twitter
    }

    return content.length > 280 ? content.substring(0, 277) + '...' : content;
  }

  /**
   * Format for Facebook
   */
  private formatForFacebook(post: SocialPost): string {
    // Facebook is similar to base format
    return this.formatForClipboard(post);
  }

  /**
   * Format for Instagram
   */
  private formatForInstagram(post: SocialPost): string {
    let content = post.content_text;

    // Instagram hashtags can be in first comment, so separate them
    // Format with visible spacing before hashtags
    if (post.hashtags && post.hashtags.length > 0) {
      const hashtagText = post.hashtags.map(h => `#${h}`).join(' ');

      // Check if hashtags are at the end with spacing
      if (!content.includes('.\n.\n.')) {
        content = content.replace(/\n\n#[\w\s#]+$/, '');  // Remove existing
        content += '\n\n.\n.\n.\n\n' + hashtagText;
      }
    }

    return content;
  }

  /**
   * Format for Pinterest
   */
  private formatForPinterest(post: SocialPost): string {
    // Pinterest uses title + description format
    const lines = post.content_text.split('\n\n');
    const title = lines[0] || '';
    const description = lines.slice(1).join('\n\n');

    return `TITLE:\n${title}\n\nDESCRIPTION:\n${description}`;
  }

  /**
   * Copy to clipboard (browser API)
   * Note: This must be called from user-initiated event
   */
  async copyToClipboard(content: string): Promise<boolean> {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(content);
        return true;
      }

      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = content;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();

      try {
        document.execCommand('copy');
        return true;
      } finally {
        document.body.removeChild(textArea);
      }
    } catch (error) {
      console.error('[ClipboardExporter] Copy failed:', error);
      return false;
    }
  }

  /**
   * Get clipboard-ready content with preview
   */
  getClipboardPreview(
    post: SocialPost,
    maxLength: number = 100
  ): { content: string; preview: string; charCount: number } {
    const content = this.formatForClipboard(post);
    const preview = content.length > maxLength
      ? content.substring(0, maxLength) + '...'
      : content;

    return {
      content,
      preview,
      charCount: content.length
    };
  }
}

// Export singleton instance
export const clipboardExporter = new ClipboardExporter();
