#!/usr/bin/env python3
"""
PDF placeholder replacement using PyMuPDF (fitz).

Usage:
    python3 pdf_replace.py <input_pdf> <output_pdf> <replacements_json>

Where replacements_json is a JSON string like:
    '{"{{FIO}}": "Иванов Иван", "{{Date}}": "01.04.2026"}'

Exit codes:
    0 - success
    1 - error (message printed to stderr)
"""

import sys
import json
import fitz  # PyMuPDF
import os
import re

# Preferred fonts for Cyrillic support (in order of preference)
# Includes paths for both Debian/Ubuntu and Alpine Linux
FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",       # Debian/Ubuntu
    "/usr/share/fonts/dejavu/DejaVuSans.ttf",                 # Alpine
    "/usr/share/fonts/TTF/DejaVuSans.ttf",                    # Alpine alt
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
    "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
]

FONT_BOLD_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",   # Debian/Ubuntu
    "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",             # Alpine
    "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",                # Alpine alt
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
]


def find_font(candidates):
    for path in candidates:
        if os.path.exists(path):
            return path
    return None


def replace_placeholders(input_path, output_path, replacements):
    """
    Open a PDF, find all {{...}} placeholders, remove them via redaction,
    and insert replacement text with a Cyrillic-capable font.
    """
    font_path = find_font(FONT_CANDIDATES)
    font_bold_path = find_font(FONT_BOLD_CANDIDATES)

    if not font_path:
        raise RuntimeError("No Cyrillic-capable font found on the system")

    doc = fitz.open(input_path)
    total_replaced = 0

    for page_num in range(len(doc)):
        page = doc[page_num]

        # Collect all placeholder positions and their text properties
        redaction_tasks = []

        for placeholder, value in replacements.items():
            if not value or str(value).strip() == "":
                continue

            value = str(value)
            rects = page.search_for(placeholder)

            for rect in rects:
                # Extract original text properties (font size, color, flags)
                fontsize = 11.0
                color = (0, 0, 0)
                is_bold = False

                blocks = page.get_text("dict", clip=rect)["blocks"]
                for block in blocks:
                    for line in block.get("lines", []):
                        for span in line.get("spans", []):
                            if placeholder in span.get("text", ""):
                                fontsize = span["size"]
                                # Color is stored as int, convert to RGB tuple
                                c = span.get("color", 0)
                                color = (
                                    ((c >> 16) & 0xFF) / 255.0,
                                    ((c >> 8) & 0xFF) / 255.0,
                                    (c & 0xFF) / 255.0,
                                )
                                flags = span.get("flags", 0)
                                is_bold = bool(flags & 2 ** 4)  # bit 4 = bold
                                break

                redaction_tasks.append({
                    "rect": rect,
                    "placeholder": placeholder,
                    "value": value,
                    "fontsize": fontsize,
                    "color": color,
                    "is_bold": is_bold,
                })

        if not redaction_tasks:
            continue

        # Step 1: Add redaction annotations to remove old text
        for task in redaction_tasks:
            # Use white fill to cover the original text area
            page.add_redact_annot(task["rect"], text="", fill=(1, 1, 1))

        # Step 2: Apply all redactions (actually removes the text)
        page.apply_redactions()

        # Step 3: Insert new text at original positions
        for task in redaction_tasks:
            rect = task["rect"]
            chosen_font = font_bold_path if task["is_bold"] and font_bold_path else font_path

            # Calculate insertion point (baseline position)
            # rect.y1 is the bottom, subtract a small offset for baseline
            baseline_y = rect.y1 - (rect.height * 0.15)

            page.insert_text(
                (rect.x0, baseline_y),
                task["value"],
                fontsize=task["fontsize"],
                fontname="custom-font",
                fontfile=chosen_font,
                color=task["color"],
            )
            total_replaced += 1

    doc.save(output_path, garbage=4, deflate=True)
    doc.close()

    return total_replaced


def main():
    if len(sys.argv) != 4:
        print(
            "Usage: python3 pdf_replace.py <input_pdf> <output_pdf> <replacements_json>",
            file=sys.stderr,
        )
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    replacements_json = sys.argv[3]

    if not os.path.exists(input_path):
        print(f"Input file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    try:
        replacements = json.loads(replacements_json)
    except json.JSONDecodeError as e:
        print(f"Invalid JSON: {e}", file=sys.stderr)
        sys.exit(1)

    try:
        count = replace_placeholders(input_path, output_path, replacements)
        # Output result as JSON for the Node.js caller
        result = {
            "success": True,
            "replacements_made": count,
            "output_path": output_path,
        }
        print(json.dumps(result))
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
