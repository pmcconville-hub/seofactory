/**
 * Template Versioning Service
 *
 * Manages template configuration versions for rollback capability.
 * Allows saving, activating, and rolling back template configurations.
 *
 * Created: 2026-01-18 - Content Template Routing Task 27
 *
 * @module services/templateVersioningService
 */

import { getSupabaseClient } from './supabaseClient';
import { TemplateName, TemplateConfig } from '../types/contentTemplates';
import { CONTENT_TEMPLATES } from '../config/contentTemplates';

// =============================================================================
// Types
// =============================================================================

export interface TemplateVersion {
  id: string;
  templateName: TemplateName;
  versionNumber: number;
  label?: string;
  description?: string;
  config: TemplateConfig;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  activatedAt?: string;
  deactivatedAt?: string;
  rolledBackFrom?: string;
  rolledBackAt?: string;
  rollbackReason?: string;
}

export interface VersionHistoryEntry {
  id: string;
  versionId: string;
  templateName: TemplateName;
  action: 'created' | 'activated' | 'deactivated' | 'rolled_back' | 'deleted';
  previousActiveVersionId?: string;
  performedBy?: string;
  performedAt: string;
  notes?: string;
}

export interface CreateVersionInput {
  templateName: TemplateName;
  config: TemplateConfig;
  label?: string;
  description?: string;
  activate?: boolean;
}

// =============================================================================
// Version Management
// =============================================================================

/**
 * Create a new template version
 *
 * @param input - Version creation input
 * @returns Created version or error
 */
export async function createTemplateVersion(
  input: CreateVersionInput,
  supabaseUrl?: string,
  supabaseAnonKey?: string
): Promise<{ success: boolean; version?: TemplateVersion; error?: unknown }> {
  try {
    const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);
    const { data: user } = await supabase.auth.getUser();

    // Get next version number
    const { data: latestVersion } = await (supabase
      .from('template_versions' as any) as any)
      .select('version_number')
      .eq('template_name', input.templateName)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = (latestVersion?.version_number || 0) + 1;

    // Insert new version
    const { data, error } = await (supabase
      .from('template_versions' as any) as any)
      .insert({
        template_name: input.templateName,
        version_number: nextVersion,
        label: input.label || `Version ${nextVersion}`,
        description: input.description,
        config: input.config,
        is_active: input.activate || false,
        is_default: nextVersion === 1,
        created_by: user?.user?.id,
        activated_at: input.activate ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) throw error;

    // Record in history
    await (supabase
      .from('template_version_history' as any) as any)
      .insert({
        version_id: data.id,
        template_name: input.templateName,
        action: 'created',
        performed_by: user?.user?.id,
      });

    // If activating, deactivate other versions
    if (input.activate) {
      await (supabase
        .from('template_versions' as any) as any)
        .update({ is_active: false, deactivated_at: new Date().toISOString() })
        .eq('template_name', input.templateName)
        .neq('id', data.id);
    }

    return {
      success: true,
      version: mapToTemplateVersion(data),
    };
  } catch (error) {
    console.error('[TemplateVersioning] Failed to create version:', error);
    return { success: false, error };
  }
}

/**
 * Get all versions for a template
 *
 * @param templateName - Template to get versions for
 * @returns Array of versions
 */
export async function getTemplateVersions(
  templateName: TemplateName,
  supabaseUrl?: string,
  supabaseAnonKey?: string
): Promise<TemplateVersion[]> {
  try {
    const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await (supabase
      .from('template_versions' as any) as any)
      .select('*')
      .eq('template_name', templateName)
      .order('version_number', { ascending: false });

    if (error) throw error;

    return (data || []).map(mapToTemplateVersion);
  } catch (error) {
    console.error('[TemplateVersioning] Failed to get versions:', error);
    return [];
  }
}

/**
 * Get the active version for a template
 *
 * @param templateName - Template to get active version for
 * @returns Active version or null
 */
export async function getActiveVersion(
  templateName: TemplateName,
  supabaseUrl?: string,
  supabaseAnonKey?: string
): Promise<TemplateVersion | null> {
  try {
    const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await (supabase
      .from('template_versions' as any) as any)
      .select('*')
      .eq('template_name', templateName)
      .eq('is_active', true)
      .single();

    if (error || !data) return null;

    return mapToTemplateVersion(data);
  } catch (error) {
    console.error('[TemplateVersioning] Failed to get active version:', error);
    return null;
  }
}

/**
 * Activate a specific version
 *
 * @param versionId - Version ID to activate
 * @returns Success status
 */
export async function activateVersion(
  versionId: string,
  supabaseUrl?: string,
  supabaseAnonKey?: string
): Promise<{ success: boolean; error?: unknown }> {
  try {
    const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);

    // Use database function for atomic activation
    const { error } = await (supabase.rpc as any)('activate_template_version', {
      p_version_id: versionId,
    });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('[TemplateVersioning] Failed to activate version:', error);
    return { success: false, error };
  }
}

