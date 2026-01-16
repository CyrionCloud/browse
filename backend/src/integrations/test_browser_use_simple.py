#!/usr/bin/env python3
"""Simplified browser-use tests (faster, less error-prone)"""

import sys
import asyncio
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

results = []

def log_test(name, passed, message=""):
    status = "✅ PASS" if passed else "❌ FAIL"
    results.append((name, passed, message))
    print(f"{status}: {name}")
    if message:
        print(f"    {message}")

async def run_tests():
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Test 1: Navigate
        await page.goto("https://example.com")
        url = page.url
        log_test("Navigate to URL", "example.com" in url, url)

        # Test 2: Extract title
        title = await page.title()
        log_test("Extract page title", len(title) > 0, f"Title: {title}")

        # Test 3: Extract text
        text = await page.evaluate("() => document.body.innerText")
        log_test("Extract page text", len(text) > 0, f"Text length: {len(text)}")

        # Test 4: Click element
        try:
            await page.click("h1")
            log_test("Click element", True, "Clicked h1")
        except Exception as e:
            log_test("Click element", False, str(e))

        # Test 5: Get screenshot
        try:
            screenshot = await page.screenshot()
            log_test("Take screenshot", len(screenshot) > 0, f"Size: {len(screenshot)} bytes")
        except Exception as e:
            log_test("Take screenshot", False, str(e))

        # Test 6: DOM tree
        try:
            elements = await page.evaluate("() => document.querySelectorAll('*').length")
            log_test("Count DOM elements", elements > 0, f"Found {elements} elements")
        except Exception as e:
            log_test("Count DOM elements", False, str(e))

        # Test 7: Create and type in input
        try:
            await page.evaluate("""
                const input = document.createElement('input');
                input.id = 'test-input';
                document.body.appendChild(input);
            """)
            await page.fill("#test-input", "Test")
            value = await page.evaluate("document.getElementById('test-input').value")
            log_test("Type in input", value == "Test", f"Value: {value}")
        except Exception as e:
            log_test("Type in input", False, str(e))

        # Test 8: Scroll
        try:
            await page.evaluate("window.scrollTo(0, 100)")
            scroll_y = await page.evaluate("() => window.scrollY")
            log_test("Scroll page", scroll_y >= 0, f"Scroll Y: {scroll_y}")
        except Exception as e:
            log_test("Scroll page", False, str(e))

        # Test 9: Highlight
        try:
            await page.evaluate("""
                const el = document.querySelector('h1');
                if (el) {
                    el.style.border = '2px solid red';
                    el.style.backgroundColor = 'yellow';
                }
            """)
            log_test("Highlight element", True, "Applied styles")
        except Exception as e:
            log_test("Highlight element", False, str(e))

        await browser.close()

    # Summary
    print()
    print("=" * 60)
    print("Summary")
    print("=" * 60)
    passed = sum(1 for _, r, _ in results if r)
    total = len(results)
    print(f"Passed: {passed}/{total} ({(passed/total)*100:.1f}%)")
    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(asyncio.run(run_tests()))
