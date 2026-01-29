// services/brand-replication/phase4-validation/index.ts

import {
  BaseModule,
  type ValidationInput,
  type ValidationOutput,
  type ValidationConfig,
  type ValidationResult,
  type SectionDesignDecision,
} from '../interfaces';
import { BrandMatchScorer } from './BrandMatchScorer';
import { DesignQualityScorer } from './DesignQualityScorer';
import { WowFactorChecker } from './WowFactorChecker';
import { DEFAULT_THRESHOLDS, DEFAULT_WEIGHTS } from '../config';

export class ValidationModule extends BaseModule<ValidationInput, ValidationOutput, ValidationConfig> {
  private brandMatchScorer: BrandMatchScorer;
  private designQualityScorer: DesignQualityScorer;
  private wowFactorChecker: WowFactorChecker;

  constructor(config: ValidationConfig) {
    super(config);

    this.brandMatchScorer = new BrandMatchScorer({
      aiProvider: config.aiProvider,
      apiKey: config.apiKey,
      model: config.model,
    });

    this.designQualityScorer = new DesignQualityScorer();
    this.wowFactorChecker = new WowFactorChecker(config.wowFactorChecklist);
  }

  getPhaseName(): string {
    return 'validation';
  }

  async run(input: ValidationInput): Promise<ValidationOutput> {
    this.updateStatus({ status: 'running', progress: 0, startedAt: new Date().toISOString() });

    try {
      // Extract brand info from component library
      const brandColors = this.extractBrandColors(input.renderedHtml);
      const brandFonts = this.extractBrandFonts(input.renderedHtml);

      // Score brand match
      this.updateStatus({ progress: 25, message: 'Scoring brand match...' });
      const brandMatch = await this.brandMatchScorer.score(
        input.renderedHtml,
        brandColors,
        brandFonts
      );

      // Score design quality
      this.updateStatus({ progress: 50, message: 'Scoring design quality...' });
      const designQuality = this.designQualityScorer.score(
        input.renderedHtml,
        input.decisions
      );

      // Score user experience (simplified - would be more sophisticated in production)
      this.updateStatus({ progress: 70, message: 'Scoring user experience...' });
      const userExperience = this.scoreUserExperience(input.renderedHtml, input.decisions);

      // Check wow factors
      this.updateStatus({ progress: 85, message: 'Checking wow factors...' });
      const wowFactorChecklist = this.wowFactorChecker.check(
        input.renderedHtml,
        input.decisions
      );

      // Calculate overall score
      const weights = this.config.weights ?? DEFAULT_WEIGHTS;
      const overall = Math.round(
        (brandMatch.score * weights.brandMatch) +
        (designQuality.score * weights.designQuality) +
        (userExperience.score * weights.userExperience)
      );

      // Determine if passes threshold
      const thresholds = this.config.thresholds ?? DEFAULT_THRESHOLDS;
      const passesThreshold = overall >= thresholds.overall &&
        brandMatch.score >= thresholds.brandMatch &&
        designQuality.score >= thresholds.designQuality &&
        userExperience.score >= thresholds.userExperience;

      // Compile suggestions
      const suggestions = [
        ...brandMatch.suggestions,
        ...designQuality.suggestions,
        ...userExperience.suggestions,
        ...wowFactorChecklist.filter(w => !w.passed && w.required).map(w => `Required: ${w.label}`),
      ];

      const output: ValidationOutput = {
        brandId: input.brandId,
        articleId: input.articleId,
        scores: {
          brandMatch,
          designQuality,
          userExperience,
          overall,
        },
        wowFactorChecklist,
        passesThreshold,
        suggestions,
        timestamp: new Date().toISOString(),
        status: 'success',
      };

      this.updateStatus({
        status: 'success',
        progress: 100,
        completedAt: new Date().toISOString(),
      });

      return output;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.updateStatus({ status: 'failed', message: errorMessage });

      return {
        brandId: input.brandId,
        articleId: input.articleId,
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
        errors: [errorMessage],
      };
    }
  }

  private extractBrandColors(html: string): string[] {
    const colorMatches = html.match(/--brand-[a-z-]+:\s*([#\w]+)/g) || [];
    return colorMatches.map(m => m.split(':')[1]?.trim()).filter(Boolean);
  }

  private extractBrandFonts(html: string): string[] {
    const fontMatches = html.match(/font-family:\s*['"]?([^;'"]+)/g) || [];
    return fontMatches.map(m => m.split(':')[1]?.trim()).filter(Boolean);
  }

  private scoreUserExperience(html: string, decisions: SectionDesignDecision[]): {
    score: number;
    maxScore: number;
    percentage: number;
    details: string[];
    suggestions: string[];
  } {
    const details: string[] = [];
    const suggestions: string[] = [];
    let score = 70; // Base score

    // Check scannable content
    const hasHeadings = html.includes('<h2') || html.includes('<h3');
    const hasLists = html.includes('<ul') || html.includes('<ol');
    if (hasHeadings && hasLists) {
      score += 15;
      details.push('Content is scannable with headings and lists');
    } else {
      suggestions.push('Add more structure with headings and lists');
    }

    // Check reading flow
    const hasIntro = decisions.length > 0 && decisions[0].layout.emphasis !== 'minimal';
    const hasConclusion = decisions.length > 1 &&
      decisions[decisions.length - 1].semanticRole.includes('conclusion');
    if (hasIntro && hasConclusion) {
      score += 10;
      details.push('Clear reading flow from intro to conclusion');
    }

    // Check for actionable content
    const hasActionable = decisions.some(d => d.contentMapping.ctaText);
    if (hasActionable) {
      score += 5;
      details.push('Contains actionable elements');
    } else {
      suggestions.push('Consider adding clear calls to action');
    }

    return {
      score: Math.min(100, score),
      maxScore: 100,
      percentage: Math.min(100, score),
      details,
      suggestions,
    };
  }

  validateOutput(output: ValidationOutput): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (output.status === 'failed') {
      errors.push('Validation failed: ' + (output.errors?.join(', ') ?? 'unknown error'));
    }

    if (!output.passesThreshold) {
      warnings.push(`Output does not meet quality threshold (${output.scores.overall}%)`);
    }

    const failedRequired = output.wowFactorChecklist.filter(w => w.required && !w.passed);
    if (failedRequired.length > 0) {
      warnings.push(`${failedRequired.length} required wow-factor checks failed`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export { BrandMatchScorer } from './BrandMatchScorer';
export { DesignQualityScorer } from './DesignQualityScorer';
export { WowFactorChecker } from './WowFactorChecker';
