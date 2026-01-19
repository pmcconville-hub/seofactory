/**
 * Template Service
 *
 * CRUD operations for social post templates.
 * Manages both default and user-created templates.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type {
  SocialMediaPlatform,
  SocialTemplateType,
  SocialPostTemplate,
  TemplatePlaceholders
} from '../../../types/social';
import {
  DEFAULT_TEMPLATES,
  getDefaultTemplate,
  getDefaultTemplatesForPlatform,
  TEMPLATE_PLACEHOLDERS
} from './defaultTemplates';
import { verifiedInsert, verifiedUpdate } from '../../verifiedDatabaseService';

/**
 * Template creation input
 */
export interface TemplateInput {
  platform: SocialMediaPlatform;
  template_name: string;
  template_type: SocialTemplateType;
  content_pattern: string;
  hashtag_strategy?: SocialPostTemplate['hashtag_strategy'];
  cta_templates?: string[];
  character_limits?: SocialPostTemplate['character_limits'];
  image_specs?: SocialPostTemplate['image_specs'];
  map_id?: string;
}

/**
 * Template service for managing social post templates
 */
export class TemplateService {
  private supabase: SupabaseClient;
  private userId: string;

  constructor(supabase: SupabaseClient, userId: string) {
    this.supabase = supabase;
    this.userId = userId;
  }

  /**
   * Get all templates for a platform (default + user)
   */
  async getTemplatesForPlatform(
    platform: SocialMediaPlatform,
    mapId?: string
  ): Promise<SocialPostTemplate[]> {
    // Get user templates from database
    let query = this.supabase
      .from('social_post_templates')
      .select('*')
      .eq('platform', platform)
      .or(`user_id.eq.${this.userId},user_id.is.null`);

    if (mapId) {
      query = query.or(`map_id.eq.${mapId},map_id.is.null`);
    }

    const { data: userTemplates } = await query;

    // Combine with defaults, user templates override defaults
    const defaults = getDefaultTemplatesForPlatform(platform);
    const combined: SocialPostTemplate[] = [];

    // Add defaults first
    for (const def of defaults) {
      combined.push({
        ...def,
        id: `default-${def.platform}-${def.template_type}`,
        user_id: undefined,
        map_id: undefined,
        is_default: true,
        created_at: new Date().toISOString()
      });
    }

    // Add/override with user templates
    if (userTemplates) {
      for (const template of userTemplates) {
        // Check if this overrides a default
        const defaultIndex = combined.findIndex(
          t => t.template_type === template.template_type && t.is_default
        );

        if (defaultIndex >= 0) {
          // Replace default with user version
          combined[defaultIndex] = template as SocialPostTemplate;
        } else {
          // Add new user template
          combined.push(template as SocialPostTemplate);
        }
      }
    }

    return combined;
  }

  /**
   * Get a specific template
   */
  async getTemplate(
    platform: SocialMediaPlatform,
    templateType: SocialTemplateType,
    mapId?: string
  ): Promise<SocialPostTemplate | null> {
    // Check for user template first
    let query = this.supabase
      .from('social_post_templates')
      .select('*')
      .eq('platform', platform)
      .eq('template_type', templateType)
      .eq('user_id', this.userId);

    if (mapId) {
      query = query.eq('map_id', mapId);
    }

    const { data: userTemplate } = await query.maybeSingle();

    if (userTemplate) {
      return userTemplate as SocialPostTemplate;
    }

    // Fall back to default
    const defaultTemplate = getDefaultTemplate(platform, templateType);
    if (defaultTemplate) {
      return {
        ...defaultTemplate,
        id: `default-${platform}-${templateType}`,
        user_id: undefined,
        map_id: undefined,
        is_default: true,
        created_at: new Date().toISOString()
      };
    }

    return null;
  }

  /**
   * Create a new template
   */
  async createTemplate(input: TemplateInput): Promise<SocialPostTemplate | null> {
    const insertResult = await verifiedInsert(
      this.supabase,
      { table: 'social_post_templates', operationDescription: 'create template' },
      {
        user_id: this.userId,
        ...input,
        is_default: false
      },
      '*'
    );

    if (!insertResult.success || !insertResult.data) {
      console.error('[TemplateService] Create failed:', insertResult.error);
      return null;
    }

    return insertResult.data as unknown as SocialPostTemplate;
  }

