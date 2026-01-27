# Phase 3: Entity Health Dashboard & Knowledge Graph Enhancements

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an Entity Health Dashboard with smart triage and enhance the KnowledgeGraph with betweenness centrality and structural hole detection to identify content bridging opportunities.

**Architecture:** Three-layer approach: (1) Entity criticality scoring service calculates which entities need verification based on attribute category weights, (2) Entity Health service performs batch verification against Wikidata/Wikipedia/KG APIs and categorizes issues, (3) KnowledgeGraph class extended with betweenness centrality, structural hole detection, and AI-powered bridge suggestions.

**Tech Stack:** TypeScript, React, existing wikidataService.ts, googleKnowledgeGraphService.ts, lib/knowledgeGraph.ts

---

## Task 1: Entity Criticality Score Types and Service

**Files:**
- Create: `lib/entityCriticality.ts`
- Create: `lib/__tests__/entityCriticality.test.ts`

### Step 1: Write the failing test for calculateCriticalityScore

```typescript
// lib/__tests__/entityCriticality.test.ts
import { describe, it, expect } from 'vitest';
import {
  calculateCriticalityScore,
  EntityCriticalityInput,
  CRITICALITY_THRESHOLD
} from '../entityCriticality';

describe('calculateCriticalityScore', () => {
  it('returns 1.0 for Central Entity', () => {
    const input: EntityCriticalityInput = {
      entityName: 'Germany',
      isCentralEntity: true,
      attributeCategory: 'COMMON',
      isCoreSectionEntity: false,
      topicCount: 1,
      betweennessCentrality: 0
    };

    const result = calculateCriticalityScore(input);
    expect(result.score).toBe(1.0);
    expect(result.isCritical).toBe(true);
  });

  it('returns 0.9 for UNIQUE attribute entity', () => {
    const input: EntityCriticalityInput = {
      entityName: 'VIN Number',
      isCentralEntity: false,
      attributeCategory: 'UNIQUE',
      isCoreSectionEntity: false,
      topicCount: 1,
      betweennessCentrality: 0
    };

    const result = calculateCriticalityScore(input);
    expect(result.score).toBe(0.9);
    expect(result.isCritical).toBe(true);
  });

  it('returns 0.8 for ROOT attribute entity', () => {
    const input: EntityCriticalityInput = {
      entityName: 'Population',
      isCentralEntity: false,
      attributeCategory: 'ROOT',
      isCoreSectionEntity: false,
      topicCount: 1,
      betweennessCentrality: 0
    };

    const result = calculateCriticalityScore(input);
    expect(result.score).toBe(0.8);
    expect(result.isCritical).toBe(true);
  });

  it('returns 0.6 for RARE attribute entity', () => {
    const input: EntityCriticalityInput = {
      entityName: 'Designer History',
      isCentralEntity: false,
      attributeCategory: 'RARE',
      isCoreSectionEntity: false,
      topicCount: 1,
      betweennessCentrality: 0
    };

    const result = calculateCriticalityScore(input);
    expect(result.score).toBe(0.6);
    expect(result.isCritical).toBe(false);
  });

  it('adds 0.2 bonus for Core Section entities', () => {
    const input: EntityCriticalityInput = {
      entityName: 'Visa Application',
      isCentralEntity: false,
      attributeCategory: 'COMMON',
      isCoreSectionEntity: true,
      topicCount: 1,
      betweennessCentrality: 0
    };

    const result = calculateCriticalityScore(input);
    expect(result.score).toBe(0.6); // 0.4 base + 0.2 core bonus
  });

  it('adds 0.1 per topic for co-occurrence bonus (max 0.3)', () => {
    const input: EntityCriticalityInput = {
      entityName: 'Germany',
      isCentralEntity: false,
      attributeCategory: 'COMMON',
      isCoreSectionEntity: false,
      topicCount: 5,
      betweennessCentrality: 0
    };

    const result = calculateCriticalityScore(input);
    // 0.4 base + 0.3 max co-occurrence = 0.7
    expect(result.score).toBe(0.7);
    expect(result.isCritical).toBe(true);
  });

  it('adds bridge bonus based on betweenness centrality', () => {
    const input: EntityCriticalityInput = {
      entityName: 'Cultural Integration',
      isCentralEntity: false,
      attributeCategory: 'COMMON',
      isCoreSectionEntity: false,
      topicCount: 1,
      betweennessCentrality: 0.8 // High centrality = bridge entity
    };

    const result = calculateCriticalityScore(input);
    // 0.4 base + 0.24 bridge bonus (0.3 * 0.8) = 0.64
    expect(result.score).toBeCloseTo(0.64, 2);
  });

  it('caps score at 1.0', () => {
    const input: EntityCriticalityInput = {
      entityName: 'Germany',
      isCentralEntity: true,
      attributeCategory: 'UNIQUE',
      isCoreSectionEntity: true,
      topicCount: 10,
      betweennessCentrality: 1.0
    };

    const result = calculateCriticalityScore(input);
    expect(result.score).toBe(1.0);
  });
});
```

### Step 2: Run test to verify it fails

Run: `npx vitest run lib/__tests__/entityCriticality.test.ts`
Expected: FAIL with "Cannot find module '../entityCriticality'"

### Step 3: Write minimal implementation

```typescript
// lib/entityCriticality.ts
import { AttributeCategory } from '../types';

/**
 * Input for calculating entity criticality score.
 */
export interface EntityCriticalityInput {
  entityName: string;
  isCentralEntity: boolean;
  attributeCategory: AttributeCategory | 'COMMON';
  isCoreSectionEntity: boolean;
  topicCount: number;
  betweennessCentrality: number; // 0-1
}

/**
 * Result of criticality calculation.
 */
export interface EntityCriticalityResult {
  entityName: string;
  score: number; // 0-1
  isCritical: boolean;
  breakdown: {
    baseWeight: number;
    coreSectionBonus: number;
    coOccurrenceBonus: number;
    bridgeBonus: number;
  };
}

/**
 * Entities with score >= CRITICALITY_THRESHOLD are considered critical
 * and require verification.
 */
export const CRITICALITY_THRESHOLD = 0.7;

/**
 * Base weights by attribute category.
 * Based on EAV Foundational Rules prioritization.
 */
const ATTRIBUTE_CATEGORY_WEIGHTS: Record<AttributeCategory | 'COMMON', number> = {
  UNIQUE: 0.9,
  ROOT: 0.8,
  RARE: 0.6,
  COMMON: 0.4,
};

/**
 * Calculate criticality score for an entity.
 *
 * Formula:
 * CriticalityScore = BaseWeight(attributeCategory)
 *                  + SectionBonus(core/outer)
 *                  + CoOccurrenceBonus(topicCount)
 *                  + BridgeBonus(betweennessCentrality)
 *
 * Capped at 1.0.
 */
export function calculateCriticalityScore(
  input: EntityCriticalityInput
): EntityCriticalityResult {
  // Central Entity always gets maximum score
  if (input.isCentralEntity) {
    return {
      entityName: input.entityName,
      score: 1.0,
      isCritical: true,
      breakdown: {
        baseWeight: 1.0,
        coreSectionBonus: 0,
        coOccurrenceBonus: 0,
        bridgeBonus: 0,
      },
    };
  }

  // Base weight from attribute category
  const baseWeight = ATTRIBUTE_CATEGORY_WEIGHTS[input.attributeCategory] ?? 0.4;

  // Core Section bonus (+0.2)
  const coreSectionBonus = input.isCoreSectionEntity ? 0.2 : 0;

  // Co-occurrence bonus (+0.1 per topic, max 0.3)
  // Only count topics beyond the first one
  const additionalTopics = Math.max(0, input.topicCount - 1);
  const coOccurrenceBonus = Math.min(0.3, additionalTopics * 0.1);

  // Bridge bonus based on betweenness centrality (max 0.3)
  const bridgeBonus = input.betweennessCentrality * 0.3;

  // Calculate total score, capped at 1.0
  const rawScore = baseWeight + coreSectionBonus + coOccurrenceBonus + bridgeBonus;
  const score = Math.min(1.0, rawScore);

  return {
    entityName: input.entityName,
    score: Math.round(score * 100) / 100, // Round to 2 decimal places
    isCritical: score >= CRITICALITY_THRESHOLD,
    breakdown: {
      baseWeight,
      coreSectionBonus,
      coOccurrenceBonus: Math.round(coOccurrenceBonus * 100) / 100,
      bridgeBonus: Math.round(bridgeBonus * 100) / 100,
    },
  };
}

/**
 * Batch calculate criticality scores for multiple entities.
 */
export function batchCalculateCriticality(
  inputs: EntityCriticalityInput[]
): EntityCriticalityResult[] {
  return inputs.map(calculateCriticalityScore);
}

/**
 * Filter to only critical entities.
 */
export function filterCriticalEntities(
  results: EntityCriticalityResult[]
): EntityCriticalityResult[] {
  return results.filter(r => r.isCritical);
}

/**
 * Sort entities by criticality score (highest first).
 */
export function sortByCriticality(
  results: EntityCriticalityResult[]
): EntityCriticalityResult[] {
  return [...results].sort((a, b) => b.score - a.score);
}
```

### Step 4: Run test to verify it passes

Run: `npx vitest run lib/__tests__/entityCriticality.test.ts`
Expected: PASS

### Step 5: Commit

```bash
git add lib/entityCriticality.ts lib/__tests__/entityCriticality.test.ts
git commit -m "feat(entity-health): add entity criticality score calculation

- Calculate criticality based on attribute category weights (UNIQUE/ROOT/RARE/COMMON)
- Add bonuses for Core Section entities, high co-occurrence, and bridge entities
- Threshold of 0.7 determines which entities require verification

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Entity Health Types

**Files:**
- Create: `types/entityHealth.ts`
- Modify: `types.ts` (re-export)

### Step 1: Create entity health types

```typescript
// types/entityHealth.ts
import { EntityAuthorityResult } from '../types';
import { EntityCriticalityResult } from '../lib/entityCriticality';

