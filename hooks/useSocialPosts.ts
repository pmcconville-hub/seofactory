/**
 * useSocialPosts Hook
 *
 * Manage individual social posts within a campaign.
 */

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '../services/supabaseClient';
import type {
  SocialPost,
  SocialPostStatus,
  SocialMediaPlatform,
  SocialPostType,
  UTMParameters,
  EAVTriple
} from '../types/social';

interface UseSocialPostsProps {
  campaignId: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

interface UseSocialPostsReturn {
  posts: SocialPost[];
  hubPost: SocialPost | null;
  spokePosts: SocialPost[];
  isLoading: boolean;
  error: string | null;
  createPost: (params: CreatePostParams) => Promise<SocialPost | null>;
  updatePost: (postId: string, updates: Partial<SocialPost>) => Promise<boolean>;
  deletePost: (postId: string) => Promise<boolean>;
  updatePostContent: (postId: string, content: string) => Promise<boolean>;
  updatePostHashtags: (postId: string, hashtags: string[]) => Promise<boolean>;
  markAsPosted: (postId: string, postUrl?: string) => Promise<boolean>;
  unmarkAsPosted: (postId: string) => Promise<boolean>;
  refreshPosts: () => Promise<void>;
}

interface CreatePostParams {
  topicId: string;
  jobId?: string;
  platform: SocialMediaPlatform;
  postType: SocialPostType;
  contentText: string;
  isHub?: boolean;
  spokePosition?: number;
  hashtags?: string[];
  mentions?: string[];
  linkUrl?: string;
  utmParameters?: UTMParameters;
  imageInstructions?: Record<string, unknown>;
  postingInstructions?: string;
  optimalPostingTime?: string;
  eavTriple?: EAVTriple;
  entitiesMentioned?: string[];
  semanticDistanceFromHub?: number;
}

export function useSocialPosts({
  campaignId,
  supabaseUrl,
  supabaseAnonKey
}: UseSocialPostsProps): UseSocialPostsReturn {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);

  // Fetch all posts for the campaign
  const fetchPosts = useCallback(async () => {
    if (!campaignId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('social_posts')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('is_hub', { ascending: false })
        .order('spoke_position', { ascending: true });

      if (fetchError) throw fetchError;

      setPosts((data || []) as SocialPost[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch posts';
      setError(message);
      console.error('[useSocialPosts] Error fetching posts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [campaignId, supabase]);

  // Initial fetch
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Derived state
  const hubPost = posts.find(p => p.is_hub) || null;
  const spokePosts = posts.filter(p => !p.is_hub).sort((a, b) =>
    (a.spoke_position || 0) - (b.spoke_position || 0)
  );

  // Create a new post
  const createPost = useCallback(async (params: CreatePostParams): Promise<SocialPost | null> => {
    try {
      const newPost = {
        campaign_id: campaignId,
        topic_id: params.topicId,
        job_id: params.jobId || null,
        platform: params.platform,
        post_type: params.postType,
        content_text: params.contentText,
        is_hub: params.isHub || false,
        spoke_position: params.spokePosition || null,
        hashtags: params.hashtags || [],
        mentions: params.mentions || [],
        link_url: params.linkUrl || null,
        utm_parameters: params.utmParameters || null,
        image_instructions: params.imageInstructions || null,
        posting_instructions: params.postingInstructions || null,
        optimal_posting_time: params.optimalPostingTime || null,
        eav_triple: params.eavTriple || null,
        entities_mentioned: params.entitiesMentioned || [],
        semantic_distance_from_hub: params.semanticDistanceFromHub || null,
        status: 'draft' as SocialPostStatus,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error: insertError } = await supabase
        .from('social_posts')
        .insert(newPost)
        .select()
        .single();

      if (insertError) throw insertError;

      const post = data as SocialPost;

      // Add to local state
      setPosts(prev => {
        const updated = [...prev, post];
        // Re-sort: hub first, then by spoke position
        return updated.sort((a, b) => {
          if (a.is_hub && !b.is_hub) return -1;
          if (!a.is_hub && b.is_hub) return 1;
          return (a.spoke_position || 0) - (b.spoke_position || 0);
        });
      });

      return post;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create post';
      setError(message);
      console.error('[useSocialPosts] Error creating post:', err);
      return null;
    }
  }, [campaignId, supabase]);

  // Update a post
  const updatePost = useCallback(async (
    postId: string,
    updates: Partial<SocialPost>
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('social_posts')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', postId);

      if (updateError) throw updateError;

      // Update local state
      setPosts(prev => prev.map(post =>
        post.id === postId ? { ...post, ...updates } : post
      ));

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update post';
      setError(message);
      console.error('[useSocialPosts] Error updating post:', err);
      return false;
    }
  }, [supabase]);

  // Delete a post
  const deletePost = useCallback(async (postId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('social_posts')
        .delete()
        .eq('id', postId);

      if (deleteError) throw deleteError;

      // Remove from local state
      setPosts(prev => prev.filter(post => post.id !== postId));

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete post';
      setError(message);
      console.error('[useSocialPosts] Error deleting post:', err);
      return false;
    }
  }, [supabase]);

  // Update post content
  const updatePostContent = useCallback(async (
    postId: string,
    content: string
  ): Promise<boolean> => {
    return updatePost(postId, { content_text: content });
  }, [updatePost]);

  // Update post hashtags
  const updatePostHashtags = useCallback(async (
    postId: string,
    hashtags: string[]
  ): Promise<boolean> => {
    return updatePost(postId, { hashtags });
  }, [updatePost]);

  // Mark post as manually posted
  const markAsPosted = useCallback(async (
    postId: string,
    postUrl?: string
  ): Promise<boolean> => {
    return updatePost(postId, {
      status: 'posted',
      manually_posted_at: new Date().toISOString(),
      platform_post_url: postUrl || null
    });
  }, [updatePost]);

  // Unmark post as posted
  const unmarkAsPosted = useCallback(async (postId: string): Promise<boolean> => {
    return updatePost(postId, {
      status: 'ready',
      manually_posted_at: null as unknown as string,
      platform_post_url: null as unknown as string
    });
  }, [updatePost]);

  // Manual refresh
  const refreshPosts = useCallback(async () => {
    await fetchPosts();
  }, [fetchPosts]);

  return {
    posts,
    hubPost,
    spokePosts,
    isLoading,
    error,
    createPost,
    updatePost,
    deletePost,
    updatePostContent,
    updatePostHashtags,
    markAsPosted,
    unmarkAsPosted,
    refreshPosts
  };
}

export default useSocialPosts;
