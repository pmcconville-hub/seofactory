# STATUS: Style Guide / Brand Intelligence System

> Last updated: 2026-02-13

---

## 1. System Overview

The Style Guide / Brand Intelligence system is a multi-pipeline architecture for extracting, analyzing, and applying brand design data from external websites. It spans four major service modules, three edge functions, multiple database subsystems, and two UI entry points.

**Three Parallel Extraction Pipelines:**

| Pipeline | Name | Method | Speed | Quality | Current Status |
|----------|------|--------|-------|---------|----------------|
| A | Styleguide Generator | HTTP fetch via CORS proxy | ~5s | Medium | **Active, default** |
| B | AI Vision (Design DNA) | Screenshots + Gemini/Claude vision | ~30s | High | **Active, requires screenshots** |
| C | DOM Extraction | Apify Playwright scraper | ~2-4 min | Highest | **Active, requires Apify token** |

---

## 2. Architecture

### 2.1 Service Modules

| Module | Directory | Role |
|--------|-----------|------|
| **Styleguide Generator** | `services/styleguide-generator/` | 48-section HTML style guide generation (17 templates + 4 AI batches) |
| **Design Analysis** | `services/design-analysis/` | AI vision-based Design DNA extraction (180+ fields), CSS generation, brand discovery |
| **Layout Engine** | `services/layout-engine/` | Semantic weight analysis, component selection, visual emphasis mapping |
| **Premium Design** | `services/premium-design/` | Orchestrates full design pipeline with fallback chains |

### 2.2 Edge Functions (Supabase)

| Function | File | Role |
|----------|------|------|
| `brand-discovery` | `supabase/functions/brand-discovery/` | Phase 1: AI vision analysis of brand screenshots |
| `brand-extract-pages` | `supabase/functions/brand-extract-pages/` | Phase 2: Multi-page HTML/CSS extraction |
| `brand-url-discovery` | `supabase/functions/brand-url-discovery/` | Lightweight page discovery (~15-20s, no element extraction) |

### 2.3 Design Pipeline Flow

```
Brand Website
    |
    v
[Extraction] ─── Apify (DOM) / HTTP (Jina/Firecrawl) / AI Vision (Screenshots)
    |
    v
[Analysis] ─── DesignDNA (180+ fields) + BrandAnalysis
    |
    v
[Token Generation] ─── ColorScaleGenerator (HSL 50-900) + TokenSetBuilder
    |
    v
[Section Generation] ─── 17 deterministic templates + 4 AI-enhanced batches
    |
    v
[Assembly] ─── DocumentAssembler + NavigationBuilder → Standalone HTML (200-400KB)
    |
    v
[Validation] ─── QualityValidator + DesignQualityValidator
    |
    v
[Storage] ─── Supabase Storage bucket + JSONB columns
```

### 2.4 Design System Flow (for article rendering)

```
DesignDNA (180+ fields)
    |
    v
BrandDesignSystemGenerator (5-pass generation)
    |
    v
BrandDesignSystem {
    tokens (CSS custom properties)
    componentStyles (12 types)
    decorativeElements
    interactions
    typographyTreatments
    imageTreatments
    compiledCss
}
    |
    v
blueprintRenderer / PremiumHtmlRenderer
    |
    v
Final HTML article with brand styling
```

---

## 3. Component Inventory

### 3.1 UI Components

| Component | File | Status |
|-----------|------|--------|
| **PremiumDesignModal** | `components/premium-design/PremiumDesignModal.tsx` | DONE — Main modal: style guide extraction + premium design flow, multi-step UI, multi-page selection |
| **StyleGuideView** | `components/premium-design/StyleGuideView.tsx` | DONE — Category tabs, brand overview, element approval workflow, color palette, export |
| **StyleGuideElementCard** | `components/premium-design/StyleGuideElementCard.tsx` | DONE — Inline HTML preview, computed CSS, approval workflow, AI quality score, comment/refinement |
| **ColorPaletteView** | `components/premium-design/ColorPaletteView.tsx` | DONE — Color palette visualization and management |
| **StyleGuideExport** | `components/premium-design/StyleGuideExport.ts` | DONE — Export utility (HTML/CSS) |
| **BrandIntelligenceStep** | `components/publishing/steps/BrandIntelligenceStep.tsx` | DONE — URL input, screenshot display, color/font summary, personality sliders, Design DNA details |
| **LayoutIntelligenceStep** | `components/publishing/steps/LayoutIntelligenceStep.tsx` | DONE — Section preview with emphasis indicators |
| **PreviewStep** | `components/publishing/steps/PreviewStep.tsx` | DONE — Live preview with BrandMatchIndicator |
| **SectionPreviewCard** | `components/publishing/SectionPreviewCard.tsx` | DONE — Compact section summary |
| **BrandMatchIndicator** | `components/publishing/BrandMatchIndicator.tsx` | DONE — Brand alignment score (0-100%) |

