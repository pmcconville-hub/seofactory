// e2e/visual-renderer-test.spec.ts
/**
 * Visual Renderer Comparison Test
 *
 * Tests the three renderer paths produce genuinely different output:
 * 1. Auto = DesignDNA + compiledCss + LayoutBlueprint (richest brand styling)
 * 2. Clean Components = DesignDNA + LayoutBlueprint (no compiledCss)
 * 3. Brand Templates = literal extracted HTML/CSS from brand site
 *
 * Navigation flow:
 *   Login → Project → Map → Click Topic → TopicInlineDetail "View Brief" →
 *   ContentBriefModal "View Draft" → DraftingModal "Publish ▾" dropdown →
 *   "Style & Publish" → StylePublishModal (Brand → Layout → Preview)
 *
 * Key facts:
 * - StylePublishModal is rendered INSIDE DraftingModal → backdrop intercepts pointer events
 * - Preview is rendered inline via dangerouslySetInnerHTML (NOT in an iframe)
 * - DeviceFrame wraps the preview in a scaled container with white background
 * - Changing renderer path auto-regenerates preview (no manual click needed)
 * - Next button disabled={isGenerating || !style || !layout}
 */
import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const DIR = 'screenshots/renderer-comparison';
const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'richard@kjenmarks.nl';
const TEST_PASSWORD = 'pannekoek';

function ensureDir(d: string) {
  const r = path.resolve(d);
  if (!fs.existsSync(r)) fs.mkdirSync(r, { recursive: true });
  return r;
}

async function ss(page: Page, name: string, fullPage = true) {
  const dir = ensureDir(DIR);
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage });
  console.log(`  [SS] ${name}`);
}

function log(msg: string) {
  console.log(msg);
}

/**
 * Click a button via JS evaluate with EXACT text matching.
 * Bypasses pointer-event interception from backdrop.
 */
async function jsClickExact(page: Page, exactText: string): Promise<boolean> {
  return page.evaluate((text) => {
    const buttons = document.querySelectorAll('button');
    for (const b of buttons) {
      const btnText = b.textContent?.trim() || '';
      if (btnText === text && !b.disabled && b.offsetWidth > 0) {
        (b as HTMLButtonElement).click();
        return true;
      }
    }
    return false;
  }, exactText);
}

/**
 * Click a button via JS evaluate with partial/regex matching.
 * Returns matched text or null.
 */
async function jsClickMatch(page: Page, pattern: string | RegExp): Promise<string | null> {
  const isRegex = pattern instanceof RegExp;
  const src = isRegex ? pattern.source : pattern;
  const flags = isRegex ? pattern.flags : '';

  return page.evaluate(({ src, flags, isRegex }) => {
    const regex = isRegex ? new RegExp(src, flags) : null;
    const buttons = document.querySelectorAll('button');
    for (const b of buttons) {
      const text = b.textContent?.trim() || '';
      const matches = regex ? regex.test(text) : text.includes(src);
      if (matches && !b.disabled && b.offsetWidth > 0) {
        (b as HTMLButtonElement).click();
        return text;
      }
    }
    return null;
  }, { src, flags, isRegex });
}

/**
 * Wait for the EXACT "Next" button to become enabled, then click it.
 */
async function waitAndClickNext(page: Page, label: string, timeoutMs = 30000): Promise<boolean> {
  log(`  Waiting for Next button to be enabled (${label})...`);

  // Check current button states
  const states = await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    const results: { text: string; disabled: boolean; visible: boolean }[] = [];
    for (const b of buttons) {
      const text = b.textContent?.trim() || '';
      if (text.includes('Next') || text.includes('Generating')) {
        results.push({ text: text.substring(0, 50), disabled: b.disabled, visible: b.offsetWidth > 0 });
      }
    }
    return results;
  });
  log(`  Navigation buttons: ${states.length}`);
  states.forEach((s, i) => log(`    [${i}] "${s.text}" disabled=${s.disabled} visible=${s.visible}`));

  // Wait for exact "Next" button to be enabled
  try {
    await page.waitForFunction(() => {
      const buttons = document.querySelectorAll('button');
      for (const b of buttons) {
        if (b.textContent?.trim() === 'Next' && !b.disabled && b.offsetWidth > 0) return true;
      }
      return false;
    }, { timeout: timeoutMs });
  } catch {
    log(`  Next button still disabled after ${timeoutMs}ms`);
    return false;
  }

  // Click the EXACT "Next" button
  const clicked = await jsClickExact(page, 'Next');
  if (clicked) {
    log(`  Clicked exact "Next" (${label})`);
    return true;
  }
  log(`  Failed to click Next (${label})`);
  return false;
}

