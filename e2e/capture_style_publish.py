"""
capture_style_publish.py

Captures detailed screenshots of the Style & Publish output for a specific topic.
Uses sync Playwright with Chromium in headless mode.

The app uses React Router with nested loaders. After login, projects are fetched
asynchronously into React state. A full page.goto() triggers a complete app reload,
losing the loaded state. To navigate to deep URLs, we must either:
  1) Navigate through the UI (Open project -> Load map -> topic -> style), or
  2) Use client-side navigation (pushState + popstate) after state is loaded.

This script uses approach 1: UI-based navigation after login.

Usage:
    python e2e/capture_style_publish.py
"""

import time
from pathlib import Path
from playwright.sync_api import sync_playwright, Page, TimeoutError as PlaywrightTimeout

# Configuration
BASE_URL = "http://localhost:3000"
PROJECT_ID = "f9e562a6-5491-4bbb-874c-cc2764f5cb9a"
MAP_ID = "72170f52-0efb-4551-b577-941f0d98e028"
TOPIC_ID = "661a1680-16d8-4bbe-bc63-97069250d722"
TARGET_PATH = f"/p/{PROJECT_ID}/m/{MAP_ID}/topics/{TOPIC_ID}/style"
EMAIL = "richard@kjenmarks.nl"
PASSWORD = "pannekoek"

SCRIPT_DIR = Path(__file__).resolve().parent
SCREENSHOT_DIR = SCRIPT_DIR / "screenshots"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)


def screenshot(page: Page, name: str, full_page: bool = True) -> str:
    """Take a screenshot and return the file path."""
    filepath = str(SCREENSHOT_DIR / name)
    page.screenshot(path=filepath, full_page=full_page)
    print(f"  [SCREENSHOT] {name}")
    return filepath


def wait_for_network_idle(page: Page, timeout: int = 10000):
    """Wait for network to be idle."""
    try:
        page.wait_for_load_state("networkidle", timeout=timeout)
    except PlaywrightTimeout:
        pass


def client_side_navigate(page: Page, path: str):
    """Use React Router's client-side navigation to avoid full page reload.
    This preserves the React state (projects, maps, etc.)."""
    # Dispatch a popstate event after pushState to trigger React Router
    page.evaluate(f"""() => {{
        window.history.pushState({{}}, '', '{path}');
        window.dispatchEvent(new PopStateEvent('popstate'));
    }}""")


def wait_for_url_contains(page: Page, substring: str, timeout: int = 15000):
    """Wait until the current URL contains a substring."""
    start = time.time()
    while time.time() - start < timeout / 1000:
        if substring in page.url:
            return True
        page.wait_for_timeout(500)
    return False


