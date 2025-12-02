// services/ai/auditFixes.ts
// Fix Application System for Unified Audit - Phase 6
// Applies fixes and maintains history for undo capability

import { v4 as uuidv4 } from 'uuid';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  UnifiedAuditIssue,
  AuditFix,
  AuditFixHistoryEntry,
  EnrichedTopic,
  ContentBrief,
  FoundationPage,
  NavigationStructure,
} from '../../types';
import { getFixInfo, FIX_THRESHOLDS } from '../../config/auditRules';

// =============================================================================
// FIX APPLICATION CONTEXT
// =============================================================================
export interface FixContext {
  supabase: SupabaseClient;
  mapId: string;
  userId: string;
  auditRunId: string;
}

// =============================================================================
// FIX RESULT
// =============================================================================
export interface FixResult {
  success: boolean;
  issueId: string;
  fixId?: string;
  historyEntry?: AuditFixHistoryEntry;
  error?: string;
  message: string;
}

// =============================================================================
// FIX APPLICATION
// =============================================================================

/**
 * Apply a fix for an audit issue
 */
export const applyFix = async (
  issue: UnifiedAuditIssue,
  fix: AuditFix,
  context: FixContext
): Promise<FixResult> => {
  try {
    // Route to appropriate fix handler based on category and rule
    const handler = getFixHandler(issue.category, issue.ruleId);

    if (!handler) {
      return {
        success: false,
        issueId: issue.id,
        error: 'No fix handler available for this issue type',
        message: 'This issue requires manual intervention',
      };
    }

    // Apply the fix
    const result = await handler(issue, fix, context);

    if (result.success && fix.changes) {
      // Record fix in history for undo capability
      const historyEntry = await recordFixHistory(issue, fix, context);
      result.historyEntry = historyEntry;
    }

    return result;
  } catch (error) {
    return {
      success: false,
      issueId: issue.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to apply fix',
    };
  }
};

/**
 * Undo a previously applied fix
 */
export const undoFix = async (
  historyId: string,
  context: FixContext
): Promise<FixResult> => {
  try {
    // Get history entry
    const { data: history, error: historyError } = await context.supabase
      .from('audit_history')
      .select('*')
      .eq('id', historyId)
      .single();

    if (historyError || !history) {
      return {
        success: false,
        issueId: '',
        error: 'History entry not found',
        message: 'Cannot undo - fix history not found',
      };
    }

    if (history.undone_at) {
      return {
        success: false,
        issueId: history.issue_id,
        error: 'Already undone',
        message: 'This fix has already been undone',
      };
    }

    // Revert the change
    const { error: updateError } = await context.supabase
      .from(history.target_table)
      .update({ [history.field]: history.old_value })
      .eq('id', history.target_id);

    if (updateError) {
      return {
        success: false,
        issueId: history.issue_id,
        error: updateError.message,
        message: 'Failed to revert change',
      };
    }

    // Mark as undone
    await context.supabase
      .from('audit_history')
      .update({
        undone_at: new Date().toISOString(),
        undone_by: context.userId,
      })
      .eq('id', historyId);

    return {
      success: true,
      issueId: history.issue_id,
      fixId: historyId,
      message: 'Fix successfully undone',
    };
  } catch (error) {
    return {
      success: false,
      issueId: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to undo fix',
    };
  }
};

/**
 * Apply multiple fixes in batch
 */
export const applyBatchFixes = async (
  issues: UnifiedAuditIssue[],
  fixes: AuditFix[],
  context: FixContext,
  onProgress?: (current: number, total: number) => void
): Promise<FixResult[]> => {
  const results: FixResult[] = [];
  const fixMap = new Map(fixes.map(f => [f.issueId, f]));

  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i];
    const fix = fixMap.get(issue.id);

    if (fix) {
      const result = await applyFix(issue, fix, context);
      results.push(result);
    } else {
      results.push({
        success: false,
        issueId: issue.id,
        message: 'No fix available for this issue',
      });
    }

    onProgress?.(i + 1, issues.length);
  }

  return results;
};

// =============================================================================
// FIX HANDLERS
// =============================================================================

