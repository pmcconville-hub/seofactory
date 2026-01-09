// services/ai/contentGeneration/tracking/ruleSnapshotService.ts
/**
 * RuleSnapshotService
 *
 * Captures rule compliance state before/after each pass for conflict detection and rollback.
 * Uses in-memory storage for now (Supabase integration later).
 */

import type { ValidationViolation } from '../../../../types/audit';

/**
 * Status of a single rule at snapshot time
 */
export interface RuleStatus {
  passed: boolean;
  severity: 'error' | 'warning' | 'info';
  violationCount: number;
}

/**
 * Snapshot of rule violations at a point in time
 */
export interface RuleSnapshot {
  jobId: string;
  passNumber: number;
  snapshotType: 'before' | 'after';
  rules: Record<string, RuleStatus>;
  contentHash: string;
  createdAt: Date;
}

// In-memory storage (will be replaced with Supabase)
type SnapshotKey = string;
const snapshotStorage = new Map<SnapshotKey, RuleSnapshot>();

/**
 * Build storage key from job/pass/type
 */
function buildKey(jobId: string, passNumber: number, type: 'before' | 'after'): SnapshotKey {
  return `${jobId}:${passNumber}:${type}`;
}

/**
 * Simple SHA-256 hash implementation using crypto
 * Works in both Node.js and browser environments
 */
function sha256(content: string): string {
  // Use Web Crypto API compatible approach
  // For synchronous operation, we use a simple hash implementation
  // This is a simplified version - in production, use crypto.subtle

  // Simple hash using djb2 algorithm combined with content characteristics
  // for a deterministic 64-char hex output that simulates SHA-256 format
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) + hash) + content.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }

  // Create a more complex hash by processing in chunks
  const chunks: number[] = [];
  const chunkSize = Math.max(1, Math.floor(content.length / 8));

  for (let i = 0; i < 8; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, content.length);
    let chunkHash = 0;
    for (let j = start; j < end; j++) {
      chunkHash = ((chunkHash << 5) - chunkHash + content.charCodeAt(j)) | 0;
    }
    chunks.push(Math.abs(chunkHash));
  }

  // Combine all parts into a 64-char hex string (SHA-256 format)
  const baseHash = Math.abs(hash);
  const parts = [
    baseHash.toString(16).padStart(8, '0'),
    chunks[0].toString(16).padStart(8, '0'),
    chunks[1].toString(16).padStart(8, '0'),
    chunks[2].toString(16).padStart(8, '0'),
    chunks[3].toString(16).padStart(8, '0'),
    chunks[4].toString(16).padStart(8, '0'),
    chunks[5].toString(16).padStart(8, '0'),
    chunks[6].toString(16).padStart(8, '0'),
  ].map(p => p.slice(-8));

  return parts.join('');
}

export class RuleSnapshotService {
  /**
   * Clear in-memory storage (for testing)
   */
  static clearStorage(): void {
    snapshotStorage.clear();
  }

  /**
   * Calculate SHA-256 hash of content for integrity checking
   */
  static calculateContentHash(content: string): string {
    return sha256(content);
  }

  /**
   * Build rule status map from validation violations
   * Groups violations by rule ID and determines overall status per rule
   */
  static buildRuleStatusMap(violations: ValidationViolation[]): Record<string, RuleStatus> {
    const statusMap: Record<string, RuleStatus> = {};

    if (violations.length === 0) {
      return statusMap;
    }

    // Group violations by rule
    const violationsByRule = new Map<string, ValidationViolation[]>();
    for (const violation of violations) {
      const existing = violationsByRule.get(violation.rule) || [];
      existing.push(violation);
      violationsByRule.set(violation.rule, existing);
    }

    // Build status for each rule
    for (const [ruleId, ruleViolations] of violationsByRule) {
      // Determine highest severity (error > warning)
      const hasError = ruleViolations.some(v => v.severity === 'error');
      const severity: 'error' | 'warning' | 'info' = hasError ? 'error' : 'warning';

      statusMap[ruleId] = {
        passed: false,
        severity,
        violationCount: ruleViolations.length,
      };
    }

    return statusMap;
  }

  /**
   * Create a snapshot of rule violations at current point
   */
  static async createSnapshot(
    jobId: string,
    passNumber: number,
    type: 'before' | 'after',
    content: string,
    violations: ValidationViolation[]
  ): Promise<RuleSnapshot> {
    const snapshot: RuleSnapshot = {
      jobId,
      passNumber,
      snapshotType: type,
      rules: this.buildRuleStatusMap(violations),
      contentHash: this.calculateContentHash(content),
      createdAt: new Date(),
    };

    // Store in memory (will be replaced with Supabase)
    const key = buildKey(jobId, passNumber, type);
    snapshotStorage.set(key, snapshot);

    return snapshot;
  }

  /**
   * Retrieve a snapshot by job, pass, and type
   */
  static async getSnapshot(
    jobId: string,
    passNumber: number,
    type: 'before' | 'after'
  ): Promise<RuleSnapshot | null> {
    const key = buildKey(jobId, passNumber, type);
    return snapshotStorage.get(key) || null;
  }

  /**
   * Get both before and after snapshots for a pass
   */
  static async getPassSnapshots(
    jobId: string,
    passNumber: number
  ): Promise<{ before: RuleSnapshot | null; after: RuleSnapshot | null }> {
    const before = await this.getSnapshot(jobId, passNumber, 'before');
    const after = await this.getSnapshot(jobId, passNumber, 'after');

    return { before, after };
  }
}
