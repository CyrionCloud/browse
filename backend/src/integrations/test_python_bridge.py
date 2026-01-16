#!/usr/bin/env python3
"""
Test script for Python bridge (bridge.py)
Tests message protocol, process spawning, and basic functionality
"""

import sys
import json
import uuid
import time
import subprocess
from pathlib import Path

# Test results
results = []

def log_test(name, passed, message=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    results.append((name, passed, message))
    print(f"{status}: {name}")
    if message:
        print(f"    {message}")

def test_1_bridge_import():
    """Test 1: Can import bridge module"""
    try:
        sys.path.insert(0, str(Path(__file__).parent))
        # Check if bridge.py exists
        bridge_path = Path(__file__).parent / "bridge.py"
        if not bridge_path.exists():
            log_test("bridge.py exists", False, "bridge.py not found")
            return False

        log_test("bridge.py exists", True)
        return True
    except Exception as e:
        log_test("bridge.py exists", False, str(e))
        return False

def test_2_python_executable():
    """Test 2: Python executable is available"""
    try:
        result = subprocess.run(
            ["python3", "--version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            log_test("Python3 executable", True, result.stdout.strip())
            return True
        else:
            log_test("Python3 executable", False, f"Exit code {result.returncode}")
            return False
    except Exception as e:
        log_test("Python3 executable", False, str(e))
        return False

def test_3_dependencies_import():
    """Test 3: All required dependencies can be imported"""
    dependencies = [
        "browser_use",
        "anthropic",
        "cv2",
        "numpy",
        "pytesseract",
        "uuid",
        "json"
    ]

    all_passed = True
    for dep in dependencies:
        try:
            __import__(dep)
            log_test(f"Import {dep}", True)
        except ImportError as e:
            log_test(f"Import {dep}", False, str(e))
            all_passed = False

    return all_passed

def test_4_message_format():
    """Test 4: Message format is valid JSON"""
    try:
        # Create a test message
        test_message = {
            "id": str(uuid.uuid4()),
            "type": "browser_use",
            "method": "navigate",
            "params": {"url": "https://example.com"},
            "sessionId": "test-session-123"
        }

        # Serialize to JSON
        json_str = json.dumps(test_message)

        # Deserialize back
        parsed = json.loads(json_str)

        # Verify structure
        if all(key in parsed for key in ["id", "type", "method", "params"]):
            log_test("Message JSON format", True)
            return True
        else:
            log_test("Message JSON format", False, "Missing required fields")
            return False
    except Exception as e:
        log_test("Message JSON format", False, str(e))
        return False

def test_5_bridge_startup():
    """Test 5: Bridge.py can start and accept input"""
    try:
        # Start bridge.py process
        process = subprocess.Popen(
            ["python3", "bridge.py"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=Path(__file__).parent
        )

        # Send a simple test message
        test_msg = {
            "id": str(uuid.uuid4()),
            "type": "browser_use",
            "method": "navigate",
            "params": {"url": "https://example.com"}
        }

        process.stdin.write(json.dumps(test_msg) + "\n")
        process.stdin.flush()

        # Wait briefly for response
        time.sleep(2)

        # Check if process is still running
        if process.poll() is None:
            log_test("Bridge startup", True, "Process running")
            process.terminate()
            process.wait(timeout=5)
            return True
        else:
            stdout, stderr = process.communicate()
            log_test("Bridge startup", False,
                     f"Process exited. stdout: {stdout[:200]}, stderr: {stderr[:200]}")
            return False
    except Exception as e:
        log_test("Bridge startup", False, str(e))
        return False

def test_6_browser_use_import():
    """Test 6: Can import browser-use Agent"""
    try:
        from browser_use import Agent

        # Check if Agent class exists
        if Agent is not None:
            log_test("browser-use Agent import", True)
            return True
        else:
            log_test("browser-use Agent import", False, "Agent class not found")
            return False
    except ImportError as e:
        log_test("browser-use Agent import", False, str(e))
        return False

def test_7_anthropic_client():
    """Test 7: Can import Anthropic client"""
    try:
        import anthropic

        # Check if client can be instantiated (even without API key for now)
        client = anthropic.Anthropic(api_key="test")
        if client is not None:
            log_test("Anthropic client import", True)
            return True
        else:
            log_test("Anthropic client import", False, "Client instantiation failed")
            return False
    except Exception as e:
        log_test("Anthropic client import", False, str(e))
        return False

def test_8_playwright_import():
    """Test 8: Can import Playwright"""
    try:
        from playwright.sync_api import sync_playwright

        log_test("Playwright import", True)
        return True
    except ImportError as e:
        log_test("Playwright import", False, str(e))
        return False

def main():
    """Run all tests"""
    print("=" * 60)
    print("Python Bridge Integration Tests")
    print("=" * 60)
    print()

    # Run all tests
    test_1_bridge_import()
    test_2_python_executable()
    test_3_dependencies_import()
    test_4_message_format()
    test_5_bridge_startup()
    test_6_browser_use_import()
    test_7_anthropic_client()
    test_8_playwright_import()

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
    sys.exit(main())
