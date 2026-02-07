# Core Pipeline Improvements — Remaining Issues

**Goal:** Implement all remaining improvements from the critical pipeline analysis covering Map → Brief → Article flows. These are Priorities 3–6 from the original analysis.

**Pre-requisite:** Priority 1 (EAV pipeline fix) and Priority 2 (EAV coverage validation) are already implemented.

**Tech Stack:** TypeScript, React, Vite (build: `npm run build`)

---

## Priority 3: Audit Re-Generation & Pass Rollback

### Task 1: Add Targeted Pass Re-Run Capability

**Problem:** When Pass 9 audit fails (< 50%), the entire job is marked `failed`. User must restart from scratch. No way to re-run specific passes that caused regression.

**Current behavior** (`pass8Audit.ts:147-174`): Throws error, sets `job.status = 'failed'`, stores `last_error`. In `useContentGeneration.ts:1539-1546`, the catch block sets `isFailed: true`.

**Architecture already supports rollback data:** `baseSectionPass.ts:69-86` saves per-pass versions in `section.pass_contents = { pass_1: '...', pass_2: '...', ... }`.

**Files:**
- Modify: `hooks/useContentGeneration.ts` — add `rerunPass(passNumber)` and `rollbackToPass(passNumber)` functions
- Modify: `services/ai/contentGeneration/orchestrator.ts` — add `rollbackSectionsToPass(jobId, passNumber)` method
- Modify: `services/ai/contentGeneration/passes/pass8Audit.ts` — on failure, store which rules failed and suggest which pass to re-run

**Step 1: Add rollback method to orchestrator**

In `orchestrator.ts`, add a method that restores all sections to their content at a given pass:

```typescript
async rollbackSectionsToPass(jobId: string, targetPass: number): Promise<void> {
  const sections = await this.getSections(jobId);
  for (const section of sections) {
    const passKey = `pass_${targetPass}`;
    const previousContent = section.pass_contents?.[passKey];
    if (previousContent) {
      await this.upsertSection({
        ...section,
        current_content: previousContent,
        current_pass: targetPass,
      });
    }
  }
}
```

**Step 2: Add rerunPass to useContentGeneration**

In `useContentGeneration.ts`, after the existing `retryGeneration` function, add:

```typescript
const rerunFromPass = useCallback(async (passNumber: number) => {
  if (!currentJob) return;

  // Rollback sections to the pass before the target
  await orchestrator.rollbackSectionsToPass(currentJob.id, passNumber - 1);

  // Update job to resume from that pass
  await orchestrator.updateJob(currentJob.id, {
    status: 'processing',
    current_pass: passNumber,
    last_error: null,
    passes_status: {
      ...currentJob.passes_status,
      // Reset all passes from passNumber onwards
      ...Object.fromEntries(
        Array.from({ length: 10 - passNumber + 1 }, (_, i) => [
          `pass_${passNumber + i}_${getPassName(passNumber + i)}`,
          'pending'
        ])
      ),
    },
  });

  // Resume generation from that pass
  await startGeneration(/* resume from passNumber */);
}, [currentJob, orchestrator]);
```

**Step 3: Modify audit failure to suggest re-run**

In `pass8Audit.ts`, when `finalScore < CRITICAL_THRESHOLD`, instead of throwing immediately:

```typescript
// Store failure details with re-run recommendation
const rerunSuggestion = identifyRerunTarget(failingRules, qualityGateHistory);
await orchestrator.updateJob(job.id, {
  status: 'audit_failed',  // New status (not 'failed')
  final_audit_score: finalScore,
  audit_details: { ...auditDetails, rerunSuggestion },
  last_error: `Audit score ${finalScore}% below ${CRITICAL_THRESHOLD}% threshold. Suggested: re-run from Pass ${rerunSuggestion.targetPass}.`,
});
```

Add helper function:

```typescript
function identifyRerunTarget(
  failingRules: AuditRuleResult[],
  qualityHistory?: Record<number, number>
): { targetPass: number; reason: string } {
  // Map failing rules to the pass most likely to fix them
  const ruleToPass: Record<string, number> = {
    'CENTERPIECE': 1,        // Draft issue
    'HEADING_HIERARCHY': 2,  // Header optimization
    'LIST_LOGIC': 3,         // Lists & tables
    'IMAGE_PLACEMENT': 6,    // Visual semantics
    'EAV_DENSITY': 5,        // Micro semantics
    'LLM_SIGNATURE': 5,      // Micro semantics
  };

  // Find the earliest pass that could fix the most failures
  const passCounts: Record<number, number> = {};
  for (const rule of failingRules) {
    const pass = ruleToPass[rule.ruleName || ''] || 1;
    passCounts[pass] = (passCounts[pass] || 0) + 1;
  }

  const targetPass = Object.entries(passCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || '1';

  return {
    targetPass: parseInt(targetPass),
    reason: `${passCounts[parseInt(targetPass)]} failing rules are addressable by Pass ${targetPass}`,
  };
}
```

**Step 4: Build to verify**

Run: `npm run build`

**Step 5: Commit**

```bash
git add hooks/useContentGeneration.ts services/ai/contentGeneration/orchestrator.ts services/ai/contentGeneration/passes/pass8Audit.ts
git commit -m "feat(audit): add targeted pass re-run capability on audit failure"
```

