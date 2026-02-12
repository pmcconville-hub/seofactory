# Brand Styleguide Generator — Design Document

**Date:** 2026-02-12
**Status:** Approved for implementation
**Scope:** New service module for generating CMS-agnostic CSS design system styleguides

---

## 1. Problem Statement

The application's current brand extraction pipeline (`BrandDesignSystemGenerator`) produces abstract, low-quality CSS that doesn't match the source brand. Root causes:

1. **Lossy extraction** — AI vision sees a screenshot and returns abstract descriptors (`personality: "corporate"`) instead of actual CSS values
2. **Fragmented generation** — 12+ independent AI calls produce component CSS in isolation with no shared design language
3. **No color scales** — Only 3 derived colors (primary, light, dark) vs the 30+ needed for a professional design system
4. **No structural components** — Missing section backgrounds, compositions, responsive utilities, class architecture

**Reference quality:** See `tmp/styleguide/bm-daktotaal-styleguide-v3.html` (350KB, 27 sections, full color scales, composable classes, inline demos)

**Developer briefing:** See `tmp/styleguide/styleguide-developer-briefing.md` (48-section specification with extraction, generation, and validation phases)

---

## 2. Solution Overview

A new `services/styleguide-generator/` module that:

1. **Extracts actual CSS values** from the target website (not abstract descriptors)
2. **Generates full 50-900 color scales** deterministically from extracted brand colors
3. **Produces a self-contained HTML styleguide** (~200-400KB, 48 sections) with inline-styled visual demos, copyable CSS classes, and implementation tips
4. **Stores structured `DesignTokenSet`** at the topical map level as single source of truth for all brand consumers (article renderer, audit system, layout engine)

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Output format | Standalone HTML document | Self-contained, CMS-agnostic, downloadable |
| CMS specificity | CMS-agnostic (no Elementor branding) | Universal CSS design system |
| Data level | Topical Map | Each map has its own domain/language; one project can have multiple brands |
| Extraction | Apify Playwright with HTTP fetch + AI vision fallback | Best quality when available, accessible without paid services |
| Color scales | Deterministic 50-900 from hex (HSL interpolation) | Consistent, no AI variance, perceptually even steps |
| Section generation | Hybrid: template for structure + AI for complex CSS | Consistent structure, brand-specific styling |
| AI batching | 4 batches (not 12+ individual calls) | Cohesive cross-component design language |
| Architecture | New service module, separate from existing BrandDesignSystem | Clean separation, no risk to existing pipeline |

---

## 3. Architecture

### 3.1 Module Structure

```
services/styleguide-generator/
├── StyleguideOrchestrator.ts      ← Main entry point, coordinates pipeline
├── extraction/
│   ├── SiteExtractor.ts           ← Facade: chooses Apify or HTTP path
│   ├── ApifyExtractor.ts          ← Apify Playwright DOM crawling
│   ├── HttpExtractor.ts           ← Jina/Firecrawl/direct fetch fallback
│   └── ExtractionAnalyzer.ts      ← Normalizes extraction data → BrandAnalysis
├── tokens/
│   ├── ColorScaleGenerator.ts     ← Deterministic 50-900 scale from any hex
│   ├── TokenSetBuilder.ts         ← Assembles full DesignTokenSet from BrandAnalysis
│   └── PrefixGenerator.ts         ← Derives 2-4 letter CSS prefix from brand name
├── sections/
│   ├── SectionRegistry.ts         ← Maps section IDs → generators
│   ├── BaseSectionTemplate.ts     ← Shared HTML structure for all sections
│   ├── templates/                 ← Deterministic sections (Category 1)
│   │   ├── colorPalette.ts
│   │   ├── typography.ts
│   │   ├── sectionBackgrounds.ts
│   │   ├── images.ts
│   │   ├── badges.ts
│   │   ├── dividers.ts
│   │   ├── breadcrumbs.ts
│   │   ├── animations.ts
│   │   ├── hoverEffects.ts
│   │   ├── responsiveUtils.ts
│   │   ├── formStates.ts
│   │   ├── skeletonLoading.ts
│   │   ├── accessibility.ts
│   │   ├── globalSettings.ts
│   │   ├── completeStylesheet.ts
│   │   ├── quickReference.ts
│   │   └── versionChangelog.ts
│   └── ai-batches/                ← AI-enhanced sections (Categories 2+3)
│       ├── batchA-core.ts         ← Buttons, cards, lists, icon boxes, forms, tables
│       ├── batchB-content.ts      ← Reviews, CTA, hero, alerts, steps, pricing, FAQ, stats
│       ├── batchC-site.ts         ← Header, footer, floating, blog, pagination, typography, gallery, slider, maps, logos, special pages
│       └── batchD-guidelines.ts   ← Compositions, icons, image guidelines, schema, tone of voice
├── assembly/
│   ├── DocumentAssembler.ts       ← Combines sections → final HTML
│   ├── NavigationBuilder.ts       ← Generates sticky nav from section metadata
│   └── QualityValidator.ts        ← Post-generation validation checks
├── storage/
│   └── StyleguideStorage.ts       ← Supabase Storage upload/download
└── types.ts                       ← Module types
```