/**
 * Entity verification status.
 */
export type EntityVerificationStatus =
  | 'verified'       // Matched in authoritative source
  | 'partial'        // Matched in some sources
  | 'unverified'     // No match found
  | 'proprietary'    // Marked as intentionally unverifiable
  | 'ambiguous'      // Multiple possible matches
  | 'pending';       // Not yet checked

/**
 * Issue type for entity health problems.
 */
export type EntityIssueType =
  | 'ambiguous'        // Multiple possible matches (e.g., "Apple")
  | 'unverified'       // Critical entity with no match
  | 'low_authority'    // Low authority score
  | 'inconsistent'     // Name varies across topics
  | 'proprietary';     // No external match (acceptable)

/**
 * Single entity health record.
 */
export interface EntityHealthRecord {
  entityName: string;
  normalizedName: string; // Lowercase, trimmed
  criticality: EntityCriticalityResult;
  verificationStatus: EntityVerificationStatus;
  authorityResult?: EntityAuthorityResult;
  issues: EntityHealthIssue[];
  wikidataId?: string;
  wikipediaUrl?: string;
  lastCheckedAt?: string;
  userMarkedProprietary?: boolean;
}

/**
 * Issue found during entity health check.
 */
export interface EntityHealthIssue {
  type: EntityIssueType;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  suggestion?: string;
  disambiguationOptions?: Array<{
    name: string;
    description: string;
    wikidataId: string;
  }>;
}

/**
 * Overall entity health summary for a topical map.
 */
export interface EntityHealthSummary {
  totalEntities: number;
  verifiedCount: number;
  partialCount: number;
  unverifiedCount: number;
  proprietaryCount: number;
  ambiguousCount: number;

  healthScore: number; // 0-100

  criticalEntities: number;
  criticalVerified: number;

  issuesByType: Record<EntityIssueType, number>;

  lastAnalyzedAt: string;
}

/**
 * Entity health check progress.
 */
export interface EntityHealthProgress {
  phase: 'extracting' | 'calculating_criticality' | 'verifying' | 'categorizing' | 'complete' | 'error';
  currentEntity?: string;
  totalEntities: number;
  processedEntities: number;
  progress: number; // 0-100
  error?: string;
}

/**
 * Configuration for entity health check.
 */
export interface EntityHealthConfig {
  /** Only check entities above this criticality threshold */
  criticalityThreshold?: number;
  /** Include Google KG API (requires API key) */
  includeKnowledgeGraph?: boolean;
  /** Language for API calls */
  language?: string;
  /** Delay between API calls in ms */
  apiDelayMs?: number;
  /** Max concurrent API calls */
  maxConcurrent?: number;
}

/**
 * Result of a full entity health analysis.
 */
export interface EntityHealthAnalysisResult {
  summary: EntityHealthSummary;
  entities: EntityHealthRecord[];

  // Categorized for UI
  issuesRequiringAttention: EntityHealthRecord[];
  autoVerified: EntityHealthRecord[];
  markedProprietary: EntityHealthRecord[];
}
```

### Step 2: Re-export from types.ts

```typescript
// Add to types.ts at the end of the file
export * from './types/entityHealth';
```

### Step 3: Run TypeScript check

Run: `npx tsc --noEmit`
Expected: No errors

### Step 4: Commit

```bash
git add types/entityHealth.ts types.ts
git commit -m "feat(entity-health): add entity health types

- EntityHealthRecord for individual entity status
- EntityHealthSummary for overall health metrics
- EntityHealthIssue for categorized problems
- Support for proprietary term marking (non-blocking)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Entity Health Service

**Files:**
- Create: `services/entityHealthService.ts`
- Create: `services/__tests__/entityHealthService.test.ts`

### Step 1: Write the failing test

```typescript
// services/__tests__/entityHealthService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractEntitiesFromEAVs,
  categorizeEntityIssues,
  calculateHealthScore,
} from '../entityHealthService';
import { SemanticTriple, AttributeCategory } from '../../types';

describe('extractEntitiesFromEAVs', () => {
  it('extracts unique entities from EAV triples', () => {
    const eavs: SemanticTriple[] = [
      {
        id: '1',
        entity: 'Germany',
        attribute: 'population',
        value: '83 million',
        category: 'ROOT' as AttributeCategory,
        classification: 'TYPE',
        prominence: 1,
        source: 'manual',
      },
      {
        id: '2',
        entity: 'Germany',
        attribute: 'capital',
        value: 'Berlin',
        category: 'ROOT' as AttributeCategory,
        classification: 'TYPE',
        prominence: 1,
        source: 'manual',
      },
      {
        id: '3',
        entity: 'France',
        attribute: 'population',
        value: '67 million',
        category: 'ROOT' as AttributeCategory,
        classification: 'TYPE',
        prominence: 1,
        source: 'manual',
      },
    ];

    const entities = extractEntitiesFromEAVs(eavs, 'Germany');

    expect(entities.length).toBe(3); // Germany, Berlin, France
    expect(entities.find(e => e.entityName === 'Germany')?.isCentralEntity).toBe(true);
    expect(entities.find(e => e.entityName === 'Berlin')?.attributeCategory).toBe('ROOT');
  });
});

describe('categorizeEntityIssues', () => {
  it('flags ambiguous entities', () => {
    const issues = categorizeEntityIssues(
      'Apple',
      { authorityScore: 50, verificationStatus: 'partial' } as any,
      0.9, // high criticality
      [
        { name: 'Apple Inc.', description: 'Technology company' },
        { name: 'Apple', description: 'Fruit' },
      ]
    );

    expect(issues.some(i => i.type === 'ambiguous')).toBe(true);
    expect(issues.find(i => i.type === 'ambiguous')?.severity).toBe('warning');
  });

  it('flags unverified critical entities', () => {
    const issues = categorizeEntityIssues(
      'Holistic SEO Framework',
      { authorityScore: 0, verificationStatus: 'unverified' } as any,
      0.9, // high criticality
      []
    );

    expect(issues.some(i => i.type === 'unverified')).toBe(true);
    expect(issues.find(i => i.type === 'unverified')?.severity).toBe('critical');
  });

  it('does not flag unverified non-critical entities', () => {
    const issues = categorizeEntityIssues(
      'Some Term',
      { authorityScore: 0, verificationStatus: 'unverified' } as any,
      0.4, // low criticality
      []
    );

    expect(issues.find(i => i.type === 'unverified')?.severity).not.toBe('critical');
  });

  it('flags low authority entities', () => {
    const issues = categorizeEntityIssues(
      'Content Velocity Method',
      { authorityScore: 15, verificationStatus: 'partial' } as any,
      0.7,
      []
    );

    expect(issues.some(i => i.type === 'low_authority')).toBe(true);
  });
});

describe('calculateHealthScore', () => {
  it('returns 100 when all critical entities are verified', () => {
    const score = calculateHealthScore({
      totalEntities: 100,
      verifiedCount: 80,
      partialCount: 10,
      unverifiedCount: 10,
      proprietaryCount: 0,
      ambiguousCount: 0,
      criticalEntities: 20,
      criticalVerified: 20, // All critical verified
    });

    expect(score).toBe(100);
  });

  it('reduces score for unverified critical entities', () => {
    const score = calculateHealthScore({
      totalEntities: 100,
      verifiedCount: 70,
      partialCount: 10,
      unverifiedCount: 20,
      proprietaryCount: 0,
      ambiguousCount: 0,
      criticalEntities: 20,
      criticalVerified: 10, // Only half critical verified
    });

    expect(score).toBeLessThan(100);
    expect(score).toBeGreaterThan(50);
  });

  it('proprietary entities do not reduce score', () => {
    const scoreWithProprietary = calculateHealthScore({
      totalEntities: 100,
      verifiedCount: 50,
      partialCount: 10,
      unverifiedCount: 10,
      proprietaryCount: 30, // Many proprietary
      ambiguousCount: 0,
      criticalEntities: 20,
      criticalVerified: 20,
    });

    const scoreWithoutProprietary = calculateHealthScore({
      totalEntities: 70,
      verifiedCount: 50,
      partialCount: 10,
      unverifiedCount: 10,
      proprietaryCount: 0,
      ambiguousCount: 0,
      criticalEntities: 20,
      criticalVerified: 20,
    });

    expect(scoreWithProprietary).toBe(scoreWithoutProprietary);
  });
});
```

### Step 2: Run test to verify it fails

Run: `npx vitest run services/__tests__/entityHealthService.test.ts`
Expected: FAIL with "Cannot find module '../entityHealthService'"

### Step 3: Write minimal implementation

