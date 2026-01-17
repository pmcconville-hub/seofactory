# Content Generation Gaps Analysis: Internal Linking & Bridge Topics

**Date:** 2026-01-17
**Status:** Analysis Complete - Fix Plan Ready

## Executive Summary

The content generation system has significant gaps between what the Semantic SEO skill requires and what is actually being generated. The main issues are:

1. **Internal links are NOT being inserted** into the final content
2. **Contextual bridge content is NOT being rendered** (only used for opener suggestions)
3. **No "Related Topics" section** is generated at the end of articles
4. **No enforcement/validation** that links were actually inserted

---

## Gap Analysis

### 1. Internal Linking - CRITICAL GAP

**What SEO Skill Requires:**
- 15-30 internal links in main content
- Links placed AFTER concept definition (Definition-First Rule)
- Max 3x same anchor text per target
- Anchor text hierarchy (hypernyms early, hyponyms late)
- Annotation context around links explaining relevance

**What's Currently Happening:**
| Component | Expected | Actual |
|-----------|----------|--------|
| Pass 1 (Draft) | Full link specs with context | Only anchor text list from `methodology_note` codes |
| Pass 6 (Discourse) | Insert links with bridges | Instructions sent but NO validation |
| Final Output | Links in content + Related section | Often NO links present |

**Root Causes:**
1. `sectionPromptBuilder.ts:134-140` - Only extracts anchor texts from `parsedCodes.anchorTexts`, not full `contextualBridge` data
2. `sectionOptimizationPromptBuilder.ts:705-722` - Pass 6 instructs AI to insert links but doesn't verify insertion
3. No post-pass validation that links were actually added
4. No "Related Topics" section generation anywhere in the pipeline

**Evidence:**
```typescript
// sectionPromptBuilder.ts:134-140 - Pass 1 only gets anchor text list
if (parsedCodes.anchorTexts.length > 0) {
  prompt += `## Internal Links (use these as anchor text)
