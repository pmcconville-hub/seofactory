# Brand Design System - Future Improvements Roadmap

> This document tracks planned improvements for the AI Vision-First Brand Design System.
> Last updated: 2026-01-25

## Overview

The AI Vision-First Brand Design System extracts brand identity from website screenshots using AI Vision, generates unique CSS design systems, and applies them to styled content. This roadmap outlines future enhancements.

---

## High Priority

### 1. Apply to All Articles
**Status:** Planned
**Effort:** Medium

Allow users to apply detected brand styles to all articles in a topical map with one click.

**Features:**
- "Apply to All" button in Brand Step
- Batch processing with progress indicator
- Selective application (choose which articles)
- Preview before applying

**Files to modify:**
- `components/publishing/steps/BrandStep.tsx`
- `services/publishing/batchStyling.ts` (new)
- `hooks/useBatchBrandApplication.ts` (new)

---

### 2. Dark Mode Preview Toggle
**Status:** Planned
**Effort:** Low

Add a toggle in Preview Step to see how styled content looks in dark mode.

**Features:**
- Dark/Light mode toggle button
- Auto-generate dark mode CSS variables from Design DNA
- Persist preference

**Files to modify:**
- `components/publishing/steps/PreviewStep.tsx`
- `services/publishing/tokenResolver.ts` (add dark mode generation)

---

### 3. Export Design System
**Status:** Planned
**Effort:** Low

Allow users to download the generated design system as standalone files.

**Export formats:**
- CSS file with all tokens and component styles
- JSON tokens file (for design tools like Figma)
- SCSS variables file
- Tailwind config extension

**Files to create:**
- `services/design-analysis/exportDesignSystem.ts`
- `components/publishing/ExportDesignSystemModal.tsx`

---

## Medium Priority

### 4. Compare Brands Side-by-Side
**Status:** Planned
**Effort:** Medium

Allow users to compare their brand with competitor brands.

**Features:**
- Multi-URL input for comparison
- Side-by-side Design DNA display
- Highlight differences
- "Copy this style element" buttons

**Files to create:**
- `components/publishing/BrandComparisonView.tsx`
- `hooks/useBrandComparison.ts`

---

### 5. Design History & Versioning
**Status:** Planned
**Effort:** Medium

Track Design DNA changes over time with ability to revert.

**Features:**
- Auto-save versions on edit
- Visual diff between versions
- One-click revert
- Version notes/comments

**Database changes:**
- Add `brand_design_dna_history` table
- Add version tracking columns

**Files to create:**
- `services/design-analysis/designHistory.ts`
- `components/publishing/DesignHistoryPanel.tsx`

---

### 6. Keyboard Shortcuts for Power Users
**Status:** Planned
**Effort:** Low

Add keyboard shortcuts throughout the Style & Publish flow.

**Shortcuts:**
- `Cmd+Enter` - Proceed to next step
- `Cmd+E` - Toggle expanded view
- `Cmd+P` - Generate preview
- `Cmd+S` - Save/Publish
- `1-4` - Quick edit sections (colors/typography/shapes/personality)

**Files to modify:**
- `components/publishing/StylePublishModal.tsx`
- `hooks/useKeyboardShortcuts.ts` (new)

---

### 7. Apify Token Usage Tracking
**Status:** Planned
**Effort:** Medium

Track Apify API usage per user/project for billing purposes.

**Features:**
- Log each screenshot capture call
- Track credits used
- Display usage in settings
- Set usage limits/alerts

**Database changes:**
- Add Apify usage to `ai_usage_logs` table

**Files to modify:**
- `services/design-analysis/BrandDiscoveryService.ts`
- `supabase/functions/_shared/usage.ts`

---

## Lower Priority

### 8. AI-Powered Design Suggestions
**Status:** Future
**Effort:** High

Use AI to suggest design improvements based on industry best practices.

**Features:**
- "Improve this design" button
- Industry-specific recommendations
- A/B test suggestions
- Accessibility improvements

---

### 9. Brand Guidelines PDF Export
**Status:** Future
**Effort:** Medium

Generate a PDF brand guidelines document from Design DNA.

**Contents:**
- Color palette with usage guidelines
- Typography specifications
- Component style examples
- Do's and Don'ts

---

### 10. Real-time Collaboration
**Status:** Future
**Effort:** High

Allow multiple users to collaborate on brand customization.

**Features:**
- Real-time cursor presence
- Live edits sync
- Comments/annotations
- Approval workflow

---

### 11. Integration with Design Tools
**Status:** Future
**Effort:** High

Export to popular design tools.

**Integrations:**
- Figma plugin
- Adobe XD export
- Sketch export
- Framer export

---

### 12. Custom Font Upload
**Status:** Future
**Effort:** Medium

Allow users to upload custom brand fonts.

**Features:**
- Font file upload (woff2, woff, ttf)
- Auto-generate @font-face rules
- Preview with custom fonts
- Font subsetting for performance

---

## Technical Debt

### 13. Migrate Apify to BYOK Pattern
**Status:** Technical Debt
**Effort:** Medium

Currently Apify token uses simple user settings pattern. Consider migrating to Vault-based BYOK pattern like AI provider keys for better security and organization-level management.

**Benefits:**
- Encrypted storage in Vault
- Organization-level override
- Project-level override
- Audit trail

**Files to create:**
- `supabase/functions/manage-service-api-keys/index.ts`
- Update `hooks/useApiKeys.ts`

---

### 14. Unit Tests for Design Analysis Services
**Status:** Technical Debt
**Effort:** Medium

Add comprehensive unit tests for all design analysis services.

**Coverage needed:**
- `BrandDiscoveryService`
- `AIDesignAnalyzer`
- `BrandDesignSystemGenerator`
- `brandDesignSystemStorage`
- Design DNA inline editors

---

### 15. Performance Optimization
**Status:** Technical Debt
**Effort:** Medium

Optimize the brand detection flow for faster results.

**Optimizations:**
- Parallel AI calls where possible
- Aggressive caching
- Lazy load editors
- Compress screenshot storage

---

## Completed

- [x] AI Vision-First Brand Design System (core services)
- [x] UX Redesign: 6-step to 3-step modal
- [x] Progressive disclosure Design DNA display
- [x] Collapsible Layout/Blueprint panels in Preview
- [x] Inline Design DNA editors (colors, typography, shapes, personality)
- [x] PreviewStep panel integration fix

---

## Contributing

When picking up a roadmap item:

1. Create a design document in `docs/plans/`
2. Get approval before implementation
3. Follow TDD approach
4. Update this roadmap when complete
