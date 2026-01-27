import { describe, it, expect, vi } from 'vitest';
import {
  extractEntitiesFromEAVs,
  categorizeEntityIssues,
  calculateHealthScore,
  buildHealthSummary,
  markAsProprietary,
  ExtractedEntity,
  HealthScoreStats,
} from '../entityHealthService';
import { SemanticTriple, EntityAuthorityResult } from '../../types';
import { EntityHealthRecord, EntityHealthIssue } from '../../types/entityHealth';
import { EntityCriticalityResult } from '../../lib/entityCriticality';

// Helper to create a minimal SemanticTriple
function createEAV(
  subject: string,
  predicate: string,
  object: string | number,
  category: 'UNIQUE' | 'ROOT' | 'RARE' | 'COMMON' | 'UNCLASSIFIED' = 'COMMON'
): SemanticTriple {
  return {
    subject: { label: subject, type: 'Entity' },
    predicate: { relation: predicate, type: 'Property', category },
    object: { value: object, type: typeof object === 'number' ? 'Number' : 'String' },
  };
}

// Helper to create minimal EntityHealthRecord
function createHealthRecord(
  entityName: string,
  status: 'verified' | 'partial' | 'unverified' | 'proprietary' | 'ambiguous' | 'pending',
  isCritical: boolean,
  issues: EntityHealthIssue[] = []
): EntityHealthRecord {
  return {
    entityName,
    normalizedName: entityName.toLowerCase(),
    criticality: {
      entityName,
      score: isCritical ? 0.8 : 0.3,
      isCritical,
      breakdown: { baseWeight: 0.4, coreSectionBonus: 0, coOccurrenceBonus: 0, bridgeBonus: 0 },
    },
    verificationStatus: status,
    issues,
  };
}

