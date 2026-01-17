"""Test the flow audit auto-fix button functionality."""
from playwright.sync_api import sync_playwright
import time

def test_flow_fix():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Enable console logging
        page.on("console", lambda msg: print(f"[Console] {msg.type}: {msg.text}"))

        print("Step 1: Navigate to app")
        page.goto('http://localhost:3000')
        page.wait_for_load_state('networkidle')
        page.screenshot(path='tmp/flow_test_01_initial.png', full_page=True)

        # Check if we need to log in
        login_button = page.locator('button:has-text("Sign In"), button:has-text("Login"), input[type="email"]')
        if login_button.count() > 0:
            print("Step 2: Need to log in - taking screenshot of login screen")
            page.screenshot(path='tmp/flow_test_02_login.png', full_page=True)

            # Try to find email input
            email_input = page.locator('input[type="email"]')
            if email_input.count() > 0:
                print("Found email input, attempting login...")
                # You would need to fill in actual credentials here
                # For now, just document what we see
        else:
            print("Step 2: Already logged in or no auth required")

        # Look for project selector or dashboard elements
        print("Step 3: Looking for navigation elements...")
        page.screenshot(path='tmp/flow_test_03_current.png', full_page=True)

        # Print what's visible on the page
        buttons = page.locator('button').all()
        print(f"Found {len(buttons)} buttons on page:")
        for i, btn in enumerate(buttons[:10]):  # First 10 buttons
            try:
                text = btn.text_content()
                if text and text.strip():
                    print(f"  {i}: {text.strip()[:50]}")
            except:
                pass

        # Look for the Flow button specifically
        flow_button = page.locator('button:has-text("Flow"), [title*="Flow"]')
        if flow_button.count() > 0:
            print(f"Found Flow button(s): {flow_button.count()}")
        else:
            print("No Flow button found - may need to navigate to a topic with a draft first")

        # Check for any modals or panels
        modals = page.locator('[role="dialog"], .modal, [class*="Modal"]')
        if modals.count() > 0:
            print(f"Found {modals.count()} modal(s)")
            page.screenshot(path='tmp/flow_test_04_modal.png', full_page=True)

        browser.close()
        print("\nTest complete. Check tmp/flow_test_*.png for screenshots.")

if __name__ == "__main__":
    test_flow_fix()
