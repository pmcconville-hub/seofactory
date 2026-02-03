# Rendering Pipeline Major Improvements - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the Style & Publish rendering pipeline from "structured but generic" to "agency-quality brand-matched" output by fixing CSS conflicts, adding semantic content components (alert boxes, lead paragraphs, info callouts), implementing brand personality-driven styling, and adding a visual validation gate.

**Architecture:** The rendering pipeline flows: Brand Detection → DesignDNA → Layout Blueprint → CleanArticleRenderer → ComponentRenderer → ComponentStyles → Final HTML+CSS. The main path (PATH B) uses `CleanArticleRenderer` with three CSS layers: compiledCss (AI-generated), ComponentStyles (visual components), and StructuralCSS (layout primitives). We improve each layer and add missing content components that the examples demonstrate are critical for agency quality.

**Tech Stack:** React 18, TypeScript, Vite, Playwright (e2e), Vitest (unit), Supabase (backend)

---

## Phase 1: Content Component Enrichment

The example outputs have components our pipeline lacks entirely: alert boxes, info callouts, lead paragraphs, highlighted text boxes, and CTA variants. Without these, output looks like a generic blog post regardless of CSS quality.

### Task 1: Add Alert Box Component

Content often contains warnings, important notes, and risk information. The examples render these as visually distinct alert boxes (left-border accent, colored background). Our system currently renders them as plain prose paragraphs.

**Files:**
- Modify: `services/publishing/renderer/ComponentRenderer.ts` (add renderAlertBox method after line 676)
- Modify: `services/publishing/renderer/ComponentStyles.ts` (add alert-box CSS)
- Modify: `services/layout-engine/types.ts` (add 'alert-box' to ComponentType union)
- Test: `e2e/visual-quality.spec.ts`

**Step 1: Add 'alert-box' to the ComponentType union**

In `services/layout-engine/types.ts`, find the `ComponentType` type and add `'alert-box'`:

```typescript
export type ComponentType =
  | 'hero' | 'card' | 'feature-grid' | 'timeline' | 'step-list'
  | 'accordion' | 'faq-accordion' | 'comparison-table' | 'testimonial-card'
  | 'key-takeaways' | 'cta-banner' | 'stat-highlight' | 'checklist'
  | 'blockquote' | 'definition-box' | 'prose'
  | 'alert-box' | 'info-box' | 'lead-paragraph';  // NEW
```

**Step 2: Write failing test for alert-box CSS**

Add to `e2e/visual-quality.spec.ts` in the `CSS Pipeline Validation` describe block:

```typescript
test('alert-box and info-box component styles are generated', async () => {
  const { generateComponentStyles } = await import(
    '../services/publishing/renderer/ComponentStyles'
  );
  const css = generateComponentStyles({
    primaryColor: '#0056b3',
    accentColor: '#ff6b35',
  });

  // Alert box must have warning styling
  expect(css).toContain('.alert-box');
  expect(css).toMatch(/\.alert-box\s*\{[^}]*border-left/);
  expect(css).toMatch(/\.alert-box\s*\{[^}]*background/);

  // Info box must have informational styling
  expect(css).toContain('.info-box');
  expect(css).toMatch(/\.info-box\s*\{[^}]*background/);
});
```

**Step 3: Run test to verify it fails**

Run: `npx playwright test e2e/visual-quality.spec.ts -g "alert-box"`
Expected: FAIL - `.alert-box` not found in CSS output

**Step 4: Add alert-box and info-box CSS to ComponentStyles.ts**

In `services/publishing/renderer/ComponentStyles.ts`, before the `RESPONSIVE ADJUSTMENTS` section (line ~1259), add:

```typescript
/* ------------------------------------------------------------------------- */
/* ALERT BOX - Warnings, risks, important notes                             */
/* ------------------------------------------------------------------------- */

.alert-box {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  padding: 1.25rem 1.5rem;
  background: ${o.accentColor}0a;
  border-left: 4px solid ${o.accentColor};
  border-radius: 0 ${o.radiusMedium} ${o.radiusMedium} 0;
  margin: 1.5rem 0;
  color: ${o.textColor};
  line-height: 1.6;
}

.alert-box-icon {
  flex-shrink: 0;
  font-size: 1.25rem;
  margin-top: 0.1rem;
}

.alert-box-content {
  flex: 1;
}

.alert-box-content p { margin: 0; }
.alert-box-content p + p { margin-top: 0.75rem; }

.alert-box-title {
  font-weight: 700;
  color: ${o.accentColor};
  margin-bottom: 0.5rem;
  font-family: ${o.headingFont};
}

/* Severity variants */
.alert-box--warning {
  background: ${o.accentColor}0a;
  border-left-color: ${o.accentColor};
}

.alert-box--info {
  background: ${o.primaryColor}08;
  border-left-color: ${o.primaryColor};
}

.alert-box--success {
  background: #10b98108;
  border-left-color: #10b981;
}

.alert-box--info .alert-box-title { color: ${o.primaryColor}; }
.alert-box--success .alert-box-title { color: #10b981; }

/* ------------------------------------------------------------------------- */
/* INFO BOX - Contextual information, tips, definitions                     */
/* ------------------------------------------------------------------------- */

.info-box {
  padding: 1.5rem 2rem;
  background: ${o.primaryColor}06;
  border-radius: ${o.radiusMedium};
  margin: 1.5rem 0;
  color: ${o.textColor};
  line-height: 1.7;
}

.info-box p { margin: 0; }
.info-box p + p { margin-top: 0.75rem; }

.info-box-title {
  font-weight: 700;
  color: ${o.primaryDark};
  margin-bottom: 0.5rem;
  font-family: ${o.headingFont};
}

/* Highlight variant (yellow/orange) */
.info-box--highlight {
  background: ${o.accentColor}08;
  border-left: 4px solid ${o.accentColor};
  border-radius: 0 ${o.radiusMedium} ${o.radiusMedium} 0;
}
```

**Step 5: Add renderAlertBox and renderInfoBox methods to ComponentRenderer**

In `services/publishing/renderer/ComponentRenderer.ts`, add routing cases in `renderComponentContent()` (after line 208):

```typescript
case 'alert-box':
  return this.renderAlertBox(processedContent, emphasis);
case 'info-box':
  return this.renderInfoBox(processedContent, emphasis);
case 'lead-paragraph':
  return this.renderLeadParagraph(processedContent, emphasis);
```

Then add the render methods before the `HELPER METHODS` section:

```typescript
/**
 * Alert Box - Warning/risk/important note with icon and colored border
 */
private static renderAlertBox(content: string, emphasis: VisualEmphasis): string {
  const blocks = this.parseContent(content);
  const text = blocks.map(b => this.renderBlock(b)).join('\n');

  // Detect severity from content
  const lower = content.toLowerCase();
  const severity = lower.includes('warning') || lower.includes('waarschuwing') || lower.includes('risico') || lower.includes('risk')
    ? 'warning'
    : lower.includes('tip') || lower.includes('info')
    ? 'info'
    : 'warning';

  const icons: Record<string, string> = { warning: '⚠️', info: 'ℹ️', success: '✅' };

  return `
<aside class="alert-box alert-box--${severity}">
  <div class="alert-box-icon">${icons[severity]}</div>
  <div class="alert-box-content">
    ${text}
  </div>
</aside>`;
}

/**
 * Info Box - Contextual information, tips, definitions
 */
private static renderInfoBox(content: string, emphasis: VisualEmphasis): string {
  const blocks = this.parseContent(content);

  return `
<aside class="info-box">
  <div class="info-box-content">
    ${blocks.map(b => this.renderBlock(b)).join('\n')}
  </div>
</aside>`;
}

/**
 * Lead Paragraph - First paragraph with visual accent (left border)
 */
private static renderLeadParagraph(content: string, emphasis: VisualEmphasis): string {
  const blocks = this.parseContent(content);
  const firstParagraph = blocks.find(b => b.type === 'paragraph')?.content || content;
  const remaining = blocks.filter(b => b !== blocks.find(bb => bb.type === 'paragraph'));

  return `
<div class="lead-paragraph">
  <p class="lead-text">${this.processInlineMarkdown(firstParagraph)}</p>
</div>
${remaining.length > 0 ? `<div class="prose">${remaining.map(b => this.renderBlock(b)).join('\n')}</div>` : ''}`;
}
```

**Step 6: Add lead-paragraph CSS to ComponentStyles.ts**

