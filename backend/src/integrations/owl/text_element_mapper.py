"""
Enhanced Text-to-Element Mapping
Improves association between OCR text and detected UI elements
Supports multiple OCR engines: Tesseract, EasyOCR, PaddleOCR
"""
import numpy as np
import cv2
import logging
from typing import List, Dict, Any, Optional, Tuple, Set
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class OCREngine(Enum):
    """Available OCR engines"""
    TESSERACT = 'tesseract'
    EASYOCR = 'easyocr'
    PADDLEOCR = 'paddleocr'


@dataclass
class TextBlock:
    """OCR text block with bounding box"""
    text: str
    bounding_box: Dict[str, int]
    confidence: float
    line_number: int
    language: Optional[str] = None


@dataclass
class TextAssociation:
    """Association between text and element"""
    element_id: str
    text: str
    confidence: float  # Association confidence
    overlap_area: int  # Pixel overlap area


class TextElementMapper:
    """Maps OCR text to UI elements using spatial and semantic matching"""

    def __init__(self, min_overlap_ratio: float = 0.3):
        """
        Initialize text-to-element mapper

        Args:
            min_overlap_ratio: Minimum overlap ratio for valid association
        """
        self.min_overlap_ratio = min_overlap_ratio

    def extract_text_blocks(
        self,
        image: np.ndarray,
        ocr_engine: str = 'tesseract',
        languages: List[str] = None
    ) -> List[TextBlock]:
        """
        Extract text blocks with bounding boxes from image

        Args:
            image: Input image (BGR format)
            ocr_engine: OCR engine to use ('tesseract', 'easyocr', 'paddleocr')
            languages: List of language codes (optional)

        Returns:
            List of text blocks
        """
        try:
            if ocr_engine == OCREngine.TESSERACT.value:
                return self._extract_with_tesseract(image, languages)
            elif ocr_engine == OCREngine.EASYOCR.value:
                return self._extract_with_easyocr(image, languages)
            elif ocr_engine == OCREngine.PADDLEOCR.value:
                return self._extract_with_paddleocr(image, languages)
            else:
                logger.error(f"Unknown OCR engine: {ocr_engine}")
                return []
        except Exception as e:
            logger.error(f"Text extraction error: {e}")
            return []

    def _extract_with_tesseract(self, image: np.ndarray, languages: List[str] = None) -> List[TextBlock]:
        """Extract text using Tesseract with bounding boxes"""
        try:
            import pytesseract

            # Convert to RGB
            rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

            # Build language string
            lang_str = '+'.join(languages) if languages else 'eng+chi_sim'  # Default: English + Simplified Chinese

            # Build PSM config
            # PSM modes:
            # 6 = Assume a single uniform block of text
            # 11 = Sparse text. Find as much text as possible in no particular order
            psm_config = '--psm 6'

            # Get text data with bounding boxes
            data = pytesseract.image_to_data(
                rgb,
                lang=lang_str,
                output_type=pytesseract.Output.DICT,
                config=psm_config
            )

            blocks = []
            for i in range(len(data['text'])):
                text = data['text'][i].strip()

                # Skip empty text and very short strings
                if not text or len(text) < 2:
                    continue

                # Get confidence
                conf = float(data['conf'][i]) if data['conf'][i] != -1 else 0.0

                # Skip low confidence
                if conf < 50:
                    continue

                # Get bounding box
                x, y, w, h = data['left'][i], data['top'][i], data['width'][i], data['height'][i]

                block = TextBlock(
                    text=text,
                    bounding_box={'x': x, 'y': y, 'width': w, 'height': h},
                    confidence=conf / 100.0,
                    line_number=data['line_num'][i],
                    language=lang_str
                )
                blocks.append(block)

            logger.debug(f"Tesseract extracted {len(blocks)} text blocks (lang: {lang_str})")
            return blocks

        except ImportError:
            logger.warning("pytesseract not available")
            return []
        except Exception as e:
            logger.error(f"Tesseract extraction error: {e}")
            return []

    def _extract_with_easyocr(self, image: np.ndarray, languages: List[str] = None) -> List[TextBlock]:
        """Extract text using EasyOCR (if available)"""
        try:
            import easyocr

            # Default languages: English and Simplified Chinese
            langs = languages if languages else ['en', 'ch_sim']

            reader = easyocr.Reader(langs, gpu=False)
            results = reader.readtext(image, paragraph=False)

            blocks = []
            for i, (bbox, text, conf) in enumerate(results):
                if not text or len(text.strip()) < 2:
                    continue

                # Convert bbox format from EasyOCR (4 points) to bounding box
                x_coords = [p[0] for p in bbox]
                y_coords = [p[1] for p in bbox]

                x_min, x_max = int(min(x_coords)), int(max(x_coords))
                y_min, y_max = int(min(y_coords)), int(max(y_coords))

                # Detect language (simple heuristic)
                detected_lang = self._detect_language_simple(text)

                block = TextBlock(
                    text=text.strip(),
                    bounding_box={'x': x_min, 'y': y_min, 'width': x_max - x_min, 'height': y_max - y_min},
                    confidence=conf,
                    line_number=i,
                    language=detected_lang
                )
                blocks.append(block)

            logger.debug(f"EasyOCR extracted {len(blocks)} text blocks (langs: {langs})")
            return blocks

        except ImportError:
            logger.warning("easyocr not available, falling back to Tesseract")
            return self._extract_with_tesseract(image, languages)
        except Exception as e:
            logger.error(f"EasyOCR extraction error: {e}")
            return self._extract_with_tesseract(image, languages)

    def _extract_with_paddleocr(self, image: np.ndarray, languages: List[str] = None) -> List[TextBlock]:
        """Extract text using PaddleOCR (if available) - best accuracy for Asian languages"""
        try:
            from paddleocr import PaddleOCR

            # Initialize PaddleOCR
            ocr = PaddleOCR(
                use_angle_cls=True,
                lang='ch' if 'ch' in str(languages) else 'en',
                use_gpu=False,
                show_log=False
            )

            # Run OCR
            results = ocr.ocr(image, cls=True)

            blocks = []
            for i, result in enumerate(results):
                if len(result) < 2:
                    continue

                # PaddleOCR result structure: (bbox, (text, confidence))
                (bbox, (text, conf)) = result

                if not text or len(text.strip()) < 2:
                    continue

                # PaddleOCR bbox format: [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
                x_coords = [p[0] for p in bbox]
                y_coords = [p[1] for p in bbox]

                x_min, x_max = int(min(x_coords)), int(max(x_coords))
                y_min, y_max = int(min(y_coords)), int(max(y_coords))

                block = TextBlock(
                    text=text.strip(),
                    bounding_box={'x': x_min, 'y': y_min, 'width': x_max - x_min, 'height': y_max - y_min},
                    confidence=conf / 100.0,
                    line_number=i,
                    language=languages[0] if languages else 'ch'
                )
                blocks.append(block)

            logger.debug(f"PaddleOCR extracted {len(blocks)} text blocks")
            return blocks

        except ImportError:
            logger.warning("paddleocr not available, falling back to EasyOCR")
            return self._extract_with_easyocr(image, languages)
        except Exception as e:
            logger.error(f"PaddleOCR extraction error: {e}")
            return self._extract_with_easyocr(image, languages)

    def _detect_language_simple(self, text: str) -> str:
        """
        Simple language detection using character ranges

        Args:
            text: Text to analyze

        Returns:
            Language code ('en', 'ch', 'ja', 'ko', 'unknown')
        """
        if not text:
            return 'unknown'

        # Check for Chinese characters (CJK)
        for char in text:
            if ord(char) >= 0x4E00 and ord(char) <= 0x9FFF:  # CJK Unified Ideographs
                return 'ch'
            elif ord(char) >= 0x3040 and ord(char) <= 0x30FF:  # Hiragana
                return 'ja'
            elif ord(char) >= 0xAC00 and ord(char) <= 0xD7A3:  # Hangul
                return 'ko'

        return 'en'

    def associate_text_to_elements(
        self,
        text_blocks: List[TextBlock],
        elements: List[Dict[str, Any]],
        image: np.ndarray
    ) -> List[TextAssociation]:
        """
        Associate text blocks to UI elements using multiple strategies

        Strategies used (in order):
        1. Geometric overlap (IoU)
        2. Distance-based matching for near elements
        3. Semantic matching for element types

        Args:
            text_blocks: List of OCR text blocks
            elements: List of UI elements
            image: Original image for visualization (optional)

        Returns:
            List of text-element associations
        """
        associations = []
        assigned_elements = set()

        # Strategy 1: Geometric overlap
        for text_block in text_blocks:
            best_association = None
            max_overlap_ratio = 0

            for element in elements:
                # Skip elements already assigned (if unique assignment)
                if element['id'] in assigned_elements:
                    continue

                # Calculate overlap
                overlap = self._calculate_overlap_ratio(
                    text_block.bounding_box,
                    element['boundingBox']
                )

                if overlap > max_overlap_ratio:
                    max_overlap_ratio = overlap
                    best_association = TextAssociation(
                        element_id=element['id'],
                        text=text_block.text,
                        confidence=text_block.confidence * overlap,  # Combined confidence
                        overlap_area=self._calculate_overlap_area(
                            text_block.bounding_box,
                            element['boundingBox']
                        )
                    )

            # Assign if overlap meets threshold
            if best_association and max_overlap_ratio >= self.min_overlap_ratio:
                associations.append(best_association)
                assigned_elements.add(best_association.element_id)

        # Strategy 2: Distance-based matching for unassigned elements
        unassigned_elements = [e for e in elements if e['id'] not in assigned_elements]

        for text_block in text_blocks:
            # Find nearest element
            nearest = None
            min_distance = float('inf')

            for element in unassigned_elements:
                # Calculate distance between centers
                text_center = self._get_center(text_block.bounding_box)
                element_center = self._get_center(element['boundingBox'])

                distance = self._euclidean_distance(text_center, element_center)

                # Only match if within reasonable distance
                if distance < 100 and distance < min_distance:
                    min_distance = distance
                    nearest = element

            # Assign if found
            if nearest:
                # Calculate association confidence based on distance
                distance_confidence = max(0, 1.0 - (min_distance / 100.0))
                association = TextAssociation(
                    element_id=nearest['id'],
                    text=text_block.text,
                    confidence=text_block.confidence * distance_confidence,
                    overlap_area=0
                )
                associations.append(association)
                assigned_elements.add(nearest['id'])

        logger.debug(f"Associated {len(associations)} text blocks to elements")
        return associations

    def apply_associations_to_elements(
        self,
        elements: List[Dict[str, Any]],
        associations: List[TextAssociation]
    ) -> None:
        """
        Apply text associations to elements (in-place modification)

        Args:
            elements: List of UI elements (modified in-place)
            associations: Text-element associations
        """
        # Create lookup
        association_map = {assoc.element_id: assoc for assoc in associations}

        for element in elements:
            assoc = association_map.get(element['id'])
            if assoc:
                element['text'] = assoc.text
                element['text_confidence'] = assoc.confidence
                element['association_method'] = 'geometric' if assoc.overlap_area > 0 else 'distance'

    def _calculate_overlap_ratio(
        self,
        box1: Dict[str, int],
        box2: Dict[str, int]
    ) -> float:
        """Calculate overlap ratio (intersection / union)"""
        intersection = self._calculate_overlap_area(box1, box2)
        area1 = box1['width'] * box1['height']
        area2 = box2['width'] * box2['height']
        union = area1 + area2 - intersection

        return intersection / union if union > 0 else 0.0

    def _calculate_overlap_area(
        self,
        box1: Dict[str, int],
        box2: Dict[str, int]
    ) -> int:
        """Calculate area of intersection"""
        x_left = max(box1['x'], box2['x'])
        y_top = max(box1['y'], box2['y'])
        x_right = min(box1['x'] + box1['width'], box2['x'] + box2['width'])
        y_bottom = min(box1['y'] + box1['height'], box2['y'] + box2['height'])

        if x_right < x_left or y_bottom < y_top:
            return 0

        return (x_right - x_left) * (y_bottom - y_top)

    def _get_center(self, box: Dict[str, int]) -> Tuple[int, int]:
        """Get center point of bounding box"""
        return (
            box['x'] + box['width'] // 2,
            box['y'] + box['height'] // 2
        )

    def _euclidean_distance(
        self,
        p1: Tuple[int, int],
        p2: Tuple[int, int]
    ) -> float:
        """Calculate Euclidean distance between two points"""
        return ((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2)**0.5

    def visualize_associations(
        self,
        image: np.ndarray,
        text_blocks: List[TextBlock],
        elements: List[Dict[str, Any]],
        associations: List[TextAssociation]
    ) -> np.ndarray:
        """
        Visualize text-to-element associations (for debugging)

        Args:
            image: Original image
            text_blocks: Text blocks
            elements: UI elements
            associations: Associations

        Returns:
            Image with visualizations drawn
        """
        vis_image = image.copy()

        # Draw element boxes
        for element in elements:
            box = element['boundingBox']
            cv2.rectangle(
                vis_image,
                (box['x'], box['y']),
                (box['x'] + box['width'], box['y'] + box['height']),
                (0, 217, 255),  # Cyan
                2
            )

        # Draw text blocks
        for text_block in text_blocks:
            box = text_block.bounding_box
            cv2.rectangle(
                vis_image,
                (box['x'], box['y']),
                (box['x'] + box['width'], box['y'] + box['height']),
                (255, 0, 0),  # Blue
                1
            )

        # Draw associations
        association_map = {assoc.element_id: assoc for assoc in associations}
        for text_block in text_blocks:
            for element in elements:
                assoc = association_map.get(element['id'])
                if assoc and assoc.text == text_block.text:
                    # Draw line
                    text_center = self._get_center(text_block.bounding_box)
                    element_center = self._get_center(element['boundingBox'])
                    cv2.line(
                        vis_image,
                        text_center,
                        element_center,
                        (0, 255, 0),  # Green
                        2
                    )
                    # Draw text label
                    cv2.putText(
                        vis_image,
                        text_block.text,
                        (text_center[0], text_center[1] - 10),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.5,
                        (0, 255, 0),
                        1
                    )
                    break

        return vis_image
