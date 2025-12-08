# Topical Map Merge - Complete Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the topical map merge feature allowing users to combine multiple maps into one unified map with AI-assisted conflict resolution.

**Architecture:** Multi-step wizard with dedicated state management (`useMapMerge` hook), AI analysis service for similarity detection, and execution service for database operations. Each wizard step handles a specific merge concern: context, EAVs, competitors, topics, foundation pages, briefs, and review.

**Tech Stack:** React 18, TypeScript, Supabase (PostgreSQL), Tailwind CSS, existing AI provider abstraction layer.

---

## Phase 1: Merge Execution Service (Core Backend)

### Task 1.1: Create Merge Execution Service Types

**Files:**
- Modify: `types.ts:2520+`

**Step 1: Add new interfaces at end of merge types section**

In `types.ts`, add after line 2519 (after `MergeExportTopicRow`):

```typescript
// Merge execution types
export interface MergeExecutionInput {
  sourceMaps: TopicalMap[];
  newMapName: string;
  projectId: string;
  userId: string;
  resolvedContext: {
    businessInfo: Partial<BusinessInfo>;
    pillars: SEOPillars | null;
  };
  resolvedEavs: SemanticTriple[];
  resolvedCompetitors: string[];
  topicDecisions: TopicMergeDecision[];
  excludedTopicIds: string[];
  newTopics: EnrichedTopic[];
}

export interface MergeExecutionResult {
  newMap: TopicalMap;
  topicsCreated: number;
  warnings: string[];
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to merge types

**Step 3: Commit**

```bash
git add types.ts
git commit -m "feat(merge): add MergeExecutionInput and MergeExecutionResult types"
```

---

### Task 1.2: Create Merge Execution Service File

**Files:**
- Create: `services/mapMergeExecution.ts`

**Step 1: Create the service file with core structure**

```typescript
// services/mapMergeExecution.ts
import { v4 as uuidv4 } from 'uuid';
import { getSupabaseClient } from './supabaseClient';
import { slugify, cleanSlug } from '../utils/helpers';
import {
  MergeExecutionInput,
  MergeExecutionResult,
  TopicalMap,
  EnrichedTopic,
  TopicMergeDecision,
} from '../types';

/**
 * Execute the merge of multiple topical maps into a single new map.
 * This handles all database operations in sequence.
 */
export async function executeMerge(
  input: MergeExecutionInput,
  supabaseUrl: string,
  supabaseKey: string
): Promise<MergeExecutionResult> {
  const supabase = getSupabaseClient(supabaseUrl, supabaseKey);
  const warnings: string[] = [];
  const newMapId = uuidv4();

  // Step 1: Create the new map record
  const { data: mapData, error: mapError } = await supabase
    .from('topical_maps')
    .insert({
      id: newMapId,
      project_id: input.projectId,
      name: input.newMapName,
      business_info: input.resolvedContext.businessInfo,
      pillars: input.resolvedContext.pillars,
      eavs: input.resolvedEavs,
      competitors: input.resolvedCompetitors,
    })
    .select()
    .single();

  if (mapError) {
    throw new Error(`Failed to create merged map: ${mapError.message}`);
  }

  // Step 2: Build final topic list from decisions
  const finalTopics = buildFinalTopicList(input, newMapId, input.userId);

  // Step 3: Insert topics in correct order (cores first, then outers)
  const coreTopics = finalTopics.filter(t => t.type === 'core');
  const outerTopics = finalTopics.filter(t => t.type === 'outer');

  // Build ID mapping for parent references
  const oldToNewId = new Map<string, string>();
  finalTopics.forEach(t => {
    if (t._originalIds) {
      t._originalIds.forEach(oldId => oldToNewId.set(oldId, t.id));
    }
  });

  // Insert core topics
  if (coreTopics.length > 0) {
    const coreDbTopics = coreTopics.map(t => ({
      id: t.id,
      map_id: newMapId,
      user_id: input.userId,
      title: t.title,
      slug: t.slug,
      description: t.description,
      type: 'core',
      parent_topic_id: null,
      freshness: t.freshness || 'STANDARD',
      metadata: t.metadata || {},
    }));

    const { error: coreError } = await supabase.from('topics').insert(coreDbTopics);
    if (coreError) {
      // Rollback: delete the map
      await supabase.from('topical_maps').delete().eq('id', newMapId);
      throw new Error(`Failed to insert core topics: ${coreError.message}`);
    }
  }

  // Insert outer topics with resolved parent IDs
  if (outerTopics.length > 0) {
    const outerDbTopics = outerTopics.map(t => {
      let parentId = t.parent_topic_id;
      // Resolve old parent ID to new ID
      if (parentId && oldToNewId.has(parentId)) {
        parentId = oldToNewId.get(parentId)!;
      }
      // If parent was deleted, make it a core topic
      if (parentId && !finalTopics.find(ft => ft.id === parentId)) {
        warnings.push(`Topic "${t.title}" lost parent, converted to core topic`);
        parentId = null;
      }

      return {
        id: t.id,
        map_id: newMapId,
        user_id: input.userId,
        title: t.title,
        slug: t.slug,
        description: t.description,
        type: parentId ? 'outer' : 'core',
        parent_topic_id: parentId,
        freshness: t.freshness || 'STANDARD',
        metadata: t.metadata || {},
      };
    });

    const { error: outerError } = await supabase.from('topics').insert(outerDbTopics);
    if (outerError) {
      // Rollback
      await supabase.from('topics').delete().eq('map_id', newMapId);
      await supabase.from('topical_maps').delete().eq('id', newMapId);
      throw new Error(`Failed to insert outer topics: ${outerError.message}`);
    }
  }

  // Build result
  const newMap: TopicalMap = {
    id: newMapId,
    project_id: input.projectId,
    name: input.newMapName,
    created_at: new Date().toISOString(),
    business_info: input.resolvedContext.businessInfo,
    pillars: input.resolvedContext.pillars || undefined,
    eavs: input.resolvedEavs,
    competitors: input.resolvedCompetitors,
    topics: finalTopics.map(t => ({ ...t, _originalIds: undefined })) as EnrichedTopic[],
  };

  return {
    newMap,
    topicsCreated: finalTopics.length,
    warnings,
  };
}

