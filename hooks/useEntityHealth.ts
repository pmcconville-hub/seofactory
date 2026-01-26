/**
 * useEntityHealth Hook
 *
 * React hook for entity health analysis, providing state management
 * for analyzing entity verification status across the semantic SEO framework.
 *
 * Features:
 * - Manages analysis state and progress tracking
 * - Supports marking entities as proprietary
 * - Re-calculates summary after user actions
 */

import { useState, useCallback } from 'react';
import {
  EntityHealthAnalysisResult,
  EntityHealthProgress,
  EntityHealthConfig,
  EntityHealthRecord,
} from '../types/entityHealth';
import {
  analyzeEntityHealth,
  markAsProprietary,
  buildHealthSummary,
} from '../services/entityHealthService';
import { SemanticTriple } from '../types';

/**
 * Return type for the useEntityHealth hook
 */
export interface UseEntityHealthReturn {
  // State
  result: EntityHealthAnalysisResult | null;
  progress: EntityHealthProgress | null;
  isAnalyzing: boolean;
  error: string | null;

  // Actions
  analyze: (
    eavs: SemanticTriple[],
    centralEntity: string,
    coreTopicIds?: string[],
    googleApiKey?: string
  ) => Promise<void>;

  markProprietary: (entityName: string) => void;

  reset: () => void;
}

/**
 * React hook for managing entity health analysis state
 *
 * @param config - Optional configuration for entity health analysis
 * @returns Entity health state and control functions
 *
 * @example
 * ```tsx
 * const {
 *   result,
 *   progress,
 *   isAnalyzing,
 *   error,
 *   analyze,
 *   markProprietary,
 *   reset
 * } = useEntityHealth({ criticalityThreshold: 0.7 });
 *
 * // Run analysis
 * await analyze(eavs, 'Central Entity', coreTopicIds, googleApiKey);
 *
 * // Mark entity as proprietary
 * markProprietary('MyBrandTerm');
 *
 * // Reset state
 * reset();
 * ```
 */
export function useEntityHealth(
  config: EntityHealthConfig = {}
): UseEntityHealthReturn {
  const [result, setResult] = useState<EntityHealthAnalysisResult | null>(null);
  const [progress, setProgress] = useState<EntityHealthProgress | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Analyze entity health across all EAV triples
   */
  const analyze = useCallback(
    async (
      eavs: SemanticTriple[],
      centralEntity: string,
      coreTopicIds?: string[],
      googleApiKey?: string
    ): Promise<void> => {
      console.log('[useEntityHealth] Starting entity health analysis...', {
        eavCount: eavs.length,
        centralEntity,
        coreTopicCount: coreTopicIds?.length ?? 0,
        hasGoogleApiKey: !!googleApiKey,
      });

      setIsAnalyzing(true);
      setError(null);
      setProgress({
        phase: 'extracting',
        totalEntities: 0,
        processedEntities: 0,
        progress: 0,
      });

      try {
        const analysisResult = await analyzeEntityHealth(
          eavs,
          centralEntity,
          coreTopicIds,
          config,
          (progressUpdate) => {
            console.log('[useEntityHealth] Progress update:', progressUpdate);
            setProgress(progressUpdate);
          },
          googleApiKey
        );

        console.log('[useEntityHealth] Analysis complete:', {
          totalEntities: analysisResult.summary.totalEntities,
          healthScore: analysisResult.summary.healthScore,
          issuesCount: analysisResult.issuesRequiringAttention.length,
        });

        setResult(analysisResult);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error occurred';
        console.error('[useEntityHealth] Analysis failed:', err);
        setError(message);
        setProgress((prev) =>
          prev
            ? { ...prev, phase: 'error', error: message }
            : { phase: 'error', totalEntities: 0, processedEntities: 0, progress: 0, error: message }
        );
      } finally {
        setIsAnalyzing(false);
      }
    },
    [config]
  );

  /**
   * Mark an entity as proprietary (intentionally unverifiable)
   * Updates the result and recalculates summary counts
   */
  const markProprietaryCallback = useCallback(
    (entityName: string): void => {
      if (!result) {
        console.warn('[useEntityHealth] Cannot mark entity as proprietary: no result available');
        return;
      }

      console.log('[useEntityHealth] Marking entity as proprietary:', entityName);

      // Find and update the entity in the entities array
      const normalizedName = entityName.toLowerCase().trim();
      const updatedEntities = result.entities.map((entity) => {
        if (entity.normalizedName === normalizedName) {
          return markAsProprietary(entity);
        }
        return entity;
      });

      // Recalculate summary with updated entities
      const updatedSummary = buildHealthSummary(updatedEntities);

      // Recategorize entities
      const issuesRequiringAttention = updatedEntities.filter(
        (r) => r.issues.some((i) => i.severity === 'critical' || i.severity === 'warning')
      );
      const autoVerified = updatedEntities.filter(
        (r) => r.verificationStatus === 'verified' || r.verificationStatus === 'partial'
      );
      const markedProprietary = updatedEntities.filter(
        (r) => r.verificationStatus === 'proprietary'
      );

      const updatedResult: EntityHealthAnalysisResult = {
        summary: updatedSummary,
        entities: updatedEntities,
        issuesRequiringAttention,
        autoVerified,
        markedProprietary,
      };

      console.log('[useEntityHealth] Updated result after marking proprietary:', {
        proprietaryCount: updatedSummary.proprietaryCount,
        unverifiedCount: updatedSummary.unverifiedCount,
        healthScore: updatedSummary.healthScore,
      });

      setResult(updatedResult);
    },
    [result]
  );

  /**
   * Reset all state to initial values
   */
  const reset = useCallback((): void => {
    console.log('[useEntityHealth] Resetting state');
    setResult(null);
    setProgress(null);
    setIsAnalyzing(false);
    setError(null);
  }, []);

  return {
    result,
    progress,
    isAnalyzing,
    error,
    analyze,
    markProprietary: markProprietaryCallback,
    reset,
  };
}
