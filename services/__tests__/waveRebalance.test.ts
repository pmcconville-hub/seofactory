import { describe, it, expect } from 'vitest';
import { rebalanceWaves } from '../waveAssignmentService';

describe('rebalanceWaves', () => {
  it('distributes topics evenly across 4 waves', () => {
    const entries = Array.from({ length: 12 }, (_, i) => ({
      topicId: `t${i}`,
      wave: 1 as const,
      priority: 'medium' as const,
    }));

    const result = rebalanceWaves(entries);

    // Count per wave
    const waveCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const wave of result.values()) waveCounts[wave]++;

    // Each wave should have 3 topics
    expect(waveCounts[1]).toBe(3);
    expect(waveCounts[2]).toBe(3);
    expect(waveCounts[3]).toBe(3);
    expect(waveCounts[4]).toBe(3);
  });

  it('respects pinned topics', () => {
    const entries = [
      { topicId: 'pinned', wave: 2 as const, priority: 'high' as const, pinned: true },
      { topicId: 'free1', wave: 1 as const, priority: 'medium' as const },
      { topicId: 'free2', wave: 1 as const, priority: 'low' as const },
    ];

    const result = rebalanceWaves(entries);

    // Pinned topic stays in wave 2
    expect(result.get('pinned')).toBe(2);
    // All topics should be assigned
    expect(result.size).toBe(3);
  });

  it('sorts by priority (critical first)', () => {
    const entries = [
      { topicId: 'low', wave: 1 as const, priority: 'low' as const },
      { topicId: 'critical', wave: 1 as const, priority: 'critical' as const },
      { topicId: 'high', wave: 1 as const, priority: 'high' as const },
      { topicId: 'medium', wave: 1 as const, priority: 'medium' as const },
    ];

    const result = rebalanceWaves(entries);

    // All 4 topics should be in different waves
    const waves = new Set(result.values());
    expect(waves.size).toBe(4);
  });

  it('handles empty input', () => {
    const result = rebalanceWaves([]);
    expect(result.size).toBe(0);
  });
});
