// services/ai/contentGeneration/tracking/__tests__/passTracker.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PassTracker, PassExecutionResult, PassTrackerOptions } from '../passTracker';
import { RuleSnapshotService } from '../ruleSnapshotService';
import { ConflictDetector, PassDelta } from '../conflictDetector';
import type { ValidationViolation } from '../../../../../types/audit';

// Mock the validateContent function that should be provided for violation detection
type ViolationDetector = (content: string) => Promise<ValidationViolation[]>;

describe('PassTracker', () => {
  // Helper to create a simple violation detector
  function createViolationDetector(
    violationsMap: Record<string, ValidationViolation[]>
  ): ViolationDetector {
    return async (content: string) => {
      // Use content hash as key, or return empty array
      const hash = RuleSnapshotService.calculateContentHash(content);
      return violationsMap[hash] || [];
    };
  }

  // Helper to create a mock executePass function
  function createPassExecutor(resultContent: string): () => Promise<string> {
    return async () => resultContent;
  }

  beforeEach(() => {
    // Clear snapshot storage between tests
    RuleSnapshotService.clearStorage();
  });

  describe('constructor', () => {
    it('creates PassTracker with required options', () => {
      const options: PassTrackerOptions = {
        jobId: 'test-job-123',
        autoRevert: true,
        getViolations: async () => [],
      };

      const tracker = new PassTracker(options);

      expect(tracker).toBeInstanceOf(PassTracker);
    });

    it('accepts optional delta callback', () => {
      const onDeltaCalculated = vi.fn();
      const options: PassTrackerOptions = {
        jobId: 'test-job-456',
        autoRevert: false,
        getViolations: async () => [],
        onDeltaCalculated,
      };

      const tracker = new PassTracker(options);

      expect(tracker).toBeInstanceOf(PassTracker);
    });
  });

  describe('trackPass', () => {
    it('executes pass and returns result with correct structure', async () => {
      const options: PassTrackerOptions = {
        jobId: 'test-job',
        autoRevert: false,
        getViolations: async () => [],
      };
      const tracker = new PassTracker(options);

      const contentBefore = 'Original content';
      const contentAfter = 'Modified content after pass';
      const executePass = createPassExecutor(contentAfter);

      const result = await tracker.trackPass(1, contentBefore, executePass);

      expect(result).toHaveProperty('passNumber', 1);
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('contentBeforePass', contentBefore);
      expect(result).toHaveProperty('delta');
      expect(result).toHaveProperty('wasReverted');
      expect(result).toHaveProperty('revertReason');
    });

    it('returns new content when no revert needed', async () => {
      const options: PassTrackerOptions = {
        jobId: 'test-job',
        autoRevert: true,
        getViolations: async () => [],
      };
      const tracker = new PassTracker(options);

      const contentBefore = 'Original content';
      const contentAfter = 'Improved content';

      const result = await tracker.trackPass(
        1,
        contentBefore,
        createPassExecutor(contentAfter)
      );

      expect(result.content).toBe(contentAfter);
      expect(result.wasReverted).toBe(false);
      expect(result.revertReason).toBeNull();
    });

    it('creates before and after snapshots', async () => {
      const jobId = 'test-snapshot-job';
      const options: PassTrackerOptions = {
        jobId,
        autoRevert: false,
        getViolations: async () => [],
      };
      const tracker = new PassTracker(options);

      await tracker.trackPass(
        1,
        'Before content',
        createPassExecutor('After content')
      );

      // Verify snapshots were created
      const snapshots = await RuleSnapshotService.getPassSnapshots(jobId, 1);
      expect(snapshots.before).not.toBeNull();
      expect(snapshots.after).not.toBeNull();
    });

    it('captures violations in snapshots', async () => {
      const jobId = 'test-violations-job';
      const beforeContent = 'Content with issues';
      const afterContent = 'Fixed content';

      const beforeHash = RuleSnapshotService.calculateContentHash(beforeContent);
      const afterHash = RuleSnapshotService.calculateContentHash(afterContent);

      const violationsMap: Record<string, ValidationViolation[]> = {
        [beforeHash]: [
          { rule: 'A1', text: 'Issue', position: 0, suggestion: 'Fix', severity: 'error' },
        ],
        [afterHash]: [],
      };

      const options: PassTrackerOptions = {
        jobId,
        autoRevert: false,
        getViolations: createViolationDetector(violationsMap),
      };
      const tracker = new PassTracker(options);

      await tracker.trackPass(1, beforeContent, createPassExecutor(afterContent));

      const snapshots = await RuleSnapshotService.getPassSnapshots(jobId, 1);
      expect(snapshots.before?.rules['A1']).toBeDefined();
      expect(Object.keys(snapshots.after?.rules || {})).toHaveLength(0);
    });

    it('calculates delta from snapshots', async () => {
      const beforeContent = 'Content with rule A1 violation';
      const afterContent = 'Fixed content without violations';

      const beforeHash = RuleSnapshotService.calculateContentHash(beforeContent);
      const afterHash = RuleSnapshotService.calculateContentHash(afterContent);

      const violationsMap: Record<string, ValidationViolation[]> = {
        [beforeHash]: [
          { rule: 'A1', text: 'Issue', position: 0, suggestion: 'Fix', severity: 'warning' },
        ],
        [afterHash]: [],
      };

      const options: PassTrackerOptions = {
        jobId: 'test-delta-job',
        autoRevert: false,
        getViolations: createViolationDetector(violationsMap),
      };
      const tracker = new PassTracker(options);

      const result = await tracker.trackPass(
        1,
        beforeContent,
        createPassExecutor(afterContent)
      );

      expect(result.delta.rulesFixed).toContain('A1');
      expect(result.delta.netChange).toBe(1);
    });

    it('auto-reverts when autoRevert=true and regression detected', async () => {
      const beforeContent = 'Content without issues';
      const afterContent = 'Content with new issues';

      const beforeHash = RuleSnapshotService.calculateContentHash(beforeContent);
      const afterHash = RuleSnapshotService.calculateContentHash(afterContent);

      const violationsMap: Record<string, ValidationViolation[]> = {
        [beforeHash]: [],
        [afterHash]: [
          { rule: 'A1', text: 'New issue', position: 0, suggestion: 'Fix', severity: 'error' },
          { rule: 'A2', text: 'Another new issue', position: 10, suggestion: 'Fix', severity: 'error' },
        ],
      };

      const options: PassTrackerOptions = {
        jobId: 'test-revert-job',
        autoRevert: true,
        getViolations: createViolationDetector(violationsMap),
      };
      const tracker = new PassTracker(options);

      const result = await tracker.trackPass(
        1,
        beforeContent,
        createPassExecutor(afterContent)
      );

      expect(result.wasReverted).toBe(true);
      expect(result.content).toBe(beforeContent);
      expect(result.revertReason).not.toBeNull();
    });

    it('skips revert when autoRevert=false even with regression', async () => {
      const beforeContent = 'Content without issues';
      const afterContent = 'Content with new issues';

      const beforeHash = RuleSnapshotService.calculateContentHash(beforeContent);
      const afterHash = RuleSnapshotService.calculateContentHash(afterContent);

      const violationsMap: Record<string, ValidationViolation[]> = {
        [beforeHash]: [],
        [afterHash]: [
          { rule: 'A1', text: 'New issue', position: 0, suggestion: 'Fix', severity: 'error' },
          { rule: 'A2', text: 'Another issue', position: 10, suggestion: 'Fix', severity: 'error' },
        ],
      };

      const options: PassTrackerOptions = {
        jobId: 'test-no-revert-job',
        autoRevert: false,
        getViolations: createViolationDetector(violationsMap),
      };
      const tracker = new PassTracker(options);

      const result = await tracker.trackPass(
        1,
        beforeContent,
        createPassExecutor(afterContent)
      );

      expect(result.wasReverted).toBe(false);
      expect(result.content).toBe(afterContent);
      expect(result.revertReason).toBeNull();
    });

    it('calls onDeltaCalculated callback when provided', async () => {
      const onDeltaCalculated = vi.fn();
      const options: PassTrackerOptions = {
        jobId: 'test-callback-job',
        autoRevert: false,
        getViolations: async () => [],
        onDeltaCalculated,
      };
      const tracker = new PassTracker(options);

      await tracker.trackPass(
        1,
        'Before content',
        createPassExecutor('After content')
      );

      expect(onDeltaCalculated).toHaveBeenCalledTimes(1);
      expect(onDeltaCalculated).toHaveBeenCalledWith(expect.objectContaining({
        passNumber: 1,
        rulesFixed: expect.any(Array),
        rulesRegressed: expect.any(Array),
        rulesUnchanged: expect.any(Array),
        netChange: expect.any(Number),
        recommendation: expect.any(String),
      }));
    });

    it('handles pass execution errors gracefully', async () => {
      const options: PassTrackerOptions = {
        jobId: 'test-error-job',
        autoRevert: false,
        getViolations: async () => [],
      };
      const tracker = new PassTracker(options);

      const failingPass = async () => {
        throw new Error('Pass execution failed');
      };

      await expect(
        tracker.trackPass(1, 'Content', failingPass)
      ).rejects.toThrow('Pass execution failed');
    });
  });

  describe('getHistory', () => {
    it('returns empty array initially', () => {
      const options: PassTrackerOptions = {
        jobId: 'test-job',
        autoRevert: false,
        getViolations: async () => [],
      };
      const tracker = new PassTracker(options);

      expect(tracker.getHistory()).toEqual([]);
    });

    it('accumulates deltas from tracked passes', async () => {
      const options: PassTrackerOptions = {
        jobId: 'test-history-job',
        autoRevert: false,
        getViolations: async () => [],
      };
      const tracker = new PassTracker(options);

      await tracker.trackPass(1, 'Content v1', createPassExecutor('Content v2'));
      await tracker.trackPass(2, 'Content v2', createPassExecutor('Content v3'));
      await tracker.trackPass(3, 'Content v3', createPassExecutor('Content v4'));

      const history = tracker.getHistory();

      expect(history).toHaveLength(3);
      expect(history[0].passNumber).toBe(1);
      expect(history[1].passNumber).toBe(2);
      expect(history[2].passNumber).toBe(3);
    });

    it('preserves delta details in history', async () => {
      const beforeContent = 'Content with A1 violation';
      const afterContent = 'Fixed content';

      const beforeHash = RuleSnapshotService.calculateContentHash(beforeContent);
      const afterHash = RuleSnapshotService.calculateContentHash(afterContent);

      const violationsMap: Record<string, ValidationViolation[]> = {
        [beforeHash]: [
          { rule: 'A1', text: 'Issue', position: 0, suggestion: 'Fix', severity: 'warning' },
        ],
        [afterHash]: [],
      };

      const options: PassTrackerOptions = {
        jobId: 'test-history-details-job',
        autoRevert: false,
        getViolations: createViolationDetector(violationsMap),
      };
      const tracker = new PassTracker(options);

      await tracker.trackPass(1, beforeContent, createPassExecutor(afterContent));

      const history = tracker.getHistory();

      expect(history[0].rulesFixed).toContain('A1');
    });
  });

  describe('integration with RuleSnapshotService and ConflictDetector', () => {
    it('correctly identifies critical regressions for revert', async () => {
      const beforeContent = 'Clean content';
      const afterContent = 'Content with critical error';

      const beforeHash = RuleSnapshotService.calculateContentHash(beforeContent);
      const afterHash = RuleSnapshotService.calculateContentHash(afterContent);

      const violationsMap: Record<string, ValidationViolation[]> = {
        [beforeHash]: [],
        [afterHash]: [
          { rule: 'CRITICAL_RULE', text: 'Critical issue', position: 0, suggestion: 'Fix', severity: 'error' },
        ],
      };

      const options: PassTrackerOptions = {
        jobId: 'test-critical-job',
        autoRevert: true,
        getViolations: createViolationDetector(violationsMap),
      };
      const tracker = new PassTracker(options);

      const result = await tracker.trackPass(
        1,
        beforeContent,
        createPassExecutor(afterContent)
      );

      // Should revert because a critical (error severity) rule regressed
      expect(result.wasReverted).toBe(true);
      expect(result.delta.rulesRegressed).toContain('CRITICAL_RULE');
    });

    it('accepts changes when fixes outweigh regressions without critical rules', async () => {
      const beforeContent = 'Content with multiple issues';
      const afterContent = 'Mostly fixed content';

      const beforeHash = RuleSnapshotService.calculateContentHash(beforeContent);
      const afterHash = RuleSnapshotService.calculateContentHash(afterContent);

      const violationsMap: Record<string, ValidationViolation[]> = {
        [beforeHash]: [
          { rule: 'A1', text: 'Issue 1', position: 0, suggestion: 'Fix', severity: 'warning' },
          { rule: 'A2', text: 'Issue 2', position: 10, suggestion: 'Fix', severity: 'warning' },
          { rule: 'A3', text: 'Issue 3', position: 20, suggestion: 'Fix', severity: 'warning' },
        ],
        [afterHash]: [
          { rule: 'B1', text: 'New minor issue', position: 0, suggestion: 'Fix', severity: 'warning' },
        ],
      };

      const options: PassTrackerOptions = {
        jobId: 'test-accept-job',
        autoRevert: true,
        getViolations: createViolationDetector(violationsMap),
      };
      const tracker = new PassTracker(options);

      const result = await tracker.trackPass(
        1,
        beforeContent,
        createPassExecutor(afterContent)
      );

      // Net change: 3 fixed - 1 regressed = +2, should accept
      expect(result.wasReverted).toBe(false);
      expect(result.delta.netChange).toBe(2);
    });

    it('handles unchanged content correctly', async () => {
      const sameContent = 'Content that does not change';

      const options: PassTrackerOptions = {
        jobId: 'test-unchanged-job',
        autoRevert: false,
        getViolations: async () => [],
      };
      const tracker = new PassTracker(options);

      const result = await tracker.trackPass(
        1,
        sameContent,
        createPassExecutor(sameContent)
      );

      expect(result.content).toBe(sameContent);
      expect(result.wasReverted).toBe(false);
      expect(result.delta.netChange).toBe(0);
    });
  });

  describe('multiple passes tracking', () => {
    it('tracks multiple sequential passes correctly', async () => {
      const content1 = 'Initial content with A1 and A2 issues';
      const content2 = 'After pass 1 - A1 fixed';
      const content3 = 'After pass 2 - all fixed';

      const hash1 = RuleSnapshotService.calculateContentHash(content1);
      const hash2 = RuleSnapshotService.calculateContentHash(content2);
      const hash3 = RuleSnapshotService.calculateContentHash(content3);

      const violationsMap: Record<string, ValidationViolation[]> = {
        [hash1]: [
          { rule: 'A1', text: 'Issue 1', position: 0, suggestion: 'Fix', severity: 'warning' },
          { rule: 'A2', text: 'Issue 2', position: 10, suggestion: 'Fix', severity: 'warning' },
        ],
        [hash2]: [
          { rule: 'A2', text: 'Issue 2', position: 10, suggestion: 'Fix', severity: 'warning' },
        ],
        [hash3]: [],
      };

      const options: PassTrackerOptions = {
        jobId: 'test-sequential-job',
        autoRevert: false,
        getViolations: createViolationDetector(violationsMap),
      };
      const tracker = new PassTracker(options);

      const result1 = await tracker.trackPass(1, content1, createPassExecutor(content2));
      const result2 = await tracker.trackPass(2, content2, createPassExecutor(content3));

      expect(result1.delta.rulesFixed).toContain('A1');
      expect(result2.delta.rulesFixed).toContain('A2');

      const history = tracker.getHistory();
      expect(history).toHaveLength(2);
    });
  });
});
