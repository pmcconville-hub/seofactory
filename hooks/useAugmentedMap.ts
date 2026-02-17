import { useState, useCallback } from 'react';
import { SiteStructureDiscoveryService, DiscoveredPage } from '../services/ai/siteStructureDiscovery';
import { AugmentedMapGenerator, AugmentedTopic, AugmentedMapResult } from '../services/ai/augmentedMapGeneration';
import type { SiteInventoryItem, SEOPillars, BusinessInfo } from '../types';
import type { AppAction } from '../state/appState';
import { dispatchToProvider } from '../services/ai/providerDispatcher';
import * as geminiService from '../services/geminiService';
import * as openAiService from '../services/openAiService';
import * as anthropicService from '../services/anthropicService';
import * as perplexityService from '../services/perplexityService';
import * as openRouterService from '../services/openRouterService';

export interface UseAugmentedMapReturn {
  topics: AugmentedTopic[];
  discoveredCount: number;
  gapCount: number;
  isGenerating: boolean;
  error: string | null;
  generate: (
    inventory: SiteInventoryItem[],
    pillars: SEOPillars,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<AppAction>
  ) => Promise<void>;
}

/**
 * React hook wrapping SiteStructureDiscoveryService + AugmentedMapGenerator.
 * Step 1: Discovers site structure from inventory (clusters pages by CE).
 * Step 2: Generates augmented map with AI gap analysis.
 */
export function useAugmentedMap(): UseAugmentedMapReturn {
  const [topics, setTopics] = useState<AugmentedTopic[]>([]);
  const [discoveredCount, setDiscoveredCount] = useState(0);
  const [gapCount, setGapCount] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (
    inventory: SiteInventoryItem[],
    pillars: SEOPillars,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<AppAction>
  ) => {
    setIsGenerating(true);
    setError(null);

    try {
      // Step 1: Discover site structure
      const discoveryService = new SiteStructureDiscoveryService();
      const pages: DiscoveredPage[] = inventory.map(item => ({
        id: item.id,
        url: item.url,
        detectedCE: item.detected_ce ?? undefined,
        detectedSC: item.detected_sc ?? undefined,
        detectedCSI: item.detected_csi ?? undefined,
        auditScore: item.audit_score ?? undefined,
        gscClicks: item.gsc_clicks ?? undefined,
        pageTitle: item.title ?? undefined,
      }));

      const structure = discoveryService.discoverStructure(pages);

      // Step 2: Generate augmented map with AI gap analysis
      const fallback = { gapTopics: [] as { title: string; type: string; description: string }[] };

      const generator = new AugmentedMapGenerator({
        generateGapsFn: async (prompt: string) => {
          return dispatchToProvider<typeof fallback>(businessInfo, {
            gemini: () => geminiService.generateJson(prompt, businessInfo, dispatch, fallback),
            openai: () => openAiService.generateJson(prompt, businessInfo, dispatch, fallback),
            anthropic: () => anthropicService.generateJson(prompt, businessInfo, dispatch, fallback),
            perplexity: () => perplexityService.generateJson(prompt, businessInfo, dispatch, fallback),
            openrouter: () => openRouterService.generateJson(prompt, businessInfo, dispatch, fallback),
          });
        },
      });

      const result: AugmentedMapResult = await generator.generate({
        clusters: structure.clusters,
        orphans: structure.orphans,
        suggestedHierarchy: structure.suggestedHierarchy,
        pillars,
      });

      setTopics(result.topics);
      setDiscoveredCount(result.discoveredCount);
      setGapCount(result.gapCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Map generation failed');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { topics, discoveredCount, gapCount, isGenerating, error, generate };
}
