# Visual Semantics Pipeline Overhaul — Design Document

**Date**: 2026-02-19
**Status**: Approved
**Scope**: 25 files modified, 2 new files created across 6 phases

---

## Context

A comprehensive audit of the visual semantics pipeline revealed that the layout engine, audit rules, and content generation pass operate in silos. The Semantic SEO framework defines 570+ rules for visual layout, component ordering, image placement, and per-industry formatting — but only a fraction are enforced during content generation. The audit identified 23 critical semantic SEO gaps, 15 configuration externalization issues, and 12 data flow problems.

**Key finding**: Layout decisions are made without feedback from audit rules, and Pass 6 (visual semantics) doesn't enforce ImageHandler placement rules. This means the output HTML can violate core Semantic SEO principles (e.g., images between heading and first paragraph, wrong component types for website type, alt text that doesn't extend vocabulary).

---

## Phase 1: Bug Fixes & Correctness (6 items)

### 1.1 Pass 6 Uses Wrong Prompt Builders

**File**: `services/ai/contentGeneration/passes/pass6Visuals.ts`
**Problem**: References `buildPass4Prompt`/`buildPass4BatchPrompt` instead of Pass 6 variants.
**Fix**: Create or rename to correct Pass 6 prompt builders. Verify prompt content matches visual semantics goals (image placement, alt text generation, diagram suggestions).

### 1.2 SectionAnalyzer Weight Overflow

**File**: `services/layout-engine/SectionAnalyzer.ts`
**Problem**: Bonuses stack (UNIQUE +2, coreTopic +0.5, fsTarget +0.5, mainIntent +0.5, firstMainSection +1, intro +0.5 = potentially +5 on base of 3 = 8) before final clamp to MAX_WEIGHT=5. Intermediate overflow affects bonus interaction logic.
**Fix**: Clamp after each bonus addition, or use a weighted sum that naturally stays in range.

### 1.3 ImageHandler Float State Not Preserved

**File**: `services/layout-engine/ImageHandler.ts`
**Problem**: Static `determineImagePlacement()` can't alternate floats because it has no access to instance state. Calling it for 5 separate sections produces `float-left` every time.
**Fix**: Make the instance method the primary API. When called statically (single section), accept optional `floatHint: 'left' | 'right'` parameter.

### 1.4 Duplicate Content Type Detection

**File**: `services/layout-engine/ComponentSelector.ts`
**Problem**: ComponentSelector re-detects content types via regex patterns independently of SectionAnalyzer, producing inconsistent results.
**Fix**: Remove ComponentSelector's pattern detection. Read `analysis.contentType` from SectionAnalyzer as the single source of truth. Keep pattern detection only for sub-type refinement (e.g., detecting alert-box within an explanation section).

### 1.5 Heading Decoration Undefined

**File**: `services/layout-engine/VisualEmphasizer.ts`
**Problem**: Returns `headingDecoration: true` without specifying type (underline, border, background).
**Fix**: Change to `headingDecoration: { type: 'underline' | 'border-bottom' | 'background' | 'none', color?: string }`. Default: hero → 'background', featured → 'border-bottom', others → 'none'.

### 1.6 Alt Text Templates Never Expanded

**File**: `services/layout-engine/ImageHandler.ts`
**Problem**: `generatePlaceholderSpec()` returns `"Step-by-step ${heading} flowchart"` but `${heading}` is never substituted with actual values.
**Fix**: Expand templates at generation time using section heading, entity name, and content type. Return actual alt text string, not a template.

---

## Phase 2: Configuration Externalization

### Files Modified
- `config/serviceRegistry.ts` — add `SERVICE_REGISTRY.layoutEngine` section
- `services/layout-engine/SectionAnalyzer.ts` — import from registry
- `services/layout-engine/LayoutPlanner.ts` — import from registry
- `services/layout-engine/ComponentSelector.ts` — import from registry
- `services/layout-engine/VisualEmphasizer.ts` — import from registry
- `services/layout-engine/ImageHandler.ts` — import from registry
- `services/imageProcessingService.ts` — import from registry

