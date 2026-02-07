# EAV Pipeline Fix & Core Flow Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the broken EAV data pipeline where semantic triples discovered during map creation never reach brief generation or article generation, undermining the entire semantic SEO value proposition.

**Architecture:** Thread `SemanticTriple[]` from `activeMap.eavs` through the brief generation call chain (facade → dispatcher → 5 providers → prompt), auto-populate `brief.eavs`, then add EAV-to-section mapping in briefs, section-level EAV enforcement in Pass 1, and a final verification audit.

**Tech Stack:** TypeScript, React, Vite (build: `npm run build`)

---

### Task 1: Thread EAVs Through Brief Generation Facade

**Files:**
- Modify: `services/ai/briefGeneration.ts:2` (import)
- Modify: `services/ai/briefGeneration.ts:418-427` (function signature)
- Modify: `services/ai/briefGeneration.ts:444-450` (provider dispatch calls)
- Modify: `services/ai/briefGeneration.ts:468-473` (return with eavs populated)

**Step 1: Add SemanticTriple import**

In `services/ai/briefGeneration.ts:2`, add `SemanticTriple` to the import:

```typescript
import { BusinessInfo, ResponseCode, ContentBrief, EnrichedTopic, SEOPillars, KnowledgeGraph, ContentIntegrityResult, SchemaGenerationResult, AuditRuleResult, BriefVisualSemantics, StreamingProgressCallback, HolisticSummary, CompetitorSpecs, SemanticTriple } from '../../types';
```

**Step 2: Add eavs parameter to generateContentBrief**

Change the function signature at line 418:

```typescript
export const generateContentBrief = async (
    businessInfo: BusinessInfo,
    topic: EnrichedTopic,
    allTopics: EnrichedTopic[],
    pillars: SEOPillars,
    knowledgeGraph: KnowledgeGraph,
    responseCode: ResponseCode,
    dispatch: React.Dispatch<any>,
    marketPatterns?: MarketPatterns,
    eavs?: SemanticTriple[]  // NEW: Semantic triples from topical map
): Promise<Omit<ContentBrief, 'id' | 'topic_id' | 'articleDraft'>> => {
```

**Step 3: Pass eavs through to all 5 providers**

At line 444, update the dispatch block to pass eavs to each provider:

```typescript
    const brief = await dispatchToProvider(businessInfo, {
        gemini: () => geminiService.generateContentBrief(businessInfo, topic, allTopics, pillars, knowledgeGraph, responseCode, dispatch, marketPatterns, eavs),
        openai: () => openAiService.generateContentBrief(businessInfo, topic, allTopics, pillars, knowledgeGraph, responseCode, dispatch, marketPatterns, eavs),
        anthropic: () => anthropicService.generateContentBrief(businessInfo, topic, allTopics, pillars, knowledgeGraph, responseCode, dispatch, marketPatterns, eavs),
        perplexity: () => perplexityService.generateContentBrief(businessInfo, topic, allTopics, pillars, knowledgeGraph, responseCode, dispatch, marketPatterns, eavs),
        openrouter: () => openRouterService.generateContentBrief(businessInfo, topic, allTopics, pillars, knowledgeGraph, responseCode, dispatch, marketPatterns, eavs),
    });
```

**Step 4: Auto-populate brief.eavs in the return**

At line 468, add eavs to the return object:

```typescript
    return {
        ...enrichedBrief,
        suggestedLengthPreset: lengthSuggestion.preset,
        suggestedLengthReason: lengthSuggestion.reason,
        competitorSpecs,
        eavs: eavs || [],  // NEW: Preserve input EAVs on the brief
    };
```

**Step 5: Build to verify no TypeScript errors**

Run: `npm run build`
Expected: PASS (eavs is optional, so downstream providers still compile)

**Step 6: Commit**

```bash
git add services/ai/briefGeneration.ts
git commit -m "feat(brief): thread EAVs parameter through brief generation facade"
```

---

### Task 2: Add EAVs to All 5 Provider Implementations

**Files:**
- Modify: `services/geminiService.ts:717-728`
- Modify: `services/openAiService.ts:413-418`
- Modify: `services/anthropicService.ts:853-856`
- Modify: `services/perplexityService.ts:285-288`
- Modify: `services/openRouterService.ts:288-291`

**Step 1: Update geminiService.ts**

At line 717, add `eavs` parameter and pass to prompt:

```typescript
export const generateContentBrief = async (
    businessInfo: BusinessInfo,
    topic: EnrichedTopic,
    allTopics: EnrichedTopic[],
    pillars: SEOPillars,
    knowledgeGraph: KnowledgeGraph,
    responseCode: ResponseCode,
    dispatch: React.Dispatch<any>,
    marketPatterns?: import('../types/competitiveIntelligence').MarketPatterns,
    eavs?: import('../types').SemanticTriple[]
): Promise<Omit<ContentBrief, 'id' | 'topic_id' | 'articleDraft'>> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.GENERATE_CONTENT_BRIEF_PROMPT(businessInfo, topic, allTopics, pillars, knowledgeGraph, responseCode, marketPatterns, eavs);
```

**Step 2: Update openAiService.ts**

At line 413, add eavs parameter and pass to prompt:

```typescript
export const generateContentBrief = async (
    info: BusinessInfo, topic: EnrichedTopic, allTopics: EnrichedTopic[], pillars: SEOPillars, kg: KnowledgeGraph, code: ResponseCode, dispatch: React.Dispatch<any>,
    marketPatterns?: import('../types/competitiveIntelligence').MarketPatterns,
    eavs?: import('../types').SemanticTriple[]
): Promise<Omit<ContentBrief, 'id' | 'topic_id' | 'articleDraft'>> => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.GENERATE_CONTENT_BRIEF_PROMPT(info, topic, allTopics, pillars, kg, code, marketPatterns, eavs);
```

**Step 3: Update anthropicService.ts**

At line 853:

```typescript
export const generateContentBrief = async (info: BusinessInfo, topic: EnrichedTopic, allTopics: EnrichedTopic[], pillars: SEOPillars, kg: KnowledgeGraph, code: ResponseCode, dispatch: React.Dispatch<any>,
    marketPatterns?: import('../types/competitiveIntelligence').MarketPatterns,
    eavs?: import('../types').SemanticTriple[]) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.GENERATE_CONTENT_BRIEF_PROMPT(info, topic, allTopics, pillars, kg, code, marketPatterns, eavs);
```

**Step 4: Update perplexityService.ts**

At line 285:

```typescript
export const generateContentBrief = async (info: BusinessInfo, topic: EnrichedTopic, allTopics: EnrichedTopic[], pillars: SEOPillars, kg: KnowledgeGraph, code: ResponseCode, dispatch: React.Dispatch<any>,
    marketPatterns?: import('../types/competitiveIntelligence').MarketPatterns,
    eavs?: import('../types').SemanticTriple[]) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.GENERATE_CONTENT_BRIEF_PROMPT(info, topic, allTopics, pillars, kg, code, marketPatterns, eavs);
```

**Step 5: Update openRouterService.ts**

At line 288:

```typescript
export const generateContentBrief = async (info: BusinessInfo, topic: EnrichedTopic, allTopics: EnrichedTopic[], pillars: SEOPillars, kg: KnowledgeGraph, code: ResponseCode, dispatch: React.Dispatch<any>,
    marketPatterns?: import('../types/competitiveIntelligence').MarketPatterns,
    eavs?: import('../types').SemanticTriple[]) => {
    const sanitizer = new AIResponseSanitizer(dispatch);
    const prompt = prompts.GENERATE_CONTENT_BRIEF_PROMPT(info, topic, allTopics, pillars, kg, code, marketPatterns, eavs);
```

**Step 6: Build to verify**

Run: `npm run build`
Expected: FAIL — `GENERATE_CONTENT_BRIEF_PROMPT` doesn't accept `eavs` yet. This is expected, fixed in Task 3.

**Step 7: Commit (will fix build in next task)**

```bash
git add services/geminiService.ts services/openAiService.ts services/anthropicService.ts services/perplexityService.ts services/openRouterService.ts
git commit -m "feat(providers): add EAVs parameter to all 5 brief generation providers"
```

---

### Task 3: Add EAVs to the Brief Prompt

**Files:**
- Modify: `config/prompts.ts:663` (function signature)
- Modify: `config/prompts.ts:688-691` (prompt body — add EAV data section)

**Step 1: Update GENERATE_CONTENT_BRIEF_PROMPT signature**

At line 663, add `eavs` parameter:

