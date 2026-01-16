"""
Advanced Layout Understanding
Detects complex UI layouts: Grid, Flexbox, Tables, Semantic regions
"""
import numpy as np
import cv2
import logging
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class LayoutType(Enum):
    """UI layout types"""
    GRID = 'grid'
    FLEX = 'flex'
    TABLE = 'table'
    FLOW = 'flow'
    ABSOLUTE = 'absolute'
    UNKNOWN = 'unknown'


class SemanticRegion(Enum):
    """Semantic page regions"""
    HEADER = 'header'
    NAVIGATION = 'navigation'
    MAIN = 'main'
    SIDEBAR = 'sidebar'
    FOOTER = 'footer'
    HERO = 'hero'
    CONTENT = 'content'
    ASIDE = 'aside'
    BREADCRUMB = 'breadcrumb'
    PAGINATION = 'pagination'
    UNKNOWN = 'unknown'


@dataclass
class GridCell:
    """Grid cell in a layout"""
    id: str
    bounding_box: Dict[str, int]
    row: int
    col: int
    rowspan: int = 1
    colspan: int = 1


@dataclass
class FlexContainer:
    """Flex container"""
    id: str
    bounding_box: Dict[str, int]
    direction: str = 'row'  # row or column
    wrap: bool = False
    justify: str = 'flex-start'
    align: str = 'stretch'
    children: List[str] = None


@dataclass
class TableStructure:
    """Table layout structure"""
    id: str
    bounding_box: Dict[str, int]
    rows: int
    cols: int
    headers: List[str] = None
    cells: List[Dict[str, Any]] = None


