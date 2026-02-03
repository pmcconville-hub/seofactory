# Rendering Pipeline Improvements - Style & Publish

## Problem Statement

The Style & Publish rendering pipeline produces output that lacks visual "agency quality" despite having correct HTML structure and brand detection. Users see feature cards without backgrounds, timelines without colored markers, and steps without styled indicators. Quality scores (85% brand match) are misleading because they measure HTML pattern presence, not actual visual quality.

## Root Cause Analysis

### RC1: CSS Cascade Conflict (FIXED)
`generateStructuralCSS()` duplicated component selectors (`.feature-card`, `.step-item`, `.faq-item`, etc.) with structural-only properties that overrode ComponentStyles' rich visual properties (backgrounds, shadows, borders, hover effects). Since StructuralCSS was the LAST layer, it won the cascade.

**Fix applied:** Removed all component-specific selectors from `generateStructuralCSS()`. ComponentStyles.ts is now the single source of truth for component styling.

### RC2: HTML List Parsing Bug (FIXED)
`ComponentRenderer.parseContent()` only recognized markdown list syntax (`* item`, `1. item`) but the content generation pipeline produces HTML lists (`<ul><li>item</li></ul>`). This caused feature grids, step lists, and timelines to fall back to prose rendering.

**Fix applied:** Added HTML list extraction (`<ul>/<ol>` with `<li>` items) to `parseContent()` before markdown parsing.

### RC3: compiledCss vs ComponentStyles Overlap
`compiledCss` (AI-generated) and `ComponentStyles` (hardcoded template) both target the same selectors with different styling approaches. compiledCss uses CSS variables (`--ctc-*`), ComponentStyles uses hardcoded hex values from DesignDNA. Currently ComponentStyles wins the cascade (comes after compiledCss), which means AI-generated brand-specific nuances are overridden.

**Status:** Acceptable for now. ComponentStyles provides consistent, tested visual quality. Future improvement: merge the two approaches.

### RC4: Generic Visual Personality
ComponentStyles applies one visual "personality" to all brands (NFIR-style navy hero, repeating gradient bars, orange last-step). Different brand personalities should produce different visual treatments.

**Status:** Future improvement. Requires personality-driven CSS generation.

### RC5: Inflated Quality Scores
DesignQualityAssessment scores HTML pattern presence, not actual visual quality. Already partially addressed with alert banners for low scores.

## Changes Made

### 1. StructuralCSS Cleanup
**File:** `services/publishing/renderer/CleanArticleRenderer.ts`

Removed ~170 lines of component-specific selectors from `generateStructuralCSS()`:
- `.feature-card`, `.feature-grid`, `.feature-icon`, `.feature-content`
- `.step-item`, `.step-number`, `.step-content`, `.steps-list`
- `.faq-accordion`, `.faq-item`, `.faq-question`, `.faq-icon`, `.faq-answer`
- `.timeline`, `.timeline-item`, `.timeline-marker`, `.timeline-content`
- `.checklist`, `.checklist-item`, `.checklist-icon`
- `.card`, `.card-body`, `.card-header`
- `.hero-content`, `.hero-lead`, `.hero-details`
- `.stat-grid`, `.stat-card`
- `.key-takeaways-grid`, `.key-takeaways-item`
- `.summary-box`, `.summary-icon`, `.summary-content`
- `.definition-box`, `.definition-icon`, `.definition-content`
- `.testimonial`, `.testimonial-author`
- `.data-highlight`
- `.styled-list`, `.list-item`, `.list-marker`, `.list-content`
- `.cta-actions`

Kept only true layout primitives:
- `.section`, `.section-container`, `.section-content`, `.section-inner`
- `.layout-*` (width classes)
- `.columns-*` (column layout)
- `.spacing-*` (spacing utilities)
- HTML element resets (`table`, `th`, `td`, `figure`, `blockquote`)
- Responsive `@media` breakpoints (only for layout primitives)

### 2. HTML List Parsing Fix
**File:** `services/publishing/renderer/ComponentRenderer.ts`

Rewrote `parseContent()` to:
1. Extract HTML lists (`<ul>/<ol>` with `<li>` items) FIRST
2. Process remaining text segments with existing markdown parsing
3. Handle HTML `<p>` tags as paragraph blocks

### 3. CSS Cascade Test
**File:** `e2e/visual-quality.spec.ts`

Added test `structural CSS does not override component visual styles` that:
- Verifies component selectors' WINNING definitions include visual properties
- Verifies structural CSS section contains NO component selectors
- Uses `findMainDefinition()` helper to isolate non-media-query CSS

## CSS Layer Architecture (After Fix)

```
Layer 1 (Bottom): compiledCss
  - AI-generated brand-specific CSS
  - CSS custom properties (:root { --ctc-* })
  - Component styles via .ctc-* and non-prefixed dual selectors
  - Google Fonts @import

Layer 2 (Middle): ComponentStyles (generateComponentStyles)
  - Rich visual styles for ALL component types
  - Hardcoded brand colors from DesignDNA
  - Backgrounds, shadows, borders, gradients, hover effects
  - Responsive breakpoints
  - SINGLE SOURCE OF TRUTH for component visual properties

Layer 3 (Top): StructuralCSS (generateStructuralCSS)
  - Layout primitives ONLY (no component selectors)
  - Section container sizing
  - Column layout
  - Spacing utilities
  - HTML element resets
  - Responsive layout breakpoints
```

## Verification

- Build passes: `npm run build` (11 files, 0 errors)
- All 11 visual quality tests pass: `npx playwright test e2e/visual-quality.spec.ts`
- Cascade validation test confirms no component selectors in structural CSS

## Future Improvements

1. **Personality-driven ComponentStyles** - Adapt visual treatment based on brand personality (corporate, creative, luxurious, minimal)
2. **Scoped CSS generation** - Only emit styles for components actually used in the article
3. **compiledCss integration** - Let AI-generated CSS override ComponentStyles for brand-specific nuances
4. **Visual validation loop** - Screenshot comparison between rendered output and brand reference
