/**
 * Visual proof: capture the Preview step modal for each renderer path.
 */
import { test, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const DIR = 'screenshots/renderer-proof';
const BASE_URL = 'http://localhost:3000';

function ensureDir(d: string) {
  const r = path.resolve(d);
  if (!fs.existsSync(r)) fs.mkdirSync(r, { recursive: true });
  return r;
}
function log(msg: string) { console.log(msg); }

async function jsClick(page: Page, text: string) {
  return page.evaluate((t) => {
    for (const b of document.querySelectorAll('button'))
      if (b.textContent?.trim() === t && !b.disabled && b.offsetWidth > 0) { (b as HTMLButtonElement).click(); return true; }
    return false;
  }, text);
}
async function jsClickRe(page: Page, re: RegExp) {
  return page.evaluate((src) => {
    const r = new RegExp(src);
    for (const b of document.querySelectorAll('button'))
      if (r.test(b.textContent?.trim() || '') && !b.disabled && b.offsetWidth > 0) { (b as HTMLButtonElement).click(); return true; }
    return false;
  }, re.source);
}

async function waitNext(page: Page, ms = 60000) {
  await page.waitForFunction(() => {
    for (const b of document.querySelectorAll('button'))
      if (b.textContent?.trim() === 'Next' && !b.disabled && b.offsetWidth > 0) return true;
    return false;
  }, { timeout: ms });
  await jsClick(page, 'Next');
}

async function switchRenderer(page: Page, value: string) {
  await page.evaluate((val) => {
    for (const s of document.querySelectorAll('select'))
      if (s.innerHTML.includes('Clean Components') || s.innerHTML.includes('Brand Templates')) {
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set?.call(s, val);
        s.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
  }, value);
}

/** Wait until NOT generating or preview content exists. */
async function waitForPreviewReady(page: Page, ms = 120000) {
  await page.waitForFunction(() => {
    const body = document.body.textContent || '';
    const isGenerating = body.includes('Generating styled preview');
    if (isGenerating) return false;
    // Preview is ready when we see brand match OR design quality
    return body.includes('Brand Match') || body.includes('Design Quality') || body.includes('Good Match');
  }, { timeout: ms });
  await page.waitForTimeout(2000);
}

/** Capture just the modal area. */
async function captureModal(page: Page, label: string) {
  const dir = ensureDir(DIR);

  // Find the modal — it's the element with Style & Publish title
  // The modal content is inside a fixed/absolute positioned container
  const clip = await page.evaluate(() => {
    // Find the modal header containing "Style & Publish"
    const allElements = document.querySelectorAll('*');
    for (const el of allElements) {
      if (el.children.length > 3 && el.getBoundingClientRect().width > 500) {
        const text = el.textContent || '';
        if (text.includes('Style & Publish') && text.includes('Brand') && text.includes('Preview')) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 500 && rect.height > 400) {
            return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
          }
        }
      }
    }
    return null;
  });

  if (clip && clip.width > 200 && clip.height > 200) {
    await page.screenshot({
      path: path.join(dir, `proof_${label}.png`),
      clip: {
        x: Math.max(0, Math.floor(clip.x)),
        y: Math.max(0, Math.floor(clip.y)),
        width: Math.min(Math.ceil(clip.width), 1400),
        height: Math.min(Math.ceil(clip.height), 900),
      },
    });
    log(`  Saved proof_${label}.png (${Math.round(clip.width)}x${Math.round(clip.height)})`);
  } else {
    // Fallback: viewport screenshot
    await page.screenshot({
      path: path.join(dir, `proof_${label}.png`),
      fullPage: false,
    });
    log(`  Saved proof_${label}.png (viewport fallback)`);
  }

  // Log renderer info
  const info = await page.evaluate(() => {
    const body = document.body.textContent || '';
    let renderer = 'unknown';
    if (body.includes('AI-generated brand styling')) renderer = 'Auto (compiledCss + DesignDNA)';
    else if (body.includes('clean article renderer with design DNA')) renderer = 'Clean Components (DesignDNA only)';
    else if (body.includes('brand template output')) renderer = 'Brand Templates (BrandAwareComposer)';
    const match = body.match(/(\d+)%/) || [];
    return { renderer, brandMatch: match[1] || '?' };
  });
  log(`  Renderer: ${info.renderer} | Brand Match: ${info.brandMatch}%`);
}

