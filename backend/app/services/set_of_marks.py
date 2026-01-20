"""
Set-of-Marks (SoM) Visual Element Selection

Overlays numbered marks on screenshots for LLM-based visual element selection.
The LLM sees the annotated image and can select elements by their mark number.

Inspired by: https://github.com/microsoft/SoM
"""

import numpy as np
import cv2
import base64
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class MarkedElement:
    """An element with a visual mark for selection."""
    mark_id: int
    element_type: str
    bounding_box: Dict[str, int]
    center: Tuple[int, int]
    text: Optional[str] = None
    confidence: float = 1.0


class SetOfMarks:
    """
    Creates visual overlays on screenshots with numbered marks.
    
    This enables true visual element selection - the LLM sees numbers
    overlaid on elements and can select by saying "click mark 5".
    """
    
    # Color palette for marks (BGR format)
    COLORS = [
        (66, 133, 244),   # Blue
        (234, 67, 53),    # Red
        (251, 188, 4),    # Yellow
        (52, 168, 83),    # Green
        (255, 109, 0),    # Orange
        (156, 39, 176),   # Purple
        (0, 188, 212),    # Cyan
        (255, 87, 34),    # Deep Orange
    ]
    
    def __init__(
        self,
        mark_size: int = 24,
        font_scale: float = 0.6,
        line_thickness: int = 2
    ):
        """
        Initialize Set-of-Marks renderer.
        
        Args:
            mark_size: Size of the mark circles
            font_scale: Font scale for mark numbers
            line_thickness: Thickness of bounding box lines
        """
        self.mark_size = mark_size
        self.font_scale = font_scale
        self.line_thickness = line_thickness
    
    def create_marked_image(
        self,
        image: np.ndarray,
        elements: List[Dict[str, Any]],
        show_boxes: bool = True,
        show_labels: bool = True
    ) -> Tuple[np.ndarray, List[MarkedElement]]:
        """
        Create an image with numbered marks overlaid on elements.
        
        Args:
            image: Original screenshot (BGR format)
            elements: List of detected UI elements with bounding_box
            show_boxes: Draw bounding boxes around elements
            show_labels: Show element type labels
            
        Returns:
            Tuple of (annotated_image, list of MarkedElement)
        """
        if image is None or len(elements) == 0:
            return image, []
        
        # Create a copy to annotate
        annotated = image.copy()
        marked_elements = []
        
        for i, element in enumerate(elements):
            mark_id = i + 1  # 1-indexed for human readability
            
            # Get bounding box
            bbox = element.get('bounding_box', element.get('bbox', {}))
            if not bbox:
                continue
            
            x = bbox.get('x', bbox.get('x1', 0))
            y = bbox.get('y', bbox.get('y1', 0))
            w = bbox.get('width', bbox.get('w', 100))
            h = bbox.get('height', bbox.get('h', 30))
            
            # Calculate center
            center_x = x + w // 2
            center_y = y + h // 2
            
            # Get color for this mark
            color = self.COLORS[mark_id % len(self.COLORS)]
            
            # Draw bounding box
            if show_boxes:
                cv2.rectangle(
                    annotated,
                    (x, y),
                    (x + w, y + h),
                    color,
                    self.line_thickness
                )
            
            # Draw mark circle at top-left corner
            mark_x = x + self.mark_size // 2
            mark_y = y - self.mark_size // 2 if y > self.mark_size else y + self.mark_size // 2
            
            # Filled circle background
            cv2.circle(annotated, (mark_x, mark_y), self.mark_size // 2, color, -1)
            
            # White border
            cv2.circle(annotated, (mark_x, mark_y), self.mark_size // 2, (255, 255, 255), 2)
            
            # Number text
            text = str(mark_id)
            text_size = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, self.font_scale, 2)[0]
            text_x = mark_x - text_size[0] // 2
            text_y = mark_y + text_size[1] // 2
            cv2.putText(
                annotated, text,
                (text_x, text_y),
                cv2.FONT_HERSHEY_SIMPLEX,
                self.font_scale,
                (255, 255, 255),
                2
            )
            
            # Draw element type label
            if show_labels:
                element_type = element.get('type', element.get('element_type', 'element'))
                label = f"{element_type}"
                label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.4, 1)[0]
                
                # Background for label
                cv2.rectangle(
                    annotated,
                    (x, y + h),
                    (x + label_size[0] + 4, y + h + label_size[1] + 4),
                    color,
                    -1
                )
                cv2.putText(
                    annotated, label,
                    (x + 2, y + h + label_size[1] + 2),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.4,
                    (255, 255, 255),
                    1
                )
            
            # Create marked element record
            marked_elements.append(MarkedElement(
                mark_id=mark_id,
                element_type=element.get('type', 'element'),
                bounding_box={'x': x, 'y': y, 'width': w, 'height': h},
                center=(center_x, center_y),
                text=element.get('text', element.get('text_content')),
                confidence=element.get('confidence', 1.0)
            ))
        
        logger.info(f"Created Set-of-Marks with {len(marked_elements)} marked elements")
        return annotated, marked_elements
    
    def get_element_by_mark(
        self,
        mark_id: int,
        marked_elements: List[MarkedElement]
    ) -> Optional[MarkedElement]:
        """Get element by its mark ID."""
        for element in marked_elements:
            if element.mark_id == mark_id:
                return element
        return None
    
    def get_click_coordinates(
        self,
        mark_id: int,
        marked_elements: List[MarkedElement]
    ) -> Optional[Tuple[int, int]]:
        """Get click coordinates for a mark ID."""
        element = self.get_element_by_mark(mark_id, marked_elements)
        if element:
            return element.center
        return None
    
    def image_to_base64(self, image: np.ndarray, format: str = 'jpeg') -> str:
        """Convert image to base64 string for sending to LLM."""
        if format == 'jpeg':
            _, buffer = cv2.imencode('.jpg', image, [cv2.IMWRITE_JPEG_QUALITY, 85])
        else:
            _, buffer = cv2.imencode('.png', image)
        return base64.b64encode(buffer).decode('utf-8')
    
    def generate_marks_description(self, marked_elements: List[MarkedElement]) -> str:
        """Generate text description of all marks for LLM context."""
        lines = ["Available elements (select by mark number):"]
        for elem in marked_elements:
            text_info = f' "{elem.text[:50]}..."' if elem.text and len(elem.text) > 0 else ""
            lines.append(f"  [{elem.mark_id}] {elem.element_type}{text_info}")
        return "\n".join(lines)


# Global instance
som = SetOfMarks()
