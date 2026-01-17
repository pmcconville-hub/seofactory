"""
Test wizard save functionality - verify no hang on save
"""
import asyncio
from playwright.async_api import async_playwright
import os

TEST_URL = "http://localhost:3000"
TEST_EMAIL = os.environ.get("TEST_EMAIL", "richard@dfromparis.com")
TEST_PASSWORD = os.environ.get("TEST_PASSWORD", "")

async def test_wizard_save():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()

        # Listen for console messages
        page.on("console", lambda msg: print(f"[CONSOLE] {msg.type}: {msg.text}"))

        print("1. Navigating to app...")
        await page.goto(TEST_URL)
        await page.wait_for_timeout(2000)

        # Take screenshot to see current state
        await page.screenshot(path="tmp/wizard_test_01_initial.png")

        # Check if we need to login
        login_button = page.locator("button:has-text('Sign In')")
        if await login_button.count() > 0:
            print("2. Login form found, entering credentials...")
            await page.fill("input[type='email']", TEST_EMAIL)
            await page.fill("input[type='password']", TEST_PASSWORD)
            await login_button.click()
            await page.wait_for_timeout(5000)
            await page.screenshot(path="tmp/wizard_test_02_after_login.png")

        # Wait for dashboard to load
        print("3. Waiting for dashboard...")
        await page.wait_for_timeout(3000)
        await page.screenshot(path="tmp/wizard_test_03_dashboard.png")

        # Look for any "Save" or "Generate" button that might trigger the wizard save
        print("4. Looking for save/generate buttons...")

        # Check for the "Save and Generate" button
        save_generate_btn = page.locator("button:has-text('Save and Generate')")
        if await save_generate_btn.count() > 0:
            print("5. Found 'Save and Generate' button - clicking...")
            await save_generate_btn.click()

            # Wait and monitor console for the save steps
            print("6. Waiting for save operation (watching for timeout)...")

            # Wait up to 15 seconds for Step 1a to appear in console
            start_time = asyncio.get_event_loop().time()
            timeout_reached = False

            while asyncio.get_event_loop().time() - start_time < 15:
                await page.wait_for_timeout(500)
                # Check if we see Step 1a or Step 1b in the console
                # The console event handler above will print these

            await page.screenshot(path="tmp/wizard_test_04_after_save.png")
            print("7. Save operation completed (or timed out)")
        else:
            print("5. No 'Save and Generate' button visible - checking current state...")
            await page.screenshot(path="tmp/wizard_test_04_no_button.png")

            # List all visible buttons
            buttons = page.locator("button")
            count = await buttons.count()
            print(f"   Found {count} buttons on page")
            for i in range(min(count, 10)):
                btn = buttons.nth(i)
                text = await btn.inner_text()
                print(f"   - Button {i}: '{text}'")

        print("8. Test complete")
        await page.wait_for_timeout(2000)
        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_wizard_save())