${parsedCodes.anchorTexts.map(a => `- [${a}]`).join('\n')}
```
No target URLs, no reasoning, no annotation hints.

---

### 2. Contextual Bridge Content - MAJOR GAP

**What SEO Skill Requires:**
- Bridge paragraphs connecting macro to micro contexts
- Format: `[Macro Context] → [Bridge H2/H3] → [Micro Context]`
- Explicit transition explaining WHY the link exists
- Bridge placement at bottom of macro context section

**What's Currently Happening:**
| Component | Expected | Actual |
|-----------|----------|--------|
| Brief Data | Full bridge content + links | ✅ Generated correctly |
| Pass 1 | Use bridge content | Only extracts 1st sentence as opener |
| Final Output | Bridge paragraphs visible | Bridge content DISCARDED |

**Root Cause:**
`flowGuidanceBuilder.ts:218-232` - Only extracts first sentence from `contextualBridge.content`:
```typescript
function extractBridgeOpener(bridge): string | undefined {
  if (bridgeSection.content) {
    const sentences = splitSentences(bridgeSection.content);
    const firstSentence = sentences[0]?.trim();  // Only first sentence!
    return firstSentence || undefined;
  }
}
```

The full `contextualBridge.content` (1-2 paragraphs of transition text) is never rendered.

---

### 3. Missing "Related Topics" Section - GAP

**What SEO Skill Requires:**
- Dedicated section at end for tangential internal links
- 3-5 contextual links with brief descriptions
- Keeps main content focused while preserving link equity

**What's Currently Happening:**
- Audit check `auditChecks.ts:857` recommends adding this section
- But NO code generates it
- Pass 6 instructions mention links but no dedicated section

**Evidence:**
```typescript
// auditChecks.ts:855-858 - Audit RECOMMENDS it but doesn't CREATE it
remediation: 'Add a "Related Topics" or "See Also" section at the end for tangential links'
```

---

### 4. Link Validation - GAP

**What Should Happen:**
- After Pass 6, verify links were inserted
- If missing, either retry or add "Related Topics" section
- Track link count in audit results

**What's Currently Happening:**
- `contextualBridgeValidator.ts` only warns on missing transitions (warning-level)
- No validation that markdown links `[anchor](url)` exist in final content
- Linking audit (`linkingAudit.ts`) runs on BRIEFS, not generated content

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CONTENT BRIEF                                  │
│  contextualBridge: { type: 'section', content: '...', links: [...] }   │
│  suggested_internal_links: [...]                                        │
│  discourse_anchors: [...]                                               │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        PASS 1: DRAFT GENERATION                          │
│                                                                          │
│  flowGuidanceBuilder.ts:                                                │
│    ❌ Bridge content → Only 1st sentence extracted as opener            │
│    ❌ Bridge links → NOT passed to section prompt                       │
│                                                                          │
│  sectionPromptBuilder.ts:                                               │
│    ❌ Only anchor texts from methodology_note codes                     │
│    ❌ No target URLs, no reasoning, no annotation hints                 │
│                                                                          │
│  Result: Draft with NO internal links                                   │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    PASSES 2-5: OPTIMIZATION                              │
│  Pass 2: Headers, Pass 3: Lists/Tables, Pass 4: Visuals, Pass 5: Micro  │
│                                                                          │
│  ❌ No linking modifications in any of these passes                     │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    PASS 6: DISCOURSE INTEGRATION                         │
│                                                                          │
│  sectionOptimizationPromptBuilder.ts:705-722                            │
│    ✅ Full contextualBridge links extracted                             │
│    ✅ Instructions sent to AI with placement rules                      │
│    ❌ No validation that AI actually inserted links                     │
│    ❌ No fallback if AI ignores instructions                            │
│                                                                          │
│  Result: Links MAY or MAY NOT be present (AI-dependent)                 │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         FINAL CONTENT                                    │
│                                                                          │
│  ❌ Internal links: Often missing or incomplete                         │
│  ❌ Bridge content: Never rendered                                      │
│  ❌ Related Topics section: Never generated                             │
│  ❌ Link validation: Not performed                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Fix Plan

### Fix 1: Add Internal Links Section to Final Content (Quick Win)

**File:** `services/ai/contentGeneration/orchestrator.ts`
**Location:** After Pass 6 assembly or in `assembleDraft()`

Add a new step that appends a "Related Topics" section using `contextualBridge` data:

```typescript
function generateRelatedTopicsSection(brief: ContentBrief): string {
  const links = extractContextualBridgeLinks(brief);
  if (links.length === 0) return '';

  let section = '\n\n## Related Topics\n\n';
  for (const link of links.slice(0, 5)) {
    section += `- [${link.anchorText}](/topics/${slugify(link.targetTopic)}) - ${link.reasoning}\n`;
  }
  return section;
}
```

**Effort:** Low
**Impact:** High - Ensures links are always present

---

### Fix 2: Pass Contextual Bridge Links to Pass 1

**File:** `services/ai/contentGeneration/rulesEngine/prompts/sectionPromptBuilder.ts`
**Location:** Around line 134

Add full `contextualBridge` data to section generation prompt:

```typescript
// Add contextual bridge links for internal linking
const bridgeLinks = extractContextualBridgeLinks(brief);
if (bridgeLinks.length > 0) {
  prompt += `## Internal Links (with contextual guidance)
${bridgeLinks.map(link => `
- **Anchor:** "${link.anchorText}"
  **Target:** ${link.targetTopic}
  **Context:** ${link.annotation_text_hint || link.reasoning}
  **Rule:** Place AFTER defining the concept, never first sentence
`).join('\n')}
`;
}
```

**Effort:** Medium
**Impact:** High - Links more likely to be inserted during initial generation

---

### Fix 3: Render Contextual Bridge Content

**File:** `services/ai/contentGeneration/flowGuidanceBuilder.ts`
**Location:** New function + integration in `buildFlowGuidance()`

Pass full bridge content to the section prompt for SUPPLEMENTARY zone sections:

```typescript
export function getBridgeContentForZoneTransition(brief: ContentBrief): string | undefined {
  if (brief.contextualBridge?.type === 'section' && brief.contextualBridge.content) {
    return brief.contextualBridge.content;
  }
  return undefined;
}
```

Then in `sectionPromptBuilder.ts`, for zone transitions:
```typescript
if (flowGuidance.isZoneTransition) {
  const bridgeContent = getBridgeContentForZoneTransition(brief);
  if (bridgeContent) {
    prompt += `## Contextual Bridge (include this transition)
${bridgeContent}
`;
  }
}
```

**Effort:** Medium
**Impact:** Medium - Bridge content will be visible in generated articles

---

### Fix 4: Validate Link Insertion After Pass 6

**File:** `services/ai/contentGeneration/rulesEngine/validators/linkInsertionValidator.ts` (NEW)

Create a validator that checks if expected links were inserted:

```typescript
export function validateLinkInsertion(
  content: string,
  expectedLinks: ContextualBridgeLink[]
): { missing: ContextualBridgeLink[], found: number } {
  const markdownLinkRegex = /\[([^\]]+)\]\([^)]+\)/g;
  const foundAnchors = [...content.matchAll(markdownLinkRegex)].map(m => m[1].toLowerCase());

  const missing = expectedLinks.filter(link =>
    !foundAnchors.includes(link.anchorText.toLowerCase())
  );

  return { missing, found: expectedLinks.length - missing.length };
}
```

If >50% missing, trigger fallback: append "Related Topics" section.

**Effort:** Medium
**Impact:** High - Guarantees links are present in final content

---

### Fix 5: Add Link Count to Audit Results

**File:** `services/ai/contentGeneration/passes/auditChecks.ts`

Add new audit check for internal link presence:

```typescript
export function checkInternalLinkPresence(content: string, brief: ContentBrief): AuditResult {
  const expectedLinks = extractContextualBridgeLinks(brief);
  const { missing, found } = validateLinkInsertion(content, expectedLinks);

  if (found === 0 && expectedLinks.length > 0) {
    return {
      passed: false,
      score: 0,
      rule: 'IL-01',
      details: `No internal links found. Expected ${expectedLinks.length} links.`,
      remediation: 'Internal links were not inserted. Check Pass 6 execution.'
    };
  }
  // ... scoring logic
}
```

**Effort:** Low
**Impact:** Medium - Visibility into link insertion success rate

---

## Implementation Priority

| Priority | Fix | Effort | Impact | Dependencies |
|----------|-----|--------|--------|--------------|
| 1 | Fix 1: Related Topics Section | Low | High | None |
| 2 | Fix 4: Link Validation | Medium | High | None |
| 3 | Fix 2: Pass Links to Pass 1 | Medium | High | None |
| 4 | Fix 5: Audit Check | Low | Medium | Fix 4 |
| 5 | Fix 3: Bridge Content | Medium | Medium | None |

---

## Files to Modify

1. `services/ai/contentGeneration/orchestrator.ts` - Add Related Topics section
2. `services/ai/contentGeneration/rulesEngine/prompts/sectionPromptBuilder.ts` - Pass full link data
3. `services/ai/contentGeneration/flowGuidanceBuilder.ts` - Extract full bridge content
4. `services/ai/contentGeneration/rulesEngine/validators/linkInsertionValidator.ts` - NEW file
5. `services/ai/contentGeneration/passes/auditChecks.ts` - Add link audit
6. `services/ai/contentGeneration/passes/pass6DiscourseIntegration.ts` - Add post-pass validation

---

## Testing Checklist

- [ ] Generated content contains markdown links `[anchor](url)`
- [ ] Links appear AFTER concept definitions
- [ ] "Related Topics" section present at end of articles
- [ ] Contextual bridge paragraphs visible at zone transitions
- [ ] Audit results show link count and success rate
- [ ] Missing links trigger fallback behavior
