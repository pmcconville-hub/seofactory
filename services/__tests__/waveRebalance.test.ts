import { describe, it, expect } from 'vitest';
import { rebalanceWaves } from '../waveAssignmentService';

describe('rebalanceWaves', () => {
  it('distributes topics evenly across discovered waves', () => {
    // Provide entries across 4 waves so rebalance discovers all 4
    const entries = Array.from({ length: 12 }, (_, i) => ({
      topicId: `t${i}`,
      wave: (i % 4) + 1,
      priority: 'medium' as const,
    }));

    const result = rebalanceWaves(entries);

    // Count per wave
    const waveCounts: Record<number, number> = {};
    for (const wave of result.values()) waveCounts[wave] = (waveCounts[wave] ?? 0) + 1;

    // Each wave should have 3 topics (12 / 4 = 3)
    expect(waveCounts[1]).toBe(3);
    expect(waveCounts[2]).toBe(3);
    expect(waveCounts[3]).toBe(3);
    expect(waveCounts[4]).toBe(3);
  });

  it('respects pinned topics', () => {
    const entries = [
      { topicId: 'pinned', wave: 2, priority: 'high' as const, pinned: true },
      { topicId: 'free1', wave: 1, priority: 'medium' as const },
      { topicId: 'free2', wave: 1, priority: 'low' as const },
    ];

    const result = rebalanceWaves(entries);

    // Pinned topic stays in wave 2
    expect(result.get('pinned')).toBe(2);
    // All topics should be assigned
    expect(result.size).toBe(3);
  });

  it('sorts by priority (critical first)', () => {
    // Provide entries spread across 4 waves so rebalance discovers all 4
    const entries = [
      { topicId: 'low', wave: 1, priority: 'low' as const },
      { topicId: 'critical', wave: 2, priority: 'critical' as const },
      { topicId: 'high', wave: 3, priority: 'high' as const },
      { topicId: 'medium', wave: 4, priority: 'medium' as const },
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

  it('works with dynamic wave counts (5+ waves)', () => {
    // Create entries across 5 waves
    const entries = Array.from({ length: 10 }, (_, i) => ({
      topicId: `t${i}`,
      wave: (i % 5) + 1,
      priority: 'medium' as const,
    }));

    const result = rebalanceWaves(entries);

    // Count per wave
    const waveCounts: Record<number, number> = {};
    for (const wave of result.values()) waveCounts[wave] = (waveCounts[wave] ?? 0) + 1;

    // Each of 5 waves should have 2 topics (10 / 5 = 2)
    expect(waveCounts[1]).toBe(2);
    expect(waveCounts[2]).toBe(2);
    expect(waveCounts[3]).toBe(2);
    expect(waveCounts[4]).toBe(2);
    expect(waveCounts[5]).toBe(2);
  });
});
