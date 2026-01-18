/**
 * Template Analytics Service
 *
 * Tracks template selection and performance metrics for content generation.
 * Provides functions to record template choices, generation outcomes, and
 * aggregate performance statistics.
 *
 * Created: 2026-01-18 - Content Template Routing Phase 3 Task 22
 *
 * @module services/templateAnalyticsService
 */

import { getSupabaseClient } from './supabaseClient';
import { TemplateName, DepthMode } from '../types/contentTemplates';

// NOTE: Table content_template_analytics is created by migration
// 20260118000000_template_analytics.sql. Until the migration is applied
// and types are regenerated, we use 'any' type assertions for this table.

// =============================================================================
// Types
// =============================================================================

export interface TemplateSelectionData {
  jobId: string;
  briefId?: string;
  selectedTemplate: TemplateName;
  templateConfidence?: number;
  aiRecommendedTemplate?: TemplateName;
  userOverrodeRecommendation?: boolean;
  depthMode?: DepthMode;
  targetWordCount?: { min: number; max: number };
}

export interface GenerationCompleteData {
  jobId: string;
  generationTimeMs: number;
  totalPassesCompleted: number;
  finalAuditScore: number;
  templateComplianceScore?: number;
  finalWordCount: number;
  finalSectionCount: number;
}

export interface TemplateStats {
  count: number;
  avgAuditScore: number;
  avgComplianceScore: number;
  avgGenerationTime: number;
  avgWordCount: number;
  overrideRate: number;
}

export interface TemplatePerformanceResult {
  success: boolean;
  stats: Record<string, TemplateStats>;
  error?: unknown;
}

// =============================================================================
// Track Template Selection
// =============================================================================

/**
 * Track template selection at start of generation
 *
 * Records the template chosen by the user or AI, along with confidence scores
 * and depth settings. Called when content generation begins.
 *
 * @param data - Template selection data including job ID and template choice
 * @returns Success status
 */
export async function trackTemplateSelection(
  data: TemplateSelectionData,
  supabaseUrl?: string,
  supabaseAnonKey?: string
): Promise<{ success: boolean; error?: unknown }> {
  try {
    const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);
    const { data: user } = await supabase.auth.getUser();

    const { error } = await (supabase
      .from('content_template_analytics' as any) as any)
      .insert({
        job_id: data.jobId,
        brief_id: data.briefId,
        user_id: user?.user?.id,
        selected_template: data.selectedTemplate,
        template_confidence: data.templateConfidence,
        ai_recommended_template: data.aiRecommendedTemplate,
        user_overrode_recommendation: data.userOverrodeRecommendation ?? false,
        depth_mode: data.depthMode,
        target_word_count_min: data.targetWordCount?.min,
        target_word_count_max: data.targetWordCount?.max,
      });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('[TemplateAnalytics] Failed to track selection:', error);
    return { success: false, error };
  }
}

// =============================================================================
// Track Generation Complete
// =============================================================================

/**
 * Update analytics when generation completes
 *
 * Records the final metrics including audit score, word count, and generation time.
 * Called when content generation finishes successfully.
 *
 * @param data - Generation completion data including metrics
 * @returns Success status
 */
export async function trackGenerationComplete(
  data: GenerationCompleteData,
  supabaseUrl?: string,
  supabaseAnonKey?: string
): Promise<{ success: boolean; error?: unknown }> {
  try {
    const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);

    const { error } = await (supabase
      .from('content_template_analytics' as any) as any)
      .update({
        generation_time_ms: data.generationTimeMs,
        total_passes_completed: data.totalPassesCompleted,
        final_audit_score: data.finalAuditScore,
        template_compliance_score: data.templateComplianceScore,
        final_word_count: data.finalWordCount,
        final_section_count: data.finalSectionCount,
        completed_at: new Date().toISOString(),
      })
      .eq('job_id', data.jobId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('[TemplateAnalytics] Failed to track completion:', error);
    return { success: false, error };
  }
}

// =============================================================================
// Get Performance Stats
// =============================================================================

/**
 * Get performance statistics for templates
 *
 * Aggregates metrics across completed generations to show how different
 * templates perform. Can filter by template name and date range.
 *
 * @param templateName - Optional specific template to filter by
 * @param dateRange - Optional date range filter
 * @returns Aggregated statistics by template
 */