  /**
   * Update an existing template
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<TemplateInput>
  ): Promise<SocialPostTemplate | null> {
    // Can't update default templates
    if (templateId.startsWith('default-')) {
      console.error('[TemplateService] Cannot update default templates');
      return null;
    }

    const updateResult = await verifiedUpdate(
      this.supabase,
      { table: 'social_post_templates', operationDescription: 'update template' },
      { column: 'id', value: templateId },
      updates,
      '*'
    );

    if (!updateResult.success || !updateResult.data) {
      console.error('[TemplateService] Update failed:', updateResult.error);
      return null;
    }

    return updateResult.data as unknown as SocialPostTemplate;
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string): Promise<boolean> {
    // Can't delete default templates
    if (templateId.startsWith('default-')) {
      console.error('[TemplateService] Cannot delete default templates');
      return false;
    }

    const { error } = await this.supabase
      .from('social_post_templates')
      .delete()
      .eq('id', templateId)
      .eq('user_id', this.userId);

    if (error) {
      console.error('[TemplateService] Delete failed:', error);
      return false;
    }

    return true;
  }

  /**
   * Clone a template (including defaults)
   */
  async cloneTemplate(
    templateId: string,
    newName: string,
    mapId?: string
  ): Promise<SocialPostTemplate | null> {
    let sourceTemplate: SocialPostTemplate | null;

    if (templateId.startsWith('default-')) {
      // Get default template
      const parts = templateId.split('-');
      const platform = parts[1] as SocialMediaPlatform;
      const templateType = parts.slice(2).join('-') as SocialTemplateType;
      sourceTemplate = await this.getTemplate(platform, templateType);
    } else {
      // Get user template
      const { data } = await this.supabase
        .from('social_post_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      sourceTemplate = data as SocialPostTemplate;
    }

    if (!sourceTemplate) {
      console.error('[TemplateService] Source template not found');
      return null;
    }

    return this.createTemplate({
      platform: sourceTemplate.platform,
      template_name: newName,
      template_type: sourceTemplate.template_type,
      content_pattern: sourceTemplate.content_pattern,
      hashtag_strategy: sourceTemplate.hashtag_strategy,
      cta_templates: sourceTemplate.cta_templates,
      character_limits: sourceTemplate.character_limits,
      image_specs: sourceTemplate.image_specs,
      map_id: mapId
    });
  }

  /**
   * Apply template to generate content
   */
  applyTemplate(
    template: SocialPostTemplate,
    placeholders: Partial<TemplatePlaceholders>
  ): string {
    let content = template.content_pattern;

    // Replace all placeholders
    for (const [key, value] of Object.entries(placeholders)) {
      const placeholder = `{{${key}}}`;
      content = content.replace(new RegExp(placeholder, 'g'), value || '');
    }

    // Clean up any remaining placeholders
    content = content.replace(/\{\{[^}]+\}\}/g, '');

    // Clean up multiple newlines
    content = content.replace(/\n{3,}/g, '\n\n');

    return content.trim();
  }

  /**
   * Get placeholder documentation
   */
  getPlaceholderDocs(): Record<string, string> {
    return TEMPLATE_PLACEHOLDERS;
  }

  /**
   * Validate template content pattern
   */
  validateTemplate(contentPattern: string): {
    valid: boolean;
    placeholders: string[];
    unknown_placeholders: string[];
    issues: string[];
  } {
    const issues: string[] = [];

    // Extract placeholders
    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    const placeholders: string[] = [];
    let match;

    while ((match = placeholderRegex.exec(contentPattern)) !== null) {
      placeholders.push(match[1]);
    }

    // Check for unknown placeholders
    const knownPlaceholders = Object.keys(TEMPLATE_PLACEHOLDERS);
    const unknownPlaceholders = placeholders.filter(p => !knownPlaceholders.includes(p));

    if (unknownPlaceholders.length > 0) {
      issues.push(`Unknown placeholders: ${unknownPlaceholders.join(', ')}`);
    }

    // Check for minimum content
    if (contentPattern.trim().length < 10) {
      issues.push('Template content is too short');
    }

    // Check for required placeholders
    if (!placeholders.includes('link') && !contentPattern.includes('{{link}}')) {
      issues.push('Consider including {{link}} placeholder');
    }

    return {
      valid: issues.length === 0,
      placeholders: [...new Set(placeholders)],
      unknown_placeholders: unknownPlaceholders,
      issues
    };
  }

  /**
   * Get recommended templates for a use case
   */
  getRecommendedTemplates(
    platform: SocialMediaPlatform,
    useCase: 'hub' | 'spoke' | 'engagement'
  ): SocialTemplateType[] {
    const recommendations: Record<string, Record<string, SocialTemplateType[]>> = {
      linkedin: {
        hub: ['hub_announcement'],
        spoke: ['key_takeaway', 'entity_spotlight'],
        engagement: ['question_hook']
      },
      twitter: {
        hub: ['hub_announcement'],
        spoke: ['key_takeaway', 'entity_spotlight'],
        engagement: ['question_hook']
      },
      facebook: {
        hub: ['hub_announcement'],
        spoke: ['key_takeaway', 'entity_spotlight'],
        engagement: ['question_hook']
      },
      instagram: {
        hub: ['hub_announcement'],
        spoke: ['key_takeaway', 'listicle'],
        engagement: ['question_hook']
      },
      pinterest: {
        hub: ['hub_announcement'],
        spoke: ['tip_series', 'entity_spotlight'],
        engagement: ['hub_announcement']  // Pinterest doesn't have engagement templates
      }
    };

    return recommendations[platform]?.[useCase] || ['hub_announcement'];
  }

  /**
   * Preview template with sample data
   */
  previewTemplate(template: SocialPostTemplate): string {
    const sampleData: TemplatePlaceholders = {
      title: 'Sample Article Title',
      entity: 'Sample Entity',
      attribute: 'has the property',
      value: 'specific characteristic',
      key_takeaway: 'This is a key insight that readers will find valuable.',
      hook: 'What if everything you knew about this was wrong?',
      cta: 'Read the full guide below ↓',
      hashtags: '#Sample #Hashtags #Example',
      link: 'https://example.com/article?utm_source=preview',
      meta_description: 'This is a sample meta description for preview purposes.'
    };

    return this.applyTemplate(template, sampleData);
  }
}

/**
 * Factory function
 */
export function createTemplateService(
  supabase: SupabaseClient,
  userId: string
): TemplateService {
  return new TemplateService(supabase, userId);
}