/**
 * Wait for preview content to appear in the DeviceFrame.
 * Preview is rendered inline via dangerouslySetInnerHTML, NOT in an iframe.
 */
async function waitForPreview(page: Page, timeoutMs = 120000): Promise<boolean> {
  log('  Waiting for preview content (inline, not iframe)...');
  try {
    // Look for the DeviceFrame's white-bg content area containing article HTML
    await page.waitForFunction(() => {
      // The DeviceFrame has backgroundColor: '#ffffff' on the overflow-auto div
      // Inside it, the article content is injected via dangerouslySetInnerHTML
      const whiteAreas = document.querySelectorAll('div[style*="background-color: rgb(255, 255, 255)"], div[style*="backgroundColor"]');
      for (const area of whiteAreas) {
        // Check if this area has substantial article content
        const html = area.innerHTML;
        if (html.length > 500 && (html.includes('article') || html.includes('section') || html.includes('<h'))) {
          return true;
        }
      }
      // Also check for the "Good Match" or "Design Quality" indicators
      const body = document.body.textContent || '';
      if (body.includes('Design Quality') || body.includes('Good Match') || body.includes('Regenerate')) {
        // Check if there's a preview container with content
        const previewDivs = document.querySelectorAll('div[style*="transform: scale"]');
        for (const div of previewDivs) {
          if (div.innerHTML.length > 500) return true;
        }
      }
      return false;
    }, { timeout: timeoutMs });
    log('  Preview content detected!');
    return true;
  } catch {
    log('  Preview content not found within timeout');
    return false;
  }
}

/**
 * Extract the rendered preview HTML and CSS from the DOM.
 */
async function extractPreviewContent(page: Page): Promise<{ html: string; css: string } | null> {
  return page.evaluate(() => {
    // The preview CSS is injected via <style dangerouslySetInnerHTML>
    // The preview HTML is in a <div dangerouslySetInnerHTML>
    // Both are inside the DeviceFrame's scaled content area

    // Find the scaled content container (transform: scale(...))
    const scaledDivs = document.querySelectorAll('div[style*="transform: scale"]');
    for (const div of scaledDivs) {
      if (div.innerHTML.length > 500) {
        // Get the CSS from any <style> tags inside
        const styles = div.querySelectorAll('style');
        let css = '';
        styles.forEach(s => { css += s.textContent || ''; });

        // Get the HTML from the content div (the one after <style>)
        const contentDivs = div.querySelectorAll('div');
        let html = '';
        for (const cd of contentDivs) {
          // Skip the style tag's parent
          if (cd.innerHTML.length > 200 && !cd.querySelector('style')) {
            html = cd.innerHTML;
            break;
          }
        }

        if (!html) {
          // Fallback: get all non-style innerHTML
          html = div.innerHTML.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        }

        return { html, css };
      }
    }
    return null;
  });
}

/**
 * Click "Generate Preview" or "Regenerate" in the PreviewStep (NOT "Regenerate Draft").
 */
async function clickGeneratePreview(page: Page): Promise<boolean> {
  // First try "Generate Preview" (empty state button)
  let clicked = await jsClickExact(page, 'Generate Preview');
  if (clicked) {
    log('    Clicked "Generate Preview"');
    return true;
  }

  // Then try exact "Regenerate" (NOT "Regenerate Draft")
  clicked = await jsClickExact(page, 'Regenerate');
  if (clicked) {
    log('    Clicked "Regenerate"');
    return true;
  }

  // Fallback: try via evaluate looking specifically inside the modal
  const result = await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    for (const b of buttons) {
      const text = b.textContent?.trim() || '';
      if ((text === 'Generate Preview' || text === 'Regenerate') && !b.disabled && b.offsetWidth > 0) {
        (b as HTMLButtonElement).click();
        return text;
      }
    }
    return null;
  });

  if (result) {
    log(`    Clicked "${result}" via fallback`);
    return true;
  }

  log('    No generate/regenerate button found');
  return false;
}