---

### Task 2: Expose Quality Gate Controls to Users

**Problem:** Quality gates between passes 1-8 detect regressions but always continue (`soft` mode). The `validationMode` parameter supports `hard` and `checkpoint` modes but isn't exposed to users.

**Current behavior** (`useContentGeneration.ts:1007-1062`): `runInterPassValidation()` checks mode. Checkpoint mode sets `job.status = 'checkpoint'` but no UI handles this.

**Files:**
- Modify: `hooks/useContentGeneration.ts` — accept `validationMode` from caller
- Modify: `components/modals/DraftingModal.tsx` — add quality gate mode selector
- Modify: `components/ContentGenerationProgress.tsx` — handle `checkpoint` status with approve/reject buttons

**Step 1: Thread validationMode through hook**

In `useContentGeneration.ts`, ensure the `startGeneration` function accepts `validationMode` parameter and passes it through to `runInterPassValidation()`. Find where `validationMode` is currently hardcoded (likely defaulting to `'soft'` or `'hard'`) and make it configurable.

**Step 2: Add mode selector to DraftingModal**

In `DraftingModal.tsx`, add a simple 3-option selector before generation starts:

```typescript
<div className="flex gap-2 mb-4">
  <label className="text-sm font-medium">Quality Mode:</label>
  <select value={validationMode} onChange={e => setValidationMode(e.target.value)}>
    <option value="soft">Fast (warnings only)</option>
    <option value="hard">Strict (stop on regression)</option>
    <option value="checkpoint">Review (pause for approval)</option>
  </select>
</div>
```

**Step 3: Handle checkpoint pause in progress UI**

In `ContentGenerationProgress.tsx`, when `job.status === 'checkpoint'`:

```typescript
{job.status === 'checkpoint' && (
  <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
    <p className="text-sm font-medium">Quality checkpoint — review needed</p>
    <p className="text-sm text-gray-600">{job.quality_warning}</p>
    <div className="flex gap-2 mt-2">
      <button onClick={onApproveCheckpoint}>Continue</button>
      <button onClick={() => onRollbackToPass(job.current_pass - 1)}>Rollback</button>
    </div>
  </div>
)}
```

**Step 4: Build to verify**

Run: `npm run build`

**Step 5: Commit**

```bash
git add hooks/useContentGeneration.ts components/modals/DraftingModal.tsx components/ContentGenerationProgress.tsx
git commit -m "feat(generation): expose quality gate modes to users with checkpoint UI"
```

---

## Priority 4: Section-Level EAV Enforcement in Pass 1

### Task 3: Include Section-Specific EAVs in Pass 1 Prompts

**Problem:** Pass 1 generates ALL section content without EAV data in the prompt. EAV validation first appears in Pass 5. By then, content structure is set and corrections are cosmetic.

**Current behavior** (`sectionPromptBuilder.ts:296-488`): Builds comprehensive prompts with discourse context, format codes, linking — but NO section-specific EAVs. The `mapped_eavs` field on `BriefSection` exists (we added it in the EAV pipeline fix) but isn't consumed.

**Files:**
- Modify: `services/ai/contentGeneration/rulesEngine/prompts/sectionPromptBuilder.ts` — add EAV section to prompt
- Modify: `services/ai/contentGeneration/passes/pass1DraftGeneration.ts` — pass brief.eavs into context

**Step 1: Add EAV data to SectionGenerationContext**

In the types file where `SectionGenerationContext` is defined, ensure it includes:

```typescript
interface SectionGenerationContext {
  // ... existing fields ...
  sectionEavs?: SemanticTriple[];  // EAVs assigned to this specific section
}
```

**Step 2: Populate sectionEavs in Pass 1**

In `pass1DraftGeneration.ts`, when building `SectionGenerationContext` (around line 381-392):

```typescript
// Extract EAVs mapped to this section
const sectionEavs = section.mapped_eavs && brief.eavs
  ? section.mapped_eavs
      .filter(idx => idx >= 0 && idx < brief.eavs!.length)
      .map(idx => brief.eavs![idx])
  : [];

const context: SectionGenerationContext = {
  // ... existing fields ...
  sectionEavs,
};
```

**Step 3: Add EAV block to SectionPromptBuilder**

In `sectionPromptBuilder.ts`, after the discourse context section (~line 359) and before prohibited patterns (~line 412), add:

```typescript
// Section-specific EAV enforcement
if (context.sectionEavs && context.sectionEavs.length > 0) {
  parts.push(`\n**Semantic Triples to Cover in This Section:**`);
  parts.push(`This section MUST incorporate the following Entity-Attribute-Value facts:`);
  for (const eav of context.sectionEavs) {
    const category = eav.predicate?.category || 'UNCLASSIFIED';
    parts.push(`- [${category}] ${eav.subject?.label || '?'} → ${eav.predicate?.relation || '?'} → ${eav.object?.value || '?'}`);
  }
  parts.push(`Each triple must appear as a factual statement. Use the entity name explicitly (no pronouns).`);
}
```

**Step 4: Build to verify**

Run: `npm run build`

**Step 5: Commit**

```bash
git add services/ai/contentGeneration/rulesEngine/prompts/sectionPromptBuilder.ts services/ai/contentGeneration/passes/pass1DraftGeneration.ts
git commit -m "feat(pass1): include section-specific EAVs in draft generation prompts"
```

