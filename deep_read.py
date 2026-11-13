"""Ordered, local deep-reading extraction for PDF articles."""

import re
from pathlib import Path


_CAPTION = re.compile(r"^\s*(?:fig(?:ure)?\.?\s*)([A-Za-z]?\d+(?:[.-]\d+)*)\b[.:]?\s*(.*)$", re.I)
_MENTION = re.compile(r"\b(?:fig(?:ure)?\.?)\s*([A-Za-z]?\d+(?:[.-]\d+)*)\b", re.I)


def _reading_order(items, width, legacy=False):
    midpoint = width / 2
    left = [s for s in items if s['bbox'][2] < midpoint]
    right = [s for s in items if s['bbox'][0] > midpoint]
    if not left or not right or (legacy and (len(left) < 2 or len(right) < 2)):
        return sorted(items, key=lambda s: (s['bbox'][1], s['bbox'][0]))
    spanning = [s for s in items if s not in left and s not in right]
    result = []
    previous_y = float('-inf')
    for anchor in sorted(spanning, key=lambda s: s['bbox'][1]) + [None]:
        boundary = anchor['bbox'][1] if anchor else float('inf')
        for column in (left, right):
            result.extend(sorted((s for s in column if previous_y <= s['bbox'][1] < boundary), key=lambda s: s['bbox'][1]))
        if anchor:
            result.append(anchor)
            previous_y = boundary
    return result


def deep_read_pdf(path, legacy_order=False):
    """Return ordered page-labelled text segments and cautious image candidates.

    Segment and candidate page numbers are one-based PDF page numbers. Figure
    candidates require an extractable caption and a nearby, substantial image;
    they remain candidates for human review.
    """
    import pymupdf as fitz

    doc = fitz.open(Path(path))
    try:
        if doc.needs_pass:
            raise ValueError("PDF 已加密，无法读取全文。")
        segments, figures = [], []
        for page_number, page in enumerate(doc, 1):
            blocks = [b for b in page.get_text("blocks", sort=True) if len(b) >= 7 and int(b[6]) == 0]
            captions = []
            page_segments = []
            for block in blocks:
                text = re.sub(r"\s+", " ", str(block[4] or "")).strip()
                if not text:
                    continue
                match = _CAPTION.match(text)
                kind = "caption" if match else "paragraph"
                segment = dict(type=kind, page=page_number, text=text,
                               bbox=[float(v) for v in block[:4]])
                page_segments.append(segment)
                if match:
                    captions.append((fitz.Rect(block[:4]), match.group(1), text))
                else:
                    segment['figure_numbers'] = list(dict.fromkeys(m.group(1) for m in _MENTION.finditer(text)))

            segments.extend(_reading_order(page_segments, page.rect.width, legacy_order))

            page_area = max(1.0, page.rect.width * page.rect.height)
            for image in page.get_image_info(xrefs=True):
                rect = fitz.Rect(image["bbox"]) & page.rect
                if rect.is_empty or rect.get_area() / page_area < 0.01 or not captions:
                    continue
                caption_rect, number, caption = min(
                    captions, key=lambda item: abs(item[0].y0 - rect.y1) + abs(item[0].y1 - rect.y0))
                # Only pair a caption with a visual in the same local page region.
                distance = min(abs(caption_rect.y0 - rect.y1), abs(rect.y0 - caption_rect.y1))
                if distance > page.rect.height * 0.35:
                    continue
                figures.append(dict(page=page_number, figure_number=number, caption=caption,
                                    bbox=[rect.x0 / page.rect.width, rect.y0 / page.rect.height,
                                          rect.x1 / page.rect.width, rect.y1 / page.rect.height],
                                    status="candidate", confidence="low",
                                    reason="nearby caption and extractable image; verify visually"))

        return dict(page_count=doc.page_count, segments=segments, figure_candidates=figures)
    finally:
        doc.close()
