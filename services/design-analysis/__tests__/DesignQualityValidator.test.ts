import { describe, it, expect, vi } from 'vitest';
import { DesignQualityValidator } from '../DesignQualityValidator';

describe('DesignQualityValidator', () => {
  describe('validateBrandMatch', () => {
    it('should return validation result with score breakdown', async () => {
      const mockAiResponse = {
        overallScore: 85,
        colorMatch: { score: 90, notes: 'Primary orange matches well' },
        typographyMatch: { score: 80, notes: 'Serif headings detected' },
        visualDepth: { score: 75, notes: 'Shadows could be stronger' },
        brandFit: { score: 95, notes: 'Would fit naturally on target site' }
      };

      const validator = new DesignQualityValidator({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      vi.spyOn(validator as any, 'callVisionAI').mockResolvedValue(mockAiResponse);

      const result = await validator.validateBrandMatch(
        'base64-target-screenshot',
        'base64-output-screenshot',
        { colors: { primary: '#ea580c' } }
      );

      expect(result.overallScore).toBe(85);
      expect(result.passesThreshold).toBe(true);
      expect(result.colorMatch.score).toBe(90);
    });

    it('should return passesThreshold false when score is below threshold', async () => {
      const mockAiResponse = {
        overallScore: 55,
        colorMatch: { score: 40, notes: 'Colors do not match' },
        typographyMatch: { score: 60, notes: 'Different font family' },
        visualDepth: { score: 50, notes: 'Flat design vs depth' },
        brandFit: { score: 70, notes: 'Somewhat aligned' }
      };

      const validator = new DesignQualityValidator({
        provider: 'gemini',
        apiKey: 'test-key',
        threshold: 70
      });

      vi.spyOn(validator as any, 'callVisionAI').mockResolvedValue(mockAiResponse);

      const result = await validator.validateBrandMatch(
        'base64-target',
        'base64-output',
        {}
      );

      expect(result.passesThreshold).toBe(false);
      expect(result.autoFixSuggestions).toBeDefined();
      expect(result.autoFixSuggestions!.length).toBeGreaterThan(0);
    });

    it('should use default threshold of 70 when not specified', async () => {
      const mockAiResponse = {
        overallScore: 75,
        colorMatch: { score: 75, notes: '' },
        typographyMatch: { score: 75, notes: '' },
        visualDepth: { score: 75, notes: '' },
        brandFit: { score: 75, notes: '' }
      };

      const validator = new DesignQualityValidator({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      vi.spyOn(validator as any, 'callVisionAI').mockResolvedValue(mockAiResponse);

      const result = await validator.validateBrandMatch('img1', 'img2', {});

      expect(result.passesThreshold).toBe(true);
    });

    it('should include passed boolean for each category', async () => {
      const mockAiResponse = {
        overallScore: 70,
        colorMatch: { score: 80, notes: 'Good match' },
        typographyMatch: { score: 60, notes: 'Needs work' },
        visualDepth: { score: 70, notes: 'OK' },
        brandFit: { score: 70, notes: 'Acceptable' }
      };

      const validator = new DesignQualityValidator({
        provider: 'gemini',
        apiKey: 'test-key',
        threshold: 70
      });

      vi.spyOn(validator as any, 'callVisionAI').mockResolvedValue(mockAiResponse);

      const result = await validator.validateBrandMatch('img1', 'img2', {});

      expect(result.colorMatch.passed).toBe(true);
      expect(result.typographyMatch.passed).toBe(false);
      expect(result.visualDepth.passed).toBe(true);
      expect(result.brandFit.passed).toBe(true);
    });
  });

  describe('generateValidationPrompt', () => {
    it('should create structured prompt for AI vision', () => {
      const validator = new DesignQualityValidator({ provider: 'gemini', apiKey: 'test' });
      const prompt = validator.generateValidationPrompt({
        colors: { primary: '#ea580c' },
        fonts: { heading: 'Playfair Display', body: 'Inter' }
      });

      expect(prompt).toContain('color');
      expect(prompt).toContain('typography');
      expect(prompt).toContain('#ea580c');
      expect(prompt).toContain('Playfair Display');
    });

    it('should handle missing token values gracefully', () => {
      const validator = new DesignQualityValidator({ provider: 'gemini', apiKey: 'test' });
      const prompt = validator.generateValidationPrompt({});

      expect(prompt).toContain('unknown');
    });

    it('should include all evaluation categories in prompt', () => {
      const validator = new DesignQualityValidator({ provider: 'gemini', apiKey: 'test' });
      const prompt = validator.generateValidationPrompt({});

      expect(prompt).toContain('COLOR MATCH');
      expect(prompt).toContain('TYPOGRAPHY MATCH');
      expect(prompt).toContain('VISUAL DEPTH');
      expect(prompt).toContain('BRAND FIT');
    });

    it('should request JSON output format', () => {
      const validator = new DesignQualityValidator({ provider: 'gemini', apiKey: 'test' });
      const prompt = validator.generateValidationPrompt({});

      expect(prompt).toContain('JSON');
      expect(prompt).toContain('overallScore');
    });
  });

  describe('generateAutoFixSuggestions', () => {
    it('should suggest color fixes when color score is low', () => {
      const validator = new DesignQualityValidator({ provider: 'gemini', apiKey: 'test' });
      const suggestions = (validator as any).generateAutoFixSuggestions({
        colorMatch: { score: 50, notes: '' },
        typographyMatch: { score: 80, notes: '' },
        visualDepth: { score: 80, notes: '' },
        brandFit: { score: 80, notes: '' }
      });

      expect(suggestions.some((s: string) => s.toLowerCase().includes('color'))).toBe(true);
    });

    it('should suggest typography fixes when typography score is low', () => {
      const validator = new DesignQualityValidator({ provider: 'gemini', apiKey: 'test' });
      const suggestions = (validator as any).generateAutoFixSuggestions({
        colorMatch: { score: 80, notes: '' },
        typographyMatch: { score: 50, notes: '' },
        visualDepth: { score: 80, notes: '' },
        brandFit: { score: 80, notes: '' }
      });

      expect(suggestions.some((s: string) => s.toLowerCase().includes('font'))).toBe(true);
    });

    it('should suggest shadow fixes when visual depth score is low', () => {
      const validator = new DesignQualityValidator({ provider: 'gemini', apiKey: 'test' });
      const suggestions = (validator as any).generateAutoFixSuggestions({
        colorMatch: { score: 80, notes: '' },
        typographyMatch: { score: 80, notes: '' },
        visualDepth: { score: 50, notes: '' },
        brandFit: { score: 80, notes: '' }
      });

      expect(suggestions.some((s: string) => s.toLowerCase().includes('shadow'))).toBe(true);
    });

    it('should suggest style review when brand fit score is low', () => {
      const validator = new DesignQualityValidator({ provider: 'gemini', apiKey: 'test' });
      const suggestions = (validator as any).generateAutoFixSuggestions({
        colorMatch: { score: 80, notes: '' },
        typographyMatch: { score: 80, notes: '' },
        visualDepth: { score: 80, notes: '' },
        brandFit: { score: 50, notes: '' }
      });

      expect(suggestions.some((s: string) => s.toLowerCase().includes('styl'))).toBe(true);
    });

    it('should return multiple suggestions when multiple scores are low', () => {
      const validator = new DesignQualityValidator({ provider: 'gemini', apiKey: 'test' });
      const suggestions = (validator as any).generateAutoFixSuggestions({
        colorMatch: { score: 50, notes: '' },
        typographyMatch: { score: 50, notes: '' },
        visualDepth: { score: 50, notes: '' },
        brandFit: { score: 50, notes: '' }
      });

      expect(suggestions.length).toBe(4);
    });

    it('should return empty array when all scores are above threshold', () => {
      const validator = new DesignQualityValidator({ provider: 'gemini', apiKey: 'test' });
      const suggestions = (validator as any).generateAutoFixSuggestions({
        colorMatch: { score: 90, notes: '' },
        typographyMatch: { score: 85, notes: '' },
        visualDepth: { score: 80, notes: '' },
        brandFit: { score: 95, notes: '' }
      });

      expect(suggestions.length).toBe(0);
    });
  });

  describe('getDefaultValidation', () => {
    it('should return default scores of 50 when API fails', () => {
      const validator = new DesignQualityValidator({ provider: 'gemini', apiKey: 'test' });
      const defaultResult = (validator as any).getDefaultValidation();

      expect(defaultResult.overallScore).toBe(50);
      expect(defaultResult.colorMatch.score).toBe(50);
      expect(defaultResult.typographyMatch.score).toBe(50);
      expect(defaultResult.visualDepth.score).toBe(50);
      expect(defaultResult.brandFit.score).toBe(50);
    });
  });

  describe('provider selection', () => {
    it('should support gemini provider', () => {
      const validator = new DesignQualityValidator({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      expect((validator as any).config.provider).toBe('gemini');
    });

    it('should support anthropic provider', () => {
      const validator = new DesignQualityValidator({
        provider: 'anthropic',
        apiKey: 'test-key'
      });

      expect((validator as any).config.provider).toBe('anthropic');
    });
  });
});
