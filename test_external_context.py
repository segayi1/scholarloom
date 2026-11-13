import unittest
from unittest.mock import patch

import external_context


class ExternalContextTests(unittest.TestCase):
    @patch("external_context.pipeline.search_external_literature")
    def test_returns_bounded_public_source_fields_for_question_only(self, search):
        search.return_value = [
            {
                "title": f"Paper {index}",
                "sourceURL": f"https://example.org/{index}",
                "abstract": "A" * 1500,
                "authors": ["A. Researcher"],
                "year": "2025",
                "venue": "Journal",
                "doi": "10.1234/example",
                "provider": "OpenAlex",
                "pdfURL": "https://example.org/private.pdf",
                "_text": "private notes must not be returned",
            }
            for index in range(8)
        ]

        result = external_context.search_literature_context("What evidence supports this?")

        search.assert_called_once_with("What evidence supports this?", limit=external_context.MAX_SOURCES)
        self.assertEqual(result["status"], "ok")
        self.assertEqual(len(result["sources"]), external_context.MAX_SOURCES)
        self.assertEqual(len(result["sources"][0]["abstract"]), external_context.MAX_ABSTRACT_LENGTH)
        self.assertNotIn("pdfURL", result["sources"][0])
        self.assertNotIn("_text", result["sources"][0])

    @patch("external_context.pipeline.search_external_literature", return_value=[])
    def test_reports_no_results(self, search):
        result = external_context.search_literature_context("unmatched topic")
        self.assertEqual(result, {"status": "no_results", "sources": [], "error": None})

    @patch("external_context.pipeline.search_external_literature", side_effect=ValueError("network unavailable"))
    def test_reports_search_errors(self, search):
        result = external_context.search_literature_context("research question")
        self.assertEqual(result, {"status": "error", "sources": [], "error": "network unavailable"})

    @patch(
        "external_context.pipeline.search_external_literature",
        return_value=[{"title": "Missing URL"}, {"title": "Unsafe", "sourceURL": "file:///private.pdf"}],
    )
    def test_omits_sources_without_safe_http_url(self, search):
        result = external_context.search_literature_context("research question")
        self.assertEqual(result["status"], "no_results")


if __name__ == "__main__":
    unittest.main()
