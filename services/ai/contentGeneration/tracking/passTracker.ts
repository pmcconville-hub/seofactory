// services/ai/contentGeneration/tracking/passTracker.ts
/**
 * PassTracker
 *
 * High-level orchestrator that integrates RuleSnapshotService and ConflictDetector
 * into the pass execution flow. Wraps pass execution with before/after snapshot
 * capture, detects conflicts, and decides on auto-revert.
 *
 * Key responsibilities:
 * - Capture rule violation state before and after each pass
 * - Calculate deltas (what rules were fixed vs regressed)
 * - Auto-revert content when quality regressions are detected
 * - Maintain history of pass deltas for analytics
 * - Provide hooks for UI updates during pass execution
 */

import { RuleSnapshotService } from './ruleSnapshotService';
import { ConflictDetector, PassDelta } from './conflictDetector';
import type { ValidationViolation } from '../../../../types/audit';

/**
 * Result of tracking a pass execution
 */
export interface PassExecutionResult {
  /** The pass number that was tracked */
  passNumber: number;
  /** The final content (either new content or reverted original) */
  content: string;
  /** The content before the pass was executed */
  contentBeforePass: string;
  /** The calculated delta showing rules fixed/regressed */
  delta: PassDelta;
  /** Whether the content was reverted to the original */
  wasReverted: boolean;
  /** Reason for revert if wasReverted is true, null otherwise */
  revertReason: string | null;
}

/**
 * Function type for detecting violations in content
 */
export type ViolationDetector = (content: string) => Promise<ValidationViolation[]>;

/**
 * Configuration options for PassTracker
 */
export interface PassTrackerOptions {
  /** Unique identifier for the content generation job */
  jobId: string;
  /** Whether to automatically revert content on quality regression */
  autoRevert: boolean;
  /** Function to detect violations in content */
  getViolations: ViolationDetector;
  /** Optional callback when delta is calculated (for UI updates) */
  onDeltaCalculated?: (delta: PassDelta) => void;
}

/**
 * PassTracker - Orchestrates pass execution with quality tracking
 *
 * Flow:
 * 1. Create 'before' snapshot with current violations
 * 2. Execute the pass
 * 3. Create 'after' snapshot with new violations
 * 4. Compare snapshots to get delta
 * 5. If autoRevert and shouldRevert: return original content
 * 6. Otherwise: return new content
 */
export class PassTracker {
  private readonly jobId: string;
  private readonly autoRevert: boolean;
  private readonly getViolations: ViolationDetector;
  private readonly onDeltaCalculated?: (delta: PassDelta) => void;
  private readonly history: PassDelta[] = [];

  constructor(options: PassTrackerOptions) {
    this.jobId = options.jobId;
    this.autoRevert = options.autoRevert;
    this.getViolations = options.getViolations;
    this.onDeltaCalculated = options.onDeltaCalculated;
  }

  /**
   * Track a pass execution with before/after snapshots
   *
   * @param passNumber - The pass number being executed (1-9)
   * @param contentBefore - The content before pass execution
   * @param executePass - Async function that executes the pass and returns new content
   * @returns PassExecutionResult with final content and tracking data
   */
  async trackPass(
    passNumber: number,
    contentBefore: string,
    executePass: () => Promise<string>
  ): Promise<PassExecutionResult> {
    // Step 1: Get violations for content before pass
    const violationsBefore = await this.getViolations(contentBefore);

    // Step 2: Create 'before' snapshot
    await RuleSnapshotService.createSnapshot(
      this.jobId,
      passNumber,
      'before',
      contentBefore,
      violationsBefore
    );

    // Step 3: Execute the pass (may throw - let it propagate)
    const contentAfter = await executePass();

    // Step 4: Get violations for content after pass
    const violationsAfter = await this.getViolations(contentAfter);

    // Step 5: Create 'after' snapshot
    await RuleSnapshotService.createSnapshot(
      this.jobId,
      passNumber,
      'after',
      contentAfter,
      violationsAfter
    );

    // Step 6: Get snapshots and calculate delta
    const snapshots = await RuleSnapshotService.getPassSnapshots(this.jobId, passNumber);

    if (!snapshots.before || !snapshots.after) {
      // This should not happen, but handle gracefully
      throw new Error(`Failed to retrieve snapshots for pass ${passNumber}`);
    }

    const delta = ConflictDetector.compareSnapshots(snapshots.before, snapshots.after);

    // Step 7: Store delta in history
    this.history.push(delta);

    // Step 8: Call UI callback if provided
    if (this.onDeltaCalculated) {
      this.onDeltaCalculated(delta);
    }

    // Step 9: Determine if we should revert
    const shouldRevert = this.autoRevert && ConflictDetector.shouldRevert(delta);
    const revertReason = shouldRevert ? ConflictDetector.getRevertReason(delta) : null;

    // Step 10: Return result with appropriate content
    return {
      passNumber,
      content: shouldRevert ? contentBefore : contentAfter,
      contentBeforePass: contentBefore,
      delta,
      wasReverted: shouldRevert,
      revertReason,
    };
  }

  /**
   * Get the history of all tracked pass deltas
   *
   * @returns Array of PassDelta objects in chronological order
   */
  getHistory(): PassDelta[] {
    return [...this.history];
  }
}
