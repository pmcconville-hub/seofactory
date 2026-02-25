/**
 * useActionPlan Hook
 *
 * Central hook for the Strategic Action Plan feature.
 * Manages CRUD state, persistence, AI generation, and stats computation.
 *
 * Created: 2026-02-25 - Content Briefs redesign
 *
 * @module hooks/useActionPlan
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useAppState } from '../state/appState';
import { getSupabaseClient } from '../services/supabaseClient';
import type { EnrichedTopic, BusinessInfo, SEOPillars, SemanticTriple } from '../types';
import type {
  ActionPlan,
  ActionPlanEntry,
  ActionPlanStats,
  ActionPlanStatus,
  ActionType,
  ActionPriority,
} from '../types/actionPlan';
import {
  suggestActionType,
  suggestPriority,
  createInitialEntries,
  generateTopicRationales,
  generateStrategicSummary,
} from '../services/ai/actionPlanService';
import { assignTopicsToWaves } from '../services/waveAssignmentService';
import { rebalanceWaves } from '../services/waveAssignmentService';

// ============================================================================
// TYPES
// ============================================================================

interface UseActionPlanReturn {
  // State
  actionPlan: ActionPlan | null;
  stats: ActionPlanStats;
  isGenerating: boolean;
  generationProgress: string;

  // Actions
  generatePlan: () => Promise<void>;
  approvePlan: () => void;
  resetPlan: () => void;

  // CRUD
  updateEntry: (topicId: string, updates: Partial<ActionPlanEntry>) => void;
  removeEntry: (topicId: string) => void;
  restoreEntry: (topicId: string) => void;
  moveToWave: (topicIds: string[], wave: 1 | 2 | 3 | 4) => void;
  changeActionType: (topicIds: string[], actionType: ActionType) => void;
  rebalance: () => void;
  updateTitle: (topicId: string, newTitle: string) => void;

  // Getters
  getEntriesByWave: (wave: 1 | 2 | 3 | 4) => ActionPlanEntry[];
  getActiveEntries: () => ActionPlanEntry[];
}

// ============================================================================
// STATS COMPUTATION
// ============================================================================

function computeStats(entries: ActionPlanEntry[]): ActionPlanStats {
  const active = entries.filter(e => !e.removed);

  const byAction: Record<ActionType, number> = {
    KEEP: 0, OPTIMIZE: 0, REWRITE: 0, MERGE: 0,
    REDIRECT_301: 0, PRUNE_410: 0, CANONICALIZE: 0, CREATE_NEW: 0,
  };
  const byWave: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const byWaveAndAction: Record<1 | 2 | 3 | 4, Record<ActionType, number>> = {
    1: { ...byAction }, 2: { ...byAction }, 3: { ...byAction }, 4: { ...byAction },
  };

  for (const entry of active) {
    byAction[entry.actionType]++;
    byWave[entry.wave]++;
    byWaveAndAction[entry.wave][entry.actionType]++;
  }

  return {
    total: active.length,
    byAction,
    byWave,
    byWaveAndAction,
    existingPages: active.filter(e =>
      e.actionType === 'OPTIMIZE' || e.actionType === 'REWRITE' || e.actionType === 'KEEP'
    ).length,
    newPages: active.filter(e => e.actionType === 'CREATE_NEW').length,
    removals: active.filter(e =>
      e.actionType === 'PRUNE_410' || e.actionType === 'REDIRECT_301'
    ).length,
  };
}

// ============================================================================
// HOOK
// ============================================================================

export function useActionPlan(
  topics: EnrichedTopic[],
  businessInfo: BusinessInfo,
  pillars: SEOPillars | undefined,
  eavs: SemanticTriple[],
  mapId: string | null
): UseActionPlanReturn {
  const { state, dispatch } = useAppState();

  // Load from persisted state on mount
  const activeMap = useMemo(
    () => state.topicalMaps.find(m => m.id === mapId),
    [state.topicalMaps, mapId]
  );
  const persistedPlan = activeMap?.action_plan;

  const [actionPlan, setActionPlan] = useState<ActionPlan | null>(persistedPlan ?? null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');

  // Sync with persisted state when it changes from external sources
  useEffect(() => {
    if (persistedPlan) {
      setActionPlan(prev => prev ?? persistedPlan);
    }
  }, [persistedPlan]);

  // ──── Persistence (500ms debounce) ────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistPlan = useCallback((plan: ActionPlan) => {
    if (!mapId) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      // Update React state
      dispatch({
        type: 'UPDATE_MAP_DATA',
        payload: { mapId, data: { action_plan: plan } },
      });

      // Persist to Supabase
      try {
        const supabase = getSupabaseClient(
          businessInfo.supabaseUrl,
          businessInfo.supabaseAnonKey
        );
        await supabase
          .from('topical_maps')
          .update({ action_plan: plan } as any)
          .eq('id', mapId);
      } catch (err) {
        console.warn('[useActionPlan] Supabase save failed:', err);
      }
    }, 500);
  }, [mapId, businessInfo.supabaseUrl, businessInfo.supabaseAnonKey, dispatch]);

  // Helper to update and persist
  const updatePlan = useCallback((updater: (prev: ActionPlan) => ActionPlan) => {
    setActionPlan(prev => {
      const current = prev ?? { status: 'draft' as const, entries: [] };
      const next = updater(current);
      persistPlan(next);
      return next;
    });
  }, [persistPlan]);

  // ──── Stats ────
  const stats = useMemo<ActionPlanStats>(() => {
    if (!actionPlan) return computeStats([]);
    return computeStats(actionPlan.entries);
  }, [actionPlan]);

  // ──── Generate Plan ────
  const generatePlan = useCallback(async () => {
    if (!pillars?.centralEntity || topics.length === 0) return;
    setIsGenerating(true);
    setGenerationProgress('Initializing action plan...');

    try {
      // Step 1: Get wave assignments from the proper service
      const { waves } = assignTopicsToWaves(topics, 'monetization_first');
      const waveMap = new Map<string, 1 | 2 | 3 | 4>();
      for (const wave of waves) {
        for (const topicId of wave.topicIds) {
          waveMap.set(topicId, wave.number);
        }
      }

      // Step 2: Create initial entries
      const initialEntries = createInitialEntries(topics, waveMap);

      // Update plan with initial entries (draft state)
      const draftPlan: ActionPlan = {
        status: 'generating',
        entries: initialEntries,
        generatedAt: new Date().toISOString(),
      };
      setActionPlan(draftPlan);
      setGenerationProgress('Generating AI rationales...');

      // Step 3: Generate AI rationales in batches
      const rationales = await generateTopicRationales(
        topics,
        businessInfo,
        pillars,
        eavs,
        dispatch
      );

      // Step 4: Merge rationales into entries
      const enrichedEntries = initialEntries.map(entry => {
        const rationale = rationales.find(r => r.topicId === entry.topicId);
        if (rationale) {
          return {
            ...entry,
            actionType: rationale.actionType,
            priority: rationale.priority,
            suggestedWave: rationale.suggestedWave,
            wave: rationale.suggestedWave,
            rationale: rationale.rationale,
          };
        }
        return entry;
      });

      setGenerationProgress('Generating strategic summary...');

      // Step 5: Generate strategic summary
      const summary = await generateStrategicSummary(
        enrichedEntries,
        topics,
        businessInfo,
        pillars,
        dispatch
      );

      // Step 6: Finalize the plan
      const finalPlan: ActionPlan = {
        status: 'ready',
        entries: enrichedEntries,
        strategicSummary: summary,
        generatedAt: new Date().toISOString(),
      };

      setActionPlan(finalPlan);
      persistPlan(finalPlan);
    } catch (error) {
      console.error('[useActionPlan] Generation failed:', error);
      dispatch({
        type: 'LOG_EVENT',
        payload: {
          service: 'ActionPlan',
          message: `Action plan generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          status: 'failure',
          timestamp: Date.now(),
        },
      });
    } finally {
      setIsGenerating(false);
      setGenerationProgress('');
    }
  }, [topics, businessInfo, pillars, eavs, dispatch, persistPlan]);

  // ──── Approve ────
  const approvePlan = useCallback(() => {
    updatePlan(plan => ({
      ...plan,
      status: 'approved',
      approvedAt: new Date().toISOString(),
    }));
  }, [updatePlan]);

  // ──── Reset ────
  const resetPlan = useCallback(() => {
    setActionPlan(null);
    if (mapId) {
      dispatch({
        type: 'UPDATE_MAP_DATA',
        payload: { mapId, data: { action_plan: null } },
      });
    }
  }, [mapId, dispatch]);

  // ──── CRUD: Update Entry ────
  const updateEntry = useCallback((topicId: string, updates: Partial<ActionPlanEntry>) => {
    updatePlan(plan => ({
      ...plan,
      entries: plan.entries.map(e =>
        e.topicId === topicId ? { ...e, ...updates } : e
      ),
    }));
  }, [updatePlan]);

  // ──── CRUD: Remove Entry ────
  const removeEntry = useCallback((topicId: string) => {
    updatePlan(plan => ({
      ...plan,
      entries: plan.entries.map(e =>
        e.topicId === topicId ? { ...e, removed: true } : e
      ),
    }));
  }, [updatePlan]);

  // ──── CRUD: Restore Entry ────
  const restoreEntry = useCallback((topicId: string) => {
    updatePlan(plan => ({
      ...plan,
      entries: plan.entries.map(e =>
        e.topicId === topicId ? { ...e, removed: false } : e
      ),
    }));
  }, [updatePlan]);

  // ──── CRUD: Move to Wave ────
  const moveToWave = useCallback((topicIds: string[], wave: 1 | 2 | 3 | 4) => {
    const idSet = new Set(topicIds);
    updatePlan(plan => ({
      ...plan,
      entries: plan.entries.map(e =>
        idSet.has(e.topicId) ? { ...e, wave, pinned: true } : e
      ),
    }));
  }, [updatePlan]);

  // ──── CRUD: Change Action Type ────
  const changeActionType = useCallback((topicIds: string[], actionType: ActionType) => {
    const idSet = new Set(topicIds);
    updatePlan(plan => ({
      ...plan,
      entries: plan.entries.map(e =>
        idSet.has(e.topicId) ? { ...e, actionType } : e
      ),
    }));
  }, [updatePlan]);

  // ──── Rebalance ────
  const rebalance = useCallback(() => {
    if (!actionPlan) return;
    const active = actionPlan.entries.filter(e => !e.removed);
    const newWaves = rebalanceWaves(active);

    updatePlan(plan => ({
      ...plan,
      entries: plan.entries.map(e => {
        const newWave = newWaves.get(e.topicId);
        return newWave ? { ...e, wave: newWave } : e;
      }),
    }));
  }, [actionPlan, updatePlan]);

  // ──── Update Title (inline edit) ────
  // Note: This updates the topic title in state, not the action plan entry itself
  const updateTitle = useCallback((_topicId: string, _newTitle: string) => {
    // Topic title editing is handled by the parent component via dispatch
    // This is a placeholder that gets wired in the UI layer
  }, []);

  // ──── Getters ────
  const getEntriesByWave = useCallback((wave: 1 | 2 | 3 | 4): ActionPlanEntry[] => {
    if (!actionPlan) return [];
    return actionPlan.entries.filter(e => e.wave === wave && !e.removed);
  }, [actionPlan]);

  const getActiveEntries = useCallback((): ActionPlanEntry[] => {
    if (!actionPlan) return [];
    return actionPlan.entries.filter(e => !e.removed);
  }, [actionPlan]);

  return {
    actionPlan,
    stats,
    isGenerating,
    generationProgress,
    generatePlan,
    approvePlan,
    resetPlan,
    updateEntry,
    removeEntry,
    restoreEntry,
    moveToWave,
    changeActionType,
    rebalance,
    updateTitle,
    getEntriesByWave,
    getActiveEntries,
  };
}
