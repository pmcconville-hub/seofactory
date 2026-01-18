/**
 * Template A/B Test Service
 *
 * Manages A/B testing for content templates. Handles test creation,
 * variant assignment, and results tracking.
 *
 * Created: 2026-01-18 - Content Template Routing Phase 3 Task 23
 *
 * @module services/templateABTestService
 */

import { getSupabaseClient } from './supabaseClient';
import { TemplateName } from '../types/contentTemplates';
import { WebsiteType } from '../types';

// NOTE: Tables template_ab_tests and template_ab_assignments are created by
// migration 20260118000001_template_ab_tests.sql. Until the migration is applied
// and types are regenerated, we use 'any' type assertions for these tables.

// =============================================================================
// Types
// =============================================================================

export interface ABTest {
  id: string;
  name: string;
  description?: string;
  controlTemplate: TemplateName;
  variantTemplate: TemplateName;
  trafficSplit: number;
  isActive: boolean;
  websiteTypes?: WebsiteType[];
  minAuthorityScore?: number;
  startDate?: string;
  endDate?: string;
  controlCount?: number;
  variantCount?: number;
  controlAvgAuditScore?: number;
  variantAvgAuditScore?: number;
}

export interface ABAssignment {
  testId: string;
  variant: 'control' | 'variant';
  template: TemplateName;
}

export interface ABTestResults {
  control: {
    count: number;
    avgAuditScore: number;
    avgComplianceScore: number;
    avgGenerationTime: number;
  };
  variant: {
    count: number;
    avgAuditScore: number;
    avgComplianceScore: number;
    avgGenerationTime: number;
  };
  sampleSize: number;
  isSignificant: boolean;
  winner?: 'control' | 'variant' | 'tie';
}

// =============================================================================
// Get Active A/B Test
// =============================================================================

/**
 * Get active A/B test for given context
 *
 * Finds an active test that applies to the current website type and
 * authority score. Returns null if no test applies.
 *
 * @param websiteType - The website type to match
 * @param authorityScore - Optional authority score for targeting
 * @returns Active A/B test or null
 */
export async function getActiveABTest(
  websiteType: WebsiteType,
  authorityScore?: number,
  supabaseUrl?: string,
  supabaseAnonKey?: string
): Promise<ABTest | null> {
  try {
    const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);
    const now = new Date().toISOString();

    const { data, error } = await (supabase
      .from('template_ab_tests' as any) as any)
      .select('*')
      .eq('is_active', true)
      .lte('start_date', now)
      .or(`end_date.is.null,end_date.gte.${now}`)
      .limit(1);

    if (error || !data || data.length === 0) return null;

    const test = data[0];

    // Check website type targeting
    if (test.website_types && test.website_types.length > 0) {
      if (!test.website_types.includes(websiteType)) {
        return null;
      }
    }

    // Check authority score requirement
    if (test.min_authority_score && authorityScore !== undefined) {
      if (authorityScore < test.min_authority_score) {
        return null;
      }
    }

    return {
      id: test.id,
      name: test.name,
      description: test.description,
      controlTemplate: test.control_template as TemplateName,
      variantTemplate: test.variant_template as TemplateName,
      trafficSplit: parseFloat(test.traffic_split),
      isActive: test.is_active,
      websiteTypes: test.website_types,
      minAuthorityScore: test.min_authority_score,
      startDate: test.start_date,
      endDate: test.end_date,
      controlCount: test.control_count,
      variantCount: test.variant_count,
      controlAvgAuditScore: test.control_avg_audit_score,
      variantAvgAuditScore: test.variant_avg_audit_score,
    };
  } catch (error) {
    console.error('[ABTest] Failed to get active test:', error);
    return null;
  }
}

// =============================================================================
// Hash Function for Deterministic Assignment
// =============================================================================

/**
 * Simple hash function for deterministic variant assignment
 *
 * Uses job ID to ensure same job always gets same variant.
 *
 * @param str - String to hash (typically job ID)
 * @returns Hash code
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

// =============================================================================
// Assign to A/B Test
// =============================================================================

/**
 * Assign user to A/B test variant
 *
 * Uses deterministic hashing based on job ID to ensure consistent
 * variant assignment for the same job.
 *
 * @param test - The A/B test to assign to
 * @param jobId - Job ID for deterministic assignment
 * @returns Assignment with variant and template
 */
export async function assignToABTest(
  test: ABTest,
  jobId: string,
  supabaseUrl?: string,
  supabaseAnonKey?: string
): Promise<ABAssignment> {
  // Deterministic assignment based on job ID hash
  const hash = hashCode(jobId);
  const normalizedHash = Math.abs(hash) / 2147483647; // Normalize to 0-1
  const isVariant = normalizedHash > test.trafficSplit;

  const assignment: ABAssignment = {
    testId: test.id,
    variant: isVariant ? 'variant' : 'control',
    template: isVariant ? test.variantTemplate : test.controlTemplate,
  };

  // Record assignment in database
  try {
    const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);
    const { data: user } = await supabase.auth.getUser();

    await (supabase
      .from('template_ab_assignments' as any) as any)
      .insert({
        test_id: test.id,
        job_id: jobId,
        user_id: user?.user?.id,
        assigned_variant: assignment.variant,
        assigned_template: assignment.template,
      });
  } catch (error) {
    console.error('[ABTest] Failed to record assignment:', error);
    // Don't throw - assignment is still valid even if recording fails
  }

  return assignment;
}

