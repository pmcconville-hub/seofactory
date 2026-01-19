"""
Content Generation Flow Test

Comprehensive E2E test that validates:
1. Pass transitions work correctly (Pass 8 -> Pass 9 -> Pass 10)
2. React state updates during generation (UI reflects actual progress)
3. Generation doesn't hang or stall between passes
4. Console logs show correct pass progression
5. No JavaScript errors during generation

This is a more thorough test than the simple tab_switch_test.py.
"""
import asyncio
import re
from typing import List, Dict, Optional
from playwright.async_api import async_playwright, Page, expect
import time


class GenerationProgressMonitor:
    """Monitors content generation progress via console logs and DOM state."""

    def __init__(self):
        self.console_logs: List[str] = []
        self.errors: List[str] = []
        self.pass_starts: Dict[int, float] = {}
        self.pass_completes: Dict[int, float] = {}
        self.last_pass_seen: int = 0
        self.last_ui_pass: int = 0

    def on_console(self, msg):
        """Capture console messages to track pass progression."""
        text = msg.text
        self.console_logs.append(text)

        # Track pass transitions from console logs
        # Pattern: "[runPasses] After Pass X: current_pass=Y"
        match = re.search(r'\[runPasses\] After Pass (\d+): current_pass=(\d+)', text)
        if match:
            completed_pass = int(match.group(1))
            next_pass = int(match.group(2))
            self.pass_completes[completed_pass] = time.time()
            print(f"  [Monitor] Pass {completed_pass} completed -> advancing to {next_pass}")

        # Pattern: "[PassX] COMPLETED pass X"
        match = re.search(r'\[Pass(\d+)\] COMPLETED pass (\d+)', text)
        if match:
            pass_num = int(match.group(1))
            print(f"  [Monitor] Pass {pass_num} COMPLETED (from baseSectionPass)")

        # Pattern: "Pass X: <action>" (from onLog)
        match = re.search(r'Pass (\d+):', text)
        if match:
            pass_num = int(match.group(1))
            if pass_num > self.last_pass_seen:
                self.last_pass_seen = pass_num
                self.pass_starts[pass_num] = time.time()
                print(f"  [Monitor] Pass {pass_num} started")

    def on_error(self, error):
        """Capture JavaScript errors."""
        self.errors.append(str(error))
        print(f"  [Monitor] ERROR: {error}")

    def get_summary(self) -> Dict:
        """Get summary of generation progress."""
        return {
            'passes_started': list(self.pass_starts.keys()),
            'passes_completed': list(self.pass_completes.keys()),
            'last_pass_seen': self.last_pass_seen,
            'error_count': len(self.errors),
            'total_logs': len(self.console_logs)
        }


async def wait_for_pass_transition(
    page: Page,
    monitor: GenerationProgressMonitor,
    from_pass: int,
    to_pass: int,
    timeout_seconds: int = 180
) -> bool:
    """
    Wait for a pass transition to occur.
    Returns True if transition happened within timeout.
    """
    start_time = time.time()

    while time.time() - start_time < timeout_seconds:
        # Check if the target pass has started
        if to_pass in monitor.pass_starts:
            return True

        # Check if from_pass completed and to_pass started
        if from_pass in monitor.pass_completes:
            # Give a short window for the next pass to start
            await asyncio.sleep(2)
            if to_pass in monitor.pass_starts:
                return True

        await asyncio.sleep(1)

    return False


async def get_ui_pass_number(page: Page) -> Optional[int]:
    """Extract the current pass number from the UI."""
    try:
        # Look for "Pass X of 10" text in the progress component
        text = await page.locator('text=/Pass \\d+ of 10/').first.text_content()
        if text:
            match = re.search(r'Pass (\d+) of 10', text)
            if match:
                return int(match.group(1))
    except Exception:
        pass
    return None


