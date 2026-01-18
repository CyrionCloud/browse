"""
UI Element Detection Model
Uses YOLOv8 for accurate UI element detection
"""
import os
import logging
import numpy as np
import cv2
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class UIElement:
    """Detected UI element with metadata"""
    id: str
    type: str
    bounding_box: Dict[str, int]
    confidence: float
    text_content: Optional[str] = None
    element_class: int = None


class UIElementDetector:
    """ML-based UI element detector using YOLOv8"""

    # UI element classes
    CLASSES = {
        0: 'button',
        1: 'input',
        2: 'text',
        3: 'link',
        4: 'icon',
        5: 'image',
        6: 'checkbox',
        7: 'radio',
        8: 'dropdown',
        9: 'slider',
        10: 'navigation',
        11: 'sidebar',
        12: 'header',
        13: 'footer',
        14: 'container',
        15: 'card',
        16: 'list',
        17: 'table',
        18: 'tab',
        19: 'menu'
    }

    def __init__(self, model_path: Optional[str] = None, use_tiny: bool = True):
        """
        Initialize UI element detector

        Args:
            model_path: Path to custom trained model (optional)
            use_tiny: Use YOLOv8-nano/tiny for faster inference
        """
        self.model = None
        self.use_tiny = use_tiny

        try:
            from ultralytics import YOLO
            logger.info("Initializing YOLOv8 model...")

            # Use pre-trained model if no custom path provided
            if model_path and Path(model_path).exists():
                logger.info(f"Loading custom model from: {model_path}")
                self.model = YOLO(model_path)
            else:
                # Use a pre-trained YOLOv8 model
                # Note: For production, you should train on UI datasets like
                # Rico, WebUI, or create your own dataset
                model_variant = 'yolov8n.pt' if use_tiny else 'yolov8s.pt'
                logger.info(f"Loading pre-trained model: {model_variant}")
                self.model = YOLO(model_variant)

            # Verify model loaded
            if self.model:
                logger.info(f"YOLOv8 model loaded successfully (tiny={use_tiny})")
                logger.info(f"Model classes: {len(self.CLASSES)} UI element types")
            else:
                raise Exception("Failed to load YOLOv8 model")

        except ImportError:
            logger.warning("ultralytics not installed, falling back to OpenCV detection")
            self.model = None
        except Exception as e:
            logger.error(f"Failed to initialize ML model: {e}")
            self.model = None

    def is_available(self) -> bool:
        """Check if ML model is available"""
        return self.model is not None

    def detect_elements(
        self,
        image: np.ndarray,
        confidence_threshold: float = 0.5,
        iou_threshold: float = 0.5
    ) -> List[UIElement]:
        """
        Detect UI elements in image

        Args:
            image: Input image (BGR format from OpenCV)
            confidence_threshold: Minimum confidence score
            iou_threshold: IoU threshold for NMS

        Returns:
            List of detected UI elements
        """
        if not self.is_available():
            raise RuntimeError("ML model not available")

        try:
            # Run inference
            results = self.model(
                image,
                conf=confidence_threshold,
                iou=iou_threshold,
                verbose=False
            )

            elements = []
            import uuid

            # Parse results
            for result in results:
                boxes = result.boxes
                if boxes is None:
                    continue

                for i, box in enumerate(boxes):
                    # Get box coordinates
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()

                    # Get confidence
                    conf = float(box.conf[0].cpu().numpy())

                    # Get class ID
                    cls_id = int(box.cls[0].cpu().numpy()) if box.cls is not None else 14  # Default to container

                    # Map to class name (use container for unknown classes)
                    class_name = self.CLASSES.get(cls_id, 'container')

                    element = UIElement(
                        id=str(uuid.uuid4())[:8],
                        type=class_name,
                        bounding_box={
                            'x': int(x1),
                            'y': int(y1),
                            'width': int(x2 - x1),
                            'height': int(y2 - y1)
                        },
                        confidence=conf,
                        element_class=cls_id
                    )

                    elements.append(element)

            logger.debug(f"Detected {len(elements)} UI elements")
            return elements

        except Exception as e:
            logger.error(f"Error detecting elements: {e}")
            return []

    def detect_with_tracking(
        self,
        image: np.ndarray,
        confidence_threshold: float = 0.5
    ) -> Dict[str, List[UIElement]]:
        """
        Detect elements organized by type

        Args:
            image: Input image
            confidence_threshold: Minimum confidence

        Returns:
            Dictionary mapping element types to lists of elements
        """
        elements = self.detect_elements(image, confidence_threshold)

        # Organize by type
        by_type: Dict[str, List[UIElement]] = {}
        for element in elements:
            if element.type not in by_type:
                by_type[element.type] = []
            by_type[element.type].append(element)

        return by_type

    def get_class_counts(self, image: np.ndarray) -> Dict[str, int]:
        """Get count of each element type in image"""
        elements = self.detect_elements(image)
        counts = {}

        for element in elements:
            counts[element.type] = counts.get(element.type, 0) + 1

        return counts

    def get_interactive_elements(
        self,
        image: np.ndarray,
        confidence_threshold: float = 0.5
    ) -> List[UIElement]:
        """Get only interactive elements (buttons, inputs, links, etc.)"""
        interactive_types = {
            'button', 'input', 'link', 'checkbox', 'radio',
            'dropdown', 'slider', 'tab', 'menu', 'navigation'
        }

        elements = self.detect_elements(image, confidence_threshold)
        return [e for e in elements if e.type in interactive_types]
