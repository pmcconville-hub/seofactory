/**
 * Wave Assignment Service
 *
 * Auto-assigns topics to waves based on a chosen strategy.
 * Supports three strategies:
 * - monetization_first: Prioritizes revenue-generating pages (CS hubs, then knowledge, then regional, then AS)
 * - authority_first: Prioritizes topical authority building (AS hubs first, then AS content, then CS)
 * - custom: Places all topics in Wave 1 for manual reassignment
 *
 * Created: 2026-02-19 - Pipeline wave orchestration
 *
 * @module services/waveAssignmentService
 */

import type {
  Wave,
  WaveConfiguration,
  WaveAssignmentResult,
  WaveProgress,
} from '../types/wave';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Minimal topic shape required for wave assignment.
 * Accepts EnrichedTopic or any object with these fields.
 */
interface WaveAssignableTopic {
  id: string;
  type: string; // 'core' | 'outer' | 'child'
  topic_class?: 'monetization' | 'informational';
  cluster_role?: 'pillar' | 'cluster_content';
  parentId?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// DEFAULT WAVE DESCRIPTIONS
// ============================================================================

/**
 * Returns descriptive metadata for each wave number.
 * Used as defaults when creating waves programmatically.
 */
export function getDefaultWaveDescriptions(): Record<
  1 | 2 | 3 | 4,
  { name: string; description: string }
> {
  return {
    1: {
      name: 'Foundation Hubs',
      description:
        'Primary pillar pages and monetization hubs that establish the core topical structure.',
    },
    2: {
      name: 'Knowledge Clusters',
      description:
        'Informational content that builds semantic depth and supports pillar pages with internal links.',
    },
    3: {
      name: 'Regional & Variant Pages',
      description:
        'Location-specific and variant pages that extend reach into regional and long-tail queries.',
    },
    4: {
      name: 'Authority Expansion',
      description:
        'Outer/author-section topics that broaden topical authority and attract editorial backlinks.',
    },
  };
}

// ============================================================================
// WAVE CREATION HELPERS
// ============================================================================

/**
 * Creates a Wave object with sensible defaults.
 */
function createWave(
  number: 1 | 2 | 3 | 4,
  name: string,
  description: string,
  topicIds: string[],
  weekStart: number,
  weekEnd: number
): Wave {
  return {
    id: `wave-${number}`,
    number,
    name,
    description,
    topicIds,
    weekStart,
    weekEnd,
    status: 'planning',
  };
}

/**
 * Calculates default week ranges for 4 waves.
 * Each wave spans roughly 3 weeks with 1-week overlap for review.
 */
function getDefaultWeekRanges(): Array<{ start: number; end: number }> {
  return [
    { start: 1, end: 3 },
    { start: 4, end: 7 },
    { start: 8, end: 11 },
    { start: 12, end: 16 },
  ];
}

// ============================================================================
// STRATEGY IMPLEMENTATIONS
// ============================================================================

/**
 * Monetization-first strategy:
 * Wave 1 - Core monetization pillars (CS hubs)
 * Wave 2 - Core informational topics (CS knowledge clusters)
 * Wave 3 - Core topics with regional metadata
 * Wave 4 - Outer topics (AS authority pages)
 */
function assignMonetizationFirst(topics: WaveAssignableTopic[]): Wave[] {
  const defaults = getDefaultWaveDescriptions();
  const weeks = getDefaultWeekRanges();

  // Wave 1: Core topics with monetization class AND pillar role
  const wave1Ids: string[] = [];
  // Wave 2: Core topics with informational class
  const wave2Ids: string[] = [];
  // Wave 3: Core topics with hasRegion metadata
  const wave3Ids: string[] = [];
  // Wave 4: Outer topics (AS authority pages)
  const wave4Ids: string[] = [];

  // Track assigned topic IDs to avoid duplicates
  const assigned = new Set<string>();

  // Pass 1: Wave 1 - monetization pillars
  for (const topic of topics) {
    if (
      topic.type === 'core' &&
      topic.topic_class === 'monetization' &&
      topic.cluster_role === 'pillar'
    ) {
      wave1Ids.push(topic.id);
      assigned.add(topic.id);
    }
  }

  // Pass 2: Wave 3 - regional pages (before general informational to pull them out)
  for (const topic of topics) {
    if (assigned.has(topic.id)) continue;
    if (
      topic.type === 'core' &&
      topic.metadata?.hasRegion
    ) {
      wave3Ids.push(topic.id);
      assigned.add(topic.id);
    }
  }

  // Pass 3: Wave 2 - core informational topics
  for (const topic of topics) {
    if (assigned.has(topic.id)) continue;
    if (
      topic.type === 'core' &&
      topic.topic_class === 'informational'
    ) {
      wave2Ids.push(topic.id);
      assigned.add(topic.id);
    }
  }

  // Pass 4: Wave 4 - outer topics
  for (const topic of topics) {
    if (assigned.has(topic.id)) continue;
    if (topic.type === 'outer') {
      wave4Ids.push(topic.id);
      assigned.add(topic.id);
    }
  }

  // Remaining core topics without explicit class go to Wave 1 (monetization default)
  for (const topic of topics) {
    if (assigned.has(topic.id)) continue;
    if (topic.type === 'core') {
      wave1Ids.push(topic.id);
      assigned.add(topic.id);
    }
  }

  // Child topics follow their parent's wave or go to Wave 2
  for (const topic of topics) {
    if (assigned.has(topic.id)) continue;
    if (topic.type === 'child') {
      wave2Ids.push(topic.id);
      assigned.add(topic.id);
    }
  }

  return [
    createWave(1, 'Monetization Hubs', defaults[1].description, wave1Ids, weeks[0].start, weeks[0].end),
    createWave(2, 'Knowledge Clusters', defaults[2].description, wave2Ids, weeks[1].start, weeks[1].end),
    createWave(3, 'Regional Pages', defaults[3].description, wave3Ids, weeks[2].start, weeks[2].end),
    createWave(4, 'Authority Expansion', defaults[4].description, wave4Ids, weeks[3].start, weeks[3].end),
  ];
}

/**
 * Authority-first strategy:
 * Wave 1 - Outer topics with pillar role (AS knowledge hubs)
 * Wave 2 - Outer non-pillar topics
 * Wave 3 - Core informational topics
 * Wave 4 - Core monetization topics
 */
function assignAuthorityFirst(topics: WaveAssignableTopic[]): Wave[] {
  const weeks = getDefaultWeekRanges();

  const wave1Ids: string[] = [];
  const wave2Ids: string[] = [];
  const wave3Ids: string[] = [];
  const wave4Ids: string[] = [];

  const assigned = new Set<string>();

  // Pass 1: Wave 1 - outer pillars (AS knowledge hubs)
  for (const topic of topics) {
    if (
      topic.type === 'outer' &&
      topic.cluster_role === 'pillar'
    ) {
      wave1Ids.push(topic.id);
      assigned.add(topic.id);
    }
  }

  // Pass 2: Wave 2 - remaining outer topics
  for (const topic of topics) {
    if (assigned.has(topic.id)) continue;
    if (topic.type === 'outer') {
      wave2Ids.push(topic.id);
      assigned.add(topic.id);
    }
  }

  // Pass 3: Wave 3 - core informational topics
  for (const topic of topics) {
    if (assigned.has(topic.id)) continue;
    if (
      topic.type === 'core' &&
      topic.topic_class === 'informational'
    ) {
      wave3Ids.push(topic.id);
      assigned.add(topic.id);
    }
  }

  // Pass 4: Wave 4 - core monetization topics
  for (const topic of topics) {
    if (assigned.has(topic.id)) continue;
    if (
      topic.type === 'core' &&
      topic.topic_class === 'monetization'
    ) {
      wave4Ids.push(topic.id);
      assigned.add(topic.id);
    }
  }

  // Remaining core topics without explicit class go to Wave 4
  for (const topic of topics) {
    if (assigned.has(topic.id)) continue;
    if (topic.type === 'core') {
      wave4Ids.push(topic.id);
      assigned.add(topic.id);
    }
  }

  // Child topics go to Wave 3 (informational default for authority-first)
  for (const topic of topics) {
    if (assigned.has(topic.id)) continue;
    if (topic.type === 'child') {
      wave3Ids.push(topic.id);
      assigned.add(topic.id);
    }
  }

  return [
    createWave(1, 'Authority Knowledge Hubs', 'Outer pillar pages that establish broad topical authority and attract editorial links.', wave1Ids, weeks[0].start, weeks[0].end),
    createWave(2, 'Authority Depth', 'Supporting outer topics that deepen authority coverage and semantic breadth.', wave2Ids, weeks[1].start, weeks[1].end),
    createWave(3, 'Informational Core', 'Core informational content that bridges authority pages to commercial intent.', wave3Ids, weeks[2].start, weeks[2].end),
    createWave(4, 'Monetization Core', 'Core monetization pages that convert authority into business outcomes.', wave4Ids, weeks[3].start, weeks[3].end),
  ];
}

/**
 * Custom strategy: all topics in Wave 1 for manual reassignment.
 */
function assignCustom(topics: WaveAssignableTopic[]): Wave[] {
  const weeks = getDefaultWeekRanges();
  const allIds = topics.map((t) => t.id);

  return [
    createWave(1, 'All Topics', 'All topics placed in a single wave for manual reassignment.', allIds, weeks[0].start, weeks[0].end),
    createWave(2, 'Wave 2', 'Empty wave for manual topic assignment.', [], weeks[1].start, weeks[1].end),
    createWave(3, 'Wave 3', 'Empty wave for manual topic assignment.', [], weeks[2].start, weeks[2].end),
    createWave(4, 'Wave 4', 'Empty wave for manual topic assignment.', [], weeks[3].start, weeks[3].end),
  ];
}

// ============================================================================
// MAIN ASSIGNMENT FUNCTION
// ============================================================================

/**
 * Assigns topics to waves based on the chosen strategy.
 *
 * @param topics - Array of topics to assign (must have at minimum id and type)
 * @param strategy - The wave assignment strategy to use
 * @returns WaveAssignmentResult with populated waves and any unassigned topic IDs
 */
export function assignTopicsToWaves(
  topics: Array<{
    id: string;
    type: string;
    topic_class?: string;
    cluster_role?: string;
    parentId?: string;
    metadata?: Record<string, unknown>;
  }>,
  strategy: WaveConfiguration['strategy'] = 'monetization_first'
): WaveAssignmentResult {
  // Cast to our internal type (the fields are compatible)
  const assignableTopics = topics as WaveAssignableTopic[];

  let waves: Wave[];

  switch (strategy) {
    case 'monetization_first':
      waves = assignMonetizationFirst(assignableTopics);
      break;
    case 'authority_first':
      waves = assignAuthorityFirst(assignableTopics);
      break;
    case 'custom':
      waves = assignCustom(assignableTopics);
      break;
    default:
      waves = assignMonetizationFirst(assignableTopics);
      break;
  }

  // Identify any unassigned topics
  const allAssigned = new Set<string>();
  for (const wave of waves) {
    for (const id of wave.topicIds) {
      allAssigned.add(id);
    }
  }

  const unassigned = topics
    .map((t) => t.id)
    .filter((id) => !allAssigned.has(id));

  return {
    waves,
    unassigned,
    strategy,
  };
}

// ============================================================================
// REBALANCE WAVES
// ============================================================================

/**
 * Rebalances topics across 4 waves while respecting:
 * - Pinned topics (stay in their current wave)
 * - Priority ordering (critical/high topics first)
 * - Roughly even distribution across waves
 *
 * @param entries - Array of entries with topicId, wave, priority, pinned
 * @returns Map of topicId → new wave number
 */
export function rebalanceWaves(
  entries: Array<{
    topicId: string;
    wave: 1 | 2 | 3 | 4;
    priority: 'critical' | 'high' | 'medium' | 'low';
    pinned?: boolean;
  }>
): Map<string, 1 | 2 | 3 | 4> {
  const result = new Map<string, 1 | 2 | 3 | 4>();

  // Track capacity per wave (start with pinned items)
  const waveCounts: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const pinned: typeof entries = [];
  const unpinned: typeof entries = [];

  for (const entry of entries) {
    if (entry.pinned) {
      pinned.push(entry);
      waveCounts[entry.wave]++;
      result.set(entry.topicId, entry.wave);
    } else {
      unpinned.push(entry);
    }
  }

  // Sort unpinned by priority (critical first, then high, medium, low)
  const priorityOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  unpinned.sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3));

  // Target: roughly even distribution
  const totalUnpinned = unpinned.length;
  const targetPerWave = Math.ceil(totalUnpinned / 4);

  // Assign unpinned topics to the wave with fewest items
  for (const entry of unpinned) {
    // Find the wave with the least items, respecting max target
    let bestWave: 1 | 2 | 3 | 4 = 1;
    let minCount = Infinity;
    for (const w of [1, 2, 3, 4] as const) {
      if (waveCounts[w] < minCount) {
        minCount = waveCounts[w];
        bestWave = w;
      }
    }
    result.set(entry.topicId, bestWave);
    waveCounts[bestWave]++;
  }

  return result;
}