/**
 * Rollback to a previous version
 *
 * @param templateName - Template to rollback
 * @param targetVersionId - Version to rollback to
 * @param reason - Reason for rollback
 * @returns Success status
 */
export async function rollbackToVersion(
  templateName: TemplateName,
  targetVersionId: string,
  reason?: string,
  supabaseUrl?: string,
  supabaseAnonKey?: string
): Promise<{ success: boolean; error?: unknown }> {
  try {
    const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);

    // Use database function for atomic rollback
    const { error } = await (supabase.rpc as any)('rollback_template_version', {
      p_template_name: templateName,
      p_target_version_id: targetVersionId,
      p_reason: reason,
    });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('[TemplateVersioning] Failed to rollback:', error);
    return { success: false, error };
  }
}

/**
 * Get version history for a template
 *
 * @param templateName - Template to get history for
 * @param limit - Maximum entries to return
 * @returns Array of history entries
 */
export async function getVersionHistory(
  templateName: TemplateName,
  limit: number = 50,
  supabaseUrl?: string,
  supabaseAnonKey?: string
): Promise<VersionHistoryEntry[]> {
  try {
    const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await (supabase
      .from('template_version_history' as any) as any)
      .select('*')
      .eq('template_name', templateName)
      .order('performed_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map((entry: any) => ({
      id: entry.id,
      versionId: entry.version_id,
      templateName: entry.template_name,
      action: entry.action,
      previousActiveVersionId: entry.previous_active_version_id,
      performedBy: entry.performed_by,
      performedAt: entry.performed_at,
      notes: entry.notes,
    }));
  } catch (error) {
    console.error('[TemplateVersioning] Failed to get history:', error);
    return [];
  }
}

// =============================================================================
// Initialization
// =============================================================================

/**
 * Initialize version tracking for all templates
 *
 * Creates initial versions from the current CONTENT_TEMPLATES config.
 * Should be called once when setting up versioning.
 *
 * @returns Number of templates initialized
 */
export async function initializeTemplateVersions(
  supabaseUrl?: string,
  supabaseAnonKey?: string
): Promise<{ success: boolean; initialized: number; error?: unknown }> {
  try {
    let initialized = 0;

    for (const [name, config] of Object.entries(CONTENT_TEMPLATES)) {
      const existingVersions = await getTemplateVersions(
        name as TemplateName,
        supabaseUrl,
        supabaseAnonKey
      );

      // Skip if already has versions
      if (existingVersions.length > 0) continue;

      const result = await createTemplateVersion(
        {
          templateName: name as TemplateName,
          config: config as TemplateConfig,
          label: 'Initial Version',
          description: 'Default template configuration',
          activate: true,
        },
        supabaseUrl,
        supabaseAnonKey
      );

      if (result.success) {
        initialized++;
      }
    }

    return { success: true, initialized };
  } catch (error) {
    console.error('[TemplateVersioning] Failed to initialize:', error);
    return { success: false, initialized: 0, error };
  }
}

/**
 * Compare two template versions
 *
 * @param versionA - First version ID
 * @param versionB - Second version ID
 * @returns Comparison result
 */
export async function compareVersions(
  versionAId: string,
  versionBId: string,
  supabaseUrl?: string,
  supabaseAnonKey?: string
): Promise<{
  differences: Array<{
    field: string;
    valueA: any;
    valueB: any;
  }>;
} | null> {
  try {
    const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);

    const { data: versions, error } = await (supabase
      .from('template_versions' as any) as any)
      .select('config')
      .in('id', [versionAId, versionBId]);

    if (error || !versions || versions.length !== 2) return null;

    const configA = versions[0].config;
    const configB = versions[1].config;

    const differences: Array<{ field: string; valueA: any; valueB: any }> = [];

    // Compare top-level fields
    const allKeys = new Set([...Object.keys(configA), ...Object.keys(configB)]);

    for (const key of allKeys) {
      const valueA = configA[key];
      const valueB = configB[key];

      if (JSON.stringify(valueA) !== JSON.stringify(valueB)) {
        differences.push({ field: key, valueA, valueB });
      }
    }

    return { differences };
  } catch (error) {
    console.error('[TemplateVersioning] Failed to compare versions:', error);
    return null;
  }
}

// =============================================================================
// Helpers
// =============================================================================

function mapToTemplateVersion(data: any): TemplateVersion {
  return {
    id: data.id,
    templateName: data.template_name,
    versionNumber: data.version_number,
    label: data.label,
    description: data.description,
    config: data.config,
    isActive: data.is_active,
    isDefault: data.is_default,
    createdAt: data.created_at,
    activatedAt: data.activated_at,
    deactivatedAt: data.deactivated_at,
    rolledBackFrom: data.rolled_back_from,
    rolledBackAt: data.rolled_back_at,
    rollbackReason: data.rollback_reason,
  };
}
