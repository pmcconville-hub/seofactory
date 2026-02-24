# Intelligent Dialogue Engine — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add inline AI-driven Q&A dialogue to Strategy, EAV, and Map Planning pipeline steps so the AI presents findings, asks clarifying questions, processes answers into structured data, and propagates validated context forward.

**Architecture:** Each step gets a `<StepDialogue>` component rendered between generated output and the approval gate. A `dialogueEngine` service generates dynamic questions via AI, processes user answers into structured data (EAVs, field updates, topic decisions), and stores everything in `dialogue_context` on `topical_maps` for forward propagation. Cascade detection warns when foundational changes (CE/SC) affect downstream data.

**Tech Stack:** React 18, TypeScript, TailwindCSS, Supabase (PostgreSQL + Edge Functions), AI provider dispatch pattern (Gemini/OpenAI/Anthropic/Perplexity/OpenRouter)

---

## Task 1: Database Migration — Add `dialogue_context` Column

**Files:**
- Create: `supabase/migrations/20260224120000_add_dialogue_context.sql`

**Step 1: Write the migration**

```sql
-- Add dialogue_context JSONB column to topical_maps
ALTER TABLE topical_maps
ADD COLUMN IF NOT EXISTS dialogue_context JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN topical_maps.dialogue_context IS 'Accumulated dialogue answers from pipeline steps (strategy, eavs, map_planning). Forward-propagated to downstream AI prompts.';
```

**Step 2: Deploy the migration**

Run: `supabase db push` or apply via Supabase dashboard.

No parser changes needed — `ProjectLoader.tsx` uses `select('*')`, so the new column is automatically included in queries.

**Step 3: Commit**

```bash
git add supabase/migrations/20260224120000_add_dialogue_context.sql
git commit -m "feat: add dialogue_context column to topical_maps"
```

---

## Task 2: Type Definitions — `types/dialogue.ts`

**Files:**
- Create: `types/dialogue.ts`
- Modify: `types.ts` (barrel export)

**Step 1: Write the type definitions**

Create `types/dialogue.ts` with all interfaces from the design doc:

- `DialogueContext` — top-level container keyed by step
- `StepDialogueState` — per-step state with answers array and status
- `DialogueAnswer` — individual Q&A pair with extracted data and confirmation status
- `ExtractedData` — structured output: new EAV triples, updated fields, topic decisions, raw insights
- `DialogueQuestion` — AI-generated question with type, choices, context, priority
- `DialogueQuestionsResult` — batch of questions + intro text + allClear flag
- `AnswerProcessingResult` — AI interpretation with confidence, follow-up, alternatives
- `CascadeImpact` — downstream impact analysis

Question types: `'choice' | 'text' | 'confirm' | 'multi_text'`

**Step 2: Add barrel export in `types.ts`**

Add `export * from './types/dialogue';` to the barrel file.

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS (no consumers yet)

**Step 4: Commit**

```bash
git add types/dialogue.ts types.ts
git commit -m "feat: add dialogue engine type definitions"
```

---

## Task 3: Dialogue Engine Service — `services/ai/dialogueEngine.ts`

**Files:**
- Create: `services/ai/dialogueEngine.ts`

This is the core AI service with three functions. Follow the `pillarSuggestion.ts` dispatch pattern.

### Step 1: Implement `generateStepQuestions()`

**Signature:**
```typescript
export async function generateStepQuestions(
  step: 'strategy' | 'eavs' | 'map_planning',
  stepOutput: any,
  businessInfo: BusinessInfo,
  dialogueContext: DialogueContext,
  dispatch: React.Dispatch<AppAction>
): Promise<DialogueQuestionsResult>
```

**Implementation:**
- Build a step-specific prompt that includes:
  - `getLanguageAndRegionInstruction(language, region)` at the TOP
  - The step's generated output (serialized)
  - Previous dialogue answers from `dialogueContext` (for cross-step awareness)
  - Business context (industry, audience, domain)
- For each step, include step-specific analysis instructions:
  - **Strategy:** Analyze CE/SC/CSI for ambiguity, completeness, scope
  - **EAVs:** Find gaps (missing trust signals, pending 📋 values, sub-entity coverage)
  - **Map Planning:** Detect overlapping topics, coverage gaps, depth imbalance
- Call `dispatchToProvider()` with `generateJson()` on all 5 providers
- Parse response into `DialogueQuestionsResult`
- Fallback: return `{ questions: [], allClear: true }` if AI fails
- If questions array is empty, set `allClear: true`