### 3.2 Styleguide Generator Services

| Service | File | Status |
|---------|------|--------|
| **StyleguideOrchestrator** | `services/styleguide-generator/StyleguideOrchestrator.ts` | DONE — 7-phase pipeline: Extract → Analyze → Build Tokens → Generate Sections → Assemble → Validate → Store |
| **SiteExtractor** | `services/styleguide-generator/SiteExtractor.ts` | DONE — Facade choosing Apify or HTTP fetch |
| **ApifyExtractor** | `services/styleguide-generator/ApifyExtractor.ts` | DONE — Apify Playwright DOM crawling |
| **HttpExtractor** | `services/styleguide-generator/HttpExtractor.ts` | DONE — Jina/Firecrawl/direct fetch fallback |
| **ExtractionAnalyzer** | `services/styleguide-generator/ExtractionAnalyzer.ts` | DONE — Normalizes extraction → BrandAnalysis |
| **TokenSetBuilder** | `services/styleguide-generator/TokenSetBuilder.ts` | DONE — Full DesignTokenSet from BrandAnalysis |
| **ColorScaleGenerator** | `services/styleguide-generator/ColorScaleGenerator.ts` | DONE — Deterministic HSL 50-900 from any hex |
| **PrefixGenerator** | `services/styleguide-generator/PrefixGenerator.ts` | DONE — 2-4 letter CSS prefix from brand name |
| **DocumentAssembler** | `services/styleguide-generator/DocumentAssembler.ts` | DONE — Combines sections → final HTML |
| **NavigationBuilder** | `services/styleguide-generator/NavigationBuilder.ts` | DONE — Sticky nav from section metadata |
| **QualityValidator** | `services/styleguide-generator/QualityValidator.ts` | DONE — Post-generation validation checks |
| **StyleguideStorage** | `services/styleguide-generator/StyleguideStorage.ts` | DONE — Supabase Storage upload/download |

**17 Template Sections (deterministic):**
colorPalette, typography, sectionBackgrounds, images, badges, dividers, breadcrumbs, animations, hoverEffects, responsiveUtils, formStates, skeletonLoading, accessibility, globalSettings, completeStylesheet, quickReference, versionChangelog

**4 AI Batches:**
- **batchA-core** — Buttons, cards, lists, icon boxes, forms, tables
- **batchB-content** — Reviews, CTA, hero, alerts, steps, pricing, FAQ, stats
- **batchC-site** — Header, footer, floating, blog, pagination, typography, gallery, slider, maps, logos, special pages
- **batchD-guidelines** — Compositions, icons, image guidelines, schema, tone of voice

### 3.3 Design Analysis Services

| Service | File | Status |
|---------|------|--------|
| **BrandDesignSystemGenerator** | `services/design-analysis/BrandDesignSystemGenerator.ts` | DONE — 5-pass CSS generation from DesignDNA, multi-provider (Gemini/Anthropic), hash-based dedup |
| **AIDesignAnalyzer** | `services/design-analysis/AIDesignAnalyzer.ts` | DONE — AI vision extraction with fallback defaults, response sanitization |
| **BrandDiscoveryService** | `services/design-analysis/BrandDiscoveryService.ts` | DONE — Apify Playwright scraper integration, confidence scoring, color utilities |
| **StyleGuideExtractor** | `services/design-analysis/StyleGuideExtractor.ts` | DONE — Real HTML/CSS from DOM (not AI guesses), multi-page crawling, element screenshots |
| **StyleGuideGenerator** | `services/design-analysis/StyleGuideGenerator.ts` | DONE — Coordinates extraction + AI refinement with feedback loops |
| **CSSPostProcessor** | `services/design-analysis/CSSPostProcessor.ts` | DONE — 130+ variable normalization mappings, strips duplicate :root, brand color preservation |
| **DesignQualityValidator** | `services/design-analysis/DesignQualityValidator.ts` | DONE — Color contrast, font loading, CSS specificity validation |
| **brandDesignSystemStorage** | `services/design-analysis/brandDesignSystemStorage.ts` | DONE — BrandDesignSystem persistence |
| **styleGuidePersistence** | `services/design-analysis/styleGuidePersistence.ts` | DONE — StyleGuide data persistence |

### 3.4 Layout Engine Services