```css
/* ------------------------------------------------------------------------- */
/* LEAD PARAGRAPH - First paragraph with visual accent                      */
/* ------------------------------------------------------------------------- */

.lead-paragraph {
  border-left: 4px solid ${o.primaryColor};
  padding: 0.5rem 0 0.5rem 1.5rem;
  margin: 1.5rem 0;
}

.lead-text {
  font-size: 1.125rem;
  line-height: 1.7;
  color: ${o.textColor};
}
```

**Step 7: Run test to verify it passes**

Run: `npx playwright test e2e/visual-quality.spec.ts -g "alert-box"`
Expected: PASS

**Step 8: Run full test suite**

Run: `npx playwright test e2e/visual-quality.spec.ts`
Expected: ALL PASS

**Step 9: Run build**

Run: `npm run build`
Expected: No TypeScript errors

**Step 10: Commit**

```bash
git add services/publishing/renderer/ComponentRenderer.ts services/publishing/renderer/ComponentStyles.ts services/layout-engine/types.ts e2e/visual-quality.spec.ts
git commit -m "feat(renderer): add alert-box, info-box, and lead-paragraph components

New visual components that the example outputs demonstrate are critical
for agency-quality rendering. Alert boxes for warnings/risks, info boxes
for tips/context, and lead paragraphs with accent borders for article
introductions."
```

---

### Task 2: Auto-Detect Alert/Info Patterns in Content

The Layout Engine's `ComponentSelector` doesn't know about alert-box or info-box. Content containing warnings, tips, or risk information still gets assigned `prose`. We need pattern detection.

**Files:**
- Modify: `services/layout-engine/ComponentSelector.ts`
- Modify: `services/publishing/renderer/ContentStructureParser.ts`
- Test: `e2e/visual-quality.spec.ts`

**Step 1: Write failing test**

Add to `e2e/visual-quality.spec.ts`:

```typescript
test('ContentStructureParser detects alert patterns', async () => {
  const { ContentStructureParser } = await import(
    '../services/publishing/renderer/ContentStructureParser'
  );

  const warningContent = '<p><strong>Waarschuwing:</strong> Dit netwerk is kwetsbaar voor aanvallen.</p><p>Neem onmiddellijk actie.</p>';
  const result = ContentStructureParser.analyze(warningContent, 'alert-box');
  expect(result.type).toBe('alert');
  expect(result.confidence).toBeGreaterThanOrEqual(0.5);
});
```

**Step 2: Run test, verify fail**

Run: `npx playwright test e2e/visual-quality.spec.ts -g "ContentStructureParser detects alert"`
Expected: FAIL

**Step 3: Add alert pattern detection to ContentStructureParser**

In `services/publishing/renderer/ContentStructureParser.ts`, add a detection method for alert/warning/risk patterns. Look for:
- Bold text starting with "Warning:", "Waarschuwing:", "Belangrijk:", "Let op:", "Risico:", "Tip:", "Info:"
- Paragraphs containing "risk", "danger", "important", "caution"

Add these as a new pattern type in the `analyze()` method with appropriate confidence scoring.

**Step 4: Add alert-box/info-box to ComponentSelector**

In `services/layout-engine/ComponentSelector.ts`, add rules:
- Content with warning/risk keywords → `alert-box` (confidence 0.7)
- Content with tip/info/definition keywords → `info-box` (confidence 0.6)
- First section of introduction type → `lead-paragraph` (confidence 0.8)

**Step 5: Run test, verify pass**

**Step 6: Run full suite + build**

**Step 7: Commit**

```bash
git commit -m "feat(layout-engine): auto-detect alert and info patterns in content"
```

---

## Phase 2: Brand Personality-Driven Styling

The examples adapt visual treatment per brand. Our ComponentStyles applies one hardcoded "personality" (NFIR navy+orange). Different brands should get different visual treatments.

### Task 3: Add Personality Parameter to ComponentStyles

**Files:**
- Modify: `services/publishing/renderer/ComponentStyles.ts` (add personality-based variations)
- Modify: `services/publishing/renderer/CleanArticleRenderer.ts` (pass personality to ComponentStyles)
- Test: `e2e/visual-quality.spec.ts`

**Step 1: Write failing test**

