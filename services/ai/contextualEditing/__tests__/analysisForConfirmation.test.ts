// services/ai/contextualEditing/__tests__/analysisForConfirmation.test.ts
import { describe, it, expect } from 'vitest';
import {
  buildServiceDetectionPrompt,
  buildFactDetectionPrompt,
  buildConfirmedRewritePrompt,
} from '../analysisForConfirmation';
import { DetectedItem } from '../../../../types/contextualEditor';
import { SemanticTriple } from '../../../../types';

describe('analysisForConfirmation', () => {
  describe('buildServiceDetectionPrompt', () => {
    it('includes the selected text in the prompt', () => {
      const selectedText = 'We offer premium web design services for local businesses.';
      const businessOfferings = ['web design', 'SEO consulting'];

      const prompt = buildServiceDetectionPrompt(selectedText, businessOfferings);

      expect(prompt).toContain(selectedText);
    });

    it('includes business offerings when provided', () => {
      const selectedText = 'Our services include graphic design.';
      const businessOfferings = ['web design', 'SEO consulting', 'content writing'];

      const prompt = buildServiceDetectionPrompt(selectedText, businessOfferings);

      expect(prompt).toContain('web design, SEO consulting, content writing');
    });

    it('handles empty business offerings gracefully', () => {
      const selectedText = 'We provide excellent services.';
      const businessOfferings: string[] = [];

      const prompt = buildServiceDetectionPrompt(selectedText, businessOfferings);

      expect(prompt).toContain('No specific services listed');
    });

    it('requests JSON output format', () => {
      const selectedText = 'Test text';
      const businessOfferings = ['service1'];

      const prompt = buildServiceDetectionPrompt(selectedText, businessOfferings);

      expect(prompt).toContain('JSON');
      expect(prompt).toContain('```json');
      expect(prompt).toContain('textFragment');
      expect(prompt).toContain('itemType');
      expect(prompt).toContain('aiAssessment');
    });

    it('includes assessment categories in output format', () => {
      const selectedText = 'Test text';
      const businessOfferings = ['service1'];

      const prompt = buildServiceDetectionPrompt(selectedText, businessOfferings);

      expect(prompt).toContain('potentially_incorrect');
      expect(prompt).toContain('unverified');
      expect(prompt).toContain('needs_review');
    });

    it('includes service_mention as the item type', () => {
      const selectedText = 'Test text';
      const businessOfferings = ['service1'];

      const prompt = buildServiceDetectionPrompt(selectedText, businessOfferings);

      expect(prompt).toContain('service_mention');
    });
  });

  describe('buildFactDetectionPrompt', () => {
    it('includes the selected text in the prompt', () => {
      const selectedText = 'Our company was founded in 1995 and has served over 10,000 customers.';

      const prompt = buildFactDetectionPrompt(selectedText);

      expect(prompt).toContain(selectedText);
    });

    it('includes EAVs when provided', () => {
      const selectedText = 'The product has a pH level of 7.0.';
      const eavs: SemanticTriple[] = [
        {
          subject: { label: 'Product X', type: 'Product' },
          predicate: { relation: 'has pH level', type: 'specification' },
          object: { value: '7.5', type: 'number', unit: 'pH' },
        },
      ];

      const prompt = buildFactDetectionPrompt(selectedText, eavs);

      expect(prompt).toContain('Known Facts');
      expect(prompt).toContain('Product X');
      expect(prompt).toContain('has pH level');
      expect(prompt).toContain('7.5');
      expect(prompt).toContain('pH');
    });

    it('handles multiple EAVs grouped by subject', () => {
      const selectedText = 'Test text';
      const eavs: SemanticTriple[] = [
        {
          subject: { label: 'Company', type: 'Organization' },
          predicate: { relation: 'founded in', type: 'date' },
          object: { value: '1995', type: 'year' },
        },
        {
          subject: { label: 'Company', type: 'Organization' },
          predicate: { relation: 'has employees', type: 'count' },
          object: { value: 50, type: 'number' },
        },
        {
          subject: { label: 'Product', type: 'Item' },
          predicate: { relation: 'costs', type: 'price' },
          object: { value: '99.99', type: 'currency', unit: 'USD' },
        },
      ];

      const prompt = buildFactDetectionPrompt(selectedText, eavs);

      expect(prompt).toContain('**Company:**');
      expect(prompt).toContain('**Product:**');
      expect(prompt).toContain('founded in');
      expect(prompt).toContain('has employees');
      expect(prompt).toContain('costs');
    });

    it('handles empty EAVs array', () => {
      const selectedText = 'Test text';
      const eavs: SemanticTriple[] = [];

      const prompt = buildFactDetectionPrompt(selectedText, eavs);

      // Should not include Known Facts section when empty
      expect(prompt).not.toContain('Known Facts');
    });

    it('handles undefined EAVs', () => {
      const selectedText = 'Test text';

      const prompt = buildFactDetectionPrompt(selectedText, undefined);

      expect(prompt).not.toContain('Known Facts');
    });

    it('requests JSON output format', () => {
      const selectedText = 'Test text';

      const prompt = buildFactDetectionPrompt(selectedText);

      expect(prompt).toContain('JSON');
      expect(prompt).toContain('```json');
      expect(prompt).toContain('textFragment');
      expect(prompt).toContain('itemType');
      expect(prompt).toContain('aiAssessment');
    });

    it('includes factual claim item types in output format', () => {
      const selectedText = 'Test text';

      const prompt = buildFactDetectionPrompt(selectedText);

      expect(prompt).toContain('factual_claim');
      expect(prompt).toContain('unverified_statement');
    });

    it('includes verification guidance when EAVs are provided', () => {
      const selectedText = 'Test text';
      const eavs: SemanticTriple[] = [
        {
          subject: { label: 'Test', type: 'Thing' },
          predicate: { relation: 'has', type: 'property' },
          object: { value: 'value', type: 'string' },
        },
      ];

      const prompt = buildFactDetectionPrompt(selectedText, eavs);

      expect(prompt).toContain('Compare claims against the Known Facts above');
      expect(prompt).toContain('contradicts the Known Facts above');
    });

    it('does not include EAV verification guidance when no EAVs', () => {
      const selectedText = 'Test text';

      const prompt = buildFactDetectionPrompt(selectedText);

      expect(prompt).not.toContain('Compare claims against the Known Facts above');
    });
  });

  describe('buildConfirmedRewritePrompt', () => {
    const createDetectedItem = (
      overrides: Partial<DetectedItem> = {}
    ): DetectedItem => ({
      id: 'test-id',
      textFragment: 'default text fragment',
      itemType: 'factual_claim',
      aiAssessment: 'needs_review',
      userDecision: null,
      reason: 'default reason',
      ...overrides,
    });

    it('includes the original selected text', () => {
      const selectedText = 'Our company provides the best services in the industry.';
      const detectedItems: DetectedItem[] = [];

      const prompt = buildConfirmedRewritePrompt(selectedText, detectedItems);

      expect(prompt).toContain(selectedText);
    });

    it('includes items marked as keep', () => {
      const selectedText = 'Test text';
      const detectedItems: DetectedItem[] = [
        createDetectedItem({
          textFragment: 'verified claim',
          userDecision: 'keep',
          reason: 'This is accurate',
        }),
      ];

      const prompt = buildConfirmedRewritePrompt(selectedText, detectedItems);

      expect(prompt).toContain('Keep These Items Unchanged');
      expect(prompt).toContain('verified claim');
      expect(prompt).toContain('This is accurate');
    });

    it('includes items marked as remove', () => {
      const selectedText = 'Test text';
      const detectedItems: DetectedItem[] = [
        createDetectedItem({
          textFragment: 'false claim',
          userDecision: 'remove',
          reason: 'This is inaccurate',
        }),
      ];

      const prompt = buildConfirmedRewritePrompt(selectedText, detectedItems);

      expect(prompt).toContain('Remove These Items');
      expect(prompt).toContain('false claim');
      expect(prompt).toContain('This is inaccurate');
    });

    it('includes items marked as fix with userCorrection', () => {
      const selectedText = 'Test text';
      const detectedItems: DetectedItem[] = [
        createDetectedItem({
          textFragment: '10,000 customers',
          userDecision: 'fix',
          userCorrection: '5,000 customers',
          reason: 'Number is incorrect',
        }),
      ];

      const prompt = buildConfirmedRewritePrompt(selectedText, detectedItems);

      expect(prompt).toContain('Fix These Items');
      expect(prompt).toContain('10,000 customers');
      expect(prompt).toContain('Correct to: "5,000 customers"');
      expect(prompt).toContain('Number is incorrect');
    });

    it('includes items marked as fix without userCorrection', () => {
      const selectedText = 'Test text';
      const detectedItems: DetectedItem[] = [
        createDetectedItem({
          textFragment: 'vague claim',
          userDecision: 'fix',
          reason: 'Needs clarification',
        }),
      ];

      const prompt = buildConfirmedRewritePrompt(selectedText, detectedItems);

      expect(prompt).toContain('Fix These Items');
      expect(prompt).toContain('vague claim');
      expect(prompt).toContain('Improve accuracy/clarity');
    });

    it('includes custom instruction when provided', () => {
      const selectedText = 'Test text';
      const detectedItems: DetectedItem[] = [];
      const customInstruction = 'Make it sound more professional and use British English.';

      const prompt = buildConfirmedRewritePrompt(
        selectedText,
        detectedItems,
        customInstruction
      );

      expect(prompt).toContain('Additional Instructions');
      expect(prompt).toContain(customInstruction);
    });

    it('does not include custom instruction section when not provided', () => {
      const selectedText = 'Test text';
      const detectedItems: DetectedItem[] = [];

      const prompt = buildConfirmedRewritePrompt(selectedText, detectedItems);

      expect(prompt).not.toContain('Additional Instructions');
    });

    it('handles mixed decisions correctly', () => {
      const selectedText = 'Complex text with multiple claims.';
      const detectedItems: DetectedItem[] = [
        createDetectedItem({
          id: '1',
          textFragment: 'keep this',
          userDecision: 'keep',
          reason: 'Verified',
        }),
        createDetectedItem({
          id: '2',
          textFragment: 'fix this',
          userDecision: 'fix',
          userCorrection: 'fixed version',
          reason: 'Needs fix',
        }),
        createDetectedItem({
          id: '3',
          textFragment: 'remove this',
          userDecision: 'remove',
          reason: 'Inaccurate',
        }),
      ];

      const prompt = buildConfirmedRewritePrompt(selectedText, detectedItems);

      expect(prompt).toContain('Keep These Items Unchanged');
      expect(prompt).toContain('keep this');
      expect(prompt).toContain('Fix These Items');
      expect(prompt).toContain('fix this');
      expect(prompt).toContain('Remove These Items');
      expect(prompt).toContain('remove this');
    });

    it('includes S-P-O sentence structure rule', () => {
      const selectedText = 'Test text';
      const detectedItems: DetectedItem[] = [];

      const prompt = buildConfirmedRewritePrompt(selectedText, detectedItems);

      expect(prompt).toContain('S-P-O');
      expect(prompt).toContain('Subject-Predicate-Object');
    });

    it('includes word limit rule', () => {
      const selectedText = 'Test text';
      const detectedItems: DetectedItem[] = [];

      const prompt = buildConfirmedRewritePrompt(selectedText, detectedItems);

      expect(prompt).toContain('30 words');
    });

    it('does not include keep section when no items to keep', () => {
      const selectedText = 'Test text';
      const detectedItems: DetectedItem[] = [
        createDetectedItem({
          textFragment: 'remove this',
          userDecision: 'remove',
          reason: 'Inaccurate',
        }),
      ];

      const prompt = buildConfirmedRewritePrompt(selectedText, detectedItems);

      expect(prompt).not.toContain('Keep These Items Unchanged');
      expect(prompt).toContain('Remove These Items');
    });

    it('does not include fix section when no items to fix', () => {
      const selectedText = 'Test text';
      const detectedItems: DetectedItem[] = [
        createDetectedItem({
          textFragment: 'keep this',
          userDecision: 'keep',
          reason: 'Verified',
        }),
      ];

      const prompt = buildConfirmedRewritePrompt(selectedText, detectedItems);

      expect(prompt).not.toContain('Fix These Items');
      expect(prompt).toContain('Keep These Items Unchanged');
    });

    it('does not include remove section when no items to remove', () => {
      const selectedText = 'Test text';
      const detectedItems: DetectedItem[] = [
        createDetectedItem({
          textFragment: 'fix this',
          userDecision: 'fix',
          reason: 'Needs improvement',
        }),
      ];

      const prompt = buildConfirmedRewritePrompt(selectedText, detectedItems);

      expect(prompt).not.toContain('Remove These Items');
      expect(prompt).toContain('Fix These Items');
    });

    it('filters out items with null userDecision', () => {
      const selectedText = 'Test text';
      const detectedItems: DetectedItem[] = [
        createDetectedItem({
          id: '1',
          textFragment: 'undecided item',
          userDecision: null,
          reason: 'Not reviewed',
        }),
        createDetectedItem({
          id: '2',
          textFragment: 'keep this',
          userDecision: 'keep',
          reason: 'Verified',
        }),
      ];

      const prompt = buildConfirmedRewritePrompt(selectedText, detectedItems);

      expect(prompt).not.toContain('undecided item');
      expect(prompt).toContain('keep this');
    });
  });
});
