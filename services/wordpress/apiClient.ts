/**
 * WordPress API Client
 *
 * Handles all communication with WordPress REST API including:
 * - Basic auth with Application Passwords
 * - HMAC request signing for enhanced security
 * - Standard WP REST API endpoints
 * - Custom CutTheCrap plugin endpoints
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  WpPost,
  WpCategory,
  WpTag,
  WpMedia,
  CreatePostRequest,
  UpdatePostRequest,
  BulkStatusRequest,
  BulkStatusResponse,
  PluginVerificationResponse,
  WordPressConnection
} from '../../types/wordpress';

// ============================================================================
// Types
// ============================================================================

interface ApiClientConfig {
  siteUrl: string;
  username: string;
  password: string;
  hmacSecret?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

// ============================================================================
// HMAC Signing
// ============================================================================

/**
 * Generate HMAC signature for request authentication
 * Uses Web Crypto API for browser compatibility
 */
async function generateHmacSignature(
  payload: string,
  secret: string,
  timestamp: number
): Promise<string> {
  const data = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate content hash for version tracking
 */
export async function generateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================================
// API Client Class
// ============================================================================

export class WordPressApiClient {
  private config: ApiClientConfig;
  private baseUrl: string;

  constructor(config: ApiClientConfig) {
    this.config = config;
    // Ensure site URL doesn't have trailing slash
    this.baseUrl = config.siteUrl.replace(/\/$/, '');
  }

  /**
   * Build authorization header using Basic Auth with Application Password
   */
  private getAuthHeader(): string {
    const credentials = btoa(`${this.config.username}:${this.config.password}`);
    return `Basic ${credentials}`;
  }

  /**
   * Build headers for API request including HMAC signature if available
   */
  private async buildHeaders(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Authorization': this.getAuthHeader(),
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Add HMAC signature if secret is configured
    if (this.config.hmacSecret) {
      const timestamp = Date.now();
      const payload = JSON.stringify({
        method,
        endpoint,
        body: body || null,
        timestamp
      });
      const signature = await generateHmacSignature(payload, this.config.hmacSecret, timestamp);

      headers['X-CutTheCrap-Timestamp'] = timestamp.toString();
      headers['X-CutTheCrap-Signature'] = signature;
    }

    return headers;
  }

  /**
   * Make API request to WordPress
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    body?: unknown,
    timeoutMs: number = 30000
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const headers = await this.buildHeaders(method, endpoint, body);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      let responseData: T | undefined;

      try {
        responseData = JSON.parse(responseText) as T;
      } catch {
        // Response is not JSON
        if (!response.ok) {
          return {
            success: false,
            error: `HTTP ${response.status}: ${responseText.substring(0, 200)}`,
            statusCode: response.status
          };
        }
      }

      if (!response.ok) {
        const errorMessage = (responseData as { message?: string })?.message
          || (responseData as { code?: string })?.code
          || `HTTP ${response.status}`;
        return {
          success: false,
          error: errorMessage,
          statusCode: response.status
        };
      }

      return {
        success: true,
        data: responseData,
        statusCode: response.status
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: `Request timed out after ${timeoutMs}ms`
          };
        }
        return {
          success: false,
          error: error.message
        };
      }
      return {
        success: false,
        error: 'Unknown error occurred'
      };
    }
  }

  // ==========================================================================
  // Standard WordPress REST API Methods
  // ==========================================================================

  /**
   * Get list of posts
   */
  async getPosts(params?: {
    page?: number;
    per_page?: number;
    status?: string;
    categories?: number[];
    tags?: number[];
    search?: string;
  }): Promise<ApiResponse<WpPost[]>> {
    const queryParams = new URLSearchParams();

    if (params) {
      if (params.page) queryParams.set('page', params.page.toString());
      if (params.per_page) queryParams.set('per_page', params.per_page.toString());
      if (params.status) queryParams.set('status', params.status);
      if (params.search) queryParams.set('search', params.search);
      if (params.categories?.length) queryParams.set('categories', params.categories.join(','));
      if (params.tags?.length) queryParams.set('tags', params.tags.join(','));
    }

    const query = queryParams.toString();
    const endpoint = `/wp-json/wp/v2/posts${query ? `?${query}` : ''}`;

    return this.request<WpPost[]>('GET', endpoint);
  }

  /**
   * Get single post by ID
   */
  async getPost(postId: number, context: 'view' | 'edit' = 'edit'): Promise<ApiResponse<WpPost>> {
    return this.request<WpPost>('GET', `/wp-json/wp/v2/posts/${postId}?context=${context}`);
  }

  /**
   * Create new post
   */
  async createPost(data: CreatePostRequest): Promise<ApiResponse<WpPost>> {
    return this.request<WpPost>('POST', '/wp-json/wp/v2/posts', data);
  }

  /**
   * Update existing post
   */
  async updatePost(postId: number, data: UpdatePostRequest): Promise<ApiResponse<WpPost>> {
    return this.request<WpPost>('PUT', `/wp-json/wp/v2/posts/${postId}`, data);
  }

  /**
   * Delete post (move to trash or permanent delete)
   */
  async deletePost(postId: number, force: boolean = false): Promise<ApiResponse<WpPost>> {
    const endpoint = `/wp-json/wp/v2/posts/${postId}${force ? '?force=true' : ''}`;
    return this.request<WpPost>('DELETE', endpoint);
  }

  /**
   * Get categories
   */
  async getCategories(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    parent?: number;
  }): Promise<ApiResponse<WpCategory[]>> {
    const queryParams = new URLSearchParams();

    if (params) {
      if (params.page) queryParams.set('page', params.page.toString());
      if (params.per_page) queryParams.set('per_page', params.per_page.toString());
      if (params.search) queryParams.set('search', params.search);
      if (params.parent !== undefined) queryParams.set('parent', params.parent.toString());
    }

    const query = queryParams.toString();
    const endpoint = `/wp-json/wp/v2/categories${query ? `?${query}` : ''}`;

    return this.request<WpCategory[]>('GET', endpoint);
  }

  /**
   * Get tags
   */
  async getTags(params?: {
    page?: number;
    per_page?: number;
    search?: string;
  }): Promise<ApiResponse<WpTag[]>> {
    const queryParams = new URLSearchParams();

    if (params) {
      if (params.page) queryParams.set('page', params.page.toString());
      if (params.per_page) queryParams.set('per_page', params.per_page.toString());
      if (params.search) queryParams.set('search', params.search);
    }

    const query = queryParams.toString();
    const endpoint = `/wp-json/wp/v2/tags${query ? `?${query}` : ''}`;

    return this.request<WpTag[]>('GET', endpoint);
  }

  /**
   * Upload media
   */
  async uploadMedia(
    fileBlob: Blob,
    filename: string,
    altText?: string,
    caption?: string
  ): Promise<ApiResponse<WpMedia>> {
    const url = `${this.baseUrl}/wp-json/wp/v2/media`;

    try {
      const formData = new FormData();
      formData.append('file', fileBlob, filename);
      if (altText) formData.append('alt_text', altText);
      if (caption) formData.append('caption', caption);

      const headers: Record<string, string> = {
        'Authorization': this.getAuthHeader(),
        // Don't set Content-Type for FormData - browser will set with boundary
      };

      // Add HMAC if available
      if (this.config.hmacSecret) {
        const timestamp = Date.now();
        const payload = JSON.stringify({
          method: 'POST',
          endpoint: '/wp-json/wp/v2/media',
          filename,
          timestamp
        });
        const signature = await generateHmacSignature(payload, this.config.hmacSecret, timestamp);
        headers['X-CutTheCrap-Timestamp'] = timestamp.toString();
        headers['X-CutTheCrap-Signature'] = signature;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData
      });

      const responseData = await response.json() as WpMedia;

      if (!response.ok) {
        return {
          success: false,
          error: (responseData as unknown as { message?: string })?.message || `HTTP ${response.status}`,
          statusCode: response.status
        };
      }

      return {
        success: true,
        data: responseData,
        statusCode: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Get media item
   */
  async getMedia(mediaId: number): Promise<ApiResponse<WpMedia>> {
    return this.request<WpMedia>('GET', `/wp-json/wp/v2/media/${mediaId}`);
  }

  // ==========================================================================
  // CutTheCrap Plugin Endpoints
  // ==========================================================================

  /**
   * Verify plugin installation and establish connection
   */
  async verifyPlugin(verifyToken?: string): Promise<ApiResponse<PluginVerificationResponse>> {
    return this.request<PluginVerificationResponse>(
      'POST',
      '/wp-json/cutthecrap/v1/verify',
      {
        app_version: '1.0.0',
        verify_token: verifyToken
      }
    );
  }

  /**
   * Get post status with content hash for conflict detection
   */
  async getPostStatus(postId: number): Promise<ApiResponse<{
    id: number;
    status: string;
    modified: string;
    content_hash: string;
    yoast_meta?: Record<string, unknown>;
    rankmath_meta?: Record<string, unknown>;
  }>> {
    return this.request('GET', `/wp-json/cutthecrap/v1/post/${postId}/status`);
  }

  /**
   * Bulk check post statuses
   */
  async bulkCheckStatus(postIds: number[]): Promise<ApiResponse<BulkStatusResponse>> {
    return this.request<BulkStatusResponse>(
      'POST',
      '/wp-json/cutthecrap/v1/bulk/status',
      { post_ids: postIds } as BulkStatusRequest
    );
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
      ? `?start=${dateRange.start}&end=${dateRange.end}`
      : '';
    return this.request('GET', `/wp-json/cutthecrap/v1/post/${postId}/analytics${params}`);
  }

  /**
   * Test connection to WordPress site
   */
  async testConnection(): Promise<{ success: boolean; message: string; siteInfo?: {
    name: string;
    url: string;
    description: string;
  } }> {
    try {
      // First, try to access the basic site info (doesn't require auth)
      const siteInfoResponse = await this.request<{
        name: string;
        url: string;
        description: string;
      }>('GET', '/wp-json');

      if (!siteInfoResponse.success) {
        return {
          success: false,
          message: `Cannot reach WordPress REST API: ${siteInfoResponse.error}`
        };
      }

      // Now test authentication by trying to get current user
      const userResponse = await this.request<{
        id: number;
        name: string;
        capabilities: Record<string, boolean>;
      }>('GET', '/wp-json/wp/v2/users/me?context=edit');

      if (!userResponse.success) {
        if (userResponse.statusCode === 401) {
          return {
            success: false,
            message: 'Authentication failed. Please check your username and Application Password.'
          };
        }
        return {
          success: false,
          message: `Authentication error: ${userResponse.error}`
        };
      }

      // Check if user can publish posts
      const canPublish = userResponse.data?.capabilities?.publish_posts;
      if (!canPublish) {
        return {
          success: false,
          message: 'User does not have permission to publish posts. Please use an account with Editor or Administrator role.'
        };
      }

      return {
        success: true,
        message: 'Connection successful',
        siteInfo: siteInfoResponse.data
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
 * Create a WordPress API client from a stored connection
 * Handles decryption of stored credentials
 */
export async function createClientFromConnection(
  supabase: SupabaseClient,
  connection: WordPressConnection,
  decryptedPassword: string,
  decryptedHmacSecret?: string
): Promise<WordPressApiClient> {
  return new WordPressApiClient({
    siteUrl: connection.site_url,
    username: connection.api_username,
    password: decryptedPassword,
    hmacSecret: decryptedHmacSecret
  });
}

/**
 * Quick test function for development
 */
export async function testWordPressConnection(
  siteUrl: string,
  username: string,
  password: string
): Promise<{ success: boolean; message: string; siteInfo?: Record<string, unknown> }> {
  const client = new WordPressApiClient({
    siteUrl,
    username,
    password
  });

  return client.testConnection();
}
