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


def find_placeholder_rects(page, placeholder):
    """
    Find placeholder text in a PDF page. Uses multiple strategies:
    1. Direct search_for() — works when text is in a single span
    2. Span-level text scan — works when text is split across spans
    3. Full page text scan — fallback for complex layouts
    """
    # Strategy 1: Direct search (fastest, works for simple cases)
    rects = page.search_for(placeholder)
    if rects:
        return rects

    # Strategy 2: Scan all text spans and find the placeholder
    # This handles cases where {{Дата}} is split across spans
    results = []
    blocks = page.get_text("dict")["blocks"]

    for block in blocks:
        for line in block.get("lines", []):
            spans = line.get("spans", [])
            if not spans:
                continue

            # Concatenate all span texts in this line
            line_text = ""
            span_positions = []  # (start_idx, end_idx, span_rect)
            for span in spans:
                start = len(line_text)
                line_text += span["text"]
                end = len(line_text)
                span_positions.append((start, end, fitz.Rect(span["bbox"])))

            # Search for placeholder in the concatenated line
            idx = line_text.find(placeholder)
            while idx != -1:
                end_idx = idx + len(placeholder)

                # Find the bounding rect covering all spans that contain the placeholder
                x0, y0, x1, y1 = None, None, None, None
                for sp_start, sp_end, sp_rect in span_positions:
                    # Check if this span overlaps with the placeholder range
                    if sp_start < end_idx and sp_end > idx:
                        if x0 is None:
                            x0 = sp_rect.x0
                            y0 = sp_rect.y0
                            y1 = sp_rect.y1
                        x1 = sp_rect.x1
                        y0 = min(y0, sp_rect.y0)
                        y1 = max(y1, sp_rect.y1)

                if x0 is not None:
                    results.append(fitz.Rect(x0, y0, x1, y1))

                idx = line_text.find(placeholder, idx + 1)

    return results


def get_text_properties(page, rect, placeholder):
    """Extract font size, color, and bold flag for text at given rect."""
    fontsize = 11.0
    color = (0, 0, 0)
    is_bold = False

    blocks = page.get_text("dict", clip=rect)["blocks"]
    for block in blocks:
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                span_text = span.get("text", "")
                # Match if span contains any part of the placeholder
                if any(c in span_text for c in [placeholder, "{{", "}}"]):
                    fontsize = span["size"]
                    c = span.get("color", 0)
                    color = (
                        ((c >> 16) & 0xFF) / 255.0,
                        ((c >> 8) & 0xFF) / 255.0,
                        (c & 0xFF) / 255.0,
                    )
                    flags = span.get("flags", 0)
                    is_bold = bool(flags & (1 << 4))
                    return fontsize, color, is_bold

    return fontsize, color, is_bold


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
    not_found = []

    # Also scan the PDF for any {{...}} patterns to help with diagnostics
    all_pdf_placeholders = set()
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()
        found = re.findall(r"\{\{[^}]+\}\}", text)
        all_pdf_placeholders.update(found)

    for page_num in range(len(doc)):
        page = doc[page_num]

        # Collect all placeholder positions and their text properties
        redaction_tasks = []

        for placeholder, value in replacements.items():
            if not value or str(value).strip() == "":
                continue

            value = str(value)
            rects = find_placeholder_rects(page, placeholder)

            if not rects and page_num == 0:
                not_found.append(placeholder)

            for rect in rects:
                fontsize, color, is_bold = get_text_properties(
                    page, rect, placeholder
                )

                # Expand rect slightly to ensure full coverage of the text
                expanded_rect = fitz.Rect(
                    rect.x0 - 1, rect.y0 - 1, rect.x1 + 1, rect.y1 + 1
                )

                redaction_tasks.append({
                    "rect": expanded_rect,
                    "original_rect": rect,
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
            page.add_redact_annot(task["rect"], text="", fill=(1, 1, 1))

        # Step 2: Apply all redactions (actually removes the text)
        page.apply_redactions()

        # Step 3: Insert new text at original positions
        for task in redaction_tasks:
            rect = task["original_rect"]
            chosen_font = (
                font_bold_path
                if task["is_bold"] and font_bold_path
                else font_path
            )

            # Calculate insertion point (baseline position)
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

    return total_replaced, not_found, list(all_pdf_placeholders)


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
        count, not_found, pdf_placeholders = replace_placeholders(
            input_path, output_path, replacements
        )
        result = {
            "success": True,
            "replacements_made": count,
            "output_path": output_path,
            "not_found": not_found,
            "pdf_placeholders": pdf_placeholders,
        }
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