```typescript
export const GENERATE_CONTENT_BRIEF_PROMPT = (info: BusinessInfo, topic: EnrichedTopic, allTopics: EnrichedTopic[], pillars: SEOPillars, knowledgeGraph: KnowledgeGraph, responseCode: ResponseCode, marketPatterns?: MarketPatterns, eavs?: SemanticTriple[]): string => {
```

**Step 2: Build the EAV context section**

After line 667 (the kgContext definition), add EAV formatting:

```typescript
    // Format EAVs for prompt inclusion
    const eavContext = eavs && eavs.length > 0
        ? `\n**Semantic Triples (Entity-Attribute-Value) for this topic:**\n${eavs.slice(0, 30).map((eav, i) => {
            const category = eav.predicate?.category || 'UNCLASSIFIED';
            return `${i + 1}. [${category}] ${eav.subject?.label || '?'} → ${eav.predicate?.relation || '?'} → ${eav.object?.value || '?'}`;
          }).join('\n')}\n\nYou MUST incorporate these semantic triples into the structured_outline. Each section should map to at least one triple. Prioritize UNIQUE and ROOT triples in early sections. Populate the brief's 'eavs' field with these triples.\n`
        : '';
```

**Step 3: Insert EAV context into the prompt body**

After line 691 (`**Available Topics for Linking:** ...`), add the EAV context:

```typescript
**Available Topics for Linking:** ${allTopics.map(t => t.title).join(', ')}
${eavContext}
```

**Step 4: Build to verify**

Run: `npm run build`
Expected: PASS — all providers now pass eavs to the updated prompt function.

**Step 5: Commit**

```bash
git add config/prompts.ts
git commit -m "feat(prompt): include EAV semantic triples in brief generation prompt"
```

---

### Task 4: Pass EAVs from ProjectDashboardContainer

**Files:**
- Modify: `components/ProjectDashboardContainer.tsx:544`

**Step 1: Pass activeMap.eavs to generateContentBrief call**

At line 544, the current call is:

```typescript
const briefData = await aiService.generateContentBrief(configToUse, topic, allTopics, activeMap.pillars, safeKG, responseCode, dispatch);
```

Change to:

```typescript
const briefData = await aiService.generateContentBrief(configToUse, topic, allTopics, activeMap.pillars, safeKG, responseCode, dispatch, undefined, activeMap.eavs || []);
```

Note: `undefined` for the `marketPatterns` parameter (optional, only used in enhanced path). The `activeMap.eavs` is already available (line 315: `const eavs = activeMap.eavs || [];`).

**Step 2: Check if there's an enhanced brief generation path that also calls generateContentBrief**

Search for other call sites of `generateContentBrief` in the components to ensure all paths pass eavs.

**Step 3: Build to verify**

Run: `npm run build`
Expected: PASS

**Step 4: Commit**

```bash
git add components/ProjectDashboardContainer.tsx
git commit -m "feat(dashboard): pass map EAVs to brief generation call"
```

---

### Task 5: Add EAV-to-Section Mapping in Brief Output

**Files:**
- Modify: `config/prompts.ts:700` (Rule I.D instruction)
- Modify: `config/prompts.ts` (add Rule I.E for EAV-section mapping)

**Step 1: Enhance Rule I.D with EAV-section mapping instruction**

After existing Rule I.D at line 700, add a new rule:

```typescript
4.  **EAV-Section Mapping (Rule I.E):** For each section in 'structured_outline', include a 'mapped_eavs' field listing which Semantic Triples (by index from the list above) that section is responsible for covering. Every UNIQUE and ROOT triple MUST appear in at least one section's mapped_eavs. Example: { "heading": "Robot Materials", "mapped_eavs": [2, 5, 8] }
```

**Step 2: Build to verify**

Run: `npm run build`
Expected: PASS (prompt changes are string-only)

**Step 3: Commit**

```bash
git add config/prompts.ts
git commit -m "feat(prompt): add EAV-to-section mapping instruction in brief prompt"
```

---

### Task 6: Add mapped_eavs to BriefSection Type

**Files:**
- Modify: `types.ts` (BriefSection interface)

**Step 1: Find BriefSection interface and add mapped_eavs**

Search for `interface BriefSection` in `types.ts` and add the optional field:

```typescript
  mapped_eavs?: number[];  // Indices of SemanticTriple[] that this section covers