### New Config Structure

```typescript
SERVICE_REGISTRY.layoutEngine = {
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
    preferredFormats: ['avif', 'webp'],
    heroWeightThreshold: 5,
    featuredWeightThreshold: 4,
    noImageContentTypes: ['faq', 'definition', 'testimonial'],
    flowchartContentTypes: ['steps', 'process'],
  },
};
```

Each service file replaces its local constants with imports from this registry.

---

## Phase 3: Rule Enforcement in Content Generation

### 3.1 Image Placement Enforcement in Pass 6

**File**: `services/ai/contentGeneration/passes/pass6Visuals.ts`
**Change**: After generating/placing images, validate each placement against `ImageHandler.determineImagePlacement()`. Reject any image that would appear between a heading and first paragraph. Log rejected placements for debugging.

### 3.2 Vocabulary-Extending Alt Text

**File**: `services/layout-engine/ImageHandler.ts`
**Change**: Replace template-based alt text with actual generation. Each image's alt text must:
- Use different vocabulary than H1 and surrounding headings (framework rule: "Expands topicality beyond H1")
- Include at least one synonym or LSI term not present in the section text
- Reference the entity by name (no pronouns — framework rule: "Explicit entity naming")
- Follow pattern: `"[Entity] [action/context] [unique descriptor]"` (e.g., "German Shepherd herding sheep on grassland" not "German Shepherd")

Implementation: Accept `entityName`, `headingText`, and `sectionKeywords` as inputs. Generate alt text that avoids repeating heading words while describing the image's semantic role.

### 3.3 Format Budget Enforcement

**File**: `services/ai/contentGeneration/passes/pass6Visuals.ts`
**Change**: The `ContentFormatBudget` parameter is passed but not enforced. Wire it as a hard cap:
- Track `imagesAdded` counter during section filtering
- Stop adding images once `budget.maxImages` reached
- Prioritize brief-designated sections over auto-justified ones

### 3.4 FS Protection Chain Validation

**Files**: `services/layout-engine/LayoutEngine.ts`
**Change**: Add explicit FS chain validation that verifies:
- `SectionAnalyzer.fsTarget=true` →
- `LayoutPlanner.columns='1-column'` →
- `ComponentSelector` returns FS-compliant component →
- `VisualEmphasizer` has no animation/background that shifts layout
- Log warning if any link in the chain is broken

---

## Phase 4: Bidirectional Audit-Layout Integration

### New File: `services/layout-engine/LayoutRuleEngine.ts`

Central rule integration service that feeds audit knowledge into layout decisions:

```typescript
export interface LayoutConstraints {
  requiredFormat?: 'ordered-list' | 'unordered-list' | 'table' | 'prose';
  requiresIntroSentence?: boolean;
  maxListItems?: number;
  minTableColumns?: number;
  requiresHeadingEvery?: number; // words
  maxParagraphWords?: number;
  requiresImageCaption?: boolean;
  requiresLazyLoading?: boolean;
  requiresResponsiveImages?: boolean;
  preferredComponent?: ComponentType;
}

export class LayoutRuleEngine {
  // Reads from audit rule definitions (ContentFormatValidator, ContentFormattingExtended, ImageMetadataValidator)
  static getLayoutConstraints(
    contentType: ContentType,
    format: string,
    websiteType?: string,
    searchIntent?: string
  ): LayoutConstraints;

  // Post-render validation: run lightweight audit subset on generated HTML
  static validateRenderedOutput(html: string): LayoutViolation[];
}
```

