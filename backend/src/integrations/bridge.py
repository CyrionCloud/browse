#!/usr/bin/env python3
"""
Python Bridge for AutoBrowse
Connects Node.js backend with browser-use and vision capabilities
"""
import sys
import json
import logging
import traceback
import os
import asyncio
import base64
from typing import Dict, Any, Optional, List
from datetime import datetime
import uuid

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('python-bridge')

# Set environment for browser-use
os.environ['BROWSER_USE_SETUP_LOGGING'] = 'false'

# Add integrations to path
INTEGRATIONS_DIR = os.path.dirname(__file__)
sys.path.insert(0, os.path.join(INTEGRATIONS_DIR, 'browser-use'))

# Track framework availability
browser_use_available = False
vision_available = False
ml_detector_available = False

# Browser-use imports
try:
    from browser_use import Agent, BrowserSession, BrowserProfile, DomService
    from browser_use.llm.anthropic.chat import ChatAnthropic
    browser_use_available = True
    logger.info('browser-use module loaded successfully')
except ImportError as e:
    logger.warning(f'browser-use not available: {e}')
    # Define placeholder for type hints
    BrowserSession = None
    Agent = None

# Vision imports (OpenCV, pytesseract for OCR)
try:
    import cv2
    import numpy as np
    vision_available = True
    logger.info('OpenCV loaded for vision capabilities')
except ImportError as e:
    logger.warning(f'OpenCV not available: {e}')

try:
    import pytesseract
    logger.info('pytesseract loaded for OCR')
except ImportError as e:
    logger.warning(f'pytesseract not available, OCR will be limited: {e}')
    pytesseract = None

# ML-based UI element detector
ui_element_detector = None
text_element_mapper = None
layout_analyzer = None
try:
    # Add integrations directory to path for imports
    INTEGRATIONS_DIR = os.path.dirname(__file__)
    sys.path.insert(0, INTEGRATIONS_DIR)

    from owl.ui_element_detector import UIElementDetector
    from owl.text_element_mapper import TextElementMapper
    from owl.layout_analyzer import AdvancedLayoutAnalyzer
    ui_element_detector = UIElementDetector(use_tiny=True)
    text_element_mapper = TextElementMapper(min_overlap_ratio=0.3)
    layout_analyzer = AdvancedLayoutAnalyzer()

    if ui_element_detector.is_available():
        ml_detector_available = True
        logger.info('ML-based UI element detector loaded successfully')
    else:
        logger.warning('ML detector initialized but not available (using fallback)')

    logger.info('Text-to-element mapper initialized')
    logger.info('Advanced layout analyzer initialized')
except ImportError as e:
    logger.warning(f'ML element detector not available: {e}')
except Exception as e:
    logger.warning(f'Failed to initialize ML detector: {e}')


