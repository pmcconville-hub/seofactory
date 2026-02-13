import { describe, it, expect } from 'vitest';
import { StrategicFoundationPhase } from '../../phases/StrategicFoundationPhase';
import type { AuditRequest } from '../../types';

const makeRequest = (): AuditRequest => ({
  type: 'internal',
  projectId: 'proj-1',
  depth: 'deep',
  phases: ['strategicFoundation'],
  scrapingProvider: 'jina',
  language: 'en',
  includeFactValidation: false,
  includePerformanceData: false,
});

describe('StrategicFoundationPhase', () => {
  it('returns 100 score with no content', async () => {
    const phase = new StrategicFoundationPhase();
    const result = await phase.execute(makeRequest());
    expect(result.score).toBe(100);
    expect(result.findings).toHaveLength(0);
    expect(result.totalChecks).toBe(0);
  });

  it('runs ContextQualifierDetector with text only (totalChecks = 9)', async () => {
    const phase = new StrategicFoundationPhase();
    const content = {
      text: 'Water filters are important. They remove contaminants. Studies show 90% effectiveness. According to EPA data, filters last 6 months.',
    };
    const result = await phase.execute(makeRequest(), content);
    expect(result.totalChecks).toBe(9); // only ContextQualifierDetector runs
    expect(result.totalChecks).toBeGreaterThanOrEqual(result.findings.length);
  });

  it('runs CentralEntityPositionChecker with text + centralEntity (totalChecks includes 5)', async () => {
    const phase = new StrategicFoundationPhase();
    const content = {
      text: 'This article discusses many things. There are various topics here. Some information is provided about stuff in general.',
      centralEntity: 'water filter',
    };
    const result = await phase.execute(makeRequest(), content);
    // 5 (CE checker) + 9 (qualifier detector) = 14
    expect(result.totalChecks).toBe(14);
    // CE not found in first sentence, so should have findings
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it('runs AuthorEntityChecker with HTML (totalChecks includes 2)', async () => {
    const phase = new StrategicFoundationPhase();
    const content = {
      text: 'This is about water filters. Water filters are great.',
      html: '<html><body><h1>Water Filters</h1><p>Content about water filters.</p></body></html>',
    };
    const result = await phase.execute(makeRequest(), content);
    // 2 (author checker) + 9 (qualifier detector) = 11
    expect(result.totalChecks).toBe(11);
    // No author info in the HTML, should find rule-17
    const authorFinding = result.findings.find(f => f.ruleId === 'rule-17');
    expect(authorFinding).toBeDefined();
  });

  it('runs CE consistency analysis with HTML + centralEntity', async () => {
    const phase = new StrategicFoundationPhase();
    const content = {
      text: 'Water filters purify drinking water. Water filters are essential.',
      html: '<html><head><title>Something Else</title></head><body><h1>Random Title</h1><p>Water filters purify drinking water. Water filters are essential.</p></body></html>',
      centralEntity: 'water filter',
    };
    const result = await phase.execute(makeRequest(), content);
    // Should include CE consistency checks (7 additional)
    // 5 (CE position) + 2 (author) + 9 (qualifier) + 7 (CE consistency) = 23
    expect(result.totalChecks).toBe(23);
  });

  it('runs SourceContextAligner when sourceContext + contentSpec present', async () => {
    const phase = new StrategicFoundationPhase();
    const content = {
      text: 'Water filters from AquaPure remove 99.9% of contaminants. Best for home use.',
      centralEntity: 'water filter',
      html: '<html><body><h1>AquaPure Water Filters</h1><p>By John Smith</p><p>Water filters from AquaPure remove 99.9% of contaminants.</p></body></html>',
      sourceContext: {
        businessName: 'AquaPure',
        industry: 'water filtration',
        targetAudience: 'homeowners',
        coreServices: ['water filters'],
        uniqueSellingPoints: ['99.9% contaminant removal'],
      },
      contentSpec: {
        centralEntity: 'water filter',
        targetKeywords: ['best water filter', 'water purifier'],
        requiredAttributes: ['lifespan', 'capacity'],
      },
    };
    const result = await phase.execute(makeRequest(), content);
    // 4 (aligner) + 5 (CE position) + 2 (author) + 9 (qualifier) + 7 (CE consistency) = 27
    expect(result.totalChecks).toBe(27);
  });

  it('totalChecks >= findings.length invariant holds under all conditions', async () => {
    const phase = new StrategicFoundationPhase();
    const content = {
      text: 'Stuff happens. Things are done. Very generic content that says nothing specific whatsoever.',
      centralEntity: 'non existent entity xyz',
      html: '<html><body><h1>Unrelated</h1><p>Stuff happens.</p></body></html>',
    };
    const result = await phase.execute(makeRequest(), content);
    expect(result.totalChecks).toBeGreaterThanOrEqual(result.findings.length);
    expect(result.passedChecks).toBeGreaterThanOrEqual(0);
  });
});