type FixHandler = (
  issue: UnifiedAuditIssue,
  fix: AuditFix,
  context: FixContext
) => Promise<FixResult>;

const getFixHandler = (category: string, ruleId: string): FixHandler | null => {
  const handlers: Record<string, FixHandler> = {
    // Navigation fixes
    'nav-missing-eat-links': handleAddEatLinks,
    'nav-missing-header': handleAcknowledge,
    'nav-missing-footer': handleAcknowledge,

    // Foundation page fixes
    'foundation-incomplete-nap': handleAcknowledge,
    'foundation-missing-homepage': handleAcknowledge,
    'foundation-missing-about': handleAcknowledge,
    'foundation-missing-contact': handleAcknowledge,

    // Hierarchy fixes
    'hierarchy-orphan-topics': handleOrphanTopicFix,

    // Content fixes
    'content-missing-intent': handleAcknowledge,

    // Linking fixes
    'linking-generic-anchors': handleAcknowledge,
  };

  return handlers[ruleId] || null;
};

/**
 * Handler for acknowledging issues that need manual intervention
 */
const handleAcknowledge = async (
  issue: UnifiedAuditIssue,
  _fix: AuditFix,
  _context: FixContext
): Promise<FixResult> => {
  return {
    success: true,
    issueId: issue.id,
    message: `Acknowledged: ${issue.suggestedFix || issue.message}. Please apply this fix manually.`,
  };
};

/**
 * Add E-A-T links to footer
 */
const handleAddEatLinks = async (
  issue: UnifiedAuditIssue,
  fix: AuditFix,
  context: FixContext
): Promise<FixResult> => {
  try {
    // Get current map navigation
    const { data: map, error: mapError } = await context.supabase
      .from('topical_maps')
      .select('navigation')
      .eq('id', context.mapId)
      .single();

    if (mapError || !map) {
      return {
        success: false,
        issueId: issue.id,
        error: 'Failed to fetch map',
        message: 'Could not access topical map',
      };
    }

    const navigation = map.navigation as NavigationStructure || {
      header: { primary_nav: [], cta_button: null, logo_alt_text: '' },
      footer: { sections: [], legal_links: [], nap_display: true, copyright_text: '' },
    };

    // Add missing E-A-T links
    const existingLabels = new Set(
      (navigation.footer?.legal_links || []).map(l => l.label.toLowerCase())
    );

    const requiredLinks = [
      { label: 'About', url: '/about' },
      { label: 'Privacy Policy', url: '/privacy' },
      { label: 'Contact', url: '/contact' },
    ];

    const linksToAdd = requiredLinks.filter(
      link => !existingLabels.has(link.label.toLowerCase())
    );

    if (linksToAdd.length === 0) {
      return {
        success: true,
        issueId: issue.id,
        message: 'All E-A-T links already present',
      };
    }

    const oldValue = navigation.footer?.legal_links || [];
    const newValue = [...oldValue, ...linksToAdd];

    navigation.footer = {
      ...navigation.footer,
      legal_links: newValue,
    };

    // Update map
    const { error: updateError } = await context.supabase
      .from('topical_maps')
      .update({ navigation })
      .eq('id', context.mapId);

    if (updateError) {
      return {
        success: false,
        issueId: issue.id,
        error: updateError.message,
        message: 'Failed to update navigation',
      };
    }

    // Record change in fix
    fix.changes = [{
      table: 'topical_maps',
      id: context.mapId,
      field: 'navigation.footer.legal_links',
      oldValue,
      newValue,
    }];

    return {
      success: true,
      issueId: issue.id,
      fixId: fix.id,
      message: `Added ${linksToAdd.length} E-A-T links to footer`,
    };
  } catch (error) {
    return {
      success: false,
      issueId: issue.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to add E-A-T links',
    };
  }
};

/**
 * Fix orphaned topics by assigning to a pillar
 */
