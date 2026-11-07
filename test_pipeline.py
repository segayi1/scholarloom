import urllib.error
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

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
        self.assertIn("题名与 DOI 元数据题名不匹配", result["reason"])

    @patch("pipeline._crossref")
    @patch("pipeline._pdf_text")
    def test_crossref_doi_must_match_requested_doi(self, pdf_text, crossref):
        page = "A study of cell signaling\nDOI: 10.1234/article"
        pdf_text.return_value = (page, page)
        crossref.return_value = {"type": "journal-article", "DOI": "10.9999/other",
                                 "title": ["A study of cell signaling"]}
        result = pipeline.inspect_file(self.file("paper.pdf"))
        self.assertEqual(result["status"], "review")
        self.assertIn("与本地 DOI 不一致", result["reason"])

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

    def test_fullwidth_wrapped_doi_and_double_slash_are_normalized(self):
        self.assertEqual(
            pipeline._first_doi("ＤＯＩ：１０． ３７６０／ｃｍａ．ｊ．ｉｓｓｎ．２０２３．０１．０１０"),
            "10.3760/cma.j.issn.2023.01.010",
        )
        self.assertEqual(
            pipeline._clean_doi("10.1037//0735-7044.116.1.63"),
            "10.1037/0735-7044.116.1.63",
        )
        self.assertEqual(
            pipeline._first_doi("https://doi.org/10.1016/j.it.2021.10.008 1143"),
            "10.1016/j.it.2021.10.008",
        )

    @patch("pipeline._crossref")
    @patch("pipeline._pdf_text")
    def test_structured_chinese_journal_page_is_ready_without_crossref(self, pdf_text, crossref):
        page = (
            "引用格式：张三，李四．猴痘研究进展［Ｊ］．中华临床感染病杂志，２０２３，１６（１）：６７－７４．"
            "ＤＯＩ：１０．３７６０／ｃｍａ．ｊ．ｉｓｓｎ．２０２３．０１．０１０．\n"
            "·综述·\n再发传染病－猴痘研究进展\n张三 李四\n上海交通大学医学院\n"
            "【摘要】 本文综述猴痘病毒的病原学与临床表现。\n【关键词】 猴痘；疫苗；抗病毒治疗"
        )
        pdf_text.return_value = (page, page)
        result = pipeline.inspect_file(self.file("chinese-review.pdf"))
        self.assertEqual(result["status"], "ready")
        self.assertEqual(result["metadata"]["title"], "再发传染病-猴痘研究进展")
        self.assertEqual(result["metadata"]["DOI"], "10.3760/cma.j.issn.2023.01.010")
        self.assertIn("中文期刊", result["reason"])
        crossref.assert_not_called()

    @patch("pipeline._crossref")
    @patch("pipeline._pdf_text")
    def test_elife_component_doi_falls_back_to_the_article_record(self, pdf_text, crossref):
        page = (
            "Computationally-driven identification of antibody epitopes\n"
            "DOI: 10.7554/eLife.29023.001"
        )
        pdf_text.return_value = (page, page)
        crossref.side_effect = [
            {"type": "component", "DOI": "10.7554/eLife.29023.001",
             "title": ["Figure 1"]},
            {"type": "journal-article", "DOI": "10.7554/eLife.29023",
             "title": ["Computationally-driven identification of antibody epitopes"]},
        ]
        result = pipeline.inspect_file(self.file("elife-29023.pdf"))
        self.assertEqual(result["status"], "ready")
        self.assertEqual(result["metadata"]["DOI"], "10.7554/elife.29023")

    @patch("pipeline._crossref_title")
    @patch("pipeline._pdf_text")
    def test_title_only_journal_match_is_ready_when_title_is_in_opening_matter(self, pdf_text, crossref_title):
        page = "B-cell Epitopes: Discontinuity and Conformational Analysis\nSaba Ferdous et al."
        pdf_text.return_value = (page, page)
        crossref_title.return_value = {
            "type": "journal-article",
            "DOI": "10.1016/j.molimm.2019.09.014",
            "title": ["B-cell epitopes: Discontinuity and conformational analysis"],
        }
        result = pipeline.inspect_file(self.file("author-manuscript.pdf"))
        self.assertEqual(result["status"], "ready")
        self.assertEqual(result["metadata"]["DOI"], "10.1016/j.molimm.2019.09.014")
        self.assertIn("题名检索", result["basis"])
        self.assertIn("正文题名", result["reason"])

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
        self.assertEqual(result["status"], "ready")
        self.assertEqual(result["metadata"]["DOI"], "10.1234/published")
        self.assertIn("题名检索", result["basis"])

    @patch("pipeline._crossref")
    @patch("pipeline._pdf_metadata")
    @patch("pipeline._pdf_text")
    def test_pdf_metadata_recovers_journal_when_page_has_only_body_text(
        self, pdf_text, pdf_metadata, crossref
    ):
        page = "Abstract\nThis review discusses telomere maintenance and shelterin complexes."
        pdf_text.return_value = (page, page)
        pdf_metadata.return_value = {
            "title": "Shaping human telomeres: from shelterin and CST complexes to telomeric chromatin organization",
            "subject": "Nature Reviews Molecular Cell Biology, doi:10.1038/s41580-021-00328-y",
            "keywords": "",
            "creator": "Springer",
        }
        crossref.return_value = {
            "type": "journal-article",
            "DOI": "10.1038/s41580-021-00328-y",
            "title": ["Shaping human telomeres: from shelterin and CST complexes to telomeric chromatin organization"],
            "container-title": ["Nature Reviews Molecular Cell Biology"],
        }

        result = pipeline.inspect_file(self.file("lim2021.pdf"))

        self.assertEqual(result["status"], "ready")
        self.assertEqual(result["metadata"]["DOI"], "10.1038/s41580-021-00328-y")
        self.assertIn("PDF 元数据 DOI", result["reason"])

    def test_generic_pdf_metadata_titles_are_not_identity_evidence(self):
        self.assertEqual(
            pipeline._metadata_title({"title": "Microsoft Word - manuscript.docx"}, "manuscript.pdf"),
            "",
        )
        self.assertEqual(pipeline._metadata_title({"title": "Untitled"}, "paper.pdf"), "")
        self.assertEqual(
            pipeline._metadata_title({"title": "A real article title"}, "article.pdf"),
            "A real article title",
        )

    @patch("pipeline._arxiv_record")
    @patch("pipeline._crossref_title")
    @patch("pipeline._pdf_metadata")
    @patch("pipeline._pdf_text")
    def test_verified_arxiv_preprint_is_ready_without_fabricated_doi(
        self, pdf_text, pdf_metadata, crossref_title, arxiv_record
    ):
        title = "RiboPO: Preference Optimization for Structure- and Stability-Aware RNA Design"
        page = f"{title}\nAlice Example, Bob Example\nABSTRACT\nRNA design benchmark.\narXiv:2510.21161v2 [q-bio.BM]"
        pdf_text.return_value = (page, page)
        pdf_metadata.return_value = {"creator": "arXiv GenPDF", "title": title}
        crossref_title.return_value = None
        arxiv_record.return_value = {
            "title": title,
            "archiveID": "arXiv:2510.21161v2",
            "creators": [{"creatorType": "author", "name": "Alice Example"}],
            "date": "2025-10-24",
            "abstractNote": "RNA design benchmark.",
            "sourceURL": "https://arxiv.org/abs/2510.21161v2",
            "repository": "arXiv",
        }

        result = pipeline.inspect_file(self.file("ribopo.pdf"))

        self.assertEqual(result["status"], "ready")
        self.assertEqual(result["metadata"]["itemType"], "preprint")
        self.assertEqual(result["metadata"]["DOI"], "")
        self.assertEqual(result["metadata"]["archiveID"], "arXiv:2510.21161v2")
        self.assertEqual(result["metadata"]["repository"], "arXiv")
        self.assertEqual(result["sourceURL"], "https://arxiv.org/abs/2510.21161v2")
        crossref_title.assert_called()
        arxiv_record.assert_called_once_with("2510.21161v2")

    @patch("pipeline._arxiv_record")
    @patch("pipeline._crossref_title")
    @patch("pipeline._pdf_metadata")
    @patch("pipeline._pdf_text")
    def test_unverified_arxiv_identifier_stays_in_review(
        self, pdf_text, pdf_metadata, crossref_title, arxiv_record
    ):
        page = "A local manuscript about RNA design\narXiv:9999.99999v1\nAbstract"
        pdf_text.return_value = (page, page)
        pdf_metadata.return_value = {}
        crossref_title.return_value = None
        arxiv_record.return_value = {
            "title": "A completely different article title",
            "archiveID": "arXiv:9999.99999v1",
            "creators": [],
            "date": "2025-01-01",
            "abstractNote": "",
            "sourceURL": "https://arxiv.org/abs/9999.99999v1",
            "repository": "arXiv",
        }

        result = pipeline.inspect_file(self.file("fake-arxiv.pdf"))

        self.assertEqual(result["status"], "review")
        self.assertIn("未获题名匹配", result["reason"])

    def test_arxiv_identifier_is_extracted_from_front_matter(self):
        self.assertEqual(
            pipeline._arxiv_id("arXiv:2510.21161v2", {}, "paper.pdf"),
            "2510.21161v2",
        )
        self.assertEqual(
            pipeline._arxiv_id("https://arxiv.org/abs/2510.21161", {}, "paper.pdf"),
            "2510.21161",
        )

    @patch("pipeline._crossref_title")
    @patch("pipeline._crossref")
    @patch("pipeline._pdf_text")
    def test_crossref_posted_content_is_ready_as_preprint(
        self, pdf_text, crossref, crossref_title
    ):
        page = "A bioRxiv study of RNA design\nDOI: 10.1101/2025.01.01.123456\nAbstract"
        pdf_text.return_value = (page, page)
        crossref.return_value = {
            "type": "posted-content",
            "DOI": "10.1101/2025.01.01.123456",
            "title": ["A bioRxiv study of RNA design"],
            "container-title": ["bioRxiv"],
        }
        crossref_title.return_value = None

        result = pipeline.inspect_file(self.file("biorxiv.pdf"))

        self.assertEqual(result["status"], "ready")
        self.assertEqual(result["metadata"]["itemType"], "preprint")
        self.assertEqual(result["metadata"]["DOI"], "10.1101/2025.01.01.123456")
        self.assertEqual(result["metadata"]["repository"], "bioRxiv")

    def test_clean_title_ignores_article_label_masthead_and_authors(self):
        page = (
            "RESEARCH ARTICLE\n"
            "Nature | Vol 630 | 12 June 2024\n"
            "Accurate structure prediction of biomolecular interactions\n"
            "John Jumper, Richard Evans, and Alexander Pritzel\n"
            "Department of Biology, Example University\n"
            "Abstract\n"
            "Predicting biomolecular interactions is difficult."
        )
        self.assertEqual(
            pipeline._local_title(page),
            "Accurate structure prediction of biomolecular interactions",
        )

    def test_title_evidence_accepts_wrapped_title_with_preprint_line_numbers(self):
        title = "Generalized biomolecular modeling and design with RoseTTAFold All-Atom"
        page = "1\nGeneralized biomolecular modeling and design with\n2\nRoseTTAFold All-Atom\n3\nAbstract\nResults"
        self.assertTrue(pipeline._title_evidence(page, title))

    @patch("pipeline._crossref")
    @patch("pipeline._pdf_text")
    def test_official_filename_doi_recovers_paper_without_print_title(self, pdf_text, crossref):
        page = "Nature Reviews | Citation metadata\nAbstract\nThis review discusses therapeutic targets."
        pdf_text.return_value = (page, page)
        crossref.return_value = {
            "type": "journal-article",
            "DOI": "10.1038/s41573-021-00283-5",
            "title": ["Therapeutic targeting of tumour metabolism"],
        }
        result = pipeline.inspect_file(self.file("s41573-021-00283-5.pdf"))
        self.assertEqual(result["status"], "ready")
        self.assertIn("文件名 DOI", result["reason"])

    def test_obvious_nonpapers_are_excluded_by_specific_evidence(self):
        cases = [
            ("advances.sciencemag.org/cgi/content/full/6/17/eaay9093/DC1\n"
             "Supplementary Materials for Cell Signaling\nFigure S1", "aay9093_sm.pdf", "补充材料"),
            ("文献汇报\n汇报人：张三\nCell paper summary", "paper.pdf", "文献汇报"),
            ("高德地图—打车——行程单\n2026-03-01", "trip.pdf", "行程单"),
            ("上海交通大学物理实验报告\n学生姓名：张三", "lab.pdf", "实验报告"),
            ("证券研究报告\n投资评级：买入\n免责声明", "market.pdf", "金融研究"),
            ("Page 1 of 23\nnytimes.com/2025/magazine/example", "page.pdf", "新闻"),
            ("产品说明书\n试剂盒使用方法\n仅供科研使用", "manual.pdf", "产品说明"),
            ("实验总流程设计图 Part 1\n实验目的：观察表型", "protocol.pdf", "课程材料"),
            ("奖项公示\n各参赛单位：\n公示时间：2024年8月", "notice.pdf", "行政表单"),
            ("LINCOMYCIN- lincomycin hydrochloride injection, solution\nWARNING", "label.pdf", "药品标签"),
        ]
        for page, name, reason in cases:
            with self.subTest(name=name):
                self.assertIn(reason, pipeline._exclusion_reason(page, page, name))
        self.assertIn("数据图", pipeline._exclusion_reason("", "", "diff_GO_enrichment.pdf"))
        self.assertIn("课程资料", pipeline._exclusion_reason("", "", "quiz01.pdf"))
        self.assertIn("课程资料", pipeline._exclusion_reason("", "", "生化辅导讲义.pdf"))
        self.assertIn("数据图", pipeline._exclusion_reason("", "", "Human_M_heatmap.pdf"))
        self.assertIn("行政通知", pipeline._exclusion_reason("", "", "2026年停电通知.pdf"))
        self.assertIn("书籍", pipeline._exclusion_reason("", "", "龙族の淫密史.pdf"))
        self.assertEqual(pipeline._exclusion_reason("", "", "旧第一.pdf"), "")
        self.assertIn("书籍", pipeline._exclusion_reason(
            "《论语》\n作者：孔子\n论语序说", "《论语》\n作者：孔子\n论语序说", "book.pdf"
        ))

    def test_title_evidence_ignores_jats_markup_and_soft_hyphens(self):
        remote = (
            "B‐Cell Repertoire of Children With Atopic Dermatitis Exhibits Altered\n"
            "<scp>IgE</scp> Maturation Associated With Allergic Food Sensitization"
        )
        page = (
            "B-\xadCell Repertoire of Children With Atopic Dermatitis Exhibits Altered "
            "IgE Maturation Associated With Allergic Food Sensitization"
        )
        self.assertTrue(pipeline._title_evidence(page, remote))

    def test_spaced_course_and_group_markers_are_excluded(self):
        self.assertIn(
            "课程材料",
            pipeline._exclusion_reason("实 验 总 流 程 设 计 图", "实 验 总 流 程 设 计 图"),
        )
        self.assertIn(
            "文献汇报",
            pipeline._exclusion_reason("生物技术助力火星生存\nG ro up 7\n成员",
                                       "生物技术助力火星生存\nG ro up 7\n成员"),
        )
        self.assertIn(
            "课程资料",
            pipeline._exclusion_reason("放线菌基因工程", "放线菌基因工程", "放线菌基因工程.pdf"),
        )

    def test_internal_method_report_and_training_plan_are_excluded(self):
        method = "Method 1. 目的与适用范围\nV4 组合使用互补工具。"
        self.assertIn("项目报告", pipeline._exclusion_reason(method, method, "method_joint_v4.pdf"))
        plan = "上海交通大学研究生培养计划（课程学习）\n姓名 张三\n课程学习计划"
        self.assertIn("行政通知", pipeline._exclusion_reason(plan, plan, "training-plan.pdf"))

    @patch("pipeline.time.sleep")
    @patch("pipeline.urllib.request.urlopen")
    def test_crossref_json_retries_rate_limit_then_succeeds(self, urlopen, sleep):
        error = urllib.error.HTTPError("https://api.crossref.org", 429, "rate limit", {}, None)
        response = MagicMock()
        response.__enter__.return_value.read.return_value = b'{"ok": true}'
        urlopen.side_effect = [error, response]
        result = pipeline._fetch_json(MagicMock())
        self.assertEqual(result, {"ok": True})
        sleep.assert_called_once_with(1)

    def test_real_article_mentions_do_not_trigger_nonpaper_exclusions(self):
        page = (
            "Informed consent was obtained from all participants.\n"
            "The user manual for the software is cited in the methods.\n"
            "This journal club discussed the article, but the document is an original research paper.\n"
            "Supporting Information is available from the publisher sidebar.\n"
            "Results and Discussion\n"
        )
        self.assertEqual(pipeline._exclusion_reason(page, page, "article.pdf"), "")

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
