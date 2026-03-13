// services/ai/crossWaveLinkValidator.ts
// Validates cross-wave internal link coverage across briefs

import type { ContentBrief, EnrichedTopic } from '../../types';
import type { Wave } from '../../types/wave';

export interface WaveLinkCoverage {
  waveId: string;
  waveNumber: number;
  crossWaveLinksCount: number;
  intraWaveLinksCount: number;
  coveragePercent: number; // % of other waves referenced
  missingWaves: number[]; // waves not referenced at all
}

export interface CrossWaveLinkReport {
  waveCoverages: WaveLinkCoverage[];
  overallCrossWavePercent: number;
  warnings: string[];
}

/**
 * Analyze cross-wave internal link coverage.
 * Checks that briefs in each wave reference topics in other waves,
 * not just topics within their own wave.
 */
export function validateCrossWaveLinks(
  waves: Wave[],
  briefs: Record<string, ContentBrief>,
  topics: EnrichedTopic[]
): CrossWaveLinkReport {
  // Build wave membership: topicId -> waveNumber
  const topicWaveMap = new Map<string, number>();
  for (const wave of waves) {
    for (const topicId of wave.topicIds) {
      topicWaveMap.set(topicId, wave.number);
    }
  }

  // Build topic title -> id lookup for matching link targets
  const titleToId = new Map<string, string>();
  for (const topic of topics) {
    titleToId.set(topic.title.toLowerCase(), topic.id);
  }

  const waveCoverages: WaveLinkCoverage[] = [];
  const otherWaveNumbers = waves.map(w => w.number);

  for (const wave of waves) {
    let crossWaveLinks = 0;
    let intraWaveLinks = 0;
    const referencedWaves = new Set<number>();

    for (const topicId of wave.topicIds) {
      const brief = briefs[topicId];
      if (!brief) continue;

      // Collect all linked topic IDs from this brief
      const linkedTopicIds = extractLinkedTopicIds(brief, titleToId);

      for (const linkedId of linkedTopicIds) {
        const linkedWave = topicWaveMap.get(linkedId);
        if (linkedWave === undefined) continue;

        if (linkedWave === wave.number) {
          intraWaveLinks++;
        } else {
          crossWaveLinks++;
          referencedWaves.add(linkedWave);
        }
      }
    }

    const otherWaves = otherWaveNumbers.filter(n => n !== wave.number);
    const missingWaves = otherWaves.filter(n => !referencedWaves.has(n));
    const coveragePercent = otherWaves.length > 0
      ? Math.round((referencedWaves.size / otherWaves.length) * 100)
      : 100;

    waveCoverages.push({
      waveId: wave.id,
      waveNumber: wave.number,
      crossWaveLinksCount: crossWaveLinks,
      intraWaveLinksCount: intraWaveLinks,
      coveragePercent,
      missingWaves,
    });
  }

  // Generate warnings
  const warnings: string[] = [];
  for (const wc of waveCoverages) {
    if (wc.crossWaveLinksCount === 0 && waves.length > 1) {
      warnings.push(
        `Wave ${wc.waveNumber} briefs have 0 links to other waves. Cross-linking builds topical authority.`
      );
    }
    if (wc.missingWaves.length > 0) {
      warnings.push(
        `Wave ${wc.waveNumber} has no links to Wave${wc.missingWaves.length > 1 ? 's' : ''} ${wc.missingWaves.join(', ')}.`
      );
    }
  }

  const totalCrossWave = waveCoverages.reduce((s, wc) => s + wc.crossWaveLinksCount, 0);
  const totalLinks = waveCoverages.reduce((s, wc) => s + wc.crossWaveLinksCount + wc.intraWaveLinksCount, 0);
  const overallCrossWavePercent = totalLinks > 0
    ? Math.round((totalCrossWave / totalLinks) * 100)
    : 0;

  return { waveCoverages, overallCrossWavePercent, warnings };
}

/**
 * Extract topic IDs that a brief links to.
 * Checks contextualBridge, suggested_internal_links, and anchor_texts.
 */
function extractLinkedTopicIds(
  brief: ContentBrief,
  titleToId: Map<string, string>
): Set<string> {
  const linkedIds = new Set<string>();

  // From contextual bridge links
  if (Array.isArray(brief.contextualBridge)) {
    for (const link of brief.contextualBridge) {
      if (link.targetTopic) {
        // Try as ID first, then as title
        const byTitle = titleToId.get(link.targetTopic.toLowerCase());
        linkedIds.add(byTitle || link.targetTopic);
      }
    }
  }

  // From suggested internal links
  if (brief.suggested_internal_links) {
    for (const link of brief.suggested_internal_links) {
      if (link.target_topic_id) {
        linkedIds.add(link.target_topic_id);
      }
    }
  }

  // From structured outline anchor texts
  if (brief.structured_outline) {
    for (const section of brief.structured_outline) {
      if (section.anchor_texts) {
        for (const anchor of section.anchor_texts) {
          if (anchor.target_topic_id) {
            linkedIds.add(anchor.target_topic_id);
          }
        }
      }
    }
  }

  return linkedIds;
}