class BrowserManager:
    """Manages browser sessions and actions"""

    def __init__(self):
        self.sessions: Dict[str, Any] = {}
        self.browsers: Dict[str, Any] = {}  # BrowserSession instances
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)

    def _run_async(self, coro):
        """Run async coroutine in the event loop"""
        return self.loop.run_until_complete(coro)

    async def _create_browser_session(self, session_id: str, config: Dict[str, Any]) -> Any:
        """Create a new browser session with anti-detection and HTTP/2 fix"""
        # Browser args to prevent bot detection and fix HTTP/2 protocol errors
        browser_args = [
            '--disable-blink-features=AutomationControlled',  # Prevent bot detection
            '--disable-http2',  # Fix ERR_HTTP2_PROTOCOL_ERROR
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--allow-running-insecure-content',
            '--ignore-certificate-errors',
        ]

        # Create browser session with anti-detection args
        browser = BrowserSession(
            headless=config.get('headless', True),  # Default to headless for testing
            id=session_id,
            keep_alive=True,
            args=browser_args,
        )

        await browser.start()

        self.browsers[session_id] = browser
        return browser

    async def _get_browser(self, session_id: str, config: Dict[str, Any] = None) -> Any:
        """Get or create a browser session"""
        if session_id not in self.browsers:
            if config is None:
                config = {}
            await self._create_browser_session(session_id, config)
        return self.browsers[session_id]

    async def navigate(self, session_id: str, url: str, config: Dict[str, Any] = None) -> Dict[str, Any]:
        """Navigate to URL with improved error handling"""
        try:
            browser = await self._get_browser(session_id, config)
            page = await browser.get_current_page()

            # Navigate with timeout and wait for DOM content
            await page.goto(url, wait_until='domcontentloaded', timeout=30000)

            return {
                'success': True,
                'url': await page.get_url(),
                'title': await page.get_title(),
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            error_msg = str(e)
            logger.error(f'Navigate error: {error_msg}')

            # If HTTP/2 error, suggest disabling HTTP/2 in browser settings
            if 'HTTP2_PROTOCOL_ERROR' in error_msg or 'net::ERR_' in error_msg:
                logger.warning('Network error detected - browser may need restart with --disable-http2')

            return {'success': False, 'error': error_msg}

    async def click(self, session_id: str, selector: str, description: str = '', config: Dict[str, Any] = None) -> Dict[str, Any]:
        """Click on element"""
        try:
            browser = await self._get_browser(session_id, config)
            page = await browser.get_current_page()

            # Try different click strategies
            try:
                elements = await page.get_elements_by_css_selector(selector)
                if elements:
                    await elements[0].click()
                else:
                    # Try JavaScript click as fallback
                    await page.evaluate(f'document.querySelector("{selector}")?.click()')
            except Exception as e:
                # Try JavaScript click as fallback
                await page.evaluate(f'document.querySelector("{selector}")?.click()')

            return {
                'success': True,
                'selector': selector,
                'description': description,
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f'Click error: {e}')
            return {'success': False, 'error': str(e), 'selector': selector}

    async def type_text(self, session_id: str, selector: str, text: str, config: Dict[str, Any] = None) -> Dict[str, Any]:
        """Type text into element"""
        try:
            browser = await self._get_browser(session_id, config)
            page = await browser.get_current_page()

            elements = await page.get_elements_by_css_selector(selector)
            if elements:
                await elements[0].fill(text)
            else:
                raise Exception(f"Element not found: {selector}")

            return {
                'success': True,
                'selector': selector,
                'text_length': len(text),
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f'Type error: {e}')
            return {'success': False, 'error': str(e), 'selector': selector}

    async def scroll(self, session_id: str, direction: str = 'down', amount: int = 500, config: Dict[str, Any] = None) -> Dict[str, Any]:
        """Scroll page"""
        try:
            browser = await self._get_browser(session_id, config)
            page = await browser.get_current_page()

            delta_y = amount if direction == 'down' else -amount
            mouse = await page.mouse
            await mouse.scroll(delta_y=delta_y)
            await asyncio.sleep(0.5)  # Wait for scroll animation

            return {
                'success': True,
                'direction': direction,
                'amount': amount,
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f'Scroll error: {e}')
            return {'success': False, 'error': str(e)}

    async def extract(self, session_id: str, selector: str, config: Dict[str, Any] = None) -> Dict[str, Any]:
        """Extract text from element"""
        try:
            browser = await self._get_browser(session_id, config)
            page = await browser.get_current_page()

            elements = await page.get_elements_by_css_selector(selector)
            if elements:
                text = await elements[0].evaluate("() => this.innerText")
                return {
                    'success': True,
                    'selector': selector,
                    'text': text,
                    'timestamp': datetime.now().isoformat()
                }
            else:
                return {'success': False, 'error': f'Element not found: {selector}'}
        except Exception as e:
            logger.error(f'Extract error: {e}')
            return {'success': False, 'error': str(e), 'selector': selector}

    async def screenshot(self, session_id: str, config: Dict[str, Any] = None) -> Dict[str, Any]:
        """Take screenshot"""
        try:
            browser = await self._get_browser(session_id, config)
            page = await browser.get_current_page()

            screenshot_base64 = await page.screenshot(format='png')

            return {
                'success': True,
                'screenshot': screenshot_base64,
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f'Screenshot error: {e}')
            return {'success': False, 'error': str(e)}

    async def get_dom_tree(self, session_id: str, config: Dict[str, Any] = None) -> Dict[str, Any]:
        """Get DOM tree structure"""
        try:
            browser = await self._get_browser(session_id, config)
            page = await browser.get_current_page()

            # Extract DOM tree using JavaScript
            dom_data = await page.evaluate('''() => {
                function extractElement(el, maxDepth = 5, currentDepth = 0) {
                    if (currentDepth > maxDepth || !el) return null;

                    const result = {
                        id: el.id || Math.random().toString(36).substr(2, 9),
                        tag: el.tagName?.toLowerCase() || '',
                        text: el.innerText?.slice(0, 100) || '',
                        attributes: {},
                        children: []
                    };

                    // Get important attributes
                    ['id', 'class', 'name', 'href', 'src', 'type', 'placeholder', 'value', 'aria-label', 'role'].forEach(attr => {
                        if (el.getAttribute && el.getAttribute(attr)) {
                            result.attributes[attr] = el.getAttribute(attr);
                        }
                    });

                    // Get bounding box
                    const rect = el.getBoundingClientRect();
                    if (rect) {
                        result.boundingBox = {
                            x: Math.round(rect.x),
                            y: Math.round(rect.y),
                            width: Math.round(rect.width),
                            height: Math.round(rect.height)
                        };
                    }

                    // Process children (limit to interactive elements)
                    const interactiveSelectors = 'a, button, input, select, textarea, [onclick], [role="button"], [role="link"]';
                    const children = el.querySelectorAll(':scope > ' + interactiveSelectors);
                    result.children = Array.from(children).slice(0, 20).map(child =>
                        extractElement(child, maxDepth, currentDepth + 1)
                    ).filter(Boolean);

                    return result;
                }

                return {
                    url: window.location.href,
                    title: document.title,
                    elements: Array.from(document.querySelectorAll('body > *')).slice(0, 50).map(el =>
                        extractElement(el, 3)
                    ).filter(Boolean)
                };
            }''')

            # Since evaluate returns a string (JSONified) if it's an object, we need to parse it?
            # Wait, page.evaluate says: "String representation of the JavaScript execution result. Objects and arrays are JSON-stringified."
            # So I need to JSON load it.
            import json
            if isinstance(dom_data, str):
                 try:
                     dom_data = json.loads(dom_data)
                 except:
                     pass

            return {
                'success': True,
                **dom_data,
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f'Get DOM tree error: {e}')
            return {'success': False, 'error': str(e)}

    async def highlight_element(self, session_id: str, selector: str, config: Dict[str, Any] = None) -> Dict[str, Any]:
        """Highlight element on page"""
        try:
            browser = await self._get_browser(session_id, config)
            page = await browser.get_current_page()

            await page.evaluate(f'''(selector) => {{
                const el = document.querySelector(selector);
                if (el) {{
                    el.style.outline = '3px solid #00d9ff';
                    el.style.outlineOffset = '2px';
                    setTimeout(() => {{
                        el.style.outline = '';
                        el.style.outlineOffset = '';
                    }}, 2000);
                }}
            }}''', selector)

            return {
                'success': True,
                'selector': selector,
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f'Highlight error: {e}')
            return {'success': False, 'error': str(e)}

    async def run_agent(self, session_id: str, task: str, config: Dict[str, Any] = None) -> Dict[str, Any]:
        """Run browser-use agent for a task with screenshot capture"""
        try:
            browser = await self._get_browser(session_id, config)
            
            api_key = os.environ.get('ANTHROPIC_API_KEY')
            if not api_key:
                return {'success': False, 'error': 'ANTHROPIC_API_KEY not set'}
            
            llm = ChatAnthropic(
                model_name='claude-sonnet-4.5-20250514',
                api_key=api_key,
            )
            
            agent = Agent(
                task=task,
                llm=llm,
                browser=browser,
                max_actions_per_step=config.get('maxSteps', 50) if config else 50,
            )
            
            # Run agent with screenshot capture after each step
            last_screenshot = None
            step_count = 0
            
            for step_result in agent.run():
                step_count += 1
                
                # Capture screenshot after this step
                try:
                    screenshot = await browser.screenshot(format='png')
                    last_screenshot = screenshot
                    logger.info(f'Screenshot captured after step {step_count}')
                except Exception as e:
                    logger.error(f'Failed to capture screenshot: {e}')
                    last_screenshot = None
            
            history = await agent.run()
            actions_executed = len(history.history) if history else 0
            final_result = history.final_result() if history else None
            
            # Take final screenshot
            final_screenshot = await browser.screenshot(format='png')
            
            return {
                'success': True,
                'task': task,
                'actions_executed': actions_executed,
                'result': str(final_result) if final_result else 'No result',
                'timestamp': datetime.now().isoformat(),
                'screenshot': final_screenshot,
                'screenshots_captured': actions_executed
            }
            
        except Exception as e:
            logger.error(f'Run agent error: {traceback.format_exc()}')
            return {'success': False, 'error': str(e)}

    async def close_session(self, session_id: str) -> Dict[str, Any]:
        """Close a browser session"""
        try:
            if session_id in self.browsers:
                browser = self.browsers[session_id]
                await browser.stop()
                del self.browsers[session_id]
            return {'success': True, 'session_id': session_id}
        except Exception as e:
            logger.error(f'Close session error: {e}')
            return {'success': False, 'error': str(e)}

    async def _handle_analyze_layout(self, screenshot_base64: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle layout analysis with Owl"""
        try:
            if not self.layout_analyzer:
                return {'success': False, 'error': 'Layout analyzer not available'}

            img_data = base64.b64decode(screenshot_base64)
            nparr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img is None:
                return {'success': False, 'error': 'Failed to decode image'}

            # Detect elements for layout
            confidence_threshold = params.get('config', {}).get('confidenceThreshold', 0.5) if params.get('config') else 0.5

            elements = []
            if self.ml_detector and self.ml_detector.is_available():
                elements = self.ml_detector.detect_elements(img, confidence_threshold)
                elements = [
                    {
                        'id': e.id,
                        'type': e.type,
                        'boundingBox': e.bounding_box,
                        'confidence': e.confidence
                    }
                    for e in elements
                ]

            # Analyze layout
            layout_result = self.layout_analyzer.analyze_layout(img, elements)

            return {
                'success': True,
                'layout': layout_result,
                'elements': elements,
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f'Analyze layout error: {e}')
            return {'success': False, 'error': str(e)}

    async def _handle_detect_grids(self, screenshot_base64: str) -> Dict[str, Any]:
        """Handle grid detection with Owl"""
        try:
            if not self.layout_analyzer:
                return {'success': False, 'error': 'Layout analyzer not available'}

            img_data = base64.b64decode(screenshot_base64)
            nparr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img is None:
                return {'success': False, 'error': 'Failed to decode image'}

            grids = self.layout_analyzer.detect_grids(img)

            return {
                'success': True,
                'grids': grids,
                'grid_count': len(grids),
                'total_cells': sum(len(grid) for grid in grids),
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f'Detect grids error: {e}')
            return {'success': False, 'error': str(e)}

    async def _handle_detect_tables(self, screenshot_base64: str) -> Dict[str, Any]:
        """Handle table detection with Owl"""
        try:
            if not self.layout_analyzer:
                return {'success': False, 'error': 'Layout analyzer not available'}

            img_data = base64.b64decode(screenshot_base64)
            nparr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img is None:
                return {'success': False, 'error': 'Failed to decode image'}

            tables = self.layout_analyzer.detect_tables(img)

            return {
                'success': True,
                'tables': tables,
                'table_count': len(tables),
                'total_cells': sum(table.rows * table.cols for table in tables),
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f'Detect tables error: {e}')
            return {'success': False, 'error': str(e)}

    async def _handle_reading_order(self, screenshot_base64: str) -> Dict[str, Any]:
        """Handle reading order detection with Owl"""
        try:
            if not self.layout_analyzer:
                return {'success': False, 'error': 'Layout analyzer not available'}

            img_data = base64.b64decode(screenshot_base64)
            nparr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img is None:
                return {'success': False, 'error': 'Failed to decode image'}

            # Detect elements for reading order
            confidence_threshold = 0.5
            elements = []

            if self.ml_detector and self.ml_detector.is_available():
                detected = self.ml_detector.detect_elements(img, confidence_threshold)
                elements = [
                    {
                        'id': e.id,
                        'type': e.type,
                        'boundingBox': e.bounding_box,
                        'confidence': e.confidence
                    }
                    for e in detected
                ]

            reading_order = self.layout_analyzer.detect_reading_order(img, elements)

            return {
                'success': True,
                'reading_order': reading_order,
                'element_count': len(reading_order),
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f'Reading order error: {e}')
            return {'success': False, 'error': str(e)}

    async def take_screenshot_with_owl(self, session_id: str, config: Dict[str, Any] = None) -> Dict[str, Any]:
        """Take screenshot and immediately analyze with Owl vision"""
        try:
            # 1. Take screenshot
            screenshot = await self._take_screenshot(session_id, config)

            if not screenshot.get('success'):
                return screenshot

            # 2. Analyze with Owl vision
            if self.vision_service and self.ocr_available:
                logger.debug(f'Analyzing screenshot for session {session_id} with Owl')

                owl_result = self.vision_service.analyze_screenshot(
                    screenshot['screenshot'],
                    config or {}
                )

                # 3. Enhance screenshot with Owl data
                if owl_result.get('success'):
                    screenshot['owl_analysis'] = owl_result
                    screenshot['owl_elements'] = owl_result.get('elements', [])
                    screenshot['owl_text'] = owl_result.get('text', [])
                    screenshot['owl_layout'] = owl_result.get('layout', {})
                    screenshot['vision_enabled'] = True

                    logger.info(
                        f'Owl analysis complete: {len(owl_result.get("elements", []))} elements, '
                        f'{len(owl_result.get("text", []))} text regions'
                    )
                else:
                    logger.warning(f'Owl analysis failed: {owl_result.get("error")}')
                    screenshot['vision_enabled'] = False
            else:
                screenshot['vision_enabled'] = False

            return screenshot

        except Exception as e:
            logger.error(f'Take screenshot with Owl error: {e}')
            return {'success': False, 'error': str(e), 'vision_enabled': False}

    async def get_enhanced_elements(self, session_id: str, config: Dict[str, Any] = None) -> Dict[str, Any]:
        """Get elements with Owl vision enhancement"""
        try:
            # 1. Take screenshot with Owl analysis
            screenshot = await self.take_screenshot_with_owl(session_id, config)

            if not screenshot.get('success') or not screenshot.get('vision_enabled'):
                return {
                    'success': False,
                    'error': screenshot.get('error', 'Failed to take screenshot or Owl unavailable')
                }

            # 2. Get DOM tree
            dom_result = await self.get_dom_tree(session_id)

            if not dom_result.get('success'):
                return {
                    'success': False,
                    'error': dom_result.get('error', 'Failed to get DOM tree')
                }

            # 3. Map Owl elements to DOM elements
            owl_elements = screenshot.get('owl_elements', [])
            dom_elements = dom_result.get('dom_data', {}).get('elements', [])

            element_map, unmatched_owl = self._map_owl_to_dom_elements(
                owl_elements,
                dom_elements
            )

            # 4. Build enhanced result
            result = {
                'success': True,
                'session_id': session_id,
                'screenshot': screenshot.get('screenshot'),
                'owl_elements': owl_elements,
                'dom_elements': dom_elements,
                'element_map': element_map,
                'owl_layout': screenshot.get('owl_layout', {}),
                'owl_text': screenshot.get('owl_text', []),
                'statistics': {
                    'total_owl_elements': len(owl_elements),
                    'total_dom_elements': len(dom_elements),
                    'matched_elements': len(element_map),
                    'unmatched_owl_elements': len(unmatched_owl),
                    'owl_confidence_avg': self._calculate_avg_confidence(owl_elements)
                },
                'timestamp': datetime.now().isoformat()
            }

            logger.info(
                f'Enhanced elements for session {session_id}: '
                f'{len(element_map)} matched, {len(unmatched_owl)} unmatched Owl elements'
            )

            return result

        except Exception as e:
            logger.error(f'Get enhanced elements error: {e}')
            return {'success': False, 'error': str(e)}

    def _map_owl_to_dom_elements(
        self,
        owl_elements: List[Dict[str, Any]],
        dom_elements: List[Dict[str, Any]]
    ) -> tuple[Dict[str, Dict[str, Any]], List[Dict[str, Any]]]:
        """Map Owl-detected elements to DOM elements based on spatial overlap"""
        import uuid

        element_map = {}
        unmatched_owl_elements = []

        for owl_elem in owl_elements:
            owl_box = owl_elem.get('boundingBox', {})
            best_match = None
            best_overlap = 0

            for dom_elem in dom_elements:
                dom_box = dom_elem.get('boundingBox', {})

                # Calculate overlap
                overlap = self._calculate_overlap_ratio(owl_box, dom_box)

                if overlap > best_overlap and overlap > 0.3:
                    best_overlap = overlap
                    best_match = {
                        'dom_element': dom_elem,
                        'owl_element': owl_elem,
                        'overlap': overlap,
                        'combined_confidence': (owl_elem.get('confidence', 0.7) + dom_elem.get('confidence', 1.0)) / 2
                    }

            if best_match:
                element_id = dom_elem.get('id', str(uuid.uuid4())[:8])
                element_map[element_id] = best_match

            if not best_match:
                unmatched_owl_elements.append(owl_elem)

        return element_map, unmatched_owl_elements

    def _calculate_overlap_ratio(
        self,
        box1: Dict[str, int],
        box2: Dict[str, int]
    ) -> float:
        """Calculate Intersection over Union ratio between two bounding boxes"""
        # Intersection
        x_left = max(box1['x'], box2['x'])
        y_top = max(box1['y'], box2['y'])
        x_right = min(box1['x'] + box1['width'], box2['x'] + box2['width'])
        y_bottom = min(box1['y'] + box1['height'], box2['y'] + box2['height'])

        if x_right < x_left or y_bottom < y_top:
            return 0.0

        # Intersection area
        intersection_width = max(0, x_right - x_left)
        intersection_height = max(0, y_bottom - y_top)

        # Union area
        box1_area = box1['width'] * box1['height']
        box2_area = box2['width'] * box2['height']
        union_area = box1_area + box2_area - intersection_width * intersection_height

        return intersection_width * intersection_height / union_area if union_area > 0 else 0.0

    def _calculate_avg_confidence(self, elements: List[Dict[str, Any]]) -> float:
        """Calculate average confidence from Owl elements"""
        if not elements:
            return 0.0

        confidences = [elem.get('confidence', 0.7) for elem in elements if elem.get('confidence')]
        return sum(confidences) / len(confidences) if confidences else 0.0

    async def _take_screenshot(self, session_id: str, config: Dict[str, Any] = None) -> Dict[str, Any]:
        """Take screenshot helper (internal)"""
        try:
            browser = await self._get_browser(session_id, config)
            page = await browser.get_current_page()

            # Take screenshot
            screenshot_bytes = await page.screenshot(
                full_page=True,
                type='png'
            )

            # Encode to base64
            import base64
            import io

            buffered = io.BytesIO(screenshot_bytes)
            img_str = base64.b64encode(buffered.getvalue()).decode()

            return {
                'success': True,
                'screenshot': img_str,
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f'Take screenshot error: {e}')
            return {'success': False, 'error': str(e)}



class VisionService:
    """Computer vision capabilities for screenshot analysis"""

    def __init__(self):
        self.ocr_available = pytesseract is not None
        self.ml_detector = ui_element_detector
        self.text_mapper = text_element_mapper
        self.layout_analyzer = layout_analyzer

    def analyze_screenshot(self, screenshot_base64: str, config: Dict[str, Any] = None) -> Dict[str, Any]:
        """Analyze screenshot to detect elements and extract text"""
        try:
            if not vision_available:
                return {'success': False, 'error': 'OpenCV not available'}

            # Decode base64 image
            img_data = base64.b64decode(screenshot_base64)
            nparr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img is None:
                return {'success': False, 'error': 'Failed to decode image'}

            # Use ML-based detection if available
            confidence_threshold = config.get('confidenceThreshold', 0.5) if config else 0.5
            ocr_engine = config.get('ocrEngine', 'tesseract') if config else 'tesseract'

            if self.ml_detector and self.ml_detector.is_available():
                elements = self._detect_ml_elements(img, confidence_threshold)
            else:
                # Fallback to OpenCV contour detection
                elements = self._detect_ui_elements(img)

            # Extract text blocks with bounding boxes
            if self.text_mapper and self.ocr_available:
                # Get language preference from config
                ocr_languages = config.get('languages', ['en', 'ch_sim']) if config else ['en', 'ch_sim']

                text_blocks = self.text_mapper.extract_text_blocks(img, ocr_engine, ocr_languages)
                text_regions = [block.text for block in text_blocks]

                # Associate text with elements using improved mapper
                if text_blocks and elements:
                    associations = self.text_mapper.associate_text_to_elements(
                        text_blocks, elements, img
                    )
                    self.text_mapper.apply_associations_to_elements(elements, associations)

                    logger.debug(f"Associated {len(associations)} text blocks to elements")
                    logger.debug(f"OCR languages: {ocr_languages}")
                else:
                    # Fallback: simple text regions list
                    text_regions = self._extract_text_regions(img)
            else:
                # Fallback to simple OCR
                text_regions = self._extract_text_regions(img) if self.ocr_available else []

            # Classify layout regions
            layout = self._classify_layout(img)

            return {
                'success': True,
                'elements': elements,
                'text': text_regions,
                'text_blocks_count': len(text_regions),
                'layout': layout,
                'image_size': {'width': img.shape[1], 'height': img.shape[0]},
                'ml_detection_used': self.ml_detector and self.ml_detector.is_available(),
                'text_association_method': 'enhanced' if self.text_mapper else 'basic',
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f'Analyze screenshot error: {traceback.format_exc()}')
            return {'success': False, 'error': str(e)}

    def _detect_ml_elements(self, img: np.ndarray, confidence_threshold: float) -> List[Dict[str, Any]]:
        """Use ML-based element detection"""
        try:
            elements = self.ml_detector.detect_elements(img, confidence_threshold)

            # Convert UIElement objects to dict format
            result = []
            for elem in elements:
                result.append({
                    'id': elem.id,
                    'type': elem.type,
                    'boundingBox': elem.bounding_box,
                    'coordinates': {
                        'x': elem.bounding_box['x'] + elem.bounding_box['width'] // 2,
                        'y': elem.bounding_box['y'] + elem.bounding_box['height'] // 2
                    },
                    'confidence': elem.confidence,
                    'text': elem.text_content,
                    'element_class': elem.element_class
                })

            logger.debug(f"ML detection found {len(result)} elements")
            return result

        except Exception as e:
            logger.error(f"ML detection error: {e}")
            return []

    def _detect_ui_elements(self, img: np.ndarray) -> List[Dict[str, Any]]:
        """Detect UI elements like buttons, inputs, links (fallback method)"""
        elements = []

        try:
            # Convert to grayscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

            # Find contours (potential UI elements)
            edges = cv2.Canny(gray, 50, 150)
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            for i, contour in enumerate(contours[:50]):  # Limit to 50 elements
                x, y, w, h = cv2.boundingRect(contour)

                # Filter small elements
                if w < 20 or h < 10:
                    continue

                # Classify element type based on shape/aspect ratio
                aspect_ratio = w / max(h, 1)
                element_type = 'unknown'

                if 2 < aspect_ratio < 8 and 20 < h < 60:
                    element_type = 'button'
                elif aspect_ratio > 5 and h < 40:
                    element_type = 'input'
                elif aspect_ratio < 1.5 and w < 100:
                    element_type = 'icon'
                else:
                    element_type = 'container'

                elements.append({
                    'id': str(uuid.uuid4())[:8],
                    'type': element_type,
                    'boundingBox': {'x': int(x), 'y': int(y), 'width': int(w), 'height': int(h)},
                    'coordinates': {'x': int(x + w/2), 'y': int(y + h/2)},
                    'confidence': 0.7
                })
        except Exception as e:
            logger.error(f'Element detection error: {e}')

        return elements

    def _associate_text_with_elements(
        self,
        elements: List[Dict[str, Any]],
        text_regions: List[str],
        img: np.ndarray
    ) -> None:
        """Associate OCR text with detected elements based on spatial overlap"""
        if not self.ocr_available or not elements:
            return

        try:
            # Get text bounding boxes from Tesseract
            rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

            # Get text data with bounding boxes
            data = pytesseract.image_to_data(
                rgb,
                output_type=pytesseract.Output.DICT
            )

            # Process each text block
            for i in range(len(data['text'])):
                text = data['text'][i].strip()
                if not text or text == '':
                    continue

                # Get bounding box
                x, y, w, h = data['left'][i], data['top'][i], data['width'][i], data['height'][i]
                text_box = {'x': x, 'y': y, 'width': w, 'height': h}

                # Find best matching element
                best_match = None
                max_overlap = 0

                for element in elements:
                    overlap = self._calculate_iou(text_box, element['boundingBox'])
                    if overlap > max_overlap:
                        max_overlap = overlap
                        best_match = element

                # Associate text if overlap > threshold
                if best_match and max_overlap > 0.3:
                    best_match['text'] = text

            logger.debug(f"Associated text with {sum(1 for e in elements if 'text' in e)} elements")

        except Exception as e:
            logger.error(f"Text association error: {e}")

    def _calculate_iou(self, box1: Dict[str, int], box2: Dict[str, int]) -> float:
        """Calculate Intersection over Union for two bounding boxes"""
        # Intersection
        x_left = max(box1['x'], box2['x'])
        y_top = max(box1['y'], box2['y'])
        x_right = min(box1['x'] + box1['width'], box2['x'] + box2['width'])
        y_bottom = min(box1['y'] + box1['height'], box2['y'] + box2['height'])

        if x_right < x_left or y_bottom < y_top:
            return 0.0

        intersection_area = (x_right - x_left) * (y_bottom - y_top)

        # Union
        box1_area = box1['width'] * box1['height']
        box2_area = box2['width'] * box2['height']
        union_area = box1_area + box2_area - intersection_area

        return intersection_area / union_area if union_area > 0 else 0.0

    def _visualize_associations(self, img: np.ndarray, elements: List[Dict[str, Any]]) -> str:
        """Generate base64 image with text-element associations (for debugging)"""
        if not self.text_mapper or not self.ocr_available:
            return ''

        try:
            import pytesseract
            rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

            # Extract text blocks
            data = pytesseract.image_to_data(
                rgb,
                output_type=pytesseract.Output.DICT,
                config='--psm 6'
            )

            # Build text blocks
            text_blocks = []
            for i in range(len(data['text'])):
                text = data['text'][i].strip()
                if text and data['conf'][i] > 50:
                    text_blocks.append(type('TextBlock', (), {
                        'text': text,
                        'bounding_box': {
                            'x': data['left'][i],
                            'y': data['top'][i],
                            'width': data['width'][i],
                            'height': data['height'][i]
                        },
                        'confidence': data['conf'][i] / 100.0
                    }))

            # Reconstruct associations
            from owl.text_element_mapper import TextBlock, TextAssociation

            # Create simple TextBlock objects
            blocks = []
            for i, text_block in enumerate(text_blocks):
                block = TextBlock(
                    text=text_block.text,
                    bounding_box=text_block.bounding_box,
                    confidence=text_block.confidence,
                    line_number=i
                )
                blocks.append(block)

            # Build associations
            associations = self.text_mapper.associate_text_to_elements(blocks, elements, img)

            # Visualize
            vis_img = self.text_mapper.visualize_associations(
                img, blocks, elements, associations
            )

            # Return base64
            _, buffer = cv2.imencode('.png', vis_img)
            return base64.b64encode(buffer).decode()

        except Exception as e:
            logger.error(f'Visualization error: {e}')
            return ''

    def _extract_text_regions(self, img: np.ndarray) -> List[str]:
        """Extract text from image using OCR"""
        text_regions = []

        try:
            if pytesseract is None:
                return text_regions

            # Convert to RGB (pytesseract expects RGB)
            rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

            # Run OCR
            text = pytesseract.image_to_string(rgb)

            # Split into lines and filter empty
            lines = [line.strip() for line in text.split('\n') if line.strip()]
            text_regions = lines[:50]  # Limit to 50 lines

        except Exception as e:
            logger.error(f'OCR error: {e}')

        return text_regions

    def _classify_layout(self, img: np.ndarray) -> Dict[str, Any]:
        """Classify page regions"""
        # Try advanced layout analysis first
        if self.layout_analyzer:
            try:
                layout_result = self.layout_analyzer.classify_semantic_regions(img)

                # Convert to format expected by caller
                return {
                    'header': layout_result.get('header'),
                    'navigation': layout_result.get('navigation'),
                    'main': layout_result.get('main'),
                    'sidebar': layout_result.get('sidebar'),
                    'footer': layout_result.get('footer')
                }
            except Exception as e:
                logger.warning(f'Advanced layout analysis failed: {e}, falling back to basic')

        # Fallback to simple heuristic-based layout detection
        layout = {
            'header': None,
            'navigation': None,
            'main': None,
            'sidebar': None,
            'footer': None
        }

        try:
            h, w = img.shape[:2]

            # Simple heuristic-based layout detection
            # Header is typically top 10-15% of page
            layout['header'] = {'x': 0, 'y': 0, 'width': w, 'height': int(h * 0.12)}

            # Footer is typically bottom 10%
            layout['footer'] = {'x': 0, 'y': int(h * 0.9), 'width': w, 'height': int(h * 0.1)}

            # Main content is typically center
            layout['main'] = {'x': int(w * 0.15), 'y': int(h * 0.12), 'width': int(w * 0.7), 'height': int(h * 0.78)}

            # Sidebar detection (if there's content on the sides)
            layout['sidebar'] = {'x': 0, 'y': int(h * 0.12), 'width': int(w * 0.15), 'height': int(h * 0.78)}

        except Exception as e:
            logger.error(f'Layout classification error: {e}')

        return layout

    def advanced_layout_analysis(self, image: np.ndarray, elements: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Perform comprehensive layout analysis

        Returns:
            Complete layout analysis including grids, flex, tables, semantic regions
        """
        if not self.layout_analyzer:
            return {'success': False, 'error': 'Layout analyzer not available'}

        try:
            return {
                'success': True,
                'analysis': self.layout_analyzer.analyze_layout(image, elements)
            }
        except Exception as e:
            logger.error(f'Advanced layout analysis error: {e}')
            return {'success': False, 'error': str(e)}

    def extract_text(self, screenshot_base64: str) -> Dict[str, Any]:
        """Extract all text from screenshot"""
        try:
            if not vision_available or pytesseract is None:
                return {'success': False, 'error': 'OCR not available'}

            img_data = base64.b64decode(screenshot_base64)
            nparr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img is None:
                return {'success': False, 'error': 'Failed to decode image'}

            rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            text = pytesseract.image_to_string(rgb)

            return {
                'success': True,
                'text': text,
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f'Extract text error: {e}')
            return {'success': False, 'error': str(e)}

    def detect_elements(self, screenshot_base64: str, query: str = None, confidence_threshold: float = 0.5) -> Dict[str, Any]:
        """Detect interactive elements in screenshot"""
        try:
            if not vision_available:
                return {'success': False, 'error': 'OpenCV not available'}

            img_data = base64.b64decode(screenshot_base64)
            nparr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img is None:
                return {'success': False, 'error': 'Failed to decode image'}

            # Use ML-based detection if available
            if self.ml_detector and self.ml_detector.is_available():
                elements = self._detect_ml_elements(img, confidence_threshold)
            else:
                elements = self._detect_ui_elements(img)

            # Filter by query if provided
            if query:
                elements = self._filter_elements_by_query(elements, query)

            return {
                'success': True,
                'elements': elements,
                'count': len(elements),
                'ml_detection_used': self.ml_detector and self.ml_detector.is_available(),
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f'Detect elements error: {e}')
            return {'success': False, 'error': str(e)}

    def _filter_elements_by_query(self, elements: List[Dict[str, Any]], query: str) -> List[Dict[str, Any]]:
        """Filter elements by query text or type"""
        if not query:
            return elements

        query_lower = query.lower()
        filtered = []

        for element in elements:
            # Match by type
            if element.get('type', '').lower() == query_lower:
                filtered.append(element)
                continue

            # Match by text content
            if 'text' in element and element['text']:
                if query_lower in element['text'].lower():
                    filtered.append(element)
                    continue

        return filtered

    def classify_regions(self, screenshot_base64: str) -> Dict[str, Any]:
        """Classify page regions"""
        try:
            if not vision_available:
                return {'success': False, 'error': 'OpenCV not available'}

            img_data = base64.b64decode(screenshot_base64)
            nparr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img is None:
                return {'success': False, 'error': 'Failed to decode image'}

            layout = self._classify_layout(img)

            return {
                'success': True,
                'layout': layout,
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f'Classify regions error: {e}')
            return {'success': False, 'error': str(e)}


class PythonBridge:
    """Main bridge class for Node.js communication"""

    def __init__(self):
        self.is_running = True
        self.browser_manager = BrowserManager() if browser_use_available else None
        self.vision_service = VisionService() if vision_available else None
        self.layout_analyzer = layout_analyzer if vision_available else None

    def process_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Process incoming message and return response"""
        try:
            message_id = message.get('id', '')
            service_type = message.get('type', '')
            method = message.get('method', '')
            params = message.get('params', {})
            session_id = message.get('sessionId', 'default')

            logger.info(f'Processing: {message_id}, type: {service_type}, method: {method}')

            # Dispatch based on service type
            if service_type == 'browser_use':
                result = self.handle_browser_use(method, params, session_id)
            elif service_type == 'owl':
                result = self.handle_vision(method, params)
            elif method == 'shutdown':
                result = {'status': 'shutting_down'}
                self.is_running = False
            elif method == 'health':
                result = {
                    'status': 'healthy',
                    'browser_use_available': browser_use_available,
                    'vision_available': vision_available,
                    'ocr_available': pytesseract is not None
                }
            else:
                result = {
                    'success': False,
                    'error': f'Unknown service type or method: {service_type}.{method}'
                }

            return {
                'id': message_id,
                'success': result.get('success', True),
                'data': result,
                'sessionId': session_id
            }

        except Exception as e:
            logger.error(f'Error processing message: {traceback.format_exc()}')
            return {
                'id': message.get('id', ''),
                'success': False,
                'error': str(e)
            }

    def handle_browser_use(self, method: str, params: Dict[str, Any], session_id: str) -> Dict[str, Any]:
        """Handle browser-use related methods"""
        if not browser_use_available or not self.browser_manager:
            return {
                'success': False,
                'error': 'browser-use module not available. Install with: pip install browser-use'
            }

        config = params.get('config', {})

        # Map methods to browser-use functionality
        method_handlers = {
            'health': lambda: {
                'status': 'healthy',
                'browser_use_available': browser_use_available,
                'vision_available': vision_available,
                'ocr_available': pytesseract is not None,
                'session_id': session_id
            },
            'navigate': lambda: self.browser_manager._run_async(
                self.browser_manager.navigate(session_id, params.get('url', ''), config)
            ),
            'click': lambda: self.browser_manager._run_async(
                self.browser_manager.click(session_id, params.get('selector', ''), params.get('description', ''), config)
            ),
            'type': lambda: self.browser_manager._run_async(
                self.browser_manager.type_text(session_id, params.get('selector', ''), params.get('text', ''), config)
            ),
            'scroll': lambda: self.browser_manager._run_async(
                self.browser_manager.scroll(session_id, params.get('direction', 'down'), params.get('amount', 500), config)
            ),
            'extract': lambda: self.browser_manager._run_async(
                self.browser_manager.extract(session_id, params.get('selector', ''), config)
            ),
            'screenshot': lambda: self.browser_manager._run_async(
                self.browser_manager.screenshot(session_id, config)
            ),
            'get_dom_tree': lambda: self.browser_manager._run_async(
                self.browser_manager.get_dom_tree(session_id, config)
            ),
            'highlight_element': lambda: self.browser_manager._run_async(
                self.browser_manager.highlight_element(session_id, params.get('selector', ''), config)
            ),
            'run_agent': lambda: self.browser_manager._run_async(
                self.browser_manager.run_agent(session_id, params.get('task', ''), config)
            ),
            'close_session': lambda: self.browser_manager._run_async(
                self.browser_manager.close_session(session_id)
            )
        }

        handler = method_handlers.get(method)
        if not handler:
            return {'success': False, 'error': f'Unknown browser-use method: {method}'}

        return handler()

    def handle_vision(self, method: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle vision/Owl related methods"""
        if not vision_available or not self.vision_service:
            return {
                'success': False,
                'error': 'Vision module not available. Install with: pip install opencv-python pytesseract'
            }

        screenshot = params.get('screenshot', '')
        config = params.get('config', {})
        session_id = params.get('sessionId')

        # Map methods to vision functionality
        method_handlers = {
            'analyze_screenshot': lambda: self.vision_service.analyze_screenshot(screenshot, config),
            'extract_text': lambda: self.vision_service.extract_text(screenshot),
            'detect_elements': lambda: self.vision_service.detect_elements(
                screenshot,
                params.get('query'),
                config.get('confidenceThreshold', 0.5)
            ),
            'classify_regions': lambda: self.vision_service.classify_regions(screenshot),
            'analyze_layout': lambda: self._handle_analyze_layout(screenshot, params),
            'detect_grids': lambda: self._handle_detect_grids(screenshot),
            'detect_tables': lambda: self._handle_detect_tables(screenshot),
            'get_reading_order': lambda: self._handle_reading_order(screenshot),
            'take_screenshot_with_owl': lambda: self.take_screenshot_with_owl(session_id, config) if session_id else {'success': False, 'error': 'Session ID required'},
            'get_enhanced_elements': lambda: self.get_enhanced_elements(session_id, config) if session_id else {'success': False, 'error': 'Session ID required'},
            'visualize_associations': lambda: {
                'success': True,
                'visualization': self.vision_service._visualize_associations(
                    None,  # Will extract from screenshot
                    None,  # Will extract elements
                    {}  # Will detect elements
                )
            } if hasattr(self.vision_service, '_visualize_associations') else {
                'success': False,
                'error': 'Visualization not available'
            }
        }

        handler = method_handlers.get(method)
        if not handler:
            return {'success': False, 'error': f'Unknown vision method: {method}'}

        return handler()

    def _handle_analyze_layout(self, screenshot_base64: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle advanced layout analysis"""
        try:
            img_data = base64.b64decode(screenshot_base64)
            nparr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img is None:
                return {'success': False, 'error': 'Failed to decode image'}

            # Get elements for refined layout
            confidence = params.get('config', {}).get('confidenceThreshold', 0.5)
            elements = []

            if self.ml_detector and self.ml_detector.is_available():
                from owl.ui_element_detector import UIElementDetector
                elements = self.ml_detector.detect_elements(img, confidence)
                # Convert to dict format
                elements = [
                    {
                        'id': e.id,
                        'type': e.type,
                        'boundingBox': e.bounding_box,
                        'coordinates': {
                            'x': e.bounding_box['x'] + e.bounding_box['width'] // 2,
                            'y': e.bounding_box['y'] + e.bounding_box['height'] // 2
                        },
                        'confidence': e.confidence
                    }
                    for e in elements
                ]

            return self.vision_service.advanced_layout_analysis(img, elements)

        except Exception as e:
            logger.error(f'Advanced layout analysis error: {e}')
            return {'success': False, 'error': str(e)}

    def _handle_detect_grids(self, screenshot_base64: str) -> Dict[str, Any]:
        """Handle grid detection"""
        try:
            img_data = base64.b64decode(screenshot_base64)
            nparr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img is None or not self.layout_analyzer:
                return {'success': False, 'error': 'Failed to decode or analyzer not available'}

            grids = self.layout_analyzer.detect_grids(img)

            return {
                'success': True,
                'grids': grids,
                'grid_count': len(grids),
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f'Grid detection error: {e}')
            return {'success': False, 'error': str(e)}

    def _handle_detect_tables(self, screenshot_base64: str) -> Dict[str, Any]:
        """Handle table detection"""
        try:
            img_data = base64.b64decode(screenshot_base64)
            nparr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img is None or not self.layout_analyzer:
                return {'success': False, 'error': 'Failed to decode or analyzer not available'}

            tables = self.layout_analyzer.detect_tables(img)

            return {
                'success': True,
                'tables': tables,
                'table_count': len(tables),
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f'Table detection error: {e}')
            return {'success': False, 'error': str(e)}

    def _handle_reading_order(self, screenshot_base64: str) -> Dict[str, Any]:
        """Handle reading order detection"""
        try:
            img_data = base64.b64decode(screenshot_base64)
            nparr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img is None or not self.layout_analyzer:
                return {'success': False, 'error': 'Failed to decode or analyzer not available'}

            # Get elements for reading order
            confidence = 0.5
            elements = []

            if self.ml_detector and self.ml_detector.is_available():
                elements = self.ml_detector.detect_elements(img, confidence)
                # Convert to dict format
                elements = [
                    {
                        'id': e.id,
                        'type': e.type,
                        'boundingBox': e.bounding_box,
                        'coordinates': {
                            'x': e.bounding_box['x'] + e.bounding_box['width'] // 2,
                            'y': e.bounding_box['y'] + e.bounding_box['height'] // 2
                        },
                        'confidence': e.confidence
                    }
                    for e in elements
                ]

            reading_order = self.layout_analyzer.detect_reading_order(img, elements)

            return {
                'success': True,
                'reading_order': reading_order,
                'element_count': len(reading_order),
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f'Reading order detection error: {e}')
            return {'success': False, 'error': str(e)}


def main():
    """Main entry point for Python bridge"""
    bridge = PythonBridge()

    logger.info('Python bridge started')
    logger.info(f'  browser-use available: {browser_use_available}')
    logger.info(f'  vision available: {vision_available}')
    logger.info(f'  OCR available: {pytesseract is not None}')
    logger.info('Waiting for messages on stdin...')

    try:
        for line in sys.stdin:
            if not bridge.is_running:
                break

            line = line.strip()
            if not line:
                continue

            try:
                message = json.loads(line)
                response = bridge.process_message(message)
                sys.stdout.write(json.dumps(response) + '\n')
                sys.stdout.flush()

            except json.JSONDecodeError as e:
                logger.error(f'Invalid JSON: {e}')
                response = {
                    'id': '',
                    'success': False,
                    'error': f'Invalid JSON: {e}'
                }
                sys.stdout.write(json.dumps(response) + '\n')
                sys.stdout.flush()

            except Exception as e:
                logger.error(f'Unexpected error: {traceback.format_exc()}')

    except KeyboardInterrupt:
        logger.info('Python bridge interrupted')
    except Exception as e:
        logger.error(f'Fatal error: {traceback.format_exc()}')
    finally:
        # Cleanup browser sessions
        if bridge.browser_manager:
            for session_id in list(bridge.browser_manager.browsers.keys()):
                try:
                    bridge.browser_manager._run_async(
                        bridge.browser_manager.close_session(session_id)
                    )
                except:
                    pass
        logger.info('Python bridge shutting down')


if __name__ == '__main__':
    main()
