// services/brand-replication/phase4-validation/DesignQualityScorer.ts

import type { ScoreBreakdown, SectionDesignDecision } from '../interfaces';

export class DesignQualityScorer {
  score(
    renderedHtml: string,
    decisions: SectionDesignDecision[]
  ): ScoreBreakdown {
    const details: string[] = [];
    const suggestions: string[] = [];
    let totalScore = 0;
    let checks = 0;

    // Check 1: Visual hierarchy (hero/featured sections)
    const hasHero = decisions.some(d => d.layout.emphasis === 'hero');
    const hasFeatured = decisions.some(d => d.layout.emphasis === 'featured');
    if (hasHero) {
      totalScore += 100;
      details.push('Strong visual hierarchy with hero section');
    } else if (hasFeatured) {
      totalScore += 70;
      details.push('Moderate visual hierarchy with featured sections');
      suggestions.push('Consider adding a hero section for more impact');
    } else {
      totalScore += 40;
      suggestions.push('Add hero or featured sections for visual hierarchy');
    }
    checks++;

    // Check 2: Component variety
    const componentTypes = new Set(decisions.map(d => d.component));
    const varietyScore = Math.min(100, componentTypes.size * 25);
    totalScore += varietyScore;
    if (componentTypes.size >= 4) {
      details.push(`Excellent component variety (${componentTypes.size} types)`);
    } else if (componentTypes.size >= 2) {
      details.push(`Good component variety (${componentTypes.size} types)`);
      suggestions.push('Consider adding more component variety');
    } else {
      suggestions.push('Article needs more visual variety');
    }
    checks++;

    // Check 3: Width variation
    const widths = new Set(decisions.map(d => d.layout.width));
    const widthVariationScore = widths.size >= 2 ? 100 : 60;
    totalScore += widthVariationScore;
    if (widths.size >= 2) {
      details.push('Good width variation across sections');
    } else {
      suggestions.push('Add width variation for visual rhythm');
    }
    checks++;

    // Check 4: Multi-column layouts
    const hasMultiColumn = decisions.some(d => d.layout.columns > 1);
    totalScore += hasMultiColumn ? 100 : 50;
    if (hasMultiColumn) {
      details.push('Multi-column layouts used');
    } else {
      suggestions.push('Add multi-column layouts for visual interest');
    }
    checks++;

    // Check 5: Consistent spacing (check CSS)
    const hasSpacingSystem = renderedHtml.includes('padding:') || renderedHtml.includes('margin:');
    totalScore += hasSpacingSystem ? 80 : 50;
    checks++;

    const score = Math.round(totalScore / checks);

    return {
      score,
      maxScore: 100,
      percentage: score,
      details,
      suggestions,
    };
  }
}
