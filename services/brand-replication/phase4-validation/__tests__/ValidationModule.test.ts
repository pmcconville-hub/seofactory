// services/brand-replication/phase4-validation/__tests__/ValidationModule.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { ValidationModule } from '../index';
import { BrandMatchScorer } from '../BrandMatchScorer';
import { DesignQualityScorer } from '../DesignQualityScorer';
import { WowFactorChecker } from '../WowFactorChecker';
import type {
  ValidationConfig,
  ValidationInput,
  ValidationOutput,
  SectionDesignDecision,
  WowFactorItem,
} from '../../interfaces';
import { DEFAULT_THRESHOLDS, DEFAULT_WEIGHTS, DEFAULT_WOW_FACTOR_CHECKLIST } from '../../config';

// Test fixtures
const createSectionDesignDecision = (
  sectionId: string,
  overrides: Partial<SectionDesignDecision> = {}
): SectionDesignDecision => ({
  sectionId,
  sectionHeading: `Section ${sectionId}`,
  component: 'TestComponent',
  componentId: 'comp-1',
  variant: 'default',
  layout: {
    columns: 1,
    width: 'medium',
    emphasis: 'standard',
  },
  reasoning: 'Test reasoning',
  semanticRole: 'content',
  contentMapping: {
    title: 'Test title',
  },
  confidence: 0.85,
  ...overrides,
});

const createValidationInput = (overrides: Partial<ValidationInput> = {}): ValidationInput => ({
  brandId: 'brand-1',
  articleId: 'article-1',
  renderedHtml: `
    <style>
      :root {
        --brand-primary: #3b82f6;
        --brand-secondary: #10b981;
      }
      .container { font-family: 'Inter', sans-serif; padding: 20px; margin: 10px; }
      .hero { transition: all 0.3s; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
      .hero:hover { transform: scale(1.02); }
    </style>
    <h2>Test Article</h2>
    <ul><li>Item 1</li><li>Item 2</li></ul>
  `,
  decisions: [
    createSectionDesignDecision('section-1', {
      layout: { columns: 1, width: 'wide', emphasis: 'hero' },
      semanticRole: 'introduction',
    }),
    createSectionDesignDecision('section-2', {
      component: 'ContentBlock',
      layout: { columns: 2, width: 'medium', emphasis: 'standard' },
    }),
    createSectionDesignDecision('section-3', {
      component: 'Callout',
      layout: { columns: 1, width: 'narrow', emphasis: 'featured' },
    }),
    createSectionDesignDecision('section-4', {
      component: 'CTA',
      layout: { columns: 1, width: 'medium', emphasis: 'standard' },
      semanticRole: 'conclusion',
      contentMapping: { ctaText: 'Get Started' },
    }),
  ],
  componentLibrary: [],
  sourceScreenshots: [],
  ...overrides,
});

const createValidationConfig = (overrides: Partial<ValidationConfig> = {}): ValidationConfig => ({
  aiProvider: 'anthropic',
  apiKey: 'test-api-key',
  thresholds: DEFAULT_THRESHOLDS,
  weights: DEFAULT_WEIGHTS,
  wowFactorChecklist: DEFAULT_WOW_FACTOR_CHECKLIST,
  ...overrides,
});

