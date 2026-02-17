import { describe, it, expect } from 'vitest';
import { OpportunityScorer } from '../opportunityScorer';

describe('OpportunityScorer', () => {
  it('should score high-traffic, low-quality pages as high-impact', () => {
    const scorer = new OpportunityScorer();

    const result = scorer.score({
      id: 'inv1',
      gscImpressions: 5000,
      gscClicks: 200,
      auditScore: 35,
      ceAlignment: 40,
      matchConfidence: 0.8,
      topicType: 'core',
      wordCount: 500,
      hasStrikingDistance: true,
    });

    expect(result.impactScore).toBeGreaterThan(70);
  });

  it('should score well-aligned pages as low-effort', () => {
    const scorer = new OpportunityScorer();

    const result = scorer.score({
      id: 'inv1',
      gscImpressions: 1000,
      gscClicks: 50,
      auditScore: 85,
      ceAlignment: 90,
      matchConfidence: 0.95,
      topicType: 'core',
      wordCount: 2000,
      hasStrikingDistance: false,
    });

    expect(result.effortScore).toBeLessThan(30);
  });

  it('should classify high-impact low-effort as quick_win', () => {
    const scorer = new OpportunityScorer();

    const result = scorer.score({
      id: 'inv1',
      gscImpressions: 5000,
      gscClicks: 200,
      auditScore: 60,
      ceAlignment: 50,
      matchConfidence: 0.7,
      topicType: 'core',
      wordCount: 800,
      hasStrikingDistance: true,
    });

    expect(result.quadrant).toBe('quick_win');
  });
});
