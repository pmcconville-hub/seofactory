# Brand Replication System - Validation Report & Fix Plan

> **Test Date:** 2026-01-29
> **Test Case:** "SEO voor Groothandel" from Resultaatmakers topical map
> **Brand Website:** https://www.resultaatmakers.online

## Pipeline Results

| Metric | Value | Status |
|--------|-------|--------|
| Pipeline completes end-to-end | Yes | OK |
| AI-generated CSS size | 45,680 chars | OK |
| HTML output size | 109,000 chars | OK |
| Brand Match (self-reported) | 85% | OK |
| Design Quality Score | 80% | OK |
| Component Variety | 85% | OK |
| Visual Hierarchy | 65% | NEEDS IMPROVEMENT |
| CSS var() usages | 499 | OK |
| Hover states | 50 | OK |
| Transitions | 60 | OK |
| Media queries | 4 | OK |

## Critical Issues Found

### Issue 1: CSS Class Name Gap (CRITICAL)

CleanArticleRenderer adds 60+ CSS class names to HTML that have NO CSS styles.
The AI CSS generator covers `.ctc-*` classes and some aliases (`.card`, `.prose`, `.section`)
but misses all utility/enhancement and component-specific classes.

**Unstyled classes in the HTML output:**
- Layout: `has-background`, `bg-gradient`, `accent-left`, `heading-decorated`, `elevation-*`, `card-elevation-*`
- Headings: `heading-xl`, `heading-lg`, `heading-md`, `heading-sm`
- Steps: `steps-list`, `step-item`, `step-number`, `step-content`
- FAQ: `faq-list`, `faq-item`, `faq-question`, `faq-answer`, `faq-icon`
- Lists: `styled-list`, `list-item`, `list-marker`, `list-content`
- Summary: `summary-box`, `summary-icon`, `summary-content`
- Definitions: `definition-box`, `definition-icon`, `definition-content`
- Layout widths: `layout-narrow`, `layout-medium`, `layout-wide`, `layout-full`
- Columns: `columns-2-column`, `columns-3-column`
- Spacing: `spacing-before-*`, `spacing-after-*`

**Impact:** Article renders with basic typography but lacks visual depth, cards, backgrounds, shadows.

### Issue 2: Font Detection Failure (HIGH)

| Property | Brand Website | AI Detected |
|----------|--------------|-------------|
| Body font | "Open Sans", sans-serif | sans-serif, sans-serif |
| Heading font | Poppins, sans-serif | sans-serif, sans-serif |
| Source | Google Fonts import | Screenshot inference |

No `@import` for Google Fonts in the output CSS.

### Issue 3: Color Inaccuracy (MEDIUM)

| Property | Brand Website | AI Detected |
|----------|--------------|-------------|
| Primary blue | #1e73be / rgb(30, 115, 190) | #2563eb |
| Button bg | rgb(30, 115, 190) | #2563eb |
| Link color | rgb(0, 74, 173) | #2563eb |
| Button radius | 6px | 8px |

### Issue 4: CSS Duplication (MEDIUM)

6 duplicate `.section {}` blocks in compiled CSS (each component generator emits its own).

### Issue 5: Article Preview Height=0 in Modal (LOW)

Preview step shows quality scores but article content area has 0 height.

---

## Fixes Implemented

### Fix 1: Comprehensive Supplementary CSS [DONE]

**File:** `services/publishing/renderer/CleanArticleRenderer.ts` → `generateSupplementaryCSS()`

Expanded from ~80 lines of "STRUCTURAL ONLY" CSS to ~300+ lines of comprehensive visual CSS
using `var(--ctc-*)` custom properties. All 60+ HTML class names now have matching CSS styles.
Also fixed a bug where `faq-item { opacity: 0.15 }` made FAQ items nearly invisible.

Covers: heading sizes/decorations, emphasis levels (hero/featured/standard), backgrounds,
elevations, cards, feature-grids, steps, FAQ, lists, summary boxes, definition boxes,
testimonials, stat grids, key takeaways, timelines, checklists, CTAs, tables, blockquotes,
image placeholders, and responsive breakpoints (768px, 480px).

### Fix 2: Google Fonts Detection + Import [DONE]

**Files:**
- `services/design-analysis/BrandDiscoveryService.ts` - Added Google Fonts detection in Apify page evaluation
- `services/design-analysis/BrandDesignSystemGenerator.ts` - Accepts `googleFontsUrl`, prepends `@import`
- `hooks/useBrandDetection.ts` - Passes `discoveryReport.googleFontsUrl` to generator
- `types/publishing.ts` - Added `googleFontsUrl` and `googleFonts` to `BrandDiscoveryReport`

Detection looks for `<link href="fonts.googleapis.com">` and `<style>` @import rules.
Extracts font family names from URL params and overrides computed font families.

### Fix 3: Color Accuracy via DOM-AI Merging [DONE]

**Files:**
- `hooks/useBrandDetection.ts` - Merges DOM-extracted colors into AI DesignDNA
- `services/design-analysis/BrandDiscoveryService.ts` - Added `css_variable` and `link_color` as high-confidence sources

After AI screenshot analysis, DOM-extracted colors (from buttons, CSS variables, links) with
`'found'` confidence override the AI's approximate values. Also merges DOM-detected Google
Fonts families into DesignDNA typography.

### Fix 4: CSS Selector Deduplication [DONE]

**File:** `services/design-analysis/CSSPostProcessor.ts`

Added `deduplicateSelectors()` step to CSS post-processing that:
- Parses CSS into blocks by selector
- Groups blocks with the same selector
- Merges properties (later declarations win, preserving CSS cascade)
- Preserves `@media` and other at-rules separately
- Logs deduplication count

Updated `BrandDesignSystemGenerator.ts` to log deduplication results.

### Remaining: Issue 5 (Article Preview Height=0 in Modal)

Not addressed in this round. Preview step shows quality scores but article content area
has 0 height. Low priority - functional output is correct.

---

## Test Results After Fixes

- TypeScript compilation: All modified files compile clean (0 new errors)
- Unit tests: 89/89 design-analysis tests pass
- Integration tests: 31/33 brand replication tests pass (2 pre-existing failures in fallback behavior)
- CSS deduplication: Verified 3 duplicate `.section` blocks → 1, 2 duplicate `.card` blocks → 1, @media preserved