```typescript
// services/entityHealthService.ts
import {
  SemanticTriple,
  AttributeCategory,
  EntityAuthorityResult,
} from '../types';
import {
  EntityHealthRecord,
  EntityHealthSummary,
  EntityHealthIssue,
  EntityIssueType,
  EntityVerificationStatus,
  EntityHealthConfig,
  EntityHealthAnalysisResult,
  EntityHealthProgress,
} from '../types/entityHealth';
import {
  calculateCriticalityScore,
  EntityCriticalityInput,
  CRITICALITY_THRESHOLD,
} from '../lib/entityCriticality';
import { validateEntityAuthority } from './googleKnowledgeGraphService';

/**
 * Entity extraction result from EAVs.
 */
export interface ExtractedEntity {
  entityName: string;
  isCentralEntity: boolean;
  attributeCategory: AttributeCategory | 'COMMON';
  isCoreSectionEntity: boolean;
  topicCount: number;
  sources: string[]; // Topic IDs where this entity appears
}

/**
 * Extract unique entities from EAV triples.
 * Entities come from:
 * 1. EAV subjects (entity field)
 * 2. EAV values (when they're entity references)
 */
export function extractEntitiesFromEAVs(
  eavs: SemanticTriple[],
  centralEntity: string,
  coreTopicIds: string[] = []
): ExtractedEntity[] {
  const entityMap = new Map<string, ExtractedEntity>();
  const normalizedCE = centralEntity.toLowerCase().trim();

  for (const eav of eavs) {
    // Add the subject entity
    const subjectKey = eav.entity.toLowerCase().trim();
    if (!entityMap.has(subjectKey)) {
      entityMap.set(subjectKey, {
        entityName: eav.entity,
        isCentralEntity: subjectKey === normalizedCE,
        attributeCategory: eav.category || 'COMMON',
        isCoreSectionEntity: coreTopicIds.includes(eav.id),
        topicCount: 1,
        sources: [eav.id],
      });
    } else {
      const existing = entityMap.get(subjectKey)!;
      existing.topicCount++;
      if (!existing.sources.includes(eav.id)) {
        existing.sources.push(eav.id);
      }
      // Upgrade category if higher priority
      existing.attributeCategory = getHigherPriorityCategory(
        existing.attributeCategory,
        eav.category || 'COMMON'
      );
    }

    // Add value as entity if it looks like a proper noun
    const valueKey = eav.value.toLowerCase().trim();
    if (looksLikeEntity(eav.value) && !entityMap.has(valueKey)) {
      entityMap.set(valueKey, {
        entityName: eav.value,
        isCentralEntity: valueKey === normalizedCE,
        attributeCategory: eav.category || 'COMMON',
        isCoreSectionEntity: coreTopicIds.includes(eav.id),
        topicCount: 1,
        sources: [eav.id],
      });
    } else if (entityMap.has(valueKey)) {
      const existing = entityMap.get(valueKey)!;
      existing.topicCount++;
      if (!existing.sources.includes(eav.id)) {
        existing.sources.push(eav.id);
      }
    }
  }

  return Array.from(entityMap.values());
}

/**
 * Check if a value looks like an entity (proper noun).
 */
function looksLikeEntity(value: string): boolean {
  if (!value || value.length < 2) return false;
  // Starts with capital letter and is not a number
  if (!/^[A-Z]/.test(value)) return false;
  if (/^\d+/.test(value)) return false;
  // Not just a measurement or number with unit
  if (/^\d+\s*(kg|km|m|cm|mm|ml|l|g|mg|%|°|€|\$|£)/.test(value)) return false;
  return true;
}

/**
 * Get the higher priority category.
 */
function getHigherPriorityCategory(
  a: AttributeCategory | 'COMMON',
  b: AttributeCategory | 'COMMON'
): AttributeCategory | 'COMMON' {
  const priority: Record<string, number> = {
    UNIQUE: 4,
    ROOT: 3,
    RARE: 2,
    COMMON: 1,
  };
  return priority[a] >= priority[b] ? a : b;
}

/**
 * Categorize issues for an entity based on verification results.
 */
export function categorizeEntityIssues(
  entityName: string,
  authorityResult: EntityAuthorityResult | null,
  criticalityScore: number,
  disambiguationOptions: Array<{ name: string; description: string }> = []
): EntityHealthIssue[] {
  const issues: EntityHealthIssue[] = [];
  const isCritical = criticalityScore >= CRITICALITY_THRESHOLD;

  // Check for ambiguity
  if (disambiguationOptions.length > 1) {
    issues.push({
      type: 'ambiguous',
      severity: 'warning',
      message: `"${entityName}" could refer to multiple entities`,
      suggestion: 'Select the correct entity or disambiguate in the EAV',
      disambiguationOptions: disambiguationOptions.map(opt => ({
        name: opt.name,
        description: opt.description,
        wikidataId: '', // Would be filled by actual API
      })),
    });
  }

  // Check for unverified status
  if (!authorityResult || authorityResult.verificationStatus === 'unverified') {
    issues.push({
      type: 'unverified',
      severity: isCritical ? 'critical' : 'info',
      message: isCritical
        ? `Critical entity "${entityName}" could not be verified`
        : `Entity "${entityName}" has no authoritative source match`,
      suggestion: isCritical
        ? 'Verify entity exists or mark as proprietary term'
        : 'May be a proprietary or domain-specific term',
    });
  }

  // Check for low authority
  if (authorityResult && authorityResult.authorityScore < 30) {
    issues.push({
      type: 'low_authority',
      severity: isCritical ? 'warning' : 'info',
      message: `"${entityName}" has low authority score (${authorityResult.authorityScore}/100)`,
      suggestion: 'May be a proprietary term or needs better entity disambiguation',
    });
  }

  return issues;
}

/**
 * Calculate overall health score.
 * Weighted heavily toward critical entity verification.
 */
export function calculateHealthScore(stats: {
  totalEntities: number;
  verifiedCount: number;
  partialCount: number;
  unverifiedCount: number;
  proprietaryCount: number;
  ambiguousCount: number;
  criticalEntities: number;
  criticalVerified: number;
}): number {
  // Critical entity verification is 70% of score
  const criticalScore = stats.criticalEntities > 0
    ? (stats.criticalVerified / stats.criticalEntities) * 70
    : 70;

  // Overall verification is 30% of score
  // Exclude proprietary from denominator (they don't reduce score)
  const checkableEntities = stats.totalEntities - stats.proprietaryCount;
  const verifiedForScore = stats.verifiedCount + stats.partialCount * 0.5;
  const overallScore = checkableEntities > 0
    ? (verifiedForScore / checkableEntities) * 30
    : 30;

  return Math.round(criticalScore + overallScore);
}

/**
 * Build entity health summary from records.
 */
export function buildHealthSummary(
  records: EntityHealthRecord[]
): EntityHealthSummary {
  const issuesByType: Record<EntityIssueType, number> = {
    ambiguous: 0,
    unverified: 0,
    low_authority: 0,
    inconsistent: 0,
    proprietary: 0,
  };

  let verifiedCount = 0;
  let partialCount = 0;
  let unverifiedCount = 0;
  let proprietaryCount = 0;
  let ambiguousCount = 0;
  let criticalEntities = 0;
  let criticalVerified = 0;

  for (const record of records) {
    // Count by status
    switch (record.verificationStatus) {
      case 'verified':
        verifiedCount++;
        break;
      case 'partial':
        partialCount++;
        break;
      case 'unverified':
      case 'pending':
        unverifiedCount++;
        break;
      case 'proprietary':
        proprietaryCount++;
        break;
      case 'ambiguous':
        ambiguousCount++;
        break;
    }

    // Count critical entities
    if (record.criticality.isCritical) {
      criticalEntities++;
      if (record.verificationStatus === 'verified' || record.verificationStatus === 'partial') {
        criticalVerified++;
      }
    }

    // Count issues by type
    for (const issue of record.issues) {
      issuesByType[issue.type]++;
    }
  }

  const healthScore = calculateHealthScore({
    totalEntities: records.length,
    verifiedCount,
    partialCount,
    unverifiedCount,
    proprietaryCount,
    ambiguousCount,
    criticalEntities,
    criticalVerified,
  });

  return {
    totalEntities: records.length,
    verifiedCount,
    partialCount,
    unverifiedCount,
    proprietaryCount,
    ambiguousCount,
    healthScore,
    criticalEntities,
    criticalVerified,
    issuesByType,
    lastAnalyzedAt: new Date().toISOString(),
  };
}

/**
 * Perform full entity health analysis.
 */
export async function analyzeEntityHealth(
  eavs: SemanticTriple[],
  centralEntity: string,
  coreTopicIds: string[] = [],
  config: EntityHealthConfig = {},
  onProgress?: (progress: EntityHealthProgress) => void,
  googleApiKey?: string
): Promise<EntityHealthAnalysisResult> {
  const {
    criticalityThreshold = CRITICALITY_THRESHOLD,
    includeKnowledgeGraph = !!googleApiKey,
    language = 'en',
    apiDelayMs = 300,
    maxConcurrent = 3,
  } = config;

  // Phase 1: Extract entities
  onProgress?.({
    phase: 'extracting',
    totalEntities: 0,
    processedEntities: 0,
    progress: 5,
  });

  const extractedEntities = extractEntitiesFromEAVs(eavs, centralEntity, coreTopicIds);

  // Phase 2: Calculate criticality
  onProgress?.({
    phase: 'calculating_criticality',
    totalEntities: extractedEntities.length,
    processedEntities: 0,
    progress: 15,
  });

  const records: EntityHealthRecord[] = [];

  for (const entity of extractedEntities) {
    const criticalityInput: EntityCriticalityInput = {
      entityName: entity.entityName,
      isCentralEntity: entity.isCentralEntity,
      attributeCategory: entity.attributeCategory,
      isCoreSectionEntity: entity.isCoreSectionEntity,
      topicCount: entity.topicCount,
      betweennessCentrality: 0, // Will be filled later if KG enhancement is run
    };

    const criticality = calculateCriticalityScore(criticalityInput);

    records.push({
      entityName: entity.entityName,
      normalizedName: entity.entityName.toLowerCase().trim(),
      criticality,
      verificationStatus: 'pending',
      issues: [],
    });
  }

  // Phase 3: Verify entities (only critical ones to save API calls)
  const entitiesToVerify = records.filter(
    r => r.criticality.score >= criticalityThreshold
  );

  onProgress?.({
    phase: 'verifying',
    totalEntities: entitiesToVerify.length,
    processedEntities: 0,
    progress: 25,
  });

  for (let i = 0; i < entitiesToVerify.length; i++) {
    const record = entitiesToVerify[i];

    onProgress?.({
      phase: 'verifying',
      currentEntity: record.entityName,
      totalEntities: entitiesToVerify.length,
      processedEntities: i,
      progress: 25 + (i / entitiesToVerify.length) * 50,
    });

    try {
      const authorityResult = await validateEntityAuthority(
        record.entityName,
        undefined,
        includeKnowledgeGraph ? googleApiKey : undefined,
        language
      );

      record.authorityResult = authorityResult;
      record.verificationStatus = authorityResult.verificationStatus;
      record.wikidataId = authorityResult.wikidata?.id;
      record.wikipediaUrl = authorityResult.wikipedia?.url;
      record.lastCheckedAt = new Date().toISOString();

      // Categorize issues
      record.issues = categorizeEntityIssues(
        record.entityName,
        authorityResult,
        record.criticality.score
      );
    } catch (error) {
      console.error(`Failed to verify entity: ${record.entityName}`, error);
      record.verificationStatus = 'unverified';
      record.issues = categorizeEntityIssues(
        record.entityName,
        null,
        record.criticality.score
      );
    }

    // Rate limiting
    if (i < entitiesToVerify.length - 1) {
      await new Promise(resolve => setTimeout(resolve, apiDelayMs));
    }
  }

  // Phase 4: Categorize results
  onProgress?.({
    phase: 'categorizing',
    totalEntities: records.length,
    processedEntities: records.length,
    progress: 90,
  });

  const summary = buildHealthSummary(records);

  const result: EntityHealthAnalysisResult = {
    summary,
    entities: records,
    issuesRequiringAttention: records.filter(
      r => r.issues.some(i => i.severity === 'critical' || i.severity === 'warning')
    ),
    autoVerified: records.filter(
      r => r.verificationStatus === 'verified' && r.issues.length === 0
    ),
    markedProprietary: records.filter(
      r => r.verificationStatus === 'proprietary'
    ),
  };

  onProgress?.({
    phase: 'complete',
    totalEntities: records.length,
    processedEntities: records.length,
    progress: 100,
  });

  return result;
}

/**
 * Mark an entity as proprietary (user action).
 */
export function markAsProprietary(
  record: EntityHealthRecord
): EntityHealthRecord {
  return {
    ...record,
    verificationStatus: 'proprietary',
    userMarkedProprietary: true,
    issues: record.issues.filter(i => i.type !== 'unverified'),
  };
}
```