async def test_pass_transition_8_to_9(page: Page, monitor: GenerationProgressMonitor) -> bool:
    """
    Test that Pass 8 transitions correctly to Pass 9.
    This is the specific transition that was causing the hang bug.
    """
    print("\n=== Testing Pass 8 -> Pass 9 Transition ===")

    # Wait for Pass 8 to start
    print("Waiting for Pass 8 to start...")
    start_time = time.time()
    while 8 not in monitor.pass_starts and time.time() - start_time < 300:
        await asyncio.sleep(1)

    if 8 not in monitor.pass_starts:
        print("FAIL: Pass 8 never started within timeout")
        return False

    print(f"Pass 8 started at t={monitor.pass_starts[8] - start_time:.1f}s")

    # Wait for Pass 8 to complete and Pass 9 to start
    print("Waiting for Pass 8 to complete and Pass 9 to start...")
    transition_ok = await wait_for_pass_transition(page, monitor, 8, 9, timeout_seconds=300)

    if not transition_ok:
        print("FAIL: Pass 8 -> Pass 9 transition did not occur within timeout")
        print(f"  Passes started: {monitor.pass_starts.keys()}")
        print(f"  Passes completed: {monitor.pass_completes.keys()}")

        # Check for any errors
        if monitor.errors:
            print(f"  Errors found: {monitor.errors}")

        # Check if Pass 8 completed but Pass 9 didn't start
        if 8 in monitor.pass_completes and 9 not in monitor.pass_starts:
            print("  DIAGNOSIS: Pass 8 completed but Pass 9 never started!")
            print("  This indicates the state refresh issue we fixed.")

        return False

    print(f"Pass 9 started successfully!")
    return True


async def test_ui_sync_with_state(page: Page, monitor: GenerationProgressMonitor) -> bool:
    """
    Test that the UI stays in sync with the actual generation state.
    The bug we fixed caused UI to show old pass while generation advanced.
    """
    print("\n=== Testing UI Sync with State ===")

    mismatches = 0
    checks = 0

    # Monitor for 30 seconds, checking UI sync every 5 seconds
    start_time = time.time()
    while time.time() - start_time < 30:
        ui_pass = await get_ui_pass_number(page)
        console_pass = monitor.last_pass_seen

        checks += 1

        if ui_pass and console_pass:
            # UI should be within 1 pass of console (account for timing)
            if abs(ui_pass - console_pass) > 1:
                mismatches += 1
                print(f"  MISMATCH: UI shows Pass {ui_pass}, Console shows Pass {console_pass}")
            else:
                print(f"  OK: UI Pass {ui_pass}, Console Pass {console_pass}")

        await asyncio.sleep(5)

    if mismatches > 0:
        print(f"FAIL: {mismatches}/{checks} UI sync mismatches detected")
        return False

    print(f"PASS: All {checks} UI sync checks passed")
    return True


async def test_no_hang_between_passes(page: Page, monitor: GenerationProgressMonitor) -> bool:
    """
    Test that generation doesn't hang between passes.
    A hang is defined as no progress for 120 seconds.
    """
    print("\n=== Testing No Hang Between Passes ===")

    last_activity_time = time.time()
    last_log_count = len(monitor.console_logs)
    hang_threshold_seconds = 120

    # Monitor for 5 minutes
    start_time = time.time()
    while time.time() - start_time < 300:
        current_log_count = len(monitor.console_logs)

        if current_log_count > last_log_count:
            # Activity detected
            last_activity_time = time.time()
            last_log_count = current_log_count

        time_since_activity = time.time() - last_activity_time

        if time_since_activity > hang_threshold_seconds:
            print(f"FAIL: No activity for {time_since_activity:.0f} seconds - possible hang!")
            print(f"  Last pass started: {monitor.last_pass_seen}")
            print(f"  Passes completed: {list(monitor.pass_completes.keys())}")
            return False

        await asyncio.sleep(5)

    print("PASS: No hangs detected during monitoring period")
    return True


async def test_generation_completes(page: Page, monitor: GenerationProgressMonitor) -> bool:
    """
    Test that generation completes all 10 passes.
    """
    print("\n=== Testing Generation Completion ===")

    # Wait for Pass 10 to complete (with generous timeout)
    start_time = time.time()
    while time.time() - start_time < 600:  # 10 minute timeout
        if 10 in monitor.pass_completes:
            elapsed = time.time() - start_time
            print(f"PASS: Generation completed in {elapsed:.0f} seconds")
            return True

        # Check for errors that might have stopped generation
        critical_errors = [e for e in monitor.errors if 'Error' in e or 'CRITICAL' in e]
        if critical_errors:
            print(f"FAIL: Critical errors found: {critical_errors}")
            return False

        await asyncio.sleep(5)

    print("FAIL: Generation did not complete within 10 minutes")
    print(f"  Last pass seen: {monitor.last_pass_seen}")
    print(f"  Passes completed: {list(monitor.pass_completes.keys())}")
    return False