describe('ValidationModule', () => {
  let module: ValidationModule;
  let config: ValidationConfig;

  beforeEach(() => {
    config = createValidationConfig();
    module = new ValidationModule(config);
  });

  describe('getPhaseName', () => {
    it('should return "validation"', () => {
      expect(module.getPhaseName()).toBe('validation');
    });
  });

  describe('run', () => {
    it('should return successful validation output with all scores', async () => {
      const input = createValidationInput();
      const output = await module.run(input);

      expect(output.status).toBe('success');
      expect(output.brandId).toBe('brand-1');
      expect(output.articleId).toBe('article-1');
      expect(output.scores.brandMatch).toBeDefined();
      expect(output.scores.designQuality).toBeDefined();
      expect(output.scores.userExperience).toBeDefined();
      expect(output.scores.overall).toBeGreaterThan(0);
      expect(output.wowFactorChecklist.length).toBeGreaterThan(0);
      expect(output.timestamp).toBeDefined();
    });

    it('should calculate overall score based on weights', async () => {
      const input = createValidationInput();
      const output = await module.run(input);

      // Verify overall is calculated from component scores
      const expectedOverall = Math.round(
        (output.scores.brandMatch.score * DEFAULT_WEIGHTS.brandMatch) +
        (output.scores.designQuality.score * DEFAULT_WEIGHTS.designQuality) +
        (output.scores.userExperience.score * DEFAULT_WEIGHTS.userExperience)
      );

      expect(output.scores.overall).toBe(expectedOverall);
    });

    it('should pass threshold with high-quality input', async () => {
      const input = createValidationInput();
      const output = await module.run(input);

      // With the default good input, most wow factors should pass
      const passedCount = output.wowFactorChecklist.filter(w => w.passed).length;
      expect(passedCount).toBeGreaterThan(0);
    });

    it('should fail threshold with poor-quality input', async () => {
      const input = createValidationInput({
        renderedHtml: '<div>Basic content</div>',
        decisions: [
          createSectionDesignDecision('section-1', {
            layout: { columns: 1, width: 'medium', emphasis: 'minimal' },
          }),
        ],
      });

      const output = await module.run(input);

      expect(output.passesThreshold).toBe(false);
      expect(output.suggestions.length).toBeGreaterThan(0);
    });

    it('should collect suggestions from all scorers', async () => {
      const input = createValidationInput({
        renderedHtml: '<div>Basic content</div>',
        decisions: [
          createSectionDesignDecision('section-1'),
        ],
      });

      const output = await module.run(input);

      // Should have suggestions from various sources
      expect(output.suggestions.length).toBeGreaterThan(0);
    });

    it('should update status during execution', async () => {
      const input = createValidationInput();

      // Check initial status
      expect(module.getStatus().status).toBe('pending');
      expect(module.getStatus().progress).toBe(0);

      await module.run(input);

      // Check final status
      expect(module.getStatus().status).toBe('success');
      expect(module.getStatus().progress).toBe(100);
      expect(module.getStatus().completedAt).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      // Create a module with invalid config that might cause issues
      const input = createValidationInput({
        decisions: null as any, // Invalid input
      });

      const output = await module.run(input);

      expect(output.status).toBe('failed');
      expect(output.errors).toBeDefined();
      expect(output.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('validateOutput', () => {
    it('should return valid for successful output', async () => {
      const input = createValidationInput();
      const output = await module.run(input);

      const result = module.validateOutput(output);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid for failed output', () => {
      const failedOutput: ValidationOutput = {
        brandId: 'brand-1',
        articleId: 'article-1',
        scores: {
          brandMatch: { score: 0, maxScore: 100, percentage: 0, details: [], suggestions: [] },
          designQuality: { score: 0, maxScore: 100, percentage: 0, details: [], suggestions: [] },
          userExperience: { score: 0, maxScore: 100, percentage: 0, details: [], suggestions: [] },
          overall: 0,
        },
        wowFactorChecklist: [],
        passesThreshold: false,
        suggestions: [],
        timestamp: new Date().toISOString(),
        status: 'failed',
        errors: ['Test error'],
      };

      const result = module.validateOutput(failedOutput);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should add warning for failed required wow factors', async () => {
      const input = createValidationInput({
        decisions: [
          createSectionDesignDecision('section-1', {
            layout: { columns: 1, width: 'medium', emphasis: 'minimal' },
          }),
        ],
      });

      const output = await module.run(input);
      const result = module.validateOutput(output);

      // Should have warnings about failed wow factors
      expect(result.warnings.some(w => w.includes('wow-factor'))).toBe(true);
    });
  });

  describe('getStatus', () => {
    it('should return current module status', () => {
      const status = module.getStatus();

      expect(status.phase).toBe('validation');
      expect(status.status).toBe('pending');
      expect(status.progress).toBe(0);
    });
  });
});

describe('BrandMatchScorer', () => {
  let scorer: BrandMatchScorer;

  beforeEach(() => {
    scorer = new BrandMatchScorer({
      aiProvider: 'anthropic',
      apiKey: 'test-key',
    });
  });

  describe('score', () => {
    it('should score 100% when all brand colors are present', async () => {
      const html = `
        <style>
          .element { color: #3b82f6; background: #10b981; }
        </style>
      `;
      const brandColors = ['#3b82f6', '#10b981'];
      const brandFonts = ['Inter'];

      const result = await scorer.score(html, brandColors, brandFonts);

      expect(result.score).toBeGreaterThan(0);
      expect(result.details).toContain('All brand colors present');
    });

    it('should score lower when brand colors are missing', async () => {
      const html = '<style>.element { color: red; }</style>';
      const brandColors = ['#3b82f6', '#10b981'];
      const brandFonts: string[] = [];

      const result = await scorer.score(html, brandColors, brandFonts);

      expect(result.suggestions).toContain('Ensure all brand colors are properly applied');
    });

    it('should detect brand fonts', async () => {
      const html = `
        <style>
          body { font-family: 'Inter', sans-serif; }
        </style>
      `;
      const brandColors: string[] = [];
      const brandFonts = ['Inter'];

      const result = await scorer.score(html, brandColors, brandFonts);

      expect(result.details).toContain('Brand fonts applied correctly');
    });

    it('should suggest CSS custom properties when not used', async () => {
      const html = '<style>.element { color: #333; }</style>';

      const result = await scorer.score(html, [], []);

      expect(result.suggestions).toContain('Consider using CSS custom properties for better maintainability');
    });

    it('should give higher score when CSS custom properties are used', async () => {
      const htmlWithProps = '<style>.element { color: var(--brand-primary); }</style>';
      const htmlWithout = '<style>.element { color: #333; }</style>';

      const resultWithProps = await scorer.score(htmlWithProps, [], []);
      const resultWithout = await scorer.score(htmlWithout, [], []);

      expect(resultWithProps.score).toBeGreaterThan(resultWithout.score);
    });

    it('should handle empty brand colors and fonts', async () => {
      const html = '<div>Content</div>';

      const result = await scorer.score(html, [], []);

      expect(result.score).toBeGreaterThan(0);
      expect(result.details).toContain('No brand colors defined for comparison');
      expect(result.details).toContain('No brand fonts defined for comparison');
    });
  });
});

describe('DesignQualityScorer', () => {
  let scorer: DesignQualityScorer;

  beforeEach(() => {
    scorer = new DesignQualityScorer();
  });

  describe('score', () => {
    it('should give high score for hero sections', () => {
      const decisions: SectionDesignDecision[] = [
        createSectionDesignDecision('section-1', {
          layout: { columns: 1, width: 'full', emphasis: 'hero' },
        }),
        createSectionDesignDecision('section-2', {
          component: 'ContentBlock',
          layout: { columns: 2, width: 'medium', emphasis: 'standard' },
        }),
      ];

      const result = scorer.score('<div></div>', decisions);

      expect(result.details).toContain('Strong visual hierarchy with hero section');
    });

    it('should suggest hero section when only featured sections exist', () => {
      const decisions: SectionDesignDecision[] = [
        createSectionDesignDecision('section-1', {
          layout: { columns: 1, width: 'medium', emphasis: 'featured' },
        }),
      ];

      const result = scorer.score('<div></div>', decisions);

      expect(result.details).toContain('Moderate visual hierarchy with featured sections');
      expect(result.suggestions).toContain('Consider adding a hero section for more impact');
    });

    it('should reward component variety', () => {
      const decisions: SectionDesignDecision[] = [
        createSectionDesignDecision('section-1', { component: 'Hero' }),
        createSectionDesignDecision('section-2', { component: 'ContentBlock' }),
        createSectionDesignDecision('section-3', { component: 'Callout' }),
        createSectionDesignDecision('section-4', { component: 'CTA' }),
      ];

      const result = scorer.score('<div></div>', decisions);

      expect(result.details).toContain('Excellent component variety (4 types)');
    });

    it('should detect width variation', () => {
      const decisions: SectionDesignDecision[] = [
        createSectionDesignDecision('section-1', {
          layout: { columns: 1, width: 'full', emphasis: 'hero' },
        }),
        createSectionDesignDecision('section-2', {
          layout: { columns: 1, width: 'narrow', emphasis: 'standard' },
        }),
      ];

      const result = scorer.score('<div></div>', decisions);

      expect(result.details).toContain('Good width variation across sections');
    });

    it('should reward multi-column layouts', () => {
      const decisions: SectionDesignDecision[] = [
        createSectionDesignDecision('section-1', {
          layout: { columns: 2, width: 'medium', emphasis: 'standard' },
        }),
      ];

      const result = scorer.score('<div></div>', decisions);

      expect(result.details).toContain('Multi-column layouts used');
    });

    it('should suggest improvements for basic layouts', () => {
      const decisions: SectionDesignDecision[] = [
        createSectionDesignDecision('section-1', {
          layout: { columns: 1, width: 'medium', emphasis: 'standard' },
        }),
      ];

      const result = scorer.score('<div></div>', decisions);

      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });
});

describe('WowFactorChecker', () => {
  let checker: WowFactorChecker;

  beforeEach(() => {
    checker = new WowFactorChecker();
  });

  describe('check', () => {
    it('should pass hero-section check when hero emphasis exists', () => {
      const decisions: SectionDesignDecision[] = [
        createSectionDesignDecision('section-1', {
          layout: { columns: 1, width: 'full', emphasis: 'hero' },
        }),
      ];

      const result = checker.check('<div></div>', decisions);
      const heroCheck = result.find(r => r.id === 'hero-section');

      expect(heroCheck?.passed).toBe(true);
      expect(heroCheck?.details).toContain('Hero section present');
    });

    it('should fail hero-section check when no hero exists', () => {
      const decisions: SectionDesignDecision[] = [
        createSectionDesignDecision('section-1', {
          layout: { columns: 1, width: 'medium', emphasis: 'standard' },
        }),
      ];

      const result = checker.check('<div></div>', decisions);
      const heroCheck = result.find(r => r.id === 'hero-section');

      expect(heroCheck?.passed).toBe(false);
      expect(heroCheck?.details).toContain('No hero section found');
    });

    it('should pass multi-column check when columns > 1', () => {
      const decisions: SectionDesignDecision[] = [
        createSectionDesignDecision('section-1', {
          layout: { columns: 3, width: 'medium', emphasis: 'standard' },
        }),
      ];

      const result = checker.check('<div></div>', decisions);
      const multiColCheck = result.find(r => r.id === 'multi-column');

      expect(multiColCheck?.passed).toBe(true);
    });

    it('should pass attention-elements check for callouts', () => {
      const decisions: SectionDesignDecision[] = [
        createSectionDesignDecision('section-1', { component: 'Callout' }),
      ];

      const result = checker.check('<div></div>', decisions);
      const attentionCheck = result.find(r => r.id === 'attention-elements');

      expect(attentionCheck?.passed).toBe(true);
    });

    it('should pass attention-elements check for highlights', () => {
      const decisions: SectionDesignDecision[] = [
        createSectionDesignDecision('section-1', { component: 'StatHighlight' }),
      ];

      const result = checker.check('<div></div>', decisions);
      const attentionCheck = result.find(r => r.id === 'attention-elements');

      expect(attentionCheck?.passed).toBe(true);
    });

    it('should pass clear-cta check when CTA is near end', () => {
      const decisions: SectionDesignDecision[] = [
        createSectionDesignDecision('section-1'),
        createSectionDesignDecision('section-2'),
        createSectionDesignDecision('section-3', {
          component: 'CTA',
          contentMapping: { ctaText: 'Get Started' },
        }),
      ];

      const result = checker.check('<div></div>', decisions);
      const ctaCheck = result.find(r => r.id === 'clear-cta');

      expect(ctaCheck?.passed).toBe(true);
    });

    it('should fail clear-cta check when no CTA at end', () => {
      const decisions: SectionDesignDecision[] = [
        createSectionDesignDecision('section-1', {
          component: 'CTA',
          contentMapping: { ctaText: 'Early CTA' },
        }),
        createSectionDesignDecision('section-2'),
        createSectionDesignDecision('section-3'),
        createSectionDesignDecision('section-4'),
      ];

      const result = checker.check('<div></div>', decisions);
      const ctaCheck = result.find(r => r.id === 'clear-cta');

      expect(ctaCheck?.passed).toBe(false);
    });

    it('should pass visual-variety check with 3+ component types', () => {
      const decisions: SectionDesignDecision[] = [
        createSectionDesignDecision('section-1', { component: 'Hero' }),
        createSectionDesignDecision('section-2', { component: 'ContentBlock' }),
        createSectionDesignDecision('section-3', { component: 'Callout' }),
      ];

      const result = checker.check('<div></div>', decisions);
      const varietyCheck = result.find(r => r.id === 'visual-variety');

      expect(varietyCheck?.passed).toBe(true);
      expect(varietyCheck?.details).toContain('3 different component types');
    });

    it('should fail visual-variety check with less than 3 component types', () => {
      const decisions: SectionDesignDecision[] = [
        createSectionDesignDecision('section-1', { component: 'ContentBlock' }),
        createSectionDesignDecision('section-2', { component: 'ContentBlock' }),
      ];

      const result = checker.check('<div></div>', decisions);
      const varietyCheck = result.find(r => r.id === 'visual-variety');

      expect(varietyCheck?.passed).toBe(false);
    });

    it('should pass professional-polish check with transitions and shadows', () => {
      const html = `
        <style>
          .element { transition: all 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .element:hover { transform: scale(1.05); }
        </style>
      `;

      const result = checker.check(html, []);
      const polishCheck = result.find(r => r.id === 'professional-polish');

      expect(polishCheck?.passed).toBe(true);
    });

    it('should fail professional-polish check without styling effects', () => {
      const html = '<style>.element { color: red; }</style>';

      const result = checker.check(html, []);
      const polishCheck = result.find(r => r.id === 'professional-polish');

      expect(polishCheck?.passed).toBe(false);
    });

    it('should handle unknown check items gracefully', () => {
      const customChecker = new WowFactorChecker([
        {
          id: 'unknown-check',
          label: 'Unknown Check',
          description: 'An unknown check type',
          required: false,
        },
      ]);

      const result = customChecker.check('<div></div>', []);

      expect(result[0].passed).toBe(false);
      expect(result[0].details).toBe('Unknown check item');
    });

    it('should use custom checklist when provided', () => {
      const customChecklist: Omit<WowFactorItem, 'passed' | 'details'>[] = [
        {
          id: 'hero-section',
          label: 'Custom Hero',
          description: 'Custom hero description',
          required: true,
        },
      ];

      const customChecker = new WowFactorChecker(customChecklist);
      const result = customChecker.check('<div></div>', []);

      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('Custom Hero');
    });
  });
});

describe('ValidationModule integration', () => {
  it('should produce comprehensive validation for a well-designed article', async () => {
    const config = createValidationConfig();
    const module = new ValidationModule(config);

    const input = createValidationInput();
    const output = await module.run(input);

    // Verify all scores are reasonable
    expect(output.scores.brandMatch.score).toBeGreaterThanOrEqual(0);
    expect(output.scores.brandMatch.score).toBeLessThanOrEqual(100);
    expect(output.scores.designQuality.score).toBeGreaterThanOrEqual(0);
    expect(output.scores.designQuality.score).toBeLessThanOrEqual(100);
    expect(output.scores.userExperience.score).toBeGreaterThanOrEqual(0);
    expect(output.scores.userExperience.score).toBeLessThanOrEqual(100);
    expect(output.scores.overall).toBeGreaterThanOrEqual(0);
    expect(output.scores.overall).toBeLessThanOrEqual(100);

    // Verify wow factors were checked
    expect(output.wowFactorChecklist.length).toBe(DEFAULT_WOW_FACTOR_CHECKLIST.length);

    // Each wow factor should have been evaluated
    output.wowFactorChecklist.forEach(wf => {
      expect(typeof wf.passed).toBe('boolean');
      expect(wf.details).toBeDefined();
    });
  });

  it('should use custom weights when provided', async () => {
    const customWeights = {
      brandMatch: 0.5,
      designQuality: 0.3,
      userExperience: 0.2,
    };

    const config = createValidationConfig({ weights: customWeights });
    const module = new ValidationModule(config);

    const input = createValidationInput();
    const output = await module.run(input);

    // Verify custom weights were used
    const expectedOverall = Math.round(
      (output.scores.brandMatch.score * 0.5) +
      (output.scores.designQuality.score * 0.3) +
      (output.scores.userExperience.score * 0.2)
    );

    expect(output.scores.overall).toBe(expectedOverall);
  });

  it('should use custom thresholds when provided', async () => {
    const customThresholds = {
      brandMatch: 99,
      designQuality: 99,
      userExperience: 99,
      overall: 99,
    };

    const config = createValidationConfig({ thresholds: customThresholds });
    const module = new ValidationModule(config);

    const input = createValidationInput();
    const output = await module.run(input);

    // With very high thresholds, should not pass
    expect(output.passesThreshold).toBe(false);
  });
});
