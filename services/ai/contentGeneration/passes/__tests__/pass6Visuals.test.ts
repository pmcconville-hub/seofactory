// services/ai/contentGeneration/passes/__tests__/pass6Visuals.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Verify that pass6Visuals.ts imports visual-semantics prompt builders
 * with correct naming, not the legacy pass-4-numbered builders.
 *
 * Pass 6 in the execution order is Visual Semantics.
 * It must import visual-semantics prompt builders, not pass-4-named ones.
 */
describe('pass6Visuals prompt builder imports', () => {
  const pass6Source = readFileSync(
    resolve(__dirname, '..', 'pass6Visuals.ts'),
    'utf-8'
  );

  it('should NOT import buildPass4Prompt (wrong pass number)', () => {
    expect(pass6Source).not.toMatch(/buildPass4Prompt/);
  });

  it('should NOT import buildPass4BatchPrompt (wrong pass number)', () => {
    expect(pass6Source).not.toMatch(/buildPass4BatchPrompt/);
  });

  it('should import buildVisualSemanticsPrompt', () => {
    expect(pass6Source).toMatch(/buildVisualSemanticsPrompt/);
  });

  it('should import buildVisualSemanticsBatchPrompt', () => {
    expect(pass6Source).toMatch(/buildVisualSemanticsBatchPrompt/);
  });

  it('should use buildVisualSemanticsPrompt as the promptBuilder', () => {
    // The promptBuilder property should reference the visual semantics builder
    expect(pass6Source).toMatch(/promptBuilder:\s*buildVisualSemanticsPrompt/);
  });

  it('should use buildVisualSemanticsBatchPrompt as the buildBatchPrompt', () => {
    // The buildBatchPrompt property should reference the visual semantics batch builder
    expect(pass6Source).toMatch(/buildBatchPrompt:\s*buildVisualSemanticsBatchPrompt/);
  });
});

/**
 * Verify that the prompt builder module exports the visual-semantics builders.
 */
describe('sectionOptimizationPromptBuilder exports', () => {
  it('should export buildVisualSemanticsPrompt', async () => {
    const module = await import('../../rulesEngine/prompts/sectionOptimizationPromptBuilder');
    expect(module.buildVisualSemanticsPrompt).toBeDefined();
    expect(typeof module.buildVisualSemanticsPrompt).toBe('function');
  });

  it('should export buildVisualSemanticsBatchPrompt', async () => {
    const module = await import('../../rulesEngine/prompts/sectionOptimizationPromptBuilder');
    expect(module.buildVisualSemanticsBatchPrompt).toBeDefined();
    expect(typeof module.buildVisualSemanticsBatchPrompt).toBe('function');
  });
});
