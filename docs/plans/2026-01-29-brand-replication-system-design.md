# Brand Replication System Design

**Date:** 2026-01-29
**Status:** Approved
**Goal:** Dynamic, context-aware brand replication that produces design-agency quality output with "wow factor"

---

## Executive Summary

A modular 4-phase pipeline that:
1. Discovers visual component patterns from any website (AI-driven, not template-based)
2. Generates high-quality code for each discovered component with validation
3. Uses full semantic context (pillars, topical map, topic, article) to make intelligent design decisions
4. Validates output quality before delivery

Each phase is independently runnable, inspectable, and editable.

---

## Problem Statement

Current output issues:
- Feature grids render as single column instead of 2-3 columns
- Unicode icons (✓★◆) instead of professional SVG icons
- No width variation across sections
- Missing brand-specific components (CTAs, attention boxes, dividers)
- Layout decisions not context-aware
- No validation that output matches brand

Root cause: The system extracts colors/fonts correctly but doesn't discover and replicate the actual visual component patterns each brand uses.

---

## Solution Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MODULAR PIPELINE ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │   PHASE 1   │───▶│   PHASE 2   │───▶│   PHASE 3   │───▶│   PHASE 4   │ │
│  │  DISCOVERY  │    │   CODEGEN   │    │INTELLIGENCE │    │ VALIDATION  │ │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘ │
│        │                  │                  │                  │         │
│        ▼                  ▼                  ▼                  ▼         │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                     USER PREVIEW & ADJUSTMENT                        │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Visual Discovery

**Purpose:** Analyze any website and discover its distinct visual component patterns.

**Input:**
```typescript
interface DiscoveryInput {
  brandUrl: string;
  pagesToAnalyze?: string[];
  options?: {
    maxPages?: number;
    includeScreenshots?: boolean;
  };
}
```

**Process:**
1. Capture screenshots of 5-10 pages (homepage, service pages, articles)
2. AI analyzes visually and identifies distinct component patterns
3. For each pattern: name, purpose, visual characteristics, usage context

**Output:**
```typescript
interface DiscoveryOutput {
  brandUrl: string;
  analyzedPages: string[];
  screenshots: { url: string; path: string; }[];
  discoveredComponents: DiscoveredComponent[];
  rawAnalysis: string;
  timestamp: string;
  status: 'success' | 'partial' | 'failed';
}

interface DiscoveredComponent {
  name: string;           // "Service Card", "Emergency CTA"
  purpose: string;        // "Displays service offerings"
  visualDescription: string;
  usageContext: string;
  sourceScreenshot: string;
  occurrences: number;
}
```

**Control Points:**
- Pages to analyze (configurable list)
- Screenshot settings (viewport, fullPage, wait conditions)
- AI analysis prompt (fully editable)
- Detection thresholds (minOccurrences, confidence)

**User Sees:**
- Gallery of discovered components with source screenshots
- Ability to add/remove/edit components

---

## Phase 2: Code Generation

**Purpose:** Generate production-quality CSS + HTML for each discovered component.

**Input:** DiscoveryOutput + Brand colors/fonts

**Process:**
1. For each component, AI generates CSS + HTML
2. Render live preview
3. Compare visually against source screenshot
4. Iterate until match score > threshold

**Output:**
```typescript
interface BrandComponent {
  id: string;
  name: string;
  purpose: string;
  usageContext: string;
  css: string;
  htmlTemplate: string;
  previewHtml: string;
  matchScore: number;
  variants: string[];
}
```

**Quality Standards:**
- CSS custom properties (not hardcoded values)
- Consistent spacing scale (4, 8, 16, 24, 32, 48px)
- Hover/focus states for interactive elements
- Responsive breakpoints
- Smooth transitions (0.2-0.3s ease)
- Accessible contrast ratios

**Control Points:**
- CSS generation prompt
- HTML generation prompt
- Quality standards config
- Match validation threshold
- Max iterations for retry

**User Sees:**
- Live preview side-by-side with source screenshot
- Match score with breakdown
- Ability to edit CSS/HTML directly

