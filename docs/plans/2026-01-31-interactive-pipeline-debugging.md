# Interactive Brand Replication Pipeline Debugging Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. CRITICAL: Every task produces visual output (screenshot or rendered HTML). Show the user EACH checkpoint and WAIT for their "continue" or "fix" response before proceeding. Use `webapp-testing` skill for Playwright operations.

**Goal:** Debug the brand replication pipeline step-by-step with the user deciding at every checkpoint whether output is acceptable. Each checkpoint produces visual evidence. Nothing proceeds without user approval.

**Architecture:** The pipeline flows: User enters brand URL → BrandDiscoveryService (Apify screenshot + DOM extraction) → AIDesignAnalyzer (DesignDNA from screenshot) → DOM/AI color merge → BrandDesignSystemGenerator (AI CSS) → LayoutEngine (section blueprint) → CleanArticleRenderer (HTML) → PreviewStep (display). We debug each stage in isolation, showing the user what that stage produced, before moving to the next.

**Tech Stack:** React 18, TypeScript, Vite, Playwright, Supabase, Gemini/Anthropic AI

**Test Brand:** https://www.resultaatmakers.online

---

## Execution Rules

1. **NEVER skip a checkpoint.** Every one must be shown to the user.
2. **NEVER assume "good enough."** The user explicitly says "continue" or "fix."
3. **If "fix" → apply fix → re-show the SAME checkpoint.** Don't advance until approved.
4. **Visual output is MANDATORY.** Every checkpoint produces a screenshot or rendered HTML.
5. **One checkpoint at a time.** Don't batch. Show one, wait for user response.
6. **Save all evidence.** Screenshots to `tmp/debug/`, data to `tmp/debug/`.

---

## Task 1: Setup — Ensure Dev Server Runs and Playwright Can Connect

**Files:**
- Read: `playwright.config.ts`
- Read: `e2e/` (any existing spec for reference)
- Create: `e2e/debug-pipeline.spec.ts`

**Step 1: Ensure dev server is running**

Run: `npm run dev`
Expected: Vite dev server starts on http://localhost:5173 (or 3000)

**Step 2: Create the debug test harness**

This is a Playwright spec that we'll extend checkpoint by checkpoint. It uses `page.evaluate()` to extract React state from the running app.

```typescript
// e2e/debug-pipeline.spec.ts
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const DEBUG_DIR = path.join(__dirname, '..', 'tmp', 'debug');
const BRAND_URL = 'https://www.resultaatmakers.online';

// Ensure debug directory exists
test.beforeAll(() => {
  fs.mkdirSync(DEBUG_DIR, { recursive: true });
});

function debugPath(name: string) {
  return path.join(DEBUG_DIR, name);
}

test.describe('Pipeline Debug - Phase 1: App Navigation', () => {
  test('1.1 - App loads and shows login', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: debugPath('1_1_app_loads.png'), fullPage: true });
  });
});
```

**Step 3: Create debug output directory**

Run: `mkdir -p tmp/debug` (or `mkdir tmp\debug` on Windows)
Expected: Directory created

**Step 4: Run the first checkpoint**

Run: `npx playwright test e2e/debug-pipeline.spec.ts --headed --timeout 120000`
Expected: Browser opens, screenshot saved to `tmp/debug/1_1_app_loads.png`

**Step 5: Show user the screenshot**

Show: `tmp/debug/1_1_app_loads.png`
Ask: "Does the app load correctly? Continue or fix?"

---

## Task 2: Checkpoint 1.2 — Login and Navigate to Topic with Draft

**Files:**
- Modify: `e2e/debug-pipeline.spec.ts`

**Step 1: Add login + navigation test**

Add to the spec:

