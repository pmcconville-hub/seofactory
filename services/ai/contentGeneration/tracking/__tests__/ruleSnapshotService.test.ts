// services/ai/contentGeneration/tracking/__tests__/ruleSnapshotService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  RuleSnapshotService,
  RuleSnapshot,
  RuleStatus,
} from '../ruleSnapshotService';
import type { ValidationViolation } from '../../../../../types/audit';

describe('RuleSnapshotService', () => {
  beforeEach(() => {
    // Clear in-memory storage between tests
    RuleSnapshotService.clearStorage();
  });

  describe('calculateContentHash', () => {
    it('returns consistent hash for same content', () => {
      const content = 'This is test content for hashing.';
      const hash1 = RuleSnapshotService.calculateContentHash(content);
      const hash2 = RuleSnapshotService.calculateContentHash(content);

      expect(hash1).toBe(hash2);
    });

    it('returns different hash for different content', () => {
      const content1 = 'First content';
      const content2 = 'Second content';

      const hash1 = RuleSnapshotService.calculateContentHash(content1);
      const hash2 = RuleSnapshotService.calculateContentHash(content2);

      expect(hash1).not.toBe(hash2);
    });

    it('returns hash in expected format (SHA-256 hex string)', () => {
      const content = 'Test content';
      const hash = RuleSnapshotService.calculateContentHash(content);

      // SHA-256 produces 64 character hex string
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('handles empty string', () => {
      const hash = RuleSnapshotService.calculateContentHash('');

      // Should not throw and should return valid hash
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('handles unicode content', () => {
      const content = 'Content with unicode: \u00e9\u00e8\u00ea \u4e2d\u6587 \u0440\u0443\u0441\u0441\u043a\u0438\u0439';
      const hash = RuleSnapshotService.calculateContentHash(content);

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('buildRuleStatusMap', () => {
    it('returns empty map for empty violations array', () => {
      const violations: ValidationViolation[] = [];
      const statusMap = RuleSnapshotService.buildRuleStatusMap(violations);

      expect(statusMap).toEqual({});
    });

    it('groups violations by rule ID', () => {
      const violations: ValidationViolation[] = [
        { rule: 'A1', text: 'Issue 1', position: 0, suggestion: 'Fix 1', severity: 'error' },
        { rule: 'A1', text: 'Issue 2', position: 10, suggestion: 'Fix 2', severity: 'error' },
        { rule: 'B2', text: 'Issue 3', position: 20, suggestion: 'Fix 3', severity: 'warning' },
      ];

      const statusMap = RuleSnapshotService.buildRuleStatusMap(violations);

      expect(Object.keys(statusMap)).toHaveLength(2);
      expect(statusMap['A1']).toBeDefined();
      expect(statusMap['B2']).toBeDefined();
    });

    it('correctly counts violations per rule', () => {
      const violations: ValidationViolation[] = [
        { rule: 'A1', text: 'Issue 1', position: 0, suggestion: 'Fix 1', severity: 'error' },
        { rule: 'A1', text: 'Issue 2', position: 10, suggestion: 'Fix 2', severity: 'error' },
        { rule: 'A1', text: 'Issue 3', position: 20, suggestion: 'Fix 3', severity: 'warning' },
        { rule: 'B2', text: 'Issue 4', position: 30, suggestion: 'Fix 4', severity: 'warning' },
      ];

      const statusMap = RuleSnapshotService.buildRuleStatusMap(violations);

      expect(statusMap['A1'].violationCount).toBe(3);
      expect(statusMap['B2'].violationCount).toBe(1);
    });

    it('marks rules as not passed when violations exist', () => {
      const violations: ValidationViolation[] = [
        { rule: 'A1', text: 'Issue 1', position: 0, suggestion: 'Fix 1', severity: 'error' },
      ];

      const statusMap = RuleSnapshotService.buildRuleStatusMap(violations);

      expect(statusMap['A1'].passed).toBe(false);
    });

    it('determines severity from highest severity violation for rule', () => {
      const violations: ValidationViolation[] = [
        { rule: 'A1', text: 'Issue 1', position: 0, suggestion: 'Fix 1', severity: 'warning' },
        { rule: 'A1', text: 'Issue 2', position: 10, suggestion: 'Fix 2', severity: 'error' },
        { rule: 'A1', text: 'Issue 3', position: 20, suggestion: 'Fix 3', severity: 'warning' },
      ];

      const statusMap = RuleSnapshotService.buildRuleStatusMap(violations);

      expect(statusMap['A1'].severity).toBe('error');
    });

    it('maps warning severity correctly', () => {
      const violations: ValidationViolation[] = [
        { rule: 'B2', text: 'Warning issue', position: 0, suggestion: 'Fix', severity: 'warning' },
      ];

      const statusMap = RuleSnapshotService.buildRuleStatusMap(violations);

      expect(statusMap['B2'].severity).toBe('warning');
    });
  });

  describe('createSnapshot', () => {
    it('creates snapshot with correct structure', async () => {
      const jobId = 'job-123';
      const passNumber = 1;
      const type = 'before' as const;
      const content = 'Test article content';
      const violations: ValidationViolation[] = [
        { rule: 'A1', text: 'Issue', position: 0, suggestion: 'Fix', severity: 'error' },
      ];

      const snapshot = await RuleSnapshotService.createSnapshot(
        jobId,
        passNumber,
        type,
        content,
        violations
      );

      expect(snapshot.jobId).toBe(jobId);
      expect(snapshot.passNumber).toBe(passNumber);
      expect(snapshot.snapshotType).toBe(type);
      expect(snapshot.contentHash).toBeDefined();
      expect(snapshot.rules).toBeDefined();
      expect(snapshot.createdAt).toBeInstanceOf(Date);
    });

    it('calculates content hash correctly', async () => {
      const content = 'Test content for snapshot';
      const expectedHash = RuleSnapshotService.calculateContentHash(content);

      const snapshot = await RuleSnapshotService.createSnapshot(
        'job-123',
        1,
        'before',
        content,
        []
      );

      expect(snapshot.contentHash).toBe(expectedHash);
    });

    it('builds rule status map from violations', async () => {
      const violations: ValidationViolation[] = [
        { rule: 'A1', text: 'Issue 1', position: 0, suggestion: 'Fix 1', severity: 'error' },
        { rule: 'B2', text: 'Issue 2', position: 10, suggestion: 'Fix 2', severity: 'warning' },
      ];

      const snapshot = await RuleSnapshotService.createSnapshot(
        'job-123',
        1,
        'before',
        'content',
        violations
      );

      expect(snapshot.rules['A1']).toBeDefined();
      expect(snapshot.rules['A1'].passed).toBe(false);
      expect(snapshot.rules['A1'].severity).toBe('error');
      expect(snapshot.rules['B2']).toBeDefined();
      expect(snapshot.rules['B2'].severity).toBe('warning');
    });

    it('stores snapshot for later retrieval', async () => {
      const jobId = 'job-store-test';
      const passNumber = 2;
      const type = 'after' as const;

      await RuleSnapshotService.createSnapshot(
        jobId,
        passNumber,
        type,
        'content',
        []
      );

      const retrieved = await RuleSnapshotService.getSnapshot(jobId, passNumber, type);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.jobId).toBe(jobId);
    });
  });

  describe('getSnapshot', () => {
    it('returns null for non-existent snapshot', async () => {
      const snapshot = await RuleSnapshotService.getSnapshot(
        'non-existent-job',
        1,
        'before'
      );

      expect(snapshot).toBeNull();
    });

    it('retrieves correct snapshot by job, pass, and type', async () => {
      const jobId = 'job-456';

      // Create multiple snapshots
      await RuleSnapshotService.createSnapshot(jobId, 1, 'before', 'content1', []);
      await RuleSnapshotService.createSnapshot(jobId, 1, 'after', 'content2', []);
      await RuleSnapshotService.createSnapshot(jobId, 2, 'before', 'content3', []);

      const snapshot = await RuleSnapshotService.getSnapshot(jobId, 1, 'after');

      expect(snapshot).not.toBeNull();
      expect(snapshot?.passNumber).toBe(1);
      expect(snapshot?.snapshotType).toBe('after');
      expect(snapshot?.contentHash).toBe(RuleSnapshotService.calculateContentHash('content2'));
    });

    it('returns null when job exists but pass/type combination does not', async () => {
      const jobId = 'job-partial';

      await RuleSnapshotService.createSnapshot(jobId, 1, 'before', 'content', []);

      const snapshot = await RuleSnapshotService.getSnapshot(jobId, 1, 'after');
      expect(snapshot).toBeNull();

      const snapshot2 = await RuleSnapshotService.getSnapshot(jobId, 2, 'before');
      expect(snapshot2).toBeNull();
    });
  });

  describe('getPassSnapshots', () => {
    it('returns both before and after snapshots for a pass', async () => {
      const jobId = 'job-789';
      const passNumber = 3;

      await RuleSnapshotService.createSnapshot(jobId, passNumber, 'before', 'before-content', [
        { rule: 'A1', text: 'Issue', position: 0, suggestion: 'Fix', severity: 'error' },
      ]);
      await RuleSnapshotService.createSnapshot(jobId, passNumber, 'after', 'after-content', []);

      const snapshots = await RuleSnapshotService.getPassSnapshots(jobId, passNumber);

      expect(snapshots.before).not.toBeNull();
      expect(snapshots.after).not.toBeNull();
      expect(snapshots.before?.snapshotType).toBe('before');
      expect(snapshots.after?.snapshotType).toBe('after');
    });

    it('returns null for missing snapshots', async () => {
      const jobId = 'job-incomplete';
      const passNumber = 1;

      // Only create 'before' snapshot
      await RuleSnapshotService.createSnapshot(jobId, passNumber, 'before', 'content', []);

      const snapshots = await RuleSnapshotService.getPassSnapshots(jobId, passNumber);

      expect(snapshots.before).not.toBeNull();
      expect(snapshots.after).toBeNull();
    });

    it('returns both null when no snapshots exist', async () => {
      const snapshots = await RuleSnapshotService.getPassSnapshots('non-existent', 1);

      expect(snapshots.before).toBeNull();
      expect(snapshots.after).toBeNull();
    });
  });

  describe('snapshot integrity', () => {
    it('detects content changes via hash comparison', async () => {
      const jobId = 'job-integrity';
      const originalContent = 'Original article content';
      const modifiedContent = 'Modified article content';

      const beforeSnapshot = await RuleSnapshotService.createSnapshot(
        jobId,
        1,
        'before',
        originalContent,
        []
      );
      const afterSnapshot = await RuleSnapshotService.createSnapshot(
        jobId,
        1,
        'after',
        modifiedContent,
        []
      );

      expect(beforeSnapshot.contentHash).not.toBe(afterSnapshot.contentHash);
    });

    it('confirms content unchanged when hashes match', async () => {
      const jobId = 'job-unchanged';
      const content = 'Unchanged content';

      const beforeSnapshot = await RuleSnapshotService.createSnapshot(
        jobId,
        1,
        'before',
        content,
        []
      );
      const afterSnapshot = await RuleSnapshotService.createSnapshot(
        jobId,
        1,
        'after',
        content,
        []
      );

      expect(beforeSnapshot.contentHash).toBe(afterSnapshot.contentHash);
    });
  });
});