**Prompt must instruct the AI:**
- Generate 0-5 questions (0 if everything is clear)
- Each question must have `questionType`, optional `choices` with `allowCustomInput: true`
- Each question must explain WHY it matters in `context`
- Questions must be in the user's language
- Prioritize: `critical` (blocks quality) > `important` (improves quality) > `optional` (nice to have)
- For `confirm` type questions: include the current value being validated
- For `choice` type questions: include 2-4 alternatives + always allow custom input

### Step 2: Implement `processAnswer()`

**Signature:**
```typescript
export async function processAnswer(
  question: DialogueQuestion,
  answer: string,
  step: 'strategy' | 'eavs' | 'map_planning',
  stepContext: { pillars?: any; eavs?: any; topics?: any },
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<AppAction>
): Promise<AnswerProcessingResult>
```

**Implementation:**
- Build prompt that includes:
  - The original question + user's answer
  - Current step data (pillars, EAVs, or topics)
  - Business context
  - Language instruction
- Instruct the AI to:
  - Interpret the answer even if informal/shorthand
  - Extract structured data: new EAV triples, field updates, topic decisions
  - If the answer is "no" to a confirm question, generate alternatives
  - If the answer is unclear, return a `followUpQuestion` instead of guessing
  - Return `interpretation` string describing what will change
  - Set `confidence` (0-1) on how sure it is
- Call `dispatchToProvider()` with `generateJson()`
- Parse and validate the response
- Ensure all new EAV triples have proper `subject/predicate/object` structure
- Fallback: return the raw answer as `rawInsight` if parsing fails

### Step 3: Implement `detectCascadeImpact()`

**Signature:**
```typescript
export function detectCascadeImpact(
  changedField: 'centralEntity' | 'sourceContext' | 'centralSearchIntent',
  newValue: string,
  oldValue: string,
  currentData: { eavs?: SemanticTriple[]; topics?: any[] }
): CascadeImpact
```

**Implementation (no AI call needed — pure logic):**
- Count EAVs where `subject.label` matches `oldValue`
- Count topics where title/entity references `oldValue`
- Build `affectedFields` list
- Set `severity`: critical if >20 items affected, warning if >5, info otherwise
- Return `CascadeImpact` with counts and description string

### Step 4: Add helper — `buildDialogueContextSection()`

```typescript
export function buildDialogueContextSection(
  dialogueContext: DialogueContext,
  forStep: 'strategy' | 'eavs' | 'map_planning'
): string
```

Formats accumulated dialogue answers into a prompt section for downstream steps. Strategy answers go into EAV prompts, strategy+EAV answers go into map planning prompts.

### Step 5: Run type check

Run: `npx tsc --noEmit`
Expected: PASS

### Step 6: Commit

```bash
git add services/ai/dialogueEngine.ts
git commit -m "feat: add dialogue engine service with question generation and answer processing"
```

---

## Task 4: UI Components — DialogueQuestion + DialogueAnswer

**Files:**
- Create: `components/pipeline/DialogueQuestion.tsx`
- Create: `components/pipeline/DialogueAnswer.tsx`
- Create: `components/pipeline/CascadeWarning.tsx`

### Step 1: Build `DialogueQuestion.tsx`

Renders a single question card. Supports 4 question types:

- **`choice`**: Radio buttons for each choice + text input for custom answer. "No" selections show AI-generated alternatives.
- **`text`**: Single text input with placeholder
- **`confirm`**: Two buttons: "Yes, correct" / "No, change this" — "No" expands to show alternatives + custom input
- **`multi_text`**: Multiple text inputs (add/remove)

All types have a [Submit Answer] button and a [Skip] link.

**Props:**
```typescript
interface DialogueQuestionProps {
  question: DialogueQuestion;
  onSubmit: (answer: string) => void;
  onSkip: () => void;
  isProcessing: boolean;
}
```

**Styling:** Dark theme consistent with existing pipeline (bg-gray-800 borders, gray-200 text, blue-600 submit button, emerald for confirm actions).

### Step 2: Build `DialogueAnswer.tsx`

Renders a confirmed answer in compact form.

**Props:**
```typescript
interface DialogueAnswerProps {
  answer: DialogueAnswer;
}
```

**Layout:** Green-tinted row showing: question text (truncated) → answer → extracted data summary (e.g., "+2 EAVs added") → checkmark icon.

### Step 3: Build `CascadeWarning.tsx`

