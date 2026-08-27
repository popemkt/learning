"""
Test Suite for PaddleOCR Pipeline and Components.
Runs automated validation over detection, orientation, recognition, and structured parsing.
"""

import pytest
from pathlib import Path
from paddleocr import PaddleOCR
import sys

# Ensure src is in python path
src_dir = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(src_dir))

from generate_samples import generate_all_samples
from demo_receipt import ReceiptParser
from visualizer import draw_ocr_annotations, draw_structured_receipt, draw_pipeline_stages

@pytest.fixture(scope="session")
def samples(tmp_path_factory):
    sample_dir = tmp_path_factory.mktemp("samples")
    return generate_all_samples(sample_dir)


@pytest.fixture(scope="session")
def ocr_engine():
    return PaddleOCR(use_textline_orientation=True, use_doc_orientation_classify=True, use_doc_unwarping=False, lang="en")


def test_basic_text_extraction(ocr_engine, samples):
    """Verifies that basic text on a card is detected and recognized with high confidence."""
    results = ocr_engine.predict(str(samples["card"]))
    assert len(results) > 0, "OCR should return results"

    res = results[0]
    rec_texts = res.get("rec_texts", [])
    rec_scores = res.get("rec_scores", [])

    assert len(rec_texts) >= 4, "Should extract at least 4 text lines"

    full_text = " ".join(rec_texts)
    assert "PaddleOCR" in full_text
    assert "Question" in full_text
    assert "Answer" in full_text

    for score in rec_scores:
        assert score > 0.85, f"Confidence score should be high, got {score}"


def test_rotated_image_orientation_correction(ocr_engine, samples):
    """Verifies that 180-degree rotated text is correctly rectified and recognized."""
    results = ocr_engine.predict(str(samples["rotated_180"]))
    assert len(results) > 0

    res = results[0]
    rec_texts = res.get("rec_texts", [])

    assert len(rec_texts) >= 2
    full_text = " ".join(rec_texts)
    assert "INVERTED" in full_text or "WARNING" in full_text
    assert "180" in full_text or "Rotated" in full_text


def test_structured_receipt_parsing(ocr_engine, samples):
    """Verifies structured parsing logic extracting key-value pairs from receipt bounding boxes."""
    parser = ReceiptParser(ocr_engine=ocr_engine)
    data = parser.parse(samples["receipt"])

    assert data["merchant"] == "TECH COFFEE LAB"
    assert data["order_number"] == "48291"
    assert data["date"] == "2026-08-24 10:45"
    assert len(data["line_items"]) == 4

    # Validate line items
    item_names = [item["name"] for item in data["line_items"]]
    assert any("Espresso" in name for name in item_names)
    assert any("Oat Milk" in name for name in item_names)
    assert any("Croissant" in name for name in item_names)
    assert any("Cold Brew" in name for name in item_names)

    # Validate totals
    assert data["subtotal"] == 30.25
    assert data["tax"] == 2.50
    assert data["total"] == 32.75


def test_pipeline_bounding_boxes_format(ocr_engine, samples):
    """Verifies bounding box formats and polygon shapes."""
    results = ocr_engine.predict(str(samples["card"]))
    res = results[0]

    dt_polys = res.get("dt_polys", [])
    rec_boxes = res.get("rec_boxes", [])

    assert len(dt_polys) > 0
    assert len(rec_boxes) == len(dt_polys)

    for box in rec_boxes:
        assert len(box) == 4, "Bounding boxes should have 4 coordinates (x1, y1, x2, y2)"
        x1, y1, x2, y2 = box
        assert x2 >= x1
        assert y2 >= y1


def test_visualization_drawing_outputs(ocr_engine, samples, tmp_path):
    """Verifies that all drawing and visualization functions generate valid output images."""
    # 1. Test basic OCR annotations drawing
    results = ocr_engine.predict(str(samples["card"]))
    out_card = tmp_path / "drawn_card.png"
    img_card = draw_ocr_annotations(samples["card"], results, output_path=out_card)
    assert out_card.exists()
    assert img_card.width > 0 and img_card.height > 0

    # 2. Test structured receipt drawing
    parser = ReceiptParser(ocr_engine=ocr_engine)
    parsed = parser.parse(samples["receipt"])
    out_receipt = tmp_path / "drawn_receipt.png"
    img_receipt = draw_structured_receipt(samples["receipt"], parsed, output_path=out_receipt)
    assert out_receipt.exists()
    assert img_receipt.width > 0 and img_receipt.height > 0

    # 3. Test multi-stage pipeline drawing
    stage_data = {
        "doc_angle": 180,
        "unwarped": True,
        "dt_polys": [[[10, 10], [50, 10], [50, 30], [10, 30]]],
        "rec_texts": ["Test Text"],
        "rec_scores": [0.99],
        "line_angles": [0],
    }
    out_stages = tmp_path / "drawn_stages.png"
    img_stages = draw_pipeline_stages(samples["rotated_180"], stage_data, output_path=out_stages)
    assert out_stages.exists()
    assert img_stages.width > 0 and img_stages.height > 0