class AdvancedLayoutAnalyzer:
    """Analyzes UI layouts using computer vision"""

    def __init__(self):
        self.logger = logger

    def analyze_layout(
        self,
        image: np.ndarray,
        elements: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Comprehensive layout analysis

        Args:
            image: Input screenshot
            elements: Detected UI elements (optional)

        Returns:
            Complete layout analysis
        """
        result = {
            'layout_type': self.detect_layout_type(image),
            'grids': self.detect_grids(image),
            'flex_containers': self.detect_flex_containers(image),
            'tables': self.detect_tables(image),
            'semantic_regions': self.classify_semantic_regions(image, elements),
            'reading_order': self.detect_reading_order(image, elements),
            'scrollable_areas': self.detect_scrollable_areas(image),
            'image_size': {'width': image.shape[1], 'height': image.shape[0]}
        }

        self.logger.debug(f"Layout analysis complete: {result['layout_type']}")
        return result

    def detect_layout_type(self, image: np.ndarray) -> LayoutType:
        """
        Detect overall layout type (grid, flex, table, etc.)

        Uses element alignment and spacing patterns
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Detect horizontal and vertical lines
        horizontal_lines = self._detect_lines(gray, cv2.HOUGH_HORIZONTAL)
        vertical_lines = self._detect_lines(gray, cv2.HOUGH_VERTICAL)

        # Analyze line patterns
        horizontal_count = len(horizontal_lines)
        vertical_count = len(vertical_lines)

        # Grid: Both horizontal and vertical lines, regular spacing
        if horizontal_count > 2 and vertical_count > 2:
            h_spacing = self._calculate_spacing(horizontal_lines)
            v_spacing = self._calculate_spacing(vertical_lines)

            if self._is_regular_spacing(h_spacing) and self._is_regular_spacing(v_spacing):
                return LayoutType.GRID

        # Table: Grid-like with more structure
        if self._detect_table_structure(image):
            return LayoutType.TABLE

        # Flex: Few lines, elements aligned
        if self._detect_flex_alignment(image):
            return LayoutType.FLEX

        # Default to flow layout
        return LayoutType.FLOW

    def detect_grids(self, image: np.ndarray) -> List[List[GridCell]]:
        """
        Detect grid-based layouts

        Returns list of rows, each containing grid cells
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Detect grid lines
        horizontal = self._detect_grid_lines(gray, 'horizontal')
        vertical = self._detect_grid_lines(gray, 'vertical')

        # Create grid structure
        if len(horizontal) < 2 or len(vertical) < 2:
            return []

        # Sort lines
        horizontal = sorted(horizontal, key=lambda x: x['y'])
        vertical = sorted(vertical, key=lambda x: x['x'])

        # Create cells
        grid = []
        for i in range(len(horizontal) - 1):
            row = []
            for j in range(len(vertical) - 1):
                x = vertical[j]['x']
                y = horizontal[i]['y']
                width = vertical[j + 1]['x'] - x
                height = horizontal[i + 1]['y'] - y

                # Filter small cells
                if width > 20 and height > 20:
                    row.append(GridCell(
                        id=f"cell_{i}_{j}",
                        bounding_box={'x': x, 'y': y, 'width': width, 'height': height},
                        row=i,
                        col=j
                    ))

            if row:
                grid.append(row)

        return grid

    def detect_flex_containers(self, image: np.ndarray) -> List[FlexContainer]:
        """
        Detect flex-like containers

        Based on horizontal/vertical element alignment
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Find contours (potential containers)
        edges = cv2.Canny(gray, 50, 150)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        containers = []
        import uuid

        for contour in contours[:50]:
            x, y, w, h = cv2.boundingRect(contour)

            # Filter by size
            if w < 100 or h < 50:
                continue

            # Analyze internal structure
            roi = gray[y:y+h, x:x+w]
            direction = self._detect_flex_direction(roi)

            # Detect wrapping
            wrap = self._detect_flex_wrap(roi)

            containers.append(FlexContainer(
                id=str(uuid.uuid4())[:8],
                bounding_box={'x': x, 'y': y, 'width': w, 'height': h},
                direction=direction,
                wrap=wrap
            ))

        return containers

    def detect_tables(self, image: np.ndarray) -> List[TableStructure]:
        """
        Detect table structures

        Based on grid-like layouts with header patterns
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Detect grid lines
        horizontal = self._detect_grid_lines(gray, 'horizontal')
        vertical = self._detect_grid_lines(gray, 'vertical')

        if len(horizontal) < 3 or len(vertical) < 2:
            return []

        tables = []

        # Find table regions
        for i in range(len(horizontal) - 2):
            # Check if this looks like a table header
            header_y = horizontal[i]['y']
            content_y = horizontal[i + 1]['y']

            # Extract header region
            header_region = gray[header_y:content_y, :]

            # Check for alternating backgrounds (table pattern)
            if self._has_table_pattern(header_region):
                # Calculate table dimensions
                table_width = image.shape[1]
                table_height = horizontal[i + 2]['y'] - header_y if i + 2 < len(horizontal) else gray.shape[0] - header_y

                # Estimate columns from vertical lines
                cols = min(len(vertical) - 1, 10)

                tables.append(TableStructure(
                    id=f"table_{len(tables)}",
                    bounding_box={'x': 0, 'y': header_y, 'width': table_width, 'height': table_height},
                    rows=len(horizontal) - i,
                    cols=cols
                ))

        return tables

    def classify_semantic_regions(
        self,
        image: np.ndarray,
        elements: List[Dict[str, Any]] = None
    ) -> Dict[str, Dict[str, int]]:
        """
        Classify semantic page regions (header, nav, main, etc.)

        Uses position-based heuristics + element type analysis
        """
        h, w = image.shape[:2]

        # Basic position-based regions
        regions = {
            SemanticRegion.HEADER.value: {'x': 0, 'y': 0, 'width': w, 'height': int(h * 0.10)},
            SemanticRegion.NAVIGATION.value: {'x': int(w * 0.0), 'y': int(h * 0.10), 'width': int(w * 1.0), 'height': int(h * 0.08)},
            SemanticRegion.MAIN.value: {'x': int(w * 0.10), 'y': int(h * 0.18), 'width': int(w * 0.80), 'height': int(h * 0.72)},
            SemanticRegion.SIDEBAR.value: {'x': 0, 'y': int(h * 0.18), 'width': int(w * 0.10), 'height': int(h * 0.72)},
            SemanticRegion.FOOTER.value: {'x': 0, 'y': int(h * 0.90), 'width': w, 'height': int(h * 0.10)}
        }

        # Refine based on detected elements
        if elements:
            regions = self._refine_regions_with_elements(regions, elements)

        return regions

    def detect_reading_order(
        self,
        image: np.ndarray,
        elements: List[Dict[str, Any]]
    ) -> List[str]:
        """
        Detect reading order of elements

        Left-to-right, top-to-bottom with visual hierarchy
        """
        if not elements:
            return []

        # Sort elements by position (y first, then x)
        sorted_elements = sorted(
            elements,
            key=lambda e: (e['boundingBox']['y'], e['boundingBox']['x'])
        )

        # Group by rows (similar Y positions)
        rows = []
        current_row = []
        last_y = None

        for element in sorted_elements:
            y = element['boundingBox']['y']

            # New row if Y position changed significantly
            if last_y is None or abs(y - last_y) > 30:
                if current_row:
                    rows.append(current_row)
                current_row = []

            current_row.append(element['id'])
            last_y = y

        if current_row:
            rows.append(current_row)

        # Flatten to reading order
        reading_order = [elem_id for row in rows for elem_id in row]

        return reading_order

    def detect_scrollable_areas(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """
        Detect scrollable areas

        Based on vertical gradients and container patterns
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Detect vertical gradients (potential scrollbars)
        sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        sobel_y = cv2.convertScaleAbs(sobel_y)

        # Threshold
        _, thresh = cv2.threshold(sobel_y, 50, 255, cv2.THRESH_BINARY)

        # Find contours
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        scrollable = []

        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)

            # Scrollbar characteristics: thin, vertical, right side
            if 5 < w < 30 and h > 100:
                scrollable.append({
                    'type': 'scrollbar',
                    'bounding_box': {'x': x, 'y': y, 'width': w, 'height': h},
                    'orientation': 'vertical'
                })

        return scrollable

    def _detect_lines(self, gray: np.ndarray, line_type: int) -> List[Dict[str, Any]]:
        """Detect lines using Hough transform"""
        lines = cv2.HoughLinesP(
            gray,
            rho=1,
            theta=np.pi / 180,
            threshold=50,
            minLineLength=50,
            maxLineGap=10
        )

        result = []
        if lines is not None:
            for line in lines:
                x1, y1, x2, y2 = line[0]

                if line_type == cv2.HOUGH_HORIZONTAL:
                    result.append({'y': y1, 'x1': x1, 'x2': x2})
                else:  # VERTICAL
                    result.append({'x': x1, 'y1': y1, 'y2': y2})

        return result

    def _detect_grid_lines(self, gray: np.ndarray, direction: str) -> List[Dict[str, Any]]:
        """Detect grid lines with morphological operations"""
        # Morphological operation to enhance lines
        if direction == 'horizontal':
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (20, 1))
        else:  # vertical
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 20))

        morph = cv2.morphologyEx(gray, cv2.MORPH_OPEN, kernel)

        # Detect lines
        lines = self._detect_lines(morph, cv2.HOUGH_HORIZONTAL if direction == 'horizontal' else cv2.HOUGH_VERTICAL)

        return lines

    def _calculate_spacing(self, lines: List[Dict[str, Any]]) -> List[float]:
        """Calculate spacing between lines"""
        if len(lines) < 2:
            return []

        if 'y' in lines[0]:  # Horizontal lines
            positions = sorted([line['y'] for line in lines])
        else:  # Vertical lines
            positions = sorted([line['x'] for line in lines])

        spacings = [positions[i+1] - positions[i] for i in range(len(positions) - 1)]
        return spacings

    def _is_regular_spacing(self, spacings: List[float], threshold: float = 0.3) -> bool:
        """Check if spacing is regular (low variance)"""
        if len(spacings) < 2:
            return False

        mean = np.mean(spacings)
        std = np.std(spacings)

        # Coefficient of variation
        cv = std / mean if mean > 0 else float('inf')

        return cv < threshold

    def _detect_table_structure(self, image: np.ndarray) -> bool:
        """Check if image contains table-like structure"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Look for alternating patterns
        hist = cv2.calcHist([gray], [0], None, [256], [0, 256])

        # Tables have bimodal histograms (alternating backgrounds)
        peaks = self._find_peaks(hist[:, 0])

        # Table detection if 2+ distinct brightness levels
        return len(peaks) >= 2

    def _find_peaks(self, data: np.ndarray, min_distance: int = 20) -> List[int]:
        """Find peaks in histogram data"""
        peaks = []

        for i in range(min_distance, len(data) - min_distance):
            if data[i] > data[i - min_distance] and data[i] > data[i + min_distance]:
                peaks.append(i)

        return peaks

    def _detect_flex_alignment(self, image: np.ndarray) -> bool:
        """Detect flex-like alignment patterns"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Project to axes
        x_projection = np.sum(gray, axis=1)
        y_projection = np.sum(gray, axis=0)

        # Look for alignment (gaps in projection)
        x_gaps = self._count_gaps(x_projection)
        y_gaps = self._count_gaps(y_projection)

        # Flex layouts have clear alignment gaps
        return x_gaps > 2 or y_gaps > 2

    def _count_gaps(self, projection: np.ndarray, threshold: float = 0.1) -> int:
        """Count gaps in projection"""
        max_val = np.max(projection)
        threshold_val = max_val * threshold

        gaps = 0
        in_gap = False

        for val in projection:
            if val < threshold_val:
                if not in_gap:
                    gaps += 1
                    in_gap = True
            else:
                in_gap = False

        return gaps

    def _detect_flex_direction(self, roi: np.ndarray) -> str:
        """Detect flex direction (row or column)"""
        # Compare width vs height
        h, w = roi.shape

        if w > h * 1.5:
            return 'row'
        elif h > w * 1.5:
            return 'column'
        else:
            return 'row'  # Default

    def _detect_flex_wrap(self, roi: np.ndarray) -> bool:
        """Detect if flex container wraps"""
        # Check for multiple columns/rows
        projection_x = np.sum(roi, axis=0)

        # Multiple peaks = wrapping
        peaks = self._find_peaks(projection_x)

        return len(peaks) > 1

    def _has_table_pattern(self, region: np.ndarray) -> bool:
        """Check for table-like patterns"""
        # Look for alternating backgrounds
        hist = cv2.calcHist([region], [0], None, [16], [0, 256])

        # Multiple peaks = alternating backgrounds
        peaks = self._find_peaks(hist[:, 0], min_distance=2)

        return len(peaks) >= 2

    def _refine_regions_with_elements(
        self,
        regions: Dict[str, Dict[str, int]],
        elements: List[Dict[str, Any]]
    ) -> Dict[str, Dict[str, int]]:
        """Refine semantic regions based on detected elements"""
        # Group elements by region
        element_regions = {}

        for element in elements:
            box = element['boundingBox']
            center = (box['x'] + box['width'] // 2, box['y'] + box['height'] // 2)

            # Find containing region
            for region_name, region_box in regions.items():
                if self._point_in_box(center, region_box):
                    if region_name not in element_regions:
                        element_regions[region_name] = []
                    element_regions[region_name].append(element)

        # Adjust region sizes based on elements
        for region_name, region_elements in element_regions.items():
            if region_elements:
                # Expand region to fit all elements
                min_x = min(e['boundingBox']['x'] for e in region_elements)
                min_y = min(e['boundingBox']['y'] for e in region_elements)
                max_x = max(e['boundingBox']['x'] + e['boundingBox']['width'] for e in region_elements)
                max_y = max(e['boundingBox']['y'] + e['boundingBox']['height'] for e in region_elements)

                regions[region_name] = {
                    'x': min_x,
                    'y': min_y,
                    'width': max_x - min_x,
                    'height': max_y - min_y
                }

        return regions

    def _point_in_box(self, point: Tuple[int, int], box: Dict[str, int]) -> bool:
        """Check if point is inside bounding box"""
        x, y = point
        return (
            box['x'] <= x < box['x'] + box['width'] and
            box['y'] <= y < box['y'] + box['height']
        )