### 3.2 Pipeline Flow

```
URL Input
    │
    ▼
┌─────────────────────────┐
│ 1. EXTRACT              │  SiteExtractor (Apify → HTTP fallback)
│    Homepage + 2-3 pages │  Produces: raw HTML, CSS sheets, screenshot
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ 2. ANALYZE              │  ExtractionAnalyzer
│    Parse HTML + CSS      │  Produces: BrandAnalysis (exact colors, fonts,
│    AI vision (if needed) │  spacing, shapes, components, personality)
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ 3. GENERATE TOKENS      │  ColorScaleGenerator + TokenSetBuilder
│    50-900 color scales   │  Produces: DesignTokenSet (30+ colors,
│    Typography scale      │  typography hierarchy, spacing, shadows)
│    Spacing / Radius      │  100% deterministic — no AI
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ 4. BUILD SECTIONS       │  SectionRegistry
│    17 template sections  │  Category 1: instant token injection
│    26 AI-enhanced        │  Category 2: 3 batched AI calls
│    5 AI-generated        │  Category 3: 1 batched AI call
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ 5. ASSEMBLE             │  DocumentAssembler
│    <head> + nav + body   │  Combines all 48 sections into single HTML
│    + stylesheet + footer │  Target: 200-400KB, 3500-5000 lines
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ 6. VALIDATE             │  QualityValidator
│    Structural checks     │  div balance, section count, file size
│    Content checks        │  class count, prefix consistency
│    Visual checks         │  demos present, code blocks exist
│    Score: 0-100          │  Auto-repair if score < 80
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ 7. STORE                │  StyleguideStorage
│    HTML → Supabase       │  Storage bucket: 'styleguides'
│    Tokens → map record   │  DesignTokenSet on topical_maps row
└─────────────────────────┘
```

---

## 4. Data Model

### 4.1 BrandAnalysis (extraction output)

```typescript
interface BrandAnalysis {
  // Identity
  brandName: string;
  domain: string;
  tagline?: string;
  industry?: string;

  // Exact values extracted from CSS / DOM
  colors: {
    primary: string;            // hex, from actual CSS
    secondary?: string;
    accent?: string;
    textDark: string;           // heading color
    textBody: string;           // body text color
    backgroundLight: string;
    backgroundDark: string;
    allExtracted: Array<{
      hex: string;
      usage: string;
      frequency: number;        // how often it appears in CSS
    }>;
  };

  typography: {
    headingFont: { family: string; weights: number[]; googleFontsUrl?: string };
    bodyFont: { family: string; weights: number[]; googleFontsUrl?: string };
    sizes: Record<'h1'|'h2'|'h3'|'h4'|'h5'|'h6'|'body'|'small', string>;
    lineHeights: { heading: number; body: number };
    letterSpacing: Record<'h1'|'h2'|'h3'|'body', string>;
  };

  spacing: {
    sectionPadding: { desktop: string; mobile: string };
    cardPadding: string;
    containerMaxWidth: string;
    gaps: string[];
  };

  shapes: {
    buttonRadius: string;
    cardRadius: string;
    imageRadius: string;
    inputRadius: string;
    shadows: { card: string; button: string; elevated: string };
  };

  // Components found on the site
  components: Array<{
    type: string;  // hero, cards, testimonials, faq, cta, form, pricing, etc.
    variant: string;
    extractedCss?: string;
    screenshotBase64?: string;
  }>;

  // AI-assessed personality
  personality: {
    overall: string;
    formality: number;   // 1-5
    energy: number;      // 1-5
    warmth: number;      // 1-5
    toneOfVoice: string; // e.g., "professional but approachable, uses 'you'"
  };

  // Metadata
  extractionMethod: 'apify' | 'http-fetch';
  confidence: number;
  screenshotBase64?: string;
  pagesAnalyzed: string[];
}
```