| Service | File | Status |
|---------|------|--------|
| **LayoutEngine** | `services/layout-engine/LayoutEngine.ts` | DONE — Main orchestrator |
| **SectionAnalyzer** | `services/layout-engine/SectionAnalyzer.ts` | DONE — Content type + semantic weight (1-5) based on EAV category |
| **LayoutPlanner** | `services/layout-engine/LayoutPlanner.ts` | DONE — Width, columns, spacing from semantic weight |
| **ComponentSelector** | `services/layout-engine/ComponentSelector.ts` | DONE — Two-factor selection: content type × brand personality |
| **VisualEmphasizer** | `services/layout-engine/VisualEmphasizer.ts` | DONE — Weight → visual properties (hero/featured/standard/supporting/minimal) |
| **ImageHandler** | `services/layout-engine/ImageHandler.ts` | DONE — Semantic image placement (never between heading and first paragraph) |
| **AILayoutPlanner** | `services/layout-engine/AILayoutPlanner.ts` | DONE — AI-driven layout generation |

### 3.5 Premium Design Services

| Service | File | Status |
|---------|------|--------|
| **PremiumDesignOrchestrator** | `services/premium-design/PremiumDesignOrchestrator.ts` | DONE — Full pipeline: DNA extraction → BrandDesignSystem → Layout → Render → Validate → Persist. Fallback chain: AI → legacy → semantic |
| **PremiumHtmlRenderer** | `services/premium-design/PremiumHtmlRenderer.ts` | DONE — HTML rendering from design specs |
| **SemanticHtmlGenerator** | `services/premium-design/SemanticHtmlGenerator.ts` | DONE — Semantic HTML with microdata |
| **StyleGuideCssGenerator** | `services/premium-design/StyleGuideCssGenerator.ts` | DONE — CSS from style guide data |
| **AiCssGenerator** | `services/premium-design/AiCssGenerator.ts` | DONE — AI-powered CSS generation |
| **DesignValidationService** | `services/premium-design/DesignValidationService.ts` | DONE — Design quality validation |

### 3.6 Publishing Renderer

| Service | File | Status |
|---------|------|--------|
| **blueprintRenderer** | `services/publishing/renderer/blueprintRenderer.ts` | DONE — Accepts `brandDesignSystem?.compiledCss` (takes precedence over legacy `designTokens`), article injection, JSON-LD, multi-provider |

---

## 4. Types & Interfaces

| Type | File | Fields |
|------|------|--------|
| **DesignDNA** | `types/designDna.ts` | 180+ fields: colors, typography, spacing, shapes, effects, decorative, layout, motion, images, component preferences, brand personality, confidence |
| **DesignDNAExtractionResult** | `types/designDna.ts` | DNA + screenshot + metadata |
| **BrandDesignSystem** | `types/designDna.ts` | tokens (CSS + JSON), componentStyles, decorativeElements, interactions, typographyTreatments, imageTreatments, compiledCss, variantMappings |
| **StyleGuide** | `types/styleGuide.ts` | Complete extraction: elements, colors, page sections, brand overview |
| **StyleGuideElement** | `types/styleGuide.ts` | Individual style element with category/HTML/CSS |
| **SavedStyleGuide** | `types/styleGuide.ts` | Database persistence model |
| **PremiumDesignSession** | `services/premium-design/types.ts` | Session state, iterations, validation |
| **SavedPremiumDesign** | `services/premium-design/types.ts` | Database persistence model |

---

## 5. Database Schema

### 5.1 Tables (across 6 migrations)

| Table | Migration | Purpose |
|-------|-----------|---------|
| `design_profiles` | `20260124100000` | Validated brand discovery results |
| `design_preferences` | `20260124100000` | User preference learning |
| `project_design_defaults` | `20260124100000` | Project-level design settings |
| `topical_map_design_rules` | `20260124100000` | Map-level design overrides |
| `brand_design_dna` | `20260125` | AI Vision-extracted DesignDNA + screenshot |
| `brand_design_systems` | `20260125` | Generated CSS design systems + compiledCss |
| `brand_extractions` | `20260126100000` | Cached page captures (screenshot, raw HTML, computed styles) |
| `brand_components` | `20260126100000` | Extracted literal HTML/CSS from site |
| `brand_tokens` | `20260126100000` | Actual values (colors, typography, spacing, shadows) |
| `brand_url_suggestions` | `20260126100000` | Smart discovery for multi-page crawling |
| `brand_replication_components` | `20260129100000` | AI-generated components per brand |
| `brand_replication_decisions` | `20260129100000` | Section-level design decisions per article |
| `brand_replication_validations` | `20260129100000` | Quality validation results per article |
| `premium_designs` | `20260208100000` | Final rendered designs with version history |
| `topical_maps.styleguide_data` | `20260212200000` | JSONB column for design tokens |

