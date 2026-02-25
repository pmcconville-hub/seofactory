import { describe, it, expect } from 'vitest';
import { suggestActionType, suggestPriority, createInitialEntries } from '../actionPlanService';
import type { EnrichedTopic } from '../../../types';

function makeTopic(overrides: Partial<EnrichedTopic> = {}): EnrichedTopic {
  return {
    id: 'test-1',
    map_id: 'map-1',
    parent_topic_id: null,
    title: 'Test Topic',
    slug: 'test-topic',
    description: 'A test topic',
    type: 'core',
    freshness: 'EVERGREEN' as any,
    ...overrides,
  };
}

describe('suggestActionType', () => {
  it('returns CREATE_NEW for topics without target_url', () => {
    const topic = makeTopic({ target_url: undefined });
    expect(suggestActionType(topic)).toBe('CREATE_NEW');
  });

  it('returns OPTIMIZE for topics with target_url', () => {
    const topic = makeTopic({ target_url: 'https://example.com/page' });
    expect(suggestActionType(topic)).toBe('OPTIMIZE');
  });

  it('returns REWRITE for thin, low-performing pages', () => {
    const topic = makeTopic({
      target_url: 'https://example.com/page',
      metadata: { word_count: 100, gsc_impressions: 5 },
    });
    expect(suggestActionType(topic)).toBe('REWRITE');
  });

  it('returns PRUNE_410 for zero-click, zero-impression pages', () => {
    const topic = makeTopic({
      target_url: 'https://example.com/dead',
      metadata: { gsc_impressions: 3, gsc_clicks: 0 },
    });
    expect(suggestActionType(topic)).toBe('PRUNE_410');
  });

  it('returns OPTIMIZE for pages with adequate performance', () => {
    const topic = makeTopic({
      target_url: 'https://example.com/ok',
      metadata: { gsc_impressions: 100, gsc_clicks: 10, word_count: 1500 },
    });
    expect(suggestActionType(topic)).toBe('OPTIMIZE');
  });
});

describe('suggestPriority', () => {
  it('returns critical for pillar pages', () => {
    const topic = makeTopic({ cluster_role: 'pillar' });
    expect(suggestPriority(topic)).toBe('critical');
  });

  it('returns high for core monetization pages', () => {
    const topic = makeTopic({ type: 'core', topic_class: 'monetization' });
    expect(suggestPriority(topic)).toBe('high');
  });

  it('returns medium for core informational pages', () => {
    const topic = makeTopic({ type: 'core', topic_class: 'informational' });
    expect(suggestPriority(topic)).toBe('medium');
  });

  it('returns low for outer pages', () => {
    const topic = makeTopic({ type: 'outer' });
    expect(suggestPriority(topic)).toBe('low');
  });
});

describe('createInitialEntries', () => {
  it('creates entries for all topics with wave assignments', () => {
    const topics = [
      makeTopic({ id: 't1', type: 'core', topic_class: 'monetization' }),
      makeTopic({ id: 't2', type: 'outer', target_url: 'https://example.com/existing' }),
    ];
    const waveMap = new Map<string, 1 | 2 | 3 | 4>([['t1', 1], ['t2', 4]]);

    const entries = createInitialEntries(topics, waveMap);

    expect(entries).toHaveLength(2);
    expect(entries[0].topicId).toBe('t1');
    expect(entries[0].actionType).toBe('CREATE_NEW');
    expect(entries[0].wave).toBe(1);
    expect(entries[1].topicId).toBe('t2');
    expect(entries[1].actionType).toBe('OPTIMIZE');
    expect(entries[1].wave).toBe(4);
  });

  it('defaults to wave 1 when topic not in wave map', () => {
    const topics = [makeTopic({ id: 'orphan' })];
    const waveMap = new Map<string, 1 | 2 | 3 | 4>();

    const entries = createInitialEntries(topics, waveMap);
    expect(entries[0].wave).toBe(1);
  });
});
