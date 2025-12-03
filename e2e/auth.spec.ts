// e2e/auth.spec.ts
// End-to-end tests for authentication functionality

import { test, expect } from '@playwright/test';
import { waitForAppLoad, TEST_CONFIG, takeScreenshot } from './test-utils';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage to ensure we're logged out
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');
    await waitForAppLoad(page);
  });

  test('should display login form on initial load', async ({ page }) => {
    // Check for auth form elements
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]:has-text("Sign In")')).toBeVisible();

    await takeScreenshot(page, 'auth-login-form');
  });

  test('should show signup tab', async ({ page }) => {
    // Look for Sign Up tab or button
    const signUpTab = page.locator('button:has-text("Sign Up"), a:has-text("Sign Up")');
    await expect(signUpTab.first()).toBeVisible({ timeout: 10000 });

    // Click the sign up tab
    await signUpTab.first().click();

    // Should show sign up form
    await expect(page.locator('button[type="submit"]:has-text("Sign Up"), button[type="submit"]:has-text("Create Account")')).toBeVisible({ timeout: 5000 });

    await takeScreenshot(page, 'auth-signup-form');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Fill in invalid credentials
    await page.locator('input[type="email"]').fill('invalid@example.com');
    await page.locator('input[type="password"]').fill('wrongpassword');

    // Click login button
    await page.locator('button[type="submit"]:has-text("Sign In")').click();

    // Wait a moment for error to appear
    await page.waitForTimeout(3000);

    // Should show error message or remain on auth screen
    const emailInput = page.locator('input[type="email"]');
    const isStillOnAuthScreen = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);

    expect(isStillOnAuthScreen).toBe(true);

    await takeScreenshot(page, 'auth-invalid-credentials');
  });

  test('should login with valid credentials', async ({ page }) => {
    // Skip if no valid credentials
    if (!TEST_CONFIG.TEST_EMAIL || !TEST_CONFIG.TEST_PASSWORD) {
      test.skip(true, 'No test credentials configured');
      return;
    }

    // Fill in valid credentials
    await page.locator('input[type="email"]').fill(TEST_CONFIG.TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_CONFIG.TEST_PASSWORD);

    // Click login button
    await page.locator('button[type="submit"]:has-text("Sign In")').click();

    // Wait for navigation to project selection or dashboard
    await page.waitForSelector('h2:has-text("Create New Project"), h2:has-text("Site Analysis"), button:has-text("Open Site Analysis")', {
      timeout: TEST_CONFIG.DEFAULT_TIMEOUT,
    });

    // Should no longer show auth form
    const emailInput = page.locator('input[type="email"]');
    const isAuthFormHidden = await emailInput.isHidden({ timeout: 5000 }).catch(() => true);

    expect(isAuthFormHidden).toBe(true);

    await takeScreenshot(page, 'auth-logged-in');
  });

  test('should persist session across page reload', async ({ page }) => {
    // Skip if no valid credentials
    if (!TEST_CONFIG.TEST_EMAIL || !TEST_CONFIG.TEST_PASSWORD) {
      test.skip(true, 'No test credentials configured');
      return;
    }

    // Login first
    await page.locator('input[type="email"]').fill(TEST_CONFIG.TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_CONFIG.TEST_PASSWORD);
    await page.locator('button[type="submit"]:has-text("Sign In")').click();

    // Wait for successful login
    await page.waitForSelector('h2:has-text("Create New Project"), h2:has-text("Site Analysis"), button:has-text("Open Site Analysis")', {
      timeout: TEST_CONFIG.DEFAULT_TIMEOUT,
    });

    // Reload the page
    await page.reload();
    await waitForAppLoad(page);

    // Should still be logged in - not showing auth form
    const emailInput = page.locator('input[type="email"]');
    const isAuthFormHidden = await emailInput.isHidden({ timeout: 10000 }).catch(() => true);

    expect(isAuthFormHidden).toBe(true);

    // Should show project selection or dashboard
    const projectUI = page.locator('h2:has-text("Create New Project"), h2:has-text("Site Analysis"), button:has-text("Open Site Analysis")');
    await expect(projectUI.first()).toBeVisible({ timeout: 10000 });

    await takeScreenshot(page, 'auth-session-persisted');
  });
});
