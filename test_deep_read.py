import tempfile
import unittest
from pathlib import Path

import pymupdf as fitz

from deep_read import deep_read_pdf


class DeepReadTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "article.pdf"
        doc = fitz.open()
        page = doc.new_page(width=400, height=500)
        page.insert_text((30, 35), "Introduction")
        page.insert_text((30, 70), "We compare the response in Fig. 1 across groups.")
        pix = fitz.Pixmap(fitz.csRGB, fitz.IRect(0, 0, 20, 20))
        pix.clear_with(0)
        page.insert_image(fitz.Rect(90, 120, 310, 300), stream=pix.tobytes("png"))
        page.insert_text((90, 330), "Figure 1. Response across groups.")
        doc.new_page().insert_text((30, 50), "Discussion on the next page.")
        doc.save(self.path)
        doc.close()

    def test_segments_cover_pages_and_keep_article_order_and_figure_refs(self):
        result = deep_read_pdf(self.path)
        segments = result["segments"]
        self.assertEqual(result["page_count"], 2)
        self.assertEqual([(s["page"], s["type"]) for s in segments], [
            (1, "paragraph"), (1, "paragraph"), (1, "caption"), (2, "paragraph")])
        self.assertEqual(segments[1]["figure_numbers"], ["1"])

    def test_two_columns_read_down_left_then_right(self):
        from deep_read import _reading_order
        items = [dict(text=t, bbox=b) for t, b in [
            ('left 1', [10, 20, 150, 30]), ('right 1', [220, 20, 350, 30]),
            ('left 2', [10, 40, 150, 50]), ('right 2', [220, 40, 350, 50])]]
        self.assertEqual([s['text'] for s in _reading_order(items, 400)],
                         ['left 1', 'left 2', 'right 1', 'right 2'])

    def test_sparse_two_column_page_keeps_left_column_before_right(self):
        from deep_read import _reading_order
        items = [dict(text=t, bbox=b) for t, b in [
            ('left 1', [10, 20, 150, 30]), ('right 1', [220, 25, 350, 35]),
            ('left 2', [10, 40, 150, 50]), ('left 3', [10, 60, 150, 70])]]
        self.assertEqual([s['text'] for s in _reading_order(items, 400)],
                         ['left 1', 'left 2', 'left 3', 'right 1'])
        self.assertEqual([s['text'] for s in _reading_order(items, 400, legacy=True)],
                         ['left 1', 'right 1', 'left 2', 'left 3'])

    def test_figure_candidate_needs_caption_and_has_review_status(self):
        result = deep_read_pdf(self.path)
        candidate, = result["figure_candidates"]
        self.assertEqual((candidate["page"], candidate["figure_number"]), (1, "1"))
        self.assertEqual(candidate["status"], "candidate")
        self.assertEqual(candidate["confidence"], "low")
        self.assertEqual(len(candidate["bbox"]), 4)

    def test_uncaptioned_image_is_not_promoted_to_candidate(self):
        doc = fitz.open()
        page = doc.new_page(width=400, height=500)
        pix = fitz.Pixmap(fitz.csRGB, fitz.IRect(0, 0, 20, 20))
        pix.clear_with(255)
        page.insert_image(fitz.Rect(80, 100, 320, 300), stream=pix.tobytes("png"))
        doc.save(self.path)
        doc.close()
        self.assertEqual(deep_read_pdf(self.path)["figure_candidates"], [])


if __name__ == "__main__":
    unittest.main()
