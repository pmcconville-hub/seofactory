/**
 * useSocialTemplates Hook
 *
 * Manage social post templates for users and maps.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getSupabaseClient } from '../services/supabaseClient';
import type {
  SocialPostTemplate,
  SocialMediaPlatform,
  SocialTemplateType
} from '../types/social';
import { getDefaultTemplates } from '../services/social/templates/defaultTemplates';

interface UseSocialTemplatesProps {
  userId: string;
  mapId?: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

interface UseSocialTemplatesReturn {
  templates: SocialPostTemplate[];
  defaultTemplates: SocialPostTemplate[];
  customTemplates: SocialPostTemplate[];
  isLoading: boolean;
  error: string | null;
  getTemplatesForPlatform: (platform: SocialMediaPlatform) => SocialPostTemplate[];
  getTemplatesByType: (type: SocialTemplateType) => SocialPostTemplate[];
  getTemplate: (templateId: string) => SocialPostTemplate | undefined;
  createTemplate: (params: CreateTemplateParams) => Promise<SocialPostTemplate | null>;
  updateTemplate: (templateId: string, updates: Partial<SocialPostTemplate>) => Promise<boolean>;
  deleteTemplate: (templateId: string) => Promise<boolean>;
  duplicateTemplate: (templateId: string, newName: string) => Promise<SocialPostTemplate | null>;
  refreshTemplates: () => Promise<void>;
}

interface CreateTemplateParams {
  platform: SocialMediaPlatform;
  templateName: string;
  templateType: SocialTemplateType;
  contentPattern: string;
  hashtagStrategy?: Record<string, unknown>;
  ctaTemplates?: string[];
  characterLimits?: Record<string, number>;
  imageSpecs?: Record<string, unknown>;
}

export function useSocialTemplates({
  userId,
  mapId,
  supabaseUrl,
  supabaseAnonKey
}: UseSocialTemplatesProps): UseSocialTemplatesReturn {
  const [customTemplates, setCustomTemplates] = useState<SocialPostTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);

  // Get built-in default templates
  const defaultTemplates = useMemo(() => getDefaultTemplates(), []);

  // Fetch custom templates from database
  const fetchTemplates = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Build query - get user templates and optionally map-specific templates
      let query = supabase
        .from('social_post_templates')
        .select('*')
        .eq('user_id', userId);

      if (mapId) {
        query = query.or(`map_id.eq.${mapId},map_id.is.null`);
      }

      const { data, error: fetchError } = await query.order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setCustomTemplates((data || []) as SocialPostTemplate[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch templates';
      setError(message);
      console.error('[useSocialTemplates] Error fetching templates:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, mapId, supabase]);

  // Initial fetch
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Combine default and custom templates
  const templates = useMemo(() => {
    // Custom templates override defaults with same platform and type
    const customSet = new Set(customTemplates.map(t => `${t.platform}:${t.template_type}`));
    const filteredDefaults = defaultTemplates.filter(t =>
      !customSet.has(`${t.platform}:${t.template_type}`)
    );
    return [...customTemplates, ...filteredDefaults];
  }, [customTemplates, defaultTemplates]);

  // Get templates for a specific platform
  const getTemplatesForPlatform = useCallback((platform: SocialMediaPlatform): SocialPostTemplate[] => {
    return templates.filter(t => t.platform === platform);
  }, [templates]);

  // Get templates by type
  const getTemplatesByType = useCallback((type: SocialTemplateType): SocialPostTemplate[] => {
    return templates.filter(t => t.template_type === type);
  }, [templates]);

  // Get a single template by ID
  const getTemplate = useCallback((templateId: string): SocialPostTemplate | undefined => {
    return templates.find(t => t.id === templateId);
  }, [templates]);

  // Create a new custom template
  const createTemplate = useCallback(async (params: CreateTemplateParams): Promise<SocialPostTemplate | null> => {
    try {
      const newTemplate = {
        user_id: userId,
        map_id: mapId || null,
        platform: params.platform,
        template_name: params.templateName,
        template_type: params.templateType,
        content_pattern: params.contentPattern,
        hashtag_strategy: params.hashtagStrategy || null,
        cta_templates: params.ctaTemplates || [],
        character_limits: params.characterLimits || null,
        image_specs: params.imageSpecs || null,
        is_default: false,
        created_at: new Date().toISOString()
      };

      const { data, error: insertError } = await supabase
        .from('social_post_templates')
        .insert(newTemplate)
        .select()
        .single();

      if (insertError) throw insertError;

      const template = data as SocialPostTemplate;

      // Add to local state
      setCustomTemplates(prev => [template, ...prev]);

      return template;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create template';
      setError(message);
      console.error('[useSocialTemplates] Error creating template:', err);
      return null;
    }
  }, [userId, mapId, supabase]);

  // Update a template
  const updateTemplate = useCallback(async (
    templateId: string,
    updates: Partial<SocialPostTemplate>
  ): Promise<boolean> => {
    try {
      // Check if this is a default template (can't update defaults)
      const template = templates.find(t => t.id === templateId);
      if (template?.is_default) {
        setError('Cannot modify default templates');
        return false;
      }

      const { error: updateError } = await supabase
        .from('social_post_templates')
        .update(updates)
        .eq('id', templateId);

      if (updateError) throw updateError;

      // Update local state
      setCustomTemplates(prev => prev.map(t =>
        t.id === templateId ? { ...t, ...updates } : t
      ));

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update template';
      setError(message);
      console.error('[useSocialTemplates] Error updating template:', err);
      return false;
    }
  }, [templates, supabase]);

  // Delete a template
  const deleteTemplate = useCallback(async (templateId: string): Promise<boolean> => {
    try {
      // Check if this is a default template (can't delete defaults)
      const template = templates.find(t => t.id === templateId);
      if (template?.is_default) {
        setError('Cannot delete default templates');
        return false;
      }

      const { error: deleteError } = await supabase
        .from('social_post_templates')
        .delete()
        .eq('id', templateId);

      if (deleteError) throw deleteError;

      // Remove from local state
      setCustomTemplates(prev => prev.filter(t => t.id !== templateId));

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete template';
      setError(message);
      console.error('[useSocialTemplates] Error deleting template:', err);
      return false;
    }
  }, [templates, supabase]);

  // Duplicate a template (including defaults)
  const duplicateTemplate = useCallback(async (
    templateId: string,
    newName: string
  ): Promise<SocialPostTemplate | null> => {
    try {
      const template = templates.find(t => t.id === templateId);
      if (!template) {
        setError('Template not found');
        return null;
      }

      return createTemplate({
        platform: template.platform,
        templateName: newName,
        templateType: template.template_type,
        contentPattern: template.content_pattern,
        hashtagStrategy: template.hashtag_strategy || undefined,
        ctaTemplates: template.cta_templates || undefined,
        characterLimits: template.character_limits || undefined,
        imageSpecs: template.image_specs || undefined
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to duplicate template';
      setError(message);
      console.error('[useSocialTemplates] Error duplicating template:', err);
      return null;
    }
  }, [templates, createTemplate]);

  // Manual refresh
  const refreshTemplates = useCallback(async () => {
    await fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    defaultTemplates,
    customTemplates,
    isLoading,
    error,
    getTemplatesForPlatform,
    getTemplatesByType,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    refreshTemplates
  };
}

export default useSocialTemplates;
