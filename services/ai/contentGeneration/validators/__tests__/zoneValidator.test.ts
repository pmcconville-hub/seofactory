// services/ai/contentGeneration/validators/__tests__/zoneValidator.test.ts
import { describe, it, expect } from 'vitest';
import { validateContentZones, reorderByZone, ZoneValidationResult } from '../zoneValidator';
import { ContentZone } from '../../../../../types/content';

describe('zoneValidator', () => {
  describe('validateContentZones', () => {
    it('should pass when MAIN sections exceed SUPPLEMENTARY', () => {
      const sections = [
        { heading: 'A', content_zone: ContentZone.MAIN },
        { heading: 'B', content_zone: ContentZone.MAIN },
        { heading: 'C', content_zone: ContentZone.MAIN },
        { heading: 'D', content_zone: ContentZone.SUPPLEMENTARY },
      ];

      const result = validateContentZones(sections);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should warn when SUPPLEMENTARY exceeds MAIN', () => {
      const sections = [
        { heading: 'A', content_zone: ContentZone.MAIN },
        { heading: 'B', content_zone: ContentZone.SUPPLEMENTARY },
        { heading: 'C', content_zone: ContentZone.SUPPLEMENTARY },
        { heading: 'D', content_zone: ContentZone.SUPPLEMENTARY },
      ];

      const result = validateContentZones(sections);

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes('SUPPLEMENTARY'))).toBe(true);
    });

    it('should warn when less than 3 MAIN sections', () => {
      const sections = [
        { heading: 'A', content_zone: ContentZone.MAIN },
        { heading: 'B', content_zone: ContentZone.MAIN },
        { heading: 'C', content_zone: ContentZone.SUPPLEMENTARY },
      ];

      const result = validateContentZones(sections);

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes('3 MAIN'))).toBe(true);
    });

    it('should warn when MAIN section appears after SUPPLEMENTARY', () => {
      const sections = [
        { heading: 'A', content_zone: ContentZone.MAIN },
        { heading: 'B', content_zone: ContentZone.SUPPLEMENTARY },
        { heading: 'C', content_zone: ContentZone.MAIN }, // Wrong order
      ];

      const result = validateContentZones(sections);

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes('zone flow'))).toBe(true);
    });

    it('should include zone counts in result', () => {
      const sections = [
        { heading: 'A', content_zone: ContentZone.MAIN },
        { heading: 'B', content_zone: ContentZone.MAIN },
        { heading: 'C', content_zone: ContentZone.SUPPLEMENTARY },
      ];

      const result = validateContentZones(sections);

      expect(result.mainCount).toBe(2);
      expect(result.supplementaryCount).toBe(1);
    });

    it('should handle empty sections array', () => {
      const result = validateContentZones([]);

      expect(result.valid).toBe(false);
      expect(result.mainCount).toBe(0);
      expect(result.supplementaryCount).toBe(0);
      expect(result.issues.some(i => i.includes('3 MAIN'))).toBe(true);
    });

    it('should handle sections without content_zone', () => {
      const sections = [
        { heading: 'A' },
        { heading: 'B', content_zone: ContentZone.MAIN },
        { heading: 'C', content_zone: ContentZone.MAIN },
        { heading: 'D', content_zone: ContentZone.MAIN },
      ];

      const result = validateContentZones(sections);

      expect(result.valid).toBe(true);
      expect(result.mainCount).toBe(3);
      expect(result.supplementaryCount).toBe(0);
    });
  });

  describe('reorderByZone', () => {
    it('should move MAIN sections before SUPPLEMENTARY', () => {
      const sections = [
        { heading: 'A', content_zone: ContentZone.SUPPLEMENTARY },
        { heading: 'B', content_zone: ContentZone.MAIN },
        { heading: 'C', content_zone: ContentZone.SUPPLEMENTARY },
        { heading: 'D', content_zone: ContentZone.MAIN },
      ];

      const result = reorderByZone(sections);

      expect(result.map(s => s.heading)).toEqual(['B', 'D', 'A', 'C']);
    });

    it('should preserve relative order within zones', () => {
      const sections = [
        { heading: 'S1', content_zone: ContentZone.SUPPLEMENTARY },
        { heading: 'M1', content_zone: ContentZone.MAIN },
        { heading: 'S2', content_zone: ContentZone.SUPPLEMENTARY },
        { heading: 'M2', content_zone: ContentZone.MAIN },
        { heading: 'M3', content_zone: ContentZone.MAIN },
      ];

      const result = reorderByZone(sections);

      // MAIN sections should be in original order: M1, M2, M3
      // SUPPLEMENTARY sections should be in original order: S1, S2
      expect(result.map(s => s.heading)).toEqual(['M1', 'M2', 'M3', 'S1', 'S2']);
    });

    it('should place sections without zone at the beginning', () => {
      const sections = [
        { heading: 'Main1', content_zone: ContentZone.MAIN },
        { heading: 'Intro' }, // No zone - likely intro section
        { heading: 'Supp1', content_zone: ContentZone.SUPPLEMENTARY },
      ];

      const result = reorderByZone(sections);

      expect(result.map(s => s.heading)).toEqual(['Intro', 'Main1', 'Supp1']);
    });

    it('should handle already correctly ordered sections', () => {
      const sections = [
        { heading: 'A', content_zone: ContentZone.MAIN },
        { heading: 'B', content_zone: ContentZone.MAIN },
        { heading: 'C', content_zone: ContentZone.SUPPLEMENTARY },
      ];

      const result = reorderByZone(sections);

      expect(result.map(s => s.heading)).toEqual(['A', 'B', 'C']);
    });

    it('should handle empty array', () => {
      const result = reorderByZone([]);
      expect(result).toEqual([]);
    });
  });
});