def main():
    print("=" * 60)
    print("Style & Publish Screenshot Capture")
    print("=" * 60)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=2,
        )
        page = context.new_page()
        page.set_default_timeout(30000)

        errors = []
        page.on("pageerror", lambda err: errors.append(str(err)))

        # -------------------------------------------------------
        # Step 1: Login
        # -------------------------------------------------------
        print("\n[Step 1] Logging in...")
        page.goto(BASE_URL, wait_until="domcontentloaded")
        wait_for_network_idle(page, timeout=15000)

        try:
            page.wait_for_selector('input[type="email"]', timeout=15000)
        except PlaywrightTimeout:
            print("  No login form found, may already be authenticated")

        email_input = page.locator('input[type="email"]')
        if email_input.is_visible():
            email_input.fill(EMAIL)
            page.locator('input[type="password"]').fill(PASSWORD)
            page.locator('button[type="submit"]').click()

            print("  Waiting for authentication...")
            try:
                page.wait_for_url("**/projects**", timeout=15000)
                print("  Redirected to projects page")
            except PlaywrightTimeout:
                page.wait_for_timeout(3000)
                print(f"  Current URL after login: {page.url}")

            wait_for_network_idle(page)
            print("  Login complete")
        else:
            print("  Already logged in")

        # -------------------------------------------------------
        # Step 2: Wait for projects to load, then open NFIR project
        # -------------------------------------------------------
        print("\n[Step 2] Waiting for projects and opening NFIR project...")

        # Wait for the project table rows
        try:
            page.wait_for_selector('table tbody tr', timeout=15000)
            print("  Projects table loaded")
        except PlaywrightTimeout:
            try:
                page.wait_for_selector('button:has-text("Open")', timeout=10000)
                print("  Projects loaded (Open buttons visible)")
            except PlaywrightTimeout:
                print("  WARNING: Projects did not load")
                screenshot(page, "00-diagnostic.png")

        wait_for_network_idle(page, timeout=10000)
        page.wait_for_timeout(2000)

        # Find and click the NFIR project Open button
        nfir_row = page.locator('tr', has_text='NFIR').first
        if not nfir_row.is_visible(timeout=3000):
            nfir_row = page.locator('tr', has_text='nfir').first

        if nfir_row.is_visible(timeout=5000):
            print("  Found NFIR project, clicking Open...")
            nfir_row.locator('button:has-text("Open")').click()
            page.wait_for_timeout(3000)
            wait_for_network_idle(page, timeout=15000)
            print(f"  URL: {page.url}")
        else:
            print("  WARNING: Could not find NFIR project row")

        # -------------------------------------------------------
        # Step 3: Load the map
        # -------------------------------------------------------
        print("\n[Step 3] Loading the map...")

        # Wait for map selection page to appear
        page.wait_for_timeout(2000)

        # Look for Load Map button
        load_btn = page.locator('button:has-text("Load Map")').first
        if load_btn.is_visible(timeout=10000):
            print("  Found Load Map button, clicking...")
            load_btn.click()
            page.wait_for_timeout(5000)
            wait_for_network_idle(page, timeout=20000)
            print(f"  URL: {page.url}")
        else:
            # Might auto-load or have a different button
            open_btn = page.locator('button:has-text("Open")').first
            if open_btn.is_visible(timeout=5000):
                print("  Found Open button, clicking...")
                open_btn.click()
                page.wait_for_timeout(5000)
                wait_for_network_idle(page, timeout=20000)
                print(f"  URL: {page.url}")
            else:
                print("  No Load Map button found, map may auto-load")

        # Wait for the dashboard/map content to be fully loaded
        page.wait_for_timeout(5000)
        wait_for_network_idle(page, timeout=10000)

        # -------------------------------------------------------
        # Step 4: Navigate to Style page using client-side routing
        # -------------------------------------------------------
        print("\n[Step 4] Navigating to Style page via client-side routing...")
        print(f"  Target: {TARGET_PATH}")
        print(f"  Current URL before nav: {page.url}")

        # Use client-side navigation to preserve React state
        client_side_navigate(page, TARGET_PATH)
        page.wait_for_timeout(5000)
        wait_for_network_idle(page, timeout=15000)

        current_url = page.url
        print(f"  URL after navigation: {current_url}")

        # If the URL doesn't contain 'style', try again
        if "style" not in current_url:
            print("  Client-side nav may not have triggered React Router properly")
            print("  Trying alternative: evaluating navigate() on the React Router context...")

            # Alternative: try using the Link component's click or a direct evaluate
            # This approach manipulates the URL bar and dispatches a custom event
            page.evaluate(f"""() => {{
                // Create a link and click it to trigger React Router
                const link = document.createElement('a');
                link.href = '{TARGET_PATH}';
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }}""")
            page.wait_for_timeout(5000)
            current_url = page.url
            print(f"  URL after link click approach: {current_url}")

        if "style" not in current_url:
            print("  Direct client-side navigation failed.")
            print("  Navigating through the UI manually: Dashboard -> Topic -> Style")

            # Check where we are
            if "/m/" in current_url:
                print("  We're on the map/dashboard page. Good.")
                # We need to find the topic in the topics table
                # Search for the topic or scroll to find it
                page.wait_for_timeout(2000)

                # Look for a topic table or list
                topic_rows = page.locator('table tbody tr')
                topic_count = topic_rows.count()
                print(f"  Found {topic_count} topic rows in dashboard")

                if topic_count > 0:
                    # Try to find our topic or click the first one
                    # Since we don't know the topic name, we need to search or browse
                    # Let's try clicking on the topic row
                    for i in range(min(topic_count, 20)):
                        row = topic_rows.nth(i)
                        try:
                            row_text = row.inner_text(timeout=2000)
                            # Click the row to see the topic details
                            if "kwetsbaar" in row_text.lower() or "cyber" in row_text.lower():
                                print(f"  Found target topic in row {i}: {row_text[:60]}...")
                                row.click()
                                page.wait_for_timeout(2000)
                                break
                        except Exception:
                            continue

                    # After clicking a topic, we might see a detail view with action buttons
                    # Look for style/publish option
                    style_btn = page.locator('button:has-text("Style"), a:has-text("Style")')
                    if style_btn.first.is_visible(timeout=5000):
                        style_btn.first.click()
                        page.wait_for_timeout(3000)
                        print(f"  Clicked Style button. URL: {page.url}")

        # Final check: try full page navigation as last resort
        # This works because auth tokens are persisted and the loader sequence
        # has time to complete
        if "style" not in page.url:
            print("  Last resort: full page navigation with extended wait...")
            page.goto(BASE_URL + TARGET_PATH, wait_until="domcontentloaded")
            # Wait a long time for the entire data cascade
            page.wait_for_timeout(15000)
            wait_for_network_idle(page, timeout=20000)

            # The app may redirect during loading, keep checking
            for attempt in range(5):
                page.wait_for_timeout(3000)
                if "style" in page.url:
                    break
                if "projects" in page.url and "/p/" not in page.url:
                    # Still on projects page, the auth/project data is loading
                    page.wait_for_timeout(5000)
                    page.goto(BASE_URL + TARGET_PATH, wait_until="domcontentloaded")
                    page.wait_for_timeout(10000)

            print(f"  Final URL: {page.url}")

        # -------------------------------------------------------
        # Step 5: Wait for Style & Publish UI
        # -------------------------------------------------------
        print(f"\n[Step 5] Current URL: {page.url}")
        print("  Waiting for Style & Publish UI...")

        selectors_to_try = [
            'text=Brand Intelligence',
            'text=Brand',
            'text=Style & Publish',
            'button:has-text("Next")',
            'text=Layout Intelligence',
            'text=Preview',
        ]

        found_selector = None
        for sel in selectors_to_try:
            try:
                page.wait_for_selector(sel, timeout=5000)
                found_selector = sel
                print(f"  Found: {sel}")
                break
            except PlaywrightTimeout:
                continue

        if not found_selector:
            print("  WARNING: Style & Publish UI not found")
            screenshot(page, "00-diagnostic.png")
            # Print page content for debugging
            try:
                body_text = page.locator('body').inner_text(timeout=5000)
                print(f"  Page content preview: {body_text[:300]}...")
            except Exception:
                pass

        page.wait_for_timeout(3000)

        # -------------------------------------------------------
        # Step 6: Screenshot Brand step
        # -------------------------------------------------------
        print("\n[Step 6] Capturing Brand step...")
        screenshot(page, "01-brand.png")

        # -------------------------------------------------------
        # Step 7: Navigate to Layout step
        # -------------------------------------------------------
        print("\n[Step 7] Navigating to Layout step...")
        next_btn = page.locator('button:has-text("Next")').first
        try:
            if next_btn.is_visible(timeout=5000):
                next_btn.click()
                page.wait_for_timeout(3000)
                wait_for_network_idle(page)
                print("  Clicked Next -- now on Layout step")
            else:
                raise Exception("Not visible")
        except Exception:
            layout_tab = page.locator('text=Layout').first
            try:
                if layout_tab.is_visible(timeout=3000):
                    layout_tab.click()
                    page.wait_for_timeout(3000)
                    print("  Clicked Layout tab")
                else:
                    print("  WARNING: No Next button or Layout tab")
            except Exception:
                print("  WARNING: No Next button or Layout tab")

        screenshot(page, "02-layout.png")

        # -------------------------------------------------------
        # Step 8: Navigate to Preview step
        # -------------------------------------------------------
        print("\n[Step 8] Navigating to Preview step...")
        next_btn = page.locator('button:has-text("Next")').first
        try:
            if next_btn.is_visible(timeout=5000):
                next_btn.click()
                page.wait_for_timeout(3000)
                wait_for_network_idle(page)
                print("  Clicked Next -- now on Preview step")
            else:
                raise Exception("Not visible")
        except Exception:
            preview_tab = page.locator('text=Preview').first
            try:
                if preview_tab.is_visible(timeout=3000):
                    preview_tab.click()
                    page.wait_for_timeout(3000)
                    print("  Clicked Preview tab")
                else:
                    print("  WARNING: No Next button or Preview tab")
            except Exception:
                print("  WARNING: No Next button or Preview tab")

        screenshot(page, "03-preview.png")

        # -------------------------------------------------------
        # Step 9: Click Generate if available
        # -------------------------------------------------------
        print("\n[Step 9] Looking for Generate button...")
        gen_selectors = [
            'button:has-text("Generate Preview")',
            'button:has-text("Generate")',
            'button:has-text("Render")',
            'button:has-text("Build Preview")',
        ]

        gen_btn = None
        for sel in gen_selectors:
            try:
                btn = page.locator(sel).first
                if btn.is_visible(timeout=3000):
                    gen_btn = btn
                    print(f"  Found: {sel}")
                    break
            except Exception:
                continue

        if gen_btn:
            print("  Clicking Generate...")
            gen_btn.scroll_into_view_if_needed()
            page.wait_for_timeout(500)
            gen_btn.click(force=True)

            print("  Waiting for generation (up to 3 minutes)...")
            start_time = time.time()
            generation_complete = False

            while time.time() - start_time < 180:
                page.wait_for_timeout(5000)
                iframe_count = page.locator("iframe").count()
                elapsed = int(time.time() - start_time)
                spinner_count = page.locator('[class*="spinner"], [class*="loading"]').count()
                gen_text_count = page.locator('text=Generating').count()
                loading = spinner_count > 0 or gen_text_count > 0

                print(f"    [{elapsed}s] iframes={iframe_count}, loading={loading}")

                if iframe_count > 0:
                    print("  Generation complete!")
                    page.wait_for_timeout(5000)
                    generation_complete = True
                    break

                if elapsed > 30 and not loading and iframe_count == 0:
                    # Check for inline rendered content
                    rendered = page.locator('article, .rendered-article, [class*="rendered"]').count()
                    if rendered > 0:
                        print("  Inline content detected!")
                        generation_complete = True
                        break

            if not generation_complete:
                print("  WARNING: Generation timed out")
        else:
            print("  No Generate button found")
            iframe_count = page.locator("iframe").count()
            print(f"  Existing iframes: {iframe_count}")

        # -------------------------------------------------------
        # Step 10: Full-page screenshot of preview output
        # -------------------------------------------------------
        print("\n[Step 10] Capturing preview output...")
        page.wait_for_timeout(3000)
        screenshot(page, "04-preview-output.png", full_page=True)

        # -------------------------------------------------------
        # Step 11: Screenshot iframe content
        # -------------------------------------------------------
        print("\n[Step 11] Capturing iframe content...")
        iframe_elements = page.locator("iframe")
        iframe_count = iframe_elements.count()
        print(f"  Found {iframe_count} iframe(s)")

        iframe_captured = False
        if iframe_count > 0:
            for i in range(iframe_count):
                try:
                    iframe_el = iframe_elements.nth(i)
                    if not iframe_el.is_visible(timeout=3000):
                        continue

                    iframe_el.screenshot(path=str(SCREENSHOT_DIR / "05-rendered-content.png"))
                    print(f"  Captured iframe {i}")
                    iframe_captured = True

                    frame = page.frame_locator(f"iframe >> nth={i}")
                    body = frame.locator("body")
                    if body.is_visible(timeout=5000):
                        body_html = body.inner_html()
                        print(f"  Iframe body: {len(body_html)} chars")
                        html_path = SCREENSHOT_DIR / "rendered-content.html"
                        with open(html_path, "w", encoding="utf-8") as f:
                            f.write(f"<!DOCTYPE html><html><head><meta charset='utf-8'></head><body>{body_html}</body></html>")
                        print(f"  Saved HTML to {html_path}")
                    break
                except Exception as e:
                    print(f"  Iframe {i} error: {e}")

        if not iframe_captured:
            print("  No iframe captured -- fallback page screenshot")
            screenshot(page, "05-rendered-content.png")

        # -------------------------------------------------------
        # Step 12: Scroll iframe to capture content below the hero
        # -------------------------------------------------------
        print("\n[Step 12] Scrolling iframe...")
        if iframe_count > 0:
            try:
                frame = page.frame_locator("iframe").first
                body = frame.locator("body")
                if body.is_visible(timeout=5000):
                    # Try scrolling on multiple possible scroll containers
                    # The iframe document's scrolling element could be html or body
                    frame_page_scroll = """(el) => {
                        // Try scrolling the document element (html)
                        const doc = el.ownerDocument;
                        const scrollEl = doc.scrollingElement || doc.documentElement;
                        const totalHeight = scrollEl.scrollHeight;
                        scrollEl.scrollTop = totalHeight / 3;
                        // Also try body directly
                        doc.body.scrollTop = totalHeight / 3;
                        return { scrollHeight: totalHeight, scrollTop: scrollEl.scrollTop };
                    }"""
                    result = body.evaluate(frame_page_scroll)
                    print(f"  Scrolled to 1/3: scrollHeight={result.get('scrollHeight', '?')}, scrollTop={result.get('scrollTop', '?')}")
                    page.wait_for_timeout(1500)
                    page.locator("iframe").first.screenshot(
                        path=str(SCREENSHOT_DIR / "06-rendered-scrolled.png"))
                    print("  Captured scrolled content (1/3)")

                    frame_page_scroll_2 = """(el) => {
                        const doc = el.ownerDocument;
                        const scrollEl = doc.scrollingElement || doc.documentElement;
                        const totalHeight = scrollEl.scrollHeight;
                        scrollEl.scrollTop = (totalHeight / 3) * 2;
                        doc.body.scrollTop = (totalHeight / 3) * 2;
                        return { scrollHeight: totalHeight, scrollTop: scrollEl.scrollTop };
                    }"""
                    result2 = body.evaluate(frame_page_scroll_2)
                    print(f"  Scrolled to 2/3: scrollTop={result2.get('scrollTop', '?')}")
                    page.wait_for_timeout(1500)
                    page.locator("iframe").first.screenshot(
                        path=str(SCREENSHOT_DIR / "06b-rendered-scrolled-further.png"))
                    print("  Captured scrolled content (2/3)")
                else:
                    screenshot(page, "06-rendered-scrolled.png")
            except Exception as e:
                print(f"  Error scrolling iframe: {e}")
                screenshot(page, "06-rendered-scrolled.png")
        else:
            page.evaluate("window.scrollBy(0, window.innerHeight)")
            page.wait_for_timeout(1500)
            screenshot(page, "06-rendered-scrolled.png")

        # -------------------------------------------------------
        # Step 13: Quality score section
        # -------------------------------------------------------
        print("\n[Step 13] Looking for quality score...")
        quality_found = False
        for sel in ['text=Brand Match', 'text=Quality', 'text=Brand Alignment', '[class*="quality"]', '[class*="score"]']:
            try:
                el = page.locator(sel).first
                if el.is_visible(timeout=2000):
                    el.scroll_into_view_if_needed()
                    page.wait_for_timeout(500)
                    screenshot(page, "07-quality.png", full_page=False)
                    quality_found = True
                    print(f"  Found: {sel}")
                    break
            except Exception:
                continue

        if not quality_found:
            print("  No quality score found -- viewport screenshot")
            screenshot(page, "07-quality.png", full_page=False)

        # -------------------------------------------------------
        # Summary
        # -------------------------------------------------------
        print("\n" + "=" * 60)
        print("CAPTURE COMPLETE")
        print("=" * 60)
        print(f"Screenshots saved to: {SCREENSHOT_DIR}")

        our_files = sorted(SCREENSHOT_DIR.glob("[0-9][0-9]-*.png"))
        print(f"\nScreenshots from this run ({len(our_files)}):")
        for f in our_files:
            size_kb = f.stat().st_size / 1024
            print(f"  {f.name} ({size_kb:.1f} KB)")

        if errors:
            print(f"\nPage errors ({len(errors)}):")
            for err in errors[:10]:
                print(f"  - {err[:150]}")
        else:
            print("\nNo page errors.")

        print("=" * 60)

        browser.close()


if __name__ == "__main__":
    main()
