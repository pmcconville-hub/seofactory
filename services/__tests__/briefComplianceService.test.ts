import { describe, it, expect } from 'vitest';
import { BriefComplianceService } from '../briefComplianceService';

describe('BriefComplianceService', () => {
  const service = new BriefComplianceService();

  describe('inferMethodology', () => {
    it('returns ordered_list for "how to" headings', () => {
      const result = service.inferMethodology({ heading: 'How to Install Software' });
      expect(result).toBe('ordered_list');
    });

    it('returns unordered_list for "benefits of" headings', () => {
      const result = service.inferMethodology({ heading: 'Benefits of Cloud Computing' });
      expect(result).toBe('unordered_list');
    });

    it('returns comparison_table for "vs" headings', () => {
      const result = service.inferMethodology({ heading: 'AWS vs Azure Comparison' });
      expect(result).toBe('comparison_table');
    });

    it('returns definition_prose for "what is" headings', () => {
      const result = service.inferMethodology({ heading: 'What is Machine Learning?' });
      expect(result).toBe('definition_prose');
    });

    it('returns prose for generic headings', () => {
      const result = service.inferMethodology({ heading: 'Understanding the Basics' });
      expect(result).toBe('prose');
    });
  });
});
