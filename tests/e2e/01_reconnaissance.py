# tests/e2e/01_reconnaissance.py
"""
Initial reconnaissance script to map the application UI and discover all functions.
"""
import os
import json
from datetime import datetime
from playwright.sync_api import sync_playwright, expect
from test_config import *

def ensure_screenshot_dir():
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def login(page):
    """Log into the application"""
    print(f"[1] Navigating to {BASE_URL}...")
    page.goto(BASE_URL)
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)

    # Take screenshot of login page
    page.screenshot(path=f"{SCREENSHOT_DIR}/01_login_page.png", full_page=True)
    print("    Screenshot: 01_login_page.png")

    # Check if we're on login page
    if "Sign in" in page.content() or "Email Address" in page.content():
        print(f"[2] Found login form, entering credentials...")

        # Wait for and fill email
        email_input = page.locator('input[type="email"]')
        email_input.wait_for(state="visible")
        email_input.fill(TEST_EMAIL)
        print(f"    Entered email: {TEST_EMAIL}")

        # Fill password
        password_input = page.locator('input[type="password"]')
        password_input.fill(TEST_PASSWORD)
        print(f"    Entered password")

        page.screenshot(path=f"{SCREENSHOT_DIR}/02_credentials_filled.png", full_page=True)

        # Click Sign In button (the submit button in the form, not the tab)
        sign_in_btn = page.locator('button[type="submit"]:has-text("Sign In")')
        sign_in_btn.wait_for(state="visible")
        print(f"    Clicking Sign In button...")
        sign_in_btn.click()

        # Wait for navigation/loading
        print(f"    Waiting for login to complete...")
        page.wait_for_timeout(5000)  # Wait for auth

        # Check if login succeeded by looking for dashboard elements
        page.wait_for_load_state('networkidle')

        page.screenshot(path=f"{SCREENSHOT_DIR}/03_after_login.png", full_page=True)
        print("    Screenshot: 03_after_login.png")

        # Verify login by checking URL or dashboard elements
        current_url = page.url
        print(f"    Current URL: {current_url}")

        # Check for project selector or dashboard elements
        if "Sign in" not in page.content() or page.locator('text="Select Project"').is_visible():
            print("    Login appears successful!")
            return True
        else:
            print("    WARNING: May still be on login page")
            # Try waiting longer
            page.wait_for_timeout(3000)
            page.screenshot(path=f"{SCREENSHOT_DIR}/03b_after_wait.png", full_page=True)
            return "Sign in" not in page.content()
    else:
        print("    Already logged in or different page structure")
        return True

def select_project(page):
    """Select the test project"""
    print("\n[4] Looking for project selector...")

    page.screenshot(path=f"{SCREENSHOT_DIR}/04_looking_for_project.png", full_page=True)

    # Try different selectors for project dropdown
    selectors_to_try = [
        'button:has-text("Select Project")',
        'button:has-text("project")',
        '[data-testid="project-selector"]',
        'text="Select Project"',
    ]

    for selector in selectors_to_try:
        try:
            element = page.locator(selector).first
            if element.is_visible(timeout=2000):
                print(f"    Found project selector with: {selector}")
                element.click()
                page.wait_for_timeout(1000)
                page.screenshot(path=f"{SCREENSHOT_DIR}/05_project_dropdown_open.png", full_page=True)

                # Look for daadvracht
                daadvracht = page.locator(f'text="{TEST_PROJECT}"').first
                if daadvracht.is_visible(timeout=2000):
                    print(f"    Found '{TEST_PROJECT}' - clicking...")
                    daadvracht.click()
                    page.wait_for_load_state('networkidle')
                    page.wait_for_timeout(2000)
                    page.screenshot(path=f"{SCREENSHOT_DIR}/06_project_selected.png", full_page=True)
                    print(f"    Project '{TEST_PROJECT}' selected!")
                    return True
        except Exception as e:
            continue

    # Alternative: look for project name directly in the page
    print("    Trying alternative project selection...")
    try:
        # Maybe project is already visible in list
        project_item = page.locator(f'text=/{TEST_PROJECT}/i').first
        if project_item.is_visible(timeout=2000):
            print(f"    Found project item, clicking...")
            project_item.click()
            page.wait_for_load_state('networkidle')
            page.wait_for_timeout(2000)
            return True
    except:
        pass

    print(f"    Could not find project selector or '{TEST_PROJECT}'")
    return False

