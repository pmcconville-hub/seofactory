// services/ai/contentGeneration/rulesEngine/validators/__tests__/wordCountValidator.test.ts
import { WordCountValidator } from '../wordCountValidator';
import { SectionGenerationContext } from '../../../../../../types';

describe('WordCountValidator', () => {
  const createContext = (overrides: Partial<{
    heading: string;
    level: number;
    content_zone: string;
  }> = {}): SectionGenerationContext => ({
    section: {
      heading: overrides.heading || 'Test Section',
      level: overrides.level || 2,
      section_key: 'test',
      content_zone: overrides.content_zone || 'CORE',
      format_code: 'EXPLANATION',
    },
    brief: {} as any,
    businessInfo: {} as any,
    allSections: [],
    isYMYL: false,
  } as any);

  describe('countWords', () => {
    it('should count words correctly in plain text', () => {
      const content = 'This is a simple test sentence with ten words total.';
      expect(WordCountValidator.countWords(content)).toBe(10);
    });

    it('should strip HTML tags before counting', () => {
      const content = '<p>This is <strong>bold</strong> text.</p>';
      expect(WordCountValidator.countWords(content)).toBe(4);
    });

    it('should strip markdown before counting', () => {
      const content = '**Bold** and *italic* text';
      // After stripping: "Bold and italic text" = 4 words
      expect(WordCountValidator.countWords(content)).toBe(4);
    });

    it('should handle empty content', () => {
      expect(WordCountValidator.countWords('')).toBe(0);
      expect(WordCountValidator.countWords('   ')).toBe(0);
    });
  });

  describe('validate - Introduction sections (G2)', () => {
    it('should pass for introduction with 150+ words', () => {
      const content = 'word '.repeat(160);
      const violations = WordCountValidator.validate(content, createContext({ heading: 'Introduction' }));
      const errors = violations.filter(v => v.severity === 'error');
      expect(errors.length).toBe(0);
    });

    it('should fail for introduction with less than 150 words', () => {
      const content = 'word '.repeat(100);
      const violations = WordCountValidator.validate(content, createContext({ heading: 'Introduction' }));
      expect(violations.some(v => v.rule === 'G2_INTRO_WORD_COUNT')).toBe(true);
    });

    it('should warn for introduction with more than 250 words', () => {
      const content = 'word '.repeat(300);
      const violations = WordCountValidator.validate(content, createContext({ heading: 'Introduction' }));
      expect(violations.some(v => v.rule === 'G2_INTRO_WORD_COUNT')).toBe(true);
    });

    it('should detect introduction by level 1 heading', () => {
      const content = 'word '.repeat(100);
      const violations = WordCountValidator.validate(content, createContext({ heading: 'Some Title', level: 1 }));
      expect(violations.some(v => v.rule === 'G2_INTRO_WORD_COUNT')).toBe(true);
    });
  });

  describe('validate - Core sections (G3)', () => {
    it('should pass for core section with 200-400 words', () => {
      const content = 'word '.repeat(300);
      const violations = WordCountValidator.validate(content, createContext());
      const errors = violations.filter(v => v.severity === 'error');
      expect(errors.length).toBe(0);
    });

    it('should warn for core section under 200 words', () => {
      const content = 'word '.repeat(150);
      const violations = WordCountValidator.validate(content, createContext());
      expect(violations.some(v => v.rule === 'G3_CORE_WORD_COUNT')).toBe(true);
    });

    it('should warn for core section over 400 words', () => {
      const content = 'word '.repeat(500);
      const violations = WordCountValidator.validate(content, createContext());
      expect(violations.some(v => v.rule === 'G3_CORE_WORD_COUNT')).toBe(true);
    });
  });

  describe('validate - Conclusion sections (G4)', () => {
    it('should pass for conclusion with 100-200 words', () => {
      const content = 'word '.repeat(150);
      const violations = WordCountValidator.validate(content, createContext({ heading: 'Conclusion' }));
      const errors = violations.filter(v => v.severity === 'error');
      expect(errors.length).toBe(0);
    });

    it('should warn for conclusion under 100 words', () => {
      const content = 'word '.repeat(50);
      const violations = WordCountValidator.validate(content, createContext({ heading: 'Conclusion' }));
      expect(violations.some(v => v.rule === 'G4_CONCLUSION_WORD_COUNT')).toBe(true);
    });

    it('should warn for conclusion over 200 words', () => {
      const content = 'word '.repeat(250);
      const violations = WordCountValidator.validate(content, createContext({ heading: 'Conclusion' }));
      expect(violations.some(v => v.rule === 'G4_CONCLUSION_WORD_COUNT')).toBe(true);
    });

    it('should detect conclusion by heading keywords', () => {
      const content = 'word '.repeat(50);
      const summaryViolations = WordCountValidator.validate(content, createContext({ heading: 'Summary and Final Thoughts' }));
      expect(summaryViolations.some(v => v.rule === 'G4_CONCLUSION_WORD_COUNT')).toBe(true);
    });
  });

  describe('validate - Supplementary sections', () => {
    it('should pass for supplementary section with 100-300 words', () => {
      const content = 'word '.repeat(200);
      const violations = WordCountValidator.validate(content, createContext({ content_zone: 'SUPPLEMENTARY' }));
      const errors = violations.filter(v => v.severity === 'error');
      expect(errors.length).toBe(0);
    });

    it('should warn for supplementary section under 100 words', () => {
      const content = 'word '.repeat(50);
      const violations = WordCountValidator.validate(content, createContext({ content_zone: 'SUPPLEMENTARY' }));
      expect(violations.length).toBeGreaterThan(0);
    });
  });

  describe('validateArticleTotal - G1', () => {
    it('should validate article total against target within +/-10%', () => {
      const content = 'word '.repeat(2000);
      const result = WordCountValidator.validateArticleTotal(content, 2000);
      expect(result.isValid).toBe(true);
      expect(result.actualCount).toBe(2000);
    });

    it('should fail when article is below -10% of target', () => {
      const content = 'word '.repeat(2000);
      const result = WordCountValidator.validateArticleTotal(content, 2500);
      expect(result.isValid).toBe(false); // 2000 is outside +/-10% of 2500
      expect(result.actualCount).toBe(2000);
    });

    it('should fail when article is above +10% of target', () => {
      const content = 'word '.repeat(3000);
      const result = WordCountValidator.validateArticleTotal(content, 2500);
      expect(result.isValid).toBe(false); // 3000 is outside +/-10% of 2500
    });

    it('should pass when article is exactly at -10% boundary', () => {
      // Target 1000, -10% = 900
      const content = 'word '.repeat(900);
      const result = WordCountValidator.validateArticleTotal(content, 1000);
      expect(result.isValid).toBe(true);
    });

    it('should pass when article is exactly at +10% boundary', () => {
      // Target 1000, +10% = 1100
      const content = 'word '.repeat(1100);
      const result = WordCountValidator.validateArticleTotal(content, 1000);
      expect(result.isValid).toBe(true);
    });

    it('should calculate correct min/max allowed values', () => {
      const content = 'word '.repeat(1000);
      const result = WordCountValidator.validateArticleTotal(content, 1000);
      expect(result.minAllowed).toBe(900);
      expect(result.maxAllowed).toBe(1100);
      expect(result.tolerance).toBe(0.10);
    });
  });

  describe('validateArticleTotalWithViolations', () => {
    it('should return empty array when within tolerance', () => {
      const content = 'word '.repeat(2000);
      const violations = WordCountValidator.validateArticleTotalWithViolations(content, 2000);
      expect(violations.length).toBe(0);
    });

    it('should return G1 violation when under target', () => {
      const content = 'word '.repeat(1500);
      const violations = WordCountValidator.validateArticleTotalWithViolations(content, 2000);
      expect(violations.some(v => v.rule === 'G1_ARTICLE_WORD_COUNT')).toBe(true);
      expect(violations[0].suggestion).toContain('Add');
    });

    it('should return G1 violation when over target', () => {
      const content = 'word '.repeat(2500);
      const violations = WordCountValidator.validateArticleTotalWithViolations(content, 2000);
      expect(violations.some(v => v.rule === 'G1_ARTICLE_WORD_COUNT')).toBe(true);
      expect(violations[0].suggestion).toContain('Remove');
    });
  });
});