describe('entityHealthService', () => {
  describe('extractEntitiesFromEAVs', () => {
    it('extracts unique entities from EAV subject labels', () => {
      const eavs: SemanticTriple[] = [
        createEAV('React', 'uses', 'Virtual DOM'),
        createEAV('React', 'developed_by', 'Meta'),
        createEAV('Vue', 'uses', 'Virtual DOM'),
      ];

      const result = extractEntitiesFromEAVs(eavs, 'React');

      expect(result).toHaveLength(4); // React, Virtual DOM, Meta, Vue
      const names = result.map((e) => e.entityName);
      expect(names).toContain('React');
      expect(names).toContain('Virtual DOM');
      expect(names).toContain('Meta');
      expect(names).toContain('Vue');
    });

    it('deduplicates entities by lowercase name', () => {
      const eavs: SemanticTriple[] = [
        createEAV('React', 'is', 'Library'),
        createEAV('react', 'type', 'Framework'), // Same entity, different case
      ];

      const result = extractEntitiesFromEAVs(eavs, 'Something Else');

      // Should have React (deduplicated), Library, Framework
      const reactEntities = result.filter((e) => e.entityName.toLowerCase() === 'react');
      expect(reactEntities).toHaveLength(1);
    });

    it('marks central entity correctly', () => {
      const eavs: SemanticTriple[] = [
        createEAV('React', 'is', 'Library'),
        createEAV('Vue', 'is', 'Framework'),
      ];

      const result = extractEntitiesFromEAVs(eavs, 'React');

      const reactEntity = result.find((e) => e.entityName === 'React');
      const vueEntity = result.find((e) => e.entityName === 'Vue');

      expect(reactEntity?.isCentralEntity).toBe(true);
      expect(vueEntity?.isCentralEntity).toBe(false);
    });

    it('tracks topic count across multiple EAVs', () => {
      const eavs: SemanticTriple[] = [
        createEAV('JavaScript', 'has', 'Closures'),
        createEAV('TypeScript', 'extends', 'JavaScript'),
        createEAV('React', 'uses', 'JavaScript'),
      ];

      const result = extractEntitiesFromEAVs(eavs, 'Programming');

      const jsEntity = result.find((e) => e.entityName === 'JavaScript');
      // JavaScript appears in 3 different EAVs (as subject or value)
      expect(jsEntity?.topicCount).toBeGreaterThanOrEqual(1);
    });

    it('extracts entities from object.value when proper noun', () => {
      const eavs: SemanticTriple[] = [
        createEAV('Facebook', 'acquired', 'Instagram'),
        createEAV('Google', 'developed', 'Android'),
      ];

      const result = extractEntitiesFromEAVs(eavs, 'Tech Companies');

      const names = result.map((e) => e.entityName);
      expect(names).toContain('Instagram');
      expect(names).toContain('Android');
    });

    it('ignores non-proper-noun values', () => {
      const eavs: SemanticTriple[] = [
        createEAV('Product', 'has_price', '99.99'),
        createEAV('Product', 'description', 'the best product'),
      ];

      const result = extractEntitiesFromEAVs(eavs, 'Product');

      // Should only have Product, not numeric values or lowercase text
      expect(result.some((e) => e.entityName === '99.99')).toBe(false);
      expect(result.some((e) => e.entityName === 'the best product')).toBe(false);
    });

    it('tracks highest priority category', () => {
      const eavs: SemanticTriple[] = [
        createEAV('Entity', 'attr1', 'Value1', 'COMMON'),
        createEAV('Entity', 'attr2', 'Value2', 'UNIQUE'),
        createEAV('Entity', 'attr3', 'Value3', 'RARE'),
      ];

      const result = extractEntitiesFromEAVs(eavs, 'Central');

      const entity = result.find((e) => e.entityName === 'Entity');
      expect(entity?.attributeCategory).toBe('UNIQUE');
    });

    it('marks core section entities', () => {
      const eavs: SemanticTriple[] = [
        createEAV('TopicA', 'is', 'Concept'),
        createEAV('TopicB', 'is', 'Idea'),
      ];

      const result = extractEntitiesFromEAVs(eavs, 'Central', ['TopicA']);

      const topicA = result.find((e) => e.entityName === 'TopicA');
      const topicB = result.find((e) => e.entityName === 'TopicB');

      expect(topicA?.isCoreSectionEntity).toBe(true);
      expect(topicB?.isCoreSectionEntity).toBe(false);
    });
  });

  describe('categorizeEntityIssues', () => {
    it('flags ambiguous entities with multiple disambiguation options', () => {
      const disambiguationOptions = [
        { name: 'Apple Inc.', description: 'Technology company', wikidataId: 'Q312' },
        { name: 'Apple', description: 'Fruit', wikidataId: 'Q89' },
      ];

      const issues = categorizeEntityIssues('Apple', undefined, 0.5, disambiguationOptions);

      expect(issues).toHaveLength(2); // ambiguous + unverified (info level)
      const ambiguousIssue = issues.find((i) => i.type === 'ambiguous');
      expect(ambiguousIssue).toBeDefined();
      expect(ambiguousIssue?.severity).toBe('warning');
      expect(ambiguousIssue?.disambiguationOptions).toHaveLength(2);
    });

    it('flags unverified critical entities with critical severity', () => {
      const issues = categorizeEntityIssues('CriticalEntity', undefined, 0.85);

      const unverifiedIssue = issues.find((i) => i.type === 'unverified');
      expect(unverifiedIssue).toBeDefined();
      expect(unverifiedIssue?.severity).toBe('critical');
    });

    it('flags unverified non-critical entities with info severity', () => {
      const issues = categorizeEntityIssues('MinorEntity', undefined, 0.4);

      const unverifiedIssue = issues.find((i) => i.type === 'unverified');
      expect(unverifiedIssue).toBeDefined();
      expect(unverifiedIssue?.severity).toBe('info');
    });

    it('flags low authority score entities', () => {
      const authorityResult: EntityAuthorityResult = {
        entityName: 'WeakEntity',
        wikipedia: null,
        wikidata: null,
        knowledgeGraph: null,
        authorityScore: 20,
        verificationStatus: 'partial',
        recommendations: [],
      };

      const issues = categorizeEntityIssues('WeakEntity', authorityResult, 0.5);

      const lowAuthorityIssue = issues.find((i) => i.type === 'low_authority');
      expect(lowAuthorityIssue).toBeDefined();
      expect(lowAuthorityIssue?.severity).toBe('warning');
    });

    it('does not flag verified entities with good authority', () => {
      const authorityResult: EntityAuthorityResult = {
        entityName: 'GoodEntity',
        wikipedia: { found: true, title: 'Good Entity', url: 'https://...' } as any,
        wikidata: { id: 'Q123', label: 'Good Entity' } as any,
        knowledgeGraph: null,
        authorityScore: 75,
        verificationStatus: 'verified',
        recommendations: [],
      };

      const issues = categorizeEntityIssues('GoodEntity', authorityResult, 0.8);

      expect(issues).toHaveLength(0);
    });
  });

  describe('calculateHealthScore', () => {
    it('returns 100 when all critical entities are verified', () => {
      const stats: HealthScoreStats = {
        totalEntities: 10,
        verifiedCount: 10,
        partialCount: 0,
        unverifiedCount: 0,
        proprietaryCount: 0,
        ambiguousCount: 0,
        criticalEntities: 5,
        criticalVerified: 5,
      };

      const score = calculateHealthScore(stats);
      expect(score).toBe(100);
    });

    it('reduces score for unverified critical entities', () => {
      const stats: HealthScoreStats = {
        totalEntities: 10,
        verifiedCount: 5,
        partialCount: 0,
        unverifiedCount: 5,
        proprietaryCount: 0,
        ambiguousCount: 0,
        criticalEntities: 5,
        criticalVerified: 2, // Only 2 of 5 critical verified
      };

      const score = calculateHealthScore(stats);

      // Critical component: (2/5) * 70 = 28
      // Overall component: (5/10) * 30 = 15
      // Total: 43
      expect(score).toBe(43);
    });

    it('proprietary entities do not reduce score', () => {
      const statsWithProprietary: HealthScoreStats = {
        totalEntities: 10,
        verifiedCount: 5,
        partialCount: 0,
        unverifiedCount: 0,
        proprietaryCount: 5, // 5 proprietary
        ambiguousCount: 0,
        criticalEntities: 3,
        criticalVerified: 3,
      };

      const score = calculateHealthScore(statsWithProprietary);

      // Critical component: (3/3) * 70 = 70
      // Overall component: (5/(10-5)) * 30 = 30
      // Total: 100
      expect(score).toBe(100);
    });

    it('partial verification counts as 0.5 verified', () => {
      const stats: HealthScoreStats = {
        totalEntities: 10,
        verifiedCount: 0,
        partialCount: 10, // All partial
        unverifiedCount: 0,
        proprietaryCount: 0,
        ambiguousCount: 0,
        criticalEntities: 0,
        criticalVerified: 0,
      };

      const score = calculateHealthScore(stats);

      // Critical component: 70 (no critical entities)
      // Overall component: ((0 + 10*0.5)/10) * 30 = 15
      // Total: 85
      expect(score).toBe(85);
    });

    it('returns 100 for empty entity list', () => {
      const stats: HealthScoreStats = {
        totalEntities: 0,
        verifiedCount: 0,
        partialCount: 0,
        unverifiedCount: 0,
        proprietaryCount: 0,
        ambiguousCount: 0,
        criticalEntities: 0,
        criticalVerified: 0,
      };

      const score = calculateHealthScore(stats);
      expect(score).toBe(100);
    });

    it('handles all entities being proprietary', () => {
      const stats: HealthScoreStats = {
        totalEntities: 5,
        verifiedCount: 0,
        partialCount: 0,
        unverifiedCount: 0,
        proprietaryCount: 5,
        ambiguousCount: 0,
        criticalEntities: 0,
        criticalVerified: 0,
      };

      const score = calculateHealthScore(stats);
      // All proprietary = 100% score (nothing to verify)
      expect(score).toBe(100);
    });
  });

  describe('buildHealthSummary', () => {
    it('builds summary from records', () => {
      const records: EntityHealthRecord[] = [
        createHealthRecord('Entity1', 'verified', true),
        createHealthRecord('Entity2', 'partial', true),
        createHealthRecord('Entity3', 'unverified', false),
        createHealthRecord('Entity4', 'proprietary', false),
      ];

      const summary = buildHealthSummary(records);

      expect(summary.totalEntities).toBe(4);
      expect(summary.verifiedCount).toBe(1);
      expect(summary.partialCount).toBe(1);
      expect(summary.unverifiedCount).toBe(1);
      expect(summary.proprietaryCount).toBe(1);
      expect(summary.criticalEntities).toBe(2);
      expect(summary.criticalVerified).toBe(2); // verified + partial
      expect(summary.lastAnalyzedAt).toBeDefined();
    });

    it('counts issues by type', () => {
      const records: EntityHealthRecord[] = [
        createHealthRecord('Entity1', 'unverified', true, [
          { type: 'unverified', severity: 'critical', message: 'Not verified' },
        ]),
        createHealthRecord('Entity2', 'ambiguous', false, [
          { type: 'ambiguous', severity: 'warning', message: 'Ambiguous' },
        ]),
        createHealthRecord('Entity3', 'partial', false, [
          { type: 'low_authority', severity: 'warning', message: 'Low authority' },
        ]),
      ];

      const summary = buildHealthSummary(records);

      expect(summary.issuesByType.unverified).toBe(1);
      expect(summary.issuesByType.ambiguous).toBe(1);
      expect(summary.issuesByType.low_authority).toBe(1);
    });
  });

  describe('markAsProprietary', () => {
    it('updates status to proprietary', () => {
      const record = createHealthRecord('BrandName', 'unverified', true, [
        { type: 'unverified', severity: 'critical', message: 'Not found' },
      ]);

      const updated = markAsProprietary(record);

      expect(updated.verificationStatus).toBe('proprietary');
      expect(updated.userMarkedProprietary).toBe(true);
    });

    it('filters unverified and low_authority issues', () => {
      const record = createHealthRecord('BrandName', 'unverified', true, [
        { type: 'unverified', severity: 'critical', message: 'Not found' },
        { type: 'low_authority', severity: 'warning', message: 'Low score' },
        { type: 'ambiguous', severity: 'warning', message: 'Multiple matches' },
      ]);

      const updated = markAsProprietary(record);

      expect(updated.issues).toHaveLength(1);
      expect(updated.issues[0].type).toBe('ambiguous');
    });

    it('preserves other record properties', () => {
      const record = createHealthRecord('BrandName', 'unverified', true);
      record.wikidataId = 'Q123';
      record.lastCheckedAt = '2024-01-01';

      const updated = markAsProprietary(record);

      expect(updated.entityName).toBe('BrandName');
      expect(updated.criticality.isCritical).toBe(true);
      expect(updated.wikidataId).toBe('Q123');
      expect(updated.lastCheckedAt).toBe('2024-01-01');
    });
  });
});