async def run_comprehensive_test():
    """
    Run comprehensive content generation flow test.

    Prerequisites:
    - Dev server running at localhost:5173
    - User logged in with valid credentials
    - A content brief exists that can be used for generation
    """
    print("=" * 60)
    print("Content Generation Flow Test")
    print("=" * 60)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)  # Use headed for debugging
        context = await browser.new_context()
        page = await context.new_page()

        # Set up monitoring
        monitor = GenerationProgressMonitor()
        page.on("console", monitor.on_console)
        page.on("pageerror", monitor.on_error)

        try:
            # Navigate to the app
            print("\n1. Navigating to app...")
            await page.goto("http://localhost:5173", wait_until="networkidle")
            await asyncio.sleep(2)

            # Note: This test assumes the user is already logged in and has
            # navigated to a content brief that can generate content.
            # You may need to add authentication and navigation steps.

            print("\n2. Looking for Generate button...")
            # Look for a generate button (adjust selector as needed)
            generate_btn = page.locator('button:has-text("Generate")').first

            if await generate_btn.count() > 0:
                print("   Found Generate button, clicking...")
                await generate_btn.click()
                await asyncio.sleep(5)  # Wait for generation to start
            else:
                print("   No Generate button found - checking if generation already in progress...")

            # Check if generation is in progress
            progress_indicator = page.locator('text=/Pass \\d+ of 10/').first
            if await progress_indicator.count() > 0:
                print("   Generation in progress!")
            else:
                print("   WARNING: Generation may not have started. Check that:")
                print("   - You are logged in")
                print("   - A content brief is selected")
                print("   - The Generate button is available")

            # Run the tests
            results = {}

            # Test 1: Pass 8 -> 9 transition (the specific bug we fixed)
            results['pass_transition'] = await test_pass_transition_8_to_9(page, monitor)

            # Test 2: UI sync with state
            results['ui_sync'] = await test_ui_sync_with_state(page, monitor)

            # Test 3: No hangs
            results['no_hang'] = await test_no_hang_between_passes(page, monitor)

            # Test 4: Generation completes
            results['completion'] = await test_generation_completes(page, monitor)

            # Summary
            print("\n" + "=" * 60)
            print("TEST RESULTS")
            print("=" * 60)

            all_passed = all(results.values())

            for test_name, passed in results.items():
                status = "PASS" if passed else "FAIL"
                print(f"  {test_name}: {status}")

            print(f"\nOverall: {'ALL TESTS PASSED' if all_passed else 'SOME TESTS FAILED'}")

            # Debug info
            print("\nGeneration Summary:")
            summary = monitor.get_summary()
            print(f"  Passes started: {summary['passes_started']}")
            print(f"  Passes completed: {summary['passes_completed']}")
            print(f"  Total console logs: {summary['total_logs']}")
            print(f"  Errors: {summary['error_count']}")

        except Exception as e:
            print(f"\nTEST ERROR: {e}")
            import traceback
            traceback.print_exc()

        finally:
            await browser.close()


async def quick_state_refresh_test():
    """
    Quick test to verify the state refresh fix works.
    This can run without a full content generation.
    """
    print("=" * 60)
    print("Quick State Refresh Test")
    print("=" * 60)
    print("This test verifies the code changes by checking console logs")
    print("for proper state refresh messages during generation.")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        state_refresh_logs = []

        def on_console(msg):
            text = msg.text
            if '[runPasses] After Pass' in text:
                state_refresh_logs.append(text)
                print(f"  Found state refresh: {text}")

        page.on("console", on_console)

        try:
            await page.goto("http://localhost:5173", wait_until="networkidle")

            # Wait for potential generation
            print("\nMonitoring for state refresh logs for 60 seconds...")
            await asyncio.sleep(60)

            if state_refresh_logs:
                print(f"\nFOUND {len(state_refresh_logs)} state refresh log(s)")
                print("This indicates the fix is working - state is being refreshed after each pass")
            else:
                print("\nNo state refresh logs found.")
                print("This is expected if no generation is running.")
                print("Start a content generation to see the fix in action.")

        finally:
            await browser.close()


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == '--quick':
        asyncio.run(quick_state_refresh_test())
    else:
        asyncio.run(run_comprehensive_test())