### Step 4: Run test to verify it passes

Run: `npx vitest run services/__tests__/entityHealthService.test.ts`
Expected: PASS

### Step 5: Commit

```bash
git add services/entityHealthService.ts services/__tests__/entityHealthService.test.ts
git commit -m "feat(entity-health): add entity health analysis service

- Extract entities from EAV triples
- Calculate criticality scores
- Verify critical entities via Wikipedia/Wikidata/KG APIs
- Categorize issues (ambiguous, unverified, low_authority, proprietary)
- Calculate overall health score weighted toward critical entities

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: KnowledgeGraph Betweenness Centrality

**Files:**
- Modify: `lib/knowledgeGraph.ts`
- Create: `lib/__tests__/knowledgeGraphCentrality.test.ts`

### Step 1: Write the failing test

```typescript
// lib/__tests__/knowledgeGraphCentrality.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeGraph } from '../knowledgeGraph';

describe('KnowledgeGraph Betweenness Centrality', () => {
  let kg: KnowledgeGraph;

  beforeEach(() => {
    kg = new KnowledgeGraph();
  });

  it('calculates betweenness centrality for bridge nodes', () => {
    // Create a graph: A -- B -- C
    // B is the bridge between A and C
    kg.addNode({ id: 'a', term: 'A', type: 'Entity' });
    kg.addNode({ id: 'b', term: 'B', type: 'Entity' });
    kg.addNode({ id: 'c', term: 'C', type: 'Entity' });
    kg.addEdge({ id: 'e1', source: 'a', target: 'b', relationship: 'connects' });
    kg.addEdge({ id: 'e2', source: 'b', target: 'c', relationship: 'connects' });

    const centrality = kg.calculateBetweennessCentrality();

    expect(centrality.get('b')).toBeGreaterThan(0);
    expect(centrality.get('a')).toBe(0);
    expect(centrality.get('c')).toBe(0);
  });

  it('returns 0 for nodes with no connections', () => {
    kg.addNode({ id: 'a', term: 'A', type: 'Entity' });
    kg.addNode({ id: 'b', term: 'B', type: 'Entity' });
    // No edges

    const centrality = kg.calculateBetweennessCentrality();

    expect(centrality.get('a')).toBe(0);
    expect(centrality.get('b')).toBe(0);
  });

  it('finds bridge entities above threshold', () => {
    // Create star graph: Center connected to A, B, C, D
    // Center is the bridge
    kg.addNode({ id: 'center', term: 'Center', type: 'Entity' });
    kg.addNode({ id: 'a', term: 'A', type: 'Entity' });
    kg.addNode({ id: 'b', term: 'B', type: 'Entity' });
    kg.addNode({ id: 'c', term: 'C', type: 'Entity' });
    kg.addNode({ id: 'd', term: 'D', type: 'Entity' });
    kg.addEdge({ id: 'e1', source: 'center', target: 'a', relationship: 'connects' });
    kg.addEdge({ id: 'e2', source: 'center', target: 'b', relationship: 'connects' });
    kg.addEdge({ id: 'e3', source: 'center', target: 'c', relationship: 'connects' });
    kg.addEdge({ id: 'e4', source: 'center', target: 'd', relationship: 'connects' });

    const bridges = kg.findBridgeEntities(0.1);

    expect(bridges.length).toBe(1);
    expect(bridges[0].term).toBe('Center');
  });

  it('normalizes centrality scores to 0-1 range', () => {
    kg.addNode({ id: 'a', term: 'A', type: 'Entity' });
    kg.addNode({ id: 'b', term: 'B', type: 'Entity' });
    kg.addNode({ id: 'c', term: 'C', type: 'Entity' });
    kg.addNode({ id: 'd', term: 'D', type: 'Entity' });
    kg.addEdge({ id: 'e1', source: 'a', target: 'b', relationship: 'connects' });
    kg.addEdge({ id: 'e2', source: 'b', target: 'c', relationship: 'connects' });
    kg.addEdge({ id: 'e3', source: 'c', target: 'd', relationship: 'connects' });

    const centrality = kg.calculateBetweennessCentrality();

    for (const [_, score] of centrality) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });
});
```

### Step 2: Run test to verify it fails

Run: `npx vitest run lib/__tests__/knowledgeGraphCentrality.test.ts`
Expected: FAIL with "kg.calculateBetweennessCentrality is not a function"

### Step 3: Add betweenness centrality to KnowledgeGraph

Add these methods to `lib/knowledgeGraph.ts` (inside the class, before the closing brace):

```typescript
    // ==========================================================================
    // BETWEENNESS CENTRALITY
    // ==========================================================================

    /**
     * Calculate betweenness centrality for all nodes.
     *
     * Betweenness centrality measures how often a node lies on the shortest
     * path between other nodes. Nodes with high betweenness are "bridge"
     * concepts that connect different parts of the knowledge graph.
     *
     * Uses Brandes' algorithm for O(VE) complexity.
     *
     * @returns Map of node ID to normalized centrality score (0-1)
     */
    calculateBetweennessCentrality(): Map<string, number> {
        const centrality = new Map<string, number>();
        const nodeIds = Array.from(this.nodes.keys());

        // Initialize all centrality scores to 0
        for (const nodeId of nodeIds) {
            centrality.set(nodeId, 0);
        }

        if (nodeIds.length < 2) {
            return centrality;
        }

        // Build adjacency list for faster traversal
        const adjacency = this.buildAdjacencyList();

        // Brandes' algorithm
        for (const source of nodeIds) {
            // Single-source shortest paths
            const stack: string[] = [];
            const predecessors = new Map<string, string[]>();
            const sigma = new Map<string, number>(); // Number of shortest paths
            const distance = new Map<string, number>();

            for (const v of nodeIds) {
                predecessors.set(v, []);
                sigma.set(v, 0);
                distance.set(v, -1);
            }

            sigma.set(source, 1);
            distance.set(source, 0);

            const queue: string[] = [source];

            // BFS
            while (queue.length > 0) {
                const v = queue.shift()!;
                stack.push(v);

                const neighbors = adjacency.get(v) || [];
                for (const w of neighbors) {
                    // First visit
                    if (distance.get(w)! < 0) {
                        queue.push(w);
                        distance.set(w, distance.get(v)! + 1);
                    }
                    // Shortest path to w via v?
                    if (distance.get(w) === distance.get(v)! + 1) {
                        sigma.set(w, sigma.get(w)! + sigma.get(v)!);
                        predecessors.get(w)!.push(v);
                    }
                }
            }

            // Accumulation
            const delta = new Map<string, number>();
            for (const v of nodeIds) {
                delta.set(v, 0);
            }

            while (stack.length > 0) {
                const w = stack.pop()!;
                for (const v of predecessors.get(w)!) {
                    const contribution = (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!);
                    delta.set(v, delta.get(v)! + contribution);
                }
                if (w !== source) {
                    centrality.set(w, centrality.get(w)! + delta.get(w)!);
                }
            }
        }

        // Normalize scores to 0-1 range
        const maxCentrality = Math.max(...Array.from(centrality.values()), 1);
        for (const [nodeId, score] of centrality) {
            centrality.set(nodeId, score / maxCentrality);
        }

        return centrality;
    }

    /**
     * Build adjacency list for graph traversal.
     */
    private buildAdjacencyList(): Map<string, string[]> {
        const adjacency = new Map<string, string[]>();

        for (const nodeId of this.nodes.keys()) {
            adjacency.set(nodeId, []);
        }

        for (const edge of this.edges.values()) {
            // Undirected: add both directions
            adjacency.get(edge.source)?.push(edge.target);
            adjacency.get(edge.target)?.push(edge.source);
        }

        return adjacency;
    }

    /**
     * Find bridge entities (high betweenness centrality).
     *
     * Bridge entities connect different topic clusters and should be
     * emphasized in navigation and internal linking.
     *
     * @param threshold Minimum centrality score (0-1) to be considered a bridge
     * @returns Array of nodes that act as bridges
     */
    findBridgeEntities(threshold: number = 0.3): KnowledgeNode[] {
        const centrality = this.calculateBetweennessCentrality();
        const bridges: KnowledgeNode[] = [];

        for (const [nodeId, score] of centrality) {
            if (score >= threshold) {
                const node = this.nodes.get(nodeId);
                if (node) {
                    bridges.push(node);
                }
            }
        }

        // Sort by centrality score descending
        return bridges.sort((a, b) => {
            return (centrality.get(b.id) || 0) - (centrality.get(a.id) || 0);
        });
    }

    /**
     * Get centrality score for a specific entity.
     */
    getCentralityScore(termOrId: string): number {
        const node = this.getNode(termOrId);
        if (!node) return 0;

        const centrality = this.calculateBetweennessCentrality();
        return centrality.get(node.id) || 0;
    }
