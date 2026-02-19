# Visual Semantics Pipeline Overhaul — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close all 23 semantic SEO gaps in the visual semantics pipeline by fixing bugs, externalizing config, enforcing rules during generation, integrating audit rules bidirectionally with layout decisions, and adding website-type-specific layouts.

**Architecture:** Bottom-up integration — fix foundations first (bugs, config), then wire rules into generation, add bidirectional audit-layout integration via new LayoutRuleEngine, and finally add 17 website-type layouts. Each phase is independently testable.

**Tech Stack:** TypeScript, Vitest, React (layout-engine services, publishing pipeline, content generation passes)

**Design doc:** `docs/plans/2026-02-19-visual-semantics-pipeline-overhaul.md`

---

## Phase 1: Bug Fixes & Correctness

### Task 1: Fix Pass 6 wrong prompt builder imports

**Files:**
- Modify: `services/ai/contentGeneration/passes/pass6Visuals.ts:12,45,49`

**Step 1: Write failing test**

Test file: `services/ai/contentGeneration/passes/__tests__/pass6Visuals.test.ts`

```typescript
import { describe, it, expect } from 'vitest';

describe('pass6Visuals', () => {
  it('should import pass6-specific prompt builders, not pass4', async () => {
    const source = await import('fs').then(fs =>
      fs.readFileSync('services/ai/contentGeneration/passes/pass6Visuals.ts', 'utf8')
    );
    expect(source).not.toContain('buildPass4Prompt');
    expect(source).not.toContain('buildPass4BatchPrompt');
    expect(source).toContain('buildPass6Prompt');
    expect(source).toContain('buildPass6BatchPrompt');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/ai/contentGeneration/passes/__tests__/pass6Visuals.test.ts`
Expected: FAIL — source still contains `buildPass4Prompt`

**Step 3: Create Pass 6 prompt builders**

File: `services/ai/contentGeneration/rulesEngine/prompts/sectionOptimizationPromptBuilder.ts`

Check if `buildPass4Prompt` and `buildPass4BatchPrompt` already exist. Create `buildPass6Prompt` and `buildPass6BatchPrompt` as wrappers that call the same underlying logic but with pass-6-specific context (visual semantics focus: image placement, alt text vocabulary expansion, diagram suggestions). If the underlying prompt builder is generic (takes passNumber), simply export aliases:

```typescript
export const buildPass6Prompt = buildPass4Prompt; // Same optimization logic, pass number changes context
export const buildPass6BatchPrompt = buildPass4BatchPrompt;
```

Then update `pass6Visuals.ts` line 12:
```typescript
// BEFORE:
import { buildPass4Prompt, buildPass4BatchPrompt } from '../rulesEngine/prompts/sectionOptimizationPromptBuilder';

// AFTER:
import { buildPass6Prompt, buildPass6BatchPrompt } from '../rulesEngine/prompts/sectionOptimizationPromptBuilder';
```

And lines 45, 49:
```typescript
// BEFORE:
promptBuilder: buildPass4Prompt,
buildBatchPrompt: buildPass4BatchPrompt,

// AFTER:
promptBuilder: buildPass6Prompt,
buildBatchPrompt: buildPass6BatchPrompt,
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run services/ai/contentGeneration/passes/__tests__/pass6Visuals.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add services/ai/contentGeneration/passes/pass6Visuals.ts services/ai/contentGeneration/rulesEngine/prompts/sectionOptimizationPromptBuilder.ts services/ai/contentGeneration/passes/__tests__/pass6Visuals.test.ts
git commit -m "fix: pass6 uses correct prompt builders instead of pass4"
```

---

### Task 2: Fix SectionAnalyzer weight overflow — clamp per bonus

**Files:**
- Modify: `services/layout-engine/SectionAnalyzer.ts:283-308`
- Test: `services/layout-engine/__tests__/SectionAnalyzer.test.ts`

**Step 1: Write failing test**

Add to existing test file `services/layout-engine/__tests__/SectionAnalyzer.test.ts`:

```typescript
it('should clamp weight to MAX_WEIGHT=5 even with all bonuses stacked', () => {
  const weight = SectionAnalyzer.calculateSemanticWeight({
    attributeCategory: 'UNIQUE',   // +2
    isCoreTopic: true,             // +0.5
    hasFSTarget: true,             // +0.5
    answersMainIntent: true,       // +0.5
  });
  // Base 3 + 2 + 0.5 + 0.5 + 0.5 = 6.5, must clamp to 5
  expect(weight).toBe(5);
});

it('should clamp intermediate values so bonuses after overflow still work correctly', () => {
  // UNIQUE (base 3 + 2 = 5, already at max)
  // Adding isCoreTopic should not cause the weight to "overflow and wrap"
  const weightWithCore = SectionAnalyzer.calculateSemanticWeight({
    attributeCategory: 'UNIQUE',
    isCoreTopic: true,
  });
  const weightWithout = SectionAnalyzer.calculateSemanticWeight({
    attributeCategory: 'UNIQUE',
  });
  // Both should be 5 (clamped)
  expect(weightWithCore).toBe(5);
  expect(weightWithout).toBe(5);
});
```

**Step 2: Run test to verify it fails (or passes — verify current behavior)**

Run: `npx vitest run services/layout-engine/__tests__/SectionAnalyzer.test.ts`
Expected: These should already pass since there's a final clamp. But confirm the weight factors are correct.

**Step 3: Fix weight calculation to clamp after each bonus**

In `SectionAnalyzer.ts`, replace `calculateSemanticWeight` (lines 283-308):

```typescript
static calculateSemanticWeight(input: SemanticWeightInput): number {
  let weight = BASE_WEIGHT;

  // Topic category bonus (clamp after each addition)
  if (input.attributeCategory) {
    weight = Math.min(MAX_WEIGHT, weight + (CATEGORY_BONUSES[input.attributeCategory] || 0));
  }

  // Core topic bonus
  if (input.isCoreTopic) {
    weight = Math.min(MAX_WEIGHT, weight + CORE_TOPIC_BONUS);
  }

  // Featured Snippet target bonus
  if (input.hasFSTarget) {
    weight = Math.min(MAX_WEIGHT, weight + FS_TARGET_BONUS);
  }

  // Answers main intent bonus
  if (input.answersMainIntent) {
    weight = Math.min(MAX_WEIGHT, weight + MAIN_INTENT_BONUS);
  }

  return Math.max(MIN_WEIGHT, weight);
}
```

**Step 4: Run all SectionAnalyzer tests**

Run: `npx vitest run services/layout-engine/__tests__/SectionAnalyzer.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add services/layout-engine/SectionAnalyzer.ts services/layout-engine/__tests__/SectionAnalyzer.test.ts
git commit -m "fix: clamp semantic weight after each bonus to prevent overflow"
```

---

