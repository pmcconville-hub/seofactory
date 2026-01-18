// services/ai/contentGeneration/__tests__/conflictResolver.test.ts
import { describe, it, expect } from 'vitest';
import { detectConflicts, resolveConflicts, generateSeoArgument } from '../conflictResolver';
import { CONTENT_TEMPLATES } from '../../../../config/contentTemplates';
import { FormatCode } from '../../../../types/content';

describe('conflictResolver', () => {
  describe('detectConflicts', () => {
    it('should detect no conflicts when brief matches template', () => {
      const template = CONTENT_TEMPLATES.DEFINITIONAL;
      const brief = {
        structured_outline: [
          { heading: 'What is Test Entity?', format_code: 'FS' },
          { heading: 'Key Characteristics', format_code: 'LISTING' },
        ],
      };

      const result = detectConflicts(template, brief as any);

      expect(result.hasConflicts).toBe(false);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should detect format code conflict', () => {
      const template = CONTENT_TEMPLATES.ECOMMERCE_PRODUCT;
      const brief = {
        structured_outline: [
          { heading: 'Key Features', format_code: 'PROSE' }, // Should be LISTING
        ],
      };

      const result = detectConflicts(template, brief as any);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts.some(c => c.field === 'formatCode')).toBe(true);
    });

    it('should rate severity based on conflict type', () => {
      const template = CONTENT_TEMPLATES.HEALTHCARE_YMYL;
      const brief = {
        structured_outline: [
          { heading: 'Symptoms', format_code: 'PROSE' }, // Should be LISTING - moderate
        ],
      };

      const result = detectConflicts(template, brief as any);

      expect(result.overallSeverity).toBe('moderate');
    });

    it('should provide AI recommendation', () => {
      const template = CONTENT_TEMPLATES.DEFINITIONAL;
      const brief = {
        structured_outline: [
          { heading: 'What is Test?', format_code: 'PROSE' }, // Should be FS
        ],
      };

      const result = detectConflicts(template, brief as any);

      expect(result.aiRecommendation).toBeDefined();
      expect(result.aiRecommendation.action).toBe('use-template');
      expect(result.aiRecommendation.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe('resolveConflicts', () => {
    it('should apply template values when user chooses template', () => {
      const template = CONTENT_TEMPLATES.ECOMMERCE_PRODUCT;
      const brief = {
        structured_outline: [
          { heading: 'Key Features', format_code: 'PROSE' },
        ],
      };

      const detection = detectConflicts(template, brief as any);
      const resolved = resolveConflicts(detection, 'template', template, brief as any);

      expect(resolved.formatCodes['Key Features']).toBe('LISTING');
    });

    it('should keep brief values when user chooses brief', () => {
      const template = CONTENT_TEMPLATES.ECOMMERCE_PRODUCT;
      const brief = {
        structured_outline: [
          { heading: 'Key Features', format_code: 'PROSE' },
        ],
      };

      const detection = detectConflicts(template, brief as any);
      const resolved = resolveConflicts(detection, 'brief', template, brief as any);

      expect(resolved.formatCodes['Key Features']).toBe('PROSE');
    });
  });

  describe('generateSeoArgument', () => {
    it('should generate argument for FS format code', () => {
      const argument = generateSeoArgument('formatCode', 'PROSE', 'FS');

      expect(argument).toContain('Featured Snippet');
    });

    it('should generate argument for LISTING format code', () => {
      const argument = generateSeoArgument('formatCode', 'PROSE', 'LISTING');

      expect(argument).toContain('list');
    });
  });
});