```typescript
test('1.2 - Login and navigate to project with draft', async ({ page }) => {
  // Login
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Fill login form (adjust selectors to match actual UI)
  await page.fill('input[type="email"]', 'richard@kjenmarks.nl');
  await page.fill('input[type="password"]', 'pannekoek');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: debugPath('1_2a_after_login.png'), fullPage: true });

  // Navigate to Resultaatmakers project (click on it)
  // Look for project card/link containing "Resultaatmakers"
  const projectLink = page.locator('text=Resultaatmakers').first();
  if (await projectLink.isVisible()) {
    await projectLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: debugPath('1_2b_project.png'), fullPage: true });

  // Open topical map (click first available map)
  const mapLink = page.locator('[data-testid="map-item"], .map-card, .topical-map-link').first();
  if (await mapLink.isVisible()) {
    await mapLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: debugPath('1_2c_map.png'), fullPage: true });

  // Select a topic that has a draft
  // Look for topic nodes or list items
  const topicNode = page.locator('.topic-node, [data-testid="topic"]').first();
  if (await topicNode.isVisible()) {
    await topicNode.click();
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: debugPath('1_2d_topic_selected.png'), fullPage: true });
});
```

**Step 2: Run checkpoint**

Run: `npx playwright test e2e/debug-pipeline.spec.ts -g "1.2" --headed --timeout 120000`
Expected: Screenshots saved: `1_2a_after_login.png`, `1_2b_project.png`, `1_2c_map.png`, `1_2d_topic_selected.png`

**Step 3: Show user ALL 4 screenshots**

Show: Each screenshot in sequence
Ask: "Can you see the project, map, and a topic with a draft? Continue or fix?"

**NOTE:** The selectors above are best-guesses. After seeing the actual screenshots, adjust selectors to match the real UI. This is expected — the debug spec is iterative.

---

## Task 3: Checkpoint 1.3 — Open Style & Publish Modal

**Files:**
- Modify: `e2e/debug-pipeline.spec.ts`

**Step 1: Add Style & Publish modal opening**

```typescript
test('1.3 - Open Style & Publish modal', async ({ page }) => {
  // [Reuse login + navigation from 1.2]
  // ... (copy login/nav steps)

  // Find and click "Style & Publish" or "Draft" button
  // First check if we need to open the brief/draft panel
  const draftTab = page.locator('text=Draft, button:has-text("Draft")').first();
  if (await draftTab.isVisible()) {
    await draftTab.click();
    await page.waitForTimeout(2000);
  }

  // Look for Style & Publish button
  const styleBtn = page.locator('button:has-text("Style"), button:has-text("Publish"), [data-testid="style-publish"]').first();
  await styleBtn.waitFor({ state: 'visible', timeout: 10000 });
  await styleBtn.click();
  await page.waitForTimeout(2000);

  await page.screenshot({ path: debugPath('1_3_style_modal.png'), fullPage: true });
});
```

**Step 2: Run and show**

Run: `npx playwright test e2e/debug-pipeline.spec.ts -g "1.3" --headed --timeout 120000`
Show: `tmp/debug/1_3_style_modal.png`
Ask: "Does the Style & Publish modal show correctly with the Brand Intelligence step visible? Continue or fix?"

---

## Task 4: Checkpoint 2.1-2.5 — Brand Discovery (Screenshot + DOM Extraction)

**Files:**
- Modify: `e2e/debug-pipeline.spec.ts`
- Modify: `hooks/useBrandDetection.ts` (add console.log data extraction points)

**Step 1: Add console logging to useBrandDetection for data extraction**

At the end of the `detect()` function in `hooks/useBrandDetection.ts`, after the discovery report is received (around line 91), add:

```typescript
// DEBUG: Expose discovery data for pipeline debugging
console.log('[DEBUG_PIPELINE] discovery_report', JSON.stringify({
  screenshotLength: discoveryResult.screenshotBase64?.length || 0,
  findings: discoveryResult.findings,
  googleFontsUrl: discoveryResult.googleFontsUrl,
  discoveredUrls: discoveryResult.discoveredUrls,
}, null, 2));
```

After AI DesignDNA extraction (around line 120), add:

