import urllib.error
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import pipeline


class InspectFileTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)

    def file(self, name, content=b"placeholder"):
        path = Path(self.temp.name) / name
        path.write_bytes(content)
        return path

    @patch("pipeline._crossref")
    @patch("pipeline._pdf_text")
    def test_journal_requires_crossref_type_and_matching_title(self, pdf_text, crossref):
        page = "A single-cell study of immune cells\nDOI: 10.1234/example.1\nAbstract"
        pdf_text.return_value = (page, page)
        crossref.return_value = {
            "type": "journal-article",
            "DOI": "10.1234/example.1",
            "title": ["A single-cell study of immune cells"],
            "author": [{"given": "Lin", "family": "Wang"}],
            "issued": {"date-parts": [[2024, 2]]},
            "container-title": ["Example Journal"],
            "abstract": "<jats:p>Immune cells were profiled.</jats:p>",
        }
        result = pipeline.inspect_file(self.file("local-name-is-not-evidence.pdf"))
        self.assertEqual(result["status"], "ready")
        self.assertEqual(result["metadata"]["itemType"], "journalArticle")
        self.assertEqual(result["metadata"]["publicationTitle"], "Example Journal")
        self.assertEqual(result["metadata"]["abstractNote"], "Immune cells were profiled.")
        self.assertEqual(result["sourceURL"], "https://doi.org/10.1234/example.1")

    @patch("pipeline._crossref")
    @patch("pipeline._pdf_text")
    def test_cited_doi_with_mismatched_first_page_title_needs_review(self, pdf_text, crossref):
        page = "A different article title about receptor biology\nDOI: 10.1234/cited.work"
        pdf_text.return_value = (page, page)
        crossref.return_value = {"type": "journal-article", "DOI": "10.1234/cited.work",
                                 "title": ["The referenced paper about ancient plants"]}
        result = pipeline.inspect_file(self.file("paper.pdf"))
        self.assertEqual(result["status"], "review")
        self.assertIn("疑似引用 DOI", result["reason"])

    @patch("pipeline._crossref")
    @patch("pipeline._pdf_text")
    def test_crossref_doi_must_match_requested_doi(self, pdf_text, crossref):
        page = "A study of cell signaling\nDOI: 10.1234/article"
        pdf_text.return_value = (page, page)
        crossref.return_value = {"type": "journal-article", "DOI": "10.9999/other",
                                 "title": ["A study of cell signaling"]}
        result = pipeline.inspect_file(self.file("paper.pdf"))
        self.assertEqual(result["status"], "review")
        self.assertIn("DOI 与首页 DOI 不一致", result["reason"])

    @patch("pipeline._pdf_text")
    def test_book_with_isbn_and_publisher_is_excluded(self, pdf_text):
        page = "A Handbook of Cell Biology\nISBN 978-1-2345-6789-0\nAcademic Press Publisher\nThird Edition"
        pdf_text.return_value = (page, page)
        result = pipeline.inspect_file(self.file("book.pdf"))
        self.assertEqual(result["status"], "excluded")
        self.assertIn("ISBN", result["reason"])

    @patch("pipeline._pdf_text")
    def test_chinese_patent_number_and_title_are_ready(self, pdf_text):
        page = "(54) 一种靶向肿瘤抗原的嵌合抗原受体\n(19) 中华人民共和国国家知识产权局\n(10) CN 114567890 A\n(12) 发明专利申请"
        pdf_text.return_value = (page, page)
        result = pipeline.inspect_file(self.file("patent.pdf"))
        self.assertEqual(result["status"], "ready")
        self.assertEqual(result["metadata"]["itemType"], "patent")
        self.assertEqual(result["metadata"]["patentNumber"], "CN114567890A")
        self.assertEqual(result["metadata"]["title"], "一种靶向肿瘤抗原的嵌合抗原受体")
        self.assertEqual(result["category"], "专利技术")

    @patch("pipeline._pdf_text")
    def test_patent_citation_inside_article_is_not_ready(self, pdf_text):
        page = "A paper about receptor biology\nThe related patent is CN 114567890 A, granted by the patent office."
        pdf_text.return_value = (page, page)
        result = pipeline.inspect_file(self.file("citing-article.pdf"))
        self.assertEqual(result["status"], "review")
        self.assertNotEqual(result["metadata"]["itemType"], "patent")

    def test_balanced_parenthesis_is_preserved_in_doi(self):
        self.assertEqual(pipeline._clean_doi("10.1000/xyz(2)"), "10.1000/xyz(2)")
        self.assertEqual(pipeline._clean_doi("10.1000/xyz(2)."), "10.1000/xyz(2)")

    def test_fi_ligature_inside_doi_is_normalized(self):
        self.assertEqual(pipeline._first_doi("doi: 10.3389/\ufb01mmu.2013.00302"),
                         "10.3389/fimmu.2013.00302")

    @patch("pipeline._crossref_title")
    @patch("pipeline._pdf_text")
    def test_title_only_journal_match_waits_for_manual_confirmation(self, pdf_text, crossref_title):
        page = "B-cell Epitopes: Discontinuity and Conformational Analysis\nSaba Ferdous et al."
        pdf_text.return_value = (page, page)
        crossref_title.return_value = {
            "type": "journal-article",
            "DOI": "10.1016/j.molimm.2019.09.014",
            "title": ["B-cell epitopes: Discontinuity and conformational analysis"],
        }
        result = pipeline.inspect_file(self.file("author-manuscript.pdf"))
        self.assertEqual(result["status"], "review")
        self.assertEqual(result["metadata"]["DOI"], "10.1016/j.molimm.2019.09.014")
        self.assertIn("题名检索", result["basis"])
        self.assertIn("没有 DOI", result["reason"])

    @patch("pipeline._crossref_title")
    @patch("pipeline._crossref")
    @patch("pipeline._pdf_text")
    def test_preprint_doi_can_resolve_to_published_journal_article(self, pdf_text, crossref, crossref_title):
        page = "A journal article about cell signaling\nDOI: 10.1101/preprint"
        pdf_text.return_value = (page, page)
        crossref.return_value = {
            "type": "posted-content",
            "DOI": "10.1101/preprint",
            "title": ["A journal article about cell signaling"],
        }
        crossref_title.return_value = {
            "type": "journal-article",
            "DOI": "10.1234/published",
            "title": ["A journal article about cell signaling"],
        }
        result = pipeline.inspect_file(self.file("preprint.pdf"))
        self.assertEqual(result["status"], "review")
        self.assertEqual(result["metadata"]["DOI"], "10.1234/published")
        self.assertIn("题名检索", result["basis"])

    @patch("pipeline._crossref_title")
    @patch("pipeline._pdf_text")
    def test_lecture_slides_stop_before_crossref_lookup(self, pdf_text, crossref_title):
        page = "Lecture 4: Antibody structure\nLearning objectives\nOutline\nSlides for IMM250"
        pdf_text.return_value = (page, page)
        result = pipeline.inspect_file(self.file("IMM250 lecture 4.pdf"))
        self.assertEqual(result["status"], "excluded")
        self.assertIn("教学课件", result["reason"])
        crossref_title.assert_not_called()

    @patch("pipeline._crossref_title")
    @patch("pipeline._pdf_text")
    def test_defense_ppt_is_directly_excluded(self, pdf_text, crossref_title):
        page = "博士学位论文开题答辩报告\n汇报人：张三\n指导教师：李四教授\n2024年春季学期"
        pdf_text.return_value = (page, page)
        result = pipeline.inspect_file(self.file("毕业答辩汇报.pptx.pdf"))
        self.assertEqual(result["status"], "excluded")
        self.assertIn("答辩PPT", result["reason"])
        crossref_title.assert_not_called()

    @patch("pipeline._crossref_title")
    @patch("pipeline._pdf_text")
    def test_lesson_plan_is_directly_excluded(self, pdf_text, crossref_title):
        page = "《免疫学》课程教案\n教学设计与授课方案\n教学目标：理解抗原递呈机制"
        pdf_text.return_value = (page, page)
        result = pipeline.inspect_file(self.file("免疫学教案.pdf"))
        self.assertEqual(result["status"], "excluded")
        self.assertIn("课程教案", result["reason"])
        crossref_title.assert_not_called()

    @patch("pipeline._crossref_title")
    @patch("pipeline._pdf_text")
    def test_lncs_paper_is_not_falsely_excluded_as_lecture(self, pdf_text, crossref_title):
        page = "Lecture Notes in Computer Science, vol 12000\nDeep Learning for Epitope Prediction\n10.1007/978-3-030-12345-6"
        pdf_text.return_value = (page, page)
        result = pipeline.inspect_file(self.file("lncs_paper.pdf"))
        self.assertNotEqual(result["status"], "excluded")

    def test_cited_title_inside_long_page_text_is_not_a_title_match(self):
        self.assertFalse(pipeline._title_match(
            "This lecture discusses a cited article titled B-cell epitopes discontinuity analysis "
            "and reviews several unrelated teaching examples",
            "B-cell epitopes discontinuity analysis",
        ))

    def test_corrupt_pdf_is_review_not_exception(self):
        result = pipeline.inspect_file(self.file("broken.pdf", b"this is not a PDF"))
        self.assertEqual(result["status"], "review")
        self.assertIn("解析失败", result["basis"])

    @patch("pipeline._pdf_text", return_value=("x" * 20_000, "first page"))
    def test_extract_text_is_public_and_bounded(self, pdf_text):
        text = pipeline.extract_text(self.file("article.pdf"))
        self.assertEqual(len(text), 18_000)
        pdf_text.assert_called_once()

    def test_openalex_record_reconstructs_abstract_and_oa_link(self):
        item = pipeline._openalex_item({
            "id": "https://openalex.org/W123",
            "display_name": "Antibody epitope fixture",
            "doi": "https://doi.org/10.1234/FIXTURE",
            "publication_year": 2025,
            "cited_by_count": 9,
            "authorships": [{"author": {"display_name": "Ada Example"}}],
            "abstract_inverted_index": {"Epitopes": [0], "matter.": [1]},
            "open_access": {"is_oa": True, "oa_url": "https://example.org/paper.pdf"},
            "best_oa_location": {"pdf_url": "https://example.org/paper.pdf"},
            "primary_location": {"landing_page_url": "https://example.org/record"},
        })
        self.assertEqual(item["doi"], "10.1234/fixture")
        self.assertEqual(item["abstract"], "Epitopes matter.")
        self.assertTrue(item["isOpenAccess"])
        self.assertEqual(item["authors"], ["Ada Example"])

    def test_crossref_item_normalizes_metadata(self):
        item = pipeline._crossref_item({
            "DOI": "10.1038/s41586-020-0001",
            "title": ["Single-cell antibody discovery"],
            "author": [{"given": "Jane", "family": "Doe"}],
            "container-title": ["Nature"],
            "published-print": {"date-parts": [[2024, 5]]},
            "abstract": "<jats:p>Single-cell analysis of antibodies.</jats:p>",
            "is-referenced-by-count": 42,
            "link": [{"URL": "https://example.org/oa.pdf", "content-type": "application/pdf"}],
        })
        self.assertEqual(item["doi"], "10.1038/s41586-020-0001")
        self.assertEqual(item["title"], "Single-cell antibody discovery")
        self.assertEqual(item["venue"], "Nature")
        self.assertEqual(item["year"], "2024")
        self.assertEqual(item["abstract"], "Single-cell analysis of antibodies.")
        self.assertEqual(item["citedBy"], 42)
        self.assertTrue(item["isOpenAccess"])
        self.assertEqual(item["pdfURL"], "https://example.org/oa.pdf")
        self.assertEqual(item["provider"], "Crossref")

    def test_search_external_literature_falls_back_to_crossref(self):
        fixture = [{"title": "Crossref fallback paper", "doi": "10.1000/fallback", "provider": "Crossref"}]
        with patch("pipeline._openalex_json", side_effect=urllib.error.HTTPError("https://api.openalex.org", 429, "Too Many Requests", {}, None)),              patch("pipeline._crossref_search", return_value=fixture):
            results = pipeline.search_external_literature("single cell antibody")
            self.assertEqual(results, fixture)

    def test_search_external_literature_raises_when_both_fail(self):
        with patch("pipeline._openalex_json", side_effect=urllib.error.HTTPError("https://api.openalex.org", 429, "Too Many Requests", {}, None)),              patch("pipeline._crossref_search", side_effect=urllib.error.URLError("Connection refused")):
            with self.assertRaises(ValueError) as ctx:
                pipeline.search_external_literature("single cell antibody")
            self.assertIn("学术检索服务暂时无法连接", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
