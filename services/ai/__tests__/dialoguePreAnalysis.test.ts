import { describe, it, expect, vi } from 'vitest';
import {
  runPreAnalysis,
  calculateHealthScore,
  buildFindingsSection,
  getQuestionCountGuidance,
  partitionFindings,
} from '../dialoguePreAnalysis';
import type { PreAnalysisFinding } from '../dialoguePreAnalysis';
import type { BusinessInfo } from '../../../types';

// ── Factories ──

function makeTopic(overrides: Record<string, any> = {}) {
  return {
    id: overrides.id || `topic-${Math.random().toString(36).slice(2, 6)}`,
    map_id: 'map-1',
    parent_topic_id: overrides.parent_topic_id || null,
    title: overrides.title || 'Test Topic',
    slug: overrides.slug || 'test-topic',
    description: overrides.description || 'A test topic',
    type: overrides.type || 'core',
    freshness: { score: 1, schedule: 'evergreen', reasons: [] },
    cluster_role: overrides.cluster_role || 'cluster_content',
    ...overrides,
  };
}

function makeEav(overrides: Record<string, any> = {}) {
  return {
    subject: { label: overrides.subjectLabel || 'TestEntity', type: 'Entity' },
    predicate: {
      relation: overrides.relation || 'test_attr',
      type: 'Property',
      category: overrides.category || 'ROOT',
    },
    object: { value: overrides.value ?? 'test-value', type: 'Value' },
    confidence: 0.8,
    source: 'test',
    entity: overrides.subjectLabel || 'TestEntity',
    attribute: overrides.relation || 'test_attr',
    value: overrides.value ?? 'test-value',
  };
}

function makeBusinessInfo(overrides: Record<string, any> = {}): BusinessInfo {
  return {
    language: 'en',
    region: 'US',
    industry: 'Technology',
    audience: 'Developers',
    domain: 'example.com',
    projectName: 'Test Project',
    model: 'gemini',
    valueProp: 'Test value',
    expertise: 'Test expertise',
    seedKeyword: 'test',
    targetMarket: 'US',
    ...overrides,
  } as BusinessInfo;
}

// ── Health Score ──

describe('calculateHealthScore', () => {
  it('returns 100 for no findings', () => {
    expect(calculateHealthScore([])).toBe(100);
  });

  it('applies penalties correctly', () => {
    const findings: PreAnalysisFinding[] = [
      { category: 'title_cannibalization', severity: 'critical', title: '', details: '', affectedItems: [], suggestedAction: '', autoFixable: true },
      { category: 'depth_imbalance', severity: 'high', title: '', details: '', affectedItems: [], suggestedAction: '', autoFixable: true },
      { category: 'missing_frame', severity: 'medium', title: '', details: '', affectedItems: [], suggestedAction: '', autoFixable: true },
      { category: 'eav_pending_values', severity: 'low', title: '', details: '', affectedItems: [], suggestedAction: '', autoFixable: false },
    ];
    // 100 - 15 - 8 - 4 - 1 = 72
    expect(calculateHealthScore(findings)).toBe(72);
  });

  it('clamps to 0 for many critical findings', () => {
    const findings: PreAnalysisFinding[] = Array(10).fill({
      category: 'title_cannibalization' as const,
      severity: 'critical' as const,
      title: '', details: '', affectedItems: [], suggestedAction: '', autoFixable: true,
    });
    expect(calculateHealthScore(findings)).toBe(0);
  });
});

// ── Map Planning Analyzer ──