**Rule mappings** (audit rule → layout constraint):
- Rule 205 (how-to → ordered list) → `requiredFormat: 'ordered-list'`
- Rule 206 (comparison → table) → `requiredFormat: 'table'`
- Rule 215 (list size 3-10) → `maxListItems: 10`
- Rule 220 (heading every 300 words) → `requiresHeadingEvery: 300`
- Rule 224 (para ≤150 words) → `maxParagraphWords: 150`
- Rule 230 (list intro sentence) → `requiresIntroSentence: true`
- Rule 263 (responsive images) → `requiresResponsiveImages: true`
- Rule 265 (lazy loading) → `requiresLazyLoading: true`
- Rule 267 (image captions) → `requiresImageCaption: true`

### Wire Into LayoutEngine Orchestrator

**File**: `services/layout-engine/LayoutEngine.ts`
**Change**: Between section analysis and suggestion generation:

```typescript
// Step 2.5: Get audit-informed constraints
const constraints = LayoutRuleEngine.getLayoutConstraints(
  analysis.contentType,
  analysis.detectedFormat,
  businessInfo?.websiteType,
  searchIntent
);

// Pass constraints to ComponentSelector and LayoutPlanner
const component = selector.selectComponent(analysis, designDna, { constraints });
const layout = planner.planLayout(analysis, designDna, { constraints });
```

### Post-Render Validation

**File**: `services/publishing/renderer/blueprintRenderer.ts`
**Change**: After rendering HTML, call `LayoutRuleEngine.validateRenderedOutput(html)` and attach violations to the blueprint as warnings. These are surfaced in the LayoutIntelligenceStep UI.

---

## Phase 5: Website-Type-Specific Layouts

### New File: `services/layout-engine/websiteTypeLayouts.ts`

Encodes all 17 website-type configurations from the Semantic SEO framework:

```typescript
export interface WebsiteTypeLayout {
  type: string;
  componentOrder: Array<{
    role: string;           // e.g., 'product-hero', 'pricing', 'reviews'
    preferredComponent: ComponentType;
    headingStructure: string; // e.g., 'H2: Product Overview'
    visualRequirements: string[];
    liftPriority: number;   // LIFT model priority (1=highest)
  }>;
  headingTemplate: string[];
  internalLinkingPattern: {
    primaryTargets: string[];
    linkDirection: 'to-core' | 'to-author' | 'bidirectional';
  };
}

export const WEBSITE_TYPE_LAYOUTS: Record<string, WebsiteTypeLayout> = {
  'e-commerce': {
    componentOrder: [
      { role: 'product-hero', preferredComponent: 'hero', liftPriority: 1 },
      { role: 'price-purchase', preferredComponent: 'stat-highlight', liftPriority: 1 },
      { role: 'key-features', preferredComponent: 'feature-grid', liftPriority: 2 },
      { role: 'reviews', preferredComponent: 'testimonial-card', liftPriority: 3 },
      { role: 'specifications', preferredComponent: 'comparison-table', liftPriority: 4 },
      { role: 'related-products', preferredComponent: 'card', liftPriority: 5 },
    ],
    // ...
  },
  'saas': { /* ... */ },
  'b2b': { /* ... */ },
  'blog': { /* ... */ },
  'healthcare': { /* ... */ },
  'travel': { /* ... */ },
  'e-learning': { /* ... */ },
  'legal': { /* ... */ },
  'real-estate': { /* ... */ },
  'news': { /* ... */ },
  'local-business': { /* ... */ },
  'affiliate': { /* ... */ },
  'restaurant': { /* ... */ },
  'fashion': { /* ... */ },
  'financial': { /* ... */ },
  'insurance': { /* ... */ },
  'nonprofit': { /* ... */ },
};
```

### Wire Into Layout Engine Components

**ComponentSelector** — When `websiteType` is provided, use the website-type component order as primary selection. The personality matrix becomes the variant selector only (not component selector).

**LayoutPlanner** — Website type influences width/column defaults. E-commerce product pages get full-width hero + 2-column specs. Blog posts get single-column comfortable reading width.

