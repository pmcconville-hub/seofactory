import { useMemo } from 'react';
import { EnrichedTopic, ContentBrief } from '../types';

/**
 * Search filtering hook for topics.
 * Returns matching topic IDs as Set<string> | null (null = no filter active).
 * Includes parent IDs of matches to preserve hierarchy visibility.
 */
export function useTopicSearch(
  allTopics: EnrichedTopic[],
  briefs: Record<string, ContentBrief>,
  searchQuery: string
): Set<string> | null {
  return useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    const matchedIds = new Set<string>();

    for (const topic of allTopics) {
      const titleMatch = topic.title?.toLowerCase().includes(q);
      const slugMatch = topic.slug?.toLowerCase().includes(q);
      const descMatch = topic.description?.toLowerCase().includes(q);
      const brief = briefs[topic.id];
      const keywordMatch = brief?.targetKeyword?.toLowerCase().includes(q);

      if (titleMatch || slugMatch || descMatch || keywordMatch) {
        matchedIds.add(topic.id);
        // Include parent to preserve hierarchy visibility
        if (topic.parent_topic_id) {
          matchedIds.add(topic.parent_topic_id);
        }
      }
    }

    return matchedIds;
  }, [allTopics, briefs, searchQuery]);
}