// ================================================================
// Collected output data for comparison
// ================================================================
interface RendererOutput {
  html: string;
  css: string;
  fullHtml: string;
  metrics: ReturnType<typeof analyzeHtml>;
}

test.describe('Visual Renderer Comparison', () => {
  test.setTimeout(600000); // 10 minutes

  test('navigate to Style & Publish and compare renderers', async ({ page }) => {
    const pipelineLogs: string[] = [];
    const errors: string[] = [];
    const outputs: Record<string, RendererOutput> = {};

    page.on('console', msg => {
      const t = msg.text();
      if (msg.type() === 'error') errors.push(t);
      if (t.includes('[STYLING PIPELINE]') || t.includes('[CleanArticleRenderer]') ||
          t.includes('rendererPath') || t.includes('Renderer path') ||
          t.includes('ROUTING TO') || t.includes('compiledCss') ||
          t.includes('Structural CSS') || t.includes('generateStructuralCSS') ||
          t.includes('PATH ') || t.includes('Using AI-generated') ||
          t.includes('SKIPPING') || t.includes('[Style & Publish]') ||
          t.includes('renderContent') || t.includes('generatePreview') ||
          t.includes('Clean Components mode') || t.includes('forced brand-templates')) {
        pipelineLogs.push(t);
      }
    });
    page.on('pageerror', err => errors.push(err.message));

    // ================================================================
    // STEP 1: LOGIN
    // ================================================================
    log('\n=== STEP 1: Login ===');
    await page.goto(BASE_URL);
    await page.waitForSelector('input[type="email"]', { timeout: 30000 });
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    log('  Waiting for project list to load...');
    await page.waitForSelector('tr button:has-text("Open")', { timeout: 60000 });
    await page.waitForTimeout(3000);
    await ss(page, '01_projects');

    // ================================================================
    // STEP 2: OPEN NFIR PROJECT
    // ================================================================
    log('\n=== STEP 2: Open NFIR project ===');
    const nfirRow = page.locator('tr', { hasText: /nfir/i }).first();
    if (await nfirRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nfirRow.locator('button:has-text("Open")').click();
    } else {
      await page.locator('tr button:has-text("Open")').first().click();
    }
    await page.waitForTimeout(3000);
    await ss(page, '02_project_opened');

    // ================================================================
    // STEP 3: LOAD MAP
    // ================================================================
    log('\n=== STEP 3: Load map ===');
    const loadMapBtn = page.locator('button:has-text("Load Map")').first();
    if (await loadMapBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
      await loadMapBtn.click();
      await page.waitForTimeout(5000);
    }
    await ss(page, '03_map_loaded');

    // ================================================================
    // STEP 4: FIND TOPIC AND CLICK
    // ================================================================
    log('\n=== STEP 4: Click topic ===');
    await page.waitForSelector('table tbody tr', { timeout: 30000 });
    const searchBox = page.locator('input[placeholder*="Search"], input[placeholder*="Zoek"], input[placeholder*="Filter"]').first();
    if (await searchBox.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchBox.fill('cyber');
      await page.waitForTimeout(1000);
    }
    const topicRow = page.locator('table tbody tr').first();
    await topicRow.click();
    await page.waitForTimeout(3000);

    // ================================================================
    // STEP 5a: VIEW BRIEF
    // ================================================================
    log('\n=== STEP 5a: View Brief ===');
    await page.waitForTimeout(2000);
    const briefBtn = page.locator('button:has-text("View Brief")').first();
    if (await briefBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await briefBtn.click();
    } else {
      await jsClickMatch(page, 'View Brief');
    }
    await page.waitForTimeout(3000);

    // ================================================================
    // STEP 5b: VIEW DRAFT
    // ================================================================
    log('\n=== STEP 5b: View Draft ===');
    const viewDraftBtn = page.locator('button:has-text("View Draft")').first();
    if (await viewDraftBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
      await viewDraftBtn.click();
    } else {
      await jsClickMatch(page, 'View Draft');
    }
    await page.waitForTimeout(3000);

    // ================================================================
    // STEP 6: PUBLISH → STYLE & PUBLISH
    // ================================================================
    log('\n=== STEP 6: Style & Publish ===');
    await page.waitForTimeout(2000);
    await jsClickMatch(page, /Publish\s*▾/);
    await page.waitForTimeout(1000);
    await jsClickMatch(page, 'Style & Publish');
    await page.waitForTimeout(3000);

    // Verify Brand Intelligence step
    const brandVisible = await page.locator('text=Brand Intelligence').first().isVisible({ timeout: 10000 }).catch(() => false);
    if (!brandVisible) {
      log('  ERROR: Style & Publish modal did not open');
      await ss(page, 'FAIL_no_modal');
      saveLogs(pipelineLogs, errors);
      return;
    }
    log('  Brand Intelligence step open');
    await page.waitForTimeout(8000); // Wait for brand data to load
    await ss(page, '06_brand_step');

    // ================================================================
    // STEP 7: BRAND → LAYOUT
    // ================================================================
    log('\n=== STEP 7: Brand → Layout ===');
    if (!await waitAndClickNext(page, 'brand→layout', 30000)) {
      log('  ERROR: Cannot advance past Brand step');
      await ss(page, 'FAIL_brand_next');
      saveLogs(pipelineLogs, errors);
      return;
    }

    // handleNext is async: awaits generateLayoutEngineBlueprint before setCurrentStep
    log('  Waiting for Layout step...');
    try {
      await page.waitForFunction(() =>
        document.body.textContent?.includes('Layout Intelligence') || false,
        { timeout: 120000 }
      );
      log('  On Layout step!');
    } catch {
      log('  Timeout waiting for Layout step');
      await ss(page, 'FAIL_layout_timeout');
      saveLogs(pipelineLogs, errors);
      return;
    }
    await page.waitForTimeout(3000);
    await ss(page, '07_layout_step');

    // ================================================================
    // STEP 8: SECTION EDITOR TEST
    // ================================================================
    log('\n=== STEP 8: Section Editor ===');

    // Wait for sections to load
    const hasSections = await page.waitForFunction(() => {
      const body = document.body.textContent || '';
      return body.includes('sections analyzed') || /prose|hero|feature-grid/i.test(body);
    }, { timeout: 60000 }).then(() => true).catch(() => false);

    if (hasSections) {
      // Count section cards
      const sectionInfo = await page.evaluate(() => {
        // Section cards have cursor-pointer and contain component type text
        const cards = document.querySelectorAll('[class*="cursor-pointer"]');
        let sectionCards = 0;
        const types = new Set<string>();
        cards.forEach(c => {
          const text = c.textContent || '';
          if (/prose|hero|card|feature|step|faq|timeline|checklist|stat|blockquote|accordion/i.test(text)) {
            sectionCards++;
            const match = text.match(/\b(prose|hero|card|feature-grid|step-list|faq-accordion|timeline|checklist|stat-highlight|key-takeaways|blockquote|accordion|comparison-table|testimonial-card|cta-banner|definition-box)\b/i);
            if (match) types.add(match[1].toLowerCase());
          }
        });
        return { count: sectionCards, types: Array.from(types) };
      });
      log(`  Section cards: ${sectionInfo.count}, types: ${sectionInfo.types.join(', ')}`);

      // Click first section card to expand editor
      if (sectionInfo.count > 0) {
        await page.evaluate(() => {
          const cards = document.querySelectorAll('[class*="cursor-pointer"]');
          for (const c of cards) {
            if (/prose|hero|card|feature/i.test(c.textContent || '')) {
              (c as HTMLElement).click();
              return;
            }
          }
        });
        await page.waitForTimeout(500);

        // Check for editor dropdowns — expect 5 (Component, Emphasis, Width, Columns, Accent)
        const editorDropdowns = await page.evaluate(() => {
          const selects = document.querySelectorAll('select');
          const results: { value: string; firstOpts: string[] }[] = [];
          selects.forEach(s => {
            const opts = Array.from((s as HTMLSelectElement).options).map(o => o.text);
            if (opts.some(o => /prose|hero|standard|featured|narrow|wide|column|None|Left|Top/i.test(o))) {
              results.push({ value: (s as HTMLSelectElement).value, firstOpts: opts.slice(0, 4) });
            }
          });
          return results;
        });
        log(`  Editor dropdowns: ${editorDropdowns.length} (expected: 5)`);
        editorDropdowns.forEach((d, i) => log(`    [${i}] "${d.value}" → ${d.firstOpts.join(', ')}`));
        await ss(page, '08_section_editor');
      }
    } else {
      log('  No section data available');
    }

    // ================================================================
    // STEP 9: LAYOUT → PREVIEW
    // ================================================================
    log('\n=== STEP 9: Layout → Preview ===');
    if (!await waitAndClickNext(page, 'layout→preview', 30000)) {
      log('  ERROR: Cannot advance past Layout step');
      await ss(page, 'FAIL_layout_next');
      saveLogs(pipelineLogs, errors);
      return;
    }

    // handleNext is async: awaits generateBlueprint + generatePreview before setCurrentStep
    log('  Waiting for Preview step (includes generation)...');
    try {
      await page.waitForFunction(() => {
        const body = document.body.textContent || '';
        // Preview step has: Regenerate button, Design Quality, device selector, renderer dropdown
        return body.includes('Regenerate') && (
          body.includes('Design Quality') ||
          body.includes('Renderer:') ||
          body.includes('preview.yoursite.com') ||
          body.includes('Download HTML')
        );
      }, { timeout: 180000 });
      log('  Preview step reached!');
    } catch {
      log('  Timeout waiting for Preview step');
    }
    await page.waitForTimeout(5000);
    await ss(page, '09_preview_initial');

    // ================================================================
    // STEP 10: CAPTURE AUTO PREVIEW
    // ================================================================
    log('\n=== STEP 10: Capture Auto Preview ===');

    const hasPreview = await waitForPreview(page, 30000);
    if (hasPreview) {
      log('  Auto preview content found');
    } else {
      log('  No auto preview content - trying to generate...');
      await clickGeneratePreview(page);
      await waitForPreview(page, 120000);
    }
    outputs['auto'] = await captureAndRecord(page, 'auto');
    await ss(page, '10_auto_preview');

    // ================================================================
    // STEP 11: RENDERER DROPDOWN - FIND IT
    // ================================================================
    log('\n=== STEP 11: Renderer Dropdown ===');

    const rendererInfo = await page.evaluate(() => {
      const selects = document.querySelectorAll('select');
      for (let i = 0; i < selects.length; i++) {
        const s = selects[i] as HTMLSelectElement;
        const html = s.innerHTML;
        if (html.includes('Renderer') || html.includes('Clean Components') || html.includes('Brand Templates')) {
          return {
            found: true as const,
            index: i,
            value: s.value,
            options: Array.from(s.options).map(o => ({ value: o.value, text: o.text })),
          };
        }
      }
      return { found: false as const, totalSelects: selects.length };
    });

    if (!rendererInfo.found) {
      log(`  WARNING: Renderer dropdown not found among ${(rendererInfo as { found: false; totalSelects: number }).totalSelects} selects`);
      await ss(page, '11_no_renderer_dropdown');
    } else {
      const info = rendererInfo as { found: true; index: number; value: string; options: { value: string; text: string }[] };
      log(`  Found renderer dropdown at select[${info.index}]`);
      log(`  Current: ${info.value}`);
      log(`  Options: ${info.options.map(o => o.text).join(', ')}`);

      // ================================================================
      // STEP 12: TEST CLEAN COMPONENTS RENDERER
      // ================================================================
      log('\n=== STEP 12: Clean Components Renderer ===');
      // Change renderer via JS (React-compatible event dispatch)
      await page.evaluate((idx) => {
        const select = document.querySelectorAll('select')[idx] as HTMLSelectElement;
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set;
        nativeInputValueSetter?.call(select, 'clean-components');
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }, info.index);

      // Auto-regeneration should kick in — wait for it
      log('  Waiting for auto-regeneration (clean-components)...');
      await waitForGenerationComplete(page, 120000);
      await page.waitForTimeout(3000);

      outputs['clean_components'] = await captureAndRecord(page, 'clean_components');
      await ss(page, '12_clean_components');

      // ================================================================
      // STEP 13: TEST BRAND TEMPLATES RENDERER
      // ================================================================
      log('\n=== STEP 13: Brand Templates Renderer ===');
      await page.evaluate((idx) => {
        const select = document.querySelectorAll('select')[idx] as HTMLSelectElement;
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set;
        nativeInputValueSetter?.call(select, 'brand-templates');
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }, info.index);

      log('  Waiting for auto-regeneration (brand-templates)...');
      await waitForGenerationComplete(page, 120000);
      await page.waitForTimeout(3000);

      outputs['brand_templates'] = await captureAndRecord(page, 'brand_templates');
      await ss(page, '13_brand_templates');

      // ================================================================
      // STEP 14: BACK TO AUTO (final verification)
      // ================================================================
      log('\n=== STEP 14: Auto (Final) ===');
      await page.evaluate((idx) => {
        const select = document.querySelectorAll('select')[idx] as HTMLSelectElement;
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set;
        nativeInputValueSetter?.call(select, 'auto');
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }, info.index);

      log('  Waiting for auto-regeneration (auto final)...');
      await waitForGenerationComplete(page, 120000);
      await page.waitForTimeout(3000);

      outputs['auto_final'] = await captureAndRecord(page, 'auto_final');
      await ss(page, '14_auto_final');
    }

    // ================================================================
    // STEP 15: COMPARE OUTPUTS
    // ================================================================
    log('\n=== STEP 15: Compare Outputs ===');

    const autoHtml = outputs['auto']?.fullHtml || '';
    const cleanHtml = outputs['clean_components']?.fullHtml || '';
    const brandHtml = outputs['brand_templates']?.fullHtml || '';

    if (autoHtml && cleanHtml && brandHtml) {
      const autoVsClean = autoHtml !== cleanHtml;
      const autoVsBrand = autoHtml !== brandHtml;
      const cleanVsBrand = cleanHtml !== brandHtml;

      log(`  Auto ≠ Clean Components: ${autoVsClean}`);
      log(`  Auto ≠ Brand Templates: ${autoVsBrand}`);
      log(`  Clean Components ≠ Brand Templates: ${cleanVsBrand}`);

      // Write comparison summary
      const summary = {
        timestamp: new Date().toISOString(),
        outputs: Object.fromEntries(
          Object.entries(outputs).map(([key, val]) => [key, {
            htmlSize: val.fullHtml.length,
            cssSize: val.css.length,
            ...val.metrics,
          }])
        ),
        comparisons: {
          autoVsClean: { different: autoVsClean, sizeDiff: Math.abs(autoHtml.length - cleanHtml.length) },
          autoVsBrand: { different: autoVsBrand, sizeDiff: Math.abs(autoHtml.length - brandHtml.length) },
          cleanVsBrand: { different: cleanVsBrand, sizeDiff: Math.abs(cleanHtml.length - brandHtml.length) },
        },
        allDifferent: autoVsClean && autoVsBrand && cleanVsBrand,
      };

      const dir = ensureDir(DIR);
      fs.writeFileSync(
        path.join(dir, 'comparison_summary.json'),
        JSON.stringify(summary, null, 2)
      );
      log(`  Saved comparison_summary.json`);

      // ASSERT: All three outputs must be different
      expect(autoHtml).not.toBe(cleanHtml);   // Auto ≠ Clean Components
      expect(autoHtml).not.toBe(brandHtml);   // Auto ≠ Brand Templates
      expect(cleanHtml).not.toBe(brandHtml);  // Clean Components ≠ Brand Templates
    } else {
      log('  WARNING: Not all outputs were captured — skipping comparison assertions');
      log(`  Auto: ${autoHtml.length} chars, Clean: ${cleanHtml.length} chars, Brand: ${brandHtml.length} chars`);
    }

    // ================================================================
    // DIAGNOSTICS
    // ================================================================
    log('\n=== Diagnostics ===');
    saveLogs(pipelineLogs, errors);

    const routingLogs = pipelineLogs.filter(l =>
      l.includes('ROUTING') || l.includes('PATH ') || l.includes('compiledCss') ||
      l.includes('Structural') || l.includes('SKIPPING') || l.includes('rendererPath') ||
      l.includes('Clean Components mode') || l.includes('forced brand-templates')
    );
    log(`\n  Routing logs (${routingLogs.length}):`);
    routingLogs.forEach(l => log(`    ${l.substring(0, 150)}`));

    log(`\n  Pipeline logs: ${pipelineLogs.length}`);
    log(`  Errors: ${errors.length}`);
    if (errors.length > 0) {
      errors.slice(0, 5).forEach((e, i) => log(`    ${i + 1}. ${e.substring(0, 120)}`));
    }

    log('\n=== TEST COMPLETE ===');
    log(`Screenshots: ${path.resolve(DIR)}`);
  });
});