```typescript
console.log('[DEBUG_PIPELINE] design_dna_raw', JSON.stringify(dnaResult.designDna, null, 2));
```

After the DOM/AI merge (around line 148), add:

```typescript
console.log('[DEBUG_PIPELINE] design_dna_merged', JSON.stringify(dnaResult.designDna, null, 2));
```

After design system generation (around line 197), add:

```typescript
console.log('[DEBUG_PIPELINE] design_system', JSON.stringify({
  compiledCssLength: designSystem.compiledCss?.length || 0,
  tokensCssLength: designSystem.tokens?.css?.length || 0,
  tokensJson: designSystem.tokens?.json,
  componentStyleKeys: Object.keys(designSystem.componentStyles || {}),
  hasDecorative: !!designSystem.decorative,
  hasInteractions: !!designSystem.interactions,
  googleFontsImport: designSystem.compiledCss?.match(/@import url\([^)]+\)/)?.[0] || 'NONE',
}, null, 2));
```

**Step 2: Add Playwright test for brand detection with console capture**

```typescript
test('2.1-2.5 - Brand Discovery full inspection', async ({ page }) => {
  const consoleLogs: { type: string; text: string }[] = [];
  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  // [Login + navigate + open modal - reuse from previous]
  // ...

  // Enter brand URL
  const urlInput = page.locator('input[placeholder*="url"], input[placeholder*="URL"], input[type="url"]').first();
  await urlInput.fill(BRAND_URL);
  await page.screenshot({ path: debugPath('2_1_url_entered.png') });

  // Click detect button
  const detectBtn = page.locator('button:has-text("Detect"), button:has-text("Extract"), button:has-text("Analyze")').first();
  await detectBtn.click();

  // Wait for detection to complete (watch progress bar or status text)
  // This can take 30-90 seconds due to Apify
  await page.waitForTimeout(5000);
  await page.screenshot({ path: debugPath('2_1_detecting.png') });

  // Wait for completion (look for completion indicator)
  await page.waitForFunction(() => {
    // Check if progress is 100% or detection completed
    const progressText = document.querySelector('[class*="progress"], [role="progressbar"]');
    const completedText = document.body.innerText;
    return completedText.includes('Detection complete') ||
           completedText.includes('Brand detected') ||
           completedText.includes('100%');
  }, { timeout: 120000 });

  await page.screenshot({ path: debugPath('2_2_detection_complete.png'), fullPage: true });

  // Extract screenshot base64 from page state
  const screenshotData = await page.evaluate(() => {
    // Access React state via DOM - find the modal's internal state
    const imgs = document.querySelectorAll('img[src^="data:image"]');
    if (imgs.length > 0) {
      return (imgs[0] as HTMLImageElement).src;
    }
    return null;
  });

  if (screenshotData) {
    // Save the brand screenshot as a file
    const base64 = screenshotData.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(debugPath('2_2_brand_screenshot.png'), Buffer.from(base64, 'base64'));
  }

  // Extract debug data from console logs
  const discoveryLog = consoleLogs.find(l => l.text.includes('[DEBUG_PIPELINE] discovery_report'));
  const dnaRawLog = consoleLogs.find(l => l.text.includes('[DEBUG_PIPELINE] design_dna_raw'));
  const dnaMergedLog = consoleLogs.find(l => l.text.includes('[DEBUG_PIPELINE] design_dna_merged'));
  const designSystemLog = consoleLogs.find(l => l.text.includes('[DEBUG_PIPELINE] design_system'));

  // Save all extracted data
  const extractData = (log: { text: string } | undefined) => {
    if (!log) return null;
    try {
      const jsonStr = log.text.replace(/^\[DEBUG_PIPELINE\]\s+\w+\s*/, '');
      return JSON.parse(jsonStr);
    } catch { return log.text; }
  };

  const debugData = {
    discovery: extractData(discoveryLog),
    designDnaRaw: extractData(dnaRawLog),
    designDnaMerged: extractData(dnaMergedLog),
    designSystem: extractData(designSystemLog),
    allConsoleLogs: consoleLogs.filter(l =>
      l.text.includes('[Brand') ||
      l.text.includes('[DEBUG') ||
      l.text.includes('Error') ||
      l.type === 'error'
    ),
  };

  fs.writeFileSync(
    debugPath('2_all_pipeline_data.json'),
    JSON.stringify(debugData, null, 2)
  );

  // Save console errors separately
  const errors = consoleLogs.filter(l => l.type === 'error');
  fs.writeFileSync(
    debugPath('2_console_errors.json'),
    JSON.stringify(errors, null, 2)
  );
});
```