export async function getTemplatePerformanceStats(
  templateName?: TemplateName,
  dateRange?: { start: Date; end: Date },
  supabaseUrl?: string,
  supabaseAnonKey?: string
): Promise<TemplatePerformanceResult> {
  try {
    const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);

    let query = (supabase
      .from('content_template_analytics' as any) as any)
      .select('*')
      .not('completed_at', 'is', null);

    if (templateName) {
      query = query.eq('selected_template', templateName);
    }

    if (dateRange) {
      query = query
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    // Aggregate stats by template
    const stats = (data || []).reduce((acc, row) => {
      const template = row.selected_template;
      if (!acc[template]) {
        acc[template] = {
          count: 0,
          avgAuditScore: 0,
          avgComplianceScore: 0,
          avgGenerationTime: 0,
          avgWordCount: 0,
          overrideRate: 0,
        };
      }
      acc[template].count++;
      acc[template].avgAuditScore += row.final_audit_score || 0;
      acc[template].avgComplianceScore += row.template_compliance_score || 0;
      acc[template].avgGenerationTime += row.generation_time_ms || 0;
      acc[template].avgWordCount += row.final_word_count || 0;
      acc[template].overrideRate += row.user_overrode_recommendation ? 1 : 0;
      return acc;
    }, {} as Record<string, TemplateStats>);

    // Calculate averages
    for (const template of Object.keys(stats)) {
      const s = stats[template];
      if (s.count > 0) {
        s.avgAuditScore = Math.round(s.avgAuditScore / s.count);
        s.avgComplianceScore = Math.round(s.avgComplianceScore / s.count);
        s.avgGenerationTime = Math.round(s.avgGenerationTime / s.count);
        s.avgWordCount = Math.round(s.avgWordCount / s.count);
        s.overrideRate = Math.round((s.overrideRate / s.count) * 100);
      }
    }

    return { success: true, stats };
  } catch (error) {
    console.error('[TemplateAnalytics] Failed to get stats:', error);
    return { success: false, error, stats: {} };
  }
}

// =============================================================================
// Get User Template History
// =============================================================================

/**
 * Get template usage history for current user
 *
 * Returns recent template selections with their outcomes for the logged-in user.
 *
 * @param limit - Maximum number of records to return
 * @returns Array of template analytics records
 */
export async function getUserTemplateHistory(
  limit: number = 20,
  supabaseUrl?: string,
  supabaseAnonKey?: string
): Promise<{ success: boolean; data?: any[]; error?: unknown }> {
  try {
    const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await (supabase
      .from('content_template_analytics' as any) as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('[TemplateAnalytics] Failed to get history:', error);
    return { success: false, error };
  }
}

// =============================================================================
// Get Template Recommendation Stats
// =============================================================================

/**
 * Get statistics about AI recommendation accuracy
 *
 * Shows how often users accept AI recommendations and whether overrides
 * lead to better or worse outcomes.
 *
 * @returns Statistics about AI recommendation acceptance and outcomes
 */
export async function getRecommendationAccuracyStats(
  supabaseUrl?: string,
  supabaseAnonKey?: string
): Promise<{
  success: boolean;
  stats?: {
    totalSelections: number;
    acceptedRecommendations: number;
    overriddenRecommendations: number;
    avgScoreWhenAccepted: number;
    avgScoreWhenOverridden: number;
  };
  error?: unknown;
}> {
  try {
    const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await (supabase
      .from('content_template_analytics' as any) as any)
      .select('*')
      .not('completed_at', 'is', null);

    if (error) throw error;

    const accepted = (data || []).filter(d => !d.user_overrode_recommendation);
    const overridden = (data || []).filter(d => d.user_overrode_recommendation);

    const avgScore = (arr: any[]) =>
      arr.length > 0
        ? Math.round(arr.reduce((sum, d) => sum + (d.final_audit_score || 0), 0) / arr.length)
        : 0;

    return {
      success: true,
      stats: {
        totalSelections: (data || []).length,
        acceptedRecommendations: accepted.length,
        overriddenRecommendations: overridden.length,
        avgScoreWhenAccepted: avgScore(accepted),
        avgScoreWhenOverridden: avgScore(overridden),
      },
    };
  } catch (error) {
    console.error('[TemplateAnalytics] Failed to get recommendation stats:', error);
    return { success: false, error };
  }
}