### 4.2 DesignTokenSet (single source of truth)

```typescript
interface ColorScale {
  50: string; 100: string; 200: string; 300: string; 400: string;
  500: string; 600: string; 700: string; 800: string; 900: string;
}

interface DesignTokenSet {
  prefix: string;  // e.g., "bm" derived from brand name

  colors: {
    primary: ColorScale;
    secondary?: ColorScale;
    accent?: ColorScale;
    gray: ColorScale;               // brand-warmth-tinted
    semantic: {
      success: string;
      error: string;
      warning: string;
      info: string;
      whatsapp: string;             // #25D366 (fixed)
    };
  };

  typography: {
    headingFont: string;             // "'Montserrat', sans-serif"
    bodyFont: string;                // "'Open Sans', sans-serif"
    googleFontsUrl: string;
    sizes: Record<'h1'|'h2'|'h3'|'h4'|'h5'|'h6'|'body'|'small'|'label'|'caption', {
      size: string;
      weight: number;
      lineHeight: number;
      letterSpacing: string;
    }>;
  };

  spacing: {
    xs: string; sm: string; md: string; lg: string; xl: string;
    '2xl': string; '3xl': string; '4xl': string;
  };

  radius: {
    sm: string; md: string; lg: string; xl: string; '2xl': string; full: string;
  };

  shadows: {
    sm: string; md: string; lg: string; xl: string;
    colored: string;       // primary-tinted shadow
    coloredLg: string;
    red: string;           // emergency/error shadow
    inner: string;
  };

  transitions: { fast: string; base: string; slow: string };

  containers: { sm: string; md: string; lg: string; xl: string; '2xl': string };

  zIndex: {
    base: number; dropdown: number; sticky: number;
    overlay: number; modal: number; toast: number;
  };
}
```

### 4.3 Map-Level Storage

```typescript
// Addition to TopicalMap interface
interface TopicalMap {
  // ... existing fields ...

  brand_styleguide?: {
    designTokens: DesignTokenSet;          // Structured — used by renderer, audit, layout engine
    brandAnalysis: BrandAnalysis;          // Cached extraction — for regeneration
    htmlStorageKey: string;                // Supabase Storage key for HTML document
    generatedAt: string;
    version: number;
  };
}
```

Database: New column `brand_styleguide JSONB` on `topical_maps` table (for tokens + analysis).
Storage: HTML document in Supabase Storage bucket `styleguides` at path `{mapId}/styleguide-v{version}.html`.

---

## 5. Extraction Pipeline

### 5.1 Path Selection

```typescript
// SiteExtractor.ts
async function extractSite(
  domain: string,
  businessInfo: BusinessInfo
): Promise<RawSiteData> {
  // Path 1: Apify (if token available)
  if (businessInfo.apifyToken) {
    return new ApifyExtractor(businessInfo.apifyToken).extract(domain);
  }

  // Path 2: HTTP fetch (Jina → Firecrawl → direct fetch)
  return new HttpExtractor(businessInfo).extract(domain);
}
```

### 5.2 Apify Path (preferred)

Uses existing `StyleGuideExtractor.ts` infrastructure:
- Playwright scraper captures DOM elements with computed CSS
- Multi-page crawl: homepage + 2-3 discovered subpages
- Element categories: typography, buttons, cards, navigation, forms, tables, images, backgrounds
- Returns computed CSS per element (actual browser-rendered values)

### 5.3 HTTP Fetch Path (fallback)

1. **Fetch HTML** via Jina Reader API (`services/jinaService.ts` — already configured)
2. **Extract `<link>` stylesheet URLs** from HTML `<head>`
3. **Fetch each stylesheet** and parse with regex/rules for:
   - Color hex values (from properties like `color`, `background-color`, `border-color`)
   - Font-family declarations
   - Font-size values
   - Spacing values (padding, margin, gap)
   - Border-radius values
   - Box-shadow definitions
