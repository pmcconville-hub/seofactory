# Content Generation & Image Generation Fixes

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix three critical issues:
1. Content generation produces AI-sounding text with generic definitions and conclusions
2. Image generation fails on first attempt (race condition)
3. Image placeholders still request text-heavy infographics/charts

**Architecture:** Multi-layer fixes across content prompts, Supabase client initialization, and image placeholder generation.

**Tech Stack:** TypeScript, React, Supabase Edge Functions

---

## Problem Analysis

### Problem 1: Content Generation Issues

**Current Behavior:**
- Introduction starts with generic definition: "[Topic] is een..."
- Then separately mentions company (disconnected)
- Includes "key takeaways" / conclusion sections (AI-typical)
- Text reads like AI, not human

**Root Causes:**
- `sectionOptimizationPromptBuilder.ts:958-964` enforces rigid "X is Y" format
- `pass1DraftGeneration.ts:291` has hardcoded "Key Takeaways" fallback
- No guidance on integrating business context naturally
- Conclusion section exists but user wants NO conclusion

**User Requirements:**
- NO conclusion section at all
- Introduction written AFTER full content (already Pass 7)
- Business context woven into opening naturally
- Human-readable but still SEO-optimized
- Keep semantic rules where possible

### Problem 2: Image Generation First-Run Failure

**Current Behavior:**
- First "Generate" click fails with "OpenAI image proxy returned an error"
- Retry works successfully

**Root Cause:**
Race condition in Supabase client initialization:
1. `ImageGenerationModal.tsx` creates client in `useMemo`
2. `useEffect` calls `initImageGeneration(supabase)`
3. User clicks "Generate" before Supabase SDK completes auth initialization
4. Edge function receives request without valid Authorization header
5. Fails on `auth.getUser()` validation

On retry, the client has had time to initialize.

### Problem 3: Image Placeholders Still Request Infographics

**Current Behavior:**
- Screenshot shows descriptions like "Distributiechart", "piramide-infographic", "architectuurdiagram"
- These placeholders were generated BEFORE our photographic-first changes
- The descriptions themselves trigger text-heavy image generation

**Root Cause:**
- Placeholder descriptions come from Pass 4 (Visual Semantics)
- Existing content was generated with OLD prompts
- Image generation uses placeholder description in the prompt
- Even with "no text" instructions, AI sees "infographic" and adds text

---

## Implementation Tasks

### Task 1: Remove Conclusion Section from Content Generation

**Files:**
- Modify: `services/ai/contentGeneration/passes/pass1DraftGeneration.ts`
- Modify: `services/ai/contentGeneration/briefToSections.ts` (if exists)
- Modify: `services/ai/contentGeneration/rulesEngine/prompts/sectionOptimizationPromptBuilder.ts`

**Changes:**

**Step 1:** In `pass1DraftGeneration.ts`, find and remove "Key Takeaways" fallback (line 291):

```typescript
// BEFORE:
finalHeading = section.section_type === 'introduction'
  ? topic
  : section.section_type === 'conclusion'
    ? `${topic}: Key Takeaways`
    : section.heading;

// AFTER:
finalHeading = section.heading; // No special fallbacks
```

**Step 2:** Find where sections are created from brief and SKIP conclusion sections entirely. Search for `section_type === 'conclusion'` or `conclusion` in section creation logic.

**Step 3:** In `sectionOptimizationPromptBuilder.ts`, remove the `buildPass7ConclusionPrompt` function call or make it return empty when conclusion is disabled.

**Step 4:** Add a config option to disable conclusion generation.

**Commit:** `fix(content): remove conclusion sections from content generation`

---

### Task 2: Improve Introduction to Be Business-First and Human-Readable

**Files:**
- Modify: `services/ai/contentGeneration/rulesEngine/prompts/sectionOptimizationPromptBuilder.ts`

**Changes:**

Replace the rigid "X is Y" introduction rules with business-context-first approach:

