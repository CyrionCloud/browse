#!/bin/bash
# Test script for Python bridge, Browser Use, and Owl

echo "=== Testing Python Bridge, Browser Use, and Owl ==="
echo ""

cd "$(dirname "$0")"
source venv/bin/activate

# Test health check
echo "1. Testing health check..."
echo '{"id": "test-health", "type": "browser_use", "method": "health", "params": {}}' | timeout 10s python3 bridge.py | head -1

echo ""
echo "2. Testing browser navigation..."
echo '{"id": "test-navigate", "type": "browser_use", "method": "navigate", "params": {"url": "https://example.com"}, "sessionId": "test-session"}' | timeout 30s python3 bridge.py | head -1

echo ""
echo "3. Testing screenshot (if browser is open)..."
echo '{"id": "test-screenshot", "type": "browser_use", "method": "screenshot", "params": {}, "sessionId": "test-session"}' | timeout 10s python3 bridge.py | head -1

echo ""
echo "4. Testing vision service with a simple test image..."
# Create a simple test image (1x1 pixel)
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" > test_image.b64

echo '{"id": "test-vision", "type": "owl", "method": "analyze_screenshot", "params": {"image": "'$(cat test_image.b64)'"}}' | timeout 10s python3 bridge.py | head -1

echo ""
echo "5. Testing OCR extraction..."
echo '{"id": "test-ocr", "type": "owl", "method": "extract_text", "params": {"image": "'$(cat test_image.b64)'"}}' | timeout 10s python3 bridge.py | head -1

# Cleanup
rm -f test_image.b64

echo ""
echo "6. Closing browser session..."
echo '{"id": "test-close", "type": "browser_use", "method": "close_session", "params": {}, "sessionId": "test-session"}' | timeout 10s python3 bridge.py | head -1

echo ""
echo "=== Tests Complete ==="