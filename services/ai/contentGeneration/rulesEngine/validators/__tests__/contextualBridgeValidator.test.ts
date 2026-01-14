// services/ai/contentGeneration/rulesEngine/validators/__tests__/contextualBridgeValidator.test.ts

import {
  ContextualBridgeValidator,
  MULTILINGUAL_BRIDGE_PATTERNS,
  getBridgePatterns,
} from '../contextualBridgeValidator';
import { SectionGenerationContext } from '../../../../../../types';

describe('ContextualBridgeValidator', () => {
  const createContext = (overrides: Partial<SectionGenerationContext> = {}): SectionGenerationContext => ({
    section: { heading: 'Test Section', content_zone: 'MAIN' } as any,
    brief: {} as any,
    businessInfo: { seedKeyword: 'solar panels' } as any,
    allSections: [],
    isYMYL: false,
    ...overrides,
  });

  describe('SUPPLEMENTARY zone validation (existing behavior)', () => {
    it('should pass when SUPPLEMENTARY section starts with bridge language', () => {
      const content = 'To ensure optimal performance, regular maintenance is essential. Clean panels produce more energy.';
      const context = createContext({
        section: { heading: 'Maintenance Tips', content_zone: 'SUPPLEMENTARY' } as any,
      });

      const violations = ContextualBridgeValidator.validate(content, context);
      expect(violations.filter(v => v.rule === 'CONTEXTUAL_BRIDGE_MISSING').length).toBe(0);
    });

    it('should flag SUPPLEMENTARY section without bridge language', () => {
      const content = 'Panels need regular cleaning. Dirt reduces efficiency.';
      const context = createContext({
        section: { heading: 'Maintenance Tips', content_zone: 'SUPPLEMENTARY' } as any,
      });

      const violations = ContextualBridgeValidator.validate(content, context);
      expect(violations.some(v => v.rule === 'CONTEXTUAL_BRIDGE_MISSING')).toBe(true);
    });

    it('should recognize "Building on" as bridge language', () => {
      const content = 'Building on the installation process, maintenance becomes crucial for longevity.';
      const context = createContext({
        section: { heading: 'After Installation', content_zone: 'SUPPLEMENTARY' } as any,
      });

      const violations = ContextualBridgeValidator.validate(content, context);
      expect(violations.filter(v => v.rule === 'CONTEXTUAL_BRIDGE_MISSING').length).toBe(0);
    });
  });

  describe('MAIN zone cross-section transition (new behavior)', () => {
    it('should not flag MAIN section without previousSection', () => {
      const content = 'Solar panels convert sunlight into electricity through the photovoltaic effect.';
      const context = createContext({
        section: { heading: 'How Solar Panels Work', content_zone: 'MAIN' } as any,
      });

      const violations = ContextualBridgeValidator.validate(content, context);
      expect(violations.filter(v => v.rule === 'CROSS_SECTION_TRANSITION').length).toBe(0);
    });

    it('should pass MAIN section that references previous section heading terms', () => {
      const content = 'The installation process begins with site assessment. Professional installers evaluate roof condition and sun exposure.';
      const context = createContext({
        section: { heading: 'Installation Steps', content_zone: 'MAIN' } as any,
        previousSection: {
          heading: 'Before Installation: Site Preparation',
          content: 'Preparing your site is essential.',
        },
      });

      const violations = ContextualBridgeValidator.validate(content, context);
      expect(violations.filter(v => v.rule === 'CROSS_SECTION_TRANSITION').length).toBe(0);
    });

    it('should flag MAIN section that does not reference previous section', () => {
      const content = 'Weather patterns affect energy production. Cloudy days reduce output significantly.';
      const context = createContext({
        section: { heading: 'Weather Impact', content_zone: 'MAIN' } as any,
        previousSection: {
          heading: 'Installation Process Overview',
          content: 'The installation takes several hours.',
        },
      });

      const violations = ContextualBridgeValidator.validate(content, context);
      expect(violations.some(v => v.rule === 'CROSS_SECTION_TRANSITION')).toBe(true);
    });

    it('should use warning severity for cross-section transition issues', () => {
      const content = 'Random content about unrelated topics.';
      const context = createContext({
        section: { heading: 'Section Two', content_zone: 'MAIN' } as any,
        previousSection: {
          heading: 'Previous Section Heading Here',
        },
      });

      const violations = ContextualBridgeValidator.validate(content, context);
      const transitionViolation = violations.find(v => v.rule === 'CROSS_SECTION_TRANSITION');
      expect(transitionViolation?.severity).toBe('warning');
    });

    it('should check first paragraph only for transition terms', () => {
      // First paragraph has NO reference, second does - should still flag
      const content = 'Completely unrelated opening paragraph.\n\nThe installation process continues with mounting the panels.';
      const context = createContext({
        section: { heading: 'Mounting', content_zone: 'MAIN' } as any,
        previousSection: {
          heading: 'Installation Preparation',
        },
      });

      const violations = ContextualBridgeValidator.validate(content, context);
      expect(violations.some(v => v.rule === 'CROSS_SECTION_TRANSITION')).toBe(true);
    });

    it('should pass when first paragraph contains key terms from previous heading', () => {
      const content = 'After the preparation phase, mounting brackets are attached. This ensures secure panel placement.';
      const context = createContext({
        section: { heading: 'Mounting Process', content_zone: 'MAIN' } as any,
        previousSection: {
          heading: 'Preparation Phase',
        },
      });

      const violations = ContextualBridgeValidator.validate(content, context);
      expect(violations.filter(v => v.rule === 'CROSS_SECTION_TRANSITION').length).toBe(0);
    });

    it('should handle previousSection with empty heading gracefully', () => {
      const content = 'Some content here about panels.';
      const context = createContext({
        section: { heading: 'Section', content_zone: 'MAIN' } as any,
        previousSection: {
          heading: '',
        },
      });

      const violations = ContextualBridgeValidator.validate(content, context);
      // Empty heading means no terms to check - should pass
      expect(violations.filter(v => v.rule === 'CROSS_SECTION_TRANSITION').length).toBe(0);
    });

    it('should ignore short stopwords in heading', () => {
      const content = 'Benefits of solar include cost savings and environmental impact reduction.';
      const context = createContext({
        section: { heading: 'Benefits Overview', content_zone: 'MAIN' } as any,
        previousSection: {
          heading: 'What Are Solar Benefits', // "what", "are" should be ignored
        },
      });

      const violations = ContextualBridgeValidator.validate(content, context);
      // "benefits" and "solar" should be extracted and matched
      expect(violations.filter(v => v.rule === 'CROSS_SECTION_TRANSITION').length).toBe(0);
    });

    it('should be case-insensitive when matching terms', () => {
      const content = 'INSTALLATION requires careful planning. Professional installers ensure quality.';
      const context = createContext({
        section: { heading: 'Professional Installation', content_zone: 'MAIN' } as any,
        previousSection: {
          heading: 'installation planning',
        },
      });

      const violations = ContextualBridgeValidator.validate(content, context);
      expect(violations.filter(v => v.rule === 'CROSS_SECTION_TRANSITION').length).toBe(0);
    });
  });

  describe('getBridgePatterns', () => {
    it('should return English patterns by default', () => {
      const patterns = getBridgePatterns(undefined);
      expect(patterns).toBe(MULTILINGUAL_BRIDGE_PATTERNS['English']);
    });

    it('should return Dutch patterns for nl language code', () => {
      const patterns = getBridgePatterns('nl');
      expect(patterns).toBe(MULTILINGUAL_BRIDGE_PATTERNS['Dutch']);
    });

    it('should return German patterns for de language code', () => {
      const patterns = getBridgePatterns('de');
      expect(patterns).toBe(MULTILINGUAL_BRIDGE_PATTERNS['German']);
    });

    it('should fall back to English for unknown language', () => {
      const patterns = getBridgePatterns('xyz');
      expect(patterns).toBe(MULTILINGUAL_BRIDGE_PATTERNS['English']);
    });
  });

  describe('edge cases', () => {
    it('should handle empty content gracefully', () => {
      const context = createContext({
        section: { heading: 'Test', content_zone: 'MAIN' } as any,
        previousSection: { heading: 'Previous Section' },
      });

      const violations = ContextualBridgeValidator.validate('', context);
      // Empty content - should not crash
      expect(Array.isArray(violations)).toBe(true);
    });

    it('should handle content with only whitespace', () => {
      const context = createContext({
        section: { heading: 'Test', content_zone: 'SUPPLEMENTARY' } as any,
      });

      const violations = ContextualBridgeValidator.validate('   \n\t  ', context);
      expect(Array.isArray(violations)).toBe(true);
    });

    it('should not flag MAIN sections without previousSection property', () => {
      const content = 'This is the main content about solar panels.';
      const context = createContext({
        section: { heading: 'Main Topic', content_zone: 'MAIN' } as any,
        // no previousSection
      });

      const violations = ContextualBridgeValidator.validate(content, context);
      expect(violations.filter(v => v.rule === 'CROSS_SECTION_TRANSITION').length).toBe(0);
    });
  });
});
