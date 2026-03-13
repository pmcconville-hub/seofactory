// services/ai/topicResearchOrchestrator.ts
// Central orchestrator for topic enrichment: keyword extraction → volume research → page decisions

import type { BusinessInfo, EnrichedTopic } from '../../types';
import { extractKeywords } from './keywordExtraction';
import { estimateVolumes, VolumeEstimate } from './volumeEstimation';
import { IndexConstructionRule, TopicSignals } from './indexConstructionRule';
import { QueryDeservesPage, QDPSignals } from './queryDeservesPage';
import React from 'react';

/** Union of page decisions used by EnrichedTopic (superset of ICR's PageDecision) */
type EnrichedPageDecision = NonNullable<EnrichedTopic['page_decision']>;

/**
 * Enriches topics with keywords, volume data, and page decisions.
 * Branches on businessInfo.researchDepth:
 * - 'ai_guess' (default): AI-estimated volumes (free, ~5s)
 * - 'full_api': DataForSEO volumes + competitor analysis
 */
export async function enrichTopics(
  topics: EnrichedTopic[],
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any>
): Promise<EnrichedTopic[]> {
  const researchDepth = businessInfo.researchDepth || 'ai_guess';

  dispatch({
    type: 'LOG_EVENT',
    payload: {
      service: 'TopicResearch',
      message: `Starting topic research (${researchDepth} mode) for ${topics.length} topics`,
      status: 'info',
      timestamp: Date.now(),
    },
  });

  // Step 1: Extract keywords from all topics
  const keywordMap = await extractKeywords(topics, businessInfo, dispatch);

  // Apply keywords to topics
  let enriched: EnrichedTopic[] = topics.map(t => ({
    ...t,
    extracted_keyword: keywordMap.get(t.id) || undefined,
  }));

  // Step 2: Volume research (branching on mode)
  let volumeMap: Map<string, VolumeEstimate>;

  if (researchDepth === 'full_api' && businessInfo.dataforseoLogin && businessInfo.dataforseoPassword) {
    volumeMap = await runFullApiResearch(enriched, keywordMap, businessInfo, dispatch);
  } else {
    volumeMap = await estimateVolumes(enriched, keywordMap, businessInfo, dispatch);
  }

  // Apply volume data to topics
  const volumeSource: EnrichedTopic['search_volume_source'] = researchDepth === 'full_api' ? 'dataforseo' : 'ai_estimate';
  enriched = enriched.map(t => {
    const keyword = keywordMap.get(t.id);
    if (!keyword) return t;
    const estimate = volumeMap.get(keyword);
    if (!estimate) return t;
    return {
      ...t,
      search_volume: estimate.estimatedMonthlyVolume,
      search_volume_source: volumeSource,
      search_intent: estimate.intent,
    };
  });

  // Step 3: Page decisions using IndexConstructionRule
  enriched = applyPageDecisions(enriched, volumeMap, keywordMap);

  // Step 4: Consolidation assignment
  enriched = assignConsolidationTargets(enriched);

  const standalonePagesCount = enriched.filter(t => t.page_decision === 'standalone_page').length;
  const sectionsCount = enriched.filter(t => t.page_decision === 'section' || t.page_decision === 'merge_into_parent').length;

  dispatch({
    type: 'LOG_EVENT',
    payload: {
      service: 'TopicResearch',
      message: `Research complete: ${standalonePagesCount} standalone pages, ${sectionsCount} sections/merges from ${topics.length} topics (${(topics.length / Math.max(1, standalonePagesCount)).toFixed(1)}x consolidation)`,
      status: 'success',
      timestamp: Date.now(),
    },
  });

  return enriched;
}

/**
 * Full API research path using DataForSEO for real volumes.
 */