### 5.2 Storage

- **`styleguides` bucket** — Supabase Storage for HTML files (5MB limit, public read access)

### 5.3 Key Characteristics

- All tables have RLS policies (project/user access)
- Most use `has_project_access()` for organization multi-tenancy
- Comprehensive indexing for performance
- Realtime publication on some tables
- `updated_at` triggers for audit trails

---

## 6. Test Coverage

### 6.1 Styleguide Generator Tests (9 files)

| Test | Coverage |
|------|----------|
| `Integration.test.ts` | Full pipeline integration |
| `TokenSetBuilder.test.ts` | Token generation & compilation |
| `ColorScaleGenerator.test.ts` | Color scale generation (50-900) |
| `Orchestrator.test.ts` | Main orchestrator workflow |
| `AiBatches.test.ts` | AI batch generation |
| `CoreTemplateSections.test.ts` | Template section generation |
| `AllTemplateSections.test.ts` | All 17 templates |
| `DocumentAssembly.test.ts` | HTML assembly |
| `Extraction.test.ts` | Site extraction |

### 6.2 Design Analysis Tests (6 files)

| Test | Coverage |
|------|----------|
| `BrandDesignSystemGenerator.test.ts` | 40+ cases: tokens, hashing, providers, AI parsing, edge cases |
| `AIDesignAnalyzer.test.ts` | AI extraction validation |
| `BrandDiscoveryService.test.ts` | Discovery service |
| `DesignQualityValidator.test.ts` | Quality validation |
| `CSSPostProcessor.test.ts` | CSS normalization |

### 6.3 Layout Engine Tests (6 files)

SectionAnalyzer, LayoutPlanner, ComponentSelector, VisualEmphasizer, ImageHandler, integration

### 6.4 E2E Tests (2 files)

| Test | Coverage |
|------|----------|
| `e2e/style-guide.spec.ts` | Extraction, CSS generation, HTML export, visual quality |
| `e2e/style-guide-live-flow.spec.ts` | Live user flow testing |

---

## 7. What's Been Done (Fully Working)

- Style guide extraction via 3 parallel pipelines (DOM/HTTP/AI Vision)
- Design DNA extraction (180+ fields) with AI vision models
- BrandDesignSystem generation (5-pass, multi-provider, hash-based dedup)
- CSS post-processing with 130+ variable normalization mappings
- 48-section HTML style guide generation (17 deterministic + 4 AI batches)
- Deterministic color scale generation (HSL 50-900 from any hex)
- Layout engine with semantic weight analysis and component selection
- Premium design rendering with 3-level fallback chain (AI → legacy → semantic)
- Blueprint renderer with `brandDesignSystem.compiledCss` precedence
- All database tables with RLS, indexes, multi-tenancy
- 3 Supabase edge functions for brand discovery pipeline
- Supabase Storage bucket for style guide HTML files
- 25+ test files with comprehensive coverage
- Element approval workflow (pending/approved/rejected)
- AI refinement with comment-driven feedback loops
- Quality validation (color contrast, font loading, CSS specificity)
- Export functionality (HTML/CSS)
- Multi-page crawling with configurable page selection (up to 5 pages)
- Third-party CSS block stripping (recent fix)
- Font name normalization and @font-face extraction (recent fix)
- Context-aware color weighting (recent fix)
- CORS proxy routing for external fetches (recent fix)

---

## 8. What's Partially Done

| Feature | Status | Details |
|---------|--------|---------|
| **Design Preference Learning** | Tables exist, not fully integrated | `design_preferences` table created but learning loop not wired into generation pipeline |
| **AI Refinement Feedback Loop** | StyleGuideRefiner exists | Comment-driven improvements work, but not deeply integrated into main UI workflow |
| **Multi-page Extraction Optimization** | Works but may need tuning | Performance with 5+ pages not stress-tested |
| **Screenshot Storage** | Base64 in DB | Works but nullable — could benefit from Supabase Storage migration for large screenshots |

---

## 9. What Still Needs To Be Done

### Priority 1 (High Impact)

| Item | Description |
|------|-------------|
| **Preference Learning Integration** | Wire `design_preferences` table data into BrandDesignSystemGenerator to learn from user approvals/rejections over time |
| **Local Business Brand Patterns** | Add local-business-specific brand templates and extraction patterns |
| **Multi-Brand Management** | Support managing multiple brand profiles per project (currently 1:1 project-to-brand) |

