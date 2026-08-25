"""
PaddleOCR Quickstart & Basic Inference Demo.
Demonstrates loading the pipeline, predicting on an image, and formatting the output.
"""

import sys
import time
from pathlib import Path
from paddleocr import PaddleOCR
from generate_samples import generate_all_samples


def run_basic_ocr(image_path: str | Path) -> list[dict]:
    """Runs PaddleOCR prediction on a single image and prints structured results."""
    image_path = Path(image_path)
    if not image_path.exists():
        raise FileNotFoundError(f"Image not found at {image_path}")

    print("=" * 70)
    print(f"Running PaddleOCR on: {image_path.name}")
    print("=" * 70)

    # Initialize PaddleOCR engine
    start_init = time.perf_counter()
    ocr = PaddleOCR(use_textline_orientation=True, lang="en")
    init_time = (time.perf_counter() - start_init) * 1000
    print(f"[Engine] Loaded in {init_time:.2f} ms")

    # Run inference
    start_infer = time.perf_counter()
    results = ocr.predict(str(image_path))
    infer_time = (time.perf_counter() - start_infer) * 1000
    print(f"[Inference] Completed in {infer_time:.2f} ms")

    output_dir = image_path.parent.parent / "output"
    output_dir.mkdir(parents=True, exist_ok=True)

    extracted_records = []
    print("\n--- Extracted Text Lines ---")
    print(f"{'#':<3} | {'Confidence':<10} | {'Bounding Box (x1,y1,x2,y2)':<25} | {'Recognized Text'}")
    print("-" * 75)

    for res in results:
        # Save visualization and JSON
        res.save_to_img(str(output_dir))
        res.save_to_json(str(output_dir))

        rec_texts = res.get("rec_texts", [])
        rec_scores = res.get("rec_scores", [])
        rec_boxes = res.get("rec_boxes", [])

        for idx, (text, score, box) in enumerate(zip(rec_texts, rec_scores, rec_boxes), 1):
            box_list = box.tolist() if hasattr(box, "tolist") else list(box)
            box_str = f"[{box_list[0]}, {box_list[1]}, {box_list[2]}, {box_list[3]}]"
            print(f"{idx:<3} | {score * 100:6.2f}%    | {box_str:<25} | {text}")
            extracted_records.append({
                "index": idx,
                "text": text,
                "confidence": float(score),
                "box": box_list,
            })

    print("-" * 75)
    print(f"Visualized annotated image saved to: {output_dir.resolve()}")
    return extracted_records


if __name__ == "__main__":
    samples = generate_all_samples()
    target_image = sys.argv[1] if len(sys.argv) > 1 else samples["card"]
    run_basic_ocr(target_image)