---

## Phase 3: Content Intelligence

**Purpose:** Make intelligent design decisions based on full semantic context.

**Input:**
```typescript
interface ContentContext {
  // Business Context
  pillars: {
    centralEntity: string;
    sourceContext: string;
    centralSearchIntent: string;
  };

  // Content Strategy Context
  topicalMap: {
    coreTopic: string;
    relatedTopics: string[];
    contentGaps: string[];
    targetAudience: string;
  };

  // Article Context
  article: {
    title: string;
    fullContent: string;
    sections: ArticleSection[];
    keyEntities: string[];
    mainMessage: string;
    callToAction: string;
  };

  // Current Section Context
  currentSection: {
    heading: string;
    content: string;
    position: 'intro' | 'body' | 'conclusion';
    precedingSections: string[];
    followingSections: string[];
    semanticRole: string;
  };
}
```

**Process:**
1. Build full context object
2. For each section, AI analyzes semantic role (not regex)
3. Match content to appropriate component from library
4. Decide layout parameters (columns, width, emphasis)
5. Provide reasoning for each decision

**Output:**
```typescript
interface SectionDesignDecision {
  sectionId: string;
  component: string;
  variant: string;
  layout: {
    columns: number;
    width: 'narrow' | 'medium' | 'wide' | 'full';
    emphasis: 'hero' | 'featured' | 'standard' | 'supporting';
  };
  reasoning: string;
  contentMapping: {
    title?: string;
    items?: string[];
    ctaText?: string;
    ctaTarget?: string;
  };
}
```

**Control Points:**
- Context configuration (what to include)
- Section analysis prompt
- Component matching prompt
- Layout override rules
- Manual decision overrides

**User Sees:**
- Each section with AI decision and reasoning
- Preview of how it will look
- Ability to override any decision

---

## Phase 4: Quality Validation

**Purpose:** Ensure output meets quality standards before delivery.

**Scoring Dimensions:**

1. **Brand Match Score (target: >85%)**
   - Colors match extracted palette
   - Typography matches brand fonts
   - Component styles match source

2. **Design Quality Score (target: >80%)**
   - Visual hierarchy clear
   - Consistent spacing rhythm
   - Proper emphasis distribution
   - Good visual/prose balance

3. **User Experience Score (target: >80%)**
   - Scannable content
   - Clear reading flow
   - Actionable conclusions

4. **Wow Factor Checklist:**
   - [ ] Impactful hero section
   - [ ] Multi-column layouts used
   - [ ] Attention-grabbing elements present
   - [ ] Clear CTA at conclusion
   - [ ] Visual variety throughout
   - [ ] Professional polish

**Control Points:**
- Scoring weights (customizable)
- Quality thresholds (customizable)
- Wow factor checklist (add/remove items)
- Validation prompt

**User Sees:**
- Score breakdown with details
- Checklist results
- Specific improvement suggestions

---

## File Structure

```
services/
└── brand-replication/
    ├── index.ts                    # Pipeline orchestrator
    │
    ├── interfaces/                 # Shared type definitions
    │   ├── phase1-discovery.ts
    │   ├── phase2-codegen.ts
    │   ├── phase3-intelligence.ts
    │   ├── phase4-validation.ts
    │   └── common.ts
    │
    ├── phase1-discovery/
    │   ├── index.ts
    │   ├── ScreenshotCapture.ts
    │   ├── VisualAnalyzer.ts
    │   ├── ComponentExtractor.ts
    │   ├── prompts/
    │   │   └── discoveryPrompt.ts
    │   └── __tests__/
    │
    ├── phase2-codegen/
    │   ├── index.ts
    │   ├── CssGenerator.ts
    │   ├── HtmlGenerator.ts
    │   ├── ComponentRenderer.ts
    │   ├── MatchValidator.ts
    │   ├── prompts/
    │   │   ├── cssPrompt.ts
    │   │   └── htmlPrompt.ts
    │   └── __tests__/
    │
    ├── phase3-intelligence/
    │   ├── index.ts
    │   ├── ContextBuilder.ts
    │   ├── SectionAnalyzer.ts
    │   ├── ComponentMatcher.ts
    │   ├── LayoutDecider.ts
    │   ├── prompts/
    │   │   ├── sectionAnalysisPrompt.ts
    │   │   └── componentMatchingPrompt.ts
    │   └── __tests__/
    │
    ├── phase4-validation/
    │   ├── index.ts
    │   ├── BrandMatchScorer.ts
    │   ├── DesignQualityScorer.ts
    │   ├── UxScorer.ts
    │   ├── WowFactorChecker.ts
    │   ├── prompts/
    │   │   └── qualityPrompt.ts
    │   └── __tests__/
    │
    ├── storage/
    │   ├── DiscoveryStore.ts
    │   ├── ComponentStore.ts
    │   ├── DecisionStore.ts
    │   └── ValidationStore.ts
    │
    └── config/
        ├── qualityThresholds.ts
        ├── defaultPrompts.ts
        └── componentDefaults.ts
```