def select_map(page):
    """Select a topical map"""
    print("\n[5] Looking for map selector...")

    # Try different selectors for map dropdown
    selectors_to_try = [
        'button:has-text("Select Map")',
        'button:has-text("Map")',
        '[data-testid="map-selector"]',
    ]

    for selector in selectors_to_try:
        try:
            element = page.locator(selector).first
            if element.is_visible(timeout=2000):
                print(f"    Found map selector with: {selector}")
                element.click()
                page.wait_for_timeout(1000)
                page.screenshot(path=f"{SCREENSHOT_DIR}/07_map_dropdown.png", full_page=True)

                # Select first available map
                map_items = page.locator('[role="menuitem"], [role="option"], .dropdown-item').all()
                if len(map_items) > 0:
                    map_items[0].click()
                    page.wait_for_load_state('networkidle')
                    page.wait_for_timeout(2000)
                    page.screenshot(path=f"{SCREENSHOT_DIR}/08_map_selected.png", full_page=True)
                    print(f"    Map selected!")
                    return True
        except:
            continue

    print("    Could not find map selector")
    return False

def discover_dashboard_elements(page):
    """Discover all elements on the dashboard"""
    print("\n[6] Discovering dashboard elements...")

    elements = {
        "buttons": [],
        "links": [],
        "inputs": [],
        "selects": [],
        "tables": [],
        "modals": [],
        "tabs": []
    }

    # Buttons
    buttons = page.locator('button').all()
    for btn in buttons:
        try:
            if btn.is_visible():
                text = btn.inner_text().strip()[:100]
                if text:
                    elements["buttons"].append(text)
        except:
            pass

    # Links
    links = page.locator('a[href]').all()
    for link in links:
        try:
            if link.is_visible():
                text = link.inner_text().strip()[:50]
                href = link.get_attribute('href')
                if text or href:
                    elements["links"].append({"text": text, "href": href})
        except:
            pass

    # Inputs
    inputs = page.locator('input').all()
    for inp in inputs:
        try:
            if inp.is_visible():
                placeholder = inp.get_attribute('placeholder') or ""
                name = inp.get_attribute('name') or ""
                elements["inputs"].append({"placeholder": placeholder, "name": name})
        except:
            pass

    # Tables
    tables = page.locator('table').all()
    elements["tables"] = len(tables)

    # Check for tabs
    tabs = page.locator('[role="tab"]').all()
    for tab in tabs:
        try:
            if tab.is_visible():
                elements["tabs"].append(tab.inner_text().strip())
        except:
            pass

    print(f"    Buttons: {len(elements['buttons'])}")
    print(f"    Links: {len(elements['links'])}")
    print(f"    Inputs: {len(elements['inputs'])}")
    print(f"    Tables: {elements['tables']}")
    print(f"    Tabs: {len(elements['tabs'])}")

    return elements

def find_topics(page):
    """Find and list available topics"""
    print("\n[7] Looking for topics list...")

    topics = []

    # Look for topic rows/items
    topic_selectors = [
        'tr[data-topic-id]',
        '[class*="topic-row"]',
        '[class*="TopicRow"]',
        'tr:has(td)',
    ]

    for selector in topic_selectors:
        try:
            rows = page.locator(selector).all()
            if len(rows) > 0:
                print(f"    Found {len(rows)} rows with selector: {selector}")
                for i, row in enumerate(rows[:10]):  # First 10
                    try:
                        text = row.inner_text().strip()[:100]
                        topics.append(text)
                    except:
                        pass
                break
        except:
            continue

    if topics:
        print(f"    Sample topics found: {len(topics)}")
        for t in topics[:3]:
            print(f"      - {t[:50]}...")
    else:
        print("    No topics found in standard locations")

    return topics

def check_content_brief_access(page):
    """Check if we can access content briefs"""
    print("\n[8] Checking content brief access...")

    # Look for brief-related buttons
    brief_buttons = page.locator('button:has-text("Brief"), button:has-text("brief")').all()
    print(f"    Found {len(brief_buttons)} brief-related buttons")

    # Look for generated briefs
    brief_indicators = page.locator('text=/Brief.*100%|Quality.*%/i').all()
    print(f"    Found {len(brief_indicators)} brief indicators")

    return len(brief_buttons) > 0 or len(brief_indicators) > 0

