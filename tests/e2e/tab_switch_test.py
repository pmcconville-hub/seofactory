"""
Tab Switch Stability Test

Tests that the application remains functional after switching tabs during various states.
This catches issues like:
- requestIdleCallback not firing in background tabs
- CSS not reloading after tab restore
- React state corruption after tab visibility changes
"""
import asyncio
from playwright.async_api import async_playwright, Page, expect
import time


async def test_tab_switch_during_idle(page: Page):
    """Test that app remains functional after simple tab switch while idle."""
    # Navigate to the app
    await page.goto("http://localhost:5173")

    # Wait for initial render
    await page.wait_for_selector("body", state="visible")

    # Simulate hiding the tab (like switching to another tab)
    await page.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
    await page.evaluate("Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true })")
    await page.evaluate("document.dispatchEvent(new Event('visibilitychange'))")

    # Wait a bit (simulating time in background)
    await asyncio.sleep(2)

    # Simulate tab becoming visible again
    await page.evaluate("Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true })")
    await page.evaluate("document.dispatchEvent(new Event('visibilitychange'))")

    # Wait for any async operations to complete
    await asyncio.sleep(1)

    # Check that the page is still functional (not white/blank)
    body = await page.query_selector("body")
    assert body is not None

    # Check that body has visible content (not white screen)
    body_text = await body.inner_text()
    assert len(body_text) > 0, "Page is blank after tab switch"

    # Check that styles are applied (background color should not be white)
    bg_color = await page.evaluate("""
        () => window.getComputedStyle(document.body).backgroundColor
    """)
    # Should be dark gray (#111827 = rgb(17, 24, 39)), not white
    assert "17" in bg_color or "111827" in bg_color or bg_color != "rgb(255, 255, 255)", \
        f"Background color is wrong after tab switch: {bg_color}"


async def test_setTimeout_fires_in_background():
    """
    Verify that setTimeout works in background tabs (unlike requestIdleCallback).
    This is a regression test for the tab switch hang bug.
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Test that setTimeout fires even when tab is "hidden"
        result = await page.evaluate("""
            () => new Promise((resolve) => {
                // Simulate hidden tab
                Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });

                const start = Date.now();

                // setTimeout should still fire in reasonable time
                setTimeout(() => {
                    const elapsed = Date.now() - start;
                    resolve({ fired: true, elapsed });
                }, 0);
            })
        """)

        assert result["fired"] is True, "setTimeout did not fire"
        assert result["elapsed"] < 100, f"setTimeout took too long: {result['elapsed']}ms"

        await browser.close()


async def test_visibility_change_handler():
    """Test that visibility change handler doesn't cause errors."""
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Listen for console errors
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)

        await page.goto("http://localhost:5173")
        await page.wait_for_load_state("networkidle")

        # Rapid visibility changes (stress test)
        for _ in range(5):
            await page.evaluate("""
                Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
                document.dispatchEvent(new Event('visibilitychange'));
            """)
            await asyncio.sleep(0.1)
            await page.evaluate("""
                Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
                document.dispatchEvent(new Event('visibilitychange'));
            """)
            await asyncio.sleep(0.1)

        # Wait for any async operations
        await asyncio.sleep(1)

        # Check for ReferenceError or other critical errors
        critical_errors = [e for e in errors if "ReferenceError" in e or "TypeError" in e]
        assert len(critical_errors) == 0, f"Critical errors found: {critical_errors}"

        await browser.close()


async def main():
    """Run all tab switch tests."""
    print("Running tab switch stability tests...")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            print("\n1. Testing tab switch during idle...")
            await test_tab_switch_during_idle(page)
            print("   ✓ PASSED")
        except Exception as e:
            print(f"   ✗ FAILED: {e}")

        await browser.close()

    print("\n2. Testing setTimeout in background...")
    try:
        await test_setTimeout_fires_in_background()
        print("   ✓ PASSED")
    except Exception as e:
        print(f"   ✗ FAILED: {e}")

    print("\n3. Testing visibility change handler...")
    try:
        await test_visibility_change_handler()
        print("   ✓ PASSED")
    except Exception as e:
        print(f"   ✗ FAILED: {e}")

    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(main())
