import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the dependencies before importing the module under test
vi.mock('../keywordExtraction', () => ({
  extractKeywords: vi.fn(),
}));
vi.mock('../volumeEstimation', () => ({
  estimateVolumes: vi.fn(),
}));

import { enrichTopics } from '../topicResearchOrchestrator';
import { extractKeywords } from '../keywordExtraction';
import { estimateVolumes } from '../volumeEstimation';
import type { VolumeEstimate } from '../volumeEstimation';
import type { EnrichedTopic, BusinessInfo } from '../../../types';
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

const baseBusinessInfo: BusinessInfo = {
  domain: 'test.com',
  projectName: 'Test',
  industry: 'Technology',
  model: 'SaaS',
  valueProp: 'Best tool',
  audience: 'Developers',
  expertise: 'Expert',
  seedKeyword: 'testing',
  language: 'en',
  targetMarket: 'US',
  aiProvider: 'gemini',
  aiModel: 'gemini-2.0-flash',
  supabaseUrl: 'https://test.supabase.co',
  supabaseAnonKey: 'test-key',
};

function makeVolumeEstimate(keyword: string, overrides: Partial<VolumeEstimate> = {}): VolumeEstimate {
  return {
    keyword,
    estimatedMonthlyVolume: 500,
    intent: 'informational',
    estimatedContentDepth: 800,
    confidence: 0.6,
    ...overrides,
  };
}

describe('topicResearchOrchestrator - enrichTopics', () => {
  const dispatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should enrich topics with keywords, volumes, and page decisions', async () => {
    const topics = [
      makeTopic({ id: 'hub-1', title: 'Main Topic', cluster_role: 'pillar' }),
      makeTopic({ id: 'child-1', title: 'Sub Topic', parent_topic_id: 'hub-1' }),
    ];

    vi.mocked(extractKeywords).mockResolvedValue(new Map([
      ['hub-1', 'main topic'],
      ['child-1', 'sub topic'],
    ]));

    vi.mocked(estimateVolumes).mockResolvedValue(new Map([
      ['main topic', makeVolumeEstimate('main topic', { estimatedMonthlyVolume: 1000, estimatedContentDepth: 1500 })],
      ['sub topic', makeVolumeEstimate('sub topic', { estimatedMonthlyVolume: 50, estimatedContentDepth: 300 })],
    ]));

    const enriched = await enrichTopics(topics, baseBusinessInfo, dispatch);

    expect(enriched).toHaveLength(2);

    // Pillar should always be standalone_page
    const hub = enriched.find(t => t.id === 'hub-1');
    expect(hub).toBeDefined();
    expect(hub!.page_decision).toBe('standalone_page');
    expect(hub!.extracted_keyword).toBe('main topic');
    expect(hub!.search_volume).toBe(1000);
    expect(hub!.search_volume_source).toBe('ai_estimate');

    // Child with low volume should not be standalone
    const child = enriched.find(t => t.id === 'child-1');
    expect(child).toBeDefined();
    expect(child!.extracted_keyword).toBe('sub topic');
    expect(child!.search_volume).toBe(50);
    // Page decision should be set (section, merge, or faq)
    expect(child!.page_decision).toBeDefined();
  });

  it('should assign consolidation targets for non-standalone topics', async () => {
    const topics = [
      makeTopic({ id: 'hub-1', title: 'Main Topic', cluster_role: 'pillar' }),
      makeTopic({ id: 'child-1', title: 'Sub Topic', parent_topic_id: 'hub-1' }),
      makeTopic({ id: 'child-2', title: 'Another Sub', parent_topic_id: 'hub-1' }),
    ];

    vi.mocked(extractKeywords).mockResolvedValue(new Map([
      ['hub-1', 'main topic'],
      ['child-1', 'sub topic'],
      ['child-2', 'another sub'],
    ]));

    vi.mocked(estimateVolumes).mockResolvedValue(new Map([
      ['main topic', makeVolumeEstimate('main topic', { estimatedMonthlyVolume: 2000, estimatedContentDepth: 2000 })],
      ['sub topic', makeVolumeEstimate('sub topic', { estimatedMonthlyVolume: 20, estimatedContentDepth: 200 })],
      ['another sub', makeVolumeEstimate('another sub', { estimatedMonthlyVolume: 10, estimatedContentDepth: 150 })],
    ]));

    const enriched = await enrichTopics(topics, baseBusinessInfo, dispatch);

    // Non-standalone topics with a standalone parent should consolidate into that parent
    const child1 = enriched.find(t => t.id === 'child-1');
    const child2 = enriched.find(t => t.id === 'child-2');

    if (child1!.page_decision !== 'standalone_page') {
      expect(child1!.consolidation_target_id).toBeDefined();
    }
    if (child2!.page_decision !== 'standalone_page') {
      expect(child2!.consolidation_target_id).toBeDefined();
    }
  });

  it('should handle missing keywords gracefully', async () => {
    const topics = [
      makeTopic({ id: 't1', title: 'Some Topic' }),
    ];

    // Return empty map (no keywords extracted)
    vi.mocked(extractKeywords).mockResolvedValue(new Map());
    vi.mocked(estimateVolumes).mockResolvedValue(new Map());

    const enriched = await enrichTopics(topics, baseBusinessInfo, dispatch);
    expect(enriched).toHaveLength(1);
    // Should still have a page decision even without volume data
    expect(enriched[0].page_decision).toBeDefined();
  });

  it('should dispatch log events during processing', async () => {
    const topics = [makeTopic({ id: 't1', title: 'Topic' })];

    vi.mocked(extractKeywords).mockResolvedValue(new Map([['t1', 'topic']]));
    vi.mocked(estimateVolumes).mockResolvedValue(new Map([
      ['topic', makeVolumeEstimate('topic')],
    ]));

    await enrichTopics(topics, baseBusinessInfo, dispatch);

    // Should have dispatched LOG_EVENT actions
    const logCalls = dispatch.mock.calls.filter(
      call => call[0]?.type === 'LOG_EVENT'
    );
    expect(logCalls.length).toBeGreaterThanOrEqual(2); // At least start + completion
  });

  it('should mark pillar topics as standalone_page regardless of volume', async () => {
    const topics = [
      makeTopic({ id: 'pillar', title: 'Pillar Topic', cluster_role: 'pillar' }),
    ];

    vi.mocked(extractKeywords).mockResolvedValue(new Map([['pillar', 'pillar topic']]));
    // Very low volume - should still be standalone because it's a pillar
    vi.mocked(estimateVolumes).mockResolvedValue(new Map([
      ['pillar topic', makeVolumeEstimate('pillar topic', { estimatedMonthlyVolume: 5, estimatedContentDepth: 100 })],
    ]));

    const enriched = await enrichTopics(topics, baseBusinessInfo, dispatch);
    const pillar = enriched.find(t => t.id === 'pillar');
    expect(pillar!.page_decision).toBe('standalone_page');
    expect(pillar!.page_decision_confidence).toBeGreaterThanOrEqual(0.9);
  });
});