```

**Step 2: Build to verify**

Run: `npm run build`
Expected: PASS (optional field, backward compatible)

**Step 3: Commit**

```bash
git add types.ts
git commit -m "feat(types): add mapped_eavs field to BriefSection interface"
```

---

### Task 7: Update Flow Diagram Documentation

**Files:**
- Modify: `docs/flow-diagrams.md:979` (fix pass4Discourse file reference)
- Modify: `docs/flow-diagrams.md:1022` (fix pass6Visuals file reference)
- Modify: `CLAUDE.md` (fix "9-pass" → "10-pass")

**Step 1: Fix pass file references in flow diagram**

At line 979, change:
```
│  File: pass6Discourse.ts (aliased to Pass 4)
```
to:
```
│  File: pass4Discourse.ts
```

At line 1022, change:
```
│  File: pass4Visuals.ts (aliased to Pass 6)
```
to:
```
│  File: pass6Visuals.ts
```

**Step 2: Fix CLAUDE.md pass count**

Search for "9-pass" in CLAUDE.md and replace all occurrences with "10-pass".

**Step 3: Add EAV data flow to brief creation flow diagram**

In the Content Brief Creation Flow, Step 2 (Context Gathering, around line 466), add EAVs to the data sources:

After the "From Map" block, ensure `eavs` is listed with emphasis:
```
│  │ From Map:       │                                                     │
│  │ • pillars       │  (centralEntity, sourceContext, centralSearchIntent)│
│  │ • eavs          │  ★ SEMANTIC TRIPLES passed to AI prompt            │
```

**Step 4: Build to verify**

Run: `npm run build`
Expected: PASS (docs only)

**Step 5: Commit**

```bash
git add docs/flow-diagrams.md CLAUDE.md
git commit -m "docs: fix pass file references and pass count in flow diagrams"
```

---

### Task 8: EAV Coverage Validator for Topical Map

**Files:**
- Create: `services/ai/eavCoverageValidator.ts`

**Step 1: Create the validator**

```typescript
// services/ai/eavCoverageValidator.ts
import { EnrichedTopic, SemanticTriple } from '../../types';

export interface EAVCoverageResult {
  coveragePercentage: number;
  coveredTriples: Array<{ triple: SemanticTriple; coveredBy: string[] }>;
  uncoveredTriples: SemanticTriple[];
  categoryBreakdown: {
    ROOT: { total: number; covered: number };
    UNIQUE: { total: number; covered: number };
    RARE: { total: number; covered: number };
    COMMON: { total: number; covered: number };
  };
  warnings: string[];
}

/**
 * Validate how well topics cover the discovered EAV triples.
 * Checks topic titles, descriptions, canonical queries, and query networks
 * against EAV subject labels, predicate relations, and object values.
 */
