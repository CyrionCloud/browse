#!/usr/bin/env python3
"""
Test OWL Vision YOLOv8 detection against a live page.
This script tests the full pipeline: screenshot -> YOLOv8 -> Set-of-Marks
"""

import asyncio
import sys
import os

import pytest

# Add parent path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from playwright.async_api import async_playwright


@pytest.mark.asyncio
async def test_owl_vision_live():
    """Test OWL vision on a live webpage."""
    print("🦉 Testing OWL Vision on Live Page")
    print("=" * 50)
    
    # Import OWL services
    from app.services.owl_vision_service import owl_vision
    
    # Initialize OWL Vision
    print("\n📦 Initializing OWL Vision...")
    initialized = await owl_vision.initialize()
    
    if initialized:
        print("   ✓ YOLOv8 model loaded successfully")
    else:
        print("   ⚠ YOLOv8 unavailable, will use fallback detection")
    
    # Launch browser
    async with async_playwright() as p:
        print("\n🌐 Launching browser...")
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1280, 'height': 720})
        page = await context.new_page()
        
        # Test pages
        test_urls = [
            ("Google", "https://www.google.com"),
            ("GitHub", "https://github.com"),
        ]
        
        for name, url in test_urls:
            print(f"\n🔍 Testing: {name} ({url})")
            
            try:
                await page.goto(url, wait_until="networkidle", timeout=15000)
                await asyncio.sleep(1)
                
                # Analyze page with OWL Vision
                annotated_b64, marks, description = await owl_vision.analyze_page(
                    page, 
                    interactive_only=True
                )
                
                print(f"   ✓ Detected {len(marks)} interactive elements")
                
                # Show element types found
                types_found = {}
                for mark in marks:
                    t = mark.element_type
                    types_found[t] = types_found.get(t, 0) + 1
                
                if types_found:
                    print(f"   Element types: {types_found}")
                
                # Save annotated image
                if owl_vision._last_annotated is not None:
                    import cv2
                    output_path = f"/tmp/owl_test_{name.lower()}.png"
                    cv2.imwrite(output_path, owl_vision._last_annotated)
                    print(f"   📸 Saved annotated image: {output_path}")
                
                # Test click coordinates
                if marks:
                    first_mark = marks[0]
                    coords = owl_vision.get_click_coordinates(first_mark.mark_id)
                    print(f"   🎯 Mark 1 ({first_mark.element_type}) at {coords}")
                    
            except Exception as e:
                print(f"   ✗ Error: {e}")
        
        await browser.close()
    
    print("\n" + "=" * 50)
    print("✅ OWL Vision test completed!")
    
    return True


if __name__ == "__main__":
    success = asyncio.run(test_owl_vision_live())
    sys.exit(0 if success else 1)
