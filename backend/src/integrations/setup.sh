#!/bin/bash
# Setup script for Python bridge dependencies

set -e

echo "=== AutoBrowse Python Bridge Setup ==="
echo ""

# Check Python version
echo "Checking Python version..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1)
    echo "  Found: $PYTHON_VERSION"
else
    echo "  ERROR: Python 3 not found. Please install Python 3.9+"
    exit 1
fi

# Navigate to integrations directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "Installing Python dependencies..."

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "  Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip --quiet

# Install requirements
echo "  Installing from requirements.txt..."
pip install -r requirements.txt --quiet

# Install Playwright browsers
echo ""
echo "Installing Playwright browsers..."
playwright install chromium

# Check for tesseract (optional, for OCR)
echo ""
echo "Checking OCR dependencies..."
if command -v tesseract &> /dev/null; then
    TESSERACT_VERSION=$(tesseract --version 2>&1 | head -1)
    echo "  Found: $TESSERACT_VERSION"
else
    echo "  WARNING: Tesseract not found. OCR will be disabled."
    echo "  To install on Ubuntu/Debian: sudo apt-get install tesseract-ocr"
    echo "  To install on macOS: brew install tesseract"
fi

# Test the bridge
echo ""
echo "Testing Python bridge..."
python3 -c "
import sys
sys.path.insert(0, 'browser-use')
try:
    from browser_use import Agent, BrowserSession
    print('  browser-use: OK')
except ImportError as e:
    print(f'  browser-use: FAILED - {e}')

try:
    import cv2
    print('  OpenCV: OK')
except ImportError as e:
    print(f'  OpenCV: FAILED - {e}')

try:
    import pytesseract
    print('  pytesseract: OK')
except ImportError as e:
    print(f'  pytesseract: FAILED - {e}')

try:
    import anthropic
    print('  anthropic: OK')
except ImportError as e:
    print(f'  anthropic: FAILED - {e}')
"

echo ""
echo "=== Setup Complete ==="
echo ""
echo "To use the Python bridge, ensure you have:"
echo "  1. Set ANTHROPIC_API_KEY in your environment"
echo "  2. Activated the virtual environment: source venv/bin/activate"
echo ""
echo "Run the bridge with: python3 bridge.py"
