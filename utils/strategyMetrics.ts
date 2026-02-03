/**
 * Strategy Metrics Calculator
 *
 * Shared utility for calculating strategy overview metrics.
 * Used by both StrategyOverview and CompactMetricsStrip.
 */

import { EnrichedTopic, ContentBrief, SemanticTriple, SEOPillars } from '../types';
import { KnowledgeGraph } from '../lib/knowledgeGraph';
import { calculateBriefHealthStats, calculateBriefQualityScore, getMissingFields } from './briefQualityScore';

export interface StrategyMetrics {
  briefQualityPercent: number;
  domainCoverage: number;
  eavDensity: string;
  contextCoverage: number;
  briefStats: { complete: number; partial: number; empty: number; withBriefs: number };
  totalTopics: number;
  totalEavs: number;
  topicsNeedingBriefs: string[];
  partialBriefs: { title: string; missing: string[] }[];
  failedBriefs: { title: string; missing: string[] }[];
  topicsWithoutContext: string[];
}

export interface PillarStatus {
  defined: boolean;
  summary: string;
}

export function calculateStrategyMetrics(
  topics: EnrichedTopic[],
  briefs: Record<string, ContentBrief>,
  eavs: SemanticTriple[],
  knowledgeGraph?: KnowledgeGraph | null,
): StrategyMetrics {
  const topicIds = topics.map(t => t.id);
  const briefStats = calculateBriefHealthStats(briefs, topicIds);

  const briefQualityPercent = topics.length > 0
    ? Math.round((briefStats.complete / topics.length) * 100)
    : 0;

  const kgNodeCount = knowledgeGraph?.getNodes?.()?.size || 0;
  const domainCoverage = topics.length > 0 && kgNodeCount > 0
    ? Math.min(100, Math.round((kgNodeCount / topics.length) * 50))
    : 0;

  const eavDensity = topics.length > 0
    ? (eavs.length / topics.length).toFixed(1)
    : '0';

  const topicsWithContext = Object.values(briefs).filter(b => {
    const hasContext = b.contextualBridge && (
      Array.isArray(b.contextualBridge)
        ? b.contextualBridge.length > 0
        : (b.contextualBridge as any)?.suggested_internal_links?.length > 0
    );
    return hasContext;
  }).length;
  const contextCoverage = briefStats.withBriefs > 0
    ? Math.round((topicsWithContext / briefStats.withBriefs) * 100)
    : 0;

  const topicsNeedingBriefs = topics.filter(t => !briefs[t.id]).map(t => t.title);
  const partialBriefs = topics.filter(t => {
    const brief = briefs[t.id];
    if (!brief) return false;
    const result = calculateBriefQualityScore(brief);
    return result.score >= 40 && result.score < 80;
  }).map(t => ({ title: t.title, missing: getMissingFields(briefs[t.id]) }));
  const failedBriefs = topics.filter(t => {
    const brief = briefs[t.id];
    if (!brief) return false;
    const result = calculateBriefQualityScore(brief);
    return result.score < 40;
  }).map(t => ({ title: t.title, missing: getMissingFields(briefs[t.id]) }));

  const topicsWithoutContext = Object.entries(briefs)
    .filter(([, b]) => {
      const hasContext = b.contextualBridge && (
        Array.isArray(b.contextualBridge)
          ? b.contextualBridge.length > 0
          : (b.contextualBridge as any)?.suggested_internal_links?.length > 0
      );
      return !hasContext;
    })
    .map(([id]) => topics.find(t => t.id === id)?.title)
    .filter(Boolean) as string[];

  return {
    briefQualityPercent,
    domainCoverage,
    eavDensity,
    contextCoverage,
    briefStats,
    totalTopics: topics.length,
    totalEavs: eavs.length,
    topicsNeedingBriefs,
    partialBriefs,
    failedBriefs,
    topicsWithoutContext,
  };
}

export function calculatePillarStatus(pillars?: SEOPillars): PillarStatus {
  if (!pillars) return { defined: false, summary: 'Not defined' };

  const defined = [];
  if (pillars.centralEntity) defined.push('CE');
  if (pillars.sourceContext) defined.push('SC');
  if (pillars.centralSearchIntent) defined.push('CSI');

  return {
    defined: defined.length === 3,
    summary: defined.length > 0 ? defined.join(', ') : 'Not defined',
  };
}
