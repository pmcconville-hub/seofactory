# Design System Master Index

> **SINGLE SOURCE OF TRUTH** - This document is the authoritative entry point for all design system documentation. No other files describing this architecture should exist outside the canonical plan documents listed below.

## Canonical Plan Documents

| Document | Purpose | Status |
|----------|---------|--------|
| [AI Vision Brand Design System Implementation](./2026-01-25-ai-vision-brand-design-system-implementation.md) | Brand extraction, DesignDNA, BrandDesignSystem, compiledCss | Canonical |
| [Intelligent Layout Engine Implementation](./2026-01-26-intelligent-layout-engine-implementation.md) | Section analysis, semantic weights, layout planning, component selection | Canonical |
| [Brand Replication System](./2026-01-26-brand-replication-system.md) | Literal HTML/CSS extraction, no-template philosophy | Canonical |
| [AI Vision Brand Design System (Design)](./2026-01-25-ai-vision-brand-design-system.md) | Original design vision | Reference |
| [Intelligent Layout Engine (Design)](./2026-01-26-intelligent-layout-engine-design.md) | Original layout engine design | Reference |

---

## Core Architecture Principles

### 1. NO TEMPLATES - Literal Replication

The system **DOES NOT** use templates, presets, or "vibes". Instead:

```typescript
// WRONG - Template-based thinking
const template = selectTemplate("corporate-modern");
applyTemplate(content, template);

// CORRECT - Literal extraction and unique generation
const designDNA = await extractDesignDNA(targetUrl); // 150+ properties
const brandSystem = await generateBrandDesignSystem(designDNA); // Unique CSS
render(content, brandSystem.compiledCss); // Brand-specific output
```

### 2. DesignDNA - Complete Brand Fingerprint (150+ Properties)

The `DesignDNA` type captures the complete visual identity:

```typescript
interface DesignDNA {
  // Colors - Full palette with semantic roles
  colors: {
    primary: string[];      // Main brand colors
    secondary: string[];    // Supporting colors
    accent: string[];       // Call-to-action, highlights
    neutral: string[];      // Backgrounds, text
    semantic: { success, warning, error, info };
    gradients: GradientDefinition[];
  };

  // Typography - Complete type system
  typography: {
    headingFont: string;
    bodyFont: string;
    accentFont?: string;
    scale: number[];        // Type scale ratios
    weights: number[];      // Available weights
    lineHeights: Record<string, number>;
    letterSpacing: Record<string, string>;
  };

  // Spacing - Rhythm and whitespace
  spacing: {
    baseUnit: number;
    scale: number[];
    sectionPadding: string;
    componentGaps: string;
  };

  // Shapes - Visual geometry
  shapes: {
    borderRadius: string[];
    borderWidths: string[];
    shadowStyles: string[];
    clipPaths?: string[];
  };

  // Effects - Visual enhancements
  effects: {
    shadows: BoxShadow[];
    blurs: string[];
    overlays: string[];
    filters?: string[];
  };

  // Decorative - Brand embellishments
  decorative: {
    dividers: string[];
    patterns: string[];
    icons: IconStyle;
    illustrations?: string;
  };

  // Layout - Structural patterns
  layout: {
    maxWidth: string;
    gridColumns: number;
    containerStyle: 'full-bleed' | 'contained' | 'mixed';
    asymmetry: number;      // 0-1, how asymmetric
  };

  // Motion - Animation characteristics
  motion: {
    duration: string[];
    easing: string[];
    entranceStyle: string;
    hoverBehavior: string;
  };

  // Images - Visual content treatment
  images: {
    style: 'photography' | 'illustration' | 'mixed';
    treatment: string;      // filters, overlays
    aspectRatios: string[];
    placementPattern: string;
  };

  // Personality - Brand character (AI-detected)
  personality: {
    formality: number;      // 0-1
    energy: number;         // 0-1
    warmth: number;         // 0-1
    innovation: number;     // 0-1
    luxury: number;         // 0-1
  };
}
```

### 3. BrandDesignSystem - The Key Output

```typescript
interface BrandDesignSystem {
  // THE KEY FIX - AI-generated CSS unique to this brand
  compiledCss: string;

  // Component-specific styles
  componentStyles: {
    hero: ComponentStyle;
    section: ComponentStyle;
    card: ComponentStyle;
    quote: ComponentStyle;
    list: ComponentStyle;
    table: ComponentStyle;
    cta: ComponentStyle;
    // ... all semantic components
  };

  // Mapping semantic content types to visual treatments
  variantMappings: {
    'high-emphasis': VisualTreatment;
    'standard': VisualTreatment;
    'supporting': VisualTreatment;
  };

  // Source DNA for reference
  designDNA: DesignDNA;
}
```

### 4. Semantic Weight Calculation

Content sections receive visual emphasis based on their semantic importance:

```typescript
function calculateSemanticWeight(section: Section): number {
  let weight = 3; // Base weight (1-5 scale)

  // Adjust based on EAV category
  switch (section.eavCategory) {
    case 'UNIQUE': weight += 2; break;  // Max emphasis
    case 'RARE': weight += 1; break;     // High emphasis
    case 'ROOT': weight += 0.5; break;   // Standard+
    case 'COMMON': weight += 0; break;   // Standard
  }

  // Adjust based on content type
  if (section.hasKeyInsight) weight += 0.5;
  if (section.isConclusion) weight += 0.5;
  if (section.hasFeaturedSnippetPotential) weight += 1;

  return Math.min(5, Math.max(1, weight));
}
```

### 5. Featured Snippet (FS) Protection

CRITICAL: Never break format codes that enable Featured Snippets:

```typescript
// FS-Protected components MUST preserve structure
interface FSProtectedComponent {
  type: 'list' | 'table' | 'definition' | 'steps';
  // Structure is immutable - only styling changes
  preserveStructure: true;
  allowedModifications: ['colors', 'spacing', 'typography'];
  forbiddenModifications: ['nesting', 'order', 'hierarchy'];
}
```

---

## Layout Engine Pipeline

```
Content → SectionAnalyzer → LayoutPlanner → ComponentSelector → VisualEmphasizer → ImageHandler → LayoutEngine
              ↓                  ↓                  ↓                  ↓                ↓
        SectionAnalysis    LayoutParams     ComponentSelection   VisualEmphasis   ImagePlacement
              ↓                  ↓                  ↓                  ↓                ↓
         (semantic         (width,          (component +         (heading size,    (semantic
          weight,           columns,         brand fit,           padding,          placement,
          content type,     spacing)         alternatives)        background)       never between
          constraints)                                                              h2 and p1)
                                            ↓
                                    LayoutBlueprint
                                            ↓
                              BlueprintRenderer + compiledCss
                                            ↓
                                    Agency-Quality HTML
```

---

## What NOT To Do

These patterns were incorrectly implemented and must be removed:

| Anti-Pattern | Why It's Wrong | Correct Approach |
|--------------|----------------|------------------|
| "Vibe Selection" step | Implies templates | Extract actual brand DNA |
| Hardcoded fonts (Playfair + Inter) | Generic fallback | Use extracted typography |
| Template-based output | Cheap generic feel | Unique CSS per brand |
| Ignoring `compiledCss` | Missing the key fix | Always use `brandDesignSystem.compiledCss` |
| Color-only extraction | Incomplete brand capture | Full 150+ property DesignDNA |
| Ignoring semantic weights | Flat visual hierarchy | UNIQUE/RARE/ROOT weight calculation |
| Generic component selection | Template thinking | Content-type × brand-personality selection |

---

## Implementation Checklist

Before considering the design system complete, verify:

- [ ] `DesignDNA` captures 150+ properties from target site
- [ ] AI generates unique `compiledCss` per brand (no templates)
- [ ] `SectionAnalyzer` calculates semantic weight from EAV categories
- [ ] `ComponentSelector` uses two-factor selection (content × personality)
- [ ] `VisualEmphasizer` maps weight to visual properties
- [ ] `BlueprintRenderer` uses `brandDesignSystem.compiledCss`
- [ ] FS-protected components preserve structure
- [ ] No hardcoded fonts, colors, or spacing values
- [ ] Output fits target website aesthetic (agency-quality)
- [ ] No "Vibe Selection" or template selection UI

---

## File Locations

### Services
- `services/brand-extraction/` - Brand DNA extraction
- `services/design-analysis/` - Design analysis, brand discovery
- `services/layout-engine/` - Layout pipeline components
- `services/brand-composer/` - CSS generation, content matching

### Components
- `components/publishing/steps/BrandIntelligenceStep.tsx` - Brand extraction UI
- `components/publishing/steps/LayoutIntelligenceStep.tsx` - Layout preview UI
- `components/publishing/steps/PreviewStep.tsx` - Final preview

### Types
- `services/layout-engine/types.ts` - Layout engine types
- Type definitions in implementation plan documents

---

---

## Current Implementation Status (2026-01-28)

### What's Working Correctly

| Component | Status | Notes |
|-----------|--------|-------|
| `SectionAnalyzer.ts` | ✅ Correct | Uses UNIQUE/RARE/ROOT/COMMON weight calculation correctly |
| `BrandAwareComposer.ts` | ✅ Correct | Uses literal HTML/CSS from target site |
| `ContentMatcher.ts` | ✅ Correct | Matches content to extracted components |
| `LayoutEngine.ts` | ✅ Correct | Generates BlueprintSection with semantic weights |
| `StylePublishModal.tsx` | ✅ Correct | Passes DesignDNA and BrandDesignSystem to renderers |

