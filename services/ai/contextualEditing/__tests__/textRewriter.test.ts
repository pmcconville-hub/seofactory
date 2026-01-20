// services/ai/contextualEditing/__tests__/textRewriter.test.ts
import { describe, it, expect, vi } from 'vitest';
import { buildRewritePrompt, detectOptimalScope, shouldUseInlineDiff } from '../textRewriter';
import { QuickAction } from '../../../../types/contextualEditor';

describe('textRewriter', () => {
  describe('buildRewritePrompt', () => {
    it('includes algorithmic authorship rules', () => {
      const prompt = buildRewritePrompt({
        selectedText: 'Test text',
        action: 'improve_flow',
        surroundingContext: 'Before. Test text. After.',
      });

      expect(prompt).toContain('S-P-O');
      expect(prompt).toContain('one fact per sentence');
    });

    it('includes custom instruction when provided', () => {
      const prompt = buildRewritePrompt({
        selectedText: 'Test text',
        action: 'custom',
        customInstruction: 'Make it sound more local to Breda',
        surroundingContext: '',
      });

      expect(prompt).toContain('Make it sound more local to Breda');
    });
  });

  describe('detectOptimalScope', () => {
    it('returns selection for grammar fixes', () => {
      const scope = detectOptimalScope('fix_grammar', 'Just a typo here.');
      expect(scope).toBe('selection');
    });

    it('returns paragraph for flow improvements', () => {
      const scope = detectOptimalScope('improve_flow', 'Multiple sentences. That need flow.');
      expect(scope).toBe('paragraph');
    });

    it('returns section for tone changes', () => {
      const scope = detectOptimalScope('change_tone_formal', 'Any text here.');
      expect(scope).toBe('section');
    });
  });

  describe('shouldUseInlineDiff', () => {
    it('returns true for small changes', () => {
      const original = 'This is a short sentence.';
      const rewritten = 'This is a brief sentence.';
      expect(shouldUseInlineDiff(original, rewritten)).toBe(true);
    });

    it('returns false for large changes', () => {
      const original = 'Short.';
      const rewritten = 'This is now a much longer piece of text that has been significantly expanded with many more words and details that were not present in the original version of the text.';
      expect(shouldUseInlineDiff(original, rewritten)).toBe(false);
    });
  });
});