---

### Task 4: Add Lightweight EAV Presence Check After Pass 1

**Problem:** Pass 1 validators (language, prohibited, wordcount, structure) skip EAV density check entirely (`validators/index.ts:65`: `if (runAll || !isPass1)`).

**Files:**
- Modify: `services/ai/contentGeneration/rulesEngine/validators/index.ts` — add lightweight EAV presence validator for Pass 1
- Create: `services/ai/contentGeneration/rulesEngine/validators/eavPresenceValidator.ts`

**Step 1: Create lightweight EAV presence validator**

Unlike the full EAV density validator (which checks per-sentence density), this is a simple check: does the section mention its assigned EAVs at all?

```typescript
// eavPresenceValidator.ts
import { SectionGenerationContext } from '../../../../types';
import { ValidationViolation } from '../../../../types';

export function validateEavPresence(
  content: string,
  context: SectionGenerationContext
): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  const sectionEavs = context.sectionEavs || [];

  if (sectionEavs.length === 0) return violations;

  const contentLower = content.toLowerCase();

  for (const eav of sectionEavs) {
    const subjectLabel = eav.subject?.label?.toLowerCase();
    const objectValue = typeof eav.object?.value === 'string' ? eav.object.value.toLowerCase() : '';

    const hasSubject = subjectLabel && contentLower.includes(subjectLabel);
    const hasObject = objectValue && objectValue.length >= 3 && contentLower.includes(objectValue);

    if (!hasSubject && !hasObject) {
      violations.push({
        rule: 'EAV_PRESENCE',
        text: `Missing EAV: "${eav.subject?.label} → ${eav.predicate?.relation} → ${eav.object?.value}"`,
        position: 0,
        suggestion: `Include a factual statement about "${eav.subject?.label}" and "${eav.object?.value}" in this section.`,
        severity: 'warning',
      });
    }
  }

  return violations;
}
```

**Step 2: Register in validators/index.ts**

Add to the Pass 1 validator set. Since it's a warning (not error), it triggers retry with fix instructions but doesn't block in soft mode.

**Step 3: Build to verify**

Run: `npm run build`

**Step 4: Commit**

```bash
git add services/ai/contentGeneration/rulesEngine/validators/eavPresenceValidator.ts services/ai/contentGeneration/rulesEngine/validators/index.ts
git commit -m "feat(validation): add lightweight EAV presence check in Pass 1"
```

---

## Priority 5: Enhanced Topic Context

### Task 5: Pass Topic Relationships to Brief Generation for Better Internal Linking

**Problem:** Internal linking relies on topic titles alone. No semantic distance, parent/child metadata, or cluster info is passed.

**Current behavior** (`prompts.ts:699`): `Available Topics for Linking: ${allTopics.map(t => t.title).join(', ')}` — just a comma-separated list of names.

**Files:**
- Modify: `config/prompts.ts` — enhance linking context with topic relationships
- Modify: `services/ai/briefGeneration.ts` — compute and pass relationship data

**Step 1: Build topic relationship context in briefGeneration.ts**

In `generateContentBrief()`, after existing parameter handling, compute relationship data:

```typescript
// Build enriched topic context for linking
const enrichedLinkingContext = allTopics.slice(0, 20).map(t => {
  const isParent = topic.parent_topic_id === t.id;
  const isSibling = topic.parent_topic_id && topic.parent_topic_id === t.parent_topic_id && t.id !== topic.id;
  const isChild = t.parent_topic_id === topic.id;
  const relationship = isParent ? 'PARENT' : isChild ? 'CHILD' : isSibling ? 'SIBLING' : 'RELATED';
  return `- "${t.title}" [${relationship}] (${t.type || 'topic'})`;
}).join('\n');
```

**Step 2: Replace simple title list in prompt**

In `prompts.ts`, change the linking context from the simple comma list to the enriched format:

```typescript
**Available Topics for Linking (with relationships):**
${enrichedLinkingContext || allTopics.map(t => t.title).join(', ')}

Prioritize PARENT and SIBLING topics for internal links. CHILD topics are good for "learn more" links. Use relationship context to generate more semantically relevant anchor text.
```

Note: This should be passed as a parameter to `GENERATE_CONTENT_BRIEF_PROMPT`, similar to how we added `eavs`.

**Step 3: Build to verify**

Run: `npm run build`

**Step 4: Commit**

```bash
git add config/prompts.ts services/ai/briefGeneration.ts
git commit -m "feat(brief): pass topic relationships for smarter internal linking"
```

---

### Task 6: Expand Knowledge Graph Context from 15 to 30 Nodes (Topic-Relevant)

**Problem:** Only first 15 KG nodes by insertion order are sent to AI. Large knowledge graphs lose important context.

**Current behavior** (`prompts.ts:665-667`):
```typescript
const kgContext = knowledgeGraph
  ? JSON.stringify(Array.from(knowledgeGraph.getNodes().values()).slice(0, 15).map(n => ({ term: n.term })), null, 2)
  : "No Knowledge Graph available.";
```

**Files:**
- Modify: `config/prompts.ts` — change slicing logic to relevance-based selection

**Step 1: Filter by relevance to topic**

