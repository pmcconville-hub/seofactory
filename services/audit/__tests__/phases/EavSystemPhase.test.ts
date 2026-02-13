import { describe, it, expect } from 'vitest';
import { EavSystemPhase } from '../../phases/EavSystemPhase';
import type { AuditRequest } from '../../types';

const makeRequest = (): AuditRequest => ({
  type: 'internal',
  projectId: 'proj-1',
  depth: 'deep',
  phases: ['eavSystem'],
  scrapingProvider: 'jina',
  language: 'en',
  includeFactValidation: false,
  includePerformanceData: false,
});

describe('EavSystemPhase', () => {
  it('returns 100 score with no content', async () => {
    const phase = new EavSystemPhase();
    const result = await phase.execute(makeRequest());
    expect(result.score).toBe(100);
    expect(result.findings).toHaveLength(0);
    expect(result.totalChecks).toBe(0);
  });

  it('runs EavTextValidator with text content (totalChecks = 4)', async () => {
    const phase = new EavSystemPhase();
    const content = {
      text: 'Water filters remove contaminants from drinking water. The lifespan is 6 months. Capacity is 500 gallons.',
    };
    const result = await phase.execute(makeRequest(), content);
    expect(result.totalChecks).toBe(4);
    expect(result.passedChecks).toBeGreaterThanOrEqual(0);
    expect(result.totalChecks).toBeGreaterThanOrEqual(result.findings.length);
  });

  it('runs EAV consistency audit when 2+ EAVs provided', async () => {
    const phase = new EavSystemPhase();
    const content = {
      text: 'Water filters are essential for clean water. The BRITA filter has a lifespan of 6 months.',
      eavs: [
        { entity: 'BRITA filter', attribute: 'lifespan', value: '6 months', category: 'ROOT' },
        { entity: 'BRITA filter', attribute: 'lifespan', value: '12 months', category: 'ROOT' },
        { entity: 'BRITA filter', attribute: 'capacity', value: '500 gallons', category: 'COMMON' },
      ],
    };
    const result = await phase.execute(makeRequest(), content);
    // 4 (text checks) + uniqueSubjects from EAV audit
    expect(result.totalChecks).toBeGreaterThan(4);
    // Should detect value conflict between 6 months and 12 months
    const conflictFinding = result.findings.find(f => f.ruleId.includes('value_conflict'));
    expect(conflictFinding).toBeDefined();
  });

  it('skips EAV consistency when fewer than 2 EAVs', async () => {
    const phase = new EavSystemPhase();
    const content = {
      text: 'Simple content here.',
      eavs: [
        { entity: 'Widget', attribute: 'color', value: 'blue' },
      ],
    };
    const result = await phase.execute(makeRequest(), content);
    expect(result.totalChecks).toBe(4); // Only text checks, no EAV audit
  });

  it('totalChecks >= findings.length invariant holds', async () => {
    const phase = new EavSystemPhase();
    // Provide text that triggers pronoun issues
    const content = {
      text: 'He said it was good. She thought it was fine. They decided it was okay. He moved on. She agreed. They left. It was done. He came back. She returned. They met again.',
    };
    const result = await phase.execute(makeRequest(), content);
    expect(result.totalChecks).toBeGreaterThanOrEqual(result.findings.length);
    expect(result.passedChecks).toBeGreaterThanOrEqual(0);
  });

  it('transformEavInconsistencies produces correctly mapped findings', () => {
    const phase = new EavSystemPhase();
    const findings = phase.transformEavInconsistencies([
      {
        id: 'test_1',
        severity: 'critical',
        type: 'value_conflict',
        subject: 'filter',
        attribute: 'lifespan',
        description: 'Conflicting values',
        locations: [
          { topicTitle: 'A', value: '6 months' },
          { topicTitle: 'B', value: '12 months' },
        ],
        suggestion: 'Standardize',
      },
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe('critical');
    expect(findings[0].phase).toBe('eavSystem');
    expect(findings[0].affectedElement).toBe('filter / lifespan');
  });
});