**SectionAnalyzer** — Website type affects weight bonuses. For e-commerce, product/price sections get higher weight. For blogs, definition/explanation sections get higher weight. Add a `websiteTypeBonuses` map to the config.

**Connection to WebsiteTypeRuleEngine** — Extract shared type definitions so both the audit rule engine and the layout engine reference the same website type configurations. Avoid duplication.

---

## Phase 6: Blueprint Type Consolidation

### Single Source of Truth

**File**: `services/layout-engine/types.ts` (canonical)
**Change**: Add missing fields:

```typescript
export interface BlueprintSection {
  // ... existing fields ...

  // NEW: Cost of Retrieval impact
  estimatedDomNodes?: number;
  layoutComplexity?: 'lightweight' | 'moderate' | 'heavy';

  // NEW: Accessibility
  accessibilityRating?: 'AAA' | 'AA' | 'A';
  requiresAriaLabels?: boolean;

  // NEW: Responsive behavior
  responsiveBreakpoints?: {
    mobile: { columns: ColumnLayout; width: LayoutWidth };
    tablet: { columns: ColumnLayout; width: LayoutWidth };
    desktop: { columns: ColumnLayout; width: LayoutWidth };
  };

  // NEW: Website type context
  websiteTypeRole?: string; // e.g., 'product-hero', 'pricing'
  liftPriority?: number;
}
```

### Migrate Architect Types

**File**: `services/publishing/architect/blueprintTypes.ts`
**Change**: Remove duplicate type definitions. Re-export from `services/layout-engine/types.ts`. Add architect-specific extensions only where needed (e.g., AI generation metadata).

### Component-Renderer Validation

**File**: `services/publishing/renderer/componentLibrary.ts`
**Change**: Export a `getRegisteredComponents(): ComponentType[]` function. Add validation in `LayoutEngine.ts` that every component returned by `ComponentSelector` exists in the renderer's registry. Log warning and fall back to alternatives if not.

---

## Execution Order

Execute in dependency order (each phase builds on the previous):

1. **Phase 1**: Bug fixes — correctness foundation
2. **Phase 2**: Config externalization — constants available for all subsequent phases
3. **Phase 6**: Blueprint type consolidation — shared types needed by phases 4-5
4. **Phase 3**: Rule enforcement — uses corrected code + externalized config
5. **Phase 4**: Bidirectional integration — new LayoutRuleEngine + post-render validation
6. **Phase 5**: Website-type layouts — builds on integrated pipeline

## Verification

After each phase:
1. `npx tsc --noEmit` — 0 TypeScript errors
2. `npx vitest run` — 0 test failures

After all phases:
3. `npm run build` — production build succeeds
4. Manual verification: generate a blueprint for an e-commerce product page and verify component order matches LIFT model
5. Manual verification: generate a blog post blueprint and verify single-column reading width, vocabulary-extending alt text

---

## Files Summary

| Phase | Files Modified | Files Created |
|-------|---------------|---------------|
| 1 | pass6Visuals.ts, SectionAnalyzer.ts, ImageHandler.ts, ComponentSelector.ts, VisualEmphasizer.ts | 0 |
| 2 | serviceRegistry.ts, SectionAnalyzer.ts, LayoutPlanner.ts, ComponentSelector.ts, VisualEmphasizer.ts, ImageHandler.ts, imageProcessingService.ts | 0 |
| 3 | pass6Visuals.ts, ImageHandler.ts, LayoutEngine.ts | 0 |
| 4 | LayoutEngine.ts, ComponentSelector.ts, LayoutPlanner.ts, blueprintRenderer.ts | LayoutRuleEngine.ts |
| 5 | ComponentSelector.ts, LayoutPlanner.ts, SectionAnalyzer.ts, LayoutEngine.ts | websiteTypeLayouts.ts |
| 6 | layout-engine/types.ts, architect/blueprintTypes.ts, componentLibrary.ts | 0 |

**Total**: ~21 unique files modified, 2 new files created