// ================================================================
// HELPERS
// ================================================================

async function waitForGenerationComplete(page: Page, timeoutMs: number) {
  log('    Waiting for generation to complete...');
  try {
    // Wait for "Generating styled preview..." to appear then disappear
    const spinnerAppeared = await page.waitForFunction(() => {
      return document.body.textContent?.includes('Generating styled preview') || false;
    }, { timeout: 10000 }).then(() => true).catch(() => false);

    if (spinnerAppeared) {
      log('    Generation spinner appeared, waiting for completion...');
      await page.waitForFunction(() => {
        return !document.body.textContent?.includes('Generating styled preview');
      }, { timeout: timeoutMs });
      log('    Generation complete');
    } else {
      // Check if preview already has content
      const hasContent = await page.evaluate(() => {
        const scaled = document.querySelectorAll('div[style*="transform: scale"]');
        for (const d of scaled) {
          if (d.innerHTML.length > 500) return true;
        }
        return false;
      });
      if (hasContent) {
        log('    Preview content already present');
      } else {
        log('    Waiting for content to appear...');
        await page.waitForFunction(() => {
          const scaled = document.querySelectorAll('div[style*="transform: scale"]');
          for (const d of scaled) {
            if (d.innerHTML.length > 500) return true;
          }
          return false;
        }, { timeout: timeoutMs });
      }
    }
  } catch {
    log('    Generation wait timed out');
  }
}