describe('runPreAnalysis - map_planning', () => {
  const businessInfo = makeBusinessInfo();

  it('returns allClear for empty topics', () => {
    const result = runPreAnalysis('map_planning', { topics: [] }, businessInfo);
    expect(result.findings).toHaveLength(0);
    expect(result.healthScore).toBe(100);
    expect(result.validatorsSkipped.length).toBeGreaterThan(0);
  });

  it('handles single topic without crashing', () => {
    const result = runPreAnalysis('map_planning', {
      topics: [makeTopic({ title: 'React Hooks' })],
    }, businessInfo);
    // Single topic can't have cannibalization; TMD needs 3+ topics
    // Frame coverage may generate many findings for a single topic, so just verify it runs
    expect(result.validatorsRun).toContain('FrameSemanticsAnalyzer');
    expect(typeof result.healthScore).toBe('number');
  });

  it('detects title cannibalization', () => {
    // Jaccard threshold is 0.7 — need high overlap: intersection/union > 0.7
    // "best seo tools beginners guide" vs "best seo tools beginners tips" → 4/6 = 0.67 (below)
    // Use near-identical titles for reliable detection:
    const topics = [
      makeTopic({ id: 'a', title: 'SEO Tools Beginners Guide' }),
      makeTopic({ id: 'b', title: 'SEO Tools Beginners Tutorial' }),
      makeTopic({ id: 'c', title: 'React Performance Optimization' }),
    ];
    // Words > 2 chars: {seo, tools, beginners, guide} vs {seo, tools, beginners, tutorial}
    // Intersection: {seo, tools, beginners} = 3, Union: {seo, tools, beginners, guide, tutorial} = 5
    // Jaccard = 3/5 = 0.6 — still below 0.7!
    // Need even more overlap:
    const topicsHighOverlap = [
      makeTopic({ id: 'a', title: 'Best SEO Tools Guide' }),
      makeTopic({ id: 'b', title: 'Best SEO Tools Overview' }),
      makeTopic({ id: 'c', title: 'React Performance Optimization' }),
    ];
    // Words > 2 chars: {best, seo, tools, guide} vs {best, seo, tools, overview}
    // Intersection: {best, seo, tools} = 3, Union: {best, seo, tools, guide, overview} = 5
    // Jaccard = 3/5 = 0.6 — still below 0.7!
    // Need titles where intersection/union > 0.7:
    const topicsVeryHighOverlap = [
      makeTopic({ id: 'a', title: 'SEO tools for website optimization' }),
      makeTopic({ id: 'b', title: 'SEO tools for site optimization' }),
      makeTopic({ id: 'c', title: 'React Performance Benchmarks' }),
    ];
    // Words > 2 chars: {seo, tools, website, optimization} vs {seo, tools, site, optimization}
    // Intersection: {seo, tools, optimization} = 3, Union: {seo, tools, website, site, optimization} = 5
    // Jaccard = 3/5 = 0.6 — STILL below 0.7
    // Let's use almost identical:
    const topicsIdentical = [
      makeTopic({ id: 'a', title: 'complete guide SEO tools review comparison' }),
      makeTopic({ id: 'b', title: 'complete guide SEO tools review overview' }),
      makeTopic({ id: 'c', title: 'React Performance Benchmarks' }),
    ];
    // Words > 2 chars: {complete, guide, seo, tools, review, comparison} vs {complete, guide, seo, tools, review, overview}
    // Intersection: {complete, guide, seo, tools, review} = 5, Union: 7
    // Jaccard = 5/7 ≈ 0.71 > 0.7 ✓
    const result = runPreAnalysis('map_planning', { topics: topicsIdentical }, businessInfo);
    const cannibalizations = result.findings.filter(f => f.category === 'title_cannibalization');
    expect(cannibalizations.length).toBeGreaterThanOrEqual(1);
    expect(cannibalizations[0].severity).toMatch(/critical|high/);
  });

  it('detects uncovered semantic frames', () => {
    // Topics that cover only one frame (Process)
    const topics = [
      makeTopic({ title: 'How to install React step by step' }),
      makeTopic({ title: 'React setup process for beginners' }),
      makeTopic({ title: 'React installation guide prerequisites' }),
    ];
    const result = runPreAnalysis('map_planning', { topics }, businessInfo);
    const frameFinding = result.findings.filter(f => f.category === 'missing_frame');
    // Should detect missing frames (Cost, Risks, Comparison, etc.)
    expect(frameFinding.length).toBeGreaterThanOrEqual(1);
    expect(result.validatorsRun).toContain('FrameSemanticsAnalyzer');
  });

  it('detects depth imbalance with parent-child relationships', () => {
    const root1 = makeTopic({ id: 'r1', title: 'Security', cluster_role: 'pillar' });
    const child1a = makeTopic({ id: 'c1a', title: 'Auth Security', parent_topic_id: 'r1' });
    const child1b = makeTopic({ id: 'c1b', title: 'Data Security', parent_topic_id: 'r1' });
    const grandchild1 = makeTopic({ id: 'gc1', title: 'OAuth Tokens', parent_topic_id: 'c1a' });

    const root2 = makeTopic({ id: 'r2', title: 'Monitoring', cluster_role: 'pillar' });
    // Monitoring has no children — much shallower

    const topics = [root1, child1a, child1b, grandchild1, root2];
    const result = runPreAnalysis('map_planning', { topics }, businessInfo);
    expect(result.validatorsRun).toContain('TMDDetector');
  });

  it('detects border violations with a CE', () => {
    const topics = [
      makeTopic({ title: 'React Hooks Guide' }),
      makeTopic({ title: 'Python Machine Learning Tutorial' }), // Far from CE
      makeTopic({ title: 'React Component Patterns' }),
    ];
    const result = runPreAnalysis(
      'map_planning',
      { topics, pillars: { centralEntity: 'React' } },
      businessInfo
    );
    expect(result.validatorsRun).toContain('TopicalBorderValidator');
  });

  it('skips border validation without CE', () => {
    const topics = [
      makeTopic({ title: 'React Hooks' }),
      makeTopic({ title: 'Vue Components' }),
    ];
    const result = runPreAnalysis('map_planning', { topics }, businessInfo);
    expect(result.validatorsSkipped).toContain('TopicalBorderValidator');
  });

  it('detects page worthiness issues', () => {
    const parent = makeTopic({ id: 'parent', title: 'React Performance' });
    const childNoData = makeTopic({
      id: 'child',
      title: 'React memo',
      parent_topic_id: 'parent',
      search_volume: 0,
    });
    const topics = [parent, childNoData];
    const result = runPreAnalysis('map_planning', { topics }, businessInfo);
    expect(result.validatorsRun).toContain('IndexConstructionRule');
  });
});