### Priority 2 (Medium Impact)

| Item | Description |
|------|-------------|
| **Brand A/B Comparison** | UI for comparing two brand extractions side-by-side |
| **CSS Variable Audit** | Automated check that all generated CSS variables are used and no undefined references remain |
| **Style Guide Versioning** | Track changes between style guide generations (diff view) |
| **Batch Generation Progress** | More granular progress UI for AI batch generation (currently per-batch, not per-section) |

### Priority 3 (Nice to Have)

| Item | Description |
|------|-------------|
| **WCAG Contrast Auto-Fix** | Auto-suggest color adjustments when contrast fails WCAG AA |
| **Font Subsetting** | Generate optimized font subsets based on actual content characters |
| **Design Token Export** | Export tokens in Figma/Style Dictionary/Tailwind config format |
| **Screenshot Comparison** | Visual regression testing between renders |

---

## 10. Known Issues & Observations

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 1 | CSS Post-Processor handles 130+ mappings | `CSSPostProcessor.ts` | AI-generated CSS frequently needs normalization — working as intended but indicates AI variability |
| 2 | Screenshot stored as base64 in DB | `premium_designs` table | Can grow large; nullable column helps but Storage bucket migration would be better |
| 3 | RLS policy complexity | 15+ design tables | Multiple policies using `has_project_access()` — must be maintained carefully when adding features |
| 4 | Fallback chain in PremiumDesignOrchestrator | `PremiumDesignOrchestrator.ts` | By design: tries BrandDesignSystem → legacy CSS → SemanticHtml. Logs warnings per failure. Not a bug but means degraded output is possible |
| 5 | AI Vision dependency | `AIDesignAnalyzer.ts` | Design DNA extraction relies on AI vision models; defaults provided for fallback but quality drops significantly |
| 6 | Third-party CSS stripping | Recent fix `b9e3190` | Was including plugin CSS blocks (Elementor, WP plugins) in brand analysis; now stripped. May need expansion for other CMS platforms |

---

## 11. File Inventory

### Core Services
- `services/styleguide-generator/` — 12+ service files, 17 template sections, 4 AI batches
- `services/design-analysis/` — 9 service files, 2 prompt files, 2 persistence utilities
- `services/layout-engine/` — 7 service files + types
- `services/premium-design/` — 6 service files + types

### Components
- `components/premium-design/` — 5 components (modal, views, cards, export)
- `components/publishing/` — 5 components (brand step, layout step, preview, section card, brand indicator)

### Types
- `types/designDna.ts` — DesignDNA, BrandDesignSystem, component types
- `types/styleGuide.ts` — StyleGuide, StyleGuideElement, SavedStyleGuide

### Database
- 6 migrations creating 15 tables + 1 storage bucket

### Edge Functions
- `supabase/functions/brand-discovery/` — AI vision analysis
- `supabase/functions/brand-extract-pages/` — Multi-page extraction
- `supabase/functions/brand-url-discovery/` — Page discovery

### Tests
- `services/styleguide-generator/__tests__/` — 9 files
- `services/design-analysis/__tests__/` — 6 files (including 40+ cases for BrandDesignSystemGenerator)
- `services/layout-engine/__tests__/` — 6 files
- `e2e/style-guide*.spec.ts` — 2 E2E files

### Design Docs
- `docs/plans/2026-02-12-styleguide-generator-design.md` — Complete system design (48 sections)
- `docs/plans/2026-01-26-intelligent-layout-engine-implementation.md` — Layout engine plan
- `docs/plans/2026-01-26-intelligent-layout-engine-design.md` — Detailed design spec

---

## 12. Recent Git History

```
3683b4c fix(audit): route content fetching through proxy to bypass CORS + fix false 100 scores
b9e3190 fix(styleguide): strip third-party plugin CSS blocks + real-world integration tests
0cc40c3 fix(styleguide): strip non-CSS noise + normalize font names
a21fc55 fix(styleguide): context-aware color weighting + @font-face extraction
ba9e4b0 fix(styleguide): fetch external CSS stylesheets for accurate brand colors
a574e44 fix(styleguide): remove Apify extraction path, add validation gate
1f484f0 fix(brand-kit): always show styleguide section in Brand Kit tab
f15d84a fix: styleguide AI prompts — require inline styles and Elementor tips in all batches
aa56825 fix: styleguide batch-A prompt — require inline styles and Elementor tips in generated HTML
```

The recent focus has been on **extraction quality** — stripping third-party CSS noise, normalizing fonts, improving color weighting, and ensuring CORS-safe content fetching.
