// services/ai/pageInventoryBuilder.ts
// Builds PageInventory from enriched topics with page decisions

import type { EnrichedTopic, PageInventory, PageInventoryEntry, ConsolidatedSection } from '../../types';

/**
 * Build a PageInventory from enriched topics.
 * Groups standalone pages with their consolidated sections,
 * calculates total volumes, assigns priorities and urgency labels.
 */
export function buildPageInventory(
  topics: EnrichedTopic[],
  researchMode: 'ai_guess' | 'full_api' = 'ai_guess'
): PageInventory {
  const standaloneTopics = topics.filter(t => t.page_decision === 'standalone_page');
  const skippedTopics = topics.filter(t => t.page_decision === 'skip');
  const consolidatedTopics = topics.filter(t =>
    t.page_decision !== 'standalone_page' &&
    t.page_decision !== 'skip' &&
    t.consolidation_target_id
  );

  // Build page entries
  const pages: PageInventoryEntry[] = standaloneTopics.map(pageTopic => {
    // Find all topics consolidated into this page
    const sections: ConsolidatedSection[] = consolidatedTopics
      .filter(t => t.consolidation_target_id === pageTopic.id)
      .map(t => ({
        topicId: t.id,
        topicTitle: t.title,
        role: decisionToRole(t.page_decision),
        estimatedVolume: t.search_volume || 0,
        keyword: t.extracted_keyword,
      }));

    const pageVolume = pageTopic.search_volume || 0;
    const sectionsVolume = sections.reduce((sum, s) => sum + s.estimatedVolume, 0);
    const totalEstimatedVolume = pageVolume + sectionsVolume;

    return {
      pageTopicId: pageTopic.id,
      pageTitle: pageTopic.title,
      sections,
      totalEstimatedVolume,
      priority: 0, // calculated below
      urgencyLabel: 'wave_2' as const, // calculated below
    };
  });

  // Calculate priority based on volume + business alignment
  // Higher volume = higher priority (lower number)
  const sorted = [...pages].sort((a, b) => b.totalEstimatedVolume - a.totalEstimatedVolume);
  sorted.forEach((page, index) => {
    page.priority = index + 1;
  });

  // Assign urgency labels based on priority ranking
  const totalPages = pages.length;
  for (const page of pages) {
    const percentile = page.priority / totalPages;
    const pageTopic = standaloneTopics.find(t => t.id === page.pageTopicId);
    const isPillar = pageTopic?.cluster_role === 'pillar';

    if (isPillar || percentile <= 0.15) {
      page.urgencyLabel = 'launch_critical';
    } else if (percentile <= 0.35) {
      page.urgencyLabel = 'wave_1';
    } else if (percentile <= 0.60) {
      page.urgencyLabel = 'wave_2';
    } else if (percentile <= 0.85) {
      page.urgencyLabel = 'wave_3';
    } else {
      page.urgencyLabel = 'optional';
    }
  }

  const consolidationRatio = totalPages > 0
    ? Math.round((topics.length / totalPages) * 10) / 10
    : 1;

  return {
    pages,
    skipped: skippedTopics.map(t => t.id),
    totalTopics: topics.length,
    totalPages,
    consolidationRatio,
    researchMode,
  };
}

function decisionToRole(decision?: string): ConsolidatedSection['role'] {
  switch (decision) {
    case 'section': return 'h2_section';
    case 'faq_entry': return 'faq_entry';
    case 'merge_into_parent': return 'merged';
    default: return 'h2_section';
  }
}