```typescript
test('component styles adapt to brand personality', async () => {
  const { generateComponentStyles } = await import(
    '../services/publishing/renderer/ComponentStyles'
  );

  const corporateCss = generateComponentStyles({
    primaryColor: '#1a365d',
    accentColor: '#dd6b20',
    personality: 'corporate',
  });

  const creativeCss = generateComponentStyles({
    primaryColor: '#7c3aed',
    accentColor: '#ec4899',
    personality: 'creative',
  });

  // Corporate: sharp corners, subtle shadows
  expect(corporateCss).toMatch(/border-radius:\s*[0-4]px/);

  // Creative: rounded corners, bolder shadows
  expect(creativeCss).toMatch(/border-radius:\s*(12|16|20|24)px/);
});
```

**Step 2: Run test, verify fail**

**Step 3: Add personality to ComponentStylesOptions**

In `services/publishing/renderer/ComponentStyles.ts`, add to the options interface:

```typescript
export interface ComponentStylesOptions {
  // ... existing properties ...
  personality?: 'corporate' | 'creative' | 'luxurious' | 'friendly' | 'bold' | 'minimal';
}
```

Then in `generateComponentStyles()`, derive visual parameters from personality:

```typescript
const personality = o.personality || 'corporate';

// Personality-driven visual parameters
const visualParams = {
  corporate: {
    radius: { sm: '2px', md: '4px', lg: '6px' },
    shadow: { card: '0 1px 4px rgba(0,0,0,0.06)', hover: '0 4px 12px rgba(0,0,0,0.08)' },
    heroStyle: 'gradient-dark',
    animationDuration: '0.2s',
  },
  creative: {
    radius: { sm: '8px', md: '12px', lg: '20px' },
    shadow: { card: '0 4px 16px rgba(0,0,0,0.08)', hover: '0 8px 30px rgba(0,0,0,0.12)' },
    heroStyle: 'gradient-vibrant',
    animationDuration: '0.4s',
  },
  luxurious: {
    radius: { sm: '0px', md: '2px', lg: '4px' },
    shadow: { card: '0 2px 20px rgba(0,0,0,0.04)', hover: '0 10px 40px rgba(0,0,0,0.08)' },
    heroStyle: 'gradient-elegant',
    animationDuration: '0.5s',
  },
  friendly: {
    radius: { sm: '8px', md: '12px', lg: '16px' },
    shadow: { card: '0 2px 8px rgba(0,0,0,0.06)', hover: '0 6px 20px rgba(0,0,0,0.1)' },
    heroStyle: 'solid-warm',
    animationDuration: '0.3s',
  },
  bold: {
    radius: { sm: '4px', md: '8px', lg: '12px' },
    shadow: { card: '0 4px 16px rgba(0,0,0,0.1)', hover: '0 12px 40px rgba(0,0,0,0.15)' },
    heroStyle: 'gradient-high-contrast',
    animationDuration: '0.2s',
  },
  minimal: {
    radius: { sm: '0px', md: '0px', lg: '2px' },
    shadow: { card: 'none', hover: '0 1px 4px rgba(0,0,0,0.04)' },
    heroStyle: 'flat',
    animationDuration: '0.15s',
  },
}[personality];
```

Override `o.radiusSmall`, `o.radiusMedium`, `o.radiusLarge` when personality is provided but radius values are defaults.

**Step 4: Pass personality from CleanArticleRenderer**

In `services/publishing/renderer/CleanArticleRenderer.ts`, in `generateCSS()` at line ~1079, add personality to the brandColors object:

```typescript
const brandColors = {
  // ... existing ...
  personality: this.designDna?.personality?.overall,
};
```

**Step 5: Run test, verify pass**

**Step 6: Run full suite + build**

**Step 7: Commit**

```bash
git commit -m "feat(styles): personality-driven visual parameters for component styling

Corporate brands get sharp corners and subtle shadows. Creative brands
get rounded corners and bolder shadows. This makes each brand's output
feel unique rather than using one hardcoded visual personality."
```

---

## Phase 3: Hero Section Enrichment

The examples have rich hero sections with breadcrumbs, article metadata, subtitles, and CTAs. Our hero is just a title in a dark box.

### Task 4: Enrich Hero Section with Metadata

**Files:**
- Modify: `services/publishing/renderer/CleanArticleRenderer.ts` (buildHero method at line 276)
- Modify: `services/publishing/renderer/ComponentStyles.ts` (hero-related CSS)
- Test: `e2e/visual-quality.spec.ts`