const handleOrphanTopicFix = async (
  issue: UnifiedAuditIssue,
  fix: AuditFix,
  context: FixContext
): Promise<FixResult> => {
  try {
    if (!fix.changes || fix.changes.length === 0) {
      return {
        success: false,
        issueId: issue.id,
        error: 'No target parent specified',
        message: 'Fix requires a target parent topic to be specified',
      };
    }

    const change = fix.changes[0];
    const { error: updateError } = await context.supabase
      .from('topics')
      .update({ parent_topic_id: change.newValue })
      .eq('id', change.id);

    if (updateError) {
      return {
        success: false,
        issueId: issue.id,
        error: updateError.message,
        message: 'Failed to update topic parent',
      };
    }

    return {
      success: true,
      issueId: issue.id,
      fixId: fix.id,
      message: 'Orphaned topic assigned to parent',
    };
  } catch (error) {
    return {
      success: false,
      issueId: issue.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to fix orphaned topic',
    };
  }
};

// =============================================================================
// HISTORY MANAGEMENT
// =============================================================================

/**
 * Record a fix in the history table
 */
const recordFixHistory = async (
  issue: UnifiedAuditIssue,
  fix: AuditFix,
  context: FixContext
): Promise<AuditFixHistoryEntry | undefined> => {
  if (!fix.changes || fix.changes.length === 0) return undefined;

  const change = fix.changes[0];

  const historyEntry: AuditFixHistoryEntry = {
    id: uuidv4(),
    map_id: context.mapId,
    audit_run_id: context.auditRunId,
    category: issue.category,
    issue_id: issue.id,
    fix_description: fix.description,
    changes: [{
      table: change.table,
      id: change.id,
      field: change.field,
      oldValue: change.oldValue,
      newValue: change.newValue,
    }],
    applied_at: new Date().toISOString(),
    applied_by: context.userId,
    can_undo: fix.canUndo,
  };

  const { data, error } = await context.supabase
    .from('audit_history')
    .insert({
      id: historyEntry.id,
      audit_id: context.auditRunId,
      user_id: context.userId,
      issue_id: issue.id,
      category_id: issue.category,
      fix_type: fix.fixType,
      target_table: change.table,
      target_id: change.id,
      field: change.field,
      old_value: change.oldValue,
      new_value: change.newValue,
      description: fix.description,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to record fix history:', error);
    return undefined;
  }

  return data as AuditFixHistoryEntry;
};

/**
 * Get fix history for a map
 */
export const getFixHistory = async (
  mapId: string,
  supabase: SupabaseClient
): Promise<AuditFixHistoryEntry[]> => {
  const { data, error } = await supabase
    .from('audit_history')
    .select(`
      *,
      audit_results!inner(map_id)
    `)
    .eq('audit_results.map_id', mapId)
    .order('applied_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch fix history:', error);
    return [];
  }

  return data as AuditFixHistoryEntry[];
};

/**
 * Get recent fixes that can be undone
 */
export const getUndoableFixes = async (
  mapId: string,
  supabase: SupabaseClient
): Promise<AuditFixHistoryEntry[]> => {
  const { data, error } = await supabase
    .from('audit_history')
    .select(`
      *,
      audit_results!inner(map_id)
    `)
    .eq('audit_results.map_id', mapId)
    .is('undone_at', null)
    .order('applied_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Failed to fetch undoable fixes:', error);
    return [];
  }

  return data as AuditFixHistoryEntry[];
};

// =============================================================================
// FIX GENERATION
// =============================================================================

/**
 * Generate a fix for an issue
 */
export const generateFix = (
  issue: UnifiedAuditIssue
): AuditFix | null => {
  if (!issue.autoFixable) return null;

  const fixInfo = getFixInfo(issue.ruleId);

  return {
    id: uuidv4(),
    issueId: issue.id,
    fixType: fixInfo?.fixType || 'manual',
    description: issue.suggestedFix || `Fix for: ${issue.message}`,
    canUndo: true,
    status: 'pending',
  };
};

/**
 * Generate fixes for all auto-fixable issues
 */
export const generateBatchFixes = (
  issues: UnifiedAuditIssue[]
): AuditFix[] => {
  return issues
    .filter(issue => issue.autoFixable)
    .map(issue => generateFix(issue))
    .filter((fix): fix is AuditFix => fix !== null);
};

export default {
  applyFix,
  undoFix,
  applyBatchFixes,
  getFixHistory,
  getUndoableFixes,
  generateFix,
  generateBatchFixes,
};
