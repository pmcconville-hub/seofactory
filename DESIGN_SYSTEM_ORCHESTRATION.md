# Comprehensive Design System & Workflow Specification (v2.0)

This document provides a holistic overview of the "Professional Grade" publishing engine. It defines the workflow, data context, and output specifications required to achieve the "Wow Factor" by bridging the gap between raw semantic data and high-fidelity editorial design.

---

## 1. THE WORKFLOW: Step-by-Step

| Step | User Action | System Process | Outcome |
| :--- | :--- | :--- | :--- |
| **1. Site Target** | Enters Website URL | **Deep Analysis**: `DesignAnalyzer` samples 150+ DOM elements. | Robust extraction of brand PRIMARY and ACCENT colors. |
| **2. DNA Reveal** | Clicks "Detect Design" | **Matching Logic**: Neutralizes distractors; locks in Brand Palette; identifies Font Vibe. | **Brand DNA Board** appears (Step 1) showing swatches & match quality. |
| **3. Vibe Selection** | Selects Personality | **Structural Mapping**: Merges "Vibe" (Layout Rhythm) with "Brand" (Locked Colors). | The design personality (e.g. *Editorial*) is selected without "Blue-Washing" the brand. |
| **4. Live Preview** | Reviews Preview | **Component Rendering**: Wraps draft text in high-fidelity `componentLibrary` structures. | First visual "Wow Factor" review inside the wizard. |
| **5. WP Export** | Finalizes Export | **Standalone Generation**: Injects production CSS + Google Fonts + Interactive Scripts. | A standalone, professional-grade article file. |

---

## 2. THE DATA ARCHITECTURE: Data Flow Bridge

The system is a "Skin," not a "Brain." It consumes the following optimized sources without modification:

1.  **Business Info (`business.ts`)**: Base domain, industry, value proposition, and target market.
2.  **Topical Map (`topicalMap`)**: Central entity, auxiliary verbs, and regional context (e.g. Breda).
3.  **Content Brief**: SEO strategy markers, image placeholders, and structural hierarchy.
4.  **Article Draft**: The optimized SEO text, headers, and bullet points.

**THE BRIDGE**: The `blueprintRenderer` maps these fields directly into visual slots:
*   `BusinessInfo.targetMarket` -> Regional Context (if available).
*   `BrandKit.colors` -> CSS Custom Properties (`--ctc-primary`).
*   `Draft.headings` -> Editorial Serif (Playfair Display) Scale.

---

## 3. OUTPUT SPECIFICATIONS: The "Wow Factor" Guidelines

To achieve professional quality, every output MUST adhere to these mechanical standards:

### ✅ SUCCESS (The "Wow" Factor)
*   **Typography Pairing**: High-contrast pairing. **Playfair Display** (800+ weight) for headings, **Inter** (400-600) for body.
*   **Visual Depth**: Usage of `box-shadow` (var(--ctc-shadow-float)) and `backdrop-filter: blur()`.
*   **Layout Rhythm**:
    *   **TOC Overlap**: The Table of Contents is pulled 6rem upward into the Hero section.
    *   **Breathe Spacing**: Sections have 6-8rem vertical padding to prevent "cramping."
*   **Bespoke Finishing**: "Gecertificeerd Partner" badges and subtle "Visual Match" tags.
*   **Color Integrity**: The user's brand color (e.g. Orange) is the HERO color, never falling back to generic Blue.

### ❌ FAILURE (Not Accepted)
*   **Blue-Washing**: Falling back to #3b82f6 when the user has a specific brand.
*   **Flatness**: 0px shadows or 0px letter-spacing on headers.
*   **Template Feel**: Centered text without decorative elements like radial gradients or "DNA tags."
*   **Semantic Overreach**: Changing the article's words or labeling things incorrectly based on AI "guesses."

---

## 4. TECHNICAL SPECIFICATIONS (Reference Manual)

### A. The Scraper (`DesignAnalyzer.ts`)
*   **Sampling**: 150+ elements (h1-h6, buttons, nav, footer).
*   **Filtering**: Advanced `isNeutral` check to ignore White (#FFF), Black (#000), and Grey (#555).
*   **Priority Hierarchy**: Primary Button BG -> Most Frequent BG -> H1 Color.

### B. The Renderer (`blueprintRenderer.ts`)
*   **Title-Casing**: All Hero headlines are mechanically converted to Title Case (for professional impact).
*   **Font Injection**: Global `<link>` injection for Playfair Display + Inter Google Fonts.
*   **Responsive Integrity**: Grid-based layouts (ctc-grid-2) that collapse gracefully on mobile.

---

## 5. QUALITY CONTROL CHECKLIST (For Reviews)

1.  [ ] **Is it Orange?** (Or the intended brand color?)
2.  [ ] **Does it 'Breathe'?** (Are sections spaced adequately?)
3.  [ ] **Does the TOC overlap?** (Is the transition from Hero to Content elegant?)
4.  [ ] **Are fonts serifed?** (Are Editorial headers in Playfair Display?)
5.  [ ] **Is the console clean?** (Tailwind CDN and development scripts purged?)

**This system is configured to meet these checkpoints by default.**
