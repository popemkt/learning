"""
Synthetic sample image generator for PaddleOCR testing.
Generates various challenging and realistic test images:
1. Basic text card
2. Receipt / Invoice with structured layout
3. Rotated text badge (testing angle classification)
4. Multilingual & special characters snippet
"""

import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


def create_sample_card(output_path: Path) -> Path:
    """Creates a basic card with various text colors, sizes, and fonts."""
    img = Image.new("RGB", (600, 220), color=(248, 249, 250))
    draw = ImageDraw.Draw(img)

    # Header banner
    draw.rectangle([(0, 0), (600, 45)], fill=(30, 41, 59))
    draw.text((20, 12), "PaddleOCR Evaluation Suite", fill=(255, 255, 255))

    # Body items
    draw.text((25, 65), "Question: Is it a model or infrastructure?", fill=(15, 23, 42))
    draw.text((25, 100), "Answer: It is a full ecosystem + modular model pipeline.", fill=(37, 99, 235))
    draw.text((25, 135), "Detection: DBNet / Recognition: SVTR / Orientation: PP-LCNet", fill=(71, 85, 105))
    draw.text((25, 175), "Status: 100% Ready for Production Deployment", fill=(22, 101, 52))

    img.save(output_path)
    return output_path


def create_sample_receipt(output_path: Path) -> Path:
    """Creates a realistic store receipt with structured key-value pairs."""
    width, height = 450, 480
    img = Image.new("RGB", (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Header
    draw.text((140, 20), "TECH COFFEE LAB", fill=(0, 0, 0))
    draw.text((155, 45), "Order #48291", fill=(80, 80, 80))
    draw.text((130, 65), "Date: 2026-08-24 10:45", fill=(80, 80, 80))

    # Divider
    draw.line([(30, 95), (420, 95)], fill=(180, 180, 180), width=1)

    # Column headers
    draw.text((35, 110), "ITEM", fill=(50, 50, 50))
    draw.text((260, 110), "QTY", fill=(50, 50, 50))
    draw.text((360, 110), "PRICE", fill=(50, 50, 50))

    draw.line([(30, 130), (420, 130)], fill=(220, 220, 220), width=1)

    # Line items
    items = [
        ("Espresso Doppio", "2", "$8.00"),
        ("Oat Milk Flat White", "1", "$5.50"),
        ("Almond Croissant", "1", "$4.75"),
        ("Cold Brew Concentrate", "1", "$12.00"),
    ]

    y = 145
    for name, qty, price in items:
        draw.text((35, y), name, fill=(0, 0, 0))
        draw.text((270, y), qty, fill=(0, 0, 0))
        draw.text((360, y), price, fill=(0, 0, 0))
        y += 30

    # Summary
    draw.line([(30, y + 10), (420, y + 10)], fill=(180, 180, 180), width=1)
    y += 25
    draw.text((35, y), "Subtotal:", fill=(60, 60, 60))
    draw.text((360, y), "$30.25", fill=(0, 0, 0))

    y += 25
    draw.text((35, y), "Tax (8.25%):", fill=(60, 60, 60))
    draw.text((360, y), "$2.50", fill=(0, 0, 0))

    y += 25
    draw.text((35, y), "TOTAL:", fill=(0, 0, 0))
    draw.text((360, y), "$32.75", fill=(0, 0, 0))

    # Footer
    y += 45
    draw.text((135, y), "Thank you for visiting!", fill=(100, 100, 100))

    img.save(output_path)
    return output_path


def create_sample_rotated(output_path: Path, angle: int = 180) -> Path:
    """Creates a text image and rotates it by 180 or 90 degrees to test orientation models."""
    img = Image.new("RGB", (400, 140), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    draw.rectangle([(10, 10), (390, 130)], outline=(220, 38, 38), width=3)
    draw.text((30, 30), "WARNING: INVERTED TEXT", fill=(220, 38, 38))
    draw.text((30, 60), f"Rotated by {angle} degrees", fill=(0, 0, 0))
    draw.text((30, 90), "PP-LCNet orientation test", fill=(70, 70, 70))

    rotated = img.rotate(angle, expand=True)
    rotated.save(output_path)
    return output_path


def generate_all_samples(target_dir: Path | None = None) -> dict[str, Path]:
    """Generates all standard test samples into the target directory."""
    if target_dir is None:
        target_dir = Path(__file__).parent.parent / "samples"
    target_dir.mkdir(parents=True, exist_ok=True)

    samples = {
        "card": create_sample_card(target_dir / "sample_card.png"),
        "receipt": create_sample_receipt(target_dir / "sample_receipt.png"),
        "rotated_180": create_sample_rotated(target_dir / "sample_rotated_180.png", angle=180),
        "rotated_90": create_sample_rotated(target_dir / "sample_rotated_90.png", angle=90),
    }
    return samples


if __name__ == "__main__":
    generated = generate_all_samples()
    print("Generated sample images:")
    for name, path in generated.items():
        print(f"  - {name}: {path.resolve()}")