**Step 1: Write failing test**

```typescript
test('hero section includes subtitle when article has intro content', async () => {
  const result = await renderTestArticle({ withBlueprint: true });
  // Hero should contain the first section's content as subtitle
  expect(result.html).toContain('article-header');
  // Hero must have the gradient/styled background from ComponentStyles
  expect(result.css).toMatch(/\.article-header\s*\{[^}]*background/);
});
```

**Step 2: Extend buildHero to accept subtitle and metadata**

In `services/publishing/renderer/CleanArticleRenderer.ts`, modify `buildHero()`:

```typescript
private buildHero(title: string, subtitle?: string, metadata?: { readTime?: string; date?: string }): string {
  return `
<header class="article-header">
  <div class="article-header-inner">
    <h1>${this.escapeHtml(title)}</h1>
    ${subtitle ? `<p class="article-subtitle">${this.escapeHtml(subtitle)}</p>` : ''}
    ${metadata?.readTime || metadata?.date ? `
    <div class="article-meta">
      ${metadata.date ? `<span class="meta-item">${this.escapeHtml(metadata.date)}</span>` : ''}
      ${metadata.readTime ? `<span class="meta-item">${this.escapeHtml(metadata.readTime)}</span>` : ''}
    </div>` : ''}
  </div>
</header>`;
}
```

**Step 3: Extract subtitle from first section**

In `generateHTML()`, extract the first sentence of the first section as subtitle:

```typescript
// Extract subtitle from first section if it's an introduction
const firstSection = article.sections[0];
let subtitle: string | undefined;
if (firstSection?.content) {
  const textOnly = firstSection.content.replace(/<[^>]+>/g, '').trim();
  const firstSentence = textOnly.match(/^[^.!?]+[.!?]/)?.[0];
  if (firstSentence && firstSentence.length > 30 && firstSentence.length < 200) {
    subtitle = firstSentence;
  }
}

// Estimate read time
const totalText = article.sections.map(s => s.content.replace(/<[^>]+>/g, '')).join(' ');
const wordCount = totalText.split(/\s+/).length;
const readTime = `${Math.max(1, Math.round(wordCount / 200))} min`;

parts.push(this.buildHero(article.title, subtitle, { readTime }));
```

**Step 4: Add subtitle and meta CSS to ComponentStyles.ts**

```css
.article-subtitle {
  color: rgba(255, 255, 255, 0.85);
  font-size: 1.15rem;
  line-height: 1.6;
  margin-top: 1rem;
  max-width: 700px;
}

.article-meta {
  display: flex;
  gap: 1.5rem;
  margin-top: 1.25rem;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.875rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
```

**Step 5: Run tests, verify pass**

**Step 6: Commit**

```bash
git commit -m "feat(renderer): enrich hero section with subtitle and read time metadata"
```

---

## Phase 4: Quality Scoring Recalibration

Quality scores are misleading - 85% brand match for unstyled output. We need honest scoring that reflects actual visual quality.

### Task 5: Add Rendered Component Validation to Scoring

**Files:**
- Modify: `components/publishing/DesignQualityAssessment.tsx`
- Test: `e2e/visual-quality.spec.ts`

**Step 1: Write failing test**

```typescript
test('quality score penalizes sections where visual component renders as prose', async () => {
  const { analyzeDesignQuality } = await import(
    '../components/publishing/DesignQualityAssessment'
  );
  // Or if it's a default export, import accordingly

  // HTML with data-component="feature-grid" but no actual .feature-card elements
  const poorHtml = '<section data-component="feature-grid"><div class="prose"><p>Just text</p></div></section>';
  const css = '.feature-card { background: white; }';
  const result = analyzeDesignQuality(poorHtml, css);

  // Should detect that declared component isn't rendered
  expect(result.overallScore).toBeLessThan(50);
  expect(result.issues.some(i => i.id === 'visual-components-not-rendered')).toBe(true);
});
```

**Step 2: Recalibrate scoring in DesignQualityAssessment.tsx**

