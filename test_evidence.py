import hashlib
import os
import sqlite3
import tempfile
import threading
import unittest
from pathlib import Path

try:
    import pymupdf as fitz
except ImportError:
    fitz = None

from evidence import EvidenceStore, normalize


@unittest.skipUnless(fitz is not None, "PyMuPDF is required for PDF evidence tests")
class EvidenceStoreTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.db = sqlite3.connect(":memory:")
        self.db.row_factory = sqlite3.Row
        self.addCleanup(self.db.close)
        self.store = EvidenceStore(self.db, threading.RLock())
        self.pdf = Path(self.temp.name) / "fixture.pdf"
        document = fitz.open()
        for lines in (
            ("Introduction to the sample study.", "The unique zephyr target appears here."),
            ("Methods and assay controls.", "Protein beta was measured in triplicate."),
        ):
            page = document.new_page()
            for index, line in enumerate(lines):
                page.insert_text((72, 90 + index * 28), line)
        document.save(self.pdf)
        document.close()

    def test_normalization_handles_ligatures_and_linebreak_hyphens(self):
        self.assertEqual(normalize("A ﬁnal co-\noperate T-cell"), "a final cooperate t-cell")
        self.assertEqual(normalize("A ﬁnal co- operate T-cell"), "a final cooperate t-cell")

    def test_index_cache_and_lexical_page_retrieval(self):
        first = self.store.index("DOC1", self.pdf)
        second = self.store.index("DOC1", self.pdf)
        self.assertEqual(first["page_count"], 2)
        self.assertEqual(first["indexed"], 2)
        self.assertFalse(first["cached"])
        self.assertTrue(second["cached"])
        result = self.store.retrieve(second, "unique zephyr")
        self.assertTrue(result["evidence"])
        self.assertEqual(result["evidence"][0]["page"], 1)
        self.assertIn("zephyr", result["evidence"][0]["text"])

    def test_cached_partial_index_expands_and_is_not_shrunk(self):
        long_pdf = Path(self.temp.name) / "long.pdf"
        document = fitz.open()
        for page_number in range(1, 122):
            page = document.new_page()
            page.insert_text((72, 90), "Late page zephyr finding" if page_number == 121 else f"Page {page_number}")
        document.save(long_pdf)
        document.close()

        partial = self.store.index("LONG", long_pdf)
        cached_partial = self.store.index("LONG", long_pdf)
        self.assertEqual(partial["indexed"], 120)
        self.assertTrue(cached_partial["cached"])
        full = self.store.index("LONG", long_pdf, max_pages=121)
        self.assertEqual(full["indexed"], 121)
        self.assertEqual([p["page"] for p in self.store.pages(full)][-1], 121)
        result = self.store.retrieve(full, "late page zephyr finding")
        self.assertTrue(any(item["page"] == 121 and "zephyr" in item["text"]
                            for item in result["evidence"]))
        again = self.store.index("LONG", long_pdf)
        self.assertEqual(again["indexed"], 121)
        self.assertTrue(again["cached"])

    def test_expected_version_invalidates_same_size_and_timestamp_cache(self):
        with self.pdf.open('ab') as handle:
            handle.write(b'\n% A')
        first = self.store.index('VERSION', self.pdf)
        stat = self.pdf.stat()
        content = self.pdf.read_bytes()
        self.pdf.write_bytes(content[:-1] + b'B')
        os.utime(self.pdf, ns=(stat.st_atime_ns, stat.st_mtime_ns))
        version = hashlib.sha256(self.pdf.read_bytes()).hexdigest()
        second = self.store.index('VERSION', self.pdf, expected_version=version)
        self.assertNotEqual(first['version'], second['version'])
        self.assertEqual(second['version'], version)
        self.assertFalse(second['cached'])

    def test_selection_and_quote_validation_never_promote_mismatches(self):
        index = self.store.index("DOC2", self.pdf)
        pages = self.store._pages(index)
        located = self.store.validate_selection(
            pages, {"segments": [{"page": 2, "text": "Protein beta was measured in triplicate."}]})
        self.assertEqual(located["status"], "located")
        self.assertEqual(located["segments"][0]["page"], 2)
        self.assertTrue(located["segments"][0]["rects"])

        wrong_page = self.store.validate_selection(
            pages, {"segments": [{"page": 1, "text": "Protein beta was measured in triplicate."}]})
        self.assertEqual(wrong_page["status"], "unverified")
        self.assertEqual(wrong_page["segments"], [])

        out_of_range = self.store.validate_selection(
            pages, {"segments": [{"page": 99, "text": "Protein beta was measured in triplicate."}]})
        self.assertEqual(out_of_range["status"], "out_of_range")

        cross_page = self.store.validate_selection(pages, {"segments": [
            {"page": 1, "text": "unique zephyr target"},
            {"page": 2, "text": "Protein beta was measured"},
        ]})
        self.assertEqual(cross_page["status"], "located")
        self.assertEqual([item["page"] for item in cross_page["segments"]], [1, 2])

        self.assertEqual(
            self.store.validate_quote(index, 2, "Protein beta was measured in triplicate.")["state"],
            "located_quote")
        self.assertEqual(self.store.validate_quote(index, 1, "not in this paper")["state"], "unverified")

    def test_citation_verification_marks_unknown_ids_and_pages_unsupported(self):
        index = self.store.index("DOC3", self.pdf)
        evidence = [
            {"id": "E1", "page": 1, "text": "source one", "state": "located_quote"},
            {"id": "E2", "page": 2, "text": "source two", "state": "located_quote"},
        ]
        citations, coverage = self.store.verify_citations(
            "Claim [E1] [E2] [E999] [Page 1] [Page 99]", evidence, index)
        states = {item["id"]: item["state"] for item in citations}
        self.assertEqual(states["E1"], "located_quote")
        self.assertEqual(states["E2"], "located_quote")
        self.assertEqual(states["E999"], "unsupported")
        self.assertEqual(states["Page 1"], "page_only")
        self.assertEqual(states["Page 99"], "unsupported")
        self.assertEqual(coverage["citation_count"], 5)
        self.assertEqual(coverage["located"], 3)
        self.assertEqual(coverage["unsupported"], 2)


if __name__ == "__main__":
    unittest.main()