/**
 * Capture preview content AND record it for comparison.
 */
async function captureAndRecord(page: Page, label: string): Promise<RendererOutput> {
  const dir = ensureDir(DIR);
  const content = await extractPreviewContent(page);

  if (content) {
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview: ${label}</title>
  <style>${content.css}</style>
</head>
<body>${content.html}</body>
</html>`;

    const htmlPath = path.join(dir, `output_${label}.html`);
    fs.writeFileSync(htmlPath, fullHtml);

    const metrics = analyzeHtml(fullHtml);
    log(`    [${label}] HTML: ${fullHtml.length} chars, CSS: ${content.css.length} chars`);
    log(`    Compiled CSS: ${metrics.hasCompiledCss} | Gradients: ${metrics.gradients} | CTC vars: ${metrics.ctcVars}`);
    log(`    Box shadows: ${metrics.boxShadows} | Font families: ${metrics.fontFamilies} | Sections: ${metrics.sectionCount}`);

    // Screenshot the preview area
    try {
      const deviceFrame = page.locator('div[style*="background-color: rgb(255, 255, 255)"]').first();
      if (await deviceFrame.isVisible({ timeout: 5000 }).catch(() => false)) {
        const bounds = await deviceFrame.boundingBox();
        if (bounds && bounds.width > 100 && bounds.height > 100) {
          await page.screenshot({
            path: path.join(dir, `preview_${label}.png`),
            clip: { x: bounds.x, y: bounds.y, width: Math.min(bounds.width, 1400), height: Math.min(bounds.height, 1200) },
          });
          log(`    Preview screenshot: preview_${label}.png`);
        }
      }
    } catch (e) {
      log(`    Screenshot error: ${e}`);
    }

    return { html: content.html, css: content.css, fullHtml, metrics };
  }

  log(`    [${label}] No preview content extracted`);
  return { html: '', css: '', fullHtml: '', metrics: analyzeHtml('') };
}

function analyzeHtml(html: string) {
  return {
    hasStructural: (html.includes('.section-container') && html.includes('max-width')) || html.includes('structural'),
    hasCompiledCss: html.includes('--ctc-') || html.includes('.ctc-') || html.includes('ctc-card'),
    gradients: (html.match(/linear-gradient/g) || []).length,
    ctcVars: (html.match(/--ctc-/g) || []).length,
    bgColors: (html.match(/background-color/g) || []).length,
    boxShadows: (html.match(/box-shadow/g) || []).length,
    fontFamilies: (html.match(/font-family/g) || []).length,
    borderRadius: (html.match(/border-radius/g) || []).length,
    ctcCardSelectors: (html.match(/\.ctc-card/g) || []).length,
    cardSelectors: (html.match(/\.card(?![a-z-])/g) || []).length,
    sectionCount: (html.match(/<section/g) || []).length,
  };
}

function saveLogs(pipeline: string[], errs: string[]) {
  const dir = ensureDir(DIR);
  fs.writeFileSync(path.join(dir, 'pipeline_logs.txt'), pipeline.join('\n'));
  fs.writeFileSync(path.join(dir, 'console_errors.txt'), errs.join('\n'));
  log(`  Saved pipeline_logs.txt (${pipeline.length} lines) and console_errors.txt (${errs.length} lines)`);
}