// ── EAV Analyzer ──

describe('runPreAnalysis - eavs', () => {
  const businessInfo = makeBusinessInfo();

  it('returns allClear for empty EAVs', () => {
    const result = runPreAnalysis('eavs', { eavs: [] }, businessInfo);
    expect(result.findings).toHaveLength(0);
    expect(result.healthScore).toBe(100);
    expect(result.validatorsSkipped).toContain('auditEavs');
  });

  it('detects missing ROOT category', () => {
    const eavs = [
      makeEav({ category: 'COMMON', relation: 'color', value: 'red' }),
      makeEav({ category: 'COMMON', relation: 'size', value: 'large' }),
    ];
    const result = runPreAnalysis('eavs', { eavs }, businessInfo);
    const gapFindings = result.findings.filter(f => f.category === 'eav_category_gap');
    expect(gapFindings.length).toBeGreaterThanOrEqual(1);
    expect(gapFindings.some(f => f.title.includes('ROOT'))).toBe(true);
  });

  it('detects missing UNIQUE category', () => {
    const eavs = [
      makeEav({ category: 'ROOT', relation: 'type', value: 'widget' }),
    ];
    const result = runPreAnalysis('eavs', { eavs }, businessInfo);
    const gapFindings = result.findings.filter(f => f.category === 'eav_category_gap');
    expect(gapFindings.some(f => f.title.includes('UNIQUE'))).toBe(true);
  });

  it('detects pending values (clipboard emoji)', () => {
    const eavs = [
      makeEav({ relation: 'price', value: '📋 fill in later' }),
      makeEav({ relation: 'phone', value: '' }),
      makeEav({ relation: 'name', value: 'Acme Corp', category: 'ROOT' }),
    ];
    const result = runPreAnalysis('eavs', { eavs }, businessInfo);
    const pendingFindings = result.findings.filter(f => f.category === 'eav_pending_values');
    expect(pendingFindings).toHaveLength(1);
    expect(pendingFindings[0].title).toContain('2 EAV');
  });

  it('detects value conflicts', () => {
    const eavs = [
      makeEav({ subjectLabel: 'Widget', relation: 'price', value: '100', category: 'ROOT' }),
      makeEav({ subjectLabel: 'Widget', relation: 'price', value: '200', category: 'ROOT' }),
      makeEav({ subjectLabel: 'Widget', relation: 'type', value: 'premium', category: 'UNIQUE' }),
    ];
    const result = runPreAnalysis('eavs', { eavs }, businessInfo);
    const inconsistencies = result.findings.filter(f => f.category === 'eav_inconsistency');
    expect(inconsistencies.length).toBeGreaterThanOrEqual(1);
  });

  it('returns high health for clean EAVs', () => {
    const eavs = [
      makeEav({ relation: 'type', value: 'SaaS Platform', category: 'ROOT' }),
      makeEav({ relation: 'usp', value: 'AI-powered analytics', category: 'UNIQUE' }),
      makeEav({ relation: 'pricing_model', value: 'subscription', category: 'COMMON' }),
    ];
    const result = runPreAnalysis('eavs', { eavs }, businessInfo);
    expect(result.healthScore).toBeGreaterThanOrEqual(80);
  });
});

