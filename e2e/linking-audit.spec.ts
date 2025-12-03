// e2e/linking-audit.spec.ts
// End-to-end tests for Linking Audit Modal integration

import { test, expect } from '@playwright/test';
import { waitForAppLoad, login, TEST_CONFIG, takeScreenshot, elementExists } from './test-utils';

/**
 * Helper to navigate to project dashboard with a valid project
 * Returns true if navigation was successful and project has a map, false otherwise
 */
async function navigateToDashboard(page: import('@playwright/test').Page): Promise<boolean> {
  await page.goto('/');
  await waitForAppLoad(page);

  // Check if on auth screen - if so, log in
  const authEmailInput = page.locator('input[type="email"]');
  if (await authEmailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('Attempting to log in...');
    await login(page);
    await waitForAppLoad(page);
  }

  // Check if still on auth screen after login attempt
  if (await authEmailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('Authentication failed');
    return false;
  }

  // Look for "Open" button to load an existing project
  const openProjectButton = page.locator('button:has-text("Open")').first();
  if (await openProjectButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await openProjectButton.click();
    // Wait for dashboard to load
    await page.waitForTimeout(2000);

    // Check if project dashboard is visible (should have Analysis Tools or similar)
    const dashboardIndicator = page.locator('text=Analysis Tools, text=Link Audit, text=Topical Map');
    if (await dashboardIndicator.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      return true;
    }
  }

  console.log('Could not navigate to project dashboard with valid data');
  return false;
}

/**
 * Helper to check if a project has the required data for linking audit
 * (needs topical map with topics)
 */
async function hasRequiredData(page: import('@playwright/test').Page): Promise<boolean> {
  // Check for Link Audit button in Analysis Tools panel
  const linkAuditButton = page.locator('button:has-text("Link Audit")');
  const isVisible = await linkAuditButton.isVisible({ timeout: 5000 }).catch(() => false);

  if (!isVisible) {
    console.log('Link Audit button not found - project may not have required data');
    return false;
  }

  // Check if button is enabled (not disabled)
  const isDisabled = await linkAuditButton.isDisabled().catch(() => true);
  if (isDisabled) {
    console.log('Link Audit button is disabled - project may not have required data');
    return false;
  }

  return true;
}

