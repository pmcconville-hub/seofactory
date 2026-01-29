// services/brand-replication/phase4-validation/BrandMatchScorer.ts

import type { ScoreBreakdown } from '../interfaces';

export interface BrandMatchScorerConfig {
  aiProvider: 'anthropic' | 'gemini';
  apiKey: string;
  model?: string;
}

export class BrandMatchScorer {
  private config: BrandMatchScorerConfig;

  constructor(config: BrandMatchScorerConfig) {
    this.config = config;
  }

  async score(
    renderedHtml: string,
    brandColors: string[],
    brandFonts: string[]
  ): Promise<ScoreBreakdown> {
    // Check for brand colors in CSS
    const colorMatches = brandColors.filter(color =>
      renderedHtml.toLowerCase().includes(color.toLowerCase())
    );
    const colorScore = brandColors.length > 0
      ? (colorMatches.length / brandColors.length) * 100
      : 50;

    // Check for brand fonts in CSS
    const fontMatches = brandFonts.filter(font =>
      renderedHtml.toLowerCase().includes(font.toLowerCase())
    );
    const fontScore = fontMatches.length > 0 ? 100 : 50;

    // Check for CSS custom properties usage (good practice)
    const hasCustomProps = renderedHtml.includes('var(--');
    const customPropScore = hasCustomProps ? 100 : 70;

    const score = Math.round((colorScore * 0.4) + (fontScore * 0.3) + (customPropScore * 0.3));

    const details: string[] = [];
    const suggestions: string[] = [];

    if (brandColors.length > 0) {
      if (colorMatches.length < brandColors.length) {
        details.push(`${colorMatches.length}/${brandColors.length} brand colors used`);
        suggestions.push('Ensure all brand colors are properly applied');
      } else {
        details.push('All brand colors present');
      }
    } else {
      details.push('No brand colors defined for comparison');
    }

    if (brandFonts.length > 0) {
      if (fontMatches.length === 0) {
        details.push('Brand fonts not detected');
        suggestions.push('Verify brand fonts are loaded and applied');
      } else {
        details.push('Brand fonts applied correctly');
      }
    } else {
      details.push('No brand fonts defined for comparison');
    }

    if (!hasCustomProps) {
      suggestions.push('Consider using CSS custom properties for better maintainability');
    }

    return {
      score,
      maxScore: 100,
      percentage: score,
      details,
      suggestions,
    };
  }
}