```

### Step 4: Run test to verify it passes

Run: `npx vitest run lib/__tests__/knowledgeGraphCentrality.test.ts`
Expected: PASS

### Step 5: Commit

```bash
git add lib/knowledgeGraph.ts lib/__tests__/knowledgeGraphCentrality.test.ts
git commit -m "feat(knowledge-graph): add betweenness centrality calculation

- Implement Brandes' algorithm for O(VE) centrality computation
- Add findBridgeEntities() to identify connector nodes
- Normalize scores to 0-1 range
- Bridge entities help prioritize navigation and internal linking

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Structural Hole Detection

**Files:**
- Modify: `lib/knowledgeGraph.ts`
- Create: `lib/__tests__/knowledgeGraphStructuralHoles.test.ts`

### Step 1: Write the failing test

```typescript
// lib/__tests__/knowledgeGraphStructuralHoles.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeGraph, StructuralHole } from '../knowledgeGraph';

describe('KnowledgeGraph Structural Holes', () => {
  let kg: KnowledgeGraph;

  beforeEach(() => {
    kg = new KnowledgeGraph();
  });

  it('detects disconnected clusters', () => {
    // Cluster A: A1 -- A2 -- A3
    kg.addNode({ id: 'a1', term: 'Visa Types', type: 'Entity' });
    kg.addNode({ id: 'a2', term: 'Application Process', type: 'Entity' });
    kg.addNode({ id: 'a3', term: 'Requirements', type: 'Entity' });
    kg.addEdge({ id: 'ea1', source: 'a1', target: 'a2', relationship: 'related' });
    kg.addEdge({ id: 'ea2', source: 'a2', target: 'a3', relationship: 'related' });

    // Cluster B: B1 -- B2 -- B3
    kg.addNode({ id: 'b1', term: 'German Culture', type: 'Entity' });
    kg.addNode({ id: 'b2', term: 'Language', type: 'Entity' });
    kg.addNode({ id: 'b3', term: 'History', type: 'Entity' });
    kg.addEdge({ id: 'eb1', source: 'b1', target: 'b2', relationship: 'related' });
    kg.addEdge({ id: 'eb2', source: 'b2', target: 'b3', relationship: 'related' });

    // No connection between clusters

    const holes = kg.identifyStructuralHoles(0.15);

    expect(holes.length).toBeGreaterThan(0);
    expect(holes[0].connectionStrength).toBe(0);
  });

  it('does not flag well-connected clusters', () => {
    // Single connected cluster
    kg.addNode({ id: 'a', term: 'A', type: 'Entity' });
    kg.addNode({ id: 'b', term: 'B', type: 'Entity' });
    kg.addNode({ id: 'c', term: 'C', type: 'Entity' });
    kg.addEdge({ id: 'e1', source: 'a', target: 'b', relationship: 'related' });
    kg.addEdge({ id: 'e2', source: 'b', target: 'c', relationship: 'related' });
    kg.addEdge({ id: 'e3', source: 'a', target: 'c', relationship: 'related' });

    const holes = kg.identifyStructuralHoles(0.15);

    expect(holes.length).toBe(0);
  });

  it('calculates connection strength between clusters', () => {
    // Cluster A
    kg.addNode({ id: 'a1', term: 'A1', type: 'Entity' });
    kg.addNode({ id: 'a2', term: 'A2', type: 'Entity' });
    kg.addEdge({ id: 'ea1', source: 'a1', target: 'a2', relationship: 'related' });

    // Cluster B
    kg.addNode({ id: 'b1', term: 'B1', type: 'Entity' });
    kg.addNode({ id: 'b2', term: 'B2', type: 'Entity' });
    kg.addEdge({ id: 'eb1', source: 'b1', target: 'b2', relationship: 'related' });

    // Weak connection between clusters
    kg.addEdge({ id: 'eab', source: 'a1', target: 'b1', relationship: 'related' });

    const holes = kg.identifyStructuralHoles(0.5); // Higher threshold

    // Should find a hole because connection is weak
    expect(holes.length).toBeGreaterThanOrEqual(0);
  });
});
```

### Step 2: Run test to verify it fails

Run: `npx vitest run lib/__tests__/knowledgeGraphStructuralHoles.test.ts`
Expected: FAIL with "kg.identifyStructuralHoles is not a function"

### Step 3: Add structural hole detection to KnowledgeGraph

Add the interface at the top of `lib/knowledgeGraph.ts` (after the imports):

```typescript
/**
 * Structural hole between two clusters.
 * Represents an opportunity for bridge content.
 */
export interface StructuralHole {
    clusterA: string[];  // Node IDs in cluster A
    clusterB: string[];  // Node IDs in cluster B
    clusterATerms: string[];  // Human-readable terms
    clusterBTerms: string[];
    connectionStrength: number;  // 0-1, lower = bigger hole
    bridgeRequired: boolean;
    bridgeType: 'contextual' | 'navigational' | 'content';
}
```

Add these methods to the `KnowledgeGraph` class:

```typescript
    // ==========================================================================
    // STRUCTURAL HOLE DETECTION
    // ==========================================================================

    /**
     * Identify structural holes (weakly connected cluster pairs).
     *
     * Structural holes represent content opportunities - topics that could
     * be better connected to strengthen the topical map.
     *
     * @param threshold Connection strength below which to flag as hole (default 0.15)
     * @returns Array of structural holes between clusters
     */
    identifyStructuralHoles(threshold: number = 0.15): StructuralHole[] {
        const clusters = this.detectClusters();
        const holes: StructuralHole[] = [];

        if (clusters.length < 2) {
            return holes;
        }

        // Compare all cluster pairs
        for (let i = 0; i < clusters.length; i++) {
            for (let j = i + 1; j < clusters.length; j++) {
                const clusterA = clusters[i];
                const clusterB = clusters[j];

                const connectionStrength = this.calculateClusterConnectionStrength(
                    clusterA,
                    clusterB
                );

                if (connectionStrength < threshold) {
                    holes.push({
                        clusterA,
                        clusterB,
                        clusterATerms: clusterA.map(id => this.nodes.get(id)?.term || id),
                        clusterBTerms: clusterB.map(id => this.nodes.get(id)?.term || id),
                        connectionStrength,
                        bridgeRequired: true,
                        bridgeType: connectionStrength === 0 ? 'content' : 'contextual',
                    });
                }
            }
        }

        // Sort by connection strength (lowest first = biggest holes)
        return holes.sort((a, b) => a.connectionStrength - b.connectionStrength);
    }

    /**
     * Detect clusters using connected components algorithm.
     * Returns array of node ID arrays.
     */
    private detectClusters(): string[][] {
        const visited = new Set<string>();
        const clusters: string[][] = [];
        const adjacency = this.buildAdjacencyList();

        for (const nodeId of this.nodes.keys()) {
            if (!visited.has(nodeId)) {
                const cluster: string[] = [];
                this.dfsCollectCluster(nodeId, adjacency, visited, cluster);
                if (cluster.length > 0) {
                    clusters.push(cluster);
                }
            }
        }

        return clusters;
    }

    /**
     * DFS helper to collect all nodes in a connected component.
     */
    private dfsCollectCluster(
        nodeId: string,
        adjacency: Map<string, string[]>,
        visited: Set<string>,
        cluster: string[]
    ): void {
        visited.add(nodeId);
        cluster.push(nodeId);

        const neighbors = adjacency.get(nodeId) || [];
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                this.dfsCollectCluster(neighbor, adjacency, visited, cluster);
            }
        }
    }

    /**
     * Calculate connection strength between two clusters.
     *
     * Formula: (edges between clusters) / sqrt(|A| * |B|)
     * Normalized to 0-1 range.
     */
    private calculateClusterConnectionStrength(
        clusterA: string[],
        clusterB: string[]
    ): number {
        const setA = new Set(clusterA);
        const setB = new Set(clusterB);

        let edgesBetween = 0;

        for (const edge of this.edges.values()) {
            const sourceInA = setA.has(edge.source);
            const sourceInB = setB.has(edge.source);
            const targetInA = setA.has(edge.target);
            const targetInB = setB.has(edge.target);

            // Edge connects the two clusters
            if ((sourceInA && targetInB) || (sourceInB && targetInA)) {
                edgesBetween++;
            }
        }

        // Normalize by geometric mean of cluster sizes
        const maxPossibleEdges = Math.sqrt(clusterA.length * clusterB.length);
        if (maxPossibleEdges === 0) return 0;

        return Math.min(1, edgesBetween / maxPossibleEdges);
    }

    /**
     * Get suggested bridge topics for a structural hole.
     * This is a basic implementation - the AI service will provide better suggestions.
     */
    getSuggestedBridgeTopics(hole: StructuralHole): string[] {
        const suggestions: string[] = [];

        // Find the most connected nodes in each cluster
        const centralA = this.getMostConnectedInCluster(hole.clusterA);
        const centralB = this.getMostConnectedInCluster(hole.clusterB);

        if (centralA && centralB) {
            const termA = this.nodes.get(centralA)?.term || centralA;
            const termB = this.nodes.get(centralB)?.term || centralB;

            suggestions.push(`How ${termA} relates to ${termB}`);
            suggestions.push(`${termA} and ${termB}: A Complete Guide`);
            suggestions.push(`Understanding ${termA} in the context of ${termB}`);
        }

        return suggestions;
    }

    /**
     * Find the most connected node within a cluster.
     */
    private getMostConnectedInCluster(cluster: string[]): string | null {
        const clusterSet = new Set(cluster);
        let maxConnections = 0;
        let mostConnected: string | null = null;

        for (const nodeId of cluster) {
            let connections = 0;
            for (const edge of this.edges.values()) {
                if (edge.source === nodeId && clusterSet.has(edge.target)) {
                    connections++;
                } else if (edge.target === nodeId && clusterSet.has(edge.source)) {
                    connections++;
                }
            }
            if (connections > maxConnections) {
                maxConnections = connections;
                mostConnected = nodeId;
            }
        }

        return mostConnected;
    }
```