/**
 * Build the final list of topics based on merge decisions.
 */
function buildFinalTopicList(
  input: MergeExecutionInput,
  newMapId: string,
  userId: string
): (EnrichedTopic & { _originalIds?: string[] })[] {
  const result: (EnrichedTopic & { _originalIds?: string[] })[] = [];
  const processedTopicIds = new Set<string>();

  // Get all source topics
  const allSourceTopics = new Map<string, { topic: EnrichedTopic; mapName: string }>();
  input.sourceMaps.forEach(map => {
    (map.topics || []).forEach(topic => {
      allSourceTopics.set(topic.id, { topic, mapName: map.name });
    });
  });

  // Process topic decisions
  for (const decision of input.topicDecisions) {
    const topicA = decision.topicAId ? allSourceTopics.get(decision.topicAId)?.topic : null;
    const topicB = decision.topicBId ? allSourceTopics.get(decision.topicBId)?.topic : null;

    if (decision.topicAId) processedTopicIds.add(decision.topicAId);
    if (decision.topicBId) processedTopicIds.add(decision.topicBId);

    switch (decision.userDecision) {
      case 'merge':
        // Create merged topic
        if (topicA || topicB) {
          const baseTopic = topicA || topicB!;
          const newId = uuidv4();
          result.push({
            id: newId,
            map_id: newMapId,
            title: decision.finalTitle || baseTopic.title,
            description: decision.finalDescription || baseTopic.description,
            slug: slugify(decision.finalTitle || baseTopic.title),
            type: decision.finalType || baseTopic.type,
            parent_topic_id: decision.finalParentId || baseTopic.parent_topic_id,
            freshness: baseTopic.freshness,
            _originalIds: [decision.topicAId, decision.topicBId].filter(Boolean) as string[],
          });
        }
        break;

      case 'keep_both':
        // Keep both topics with new IDs
        if (topicA) {
          const newId = uuidv4();
          result.push({
            ...topicA,
            id: newId,
            map_id: newMapId,
            slug: slugify(topicA.title),
            _originalIds: [topicA.id],
          });
        }
        if (topicB) {
          const newId = uuidv4();
          result.push({
            ...topicB,
            id: newId,
            map_id: newMapId,
            slug: slugify(topicB.title),
            _originalIds: [topicB.id],
          });
        }
        break;

      case 'keep_a':
        if (topicA) {
          const newId = uuidv4();
          result.push({
            ...topicA,
            id: newId,
            map_id: newMapId,
            slug: slugify(topicA.title),
            _originalIds: [topicA.id],
          });
        }
        break;

      case 'keep_b':
        if (topicB) {
          const newId = uuidv4();
          result.push({
            ...topicB,
            id: newId,
            map_id: newMapId,
            slug: slugify(topicB.title),
            _originalIds: [topicB.id],
          });
        }
        break;

      case 'delete':
        // Skip both topics
        break;

      case 'pending':
        // Treat as keep_both by default
        if (topicA) {
          const newId = uuidv4();
          result.push({
            ...topicA,
            id: newId,
            map_id: newMapId,
            slug: slugify(topicA.title),
            _originalIds: [topicA.id],
          });
        }
        if (topicB) {
          const newId = uuidv4();
          result.push({
            ...topicB,
            id: newId,
            map_id: newMapId,
            slug: slugify(topicB.title),
            _originalIds: [topicB.id],
          });
        }
        break;
    }
  }

  // Add unique topics (not in any decision) unless excluded
  allSourceTopics.forEach(({ topic }, topicId) => {
    if (!processedTopicIds.has(topicId) && !input.excludedTopicIds.includes(topicId)) {
      const newId = uuidv4();
      result.push({
        ...topic,
        id: newId,
        map_id: newMapId,
        slug: slugify(topic.title),
        _originalIds: [topic.id],
      });
    }
  });

  // Add new topics
  for (const newTopic of input.newTopics) {
    const newId = uuidv4();
    result.push({
      ...newTopic,
      id: newId,
      map_id: newMapId,
      slug: slugify(newTopic.title),
    });
  }

  // Fix slugs for outer topics (include parent path)
  const topicById = new Map(result.map(t => [t.id, t]));
  result.forEach(topic => {
    if (topic.type === 'outer' && topic.parent_topic_id) {
      const parent = topicById.get(topic.parent_topic_id);
      if (parent) {
        topic.slug = `${parent.slug}/${cleanSlug(parent.slug, topic.title)}`;
      }
    }
  });

  return result;
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add services/mapMergeExecution.ts
git commit -m "feat(merge): add executeMerge service for database operations"
```

---

## Phase 2: Enhanced Review Step UI

### Task 2.1: Create MergeReviewStep Component

**Files:**
- Create: `components/merge/MergeReviewStep.tsx`

**Step 1: Create the review step component**

```typescript
// components/merge/MergeReviewStep.tsx
import React, { useMemo } from 'react';
import {
  TopicalMap,
  ContextConflict,
  TopicMergeDecision,
  EnrichedTopic,
  SemanticTriple,
} from '../../types';
import { Card } from '../ui/Card';

interface MergeReviewStepProps {
  sourceMaps: TopicalMap[];
  newMapName: string;
  onMapNameChange: (name: string) => void;
  contextConflicts: ContextConflict[];
  resolvedEavs: SemanticTriple[];
  topicSimilarities: { id: string }[];
  topicDecisions: TopicMergeDecision[];
  excludedTopicIds: string[];
  newTopics: EnrichedTopic[];
  isCreating: boolean;
  validationErrors: string[];
}

const MergeReviewStep: React.FC<MergeReviewStepProps> = ({
  sourceMaps,
  newMapName,
  onMapNameChange,
  contextConflicts,
  resolvedEavs,
  topicSimilarities,
  topicDecisions,
  excludedTopicIds,
  newTopics,
  isCreating,
  validationErrors,
}) => {
  // Calculate topic stats
  const topicStats = useMemo(() => {
    const allSourceTopics = sourceMaps.flatMap(m => m.topics || []);
    const inSimilarity = new Set<string>();
    topicSimilarities.forEach(sim => {
      const decision = topicDecisions.find(d => d.id === sim.id);
      if (decision) {
        if (decision.topicAId) inSimilarity.add(decision.topicAId);
        if (decision.topicBId) inSimilarity.add(decision.topicBId);
      }
    });

    const uniqueTopics = allSourceTopics.filter(t => !inSimilarity.has(t.id));
    const uniqueIncluded = uniqueTopics.filter(t => !excludedTopicIds.includes(t.id));

    const merged = topicDecisions.filter(d => d.userDecision === 'merge').length;
    const keptBoth = topicDecisions.filter(d => d.userDecision === 'keep_both').length * 2;
    const keptA = topicDecisions.filter(d => d.userDecision === 'keep_a').length;
    const keptB = topicDecisions.filter(d => d.userDecision === 'keep_b').length;
    const deleted = topicDecisions.filter(d => d.userDecision === 'delete').length * 2;
    const pending = topicDecisions.filter(d => d.userDecision === 'pending').length * 2;

    const fromDecisions = merged + keptBoth + keptA + keptB + pending;
    const total = fromDecisions + uniqueIncluded.length + newTopics.length;

    return {
      merged,
      keptBoth: keptBoth / 2,
      keptSingle: keptA + keptB,
      deleted: deleted / 2,
      pending: pending / 2,
      uniqueIncluded: uniqueIncluded.length,
      uniqueExcluded: excludedTopicIds.length,
      newTopics: newTopics.length,
      total,
    };
  }, [sourceMaps, topicSimilarities, topicDecisions, excludedTopicIds, newTopics]);

  // Calculate resolved context count
  const resolvedContextCount = contextConflicts.filter(c => c.resolution !== null).length;

  return (
    <div className="space-y-6">
      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="p-4 bg-red-900/30 border border-red-600 rounded-lg">
          <p className="font-semibold text-red-300 mb-2">Please fix the following issues:</p>
          <ul className="list-disc list-inside text-red-200 text-sm space-y-1">
            {validationErrors.map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Map Name Input */}
      <Card className="p-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          New Map Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={newMapName}
          onChange={(e) => onMapNameChange(e.target.value)}
          placeholder="Enter a name for the merged map..."
          className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          disabled={isCreating}
        />
        <p className="text-xs text-gray-500 mt-1">
          Suggested: {sourceMaps.map(m => m.name).join(' + ')}
        </p>
      </Card>

      {/* Source Maps */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Source Maps</h3>
        <div className="flex flex-wrap gap-2">
          {sourceMaps.map(map => (
            <span
              key={map.id}
              className="px-3 py-1 bg-blue-900/50 text-blue-200 rounded-full text-sm"
            >
              {map.name} ({map.topics?.length || 0} topics)
            </span>
          ))}
        </div>
      </Card>

      {/* Context Resolution Summary */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Context Resolution</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Conflicts Resolved:</span>
            <span className="text-white ml-2">{resolvedContextCount}/{contextConflicts.length}</span>
          </div>
          <div>
            <span className="text-gray-400">EAVs Included:</span>
            <span className="text-white ml-2">{resolvedEavs.length}</span>
          </div>
        </div>
      </Card>

      {/* Topic Summary */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Topic Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-green-900/30 rounded">
            <p className="text-green-400 font-semibold text-lg">{topicStats.merged}</p>
            <p className="text-gray-400">Merged Pairs</p>
          </div>
          <div className="p-3 bg-blue-900/30 rounded">
            <p className="text-blue-400 font-semibold text-lg">{topicStats.keptBoth}</p>
            <p className="text-gray-400">Kept Both</p>
          </div>
          <div className="p-3 bg-purple-900/30 rounded">
            <p className="text-purple-400 font-semibold text-lg">{topicStats.keptSingle}</p>
            <p className="text-gray-400">Kept Single</p>
          </div>
          <div className="p-3 bg-gray-800 rounded">
            <p className="text-gray-300 font-semibold text-lg">{topicStats.uniqueIncluded}</p>
            <p className="text-gray-400">Unique Included</p>
          </div>
          <div className="p-3 bg-red-900/30 rounded">
            <p className="text-red-400 font-semibold text-lg">{topicStats.deleted + topicStats.uniqueExcluded}</p>
            <p className="text-gray-400">Excluded/Deleted</p>
          </div>
          <div className="p-3 bg-yellow-900/30 rounded">
            <p className="text-yellow-400 font-semibold text-lg">{topicStats.newTopics}</p>
            <p className="text-gray-400">New Topics</p>
          </div>
        </div>

        {topicStats.pending > 0 && (
          <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-700 rounded text-yellow-300 text-sm">
            Warning: {topicStats.pending} topic pairs have pending decisions
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-xl font-bold text-white">
            Total Topics in New Map: <span className="text-green-400">{topicStats.total}</span>
          </p>
        </div>
      </Card>

      {/* Creating indicator */}
      {isCreating && (
        <div className="flex items-center justify-center gap-3 p-4 bg-blue-900/30 rounded-lg">
          <svg className="animate-spin h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-blue-300">Creating merged map...</span>
        </div>
      )}
    </div>
  );
};

export default MergeReviewStep;
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add components/merge/MergeReviewStep.tsx
git commit -m "feat(merge): add MergeReviewStep component with validation"
```

---

### Task 2.2: Create MergeEavsStep Component

**Files:**
- Create: `components/merge/MergeEavsStep.tsx`

**Step 1: Create the EAV step component**

```typescript
// components/merge/MergeEavsStep.tsx
import React, { useMemo, useState } from 'react';
import { TopicalMap, SemanticTriple, EavDecision } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface MergeEavsStepProps {
  sourceMaps: TopicalMap[];
  eavDecisions: EavDecision[];
  onDecisionChange: (decision: EavDecision) => void;
  onBulkAction: (action: 'include_all' | 'exclude_all', mapId?: string) => void;
}

const EAV_CATEGORIES = ['UNIQUE', 'ROOT', 'RARE', 'COMMON'] as const;
const CATEGORY_COLORS: Record<string, string> = {
  UNIQUE: 'bg-purple-900/50 text-purple-300',
  ROOT: 'bg-blue-900/50 text-blue-300',
  RARE: 'bg-green-900/50 text-green-300',
  COMMON: 'bg-gray-700 text-gray-300',
};

const MergeEavsStep: React.FC<MergeEavsStepProps> = ({
  sourceMaps,
  eavDecisions,
  onDecisionChange,
  onBulkAction,
}) => {
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterMap, setFilterMap] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Build EAV list with source info
  const eavsWithSource = useMemo(() => {
    const result: { eav: SemanticTriple; mapId: string; mapName: string; eavId: string }[] = [];

    sourceMaps.forEach(map => {
      (map.eavs || []).forEach((eav, idx) => {
        const eavId = `${map.id}_${idx}`;
        result.push({
          eav,
          mapId: map.id,
          mapName: map.name,
          eavId,
        });
      });
    });

    return result;
  }, [sourceMaps]);

  // Find duplicates (same entity + attribute + value across maps)
  const duplicates = useMemo(() => {
    const seen = new Map<string, string[]>();
    eavsWithSource.forEach(({ eav, eavId }) => {
      const key = `${eav.entity}|${eav.attribute}|${eav.value}`;
      const existing = seen.get(key) || [];
      seen.set(key, [...existing, eavId]);
    });
    return new Map([...seen.entries()].filter(([, ids]) => ids.length > 1));
  }, [eavsWithSource]);

  // Filter EAVs
  const filteredEavs = useMemo(() => {
    return eavsWithSource.filter(({ eav, mapId }) => {
      if (filterCategory && eav.category !== filterCategory) return false;
      if (filterMap && mapId !== filterMap) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!eav.entity.toLowerCase().includes(query) &&
            !eav.attribute.toLowerCase().includes(query) &&
            !String(eav.value).toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [eavsWithSource, filterCategory, filterMap, searchQuery]);

  // Get decision for an EAV
  const getDecision = (eavId: string): EavDecision => {
    return eavDecisions.find(d => d.eavId === eavId) || {
      eavId,
      sourceMapId: '',
      action: 'include',
    };
  };

  // Stats
  const stats = useMemo(() => {
    const included = eavDecisions.filter(d => d.action === 'include').length;
    const excluded = eavDecisions.filter(d => d.action === 'exclude').length;
    const total = eavsWithSource.length;
    return { included, excluded, pending: total - included - excluded, total };
  }, [eavDecisions, eavsWithSource]);

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
        <div className="flex gap-4 text-sm">
          <span className="text-gray-400">Total: <span className="text-white">{stats.total}</span></span>
          <span className="text-green-400">Included: {stats.included}</span>
          <span className="text-red-400">Excluded: {stats.excluded}</span>
          <span className="text-yellow-400">Pending: {stats.pending}</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => onBulkAction('include_all')}>
            Include All
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onBulkAction('exclude_all')}>
            Exclude All
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search EAVs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm flex-1 min-w-[200px]"
        />
        <select
          value={filterCategory || ''}
          onChange={(e) => setFilterCategory(e.target.value || null)}
          className="px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm"
        >
          <option value="">All Categories</option>
          {EAV_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select
          value={filterMap || ''}
          onChange={(e) => setFilterMap(e.target.value || null)}
          className="px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm"
        >
          <option value="">All Maps</option>
          {sourceMaps.map(map => (
            <option key={map.id} value={map.id}>{map.name}</option>
          ))}
        </select>
      </div>

      {/* Duplicate Warning */}
      {duplicates.size > 0 && (
        <div className="p-3 bg-yellow-900/20 border border-yellow-700 rounded text-sm text-yellow-300">
          {duplicates.size} duplicate EAV(s) detected across maps. Only one copy will be included.
        </div>
      )}

      {/* EAV List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {filteredEavs.map(({ eav, mapId, mapName, eavId }) => {
          const decision = getDecision(eavId);
          const isDuplicate = [...duplicates.values()].some(ids => ids.includes(eavId) && ids[0] !== eavId);

          return (
            <Card
              key={eavId}
              className={`p-3 cursor-pointer transition-colors ${
                decision.action === 'exclude' || isDuplicate
                  ? 'opacity-50 bg-gray-900'
                  : 'hover:bg-gray-700/50'
              }`}
              onClick={() => {
                if (!isDuplicate) {
                  onDecisionChange({
                    ...decision,
                    eavId,
                    sourceMapId: mapId,
                    action: decision.action === 'include' ? 'exclude' : 'include',
                  });
                }
              }}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={decision.action === 'include' && !isDuplicate}
                  disabled={isDuplicate}
                  onChange={() => {}}
                  className="mt-1 w-4 h-4"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-white">{eav.entity}</span>
                    <span className="text-gray-500">→</span>
                    <span className="text-blue-300">{eav.attribute}</span>
                    <span className="text-gray-500">:</span>
                    <span className="text-green-300">{String(eav.value)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${CATEGORY_COLORS[eav.category || 'COMMON']}`}>
                      {eav.category || 'COMMON'}
                    </span>
                    <span className="text-xs text-gray-500">from {mapName}</span>
                    {isDuplicate && (
                      <span className="text-xs text-yellow-400">(duplicate - auto-excluded)</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredEavs.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          {eavsWithSource.length === 0
            ? 'No EAVs found in selected maps'
            : 'No EAVs match the current filters'}
        </div>
      )}
    </div>
  );
};

export default MergeEavsStep;
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add components/merge/MergeEavsStep.tsx
git commit -m "feat(merge): add MergeEavsStep component for EAV consolidation"
```

---

### Task 2.3: Extend useMapMerge Hook

**Files:**
- Modify: `hooks/useMapMerge.ts`

**Step 1: Add new action types and helper functions**

Add to the `MapMergeAction` type union (after line 61):

```typescript
  | { type: 'SET_CREATING'; payload: boolean }
  | { type: 'BULK_EAV_ACTION'; payload: { action: 'include' | 'exclude'; mapId?: string } }
```

**Step 2: Add reducer cases**

Add in `mapMergeReducer` before the `default` case:

```typescript
    case 'SET_CREATING':
      return { ...state, isCreating: action.payload };
    case 'BULK_EAV_ACTION': {
      const allEavIds = state.sourceMaps.flatMap((map, mapIdx) =>
        (map.eavs || []).map((_, eavIdx) => ({
          eavId: `${map.id}_${eavIdx}`,
          mapId: map.id,
        }))
      );
      const filtered = action.payload.mapId
        ? allEavIds.filter(e => e.mapId === action.payload.mapId)
        : allEavIds;
      const newDecisions: EavDecision[] = filtered.map(({ eavId, mapId }) => ({
        eavId,
        sourceMapId: mapId,
        action: action.payload.action,
      }));
      // Merge with existing decisions
      const existingByEavId = new Map(state.eavDecisions.map(d => [d.eavId, d]));
      newDecisions.forEach(d => existingByEavId.set(d.eavId, d));
      return { ...state, eavDecisions: Array.from(existingByEavId.values()) };
    }
```

**Step 3: Update initialState**

Add to `initialState`:

```typescript
  isCreating: false,
```

**Step 4: Add helper function exports**

Add after the existing helper functions in the hook return:

```typescript
  const bulkEavAction = useCallback(
    (action: 'include_all' | 'exclude_all', mapId?: string) => {
      dispatch({
        type: 'BULK_EAV_ACTION',
        payload: { action: action === 'include_all' ? 'include' : 'exclude', mapId },
      });
    },
    []
  );

  const setCreating = useCallback((creating: boolean) => {
    dispatch({ type: 'SET_CREATING', payload: creating });
  }, []);
```

**Step 5: Add to return object**

```typescript
  return {
    state,
    dispatch,
    setStep,
    selectMaps,
    setSourceMaps,
    resolveContextConflict,
    updateTopicDecision,
    addNewTopic,
    toggleExcludedTopic,
    setNewMapName,
    bulkEavAction,  // NEW
    setCreating,    // NEW
    reset,
  };
```

**Step 6: Update MapMergeState in types.ts**

Add to `MapMergeState` interface:

```typescript
  isCreating: boolean;
```

**Step 7: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 8: Commit**

```bash
git add hooks/useMapMerge.ts types.ts
git commit -m "feat(merge): extend useMapMerge hook with bulk EAV actions and creating state"
```

---

## Phase 3: Wire Up Wizard

### Task 3.1: Update MergeMapWizard with All Steps

**Files:**
- Modify: `components/merge/MergeMapWizard.tsx`

**Step 1: Add imports**

Add at the top with other imports:

```typescript
import MergeEavsStep from './MergeEavsStep';
import MergeReviewStep from './MergeReviewStep';
import { executeMerge } from '../../services/mapMergeExecution';
```

**Step 2: Add bulkEavAction and setCreating to destructured hook**

Update the hook destructuring:

```typescript
  const {
    state: mergeState,
    dispatch: mergeDispatch,
    setStep,
    selectMaps,
    setSourceMaps,
    resolveContextConflict,
    updateTopicDecision,
    addNewTopic,
    toggleExcludedTopic,
    setNewMapName,
    bulkEavAction,
    setCreating,
    reset,
  } = useMapMerge();
```

**Step 3: Add validation function**

Add after `handleImportDecisions`:

```typescript
  const getValidationErrors = useCallback((): string[] => {
    const errors: string[] = [];

    if (!mergeState.newMapName.trim()) {
      errors.push('Map name is required');
    }

    const pendingDecisions = mergeState.topicDecisions.filter(d => d.userDecision === 'pending');
    if (pendingDecisions.length > 0) {
      errors.push(`${pendingDecisions.length} topic pair(s) have pending decisions`);
    }

    // Check that at least one topic will be in the new map
    const allTopics = mergeState.sourceMaps.flatMap(m => m.topics || []);
    const inDecision = new Set<string>();
    mergeState.topicDecisions.forEach(d => {
      if (d.topicAId) inDecision.add(d.topicAId);
      if (d.topicBId) inDecision.add(d.topicBId);
    });
    const uniqueTopics = allTopics.filter(t => !inDecision.has(t.id));
    const uniqueIncluded = uniqueTopics.filter(t => !mergeState.excludedTopicIds.includes(t.id));

    const fromDecisions = mergeState.topicDecisions.filter(d => d.userDecision !== 'delete').length;
    const totalTopics = fromDecisions + uniqueIncluded.length + mergeState.newTopics.length;

    if (totalTopics === 0) {
      errors.push('The merged map would have no topics');
    }

    return errors;
  }, [mergeState]);
```

**Step 4: Add createMergedMap handler**

Add after `getValidationErrors`:

```typescript
  const handleCreateMergedMap = useCallback(async () => {
    const errors = getValidationErrors();
    if (errors.length > 0) return;

    setCreating(true);
    try {
      // Build resolved EAVs from decisions
      const resolvedEavs: SemanticTriple[] = [];
      const seenEavKeys = new Set<string>();

      mergeState.sourceMaps.forEach((map, mapIdx) => {
        (map.eavs || []).forEach((eav, eavIdx) => {
          const eavId = `${map.id}_${eavIdx}`;
          const decision = mergeState.eavDecisions.find(d => d.eavId === eavId);
          if (!decision || decision.action === 'include') {
            const key = `${eav.entity}|${eav.attribute}|${eav.value}`;
            if (!seenEavKeys.has(key)) {
              seenEavKeys.add(key);
              resolvedEavs.push(eav);
            }
          }
        });
      });

      // Build resolved context from conflict resolutions
      const resolvedBusinessInfo: Partial<BusinessInfo> = {};
      const basePillars = mergeState.sourceMaps[0]?.pillars;
      const resolvedPillars = basePillars ? { ...basePillars } : null;

      mergeState.contextConflicts.forEach(conflict => {
        let value: any;
        if (conflict.resolution === 'mapA') {
          value = conflict.values[0]?.value;
        } else if (conflict.resolution === 'mapB') {
          value = conflict.values[1]?.value;
        } else if (conflict.resolution === 'ai' && conflict.aiSuggestion) {
          value = conflict.aiSuggestion.value;
        } else if (conflict.resolution === 'custom') {
          value = conflict.customValue;
        }

        if (value !== undefined) {
          // Determine if it's a pillar or business field
          const pillarFields = ['centralEntity', 'sourceContext', 'centralSearchIntent'];
          if (pillarFields.includes(conflict.field) && resolvedPillars) {
            (resolvedPillars as any)[conflict.field] = value;
          } else {
            (resolvedBusinessInfo as any)[conflict.field] = value;
          }
        }
      });

      // Get competitors from first map (could be enhanced later)
      const resolvedCompetitors = mergeState.sourceMaps[0]?.competitors || [];

      const result = await executeMerge(
        {
          sourceMaps: mergeState.sourceMaps,
          newMapName: mergeState.newMapName,
          projectId: appState.activeProjectId!,
          userId: appState.user!.id,
          resolvedContext: {
            businessInfo: resolvedBusinessInfo,
            pillars: resolvedPillars,
          },
          resolvedEavs,
          resolvedCompetitors,
          topicDecisions: mergeState.topicDecisions,
          excludedTopicIds: mergeState.excludedTopicIds,
          newTopics: mergeState.newTopics,
        },
        appState.businessInfo.supabaseUrl,
        appState.businessInfo.supabaseAnonKey
      );

      // Add to app state
      appDispatch({ type: 'ADD_TOPICAL_MAP', payload: result.newMap });
      appDispatch({ type: 'SET_TOPICS_FOR_MAP', payload: { mapId: result.newMap.id, topics: result.newMap.topics || [] } });
      appDispatch({ type: 'SET_NOTIFICATION', payload: `Created merged map "${result.newMap.name}" with ${result.topicsCreated} topics` });

      if (result.warnings.length > 0) {
        console.warn('Merge warnings:', result.warnings);
      }

      handleClose();
    } catch (error) {
      console.error('Merge failed:', error);
      mergeDispatch({
        type: 'SET_ANALYSIS_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to create merged map',
      });
    } finally {
      setCreating(false);
    }
  }, [
    getValidationErrors,
    setCreating,
    mergeState,
    appState,
    appDispatch,
    handleClose,
    mergeDispatch,
  ]);
```

**Step 5: Update handleNext for review step**

Replace the `handleNext` function:

```typescript
  const handleNext = useCallback(() => {
    const steps: Array<typeof mergeState.step> = ['select', 'context', 'eavs', 'topics', 'review'];
    const currentIndex = steps.indexOf(mergeState.step);

    // On review step, create the map instead of going next
    if (mergeState.step === 'review') {
      handleCreateMergedMap();
      return;
    }

    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  }, [mergeState.step, setStep, handleCreateMergedMap]);
```

**Step 6: Update renderStep to include EAVs and Review**

Replace the `renderStep` function's switch cases:

```typescript
  const renderStep = () => {
    switch (mergeState.step) {
      case 'select':
        return (
          <MergeMapSelectStep
            availableMaps={availableMaps}
            selectedMapIds={mergeState.selectedMapIds}
            onMapsSelected={handleMapsSelected}
          />
        );
      case 'context':
        return (
          <MergeContextStep
            sourceMaps={mergeState.sourceMaps}
            contextConflicts={mergeState.contextConflicts}
            resolvedContext={mergeState.resolvedContext}
            isAnalyzing={mergeState.isAnalyzing}
            onResolveConflict={resolveContextConflict}
            onAnalyze={handleAnalyzeContext}
          />
        );
      case 'eavs':
        return (
          <MergeEavsStep
            sourceMaps={mergeState.sourceMaps}
            eavDecisions={mergeState.eavDecisions}
            onDecisionChange={(decision) => mergeDispatch({ type: 'UPDATE_EAV_DECISION', payload: decision })}
            onBulkAction={bulkEavAction}
          />
        );
      case 'topics':
        return (
          <MergeTopicsStep
            sourceMaps={mergeState.sourceMaps}
            topicSimilarities={mergeState.topicSimilarities}
            topicDecisions={mergeState.topicDecisions}
            newTopics={mergeState.newTopics}
            excludedTopicIds={mergeState.excludedTopicIds}
            isAnalyzing={mergeState.isAnalyzing}
            onDecisionChange={updateTopicDecision}
            onAddNewTopic={addNewTopic}
            onToggleExcluded={toggleExcludedTopic}
            onAnalyze={handleAnalyzeContext}
            onExport={handleExportDecisions}
            onImport={handleImportDecisions}
          />
        );
      case 'review':
        return (
          <MergeReviewStep
            sourceMaps={mergeState.sourceMaps}
            newMapName={mergeState.newMapName}
            onMapNameChange={setNewMapName}
            contextConflicts={mergeState.contextConflicts}
            resolvedEavs={mergeState.resolvedEavs}
            topicSimilarities={mergeState.topicSimilarities}
            topicDecisions={mergeState.topicDecisions}
            excludedTopicIds={mergeState.excludedTopicIds}
            newTopics={mergeState.newTopics}
            isCreating={mergeState.isCreating}
            validationErrors={getValidationErrors()}
          />
        );
      default:
        return null;
    }
  };
```

**Step 7: Update canProceed for all steps**

Replace `canProceed`:

```typescript
  const canProceed = () => {
    switch (mergeState.step) {
      case 'select':
        return mergeState.selectedMapIds.length >= 2;
      case 'context':
        return mergeState.contextConflicts.every(c => c.resolution !== null);
      case 'eavs':
        return true; // EAVs are optional
      case 'topics':
        return true; // Can proceed with pending decisions (warning shown in review)
      case 'review':
        return getValidationErrors().length === 0 && !mergeState.isCreating;
      default:
        return true;
    }
  };
```

**Step 8: Update button text**

Update the Next button in the footer:

```typescript
          <Button
            onClick={handleNext}
            disabled={!canProceed() || mergeState.isAnalyzing || mergeState.isCreating}
          >
            {mergeState.step === 'review'
              ? (mergeState.isCreating ? 'Creating...' : 'Create Merged Map')
              : 'Next'}
          </Button>
```

**Step 9: Add required import for BusinessInfo**

Add to imports:

```typescript
import { TopicalMap, TopicMergeDecision, EnrichedTopic, SemanticTriple, BusinessInfo } from '../../types';
```

**Step 10: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 11: Commit**

```bash
git add components/merge/MergeMapWizard.tsx
git commit -m "feat(merge): wire up complete wizard flow with EAV step and merge execution"
```

---

## Phase 4: Full Topics Loading Fix

### Task 4.1: Ensure Full Topic Data is Loaded

**Files:**
- Modify: `components/merge/MergeMapWizard.tsx`

The current fix loads minimal topic data (id, map_id, title, type) when project loads. For merge, we need full topic data including description, parent_topic_id, etc.

**Step 1: Add useEffect to load full topics when source maps change**

Add after `handleMapsSelected`:

```typescript
  // Load full topic data for selected maps
  useEffect(() => {
    const loadFullTopics = async () => {
      if (mergeState.sourceMaps.length === 0) return;

      const mapIds = mergeState.sourceMaps.map(m => m.id);
      const mapsNeedingFullData = mergeState.sourceMaps.filter(
        m => !m.topics?.some(t => t.description !== undefined)
      );

      if (mapsNeedingFullData.length === 0) return;

      try {
        const supabase = getSupabaseClient(
          appState.businessInfo.supabaseUrl,
          appState.businessInfo.supabaseAnonKey
        );

        const { data: topicsData, error } = await supabase
          .from('topics')
          .select('*')
          .in('map_id', mapIds);

        if (error) throw error;

        // Group by map and update source maps
        const topicsByMap = (topicsData || []).reduce((acc, topic) => {
          if (!acc[topic.map_id]) acc[topic.map_id] = [];
          acc[topic.map_id].push(topic);
          return acc;
        }, {} as Record<string, any[]>);

        const updatedMaps = mergeState.sourceMaps.map(map => ({
          ...map,
          topics: (topicsByMap[map.id] || []) as EnrichedTopic[],
        }));

        setSourceMaps(updatedMaps);
      } catch (error) {
        console.error('Failed to load full topic data:', error);
      }
    };

    loadFullTopics();
  }, [mergeState.sourceMaps.length]); // Only run when source maps count changes
```

**Step 2: Add getSupabaseClient import**

Add to imports:

```typescript
import { getSupabaseClient } from '../../services/supabaseClient';
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add components/merge/MergeMapWizard.tsx
git commit -m "fix(merge): load full topic data when maps are selected"
```

---

## Phase 5: Testing and Verification

### Task 5.1: Manual Testing Checklist

**Step 1: Test map selection**

1. Navigate to project with 2+ maps
2. Click "Merge Maps"
3. Verify topic counts display correctly
4. Select 2 maps and click Next

**Step 2: Test context step**

1. Verify AI analysis runs automatically
2. Check that conflicts show AI suggestions
3. Resolve all conflicts
4. Click Next

**Step 3: Test EAV step**

1. Verify EAVs from both maps are listed
2. Test include/exclude toggles
3. Test bulk actions
4. Test search filter
5. Click Next

**Step 4: Test topics step**

1. Verify topic similarities are shown
2. Test merge/keep decisions
3. Test excluding unique topics
4. Click Next

**Step 5: Test review step**

1. Enter map name
2. Verify stats are correct
3. Check validation errors if any
4. Click "Create Merged Map"

**Step 6: Verify result**

1. Confirm new map appears in list
2. Load new map
3. Verify topic count matches expected
4. Verify topics have correct parent relationships

**Step 7: Commit verification**

```bash
git add .
git commit -m "test(merge): verify complete merge flow works"
```

---

## Summary

This plan implements the complete topical map merge feature:

1. **Phase 1**: Core execution service with database operations
2. **Phase 2**: UI components for EAV consolidation and review
3. **Phase 3**: Wire up wizard with all steps and execution
4. **Phase 4**: Fix topic data loading
5. **Phase 5**: Testing and verification

Files created:
- `services/mapMergeExecution.ts`
- `components/merge/MergeEavsStep.tsx`
- `components/merge/MergeReviewStep.tsx`

Files modified:
- `types.ts`
- `hooks/useMapMerge.ts`
- `components/merge/MergeMapWizard.tsx`

Total tasks: ~15 implementation tasks + testing