```typescript
const kgContext = knowledgeGraph
  ? (() => {
      const allNodes = Array.from(knowledgeGraph.getNodes().values());
      const topicTerms = [topic.title, topic.canonical_query, topic.attribute_focus]
        .filter(Boolean).map(s => s!.toLowerCase());

      // Score nodes by relevance to this specific topic
      const scored = allNodes.map(n => {
        const termLower = n.term.toLowerCase();
        let relevance = 0;
        for (const t of topicTerms) {
          if (t.includes(termLower) || termLower.includes(t)) relevance += 3;
          else if (t.split(/\s+/).some(w => termLower.includes(w))) relevance += 1;
        }
        // Boost by node importance metadata
        relevance += (n.metadata?.importance || 0);
        return { node: n, relevance };
      });

      // Take top 30, sorted by relevance then alphabetically
      const topNodes = scored
        .sort((a, b) => b.relevance - a.relevance || a.node.term.localeCompare(b.node.term))
        .slice(0, 30)
        .map(s => ({ term: s.node.term }));

      return JSON.stringify(topNodes, null, 2);
    })()
  : "No Knowledge Graph available.";
```

**Step 2: Build to verify**

Run: `npm run build`

**Step 3: Commit**

```bash
git add config/prompts.ts
git commit -m "feat(prompt): expand KG context to 30 topic-relevant nodes"
```

---

## Priority 6A: Map Generation Improvements

### Task 7: Cannibalization Prevention During Map Generation

**Problem:** `findCannibalizationRisks()` in `clustering.ts` detects topic pairs with semantic distance < 0.2 AFTER generation. User must manually merge.

**Current behavior** (`clustering.ts:170-208`): Post-hoc O(n^2) comparison returns risky pairs. Not called during generation.

**Files:**
- Modify: `hooks/useMapGeneration.ts` — add cannibalization check after topic generation, before DB save
- Modify: `services/ai/clustering.ts` — add lightweight title-based dedup for use during generation (no KG required)

**Step 1: Add title-based dedup function**

In `clustering.ts`, add a function that detects near-duplicate topics by comparing canonical queries and titles. This doesn't need the full KG — it uses string similarity:

```typescript
export function detectTitleCannibalization(
  topics: EnrichedTopic[]
): Array<{ topicA: EnrichedTopic; topicB: EnrichedTopic; similarity: number; recommendation: string }> {
  const risks: Array<{ topicA: EnrichedTopic; topicB: EnrichedTopic; similarity: number; recommendation: string }> = [];

  for (let i = 0; i < topics.length; i++) {
    for (let j = i + 1; j < topics.length; j++) {
      const a = topics[i];
      const b = topics[j];

      // Compare canonical queries first (most specific)
      const queryA = (a.canonical_query || a.title).toLowerCase();
      const queryB = (b.canonical_query || b.title).toLowerCase();

      // Jaccard similarity on words
      const wordsA = new Set(queryA.split(/\s+/).filter(w => w.length > 2));
      const wordsB = new Set(queryB.split(/\s+/).filter(w => w.length > 2));
      const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
      const union = new Set([...wordsA, ...wordsB]);
      const similarity = union.size > 0 ? intersection.size / union.size : 0;

      if (similarity > 0.7) {
        risks.push({
          topicA: a, topicB: b, similarity,
          recommendation: `Consider merging "${a.title}" and "${b.title}" (${Math.round(similarity * 100)}% word overlap in canonical queries)`,
        });
      }
    }
  }

  return risks.sort((a, b) => b.similarity - a.similarity);
}
```

**Step 2: Call during map generation**

In `useMapGeneration.ts`, after finalTopics are assembled but before DB save, call the dedup function and log warnings:

```typescript
// Check for cannibalization risks
const cannibalizationRisks = detectTitleCannibalization(validTopics);
if (cannibalizationRisks.length > 0) {
  cannibalizationRisks.forEach(risk => {
    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'MapGeneration',
        message: risk.recommendation,
        status: 'warning',
        timestamp: Date.now(),
      },
    });
  });
  console.warn(`[MapGeneration] ${cannibalizationRisks.length} cannibalization risks detected`);
}
```

**Step 3: Build to verify**

Run: `npm run build`

**Step 4: Commit**

```bash
git add services/ai/clustering.ts hooks/useMapGeneration.ts
git commit -m "feat(map): detect cannibalization risks during map generation"
```

---

### Task 8: Content Flow Validation (Informational Before Monetization)

**Problem:** No check that informational topics properly introduce concepts before monetization topics reference them. A monetization topic about "Pricing" might exist without its foundational "How It Works" informational topic.

**Files:**
- Create: `services/ai/contentFlowValidator.ts`
- Modify: `hooks/useMapGeneration.ts` — call after map generation

**Step 1: Create content flow validator**