// ============================================================================
// WAVE PROGRESS
// ============================================================================

/**
 * Computes progress metrics for each wave based on completed topic IDs.
 *
 * @param waves - The wave configuration
 * @param completedTopicIds - Set of topic IDs that have completed all pipeline steps
 * @param qualityScores - Optional map of topic ID to quality/audit score (0-100)
 * @returns Array of WaveProgress objects
 */
export function getWaveProgress(
  waves: Wave[],
  completedTopicIds: Set<string>,
  qualityScores?: Map<string, number>
): WaveProgress[] {
  return waves.map((wave) => {
    const totalPages = wave.topicIds.length;
    const completedPages = wave.topicIds.filter((id) =>
      completedTopicIds.has(id)
    ).length;

    // Calculate average quality score for completed pages in this wave
    let averageQualityScore = 0;
    if (qualityScores && completedPages > 0) {
      let totalScore = 0;
      let scoredCount = 0;
      for (const id of wave.topicIds) {
        const score = qualityScores.get(id);
        if (score !== undefined) {
          totalScore += score;
          scoredCount++;
        }
      }
      averageQualityScore = scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0;
    }

    // Derive wave status from completion
    let status = wave.status;
    if (totalPages > 0 && completedPages === totalPages) {
      status = 'ready';
    }

    return {
      waveId: wave.id,
      waveNumber: wave.number,
      totalPages,
      completedPages,
      averageQualityScore,
      status,
    };
  });
}