```typescript
// Find buildPass7IntroductionPrompt function (around line 910) and update:

### RULE 1: BUSINESS-CONTEXT OPENING (Replaces rigid "X is Y")
**WEAVE the definition into business context, don't isolate it:**
- Start by connecting the topic to ${businessInfo.projectName || 'the business'}'s expertise
- The definition should emerge naturally, not as a standalone sentence
- WRONG: "[Topic] is een [definition]. [Company] biedt..." (disconnected)
- CORRECT: "[Company] specialiseert zich in [topic], de [woven definition]..."
- ALSO CORRECT: "Voor [target audience], [topic] betekent [definition] - en [Company] helpt daarbij."

### RULE 2: HUMAN READABILITY
**Write for humans first, search engines second:**
- Use natural sentence flow, not keyword-stuffed facts
- Vary sentence structure (not all "X is Y" patterns)
- Include the reader: "u", "uw", "voor u"
- Conversational connectors allowed: "daarom", "dat betekent", "in de praktijk"
- ONE clear value proposition for the reader in first paragraph

### RULE 3: COVER KEY SECTIONS (Not exhaustive list)
**Mention what matters, not everything:**
- Reference 2-3 MOST IMPORTANT topics from the article
- NOT: "In dit artikel behandelen we [topic1], [topic2], [topic3], [topic4], [topic5]..."
- CORRECT: "Ontdek hoe [key topic] werkt en waarom [benefit]."
- Let the article structure speak for itself

### RULE 4: KEEP SEMANTIC VALUE
**Still optimize, but naturally:**
- Central entity "${holistic.centralEntity}" MUST appear in first 400 characters
- Include 1-2 EAV triples naturally (not forced)
- Definition can be implicit ("helps clients with X" implies what X is)
```

**Commit:** `fix(content): improve intro to be business-first and human-readable`

---

### Task 3: Fix Image Generation First-Run Race Condition

**Files:**
- Modify: `components/imageGeneration/ImageGenerationModal.tsx`
- Modify: `services/ai/imageGeneration/orchestrator.ts`

**Changes:**

**Step 1:** Add initialization state tracking in `ImageGenerationModal.tsx`:

```typescript
// Add state to track initialization
const [isInitialized, setIsInitialized] = useState(false);

// Update useEffect to track when init is complete
useEffect(() => {
  if (supabase) {
    initImageGeneration(supabase);
    // Give Supabase SDK time to establish auth state
    const timer = setTimeout(() => setIsInitialized(true), 500);
    return () => clearTimeout(timer);
  }
}, [supabase]);

// Disable Generate button until initialized
<Button
  disabled={!isInitialized || isGenerating}
  onClick={handleGenerate}
>
  {isInitialized ? 'Generate' : 'Initializing...'}
</Button>
```

**Step 2:** Alternative: Add auth readiness check in orchestrator:

```typescript
// In orchestrator.ts, add a warmup function
export async function ensureClientReady(): Promise<boolean> {
  if (!supabaseClientRef) return false;

  try {
    // Make a lightweight call to verify auth is ready
    const { data, error } = await supabaseClientRef.auth.getSession();
    return !error && !!data.session;
  } catch {
    return false;
  }
}

// Call this before first image generation
```

**Commit:** `fix(images): resolve first-run race condition with Supabase client initialization`

---

### Task 4: Force Photographic Descriptions in Pass 4 Placeholders

**Files:**
- Modify: `services/ai/contentGeneration/rulesEngine/prompts/sectionOptimizationPromptBuilder.ts`

**Changes:**

The Pass 4 prompt already says "PHOTOGRAPHIC OVER DIAGRAMMATIC" but the AI still generates infographic/chart descriptions. We need STRONGER enforcement:

```typescript
// In buildPass4Prompt and buildPass4BatchPrompt, add explicit description format rules:

### CRITICAL: IMAGE DESCRIPTION FORMAT
**Every [IMAGE: ...] placeholder description MUST follow this format:**

✅ CORRECT DESCRIPTIONS (photographic):
- "Professional photograph of a modern warehouse with inventory management"
- "Close-up photograph of hands typing on laptop keyboard"
- "Aerial photograph of logistics center with delivery trucks"
- "Portrait photograph of business professional in office setting"
- "Abstract photograph representing data flow through light trails"

❌ BANNED DESCRIPTIONS (will fail image generation):
- "Infographic showing..." → BANNED (AI cannot render text)
- "Chart displaying..." → BANNED (AI cannot render accurate data)
- "Diagram illustrating..." → BANNED (AI cannot render labels)
- "Flowchart of..." → Only allowed if "minimal shapes, NO text labels"
- "Piramide/pyramid..." → BANNED (implies layered text)
- "Distributiechart..." → BANNED (implies data labels)

**REWRITE any infographic/chart/diagram idea as a PHOTOGRAPH:**
- "Infographic of supply chain stages" → "Photograph of warehouse workers at different stations"
- "Chart of cost comparison" → "Photograph of calculator next to financial documents"
- "Diagram of system architecture" → "Photograph of server room with network cables"
- "Flowchart of process steps" → "Photograph showing hands at each stage of the process"

**The description determines image quality. Text-heavy descriptions = text-heavy images with errors.**
```

**Commit:** `fix(images): enforce photographic descriptions in Pass 4 placeholders`

---

### Task 5: Add Image Placeholder Regeneration Option

**Files:**
- Modify: `components/publishing/steps/PreviewStep.tsx` or image management UI

**Changes:**

Since existing content has old infographic-style placeholders, add ability to regenerate just the image placeholders:

```typescript
// Add a "Refresh Image Descriptions" button that:
// 1. Re-runs Pass 4 on the current content
// 2. Updates placeholders to use photographic descriptions
// 3. Preserves all other content

const handleRefreshImageDescriptions = async () => {
  // Call Pass 4 re-optimization for visual semantics only
  await orchestrator.rerunPass(job.id, 4); // Pass 4 = visual semantics
};
```

**Commit:** `feat(images): add option to regenerate image placeholders for existing content`

---

### Task 6: Update Content Brief to Exclude Conclusion

**Files:**
- Modify: `services/ai/briefGeneration.ts` or equivalent
- Modify: `config/prompts.ts` if brief generation prompts exist there

**Changes:**

Find where content brief generates the structured outline and ensure NO conclusion section is created:

```typescript
// In brief generation prompt, add:
## STRUCTURE RULES
- DO NOT include a "Conclusion", "Samenvatting", "Summary", or "Key Takeaways" section
- The article ends with the last substantive H2 section
- Call-to-action (if needed) should be integrated into final H2, not a separate section
```

**Commit:** `fix(content): exclude conclusion from content brief structure`

---

## Verification

### After All Tasks:

1. **Build check:**
   ```bash
   npm run build
   ```

2. **Test content generation:**
   - Create new content brief
   - Verify NO conclusion section in structure
   - Verify introduction weaves business context naturally
   - Verify no "Key Takeaways" anywhere

3. **Test image generation:**
   - Open Image Generation modal
   - First click should work (not fail)
   - Generated images should be photographs (no text)

4. **Test existing content:**
   - Use "Refresh Image Descriptions" on old content
   - Verify new placeholders are photographic
   - Regenerate images - should be text-free photos

---

## Files Changed Summary

| File | Action | Impact |
|------|--------|--------|
| `services/ai/contentGeneration/passes/pass1DraftGeneration.ts` | MODIFY | Remove "Key Takeaways" fallback |
| `services/ai/contentGeneration/rulesEngine/prompts/sectionOptimizationPromptBuilder.ts` | MODIFY | Business-first intro, enforce photo descriptions |
| `components/imageGeneration/ImageGenerationModal.tsx` | MODIFY | Fix race condition |
| `services/ai/imageGeneration/orchestrator.ts` | MODIFY | Add client readiness check |
| `services/ai/briefGeneration.ts` | MODIFY | Exclude conclusion from brief |
| `components/publishing/steps/PreviewStep.tsx` | MODIFY | Add placeholder refresh option |

---

## Priority Order

1. **Task 3** (Race condition) - Immediate UX fix
2. **Task 4** (Photo descriptions) - Fix root cause of text-heavy images
3. **Task 1** (Remove conclusion) - User's explicit requirement
4. **Task 2** (Better intro) - Quality improvement
5. **Task 6** (Brief structure) - Prevent future conclusions
6. **Task 5** (Refresh option) - Quality of life for existing content
