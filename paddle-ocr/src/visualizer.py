"""
Visualization and Result Drawing Utilities for PaddleOCR.
Draws high-contrast bounding boxes, text labels, confidence scores,
pipeline stage breakdowns, and semantic receipt overlays on images.
"""

from __future__ import annotations
from pathlib import Path
from typing import Any, Sequence
import numpy as np
from PIL import Image, ImageDraw, ImageFont


def _get_font(size: int = 14) -> ImageFont.ImageFont:
    """Attempts to load a standard truetype font, falls back to default."""
    font_candidates = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "DejaVuSans.ttf",
        "arial.ttf",
    ]
    for font_path in font_candidates:
        try:
            return ImageFont.truetype(font_path, size)
        except Exception:
            continue
    try:
        return ImageFont.load_default(size=size)
    except Exception:
        return ImageFont.load_default()


def _extract_res_dict(results: Any) -> dict[str, Any]:
    """Helper to unwrap first dict from results if list."""
    if isinstance(results, list) and len(results) > 0 and isinstance(results[0], dict):
        return results[0]
    elif isinstance(results, dict):
        return results
    return {}


def draw_ocr_annotations(
    image_input: str | Path | Image.Image,
    results: Any,
    output_path: str | Path | None = None,
    show_side_by_side: bool = True,
) -> Image.Image:
    """
    Draws bounding boxes/polygons, recognized text strings, and confidence scores onto the image.
    Automatically handles preprocessor orientation rectification so bounding boxes match pixel-perfect.
    """
    if isinstance(image_input, (str, Path)):
        orig_img = Image.open(image_input).convert("RGB")
    else:
        orig_img = image_input.convert("RGB")

    res = _extract_res_dict(results)
    boxes = res.get("rec_boxes", [])
    texts = res.get("rec_texts", [])
    scores = res.get("rec_scores", [])
    polys = res.get("dt_polys", res.get("rec_polys", []))
    doc_prep = res.get("doc_preprocessor_res", {})
    doc_angle = doc_prep.get("angle", 0) if doc_prep else 0

    # If the document preprocessor rotated the image, use the rectified image for drawing
    if doc_prep and doc_prep.get("output_img") is not None:
        out_img_arr = doc_prep["output_img"]
        if isinstance(out_img_arr, np.ndarray):
            # Convert OpenCV BGR to RGB
            annotated_img = Image.fromarray(out_img_arr[:, :, ::-1])
        else:
            annotated_img = orig_img.copy()
    else:
        annotated_img = orig_img.copy()

    draw = ImageDraw.Draw(annotated_img, "RGBA")
    font = _get_font(size=13)
    header_font = _get_font(size=15)

    # Distinctive palette for consecutive text regions
    colors = [
        (37, 99, 235),    # Blue
        (16, 185, 129),   # Emerald
        (217, 119, 6),    # Amber
        (147, 51, 234),   # Purple
        (225, 29, 72),    # Rose
        (13, 148, 136),   # Teal
    ]

    for idx, (text, score) in enumerate(zip(texts, scores)):
        color = colors[idx % len(colors)]
        
        # Get polygon if available, otherwise box
        if idx < len(polys) and len(polys[idx]) >= 4:
            poly = polys[idx]
            poly_pts = [(int(p[0]), int(p[1])) for p in poly]
            draw.polygon(poly_pts, fill=color + (40,), outline=color, width=2)
            x1 = min(p[0] for p in poly_pts)
            y1 = min(p[1] for p in poly_pts)
        elif idx < len(boxes):
            box = boxes[idx]
            x1, y1, x2, y2 = [int(v) for v in box]
            draw.rectangle([(x1, y1), (x2, y2)], fill=color + (40,), outline=color, width=2)
        else:
            continue

        # Draw compact badge label with index, confidence %, and recognized text
        badge_text = f"#{idx+1} [{score*100:.1f}%] {text}"
        try:
            bbox = font.getbbox(badge_text)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
        except Exception:
            tw, th = len(badge_text) * 7, 12

        badge_h = th + 6
        badge_w = tw + 8
        badge_y1 = max(0, y1 - badge_h)
        badge_y2 = badge_y1 + badge_h
        badge_x1 = max(0, x1)
        badge_x2 = min(annotated_img.width, badge_x1 + badge_w)

        draw.rectangle([(badge_x1, badge_y1), (badge_x2, badge_y2)], fill=color + (230,))
        draw.text((badge_x1 + 4, badge_y1 + 2), badge_text, fill=(255, 255, 255), font=font)

    if not show_side_by_side:
        final_img = annotated_img
    else:
        # Create Side-by-Side Comparison Canvas
        w1, h1 = orig_img.width, orig_img.height
        w2, h2 = annotated_img.width, annotated_img.height
        max_h = max(h1, h2)
        header_h = 42
        padding = 16
        total_w = w1 + w2 + (padding * 3)
        total_h = max_h + header_h + (padding * 2)

        final_img = Image.new("RGB", (total_w, total_h), color=(241, 245, 249))
        canvas_draw = ImageDraw.Draw(final_img)

        # Title headers
        orig_title = f"Original Input Image ({w1}x{h1})"
        if doc_angle != 0:
            orig_title += f" [Rotated {doc_angle}°]"
        canvas_draw.text((padding + 8, padding + 8), orig_title, fill=(15, 23, 42), font=header_font)

        annotated_title = f"PaddleOCR Detection & Recognition ({len(texts)} lines)"
        if doc_angle != 0:
            annotated_title += f" [Rectified {doc_angle}° -> 0°]"
        canvas_draw.text((padding * 2 + w1 + 8, padding + 8), annotated_title, fill=(15, 23, 42), font=header_font)

        # Paste images
        final_img.paste(orig_img, (padding, padding + header_h))
        final_img.paste(annotated_img, (padding * 2 + w1, padding + header_h))

        # Borders
        canvas_draw.rectangle([(padding, padding + header_h), (padding + w1, padding + header_h + h1)], outline=(203, 213, 225), width=1)
        canvas_draw.rectangle([(padding * 2 + w1, padding + header_h), (padding * 2 + w1 + w2, padding + header_h + h2)], outline=(203, 213, 225), width=1)

    if output_path:
        out_p = Path(output_path)
        out_p.parent.mkdir(parents=True, exist_ok=True)
        final_img.save(out_p)

    return final_img