Renders when a foundational change is detected.

**Props:**
```typescript
interface CascadeWarningProps {
  impact: CascadeImpact;
  onAction: (action: 'update_all' | 'review' | 'cancel') => void;
}
```

**Layout:** Amber warning card showing: description, affected counts, three action buttons.

### Step 4: Run type check

Run: `npx tsc --noEmit`
Expected: PASS

### Step 5: Commit

```bash
git add components/pipeline/DialogueQuestion.tsx components/pipeline/DialogueAnswer.tsx components/pipeline/CascadeWarning.tsx
git commit -m "feat: add dialogue UI sub-components (question, answer, cascade warning)"
```

---

## Task 5: Main UI Component — `StepDialogue.tsx`

**Files:**
- Create: `components/pipeline/StepDialogue.tsx`

### Step 1: Build the orchestration component

**Props:** (from design doc `StepDialogueProps`)

**State machine:**
1. `loading` — call `generateStepQuestions()`, show spinner
2. `active` — show current question via `<DialogueQuestion>`
3. `processing` — user submitted answer, call `processAnswer()`, show spinner
4. `interpretation` — show AI's interpretation with [Looks good] / [Edit] / [Skip]
5. `follow_up` — AI returned a follow-up question, render it
6. `complete` — all questions answered or skipped, show green "All clear" banner
7. `all_clear` — no questions were generated, show brief green message

**Flow:**
- On mount: call `generateStepQuestions()` → if `allClear`, go to state 7
- Show intro text from `DialogueQuestionsResult.introText`
- Render questions one at a time (not all at once)
- On answer submit: call `processAnswer()` → show interpretation
- On [Looks good]: call `onDataExtracted(extractedData)`, advance to next question
- On [Edit]: let user modify the interpretation text, resubmit
- On [Skip]: advance to next question without extracting data
- When all questions done: call `onDialogueComplete()`
- Show progress bar: "Question 2 of 4"
- Show previous confirmed answers as collapsed `<DialogueAnswer>` rows
- "Skip remaining questions" link at bottom

**Persistence:** After each confirmed answer, persist to `dialogue_context` on `topical_maps` via the parent step's Supabase update.

### Step 2: Run type check

Run: `npx tsc --noEmit`
Expected: PASS

### Step 3: Commit

```bash
git add components/pipeline/StepDialogue.tsx
git commit -m "feat: add StepDialogue orchestration component"
```

---

## Task 6: Integrate into PipelineStrategyStep

**Files:**
- Modify: `components/pages/pipeline/PipelineStrategyStep.tsx`

### Step 1: Add dialogue state and imports

- Import `StepDialogue`, dialogue types
- Add state: `dialogueContext` (loaded from `activeMap.dialogue_context`)
- Add state: `dialogueComplete` (boolean, controls gate visibility)
- Add state: `showDialogue` (boolean, true after AI suggestion completes)

### Step 2: Add `<StepDialogue>` between output and approval gate

Insert after the strategy form/summary and before the `<ApprovalGate>`:

```tsx
{showDialogue && !dialogueComplete && (
  <StepDialogue
    step="strategy"
    stepOutput={{ pillars: currentPillars }}
    businessInfo={effectiveBusinessInfo}
    dialogueContext={dialogueContext}
    onDataExtracted={(data) => {
      // Apply field updates to strategy form (CE, SC, CSI)
      if (data.updatedFields) {
        // Update local form state with new values
      }
      // Persist dialogue_context to Supabase
    }}
    onDialogueComplete={() => {
      setDialogueComplete(true);
      // Trigger save + set status to pending_approval
    }}
    onCascadeAction={handleCascadeAction}
  />
)}
```

### Step 3: Gate visibility depends on dialogue completion

Change the approval gate condition from:
```tsx
{gate && (stepState?.status === 'pending_approval' || ...)}
```
to also check `dialogueComplete` or `allClear`:
```tsx
{gate && dialogueComplete && (stepState?.status === 'pending_approval' || ...)}
```

### Step 4: Implement `onDataExtracted` handler

When the dialogue extracts data (e.g., user corrects CE):
- Update local form state (`setCentralEntity(data.updatedFields.centralEntity)`)
- Call `detectCascadeImpact()` if CE/SC changes
- Persist updated `dialogue_context` to Supabase

### Step 5: Implement cascade handler

```typescript
const handleCascadeAction = (action, impact) => {
  if (action === 'update_all') {
    // Regenerate affected downstream data
  } else if (action === 'cancel') {
    // Revert the change
  }
};
```

