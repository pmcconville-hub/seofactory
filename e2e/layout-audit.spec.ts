/**
 * Layout Audit - Screenshots of ALL application screens
 *
 * Purpose: Capture every route to audit layout consistency
 * (width constraints, centering, modal-vs-page rendering).
 */
import { test, expect } from '@playwright/test';
import { login, waitForAppLoad, TEST_CONFIG, takeScreenshot } from './test-utils';

// Increase default timeout for navigation-heavy tests
test.setTimeout(120_000);

let projectId: string;
let mapId: string;
let topicId: string;

test.describe('Layout Audit - All Screens', () => {

  test.beforeAll(async ({ browser }) => {
    // Login once and discover real IDs from the app
    const page = await browser.newPage();
    await login(page);
    await page.waitForTimeout(3000);

    // Get the current URL to extract project info
    const url = page.url();
    console.log('[Layout Audit] After login URL:', url);

    // Navigate to projects page to find a project
    await page.goto('/projects');
    await page.waitForTimeout(3000);

    // Look for any project link or card and click it
    const projectLink = page.locator('a[href*="/p/"]').first();
    if (await projectLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      const href = await projectLink.getAttribute('href');
      if (href) {
        const match = href.match(/\/p\/([^/]+)/);
        if (match) projectId = match[1];
      }
      await projectLink.click();
      await page.waitForTimeout(3000);
    }

    // If no link, try clicking a project card button
    if (!projectId) {
      const loadBtn = page.locator('button:has-text("Load"), button:has-text("Open"), button:has-text("Select")').first();
      if (await loadBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await loadBtn.click();
        await page.waitForTimeout(3000);
      }
      const afterUrl = page.url();
      const m = afterUrl.match(/\/p\/([^/]+)/);
      if (m) projectId = m[1];
    }

    console.log('[Layout Audit] Project ID:', projectId);

    // Now find a map - look for "Load Map" button or map link
    if (projectId) {
      const mapLink = page.locator('a[href*="/m/"]').first();
      const loadMapBtn = page.locator('button:has-text("Load Map")').first();

      if (await loadMapBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await loadMapBtn.click();
        await page.waitForTimeout(3000);
        const afterUrl = page.url();
        const m = afterUrl.match(/\/m\/([^/]+)/);
        if (m) mapId = m[1];
      } else if (await mapLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        const href = await mapLink.getAttribute('href');
        if (href) {
          const match = href.match(/\/m\/([^/]+)/);
          if (match) mapId = match[1];
        }
        await mapLink.click();
        await page.waitForTimeout(3000);
      }
    }

    console.log('[Layout Audit] Map ID:', mapId);

    // Find a topic ID from the dashboard
    if (projectId && mapId) {
      await page.goto(`/p/${projectId}/m/${mapId}`);
      await page.waitForTimeout(5000);

      // Look for topic links in the table
      const topicLink = page.locator('a[href*="/topics/"]').first();
      if (await topicLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        const href = await topicLink.getAttribute('href');
        if (href) {
          const match = href.match(/\/topics\/([^/]+)/);
          if (match) topicId = match[1];
        }
      }

      // Try finding topic IDs from topic rows
      if (!topicId) {
        // Look for any clickable topic element that might carry an ID
        const topicRow = page.locator('[data-topic-id]').first();
        if (await topicRow.isVisible({ timeout: 3000 }).catch(() => false)) {
          topicId = await topicRow.getAttribute('data-topic-id') || '';
        }
      }

      // Last resort: try to grab any topic ID from the page source
      if (!topicId) {
        const content = await page.content();
        const match = content.match(/\/topics\/([0-9a-f-]{36})/);
        if (match) topicId = match[1];
      }
    }

    console.log('[Layout Audit] Topic ID:', topicId);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.waitForTimeout(2000);
  });

  // ==================== ROOT LEVEL ====================

  test('01 - /projects - Projects Page', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForTimeout(3000);
    await takeScreenshot(page, '01-projects');
  });

  test('02 - /settings - Settings Page', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '02-settings');
  });

  test('03 - /admin - Admin Page', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '03-admin');
  });

  test('04 - /tools/quotation - Quotation Page', async ({ page }) => {
    await page.goto('/tools/quotation');
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '04-quotation');
  });

  // ==================== PROJECT LEVEL ====================

  test('05 - /p/:pid - Map Selection Page', async ({ page }) => {
    test.skip(!projectId, 'No project ID found');
    await page.goto(`/p/${projectId}`);
    await page.waitForTimeout(3000);
    await takeScreenshot(page, '05-map-selection');
  });

  // ==================== MAP LEVEL ====================

  test('06 - Dashboard', async ({ page }) => {
    test.skip(!projectId || !mapId, 'No project/map ID found');
    await page.goto(`/p/${projectId}/m/${mapId}`);
    await page.waitForTimeout(5000);
    await takeScreenshot(page, '06-dashboard');
  });

  test('07 - Setup Wizard (Business Info)', async ({ page }) => {
    test.skip(!projectId || !mapId, 'No project/map ID found');
    await page.goto(`/p/${projectId}/m/${mapId}/setup/business`);
    await page.waitForTimeout(3000);
    await takeScreenshot(page, '07-setup-business');
  });

  test('08 - Setup Wizard (Pillars)', async ({ page }) => {
    test.skip(!projectId || !mapId, 'No project/map ID found');
    await page.goto(`/p/${projectId}/m/${mapId}/setup/pillars`);
    await page.waitForTimeout(3000);
    await takeScreenshot(page, '08-setup-pillars');
  });

  test('09 - Setup Wizard (EAVs)', async ({ page }) => {
    test.skip(!projectId || !mapId, 'No project/map ID found');
    await page.goto(`/p/${projectId}/m/${mapId}/setup/eavs`);
    await page.waitForTimeout(3000);
    await takeScreenshot(page, '09-setup-eavs');
  });

  test('10 - Setup Wizard (Competitors)', async ({ page }) => {
    test.skip(!projectId || !mapId, 'No project/map ID found');
    await page.goto(`/p/${projectId}/m/${mapId}/setup/competitors`);
    await page.waitForTimeout(3000);
    await takeScreenshot(page, '10-setup-competitors');
  });

  test('11 - Setup Wizard (Blueprint)', async ({ page }) => {
    test.skip(!projectId || !mapId, 'No project/map ID found');
    await page.goto(`/p/${projectId}/m/${mapId}/setup/blueprint`);
    await page.waitForTimeout(3000);
    await takeScreenshot(page, '11-setup-blueprint');
  });

  test('12 - Audit Dashboard', async ({ page }) => {
    test.skip(!projectId || !mapId, 'No project/map ID found');
    await page.goto(`/p/${projectId}/m/${mapId}/audit`);
    await page.waitForTimeout(3000);
    await takeScreenshot(page, '12-audit');
  });

  test('13 - Insights Hub', async ({ page }) => {
    test.skip(!projectId || !mapId, 'No project/map ID found');
    await page.goto(`/p/${projectId}/m/${mapId}/insights`);
    await page.waitForTimeout(3000);
    await takeScreenshot(page, '13-insights');
  });

  test('14 - Gap Analysis', async ({ page }) => {
    test.skip(!projectId || !mapId, 'No project/map ID found');
    await page.goto(`/p/${projectId}/m/${mapId}/gap-analysis`);
    await page.waitForTimeout(3000);
    await takeScreenshot(page, '14-gap-analysis');
  });

  test('15 - Quality', async ({ page }) => {
    test.skip(!projectId || !mapId, 'No project/map ID found');
    await page.goto(`/p/${projectId}/m/${mapId}/quality`);
    await page.waitForTimeout(3000);
    await takeScreenshot(page, '15-quality');
  });

  test('16 - Planning', async ({ page }) => {
    test.skip(!projectId || !mapId, 'No project/map ID found');
    await page.goto(`/p/${projectId}/m/${mapId}/planning`);
    await page.waitForTimeout(3000);
    await takeScreenshot(page, '16-planning');
  });

  test('17 - Calendar', async ({ page }) => {
    test.skip(!projectId || !mapId, 'No project/map ID found');
    await page.goto(`/p/${projectId}/m/${mapId}/calendar`);
    await page.waitForTimeout(3000);
    await takeScreenshot(page, '17-calendar');
  });

  test('18 - KP Strategy', async ({ page }) => {
    test.skip(!projectId || !mapId, 'No project/map ID found');
    await page.goto(`/p/${projectId}/m/${mapId}/strategy/kp`);
    await page.waitForTimeout(3000);
    await takeScreenshot(page, '18-kp-strategy');
  });

  test('19 - Entity Authority', async ({ page }) => {
    test.skip(!projectId || !mapId, 'No project/map ID found');
    await page.goto(`/p/${projectId}/m/${mapId}/strategy/entity-authority`);
    await page.waitForTimeout(3000);
    await takeScreenshot(page, '19-entity-authority');
  });

  test('20 - Entity Health', async ({ page }) => {
    test.skip(!projectId || !mapId, 'No project/map ID found');
    await page.goto(`/p/${projectId}/m/${mapId}/strategy/entity-health`);
    await page.waitForTimeout(3000);
    await takeScreenshot(page, '20-entity-health');
  });

  // ==================== TOPIC LEVEL ====================

  test('21 - Topic Detail', async ({ page }) => {
    test.skip(!projectId || !mapId || !topicId, 'No project/map/topic ID found');
    await page.goto(`/p/${projectId}/m/${mapId}/topics/${topicId}`);
    await page.waitForTimeout(3000);
    await takeScreenshot(page, '21-topic-detail');
  });

  test('22 - Brief Page', async ({ page }) => {
    test.skip(!projectId || !mapId || !topicId, 'No project/map/topic ID found');
    await page.goto(`/p/${projectId}/m/${mapId}/topics/${topicId}/brief`);
    await page.waitForTimeout(4000);
    await takeScreenshot(page, '22-brief');
  });

  test('23 - Draft Page', async ({ page }) => {
    test.skip(!projectId || !mapId || !topicId, 'No project/map/topic ID found');
    await page.goto(`/p/${projectId}/m/${mapId}/topics/${topicId}/draft`);
    await page.waitForTimeout(4000);
    await takeScreenshot(page, '23-draft');
  });

  test('24 - Style Page', async ({ page }) => {
    test.skip(!projectId || !mapId || !topicId, 'No project/map/topic ID found');
    await page.goto(`/p/${projectId}/m/${mapId}/topics/${topicId}/style`);
    await page.waitForTimeout(4000);
    await takeScreenshot(page, '24-style');
  });

  // ==================== SPECIAL ====================

  test('25 - 404 Page', async ({ page }) => {
    await page.goto('/nonexistent-page-for-404');
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '25-not-found');
  });
});