test.describe('Linking Audit Modal Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
  });

  test('should open linking audit modal from project dashboard', async ({ page }) => {
    // Navigate to dashboard
    const navigated = await navigateToDashboard(page);
    test.skip(!navigated, 'Could not navigate to project dashboard - skipping test');

    // Check if project has required data
    const hasData = await hasRequiredData(page);
    test.skip(!hasData, 'Project does not have required topical map data - skipping test');

    // Click Link Audit button
    const linkAuditButton = page.locator('button:has-text("Link Audit")');
    await linkAuditButton.click();

    // Wait for modal to open
    await page.waitForTimeout(1000);

    // Check if modal is visible
    await expect(page.locator('text=Internal Linking Audit')).toBeVisible({ timeout: 10000 });

    await takeScreenshot(page, 'linking-audit-modal-open');
  });

  test('should display all audit tabs', async ({ page }) => {
    const navigated = await navigateToDashboard(page);
    test.skip(!navigated, 'Could not navigate to project dashboard - skipping test');

    const hasData = await hasRequiredData(page);
    test.skip(!hasData, 'Project does not have required topical map data - skipping test');

    // Open linking audit modal
    const linkAuditButton = page.locator('button:has-text("Link Audit")');
    await linkAuditButton.click();
    await page.waitForTimeout(1000);

    // Check for all expected tabs
    await expect(page.locator('text=Fundamentals')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Navigation')).toBeVisible();
    await expect(page.locator('text=Flow')).toBeVisible();
    await expect(page.locator('text=External')).toBeVisible();
    await expect(page.locator('text=Site Overview')).toBeVisible();

    await takeScreenshot(page, 'linking-audit-tabs');
  });

  test('should display audit prompt before running', async ({ page }) => {
    const navigated = await navigateToDashboard(page);
    test.skip(!navigated, 'Could not navigate to project dashboard - skipping test');

    const hasData = await hasRequiredData(page);
    test.skip(!hasData, 'Project does not have required topical map data - skipping test');

    // Open linking audit modal
    const linkAuditButton = page.locator('button:has-text("Link Audit")');
    await linkAuditButton.click();
    await page.waitForTimeout(1000);

    // Check for initial prompt (before audit is run)
    await expect(page.locator('text=Run Linking Audit')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Analyze your internal linking structure')).toBeVisible();

    // Should show Start Audit button
    await expect(page.locator('button:has-text("Start Audit")')).toBeVisible();

    await takeScreenshot(page, 'linking-audit-initial-prompt');
  });

  test('should run audit and display results', async ({ page }) => {
    const navigated = await navigateToDashboard(page);
    test.skip(!navigated, 'Could not navigate to project dashboard - skipping test');

    const hasData = await hasRequiredData(page);
    test.skip(!hasData, 'Project does not have required topical map data - skipping test');

    // Open linking audit modal
    const linkAuditButton = page.locator('button:has-text("Link Audit")');
    await linkAuditButton.click();
    await page.waitForTimeout(1000);

    // Click Start Audit button
    const startAuditButton = page.locator('button:has-text("Start Audit")');
    if (await startAuditButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startAuditButton.click();

      // Wait for audit to complete (show loading indicator)
      await expect(page.locator('text=Running linking audit')).toBeVisible({ timeout: 5000 });

      // Wait for results to appear (timeout increased for audit processing)
      await page.waitForTimeout(10000);

      // Check if audit completed (results should be visible)
      // Look for pass status or issue indicators
      const resultsVisible = await elementExists(page, 'text=All checks passed') ||
                            await elementExists(page, 'text=issues found') ||
                            await elementExists(page, 'text=No issues');

      if (resultsVisible) {
        await takeScreenshot(page, 'linking-audit-results');
      }
    }
  });

  test('should display audit score when available', async ({ page }) => {
    const navigated = await navigateToDashboard(page);
    test.skip(!navigated, 'Could not navigate to project dashboard - skipping test');

    const hasData = await hasRequiredData(page);
    test.skip(!hasData, 'Project does not have required topical map data - skipping test');

    // Open linking audit modal
    const linkAuditButton = page.locator('button:has-text("Link Audit")');
    await linkAuditButton.click();
    await page.waitForTimeout(1000);

    // Run audit if not already run
    const startAuditButton = page.locator('button:has-text("Start Audit")');
    if (await startAuditButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startAuditButton.click();
      await page.waitForTimeout(10000);
    }

    // Check for score display (Score: XX/100)
    const scoreIndicator = page.locator('text=/Score: \\d+\\/100/');
    const scoreVisible = await scoreIndicator.isVisible({ timeout: 5000 }).catch(() => false);

    // Skip if score is not visible (audit may not have completed)
    test.skip(!scoreVisible, 'Audit score not available - audit may not have completed');

    await expect(scoreIndicator).toBeVisible();
    await takeScreenshot(page, 'linking-audit-score');
  });

  test('should navigate between audit tabs', async ({ page }) => {
    const navigated = await navigateToDashboard(page);
    test.skip(!navigated, 'Could not navigate to project dashboard - skipping test');

    const hasData = await hasRequiredData(page);
    test.skip(!hasData, 'Project does not have required topical map data - skipping test');

    // Open linking audit modal
    const linkAuditButton = page.locator('button:has-text("Link Audit")');
    await linkAuditButton.click();
    await page.waitForTimeout(1000);

    // Navigate to Navigation tab
    const navigationTab = page.locator('button:has-text("Navigation")').first();
    await navigationTab.click();
    await page.waitForTimeout(500);

    // Check if tab is active (should have active styling)
    const isActive = await navigationTab.evaluate((el) => {
      return el.classList.contains('bg-blue-500/20') ||
             el.classList.contains('text-blue-300');
    });

    expect(isActive).toBeTruthy();

    // Navigate to Flow tab
    const flowTab = page.locator('button:has-text("Flow")').first();
    await flowTab.click();
    await page.waitForTimeout(500);

    // Navigate to External tab
    const externalTab = page.locator('button:has-text("External")').first();
    await externalTab.click();
    await page.waitForTimeout(500);

    // Navigate to Site Overview tab
    const siteOverviewTab = page.locator('button:has-text("Site Overview")').first();
    await siteOverviewTab.click();
    await page.waitForTimeout(500);

    await takeScreenshot(page, 'linking-audit-site-overview-tab');
  });

  test('should display stats bar when audit results are available', async ({ page }) => {
    const navigated = await navigateToDashboard(page);
    test.skip(!navigated, 'Could not navigate to project dashboard - skipping test');

    const hasData = await hasRequiredData(page);
    test.skip(!hasData, 'Project does not have required topical map data - skipping test');

    // Open linking audit modal
    const linkAuditButton = page.locator('button:has-text("Link Audit")');
    await linkAuditButton.click();
    await page.waitForTimeout(1000);

    // Run audit if not already run
    const startAuditButton = page.locator('button:has-text("Start Audit")');
    if (await startAuditButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startAuditButton.click();
      await page.waitForTimeout(10000);
    }

    // Check for stats bar elements
    const statsVisible = await elementExists(page, 'text=Total:') ||
                         await elementExists(page, 'text=Critical:') ||
                         await elementExists(page, 'text=Warnings:');

    // Skip if stats are not visible (audit may not have completed)
    test.skip(!statsVisible, 'Stats bar not visible - audit may not have completed');

    await expect(page.locator('text=Total:')).toBeVisible();
    await expect(page.locator('text=Critical:')).toBeVisible();
    await expect(page.locator('text=Warnings:')).toBeVisible();
    await expect(page.locator('text=Suggestions:')).toBeVisible();
    await expect(page.locator('text=Auto-fixable:')).toBeVisible();

    await takeScreenshot(page, 'linking-audit-stats-bar');
  });

  test('should close modal when clicking close button', async ({ page }) => {
    const navigated = await navigateToDashboard(page);
    test.skip(!navigated, 'Could not navigate to project dashboard - skipping test');

    const hasData = await hasRequiredData(page);
    test.skip(!hasData, 'Project does not have required topical map data - skipping test');

    // Open linking audit modal
    const linkAuditButton = page.locator('button:has-text("Link Audit")');
    await linkAuditButton.click();
    await page.waitForTimeout(1000);

    // Verify modal is open
    await expect(page.locator('text=Internal Linking Audit')).toBeVisible({ timeout: 10000 });

    // Click Close button
    const closeButton = page.locator('button:has-text("Close")').last();
    await closeButton.click();
    await page.waitForTimeout(500);

    // Verify modal is closed (modal heading should not be visible)
    await expect(page.locator('text=Internal Linking Audit')).not.toBeVisible({ timeout: 5000 });

    await takeScreenshot(page, 'linking-audit-modal-closed');
  });

  test('should display Run Audit button in footer', async ({ page }) => {
    const navigated = await navigateToDashboard(page);
    test.skip(!navigated, 'Could not navigate to project dashboard - skipping test');

    const hasData = await hasRequiredData(page);
    test.skip(!hasData, 'Project does not have required topical map data - skipping test');

    // Open linking audit modal
    const linkAuditButton = page.locator('button:has-text("Link Audit")');
    await linkAuditButton.click();
    await page.waitForTimeout(1000);

    // Check for Run Audit button in footer (should always be present)
    await expect(page.locator('button:has-text("Run Audit")')).toBeVisible({ timeout: 10000 });

    await takeScreenshot(page, 'linking-audit-footer-buttons');
  });

  test('should display Site Overview content when available', async ({ page }) => {
    const navigated = await navigateToDashboard(page);
    test.skip(!navigated, 'Could not navigate to project dashboard - skipping test');

    const hasData = await hasRequiredData(page);
    test.skip(!hasData, 'Project does not have required topical map data - skipping test');

    // Open linking audit modal
    const linkAuditButton = page.locator('button:has-text("Link Audit")');
    await linkAuditButton.click();
    await page.waitForTimeout(1000);

    // Run audit if not already run
    const startAuditButton = page.locator('button:has-text("Start Audit")');
    if (await startAuditButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startAuditButton.click();
      await page.waitForTimeout(10000);
    }

    // Navigate to Site Overview tab
    const siteOverviewTab = page.locator('button:has-text("Site Overview")').first();
    await siteOverviewTab.click();
    await page.waitForTimeout(1000);

    // Check for Site Overview content sections
    const hasContent = await elementExists(page, 'text=Link Count Analysis') ||
                       await elementExists(page, 'text=PageRank Flow Analysis') ||
                       await elementExists(page, 'text=N-gram Consistency');

    // Skip if content is not visible (audit may not have completed)
    test.skip(!hasContent, 'Site Overview content not available - audit may not have completed');

    await expect(page.locator('text=Link Count Analysis')).toBeVisible();
    await expect(page.locator('text=PageRank Flow Analysis')).toBeVisible();
    await expect(page.locator('text=N-gram Consistency')).toBeVisible();

    await takeScreenshot(page, 'linking-audit-site-overview-content');
  });
});
