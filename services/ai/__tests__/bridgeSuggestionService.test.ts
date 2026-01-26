import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateBridgeSuggestions,
  batchGenerateBridgeSuggestions,
  BridgeSuggestionInput,
  BridgeSuggestion,
  ResearchQuestion,
  TopicSuggestion,
} from '../bridgeSuggestionService';
import * as geminiService from '../../geminiService';
import * as openAiService from '../../openAiService';
import * as anthropicService from '../../anthropicService';
import * as perplexityService from '../../perplexityService';
import * as openRouterService from '../../openRouterService';
import { BusinessInfo } from '../../../types';

// Mock all AI provider services
vi.mock('../../geminiService', () => ({
  generateText: vi.fn(),
}));
vi.mock('../../openAiService', () => ({
  generateText: vi.fn(),
}));
vi.mock('../../anthropicService', () => ({
  generateText: vi.fn(),
}));
vi.mock('../../perplexityService', () => ({
  generateText: vi.fn(),
}));
vi.mock('../../openRouterService', () => ({
  generateText: vi.fn(),
}));

// Helper to create minimal BusinessInfo
function createBusinessInfo(provider: string = 'gemini'): BusinessInfo {
  return {
    domain: 'test.com',
    projectName: 'Test Project',
    industry: 'Technology',
    model: 'gpt-4',
    valueProp: 'Test value proposition',
    audience: 'Developers',
    expertise: 'Software development',
    seedKeyword: 'testing',
    language: 'en',
    targetMarket: 'US',
    aiProvider: provider,
    geminiApiKey: 'test-key',
    openAiApiKey: 'test-key',
    anthropicApiKey: 'test-key',
    perplexityApiKey: 'test-key',
    openRouterApiKey: 'test-key',
  } as BusinessInfo;
}

// Helper to create test input
function createInput(overrides?: Partial<BridgeSuggestionInput>): BridgeSuggestionInput {
  return {
    clusterATerms: ['React', 'Virtual DOM', 'Components'],
    clusterBTerms: ['Redux', 'State Management', 'Actions'],
    centralEntity: 'JavaScript',
    sourceContext: 'Web Development',
    centralSearchIntent: ['learn react state management', 'frontend architecture'],
    businessInfo: createBusinessInfo(),
    ...overrides,
  };
}

// Mock dispatch function
const mockDispatch = vi.fn();

// Sample valid AI response
const validAIResponse = JSON.stringify({
  researchQuestions: [
    {
      question: 'How does React integrate with Redux for scalable state management?',
      targetAttribute: 'unique',
      entityA: 'React',
      entityB: 'Redux',
    },
    {
      question: 'What are the performance implications of Virtual DOM with large Redux stores?',
      targetAttribute: 'root',
      entityA: 'Virtual DOM',
      entityB: 'Redux',
    },
  ],
  topicSuggestions: [
    {
      title: 'React-Redux Integration Patterns',
      predicates: ['uses', 'optimizes', 'connects'],
      bridgesEntities: ['React', 'Redux'],
    },
    {
      title: 'Virtual DOM Performance with State Management Libraries',
      predicates: ['renders', 'reconciles', 'syncs'],
      bridgesEntities: ['Virtual DOM', 'State Management'],
    },
  ],
  briefOutline: {
    centralEntity: 'JavaScript',
    sourceContextConnection: 'Web Development frameworks like React leverage Redux for state',
    attributePrioritization: {
      unique: ['component lifecycle integration'],
      root: ['state synchronization'],
      rare: ['time-travel debugging'],
    },
    headingVector: [
      'Understanding React-Redux Architecture',
      'Virtual DOM and State Management Synergy',
      'Implementation Best Practices',
    ],
    internalLinks: {
      from: ['React Components', 'Virtual DOM'],
      to: ['Redux Store', 'State Management'],
    },
  },
});