**Step 3: Run detection checkpoint**

Run: `npx playwright test e2e/debug-pipeline.spec.ts -g "2.1-2.5" --headed --timeout 180000`
Expected: Screenshots + JSON data files in `tmp/debug/`

**Step 4: Show user — Checkpoint 2.1**
Show: `tmp/debug/2_1_url_entered.png` and `tmp/debug/2_1_detecting.png`
Ask: "Does detection start correctly? Continue or fix?"

**Step 5: Show user — Checkpoint 2.2 (Brand Screenshot)**
Show: `tmp/debug/2_2_brand_screenshot.png`
Ask: "Is this a good screenshot of resultaatmakers.online? No cookie dialogs? Page loaded? Continue or fix?"

**Step 6: Show user — Checkpoint 2.3 (DOM Colors)**
Read: `tmp/debug/2_all_pipeline_data.json` → `discovery.findings`
Format as table and show colors with hex values
Ask: "Are these the correct brand colors? Compare to the screenshot. Continue or fix?"

**Step 7: Show user — Checkpoint 2.4 (Fonts)**
Read: `tmp/debug/2_all_pipeline_data.json` → `discovery.findings` (typography section)
Show: Font families, Google Fonts URL if detected
Ask: "Correct fonts detected? Continue or fix?"

**Step 8: Show user — Checkpoint 2.5 (URLs + Components)**
Read: `tmp/debug/2_all_pipeline_data.json` → `discovery.discoveredUrls`
Show: List of discovered URLs and component patterns
Ask: "Reasonable URL discovery? Continue or fix?"

---

## Task 5: Checkpoint 3.1-3.4 — AI DesignDNA Inspection

**Files:**
- Read: `tmp/debug/2_all_pipeline_data.json`

**Step 1: Show user — Checkpoint 3.1 (Raw DesignDNA Colors)**
Read: `tmp/debug/2_all_pipeline_data.json` → `designDnaRaw.colors`
Format as visual table:
```
| Property     | Hex     | Confidence | Swatch |
|-------------|---------|------------|--------|
| primary     | #1e73be | 0.9        | ██████ |
| secondary   | #1f2937 | 0.8        | ██████ |
| accent      | #f59e0b | 0.7        | ██████ |
| primaryLight| #?????? | 0.8        | ██████ |
```
Ask: "Do these AI-detected colors match the brand? Specifically: Is primary right? Is accent real (not black/white)? Is primaryLight visible? Continue or fix?"

**Step 2: Show user — Checkpoint 3.2 (Typography)**
Read: `designDnaRaw.typography`
Show:
- headingFont: family, weight
- bodyFont: family, weight
- typeScale: ratio, baseSize
Ask: "Correct fonts from AI vision? Continue or fix?"

**Step 3: Show user — Checkpoint 3.3 (Personality)**
Read: `designDnaRaw.personality`
Show:
- overall: "corporate" / "playful" / etc.
- dimensions: modern↔classic, bold↔subtle, etc.
Ask: "Does this match Resultaatmakers brand personality? Continue or fix?"

**Step 4: Show user — Checkpoint 3.4 (Merge Comparison)**
Read: `designDnaRaw` vs `designDnaMerged`
Show side-by-side:
```
| Property | AI Original | After DOM Merge | Changed? |
|----------|------------|-----------------|----------|
| primary  | #2563eb    | #1e73be         | YES ✓    |
| accent   | #000000    | #f59e0b         | YES ✓    |
```
Ask: "Did the merge improve accuracy? Continue or fix?"

