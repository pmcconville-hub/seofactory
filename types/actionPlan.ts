/**
 * Action Plan Types Module
 *
 * Types for the Strategic Action Plan feature in the Content Briefs pipeline step.
 * Supports topic-level action type assignment, wave management, and AI-generated rationales.
 *
 * Created: 2026-02-25 - Content Briefs redesign
 *
 * @module types/actionPlan
 */

import type { ActionType } from './migration';

// Re-export ActionType for convenience
export type { ActionType } from './migration';

/**
 * Priority level for an action plan entry
 */
export type ActionPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Status of the action plan
 */
export type ActionPlanStatus = 'draft' | 'generating' | 'ready' | 'approved';

/**
 * Individual topic entry in the action plan
 */
export interface ActionPlanEntry {
  topicId: string;
  actionType: ActionType;
  priority: ActionPriority;
  wave: 1 | 2 | 3 | 4;
  rationale: string;
  suggestedWave?: 1 | 2 | 3 | 4;
  pinned?: boolean; // User pinned this topic to a specific wave (prevents AI rebalance)
  removed?: boolean; // User removed this topic from the plan
}

/**
 * Stats computed from the action plan entries
 */
export interface ActionPlanStats {
  total: number;
  byAction: Record<ActionType, number>;
  byWave: Record<1 | 2 | 3 | 4, number>;
  byWaveAndAction: Record<1 | 2 | 3 | 4, Record<ActionType, number>>;
  existingPages: number;
  newPages: number;
  removals: number; // PRUNE_410 + REDIRECT_301
}

/**
 * The full action plan stored on a topical map
 */
export interface ActionPlan {
  status: ActionPlanStatus;
  entries: ActionPlanEntry[];
  strategicSummary?: string;
  generatedAt?: string;
  approvedAt?: string;
}

/**
 * Action type display configuration
 */
export interface ActionTypeConfig {
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

/**
 * Action type display configuration map
 */
export const ACTION_TYPE_CONFIGS: Record<ActionType, ActionTypeConfig> = {
  CREATE_NEW: {
    label: 'Create New',
    shortLabel: 'New',
    color: 'text-emerald-300',
    bgColor: 'bg-emerald-900/20',
    borderColor: 'border-emerald-500/30',
    description: 'Create a new page from scratch',
  },
  OPTIMIZE: {
    label: 'Optimize',
    shortLabel: 'Optimize',
    color: 'text-blue-300',
    bgColor: 'bg-blue-900/20',
    borderColor: 'border-blue-500/30',
    description: 'Optimize an existing page with updated content',
  },
  REWRITE: {
    label: 'Rewrite',
    shortLabel: 'Rewrite',
    color: 'text-amber-300',
    bgColor: 'bg-amber-900/20',
    borderColor: 'border-amber-500/30',
    description: 'Completely rewrite the existing page content',
  },
  KEEP: {
    label: 'Keep As-Is',
    shortLabel: 'Keep',
    color: 'text-gray-300',
    bgColor: 'bg-gray-700/20',
    borderColor: 'border-gray-500/30',
    description: 'Keep the existing page without changes',
  },
  MERGE: {
    label: 'Merge',
    shortLabel: 'Merge',
    color: 'text-purple-300',
    bgColor: 'bg-purple-900/20',
    borderColor: 'border-purple-500/30',
    description: 'Merge with another page to consolidate content',
  },
  REDIRECT_301: {
    label: 'Redirect (301)',
    shortLabel: '301',
    color: 'text-orange-300',
    bgColor: 'bg-orange-900/20',
    borderColor: 'border-orange-500/30',
    description: 'Redirect this URL permanently to a better page',
  },
  PRUNE_410: {
    label: 'Prune (410)',
    shortLabel: '410',
    color: 'text-red-300',
    bgColor: 'bg-red-900/20',
    borderColor: 'border-red-500/30',
    description: 'Remove this page permanently (410 Gone)',
  },
  CANONICALIZE: {
    label: 'Canonicalize',
    shortLabel: 'Canon.',
    color: 'text-cyan-300',
    bgColor: 'bg-cyan-900/20',
    borderColor: 'border-cyan-500/30',
    description: 'Point canonical to the preferred version of this page',
  },
};