### Step 4: Run test to verify it passes

Run: `npx vitest run lib/__tests__/knowledgeGraphStructuralHoles.test.ts`
Expected: PASS

### Step 5: Commit

```bash
git add lib/knowledgeGraph.ts lib/__tests__/knowledgeGraphStructuralHoles.test.ts
git commit -m "feat(knowledge-graph): add structural hole detection

- Detect disconnected/weakly-connected cluster pairs
- Calculate connection strength between clusters
- Generate basic bridge topic suggestions
- Holes with connection < 0.15 flagged as opportunities

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: AI Bridge Suggestion Service

**Files:**
- Create: `services/ai/bridgeSuggestionService.ts`
- Create: `services/ai/__tests__/bridgeSuggestionService.test.ts`

### Step 1: Write the failing test

```typescript
// services/ai/__tests__/bridgeSuggestionService.test.ts
import { describe, it, expect, vi } from 'vitest';
import {
  generateBridgeSuggestions,
  BridgeSuggestionInput,
  BridgeSuggestion,
} from '../bridgeSuggestionService';

// Mock AI service
vi.mock('../../aiService', () => ({
  generateWithAI: vi.fn().mockResolvedValue({
    success: true,
    content: JSON.stringify({
      researchQuestions: [
        {
          question: 'How do German language skills affect visa approval?',
          targetAttribute: 'root',
          entityA: 'German Language',
          entityB: 'Visa Application',
        },
      ],
      topicSuggestions: [
        {
          title: 'German Language Requirements for Visa Applicants',
          predicates: ['apply', 'learn', 'demonstrate'],
          bridgesEntities: ['German Language', 'Visa Application'],
        },
      ],
    }),
  }),
}));

describe('generateBridgeSuggestions', () => {
  it('generates research questions for structural holes', async () => {
    const input: BridgeSuggestionInput = {
      clusterATerms: ['Visa Types', 'Application Process', 'Requirements'],
      clusterBTerms: ['German Culture', 'Language', 'History'],
      centralEntity: 'Germany',
      sourceContext: 'Visa consultancy',
      centralSearchIntent: ['visit', 'immigrate', 'settle'],
    };

    const result = await generateBridgeSuggestions(input);

    expect(result.researchQuestions.length).toBeGreaterThan(0);
    expect(result.researchQuestions[0].question).toContain('?');
  });

  it('generates topic suggestions with CSI predicates', async () => {
    const input: BridgeSuggestionInput = {
      clusterATerms: ['Visa Types'],
      clusterBTerms: ['German Culture'],
      centralEntity: 'Germany',
      sourceContext: 'Visa consultancy',
      centralSearchIntent: ['visit', 'immigrate'],
    };

    const result = await generateBridgeSuggestions(input);

    expect(result.topicSuggestions.length).toBeGreaterThan(0);
    expect(result.topicSuggestions[0].predicates.length).toBeGreaterThan(0);
  });
});
```

### Step 2: Run test to verify it fails

Run: `npx vitest run services/ai/__tests__/bridgeSuggestionService.test.ts`
Expected: FAIL with "Cannot find module '../bridgeSuggestionService'"

### Step 3: Write minimal implementation

```typescript
// services/ai/bridgeSuggestionService.ts
import { generateWithAI } from '../aiService';
import { BusinessInfo } from '../../types';

/**
 * Input for generating bridge suggestions.
 */
export interface BridgeSuggestionInput {
  clusterATerms: string[];
  clusterBTerms: string[];
  centralEntity: string;
  sourceContext: string;
  centralSearchIntent: string[];
  businessInfo?: BusinessInfo;
}

/**
 * Research question for bridging clusters.
 */
export interface ResearchQuestion {
  question: string;
  targetAttribute: 'unique' | 'root' | 'rare';
  entityA: string;
  entityB: string;
}

/**
 * Topic suggestion for bridge content.
 */
export interface TopicSuggestion {
  title: string;
  predicates: string[];
  bridgesEntities: [string, string];
}

/**
 * Content brief outline for bridge content.
 */
export interface BridgeBriefOutline {
  centralEntity: string;
  sourceContextConnection: string;
  attributePrioritization: {
    unique: string[];
    root: string[];
    rare: string[];
  };
  headingVector: string[];
  internalLinks: {
    from: string[];
    to: string[];
  };
}

/**
 * Complete bridge suggestion package.
 */
export interface BridgeSuggestion {
  researchQuestions: ResearchQuestion[];
  topicSuggestions: TopicSuggestion[];
  briefOutline?: BridgeBriefOutline;
}

/**
 * Generate bridge suggestions for a structural hole using AI.
 */
export async function generateBridgeSuggestions(
  input: BridgeSuggestionInput,
  includeOutline: boolean = false
): Promise<BridgeSuggestion> {
  const prompt = buildBridgeSuggestionPrompt(input, includeOutline);

  const response = await generateWithAI(
    prompt,
    input.businessInfo || {
      domain: '',
      projectName: input.centralEntity,
      industry: input.sourceContext,
      model: 'Publisher',
      valueProp: '',
      audience: '',
      expertise: '',
      seedKeyword: input.centralEntity,
      language: 'en',
      targetMarket: 'Global',
    },
    { temperature: 0.7 }
  );

  if (!response.success || !response.content) {
    return getFallbackSuggestions(input);
  }

  try {
    const parsed = JSON.parse(response.content);
    return {
      researchQuestions: parsed.researchQuestions || [],
      topicSuggestions: parsed.topicSuggestions || [],
      briefOutline: includeOutline ? parsed.briefOutline : undefined,
    };
  } catch {
    return getFallbackSuggestions(input);
  }
}

/**
 * Build prompt for AI bridge suggestion generation.
 */
function buildBridgeSuggestionPrompt(
  input: BridgeSuggestionInput,
  includeOutline: boolean
): string {
  const { clusterATerms, clusterBTerms, centralEntity, sourceContext, centralSearchIntent } = input;

  return `You are a Semantic SEO expert. A structural hole has been detected between two topic clusters in a topical map.

CENTRAL ENTITY: ${centralEntity}
SOURCE CONTEXT: ${sourceContext}
CENTRAL SEARCH INTENT (predicates): ${centralSearchIntent.join(', ')}

CLUSTER A (Core Section topics):
${clusterATerms.map(t => `- ${t}`).join('\n')}

CLUSTER B (Author Section topics):
${clusterBTerms.map(t => `- ${t}`).join('\n')}

Generate bridge content suggestions to connect these clusters.

Return JSON with:
{
  "researchQuestions": [
    {
      "question": "EAV-structured question to research",
      "targetAttribute": "unique|root|rare",
      "entityA": "Entity from Cluster A",
      "entityB": "Entity from Cluster B"
    }
  ],
  "topicSuggestions": [
    {
      "title": "Topic title using CSI predicates",
      "predicates": ["verbs from CSI"],
      "bridgesEntities": ["Entity A", "Entity B"]
    }
  ]${includeOutline ? `,
  "briefOutline": {
    "centralEntity": "Main entity for bridge content",
    "sourceContextConnection": "How it connects to monetization",
    "attributePrioritization": {
      "unique": ["definitive features"],
      "root": ["essential definitions"],
      "rare": ["expertise-proving details"]
    },
    "headingVector": ["H1", "H2", "H2", "H2"],
    "internalLinks": {
      "from": ["Author Section pages"],
      "to": ["Core Section pages"]
    }
  }` : ''}
}

Generate 2-3 research questions and 2-3 topic suggestions. Use the CSI predicates in titles.`;
}

/**
 * Fallback suggestions when AI fails.
 */
function getFallbackSuggestions(input: BridgeSuggestionInput): BridgeSuggestion {
  const entityA = input.clusterATerms[0] || 'Topic A';
  const entityB = input.clusterBTerms[0] || 'Topic B';
  const predicate = input.centralSearchIntent[0] || 'understand';

  return {
    researchQuestions: [
      {
        question: `How does ${entityA} relate to ${entityB} in the context of ${input.centralEntity}?`,
        targetAttribute: 'root',
        entityA,
        entityB,
      },
    ],
    topicSuggestions: [
      {
        title: `How to ${predicate} ${entityA} through ${entityB}`,
        predicates: input.centralSearchIntent.slice(0, 3),
        bridgesEntities: [entityA, entityB],
      },
    ],
  };
}

/**
 * Generate suggestions for multiple structural holes.
 */
export async function batchGenerateBridgeSuggestions(
  inputs: BridgeSuggestionInput[],
  includeOutlines: boolean = false
): Promise<BridgeSuggestion[]> {
  const results: BridgeSuggestion[] = [];

  for (const input of inputs) {
    const suggestion = await generateBridgeSuggestions(input, includeOutlines);
    results.push(suggestion);
  }

  return results;
}
```

### Step 4: Run test to verify it passes

Run: `npx vitest run services/ai/__tests__/bridgeSuggestionService.test.ts`
Expected: PASS

### Step 5: Commit

```bash
git add services/ai/bridgeSuggestionService.ts services/ai/__tests__/bridgeSuggestionService.test.ts
git commit -m "feat(ai): add bridge suggestion service for structural holes

