"""Full browser test for flow audit auto-fix functionality."""
from playwright.sync_api import sync_playwright
import time

def test_flow_fix_full():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Collect console logs
        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

        try:
            # Step 1: Navigate and login
            print("Step 1: Navigate to app...")
            page.goto('http://localhost:3000')
            page.wait_for_load_state('networkidle')

            print("Step 2: Logging in...")
            page.locator('input[type="email"]').fill('richard@kjenmarks.nl')
            page.locator('input[type="password"]').fill('pannekoek')

            print("Step 3: Clicking Sign In...")
            page.locator('button:has-text("Sign In")').first.click()

            # Just wait and take screenshots
            print("Step 4: Waiting 5 seconds...")
            page.wait_for_timeout(5000)
            page.screenshot(path='tmp/flow_full_01_5sec.png', full_page=True)

            print("Step 5: Waiting 5 more seconds...")
            page.wait_for_timeout(5000)
            page.screenshot(path='tmp/flow_full_02_10sec.png', full_page=True)

            # Check if we're past login
            email_visible = page.locator('input[type="email"]').is_visible()
            print(f"  Email input still visible: {email_visible}")

            if not email_visible:
                print("  LOGIN SUCCESSFUL!")

                # Now look for project selector
                page.wait_for_timeout(2000)
                page.screenshot(path='tmp/flow_full_03_logged_in.png', full_page=True)

                # Look for projects
                page_text = page.text_content('body') or ''
                print(f"  Page contains 'project': {'project' in page_text.lower()}")
                print(f"  Page contains 'map': {'map' in page_text.lower()}")
                print(f"  Page contains 'topic': {'topic' in page_text.lower()}")

                # List all visible buttons
                print("\nVisible buttons:")
                for btn in page.locator('button').all()[:20]:
                    try:
                        text = btn.text_content()
                        if text and text.strip():
                            print(f"  - {text.strip()[:60]}")
                    except:
                        pass

                # Look for and click project
                print("\nStep 6: Looking for projects to click...")
                clickables = page.locator('[class*="cursor-pointer"], .card, [role="button"]').all()
                for elem in clickables[:5]:
                    try:
                        text = elem.text_content()
                        if text and len(text.strip()) > 3 and 'sign' not in text.lower():
                            print(f"  Clicking: {text.strip()[:40]}")
                            elem.click()
                            page.wait_for_timeout(3000)
                            page.screenshot(path='tmp/flow_full_04_clicked_project.png', full_page=True)
                            break
                    except Exception as e:
                        print(f"  Click failed: {e}")

                # Keep navigating
                page.wait_for_timeout(2000)
                page.screenshot(path='tmp/flow_full_05_after_project.png', full_page=True)

                # Look for Flow button now
                print("\nStep 7: Looking for Flow button...")
                flow_btns = page.locator('button:has-text("Flow")').all()
                print(f"  Found {len(flow_btns)} Flow button(s)")

                if len(flow_btns) > 0:
                    print("Step 8: Clicking Flow button...")
                    flow_btns[0].click()
                    page.wait_for_timeout(8000)  # Wait for analysis
                    page.screenshot(path='tmp/flow_full_06_flow_modal.png', full_page=True)

                    # Look for Auto-Fix
                    print("\nStep 9: Looking for Auto-Fix button...")
                    fix_btns = page.locator('button:has-text("Auto-Fix")').all()
                    print(f"  Found {len(fix_btns)} Auto-Fix button(s)")

                    if len(fix_btns) > 0:
                        print("Step 10: Clicking Auto-Fix...")
                        fix_btns[0].click()
                        page.wait_for_timeout(15000)  # Wait for AI fix
                        page.screenshot(path='tmp/flow_full_07_after_fix.png', full_page=True)

                        # Check result
                        page_html = page.content()
                        if 'Resolved' in page_html:
                            print("  SUCCESS: Found 'Resolved' in page!")
                        else:
                            print("  Check screenshot for result")
            else:
                print("  Login may have failed - still on login page")

            page.screenshot(path='tmp/flow_full_final.png', full_page=True)

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path='tmp/flow_full_error.png', full_page=True)
        finally:
            print("\n=== Console Logs (auth-related) ===")
            for log in console_logs:
                if 'auth' in log.lower() or 'session' in log.lower() or 'error' in log.lower():
                    print(f"  {log[:100]}")
            browser.close()

if __name__ == "__main__":
    test_flow_fix_full()