---

## Task 6: Checkpoint 4.1-4.5 — CSS Generation Inspection

**Files:**
- Modify: `e2e/debug-pipeline.spec.ts`
- Create: `tmp/debug/css_test_page.html` (generated dynamically)

**Step 1: Extract CSS tokens from design system data**

Read: `tmp/debug/2_all_pipeline_data.json` → `designSystem.tokensJson`
This contains all `--ctc-*` variable definitions.

**Step 2: Show user — Checkpoint 4.1 (CSS Tokens)**
Format the `:root` block visually:
```
--ctc-primary:       #1e73be  ██████
--ctc-primary-light: #?????   ██████  ← Is this a visible tint or #ffffff?
--ctc-primary-dark:  #?????   ██████
--ctc-secondary:     #1f2937  ██████
--ctc-accent:        #f59e0b  ██████  ← Is this real or #000000?
--ctc-font-heading:  "Poppins", sans-serif
--ctc-font-body:     "Open Sans", sans-serif
Google Fonts @import: [present/missing]
```
Ask: "Are CSS tokens correct? Primary matches brand? PrimaryLight visible? Accent real? Fonts imported? Continue or fix?"

**Step 3: Build component test pages for Checkpoint 4.2**

For each component type, create a standalone HTML page that renders a sample with the brand CSS, then screenshot with Playwright.

Add to the Playwright spec:

