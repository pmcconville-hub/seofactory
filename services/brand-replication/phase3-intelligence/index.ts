// services/brand-replication/phase3-intelligence/index.ts

import {
  BaseModule,
  type IntelligenceInput,
  type IntelligenceOutput,
  type IntelligenceConfig,
  type SectionDesignDecision,
  type ValidationResult,
} from '../interfaces';
import { ContextBuilder } from './ContextBuilder';
import { SectionAnalyzer } from './SectionAnalyzer';
import { ComponentMatcher } from './ComponentMatcher';
import { DEFAULT_INTELLIGENCE_CONFIG } from '../config';

/**
 * IntelligenceModule analyzes article content using full semantic context
 * and makes intelligent design decisions about which component to use for each section.
 *
 * This is the CRITICAL module that makes the system context-aware rather than template-based.
 */
export class IntelligenceModule extends BaseModule<
  IntelligenceInput,
  IntelligenceOutput,
  IntelligenceConfig
> {
  private contextBuilder: ContextBuilder;
  private sectionAnalyzer: SectionAnalyzer;
  private componentMatcher: ComponentMatcher;

  constructor(config: IntelligenceConfig) {
    // Merge with defaults for contextConfig
    const mergedConfig: IntelligenceConfig = {
      ...config,
      contextConfig: {
        ...DEFAULT_INTELLIGENCE_CONFIG.contextConfig,
        ...config.contextConfig,
      },
    };

    super(mergedConfig);

    this.contextBuilder = new ContextBuilder();

    this.sectionAnalyzer = new SectionAnalyzer({
      aiProvider: config.aiProvider,
      apiKey: config.apiKey,
      model: config.model,
      customPrompt: config.customPrompt,
    });

    this.componentMatcher = new ComponentMatcher({
      aiProvider: config.aiProvider,
      apiKey: config.apiKey,
      model: config.model,
    });
  }

  /**
   * Returns the phase name for status tracking.
   */
  getPhaseName(): string {
    return 'intelligence';
  }

  /**
   * Runs the intelligence analysis on article content.
   */
  async run(input: IntelligenceInput): Promise<IntelligenceOutput> {
    this.updateStatus({
      status: 'running',
      progress: 0,
      startedAt: new Date().toISOString(),
    });

    const decisions: SectionDesignDecision[] = [];
    const errors: string[] = [];

    try {
      // Build full content context
      const contentContext = this.contextBuilder.buildContentContext(
        input,
        input.topicalMap,
        input.brief,
        input.topic
      );

      const sections = contentContext.article.sections;
      const total = sections.length;

      if (total === 0) {
        throw new Error('No sections found in article content');
      }

      this.updateStatus({
        progress: 5,
        message: `Analyzing ${total} sections...`,
      });

      // Analyze each section
      for (let i = 0; i < total; i++) {
        const section = sections[i];

        this.updateStatus({
          progress: Math.round((i / total) * 85) + 10,
          message: `Analyzing section ${i + 1}/${total}: ${section.heading}...`,
        });

        try {
          // Build section context with surrounding sections
          const sectionContext = this.contextBuilder.buildSectionContext(section, sections, i);

          // Analyze section semantically
          let analysis;
          try {
            analysis = await this.sectionAnalyzer.analyze(
              sectionContext,
              contentContext.article.title,
              contentContext.article.mainMessage,
              contentContext.pillars.centralEntity,
              contentContext.pillars.sourceContext,
              contentContext.topicalMap.targetAudience
            );
          } catch (analysisError) {
            // Fall back to heuristic analysis if AI fails
            if (this.config.debug) {
              console.warn(
                `AI analysis failed for section "${section.heading}", using heuristics:`,
                analysisError
              );
            }
            analysis = this.sectionAnalyzer.analyzeHeuristically(sectionContext);
          }

          // Match to best component
          let decision;
          try {
            decision = await this.componentMatcher.match(
              section.id,
              section.heading,
              section.content,
              analysis,
              input.componentLibrary
            );
          } catch (matchError) {
            // Fall back to heuristic matching if AI fails
            if (this.config.debug) {
              console.warn(
                `AI matching failed for section "${section.heading}", using heuristics:`,
                matchError
              );
            }
            decision = this.componentMatcher.matchHeuristically(
              section.id,
              section.heading,
              analysis,
              input.componentLibrary
            );
          }

          // Apply any layout overrides from config
          if (this.config.layoutOverrides?.[section.id]) {
            decision.layout = {
              ...decision.layout,
              ...this.config.layoutOverrides[section.id],
            };
            decision.reasoning += ' (layout overridden by config)';
          }

          decisions.push(decision);

          // Store raw response for debugging
          if (this.config.debug) {
            this.lastRawResponse = [
              `=== Section: ${section.heading} ===`,
              `Analysis: ${this.sectionAnalyzer.getLastRawResponse()}`,
              `Matching: ${this.componentMatcher.getLastRawResponse()}`,
            ].join('\n\n');
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(`Failed to analyze section "${section.heading}": ${errorMessage}`);

          // Create a minimal fallback decision
          decisions.push({
            sectionId: section.id,
            sectionHeading: section.heading,
            component: 'DefaultSection',
            componentId: 'default-section',
            variant: 'default',
            layout: { columns: 1, width: 'medium', emphasis: 'standard' },
            reasoning: `Fallback due to error: ${errorMessage}`,
            semanticRole: 'unknown',
            contentMapping: {},
            confidence: 0.3,
          });
        }
      }

      // Determine overall status
      const status =
        errors.length === 0
          ? 'success'
          : decisions.filter(d => d.confidence > 0.5).length > 0
            ? 'partial'
            : 'failed';

      const output: IntelligenceOutput = {
        brandId: input.brandId,
        articleId: input.articleId,
        decisions,
        overallStrategy: this.generateOverallStrategy(decisions),
        timestamp: new Date().toISOString(),
        status,
        errors: errors.length > 0 ? errors : undefined,
      };

      this.updateStatus({
        status,
        progress: 100,
        completedAt: new Date().toISOString(),
        message:
          status === 'success'
            ? `Successfully analyzed ${decisions.length} sections`
            : `Completed with ${errors.length} errors`,
      });

      return output;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.updateStatus({
        status: 'failed',
        message: errorMessage,
        completedAt: new Date().toISOString(),
      });

      return {
        brandId: input.brandId,
        articleId: input.articleId,
        decisions: [],
        overallStrategy: '',
        timestamp: new Date().toISOString(),
        status: 'failed',
        errors: [errorMessage],
      };
    }
  }

  /**
   * Generates an overall strategy summary from the decisions.
   */
  private generateOverallStrategy(decisions: SectionDesignDecision[]): string {
    if (decisions.length === 0) {
      return 'No design decisions were generated.';
    }

    const componentTypes = [...new Set(decisions.map(d => d.component))];
    const emphasisLevels = decisions.map(d => d.layout.emphasis);
    const hasHero = emphasisLevels.includes('hero');
    const hasFeatured = emphasisLevels.includes('featured');

    const widths = decisions.map(d => d.layout.width);
    const hasVariedWidths = new Set(widths).size > 1;

    const avgConfidence =
      decisions.reduce((sum, d) => sum + d.confidence, 0) / decisions.length;

    const hierarchyStrength = hasHero ? 'strong' : hasFeatured ? 'moderate' : 'subtle';

    const parts = [
      `Article uses ${componentTypes.length} distinct component type${componentTypes.length === 1 ? '' : 's'}`,
      `with ${hierarchyStrength} visual hierarchy`,
      hasVariedWidths ? 'and varied layout widths' : '',
      `(${Math.round(avgConfidence * 100)}% avg confidence)`,
    ].filter(Boolean);

    return `${parts.join(' ')}. Components: ${componentTypes.join(', ')}.`;
  }

  /**
   * Validates the output for quality and completeness.
   */
  validateOutput(output: IntelligenceOutput): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for failed status
    if (output.status === 'failed') {
      errors.push(
        'Intelligence analysis failed: ' + (output.errors?.join(', ') ?? 'unknown error')
      );
    }

    // Check for empty decisions
    if (output.decisions.length === 0) {
      errors.push('No design decisions were generated');
    }

    // Check for low confidence decisions
    const lowConfidenceCount = output.decisions.filter(d => d.confidence < 0.5).length;
    if (lowConfidenceCount > output.decisions.length / 2) {
      warnings.push(
        `${lowConfidenceCount} of ${output.decisions.length} decisions have low confidence (<50%)`
      );
    }

    // Check for visual variety
    const componentTypes = new Set(output.decisions.map(d => d.component));
    if (componentTypes.size < 2 && output.decisions.length > 3) {
      warnings.push(
        'Limited component variety - consider using more diverse layouts for better visual interest'
      );
    }
    if (componentTypes.size < 3 && output.decisions.length > 5) {
      warnings.push(
        'Article may benefit from more component variety for visual engagement'
      );
    }

    // Check for hero section
    const hasHero = output.decisions.some(d => d.layout.emphasis === 'hero');
    if (!hasHero && output.decisions.length > 0) {
      warnings.push('No hero section - article may lack visual impact at the start');
    }

    // Check for CTA section
    const hasCta = output.decisions.some(
      d =>
        d.semanticRole.toLowerCase().includes('cta') ||
        d.semanticRole.toLowerCase().includes('action') ||
        d.semanticRole.toLowerCase().includes('conclusion')
    );
    if (!hasCta && output.decisions.length > 2) {
      warnings.push('No clear call-to-action section detected');
    }

    // Check for consistent layout flow
    const emphasisProgression = output.decisions.map(d => d.layout.emphasis);
    if (emphasisProgression.length > 3) {
      const firstThird = emphasisProgression.slice(0, Math.ceil(emphasisProgression.length / 3));
      if (!firstThird.includes('hero') && !firstThird.includes('featured')) {
        warnings.push(
          'Consider adding a featured or hero section early in the article for stronger visual entry'
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Gets the context builder instance for direct access if needed.
   */
  getContextBuilder(): ContextBuilder {
    return this.contextBuilder;
  }

  /**
   * Gets the section analyzer instance for direct access if needed.
   */
  getSectionAnalyzer(): SectionAnalyzer {
    return this.sectionAnalyzer;
  }

  /**
   * Gets the component matcher instance for direct access if needed.
   */
  getComponentMatcher(): ComponentMatcher {
    return this.componentMatcher;
  }
}

// Re-export components for direct use
export { ContextBuilder } from './ContextBuilder';
export { SectionAnalyzer } from './SectionAnalyzer';
export type { SectionAnalysis, SectionAnalyzerConfig } from './SectionAnalyzer';
export { ComponentMatcher } from './ComponentMatcher';
export type { ComponentMatcherConfig } from './ComponentMatcher';
