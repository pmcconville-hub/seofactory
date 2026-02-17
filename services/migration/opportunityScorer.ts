export interface OpportunityInput {
  id: string;
  gscImpressions: number;
  gscClicks: number;
  auditScore: number;
  ceAlignment?: number;
  matchConfidence: number;
  topicType: 'core' | 'outer';
  wordCount: number;
  hasStrikingDistance: boolean;
}

export interface OpportunityResult {
  id: string;
  impactScore: number;      // 0-100
  effortScore: number;      // 0-100
  quadrant: 'quick_win' | 'strategic_investment' | 'fill_in' | 'deprioritize';
}

export class OpportunityScorer {
  score(input: OpportunityInput): OpportunityResult {
    // Impact Score (0-100)
    const trafficPotential = Math.min(
      20 * Math.log10((input.gscImpressions || 1) + 1) + (input.hasStrikingDistance ? 20 : 0),
      100
    ) * 0.3;

    const alignmentGap = (100 - (input.ceAlignment || input.matchConfidence * 100)) * 0.3;

    const strategicImportance = (input.topicType === 'core' ? 80 : 40) * 0.2;

    const qualityGap = (100 - input.auditScore) * 0.2;

    const impactScore = Math.min(Math.round(trafficPotential + alignmentGap + strategicImportance + qualityGap), 100);

    // Effort Score (0-100)
    const contentRewriteScope = Math.max(0, 100 - input.auditScore) * 0.4;
    const alignmentWork = Math.max(0, 100 - (input.ceAlignment || input.matchConfidence * 100)) * 0.3;
    const contentVolume = (input.wordCount < 300 ? 80 : input.wordCount < 800 ? 40 : 10) * 0.3;

    const effortScore = Math.min(Math.round(contentRewriteScope + alignmentWork + contentVolume), 100);

    // Quadrant classification
    let quadrant: OpportunityResult['quadrant'];
    if (impactScore >= 50 && effortScore < 50) {
      quadrant = 'quick_win';
    } else if (impactScore >= 50 && effortScore >= 50) {
      quadrant = 'strategic_investment';
    } else if (impactScore < 50 && effortScore < 50) {
      quadrant = 'fill_in';
    } else {
      quadrant = 'deprioritize';
    }

    return { id: input.id, impactScore, effortScore, quadrant };
  }
}
