// e2e/help.spec.ts
// End-to-end tests for help functionality
// Note: Help opens in a separate window (window.open), not a modal dialog

import { test, expect } from '@playwright/test';
import { waitForAppLoad, login, TEST_CONFIG, takeScreenshot } from './test-utils';

test.describe('Help Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);

    // Login if on auth screen
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await login(page);
      await waitForAppLoad(page);
    }
  });

  test('should open help modal', async ({ page, context }) => {
    const emailInput = page.locator('input[type="email"]');
    const isStillOnAuthScreen = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(isStillOnAuthScreen, 'Authentication required - skipping test');

    // Look for help button in the toolbar/sidebar
    const helpButton = page.locator('button:has-text("Help"), button[title="Help"], button[aria-label*="Help"], button:has([data-icon="question"]), button:has([data-icon="help"])');

    // Help button should be visible after login
    await expect(helpButton.first()).toBeVisible({ timeout: 10000 });

    // Click help button - it opens a new window via window.open
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      helpButton.first().click(),
    ]);

    // New help window should load
    await newPage.waitForLoadState('domcontentloaded');

    await takeScreenshot(page, 'help-modal-open');
    await newPage.close();
  });

  test('should display help content', async ({ page, context }) => {
    const emailInput = page.locator('input[type="email"]');
    const isStillOnAuthScreen = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(isStillOnAuthScreen, 'Authentication required - skipping test');

    // Open help window
    const helpButton = page.locator('button:has-text("Help"), button[title="Help"], button[aria-label*="Help"], button:has([data-icon="question"]), button:has([data-icon="help"])');
    if (await helpButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const [newPage] = await Promise.all([
        context.waitForEvent('page'),
        helpButton.first().click(),
      ]);

      await newPage.waitForLoadState('domcontentloaded');

      // Help page should have some content
      const bodyContent = await newPage.locator('body').innerHTML();
      expect(bodyContent.length).toBeGreaterThan(100);

      await takeScreenshot(newPage, 'help-modal-content');
      await newPage.close();
    }
  });

  test('should close help modal', async ({ page, context }) => {
    const emailInput = page.locator('input[type="email"]');
    const isStillOnAuthScreen = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(isStillOnAuthScreen, 'Authentication required - skipping test');

    // Open help window
    const helpButton = page.locator('button:has-text("Help"), button[title="Help"], button[aria-label*="Help"], button:has([data-icon="question"]), button:has([data-icon="help"])');
    if (await helpButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const [newPage] = await Promise.all([
        context.waitForEvent('page'),
        helpButton.first().click(),
      ]);

      await newPage.waitForLoadState('domcontentloaded');

      // Close the help window
      await newPage.close();

      // Original page should still be functional
      await expect(page.locator('h2:has-text("Projects")')).toBeVisible({ timeout: 5000 });

      await takeScreenshot(page, 'help-modal-closed');
    }
  });

  test('should be accessible via keyboard', async ({ page, context }) => {
    const emailInput = page.locator('input[type="email"]');
    const isStillOnAuthScreen = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(isStillOnAuthScreen, 'Authentication required - skipping test');

    // Focus the help button and press Enter
    const helpButton = page.locator('button:has-text("Help"), button[title="Help"], button[aria-label*="Help"]');

    if (await helpButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      // Focus the help button
      await helpButton.first().focus();

      // Press Enter to open - should open in new window
      const [newPage] = await Promise.all([
        context.waitForEvent('page'),
        page.keyboard.press('Enter'),
      ]);

      await newPage.waitForLoadState('domcontentloaded');

      // Help window should have loaded
      const bodyContent = await newPage.locator('body').innerHTML();
      expect(bodyContent.length).toBeGreaterThan(0);

      await newPage.close();
      await takeScreenshot(page, 'help-keyboard-accessibility');
    }
  });
});