### Step 6: Run type check and tests

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS

### Step 7: Commit

```bash
git add components/pages/pipeline/PipelineStrategyStep.tsx
git commit -m "feat: integrate StepDialogue into Strategy pipeline step"
```

---

## Task 7: Integrate into PipelineEavsStep

**Files:**
- Modify: `components/pages/pipeline/PipelineEavsStep.tsx`

### Step 1: Remove `DataRequestsPanel`

Delete the `DataRequestsPanel` component (lines ~537-577) and its render call (line ~1170). This static Q&A is replaced by the intelligent dialogue.

### Step 2: Add dialogue state and imports

Same pattern as Strategy step:
- Import `StepDialogue`, dialogue types
- Add `dialogueContext`, `dialogueComplete`, `showDialogue` state
- Load existing `dialogue_context` from `activeMap.dialogue_context`

### Step 3: Add `<StepDialogue>` where DataRequestsPanel was

Insert after the EAV rows section and before the approval gate:

```tsx
{showDialogue && !dialogueComplete && (
  <StepDialogue
    step="eavs"
    stepOutput={{ eavs: rawEavs, pendingCount: needValue }}
    businessInfo={effectiveBusinessInfo}
    dialogueContext={dialogueContext}
    onDataExtracted={(data) => {
      // Add new EAV triples from dialogue answers
      if (data.newTriples?.length) {
        const updated = [...rawEavs, ...data.newTriples];
        dispatch({ type: 'UPDATE_MAP_DATA', payload: { mapId, data: { eavs: updated } } });
      }
      // Persist dialogue_context
    }}
    onDialogueComplete={() => setDialogueComplete(true)}
    onCascadeAction={handleCascadeAction}
  />
)}
```

### Step 4: `onDataExtracted` creates real EAV triples

When a user answers "BRL-2312 en Komo" to a certification question:
- AI returns `newTriples` with properly structured `SemanticTriple[]`
- Handler merges into existing EAVs
- Dispatches `UPDATE_MAP_DATA`
- Persists to Supabase
- Auto-confirms the new triples

### Step 5: Trigger dialogue after EAV generation

In `handleGenerateEavs()`, after `setStepStatus('eavs', 'pending_approval')`:
```typescript
setShowDialogue(true);
```

### Step 6: Run type check and tests

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS

### Step 7: Commit

```bash
git add components/pages/pipeline/PipelineEavsStep.tsx
git commit -m "feat: replace DataRequestsPanel with intelligent StepDialogue in EAV step"
```

---

## Task 8: Integrate into PipelineMapStep

**Files:**
- Modify: `components/pages/pipeline/PipelineMapStep.tsx`

### Step 1: Add dialogue state and imports

Same pattern as previous steps.

### Step 2: Add `<StepDialogue>` between map output and approval gate

```tsx
{showDialogue && !dialogueComplete && (
  <StepDialogue
    step="map_planning"
    stepOutput={{ topics: allTopics, clusters }}
    businessInfo={effectiveBusinessInfo}
    dialogueContext={dialogueContext}
    onDataExtracted={(data) => {
      // Apply topic decisions (merge, split, add, remove)
      if (data.topicDecisions) {
        // Process each decision
      }
      // Persist dialogue_context
    }}
    onDialogueComplete={() => setDialogueComplete(true)}
    onCascadeAction={handleCascadeAction}
  />
)}
```

### Step 3: Implement topic decision handler

`onDataExtracted` for map planning handles:
- **merge**: Combine two topics into one (keep the broader one, add the narrower as a section)
- **standalone**: Confirm a topic should be its own page
- **section**: Move a topic to be a section under another topic
- **add**: Create a new topic from dialogue answer

### Step 4: Run type check and tests

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS

### Step 5: Commit

```bash
git add components/pages/pipeline/PipelineMapStep.tsx
git commit -m "feat: integrate StepDialogue into Map Planning pipeline step"
```

---

## Task 9: Forward Propagation — Enrich Downstream Prompts

**Files:**
- Modify: `services/ai/eavGeneration.ts`
- Modify: `services/ai/mapGeneration.ts` (or the prompt-building section)

### Step 1: Add dialogue context to EAV generation prompt

In `eavGeneration.ts`, update `buildPrompt()` to accept and include strategy dialogue answers:

```typescript
function buildPrompt(businessInfo, ctx, dialogueContext?: DialogueContext): string {
  // ... existing prompt ...

  const strategyInsights = buildDialogueContextSection(dialogueContext, 'eavs');
  // Append to prompt:
  // "VALIDATED BUSINESS CONTEXT (from strategy dialogue):\n${strategyInsights}"
}
```

Update `generateEavsWithAI()` signature to accept `dialogueContext` parameter.

### Step 2: Add dialogue context to map generation prompt

In the map generation service, include both strategy and EAV dialogue answers when building the topic generation prompt.

### Step 3: Update callers

Update `PipelineEavsStep.tsx` and `PipelineMapStep.tsx` to pass `dialogueContext` when calling the generation functions.

### Step 4: Run type check and tests

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS

### Step 5: Commit

```bash
git add services/ai/eavGeneration.ts services/ai/mapGeneration.ts \
      components/pages/pipeline/PipelineEavsStep.tsx \
      components/pages/pipeline/PipelineMapStep.tsx
git commit -m "feat: forward-propagate dialogue context into downstream AI prompts"
```

---

## Task 10: Persistence — Load and Save `dialogue_context`

**Files:**
- Modify: `components/pages/pipeline/PipelineStrategyStep.tsx`
- Modify: `components/pages/pipeline/PipelineEavsStep.tsx`
- Modify: `components/pages/pipeline/PipelineMapStep.tsx`

### Step 1: Load dialogue_context on mount

In each step component, load from `activeMap.dialogue_context`:
```typescript
const [dialogueContext, setDialogueContext] = useState<DialogueContext>(
  (activeMap?.dialogue_context as DialogueContext) || { strategy: { answers: [], status: 'pending', questionsGenerated: 0, questionsAnswered: 0 }, eavs: { ... }, map_planning: { ... } }
);
```

### Step 2: Save after each confirmed answer

Create a helper that persists the updated `dialogue_context` after each answer:
```typescript
const persistDialogueContext = async (updated: DialogueContext) => {
  setDialogueContext(updated);
  if (state.activeMapId) {
    dispatch({ type: 'UPDATE_MAP_DATA', payload: { mapId: state.activeMapId, data: { dialogue_context: updated } } });
    try {
      const supabase = getSupabaseClient(effectiveBusinessInfo.supabaseUrl, effectiveBusinessInfo.supabaseAnonKey);
      await supabase.from('topical_maps').update({ dialogue_context: updated } as any).eq('id', state.activeMapId);
    } catch { /* non-fatal */ }
  }
};
```

### Step 3: Verify round-trip persistence

Generate data → answer a dialogue question → hard refresh → confirm dialogue answers persist and show in the confirmed answers section.

### Step 4: Run type check and tests

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS

### Step 5: Commit

```bash
git add components/pages/pipeline/PipelineStrategyStep.tsx \
      components/pages/pipeline/PipelineEavsStep.tsx \
      components/pages/pipeline/PipelineMapStep.tsx
git commit -m "feat: persist and restore dialogue_context across page refreshes"
```

---

## Task 11: Final Verification

### Step 1: Full type check

Run: `npx tsc --noEmit`
Expected: zero errors

### Step 2: Full test suite

Run: `npx vitest run`
Expected: zero failures

### Step 3: Manual E2E test checklist

- [ ] Strategy step: AI generates questions about CE/SC ambiguities
- [ ] Strategy step: user answers → answers refine fields → stored in dialogue_context
- [ ] Strategy step: "No" answer shows alternatives + custom input
- [ ] EAV step: Data Requests panel is gone, replaced by StepDialogue
- [ ] EAV step: AI asks about gaps and 📋 values
- [ ] EAV step: answers create new EAV triples (visible in the list)
- [ ] Map Planning step: AI asks about overlap and coverage
- [ ] Map Planning step: answers modify topic structure
- [ ] Forward propagation: EAV prompt includes strategy answers
- [ ] Forward propagation: map prompt includes strategy + EAV answers
- [ ] Cascade: changing CE in strategy warns about affected EAVs
- [ ] No questions: when output is unambiguous, shows "All clear"
- [ ] Language: all questions in user's configured language
- [ ] Resilience: informal answers ("ja dat klopt") correctly interpreted
- [ ] Persistence: refresh page → dialogue answers still visible
- [ ] Skip: "Skip remaining questions" advances to approval gate

### Step 4: Commit final state

```bash
git add -A
git commit -m "feat: complete intelligent dialogue engine across Strategy, EAVs, Map Planning"
```