```typescript
// services/ai/contentFlowValidator.ts
import { EnrichedTopic } from '../../types';

export interface ContentFlowIssue {
  monetizationTopic: string;
  missingFoundation: string;
  severity: 'warning' | 'info';
}

export interface ContentFlowResult {
  isValid: boolean;
  issues: ContentFlowIssue[];
  informationalCount: number;
  monetizationCount: number;
}

/**
 * Validate that monetization topics have supporting informational topics.
 * Checks that foundational concepts are covered by informational content.
 */
export function validateContentFlow(topics: EnrichedTopic[]): ContentFlowResult {
  const informational = topics.filter(t => t.topic_class !== 'monetization');
  const monetization = topics.filter(t => t.topic_class === 'monetization');
  const issues: ContentFlowIssue[] = [];

  // Build corpus of informational topic coverage
  const informationalCorpus = informational
    .map(t => [t.title, t.description, t.canonical_query].filter(Boolean).join(' ').toLowerCase())
    .join(' ');

  for (const monTopic of monetization) {
    // Extract key concepts from monetization topic
    const titleWords = monTopic.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const parentTopic = topics.find(t => t.id === monTopic.parent_topic_id);

    // Check if parent topic exists and is informational
    if (monTopic.parent_topic_id && !parentTopic) {
      issues.push({
        monetizationTopic: monTopic.title,
        missingFoundation: `Parent topic not found (orphaned monetization topic)`,
        severity: 'warning',
      });
    }

    // Check if key concepts from monetization topic are covered by informational topics
    const conceptsCovered = titleWords.filter(w => informationalCorpus.includes(w));
    if (conceptsCovered.length < titleWords.length * 0.3) {
      issues.push({
        monetizationTopic: monTopic.title,
        missingFoundation: `Few informational topics cover the concepts in this monetization topic`,
        severity: 'info',
      });
    }
  }

  return {
    isValid: issues.filter(i => i.severity === 'warning').length === 0,
    issues,
    informationalCount: informational.length,
    monetizationCount: monetization.length,
  };
}
```

**Step 2: Integrate in useMapGeneration.ts**

After the existing EAV coverage validation call, add:

```typescript
import { validateContentFlow } from '../services/ai/contentFlowValidator';

// Validate content flow (informational → monetization ordering)
const flowResult = validateContentFlow(validTopics);
if (flowResult.issues.length > 0) {
  flowResult.issues.forEach(issue => {
    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'MapGeneration',
        message: `[${issue.severity.toUpperCase()}] ${issue.monetizationTopic}: ${issue.missingFoundation}`,
        status: issue.severity === 'warning' ? 'warning' : 'info',
        timestamp: Date.now(),
      },
    });
  });
}
```

**Step 3: Build to verify**

Run: `npm run build`

**Step 4: Commit**

```bash
git add services/ai/contentFlowValidator.ts hooks/useMapGeneration.ts
git commit -m "feat(map): validate content flow ordering (informational before monetization)"
```

---

## Priority 6B: Brief Generation Improvements

### Task 9: Validate Featured Snippet Target After Brief Generation

**Problem:** AI identifies featured snippet question but no validation that: (a) the question is answerable by the structured_outline, (b) required predicates appear in target section, (c) answer length is realistic.

**Current behavior:** `featured_snippet_target` is generated but never validated post-generation.

**Files:**
- Modify: `services/ai/briefGeneration.ts` — add post-generation FS validation

**Step 1: Add FS validation after brief enrichment**

In `briefGeneration.ts`, after `enrichBriefWithVisualSemantics()` and before the return, add validation:

```typescript
// Validate featured snippet target is achievable
if (enrichedBrief.featured_snippet_target && enrichedBrief.structured_outline) {
  const fsTarget = enrichedBrief.featured_snippet_target;
  const outlineHeadings = enrichedBrief.structured_outline.map(s => s.heading?.toLowerCase() || '');
  const questionWords = (fsTarget.question || '').toLowerCase().split(/\s+/).filter(w => w.length > 3);

  // Check if any section heading relates to the FS question
  const hasMatchingSection = outlineHeadings.some(h =>
    questionWords.some(w => h.includes(w))
  );

  if (!hasMatchingSection) {
    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'BriefGeneration',
        message: `Featured snippet target "${fsTarget.question}" may not be answered by any section in the outline`,
        status: 'warning',
        timestamp: Date.now(),
      },
    });
  }
}
```

**Step 2: Build to verify**

Run: `npm run build`

**Step 3: Commit**

```bash
git add services/ai/briefGeneration.ts
git commit -m "feat(brief): validate featured snippet target against outline structure"
```

---

### Task 10: Make Conclusions Configurable Per Website Type

**Problem:** Conclusions are universally disabled (`orchestrator.ts:697-738`). While appropriate for informational content, monetization content (E-commerce, SaaS) benefits from CTA sections.

**Current behavior:** `hasConclusionInOutline = false` and `conclusionFromOutline = null` are hardcoded. Comments reference user feedback: "I really dislike them also only AI does that."

**Files:**
- Modify: `services/ai/contentGeneration/orchestrator.ts` — make conclusion configurable
- Modify: `config/websiteTypeTemplates.ts` — add `enableConclusion` per website type

**Step 1: Add conclusion config to website type templates**

In `websiteTypeTemplates.ts`, add to each website type config:

```typescript
enableConclusion: boolean;  // Whether to generate a conclusion/CTA section
```

Settings:
- `ECOMMERCE: true` (CTA section for conversions)
- `SAAS: true` (CTA section for signups)
- `SERVICE_B2B: true` (CTA section for contact)
- `INFORMATIONAL: false` (no conclusion per user preference)
- `AFFILIATE_REVIEW: true` (CTA for affiliate links)
- Default: `false`

**Step 2: Update parseSectionsFromBrief**

In `orchestrator.ts`, replace the hardcoded `false` with a config lookup:

```typescript
const websiteType = options?.websiteType;
const templateConfig = websiteType ? getWebsiteTypeTemplate(websiteType) : null;
const enableConclusion = templateConfig?.enableConclusion ?? false;

let hasConclusionInOutline = false;
let conclusionFromOutline: SectionDefinition | null = null;

if (enableConclusion) {
  // Existing conclusion detection logic (currently commented out)
  // Restore it here, gated by enableConclusion
}
```

**Step 3: Pass websiteType through to parseSectionsFromBrief**

Ensure the `options` parameter includes `websiteType` from `businessInfo.websiteType`.

**Step 4: Build to verify**

Run: `npm run build`

**Step 5: Commit**

```bash
git add services/ai/contentGeneration/orchestrator.ts config/websiteTypeTemplates.ts
git commit -m "feat(generation): make conclusions configurable per website type"
```

---

## Priority 6C: Article Generation Improvements

### Task 11: Add Basic Hallucination Detection

**Problem:** No semantic fact-checking against SERP data or brief facts. Audit checks for LLM signature phrases but not factual accuracy.

**Files:**
- Create: `services/ai/contentGeneration/rulesEngine/validators/factConsistencyValidator.ts`
- Modify: `services/ai/contentGeneration/rulesEngine/validators/index.ts` — register new validator

**Step 1: Create fact consistency validator**

This cross-references generated claims against `brief.eavs` and `brief.serpAnalysis`. It's NOT a full fact-checker — it detects statements that contradict the input data.

```typescript
// factConsistencyValidator.ts
import { SectionGenerationContext, ValidationViolation } from '../../../../types';

/**
 * Lightweight fact consistency check.
 * Detects:
 * 1. Numeric claims not supported by brief data
 * 2. Entity names that don't match brief entities
 * 3. Contradictions with EAV triples
 */
export function validateFactConsistency(
  content: string,
  context: SectionGenerationContext
): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  const brief = context.brief;
  if (!brief) return violations;

  // Check for unsupported statistics (numbers followed by % or "million" etc.)
  const statPatterns = /(\d+(?:\.\d+)?)\s*(%|percent|million|billion|thousand)/gi;
  let match;
  while ((match = statPatterns.exec(content)) !== null) {
    const number = match[1];
    // Check if this number appears anywhere in brief data
    const briefText = JSON.stringify(brief).toLowerCase();
    if (!briefText.includes(number)) {
      violations.push({
        rule: 'FACT_CONSISTENCY',
        text: `Statistic "${match[0]}" not found in brief data — may be hallucinated`,
        position: match.index,
        suggestion: `Verify this statistic against source data or remove it.`,
        severity: 'warning',
      });
    }
  }

  // Check for EAV contradictions
  const eavs = brief.eavs || [];
  for (const eav of eavs) {
    const subject = eav.subject?.label?.toLowerCase();
    const value = typeof eav.object?.value === 'string' ? eav.object.value.toLowerCase() : '';
    const relation = eav.predicate?.relation?.toLowerCase() || '';

    if (!subject || !value) continue;

    // Look for sentences mentioning the entity with different values
    const contentLower = content.toLowerCase();
    if (contentLower.includes(subject)) {
      // Check for negation of the EAV relationship
      const negationPattern = new RegExp(
        `${subject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+(?:does not|doesn't|is not|isn't|cannot|can't)\\s+${relation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
        'i'
      );
      if (negationPattern.test(content)) {
        violations.push({
          rule: 'FACT_CONSISTENCY',
          text: `Content negates EAV: "${eav.subject?.label} ${relation} ${eav.object?.value}"`,
          position: 0,
          suggestion: `The brief states "${eav.subject?.label} ${relation} ${eav.object?.value}". Remove the contradicting statement.`,
          severity: 'error',
        });
      }
    }
  }

  return violations;
}
```

**Step 2: Register in validators/index.ts**

Add to post-Pass 1 validators (runs from Pass 2 onwards):

```typescript
// After EAV density validator, add fact consistency
if (runAll || !isPass1) {
  violations.push(...validateFactConsistency(content, context));
}
```

**Step 3: Build to verify**

Run: `npm run build`

**Step 4: Commit**

```bash
git add services/ai/contentGeneration/rulesEngine/validators/factConsistencyValidator.ts services/ai/contentGeneration/rulesEngine/validators/index.ts
git commit -m "feat(validation): add basic hallucination detection via fact consistency check"
```

---

### Task 12: Consume visual_placement_map During Generation

**Problem:** `visual_placement_map` with `eav_reference` fields is generated in briefs but completely ignored during Pass 1-9 execution. Zero references in `contentGeneration/` directory.

**Files:**
- Modify: `services/ai/contentGeneration/passes/pass6Visuals.ts` — use visual_placement_map for image insertion

**Step 1: Read pass6Visuals.ts to understand current image insertion logic**

Read the file to find where images are currently inserted and how `brief.visual_semantics` is used.

**Step 2: Enhance image insertion with placement map**

When inserting images, prefer `visual_placement_map` entries over generic `visual_semantics`:

```typescript
// In the section processing loop, check placement map first
const placementEntry = brief.visual_placement_map?.find(
  vp => vp.section_heading?.toLowerCase() === section.heading?.toLowerCase()
);