export function validateEAVCoverage(
  topics: EnrichedTopic[],
  eavs: SemanticTriple[]
): EAVCoverageResult {
  if (!eavs || eavs.length === 0) {
    return {
      coveragePercentage: 100,
      coveredTriples: [],
      uncoveredTriples: [],
      categoryBreakdown: {
        ROOT: { total: 0, covered: 0 },
        UNIQUE: { total: 0, covered: 0 },
        RARE: { total: 0, covered: 0 },
        COMMON: { total: 0, covered: 0 },
      },
      warnings: ['No EAVs provided for coverage validation'],
    };
  }

  // Build searchable text corpus from all topics
  const topicTexts = topics.map(t => {
    const parts = [
      t.title,
      t.description,
      t.canonical_query,
      ...(t.query_network || []),
      t.attribute_focus,
    ].filter(Boolean).map(s => s!.toLowerCase());
    return { topic: t, searchText: parts.join(' ') };
  });

  const coveredTriples: EAVCoverageResult['coveredTriples'] = [];
  const uncoveredTriples: SemanticTriple[] = [];

  const categoryBreakdown = {
    ROOT: { total: 0, covered: 0 },
    UNIQUE: { total: 0, covered: 0 },
    RARE: { total: 0, covered: 0 },
    COMMON: { total: 0, covered: 0 },
  };

  for (const eav of eavs) {
    const category = (eav.predicate?.category || 'COMMON') as keyof typeof categoryBreakdown;
    if (categoryBreakdown[category]) {
      categoryBreakdown[category].total++;
    }

    // Build search terms from the EAV
    const searchTerms = [
      eav.subject?.label,
      eav.predicate?.relation,
      typeof eav.object?.value === 'string' ? eav.object.value : undefined,
      ...(eav.lexical?.synonyms || []),
    ].filter(Boolean).map(s => s!.toLowerCase());

    // Check if any topic covers this EAV (at least 2 of the 3 components match)
    const coveringTopics: string[] = [];
    for (const { topic, searchText } of topicTexts) {
      let matchCount = 0;
      for (const term of searchTerms) {
        if (term.length >= 3 && searchText.includes(term)) {
          matchCount++;
        }
      }
      if (matchCount >= 2) {
        coveringTopics.push(topic.title);
      }
    }

    if (coveringTopics.length > 0) {
      coveredTriples.push({ triple: eav, coveredBy: coveringTopics });
      if (categoryBreakdown[category]) {
        categoryBreakdown[category].covered++;
      }
    } else {
      uncoveredTriples.push(eav);
    }
  }

  const coveragePercentage = eavs.length > 0
    ? Math.round((coveredTriples.length / eavs.length) * 100)
    : 100;

  // Generate warnings
  const warnings: string[] = [];
  if (coveragePercentage < 70) {
    warnings.push(`Low EAV coverage: only ${coveragePercentage}% of semantic triples are represented in topics`);
  }
  if (categoryBreakdown.UNIQUE.total > 0 && categoryBreakdown.UNIQUE.covered / categoryBreakdown.UNIQUE.total < 0.5) {
    warnings.push(`Only ${categoryBreakdown.UNIQUE.covered}/${categoryBreakdown.UNIQUE.total} UNIQUE attributes covered — these are your competitive differentiators`);
  }
  if (categoryBreakdown.ROOT.total > 0 && categoryBreakdown.ROOT.covered / categoryBreakdown.ROOT.total < 0.5) {
    warnings.push(`Only ${categoryBreakdown.ROOT.covered}/${categoryBreakdown.ROOT.total} ROOT attributes covered — these are foundational definitions`);
  }

  return {
    coveragePercentage,
    coveredTriples,
    uncoveredTriples,
    categoryBreakdown,
    warnings,
  };
}
```

**Step 2: Build to verify**

Run: `npm run build`
Expected: PASS

**Step 3: Commit**

```bash
git add services/ai/eavCoverageValidator.ts
git commit -m "feat(validator): add EAV coverage validator for topical maps"
```

---

### Task 9: Integrate EAV Coverage Validator into Map Generation

**Files:**
- Modify: `hooks/useMapGeneration.ts` (or wherever map generation completes and dispatches results)

**Step 1: Find where map generation completes**

Search for `SET_TOPICS_FOR_MAP` or the function that saves topics after generation. Import and call `validateEAVCoverage()` there.

**Step 2: After topics are saved, run validation**

```typescript
import { validateEAVCoverage } from '../services/ai/eavCoverageValidator';

// After topics are generated and saved:
const allGeneratedTopics = [...coreTopics, ...outerTopics];
const eavCoverage = validateEAVCoverage(allGeneratedTopics, eavs);

if (eavCoverage.warnings.length > 0) {
  eavCoverage.warnings.forEach(w => {
    dispatch({
      type: 'LOG_EVENT',
      payload: { service: 'MapGeneration', message: w, status: 'warning', timestamp: Date.now() }
    });
  });
}

console.log(`[MapGeneration] EAV Coverage: ${eavCoverage.coveragePercentage}% (${eavCoverage.coveredTriples.length}/${eavs.length} triples covered)`);
```

**Step 3: Build to verify**

Run: `npm run build`
Expected: PASS

**Step 4: Commit**

```bash
git add hooks/useMapGeneration.ts services/ai/eavCoverageValidator.ts
git commit -m "feat(map): validate EAV coverage after map generation"
```

---

### Task 10: Strengthen Cross-Page EAV Consistency Penalty

**Files:**
- Modify: `services/ai/contentGeneration/passes/auditChecks.ts` (or wherever `validateCrossPageEavConsistency` is defined)

**Step 1: Find the cross-page penalty cap**

Search for `crossPagePenalty` or `validateCrossPageEavConsistency` and find the max penalty cap (currently -10).

**Step 2: Remove or raise the cap**

Change from:
```typescript
// max -10 penalty
const penalty = Math.min(contradictions * 2, 10);
```
to:
```typescript
// -5 per factual contradiction, -2 per terminology inconsistency, no cap
const factualPenalty = factualContradictions * 5;
const terminologyPenalty = terminologyInconsistencies * 2;
const penalty = factualPenalty + terminologyPenalty;
```

**Step 3: Build to verify**

Run: `npm run build`
Expected: PASS

**Step 4: Commit**

```bash
git add services/ai/contentGeneration/passes/auditChecks.ts
git commit -m "feat(audit): strengthen cross-page EAV consistency penalty"
```

---

### Task 11: Final Verification Audit

**Files:**
- No code changes — verification only

**Step 1: Full build verification**

Run: `npm run build`
Expected: PASS with zero TypeScript errors

**Step 2: Verify EAV pipeline end-to-end by tracing the call chain**

Manually trace (via code reading) the complete data flow:

```
1. ProjectDashboardContainer.tsx:544
   → Passes activeMap.eavs to generateContentBrief()