4. **AI vision analysis** (existing `AIDesignAnalyzer.ts`) for:
   - Screenshot capture and personality assessment
   - Component inventory (what UI patterns exist)
   - Layout pattern detection
   - Tone of voice assessment

### 5.4 ExtractionAnalyzer

Normalizes both paths into `BrandAnalysis`:
- Deduplicates extracted colors, ranks by frequency
- Identifies primary/secondary/accent by usage context (buttons = primary, headers = secondary, etc.)
- Resolves Google Fonts URLs from `<link>` tags
- Maps font sizes to heading levels by comparing to page hierarchy
- Extracts brand name from `<title>`, `<meta>`, or `<h1>`

---

## 6. Color Scale Generation

### 6.1 Algorithm

Deterministic, no AI. Uses HSL interpolation for perceptually even steps:

```typescript
function generateColorScale(brandHex: string): ColorScale {
  const hsl = hexToHSL(brandHex);

  return {
    50:  hslToHex(hsl.h, Math.max(hsl.s * 0.3, 5),  97),    // very light bg
    100: hslToHex(hsl.h, Math.max(hsl.s * 0.4, 8),  93),    // hover bg
    200: hslToHex(hsl.h, Math.max(hsl.s * 0.5, 12), 85),    // borders
    300: hslToHex(hsl.h, Math.max(hsl.s * 0.7, 18), 72),    // medium light
    400: brandHex,                                             // ★ THE BRAND COLOR
    500: hslToHex(hsl.h, hsl.s * 1.05, hsl.l * 0.85),       // hover dark
    600: hslToHex(hsl.h, hsl.s * 1.1,  hsl.l * 0.72),       // active
    700: hslToHex(hsl.h, hsl.s * 1.1,  hsl.l * 0.55),       // text on light
    800: hslToHex(hsl.h, hsl.s * 1.05, hsl.l * 0.38),       // very dark
    900: hslToHex(hsl.h, hsl.s * 0.95, hsl.l * 0.22),       // near-black
  };
}
```

### 6.2 Gray Scale with Brand Warmth

```typescript
function generateGrayScale(primaryHex: string): ColorScale {
  const hue = getHue(primaryHex);
  const isWarm = (hue >= 0 && hue <= 60) || hue >= 300;
  const isCool = hue >= 180 && hue <= 270;
  const tintHue = isWarm ? 30 : isCool ? 220 : 0;
  const tintSaturation = 3;  // very subtle

  return {
    50:  hslToHex(tintHue, tintSaturation, 98),
    100: hslToHex(tintHue, tintSaturation, 96),
    200: hslToHex(tintHue, tintSaturation, 91),
    300: hslToHex(tintHue, tintSaturation, 82),
    400: hslToHex(tintHue, tintSaturation, 64),
    500: hslToHex(tintHue, tintSaturation, 45),
    600: hslToHex(tintHue, tintSaturation, 32),
    700: hslToHex(tintHue, tintSaturation, 25),
    800: hslToHex(tintHue, tintSaturation, 17),
    900: hslToHex(tintHue, tintSaturation, 10),
  };
}
```

### 6.3 Semantic Color Conflict Detection

```typescript
function generateSemanticColors(primaryHex: string): SemanticColors {
  const primaryHue = getHue(primaryHex);
  return {
    success: isGreenish(primaryHue) ? '#0d9488' : '#10b981',
    error: '#dc2626',
    warning: '#f59e0b',
    info: isBlueish(primaryHue) ? '#6366f1' : '#3b82f6',
    whatsapp: '#25D366',
  };
}
```

---

## 7. Section Generation

### 7.1 Section Categories

**Category 1 — Pure Template (17 sections)**
Deterministic: token values injected into HTML templates. No AI.

| # | Section |
|---|---------|
| 1 | Color Palette |
| 2 | Typography |
| 3 | Section Backgrounds |
| 6 | Images |
| 8 | Badges & Tags |
| 15 | Dividers |
| 20 | Breadcrumbs |
| 22 | Animations |
| 23 | Hover Effects |
| 24 | Responsive Utilities |
| 37 | Form & Button States |
| 38 | Skeleton Loading |
| 42 | Accessibility |
| 45 | Global Settings |
| 46 | Complete Stylesheet |
| 47 | Quick Reference Table |
| 48 | Version & Changelog |

