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
import unicodedata

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

# Various bracket characters that PDF editors might use instead of { }
OPEN_BRACKET_VARIANTS = ["{", "\u007B", "\uFF5B", "\uFE5B", "\u2774"]
CLOSE_BRACKET_VARIANTS = ["}", "\u007D", "\uFF5D", "\uFE5D", "\u2775"]


def find_font(candidates):
    for path in candidates:
        if os.path.exists(path):
            return path
    return None


def normalize_brackets(text):
    """Normalize various bracket characters to standard ASCII { }"""
    for ch in OPEN_BRACKET_VARIANTS:
        text = text.replace(ch, "{")
    for ch in CLOSE_BRACKET_VARIANTS:
        text = text.replace(ch, "}")
    return text


def get_all_spans(page):
    """Extract all text spans from a page with their properties."""
    spans = []
    blocks = page.get_text("dict")["blocks"]
    for block in blocks:
        for line in block.get("lines", []):
            line_spans = line.get("spans", [])
            for span in line_spans:
                spans.append(span)
    return spans


def get_line_spans(page):
    """Group spans by line, returning list of (line_spans, line_rect) tuples."""
    lines = []
    blocks = page.get_text("dict")["blocks"]
    for block in blocks:
        for line in block.get("lines", []):
            line_spans = line.get("spans", [])
            if line_spans:
                lines.append(line_spans)
    return lines


def find_placeholder_in_line(line_spans, placeholder):
    """
    Find a placeholder in concatenated line text.
    Returns list of (rect, fontsize, color, is_bold) tuples.
    Also handles normalized bracket matching.
    """
    results = []

    # Build line text and character-to-span mapping
    line_text = ""
    char_map = []  # index -> (span_index, span)
    for si, span in enumerate(line_spans):
        for ch in span["text"]:
            char_map.append((si, span))
            line_text += ch

    # Try exact match first, then normalized match
    search_texts = [
        (line_text, placeholder),
        (normalize_brackets(line_text), normalize_brackets(placeholder)),
    ]

    for text_to_search, pattern in search_texts:
        idx = text_to_search.find(pattern)
        while idx != -1:
            end_idx = idx + len(pattern)

            # Calculate bounding rect from the character map
            involved_spans = set()
            x0, y0, x1, y1 = None, None, None, None

            for ci in range(idx, min(end_idx, len(char_map))):
                si, span = char_map[ci]
                if si not in involved_spans:
                    involved_spans.add(si)
                    bbox = span["bbox"]
                    if x0 is None:
                        x0, y0, x1, y1 = bbox[0], bbox[1], bbox[2], bbox[3]
                    else:
                        x0 = min(x0, bbox[0])
                        y0 = min(y0, bbox[1])
                        x1 = max(x1, bbox[2])
                        y1 = max(y1, bbox[3])

            if x0 is not None:
                # Get text properties from the first span containing the placeholder
                first_span = char_map[idx][1]
                fontsize = first_span.get("size", 11.0)
                c = first_span.get("color", 0)
                color = (
                    ((c >> 16) & 0xFF) / 255.0,
                    ((c >> 8) & 0xFF) / 255.0,
                    (c & 0xFF) / 255.0,
                )
                flags = first_span.get("flags", 0)
                is_bold = bool(flags & (1 << 4))

                results.append((fitz.Rect(x0, y0, x1, y1), fontsize, color, is_bold))

            idx = text_to_search.find(pattern, idx + 1)

        if results:
            break  # Found with this search method, no need to try normalized

    return results


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
    debug_info = []

    # Scan for all {{...}} patterns in the PDF for diagnostics
    all_pdf_placeholders = set()
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()
        normalized = normalize_brackets(text)
        found = re.findall(r"\{\{[^}]+\}\}", normalized)
        all_pdf_placeholders.update(found)

        # Also log all spans for debugging
        for span_data in get_all_spans(page):
            t = span_data.get("text", "").strip()
            if t and ("{" in t or "}" in t or "{" in normalize_brackets(t)):
                debug_info.append({
                    "page": page_num + 1,
                    "text": t,
                    "chars": [f"U+{ord(c):04X}" for c in t],
                    "font": span_data.get("font", ""),
                })

    for page_num in range(len(doc)):
        page = doc[page_num]

        # Get all line spans for this page
        lines = get_line_spans(page)

        # Collect all redaction tasks
        redaction_tasks = []

        for placeholder, value in replacements.items():
            if not value or str(value).strip() == "":
                continue

            value = str(value)
            found_on_page = False

            # Strategy 1: Direct search_for (fastest)
            rects = page.search_for(placeholder)
            if rects:
                for rect in rects:
                    fontsize, color, is_bold = 11.0, (0, 0, 0), False
                    # Get properties from spans
                    for line_spans in lines:
                        for span in line_spans:
                            if placeholder in span.get("text", ""):
                                fontsize = span["size"]
                                c = span.get("color", 0)
                                color = (
                                    ((c >> 16) & 0xFF) / 255.0,
                                    ((c >> 8) & 0xFF) / 255.0,
                                    (c & 0xFF) / 255.0,
                                )
                                flags = span.get("flags", 0)
                                is_bold = bool(flags & (1 << 4))
                                break

                    redaction_tasks.append({
                        "rect": rect,
                        "value": value,
                        "fontsize": fontsize,
                        "color": color,
                        "is_bold": is_bold,
                    })
                    found_on_page = True
                continue

            # Strategy 2: Line-by-line scan with span concatenation
            for line_spans in lines:
                matches = find_placeholder_in_line(line_spans, placeholder)
                for rect, fontsize, color, is_bold in matches:
                    redaction_tasks.append({
                        "rect": rect,
                        "value": value,
                        "fontsize": fontsize,
                        "color": color,
                        "is_bold": is_bold,
                    })
                    found_on_page = True

            if not found_on_page and page_num == 0:
                not_found.append(placeholder)

        if not redaction_tasks:
            continue

        # Step 1: Redact old text
        for task in redaction_tasks:
            expanded = fitz.Rect(
                task["rect"].x0 - 1,
                task["rect"].y0 - 1,
                task["rect"].x1 + 1,
                task["rect"].y1 + 1,
            )
            page.add_redact_annot(expanded, text="", fill=(1, 1, 1))

        page.apply_redactions()

        # Step 2: Insert new text
        for task in redaction_tasks:
            rect = task["rect"]
            chosen_font = (
                font_bold_path
                if task["is_bold"] and font_bold_path
                else font_path
            )

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

    return total_replaced, not_found, list(all_pdf_placeholders), debug_info


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
        count, not_found, pdf_placeholders, debug_info = replace_placeholders(
            input_path, output_path, replacements
        )
        result = {
            "success": True,
            "replacements_made": count,
            "output_path": output_path,
            "not_found": not_found,
            "pdf_placeholders": pdf_placeholders,
            "debug_spans_with_brackets": debug_info,
        }
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