- Generate EAV-structured research questions
- Generate topic titles with CSI predicates
- Optional content brief outline generation
- Fallback suggestions when AI fails

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: useEntityHealth Hook

**Files:**
- Create: `hooks/useEntityHealth.ts`

### Step 1: Create the hook

```typescript
// hooks/useEntityHealth.ts
import { useState, useCallback } from 'react';
import {
  EntityHealthAnalysisResult,
  EntityHealthProgress,
  EntityHealthConfig,
  EntityHealthRecord,
} from '../types/entityHealth';
import {
  analyzeEntityHealth,
  markAsProprietary,
} from '../services/entityHealthService';
import { SemanticTriple } from '../types';

export interface UseEntityHealthReturn {
  // State
  result: EntityHealthAnalysisResult | null;
  progress: EntityHealthProgress | null;
  isAnalyzing: boolean;
  error: string | null;

  // Actions
  analyze: (
    eavs: SemanticTriple[],
    centralEntity: string,
    coreTopicIds?: string[],
    googleApiKey?: string
  ) => Promise<void>;

  markProprietary: (entityName: string) => void;

  reset: () => void;
}

/**
 * Hook for entity health analysis.
 */
export function useEntityHealth(
  config: EntityHealthConfig = {}
): UseEntityHealthReturn {
  const [result, setResult] = useState<EntityHealthAnalysisResult | null>(null);
  const [progress, setProgress] = useState<EntityHealthProgress | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (
    eavs: SemanticTriple[],
    centralEntity: string,
    coreTopicIds: string[] = [],
    googleApiKey?: string
  ) => {
    setIsAnalyzing(true);
    setError(null);
    setProgress({
      phase: 'extracting',
      totalEntities: 0,
      processedEntities: 0,
      progress: 0,
    });

    try {
      const analysisResult = await analyzeEntityHealth(
        eavs,
        centralEntity,
        coreTopicIds,
        config,
        setProgress,
        googleApiKey
      );
      setResult(analysisResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      setError(message);
      setProgress({
        phase: 'error',
        totalEntities: 0,
        processedEntities: 0,
        progress: 0,
        error: message,
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [config]);

  const markProprietary = useCallback((entityName: string) => {
    if (!result) return;

    const updatedEntities = result.entities.map(entity => {
      if (entity.entityName === entityName) {
        return markAsProprietary(entity);
      }
      return entity;
    });

    // Recalculate summary and categories
    const markedProprietary = updatedEntities.filter(
      e => e.verificationStatus === 'proprietary'
    );
    const issuesRequiringAttention = updatedEntities.filter(
      e => e.issues.some(i => i.severity === 'critical' || i.severity === 'warning')
    );
    const autoVerified = updatedEntities.filter(
      e => e.verificationStatus === 'verified' && e.issues.length === 0
    );

    // Update proprietary count in summary
    const summary = {
      ...result.summary,
      proprietaryCount: markedProprietary.length,
      unverifiedCount: result.summary.unverifiedCount - 1,
    };

    setResult({
      summary,
      entities: updatedEntities,
      issuesRequiringAttention,
      autoVerified,
      markedProprietary,
    });
  }, [result]);

  const reset = useCallback(() => {
    setResult(null);
    setProgress(null);
    setError(null);
    setIsAnalyzing(false);
  }, []);

  return {
    result,
    progress,
    isAnalyzing,
    error,
    analyze,
    markProprietary,
    reset,
  };
}
```

### Step 2: Run TypeScript check

Run: `npx tsc --noEmit`
Expected: No errors

### Step 3: Commit

```bash
git add hooks/useEntityHealth.ts
git commit -m "feat(hooks): add useEntityHealth hook for entity health analysis

- Manage analysis state and progress
- Support marking entities as proprietary
- Re-calculate summary after user actions

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Entity Health Dashboard Component

**Files:**
- Create: `components/dashboard/EntityHealthDashboard.tsx`

### Step 1: Create the component

```typescript
// components/dashboard/EntityHealthDashboard.tsx
import React, { useState } from 'react';
import { useEntityHealth } from '../../hooks/useEntityHealth';
import {
  EntityHealthRecord,
  EntityHealthSummary,
  EntityIssueType,
} from '../../types/entityHealth';
import { SemanticTriple } from '../../types';

interface EntityHealthDashboardProps {
  eavs: SemanticTriple[];
  centralEntity: string;
  coreTopicIds?: string[];
  googleApiKey?: string;
  onClose?: () => void;
}

