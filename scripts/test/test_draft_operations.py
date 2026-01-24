"""
Test script for Polish, Flow, Audit, and Save Draft operations
Tests the activity-based timeout fix and base64 image stripping for long articles
"""
import time
import os
from playwright.sync_api import sync_playwright

# Configuration
APP_URL = "http://localhost:3003"
LOGIN_EMAIL = "richard@kjenmarks.nl"
LOGIN_PASSWORD = os.getenv("TEST_PASSWORD", "pannekoek")
PROJECT_NAME = "CutTheCrap"
TOPIC_NAME = "Internal Linking & Contextual Bridges"

def log(msg):
    print(f"[TEST] {time.strftime('%H:%M:%S')} - {msg}")

def test_draft_operations():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = context.new_page()

        # Capture console logs
        console_logs = []
        def handle_console(msg):
            text = msg.text
            console_logs.append(f"{msg.type}: {text}")
            if any(kw in text for kw in ["Polish", "Audit", "Flow", "Streaming", "progress", "STREAMING", "timeout", "DraftingModal", "Stripped", "base64"]):
                print(f"[CONSOLE] {msg.type}: {text}")

        page.on("console", handle_console)

        try:
            # Step 1: Login
            log("Navigating to app...")
            page.goto(APP_URL)
            page.wait_for_load_state('networkidle')
            time.sleep(2)

            if page.locator('input[type="email"]').count() > 0:
                log("Logging in...")
                page.fill('input[type="email"]', LOGIN_EMAIL)
                page.fill('input[type="password"]', LOGIN_PASSWORD)
                page.click('button[type="submit"]')
                page.wait_for_load_state('networkidle')
                time.sleep(3)
                log("Logged in")

            page.screenshot(path="D:/www/cost-of-retreival-reducer/tmp/test_01_logged_in.png")

            # Step 2: Find and load CutTheCrap project
            log(f"Looking for {PROJECT_NAME} project...")
            load_btn = page.locator(f'button:has-text("Load")').nth(1)  # CutTheCrap is second
            if load_btn.count() > 0:
                log(f"Loading {PROJECT_NAME}...")
                load_btn.click()
                page.wait_for_load_state('networkidle')
                time.sleep(3)

            page.screenshot(path="D:/www/cost-of-retreival-reducer/tmp/test_02_project.png")

            # Step 3: Load the map
            log("Loading map...")
            load_map_btn = page.locator('button:has-text("Load Map")')
            if load_map_btn.count() > 0:
                load_map_btn.first.click()
                page.wait_for_load_state('networkidle')
                time.sleep(5)
                log("Map loaded")

            page.screenshot(path="D:/www/cost-of-retreival-reducer/tmp/test_03_map.png")

            # Step 4: Find the specific topic by scrolling
            log(f"Looking for topic: {TOPIC_NAME}...")
            time.sleep(2)

            # Try to find the topic - it may require scrolling
            topic_found = False
            for scroll_attempt in range(10):
                topic_element = page.locator(f'text="{TOPIC_NAME}"')
                if topic_element.count() > 0:
                    log(f"Found topic at scroll attempt {scroll_attempt}")
                    # Scroll it into view and click
                    topic_element.first.scroll_into_view_if_needed()
                    time.sleep(0.5)
                    topic_element.first.click()
                    topic_found = True
                    time.sleep(2)
                    break
                # Scroll down
                page.keyboard.press("PageDown")
                time.sleep(0.3)

            if not topic_found:
                log("Topic not found by scrolling, trying search...")
                page.screenshot(path="D:/www/cost-of-retreival-reducer/tmp/test_topic_not_found.png")
                raise Exception(f"Could not find topic: {TOPIC_NAME}")

            page.screenshot(path="D:/www/cost-of-retreival-reducer/tmp/test_04_topic_clicked.png")

            # Step 5: Click "View Brief" button that should appear for the selected topic
            log("Looking for View Brief button...")
            time.sleep(2)

            view_brief_btn = page.locator('button:has-text("View Brief")')
            if view_brief_btn.count() > 0:
                log("Clicking View Brief...")
                view_brief_btn.first.click()
                time.sleep(3)
                page.wait_for_load_state('networkidle')

            page.screenshot(path="D:/www/cost-of-retreival-reducer/tmp/test_05_brief.png")

            page.screenshot(path="D:/www/cost-of-retreival-reducer/tmp/test_06_brief_modal.png")

            # Step 6: Click "View Draft" button from the Content Brief modal footer
            log("Looking for View Draft button in Content Brief footer...")
            time.sleep(2)

            # The Content Brief modal has a footer with "View Draft" button
            view_draft_btn = page.locator('button:has-text("View Draft")')
            if view_draft_btn.count() > 0:
                log(f"Found {view_draft_btn.count()} View Draft buttons, clicking...")
                # Scroll the modal to make footer visible
                view_draft_btn.first.scroll_into_view_if_needed()
                time.sleep(1)
                view_draft_btn.first.click(force=True)
                time.sleep(5)
                page.wait_for_load_state('networkidle')

            page.screenshot(path="D:/www/cost-of-retreival-reducer/tmp/test_08_draft_workspace.png")

            # Step 9: Find operation buttons
            log("Looking for operation buttons (Polish, Flow, Audit, Save)...")
            time.sleep(2)

            polish_btn = page.locator('button:has-text("Polish")')
            flow_btn = page.locator('button:has-text("Flow")')
            audit_btn = page.locator('button:has-text("Audit")')
            save_btn = page.locator('button:has-text("Save")')

            log(f"Buttons found - Polish: {polish_btn.count()}, Flow: {flow_btn.count()}, Audit: {audit_btn.count()}, Save: {save_btn.count()}")

            if polish_btn.count() == 0 and audit_btn.count() == 0:
                # Debug
                all_buttons = page.locator('button').all()
                log(f"All {len(all_buttons)} buttons:")
                for i, btn in enumerate(all_buttons[:30]):
                    try:
                        txt = btn.inner_text()[:50]
                        log(f"  {i}: {txt}")
                    except:
                        pass
                page.screenshot(path="D:/www/cost-of-retreival-reducer/tmp/test_error_no_ops.png", full_page=True)
                raise Exception("Could not find operation buttons")

            # Step 10: Test Save Draft
            if save_btn.count() > 0:
                log("=== Testing Save Draft ===")
                save_btn.first.click(force=True)
                time.sleep(5)
                page.screenshot(path="D:/www/cost-of-retreival-reducer/tmp/test_09_save.png")
                log("Save completed")

            # Step 11: Test Audit
            if audit_btn.count() > 0:
                log("=== Testing Audit ===")
                audit_btn.first.click(force=True)

                start = time.time()
                while time.time() - start < 300:
                    time.sleep(5)

                    # Check for errors
                    errors = page.locator('.text-red-500, .text-red-400')
                    for i in range(errors.count()):
                        txt = errors.nth(i).inner_text()
                        if "timeout" in txt.lower() or "error" in txt.lower():
                            log(f"ERROR: {txt}")
                            page.screenshot(path="D:/www/cost-of-retreival-reducer/tmp/test_audit_error.png")
                            raise Exception(f"Audit error: {txt}")

                    if page.locator('.animate-spin').count() == 0:
                        log(f"Audit completed in {time.time()-start:.0f}s")
                        break

                    log(f"Audit running... {time.time()-start:.0f}s")

                page.screenshot(path="D:/www/cost-of-retreival-reducer/tmp/test_10_audit.png")

                close = page.locator('button:has-text("Close")')
                if close.count() > 0:
                    close.first.click(force=True)
                    time.sleep(1)

            # Step 12: Test Flow
            if flow_btn.count() > 0:
                log("=== Testing Flow ===")
                flow_btn.first.click(force=True)

                start = time.time()
                while time.time() - start < 300:
                    time.sleep(5)

                    errors = page.locator('.text-red-500, .text-red-400')
                    for i in range(errors.count()):
                        txt = errors.nth(i).inner_text()
                        if "timeout" in txt.lower() or "error" in txt.lower():
                            log(f"ERROR: {txt}")
                            raise Exception(f"Flow error: {txt}")

                    if page.locator('.animate-spin').count() == 0:
                        log(f"Flow completed in {time.time()-start:.0f}s")
                        break

                    log(f"Flow running... {time.time()-start:.0f}s")

                page.screenshot(path="D:/www/cost-of-retreival-reducer/tmp/test_11_flow.png")

                close = page.locator('button:has-text("Close")')
                if close.count() > 0:
                    close.first.click(force=True)
                    time.sleep(1)

            # Step 13: Test Polish
            if polish_btn.count() > 0:
                log("=== Testing Polish (may take 5-10 min) ===")
                polish_btn.first.click(force=True)

                start = time.time()
                while time.time() - start < 600:
                    time.sleep(10)

                    errors = page.locator('.text-red-500, .text-red-400')
                    for i in range(errors.count()):
                        txt = errors.nth(i).inner_text()
                        if "timeout" in txt.lower() or "too large" in txt.lower() or "error" in txt.lower():
                            log(f"ERROR: {txt}")
                            page.screenshot(path="D:/www/cost-of-retreival-reducer/tmp/test_polish_error.png")
                            raise Exception(f"Polish error: {txt}")

                    if page.locator('.animate-spin').count() == 0:
                        log(f"Polish completed in {time.time()-start:.0f}s")
                        break

                    log(f"Polish running... {time.time()-start:.0f}s")

                page.screenshot(path="D:/www/cost-of-retreival-reducer/tmp/test_12_polish.png")

            # Step 14: Final save
            if save_btn.count() > 0:
                log("=== Final Save ===")
                save_btn.first.click(force=True)
                time.sleep(5)
                page.screenshot(path="D:/www/cost-of-retreival-reducer/tmp/test_13_final.png")

            log("=" * 50)
            log("=== ALL TESTS COMPLETED SUCCESSFULLY ===")
            log("=" * 50)

            with open("D:/www/cost-of-retreival-reducer/tmp/test_console.txt", "w", encoding="utf-8") as f:
                f.write("\n".join(console_logs))

        except Exception as e:
            log(f"ERROR: {e}")
            page.screenshot(path="D:/www/cost-of-retreival-reducer/tmp/test_error.png", full_page=True)
            with open("D:/www/cost-of-retreival-reducer/tmp/test_console.txt", "w", encoding="utf-8") as f:
                f.write("\n".join(console_logs))
            raise
        finally:
            browser.close()

if __name__ == "__main__":
    test_draft_operations()