Key changes:
1. **Lower prose fallback scores**: When `visual-components-not-rendered` is detected, reduce componentVariety to 5 (was 15)
2. **Add CSS visual property validation**: Check that component CSS rules include `background`, `border`, `box-shadow` (not just structural properties)
3. **Add rendered HTML validation**: Verify `.feature-card`, `.timeline-item`, `.step-item` elements exist in HTML when corresponding components are declared
4. **Recalibrate weights**:
   - componentVariety: 0.25 (up from 0.15)
   - visualHierarchy: 0.20
   - layoutDesign: 0.20
   - engagement: 0.15
   - businessFit: 0.10
   - brandConsistency: 0.10

**Step 3: Run test, verify pass**

**Step 4: Commit**

```bash
git commit -m "fix(quality): recalibrate design quality scoring for honest visual assessment

Previously scored 85% for unstyled output because it measured HTML pattern
presence, not actual visual quality. Now validates that declared components
actually render with proper visual styling."
```

---

## Phase 5: compiledCss Integration Improvement

The AI-generated `compiledCss` uses `--ctc-*` CSS variables but ComponentStyles uses hardcoded hex values. When both exist, ComponentStyles always wins the cascade, losing AI-generated brand nuances (custom shadows, unique gradient angles, personality-specific hover effects).

### Task 6: Let compiledCss Override ComponentStyles for Matching Selectors

**Files:**
- Modify: `services/publishing/renderer/CleanArticleRenderer.ts` (generateCSS method)
- Test: `e2e/visual-quality.spec.ts`

**Step 1: Write failing test**

```typescript
test('compiledCss brand-specific properties override generic ComponentStyles', async () => {
  const { CleanArticleRenderer } = await import(
    '../services/publishing/renderer/CleanArticleRenderer'
  );

  const designDna = {
    colors: {
      primary: { hex: '#25368C' },
      neutrals: { lightest: '#f8f9fa', light: '#dee2e6', medium: '#6c757d', dark: '#212529', darkest: '#000000' },
    },
    typography: {
      headingFont: { family: 'Roboto', fallback: 'sans-serif', weight: 700 },
      bodyFont: { family: 'Roboto', fallback: 'sans-serif', weight: 400 },
    },
    shapes: { borderRadius: { small: '6px', medium: '6px', large: '6px' } },
    personality: { overall: 'corporate' },
  } as any;

  // compiledCss with brand-specific card shadow
  const compiledCss = '.card, .ctc-card { box-shadow: 0 10px 30px rgba(37, 54, 140, 0.15); }';

  const renderer = new CleanArticleRenderer(designDna, 'NFIR', undefined, compiledCss);
  const result = renderer.render({ title: 'Test', sections: [{ id: 's1', content: '<p>text</p>' }] });

  // The brand-specific shadow from compiledCss should appear AFTER componentCss
  // so it wins the cascade
  const lastCardShadow = result.css.lastIndexOf('0 10px 30px rgba(37, 54, 140, 0.15)');
  const componentCardShadow = result.css.indexOf('.card-elevation-1');
  expect(lastCardShadow).toBeGreaterThan(componentCardShadow);
});
```

**Step 2: Change CSS layer order in generateCSS()**

In `services/publishing/renderer/CleanArticleRenderer.ts` at the `generateCSS()` method (~line 1067), change the layer order:

```typescript
// NEW order: componentCss (generic visual base) → compiledCss (brand-specific overrides) → structuralCSS
return `${componentCss}\n\n/* === Brand-Specific Overrides (compiledCss) === */\n${this.compiledCss}\n\n${this.generateStructuralCSS()}`;
```

This way:
1. ComponentStyles provides the visual base (backgrounds, shadows, borders)
2. compiledCss overrides with brand-specific values (custom shadows, unique colors)
3. StructuralCSS adds layout primitives on top (no visual conflicts)

**Step 3: Run ALL tests to verify no regressions**

Run: `npx playwright test e2e/visual-quality.spec.ts`
Expected: ALL PASS (existing tests should still pass since ComponentStyles still provides base styles)

**Step 4: Run build**

Run: `npm run build`

**Step 5: Commit**

```bash
git commit -m "fix(css): reorder layers so compiledCss overrides ComponentStyles

ComponentStyles now provides visual base, compiledCss overrides with
brand-specific values. This preserves AI-generated brand nuances like
custom shadows and unique gradient angles."
```

---

## Phase 6: Content Pattern Detection for Semantic Components

The Layout Engine's `ComponentSelector` needs better rules for when to use our new components and when to upgrade plain prose to visual components.

