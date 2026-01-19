/**
 * useSocialExport Hook
 *
 * Handle social media content export in various formats.
 */

import { useState, useCallback } from 'react';
import { getSupabaseClient } from '../services/supabaseClient';
import type {
  SocialCampaign,
  SocialPost,
  SocialMediaPlatform
} from '../types/social';
import {
  exportToClipboard,
  exportToJSON,
  exportToText,
  exportToPackage
} from '../services/social/export/exportService';

interface UseSocialExportProps {
  supabaseUrl: string;
  supabaseAnonKey: string;
  userId: string;
}

interface UseSocialExportReturn {
  isExporting: boolean;
  lastExport: ExportRecord | null;
  error: string | null;
  exportToClipboard: (post: SocialPost, options?: ClipboardExportOptions) => Promise<boolean>;
  exportPostToText: (post: SocialPost, options?: TextExportOptions) => Promise<string>;
  exportCampaignToJSON: (campaign: SocialCampaign, posts: SocialPost[]) => Promise<string>;
  exportCampaignToText: (campaign: SocialCampaign, posts: SocialPost[]) => Promise<string>;
  exportCampaignToPackage: (campaign: SocialCampaign, posts: SocialPost[], options?: PackageExportOptions) => Promise<Blob>;
  downloadExport: (content: string | Blob, filename: string, mimeType?: string) => void;
  recordExport: (campaignId: string, exportType: ExportType, format: ExportFormat, postIds?: string[]) => Promise<void>;
  getExportHistory: (campaignId: string) => Promise<ExportRecord[]>;
}

type ExportType = 'single_post' | 'full_campaign' | 'bulk_package';
type ExportFormat = 'clipboard' | 'json' | 'txt' | 'markdown' | 'zip';

interface ExportRecord {
  id: string;
  campaign_id: string;
  user_id: string;
  export_type: ExportType;
  export_format: ExportFormat;
  posts_included: string[];
  created_at: string;
}

interface ClipboardExportOptions {
  includeHashtags?: boolean;
  includeLink?: boolean;
  includeMentions?: boolean;
}

interface TextExportOptions {
  includeInstructions?: boolean;
  includeImageSpecs?: boolean;
  format?: 'plain' | 'markdown';
}

interface PackageExportOptions {
  includeInstructions?: boolean;
  includeImageSpecs?: boolean;
  includeUtmLinks?: boolean;
  platformsToInclude?: SocialMediaPlatform[];
  groupByPlatform?: boolean;
}

export function useSocialExport({
  supabaseUrl,
  supabaseAnonKey,
  userId
}: UseSocialExportProps): UseSocialExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [lastExport, setLastExport] = useState<ExportRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);

  // Export single post to clipboard
  const handleExportToClipboard = useCallback(async (
    post: SocialPost,
    options: ClipboardExportOptions = {}
  ): Promise<boolean> => {
    setIsExporting(true);
    setError(null);

    try {
      const success = await exportToClipboard(post, options);
      return success;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to copy to clipboard';
      setError(message);
      console.error('[useSocialExport] Clipboard export error:', err);
      return false;
    } finally {
      setIsExporting(false);
    }
  }, []);

  // Export single post to text
  const handleExportPostToText = useCallback(async (
    post: SocialPost,
    options: TextExportOptions = {}
  ): Promise<string> => {
    setIsExporting(true);
    setError(null);

    try {
      const text = await exportToText([post], undefined, options);
      return text;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export to text';
      setError(message);
      console.error('[useSocialExport] Text export error:', err);
      return '';
    } finally {
      setIsExporting(false);
    }
  }, []);

  // Export campaign to JSON
  const handleExportCampaignToJSON = useCallback(async (
    campaign: SocialCampaign,
    posts: SocialPost[]
  ): Promise<string> => {
    setIsExporting(true);
    setError(null);

    try {
      const json = await exportToJSON(campaign, posts);
      return json;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export to JSON';
      setError(message);
      console.error('[useSocialExport] JSON export error:', err);
      return '';
    } finally {
      setIsExporting(false);
    }
  }, []);

  // Export campaign to text/markdown
  const handleExportCampaignToText = useCallback(async (
    campaign: SocialCampaign,
    posts: SocialPost[]
  ): Promise<string> => {
    setIsExporting(true);
    setError(null);

    try {
      const text = await exportToText(posts, campaign, {
        includeInstructions: true,
        format: 'markdown'
      });
      return text;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export to text';
      setError(message);
      console.error('[useSocialExport] Text export error:', err);
      return '';
    } finally {
      setIsExporting(false);
    }
  }, []);

  // Export campaign to ZIP package
  const handleExportCampaignToPackage = useCallback(async (
    campaign: SocialCampaign,
    posts: SocialPost[],
    options: PackageExportOptions = {}
  ): Promise<Blob> => {
    setIsExporting(true);
    setError(null);

    try {
      const blob = await exportToPackage(campaign, posts, options);
      return blob;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create export package';
      setError(message);
      console.error('[useSocialExport] Package export error:', err);
      return new Blob([]);
    } finally {
      setIsExporting(false);
    }
  }, []);

  // Download content as file
  const downloadExport = useCallback((
    content: string | Blob,
    filename: string,
    mimeType: string = 'text/plain'
  ) => {
    try {
      const blob = content instanceof Blob
        ? content
        : new Blob([content], { type: mimeType });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download file';
      setError(message);
      console.error('[useSocialExport] Download error:', err);
    }
  }, []);

  // Record export in history
  const recordExport = useCallback(async (
    campaignId: string,
    exportType: ExportType,
    format: ExportFormat,
    postIds?: string[]
  ): Promise<void> => {
    try {
      const record = {
        campaign_id: campaignId,
        user_id: userId,
        export_type: exportType,
        export_format: format,
        posts_included: postIds || [],
        created_at: new Date().toISOString()
      };

      const { data, error: insertError } = await supabase
        .from('social_export_history')
        .insert(record)
        .select()
        .single();

      if (insertError) throw insertError;

      setLastExport(data as ExportRecord);

      // Also update campaign status to 'exported' if it was 'ready'
      await supabase
        .from('social_campaigns')
        .update({
          status: 'exported',
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId)
        .eq('status', 'ready');

      // Update posts as exported
      if (postIds && postIds.length > 0) {
        await supabase
          .from('social_posts')
          .update({
            status: 'exported',
            exported_at: new Date().toISOString()
          })
          .in('id', postIds);
      }
    } catch (err) {
      console.error('[useSocialExport] Failed to record export:', err);
      // Don't throw - export recording is not critical
    }
  }, [userId, supabase]);

  // Get export history for a campaign
  const getExportHistory = useCallback(async (campaignId: string): Promise<ExportRecord[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('social_export_history')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      return (data || []) as ExportRecord[];
    } catch (err) {
      console.error('[useSocialExport] Failed to get export history:', err);
      return [];
    }
  }, [supabase]);

  return {
    isExporting,
    lastExport,
    error,
    exportToClipboard: handleExportToClipboard,
    exportPostToText: handleExportPostToText,
    exportCampaignToJSON: handleExportCampaignToJSON,
    exportCampaignToText: handleExportCampaignToText,
    exportCampaignToPackage: handleExportCampaignToPackage,
    downloadExport,
    recordExport,
    getExportHistory
  };
}

export default useSocialExport;