### Task 3: Fix ImageHandler float state for single-section calls

**Files:**
- Modify: `services/layout-engine/ImageHandler.ts:337-356`
- Test: `services/layout-engine/__tests__/ImageHandler.test.ts`

**Step 1: Write failing test**

Add to `services/layout-engine/__tests__/ImageHandler.test.ts`:

```typescript
it('static determineImagePlacement should accept floatHint for required images', () => {
  const analysis: SectionAnalysis = {
    sectionId: 'test',
    heading: 'Test',
    headingLevel: 2,
    contentType: 'explanation',
    semanticWeight: 2, // Low weight, not featured
    semanticWeightFactors: { baseWeight: 3, topicCategoryBonus: 0, coreTopicBonus: 0, fsTargetBonus: 0, mainIntentBonus: 0, totalWeight: 2 },
    constraints: { imageRequired: true },
    wordCount: 200,
    hasTable: false, hasList: false, hasQuote: false, hasImage: false,
    isCoreTopic: false, answersMainIntent: false,
    contentZone: 'MAIN',
  };

  const dna = { layout: { gridStyle: 'asymmetric' } } as any;

  const result1 = ImageHandler.determineImagePlacement(analysis, dna, undefined, { floatHint: 'left' });
  expect(result1?.position).toBe('float-left');

  const result2 = ImageHandler.determineImagePlacement(analysis, dna, undefined, { floatHint: 'right' });
  expect(result2?.position).toBe('float-right');
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/layout-engine/__tests__/ImageHandler.test.ts`
Expected: FAIL — `determineImagePlacement` doesn't accept 4th param

**Step 3: Add floatHint parameter to static method**

In `ImageHandler.ts`, update the static `determineImagePlacement` method (line 337):

```typescript
static determineImagePlacement(
  analysis: SectionAnalysis,
  designDna?: DesignDNA,
  sectionContent?: string,
  options?: { floatHint?: 'left' | 'right' }
): SemanticImagePlacement | null {
  // Priority 1: Section has generated image
  if (hasGeneratedImage(analysis)) {
    return ImageHandler.handleGeneratedImage(analysis, designDna);
  }

  // Priority 2: Section requires image (from constraints)
  if (requiresImage(analysis)) {
    const handler = new ImageHandler();
    if (options?.floatHint) {
      handler.floatState = options.floatHint;
    }
    return handler.handleRequiredImage(analysis, designDna);
  }

  // Priority 3: Suggest placeholder if helpful
  return ImageHandler.handlePlaceholderSuggestion(analysis, sectionContent);
}
```

Also make `floatState` settable (change `private` to package-accessible or add a setter):

```typescript
// Change line 207 from:
private floatState: 'left' | 'right' = 'left';
// To:
floatState: 'left' | 'right' = 'left';
```

Update the `IImageHandler` interface in `types.ts` to match the new signature (line 453):

```typescript
determineImagePlacement(
  analysis: SectionAnalysis,
  designDna?: DesignDNA,
  sectionContent?: string,
  options?: { floatHint?: 'left' | 'right' }
): SemanticImagePlacement | null;
```

**Step 4: Run test**

Run: `npx vitest run services/layout-engine/__tests__/ImageHandler.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add services/layout-engine/ImageHandler.ts services/layout-engine/types.ts services/layout-engine/__tests__/ImageHandler.test.ts
git commit -m "fix: add floatHint to static determineImagePlacement for single-section calls"
```

---

### Task 4: Remove duplicate content type detection from ComponentSelector

**Files:**
- Modify: `services/layout-engine/ComponentSelector.ts`
- Test: `services/layout-engine/__tests__/ComponentSelector.test.ts`

**Step 1: Write failing test**

```typescript
it('should use analysis.contentType as source of truth, not re-detect from patterns', () => {
  const analysis: SectionAnalysis = {
    sectionId: 'test',
    heading: 'How to process data step by step', // matches steps pattern
    headingLevel: 2,
    contentType: 'explanation', // But analyzer said explanation
    semanticWeight: 3,
    // ... fill required fields
  };

  const result = ComponentSelector.selectComponent(analysis);
  // Should use 'explanation' (from analyzer), not 'steps' (from heading pattern)
  expect(result.primaryComponent).toBe('prose'); // explanation maps to prose
});
```

**Step 2: Run test — may already pass or fail depending on current behavior**

Run: `npx vitest run services/layout-engine/__tests__/ComponentSelector.test.ts`

**Step 3: Refactor ComponentSelector**

In `ComponentSelector.ts`, ensure the `selectComponent` method reads `analysis.contentType` as the primary selection factor. Keep content pattern detection ONLY for sub-type refinement (alert-box, info-box, lead-paragraph within a content type):