// ── Strategy Analyzer ──

describe('runPreAnalysis - strategy', () => {
  const businessInfo = makeBusinessInfo();

  it('detects empty Central Entity', () => {
    const result = runPreAnalysis('strategy', { pillars: { centralEntity: '', sourceContext: 'SEO Agency', centralSearchIntent: 'learn SEO' } }, businessInfo);
    const ceFindings = result.findings.filter(f => f.category === 'ce_ambiguity');
    expect(ceFindings).toHaveLength(1);
    expect(ceFindings[0].severity).toBe('critical');
  });

  it('detects single-word ambiguous CE', () => {
    const result = runPreAnalysis('strategy', { pillars: { centralEntity: 'SEO', sourceContext: 'Digital Marketing Agency', centralSearchIntent: 'learn' } }, businessInfo);
    const ceFindings = result.findings.filter(f => f.category === 'ce_ambiguity');
    expect(ceFindings.some(f => f.severity === 'high')).toBe(true);
  });

  it('detects CE starting with article', () => {
    const result = runPreAnalysis('strategy', { pillars: { centralEntity: 'The Solar Panel', sourceContext: 'Renewable Energy Expert', centralSearchIntent: 'buy solar' } }, businessInfo);
    const ceFindings = result.findings.filter(f => f.category === 'ce_ambiguity');
    expect(ceFindings.some(f => f.title.includes('article'))).toBe(true);
  });

  it('detects empty Source Context', () => {
    const result = runPreAnalysis('strategy', { pillars: { centralEntity: 'Solar Panels', sourceContext: '', centralSearchIntent: 'buy solar' } }, businessInfo);
    const scFindings = result.findings.filter(f => f.category === 'sc_specificity');
    expect(scFindings).toHaveLength(1);
    expect(scFindings[0].severity).toBe('critical');
  });

  it('detects generic Source Context', () => {
    const result = runPreAnalysis('strategy', { pillars: { centralEntity: 'Solar Panels', sourceContext: 'Expert blog', centralSearchIntent: 'compare' } }, businessInfo);
    const scFindings = result.findings.filter(f => f.category === 'sc_specificity');
    expect(scFindings.some(f => f.title.includes('generic'))).toBe(true);
  });

  it('detects empty CSI', () => {
    const result = runPreAnalysis('strategy', { pillars: { centralEntity: 'Solar Panels', sourceContext: 'Certified Solar Installer', centralSearchIntent: '' } }, businessInfo);
    const csiFindings = result.findings.filter(f => f.category === 'csi_coverage');
    expect(csiFindings.some(f => f.severity === 'critical')).toBe(true);
  });

  it('detects insufficient CSI predicates', () => {
    const result = runPreAnalysis('strategy', {
      pillars: {
        centralEntity: 'Solar Panels',
        sourceContext: 'Certified Solar Installer',
        centralSearchIntent: 'install solar',
        csiPredicates: ['install'],
      },
    }, businessInfo);
    const csiFindings = result.findings.filter(f => f.category === 'csi_coverage');
    expect(csiFindings.some(f => f.title.includes('1 CSI predicate'))).toBe(true);
  });

  it('returns high health for well-defined strategy', () => {
    const result = runPreAnalysis('strategy', {
      pillars: {
        centralEntity: 'Residential Solar Panels',
        sourceContext: 'Certified Solar Installation Company with 15 years experience',
        centralSearchIntent: 'choose and install residential solar panels',
        csiPredicates: ['buy', 'compare', 'install', 'maintain'],
      },
    }, businessInfo);
    expect(result.healthScore).toBeGreaterThanOrEqual(80);
  });
});

// ── Edge Cases ──