```typescript
test('4.2 - Render individual components', async ({ page }) => {
  // Read the compiled CSS from previous detection
  const pipelineData = JSON.parse(
    fs.readFileSync(debugPath('2_all_pipeline_data.json'), 'utf8')
  );

  // We need the full compiledCss - extract from the app state
  // Since compiledCss is too large for console.log, inject extraction script

  // For each component, create minimal HTML and screenshot
  const components = [
    { name: 'button', html: `
      <div style="padding: 40px; background: #f5f5f5;">
        <h2>Button Component</h2>
        <button class="ctc-button">Primary Button</button>
        <button class="ctc-button ctc-button-secondary">Secondary Button</button>
        <button class="ctc-button ctc-button-accent">Accent Button</button>
      </div>` },
    { name: 'card', html: `
      <div style="padding: 40px; background: #f5f5f5;">
        <h2>Card Component</h2>
        <div class="ctc-card card">
          <h3 class="ctc-card-title">Card Title</h3>
          <p class="ctc-card-body">This is a sample card with brand styling applied.
          It should have proper shadows, border radius, and colors matching the brand.</p>
        </div>
      </div>` },
    { name: 'hero', html: `
      <div style="padding: 0;">
        <div class="ctc-hero hero section has-background bg-gradient emphasis-hero">
          <h1>Hero Section Heading</h1>
          <p>This is the hero section with full-width background treatment.</p>
        </div>
      </div>` },
    { name: 'feature-grid', html: `
      <div style="padding: 40px;">
        <h2>Feature Grid</h2>
        <div class="feature-grid columns-3-column">
          <div class="feature-item card"><h3>Feature 1</h3><p>Description of feature one with enough text to see layout.</p></div>
          <div class="feature-item card"><h3>Feature 2</h3><p>Description of feature two with enough text to see layout.</p></div>
          <div class="feature-item card"><h3>Feature 3</h3><p>Description of feature three with enough text to see layout.</p></div>
        </div>
      </div>` },
    { name: 'faq', html: `
      <div style="padding: 40px;">
        <h2>FAQ Section</h2>
        <div class="faq-list">
          <div class="faq-item"><div class="faq-question"><span class="faq-icon">▸</span>What is this service?</div><div class="faq-answer">This is the answer to the first question.</div></div>
          <div class="faq-item"><div class="faq-question"><span class="faq-icon">▸</span>How does it work?</div><div class="faq-answer">This is the answer to the second question.</div></div>
        </div>
      </div>` },
    { name: 'steps-list', html: `
      <div style="padding: 40px;">
        <h2>Steps List</h2>
        <div class="steps-list">
          <div class="step-item"><div class="step-number">1</div><div class="step-content"><h3>First Step</h3><p>Do this first thing.</p></div></div>
          <div class="step-item"><div class="step-number">2</div><div class="step-content"><h3>Second Step</h3><p>Then do this.</p></div></div>
          <div class="step-item"><div class="step-number">3</div><div class="step-content"><h3>Third Step</h3><p>Finally, do this.</p></div></div>
        </div>
      </div>` },
    { name: 'table', html: `
      <div style="padding: 40px;">
        <h2>Table Component</h2>
        <table class="styled-table">
          <thead><tr><th>Feature</th><th>Basic</th><th>Pro</th></tr></thead>
          <tbody>
            <tr><td>Storage</td><td>10GB</td><td>100GB</td></tr>
            <tr><td>Users</td><td>1</td><td>Unlimited</td></tr>
            <tr><td>Support</td><td>Email</td><td>24/7 Phone</td></tr>
          </tbody>
        </table>
      </div>` },
    { name: 'testimonial', html: `
      <div style="padding: 40px;">
        <h2>Testimonial</h2>
        <blockquote class="testimonial">
          <p>"This service transformed our business. The results were immediate and measurable."</p>
          <cite>— Jan de Vries, CEO at ExampleCorp</cite>
        </blockquote>
      </div>` },
  ];

  for (const comp of components) {
    // We'll need compiledCss injected - load from file if saved
    // For now, create page with inline CSS from the app
    const testHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style id="brand-css">/* CSS will be injected from app state */</style>
</head><body>${comp.html}</body></html>`;

    fs.writeFileSync(debugPath(`4_2_test_${comp.name}.html`), testHtml);
    await page.goto(`file://${debugPath(`4_2_test_${comp.name}.html`)}`);

    // Inject the compiled CSS from the running app
    // (Alternative: save compiledCss to file in previous step and load it here)
    await page.waitForTimeout(500);
    await page.screenshot({ path: debugPath(`4_2_component_${comp.name}.png`) });
  }
});
```

**Step 4: Show user — Checkpoint 4.2 (Component by Component)**
Show EACH component screenshot one at a time:
- `4_2_component_button.png` → Ask: "Does this button look like the brand? Continue or fix?"
- `4_2_component_card.png` → Ask: "Card styling correct? Continue or fix?"
- `4_2_component_hero.png` → Ask: "Hero section has brand colors/gradient? Continue or fix?"
- `4_2_component_feature-grid.png` → Ask: "Feature grid multi-column? Branded? Continue or fix?"
- `4_2_component_faq.png` → Ask: "FAQ visually clear? Continue or fix?"
- `4_2_component_steps-list.png` → Ask: "Steps numbered and styled? Continue or fix?"
- `4_2_component_table.png` → Ask: "Table branded with header styling? Continue or fix?"
- `4_2_component_testimonial.png` → Ask: "Testimonial styled nicely? Continue or fix?"

**Step 5: Show user — Checkpoint 4.5 (CSS Summary Stats)**
Read: designSystem data
Show:
```
Compiled CSS size:    XX KB
CSS selectors:        XX
CSS variables defined: XX
CSS variables used:    XX
Undefined variables:   [list any]
Duplicate selectors removed: XX
Google Fonts @import:  [present: url | MISSING]
```
Ask: "CSS stats look healthy? Continue or fix?"

---

## Task 7: Checkpoint 5.1-5.4 — Layout Blueprint Inspection

**Files:**
- Modify: `hooks/useBrandDetection.ts` or `components/publishing/StylePublishModal.tsx` (add layout engine debug logging)

**Step 1: Add debug logging to layout engine output**

In `components/publishing/StylePublishModal.tsx`, find `generateLayoutEngineBlueprint()` function. After the blueprint is generated, add:

```typescript
console.log('[DEBUG_PIPELINE] layout_blueprint', JSON.stringify({
  sectionCount: result.sections.length,
  sections: result.sections.map(s => ({
    id: s.id,
    heading: s.heading,
    headingLevel: s.headingLevel,
    contentType: s.contentType,
    semanticWeight: s.semanticWeight,
    component: s.component,
    emphasis: s.emphasis,
    layout: s.layout,
    contentZone: s.contentZone,
    cssClasses: s.cssClasses,
  })),
  validation: result.validation,
}, null, 2));
```

**Step 2: Run detection again to capture layout data**

Run: Same Playwright test but extended to reach the layout step
Expected: Console log with `[DEBUG_PIPELINE] layout_blueprint` captured

**Step 3: Show user — Checkpoint 5.1 (Section Analysis Table)**
Format as table:
```
| # | Heading              | Content Type | Weight | Component       | Emphasis  | Layout      |
|---|----------------------|-------------|--------|-----------------|-----------|-------------|
| 1 | Inleiding            | prose       | 3      | prose           | standard  | medium/1col |
| 2 | Wat is SEO?          | explanation | 5      | hero-box        | hero      | full/1col   |
| 3 | Voordelen            | list        | 4      | feature-grid    | featured  | wide/3col   |
| ...                                                                                          |
```
Ask: "For EACH section: Is the content type correct? Is the component choice appropriate? Is the weight right? Continue or fix?"

**Step 4: Show user — Checkpoint 5.2 (Component Selections)**
For each section, show:
- Heading text
- Selected component + confidence + reasoning
- Alternative component
Ask per section: "Right component for this content? Continue or fix?"

**Step 5: Show user — Checkpoint 5.3 (Emphasis)**
For each section, show:
- Emphasis level assigned
- What that means visually (heading size, background, elevation)
Ask: "Does the emphasis hierarchy make sense? Hero for most important? Minimal for supplements? Continue or fix?"

**Step 6: Show user — Checkpoint 5.4 (Layout Params)**
For each section, show:
- Width: narrow/medium/wide/full
- Columns: 1/2/3
- Spacing: tight/normal/generous/dramatic
Ask: "Should hero be full-width? Should feature grids be multi-column? Continue or fix?"

---

## Task 8: Checkpoint 6.1 — Render Each Section Individually

**Files:**
- Create: `e2e/debug-sections.spec.ts`

**Step 1: Extract individual section HTML from the rendered output**

After the preview is generated in the app, extract each `<section>` from the HTML output and render them individually with the brand CSS.

```typescript
test('6.1 - Render individual sections', async ({ page }) => {
  // After full pipeline has run and preview is generated...

  // Extract the preview HTML and CSS from the page state
  const previewData = await page.evaluate(() => {
    // Find the preview iframe or container
    const iframe = document.querySelector('iframe');
    if (iframe?.contentDocument) {
      const sections = iframe.contentDocument.querySelectorAll('section, [class*="section"]');
      const css = iframe.contentDocument.querySelector('style')?.textContent || '';
      return {
        sections: Array.from(sections).map((s, i) => ({
          index: i,
          heading: s.querySelector('h1,h2,h3,h4')?.textContent || `Section ${i}`,
          html: s.outerHTML,
          classes: s.className,
        })),
        css: css,
      };
    }
    return null;
  });

  if (!previewData) {
    console.log('Could not extract preview data');
    return;
  }

  // Save CSS
  fs.writeFileSync(debugPath('6_compiled_css.css'), previewData.css);

  // Render each section standalone
  for (const section of previewData.sections) {
    const sectionHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>${previewData.css}</style>
<style>body { margin: 0; padding: 20px; background: #fafafa; }</style>
</head><body>
<div class="article-content">
  ${section.html}
</div>
</body></html>`;

    const filename = `6_1_section_${section.index}_${section.heading.replace(/[^a-z0-9]/gi, '_').substring(0, 30)}`;
    fs.writeFileSync(debugPath(`${filename}.html`), sectionHtml);

    await page.goto(`file://${debugPath(`${filename}.html`)}`);
    await page.waitForTimeout(500);
    await page.screenshot({ path: debugPath(`${filename}.png`), fullPage: true });
  }
});
```

**Step 2: Show user EACH section screenshot, one at a time**

For each section:
Show: Screenshot + metadata (heading, component type, emphasis level, layout)
Ask: "Does this section look good? Brand colors? Fonts? Spacing? Component correct? Continue or fix?"

If user says "fix" → identify the issue (CSS? HTML? Layout?) → fix → re-render → show again

---

## Task 9: Checkpoint 6.2-6.3 — Full Page + Responsive

**Files:**
- Modify: `e2e/debug-pipeline.spec.ts`

**Step 1: Screenshot the full assembled page**

```typescript
test('6.2 - Full page assembled', async ({ page }) => {
  // Navigate to preview step (after all previous steps completed)
  // Find the preview iframe
  const iframe = page.frameLocator('iframe').first();

  // Desktop screenshot
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.screenshot({ path: debugPath('6_2_full_desktop.png'), fullPage: true });

  // Tablet screenshot
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: debugPath('6_3_responsive_tablet.png'), fullPage: true });

  // Mobile screenshot
  await page.setViewportSize({ width: 375, height: 700 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: debugPath('6_3_responsive_mobile.png'), fullPage: true });
});
```

**Step 2: Show user — Checkpoint 6.2**
Show: `6_2_full_desktop.png`
Ask: "Does the full page flow well? Consistent hierarchy? Visual variety? Continue or fix?"

**Step 3: Show user — Checkpoint 6.3**
Show: All 3 responsive screenshots side by side
Ask: "Responsive layout working on tablet and mobile? Continue or fix?"

---

## Task 10: Checkpoint 7.1-7.3 — Final Audit

**Step 1: Show user — Checkpoint 7.1 (Brand Comparison)**
Show side by side:
- LEFT: `tmp/debug/2_2_brand_screenshot.png` (Apify screenshot of brand website)
- RIGHT: `tmp/debug/6_2_full_desktop.png` (our generated article)
Ask: "Does it feel like the same brand? What gaps remain?"

**Step 2: Show user — Checkpoint 7.2 (Console Errors)**
Read: `tmp/debug/2_console_errors.json`
Show: All errors/warnings from the entire flow
Ask: "Any errors that need fixing?"

**Step 3: Show user — Checkpoint 7.3 (Sign-off)**
Ask: "Is the output acceptable? Options:
1. **Accept** — Commit debug improvements and document results
2. **Loop back** — Identify remaining issues and revisit specific phase
3. **Start over** — Reset and try with different brand URL"

---

## Execution Order

**Sequential, one checkpoint at a time:**

```
Task 1 (Setup)
  → Checkpoint 1.1 (App loads) → User: continue/fix
  → Task 2: Checkpoint 1.2 (Navigate) → User: continue/fix
  → Task 3: Checkpoint 1.3 (Modal) → User: continue/fix
  → Task 4: Checkpoints 2.1-2.5 (Brand Discovery) → User per checkpoint
  → Task 5: Checkpoints 3.1-3.4 (DesignDNA) → User per checkpoint
  → Task 6: Checkpoints 4.1-4.5 (CSS) → User per component
  → Task 7: Checkpoints 5.1-5.4 (Layout) → User per section
  → Task 8: Checkpoint 6.1 (Sections individually) → User per section
  → Task 9: Checkpoints 6.2-6.3 (Full page + responsive) → User: continue/fix
  → Task 10: Checkpoints 7.1-7.3 (Final audit) → User: accept/loop/restart
```

**Total checkpoints: ~25+ (more if article has many sections)**
**Each checkpoint: visual evidence → user decision → proceed or fix**