The standard selection path should be:
1. FS-protected → FS-compliant component (existing, keep)
2. High-value (UNIQUE/RARE) → enhanced component (existing, keep)
3. Content patterns → ONLY for detecting alert/info/lead sub-patterns WITHIN the already-determined content type (refine, don't override)
4. Standard → use `analysis.contentType` directly to look up `COMPONENT_MAPPINGS` (existing, keep)

Remove any code that re-detects content type from heading patterns.

**Step 4: Run all ComponentSelector tests**

Run: `npx vitest run services/layout-engine/__tests__/ComponentSelector.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add services/layout-engine/ComponentSelector.ts services/layout-engine/__tests__/ComponentSelector.test.ts
git commit -m "fix: ComponentSelector uses analysis.contentType as source of truth"
```

---

### Task 5: Fix VisualEmphasizer headingDecoration to return structured type

**Files:**
- Modify: `services/layout-engine/types.ts:167`
- Modify: `services/layout-engine/VisualEmphasizer.ts:124,151,171,191,211`
- Test: `services/layout-engine/__tests__/VisualEmphasizer.test.ts`

**Step 1: Write failing test**

```typescript
it('hero emphasis should have headingDecoration with type and optional color', () => {
  const analysis = makeAnalysis({ semanticWeight: 5 });
  const emphasis = VisualEmphasizer.calculateEmphasis(analysis);
  expect(emphasis.headingDecoration).toEqual(
    expect.objectContaining({ type: 'background' })
  );
});

it('featured emphasis should have border-bottom decoration', () => {
  const analysis = makeAnalysis({ semanticWeight: 4 });
  const emphasis = VisualEmphasizer.calculateEmphasis(analysis);
  expect(emphasis.headingDecoration).toEqual(
    expect.objectContaining({ type: 'border-bottom' })
  );
});

it('standard emphasis should have no decoration', () => {
  const analysis = makeAnalysis({ semanticWeight: 3 });
  const emphasis = VisualEmphasizer.calculateEmphasis(analysis);
  expect(emphasis.headingDecoration).toEqual({ type: 'none' });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/layout-engine/__tests__/VisualEmphasizer.test.ts`
Expected: FAIL — `headingDecoration` is `boolean`, not an object

**Step 3: Update types and implementation**

In `types.ts` line 167, change:
```typescript
// BEFORE:
headingDecoration: boolean;

// AFTER:
headingDecoration: { type: 'underline' | 'border-bottom' | 'background' | 'none'; color?: string };
```

In `VisualEmphasizer.ts`, update each emphasis function:

```typescript
// Hero (line 124): headingDecoration: true ->
headingDecoration: { type: 'background' },

// Featured (line 151): headingDecoration: true ->
headingDecoration: { type: 'border-bottom' },

// Standard (line 171): headingDecoration: false ->
headingDecoration: { type: 'none' },

// Supporting (line 191): headingDecoration: false ->
headingDecoration: { type: 'none' },

// Minimal (line 211): headingDecoration: false ->
headingDecoration: { type: 'none' },
```

Search for all consumers of `headingDecoration` across the codebase and update them to handle the new object type (likely in blueprint renderer and CSS generator).

**Step 4: Run full test suite to check for breakage**

Run: `npx vitest run`
Expected: Fix any tests that check `headingDecoration === true/false`

**Step 5: Commit**

```bash
git add services/layout-engine/types.ts services/layout-engine/VisualEmphasizer.ts services/layout-engine/__tests__/VisualEmphasizer.test.ts
git commit -m "fix: headingDecoration returns structured type instead of boolean"
```

---

### Task 6: Fix alt text template expansion in ImageHandler

**Files:**
- Modify: `services/layout-engine/ImageHandler.ts:177-197`
- Test: `services/layout-engine/__tests__/ImageHandler.test.ts`

**Step 1: Write failing test**

```typescript
it('generatePlaceholderSpec should return expanded alt text, not templates', () => {
  const analysis: SectionAnalysis = {
    sectionId: 'test',
    heading: 'Installation Process',
    headingLevel: 2,
    contentType: 'steps',
    semanticWeight: 3,
    // ... required fields
  };

  const result = ImageHandler.determineImagePlacement(analysis, undefined, 'The process of installing the software requires three steps.');
  expect(result?.placeholder?.altTextTemplate).not.toContain('${');
  expect(result?.placeholder?.altTextTemplate).toContain('Installation Process');
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/layout-engine/__tests__/ImageHandler.test.ts`
Expected: FAIL — alt text still contains `${heading}` template syntax (or may pass if template doesn't use `${...}` — check actual output)

**Step 3: Update generatePlaceholderSpec to expand templates**

In `ImageHandler.ts`, update `generatePlaceholderSpec` (lines 177-197):

```typescript
function generatePlaceholderSpec(
  analysis: SectionAnalysis,
  sectionContent?: string,
  isFlowchart: boolean = false
): ImagePlaceholderSpec {
  const mainConcept = extractMainConcept(sectionContent || '', analysis.heading);
  const heading = analysis.heading || 'the concept';

  if (isFlowchart) {
    return {
      aspectRatio: '16:9',
      suggestedContent: `Flowchart showing ${heading} steps`,
      altTextTemplate: `Step-by-step ${heading} flowchart showing the sequence of actions`,
    };
  }

  return {
    aspectRatio: '16:9',
    suggestedContent: `Diagram illustrating ${mainConcept}`,
    altTextTemplate: `${heading} diagram showing ${mainConcept.toLowerCase()}`,
  };
}
```

Note: The current code already uses string interpolation (`${analysis.heading}`), NOT template literal syntax (`${heading}`). Verify by reading the actual output. The real fix is ensuring the `analysis.heading` is always populated (not empty string). Add a guard:

```typescript
const heading = analysis.heading?.trim() || 'the concept';
```

**Step 4: Run test**

Run: `npx vitest run services/layout-engine/__tests__/ImageHandler.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add services/layout-engine/ImageHandler.ts services/layout-engine/__tests__/ImageHandler.test.ts
git commit -m "fix: ensure alt text templates are fully expanded with actual heading values"
```

---

### Task 7: Phase 1 verification

**Step 1: Run full type check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 2: Run full test suite**

Run: `npx vitest run`
Expected: 0 failures

**Step 3: Commit phase marker**

No commit needed if all individual commits passed. Move to Phase 2.

---

## Phase 2: Configuration Externalization

### Task 8: Add SERVICE_REGISTRY.layoutEngine config section

**Files:**
- Modify: `config/serviceRegistry.ts:393-425`

**Step 1: Write failing test**

File: `config/__tests__/serviceRegistry.test.ts` (add to existing or create)

```typescript
import { describe, it, expect } from 'vitest';
import { SERVICE_REGISTRY } from '../serviceRegistry';

describe('SERVICE_REGISTRY.layoutEngine', () => {
  it('should have weights config', () => {
    expect(SERVICE_REGISTRY.layoutEngine).toBeDefined();
    expect(SERVICE_REGISTRY.layoutEngine.weights.base).toBe(3);
    expect(SERVICE_REGISTRY.layoutEngine.weights.max).toBe(5);
    expect(SERVICE_REGISTRY.layoutEngine.weights.min).toBe(1);
  });

  it('should have category bonuses matching attribute categories', () => {
    expect(SERVICE_REGISTRY.layoutEngine.weights.categoryBonuses.UNIQUE).toBe(2);
    expect(SERVICE_REGISTRY.layoutEngine.weights.categoryBonuses.RARE).toBe(1);
    expect(SERVICE_REGISTRY.layoutEngine.weights.categoryBonuses.ROOT).toBe(0.5);
    expect(SERVICE_REGISTRY.layoutEngine.weights.categoryBonuses.COMMON).toBe(0);
  });

  it('should have confidence thresholds', () => {
    expect(SERVICE_REGISTRY.layoutEngine.confidence.autoApplyThreshold).toBe(0.8);
    expect(SERVICE_REGISTRY.layoutEngine.confidence.fsCompliant).toBe(0.95);
  });

  it('should have image config', () => {
    expect(SERVICE_REGISTRY.layoutEngine.image.preferredFormats).toContain('avif');
    expect(SERVICE_REGISTRY.layoutEngine.image.maxFileSizeBytes).toBe(500000);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run config/__tests__/serviceRegistry.test.ts`
Expected: FAIL — `SERVICE_REGISTRY.layoutEngine` is undefined

**Step 3: Add layoutEngine section to SERVICE_REGISTRY**

In `config/serviceRegistry.ts`, before the closing `} as const;` on line 425, add:

```typescript
  /** Layout engine configuration for visual semantics pipeline */
  layoutEngine: {
    weights: {
      base: 3,
      min: 1,
      max: 5,
      bonuses: {
        coreTopic: 0.5,
        fsTarget: 0.5,
        mainIntent: 0.5,
        firstMainSection: 1,
        intro: 0.5,
      },
      categoryBonuses: {
        UNIQUE: 2,
        RARE: 1,
        ROOT: 0.5,
        COMMON: 0,
        CORE_DEFINITION: 0.5,
        SEARCH_DEMAND: 0.5,
        COMPETITIVE_EXPANSION: 0.25,
        COMPOSITE: 0.25,
        UNCLASSIFIED: 0,
      },
    },
    confidence: {
      fsCompliant: 0.95,
      highValue: 0.85,
      standard: 0.75,
      fallback: 0.6,
      autoApplyThreshold: 0.8,
      patternBoosts: {
        alert: 0.7,
        info: 0.6,
        lead: 0.8,
        featureGrid: 0.75,
        sequential: 0.7,
        qa: 0.7,
      },
    },
    emphasis: {
      energyThresholdForBackground: 3,
      defaultAnimationType: 'fade' as const,
      heroHeadingSize: 'xl' as const,
      featuredHeadingSize: 'lg' as const,
      heroPaddingMultiplier: 2,
      featuredPaddingMultiplier: 1.5,
      supportingPaddingMultiplier: 0.75,
      minimalPaddingMultiplier: 0.5,
    },
    image: {
      maxWidthPx: 2000,
      maxFileSizeBytes: 500000,
      preferredFormats: ['avif', 'webp'] as readonly string[],
      heroWeightThreshold: 5,
      featuredWeightThreshold: 4,
      noImageContentTypes: ['faq', 'definition', 'testimonial'] as readonly string[],
      flowchartContentTypes: ['steps', 'process'] as readonly string[],
    },
  },
```

**Step 4: Run test**

Run: `npx vitest run config/__tests__/serviceRegistry.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add config/serviceRegistry.ts config/__tests__/serviceRegistry.test.ts
git commit -m "feat: add SERVICE_REGISTRY.layoutEngine configuration section"
```

---

### Task 9: Wire layout engine services to use SERVICE_REGISTRY

**Files:**
- Modify: `services/layout-engine/SectionAnalyzer.ts` — replace local constants with registry imports
- Modify: `services/layout-engine/ComponentSelector.ts` — replace confidence constants
- Modify: `services/layout-engine/VisualEmphasizer.ts` — replace emphasis constants
- Modify: `services/layout-engine/ImageHandler.ts` — replace image constants
- Modify: `services/imageProcessingService.ts` — replace image validation constants

**Step 1: Update SectionAnalyzer.ts imports**

Replace lines 24-46:

```typescript
// BEFORE (local constants):
const BASE_WEIGHT = 3;
const MAX_WEIGHT = 5;
// ...

// AFTER (import from registry):
import { SERVICE_REGISTRY } from '../../config/serviceRegistry';

const { base: BASE_WEIGHT, max: MAX_WEIGHT, min: MIN_WEIGHT } = SERVICE_REGISTRY.layoutEngine.weights;
const CATEGORY_BONUSES = SERVICE_REGISTRY.layoutEngine.weights.categoryBonuses as Record<string, number>;
const { coreTopic: CORE_TOPIC_BONUS, fsTarget: FS_TARGET_BONUS, mainIntent: MAIN_INTENT_BONUS, firstMainSection: FIRST_MAIN_SECTION_BONUS, intro: INTRO_CONTENT_BONUS } = SERVICE_REGISTRY.layoutEngine.weights.bonuses;
```

**Step 2: Update ComponentSelector.ts imports**

Replace lines 38-49:

```typescript
import { SERVICE_REGISTRY } from '../../config/serviceRegistry';

const DEFAULT_PERSONALITY: PersonalityType = 'corporate';
const FS_CONFIDENCE = SERVICE_REGISTRY.layoutEngine.confidence.fsCompliant;
const HIGH_VALUE_BASE_CONFIDENCE = SERVICE_REGISTRY.layoutEngine.confidence.highValue;
const CONTENT_PATTERN_ALERT_CONFIDENCE = SERVICE_REGISTRY.layoutEngine.confidence.patternBoosts.alert;
const CONTENT_PATTERN_INFO_CONFIDENCE = SERVICE_REGISTRY.layoutEngine.confidence.patternBoosts.info;
const CONTENT_PATTERN_LEAD_CONFIDENCE = SERVICE_REGISTRY.layoutEngine.confidence.patternBoosts.lead;
const CONTENT_PATTERN_FEATURE_GRID_CONFIDENCE = SERVICE_REGISTRY.layoutEngine.confidence.patternBoosts.featureGrid;
const CONTENT_PATTERN_SEQUENTIAL_CONFIDENCE = SERVICE_REGISTRY.layoutEngine.confidence.patternBoosts.sequential;
const CONTENT_PATTERN_QA_CONFIDENCE = SERVICE_REGISTRY.layoutEngine.confidence.patternBoosts.qa;
const STANDARD_CONFIDENCE = SERVICE_REGISTRY.layoutEngine.confidence.standard;
const FALLBACK_CONFIDENCE = SERVICE_REGISTRY.layoutEngine.confidence.fallback;
```

**Step 3: Update VisualEmphasizer.ts imports**

Replace lines 35-40:

```typescript
import { SERVICE_REGISTRY } from '../../config/serviceRegistry';

const ENERGY_THRESHOLD_FOR_BACKGROUND = SERVICE_REGISTRY.layoutEngine.emphasis.energyThresholdForBackground;
const DEFAULT_ANIMATION_TYPE = SERVICE_REGISTRY.layoutEngine.emphasis.defaultAnimationType as AnimationType;
```

**Step 4: Update ImageHandler.ts imports**

Replace lines 45-78:

```typescript
import { SERVICE_REGISTRY } from '../../config/serviceRegistry';

const FEATURED_WEIGHT_THRESHOLD = SERVICE_REGISTRY.layoutEngine.image.featuredWeightThreshold;
const HERO_WEIGHT_THRESHOLD = SERVICE_REGISTRY.layoutEngine.image.heroWeightThreshold;
// Keep COMPLEX_CONCEPT_PATTERNS as-is (regex patterns, not numeric config)
const NO_IMAGE_CONTENT_TYPES = [...SERVICE_REGISTRY.layoutEngine.image.noImageContentTypes];
const FLOWCHART_CONTENT_TYPES = [...SERVICE_REGISTRY.layoutEngine.image.flowchartContentTypes];
```

**Step 5: Run full test suite**

Run: `npx vitest run`
Expected: ALL PASS — values haven't changed, just moved to registry

**Step 6: Commit**

```bash
git add services/layout-engine/SectionAnalyzer.ts services/layout-engine/ComponentSelector.ts services/layout-engine/VisualEmphasizer.ts services/layout-engine/ImageHandler.ts config/serviceRegistry.ts
git commit -m "refactor: wire layout engine constants to SERVICE_REGISTRY.layoutEngine"
```

---

### Task 10: Phase 2 verification

Run: `npx tsc --noEmit && npx vitest run`
Expected: 0 errors, 0 failures

---

## Phase 3: Blueprint Type Consolidation (was Phase 6 in design)

### Task 11: Add new fields to BlueprintSection type

**Files:**
- Modify: `services/layout-engine/types.ts:308-323`

**Step 1: Add fields to BlueprintSection**

In `types.ts`, extend `BlueprintSection` (after line 322):

```typescript
export interface BlueprintSection {
  id: string;
  order: number;
  heading: string;
  headingLevel: number;
  contentType: ContentType;
  semanticWeight: number;
  layout: LayoutParameters;
  emphasis: VisualEmphasis;
  component: ComponentSelection;
  image?: ImagePlacement;
  constraints: SectionConstraints;
  contentZone: 'MAIN' | 'SUPPLEMENTARY';
  cssClasses: string[];
  customStyles?: Record<string, string>;

  // NEW: Cost of Retrieval impact
  estimatedDomNodes?: number;
  layoutComplexity?: 'lightweight' | 'moderate' | 'heavy';

  // NEW: Accessibility
  accessibilityRating?: 'AAA' | 'AA' | 'A';

  // NEW: Responsive behavior
  responsiveBreakpoints?: {
    mobile: { columns: ColumnLayout; width: LayoutWidth };
    tablet: { columns: ColumnLayout; width: LayoutWidth };
    desktop: { columns: ColumnLayout; width: LayoutWidth };
  };

  // NEW: Website type context
  websiteTypeRole?: string;
  liftPriority?: number;
}
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: 0 errors (all new fields are optional)

**Step 3: Commit**

```bash
git add services/layout-engine/types.ts
git commit -m "feat: add COR, accessibility, responsive, and website-type fields to BlueprintSection"
```

---

### Task 12: Consolidate architect blueprint types

**Files:**
- Modify: `services/publishing/architect/blueprintTypes.ts`

**Step 1: Read architect types to identify overlaps**

Read `services/publishing/architect/blueprintTypes.ts` and identify any types that duplicate `services/layout-engine/types.ts`.

**Step 2: Re-export shared types from layout-engine**

At the top of `services/publishing/architect/blueprintTypes.ts`, add re-exports:

```typescript
// Re-export canonical types from layout engine
export type {
  ContentType,
  ComponentType,
  EmphasisLevel,
  LayoutWidth,
  ColumnLayout,
  BlueprintSection,
  LayoutBlueprint,
  VisualEmphasis,
  ComponentSelection,
  LayoutParameters,
} from '../../layout-engine/types';
```

Remove any duplicate definitions that are now re-exported. Keep architect-specific extensions (e.g., AI generation metadata).

**Step 3: Run type check and tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 0 errors, 0 failures

**Step 4: Commit**

```bash
git add services/publishing/architect/blueprintTypes.ts
git commit -m "refactor: consolidate architect blueprint types to re-export from layout-engine"
```

---

### Task 13: Add component-renderer validation helper

**Files:**
- Modify: `services/publishing/renderer/componentLibrary.ts`

**Step 1: Export getRegisteredComponents function**

Read `componentLibrary.ts` to understand the current component registry structure. Add:

```typescript
export function getRegisteredComponents(): string[] {
  // Return list of all component types that the renderer can handle
  return Object.keys(COMPONENT_REGISTRY); // or whatever the internal registry is
}

export function isRegisteredComponent(componentType: string): boolean {
  return getRegisteredComponents().includes(componentType);
}
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 3: Commit**

```bash
git add services/publishing/renderer/componentLibrary.ts
git commit -m "feat: export getRegisteredComponents for component-renderer validation"
```

---

## Phase 4: Rule Enforcement in Content Generation (was Phase 3 in design)

### Task 14: Add format budget enforcement to Pass 6

**Files:**
- Modify: `services/ai/contentGeneration/passes/pass6Visuals.ts:52-105`
- Test: `services/ai/contentGeneration/passes/__tests__/pass6Visuals.test.ts`

**Step 1: Write failing test**

```typescript
it('filterSections should respect format budget maxImages', () => {
  const sections: ContentGenerationSection[] = Array.from({ length: 10 }, (_, i) => ({
    section_key: `section-${i}`,
    section_heading: `Section ${i}`,
    current_content: '[IMAGE: test]', // All have images
    job_id: 'test',
    pass_version: 1,
  } as any));

  const budget: ContentFormatBudget = { maxImages: 3, maxTables: 5, maxLists: 10 };
  const brief = { enhanced_visual_semantics: {} } as any;

  // The filter should cap at 3 sections (maxImages)
  // We need to test the filter function directly
  // This may require extracting the filter to a named export
});
```

**Step 2: Implement budget enforcement**

In `pass6Visuals.ts`, update the `filterSections` callback to track image count:

```typescript
filterSections: (sections: ContentGenerationSection[], budget: ContentFormatBudget) => {
  const briefImageSections = new Set<string>();
  // ... existing brief section building code ...

  let imagesAdded = 0;
  const maxImages = budget?.maxImages ?? Infinity;

  // Split into brief-designated (priority) and auto-justified
  const briefDesignated: ContentGenerationSection[] = [];
  const autoJustified: ContentGenerationSection[] = [];

  for (const s of sections) {
    if (imagesAdded >= maxImages) break;

    const sectionKeyLower = s.section_key.toLowerCase();
    const sectionKeyNormalized = sectionKeyLower.replace(/-/g, '_');

    if (briefImageSections.has(sectionKeyLower) || briefImageSections.has(sectionKeyNormalized)) {
      briefDesignated.push(s);
      imagesAdded++;
      continue;
    }

    const hasImage = (s.current_content || '').includes('[IMAGE:');
    if (hasImage) {
      briefDesignated.push(s);
      imagesAdded++;
      continue;
    }

    // Auto-justified goes to secondary list
    // ... existing evaluation logic ...
    if (evaluation.justified && imagesAdded < maxImages) {
      autoJustified.push(s);
      imagesAdded++;
    }
  }

  return [...briefDesignated, ...autoJustified];
}
```

**Step 3: Run tests**

Run: `npx vitest run`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add services/ai/contentGeneration/passes/pass6Visuals.ts
git commit -m "feat: enforce format budget maxImages cap in Pass 6 visual semantics"
```

---

### Task 15: Add FS protection chain validation to LayoutEngine

**Files:**
- Modify: `services/layout-engine/LayoutEngine.ts`
- Test: `services/layout-engine/__tests__/LayoutEngine.test.ts`

**Step 1: Write failing test**

```typescript
it('should validate FS protection chain: fsTarget -> 1-column -> FS component -> no animation', () => {
  const blueprint = layoutEngine.generateBlueprint(
    '## What is X?\n\nX is a definition of something important.',
    [{ heading: 'What is X?', format_code: 'FS' } as any],
  );

  const fsSection = blueprint.sections.find(s => s.constraints?.fsTarget);
  if (fsSection) {
    expect(fsSection.layout.columns).toBe('1-column');
    expect(fsSection.emphasis.hasEntryAnimation).toBe(false);
  }
});
```

**Step 2: Implement FS chain validation**

In `LayoutEngine.ts`, add a validation function after blueprint generation:

```typescript
function validateFsProtectionChain(sections: BlueprintSection[]): void {
  for (const section of sections) {
    if (!section.constraints?.fsTarget) continue;

    if (section.layout.columns !== '1-column') {
      console.warn(`[LayoutEngine] FS chain broken: section "${section.heading}" has columns=${section.layout.columns}, expected 1-column`);
      section.layout.columns = '1-column'; // Auto-fix
    }

    if (section.emphasis.hasEntryAnimation) {
      console.warn(`[LayoutEngine] FS chain broken: section "${section.heading}" has animation, disabling for FS compliance`);
      section.emphasis = { ...section.emphasis, hasEntryAnimation: false, animationType: undefined };
    }

    if (section.emphasis.hasBackgroundTreatment) {
      console.warn(`[LayoutEngine] FS chain broken: section "${section.heading}" has background treatment, disabling for FS compliance`);
      section.emphasis = { ...section.emphasis, hasBackgroundTreatment: false, backgroundType: undefined };
    }
  }
}
```

Call this function after generating the blueprint sections.

**Step 3: Run tests**

Run: `npx vitest run services/layout-engine/__tests__/LayoutEngine.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add services/layout-engine/LayoutEngine.ts services/layout-engine/__tests__/LayoutEngine.test.ts
git commit -m "feat: add FS protection chain validation to LayoutEngine"
```

---

## Phase 5: Bidirectional Audit-Layout Integration (was Phase 4 in design)

### Task 16: Create LayoutRuleEngine

**Files:**
- Create: `services/layout-engine/LayoutRuleEngine.ts`
- Create: `services/layout-engine/__tests__/LayoutRuleEngine.test.ts`

**Step 1: Write failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { LayoutRuleEngine } from '../LayoutRuleEngine';

describe('LayoutRuleEngine', () => {
  describe('getLayoutConstraints', () => {
    it('should return ordered-list requirement for steps content', () => {
      const constraints = LayoutRuleEngine.getLayoutConstraints('steps', 'ordered-list');
      expect(constraints.requiredFormat).toBe('ordered-list');
    });

    it('should return table requirement for comparison content', () => {
      const constraints = LayoutRuleEngine.getLayoutConstraints('comparison', 'table');
      expect(constraints.requiredFormat).toBe('table');
    });

    it('should require intro sentence for list content', () => {
      const constraints = LayoutRuleEngine.getLayoutConstraints('list', 'unordered-list');
      expect(constraints.requiresIntroSentence).toBe(true);
    });

    it('should set maxParagraphWords to 150', () => {
      const constraints = LayoutRuleEngine.getLayoutConstraints('explanation', 'prose');
      expect(constraints.maxParagraphWords).toBe(150);
    });

    it('should require heading every 300 words', () => {
      const constraints = LayoutRuleEngine.getLayoutConstraints('explanation', 'prose');
      expect(constraints.requiresHeadingEvery).toBe(300);
    });
  });

  describe('validateRenderedOutput', () => {
    it('should flag images without alt text', () => {
      const html = '<article><img src="test.jpg"></article>';
      const violations = LayoutRuleEngine.validateRenderedOutput(html);
      expect(violations.some(v => v.rule === 'img-alt-text')).toBe(true);
    });

    it('should flag images between heading and first paragraph', () => {
      const html = '<article><h2>Title</h2><img src="test.jpg"><p>Content</p></article>';
      const violations = LayoutRuleEngine.validateRenderedOutput(html);
      expect(violations.some(v => v.rule === 'img-placement')).toBe(true);
    });

    it('should pass for properly placed images', () => {
      const html = '<article><h2>Title</h2><p>Content</p><img src="test.jpg" alt="Description"></article>';
      const violations = LayoutRuleEngine.validateRenderedOutput(html);
      expect(violations.filter(v => v.rule === 'img-placement')).toHaveLength(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/layout-engine/__tests__/LayoutRuleEngine.test.ts`
Expected: FAIL — module doesn't exist

**Step 3: Implement LayoutRuleEngine**

Create `services/layout-engine/LayoutRuleEngine.ts`:

```typescript
import type { ComponentType, ContentType } from './types';

export interface LayoutConstraints {
  requiredFormat?: 'ordered-list' | 'unordered-list' | 'table' | 'prose';
  requiresIntroSentence?: boolean;
  maxListItems?: number;
  minTableColumns?: number;
  requiresHeadingEvery?: number;
  maxParagraphWords?: number;
  requiresImageCaption?: boolean;
  requiresLazyLoading?: boolean;
  requiresResponsiveImages?: boolean;
  preferredComponent?: ComponentType;
}

export interface LayoutViolation {
  rule: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  element?: string;
}

// Rule mappings from audit rules to layout constraints
const CONTENT_TYPE_CONSTRAINTS: Partial<Record<ContentType, Partial<LayoutConstraints>>> = {
  steps: { requiredFormat: 'ordered-list', requiresIntroSentence: true, maxListItems: 10 },
  comparison: { requiredFormat: 'table', minTableColumns: 2 },
  list: { requiresIntroSentence: true, maxListItems: 10 },
  faq: { preferredComponent: 'faq-accordion' },
  definition: { preferredComponent: 'definition-box' },
};

// Universal constraints (apply to all content types)
const UNIVERSAL_CONSTRAINTS: Partial<LayoutConstraints> = {
  requiresHeadingEvery: 300,
  maxParagraphWords: 150,
  requiresLazyLoading: true,
  requiresResponsiveImages: true,
  requiresImageCaption: true,
};

export class LayoutRuleEngine {
  static getLayoutConstraints(
    contentType: ContentType,
    _format: string,
    _websiteType?: string,
    _searchIntent?: string
  ): LayoutConstraints {
    return {
      ...UNIVERSAL_CONSTRAINTS,
      ...(CONTENT_TYPE_CONSTRAINTS[contentType] || {}),
    };
  }

  static validateRenderedOutput(html: string): LayoutViolation[] {
    const violations: LayoutViolation[] = [];

    // Rule: Images must have alt text
    const imgWithoutAlt = html.match(/<img(?![^>]*\balt\s*=)[^>]*>/gi);
    if (imgWithoutAlt) {
      for (const img of imgWithoutAlt) {
        violations.push({
          rule: 'img-alt-text',
          severity: 'high',
          message: 'Image missing alt attribute',
          element: img.substring(0, 100),
        });
      }
    }

    // Rule: No images between heading and first paragraph
    const headingThenImg = html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>\s*<img/gi);
    if (headingThenImg) {
      for (const match of headingThenImg) {
        violations.push({
          rule: 'img-placement',
          severity: 'critical',
          message: 'Image placed between heading and first paragraph — violates Semantic SEO rule',
          element: match.substring(0, 100),
        });
      }
    }

    return violations;
  }
}
```

**Step 4: Run test**

Run: `npx vitest run services/layout-engine/__tests__/LayoutRuleEngine.test.ts`
Expected: PASS

**Step 5: Export from index**

Add to `services/layout-engine/index.ts`:

```typescript
export { LayoutRuleEngine } from './LayoutRuleEngine';
export type { LayoutConstraints, LayoutViolation } from './LayoutRuleEngine';
```

**Step 6: Commit**

```bash
git add services/layout-engine/LayoutRuleEngine.ts services/layout-engine/__tests__/LayoutRuleEngine.test.ts services/layout-engine/index.ts
git commit -m "feat: create LayoutRuleEngine for bidirectional audit-layout integration"
```

---

### Task 17: Wire LayoutRuleEngine into LayoutEngine orchestrator

**Files:**
- Modify: `services/layout-engine/LayoutEngine.ts`
- Modify: `services/layout-engine/ComponentSelector.ts` — accept constraints param
- Modify: `services/layout-engine/LayoutPlanner.ts` — accept constraints param

**Step 1: Update ComponentSelector to accept constraints**

In `ComponentSelector.ts`, update `selectComponent` to accept an optional `constraints` parameter:

```typescript
// Update the ContentPatternOptions type in types.ts to include constraints:
export interface ContentPatternOptions {
  content?: string;
  isFirstSection?: boolean;
  constraints?: import('./LayoutRuleEngine').LayoutConstraints;
}
```

In the `selectComponent` method, when `constraints.preferredComponent` is set and confidence is high, use it:

```typescript
if (options?.constraints?.preferredComponent) {
  // If audit rules strongly suggest a component, boost its selection
  const preferred = options.constraints.preferredComponent;
  // Only override if the preferred component matches the content type
  // (don't force faq-accordion on steps content)
  if (mapping.componentType === preferred || mapping.alternatives?.includes(preferred)) {
    return {
      primaryComponent: preferred,
      alternativeComponents: [mapping.componentType, ...(mapping.alternatives || [])],
      componentVariant: variant,
      confidence: Math.max(baseConfidence, STANDARD_CONFIDENCE),
      reasoning: `Audit rule constraint: ${preferred} preferred for ${analysis.contentType}`,
    };
  }
}
```

**Step 2: Wire into LayoutEngine**

In `LayoutEngine.ts`, import and call LayoutRuleEngine between analysis and suggestion generation:

```typescript
import { LayoutRuleEngine } from './LayoutRuleEngine';

// In generateBlueprint, after analyzing sections:
const constraints = LayoutRuleEngine.getLayoutConstraints(
  analysis.contentType,
  analysis.hasList ? 'list' : analysis.hasTable ? 'table' : 'prose',
);

const component = ComponentSelector.selectComponent(analysis, designDna, { constraints });
```

**Step 3: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add services/layout-engine/LayoutEngine.ts services/layout-engine/ComponentSelector.ts services/layout-engine/types.ts
git commit -m "feat: wire LayoutRuleEngine constraints into ComponentSelector and LayoutEngine"
```

---

## Phase 6: Website-Type-Specific Layouts (was Phase 5 in design)

### Task 18: Create websiteTypeLayouts.ts with 17 website types

**Files:**
- Create: `services/layout-engine/websiteTypeLayouts.ts`
- Create: `services/layout-engine/__tests__/websiteTypeLayouts.test.ts`

**Step 1: Write failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { WEBSITE_TYPE_LAYOUTS, getWebsiteTypeLayout } from '../websiteTypeLayouts';

describe('websiteTypeLayouts', () => {
  it('should define 17 website types', () => {
    expect(Object.keys(WEBSITE_TYPE_LAYOUTS).length).toBe(17);
  });

  it('e-commerce should have LIFT-ordered components', () => {
    const ecom = WEBSITE_TYPE_LAYOUTS['e-commerce'];
    expect(ecom.componentOrder[0].role).toBe('product-hero');
    expect(ecom.componentOrder[0].liftPriority).toBe(1);
    // Reviews should come after features
    const featureIdx = ecom.componentOrder.findIndex(c => c.role === 'key-features');
    const reviewIdx = ecom.componentOrder.findIndex(c => c.role === 'reviews');
    expect(featureIdx).toBeLessThan(reviewIdx);
  });

  it('blog should have article-centric layout', () => {
    const blog = WEBSITE_TYPE_LAYOUTS['blog'];
    expect(blog.componentOrder[0].role).toBe('article-title');
  });

  it('getWebsiteTypeLayout should return null for unknown type', () => {
    expect(getWebsiteTypeLayout('unknown-type')).toBeNull();
  });
});
```

**Step 2: Implement websiteTypeLayouts.ts**

Create `services/layout-engine/websiteTypeLayouts.ts` with all 17 types from the Semantic SEO framework. Each type defines component order, heading template, and internal linking pattern. This is a data-heavy file — the component orders come directly from the framework's website-types.md.

Key types to include: `e-commerce`, `saas`, `b2b`, `healthcare`, `travel`, `e-learning`, `legal`, `real-estate`, `news`, `local-business`, `affiliate`, `restaurant`, `fashion`, `financial`, `insurance`, `nonprofit`, `blog`.

```typescript
import type { ComponentType } from './types';

export interface WebsiteTypeComponentRole {
  role: string;
  preferredComponent: ComponentType;
  headingStructure: string;
  visualRequirements: string[];
  liftPriority: number;
}

export interface WebsiteTypeLayout {
  type: string;
  componentOrder: WebsiteTypeComponentRole[];
  headingTemplate: string[];
  internalLinkingPattern: {
    primaryTargets: string[];
    linkDirection: 'to-core' | 'to-author' | 'bidirectional';
  };
  weightBonuses?: Record<string, number>;
}

export const WEBSITE_TYPE_LAYOUTS: Record<string, WebsiteTypeLayout> = {
  'e-commerce': {
    type: 'e-commerce',
    componentOrder: [
      { role: 'product-hero', preferredComponent: 'hero', headingStructure: 'H1: [Product Name] - [Key Benefit]', visualRequirements: ['Product images (5-8 angles)', '360-degree views'], liftPriority: 1 },
      { role: 'price-purchase', preferredComponent: 'stat-highlight', headingStructure: '', visualRequirements: ['Price display', 'Add to cart CTA'], liftPriority: 1 },
      { role: 'key-features', preferredComponent: 'feature-grid', headingStructure: 'H2: Key Features', visualRequirements: ['Feature icons'], liftPriority: 2 },
      { role: 'specifications', preferredComponent: 'comparison-table', headingStructure: 'H2: Specifications', visualRequirements: ['Spec table'], liftPriority: 3 },
      { role: 'reviews', preferredComponent: 'testimonial-card', headingStructure: 'H2: Reviews & Ratings', visualRequirements: ['Star ratings', 'Customer photos'], liftPriority: 4 },
      { role: 'comparison', preferredComponent: 'comparison-table', headingStructure: 'H2: Comparison with [Alternatives]', visualRequirements: ['Comparison chart'], liftPriority: 5 },
      { role: 'faq', preferredComponent: 'faq-accordion', headingStructure: 'H2: FAQs', visualRequirements: [], liftPriority: 6 },
      { role: 'related-products', preferredComponent: 'card', headingStructure: 'H2: Related Products', visualRequirements: ['Product thumbnails'], liftPriority: 7 },
    ],
    headingTemplate: ['H1: [Product] - [Benefit]', 'H2: Product Overview', 'H2: Key Features', 'H2: Specifications', 'H2: Reviews & Ratings', 'H2: Comparison with [Alternatives]', 'H2: FAQs', 'H2: Related Products'],
    internalLinkingPattern: { primaryTargets: ['related-products', 'comparison-guides', 'product-category'], linkDirection: 'to-core' },
    weightBonuses: { 'product-hero': 1.5, 'price-purchase': 1, 'key-features': 0.5 },
  },
  // ... 16 more types (saas, b2b, blog, healthcare, travel, etc.)
  // Each following the same pattern with component orders from the framework
};

export function getWebsiteTypeLayout(websiteType: string): WebsiteTypeLayout | null {
  return WEBSITE_TYPE_LAYOUTS[websiteType] || null;
}
```

Implement all 17 types following the Semantic SEO framework's website-types.md specifications.

**Step 3: Run test**

Run: `npx vitest run services/layout-engine/__tests__/websiteTypeLayouts.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add services/layout-engine/websiteTypeLayouts.ts services/layout-engine/__tests__/websiteTypeLayouts.test.ts
git commit -m "feat: add 17 website-type-specific layout configurations"
```

---

### Task 19: Wire website types into ComponentSelector and SectionAnalyzer

**Files:**
- Modify: `services/layout-engine/ComponentSelector.ts`
- Modify: `services/layout-engine/SectionAnalyzer.ts`
- Modify: `services/layout-engine/LayoutEngine.ts`

**Step 1: Update ContentPatternOptions to include websiteType**

In `types.ts`, update:

```typescript
export interface ContentPatternOptions {
  content?: string;
  isFirstSection?: boolean;
  constraints?: import('./LayoutRuleEngine').LayoutConstraints;
  websiteType?: string;
}
```

**Step 2: Update ComponentSelector**

When `websiteType` is provided, look up the website-type layout and use it as the primary component selector:

```typescript
import { getWebsiteTypeLayout } from './websiteTypeLayouts';

// In selectComponent method, before standard selection:
if (options?.websiteType) {
  const typeLayout = getWebsiteTypeLayout(options.websiteType);
  if (typeLayout) {
    // Find matching role based on content type
    const matchingRole = typeLayout.componentOrder.find(r =>
      r.preferredComponent === mapping.componentType ||
      analysis.contentType === r.role.split('-')[0]
    );
    if (matchingRole) {
      return {
        primaryComponent: matchingRole.preferredComponent,
        alternativeComponents: [mapping.componentType],
        componentVariant: variant,
        confidence: HIGH_VALUE_BASE_CONFIDENCE,
        reasoning: `Website type ${options.websiteType}: ${matchingRole.role} uses ${matchingRole.preferredComponent}`,
      };
    }
  }
}
```

**Step 3: Wire into LayoutEngine**

In `LayoutEngine.ts`, pass `websiteType` through to ComponentSelector:

```typescript
const component = ComponentSelector.selectComponent(analysis, designDna, {
  constraints,
  websiteType: options?.websiteType,
});
```

Update the `ILayoutEngine` interface to accept websiteType:

```typescript
export interface ILayoutEngine {
  generateBlueprint(
    content: string,
    briefSections?: BriefSection[],
    designDna?: DesignDNA,
    options?: {
      topicTitle?: string;
      isCoreTopic?: boolean;
      mainIntent?: string;
      websiteType?: string;  // NEW
    }
  ): LayoutBlueprint;
}
```

**Step 4: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add services/layout-engine/ComponentSelector.ts services/layout-engine/SectionAnalyzer.ts services/layout-engine/LayoutEngine.ts services/layout-engine/types.ts
git commit -m "feat: wire website-type layouts into ComponentSelector and LayoutEngine"
```

---

### Task 20: Final verification

**Step 1: Type check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 2: Full test suite**

Run: `npx vitest run`
Expected: 0 failures

**Step 3: Production build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete visual semantics pipeline overhaul (6 phases)"
```

---

## Summary

| Task | Phase | Description | Files |
|------|-------|-------------|-------|
| 1 | Bug Fix | Fix Pass 6 prompt builder imports | pass6Visuals.ts, promptBuilder |
| 2 | Bug Fix | Fix weight overflow with per-bonus clamping | SectionAnalyzer.ts |
| 3 | Bug Fix | Fix float state for single-section calls | ImageHandler.ts, types.ts |
| 4 | Bug Fix | Remove duplicate content type detection | ComponentSelector.ts |
| 5 | Bug Fix | Structured headingDecoration type | types.ts, VisualEmphasizer.ts |
| 6 | Bug Fix | Alt text template expansion | ImageHandler.ts |
| 7 | Verify | Phase 1 verification | — |
| 8 | Config | Add SERVICE_REGISTRY.layoutEngine | serviceRegistry.ts |
| 9 | Config | Wire services to registry | 5 service files |
| 10 | Verify | Phase 2 verification | — |
| 11 | Types | Add new BlueprintSection fields | types.ts |
| 12 | Types | Consolidate architect types | blueprintTypes.ts |
| 13 | Types | Component-renderer validation | componentLibrary.ts |
| 14 | Rules | Format budget enforcement | pass6Visuals.ts |
| 15 | Rules | FS protection chain validation | LayoutEngine.ts |
| 16 | Integration | Create LayoutRuleEngine | NEW: LayoutRuleEngine.ts |
| 17 | Integration | Wire into LayoutEngine | LayoutEngine.ts, ComponentSelector.ts |
| 18 | Website Types | Create 17 type configs | NEW: websiteTypeLayouts.ts |
| 19 | Website Types | Wire into selectors | ComponentSelector.ts, LayoutEngine.ts |
| 20 | Verify | Final verification | — |
