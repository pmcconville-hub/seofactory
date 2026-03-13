import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the AI provider dispatcher and all provider services to force heuristic fallback
vi.mock('../providerDispatcher', () => ({
  dispatchToProvider: vi.fn(),
}));
vi.mock('../../geminiService', () => ({ generateJson: vi.fn() }));
vi.mock('../../openAiService', () => ({ generateJson: vi.fn() }));
vi.mock('../../anthropicService', () => ({ generateJson: vi.fn() }));
vi.mock('../../perplexityService', () => ({ generateJson: vi.fn() }));
vi.mock('../../openRouterService', () => ({ generateJson: vi.fn() }));
vi.mock('../../../config/prompts/keywordExtraction', () => ({
  KEYWORD_EXTRACTION_PROMPT: vi.fn(() => 'test prompt'),
}));

import { extractKeywords } from '../keywordExtraction';
import { dispatchToProvider } from '../providerDispatcher';
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

describe('keywordExtraction', () => {
  const dispatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return AI-extracted keywords on success', async () => {
    vi.mocked(dispatchToProvider).mockResolvedValue([
      { id: 't1', keyword: 'react hooks' },
      { id: 't2', keyword: 'vue composition' },
    ]);

    const topics = [
      makeTopic({ id: 't1', title: 'Understanding React Hooks' }),
      makeTopic({ id: 't2', title: 'Vue Composition API Guide' }),
    ];

    const result = await extractKeywords(topics, baseBusinessInfo, dispatch);

    expect(result.get('t1')).toBe('react hooks');
    expect(result.get('t2')).toBe('vue composition');
  });

  it('should fall back to heuristic extraction when AI fails', async () => {
    vi.mocked(dispatchToProvider).mockRejectedValue(new Error('AI service unavailable'));

    const topics = [
      makeTopic({ id: 't1', title: 'Understanding React Hooks' }),
      makeTopic({ id: 't2', title: 'Complete Guide to Vue Composition API' }),
      makeTopic({ id: 't3', title: 'How to Use TypeScript Generics' }),
      makeTopic({ id: 't4', title: 'What is Machine Learning in 2025' }),
      makeTopic({ id: 't5', title: 'Benefits of Cloud Computing for Enterprises' }),
    ];

    const result = await extractKeywords(topics, baseBusinessInfo, dispatch);

    // Heuristic should strip common prefixes and return core keywords
    expect(result.get('t1')).toBe('react hooks');
    expect(result.get('t2')).toBe('vue composition api');
    // "How to Use TypeScript Generics" -> strips "how to" prefix -> "use typescript generics"
    expect(result.get('t3')).toBe('use typescript generics');
    // "What is Machine Learning in 2025" -> strip "what is", strip trailing year
    expect(result.get('t4')).toBe('machine learning');
    // "Benefits of Cloud Computing for Enterprises" -> strip "benefits of", strip "for enterprises"
    expect(result.get('t5')).toBe('cloud computing');
  });

  it('should handle empty topics array', async () => {
    const result = await extractKeywords([], baseBusinessInfo, dispatch);
    expect(result.size).toBe(0);
  });

  it('should process topics in batches of 30', async () => {
    // Create 65 topics to test batching (3 batches: 30 + 30 + 5)
    const topics = Array.from({ length: 65 }, (_, i) =>
      makeTopic({ id: `t${i}`, title: `Topic ${i}` })
    );

    vi.mocked(dispatchToProvider).mockResolvedValue(
      topics.slice(0, 30).map(t => ({ id: t.id, keyword: t.title.toLowerCase() }))
    );

    await extractKeywords(topics, baseBusinessInfo, dispatch);

    // dispatchToProvider should be called 3 times (30 + 30 + 5)
    expect(dispatchToProvider).toHaveBeenCalledTimes(3);
  });

  it('should dispatch progress events for each batch', async () => {
    vi.mocked(dispatchToProvider).mockResolvedValue([
      { id: 't1', keyword: 'test' },
    ]);

    const topics = [makeTopic({ id: 't1', title: 'Test Topic' })];

    await extractKeywords(topics, baseBusinessInfo, dispatch);

    const logCalls = dispatch.mock.calls.filter(
      call => call[0]?.type === 'LOG_EVENT' && call[0]?.payload?.service === 'KeywordExtraction'
    );
    expect(logCalls.length).toBeGreaterThanOrEqual(1);
  });
});