if (placementEntry) {
  // Use specific placement data including eav_reference
  const eavRef = placementEntry.eav_reference;
  const altText = eavRef
    ? `${eavRef.subject} ${eavRef.predicate} ${eavRef.object} - ${placementEntry.entity_anchor}`
    : placementEntry.entity_anchor;

  // Insert image with EAV-grounded alt text
  // ...
}
```

**Step 3: Build to verify**

Run: `npm run build`

**Step 4: Commit**

```bash
git add services/ai/contentGeneration/passes/pass6Visuals.ts
git commit -m "feat(pass6): consume visual_placement_map for EAV-grounded image insertion"
```

---

## Priority 6D: Publication & Scheduling

### Task 13: Publication Calendar Respects Content Dependencies

**Problem:** The 3-day linear spacing (`mapGeneration.ts:360-376`) doesn't respect content dependencies. A monetization "Pricing" article might publish before its foundational "How It Works" article.

**Current behavior:** `enrichedWithDates` just adds `index * 3` days to base date. No dependency ordering.

**Note:** `dateDistribution.ts` has more sophisticated phase-based scheduling with dependency respect (`lines 182-194`), but the simple 3-day spacing in `mapGeneration.ts` doesn't use it.

**Files:**
- Modify: `services/ai/mapGeneration.ts` — use topological sort for publication ordering

**Step 1: Add topological sort for publication dates**

Replace the simple linear spacing with dependency-aware ordering:

```typescript
// Sort topics: informational parents first, then monetization children
const sortedForPublication = [...enrichedTopics].sort((a, b) => {
  // Informational before monetization
  const classOrder = { informational: 0, monetization: 1 };
  const aClass = classOrder[a.topic_class as keyof typeof classOrder] ?? 0;
  const bClass = classOrder[b.topic_class as keyof typeof classOrder] ?? 0;
  if (aClass !== bClass) return aClass - bClass;

  // Parents before children
  if (a.id === b.parent_topic_id) return -1;
  if (b.id === a.parent_topic_id) return 1;

  // Core before outer
  const typeOrder = { core: 0, outer: 1, child: 2 };
  const aType = typeOrder[a.type as keyof typeof typeOrder] ?? 1;
  const bType = typeOrder[b.type as keyof typeof typeOrder] ?? 1;
  return aType - bType;
});

// Assign dates with 3-day spacing based on sorted order
const baseDate = new Date();
baseDate.setDate(baseDate.getDate() + 3);

