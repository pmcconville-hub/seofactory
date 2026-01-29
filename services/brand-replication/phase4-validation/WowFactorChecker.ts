// services/brand-replication/phase4-validation/WowFactorChecker.ts

import type { WowFactorItem, SectionDesignDecision } from '../interfaces';
import { DEFAULT_WOW_FACTOR_CHECKLIST } from '../config';

export class WowFactorChecker {
  private checklist: Omit<WowFactorItem, 'passed' | 'details'>[];

  constructor(customChecklist?: Omit<WowFactorItem, 'passed' | 'details'>[]) {
    this.checklist = customChecklist ?? DEFAULT_WOW_FACTOR_CHECKLIST;
  }

  check(
    renderedHtml: string,
    decisions: SectionDesignDecision[]
  ): WowFactorItem[] {
    return this.checklist.map(item => {
      const result = this.checkItem(item.id, renderedHtml, decisions);
      return {
        ...item,
        passed: result.passed,
        details: result.details,
      };
    });
  }

  private checkItem(
    id: string,
    html: string,
    decisions: SectionDesignDecision[]
  ): { passed: boolean; details: string } {
    switch (id) {
      case 'hero-section':
        const hasHero = decisions.some(d => d.layout.emphasis === 'hero');
        return {
          passed: hasHero,
          details: hasHero
            ? 'Hero section present at article start'
            : 'No hero section found',
        };

      case 'multi-column':
        const multiColSections = decisions.filter(d => d.layout.columns > 1);
        return {
          passed: multiColSections.length > 0,
          details: multiColSections.length > 0
            ? `${multiColSections.length} multi-column section(s) found`
            : 'All sections are single column',
        };

      case 'attention-elements':
        const attentionComponents = ['callout', 'highlight', 'stat', 'quote', 'cta'];
        const hasAttention = decisions.some(d =>
          attentionComponents.some(ac => d.component.toLowerCase().includes(ac))
        );
        return {
          passed: hasAttention,
          details: hasAttention
            ? 'Attention-grabbing elements present'
            : 'No callouts, highlights, or featured quotes',
        };

      case 'clear-cta':
        const lastDecisions = decisions.slice(-2);
        const hasCta = lastDecisions.some(d =>
          d.component.toLowerCase().includes('cta') ||
          d.contentMapping.ctaText
        );
        return {
          passed: hasCta,
          details: hasCta
            ? 'Call-to-action present near conclusion'
            : 'No clear CTA at article end',
        };

      case 'visual-variety':
        const componentTypes = new Set(decisions.map(d => d.component));
        const hasVariety = componentTypes.size >= 3;
        return {
          passed: hasVariety,
          details: hasVariety
            ? `${componentTypes.size} different component types used`
            : `Only ${componentTypes.size} component type(s) - needs more variety`,
        };

      case 'professional-polish':
        const hasTransitions = html.includes('transition');
        const hasHover = html.includes(':hover');
        const hasShadows = html.includes('box-shadow');
        const polishCount = [hasTransitions, hasHover, hasShadows].filter(Boolean).length;
        return {
          passed: polishCount >= 2,
          details: polishCount >= 2
            ? 'Professional styling with transitions and effects'
            : 'Missing polish elements (transitions, hover states, shadows)',
        };

      default:
        return { passed: false, details: 'Unknown check item' };
    }
  }
}
