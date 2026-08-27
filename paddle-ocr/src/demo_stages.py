"""
Deep Dive: PaddleOCR Pipeline Stages Breakdown.
Demonstrates why PaddleOCR is NOT a single monolithic model, but a pipeline
of specialized, cooperating neural networks:
  [Input Image]
       │
       ▼
  1. Document Preprocessor (Doc Orientation + UVDoc Unwarping)
       │
       ▼
  2. Text Detector (DBNet / PP-OCR Det -> Extracts Polygons)
       │
       ▼
  3. Textline Cropper & Orientation Classifier (PP-LCNet -> 0° vs 180°)
       │
       ▼
  4. Text Recognizer (SVTR / PP-OCR Rec -> CTC Character Decoding)
       │
       ▼
  [Structured Output / Polygons + Text + Confidence]
"""

import cv2
import numpy as np
from pathlib import Path
from PIL import Image
from paddleocr import PaddleOCR
from generate_samples import generate_all_samples
from visualizer import draw_pipeline_stages


def inspect_pipeline_stages(image_path: str | Path) -> None:
    image_path = Path(image_path)
    output_dir = image_path.parent.parent / "output" / "pipeline_stages"
    crops_dir = output_dir / "textline_crops"
    output_dir.mkdir(parents=True, exist_ok=True)
    crops_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 80)
    print("PADDLEOCR ARCHITECTURE STAGE-BY-STAGE DISSECTION")
    print("=" * 80)
    print(f"Target Image: {image_path.name}\n")

    # 1. Pipeline Instantiation
    print("[1] Initializing Pipeline Sub-Modules:")
    ocr = PaddleOCR(use_textline_orientation=True, use_doc_orientation_classify=True, use_doc_unwarping=False, lang="en")
    print("    ├─ Document Orientation: PP-LCNet_x1_0_doc_ori")
    print("    ├─ Textline Orientation: PP-LCNet_x1_0_textline_ori")
    print("    ├─ Text Detector:        PP-OCRv6_medium_det (DBNet-based)")
    print("    └─ Text Recognizer:      PP-OCRv6_medium_rec (SVTR/CRNN-based)")

    # 2. Run Pipeline
    results = ocr.predict(str(image_path))
    res = results[0]

    # Inspect Stage 1: Preprocessor results
    doc_prep = res.get("doc_preprocessor_res", {})
    doc_angle = doc_prep.get("angle", 0)
    print(f"\n[2] Stage 1 - Document Preprocessing:")
    print(f"    ├─ Detected Global Rotation Angle: {doc_angle}°")
    print(f"    └─ Unwarping Applied: {doc_prep.get('model_settings', {}).get('use_doc_unwarping', False)}")

    # Inspect Stage 2: Detection Polygons
    dt_polys = res.get("dt_polys", [])
    rec_boxes = res.get("rec_boxes", [])
    print(f"\n[3] Stage 2 - Text Detection (DBNet):")
    print(f"    ├─ Total Text Regions Localized: {len(dt_polys)} regions")
    for i, poly in enumerate(dt_polys[:3], 1):
        print(f"    │  Region #{i} Bounding Polygon: {poly.tolist()}")
    if len(dt_polys) > 3:
        print(f"    │  ... and {len(dt_polys) - 3} more regions")

    # Inspect Stage 3 & 4: Line Orientation & Recognition on Crops
    rec_texts = res.get("rec_texts", [])
    rec_scores = res.get("rec_scores", [])
    angles = res.get("textline_orientation_angles", [])

    print(f"\n[4] Stage 3 & 4 - Textline Classification & Recognition:")
    original_img = Image.open(image_path).convert("RGB")

    print(f"    {'Crop #':<8} | {'Angle':<6} | {'Confidence':<10} | {'Extracted Text'}")
    print("    " + "-" * 65)

    for i, (text, score, box, angle) in enumerate(zip(rec_texts, rec_scores, rec_boxes, angles), 1):
        x1, y1, x2, y2 = [int(v) for v in box]
        # Ensure valid crop boundaries
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(original_img.width, x2), min(original_img.height, y2)
        crop = original_img.crop((x1, y1, x2, y2))
        crop_path = crops_dir / f"crop_{i:02d}.png"
        crop.save(crop_path)

        angle_str = f"{angle}°" if angle is not None else "0°"
        print(f"    #{i:<7} | {angle_str:<6} | {score * 100:6.2f}%    | '{text}'")

    print("    " + "-" * 65)
    stage_viz_path = output_dir / f"stages_{image_path.stem}.png"
    stage_data = {
        "doc_angle": doc_angle,
        "unwarped": doc_prep.get("model_settings", {}).get("use_doc_unwarping", False),
        "dt_polys": dt_polys,
        "rec_texts": rec_texts,
        "rec_scores": rec_scores,
        "line_angles": [a if a is not None else 0 for a in angles],
    }
    draw_pipeline_stages(image_path, stage_data, output_path=stage_viz_path)

    print(f"\n[5] Summary of Exported Artifacts:")
    print(f"    ├─ Cropped Textlines:  {crops_dir.resolve()}")
    print(f"    ├─ Multi-Stage Visual: {stage_viz_path.resolve()}")
    print(f"    └─ Full Directory:     {output_dir.resolve()}")

if __name__ == "__main__":
    samples = generate_all_samples()
    inspect_pipeline_stages(samples["rotated_180"])