---

## Module Pattern

Every module follows this interface:

```typescript
export class Module<TInput, TOutput> {
  constructor(config?: Partial<ModuleConfig>) { }

  // Run the module
  async run(input: TInput): Promise<TOutput>;

  // Run with custom prompt
  async runWithPrompt(input: TInput, prompt: string): Promise<TOutput>;

  // Get intermediate results
  getLastRawResponse(): string;

  // Validate output
  validateOutput(output: TOutput): ValidationResult;
}
```

---

## Storage Interface

```typescript
interface PipelineStorage {
  // Phase 1
  getDiscoveryOutput(brandId: string): DiscoveryOutput;
  updateDiscoveryOutput(brandId: string, changes: Partial<DiscoveryOutput>): void;

  // Phase 2
  getComponentLibrary(brandId: string): BrandComponent[];
  updateComponent(brandId: string, componentId: string, changes: Partial<BrandComponent>): void;
  addComponent(brandId: string, component: BrandComponent): void;
  removeComponent(brandId: string, componentId: string): void;

  // Phase 3
  getDesignDecisions(articleId: string): SectionDesignDecision[];
  updateDecision(articleId: string, sectionId: string, changes: Partial<SectionDesignDecision>): void;

  // Phase 4
  getValidationResults(articleId: string): ValidationOutput;

  // Export/Import
  exportPipelineState(brandId: string): PipelineState;
  importPipelineState(state: PipelineState): void;
}
```

---

## User Interface Requirements

### Component Gallery (Phase 1-2 Output)
- Grid of discovered components
- Each shows: source screenshot, generated preview, match score
- Actions: Adjust, Remove, Add Custom

### Section Designer (Phase 3 Output)
- List of article sections
- Each shows: AI decision, reasoning, live preview
- Actions: Accept, Change Component, Edit Layout

### Quality Dashboard (Phase 4 Output)
- Score gauges for each dimension
- Wow factor checklist with status
- Improvement suggestions
- Final approval button

### Prompt Editor
- Dropdown to select which prompt to edit
- Syntax-highlighted editor
- Save/Reset buttons

---

## Success Criteria

1. **Dynamic Discovery:** System discovers unique components per brand, not template-based
2. **Quality Code:** Generated CSS/HTML matches source with >85% fidelity
3. **Context-Aware:** Decisions based on full semantic context, not regex patterns
4. **User Control:** Every output inspectable and editable
5. **Wow Factor:** Final output passes quality checklist and scores >80% on all dimensions

---

## Implementation Priority

**P0 - Foundation:**
1. Interfaces and type definitions
2. Storage layer
3. Module base class

**P1 - Core Pipeline:**
4. Phase 1: Discovery module
5. Phase 2: CodeGen module
6. Phase 3: Intelligence module
7. Phase 4: Validation module

**P2 - User Interface:**
8. Component Gallery UI
9. Section Designer UI
10. Quality Dashboard UI
11. Prompt Editor UI

**P3 - Integration:**
12. Replace current rendering pipeline
13. Migration of existing brand extractions
14. Testing and refinement