// =============================================================================
// Record A/B Outcome
// =============================================================================

/**
 * Update A/B assignment with outcome
 *
 * Records the final metrics after content generation completes.
 *
 * @param jobId - Job ID to update
 * @param auditScore - Final audit score
 * @param templateComplianceScore - Template compliance score
 * @param generationTimeMs - Total generation time in milliseconds
 */
export async function recordABOutcome(
  jobId: string,
  auditScore: number,
  templateComplianceScore: number,
  generationTimeMs: number,
  supabaseUrl?: string,
  supabaseAnonKey?: string
): Promise<{ success: boolean; error?: unknown }> {
  try {
    const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);

    const { error } = await (supabase
      .from('template_ab_assignments' as any) as any)
      .update({
        audit_score: auditScore,
        template_compliance_score: templateComplianceScore,
        generation_time_ms: generationTimeMs,
        completed_at: new Date().toISOString(),
      })
      .eq('job_id', jobId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('[ABTest] Failed to record outcome:', error);
    return { success: false, error };
  }
}

// =============================================================================
// Get A/B Test Results
// =============================================================================

/**
 * Get A/B test results
 *
 * Aggregates outcomes for both variants and calculates basic statistics.
 *
 * @param testId - Test ID to get results for
 * @returns Aggregated results for control and variant
 */
export async function getABTestResults(
  testId: string,
  supabaseUrl?: string,
  supabaseAnonKey?: string
): Promise<ABTestResults | null> {
  try {
    const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await (supabase
      .from('template_ab_assignments' as any) as any)
      .select('*')
      .eq('test_id', testId)
      .not('completed_at', 'is', null);

    if (error) throw error;

    const control = (data || []).filter(d => d.assigned_variant === 'control');
    const variant = (data || []).filter(d => d.assigned_variant === 'variant');

    const avgScore = (arr: any[], field: string) =>
      arr.length > 0
        ? Math.round(arr.reduce((sum, d) => sum + (d[field] || 0), 0) / arr.length)
        : 0;

    const controlAvg = avgScore(control, 'audit_score');
    const variantAvg = avgScore(variant, 'audit_score');

    // Basic significance check (would need proper stats lib for real significance)
    const sampleSize = control.length + variant.length;
    const isSignificant = sampleSize >= 30 && Math.abs(controlAvg - variantAvg) > 5;

    let winner: 'control' | 'variant' | 'tie' | undefined;
    if (isSignificant) {
      if (controlAvg > variantAvg) winner = 'control';
      else if (variantAvg > controlAvg) winner = 'variant';
      else winner = 'tie';
    }

    return {
      control: {
        count: control.length,
        avgAuditScore: controlAvg,
        avgComplianceScore: avgScore(control, 'template_compliance_score'),
        avgGenerationTime: avgScore(control, 'generation_time_ms'),
      },
      variant: {
        count: variant.length,
        avgAuditScore: variantAvg,
        avgComplianceScore: avgScore(variant, 'template_compliance_score'),
        avgGenerationTime: avgScore(variant, 'generation_time_ms'),
      },
      sampleSize,
      isSignificant,
      winner,
    };
  } catch (error) {
    console.error('[ABTest] Failed to get results:', error);
    return null;
  }
}

// =============================================================================
// List All A/B Tests
// =============================================================================

/**
 * List all A/B tests
 *
 * Returns all tests, optionally filtered by active status.
 *
 * @param activeOnly - Only return active tests
 * @returns Array of A/B tests
 */
export async function listABTests(
  activeOnly: boolean = false,
  supabaseUrl?: string,
  supabaseAnonKey?: string
): Promise<ABTest[]> {
  try {
    const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);

    let query = (supabase
      .from('template_ab_tests' as any) as any)
      .select('*')
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(test => ({
      id: test.id,
      name: test.name,
      description: test.description,
      controlTemplate: test.control_template as TemplateName,
      variantTemplate: test.variant_template as TemplateName,
      trafficSplit: parseFloat(test.traffic_split),
      isActive: test.is_active,
      websiteTypes: test.website_types,
      minAuthorityScore: test.min_authority_score,
      startDate: test.start_date,
      endDate: test.end_date,
      controlCount: test.control_count,
      variantCount: test.variant_count,
      controlAvgAuditScore: test.control_avg_audit_score,
      variantAvgAuditScore: test.variant_avg_audit_score,
    }));
  } catch (error) {
    console.error('[ABTest] Failed to list tests:', error);
    return [];
  }
}

// =============================================================================
// Check If Job Has Assignment
// =============================================================================

/**
 * Check if a job already has an A/B test assignment
 *
 * Prevents duplicate assignments for the same job.
 *
 * @param jobId - Job ID to check
 * @returns Assignment if exists, null otherwise
 */
export async function getExistingAssignment(
  jobId: string,
  supabaseUrl?: string,
  supabaseAnonKey?: string
): Promise<ABAssignment | null> {
  try {
    const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await (supabase
      .from('template_ab_assignments' as any) as any)
      .select('test_id, assigned_variant, assigned_template')
      .eq('job_id', jobId)
      .single();

    if (error || !data) return null;

    return {
      testId: data.test_id,
      variant: data.assigned_variant as 'control' | 'variant',
      template: data.assigned_template as TemplateName,
    };
  } catch (error) {
    return null;
  }
}
