"""
OWL Vision Integration Service

Combines UIElementDetector (YOLOv8) with Set-of-Marks for
visual element selection in browser automation.
"""

import asyncio
import numpy as np
import cv2
import base64
import logging
from typing import List, Dict, Any, Tuple, Optional
from playwright.async_api import async_playwright, Page

from app.services.set_of_marks import SetOfMarks, MarkedElement, som
from app.services.owl.ui_element_detector import UIElementDetector

logger = logging.getLogger(__name__)


class OWLVisionService:
    """
    Integrates OWL computer vision with browser automation.
    
    This service:
    1. Takes screenshots from browser
    2. Detects UI elements using YOLOv8
    3. Creates Set-of-Marks overlay
    4. Provides click coordinates for visual selection
    """
    
    def __init__(self):
        self.detector: Optional[UIElementDetector] = None
        self.som = SetOfMarks()
        self._current_marks: List[MarkedElement] = []
        self._last_image: Optional[np.ndarray] = None
        self._last_annotated: Optional[np.ndarray] = None
    
    async def initialize(self):
        """Initialize the UI element detector."""
        try:
            self.detector = UIElementDetector(use_tiny=True)
            if self.detector.is_available():
                logger.info("✓ OWL Vision initialized with YOLOv8")
                return True
            else:
                logger.warning("⚠ YOLOv8 not available, using fallback detection")
                return False
        except Exception as e:
            logger.error(f"✗ Failed to initialize OWL Vision: {e}")
            return False
    
    def is_available(self) -> bool:
        """Check if vision service is ready."""
        return self.detector is not None and self.detector.is_available()
    
    async def analyze_page(
        self,
        page: Page,
        interactive_only: bool = True
    ) -> Tuple[str, List[MarkedElement], str]:
        """
        Analyze a page and create Set-of-Marks overlay.
        
        Args:
            page: Playwright page object
            interactive_only: Only mark interactive elements
            
        Returns:
            Tuple of (annotated_image_base64, marked_elements, description)
        """
        try:
            # Capture screenshot
            screenshot_bytes = await page.screenshot(type='png')
            image = cv2.imdecode(
                np.frombuffer(screenshot_bytes, np.uint8),
                cv2.IMREAD_COLOR
            )
            self._last_image = image
            
            # Detect elements
            if self.is_available():
                if interactive_only:
                    elements = self.detector.get_interactive_elements(image)
                else:
                    elements = self.detector.detect_elements(image)
                
                # Convert UIElement objects to dicts
                elements_dicts = [
                    {
                        'type': e.type,
                        'bounding_box': e.bounding_box,
                        'confidence': e.confidence,
                        'text': e.text_content
                    }
                    for e in elements
                ]
            else:
                # Fallback: use simple edge detection for elements
                elements_dicts = self._fallback_detection(image)
            
            # Create Set-of-Marks overlay
            annotated, marked_elements = self.som.create_marked_image(
                image, elements_dicts
            )
            self._last_annotated = annotated
            self._current_marks = marked_elements
            
            # Generate description for LLM
            description = self.som.generate_marks_description(marked_elements)
            
            # Convert to base64
            image_base64 = self.som.image_to_base64(annotated)
            
            logger.info(f"✓ Page analyzed: {len(marked_elements)} elements marked")
            return image_base64, marked_elements, description
            
        except Exception as e:
            logger.error(f"✗ Error analyzing page: {e}")
            return "", [], ""
    
    def _fallback_detection(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """Simple fallback detection using contours."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        
        # Find contours
        contours, _ = cv2.findContours(
            edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        
        elements = []
        for i, contour in enumerate(contours[:20]):  # Limit to 20
            x, y, w, h = cv2.boundingRect(contour)
            if w > 30 and h > 15:  # Filter small noise
                elements.append({
                    'type': 'element',
                    'bounding_box': {'x': x, 'y': y, 'width': w, 'height': h},
                    'confidence': 0.5
                })
        
        return elements
    
    def get_click_coordinates(self, mark_id: int) -> Optional[Tuple[int, int]]:
        """Get click coordinates for a mark ID."""
        return self.som.get_click_coordinates(mark_id, self._current_marks)
    
    def get_element_by_mark(self, mark_id: int) -> Optional[MarkedElement]:
        """Get element details by mark ID."""
        return self.som.get_element_by_mark(mark_id, self._current_marks)
    
    async def click_by_mark(self, page: Page, mark_id: int) -> bool:
        """
        Click an element by its mark ID.
        
        This enables true visual selection - the user/LLM says
        "click mark 5" and this function finds and clicks it.
        """
        coords = self.get_click_coordinates(mark_id)
        if coords:
            x, y = coords
            await page.mouse.click(x, y)
            logger.info(f"✓ Clicked mark {mark_id} at ({x}, {y})")
            return True
        else:
            logger.warning(f"⚠ Mark {mark_id} not found")
            return False
    
    def get_annotated_image_base64(self) -> Optional[str]:
        """Get the last annotated image as base64."""
        if self._last_annotated is not None:
            return self.som.image_to_base64(self._last_annotated)
        return None
    
    def get_marks_count(self) -> int:
        """Get number of currently marked elements."""
        return len(self._current_marks)


# Global instance
owl_vision = OWLVisionService()


async def test_owl_vision_on_container():
    """Test OWL vision on the noVNC container."""
    print("🦉 Testing OWL Vision on noVNC Container")
    print("=" * 50)
    
    # Initialize vision service
    await owl_vision.initialize()
    
    async with async_playwright() as p:
        # Connect to container via CDP
        print("\n📡 Connecting to container at http://localhost:9223...")
        
        try:
            browser = await p.chromium.connect_over_cdp("http://localhost:9223")
            print("   ✓ Connected to browser")
            
            # Get or create page
            contexts = browser.contexts
            if contexts and contexts[0].pages:
                page = contexts[0].pages[0]
            else:
                context = await browser.new_context()
                page = await context.new_page()
            
            # Navigate to a test page
            print("\n🌐 Navigating to Google...")
            await page.goto("https://www.google.com", wait_until="networkidle")
            await asyncio.sleep(2)
            
            # Analyze the page
            print("\n🔍 Analyzing page with OWL Vision...")
            image_b64, marks, description = await owl_vision.analyze_page(page)
            
            print(f"\n📊 Results:")
            print(f"   Elements detected: {len(marks)}")
            print(f"\n{description}")
            
            # Save annotated image for viewing
            if owl_vision._last_annotated is not None:
                output_path = "/tmp/owl_vision_test.png"
                cv2.imwrite(output_path, owl_vision._last_annotated)
                print(f"\n📸 Annotated image saved to: {output_path}")
            
            # Test clicking if we have marks
            if marks:
                print(f"\n🎯 Testing click on mark 1...")
                success = await owl_vision.click_by_mark(page, 1)
                if success:
                    print("   ✓ Click successful!")
                    await asyncio.sleep(1)
            
            await browser.close()
            print("\n✅ Test completed successfully!")
            
        except Exception as e:
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_owl_vision_on_container())
