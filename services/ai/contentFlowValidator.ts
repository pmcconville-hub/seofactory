// services/ai/contentFlowValidator.ts

import { EnrichedTopic } from '../../types';

export interface ContentFlowIssue {
  monetizationTopic: string;
  missingFoundation: string;
  severity: 'warning' | 'info';
}

export interface ContentFlowResult {
  isValid: boolean;
  issues: ContentFlowIssue[];
  informationalCount: number;
  monetizationCount: number;
}

/**
 * Validate that monetization topics have supporting informational topics.
 * Checks that foundational concepts are covered by informational content.
 */
export function validateContentFlow(topics: EnrichedTopic[]): ContentFlowResult {
  const informational = topics.filter(t => t.topic_class !== 'monetization');
  const monetization = topics.filter(t => t.topic_class === 'monetization');
  const issues: ContentFlowIssue[] = [];

  // Build corpus of informational topic coverage
  const informationalCorpus = informational
    .map(t => [t.title, t.description, t.canonical_query].filter(Boolean).join(' ').toLowerCase())
    .join(' ');

  for (const monTopic of monetization) {
    // Extract key concepts from monetization topic (words > 3 chars)
    const titleWords = monTopic.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const parentTopic = topics.find(t => t.id === monTopic.parent_topic_id);

    // Check if parent topic exists (orphaned monetization topic)
    if (monTopic.parent_topic_id && !parentTopic) {
      issues.push({
        monetizationTopic: monTopic.title,
        missingFoundation: 'Parent topic not found (orphaned monetization topic)',
        severity: 'warning',
      });
    }

    // Check if key concepts are covered by informational topics
    const conceptsCovered = titleWords.filter(w => informationalCorpus.includes(w));
    if (titleWords.length > 0 && conceptsCovered.length < titleWords.length * 0.3) {
      issues.push({
        monetizationTopic: monTopic.title,
        missingFoundation: 'Few informational topics cover the concepts in this monetization topic',
        severity: 'info',
      });
    }
  }

  return {
    isValid: issues.filter(i => i.severity === 'warning').length === 0,
    issues,
    informationalCount: informational.length,
    monetizationCount: monetization.length,
  };
}