### Critical Issues (Fixed/Remaining)

| Issue | Severity | Location | Status |
|-------|----------|----------|--------|
| **CleanArticleRenderer ignores compiledCss** | CRITICAL | `CleanArticleRenderer.ts` | ✅ FIXED 2026-01-28 |
| **CleanArticleRenderer doesn't receive compiledCss** | CRITICAL | `renderer/index.ts` | ✅ FIXED 2026-01-28 |
| **Component selection not used in HTML generation** | CRITICAL | `CleanArticleRenderer.ts` | ✅ FIXED 2026-01-28 |
| **No visual component variety (wow factor)** | CRITICAL | N/A | ✅ FIXED 2026-01-28 |
| **Layout width/spacing from LayoutPlanner not applied** | MEDIUM | `CleanArticleRenderer.ts` | ✅ FIXED 2026-01-28 |

### Remediation Priority

1. **Phase 1: Use compiledCss (THE KEY FIX)** ✅ COMPLETE
   - ✅ Modified `CleanArticleRenderer` to accept `compiledCss` as optional parameter
   - ✅ When `compiledCss` is provided, use it directly instead of generating CSS
   - ✅ Modified `renderContent()` to pass `brandDesignSystem.compiledCss` to CleanArticleRenderer
   - ✅ Added supplementary CSS for our semantic HTML structures to work with brand CSS

2. **Phase 2: Apply Layout Parameters** ✅ COMPLETE
   - ✅ Created `ComponentRenderer.ts` with layout-aware section rendering
   - ✅ Apply `BlueprintSection.layout.width` via CSS classes and inline styles
   - ✅ Apply `BlueprintSection.layout.columns` (1-col, 2-col, 3-col, asymmetric)
   - ✅ Apply `BlueprintSection.layout.spacing` (tight, normal, generous, dramatic)

3. **Phase 3: Use Component Selection** ✅ COMPLETE
   - ✅ Created `ComponentRenderer.ts` with 16 component-specific HTML generators
   - ✅ Map `component.primaryComponent` to visually distinct HTML structures
   - ✅ Use `componentVariant` for variations within component type
   - ✅ Created `ComponentStyles.ts` with agency-quality CSS for all components

### Components Now Available

| Component | Visual Treatment | Use Case |
|-----------|------------------|----------|
| `hero` | Full-width gradient, large text | Opening sections with high impact |
| `feature-grid` | Multi-column icon cards | Benefits, features, capabilities |
| `timeline` | Vertical connected nodes | Processes, history, sequences |
| `step-list` | Numbered step indicators | How-to, tutorials, guides |
| `faq-accordion` | Q/A with toggles | FAQ sections |
| `comparison-table` | Styled table with headers | Comparisons, specifications |
| `testimonial-card` | Quote with attribution | Social proof, testimonials |
| `key-takeaways` | Highlighted summary box | Conclusions, summaries |
| `cta-banner` | Gradient banner with buttons | Call-to-action |
| `stat-highlight` | Large numbers with labels | Statistics, metrics |
| `checklist` | Check icons | Requirements, checklists |
| `blockquote` | Styled quote | Pull quotes |
| `definition-box` | Icon + definition | Definitions, terms |
| `card` | Elevated container | General content |
| `prose` | Standard paragraphs | Default text content |

### Implementation Reference

The design system has been implemented in:

**compiledCss Integration (Phase 1):**
- `services/publishing/renderer/CleanArticleRenderer.ts` - Constructor accepts `compiledCss`, `generateCSS()` uses it when available
- `services/publishing/renderer/index.ts` - Passes `brandDesignSystem.compiledCss` to `renderCleanArticle()`

**Component Rendering System (Phase 2 & 3):**
- `services/publishing/renderer/ComponentRenderer.ts` - 16 component-specific HTML generators with emphasis and layout support
- `services/publishing/renderer/ComponentStyles.ts` - Agency-quality CSS for all components with responsive breakpoints
- `CleanArticleRenderer.buildSection()` - Routes to ComponentRenderer when BlueprintSection is available

---

## Version History

| Date | Change | Author |
|------|--------|--------|
| 2026-01-28 | **COMPONENT SYSTEM**: Created ComponentRenderer (16 components) + ComponentStyles for agency-quality visuals | Claude Code |
| 2026-01-28 | **KEY FIX IMPLEMENTED**: CleanArticleRenderer now uses compiledCss from BrandDesignSystem | Claude Code |
| 2026-01-28 | Added implementation status analysis, identified critical fixes | Claude Code |
| 2026-01-28 | Created master index, deleted incorrect DESIGN_SYSTEM_ORCHESTRATION.md | Claude Code |
| 2026-01-26 | Layout Engine implementation plan | - |
| 2026-01-25 | AI Vision Brand Design System implementation plan | - |
