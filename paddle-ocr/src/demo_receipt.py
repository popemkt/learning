"""
Practical Application Demo: Structured Receipt / Invoice Parsing with PaddleOCR.
Shows how downstream applications use PaddleOCR's spatial bounding boxes
and confidence scores to extract structured data (Key-Value pairs & Line Items).
"""

import json
import re
from pathlib import Path
from paddleocr import PaddleOCR
from generate_samples import generate_all_samples
from visualizer import draw_structured_receipt


class ReceiptParser:
    """Parses raw PaddleOCR boxes and text into a structured receipt object."""

    def __init__(self, ocr_engine: PaddleOCR | None = None):
        self.ocr = ocr_engine or PaddleOCR(use_textline_orientation=True, use_doc_orientation_classify=True, use_doc_unwarping=False, lang="en")

    def parse(self, image_path: str | Path) -> dict:
        results = self.ocr.predict(str(image_path))
        if not results:
            return {}

        res = results[0]
        rec_texts = res.get("rec_texts", [])
        rec_scores = res.get("rec_scores", [])
        rec_boxes = res.get("rec_boxes", [])

        # Create structured tokens with geometric coordinates
        tokens = []
        for text, score, box in zip(rec_texts, rec_scores, rec_boxes):
            x1, y1, x2, y2 = [float(v) for v in box]
            tokens.append({
                "text": text.strip(),
                "score": float(score),
                "bbox": [x1, y1, x2, y2],
                "y_mid": (y1 + y2) / 2.0,
                "x_min": x1,
                "x_max": x2,
            })

        # Sort tokens top-to-bottom
        tokens.sort(key=lambda t: t["y_mid"])

        parsed = {
            "merchant": None,
            "order_number": None,
            "date": None,
            "line_items": [],
            "subtotal": None,
            "tax": None,
            "total": None,
            "raw_text_lines": [t["text"] for t in tokens],
            "_tokens": [{"text": t["text"], "box": t["bbox"]} for t in tokens],
        }
        # Spatial line grouping: group tokens that share approximately the same vertical midline
        lines = self._group_into_horizontal_lines(tokens, y_threshold=10.0)

        for line in lines:
            line_str = " ".join([t["text"] for t in line])

            # Merchant header
            if "TECH COFFEE" in line_str.upper() or "COFFEE LAB" in line_str.upper():
                parsed["merchant"] = line_str

            # Order #
            order_match = re.search(r"Order\s*#?(\d+)", line_str, re.IGNORECASE)
            if order_match:
                parsed["order_number"] = order_match.group(1)

            # Date
            date_match = re.search(r"(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?)", line_str)
            if date_match:
                parsed["date"] = date_match.group(1)

            # Totals
            if "SUBTOTAL" in line_str.upper():
                price = self._extract_price(line_str)
                if price:
                    parsed["subtotal"] = price
            elif "TAX" in line_str.upper():
                price = self._extract_price(line_str)
                if price:
                    parsed["tax"] = price
            elif "TOTAL" in line_str.upper() and "SUBTOTAL" not in line_str.upper():
                price = self._extract_price(line_str)
                if price:
                    parsed["total"] = price
            else:
                # Potential line item (must have a price at the right side)
                price_match = re.search(r"\$(\d+\.\d{2})", line_str)
                if price_match and not any(kw in line_str.upper() for kw in ["PRICE", "TOTAL", "SUBTOTAL", "TAX"]):
                    # Extract qty if present
                    qty_match = re.search(r"\b(\d+)\b", line_str)
                    qty = int(qty_match.group(1)) if qty_match else 1
                    # Clean item name
                    item_name = re.sub(r"\$(\d+\.\d{2})|\b\d+\b", "", line_str).strip()
                    parsed["line_items"].append({
                        "name": item_name or "Unknown Item",
                        "quantity": qty,
                        "price": float(price_match.group(1)),
                        "line_raw": line_str,
                    })

        return parsed

    def _group_into_horizontal_lines(self, tokens: list[dict], y_threshold: float = 10.0) -> list[list[dict]]:
        lines: list[list[dict]] = []
        for tok in tokens:
            placed = False
            for line in lines:
                avg_y = sum(t["y_mid"] for t in line) / len(line)
                if abs(tok["y_mid"] - avg_y) <= y_threshold:
                    line.append(tok)
                    placed = True
                    break
            if not placed:
                lines.append([tok])

        for line in lines:
            line.sort(key=lambda t: t["x_min"])
        return lines

    def _extract_price(self, text: str) -> float | None:
        # Prefer price preceded by $ sign to avoid matching percentages like (8.25%)
        match = re.search(r"\$(\d+\.\d{2})", text)
        if match:
            return float(match.group(1))
        # Fallback to standalone decimal number
        match = re.search(r"\b(\d+\.\d{2})\b", text)
        return float(match.group(1)) if match else None
def demo_receipt_extraction(image_path: str | Path) -> None:
    print("=" * 75)
    print("STRUCTURED RECEIPT EXTRACTION USING PADDLEOCR")
    print("=" * 75)

    parser = ReceiptParser()
    parsed_data = parser.parse(image_path)

    print("\n--- Extracted Structured JSON ---")
    print(json.dumps(parsed_data, indent=2))

    print("\n--- Key Fields ---")
    print(f"Merchant:     {parsed_data.get('merchant')}")
    print(f"Order #:      {parsed_data.get('order_number')}")
    print(f"Date:         {parsed_data.get('date')}")
    print(f"Items Count:  {len(parsed_data.get('line_items', []))}")
    print(f"Subtotal:     ${parsed_data.get('subtotal')}")
    print(f"Tax:          ${parsed_data.get('tax')}")
    print(f"Total:        ${parsed_data.get('total')}")

    output_dir = Path(image_path).parent.parent / "output"
    annotated_path = output_dir / f"annotated_{Path(image_path).stem}.png"
    draw_structured_receipt(image_path, parsed_data, output_path=annotated_path)
    print(f"\n[Visualizer] Structured receipt visualization saved to: {annotated_path.resolve()}")
if __name__ == "__main__":
    samples = generate_all_samples()
    demo_receipt_extraction(samples["receipt"])
