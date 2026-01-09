// services/ai/contentGeneration/rulesEngine/validators/__tests__/languageOutputValidator.test.ts

import { LanguageOutputValidator } from '../languageOutputValidator';
import { SectionGenerationContext } from '../../../../../../types';

// Helper to create a minimal context for testing
function createTestContext(language?: string): SectionGenerationContext {
  return {
    section: {
      heading: 'Test Section',
      level: 2,
      format_code: 'PROSE',
    },
    brief: {
      id: 'test-brief',
      topic_id: 'test-topic',
      title: 'Test Topic',
    },
    businessInfo: {
      domain: 'test.com',
      projectName: 'Test Project',
      industry: 'Test Industry',
      model: 'B2B',
      valueProp: 'Test Value Prop',
      audience: 'Test Audience',
      expertise: 'Test Expertise',
      seedKeyword: 'test keyword',
      language: language || 'nl',
      targetMarket: 'Netherlands',
    },
    allSections: [],
    isYMYL: false,
    language,
  } as any;
}

describe('LanguageOutputValidator', () => {
  describe('validate()', () => {
    it('should pass when content matches expected language (Dutch)', () => {
      const dutchContent = 'Dit is een test artikel over zonnepanelen. Zonnepanelen zijn een effectieve manier om energie op te wekken.';
      const result = LanguageOutputValidator.validate(dutchContent, 'Dutch');
      expect(result.isValid).toBe(true);
      expect(result.detectedLanguage).toBe('Dutch');
    });

    it('should fail when content is in wrong language (English instead of Dutch)', () => {
      const englishContent = 'This is a test article about solar panels. Solar panels are an effective way to generate energy.';
      const result = LanguageOutputValidator.validate(englishContent, 'Dutch');
      expect(result.isValid).toBe(false);
      expect(result.detectedLanguage).toBe('English');
    });

    it('should handle German content correctly', () => {
      const germanContent = 'Dies ist ein Testartikel über Solarpaneele. Solarpaneele sind eine effektive Möglichkeit, Energie zu erzeugen.';
      const result = LanguageOutputValidator.validate(germanContent, 'German');
      expect(result.isValid).toBe(true);
      expect(result.detectedLanguage).toBe('German');
    });

    it('should handle French content correctly', () => {
      const frenchContent = 'Ceci est un article de test sur les panneaux solaires. Les panneaux solaires sont une méthode efficace pour générer de l\'énergie.';
      const result = LanguageOutputValidator.validate(frenchContent, 'French');
      expect(result.isValid).toBe(true);
      expect(result.detectedLanguage).toBe('French');
    });

    it('should handle Spanish content correctly', () => {
      const spanishContent = 'Este es un artículo de prueba sobre paneles solares. Los paneles solares son una forma efectiva de generar energía.';
      const result = LanguageOutputValidator.validate(spanishContent, 'Spanish');
      expect(result.isValid).toBe(true);
      expect(result.detectedLanguage).toBe('Spanish');
    });

    it('should pass when content is too short to reliably detect', () => {
      const shortContent = 'Hello world test.';
      const result = LanguageOutputValidator.validate(shortContent, 'Dutch');
      expect(result.isValid).toBe(true);
      expect(result.confidence).toBeLessThanOrEqual(0.5);
    });

    it('should handle ISO language codes', () => {
      const dutchContent = 'Dit is een test artikel over zonnepanelen. Zonnepanelen zijn een effectieve manier om energie op te wekken.';
      const result = LanguageOutputValidator.validate(dutchContent, 'nl');
      expect(result.isValid).toBe(true);
      expect(result.detectedLanguage).toBe('Dutch');
    });

    it('should detect English content correctly', () => {
      const englishContent = 'The quick brown fox jumps over the lazy dog. This is a comprehensive test of the language detection system.';
      const result = LanguageOutputValidator.validate(englishContent, 'English');
      expect(result.isValid).toBe(true);
      expect(result.detectedLanguage).toBe('English');
    });

    it('should handle Italian content correctly', () => {
      const italianContent = 'Questo è un articolo di prova sui pannelli solari. I pannelli solari sono un modo efficace per generare energia.';
      const result = LanguageOutputValidator.validate(italianContent, 'Italian');
      expect(result.isValid).toBe(true);
      expect(result.detectedLanguage).toBe('Italian');
    });

    it('should handle Portuguese content correctly', () => {
      const portugueseContent = 'Este é um artigo de teste sobre painéis solares. Os painéis solares são uma forma eficaz de gerar energia.';
      const result = LanguageOutputValidator.validate(portugueseContent, 'Portuguese');
      expect(result.isValid).toBe(true);
      expect(result.detectedLanguage).toBe('Portuguese');
    });

    it('should handle empty string input gracefully', () => {
      const result = LanguageOutputValidator.validate('', 'English');
      expect(result.isValid).toBe(true);
      expect(result.confidence).toBeLessThanOrEqual(0.5);
      expect(result.expectedLanguage).toBe('English');
    });

    it('should handle unsupported language by returning expected language with low confidence', () => {
      const polishContent = 'To jest artykuł testowy o panelach słonecznych. Panele słoneczne są skutecznym sposobem wytwarzania energii.';
      const result = LanguageOutputValidator.validate(polishContent, 'Polish');
      // Polish is not in our supported languages, so detection will fail to match
      // but we should still get a result without crashing
      expect(result.expectedLanguage).toBe('Polish');
      // Since Polish markers are not defined, detection will pick another language
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateWithViolations()', () => {
    it('should return violations for wrong language', () => {
      const englishContent = 'This is English content that should be Dutch. The system detects the wrong language.';
      const context = createTestContext('Dutch');
      const violations = LanguageOutputValidator.validateWithViolations(englishContent, context);

      expect(violations.length).toBe(1);
      expect(violations[0].rule).toBe('S1_LANGUAGE_OUTPUT');
      expect(violations[0].severity).toBe('error');
      expect(violations[0].text).toContain('English');
      expect(violations[0].text).toContain('Dutch');
    });

    it('should return no violations when language matches', () => {
      const dutchContent = 'Dit is een test artikel over zonnepanelen. Zonnepanelen zijn een effectieve manier om energie op te wekken en het milieu te beschermen.';
      const context = createTestContext('Dutch');
      const violations = LanguageOutputValidator.validateWithViolations(dutchContent, context);

      expect(violations.length).toBe(0);
    });

    it('should default to English when no language specified in context', () => {
      const englishContent = 'This is English content. The system should default to English language detection.';
      const context = createTestContext(undefined);
      const violations = LanguageOutputValidator.validateWithViolations(englishContent, context);

      expect(violations.length).toBe(0);
    });

    it('should handle ISO language codes in context', () => {
      const dutchContent = 'Dit is een test artikel over zonnepanelen. Zonnepanelen zijn een effectieve manier om energie op te wekken.';
      const context = createTestContext('nl');
      const violations = LanguageOutputValidator.validateWithViolations(dutchContent, context);

      expect(violations.length).toBe(0);
    });

    it('should not report violation for low confidence detection', () => {
      const shortContent = 'Hello world.';
      const context = createTestContext('Dutch');
      const violations = LanguageOutputValidator.validateWithViolations(shortContent, context);

      // Low confidence should not trigger a violation
      expect(violations.length).toBe(0);
    });
  });
});
