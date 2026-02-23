# Gap Analysis Pipeline — Semantic SEO Framework Compliance Overhaul

**Date**: 2026-02-23
**Status**: Planning
**Impact**: High — affects core pipeline step and all AI-generated gap analysis output

## Context

The Gap Analysis pipeline was built as a generic SEO competitor analysis tool that uses EAV terminology but fundamentally ignores the Holistic SEO / Cost of Retrieval framework. A comprehensive code review found **22 violations** across every layer: data fetching, AI prompts, scoring, gap detection, and UI messaging.

**Core architectural problem**: The entire pipeline is parameterized by `seedKeyword` — a flat string. The framework concepts (Central Entity, Source Context, Central Search Intent, EAV categories, content areas) are either ignored or reduced to this single string. The `SEOPillars` interface (`types/business.ts:215`) defines `centralEntity`, `sourceContext`, `centralSearchIntent`, `csiPredicates`, `contentAreas` — none of these are used in the gap analysis.

**User impact**: Knowledge Graph returns wrong entities, scores show 100/100 when nothing was measured, queries are generic "What is X?" content, gap detection misses real gaps because of exact string matching, and messaging doesn't educate the user about what to do.

**Reference**: The user's prompt template (`tmp/audit_improve_business/semantic-seo-prompt-template.md`) demonstrates the correct approach: entity-driven (not keyword-driven), EAV consistency, Source Context filtering, CSI predicates in headings, contextual bridges. Rule #1: "Entity-driven, not keyword-driven. Keywords inform, attributes structure."

---

## Code Review Findings (22 issues)

### CRITICAL (11)

| # | File | Line(s) | Issue |
|---|------|---------|-------|
| 1 | `services/googleApiOrchestrator.ts` | 147, 172, 230 | All Google API calls use `businessInfo.seedKeyword` instead of Central Entity from pillars |
| 2 | `services/ai/queryNetworkAudit.ts` | 184-214 | Query generation prompt ignores CE, SC, CSI, existing EAVs — produces generic queries |
| 3 | `services/ai/queryNetworkAudit.ts` | 392-417 | EAV extraction prompt uses `seedKeyword` as entity, no framework context |
| 4 | `services/ai/queryNetworkAudit.ts` | 487-538 | Gap detection uses exact `entity:attribute` string matching — misses real gaps |
| 5 | `components/pages/pipeline/PipelineGapStep.tsx` | 42-50 | Content Quality = own/competitor EAV count ratio, hits 100 at average |
| 6 | `components/pages/pipeline/PipelineGapStep.tsx` | 60-68 | Info Density = facts/sentence ratio, falls back to arbitrary `15` |
| 7 | `components/pages/pipeline/PipelineGapStep.tsx` | 70-83 | Topic Coverage uses entity name strings, no semantic similarity |
| 8 | `components/pages/pipeline/PipelineGapStep.tsx` | 49, 67, 80, 82 | Hardcoded fallback numbers (20, 15, 10, 60) for unmeasured dimensions |
| 9 | `services/ai/queryNetworkAudit.ts` | 1056-1059 | `calculateInformationDensity('')` with empty string — score always 100 |
| 10 | `services/googleApiOrchestrator.ts` | 124-129 | Entity salience only analyzes page titles — triggers "Insufficient content" |
| 11 | `components/pages/pipeline/PipelineGapStep.tsx` | 1706-1720 | Orchestrator config passes `businessInfo` but not resolved `centralEntity` |

### IMPORTANT (9)

