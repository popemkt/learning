"""
Standalone CLI tool to run PaddleOCR on any image and draw the annotated visual result.
Usage:
    python src/draw_results.py [image_path] [--receipt] [--no-side-by-side]
"""

import argparse
import sys
from pathlib import Path
from paddleocr import PaddleOCR
from visualizer import draw_ocr_annotations, draw_structured_receipt
from generate_samples import generate_all_samples


def main() -> None:
    parser = argparse.ArgumentParser(description="Run PaddleOCR and draw visual annotated results.")
    parser.add_argument("image", nargs="?", default=None, help="Path to input image (defaults to sample card)")
    parser.add_argument("--receipt", action="store_true", help="Parse and draw as structured receipt")
    parser.add_argument("--output-dir", default=None, help="Custom output directory")
    parser.add_argument("--no-side-by-side", action="store_true", help="Save only the annotated image without comparison canvas")
    args = parser.parse_args()

    # Determine input image
    if args.image:
        image_path = Path(args.image)
    else:
        samples = generate_all_samples()
        image_path = samples["receipt"] if args.receipt else samples["card"]

    if not image_path.exists():
        print(f"Error: Image '{image_path}' not found.")
        sys.exit(1)

    output_dir = Path(args.output_dir) if args.output_dir else image_path.parent.parent / "output"
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"[*] Processing image: {image_path.resolve()}")
    ocr = PaddleOCR(use_textline_orientation=True, use_doc_orientation_classify=True, use_doc_unwarping=False, lang="en")

    if args.receipt:
        from demo_receipt import ReceiptParser
        parser_engine = ReceiptParser(ocr_engine=ocr)
        parsed = parser_engine.parse(image_path)
        out_file = output_dir / f"drawn_receipt_{image_path.stem}.png"
        draw_structured_receipt(image_path, parsed, output_path=out_file)
        print(f"[✓] Structured receipt visual drawn to: {out_file.resolve()}")
    else:
        results = ocr.predict(str(image_path))
        out_file = output_dir / f"drawn_{image_path.stem}.png"
        draw_ocr_annotations(
            image_path,
            results,
            output_path=out_file,
            show_side_by_side=not args.no_side_by_side,
        )
        print(f"[✓] Annotated visual image drawn to: {out_file.resolve()}")


if __name__ == "__main__":
    main()