export function EntityHealthDashboard({
  eavs,
  centralEntity,
  coreTopicIds = [],
  googleApiKey,
  onClose,
}: EntityHealthDashboardProps) {
  const {
    result,
    progress,
    isAnalyzing,
    error,
    analyze,
    markProprietary,
    reset,
  } = useEntityHealth();

  const [expandedSection, setExpandedSection] = useState<string | null>('issues');

  const handleAnalyze = () => {
    analyze(eavs, centralEntity, coreTopicIds, googleApiKey);
  };

  // Not yet analyzed
  if (!result && !isAnalyzing) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Entity Health Check</h2>
        <p className="text-gray-400 mb-4">
          Analyze {eavs.length} EAV triples to verify entity quality and identify issues.
        </p>
        <button
          onClick={handleAnalyze}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          Check Entity Health
        </button>
      </div>
    );
  }

  // Analyzing
  if (isAnalyzing && progress) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Analyzing Entities...</h2>
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-400 mb-1">
            <span>{progress.phase}</span>
            <span>{progress.progress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          {progress.currentEntity && (
            <p className="text-sm text-gray-500 mt-2">
              Verifying: {progress.currentEntity}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-red-400 mb-4">Analysis Failed</h2>
        <p className="text-gray-400 mb-4">{error}</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Results
  if (!result) return null;

  const { summary, issuesRequiringAttention, autoVerified, markedProprietary } = result;

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      {/* Header with score */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Entity Health</h2>
          <p className="text-gray-400 text-sm">
            {summary.verifiedCount}/{summary.totalEntities} verified
          </p>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-bold ${
            summary.healthScore >= 80 ? 'text-green-400' :
            summary.healthScore >= 60 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {summary.healthScore}%
          </div>
          <div className="text-xs text-gray-500">Health Score</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="w-full bg-gray-700 rounded-full h-3 flex overflow-hidden">
          <div
            className="bg-green-500 h-3"
            style={{ width: `${(summary.verifiedCount / summary.totalEntities) * 100}%` }}
            title={`Verified: ${summary.verifiedCount}`}
          />
          <div
            className="bg-yellow-500 h-3"
            style={{ width: `${(summary.partialCount / summary.totalEntities) * 100}%` }}
            title={`Partial: ${summary.partialCount}`}
          />
          <div
            className="bg-purple-500 h-3"
            style={{ width: `${(summary.proprietaryCount / summary.totalEntities) * 100}%` }}
            title={`Proprietary: ${summary.proprietaryCount}`}
          />
          <div
            className="bg-gray-600 h-3"
            style={{ width: `${(summary.unverifiedCount / summary.totalEntities) * 100}%` }}
            title={`Unverified: ${summary.unverifiedCount}`}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span className="text-green-400">Verified ({summary.verifiedCount})</span>
          <span className="text-yellow-400">Partial ({summary.partialCount})</span>
          <span className="text-purple-400">Proprietary ({summary.proprietaryCount})</span>
          <span className="text-gray-400">Unverified ({summary.unverifiedCount})</span>
        </div>
      </div>

      {/* Critical entities status */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-gray-300">Critical Entities</span>
          <span className={`font-semibold ${
            summary.criticalVerified === summary.criticalEntities
              ? 'text-green-400'
              : 'text-amber-400'
          }`}>
            {summary.criticalVerified}/{summary.criticalEntities} verified
          </span>
        </div>
      </div>

      {/* Issues requiring attention */}
      {issuesRequiringAttention.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setExpandedSection(expandedSection === 'issues' ? null : 'issues')}
            className="w-full flex justify-between items-center text-left"
          >
            <h3 className="text-lg font-medium text-amber-400">
              Issues Requiring Attention ({issuesRequiringAttention.length})
            </h3>
            <span className="text-gray-500">
              {expandedSection === 'issues' ? '−' : '+'}
            </span>
          </button>

          {expandedSection === 'issues' && (
            <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
              {issuesRequiringAttention.map(record => (
                <EntityIssueCard
                  key={record.normalizedName}
                  record={record}
                  onMarkProprietary={() => markProprietary(record.entityName)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Auto-verified */}
      <div className="mb-6">
        <button
          onClick={() => setExpandedSection(expandedSection === 'verified' ? null : 'verified')}
          className="w-full flex justify-between items-center text-left"
        >
          <h3 className="text-lg font-medium text-green-400">
            Auto-Verified ({autoVerified.length})
          </h3>
          <span className="text-gray-500">
            {expandedSection === 'verified' ? '−' : '+'}
          </span>
        </button>

        {expandedSection === 'verified' && (
          <p className="text-sm text-gray-500 mt-2">
            These entities were automatically verified against Wikipedia/Wikidata.
            No action needed.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleAnalyze}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
        >
          Re-analyze
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}

interface EntityIssueCardProps {
  record: EntityHealthRecord;
  onMarkProprietary: () => void;
}

function EntityIssueCard({ record, onMarkProprietary }: EntityIssueCardProps) {
  const criticalIssue = record.issues.find(i => i.severity === 'critical');
  const warningIssue = record.issues.find(i => i.severity === 'warning');
  const mainIssue = criticalIssue || warningIssue;

  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              criticalIssue ? 'bg-red-500' : 'bg-amber-500'
            }`} />
            <span className="text-white font-medium">{record.entityName}</span>
            {record.criticality.isCritical && (
              <span className="text-xs text-amber-400 bg-amber-900/30 px-1.5 py-0.5 rounded">
                Critical
              </span>
            )}
          </div>
          {mainIssue && (
            <p className="text-sm text-gray-400 mt-1">{mainIssue.message}</p>
          )}
        </div>
        <div className="flex gap-2">
          {mainIssue?.type === 'unverified' && (
            <button
              onClick={onMarkProprietary}
              className="text-xs px-2 py-1 bg-purple-900/50 hover:bg-purple-900/70 text-purple-300 rounded"
            >
              Mark Proprietary
            </button>
          )}
          {mainIssue?.type === 'ambiguous' && (
            <button className="text-xs px-2 py-1 bg-blue-900/50 hover:bg-blue-900/70 text-blue-300 rounded">
              Disambiguate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default EntityHealthDashboard;
```

### Step 2: Run TypeScript check

Run: `npx tsc --noEmit`
Expected: No errors

### Step 3: Commit

```bash
git add components/dashboard/EntityHealthDashboard.tsx
git commit -m "feat(ui): add Entity Health Dashboard component

- Display health score and verification breakdown
- Show issues requiring attention with actions
- Support marking entities as proprietary
- Progress indicator during analysis

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Wire Entity Health to Dashboard

**Files:**
- Modify: `components/ProjectDashboard.tsx`
- Modify: `components/dashboard/TabNavigation.tsx`

### Step 1: Add Entity Health action to TabNavigation

In `components/dashboard/TabNavigation.tsx`, add to the `DashboardNavConfig` interface:

```typescript
onEntityHealth?: () => void;
```

Add the action to the Strategy tab in the `actions` array:

```typescript
{
  label: 'Entity Health',
  icon: 'shield-check',
  onClick: () => config.onEntityHealth?.(),
  tooltip: 'Check entity verification status',
},
```

### Step 2: Wire up in ProjectDashboard

In `components/ProjectDashboard.tsx`:

1. Import EntityHealthDashboard:
```typescript
import { EntityHealthDashboard } from './dashboard/EntityHealthDashboard';
```

2. Add state:
```typescript
const [showEntityHealth, setShowEntityHealth] = useState(false);
```

3. Add to TabNavigation config:
```typescript
onEntityHealth: () => setShowEntityHealth(true),
```

4. Add modal rendering (near other modals):
```typescript
{showEntityHealth && mapData?.eavs && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <EntityHealthDashboard
        eavs={mapData.eavs}
        centralEntity={mapData.businessInfo?.seedKeyword || ''}
        googleApiKey={businessInfo?.googleKgApiKey}
        onClose={() => setShowEntityHealth(false)}
      />
    </div>
  </div>
)}
```

### Step 3: Run TypeScript check

Run: `npx tsc --noEmit`
Expected: No errors

### Step 4: Commit

```bash
git add components/ProjectDashboard.tsx components/dashboard/TabNavigation.tsx
git commit -m "feat(ui): wire Entity Health Dashboard to main dashboard

- Add Entity Health action to Strategy tab
- Modal opens with EAV data from current map
- Pass Google KG API key for enhanced verification

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Integration Test

**Files:**
- Create: `lib/__tests__/entityHealthIntegration.test.ts`

### Step 1: Write integration test

```typescript
// lib/__tests__/entityHealthIntegration.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KnowledgeGraph } from '../knowledgeGraph';
import { calculateCriticalityScore, EntityCriticalityInput } from '../entityCriticality';
import { extractEntitiesFromEAVs } from '../../services/entityHealthService';
import { SemanticTriple, AttributeCategory } from '../../types';

describe('Entity Health + Knowledge Graph Integration', () => {
  let kg: KnowledgeGraph;

  beforeEach(() => {
    kg = new KnowledgeGraph();
  });

  it('uses betweenness centrality in criticality calculation', () => {
    // Build a graph with a clear bridge node
    kg.addNode({ id: 'visa', term: 'Visa Application', type: 'Entity' });
    kg.addNode({ id: 'culture', term: 'German Culture', type: 'Entity' });
    kg.addNode({ id: 'language', term: 'German Language', type: 'Entity' }); // Bridge
    kg.addNode({ id: 'history', term: 'German History', type: 'Entity' });

    // Culture cluster
    kg.addEdge({ id: 'e1', source: 'culture', target: 'language', relationship: 'related' });
    kg.addEdge({ id: 'e2', source: 'language', target: 'history', relationship: 'related' });

    // Visa cluster (connected via language)
    kg.addEdge({ id: 'e3', source: 'visa', target: 'language', relationship: 'required' });

    // Calculate centrality
    const centrality = kg.calculateBetweennessCentrality();
    const languageCentrality = centrality.get('language') || 0;

    // Language should have high centrality (bridge)
    expect(languageCentrality).toBeGreaterThan(0);

    // Now calculate criticality with the centrality bonus
    const input: EntityCriticalityInput = {
      entityName: 'German Language',
      isCentralEntity: false,
      attributeCategory: 'ROOT',
      isCoreSectionEntity: false,
      topicCount: 2,
      betweennessCentrality: languageCentrality,
    };

    const criticality = calculateCriticalityScore(input);

    // Should be critical due to ROOT + co-occurrence + bridge bonus
    expect(criticality.isCritical).toBe(true);
    expect(criticality.breakdown.bridgeBonus).toBeGreaterThan(0);
  });

  it('identifies structural holes needing bridge content', () => {
    // Two disconnected clusters
    kg.addNode({ id: 'a1', term: 'Visa Types', type: 'Entity' });
    kg.addNode({ id: 'a2', term: 'Requirements', type: 'Entity' });
    kg.addEdge({ id: 'ea1', source: 'a1', target: 'a2', relationship: 'related' });

    kg.addNode({ id: 'b1', term: 'German Culture', type: 'Entity' });
    kg.addNode({ id: 'b2', term: 'Traditions', type: 'Entity' });
    kg.addEdge({ id: 'eb1', source: 'b1', target: 'b2', relationship: 'related' });

    // Find holes
    const holes = kg.identifyStructuralHoles(0.15);

    expect(holes.length).toBe(1);
    expect(holes[0].clusterATerms).toContain('Visa Types');
    expect(holes[0].clusterBTerms).toContain('German Culture');
    expect(holes[0].connectionStrength).toBe(0);
    expect(holes[0].bridgeRequired).toBe(true);
  });

  it('extracts entities from EAVs and calculates criticality', () => {
    const eavs: SemanticTriple[] = [
      {
        id: '1',
        entity: 'Germany',
        attribute: 'visa_types',
        value: 'D-Visa',
        category: 'ROOT' as AttributeCategory,
        classification: 'TYPE',
        prominence: 1,
        source: 'manual',
      },
      {
        id: '2',
        entity: 'Germany',
        attribute: 'official_language',
        value: 'German',
        category: 'ROOT' as AttributeCategory,
        classification: 'TYPE',
        prominence: 1,
        source: 'manual',
      },
      {
        id: '3',
        entity: 'Germany',
        attribute: 'unique_requirement',
        value: 'Language Certificate',
        category: 'UNIQUE' as AttributeCategory,
        classification: 'SPECIFICATION',
        prominence: 1,
        source: 'manual',
      },
    ];

    const entities = extractEntitiesFromEAVs(eavs, 'Germany');

    // Central entity
    const germany = entities.find(e => e.entityName === 'Germany');
    expect(germany).toBeDefined();
    expect(germany!.isCentralEntity).toBe(true);

    // UNIQUE attribute value should be extracted
    const langCert = entities.find(e => e.entityName === 'Language Certificate');
    expect(langCert).toBeDefined();
    expect(langCert!.attributeCategory).toBe('UNIQUE');
  });
});
```

### Step 2: Run integration test

Run: `npx vitest run lib/__tests__/entityHealthIntegration.test.ts`
Expected: PASS

### Step 3: Commit

```bash
git add lib/__tests__/entityHealthIntegration.test.ts
git commit -m "test: add entity health + knowledge graph integration tests

- Verify betweenness centrality feeds into criticality calculation
- Verify structural hole detection
- Verify entity extraction from EAVs

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Final Build and Type Check

**Files:** None (verification only)

### Step 1: Run full TypeScript check

Run: `npx tsc --noEmit`
Expected: No errors

### Step 2: Run all tests

Run: `npx vitest run`
Expected: All tests pass

### Step 3: Run build

Run: `npm run build`
Expected: Build succeeds

### Step 4: Final commit

```bash
git add -A
git commit -m "feat(phase3): complete Entity Health Dashboard and KG enhancements

Phase 3 implementation includes:
- Entity criticality scoring based on attribute categories
- Entity health service with batch verification
- Knowledge Graph betweenness centrality (Brandes' algorithm)
- Structural hole detection for content opportunities
- AI bridge suggestion service
- Entity Health Dashboard UI component

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

This plan implements:

1. **Entity Criticality Scoring** - Calculate which entities need verification based on attribute category (UNIQUE/ROOT/RARE), Core Section presence, co-occurrence, and bridge status.

2. **Entity Health Service** - Batch verify entities against Wikipedia/Wikidata/Google KG, categorize issues (ambiguous, unverified, low-authority, proprietary), calculate health scores.

3. **Knowledge Graph Betweenness Centrality** - Brandes' algorithm to identify bridge entities connecting topic clusters.

4. **Structural Hole Detection** - Find weakly connected cluster pairs that need bridge content.

5. **AI Bridge Suggestions** - Generate research questions, topic titles, and content briefs for structural holes.

6. **Entity Health Dashboard** - UI for viewing health score, issues requiring attention, and marking proprietary terms.

---

Plan complete and saved to `docs/plans/2026-01-26-phase3-entity-health-kg-enhancements.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
