/**
 * WordPress Proxy Client
 *
 * Routes all WordPress API calls through a Supabase Edge Function
 * to avoid CORS issues. This client should be used instead of
 * direct WordPress API calls from the browser.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  WpPost,
  WpCategory,
  WpTag,
  WpMedia,
  CreatePostRequest,
  UpdatePostRequest,
  PluginVerificationResponse
} from '../../types/wordpress';

// ============================================================================
// Types
// ============================================================================

interface ProxyRequest {
  connection_id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  body?: Record<string, unknown>;
  params?: Record<string, string>;
}

interface ProxyResponse<T> {
  success: boolean;
  status: number;
  data: T;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

// ============================================================================
// Proxy Client Class
// ============================================================================

export class WordPressProxyClient {
  private supabase: SupabaseClient;
  private connectionId: string;

  constructor(supabase: SupabaseClient, connectionId: string) {
    this.supabase = supabase;
    this.connectionId = connectionId;
  }

  /**
   * Make a proxied request to WordPress
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: Record<string, unknown>,
    params?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    try {
      console.log(`[WP Proxy Client] ${method} ${endpoint}`);

      const requestBody: ProxyRequest = {
        connection_id: this.connectionId,
        method,
        endpoint,
        body,
        params
      };

      const { data, error } = await this.supabase.functions.invoke('wordpress-proxy', {
        body: requestBody
      });

      if (error) {
        console.error('[WP Proxy Client] Function error:', error);
        return {
          success: false,
          error: error.message || 'Proxy request failed'
        };
      }

      const response = data as ProxyResponse<T>;

      if (!response.success) {
        const errorData = response.data as { message?: string; code?: string } | undefined;
        return {
          success: false,
          error: errorData?.message || errorData?.code || `WordPress returned status ${response.status}`,
          statusCode: response.status
        };
      }

      return {
        success: true,
        data: response.data,
        statusCode: response.status
      };
    } catch (error) {
      console.error('[WP Proxy Client] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ============================================================================
  // Posts
  // ============================================================================

  async getPost(postId: number, postType: 'post' | 'page' = 'post'): Promise<ApiResponse<WpPost>> {
    const endpoint = postType === 'page' ? 'pages' : 'posts';
    return this.request<WpPost>('GET', `/wp-json/wp/v2/${endpoint}/${postId}`);
  }

  async createPost(data: CreatePostRequest, postType: 'post' | 'page' = 'post'): Promise<ApiResponse<WpPost>> {
    const endpoint = postType === 'page' ? 'pages' : 'posts';
    return this.request<WpPost>('POST', `/wp-json/wp/v2/${endpoint}`, data as unknown as Record<string, unknown>);
  }

  async updatePost(postId: number, data: UpdatePostRequest, postType: 'post' | 'page' = 'post'): Promise<ApiResponse<WpPost>> {
    const endpoint = postType === 'page' ? 'pages' : 'posts';
    return this.request<WpPost>('PUT', `/wp-json/wp/v2/${endpoint}/${postId}`, data as unknown as Record<string, unknown>);
  }

  async deletePost(postId: number, force: boolean = false, postType: 'post' | 'page' = 'post'): Promise<ApiResponse<WpPost>> {
    const endpointType = postType === 'page' ? 'pages' : 'posts';
    const endpoint = `/wp-json/wp/v2/${endpointType}/${postId}${force ? '?force=true' : ''}`;
    return this.request<WpPost>('DELETE', endpoint);
  }

  // ============================================================================
  // Categories
  // ============================================================================

  async getCategories(): Promise<ApiResponse<WpCategory[]>> {
    return this.request<WpCategory[]>('GET', '/wp-json/wp/v2/categories', undefined, { per_page: '100' });
  }

  async createCategory(name: string, parent?: number): Promise<ApiResponse<WpCategory>> {
    return this.request<WpCategory>('POST', '/wp-json/wp/v2/categories', {
      name,
      parent: parent || 0
    });
  }

  // ============================================================================
  // Tags
  // ============================================================================

  async getTags(): Promise<ApiResponse<WpTag[]>> {
    return this.request<WpTag[]>('GET', '/wp-json/wp/v2/tags', undefined, { per_page: '100' });
  }

  async createTag(name: string): Promise<ApiResponse<WpTag>> {
    return this.request<WpTag>('POST', '/wp-json/wp/v2/tags', { name });
  }

  async getOrCreateTag(name: string): Promise<ApiResponse<WpTag>> {
    // First try to find existing tag
    const tagsResult = await this.request<WpTag[]>('GET', '/wp-json/wp/v2/tags', undefined, {
      search: name,
      per_page: '10'
    });

    if (tagsResult.success && tagsResult.data) {
      const exactMatch = tagsResult.data.find(
        t => t.name.toLowerCase() === name.toLowerCase()
      );
      if (exactMatch) {
        return { success: true, data: exactMatch };
      }
    }

    // Create new tag
    return this.createTag(name);
  }

  // ============================================================================
  // Media
  // ============================================================================

  async getMedia(mediaId: number): Promise<ApiResponse<WpMedia>> {
    return this.request<WpMedia>('GET', `/wp-json/wp/v2/media/${mediaId}`);
  }

  // Note: Media upload needs special handling - binary data through proxy
  // For now, media upload would need a separate endpoint or direct upload

  // ============================================================================
  // Plugin Verification & Analytics
  // ============================================================================

  async verifyPlugin(): Promise<ApiResponse<PluginVerificationResponse>> {
    return this.request<PluginVerificationResponse>('GET', '/wp-json/cutthecrap/v1/verify');
  }

  /**
   * Get post analytics from plugin
   */
  async getPostAnalytics(postId: number, dateRange?: {
    start: string;
    end: string;
  }): Promise<ApiResponse<{
    views: number;
    visitors: number;
    comments: number;
    gsc_data?: {
      impressions: number;
      clicks: number;
      ctr: number;
      position: number;
      queries: Array<{
        query: string;
        impressions: number;
        clicks: number;
      }>;
    };
  }>> {
    const params = dateRange
      ? { start: dateRange.start, end: dateRange.end }
      : undefined;
    return this.request('GET', `/wp-json/cutthecrap/v1/post/${postId}/analytics`, undefined, params);
  }

  // ============================================================================
  // Connection Test
  // ============================================================================

  async testConnection(): Promise<{ success: boolean; message: string; siteInfo?: { name: string; url: string; description: string } }> {
    try {
      // Try to get site info (public endpoint, doesn't need auth)
      const result = await this.request<{ name: string; url: string; description: string }>('GET', '/wp-json');

      if (result.success && result.data) {
        return {
          success: true,
          message: 'Connection successful',
          siteInfo: {
            name: (result.data as Record<string, unknown>).name as string || 'Unknown',
            url: (result.data as Record<string, unknown>).url as string || '',
            description: (result.data as Record<string, unknown>).description as string || ''
          }
        };
      }

      // Try a simpler endpoint
      const postsResult = await this.request<WpPost[]>('GET', '/wp-json/wp/v2/posts', undefined, { per_page: '1' });

      if (postsResult.success) {
        return {
          success: true,
          message: 'Connection successful (authenticated)'
        };
      }

      return {
        success: false,
        message: result.error || postsResult.error || 'Failed to connect to WordPress'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a WordPress proxy client for a given connection
 */
export function createWordPressProxyClient(
  supabase: SupabaseClient,
  connectionId: string
): WordPressProxyClient {
  return new WordPressProxyClient(supabase, connectionId);
}
