/**
 * useSocialCampaigns Hook
 *
 * Manage social media campaigns for a topic.
 */

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '../services/supabaseClient';
import type {
  SocialCampaign,
  SocialPost,
  SocialCampaignStatus,
  SocialMediaPlatform,
  UTMParameters
} from '../types/social';

interface UseSocialCampaignsProps {
  topicId: string;
  userId: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

interface UseSocialCampaignsReturn {
  campaigns: Array<{ campaign: SocialCampaign; posts: SocialPost[] }>;
  isLoading: boolean;
  error: string | null;
  createCampaign: (params: CreateCampaignParams) => Promise<SocialCampaign | null>;
  updateCampaign: (campaignId: string, updates: Partial<SocialCampaign>) => Promise<boolean>;
  deleteCampaign: (campaignId: string) => Promise<boolean>;
  getCampaign: (campaignId: string) => Promise<{ campaign: SocialCampaign; posts: SocialPost[] } | null>;
  updateCampaignStatus: (campaignId: string, status: SocialCampaignStatus) => Promise<boolean>;
  refreshCampaigns: () => Promise<void>;
}

interface CreateCampaignParams {
  campaignName?: string;
  jobId?: string;
  hubPlatform: SocialMediaPlatform;
  utmParameters?: Partial<UTMParameters>;
}

export function useSocialCampaigns({
  topicId,
  userId,
  supabaseUrl,
  supabaseAnonKey
}: UseSocialCampaignsProps): UseSocialCampaignsReturn {
  const [campaigns, setCampaigns] = useState<Array<{ campaign: SocialCampaign; posts: SocialPost[] }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);

  // Fetch all campaigns for the topic
  const fetchCampaigns = useCallback(async () => {
    if (!topicId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch campaigns
      const { data: campaignData, error: campaignError } = await supabase
        .from('social_campaigns')
        .select('*')
        .eq('topic_id', topicId)
        .order('created_at', { ascending: false });

      if (campaignError) throw campaignError;

      if (!campaignData || campaignData.length === 0) {
        setCampaigns([]);
        return;
      }

      // Fetch posts for all campaigns
      const campaignIds = campaignData.map(c => c.id);
      const { data: postData, error: postError } = await supabase
        .from('social_posts')
        .select('*')
        .in('campaign_id', campaignIds)
        .order('spoke_position', { ascending: true });

      if (postError) throw postError;

      // Group posts by campaign
      const postsByCampaign = (postData || []).reduce((acc, post) => {
        if (!acc[post.campaign_id]) {
          acc[post.campaign_id] = [];
        }
        acc[post.campaign_id].push(post as unknown as SocialPost);
        return acc;
      }, {} as Record<string, SocialPost[]>);

      // Combine campaigns with their posts
      const combined = campaignData.map(campaign => ({
        campaign: campaign as SocialCampaign,
        posts: postsByCampaign[campaign.id] || []
      }));

      setCampaigns(combined);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch campaigns';
      setError(message);
      console.error('[useSocialCampaigns] Error fetching campaigns:', err);
    } finally {
      setIsLoading(false);
    }
  }, [topicId, supabase]);

  // Initial fetch
  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Create a new campaign
  const createCampaign = useCallback(async (params: CreateCampaignParams): Promise<SocialCampaign | null> => {
    try {
      const newCampaign = {
        user_id: userId,
        topic_id: topicId,
        job_id: params.jobId || null,
        campaign_name: params.campaignName || `Campaign ${new Date().toLocaleDateString()}`,
        hub_platform: params.hubPlatform,
        utm_source: params.utmParameters?.utm_source || null,
        utm_medium: params.utmParameters?.utm_medium || 'organic-social',
        utm_campaign: params.utmParameters?.utm_campaign || null,
        status: 'draft' as SocialCampaignStatus,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error: insertError } = await supabase
        .from('social_campaigns')
        .insert(newCampaign)
        .select()
        .single();

      if (insertError) throw insertError;

      // Add to local state
      setCampaigns(prev => [{
        campaign: data as SocialCampaign,
        posts: []
      }, ...prev]);

      return data as SocialCampaign;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create campaign';
      setError(message);
      console.error('[useSocialCampaigns] Error creating campaign:', err);
      return null;
    }
  }, [topicId, userId, supabase]);

  // Update a campaign
  const updateCampaign = useCallback(async (
    campaignId: string,
    updates: Partial<SocialCampaign>
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('social_campaigns')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId);

      if (updateError) throw updateError;

      // Update local state
      setCampaigns(prev => prev.map(item =>
        item.campaign.id === campaignId
          ? { ...item, campaign: { ...item.campaign, ...updates } }
          : item
      ));

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update campaign';
      setError(message);
      console.error('[useSocialCampaigns] Error updating campaign:', err);
      return false;
    }
  }, [supabase]);

  // Delete a campaign and its posts
  const deleteCampaign = useCallback(async (campaignId: string): Promise<boolean> => {
    try {
      // Delete posts first (foreign key constraint)
      const { error: postsError } = await supabase
        .from('social_posts')
        .delete()
        .eq('campaign_id', campaignId);

      if (postsError) throw postsError;

      // Delete campaign
      const { error: campaignError } = await supabase
        .from('social_campaigns')
        .delete()
        .eq('id', campaignId);

      if (campaignError) throw campaignError;

      // Remove from local state
      setCampaigns(prev => prev.filter(item => item.campaign.id !== campaignId));

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete campaign';
      setError(message);
      console.error('[useSocialCampaigns] Error deleting campaign:', err);
      return false;
    }
  }, [supabase]);

  // Get a single campaign with posts
  const getCampaign = useCallback(async (
    campaignId: string
  ): Promise<{ campaign: SocialCampaign; posts: SocialPost[] } | null> => {
    try {
      // Check local state first
      const existing = campaigns.find(c => c.campaign.id === campaignId);
      if (existing) return existing;

      // Fetch from database
      const { data: campaignData, error: campaignError } = await supabase
        .from('social_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaignError) throw campaignError;

      const { data: postData, error: postError } = await supabase
        .from('social_posts')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('spoke_position', { ascending: true });

      if (postError) throw postError;

      return {
        campaign: campaignData as SocialCampaign,
        posts: (postData || []) as unknown as SocialPost[]
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get campaign';
      setError(message);
      console.error('[useSocialCampaigns] Error getting campaign:', err);
      return null;
    }
  }, [campaigns, supabase]);

  // Update campaign status
  const updateCampaignStatus = useCallback(async (
    campaignId: string,
    status: SocialCampaignStatus
  ): Promise<boolean> => {
    return updateCampaign(campaignId, { status });
  }, [updateCampaign]);

  // Manual refresh
  const refreshCampaigns = useCallback(async () => {
    await fetchCampaigns();
  }, [fetchCampaigns]);

  return {
    campaigns,
    isLoading,
    error,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    getCampaign,
    updateCampaignStatus,
    refreshCampaigns
  };
}

export default useSocialCampaigns;