**Category 2 — Template + AI CSS (26 sections)**
Fixed HTML structure, AI generates brand-specific CSS code blocks and demos.

| # | Section | AI Batch |
|---|---------|----------|
| 4 | Buttons | A |
| 5 | Cards | A |
| 7 | Lists | A |
| 9 | Icon Boxes | A |
| 10 | Forms | A |
| 11 | Tables | A |
| 12 | Reviews | B |
| 13 | CTA Blocks | B |
| 14 | Hero Sections | B |
| 16 | Alerts | B |
| 17 | Process Steps | B |
| 18 | Pricing Cards | B |
| 19 | FAQ/Accordion | B |
| 21 | Stats & Counters | B |
| 26 | Header & Navigation | C |
| 27 | Footer | C |
| 28 | Floating Elements | C |
| 29 | Blog Components | C |
| 30 | Pagination & TOC | C |
| 31 | Content Typography | C |
| 32 | Video Embed | C |
| 33 | Gallery | C |
| 34 | Slider/Carousel | C |
| 35 | Maps | C |
| 36 | Partner Logos | C |
| 41 | Special Page Templates | C |

**Category 3 — Fully AI-Generated (5 sections)**

| # | Section | AI Batch |
|---|---------|----------|
| 25 | Page Compositions | D |
| 39 | Icon Library | D |
| 40 | Image Guidelines | D |
| 43 | Schema Markup Patterns | D |
| 44 | Tone of Voice & Content Guidelines | D |

### 7.2 AI Batch Strategy

4 batched AI calls instead of 26+ individual calls:

- **Batch A** (core components): sections 4, 5, 7, 9, 10, 11
- **Batch B** (content blocks): sections 12, 13, 14, 16, 17, 18, 19, 21
- **Batch C** (site components): sections 26-36, 41
- **Batch D** (guidelines): sections 25, 39, 40, 43, 44

Each batch receives:
- Full `DesignTokenSet` (all color scales, typography, spacing)
- `BrandAnalysis` summary (personality, industry, components found)
- Screenshot base64 (if available)
- Section templates showing expected output structure
- CSS class naming convention with the brand prefix

This ensures cross-component cohesion within each batch. Between batches, the output from earlier batches is NOT passed forward (to stay within context limits), but the shared token set ensures consistency.

### 7.3 Section Template Structure

Every section follows this HTML pattern (from the developer briefing):

```html
<div class="sg-section" id="section-{nr}">
    <h2 class="sg-section-title">{nr}. {Title}</h2>
    <p class="sg-description">{When to use, what it is}</p>

    <!-- Implementation tip (CMS-agnostic) -->
    <div class="sg-tip">
        <strong>Implementation:</strong> {How to use these classes in any CMS or codebase}
    </div>

    <!-- Visual demo with INLINE styles (standalone) -->
    <div class="sg-demo">
        {Inline-styled visual examples}
    </div>

    <!-- CSS class reference -->
    <div class="sg-class-ref">
        <code>.{prefix}-{component-name}</code>
    </div>

    <!-- Copyable CSS code block -->
    <div class="sg-code">
        <pre><code>{Full CSS for this component}</code></pre>
    </div>

    <!-- Optional warning -->
    <div class="sg-warning">
        <strong>Note:</strong> {Important caveat}
    </div>
</div>
```

---

## 8. Document Assembly

### 8.1 Assembly Steps

1. **Build `<head>`**: Google Fonts `<link>`, Font Awesome CDN, `<style>` block with:
   - CSS custom properties (`:root { --{prefix}-* }`)
   - Styleguide page layout CSS (sg-header, sg-nav, sg-section, etc.)
   - All generated component CSS classes (the actual deliverable)

2. **Build header**: Brand name, "CSS Design System" title, version badge, stats summary

3. **Build navigation**: Sticky nav bar with one link per section, separator dividers between category groups

4. **Build body**: All 48 sections concatenated in order

5. **Build footer**: Generation metadata, source URL, version, closing HTML tags

### 8.2 CSS Class Naming Convention