| # | File | Line(s) | Issue |
|---|------|---------|-------|
| 12 | `types/audit.ts` | 1211-1241 | `QueryNetworkAuditConfig` has no fields for CE, SC, CSI, pillars, or EAVs |
| 13 | `config/prompts/_common.ts` | 175 | `businessContext()` labels CE as "Main Topic / Seed Keyword" |
| 14 | `services/ai/queryNetworkAudit.ts` | 515-522 | Gap priority is frequency-only. Missing ROOT attr from 1 competitor = "low" |
| 15 | `services/ai/queryNetworkAudit.ts` | 392-447 | EAV categories assigned per-page (AI can't determine UNIQUE from one page) |
| 16 | `services/ai/queryNetworkAudit.ts` | 543-767 | Recommendations are generic ("Add more specific facts") — no CE/SC/CSI context |
| 17 | `components/pages/pipeline/PipelineGapStep.tsx` | 1651-1751 | `handleRunAnalysis()` never reads `activeMap?.eavs` — user's EAVs ignored |
| 18 | `services/ai/queryNetworkAudit.ts` | 250-258 | Intent classifier has zero business context |
| 19 | `components/pages/pipeline/PipelineGapStep.tsx` | 1174-1199 | Score labels are generic ("Overall Health") not framework-specific |
| 20 | `services/ai/queryNetworkAudit.ts` | 176-238 | No per-content-area query generation using `SEOPillars.contentAreas` |

### SUGGESTIONS (2)

| # | File | Line(s) | Issue |
|---|------|---------|-------|
| 21 | `components/pages/pipeline/PipelineGapStep.tsx` | 1252-1264 | Empty state messages are generic, don't educate about framework |
| 22 | `services/ai/eavService.ts` | all | `getMissingPredicates()`, `getHighPriorityMissing()`, `calculateIndustryCoverage()` exist but are never used in gap analysis |

---

## Implementation Plan

### Step 1: Add Framework Fields to Data Model

**Files**: `types/audit.ts` (line 1211), `services/googleApiOrchestrator.ts` (line 56)

Add framework-aware fields to both config types.

**`QueryNetworkAuditConfig`** (`types/audit.ts:1211`) — add:
```typescript
pillars?: {
  centralEntity?: string;
  sourceContext?: string;
  centralSearchIntent?: string;
  csiPredicates?: string[];
  contentAreas?: string[];
  contentAreaTypes?: Array<'revenue' | 'authority'>;
};
existingEavs?: Array<{ subject: string; predicate: string; object: string; category?: string }>;
```

**`OrchestratorConfig`** (`services/googleApiOrchestrator.ts:56`) — add:
```typescript
centralEntity?: string;  // Resolved CE from pillars, fallback to seedKeyword
```

Also update `OrchestratorConfig.siteInventory` type to include the fields already being passed from `PipelineGapStep.tsx:1684` (`page_h1`, `meta_description`, `headings`).

**Fixes**: Issues #1, #11, #12, #17

---

### Step 2: Fix Google API Orchestrator — Use Central Entity

**File**: `services/googleApiOrchestrator.ts`

**2a: Knowledge Graph** (line 230) — replace `businessInfo.seedKeyword` with `config.centralEntity`:
```typescript
const kgSearchTerm = config.centralEntity || businessInfo.seedKeyword || '';
```

**2b: Entity Salience prominence** (line 147) — replace `businessInfo.seedKeyword`:
```typescript
const entityToMeasure = config.centralEntity || businessInfo.seedKeyword || '';
```

**2c: Entity Salience content** (lines 124-129) — use full page content, not just titles:
```typescript
const sampleText = siteInventory
  .slice(0, 20)
  .map(p => {
    const parts = [p.title, (p as any).page_h1, (p as any).meta_description];
    const headings = (p as any).headings;
    if (Array.isArray(headings)) {
      parts.push(...headings.map((h: any) => typeof h === 'string' ? h : h.text).filter(Boolean));
    }
    return parts.filter(Boolean).join('. ');
  })
  .filter(Boolean)
  .join('. ');
```

**2d: Google Trends** (line 172) — use `config.centralEntity`.

**2e: Caller in PipelineGapStep.tsx** (line 1706) — pass resolved `centralEntity`.

**Fixes**: Issues #1 (all sub-issues), #10, #11

---

### Step 3: Rewrite Query Generation with Framework Context

**File**: `services/ai/queryNetworkAudit.ts`, function `generateQueryNetwork()` (lines 176-238)

Add parameters for pillars and EAVs. Rewrite prompt to be entity-driven (not keyword-driven). Include CE, SC, CSI, CSI predicates, content areas, existing EAVs. Generate queries across 5 categories: attribute gaps, process expertise, comparison/commercial, CSI-aligned, trust/authority.

**Fixes**: Issues #2, #18, #20

---

### Step 4: Fix EAV Extraction Prompt

**File**: `services/ai/queryNetworkAudit.ts`, EAV extraction (lines 392-417)

Use Central Entity instead of seedKeyword. Add framework context. Remove per-page category assignment — compute categories algorithmically from cross-page frequency after all EAVs are collected.

**Fixes**: Issues #3, #15

---

### Step 5: Fix Gap Detection — Semantic Matching + Category-Weighted Priority

**File**: `services/ai/queryNetworkAudit.ts`, function `identifyContentGaps()` (lines 487-538)

Replace exact string matching with normalized token overlap. Also match against user's strategic EAVs. Use category-weighted priority (ROOT/UNIQUE always important, regardless of frequency).

**Fixes**: Issues #4, #14

---

### Step 6: Fix Information Density Calculation

**File**: `services/ai/queryNetworkAudit.ts`, `calculateInformationDensity()` (lines 452-482)

Fix empty-string bug where competitor average always scores 100.

**Fixes**: Issue #9

---

### Step 7: Fix Scoring — Framework-Aligned, No Arbitrary Fallbacks

**File**: `components/pages/pipeline/PipelineGapStep.tsx`, `computeGapScores()` (lines 31-105)

Return `null` for unmeasured dimensions. Rename labels to framework terminology. Use existing `eavService.ts` functions for industry-aware scoring. Remove all hardcoded fallbacks.

**Fixes**: Issues #5, #6, #7, #8, #19, #22

---

### Step 8: Fix `businessContext()` Helper Label

**File**: `config/prompts/_common.ts` (line 175)

Change "Main Topic / Seed Keyword" to "Central Entity". Affects ALL AI prompts system-wide.

**Fixes**: Issue #13

---

### Step 9: Improve Recommendations with Framework Context

**File**: `services/ai/queryNetworkAudit.ts`, `generateRecommendations()` (lines 543-767)

Include EAV category context. Use `getHighPriorityMissing()` from `eavService.ts`. Reference Source Context and content areas.

**Fixes**: Issues #16, #22

---

### Step 10: Improve UI Messaging — Educate the User

**File**: `components/pages/pipeline/PipelineGapStep.tsx`

No-own-content banner. Null-score cards. Knowledge Graph guidance. Entity salience explanation. Gap findings distinction. Query context. Empty state guidance.

**Fixes**: Issues #16, #21

---

### Step 11: Pass Framework Data from Caller

**File**: `components/pages/pipeline/PipelineGapStep.tsx`, `handleRunAnalysis()` (lines 1651-1751)

Pass pillars, existing EAVs, and central entity through the config.

**Fixes**: Issues #11, #17

---

## Files Summary

| File | Change |
|------|--------|
| `types/audit.ts` | Add `pillars` and `existingEavs` to `QueryNetworkAuditConfig` |
| `services/googleApiOrchestrator.ts` | Add `centralEntity` to config; fix KG, NLP, Trends; fix salience content; update siteInventory type |
| `services/ai/queryNetworkAudit.ts` | Rewrite query prompt with CE/SC/CSI; fix EAV extraction; post-process categories; semantic gap matching; category-weighted priority; fix density calc; improve recommendations |
| `components/pages/pipeline/PipelineGapStep.tsx` | Pass pillars/EAVs; fix scoring (null not fallback); rename labels; all UI messaging; no-own-content banner |
| `config/prompts/_common.ts` | Fix "Seed Keyword" label to "Central Entity" |

---

## Verification

```bash
npx tsc --noEmit      # Zero TypeScript errors
npx vitest run         # All tests pass
```

Manual testing with a map that has pillars defined (CE, SC, CSI, EAVs).