async function runFullApiResearch(
  topics: EnrichedTopic[],
  keywordMap: Map<string, string>,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any>
): Promise<Map<string, VolumeEstimate>> {
  const { fetchKeywordSearchVolume } = await import('../serpApiService');
  const results = new Map<string, VolumeEstimate>();

  // Collect all keywords
  const keywords: string[] = [];
  for (const [, keyword] of keywordMap) {
    if (keyword) keywords.push(keyword);
  }

  if (keywords.length === 0) return results;

  dispatch({
    type: 'LOG_EVENT',
    payload: {
      service: 'TopicResearch',
      message: `Fetching real volumes from DataForSEO for ${keywords.length} keywords (~$${(keywords.length * 0.005).toFixed(2)})`,
      status: 'info',
      timestamp: Date.now(),
    },
  });

  try {
    // DataForSEO batches internally (max 100 per call)
    const volumeResults = await fetchKeywordSearchVolume(
      keywords,
      businessInfo.dataforseoLogin!,
      businessInfo.dataforseoPassword!,
      undefined, // locationCode - uses default
      businessInfo.language || 'en'
    );

    // Also get AI estimates for intent and depth (volumes come from API)
    const aiEstimates = await estimateVolumes(topics, keywordMap, businessInfo, dispatch);

    // Merge: use DataForSEO volume + AI intent/depth
    for (const keyword of keywords) {
      const apiVolume = volumeResults.get(keyword);
      const aiEstimate = aiEstimates.get(keyword);

      results.set(keyword, {
        keyword,
        estimatedMonthlyVolume: apiVolume ?? aiEstimate?.estimatedMonthlyVolume ?? 50,
        intent: aiEstimate?.intent ?? 'informational',
        estimatedContentDepth: aiEstimate?.estimatedContentDepth ?? 800,
        confidence: apiVolume !== undefined ? 0.95 : (aiEstimate?.confidence ?? 0.3),
      });
    }
  } catch (err) {
    console.warn('[topicResearchOrchestrator] DataForSEO fetch failed, falling back to AI estimates:', err);
    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'TopicResearch',
        message: `DataForSEO failed: ${err instanceof Error ? err.message : 'Unknown error'}. Falling back to AI estimates.`,
        status: 'warning',
        timestamp: Date.now(),
      },
    });

    // Fallback to pure AI estimates
    return estimateVolumes(topics, keywordMap, businessInfo, dispatch);
  }

  return results;
}

/**
 * Apply page decisions using IndexConstructionRule and QueryDeservesPage.
 */