```
.{prefix}-{category}-{variant}

Categories:
  btn-*        → buttons
  card-*       → cards
  section-*    → section backgrounds & layouts
  img-*        → image treatments
  list-*       → lists
  icon-box-*   → icon box variants
  hover-*      → hover effects (composable)
  text-*       → text utilities
  hide-*       → responsive visibility
  anim-*       → animations
  divider-*    → dividers
  alert-*      → notifications
  step-*       → process steps
  price-*      → pricing cards
  faq-*        → FAQ/accordion
  stat-*       → statistics
  breadcrumb   → breadcrumbs
  header       → header components
  footer       → footer
  float-*      → floating elements
  post-*       → blog components
  toc          → table of contents
  video        → video embeds
  gallery-*    → gallery
  carousel-*   → slider/carousel
  map          → maps
  logo-bar     → partner logos
  form-*       → form states
  skeleton     → loading states
  skip-link    → accessibility
```

Classes are **composable**: `<div class="{prefix}-card {prefix}-hover-lift {prefix}-anim-fade-up">`

### 8.3 Prefix Generation

Derived from brand name: first letters of significant words, 2-4 chars, lowercase.

| Brand | Prefix |
|-------|--------|
| B&M Dak-Totaal | `bm-` |
| Resultaatmakers | `rm-` |
| GreenPaints | `gp-` |
| ILG Food Group | `ilg-` |

---

## 9. Quality Validation

### 9.1 Automated Checks

```typescript
interface QualityReport {
  structural: {
    divBalance: { open: number; close: number; passed: boolean };
    sectionCount: { found: number; expected: 48; passed: boolean };
    fileSizeKB: number;       // target: 200-400
    lineCount: number;        // target: 3500-5000
    emptySections: string[];  // sections with no demo content
  };

  content: {
    uniqueClassCount: number;        // target: 150-250
    prefixConsistency: boolean;      // all classes use correct prefix
    noCrossContamination: string[];  // no classes from other brands
    brandNameCorrect: boolean;       // brand name spelled consistently
    colorsMatch: boolean;            // hex values in demos match tokens
  };

  visual: {
    hasColorSwatches: boolean;
    hasButtonDemos: boolean;
    hasCardDemos: boolean;
    hasTypographyHierarchy: boolean;
    hasCodeBlocks: boolean;
    hasNavigationLinks: boolean;
  };

  overallScore: number;  // 0-100
  issues: string[];
}
```

### 9.2 Auto-Repair

If `overallScore < 80`:
1. Identify failed sections (empty demos, broken HTML)
2. Re-generate only the failed batch
3. Re-assemble
4. Re-validate
5. Max 1 retry attempt

---

## 10. UI Integration

### 10.1 Placement

**Primary:** Map Dashboard — "Brand Styleguide" section (secondary, optional, skippable)
**Secondary:** Publishing wizard Brand Intelligence step — link to dashboard tool

The styleguide is a **late-stage deliverable**, not a prerequisite. Core flow (Map → Briefs → Content) works without it.

### 10.2 UI Components

```
components/styleguide/
├── StyleguidePanel.tsx              ← Dashboard panel (status, actions)
├── StyleguideGenerateButton.tsx     ← Trigger with progress state
├── StyleguideProgressTracker.tsx    ← Shows 48-section progress
├── StyleguidePreviewModal.tsx       ← Preview + download modal
└── StyleguideStatusBadge.tsx        ← "Generated" / "Not generated" badge
```

### 10.3 Dashboard Panel

```
Brand Styleguide
├── Status: "Not generated" / "Generated on 2026-02-12 (v1)"
├── Source: benmdaktotaal.nl
├── [Generate Styleguide] button
│   └── Shows StyleguideProgressTracker during generation
├── [Preview] → opens in new tab or modal
├── [Download HTML]
└── [Regenerate] (if already generated)
```

### 10.4 Progress Tracker

```
Generating Styleguide for benmdaktotaal.nl
[===========----------] 23/48 sections

✓ Phase 1: Extracting site data
✓ Phase 2: Analyzing brand
✓ Phase 3: Building color scales
◐ Phase 4: Generating component CSS (Batch B: 5/8 sections)
○ Phase 5: Building template sections
○ Phase 6: Assembling document
○ Phase 7: Validating quality
```

---

