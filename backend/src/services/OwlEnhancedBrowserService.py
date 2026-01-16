"""
Owl-Enhanced Browser Service
Combines Owl vision with browser automation for intelligent task execution
Provides vision feedback loop where Owl analyzes screenshots and improves element targeting
"""
import logging
import asyncio
from typing import Dict, Any, Optional, List
from pathlib import Path

logger = logging.getLogger(__name__)


class OwlEnhancedBrowserService:
    """
    Service that integrates Owl vision analysis with browser automation
    Provides feedback loop: Screenshot → Owl → Better Targeting → Automation
    """

    def __init__(self, bridge_path: str = None):
        """
        Initialize the enhanced browser service

        Args:
            bridge_path: Path to the Python bridge script
        """
        self.bridge_path = bridge_path or str(Path(__file__).parent / 'integrations/bridge.py')

        # Owl analysis results cache
        self.session_analysis_cache: Dict[str, Dict[str, Any]] = {}

        # Element mapping (DOM selector → Owl element)
        self.element_map: Dict[str, Dict[str, Any]] = {}

    async def create_session_with_vision(
        self,
        session_id: str,
        url: str,
        task_description: str,
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a browser session with Owl vision capabilities

        Returns session info with vision-enhanced element data
        """
        logger.info(f"Creating session {session_id} with Owl vision enabled")

        result = await self._call_bridge('create_session', {
            'session_id': session_id,
            'task_description': task_description,
            'enable_vision': True,
            'config': config or {}
        })

        if result.get('success'):
            # Cache session analysis
            self.session_analysis_cache[session_id] = {
                'created_at': result.get('timestamp'),
                'config': config,
                'elements': result.get('dom_elements', [])
            }

            # Enhance with Owl element mapping
            element_map = self._build_enhanced_element_map(
                result.get('dom_elements', [])
            )

            logger.info(f"Session {session_id} created with {len(element_map)} mapped elements")

            return {
                'success': True,
                'session_id': session_id,
                'owl_vision_enabled': True,
                'element_map': element_map
                'session_info': result
            }
        else:
            logger.error(f"Failed to create session {session_id}: {result.get('error')}")
            return {
                'success': False,
                'error': result.get('error')
            }

    async def analyze_and_enhance_elements(
        self,
        session_id: str,
        screenshot: str
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze screenshot with Owl and enhance element detection

        This is the core vision feedback loop:
        1. Take screenshot via browser
        2. Send to Owl for analysis
        3. Get Owl results (elements, text, layout)
        4. Map Owl elements to DOM elements
        5. Return enhanced element map for better targeting

        Args:
            session_id: Browser session ID
            screenshot: Base64 encoded screenshot
            config: Configuration for Owl (engine, languages, confidence)

        Returns:
            Enhanced element analysis with Owl-to-DOM mapping
        """
        logger.info(f"Analyzing screenshot for session {session_id}")

        # 1. Get Owl analysis
        owl_result = await self._call_bridge('analyze_screenshot', {
            'session_id': session_id,
            'screenshot': screenshot,
            'config': config or {}
        })

        if not owl_result.get('success'):
            return owl_result

        # 2. Parse Owl results
        owl_elements = owl_result.get('elements', [])
        owl_layout = owl_result.get('layout', {})
        owl_text = owl_result.get('text', [])

        # 3. Get current DOM elements
        dom_result = await self._call_bridge('get_dom_tree', {
            'session_id': session_id
        })

        if not dom_result.get('success'):
            return dom_result

        dom_elements = self._parse_dom_elements(dom_result.get('dom_data', []))

        # 4. Map Owl elements to DOM elements
        element_map, unmatched_owl_elements = self._map_owl_to_dom_elements(
            owl_elements,
            dom_elements
        )

        # 5. Build enhanced result
        result = {
            'success': True,
            'session_id': session_id,
            'owl_analysis': owl_result.get('analysis', {}),
            'element_map': element_map,
            'statistics': {
                'total_owl_elements': len(owl_elements),
                'total_dom_elements': len(dom_elements),
                'matched_elements': len(element_map),
                'unmatched_owl_elements': len(unmatched_owl_elements),
                'owl_confidence_avg': self._calculate_avg_confidence(owl_elements)
            },
            'timestamp': owl_result.get('timestamp')
        }

        logger.info(
            f"Session {session_id} enhanced: "
            f"{len(element_map)} matched elements, "
            f"{len(unmatched_owl_elements)} unmatched Owl elements"
        )

        return result

    async def get_enhanced_element_map(
        self,
        session_id: str,
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Get the enhanced element map for a session

        Returns cached element map or performs fresh analysis if needed
        """
        if session_id in self.session_analysis_cache:
            logger.info(f"Returning cached element map for session {session_id}")
            return {
                'success': True,
                'element_map': self.session_analysis_cache[session_id]['elements'],
                'owl_vision_enabled': True
            }

        logger.info(f"Building fresh element map for session {session_id}")

        # Get latest screenshot and analysis
        # In production, this would be fetched from session storage or database
        # For now, return empty map with instruction to call analyze_and_enhance
        return {
            'success': True,
            'element_map': {},
            'owl_vision_enabled': True,
            'message': 'Call analyze_and_enhance to build element map'
        }

    async def execute_action_with_vision_feedback(
        self,
        session_id: str,
        action_type: str,
        target: Optional[str] = None,
        value: Optional[str] = None,
        fallback_vision: bool = True
    ) -> Dict[str, Any]:
        """
        Execute browser action with Owl vision fallback

        If CSS selector fails, uses Owl-detected elements

        Args:
            session_id: Session ID
            action_type: Action type (click, type, navigate, etc.)
            target: CSS selector or description
            value: Value to type (for 'type' action)
            fallback_vision: Enable Owl fallback for failed selectors

        Returns:
            Action result with enhanced element targeting
        """
        logger.info(
            f"Executing action {action_type} with "
            f"target={target or 'N/A'}, vision_fallback={fallback_vision}"
        )

        # 1. Try normal action first
        normal_result = await self._call_bridge('execute_action', {
            'session_id': session_id,
            'action_type': action_type,
            'target': target,
            'value': value
        })

        if normal_result.get('success'):
            return normal_result

        if not fallback_vision:
            return normal_result

        # 2. Vision fallback: Analyze and find better target
        logger.warning(f"Normal action failed, attempting Owl vision fallback")

        # Get Owl element map
        element_map_result = await self.get_enhanced_element_map(session_id)

        if not element_map_result.get('success'):
            return element_map_result

        element_map = element_map_result.get('element_map', {})

        # 3. Find matching Owl element
        best_match = self._find_best_owl_match(
            action_type,
            target,
            value,
            element_map
        )

        if best_match:
            logger.info(f"Found Owl element match: {best_match.get('id')}")
            # Retry action with Owl element selector
            retry_result = await self._call_bridge('execute_action', {
                'session_id': session_id,
                'action_type': action_type,
                'target': best_match.get('selector'),
                'value': value
            })

            if retry_result.get('success'):
                return {
                    'success': True,
                    'action': retry_result.get('action'),
                    'used_owl_fallback': True,
                    'owl_element': best_match
                }
            else:
                return {
                    'success': False,
                    'error': retry_result.get('error')
                }
        else:
            return {
                'success': False,
                'error': f"No matching Owl element found for action: {action_type}"
            }

    def _call_bridge(self, method: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Helper to call the Python bridge asynchronously

        Note: This is a placeholder. In production, would use subprocess or HTTP.
        """
        logger.debug(f"Calling bridge method: {method}")

        # For now, return mock results
        # In production, would use asyncio.subprocess or aiohttp

        if method == 'analyze_screenshot':
            return {
                'success': True,
                'elements': [],  # Would contain Owl-detected elements
                'text': [],
                'layout': {
                    'layout_type': 'flex',
                    'semantic_regions': {}
                },
                'timestamp': '2026-01-15T00:00:00'
            }

        elif method == 'get_dom_tree':
            return {
                'success': True,
                'dom_data': [],  # Would contain DOM elements
                'timestamp': '2026-01-15T00:00:00'
            }

        elif method == 'execute_action':
            # Mock successful action for testing
            return {
                'success': True,
                'action': action_type,
                'target': target,
                'value': value,
                'result': 'Action completed'
            }

        return {
            'success': False,
            'error': f'Method {method} not implemented'
        }

    def _parse_dom_elements(self, dom_data: Any) -> List[Dict[str, Any]]:
        """
        Parse DOM elements from bridge response

        Converts bridge format to standard element structure
        """
        elements = []

        # Handle different DOM data formats
        if isinstance(dom_data, list):
            for item in dom_data:
                if isinstance(item, dict):
                    element = {
                        'id': item.get('id', ''),
                        'tag': item.get('tag', ''),
                        'selector': item.get('selector', ''),
                        'text': item.get('text', ''),
                        'type': item.get('type', 'text'),
                        'confidence': 1.0
                    }
                    elements.append(element)

        return elements

    def _map_owl_to_dom_elements(
        self,
        owl_elements: List[Dict[str, Any]],
        dom_elements: List[Dict[str, Any]]
    ) -> tuple[Dict[str, Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Map Owl-detected elements to DOM elements based on spatial overlap

        Creates a bidirectional mapping for vision-enhanced automation
        """
        element_map = {}
        unmatched_owl_elements = []

        # Find spatial matches
        for owl_elem in owl_elements:
            owl_box = owl_elem.get('bounding_box', {})
            best_match = None
            best_overlap = 0

            for dom_elem in dom_elements:
                dom_box = dom_elem.get('bounding_box', {})

                # Calculate overlap
                overlap = self._calculate_overlap_ratio(owl_box, dom_box)

                if overlap > best_overlap and overlap > 0.3:
                    best_overlap = overlap
                    best_match = {
                        'dom_element': dom_elem,
                        'owl_element': owl_elem,
                        'overlap': overlap,
                        'confidence': (owl_elem.get('confidence', 0.7) + dom_elem.get('confidence', 1.0)) / 2
                    }

            if best_match:
                element_map[dom_elem.get('id')] = best_match

            if not best_match:
                unmatched_owl_elements.append(owl_elem)

        return element_map, unmatched_owl_elements

    def _find_best_owl_match(
        self,
        action_type: str,
        target: Optional[str],
        value: Optional[str],
        element_map: Dict[str, Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """
        Find the best matching Owl element for an action

        Strategy:
        1. For click: Find button/link with matching text
        2. For type: Find input with matching text
        3. For navigate: No direct match, return most relevant element
        """
        if not element_map:
            return None

        # Get action context
        action_keywords = {
            'click': ['button', 'link', 'submit', 'confirm', 'close'],
            'type': ['input', 'text area', 'select', 'textarea'],
            'navigate': ['url', 'link', 'button', 'menu', 'nav']
        }

        keywords = action_keywords.get(action_type, [])
        if not keywords:
            return None

        # Search for matching elements
        candidates = []

        for elem_id, mapping in element_map.items():
            owl_elem = mapping.get('owl_element', {})
            dom_elem = mapping.get('dom_element', {})

            if not owl_elem or not dom_elem:
                continue

            # Check if element type matches action
            if owl_elem.get('type') in keywords:
                # Check text content
                owl_text = owl_elem.get('text', '').lower()
                dom_text = dom_elem.get('text', '').lower()

                # Check for keyword match in text
                for keyword in keywords:
                    if keyword in owl_text or keyword in dom_text:
                        candidates.append((owl_elem, owl_elem.get('confidence', 0)))

            # Special: For type actions, look for input-like elements
            if action_type == 'type' and value:
                input_candidates = [
                    elem for elem, conf in candidates
                    if elem.get('type') in ['input', 'text', 'textarea']
                ]
                candidates.extend(input_candidates)

        if not candidates:
            return None

        # Sort by confidence and return best match
        candidates.sort(key=lambda x: x[1], reverse=True)

        if candidates:
            return candidates[0] 0]  # Return (owl_element, confidence)

        return None

    def _calculate_overlap_ratio(
        self,
        box1: Dict[str, int],
        box2: Dict[str, int]
    ) -> float:
        """Calculate Intersection over Union ratio between two bounding boxes"""
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
        return sum(confidences) / len(confidences)

    def get_session_status(self, session_id: str) -> Dict[str, Any]:
        """Get current session status and analysis"""
        return {
            'success': True,
            'session_id': session_id,
            'owl_vision_enabled': session_id in self.session_analysis_cache,
            'has_element_map': session_id in self.session_analysis_cache and 'elements' in self.session_analysis_cache[session_id],
            'statistics': self.session_analysis_cache.get(session_id, {}).get('statistics', {}) if session_id in self.session_analysis_cache else None
        }


# Convenience function for standalone usage
async def create_enhanced_session(
    task: str,
    config: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Convenience function to create session with Owl vision"""
    import uuid

    session_id = uuid.uuid4()[:8]

    return await OwlEnhancedBrowserService().create_session_with_vision(
        session_id=session_id,
        url='about:blank',
        task_description=task,
        config=config
    )


if __name__ == '__main__':
    print("Owl-Enhanced Browser Service - Vision Feedback Loop Implementation")
    print("This service provides:")
    print("1. Owl vision analysis integration")
    print("2. Element mapping between Owl and DOM")
    print("3. Vision fallback for failed selectors")
    print("4. Enhanced element targeting")
    print("\nUsage:")
    print("from owl_enhanced_browser_service import OwlEnhancedBrowserService")
    print("")
    print("service = OwlEnhancedBrowserService()")
    print("result = await service.create_session_with_vision(...)")
    print("")
    print("result = await service.analyze_and_enhance_elements(...)")
    print("result = await service.execute_action_with_vision_feedback(...)")