def draw_structured_receipt(
    image_input: str | Path | Image.Image,
    parsed_data: dict[str, Any],
    output_path: str | Path | None = None,
) -> Image.Image:
    """
    Draws semantic color-coded bounding boxes and an analytical structured receipt panel.
    """
    if isinstance(image_input, (str, Path)):
        orig_img = Image.open(image_input).convert("RGB")
    else:
        orig_img = image_input.convert("RGB")

    annotated_img = orig_img.copy()
    draw = ImageDraw.Draw(annotated_img, "RGBA")
    font = _get_font(size=12)
    bold_font = _get_font(size=14)
    title_font = _get_font(size=15)

    colors = {
        "merchant": (147, 51, 234),     # Purple
        "metadata": (2, 132, 199),      # Sky blue
        "item": (22, 163, 74),          # Green
        "price": (217, 119, 6),         # Amber
        "total": (225, 29, 72),         # Red
        "generic": (100, 116, 139),     # Slate
    }

    raw_tokens = parsed_data.get("_tokens", [])
    for tok in raw_tokens:
        text = tok.get("text", "")
        box = tok.get("box", [0, 0, 0, 0])
        x1, y1, x2, y2 = [int(v) for v in box]

        # Categorize
        cat = "generic"
        if parsed_data.get("merchant") and parsed_data["merchant"] in text:
            cat = "merchant"
        elif any(k in text for k in ["Order #", "Date:"]):
            cat = "metadata"
        elif any(k in text for k in ["TOTAL:", "Subtotal:", "Tax"]):
            cat = "total"
        elif "$" in text:
            cat = "price"
        elif any(item.get("name") and item["name"] in text for item in parsed_data.get("line_items", [])):
            cat = "item"

        col = colors[cat]
        draw.rectangle([(x1, y1), (x2, y2)], fill=col + (45,), outline=col, width=2)

    # 3-Panel Canvas: [ Original | Semantic Highlight Overlays | Structured JSON Panel ]
    w, h = orig_img.width, orig_img.height
    header_h = 42
    padding = 16
    panel_w = max(360, w)
    total_w = (w * 2) + panel_w + (padding * 4)
    total_h = max(h + header_h + (padding * 2), 520)

    canvas = Image.new("RGB", (total_w, total_h), color=(248, 250, 252))
    cdraw = ImageDraw.Draw(canvas)

    # Titles
    cdraw.text((padding + 8, padding + 8), "1. Original Receipt", fill=(15, 23, 42), font=title_font)
    cdraw.text((padding * 2 + w + 8, padding + 8), "2. Semantic Overlays", fill=(15, 23, 42), font=title_font)
    cdraw.text((padding * 3 + (w * 2) + 8, padding + 8), "3. Structured Extraction Card", fill=(15, 23, 42), font=title_font)

    canvas.paste(orig_img, (padding, padding + header_h))
    canvas.paste(annotated_img, (padding * 2 + w, padding + header_h))

    # Summary Panel Card
    p3_x = padding * 3 + (w * 2)
    p3_y = padding + header_h
    p3_w = panel_w
    p3_h = total_h - p3_y - padding

    cdraw.rectangle([(p3_x, p3_y), (p3_x + p3_w, p3_y + p3_h)], fill=(255, 255, 255), outline=(226, 232, 240), width=1)

    cy = p3_y + 16
    cdraw.text((p3_x + 16, cy), f"Merchant: {parsed_data.get('merchant', 'N/A')}", fill=colors["merchant"], font=bold_font)
    cy += 24
    cdraw.text((p3_x + 16, cy), f"Order #: {parsed_data.get('order_number', 'N/A')}  |  Date: {parsed_data.get('date', 'N/A')}", fill=colors["metadata"], font=font)
    cy += 22
    cdraw.line([(p3_x + 16, cy), (p3_x + p3_w - 16, cy)], fill=(226, 232, 240), width=1)
    cy += 12

    cdraw.text((p3_x + 16, cy), "LINE ITEMS:", fill=(71, 85, 105), font=bold_font)
    cy += 20

    for item in parsed_data.get("line_items", []):
        qty = item.get("quantity", 1)
        name = item.get("name", "")
        price = item.get("price", 0.0)
        item_line = f"• ({qty}x) {name}"
        price_str = f"${price:.2f}"
        cdraw.text((p3_x + 20, cy), item_line, fill=(15, 23, 42), font=font)
        cdraw.text((p3_x + p3_w - 75, cy), price_str, fill=colors["price"], font=bold_font)
        cy += 20

    cy += 8
    cdraw.line([(p3_x + 16, cy), (p3_x + p3_w - 16, cy)], fill=(226, 232, 240), width=1)
    cy += 12

    subtotal = parsed_data.get("subtotal")
    tax = parsed_data.get("tax")
    total = parsed_data.get("total")

    if subtotal is not None:
        cdraw.text((p3_x + 20, cy), "Subtotal:", fill=(71, 85, 105), font=font)
        cdraw.text((p3_x + p3_w - 75, cy), f"${subtotal:.2f}", fill=(71, 85, 105), font=font)
        cy += 20
    if tax is not None:
        cdraw.text((p3_x + 20, cy), "Tax:", fill=(71, 85, 105), font=font)
        cdraw.text((p3_x + p3_w - 75, cy), f"${tax:.2f}", fill=(71, 85, 105), font=font)
        cy += 20
    if total is not None:
        cy += 4
        cdraw.text((p3_x + 20, cy), "TOTAL AMOUNT:", fill=colors["total"], font=bold_font)
        cdraw.text((p3_x + p3_w - 80, cy), f"${total:.2f}", fill=colors["total"], font=bold_font)

    if output_path:
        out_p = Path(output_path)
        out_p.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(out_p)

    return canvas