function applyPageDecisions(
  topics: EnrichedTopic[],
  volumeMap: Map<string, VolumeEstimate>,
  keywordMap: Map<string, string>
): EnrichedTopic[] {
  return topics.map(t => {
    const keyword = keywordMap.get(t.id);
    const estimate = keyword ? volumeMap.get(keyword) : undefined;
    const parentTopic = t.parent_topic_id
      ? topics.find(p => p.id === t.parent_topic_id)
      : null;
    const subtopicCount = topics.filter(s => s.parent_topic_id === t.id).length;

    // Calculate Jaccard distance from parent
    let distanceFromParent: number | undefined;
    if (parentTopic) {
      const tWords = new Set(t.title.toLowerCase().split(/\s+/).filter(w => w.length > 2));
      const pWords = new Set(parentTopic.title.toLowerCase().split(/\s+/).filter(w => w.length > 2));
      const intersection = [...tWords].filter(w => pWords.has(w)).length;
      const union = new Set([...tWords, ...pWords]).size;
      distanceFromParent = union > 0 ? 1 - (intersection / union) : 0.5;
    }

    // Build signals for IndexConstructionRule
    const icrSignals: TopicSignals = {
      topic: t.title,
      searchVolume: t.search_volume ?? estimate?.estimatedMonthlyVolume,
      intent: estimate?.intent || t.search_intent || t.query_type,
      estimatedDepth: estimate?.estimatedContentDepth,
      parentTopic: parentTopic?.title,
      distanceFromParent,
      subtopicCount,
      category: undefined, // TODO: map attribute_focus to category
    };

    const icrResult = IndexConstructionRule.evaluate(icrSignals);

    // Also evaluate with QDP for secondary signal
    let qdpResult;
    if (estimate) {
      const qdpSignals: QDPSignals = {
        query: keyword || t.title,
        volume: estimate.estimatedMonthlyVolume,
        intent: estimate.intent,
        expectedDepth: estimate.estimatedContentDepth,
        hasParentPage: !!parentTopic,
      };
      qdpResult = QueryDeservesPage.evaluate(qdpSignals);
    }

    // Reconcile: map QDP decisions to ICR format
    let finalDecision: EnrichedPageDecision = icrResult.decision;
    let finalConfidence = icrResult.confidence;
    let finalReasoning = icrResult.reasoning;

    if (qdpResult) {
      const qdpDecisionMapped = mapQdpToPageDecision(qdpResult.decision);

      // If both agree, boost confidence
      if (qdpDecisionMapped === icrResult.decision) {
        finalConfidence = Math.min(1, icrResult.confidence + 0.1);
        finalReasoning = `${icrResult.reasoning} | QDP confirms (score: ${qdpResult.scores.total}/40)`;
      } else {
        // Disagreement: use higher confidence
        if (qdpResult.scores.total / 40 > icrResult.confidence) {
          finalDecision = qdpDecisionMapped;
          finalConfidence = qdpResult.scores.total / 40;
          finalReasoning = `QDP override: ${qdpResult.explanation}`;
        }
      }
    }

    // Override: core pillar topics always get standalone pages
    if (t.cluster_role === 'pillar') {
      finalDecision = 'standalone_page';
      finalConfidence = Math.max(finalConfidence, 0.9);
      finalReasoning = `Pillar topic: forced standalone page. ${finalReasoning}`;
    }

    return {
      ...t,
      page_decision: finalDecision,
      page_decision_confidence: Math.round(finalConfidence * 100) / 100,
      page_decision_reasoning: finalReasoning,
    };
  });
}

/**
 * Map QDP decision format to EnrichedTopic page_decision format.
 */
function mapQdpToPageDecision(qdpDecision: string): EnrichedPageDecision {
  switch (qdpDecision) {
    case 'page': return 'standalone_page';
    case 'section': return 'section';
    case 'faq': return 'faq_entry';
    case 'merge': return 'merge_into_parent';
    case 'skip': return 'skip';
    default: return 'section';
  }
}

/**
 * Assign consolidation targets for non-standalone topics.
 * Priority: parent topic first → nearest pillar in same cluster.
 */
function assignConsolidationTargets(topics: EnrichedTopic[]): EnrichedTopic[] {
  const standalonePages = topics.filter(t => t.page_decision === 'standalone_page');
  const standaloneIds = new Set(standalonePages.map(t => t.id));

  return topics.map(t => {
    // Standalone pages don't need consolidation
    if (t.page_decision === 'standalone_page') {
      return { ...t, consolidation_target_id: null };
    }

    // Skip decisions
    if (t.page_decision === 'skip') {
      return { ...t, consolidation_target_id: null };
    }

    // Try parent first
    if (t.parent_topic_id && standaloneIds.has(t.parent_topic_id)) {
      return { ...t, consolidation_target_id: t.parent_topic_id };
    }

    // Find nearest standalone page in same cluster
    // (topics sharing the same parent_topic_id are in the same cluster)
    const clusterPeers = standalonePages.filter(p =>
      p.parent_topic_id === t.parent_topic_id || p.id === t.parent_topic_id
    );

    if (clusterPeers.length > 0) {
      // Pick the one with highest volume (most authoritative)
      const bestPeer = clusterPeers.reduce((best, p) =>
        (p.search_volume || 0) > (best.search_volume || 0) ? p : best
      , clusterPeers[0]);
      return { ...t, consolidation_target_id: bestPeer.id };
    }

    // Last resort: find any standalone page (shouldn't happen with proper map structure)
    if (standalonePages.length > 0) {
      return { ...t, consolidation_target_id: standalonePages[0].id };
    }

    return { ...t, consolidation_target_id: null };
  });
}