const enrichedWithDates = sortedForPublication.map((item, index) => {
  const pubDate = new Date(baseDate);
  pubDate.setDate(baseDate.getDate() + (index * 3));
  return {
    ...item,
    planned_publication_date: pubDate.toISOString().split('T')[0],
  };
});
```

**Step 2: Build to verify**

Run: `npm run build`

**Step 3: Commit**

```bash
git add services/ai/mapGeneration.ts
git commit -m "feat(map): topological sort for dependency-aware publication scheduling"
```

---

## Final Verification

### Task 14: Full Build + End-to-End Trace + Critical Audit

**Step 1: Full build verification**

Run: `npm run build`
Expected: PASS with zero TypeScript errors

**Step 2: Trace all data flows**

Verify each improvement by reading the code path:

1. **Audit re-run:** `pass8Audit.ts` → `audit_failed` status → `useContentGeneration.ts:rerunFromPass()` → `orchestrator.rollbackSectionsToPass()` → resume
2. **Quality gates:** `DraftingModal.tsx` → `validationMode` → `useContentGeneration.ts` → `runInterPassValidation()` → checkpoint/hard/soft handling
3. **Pass 1 EAVs:** `brief.eavs` → `section.mapped_eavs` → `pass1DraftGeneration.ts:context.sectionEavs` → `sectionPromptBuilder.ts` → EAV block in prompt
4. **EAV presence:** `eavPresenceValidator.ts` → `validators/index.ts` → retry with fix instructions
5. **Topic relationships:** `briefGeneration.ts:enrichedLinkingContext` → `prompts.ts` → enhanced linking section
6. **KG expansion:** `prompts.ts:kgContext` → 30 nodes, topic-relevance sorted
7. **Cannibalization:** `clustering.ts:detectTitleCannibalization()` → `useMapGeneration.ts` → warnings
8. **Content flow:** `contentFlowValidator.ts` → `useMapGeneration.ts` → warnings
9. **FS validation:** `briefGeneration.ts` → post-generation check → warning
10. **Conclusions:** `websiteTypeTemplates.ts:enableConclusion` → `orchestrator.ts:parseSectionsFromBrief()` → gated
11. **Hallucination:** `factConsistencyValidator.ts` → `validators/index.ts` → post-Pass 1
12. **Visual placement:** `pass6Visuals.ts` → `visual_placement_map` + `eav_reference`
13. **Publication order:** `mapGeneration.ts` → topological sort → informational before monetization

**Step 3: Run critical re-audit**

After all tasks are implemented, perform the same critical analysis as `docs/flow-diagrams.md` based audit that produced the original findings. For each of the original issues, confirm resolution:

| Original Issue | Status | Evidence |
|---|---|---|
| 1.1 No EAV coverage validation | FIXED (Priority 2) | `eavCoverageValidator.ts` called in `useMapGeneration.ts` |
| 1.2 No SERP-informed topic structuring | DEFERRED | Requires new competitor extraction service — too large for this plan |
| 1.3 Cannibalization post-hoc only | FIXED (Task 7) | `detectTitleCannibalization()` during generation |
| 1.4 Hub-spoke not auto-corrected | DEFERRED | Auto-generation of spokes requires significant UX design |
| 1.5 No content flow validation | FIXED (Task 8) | `contentFlowValidator.ts` |
| 1.6 Calendar ignores dependencies | FIXED (Task 13) | Topological sort in `mapGeneration.ts` |
| 2.1 EAVs not passed to brief | FIXED (Priority 1) | Full pipeline: map → facade → providers → prompt |
| 2.2 No EAV-section mapping | FIXED (Priority 1) | `mapped_eavs` on BriefSection, Rule I.E in prompt |
| 2.3 KG truncated to 15 nodes | FIXED (Task 6) | 30 topic-relevant nodes |
| 2.4 Topic relationships not passed | FIXED (Task 5) | Enriched linking context with PARENT/SIBLING/CHILD |
| 2.5 FS target not validated | FIXED (Task 9) | Post-generation validation in `briefGeneration.ts` |
| 2.6 Visual semantics disconnected | FIXED (Task 12) | `visual_placement_map` consumed in Pass 6 |
| 2.7 contextualVectors vs eavs | FIXED (Priority 1) | `brief.eavs` auto-populated |
| 3.1 EAV enforcement starts late | FIXED (Tasks 3-4) | Section EAVs in Pass 1 prompts + presence validator |
| 3.2 No re-generation on failure | FIXED (Task 1) | `rerunFromPass()` + rollback |
| 3.3 Quality gates observational | FIXED (Task 2) | Mode selector + checkpoint UI |
| 3.4 Cross-page penalty too weak | FIXED (Priority 1) | -5 per contradiction, no cap |
| 3.5 Conclusions universally disabled | FIXED (Task 10) | Configurable per website type |
| 3.6 No hallucination detection | FIXED (Task 11) | Fact consistency validator |
| 3.7 No section-level EAV audit | FIXED (Task 4) | `eavPresenceValidator.ts` |
| D.1 File name references wrong | FIXED (Priority 1) | `pass4Discourse.ts`, `pass6Visuals.ts` |
| D.2 Pass count inconsistency | FIXED (Priority 1) | CLAUDE.md says "10-pass" |

**Intentionally deferred:**
- **Issue 1.2** (SERP-informed topic structuring): Requires building a new `competitorTopicAnalyzer.ts` service that fetches and parses competitor SERPs during map creation. This is a standalone feature (~500+ lines) better suited to its own plan.
- **Issue 1.4** (Auto-correct hub-spoke ratios): Requires auto-generating additional spoke topics, which needs significant UX decisions (auto-generate vs suggest).

**Step 4: Commit final state**

```bash
git add -A
git commit -m "audit: verify all pipeline improvements and document resolution status"
```

---

## Summary of Changes

| # | File | Change | Priority |
|---|------|--------|----------|
| 1 | `hooks/useContentGeneration.ts` | Add `rerunFromPass()`, `rollbackToPass()`, thread `validationMode` | P3 |
| 2 | `services/ai/contentGeneration/orchestrator.ts` | Add `rollbackSectionsToPass()` method | P3 |
| 3 | `services/ai/contentGeneration/passes/pass8Audit.ts` | `audit_failed` status + re-run suggestion | P3 |
| 4 | `components/modals/DraftingModal.tsx` | Quality mode selector | P3 |
| 5 | `components/ContentGenerationProgress.tsx` | Checkpoint pause UI | P3 |
| 6 | `services/ai/contentGeneration/rulesEngine/prompts/sectionPromptBuilder.ts` | Section-specific EAV block | P4 |
| 7 | `services/ai/contentGeneration/passes/pass1DraftGeneration.ts` | Populate `sectionEavs` in context | P4 |
| 8 | `services/ai/contentGeneration/rulesEngine/validators/eavPresenceValidator.ts` | **NEW**: Lightweight EAV check | P4 |
| 9 | `services/ai/contentGeneration/rulesEngine/validators/index.ts` | Register new validators | P4, P6C |
| 10 | `config/prompts.ts` | Enhanced linking context, KG expansion | P5 |
| 11 | `services/ai/briefGeneration.ts` | Topic relationships, FS validation | P5, P6B |
| 12 | `services/ai/clustering.ts` | `detectTitleCannibalization()` | P6A |
| 13 | `hooks/useMapGeneration.ts` | Cannibalization + content flow checks | P6A |
| 14 | `services/ai/contentFlowValidator.ts` | **NEW**: Content flow validator | P6A |
| 15 | `config/websiteTypeTemplates.ts` | `enableConclusion` per website type | P6B |
| 16 | `services/ai/contentGeneration/orchestrator.ts` | Configurable conclusion handling | P6B |
| 17 | `services/ai/contentGeneration/rulesEngine/validators/factConsistencyValidator.ts` | **NEW**: Hallucination detection | P6C |
| 18 | `services/ai/contentGeneration/passes/pass6Visuals.ts` | Consume `visual_placement_map` | P6C |
| 19 | `services/ai/mapGeneration.ts` | Topological sort for pub dates | P6D |

**3 new files, 16 modified files**