2. services/ai/briefGeneration.ts:418
   → Receives eavs parameter
   → Passes to dispatchToProvider (all 5 providers)
   → Auto-populates brief.eavs in return

3. Each provider (gemini/openai/anthropic/perplexity/openrouter)
   → Receives eavs parameter
   → Passes to GENERATE_CONTENT_BRIEF_PROMPT()

4. config/prompts.ts:663
   → Receives eavs parameter
   → Formats as numbered list with categories
   → Includes EAV-to-section mapping instruction (Rule I.E)

5. ContentBrief output
   → brief.eavs populated with input EAVs
   → structured_outline sections may include mapped_eavs

6. Pass 9 audit (auditChecks.ts)
   → Checks brief.eavs (now populated, not empty)
   → EAV density and placement validation meaningful
```

**Step 3: Verify EAV coverage validator**

Read `services/ai/eavCoverageValidator.ts` and confirm:
- Handles empty EAV arrays gracefully
- Uses fuzzy matching (lowercase, minimum 2 of 3 components)
- Reports per-category breakdown
- Generates warnings for low coverage

**Step 4: Verify flow diagram accuracy**

Read `docs/flow-diagrams.md` and confirm:
- Pass 4 references `pass4Discourse.ts` (not pass6)
- Pass 6 references `pass6Visuals.ts` (not pass4)
- Brief creation flow mentions EAVs being passed to AI prompt

**Step 5: Verify CLAUDE.md says "10-pass"**

Search CLAUDE.md for any remaining "9-pass" references.

**Step 6: Commit final state**

If any issues found during audit, fix and commit. Then:

```bash
git add -A
git commit -m "audit: verify EAV pipeline fix and flow diagram accuracy"
```

---

## Summary of Changes

| # | File | Change |
|---|------|--------|
| 1 | `services/ai/briefGeneration.ts` | Add `eavs` param, auto-populate `brief.eavs` |
| 2 | `services/geminiService.ts` | Add `eavs` param, pass to prompt |
| 3 | `services/openAiService.ts` | Add `eavs` param, pass to prompt |
| 4 | `services/anthropicService.ts` | Add `eavs` param, pass to prompt |
| 5 | `services/perplexityService.ts` | Add `eavs` param, pass to prompt |
| 6 | `services/openRouterService.ts` | Add `eavs` param, pass to prompt |
| 7 | `config/prompts.ts` | Add `eavs` param, format EAVs in prompt, add Rule I.E |
| 8 | `components/ProjectDashboardContainer.tsx` | Pass `activeMap.eavs` to brief generation |
| 9 | `types.ts` | Add `mapped_eavs` to BriefSection |
| 10 | `services/ai/eavCoverageValidator.ts` | NEW: EAV coverage validator |
| 11 | `hooks/useMapGeneration.ts` | Integrate coverage validator |
| 12 | `services/ai/contentGeneration/passes/auditChecks.ts` | Strengthen cross-page penalty |
| 13 | `docs/flow-diagrams.md` | Fix file references |
| 14 | `CLAUDE.md` | Fix "9-pass" → "10-pass" |

## Verification

After all tasks complete:
1. `npm run build` passes with zero errors
2. The EAV data pipeline is complete: map.eavs → brief prompt → brief.eavs → audit
3. Flow diagrams reference correct file names
4. CLAUDE.md says "10-pass"
5. EAV coverage validator runs after map generation
6. Cross-page EAV penalty is uncapped