### Task 7: Improve ComponentSelector Rules

**Files:**
- Modify: `services/layout-engine/ComponentSelector.ts`
- Test: `e2e/visual-quality.spec.ts`

**Step 1: Read ComponentSelector.ts to understand current rule structure**

Read `services/layout-engine/ComponentSelector.ts` entirely to find the `selectComponent()` method and understand the rule format.

**Step 2: Add rules for new components**

Add detection rules:
- **Introduction + first section** → `lead-paragraph` (confidence 0.8)
- **Content with risk/warning keywords** → `alert-box` (confidence 0.7)
- **Content with tip/note/info keywords** → `info-box` (confidence 0.6)
- **Short list of 3-5 items with benefits** → `feature-grid` over `checklist` (confidence 0.75)
- **Sequential content (eerste, vervolgens, daarna)** → `step-list` or `timeline` (confidence 0.7)

**Step 3: Write tests for component selection**

```typescript
test('ComponentSelector assigns alert-box for warning content', async () => {
  // Test that content containing "Waarschuwing:" or "Warning:" gets assigned alert-box
  // Implementation depends on ComponentSelector.ts interface
});
```

**Step 4: Implement and verify**

**Step 5: Commit**

```bash
git commit -m "feat(layout-engine): improve component selection rules for alert/info/lead patterns"
```

---

## Phase 7: Visual Validation Test Suite

Add comprehensive visual validation that catches the "structured but unstyled" issue before it reaches users.

### Task 8: Add CSS Visual Property Validation Test

**Files:**
- Modify: `e2e/visual-quality.spec.ts`

**Step 1: Add comprehensive CSS validation test**

```typescript
test('rendered article CSS provides visual styling for all used components', async () => {
  const result = await renderTestArticle({ withBlueprint: true, withCompiledCss: true });

  // Helper: check that a selector has real visual styling, not just structural
  function hasVisualStyling(css: string, selector: string): boolean {
    const nonMediaCss = css.replace(/@media[^{]*\{[^}]*(\{[^}]*\})*[^}]*\}/g, '');
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped + '\\s*\\{([^}]+)\\}', 'g');
    const matches = [...nonMediaCss.matchAll(regex)];
    if (matches.length === 0) return false;

    // Check that at least one definition includes visual properties
    return matches.some(m => {
      const props = m[1];
      return (
        props.includes('background') ||
        props.includes('border') ||
        props.includes('box-shadow') ||
        props.includes('color:')
      );
    });
  }

  // Every visual component must have visual CSS (not just structural)
  expect(hasVisualStyling(result.css, '.feature-card')).toBe(true);
  expect(hasVisualStyling(result.css, '.step-item')).toBe(true);
  expect(hasVisualStyling(result.css, '.faq-item')).toBe(true);
  expect(hasVisualStyling(result.css, '.timeline-number')).toBe(true);
  expect(hasVisualStyling(result.css, '.checklist-check')).toBe(true);
  expect(hasVisualStyling(result.css, '.card')).toBe(true);
  expect(hasVisualStyling(result.css, '.article-header')).toBe(true);

  // Brand colors must appear in rendered CSS
  expect(result.css).toContain('#0056b3');

  // CSS must have hover effects (agency quality indicator)
  expect(result.css).toMatch(/\.feature-card:hover/);
  expect(result.css).toMatch(/\.step-item:hover/);
  expect(result.css).toMatch(/\.faq-item:hover/);
});
```

**Step 2: Run test, verify pass**

**Step 3: Add HTML structure validation test**

