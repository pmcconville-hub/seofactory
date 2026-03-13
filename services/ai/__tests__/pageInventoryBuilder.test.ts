import { describe, it, expect } from 'vitest';
import { buildPageInventory } from '../pageInventoryBuilder';
import type { EnrichedTopic } from '../../../types';
import { FreshnessProfile } from '../../../types/semantic';

function makeTopic(overrides: Partial<EnrichedTopic> = {}): EnrichedTopic {
  return {
    id: 'topic-1',
    map_id: 'map-1',
    parent_topic_id: null,
    title: 'Test Topic',
    slug: 'test-topic',
    description: 'Test',
    type: 'core',
    freshness: FreshnessProfile.STANDARD,
    ...overrides,
  };
}

describe('buildPageInventory', () => {
  it('should consolidate sections into pages', () => {
    const topics: EnrichedTopic[] = [
      makeTopic({ id: 'hub-1', title: 'Main Hub', page_decision: 'standalone_page', search_volume: 1000, cluster_role: 'pillar' }),
      makeTopic({ id: 'section-1', title: 'Sub Topic 1', page_decision: 'section', consolidation_target_id: 'hub-1', search_volume: 100 }),
      makeTopic({ id: 'section-2', title: 'Sub Topic 2', page_decision: 'section', consolidation_target_id: 'hub-1', search_volume: 50 }),
      makeTopic({ id: 'hub-2', title: 'Second Hub', page_decision: 'standalone_page', search_volume: 500 }),
      makeTopic({ id: 'skip-1', title: 'Skipped', page_decision: 'skip' }),
    ];

    const inventory = buildPageInventory(topics, 'ai_guess');

    expect(inventory.totalTopics).toBe(5);
    expect(inventory.totalPages).toBe(2);
    expect(inventory.skipped).toHaveLength(1);
    expect(inventory.skipped[0]).toBe('skip-1');
    expect(inventory.researchMode).toBe('ai_guess');

    // Hub-1 should have 2 sections
    const hub1Page = inventory.pages.find(p => p.pageTopicId === 'hub-1');
    expect(hub1Page).toBeDefined();
    expect(hub1Page!.sections).toHaveLength(2);
    expect(hub1Page!.totalEstimatedVolume).toBe(1150); // 1000 + 100 + 50

    // Hub-2 should have 0 sections
    const hub2Page = inventory.pages.find(p => p.pageTopicId === 'hub-2');
    expect(hub2Page).toBeDefined();
    expect(hub2Page!.sections).toHaveLength(0);
    expect(hub2Page!.totalEstimatedVolume).toBe(500);
  });

  it('should assign urgency labels based on priority and pillar status', () => {
    const topics: EnrichedTopic[] = [
      makeTopic({ id: 'pillar', title: 'Pillar', page_decision: 'standalone_page', cluster_role: 'pillar', search_volume: 100 }),
      makeTopic({ id: 'high', title: 'High Vol', page_decision: 'standalone_page', search_volume: 5000 }),
      makeTopic({ id: 'low', title: 'Low Vol', page_decision: 'standalone_page', search_volume: 10 }),
    ];

    const inventory = buildPageInventory(topics, 'ai_guess');

    const pillarPage = inventory.pages.find(p => p.pageTopicId === 'pillar');
    expect(pillarPage!.urgencyLabel).toBe('launch_critical');
  });

  it('should calculate consolidationRatio correctly', () => {
    // 5 topics / 2 pages = 2.5
    const topics: EnrichedTopic[] = [
      makeTopic({ id: 'hub-1', title: 'Hub 1', page_decision: 'standalone_page', search_volume: 1000 }),
      makeTopic({ id: 'hub-2', title: 'Hub 2', page_decision: 'standalone_page', search_volume: 500 }),
      makeTopic({ id: 's1', title: 'S1', page_decision: 'section', consolidation_target_id: 'hub-1', search_volume: 10 }),
      makeTopic({ id: 's2', title: 'S2', page_decision: 'section', consolidation_target_id: 'hub-1', search_volume: 20 }),
      makeTopic({ id: 'skip', title: 'Skip', page_decision: 'skip' }),
    ];

    const inventory = buildPageInventory(topics, 'ai_guess');
    expect(inventory.consolidationRatio).toBe(2.5);
  });

  it('should handle empty topics', () => {
    const inventory = buildPageInventory([], 'ai_guess');
    expect(inventory.totalPages).toBe(0);
    expect(inventory.totalTopics).toBe(0);
    expect(inventory.consolidationRatio).toBe(1);
    expect(inventory.pages).toHaveLength(0);
    expect(inventory.skipped).toHaveLength(0);
  });

  it('should handle all standalone topics (no consolidation)', () => {
    const topics: EnrichedTopic[] = [
      makeTopic({ id: 't1', title: 'Topic 1', page_decision: 'standalone_page', search_volume: 100 }),
      makeTopic({ id: 't2', title: 'Topic 2', page_decision: 'standalone_page', search_volume: 200 }),
    ];

    const inventory = buildPageInventory(topics, 'full_api');
    expect(inventory.totalPages).toBe(2);
    expect(inventory.consolidationRatio).toBe(1);
    expect(inventory.researchMode).toBe('full_api');
  });

  it('should sort pages by volume and assign priority', () => {
    const topics: EnrichedTopic[] = [
      makeTopic({ id: 'low', title: 'Low', page_decision: 'standalone_page', search_volume: 10 }),
      makeTopic({ id: 'high', title: 'High', page_decision: 'standalone_page', search_volume: 5000 }),
      makeTopic({ id: 'mid', title: 'Mid', page_decision: 'standalone_page', search_volume: 500 }),
    ];

    const inventory = buildPageInventory(topics, 'ai_guess');

    const highPage = inventory.pages.find(p => p.pageTopicId === 'high');
    const midPage = inventory.pages.find(p => p.pageTopicId === 'mid');
    const lowPage = inventory.pages.find(p => p.pageTopicId === 'low');

    // Priority 1 = highest volume
    expect(highPage!.priority).toBe(1);
    expect(midPage!.priority).toBe(2);
    expect(lowPage!.priority).toBe(3);
  });

  it('should map section roles from page_decision', () => {
    const topics: EnrichedTopic[] = [
      makeTopic({ id: 'hub', title: 'Hub', page_decision: 'standalone_page', search_volume: 1000 }),
      makeTopic({ id: 'sec', title: 'Section', page_decision: 'section', consolidation_target_id: 'hub' }),
      makeTopic({ id: 'faq', title: 'FAQ', page_decision: 'faq_entry', consolidation_target_id: 'hub' }),
      makeTopic({ id: 'merge', title: 'Merge', page_decision: 'merge_into_parent', consolidation_target_id: 'hub' }),
    ];

    const inventory = buildPageInventory(topics, 'ai_guess');
    const hub = inventory.pages.find(p => p.pageTopicId === 'hub');
    expect(hub!.sections).toHaveLength(3);

    const secSection = hub!.sections.find(s => s.topicId === 'sec');
    const faqSection = hub!.sections.find(s => s.topicId === 'faq');
    const mergeSection = hub!.sections.find(s => s.topicId === 'merge');

    expect(secSection!.role).toBe('h2_section');
    expect(faqSection!.role).toBe('faq_entry');
    expect(mergeSection!.role).toBe('merged');
  });

  it('should default researchMode to ai_guess when not provided', () => {
    const inventory = buildPageInventory([]);
    expect(inventory.researchMode).toBe('ai_guess');
  });
});
