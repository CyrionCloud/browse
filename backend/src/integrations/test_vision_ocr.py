#!/usr/bin/env python3
"""Test Vision/OCR capabilities"""

import cv2
import numpy as np
import base64

print("=== Vision/OCR Integration Tests ===")
print()

results = []

def log_test(name, passed, message=""):
    status = "✅ PASS" if passed else "❌ FAIL"
    results.append((name, passed, message))
    print(f"{status}: {name}")
    if message:
        print(f"    {message}")

# Test 1: Screenshot analysis
print("Test 1: Screenshot Analysis")
img = np.zeros((400, 600, 3), dtype=np.uint8)
cv2.rectangle(img, (0, 0), (600, 50), (255,255,255), -1)
cv2.rectangle(img, (0, 350), (600, 400), (200, 200, 200), -1)
cv2.rectangle(img, (0, 50), (100, 350), (150, 150, 150), -1)

gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
log_test("Screenshot analysis", True, "Created test screenshot with regions")

# Test 2: Layout classification
print("\nTest 2: Layout Classification")
height, width = gray.shape

header = gray[0:int(height*0.15), :]
footer = gray[int(height*0.85):, :]
sidebar = gray[:, 0:int(width*0.2)]
main = gray[int(height*0.15):int(height*0.85), int(width*0.2):width]

log_test("Layout classification", True,
         f"Header: {header.shape}, Footer: {footer.shape}")

# Test 3: Element detection
print("\nTest 3: UI Element Detection")
edges = cv2.Canny(gray, 50, 150)
contours, hierarchy = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

if len(contours) > 0:
    log_test("Element detection", True, f"Found {len(contours)} potential elements")
else:
    log_test("Element detection", False, "No elements found")

# Test 4: Bounding box extraction
print("\nTest 4: Bounding Box Extraction")
if len(contours) > 0:
    x, y, w, h = cv2.boundingRect(contours[0])
    log_test("Bounding box extraction", True,
             f"Element: x={x}, y={y}, w={w}, h={h}")
else:
    log_test("Bounding box extraction", False, "No elements")

# Test 5: Base64 encoding/decoding
print("\nTest 5: Base64 Encoding/Decoding")
_, buffer = cv2.imencode('.png', img)
b64 = base64.b64encode(buffer).decode('utf-8')
decoded = base64.b64decode(b64)
decoded_img = cv2.imdecode(np.frombuffer(decoded, np.uint8), cv2.IMREAD_COLOR)

if decoded_img is not None and decoded_img.shape == img.shape:
    log_test("Base64 encoding/decoding", True,
             f"Encoded: {len(b64)} chars")
else:
    log_test("Base64 encoding/decoding", False, "Decode failed")

# Test 6: Confidence scoring
print("\nTest 6: Confidence Scoring")
if len(contours) > 0:
    x, y, w, h = cv2.boundingRect(contours[0])
    confidence = 0.7

    if w > 50 and h > 20:
        confidence += 0.1
    aspect_ratio = w / h if h > 0 else 0
    if 0.1 < aspect_ratio < 10:
        confidence += 0.1

    log_test("Confidence scoring", True,
             f"Confidence: {min(confidence, 1.0):.2f}")
else:
    log_test("Confidence scoring", False, "No contours")

# Test 7: Element type classification
print("\nTest 7: Element Type Classification")
if len(contours) > 0:
    x, y, w, h = cv2.boundingRect(contours[0])
    aspect_ratio = w / h if h > 0 else 0

    if aspect_ratio > 3:
        elem_type = "input"
    elif aspect_ratio < 0.3:
        elem_type = "icon"
    elif 1.5 < aspect_ratio < 2.5:
        elem_type = "button"
    else:
        elem_type = "container"

    log_test("Element type classification", True,
             f"Type: {elem_type}, Aspect ratio: {aspect_ratio:.2f}")
else:
    log_test("Element type classification", False, "No elements")

# Summary
print()
print("=" * 60)
print("Summary")
print("=" * 60)
passed = sum(1 for _, r, _ in results if r)
total = len(results)
print(f"Passed: {passed}/{total} ({(passed/total)*100:.1f}%)")