def generate_comprehensive_report(page, elements, topics):
    """Generate comprehensive test report"""
    print("\n[9] Generating comprehensive report...")

    report = {
        "timestamp": datetime.now().isoformat(),
        "url": page.url,
        "title": page.title(),
        "test_project": TEST_PROJECT,
        "test_language": TEST_LANGUAGE,
        "discovered_elements": elements,
        "topics_found": len(topics),
        "sample_topics": topics[:5] if topics else [],
        "function_categories": [
            {
                "category": "Authentication",
                "functions": [
                    {"name": "Login", "status": "TO_TEST", "path": "/"},
                    {"name": "Logout", "status": "TO_TEST", "path": "Header menu"},
                ],
                "priority": "HIGH"
            },
            {
                "category": "Project Management",
                "functions": [
                    {"name": "Select Project", "status": "TO_TEST", "path": "Header dropdown"},
                    {"name": "Create Project", "status": "TO_TEST", "path": "Project menu"},
                    {"name": "Edit Project", "status": "TO_TEST", "path": "Project settings"},
                ],
                "priority": "HIGH"
            },
            {
                "category": "Topical Map Management",
                "functions": [
                    {"name": "Select Map", "status": "TO_TEST", "path": "Map dropdown"},
                    {"name": "Create Map", "status": "TO_TEST", "path": "Map menu"},
                    {"name": "View Map Stats", "status": "TO_TEST", "path": "Map header"},
                ],
                "priority": "HIGH"
            },
            {
                "category": "Wizards (Business Context)",
                "functions": [
                    {"name": "Business Info Wizard", "status": "TO_TEST", "path": "Dashboard panel"},
                    {"name": "SEO Pillar Wizard", "status": "TO_TEST", "path": "Dashboard panel"},
                    {"name": "EAV Discovery", "status": "TO_TEST", "path": "Dashboard panel"},
                    {"name": "Competitor Refinement", "status": "TO_TEST", "path": "Dashboard panel"},
                ],
                "priority": "MEDIUM"
            },
            {
                "category": "Topic Management",
                "functions": [
                    {"name": "View Topic List", "status": "TO_TEST", "path": "Main area"},
                    {"name": "Search Topics", "status": "TO_TEST", "path": "Search box"},
                    {"name": "Filter Topics", "status": "TO_TEST", "path": "Filter controls"},
                    {"name": "View Topic Details", "status": "TO_TEST", "path": "Topic row click"},
                ],
                "priority": "HIGH"
            },
            {
                "category": "Content Brief Generation",
                "functions": [
                    {"name": "Generate Brief", "status": "TO_TEST", "path": "Topic row action"},
                    {"name": "View Brief Modal", "status": "TO_TEST", "path": "Brief click"},
                    {"name": "Brief Preview", "status": "TO_TEST", "path": "Brief row"},
                    {"name": "Export Brief", "status": "TO_TEST", "path": "Brief modal"},
                ],
                "priority": "HIGH"
            },
            {
                "category": "Content Generation (10-Pass)",
                "functions": [
                    {"name": "Start Generation", "status": "TO_TEST", "path": "Brief modal"},
                    {"name": "View Progress", "status": "TO_TEST", "path": "Draft modal"},
                    {"name": "Pass 1: Draft", "status": "TO_TEST", "path": "Auto"},
                    {"name": "Pass 2: Headers", "status": "TO_TEST", "path": "Auto"},
                    {"name": "Pass 3: Lists", "status": "TO_TEST", "path": "Auto"},
                    {"name": "Pass 4: Discourse", "status": "TO_TEST", "path": "Auto"},
                    {"name": "Pass 5: Micro Semantics", "status": "TO_TEST", "path": "Auto"},
                    {"name": "Pass 6: Visual Semantics", "status": "TO_TEST", "path": "Auto"},
                    {"name": "Pass 7: Introduction", "status": "TO_TEST", "path": "Auto"},
                    {"name": "Pass 8: Polish", "status": "TO_TEST", "path": "Auto"},
                    {"name": "Pass 9: Audit", "status": "TO_TEST", "path": "Auto"},
                    {"name": "Pass 10: Schema", "status": "TO_TEST", "path": "Auto"},
                ],
                "priority": "CRITICAL"
            },
            {
                "category": "Quality Audit System",
                "functions": [
                    {"name": "View Audit Score", "status": "TO_TEST", "path": "Draft modal"},
                    {"name": "Central Entity Rules", "status": "TO_TEST", "path": "Audit panel"},
                    {"name": "Content Structure Rules", "status": "TO_TEST", "path": "Audit panel"},
                    {"name": "Semantic Depth Rules", "status": "TO_TEST", "path": "Audit panel"},
                    {"name": "Readability Rules", "status": "TO_TEST", "path": "Audit panel"},
                    {"name": "AI Detection Rules", "status": "TO_TEST", "path": "Audit panel"},
                    {"name": "Auto-Fix Violations", "status": "TO_TEST", "path": "Audit panel"},
                ],
                "priority": "CRITICAL"
            },
            {
                "category": "Content Operations",
                "functions": [
                    {"name": "Save Draft", "status": "TO_TEST", "path": "Draft modal"},
                    {"name": "Manual Polish", "status": "TO_TEST", "path": "Draft modal"},
                    {"name": "Version History", "status": "TO_TEST", "path": "Draft modal"},
                    {"name": "Re-run Passes", "status": "TO_TEST", "path": "Draft modal"},
                    {"name": "Export Content", "status": "TO_TEST", "path": "Draft modal"},
                ],
                "priority": "HIGH"
            },
            {
                "category": "Schema Generation",
                "functions": [
                    {"name": "Generate Schema", "status": "TO_TEST", "path": "Schema tab"},
                    {"name": "View JSON-LD", "status": "TO_TEST", "path": "Schema tab"},
                    {"name": "Entity Resolution", "status": "TO_TEST", "path": "Auto (Wikidata)"},
                    {"name": "Edit Schema", "status": "TO_TEST", "path": "Schema tab"},
                ],
                "priority": "MEDIUM"
            },
            {
                "category": "Settings",
                "functions": [
                    {"name": "API Key Config", "status": "TO_TEST", "path": "Settings modal"},
                    {"name": "Generation Priorities", "status": "TO_TEST", "path": "Settings modal"},
                    {"name": "Organization Settings", "status": "TO_TEST", "path": "Settings modal"},
                ],
                "priority": "MEDIUM"
            },
            {
                "category": "Analytics",
                "functions": [
                    {"name": "AI Usage Dashboard", "status": "TO_TEST", "path": "Header button"},
                    {"name": "Cost Tracking", "status": "TO_TEST", "path": "Usage modal"},
                ],
                "priority": "LOW"
            },
        ],
        "quality_tests": {
            "audit_rules": list(AUDIT_RULES.keys()),
            "quality_thresholds": QUALITY_THRESHOLDS,
            "tests_to_run": [
                "Verify audit score >= 70%",
                "Check all audit rules execute",
                "Validate word count in range",
                "Check heading hierarchy (H1 > H2 > H3)",
                "Verify prose/structure ratio",
                "Check for AI detection patterns",
                "Validate entity mentions",
                "Test schema validation",
            ]
        }
    }

    # Save report
    report_path = f"{SCREENSHOT_DIR}/comprehensive_report.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"    Report saved to: {report_path}")

    # Count total functions
    total_functions = sum(len(cat['functions']) for cat in report['function_categories'])
    print(f"\n    Total function categories: {len(report['function_categories'])}")
    print(f"    Total functions to test: {total_functions}")
    print(f"    Quality tests defined: {len(report['quality_tests']['tests_to_run'])}")

    return report