def draw_pipeline_stages(
    image_input: str | Path | Image.Image,
    stage_data: dict[str, Any],
    output_path: str | Path | None = None,
) -> Image.Image:
    """
    Draws the multi-stage architecture dissection onto an explanatory graphic.
    """
    if isinstance(image_input, (str, Path)):
        orig_img = Image.open(image_input).convert("RGB")
    else:
        orig_img = image_input.convert("RGB")

    w, h = orig_img.width, orig_img.height
    padding = 16
    card_w = max(320, w)
    total_w = (card_w * 3) + (padding * 4)
    total_h = max(h + 140, 480)

    canvas = Image.new("RGB", (total_w, total_h), color=(241, 245, 249))
    cdraw = ImageDraw.Draw(canvas)
    title_font = _get_font(size=15)
    bold_font = _get_font(size=13)
    font = _get_font(size=12)

    # Panel 1: Input & Global Preprocessor
    p1_x = padding
    p1_y = padding
    cdraw.text((p1_x + 8, p1_y + 8), "Stage 1: Doc Preprocessing", fill=(15, 23, 42), font=title_font)
    canvas.paste(orig_img, (p1_x, p1_y + 42))
    angle = stage_data.get("doc_angle", 0)
    unwarped = stage_data.get("unwarped", False)
    cdraw.text((p1_x + 8, p1_y + 45 + h + 10), f"Detected Global Angle: {angle}°", fill=(225, 29, 72) if angle != 0 else (22, 163, 74), font=bold_font)
    cdraw.text((p1_x + 8, p1_y + 45 + h + 28), f"UVDoc Unwarping: {'Active' if unwarped else 'Disabled (Preserved 2D)'}", fill=(71, 85, 105), font=font)

    # Panel 2: DBNet Text Detection Polygons on Rectified Image
    p2_x = padding * 2 + card_w
    p2_y = padding
    cdraw.text((p2_x + 8, p2_y + 8), "Stage 2: Text Detection (DBNet)", fill=(15, 23, 42), font=title_font)

    # Base image for stage 2: use rectified image if rotated
    if angle != 0:
        base_stage2 = orig_img.rotate(-angle if angle in [90, 270] else angle, expand=True)
    else:
        base_stage2 = orig_img.copy()

    det_img = base_stage2.copy()
    det_draw = ImageDraw.Draw(det_img, "RGBA")
    polys = stage_data.get("dt_polys", [])
    for poly in polys:
        poly_pts = [(int(p[0]), int(p[1])) for p in poly]
        det_draw.polygon(poly_pts, fill=(59, 130, 246, 50), outline=(37, 99, 235), width=2)

    canvas.paste(det_img, (p2_x, p2_y + 42))
    cdraw.text((p2_x + 8, p2_y + 45 + h + 10), f"Localized Regions: {len(polys)} polygons", fill=(37, 99, 235), font=bold_font)

    # Panel 3: Textline Orientation & CTC Recognition
    p3_x = padding * 3 + (card_w * 2)
    p3_y = padding
    cdraw.text((p3_x + 8, p3_y + 8), "Stage 3 & 4: Line Ori + Rec (SVTR)", fill=(15, 23, 42), font=title_font)

    cdraw.rectangle([(p3_x, p3_y + 42), (p3_x + card_w, p3_y + 42 + h + 60)], fill=(255, 255, 255), outline=(203, 213, 225), width=1)
    ry = p3_y + 52
    texts = stage_data.get("rec_texts", [])
    scores = stage_data.get("rec_scores", [])
    angles = stage_data.get("line_angles", [])

    for idx, (t, s, a) in enumerate(zip(texts, scores, angles)):
        cdraw.text((p3_x + 12, ry), f"#{idx+1} [Line Ori: {a}°] ({s*100:.1f}%)", fill=(2, 132, 199), font=bold_font)
        ry += 18
        cdraw.text((p3_x + 12, ry), f"  '{t}'", fill=(15, 23, 42), font=font)
        ry += 24

    if output_path:
        out_p = Path(output_path)
        out_p.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(out_p)

    return canvas