## 11. Integration with Existing Systems

### 11.1 DesignTokenSet as Single Source of Truth

Once generated, `map.brand_styleguide.designTokens` is accessible to all brand consumers:

| Consumer | What it uses | Current source | New source |
|----------|-------------|----------------|------------|
| Blueprint Renderer | CSS for articles | `BrandDesignSystem.compiledCss` | `designTokens` (richer) |
| Layout Engine | Shadows, spacing, emphasis | `BrandDesignSystem.componentStyles` | `designTokens` |
| Content Generation Pass 4 | Personality for alt text tone | `DesignDNA.personality` | `brandAnalysis.personality` |
| Unified Audit | Visual consistency checks | N/A | `designTokens.colors`, `designTokens.typography` |

### 11.2 Migration Strategy

The existing `BrandDesignSystem` pipeline continues to work as-is. The new styleguide generator is additive:
- No breaking changes to existing code
- If both exist, the renderer can prefer `DesignTokenSet` (richer data)
- Future: refactor `BrandDesignSystemGenerator` to consume `DesignTokenSet` instead of `DesignDNA`

---

## 12. Database Changes

### 12.1 Migration

```sql
-- Add brand_styleguide column to topical_maps
ALTER TABLE topical_maps
ADD COLUMN brand_styleguide JSONB DEFAULT NULL;

-- Create storage bucket for styleguide HTML files
INSERT INTO storage.buckets (id, name, public)
VALUES ('styleguides', 'styleguides', false);

-- RLS policy: users can access their own project's styleguides
CREATE POLICY "Users can access own styleguides"
ON storage.objects FOR ALL
USING (
  bucket_id = 'styleguides'
  AND (storage.foldername(name))[1] IN (
    SELECT tm.id::text FROM topical_maps tm
    JOIN projects p ON tm.project_id = p.id
    WHERE p.user_id = auth.uid()
  )
);
```

---

## 13. Cost Estimate

Per styleguide generation:

| Step | AI Calls | Est. Tokens | Cost (Gemini Flash) |
|------|----------|-------------|---------------------|
| Extraction (HTTP path) | 1 (AI vision) | ~4K in / ~2K out | ~$0.002 |
| Batch A (core components) | 1 | ~3K in / ~8K out | ~$0.003 |
| Batch B (content blocks) | 1 | ~3K in / ~10K out | ~$0.004 |
| Batch C (site components) | 1 | ~3K in / ~12K out | ~$0.005 |
| Batch D (guidelines) | 1 | ~3K in / ~6K out | ~$0.003 |
| **Total** | **5** | **~50K** | **~$0.02** |

With Apify extraction: add ~$0.05 for Playwright actor run.
Total per styleguide: **$0.02-0.07** — negligible.

---

## 14. Implementation Order

### Phase 1: Foundation (tokens + templates)
1. `ColorScaleGenerator.ts` + tests
2. `TokenSetBuilder.ts` + `PrefixGenerator.ts`
3. Category 1 template sections (17 sections)
4. `DocumentAssembler.ts` (produces valid HTML from templates alone)
5. `QualityValidator.ts`

**Milestone:** Can generate a structural styleguide with correct colors, typography, and token sections — no AI needed.

### Phase 2: Extraction
6. `HttpExtractor.ts` (Jina/direct fetch + CSS parsing)
7. `ExtractionAnalyzer.ts`
8. `ApifyExtractor.ts` (wraps existing `StyleGuideExtractor`)
9. `SiteExtractor.ts` (facade with fallback)

**Milestone:** Can extract brand data from any URL.

### Phase 3: AI-Enhanced Sections
10. AI batch prompts (batchA through batchD)
11. Integration with section templates
12. Auto-repair on validation failure

**Milestone:** Full 48-section styleguide generation.

### Phase 4: UI + Storage
13. Database migration
14. Supabase Storage integration
15. `StyleguidePanel.tsx` + dashboard integration
16. Progress tracking UI
17. Preview/download functionality

**Milestone:** End-to-end user-facing feature.

### Phase 5: Integration
18. Wire `DesignTokenSet` into blueprint renderer (optional preference over `BrandDesignSystem`)
19. Wire into audit system for visual consistency checks

**Milestone:** Styleguide tokens improve article rendering quality.