describe('bridgeSuggestionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('generateBridgeSuggestions', () => {
    it('should generate research questions from AI response', async () => {
      vi.mocked(geminiService.generateText).mockResolvedValue(validAIResponse);

      const input = createInput();
      const result = await generateBridgeSuggestions(input);

      expect(result.researchQuestions).toBeDefined();
      expect(result.researchQuestions.length).toBeGreaterThan(0);

      // Verify first research question structure
      const firstQuestion = result.researchQuestions[0];
      expect(firstQuestion).toHaveProperty('question');
      expect(firstQuestion).toHaveProperty('targetAttribute');
      expect(firstQuestion).toHaveProperty('entityA');
      expect(firstQuestion).toHaveProperty('entityB');
      expect(['unique', 'root', 'rare']).toContain(firstQuestion.targetAttribute);
    });

    it('should generate topic suggestions with predicates', async () => {
      vi.mocked(geminiService.generateText).mockResolvedValue(validAIResponse);

      const input = createInput();
      const result = await generateBridgeSuggestions(input);

      expect(result.topicSuggestions).toBeDefined();
      expect(result.topicSuggestions.length).toBeGreaterThan(0);

      // Verify topic suggestions structure
      const firstTopic = result.topicSuggestions[0];
      expect(firstTopic).toHaveProperty('title');
      expect(firstTopic).toHaveProperty('predicates');
      expect(firstTopic).toHaveProperty('bridgesEntities');
      expect(Array.isArray(firstTopic.predicates)).toBe(true);
      expect(firstTopic.predicates.length).toBeGreaterThan(0);
      expect(Array.isArray(firstTopic.bridgesEntities)).toBe(true);
      expect(firstTopic.bridgesEntities.length).toBe(2);
    });

    it('should include brief outline when includeOutline is true', async () => {
      vi.mocked(geminiService.generateText).mockResolvedValue(validAIResponse);

      const input = createInput();
      const result = await generateBridgeSuggestions(input, true);

      expect(result.briefOutline).toBeDefined();
      expect(result.briefOutline).toHaveProperty('centralEntity');
      expect(result.briefOutline).toHaveProperty('sourceContextConnection');
      expect(result.briefOutline).toHaveProperty('attributePrioritization');
      expect(result.briefOutline).toHaveProperty('headingVector');
      expect(result.briefOutline).toHaveProperty('internalLinks');

      // Verify attributePrioritization structure
      const attrPrio = result.briefOutline!.attributePrioritization;
      expect(attrPrio).toHaveProperty('unique');
      expect(attrPrio).toHaveProperty('root');
      expect(attrPrio).toHaveProperty('rare');
    });

    it('should not include brief outline when includeOutline is false', async () => {
      // Response without briefOutline
      const responseWithoutOutline = JSON.stringify({
        researchQuestions: [
          {
            question: 'Test question?',
            targetAttribute: 'unique',
            entityA: 'A',
            entityB: 'B',
          },
        ],
        topicSuggestions: [
          {
            title: 'Test Topic',
            predicates: ['uses'],
            bridgesEntities: ['A', 'B'],
          },
        ],
      });

      vi.mocked(geminiService.generateText).mockResolvedValue(responseWithoutOutline);

      const input = createInput();
      const result = await generateBridgeSuggestions(input, false);

      expect(result.briefOutline).toBeUndefined();
    });

    it('should provide fallback suggestions when AI fails', async () => {
      vi.mocked(geminiService.generateText).mockRejectedValue(new Error('API error'));

      const input = createInput();
      const result = await generateBridgeSuggestions(input);

      // Should still return valid structure with fallback data
      expect(result.researchQuestions).toBeDefined();
      expect(result.researchQuestions.length).toBeGreaterThan(0);
      expect(result.topicSuggestions).toBeDefined();
      expect(result.topicSuggestions.length).toBeGreaterThan(0);

      // Fallback should use input entities
      const question = result.researchQuestions[0];
      expect(input.clusterATerms.includes(question.entityA) ||
             input.clusterBTerms.includes(question.entityA) ||
             question.entityA === input.centralEntity).toBe(true);
    });

    it('should provide fallback when AI returns invalid JSON', async () => {
      vi.mocked(geminiService.generateText).mockResolvedValue('This is not valid JSON');

      const input = createInput();
      const result = await generateBridgeSuggestions(input);

      // Should still return valid fallback structure
      expect(result.researchQuestions).toBeDefined();
      expect(result.topicSuggestions).toBeDefined();
    });

    it('should use openai provider when specified in businessInfo', async () => {
      vi.mocked(openAiService.generateText).mockResolvedValue(validAIResponse);

      const input = createInput({ businessInfo: createBusinessInfo('openai') });
      await generateBridgeSuggestions(input);

      expect(openAiService.generateText).toHaveBeenCalled();
      expect(geminiService.generateText).not.toHaveBeenCalled();
    });

    it('should use anthropic provider when specified in businessInfo', async () => {
      vi.mocked(anthropicService.generateText).mockResolvedValue(validAIResponse);

      const input = createInput({ businessInfo: createBusinessInfo('anthropic') });
      await generateBridgeSuggestions(input);

      expect(anthropicService.generateText).toHaveBeenCalled();
      expect(geminiService.generateText).not.toHaveBeenCalled();
    });

    it('should include business context in prompt when provided', async () => {
      vi.mocked(geminiService.generateText).mockResolvedValue(validAIResponse);

      const businessInfo = createBusinessInfo();
      const input = createInput({ businessInfo });
      await generateBridgeSuggestions(input);

      // Verify that generateText was called with a prompt containing business context
      expect(geminiService.generateText).toHaveBeenCalled();
      const callArgs = vi.mocked(geminiService.generateText).mock.calls[0];
      const prompt = callArgs[0];

      // Prompt should reference business context
      expect(prompt).toContain(businessInfo.industry);
    });

    it('should handle empty cluster terms gracefully', async () => {
      vi.mocked(geminiService.generateText).mockResolvedValue(validAIResponse);

      const input = createInput({
        clusterATerms: [],
        clusterBTerms: ['Redux'],
      });

      // Should not throw, should return fallback or handle gracefully
      const result = await generateBridgeSuggestions(input);
      expect(result).toBeDefined();
      expect(result.researchQuestions).toBeDefined();
    });
  });

  describe('batchGenerateBridgeSuggestions', () => {
    it('should process multiple inputs sequentially', async () => {
      vi.mocked(geminiService.generateText).mockResolvedValue(validAIResponse);

      const inputs = [
        createInput(),
        createInput({
          clusterATerms: ['Vue', 'Reactivity'],
          clusterBTerms: ['Vuex', 'Mutations'],
        }),
      ];

      const results = await batchGenerateBridgeSuggestions(inputs);

      expect(results).toHaveLength(2);
      expect(results[0].researchQuestions).toBeDefined();
      expect(results[1].researchQuestions).toBeDefined();
    });

    it('should return results for all inputs even if some fail', async () => {
      // First call succeeds, second fails
      vi.mocked(geminiService.generateText)
        .mockResolvedValueOnce(validAIResponse)
        .mockRejectedValueOnce(new Error('API error'));

      const inputs = [createInput(), createInput()];

      const results = await batchGenerateBridgeSuggestions(inputs);

      // Both should have results (second should have fallback)
      expect(results).toHaveLength(2);
      expect(results[0].researchQuestions.length).toBeGreaterThan(0);
      expect(results[1].researchQuestions.length).toBeGreaterThan(0);
    });

    it('should include outlines when includeOutlines is true', async () => {
      vi.mocked(geminiService.generateText).mockResolvedValue(validAIResponse);

      const inputs = [createInput()];
      const results = await batchGenerateBridgeSuggestions(inputs, true);

      expect(results[0].briefOutline).toBeDefined();
    });

    it('should handle empty input array', async () => {
      const results = await batchGenerateBridgeSuggestions([]);
      expect(results).toEqual([]);
    });
  });

  describe('Response validation', () => {
    it('should validate research question targetAttribute values', async () => {
      const invalidResponse = JSON.stringify({
        researchQuestions: [
          {
            question: 'Test?',
            targetAttribute: 'invalid_type', // Invalid
            entityA: 'A',
            entityB: 'B',
          },
        ],
        topicSuggestions: [],
      });

      vi.mocked(geminiService.generateText).mockResolvedValue(invalidResponse);

      const input = createInput();
      const result = await generateBridgeSuggestions(input);

      // Should fallback or normalize invalid values
      if (result.researchQuestions.length > 0) {
        const validTypes = ['unique', 'root', 'rare'];
        result.researchQuestions.forEach((q) => {
          expect(validTypes).toContain(q.targetAttribute);
        });
      }
    });

    it('should ensure bridgesEntities is always a tuple of 2', async () => {
      const invalidResponse = JSON.stringify({
        researchQuestions: [],
        topicSuggestions: [
          {
            title: 'Test Topic',
            predicates: ['uses'],
            bridgesEntities: ['A', 'B', 'C'], // Invalid - more than 2
          },
        ],
      });

      vi.mocked(geminiService.generateText).mockResolvedValue(invalidResponse);

      const input = createInput();
      const result = await generateBridgeSuggestions(input);

      // Should normalize to exactly 2 entities
      result.topicSuggestions.forEach((topic) => {
        expect(topic.bridgesEntities.length).toBe(2);
      });
    });
  });

  describe('Prompt content', () => {
    it('should include cluster terms in the prompt', async () => {
      vi.mocked(geminiService.generateText).mockResolvedValue(validAIResponse);

      const input = createInput();
      await generateBridgeSuggestions(input);

      const prompt = vi.mocked(geminiService.generateText).mock.calls[0][0];

      // Should mention cluster terms
      expect(prompt).toContain('React');
      expect(prompt).toContain('Redux');
    });

    it('should include central entity in the prompt', async () => {
      vi.mocked(geminiService.generateText).mockResolvedValue(validAIResponse);

      const input = createInput({ centralEntity: 'TypeScript' });
      await generateBridgeSuggestions(input);

      const prompt = vi.mocked(geminiService.generateText).mock.calls[0][0];
      expect(prompt).toContain('TypeScript');
    });

    it('should include search intents in the prompt', async () => {
      vi.mocked(geminiService.generateText).mockResolvedValue(validAIResponse);

      const input = createInput({
        centralSearchIntent: ['custom search intent one', 'custom search intent two'],
      });
      await generateBridgeSuggestions(input);

      const prompt = vi.mocked(geminiService.generateText).mock.calls[0][0];
      expect(prompt).toContain('custom search intent');
    });
  });
});
