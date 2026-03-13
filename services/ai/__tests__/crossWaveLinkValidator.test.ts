import { describe, it, expect } from 'vitest';
import { validateCrossWaveLinks } from '../crossWaveLinkValidator';
import type { ContentBrief, EnrichedTopic } from '../../../types';
import type { Wave } from '../../../types/wave';
import { FreshnessProfile } from '../../../types/semantic';

function makeWave(number: number, topicIds: string[]): Wave {
  return {
    id: `wave-${number}`,
    number,
    name: `Wave ${number}`,
    description: '',
    topicIds,
    weekStart: 1,
    weekEnd: 4,
    status: 'planning',
  };
}

function makeTopic(id: string, title: string): EnrichedTopic {
  return {
    id,
    map_id: 'map-1',
    parent_topic_id: null,
    title,
    slug: id,
    description: '',
    type: 'core',
    freshness: FreshnessProfile.STANDARD,
  };
}

function makeBrief(topicId: string, linkTargets: string[]): ContentBrief {
  return {
    id: `brief-${topicId}`,
    topic_id: topicId,
    title: 'Test Brief',
    slug: '',
    metaDescription: '',
    keyTakeaways: [],
    outline: '',
    serpAnalysis: { peopleAlsoAsk: [], competitorHeadings: [] },
    visuals: { featuredImagePrompt: '', imageAltText: '' },
    contextualVectors: [],
    contextualBridge: linkTargets.map(t => ({
      targetTopic: t,
      anchorText: 'link',
      reasoning: 'test',
    })),
  };
}