test.describe('Visual Proof', () => {
  test.setTimeout(300000); // 5 min

  test('capture each renderer preview', async ({ page }) => {
    // ============ LOGIN ============
    log('Login...');
    await page.goto(BASE_URL);
    await page.waitForSelector('input[type="email"]', { timeout: 30000 });
    await page.fill('input[type="email"]', 'richard@kjenmarks.nl');
    await page.fill('input[type="password"]', 'pannekoek');
    await page.click('button[type="submit"]');
    await page.waitForSelector('tr button:has-text("Open")', { timeout: 60000 });
    await page.waitForTimeout(2000);

    // ============ OPEN PROJECT → MAP → TOPIC ============
    log('Open project...');
    const nfirRow = page.locator('tr', { hasText: /nfir/i }).first();
    if (await nfirRow.isVisible({ timeout: 5000 }).catch(() => false))
      await nfirRow.locator('button:has-text("Open")').click();
    else await page.locator('tr button:has-text("Open")').first().click();
    await page.waitForTimeout(3000);

    const loadMapBtn = page.locator('button:has-text("Load Map")').first();
    if (await loadMapBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
      await loadMapBtn.click();
      await page.waitForTimeout(5000);
    }

    await page.waitForSelector('table tbody tr', { timeout: 30000 });
    const sb = page.locator('input[placeholder*="Search"], input[placeholder*="Zoek"], input[placeholder*="Filter"]').first();
    if (await sb.isVisible({ timeout: 3000 }).catch(() => false)) { await sb.fill('cyber'); await page.waitForTimeout(1000); }
    await page.locator('table tbody tr').first().click();
    await page.waitForTimeout(3000);

    // ============ NAVIGATE TO STYLE & PUBLISH ============
    log('Navigate to Style & Publish...');
    await page.waitForTimeout(2000);
    const briefBtn = page.locator('button:has-text("View Brief")').first();
    if (await briefBtn.isVisible({ timeout: 5000 }).catch(() => false)) await briefBtn.click();
    else await jsClickRe(page, /View Brief/);
    await page.waitForTimeout(3000);

    const draftBtn = page.locator('button:has-text("View Draft")').first();
    if (await draftBtn.isVisible({ timeout: 8000 }).catch(() => false)) await draftBtn.click();
    else await jsClickRe(page, /View Draft/);
    await page.waitForTimeout(3000);

    await jsClickRe(page, /Publish\s*▾/);
    await page.waitForTimeout(1500);
    // Dropdown items may be divs/spans, not buttons — click any element with matching text
    const clicked = await page.evaluate(() => {
      const all = document.querySelectorAll('button, div, a, li, span');
      for (const el of all) {
        const t = el.textContent?.trim() || '';
        if (t === 'Style & Publish' && (el as HTMLElement).offsetWidth > 0) {
          (el as HTMLElement).click();
          return true;
        }
      }
      return false;
    });
    log(`  Style & Publish click: ${clicked}`);
    await page.waitForTimeout(3000);

    await page.waitForFunction(() => document.body.textContent?.includes('Brand Intelligence') || false, { timeout: 15000 });
    log('  On Brand step');
    await page.waitForTimeout(10000);

    // ============ BRAND → LAYOUT → PREVIEW ============
    log('Navigate Brand → Layout → Preview...');
    await waitNext(page, 60000);
    await page.waitForFunction(() => document.body.textContent?.includes('Layout Intelligence') || false, { timeout: 120000 });
    await page.waitForTimeout(3000);

    await waitNext(page, 60000);
    await waitForPreviewReady(page, 180000);
    log('  Preview ready');

    // ============ PROOF 1: AUTO ============
    log('\n=== PROOF 1: Auto ===');
    await captureModal(page, '1_auto');

    // ============ PROOF 2: CLEAN COMPONENTS ============
    log('\n=== PROOF 2: Clean Components ===');
    await switchRenderer(page, 'clean-components');
    await page.waitForTimeout(2000); // Wait for auto-regeneration to start
    await waitForPreviewReady(page, 120000);
    await captureModal(page, '2_clean_components');

    // ============ PROOF 3: BRAND TEMPLATES ============
    log('\n=== PROOF 3: Brand Templates ===');
    await switchRenderer(page, 'brand-templates');
    await page.waitForTimeout(2000);
    await waitForPreviewReady(page, 120000);
    await captureModal(page, '3_brand_templates');

    log(`\nAll proof screenshots in: ${path.resolve(DIR)}`);
  });
});
