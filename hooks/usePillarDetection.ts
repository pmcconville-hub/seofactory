import { useState, useCallback } from 'react';
import { PillarDetectionService, DetectedPageResult, PillarSuggestion } from '../services/ai/pillarDetection';
import type { SiteInventoryItem, BusinessInfo } from '../types';
import type { AppAction } from '../state/appState';

export interface UsePillarDetectionReturn {
  suggestion: PillarSuggestion | null;
  isLoading: boolean;
  error: string | null;
  detect: (inventory: SiteInventoryItem[]) => void;
  refineWithAI: (businessInfo: BusinessInfo, dispatch: React.Dispatch<AppAction>) => Promise<void>;
}

/**
 * React hook wrapping PillarDetectionService.
 * Converts inventory items with detected_ce/sc/csi into DetectedPageResult[],
 * then calls aggregateFromDetections() to produce a PillarSuggestion.
 */
export function usePillarDetection(): UsePillarDetectionReturn {
  const [suggestion, setSuggestion] = useState<PillarSuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detect = useCallback((inventory: SiteInventoryItem[]) => {
    setIsLoading(true);
    setError(null);

    try {
      const service = new PillarDetectionService();

      // Convert inventory items to DetectedPageResult format
      const results: DetectedPageResult[] = inventory
        .filter(item => item.detected_ce || item.detected_sc || item.detected_csi)
        .map(item => ({
          inventoryId: item.id,
          url: item.url,
          detectedCE: item.detected_ce ?? undefined,
          detectedSC: item.detected_sc ?? undefined,
          detectedCSI: item.detected_csi ?? undefined,
        }));

      if (results.length === 0) {
        setError('No pages with detected semantic data found. Run Semantic Analysis first.');
        setIsLoading(false);
        return;
      }

      const pillarSuggestion = service.aggregateFromDetections(results);
      setSuggestion(pillarSuggestion);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pillar detection failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refineWithAI = useCallback(async (
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<AppAction>
  ) => {
    if (!suggestion) return;

    setIsLoading(true);
    setError(null);

    try {
      const service = new PillarDetectionService();
      const refined = await service.suggestPillarsWithAI(suggestion, businessInfo, dispatch);
      setSuggestion(refined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI refinement failed');
    } finally {
      setIsLoading(false);
    }
  }, [suggestion]);

  return { suggestion, isLoading, error, detect, refineWithAI };
}
