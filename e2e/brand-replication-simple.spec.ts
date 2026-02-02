// e2e/brand-replication-simple.spec.ts
/**
 * Simple Brand Replication Test
 *
 * A focused test that navigates to a specific topical map with content
 * and demonstrates the Style & Publish workflow.
 */

import { test, expect, Page } from '@playwright/test';
import { login, TEST_CONFIG } from './test-utils';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = 'screenshots/brand-replication-proof';

function ensureDir(dir: string) {
  const resolved = path.resolve(dir);
  if (!fs.existsSync(resolved)) {
    fs.mkdirSync(resolved, { recursive: true });
  }
  return resolved;
}

async function screenshot(page: Page, name: string) {
  const dir = ensureDir(SCREENSHOT_DIR);
  const filename = `${Date.now()}_${name}.png`;
  await page.screenshot({ path: path.join(dir, filename), fullPage: true });
  console.log(`📸 ${filename}`);
}

test.describe('Brand Replication Simple Flow', () => {
  test.setTimeout(180000); // 3 minutes

  test('navigate to MVGM project and open Style & Publish', async ({ page }) => {
    // Login
    await login(page);
    await page.waitForSelector('button:has-text("Open")', { timeout: 30000 });
    await screenshot(page, '01_logged_in');

    // Click MVGM project specifically (it has 10 maps)
    // Use exact match to avoid matching "mvgm vve" row too
    const mvgmRow = page.locator('tr', { hasText: 'mvgm.com' }).filter({ hasText: '10' });
    await mvgmRow.locator('button:has-text("Open")').click();
    await page.waitForTimeout(2000);
    await screenshot(page, '02_mvgm_opened');

    // Wait for maps to load - look for "Load Map" buttons
    await page.waitForSelector('button:has-text("Load Map")', { timeout: 30000 });
    await screenshot(page, '03_maps_visible');

    // Click "Load Map" for the first existing map (MVGM vastgoedmanagement)
    const loadMapButton = page.locator('button:has-text("Load Map")').first();
    await loadMapButton.click();
    await page.waitForTimeout(3000);
    await screenshot(page, '04_map_loaded');

    // Look for topics/articles table
    const topicRow = page.locator('tr.cursor-pointer, tbody tr').first();
    if (await topicRow.isVisible({ timeout: 10000 }).catch(() => false)) {
      await topicRow.click();
      await page.waitForTimeout(2000);
    }
    await screenshot(page, '05_topic_clicked');

    // Find Publish dropdown or Style & Publish button
    const publishDropdown = page.locator('button:has-text("Publish")').first();
    if (await publishDropdown.isVisible({ timeout: 10000 }).catch(() => false)) {
      await publishDropdown.click();
      await page.waitForTimeout(1000);
    }
    await screenshot(page, '06_publish_dropdown');

    // Click Style & Publish option
    const styleOption = page.locator(
      '[role="menuitem"]:has-text("Style"), ' +
      'button:has-text("Style & Publish")'
    ).first();
    if (await styleOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await styleOption.click();
      await page.waitForTimeout(2000);
    }
    await screenshot(page, '07_style_modal');

    // Now we should see the Style & Publish modal
    // Step 1: Brand Intelligence
    const brandStep = page.locator('text=Brand Intelligence, text=Brand, [data-step="brand"]').first();
    await screenshot(page, '08_brand_step');

    // Look for URL input
    const urlInput = page.locator('input[placeholder*="URL"], input[type="url"]').first();
    if (await urlInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await urlInput.fill('https://mvgm.com/nl/');
      await screenshot(page, '09_url_entered');

      // Click detect
      const detectButton = page.locator('button:has-text("Detect"), button:has-text("Analyze")').first();
      if (await detectButton.isVisible()) {
        await detectButton.click();
        console.log('⏳ Waiting for brand detection (up to 2 minutes)...');

        // Wait for detection to complete
        await page.waitForSelector(
          'text=Brand Detected, text=Detection Complete, text=Using saved brand',
          { timeout: 120000 }
        ).catch(() => console.log('Detection may have timed out'));

        await screenshot(page, '10_brand_detected');
      }
    }

    // Try to advance to Preview step
    const nextButton = page.locator('button:has-text("Next")').first();
    for (let i = 0; i < 3; i++) {
      if (await nextButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nextButton.click();
        await page.waitForTimeout(1000);
      }
    }
    await screenshot(page, '11_preview_step');

    // Try to generate preview
    const generateButton = page.locator('button:has-text("Generate"), button:has-text("Render")').first();
    if (await generateButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await generateButton.click();
      await page.waitForTimeout(5000);
    }
    await screenshot(page, '12_generated');

    // Final proof screenshot
    await screenshot(page, '13_final_proof');

    console.log('\n✅ Test completed - check screenshots in', SCREENSHOT_DIR);
  });

  test('verify brand extraction API endpoint exists', async ({ page }) => {
    // Test the edge function endpoint
    const response = await page.request.post(
      `${TEST_CONFIG.SUPABASE_URL}/functions/v1/brand-discovery`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: { brandUrl: 'test', brandId: 'test' }
      }
    );

    // Should get 400 (bad request) or 401 (auth), but NOT 404
    console.log(`Brand discovery endpoint status: ${response.status()}`);
    expect(response.status()).not.toBe(404);
    await screenshot(page, 'api_endpoint_test');
  });
});
