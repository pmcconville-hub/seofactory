// services/ai/contentGeneration/rulesEngine/validators/__tests__/eavPlacementValidator.test.ts

import { EavPlacementValidator } from '../eavPlacementValidator';
import { SemanticTriple, SectionGenerationContext, BriefSection } from '../../../../../../types';

describe('EavPlacementValidator', () => {
  // Helper to create a mock EAV with category
  const createEav = (category: string, label: string): SemanticTriple => ({
    subject: { label: 'Solar Panel', type: 'Product' },
    predicate: { relation: 'has', type: 'property', category: category as any },
    object: { value: label, type: 'string' },
  });

  // Helper to create a minimal context
  const createContext = (eavs: SemanticTriple[], sectionLevel = 1, heading = 'Introduction'): SectionGenerationContext => ({
    section: {
      key: 'intro',
      heading,
      level: sectionLevel,
      order: 0,
    } as BriefSection,
    brief: {
      id: 'test-brief',
      topic_id: 'test-topic',
      title: 'Test Article',
      slug: 'test-article',
      metaDescription: 'Test description',
      keyTakeaways: [],
      outline: '',
      serpAnalysis: { peopleAlsoAsk: [], competitorHeadings: [] },
      visuals: { featuredImagePrompt: '', imageAltText: '' },
      contextualVectors: [],
      contextualBridge: [],
    } as any,
    businessInfo: {
      seedKeyword: 'solar panel',
      companyName: 'Test Company',
      website: 'https://test.com',
    } as any,
    allSections: [],
    isYMYL: false,
    eavs, // Extended context with EAVs
  } as any);

  describe('validatePlacement', () => {
    it('should pass when UNIQUE EAV appears in first 300 words', () => {
      const content = 'word '.repeat(100) + 'monocrystalline efficiency ' + 'word '.repeat(100);
      const eavs = [createEav('UNIQUE', 'monocrystalline efficiency')];
      const result = EavPlacementValidator.validatePlacement(content, eavs);
      expect(result.uniqueInFirst300).toBe(true);
    });

    it('should fail when UNIQUE EAV appears after 300 words', () => {
      const content = 'word '.repeat(350) + 'monocrystalline efficiency ' + 'word '.repeat(100);
      const eavs = [createEav('UNIQUE', 'monocrystalline efficiency')];
      const result = EavPlacementValidator.validatePlacement(content, eavs);
      expect(result.uniqueInFirst300).toBe(false);
    });

    it('should pass when ROOT EAV appears in first 500 words', () => {
      const content = 'word '.repeat(400) + 'photovoltaic cells ' + 'word '.repeat(100);
      const eavs = [createEav('ROOT', 'photovoltaic cells')];
      const result = EavPlacementValidator.validatePlacement(content, eavs);
      expect(result.rootInFirst500).toBe(true);
    });

    it('should fail when ROOT EAV appears after 500 words', () => {
      const content = 'word '.repeat(550) + 'photovoltaic cells ' + 'word '.repeat(100);
      const eavs = [createEav('ROOT', 'photovoltaic cells')];
      const result = EavPlacementValidator.validatePlacement(content, eavs);
      expect(result.rootInFirst500).toBe(false);
    });

    it('should pass when no UNIQUE EAVs exist', () => {
      const content = 'word '.repeat(500);
      const eavs = [createEav('COMMON', 'some common term')];
      const result = EavPlacementValidator.validatePlacement(content, eavs);
      expect(result.uniqueInFirst300).toBe(true);
    });

    it('should pass when no ROOT EAVs exist', () => {
      const content = 'word '.repeat(500);
      const eavs = [createEav('COMMON', 'some common term')];
      const result = EavPlacementValidator.validatePlacement(content, eavs);
      expect(result.rootInFirst500).toBe(true);
    });

    it('should handle case-insensitive matching', () => {
      const content = 'word '.repeat(50) + 'MONOCRYSTALLINE EFFICIENCY ' + 'word '.repeat(100);
      const eavs = [createEav('UNIQUE', 'monocrystalline efficiency')];
      const result = EavPlacementValidator.validatePlacement(content, eavs);
      expect(result.uniqueInFirst300).toBe(true);
    });

    it('should track position of found EAVs', () => {
      const content = 'word '.repeat(50) + 'monocrystalline efficiency ' + 'word '.repeat(100);
      const eavs = [createEav('UNIQUE', 'monocrystalline efficiency')];
      const result = EavPlacementValidator.validatePlacement(content, eavs);
      expect(result.uniqueEavs[0].position).toBe(50);
    });

    it('should handle empty content', () => {
      const content = '';
      const eavs = [createEav('UNIQUE', 'monocrystalline efficiency')];
      const result = EavPlacementValidator.validatePlacement(content, eavs);
      expect(result.uniqueInFirst300).toBe(false);
      expect(result.uniqueEavs[0].position).toBeNull();
    });

    it('should handle empty EAVs', () => {
      const content = 'word '.repeat(500);
      const eavs: SemanticTriple[] = [];
      const result = EavPlacementValidator.validatePlacement(content, eavs);
      expect(result.uniqueInFirst300).toBe(true);
      expect(result.rootInFirst500).toBe(true);
    });
  });

  describe('validate', () => {
    it('should return violations for missing early UNIQUE EAV placement', () => {
      const content = 'word '.repeat(600) + 'monocrystalline efficiency';
      const eavs = [createEav('UNIQUE', 'monocrystalline efficiency')];
      const context = createContext(eavs);
      const violations = EavPlacementValidator.validate(content, context);
      expect(violations.some(v => v.rule === 'C2_UNIQUE_EAV_PLACEMENT')).toBe(true);
    });

    it('should return violations for missing early ROOT EAV placement', () => {
      const content = 'word '.repeat(600) + 'photovoltaic cells';
      const eavs = [createEav('ROOT', 'photovoltaic cells')];
      const context = createContext(eavs);
      const violations = EavPlacementValidator.validate(content, context);
      expect(violations.some(v => v.rule === 'C3_ROOT_EAV_PLACEMENT')).toBe(true);
    });

    it('should not return violations when EAVs are placed correctly', () => {
      const content = 'word '.repeat(50) + 'monocrystalline efficiency ' + 'word '.repeat(50) + 'photovoltaic cells ' + 'word '.repeat(100);
      const eavs = [
        createEav('UNIQUE', 'monocrystalline efficiency'),
        createEav('ROOT', 'photovoltaic cells'),
      ];
      const context = createContext(eavs);
      const violations = EavPlacementValidator.validate(content, context);
      expect(violations.filter(v => v.rule === 'C2_UNIQUE_EAV_PLACEMENT').length).toBe(0);
      expect(violations.filter(v => v.rule === 'C3_ROOT_EAV_PLACEMENT').length).toBe(0);
    });

    it('should skip validation for non-intro sections with level > 1', () => {
      const content = 'word '.repeat(600) + 'monocrystalline efficiency';
      const eavs = [createEav('UNIQUE', 'monocrystalline efficiency')];
      const context = createContext(eavs, 2, 'Some H2 Section');
      const violations = EavPlacementValidator.validate(content, context);
      expect(violations.length).toBe(0);
    });

    it('should validate intro sections even at level > 1', () => {
      const content = 'word '.repeat(600) + 'monocrystalline efficiency';
      const eavs = [createEav('UNIQUE', 'monocrystalline efficiency')];
      const context = createContext(eavs, 2, 'Introduction to Solar');
      const violations = EavPlacementValidator.validate(content, context);
      expect(violations.some(v => v.rule === 'C2_UNIQUE_EAV_PLACEMENT')).toBe(true);
    });

    it('should return no violations when EAVs array is empty', () => {
      const content = 'word '.repeat(600);
      const context = createContext([]);
      const violations = EavPlacementValidator.validate(content, context);
      expect(violations.length).toBe(0);
    });

    it('should include missing EAV terms in violation text', () => {
      const content = 'word '.repeat(600) + 'monocrystalline efficiency';
      const eavs = [createEav('UNIQUE', 'monocrystalline efficiency')];
      const context = createContext(eavs);
      const violations = EavPlacementValidator.validate(content, context);
      const uniqueViolation = violations.find(v => v.rule === 'C2_UNIQUE_EAV_PLACEMENT');
      expect(uniqueViolation?.text).toContain('monocrystalline efficiency');
    });

    it('should have warning severity for violations', () => {
      const content = 'word '.repeat(600) + 'monocrystalline efficiency';
      const eavs = [createEav('UNIQUE', 'monocrystalline efficiency')];
      const context = createContext(eavs);
      const violations = EavPlacementValidator.validate(content, context);
      violations.forEach(v => {
        expect(v.severity).toBe('warning');
      });
    });

    it('should handle context without eavs property by returning empty violations', () => {
      const content = 'word '.repeat(600);
      const context = createContext([]);
      // Remove eavs to simulate missing property
      delete (context as any).eavs;
      const violations = EavPlacementValidator.validate(content, context);
      expect(violations.length).toBe(0);
    });
  });
});
