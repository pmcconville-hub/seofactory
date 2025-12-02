// services/ai/contentGeneration/passes/auditChecks.test.ts
import { describe, it, expect } from 'vitest';
import { runAlgorithmicAudit } from './auditChecks';
import { ContentBrief, BusinessInfo } from '../../../../types';

// Helper to create minimal test fixtures
const createMockBrief = (overrides: Partial<ContentBrief> = {}): ContentBrief => ({
  title: 'Test Article Title',
  metaDescription: 'Test meta description',
  outline: '## Introduction\n## Section 1',
  keyTakeaways: ['Takeaway 1'],
  targetWordCount: 1500,
  ...overrides
} as ContentBrief);

const createMockBusinessInfo = (overrides: Partial<BusinessInfo> = {}): BusinessInfo => ({
  seedKeyword: 'test keyword',
  domain: 'example.com',
  projectName: 'Test Project',
  industry: 'Technology',
  model: 'B2B',
  valueProp: 'Test value',
  audience: 'Test audience',
  expertise: 'Expert',
  language: 'en',
  targetMarket: 'US',
  aiProvider: 'anthropic',
  aiModel: 'claude-3-sonnet',
  supabaseUrl: 'https://test.supabase.co',
  supabaseAnonKey: 'test-key',
  ...overrides
} as BusinessInfo);

describe('runAlgorithmicAudit', () => {
  it('returns array of audit results', () => {
    const draft = '## Introduction\n\nTest keyword is a concept that means something specific.';
    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = runAlgorithmicAudit(draft, brief, info);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    results.forEach(r => {
      expect(r).toHaveProperty('ruleName');
      expect(r).toHaveProperty('isPassing');
      expect(r).toHaveProperty('details');
    });
  });
});

describe('checkLLMSignaturePhrases', () => {
  it('fails when draft contains LLM signature phrases', () => {
    const draft = `## Introduction

Overall, test keyword is important. It's important to note that this concept delves into many areas.
In conclusion, we have explored the world of test keywords.`;
    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = runAlgorithmicAudit(draft, brief, info);
    const llmCheck = results.find(r => r.ruleName === 'LLM Phrase Detection');

    expect(llmCheck).toBeDefined();
    expect(llmCheck?.isPassing).toBe(false);
    expect(llmCheck?.details).toContain('overall');
  });

  it('passes when draft has no LLM signature phrases', () => {
    const draft = `## Introduction

Test keyword represents a specific methodology. This approach provides measurable benefits.
The framework enables efficient implementation.`;
    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = runAlgorithmicAudit(draft, brief, info);
    const llmCheck = results.find(r => r.ruleName === 'LLM Phrase Detection');

    expect(llmCheck).toBeDefined();
    expect(llmCheck?.isPassing).toBe(true);
  });
});
