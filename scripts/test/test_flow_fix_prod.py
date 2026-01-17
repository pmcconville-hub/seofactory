"""Test flow audit auto-fix on production (app.cutthecrap.net)."""
from playwright.sync_api import sync_playwright

def test_flow_fix_prod():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

        try:
            print("Step 1: Navigate to production...")
            page.goto('https://app.cutthecrap.net')
            page.wait_for_load_state('networkidle')

            print("Step 2: Logging in...")
            page.locator('input[type="email"]').fill('richard@kjenmarks.nl')
            page.locator('input[type="password"]').fill('pannekoek')
            page.locator('input[type="password"]').press('Enter')

            print("Step 3: Waiting for login...")
            page.wait_for_timeout(8000)

            if page.locator('input[type="email"]').is_visible():
                print("  LOGIN FAILED")
                return

            print("  LOGIN SUCCESSFUL!")
            page.screenshot(path='tmp/prod_01_logged_in.png', full_page=True)

            # Click first "Load" button to load a project
            print("\nStep 4: Loading project...")
            load_btns = page.locator('button:has-text("Load")').all()
            if len(load_btns) > 0:
                load_btns[0].click()
                page.wait_for_timeout(3000)
            page.screenshot(path='tmp/prod_02_project.png', full_page=True)

            # Click "Load Map" to load a topical map
            print("\nStep 5: Loading map...")
            load_map_btn = page.locator('button:has-text("Load Map")').first
            if load_map_btn.is_visible():
                load_map_btn.click()
                page.wait_for_timeout(5000)
            page.screenshot(path='tmp/prod_03_map.png', full_page=True)

            # Now we should see topics - click on one
            print("\nStep 6: Looking for topics...")
            page.wait_for_timeout(2000)
            rows = page.locator('tbody tr, table tr').all()
            print(f"  Found {len(rows)} rows")

            # Click first topic row
            for row in rows[:5]:
                text = (row.text_content() or '').strip()
                if text and len(text) > 10:
                    print(f"  Clicking: {text[:50]}")
                    row.click()
                    page.wait_for_timeout(3000)
                    break
            page.screenshot(path='tmp/prod_04_topic.png', full_page=True)

            # Look for Flow button
            print("\nStep 7: Looking for Flow button...")
            flow_btns = page.locator('button:has-text("Flow")').all()
            print(f"  Found {len(flow_btns)} Flow button(s)")

            # Show all buttons
            print("  All buttons:")
            for btn in page.locator('button').all()[:25]:
                text = (btn.text_content() or '').strip()
                if text and len(text) < 40:
                    print(f"    - {text}")

            if len(flow_btns) > 0:
                print("\nStep 8: Clicking Flow button...")
                flow_btns[0].click()
                print("  Waiting for flow analysis (25s)...")
                page.wait_for_timeout(25000)
                page.screenshot(path='tmp/prod_05_flow.png', full_page=True)

                # Look for Auto-Fix
                fix_btns = page.locator('button:has-text("Auto-Fix")').all()
                print(f"  Found {len(fix_btns)} Auto-Fix button(s)")

                if len(fix_btns) > 0:
                    print("\nStep 9: Clicking Auto-Fix...")
                    fix_btns[0].click()
                    print("  Waiting for fix (35s)...")
                    page.wait_for_timeout(35000)
                    page.screenshot(path='tmp/prod_06_fixed.png', full_page=True)

                    # Check result
                    html = page.content()
                    if 'Resolved' in html:
                        print("\n  *** SUCCESS: 'Resolved' found! ***")
                    elif 'animate-spin' in html:
                        print("\n  *** FAIL: Still spinning ***")
                    else:
                        print("\n  Check screenshot")
            else:
                # Maybe need to open draft workspace - look for draft button
                print("  No Flow button - looking for Draft button...")
                draft_btns = page.locator('button:has-text("Draft"), button:has-text("Workspace")').all()
                print(f"  Found {len(draft_btns)} Draft buttons")
                if len(draft_btns) > 0:
                    draft_btns[0].click()
                    page.wait_for_timeout(5000)
                    page.screenshot(path='tmp/prod_05_draft.png', full_page=True)

                    # Now look for Flow again
                    flow_btns = page.locator('button:has-text("Flow")').all()
                    print(f"  Now found {len(flow_btns)} Flow button(s)")

            page.screenshot(path='tmp/prod_final.png', full_page=True)

        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()
            page.screenshot(path='tmp/prod_error.png', full_page=True)
        finally:
            print(f"\n=== Done ({len(console_logs)} console logs) ===")
            browser.close()

if __name__ == "__main__":
    test_flow_fix_prod()