def main():
    print("=" * 70)
    print("CutTheCrap E2E Reconnaissance - Comprehensive Function Discovery")
    print("=" * 70)
    print(f"Target: {BASE_URL}")
    print(f"Test Project: {TEST_PROJECT} ({TEST_LANGUAGE}, {TEST_REGION})")
    print(f"Started: {datetime.now().isoformat()}")
    print("=" * 70)

    ensure_screenshot_dir()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # Visible for debugging
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            locale="nl-NL"  # Dutch locale
        )
        page = context.new_page()
        page.set_default_timeout(DEFAULT_TIMEOUT)

        try:
            # Step 1: Login
            login_success = login(page)
            print(f"\n    Login result: {'SUCCESS' if login_success else 'FAILED'}")

            if not login_success:
                print("\n    ERROR: Login failed, cannot continue")
                return

            # Step 2: Select project
            project_selected = select_project(page)
            print(f"    Project selection: {'SUCCESS' if project_selected else 'FAILED'}")

            # Step 3: Select map (if project selected)
            if project_selected:
                map_selected = select_map(page)
                print(f"    Map selection: {'SUCCESS' if map_selected else 'FAILED'}")

            # Step 4: Discover dashboard elements
            elements = discover_dashboard_elements(page)

            # Step 5: Find topics
            topics = find_topics(page)

            # Step 6: Check brief access
            brief_access = check_content_brief_access(page)
            print(f"\n    Content brief access: {'AVAILABLE' if brief_access else 'NOT FOUND'}")

            # Step 7: Generate comprehensive report
            report = generate_comprehensive_report(page, elements, topics)

            # Final screenshot
            page.screenshot(path=f"{SCREENSHOT_DIR}/99_final_state.png", full_page=True)
            print(f"\n    Final screenshot saved")

            # Print summary
            print("\n" + "=" * 70)
            print("RECONNAISSANCE COMPLETE")
            print("=" * 70)
            print(f"Final URL: {page.url}")
            print(f"Page Title: {page.title()}")
            print(f"\nNext Steps:")
            print("  1. Review screenshots in: " + SCREENSHOT_DIR)
            print("  2. Review function map in: comprehensive_report.json")
            print("  3. Run functional tests with: 02_functional_tests.py")
            print("  4. Run quality tests with: 03_quality_tests.py")

        except Exception as e:
            print(f"\n    ERROR: {e}")
            import traceback
            traceback.print_exc()
            page.screenshot(path=f"{SCREENSHOT_DIR}/error.png", full_page=True)
        finally:
            browser.close()

    print("\n" + "=" * 70)
    print("Reconnaissance script finished")
    print("=" * 70)

if __name__ == "__main__":
    main()
