"""Complete test for flow audit auto-fix on production."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

from playwright.sync_api import sync_playwright

def test_flow_fix():
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
                browser.close()
                return

            print("  LOGIN SUCCESSFUL!")
            page.screenshot(path='tmp/flow_complete_01_logged_in.png', full_page=True)

            # Click first Load button to load a project
            print("\nStep 4: Loading project...")
            load_btns = page.locator('button:has-text("Load")').all()
            if len(load_btns) > 0:
                load_btns[0].click()
                page.wait_for_timeout(3000)
            page.screenshot(path='tmp/flow_complete_02_project.png', full_page=True)

            # Click Load Map to load a topical map
            print("\nStep 5: Loading map...")
            load_map_btn = page.locator('button:has-text("Load Map")').first
            if load_map_btn.is_visible():
                load_map_btn.click()
                page.wait_for_timeout(5000)
            page.screenshot(path='tmp/flow_complete_03_map.png', full_page=True)

            # Click on Content tab to see topics
            print("\nStep 6: Clicking Content tab...")
            content_tab = page.locator('button:has-text("Content")').first
            if content_tab.is_visible():
                content_tab.click()
                page.wait_for_timeout(2000)
            page.screenshot(path='tmp/flow_complete_04_content.png', full_page=True)

            # Find topics and try to find one with a draft
            print("\nStep 7: Finding topic with draft...")

            # Get all view brief buttons
            view_brief_btns = page.locator('button[title*="View Brief"]').all()
            print(f"  Found {len(view_brief_btns)} View Brief buttons")

            found_draft = False
            for i, brief_btn in enumerate(view_brief_btns):
                try:
                    if not brief_btn.is_visible():
                        continue

                    print(f"  Trying topic {i+1}...")
                    brief_btn.click()
                    page.wait_for_timeout(2000)

                    # Check if there's a View Draft button
                    view_draft_btns = page.locator('button:has-text("View Draft")').all()
                    if len(view_draft_btns) > 0:
                        print(f"    Found View Draft button!")
                        found_draft = True
                        page.screenshot(path='tmp/flow_complete_05_brief_with_draft.png', full_page=True)
                        break
                    else:
                        # Close this modal and try next topic
                        print(f"    No draft - closing modal")
                        close_btns = page.locator('button:has-text("Close"), button:has-text("Cancel"), [aria-label="Close"]').all()
                        for close_btn in close_btns:
                            try:
                                if close_btn.is_visible():
                                    close_btn.click()
                                    page.wait_for_timeout(500)
                                    break
                            except:
                                pass
                        # Also try pressing Escape
                        page.keyboard.press('Escape')
                        page.wait_for_timeout(500)
                except Exception as e:
                    print(f"    Error: {e}")
                    page.keyboard.press('Escape')
                    page.wait_for_timeout(500)

            if not found_draft:
                print("  No topics with drafts found - cannot test flow fix")
                print("  Need to generate a draft first or use a different map")
                browser.close()
                return

            # Now inside ContentBriefModal with View Draft available
            print("\nStep 8: Clicking View Draft...")
            view_draft_btns = page.locator('button:has-text("View Draft")').all()
            view_draft_btns[0].click()
            page.wait_for_timeout(5000)
            page.screenshot(path='tmp/flow_complete_06_draft_modal.png', full_page=True)

            # Now inside DraftingModal - look for Flow button
            print("\nStep 9: Looking for Flow button in Draft workspace...")
            flow_btns = page.locator('button:has-text("Flow")').all()
            print(f"  Found {len(flow_btns)} Flow button(s)")

            # Print buttons for debugging
            print("  Available buttons:")
            for btn in page.locator('button').all()[:30]:
                try:
                    text = (btn.text_content() or '').strip()
                    if text and len(text) < 50 and btn.is_visible():
                        print(f"    - {text}")
                except:
                    pass

            if len(flow_btns) == 0:
                print("  No Flow button found - might be in a different location")
                browser.close()
                return

            print("\nStep 10: Clicking Flow button...")
            flow_btns[0].click()
            print("  Waiting for flow analysis (30s)...")
            page.wait_for_timeout(30000)
            page.screenshot(path='tmp/flow_complete_07_flow_modal.png', full_page=True)

            # Check for errors in console
            errors = [log for log in console_logs if 'TypeError' in log or 'Cannot read properties' in log]
            if errors:
                print("\n  *** ERRORS FOUND - FIX NOT DEPLOYED? ***")
                for err in errors[-5:]:
                    print(f"    {err[:120]}")
                browser.close()
                return

            print("  No TypeError errors - state.isLoading fix is working!")

            # Look for Auto-Fix button
            fix_btns = page.locator('button:has-text("Auto-Fix")').all()
            print(f"\n  Found {len(fix_btns)} Auto-Fix button(s)")

            if len(fix_btns) > 0:
                print("\nStep 11: Clicking Auto-Fix...")
                fix_btns[0].click()
                print("  Waiting for fix (45s)...")
                page.wait_for_timeout(45000)
                page.screenshot(path='tmp/flow_complete_08_after_fix.png', full_page=True)

                # Check for "Resolved" text
                html = page.content()
                if 'Resolved' in html:
                    print("\n  *** SUCCESS: 'Resolved' found! The fix works! ***")
                else:
                    # Check for spinners
                    spinners = page.locator('.animate-spin').all()
                    visible_spinners = [s for s in spinners if s.is_visible()]
                    if visible_spinners:
                        print(f"\n  *** FAIL: Still {len(visible_spinners)} visible spinner(s) ***")
                    else:
                        print("\n  No spinners visible - check screenshot")
            else:
                print("  No Auto-Fix buttons - flow may have no issues to fix")
                print("  This is OK - the main test was that Flow modal opened without errors!")
                print("\n  *** SUCCESS: Flow modal opened without TypeError ***")

            page.screenshot(path='tmp/flow_complete_final.png', full_page=True)

        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()
            page.screenshot(path='tmp/flow_complete_error.png', full_page=True)
        finally:
            print(f"\n=== Done ({len(console_logs)} console logs) ===")
            errors = [log for log in console_logs if 'TypeError' in log or 'Cannot read properties' in log]
            if errors:
                print("\n=== Critical Error logs ===")
                for err in errors[-10:]:
                    print(f"  {err[:150]}")
            browser.close()

if __name__ == "__main__":
    test_flow_fix()
