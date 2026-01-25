/**
 * useDesignInheritance Hook
 *
 * React hook for managing design inheritance in components.
 * Provides resolved design settings based on the inheritance hierarchy.
 *
 * @module hooks/useDesignInheritance
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DesignInheritanceService,
  initDesignInheritanceService,
} from '../services/publishing/designInheritance';
import type {
  DesignTokens,
  DesignPreferences,
  DesignInheritance,
  ResolvedDesignSettings,
  DesignFeedback,
} from '../types/publishing';
import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export interface UseDesignInheritanceOptions {
  /** Supabase client instance */
  supabase: SupabaseClient;

  /** Project ID to load inheritance for */
  projectId: string;

  /** Optional topical map ID for map-level overrides */
  topicalMapId?: string;

  /** Optional article-level overrides */
  articleOverrides?: Partial<DesignPreferences>;

  /** Skip loading on mount (for manual control) */
  skipInitialLoad?: boolean;
}

export interface UseDesignInheritanceReturn {
  /** Whether data is loading */
  isLoading: boolean;

  /** Error message if loading failed */
  error: string | null;

  /** Full inheritance hierarchy */
  hierarchy: DesignInheritance | null;

  /** Resolved design tokens */
  tokens: DesignTokens | null;

  /** Resolved design preferences */
  preferences: DesignPreferences | null;

  /** Source of current settings */
  inheritanceSource: ResolvedDesignSettings['inheritanceSource'] | null;

  /** Reload inheritance data */
  reload: () => Promise<void>;

  /** Update project-level preferences */
  updateProjectPreferences: (prefs: Partial<DesignPreferences>) => Promise<void>;

  /** Update topical map-level preferences */
  updateMapPreferences: (prefs: Partial<DesignPreferences>) => Promise<void>;

  /** Record design feedback for learning */
  recordFeedback: (feedback: DesignFeedback) => Promise<void>;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook for managing design inheritance in React components
 *
 * @example
 * ```tsx
 * const {
 *   tokens,
 *   preferences,
 *   inheritanceSource,
 *   isLoading,
 * } = useDesignInheritance({
 *   supabase,
 *   projectId: 'project-123',
 *   topicalMapId: 'map-456',
 * });
 *
 * if (isLoading) return <Spinner />;
 *
 * return (
 *   <div style={{ color: tokens?.colors.primary }}>
 *     <p>Settings from: {inheritanceSource?.preferences}</p>
 *   </div>
 * );
 * ```
 */
export function useDesignInheritance(
  options: UseDesignInheritanceOptions
): UseDesignInheritanceReturn {
  const { supabase, projectId, topicalMapId, articleOverrides, skipInitialLoad } = options;

  // State
  const [isLoading, setIsLoading] = useState(!skipInitialLoad);
  const [error, setError] = useState<string | null>(null);
  const [hierarchy, setHierarchy] = useState<DesignInheritance | null>(null);
  const [resolved, setResolved] = useState<ResolvedDesignSettings | null>(null);

  // Service ref
  const serviceRef = useRef<DesignInheritanceService | null>(null);

  // Initialize service
  useEffect(() => {
    serviceRef.current = initDesignInheritanceService(supabase);
  }, [supabase]);

  /**
   * Load inheritance data
   */
  const loadInheritance = useCallback(async () => {
    if (!serviceRef.current) {
      setError('Service not initialized');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Load hierarchy and resolve settings in parallel
      const [loadedHierarchy, resolvedSettings] = await Promise.all([
        serviceRef.current.loadInheritanceHierarchy(projectId, topicalMapId),
        serviceRef.current.resolveDesignSettings(projectId, topicalMapId, articleOverrides),
      ]);

      setHierarchy(loadedHierarchy);
      setResolved(resolvedSettings);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load design inheritance';
      setError(message);
      console.error('[useDesignInheritance] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, topicalMapId, articleOverrides]);

  // Load on mount and when dependencies change
  useEffect(() => {
    if (!skipInitialLoad) {
      loadInheritance();
    }
  }, [loadInheritance, skipInitialLoad]);

  /**
   * Update project-level preferences
   */
  const updateProjectPreferences = useCallback(
    async (prefs: Partial<DesignPreferences>) => {
      if (!serviceRef.current) {
        throw new Error('Service not initialized');
      }

      await serviceRef.current.saveProjectDefaults(projectId, {
        component_preferences: prefs.layoutPatterns || {},
        spacing_preference:
          prefs.visualRhythm?.defaultPacing === 'dense'
            ? 'compact'
            : prefs.visualRhythm?.defaultPacing === 'spacious'
            ? 'generous'
            : 'normal',
      });

      // Reload to get updated values
      await loadInheritance();
    },
    [projectId, loadInheritance]
  );

  /**
   * Update topical map-level preferences
   */
  const updateMapPreferences = useCallback(
    async (prefs: Partial<DesignPreferences>) => {
      if (!serviceRef.current) {
        throw new Error('Service not initialized');
      }

      if (!topicalMapId) {
        throw new Error('No topical map ID provided');
      }

      await serviceRef.current.saveTopicalMapRules(topicalMapId, projectId, {
        overrides: prefs,
      });

      // Reload to get updated values
      await loadInheritance();
    },
    [projectId, topicalMapId, loadInheritance]
  );

  /**
   * Record design feedback
   */
  const recordFeedback = useCallback(
    async (feedback: DesignFeedback) => {
      if (!serviceRef.current) {
        throw new Error('Service not initialized');
      }

      await serviceRef.current.recordFeedback(projectId, feedback);
    },
    [projectId]
  );

  return {
    isLoading,
    error,
    hierarchy,
    tokens: resolved?.tokens || null,
    preferences: resolved?.preferences || null,
    inheritanceSource: resolved?.inheritanceSource || null,
    reload: loadInheritance,
    updateProjectPreferences,
    updateMapPreferences,
    recordFeedback,
  };
}

export default useDesignInheritance;
