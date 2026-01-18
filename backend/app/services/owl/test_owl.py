"""
Owl Vision Testing Utilities
For testing and benchmarking Owl features
"""
import numpy as np
import cv2
import base64
import logging
from typing import Dict, Any, List, Optional, Callable
from pathlib import Path
import json
import time

logger = logging.getLogger(__name__)


class OwlTester:
    """Test suite for Owl vision features"""

    def __init__(self, test_images_dir: str = None):
        """
        Initialize Owl tester

        Args:
            test_images_dir: Directory containing test images
        """
        self.test_images_dir = test_images_dir or self._get_default_test_dir()
        self.results = {}

    def _get_default_test_dir(self) -> str:
        """Get default test images directory"""
        current_dir = Path(__file__).parent
        test_dir = current_dir / 'test_images'

        # Create if doesn't exist
        test_dir.mkdir(exist_ok=True, parents=True)

        return str(test_dir)

    def run_full_test_suite(self) -> Dict[str, Any]:
        """
        Run complete test suite

        Tests all Owl features with sample images
        """
        logger.info('Starting full test suite...')

        results = {
            'test_name': 'Owl Vision Full Test Suite',
            'timestamp': time.time(),
            'tests': {}
        }

        # Get test images
        test_images = self._load_test_images()

        if not test_images:
            logger.warning('No test images found')
            return results

        # Import Owl components
        try:
            from owl.ui_element_detector import UIElementDetector
            from owl.text_element_mapper import TextElementMapper
            from owl.layout_analyzer import AdvancedLayoutAnalyzer

            ml_detector = UIElementDetector(use_tiny=True)
            text_mapper = TextElementMapper(min_overlap_ratio=0.3)
            layout_analyzer = AdvancedLayoutAnalyzer()

            # Test 1: ML Element Detection
            results['tests']['ml_element_detection'] = self.test_ml_detection(
                test_images, ml_detector
            )

            # Test 2: Text Extraction
            results['tests']['text_extraction'] = self.test_text_extraction(
                test_images, text_mapper
            )

            # Test 3: Text-to-Element Mapping
            results['tests']['text_element_mapping'] = self.test_text_mapping(
                test_images, ml_detector, text_mapper
            )

            # Test 4: Layout Detection
            results['tests']['layout_detection'] = self.test_layout_detection(
                test_images, layout_analyzer
            )

            # Test 5: Grid Detection
            results['tests']['grid_detection'] = self.test_grid_detection(
                test_images, layout_analyzer
            )

            # Test 6: Table Detection
            results['tests']['table_detection'] = self.test_table_detection(
                test_images, layout_analyzer
            )

            # Test 7: Reading Order
            results['tests']['reading_order'] = self.test_reading_order(
                test_images, layout_analyzer
            )

        except Exception as e:
            logger.error(f'Test suite error: {e}')
            results['error'] = str(e)

        # Save results
        self._save_test_results(results)

        return results

    def _load_test_images(self) -> List[np.ndarray]:
        """Load all test images from directory"""
        test_images = []
        test_dir = Path(self.test_images_dir)

        # Look for common image formats
        for ext in ['*.png', '*.jpg', '*.jpeg', '*.webp']:
            for img_path in test_dir.glob(ext):
                img = cv2.imread(str(img_path))
                if img is not None:
                    test_images.append(img)
                    logger.debug(f'Loaded test image: {img_path.name}')

        logger.info(f'Loaded {len(test_images)} test images')
        return test_images

    def test_ml_detection(
        self,
        images: List[np.ndarray],
        detector
    ) -> Dict[str, Any]:
        """Test ML-based element detection"""
        logger.info('Testing ML element detection...')

        results = {
            'total_images': len(images),
            'successful_detections': 0,
            'total_elements': 0,
            'avg_time_ms': 0,
            'details': []
        }

        total_time = 0

        for i, image in enumerate(images):
            start = time.time()

            if detector.is_available():
                elements = detector.detect_elements(image, confidence_threshold=0.5)
                results['total_elements'] += len(elements)
                results['successful_detections'] += 1

            elapsed = (time.time() - start) * 1000  # to ms
            total_time += elapsed

            results['details'].append({
                'image_index': i,
                'detection_time_ms': elapsed,
                'elements_count': len(elements) if detector.is_available() else 0,
                'ml_available': detector.is_available()
            })

        results['avg_time_ms'] = total_time / len(images) if images else 0

        logger.info(f'ML detection test complete: {results}')
        return results

    def test_text_extraction(
        self,
        images: List[np.ndarray],
        mapper
    ) -> Dict[str, Any]:
        """Test text extraction with all engines"""
        logger.info('Testing text extraction...')

        results = {
            'total_images': len(images),
            'engines': {
                'tesseract': {},
                'easyocr': {},
                'paddleocr': {}
            }
        }

        for i, image in enumerate(images):
            # Test each engine
            for engine in ['tesseract', 'easyocr', 'paddleocr']:
                try:
                    start = time.time()
                    blocks = mapper.extract_text_blocks(image, engine)

                    elapsed = (time.time() - start) * 1000

                    if engine not in results['engines'][engine]:
                        results['engines'][engine] = {
                            'successful': 0,
                            'total_blocks': 0,
                            'avg_time_ms': 0
                        }

                    results['engines'][engine]['total_blocks'] += len(blocks)
                    results['engines'][engine]['successful'] += 1
                    results['engines'][engine]['avg_time_ms'] += elapsed

                except Exception as e:
                    logger.warning(f'Text extraction failed for {engine}: {e}')

        # Calculate averages
        for engine in results['engines']:
            if results['engines'][engine].get('successful', 0) > 0:
                count = results['engines'][engine]['successful']
                results['engines'][engine]['avg_time_ms'] /= count

        logger.info(f'Text extraction test complete')
        return results

    def test_text_mapping(
        self,
        images: List[np.ndarray],
        detector,
        mapper
    ) -> Dict[str, Any]:
        """Test text-to-element mapping"""
        logger.info('Testing text-to-element mapping...')

        results = {
            'total_images': len(images),
            'successful_mappings': 0,
            'total_associations': 0,
            'avg_time_ms': 0
        }

        total_time = 0

        for i, image in enumerate(images):
            start = time.time()

            # Detect elements
            elements = []
            if detector.is_available():
                detected = detector.detect_elements(image, 0.5)
                elements = [
                    {
                        'id': e.id,
                        'type': e.type,
                        'boundingBox': e.bounding_box,
                        'coordinates': {
                            'x': e.bounding_box['x'] + e.bounding_box['width'] // 2,
                            'y': e.bounding_box['y'] + e.bounding_box['height'] // 2
                        }
                    }
                    for e in detected
                ]

            # Extract text
            text_blocks = mapper.extract_text_blocks(image, 'tesseract')

            # Map text to elements
            if text_blocks and elements:
                associations = mapper.associate_text_to_elements(text_blocks, elements, image)
                results['total_associations'] += len(associations)

                results['successful_mappings'] += 1

            elapsed = (time.time() - start) * 1000
            total_time += elapsed

        results['avg_time_ms'] = total_time / len(images) if images else 0

        logger.info(f'Text mapping test complete: {results}')
        return results

    def test_layout_detection(
        self,
        images: List[np.ndarray],
        analyzer
    ) -> Dict[str, Any]:
        """Test layout detection"""
        logger.info('Testing layout detection...')

        results = {
            'total_images': len(images),
            'layout_types': {},
            'avg_time_ms': 0
        }

        total_time = 0
        type_counts = {}

        for i, image in enumerate(images):
            start = time.time()

            layout_type = analyzer.detect_layout_type(image)
            type_str = layout_type.value

            type_counts[type_str] = type_counts.get(type_str, 0) + 1

            elapsed = (time.time() - start) * 1000
            total_time += elapsed

        results['layout_types'] = type_counts
        results['avg_time_ms'] = total_time / len(images) if images else 0

        logger.info(f'Layout detection test complete: {results}')
        return results

    def test_grid_detection(
        self,
        images: List[np.ndarray],
        analyzer
    ) -> Dict[str, Any]:
        """Test grid detection"""
        logger.info('Testing grid detection...')

        results = {
            'total_images': len(images),
            'grids_found': 0,
            'total_cells': 0,
            'avg_time_ms': 0
        }

        total_time = 0

        for i, image in enumerate(images):
            start = time.time()

            grids = analyzer.detect_grids(image)

            if grids:
                results['grids_found'] += 1
                for grid in grids:
                    results['total_cells'] += len(grid)

            elapsed = (time.time() - start) * 1000
            total_time += elapsed

        results['avg_time_ms'] = total_time / len(images) if images else 0

        logger.info(f'Grid detection test complete: {results}')
        return results

    def test_table_detection(
        self,
        images: List[np.ndarray],
        analyzer
    ) -> Dict[str, Any]:
        """Test table detection"""
        logger.info('Testing table detection...')

        results = {
            'total_images': len(images),
            'tables_found': 0,
            'total_cells': 0,
            'avg_time_ms': 0
        }

        total_time = 0

        for i, image in enumerate(images):
            start = time.time()

            tables = analyzer.detect_tables(image)

            if tables:
                results['tables_found'] += 1
                for table in tables:
                    results['total_cells'] += table.rows * table.cols

            elapsed = (time.time() - start) * 1000
            total_time += elapsed

        results['avg_time_ms'] = total_time / len(images) if images else 0

        logger.info(f'Table detection test complete: {results}')
        return results

    def test_reading_order(
        self,
        images: List[np.ndarray],
        analyzer
    ) -> Dict[str, Any]:
        """Test reading order detection"""
        logger.info('Testing reading order...')

        results = {
            'total_images': len(images),
            'total_elements': 0,
            'avg_time_ms': 0
        }

        total_time = 0

        for i, image in enumerate(images):
            start = time.time()

            # Use mock elements (would need real detection)
            elements = [
                {
                    'id': f'elem_{j}',
                    'type': 'text',
                    'boundingBox': {
                        'x': j * 100,
                        'y': i * 50,
                        'width': 80,
                        'height': 30
                    }
                }
                for j in range(5)
            ]

            reading_order = analyzer.detect_reading_order(image, elements)

            results['total_elements'] += len(reading_order)

            elapsed = (time.time() - start) * 1000
            total_time += elapsed

        results['avg_time_ms'] = total_time / len(images) if images else 0

        logger.info(f'Reading order test complete: {results}')
        return results

    def _save_test_results(self, results: Dict[str, Any]):
        """Save test results to JSON file"""
        try:
            results_dir = Path(self.test_images_dir) / 'results'
            results_dir.mkdir(exist_ok=True, parents=True)

            timestamp = time.strftime('%Y%m%d_%H%M%S')
            results_file = results_dir / f'test_results_{timestamp}.json'

            with open(results_file, 'w') as f:
                json.dump(results, f, indent=2)

            logger.info(f'Test results saved to: {results_file}')

        except Exception as e:
            logger.error(f'Failed to save test results: {e}')

    def create_sample_test_images(self):
        """
        Create sample test images for testing

        Generates UI-like images with text and elements
        """
        logger.info('Creating sample test images...')

        test_dir = Path(self.test_images_dir)
        test_dir.mkdir(exist_ok=True, parents=True)

        # Sample 1: Simple button
        self._create_simple_button_image(test_dir / 'button.png')

        # Sample 2: Form with inputs
        self._create_form_image(test_dir / 'form.png')

        # Sample 3: Navigation bar
        self._create_nav_image(test_dir / 'nav.png')

        # Sample 4: Grid layout
        self._create_grid_image(test_dir / 'grid.png')

        logger.info('Sample test images created')

    def _create_simple_button_image(self, path: Path):
        """Create simple button image for testing"""
        img = np.ones((200, 60), dtype=np.uint8) * 240  # Light gray background

        cv2.rectangle(img, (10, 10), (190, 50), (50, 150, 250), -1)  # Blue button
        cv2.putText(img, 'Submit Button', (50, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

        cv2.imwrite(str(path), img)

    def _create_form_image(self, path: Path):
        """Create form image for testing"""
        img = np.ones((400, 300), dtype=np.uint8) * 255  # White background

        # Input 1
        cv2.rectangle(img, (20, 50), (200, 80), (200, 200, 200), 2)
        cv2.putText(img, 'Username:', (30, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 1)

        # Input 2
        cv2.rectangle(img, (20, 120), (200, 150), (200, 200, 200), 2)
        cv2.putText(img, 'Password:', (30, 140), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 1)

        # Submit button
        cv2.rectangle(img, (20, 200), (120, 240), (50, 150, 250), -1)
        cv2.putText(img, 'Login', (40, 225), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

        cv2.imwrite(str(path), img)

    def _create_nav_image(self, path: Path):
        """Create navigation bar image for testing"""
        img = np.ones((800, 60), dtype=np.uint8) * 240  # Light gray

        # Nav items
        cv2.rectangle(img, (10, 10), (120, 50), (50, 150, 250), -1)
        cv2.putText(img, 'Home', (30, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

        cv2.rectangle(img, (140, 10), (250, 50), (50, 150, 250), -1)
        cv2.putText(img, 'Products', (160, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

        cv2.rectangle(img, (270, 10), (380, 50), (50, 150, 250), -1)
        cv2.putText(img, 'About', (290, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

        cv2.rectangle(img, (400, 10), (510, 50), (50, 150, 250), -1)
        cv2.putText(img, 'Contact', (420, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

        cv2.imwrite(str(path), img)

    def _create_grid_image(self, path: Path):
        """Create grid layout image for testing"""
        img = np.ones((600, 400), dtype=np.uint8) * 255  # White background

        # 2x2 grid
        for row in range(2):
            for col in range(2):
                x = 50 + col * 270
                y = 50 + row * 180

                cv2.rectangle(img, (x, y), (x + 250, y + 160), (200, 200, 200), 2)
                cv2.putText(img, f'Cell {row+1}-{col+1}', (x + 80, y + 80), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)

        cv2.imwrite(str(path), img)


def create_sample_images():
    """Convenience function to create sample test images"""
    tester = OwlTester()
    tester.create_sample_test_images()


def run_tests():
    """Convenience function to run full test suite"""
    tester = OwlTester()
    return tester.run_full_test_suite()


if __name__ == '__main__':
    import sys

    if len(sys.argv) > 1:
        command = sys.argv[1]

        if command == 'create_samples':
            create_sample_images()
        elif command == 'test':
            print(run_tests())
        else:
            print('Usage: python test_owl.py [create_samples|test]')
    else:
        print('Usage: python test_owl.py [create_samples|test]')