```typescript
test('all blueprint components render as visual elements, not prose fallback', async () => {
  const result = await renderTestArticle({ withBlueprint: true });

  // Parse sections from HTML
  const sectionRegex = /<section[^>]*data-component="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g;
  const sections: Array<{ component: string; html: string }> = [];
  let match;
  while ((match = sectionRegex.exec(result.html)) !== null) {
    sections.push({ component: match[1], html: match[2] });
  }

  // Map of component type → expected HTML class in rendered output
  const componentIndicators: Record<string, string[]> = {
    'feature-grid': ['feature-card', 'feature-grid'],
    'step-list': ['step-item', 'step-number'],
    'timeline': ['timeline-item', 'timeline-number'],
    'faq-accordion': ['faq-item', 'faq-question'],
    'checklist': ['checklist-item', 'checklist-check'],
    'stat-highlight': ['stat-item', 'stat-value'],
    'alert-box': ['alert-box'],
    'info-box': ['info-box'],
  };

  for (const section of sections) {
    const indicators = componentIndicators[section.component];
    if (indicators) {
      const hasVisualStructure = indicators.some(cls => section.html.includes(cls));
      const hasProseFallback = section.html.includes('class="prose"') && !hasVisualStructure;

      if (hasProseFallback) {
        console.warn(`Section with component="${section.component}" rendered as prose fallback`);
      }
      // At minimum, visual components should have their expected HTML structure
      expect(hasVisualStructure || !hasProseFallback).toBeTruthy();
    }
  }
});
```

**Step 4: Commit**

```bash
git commit -m "test(visual): add comprehensive CSS visual property and HTML structure validation"
```

---

## Phase 8: Remove Hardcoded NFIR Patterns

ComponentStyles.ts has NFIR-specific patterns hardcoded (navy hero, orange last-step, repeating gradient bars). These should be driven by brand config, not hardcoded.

### Task 9: Make Visual Patterns Brand-Configurable

**Files:**
- Modify: `services/publishing/renderer/ComponentStyles.ts`

**Step 1: Identify NFIR-specific patterns**

Search ComponentStyles.ts for comments containing "NFIR" and hardcoded patterns:
- Line ~116-123: "NFIR signature" light blue background gradient
- Line ~209-229: "NFIR style" dark navy hero
- Line ~222-229: Repeating gradient bar (blue-orange dash pattern)
- Line ~319-341: Hero emphasis with repeating gradient
- Line ~437-455: Featured section repeating gradient
- Line ~674-688: Orange last-step accent

**Step 2: Replace NFIR patterns with personality-driven alternatives**

Replace the NFIR-specific patterns with personality-parameter decisions:

- **Hero background**: Use `navyDark` (already derived from primary), good for all brands
- **Repeating gradient bar**: Only show for `corporate` and `bold` personalities. For others, use a simple solid line in the primary color
- **Last-step orange accent**: Only apply when accent color differs significantly from primary (color distance check). Otherwise, use a subtle shade of primary

**Step 3: Run full test suite + visual inspection**

**Step 4: Commit**

```bash
git commit -m "refactor(styles): replace NFIR-specific patterns with brand-adaptive alternatives

Repeating gradient bars now only appear for corporate/bold personalities.
Last-step accent coloring adapts based on actual accent color.
Hero gradient uses derived dark color from any brand's primary."
```

---

## Execution Summary

| Phase | Tasks | What It Fixes |
|-------|-------|---------------|
| Phase 1 | Tasks 1-2 | Missing content components (alert, info, lead) |
| Phase 2 | Task 3 | Generic visual personality (one-size-fits-all) |
| Phase 3 | Task 4 | Empty hero section (title only) |
| Phase 4 | Task 5 | Misleading quality scores |
| Phase 5 | Task 6 | AI brand CSS overridden by generic styles |
| Phase 6 | Task 7 | Wrong component assignment for new types |
| Phase 7 | Task 8 | No visual validation test coverage |
| Phase 8 | Task 9 | NFIR-specific hardcoded patterns |

**Total: 9 tasks across 8 phases.**

Each task is independently valuable and can be shipped separately. Tasks 1-2 (new components) have the highest visual impact. Task 6 (CSS reorder) has the highest brand-fidelity impact. Task 5 (scoring) prevents false user confidence.

---

## Dependencies Between Tasks

```
Task 1 (alert/info components) ← Task 2 (pattern detection) ← Task 7 (ComponentSelector rules)
Task 3 (personality styles) ← Task 9 (remove NFIR hardcoding)
Task 4 (hero enrichment) - independent
Task 5 (scoring recalibration) - independent
Task 6 (CSS layer reorder) - independent
Task 8 (validation tests) ← Task 1 (needs new components to exist)
```

**Recommended execution order:** 1 → 4 → 6 → 3 → 2 → 5 → 7 → 8 → 9

This order maximizes visual impact early (Task 1 adds components, Task 4 enriches hero, Task 6 fixes CSS precedence) before tackling detection (Task 2, 7) and validation (Task 5, 8).