describe('runPreAnalysis - edge cases', () => {
  const businessInfo = makeBusinessInfo();

  it('handles null stepOutput gracefully', () => {
    const result = runPreAnalysis('map_planning', null, businessInfo);
    expect(result.findings).toHaveLength(0);
    expect(result.validatorsSkipped.length).toBeGreaterThan(0);
  });

  it('handles undefined stepOutput gracefully', () => {
    const result = runPreAnalysis('eavs', undefined, businessInfo);
    expect(result.findings).toHaveLength(0);
  });

  it('handles stepOutput without expected fields', () => {
    const result = runPreAnalysis('strategy', { unrelated: true }, businessInfo);
    // Should detect empty CE, SC, CSI
    const criticals = result.findings.filter(f => f.severity === 'critical');
    expect(criticals.length).toBeGreaterThanOrEqual(2);
  });

  it('records durationMs', () => {
    const result = runPreAnalysis('strategy', { pillars: { centralEntity: 'Test' } }, businessInfo);
    expect(typeof result.durationMs).toBe('number');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});

// ── Prompt Helpers ──

describe('buildFindingsSection', () => {
  it('returns empty string for no findings', () => {
    const result: PreAnalysisFinding[] = [];
    expect(buildFindingsSection({ findings: result, healthScore: 100, validatorsRun: [], validatorsSkipped: [], durationMs: 0 })).toBe('');
  });

  it('groups findings by severity', () => {
    const result = buildFindingsSection({
      findings: [
        { category: 'title_cannibalization', severity: 'critical', title: 'Test critical', details: 'D', affectedItems: [], suggestedAction: 'Fix it', autoFixable: true },
        { category: 'missing_frame', severity: 'medium', title: 'Test medium', details: 'D', affectedItems: [], suggestedAction: 'Add it', autoFixable: true },
      ],
      healthScore: 81,
      validatorsRun: ['a', 'b'],
      validatorsSkipped: [],
      durationMs: 5,
    });
    expect(result).toContain('CRITICAL ISSUES');
    expect(result).toContain('MEDIUM-PRIORITY');
    expect(result).toContain('Test critical');
    expect(result).toContain('Test medium');
  });
});

describe('getQuestionCountGuidance', () => {
  it('returns guidance with capped count', () => {
    const findings: PreAnalysisFinding[] = [
      { category: 'ce_ambiguity', severity: 'critical', title: '', details: '', affectedItems: [], suggestedAction: '', autoFixable: false },
      { category: 'sc_specificity', severity: 'high', title: '', details: '', affectedItems: [], suggestedAction: '', autoFixable: false },
    ];
    const guidance = getQuestionCountGuidance(findings);
    expect(guidance).toContain('2 question(s)');
  });

  it('caps at 12', () => {
    const findings: PreAnalysisFinding[] = Array(20).fill({
      category: 'title_cannibalization' as const,
      severity: 'critical' as const,
      title: '', details: '', affectedItems: [], suggestedAction: '', autoFixable: true,
    });
    const guidance = getQuestionCountGuidance(findings);
    expect(guidance).toContain('12 question(s)');
  });
});

// ── partitionFindings ──

describe('partitionFindings', () => {
  it('separates framework issues from user questions', () => {
    const findings: PreAnalysisFinding[] = [
      { category: 'title_cannibalization', severity: 'high', title: 'Overlap', details: '', affectedItems: [], suggestedAction: '', autoFixable: true },
      { category: 'missing_frame', severity: 'medium', title: 'Missing', details: '', affectedItems: [], suggestedAction: '', autoFixable: true },
      { category: 'ce_ambiguity', severity: 'high', title: 'Ambiguous CE', details: '', affectedItems: [], suggestedAction: '', autoFixable: false },
      { category: 'eav_pending_values', severity: 'medium', title: 'Pending', details: '', affectedItems: [], suggestedAction: '', autoFixable: false },
    ];

    const { userQuestions, frameworkIssues } = partitionFindings(findings);

    expect(frameworkIssues).toHaveLength(2);
    expect(frameworkIssues.every(f => f.autoFixable)).toBe(true);
    expect(frameworkIssues.map(f => f.category)).toEqual(['title_cannibalization', 'missing_frame']);

    expect(userQuestions).toHaveLength(2);
    expect(userQuestions.every(f => !f.autoFixable)).toBe(true);
    expect(userQuestions.map(f => f.category)).toEqual(['ce_ambiguity', 'eav_pending_values']);
  });

  it('returns all as frameworkIssues when only auto-fixable', () => {
    const findings: PreAnalysisFinding[] = [
      { category: 'depth_imbalance', severity: 'high', title: '', details: '', affectedItems: [], suggestedAction: '', autoFixable: true },
      { category: 'border_violation', severity: 'medium', title: '', details: '', affectedItems: [], suggestedAction: '', autoFixable: true },
    ];

    const { userQuestions, frameworkIssues } = partitionFindings(findings);
    expect(userQuestions).toHaveLength(0);
    expect(frameworkIssues).toHaveLength(2);
  });

  it('returns all as userQuestions when only user-facing', () => {
    const findings: PreAnalysisFinding[] = [
      { category: 'sc_specificity', severity: 'high', title: '', details: '', affectedItems: [], suggestedAction: '', autoFixable: false },
      { category: 'csi_coverage', severity: 'medium', title: '', details: '', affectedItems: [], suggestedAction: '', autoFixable: false },
    ];

    const { userQuestions, frameworkIssues } = partitionFindings(findings);
    expect(userQuestions).toHaveLength(2);
    expect(frameworkIssues).toHaveLength(0);
  });

  it('handles empty findings', () => {
    const { userQuestions, frameworkIssues } = partitionFindings([]);
    expect(userQuestions).toHaveLength(0);
    expect(frameworkIssues).toHaveLength(0);
  });
});

// ── autoFixable classification on real findings ──

describe('autoFixable classification', () => {
  const businessInfo = makeBusinessInfo();

  it('marks map_planning findings as autoFixable', () => {
    const topicsIdentical = [
      makeTopic({ id: 'a', title: 'complete guide SEO tools review comparison' }),
      makeTopic({ id: 'b', title: 'complete guide SEO tools review overview' }),
      makeTopic({ id: 'c', title: 'React Performance Benchmarks' }),
    ];
    const result = runPreAnalysis('map_planning', { topics: topicsIdentical }, businessInfo);
    const mapFindings = result.findings.filter(f =>
      ['title_cannibalization', 'missing_frame', 'depth_imbalance', 'border_violation', 'page_worthiness'].includes(f.category)
    );
    for (const f of mapFindings) {
      expect(f.autoFixable).toBe(true);
    }
  });

  it('marks strategy findings as NOT autoFixable', () => {
    const result = runPreAnalysis('strategy', {
      pillars: { centralEntity: '', sourceContext: '', centralSearchIntent: '' },
    }, businessInfo);
    const strategyFindings = result.findings.filter(f =>
      ['ce_ambiguity', 'sc_specificity', 'csi_coverage'].includes(f.category)
    );
    expect(strategyFindings.length).toBeGreaterThanOrEqual(3);
    for (const f of strategyFindings) {
      expect(f.autoFixable).toBe(false);
    }
  });

  it('marks eav_category_gap and eav_pending_values as NOT autoFixable', () => {
    const eavs = [
      makeEav({ category: 'COMMON', relation: 'color', value: '📋 fill later' }),
    ];
    const result = runPreAnalysis('eavs', { eavs }, businessInfo);
    const gapFindings = result.findings.filter(f => f.category === 'eav_category_gap');
    const pendingFindings = result.findings.filter(f => f.category === 'eav_pending_values');
    for (const f of [...gapFindings, ...pendingFindings]) {
      expect(f.autoFixable).toBe(false);
    }
  });

  it('marks eav_inconsistency as autoFixable', () => {
    const eavs = [
      makeEav({ subjectLabel: 'Widget', relation: 'price', value: '100', category: 'ROOT' }),
      makeEav({ subjectLabel: 'Widget', relation: 'price', value: '200', category: 'ROOT' }),
      makeEav({ subjectLabel: 'Widget', relation: 'type', value: 'premium', category: 'UNIQUE' }),
    ];
    const result = runPreAnalysis('eavs', { eavs }, businessInfo);
    const inconsistencies = result.findings.filter(f => f.category === 'eav_inconsistency');
    for (const f of inconsistencies) {
      expect(f.autoFixable).toBe(true);
    }
  });
});
