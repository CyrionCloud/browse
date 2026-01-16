#!/usr/bin/env python3
"""
Test script for browser-use framework
Tests Playwright browser automation capabilities
"""

import sys
import asyncio
from pathlib import Path
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

results = []

def log_test(name, passed, message=""):
    status = "✅ PASS" if passed else "❌ FAIL"
    results.append((name, passed, message))
    print(f"{status}: {name}")
    if message:
        print(f"    {message}")

async def test_browser_initialization():
    """Test 1: Can initialize browser-use browser"""
    try:
        from browser_use import BrowserSession, BrowserProfile
        from playwright.async_api import async_playwright

        print("    Initializing browser...")
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            # Check if page is available
            title = await page.title()
            log_test("Browser initialization", True, f"Page title: {title[:50]}")

            await browser.close()
            return True

    except Exception as e:
        log_test("Browser initialization", False, str(e))
        return False

async def test_navigate_to_url():
    """Test 2: Can navigate to a URL"""
    try:
        from playwright.async_api import async_playwright

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            await page.goto("https://example.com")
            url = page.url

            if "example.com" in url:
                log_test("Navigate to URL", True, f"Navigated to {url}")
            else:
                log_test("Navigate to URL", False, f"URL mismatch: {url}")

            await browser.close()
            return True

    except Exception as e:
        log_test("Navigate to URL", False, str(e))
        return False

async def test_click_element():
    """Test 3: Can click an element by selector"""
    try:
        from playwright.async_api import async_playwright

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            await page.goto("https://example.com")
            # Try to click an h1 element
            await page.click("h1")

            log_test("Click element", True, "Clicked h1 element")

            await browser.close()
            return True

    except Exception as e:
        log_test("Click element", False, str(e))
        return False

async def test_type_text():
    """Test 4: Can type text into an input"""
    try:
        from playwright.async_api import async_playwright

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            await page.goto("https://example.com")
            # Note: example.com doesn't have inputs, so this might fail
            # We'll try to create an input
            await page.evaluate("""
                const input = document.createElement('input');
                input.type = 'text';
                input.id = 'test-input';
                document.body.appendChild(input);
            """)

            await page.fill("#test-input", "Hello, World!")
            value = await page.evaluate("document.getElementById('test-input').value")

            if value == "Hello, World!":
                log_test("Type text", True, f"Typed: {value}")
            else:
                log_test("Type text", False, f"Value mismatch: {value}")

            await browser.close()
            return True

    except Exception as e:
        log_test("Type text", False, str(e))
        return False

async def test_extract_data():
    """Test 5: Can extract data from page"""
    try:
        from playwright.async_api import async_playwright

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            await page.goto("https://example.com")

            # Extract page title
            title = await page.title()

            # Extract all text
            text = await page.evaluate("() => document.body.innerText")

            # Extract h1 text
            h1_text = await page.evaluate("() => document.querySelector('h1')?.textContent")

            log_test("Extract data", True,
                    f"Title: {title[:30]}, H1: {h1_text[:30]}, Text length: {len(text)}")

            await browser.close()
            return True

    except Exception as e:
        log_test("Extract data", False, str(e))
        return False

async def test_take_screenshot():
    """Test 6: Can take a screenshot"""
    try:
        from playwright.async_api import async_playwright
        import base64

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            await page.goto("https://example.com")

            # Take screenshot as base64
            screenshot = await page.screenshot(encoding="base64")

            if screenshot and len(screenshot) > 0:
                log_test("Take screenshot", True, f"Screenshot size: {len(screenshot)} chars (base64)")
            else:
                log_test("Take screenshot", False, "Empty screenshot")

            await browser.close()
            return True

    except Exception as e:
        log_test("Take screenshot", False, str(e))
        return False

async def test_dom_tree_extraction():
    """Test 7: Can extract DOM tree"""
    try:
        from playwright.async_api import async_playwright

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            await page.goto("https://example.com")

            # Extract simple DOM structure
            dom_tree = await page.evaluate("""
                () => {
                    const elements = [];
                    const walker = document.createTreeWalker(
                        document.body,
                        NodeFilter.SHOW_ELEMENT,
                        null,
                        false
                    );

                    let node;
                    let count = 0;
                    while ((node = walker.nextNode()) && count < 100) {
                        elements.push({
                            tag: node.tagName,
                            id: node.id,
                            classes: node.className,
                            text: node.textContent?.substring(0, 50)
                        });
                        count++;
                    }
                    return { elements: elements, total: count };
                }
            """)

            if dom_tree['total'] > 0:
                log_test("DOM tree extraction", True,
                        f"Extracted {dom_tree['total']} elements")
            else:
                log_test("DOM tree extraction", False, "No elements extracted")

            await browser.close()
            return True

    except Exception as e:
        log_test("DOM tree extraction", False, str(e))
        return False

async def test_scroll_page():
    """Test 8: Can scroll page"""
    try:
        from playwright.async_api import async_playwright

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            await page.goto("https://example.com")

            # Scroll down
            await page.evaluate("window.scrollBy(0, 100)")

            # Get scroll position
            scroll_y = await page.evaluate("() => window.scrollY")

            if scroll_y > 0:
                log_test("Scroll page", True, f"Scrolled to Y: {scroll_y}")
            else:
                log_test("Scroll page", False, f"Scroll position: {scroll_y}")

            await browser.close()
            return True

    except Exception as e:
        log_test("Scroll page", False, str(e))
        return False

async def test_element_highlighting():
    """Test 9: Can highlight elements"""
    try:
        from playwright.async_api import async_playwright

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            await page.goto("https://example.com")

            # Highlight an element
            await page.evaluate("""
                const h1 = document.querySelector('h1');
                if (h1) {
                    h1.style.border = '3px solid red';
                    h1.style.backgroundColor = 'yellow';
                    return true;
                }
                return false;
            """)

            log_test("Element highlighting", True, "Applied highlight styles to h1")

            await browser.close()
            return True

    except Exception as e:
        log_test("Element highlighting", False, str(e))
        return False

async def main():
    """Run all tests"""
    print("=" * 60)
    print("Browser-use Framework Tests")
    print("=" * 60)
    print()

    # Run all tests
    await test_browser_initialization()
    await test_navigate_to_url()
    await test_click_element()
    await test_type_text()
    await test_extract_data()
    await test_take_screenshot()
    await test_dom_tree_extraction()
    await test_scroll_page()
    await test_element_highlighting()

    # Print summary
    print()
    print("=" * 60)
    print("Test Summary")
    print("=" * 60)

    passed = sum(1 for _, result, _ in results if result)
    total = len(results)

    print(f"Passed: {passed}/{total}")
    print(f"Failed: {total - passed}/{total}")
    print(f"Pass Rate: {(passed/total)*100:.1f}%")

    if passed == total:
        print("\n✅ All tests passed!")
        return 0
    else:
        print("\n❌ Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