describe('validateCrossWaveLinks', () => {
  it('should detect cross-wave links via contextualBridge', () => {
    const waves = [
      makeWave(1, ['t1', 't2']),
      makeWave(2, ['t3', 't4']),
    ];
    const topics = [
      makeTopic('t1', 'Topic 1'),
      makeTopic('t2', 'Topic 2'),
      makeTopic('t3', 'Topic 3'),
      makeTopic('t4', 'Topic 4'),
    ];
    // t1 links to 't3' by title match (lowercase), t2 links to t1 by title match
    const briefs: Record<string, ContentBrief> = {
      t1: makeBrief('t1', ['Topic 3']), // Cross-wave link to wave 2 (matched via title)
      t2: makeBrief('t2', ['Topic 1']), // Intra-wave link (matched via title)
      t3: makeBrief('t3', ['Topic 1']), // Cross-wave link to wave 1 (matched via title)
      t4: makeBrief('t4', ['Topic 3']), // Intra-wave link (matched via title)
    };

    const report = validateCrossWaveLinks(waves, briefs, topics);

    expect(report.waveCoverages).toHaveLength(2);

    const wave1 = report.waveCoverages.find(wc => wc.waveNumber === 1);
    expect(wave1).toBeDefined();
    expect(wave1!.crossWaveLinksCount).toBe(1); // t1 -> t3
    expect(wave1!.intraWaveLinksCount).toBe(1); // t2 -> t1
    expect(wave1!.coveragePercent).toBe(100); // references wave 2

    const wave2 = report.waveCoverages.find(wc => wc.waveNumber === 2);
    expect(wave2).toBeDefined();
    expect(wave2!.crossWaveLinksCount).toBe(1); // t3 -> t1
    expect(wave2!.intraWaveLinksCount).toBe(1); // t4 -> t3

    expect(report.overallCrossWavePercent).toBe(50); // 2 cross / 4 total = 50%
    expect(report.warnings).toHaveLength(0);
  });

  it('should warn about waves with zero cross-wave links', () => {
    const waves = [
      makeWave(1, ['t1']),
      makeWave(2, ['t2']),
    ];
    const topics = [
      makeTopic('t1', 'Topic 1'),
      makeTopic('t2', 'Topic 2'),
    ];
    // Both briefs link only within their own wave (self-links)
    const briefs: Record<string, ContentBrief> = {
      t1: makeBrief('t1', ['Topic 1']), // Intra-wave (self)
      t2: makeBrief('t2', ['Topic 2']), // Intra-wave (self)
    };

    const report = validateCrossWaveLinks(waves, briefs, topics);

    expect(report.overallCrossWavePercent).toBe(0);
    // Should have warnings about both waves having no cross-wave links
    expect(report.warnings.length).toBeGreaterThan(0);
    expect(report.warnings.some(w => w.includes('Wave 1'))).toBe(true);
    expect(report.warnings.some(w => w.includes('Wave 2'))).toBe(true);
  });

  it('should handle empty briefs', () => {
    const waves = [makeWave(1, ['t1'])];
    const topics = [makeTopic('t1', 'Topic 1')];
    const briefs: Record<string, ContentBrief> = {};

    const report = validateCrossWaveLinks(waves, briefs, topics);
    expect(report.waveCoverages).toHaveLength(1);
    expect(report.waveCoverages[0].crossWaveLinksCount).toBe(0);
    expect(report.waveCoverages[0].intraWaveLinksCount).toBe(0);
    expect(report.overallCrossWavePercent).toBe(0);
  });

  it('should handle single wave (no cross-wave possible)', () => {
    const waves = [makeWave(1, ['t1', 't2'])];
    const topics = [
      makeTopic('t1', 'Topic 1'),
      makeTopic('t2', 'Topic 2'),
    ];
    const briefs: Record<string, ContentBrief> = {
      t1: makeBrief('t1', ['Topic 2']),
      t2: makeBrief('t2', ['Topic 1']),
    };

    const report = validateCrossWaveLinks(waves, briefs, topics);

    expect(report.waveCoverages).toHaveLength(1);
    // With only one wave, all links are intra-wave
    expect(report.waveCoverages[0].intraWaveLinksCount).toBe(2);
    expect(report.waveCoverages[0].crossWaveLinksCount).toBe(0);
    // Coverage is 100% since there are no other waves to cover
    expect(report.waveCoverages[0].coveragePercent).toBe(100);
    expect(report.warnings).toHaveLength(0);
  });

  it('should detect missing waves in coverage', () => {
    const waves = [
      makeWave(1, ['t1']),
      makeWave(2, ['t2']),
      makeWave(3, ['t3']),
    ];
    const topics = [
      makeTopic('t1', 'Topic 1'),
      makeTopic('t2', 'Topic 2'),
      makeTopic('t3', 'Topic 3'),
    ];
    // Wave 1 links to wave 2 only (not wave 3)
    const briefs: Record<string, ContentBrief> = {
      t1: makeBrief('t1', ['Topic 2']),
      t2: makeBrief('t2', ['Topic 1']),
      t3: makeBrief('t3', ['Topic 1']),
    };

    const report = validateCrossWaveLinks(waves, briefs, topics);

    const wave1 = report.waveCoverages.find(wc => wc.waveNumber === 1);
    expect(wave1!.missingWaves).toContain(3);
    expect(wave1!.coveragePercent).toBe(50); // 1 of 2 other waves covered
  });

  it('should match links by topic title (case-insensitive)', () => {
    const waves = [
      makeWave(1, ['t1']),
      makeWave(2, ['t2']),
    ];
    const topics = [
      makeTopic('t1', 'React Hooks'),
      makeTopic('t2', 'Vue Composition API'),
    ];
    // Link by title (case variation)
    const briefs: Record<string, ContentBrief> = {
      t1: makeBrief('t1', ['vue composition api']), // lowercase match
      t2: makeBrief('t2', ['react hooks']),
    };

    const report = validateCrossWaveLinks(waves, briefs, topics);
    expect(report.waveCoverages[0].crossWaveLinksCount).toBe(1);
    expect(report.waveCoverages[1].crossWaveLinksCount).toBe(1);
  });

  it('should count links from suggested_internal_links', () => {
    const waves = [
      makeWave(1, ['t1']),
      makeWave(2, ['t2']),
    ];
    const topics = [
      makeTopic('t1', 'Topic 1'),
      makeTopic('t2', 'Topic 2'),
    ];
    // Use suggested_internal_links with target_topic_id
    const brief1: ContentBrief = {
      ...makeBrief('t1', []),
      suggested_internal_links: [
        { anchor: 'see topic 2', target_topic_id: 't2' },
      ],
    };
    const briefs: Record<string, ContentBrief> = {
      t1: brief1,
      t2: makeBrief('t2', ['Topic 1']),
    };

    const report = validateCrossWaveLinks(waves, briefs, topics);
    const wave1 = report.waveCoverages.find(wc => wc.waveNumber === 1);
    expect(wave1!.crossWaveLinksCount).toBe(1);
  });
});
