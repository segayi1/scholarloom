import hashlib
import io
import json
import os
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request
from pathlib import Path
from unittest.mock import patch

import pipeline
import server

try:
    import pymupdf as fitz
except ImportError:
    fitz = None


class WorkbenchServerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.app = server.Workbench(self.root / "data")
        self.addCleanup(self.app.db.close)
        self.input = self.root / "downloads"
        self.input.mkdir()
        self.app.settings["watch_folders"] = [str(self.input)]
        self.app.settings["auto_summary"] = False

    def add_job(self, path, *, status="queued", sha="", result=None):
        with self.app.lock, self.app.db:
            self.app.db.execute(
                "INSERT INTO jobs(path,sha256,status,reason,title,updated,result) VALUES (?,?,?,?,?,?,?)",
                (str(path), sha, status, "", "", time.time(), server.dumps(result) if result else None),
            )
            return dict(self.app.db.execute("SELECT * FROM jobs WHERE path=?", (str(path),)).fetchone())

    def get_job(self, path):
        with self.app.lock:
            return dict(self.app.db.execute("SELECT * FROM jobs WHERE path=?", (str(path),)).fetchone())

    def make_pdf(self, name, *page_texts):
        document = fitz.open()
        for text in page_texts:
            page = document.new_page()
            page.insert_text((72, 90), text)
        path = self.input / name
        document.save(path)
        document.close()
        return path

    @unittest.skipUnless(os.name == "nt", "Windows DPAPI only")
    def test_dpapi_credentials_roundtrip_never_writes_plaintext(self):
        secret = "model-key-do-not-leak-123"

        def fake_protect(payload, decrypt=False):
            if decrypt:
                self.assertTrue(payload.startswith(b"sealed:"))
                return payload[7:][::-1]
            return b"sealed:" + payload[::-1]

        with patch("server.protect", side_effect=fake_protect):
            self.app.credentials = {"model_key": secret, "zotero_key": "zotero-secret"}
            self.app.save_credentials()
            stored = (self.app.data / "secrets.bin").read_bytes()
            self.assertNotIn(secret.encode(), stored)
            self.assertEqual(self.app.read_credentials()["model_key"], secret)

    @unittest.skipUnless(os.name == "nt", "Windows DPAPI only")
    def test_windows_credentials_are_dpapi_protected(self):
        self.app.credentials = {"model_key": "windows-secret"}
        self.app.save_credentials()
        stored = (self.app.data / "secrets.bin").read_bytes()
        self.assertNotIn(b"windows-secret", stored)
        self.assertEqual(self.app.read_credentials()["model_key"], "windows-secret")

    def test_state_omits_private_text_and_model_credentials(self):
        self.app.credentials["model_key"] = "state-secret-model-key"
        row = {"key": "PRIVATE1", "title": "Fixture", "_text": "private full text", "_path": "C:/private/file.pdf"}
        self.app.save_document(row)
        encoded = json.dumps(self.app.state(), ensure_ascii=False)
        self.assertNotIn("state-secret-model-key", encoded)
        self.assertNotIn("_text", encoded)
        self.assertNotIn("private full text", encoded)
        self.assertNotIn("C:/private/file.pdf", encoded)
        self.assertIn("has_model_key", encoded)

    def test_state_builds_topic_guides_from_fresh_library(self):
        self.app.save_document({"key": "TOPIC1", "title": "Paper", "category": "神经科学与行为", "_text": "private"})
        guides = self.app.state()["guides"]
        self.assertEqual(len(guides), 1)
        self.assertEqual(guides[0]["name"], "神经科学与行为")
        self.assertEqual(guides[0]["reading"], ["TOPIC1"])

    def test_generated_routes_filter_ids_and_persist(self):
        self.app.save_document({"key": "ROUTE1", "title": "A", "question": "Q", "method": "M", "oneSentence": "S", "_text": "private"})
        answer = server.dumps({"routes": [{"title": "问题路线", "description": "从问题到方法", "keys": ["ROUTE1", "UNKNOWN", "ROUTE1"]}]})
        with patch.object(self.app, "call_model", return_value=answer) as call_model:
            result = self.app.generate_guide_routes()
        self.assertEqual(result["routes"][0]["keys"], ["ROUTE1"])
        self.assertEqual(self.app.get_kv("guide_routes"), result["routes"])
        self.assertEqual(self.app.state()["routes"], result["routes"])
        material = call_model.call_args.args[0][1]["content"]
        self.assertNotIn("private", material)
        self.assertIn('"question": "Q"', material)

    def test_route_generation_requires_documents_and_model(self):
        with self.assertRaisesRegex(ValueError, "没有可用于生成"):
            self.app.generate_guide_routes()
        self.app.save_document({"key": "ROUTE1", "title": "A"})
        with self.assertRaisesRegex(ValueError, "请在设置中填写模型名和 API 密钥"):
            self.app.generate_guide_routes()

    def test_guides_generate_http_route_is_csrf_protected(self):
        httpd, port = self.start_http()
        url = f"http://127.0.0.1:{port}/api/guides-generate"
        request = urllib.request.Request(url, data=b"{}", headers={"Content-Type": "application/json"}, method="POST")
        with self.assertRaises(urllib.error.HTTPError) as caught:
            urllib.request.urlopen(request, timeout=3)
        self.assertEqual(caught.exception.code, 403)

        self.app.save_document({"key": "HTTP1", "title": "A"})
        answer = server.dumps({"routes": [{"title": "Route", "description": "Description", "keys": ["HTTP1"]}]})
        request = urllib.request.Request(url, data=b"{}", headers={
            "Content-Type": "application/json", "Origin": f"http://127.0.0.1:{port}",
            "X-Workbench-Token": self.app.csrf,
        }, method="POST")
        with patch.object(self.app, "call_model", return_value=answer):
            with urllib.request.urlopen(request, timeout=3) as response:
                result = json.load(response)
        self.assertEqual(result["routes"][0]["keys"], ["HTTP1"])

    def test_invalid_generated_routes_preserve_previous_routes(self):
        self.app.save_document({"key": "ROUTE1", "title": "A"})
        previous = [{"title": "Existing", "description": "Existing route", "keys": ["ROUTE1"]}]
        self.app.set_kv("guide_routes", previous)
        self.app.guides["routes"] = previous
        with patch.object(self.app, "call_model", return_value='{"routes":[{"title":"bad","description":"bad","keys":"ROUTE1"}]}'):
            with self.assertRaisesRegex(ValueError, "格式无效"):
                self.app.generate_guide_routes()
        self.assertEqual(self.app.get_kv("guide_routes"), previous)

    def test_model_rejects_truncated_and_reasoning_only_responses(self):
        self.app.settings.update(model_name='fixture', model_url='http://localhost:1234')
        for choice in ({'finish_reason': 'length', 'message': {'content': 'partial'}},
                       {'finish_reason': 'stop', 'message': {'content': '', 'reasoning_content': 'not a final answer'}}):
            payload = json.dumps({'choices': [choice]}).encode()
            with patch('server.urllib.request.build_opener') as build:
                build.return_value.open.return_value = io.BytesIO(payload)
                with self.assertRaisesRegex(ValueError, '模型输出未完整结束'):
                    self.app.call_model([{'role': 'user', 'content': 'test'}])

    def test_thinking_option_is_only_sent_to_deepseek(self):
        self.app.settings.update(model_name='fixture')
        self.app.credentials['model_key'] = 'fixture'
        for url, expected in [('https://api.deepseek.com', True), ('https://example.com', False)]:
            self.app.settings['model_url'] = url
            with patch('server.urllib.request.build_opener') as build:
                build.return_value.open.return_value = io.BytesIO(json.dumps({'choices': [{'message': {'content': 'ok'}}]}).encode())
                self.app.call_model([{'role': 'user', 'content': 'test'}], disable_thinking=True)
                request = build.return_value.open.call_args.args[0]
                self.assertEqual('thinking' in json.loads(request.data), expected)

    def test_summary_language_controls_generated_content(self):
        self.app.settings["summary_language"] = "en"
        self.app.save_document({"key": "LANG1", "title": "Fixture paper", "kind": "journalArticle",
                                "_abstract": "A controlled fixture abstract.", "flags": []})
        answer = json.dumps({"zhTitle": "Fixture paper", "oneSentence": "English summary.",
                             "question": "Question", "method": "Method", "studyModel": "Model",
                             "findings": [], "useCase": "Use", "limitations": "",
                             "keywords": [], "subtopics": [], "category": server.CATEGORIES[0],
                             "studyType": "Journal article"})
        with patch.object(self.app, "call_model", return_value=answer) as call_model:
            self.app.summarize("LANG1")
        messages = call_model.call_args.args[0]
        self.assertIn("written in English", messages[0]["content"])
        self.assertIn('"source_basis": "Publication abstract"', messages[1]["content"])
        row = next(row for row in self.app.documents(True) if row["key"] == "LANG1")
        self.assertEqual(row["summaryLanguage"], "en")

    def test_summary_json_recovers_wrapped_content_and_retries_truncation(self):
        wrapped = 'Result follows:\n```json\n{"zhTitle":"Fixture","oneSentence":"Complete."}\n```'
        value = server.parse_model_json(wrapped)
        self.assertEqual(value["oneSentence"], "Complete.")
        normalized = server.validate_summary({
            "zhTitle": "Fixture", "oneSentence": "Summary.", "limitations": ["One", "Two"],
            "findings": ["1", "2", "3", "4", "5"], "keywords": list("abcdefghi"),
            "subtopics": ["a", "b", "c", "d", "e"], "category": server.CATEGORIES[0],
        })
        self.assertEqual(normalized["limitations"], "One；Two")
        self.assertEqual(len(normalized["findings"]), 4)
        self.assertEqual(len(normalized["keywords"]), 8)
        self.assertEqual(len(normalized["subtopics"]), 4)
        normalized = server.validate_summary({
            "zhTitle": "Fixture", "oneSentence": "Summary.", "category": server.CATEGORIES[0],
            "findings": [], "keywords": [], "subtopics": [],
            "readingDecision": {"decision": "skim", "fit": "Background only", "focus": ["Context"],
                                "concerns": [], "nextAction": "Read the conclusion first."},
        })
        self.assertEqual(normalized["readingDecision"]["decision"], "skim")
        with self.assertRaises(ValueError):
            server.validate_summary({"zhTitle": "Fixture", "oneSentence": "Summary.",
                                     "category": server.CATEGORIES[0],
                                     "findings": [], "keywords": [], "subtopics": [],
                                     "readingDecision": {"decision": "must_read"}})
        self.app.save_document({"key": "RETRY1", "title": "Retry paper", "kind": "journalArticle",
                                "_abstract": "Fixture.", "flags": [], "zoteroLinked": False})
        job = self.add_job(self.input / "retry.pdf", status="imported")
        with self.app.lock, self.app.db:
            self.app.db.execute("UPDATE jobs SET item_key='RETRY1' WHERE id=?", (job["id"],))
        answer = json.dumps({"zhTitle": "Retry paper", "oneSentence": "Recovered summary.",
                             "question": "", "method": "", "studyModel": "", "findings": [],
                             "useCase": "", "limitations": "", "keywords": [], "subtopics": [],
                             "category": server.CATEGORIES[0], "studyType": "Journal article",
                             "readingDecision": {"decision": "read", "fit": "Relevant",
                                                 "focus": ["Methods"], "concerns": [],
                                                 "nextAction": "Check the control arm."}})
        with patch.object(self.app, "call_model", side_effect=["not valid json", answer]) as call_model:
            self.app.summarize("RETRY1")
        self.assertEqual(call_model.call_count, 2)
        self.assertEqual(call_model.call_args.args[1], 6000)
        self.assertTrue(call_model.call_args.kwargs["json_mode"])
        self.assertEqual(self.get_job(self.input / "retry.pdf")["reason"], "已保存到本地资料库，并生成速读")
        saved = next(row for row in self.app.documents(True) if row["key"] == "RETRY1")
        self.assertEqual(saved["readingDecision"]["decision"], "read")

    def test_summary_batch_continues_after_one_failure(self):
        for key in ("BATCH1", "BATCH2"):
            self.app.save_document({"key": key, "title": key, "_abstract": "Fixture.", "flags": ["速读/待生成"]})

        def summarize(key):
            if key == "BATCH1":
                raise ValueError("fixture failure")

        with patch.object(self.app, "summarize", side_effect=summarize):
            self.app.run_summaries(["BATCH1", "BATCH2"])
            deadline = time.time() + 3
            while self.app.get_kv("summary_status").get("status") == "running" and time.time() < deadline:
                time.sleep(0.01)
        status = self.app.get_kv("summary_status")
        self.assertEqual(status["status"], "done")
        self.assertEqual((status["completed"], status["failed"], status["total"]), (1, 1, 2))
        self.assertEqual(status["failures"][0]["key"], "BATCH1")

    def test_summary_batch_retains_all_failures_for_retry(self):
        keys = [f'FAIL{i}' for i in range(25)]
        for key in keys:
            self.app.save_document({'key': key, 'title': key})
        with patch.object(self.app, 'summarize', side_effect=ValueError('failed')):
            self.app.run_summaries(keys)
            deadline = time.time() + 3
            while self.app.get_kv('summary_status')['status'] == 'running' and time.time() < deadline:
                time.sleep(0.01)
        result = self.app.get_kv('summary_status')
        self.assertEqual(result['failed'], 25)
        self.assertEqual([item['key'] for item in result['failures']], keys)

    def test_prompt_presets_persist_and_reset(self):
        custom = {"methodology": {"prompt_en": "Custom audit prompt", "prompt_zh": "自定义审查提示词"}}
        self.app.set_prompt_presets(custom)
        self.assertEqual(self.app.get_kv("settings")["prompt_presets"]["methodology"]["prompt_en"], "Custom audit prompt")
        self.assertEqual(self.app.prompt_text("methodology", "en"), "Custom audit prompt")
        self.app.reset_prompt_presets()
        self.assertEqual(self.app.prompt_text("methodology", "en"), server.DEFAULT_PROMPT_PRESETS["methodology"]["prompt_en"])

    def test_paper_chat_uses_evidence_prompt_and_effective_language(self):
        self.app.settings.update(summary_language="auto", ui_language="en")
        self.app.save_document({"key": "CHAT1", "title": "Fixture paper", "_text": "Evidence on page one.", "flags": []})
        with patch.object(self.app, "call_model", return_value="Supported [Page 1]") as call_model:
            result = self.app.paper_chat("CHAT1", "What did the study show?", "methodology")
        messages = call_model.call_args.args[0]
        self.assertEqual(result["language"], "en")
        self.assertEqual(result["answer"], "Supported [Page 1]")
        self.assertIn("[Page N]", messages[0]["content"])
        self.assertIn("study design", messages[0]["content"])
        self.assertEqual(messages[1]["role"], "user")

    def test_paper_chat_optional_online_sources_are_separate_from_paper_evidence(self):
        self.app.save_document({"key": "WEBCHAT", "title": "Fixture paper", "_text": "Paper evidence.", "flags": []})
        found = {"status": "ok", "sources": [{"title": "External study", "url": "https://example.org/paper", "abstract": "Web abstract."}], "error": None}
        with patch("server.search_literature_context", return_value=found) as search, \
             patch.object(self.app, "call_model", return_value="Answer [E1] [W1]") as model:
            result = self.app.paper_chat("WEBCHAT", "Only this question", online_search=True)
        search.assert_called_once_with("Only this question")
        self.assertEqual(result["external_search_status"], "ok")
        self.assertEqual(result["external_sources"], found["sources"])
        self.assertIn("[W1] External study", model.call_args.args[0][-1]["content"])
        self.assertEqual([item["id"] for item in result["citations"]], ["E1"])
        history = self.app.memory.history("default", "WEBCHAT")
        self.assertEqual(history[-1]["evidence"]["external_sources"], found["sources"])
        self.assertEqual(history[-1]["evidence"]["external_search_status"], "ok")

    def test_online_sources_fit_the_same_context_budget_as_paper_evidence(self):
        self.app.save_document({"key": "BUDGET", "title": "Paper", "_text": "Paper evidence.", "flags": []})
        sources = [{"title": f"Source {i}", "url": f"https://example.org/{i}", "abstract": "x" * 1200} for i in range(5)]
        context = {"status": "ok", "sources": sources, "error": None}
        with patch("server.search_literature_context", return_value=context), \
             patch.object(self.app.evidence, "format", return_value="e" * 40000), \
             patch.object(self.app, "call_model", return_value="Answer [W1]") as model:
            result = self.app.paper_chat("BUDGET", "Question?", online_search=True)
        messages = model.call_args.args[0]
        self.assertLessEqual(server.input_units(messages) + 2800 + 1024, 32768)
        self.assertEqual(result['budget']['input_units'], server.input_units(messages))
        self.assertTrue(result['budget']['evidence_truncated'])
        self.assertIn('[W5]', messages[-1]['content'])

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for deep-reading tests")
    def test_deep_read_api_binds_analysis_to_current_pdf_and_falls_back_without_image(self):
        pdf = self.make_pdf("deep-read.pdf", "Figure caption and segment text.")
        self.app.save_document({"key": "DEEP1", "title": "PDF", "_path": str(pdf), "flags": []})
        extracted = {"page_count": 1, "segments": [{"type": "caption", "page": 1, "text": "Figure caption and segment text.", "bbox": [10, 10, 200, 30]}],
                     "figure_candidates": [{"page": 1, "figure_number": "1", "caption": "Figure 1 result", "bbox": [0.1, 0.1, 0.8, 0.8], "status": "candidate", "confidence": "low", "reason": "fixture"}]}
        with patch("server.deep_read_pdf", return_value=extracted):
            listing = self.app.deep_read("DEEP1")
            self.assertEqual(listing["segments"][0]["index"], 0)
            request = {"key": "DEEP1", "version": listing["version"], "segment_index": 0, "candidate_index": 0, "include_image": True}
            with patch.object(self.app, "call_model", side_effect=[urllib.error.HTTPError("https://model", 400, "image unsupported", {}, None), "Text-only analysis"] ) as call:
                result = self.app.analyze_deep_read(request)
            self.assertFalse(result["image_included"])
            self.assertIsInstance(call.call_args.args[0][1]["content"], str)
            self.assertEqual(self.app.deep_read("DEEP1")["analyses"][0]["analysis"], "Text-only analysis")
            with self.assertRaisesRegex(ValueError, "版本已变化"):
                self.app.analyze_deep_read({**request, "version": "stale"})
            auth_error = urllib.error.HTTPError("https://model", 401, "unauthorized", {}, None)
            with patch.object(self.app, "call_model", side_effect=auth_error) as call:
                with self.assertRaises(urllib.error.HTTPError):
                    self.app.analyze_deep_read(request)
            call.assert_called_once()

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for saved deep-reading tests")
    def test_legacy_deep_read_analysis_follows_original_text_when_order_changes(self):
        pdf = self.make_pdf("legacy-deep.pdf", "Existing paper.")
        self.app.save_document({"key": "LEGACY", "title": "PDF", "_path": str(pdf), "flags": []})
        version = server.FigureStore.version(pdf)
        left = dict(page=1, text='Left', bbox=[0, 10, 100, 20])
        right = dict(page=1, text='Right', bbox=[300, 20, 400, 30])
        below = dict(page=1, text='Left below', bbox=[0, 30, 100, 40])
        old = dict(page_count=1, segments=[left, right, below], figure_candidates=[])
        current = dict(page_count=1, segments=[left, below, right], figure_candidates=[])
        original = dict(paper_id='LEGACY', version=version, segment_index=1, candidate_index=None,
                        analysis='Right analysis', image_included=False, updated_at=1)
        self.app.set_kv('deep_read_analyses', [original])
        with patch('server.deep_read_pdf', side_effect=lambda path, legacy_order=False: old if legacy_order else current):
            listed = self.app.deep_read('LEGACY')
        self.assertEqual(listed['analyses'][0]['segment_index'], 2)
        self.assertEqual(listed['segments'][2]['text'], 'Right')
        self.assertEqual(self.app.get_kv('deep_read_analyses'), [original])

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for manual figure tests")
    def test_deep_read_manual_figure_is_bound_to_paper_project_and_version(self):
        pdf = self.make_pdf("manual.pdf", "A paragraph and Figure 1 caption.")
        self.app.save_document({"key": "MANUAL", "title": "PDF", "_path": str(pdf), "flags": []})
        self.app.save_document({"key": "OTHER", "title": "PDF", "_path": str(pdf), "flags": []})
        version = server.FigureStore.version(pdf)
        rect = dict(x0=0.1, y0=0.1, x1=0.8, y1=0.8)
        figure = self.app.figures.create("MANUAL", "project1", version, 1, rect, "1", "", pdf)
        extracted = {"page_count": 1, "segments": [{"type": "paragraph", "page": 1, "text": "A paragraph.", "bbox": [10, 10, 100, 30]}], "figure_candidates": []}
        request = dict(key="MANUAL", version=version, project="project1", segment_index=0,
                       candidate_index=None, figure_id=figure['id'], include_image=True)
        with patch("server.deep_read_pdf", return_value=extracted), patch.object(self.app, "call_model", return_value="Analysis") as model:
            result = self.app.analyze_deep_read(request)
            self.assertTrue(result['image_included'])
            self.assertEqual(result['figure_id'], figure['id'])
            self.assertEqual(model.call_args.args[0][1]['content'][1]['type'], 'image_url')
            self.assertEqual(self.app.deep_read("MANUAL")['analyses'][0]['figure_id'], figure['id'])
            for invalid in ({'project': 'project2'}, {'key': 'OTHER'}, {'version': 'stale'}, {'candidate_index': 0}):
                with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                    self.app.analyze_deep_read({**request, **invalid})
            self.app.figures.delete(figure['id'])
            with self.assertRaises(ValueError):
                self.app.analyze_deep_read(request)

    def test_deep_read_rejects_image_without_candidate_and_invalid_flags(self):
        self.app.save_document({"key": "DEEP2", "title": "PDF", "_path": str(self.make_pdf("plain.pdf", "Paragraph.")), "flags": []})
        extracted = {"page_count": 1, "segments": [{"type": "paragraph", "page": 1, "text": "Paragraph.", "bbox": [10, 10, 100, 30]}], "figure_candidates": []}
        with patch("server.deep_read_pdf", return_value=extracted):
            version = self.app.deep_read("DEEP2")["version"]
            with self.assertRaisesRegex(ValueError, "选择图候选"):
                self.app.analyze_deep_read({"key": "DEEP2", "version": version, "segment_index": 0, "include_image": True})
            with self.assertRaisesRegex(ValueError, "布尔值"):
                self.app.analyze_deep_read({"key": "DEEP2", "version": version, "segment_index": 0, "include_image": "true"})

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for full-reading tests")
    def test_full_read_worker_keeps_paragraph_headings_and_verified_locations(self):
        pdf = self.make_pdf("full-read.pdf", "First page paragraph.", "Second page paragraph.")
        self.app.save_document({"key": "FULL1", "title": "Full read", "_path": str(pdf), "flags": []})
        version = server.FigureStore.version(pdf)
        run_id = "run-full-1"
        created = time.time()
        page_results = [
            {"page": 1, "pageKind": "content", "section": "Introduction",
             "pageSummary": "First page summary.",
             "items": [{"id": "P1-I1", "kind": "paragraph", "heading": "First claim", "sourceText": "First page paragraph.",
                        "summary": "First summary.", "analysis": "Detailed first interpretation.",
                        "evidence": "", "limitations": [], "status": "author_stated",
                        "figureNumber": "", "page": 1, "rects": [{"x": .1, "y": .1, "width": .8, "height": .1}],
                        "locationStatus": "located_quote"}],
             "warnings": []},
            {"page": 2, "pageKind": "content", "section": "Results",
             "pageSummary": "Second page summary.",
             "items": [{"id": "P2-I1", "kind": "paragraph", "heading": "Second claim", "sourceText": "Second page paragraph.",
                        "summary": "Second summary.", "analysis": "Detailed second interpretation.",
                        "evidence": "", "limitations": [], "status": "inferred",
                        "figureNumber": "", "page": 2, "rects": [],
                        "locationStatus": "page_only"}],
             "warnings": [{"page": 2, "message": "Page only."}]},
        ]
        overview = {"oneSentence": "The paper has two claims.", "researchQuestion": "Question",
                    "studyDesign": "Design", "mainFindings": ["A", "B"],
                    "argumentMap": ["Step"], "limitations": []}
        units = [{"id": "U1", "unitType": "experiment", "heading": "Experiment one",
                  "question": "Question", "design": "Design", "result": "Results",
                  "interpretation": "The two verified claims form one complete experiment.",
                  "figureInterpretation": "", "figureItemIds": [], "figureNumbers": [],
                  "sourceItemIds": ["P1-I1", "P2-I1"], "pages": [1, 2],
                  "limitations": [], "status": "reported_result"}]
        unit_coverage = {"items": 2, "assigned": 2, "missingItemIds": [], "figures": 0, "units": 1}
        with patch.object(self.app, "_analyze_full_read_page", side_effect=page_results), \
             patch.object(self.app, "_full_read_units", return_value=(units, unit_coverage, [])), \
             patch.object(self.app, "_full_read_overview", return_value=(overview, [])):
            self.app._run_full_read(run_id, "FULL1", pdf, version, "zh", created, 2)
        record = self.app.get_full_read("FULL1")
        self.assertEqual(record["status"], "done")
        self.assertEqual([item["heading"] for item in record["value"]["items"]], ["First claim", "Second claim"])
        self.assertEqual(record["value"]["coverage"]["located"], 1)
        self.assertEqual(record["value"]["coverage"]["pageOnly"], 1)
        self.assertEqual(record["value"]["overview"]["oneSentence"], "The paper has two claims.")
        self.assertEqual(record["value"]["units"][0]["sourceItemIds"], ["P1-I1", "P2-I1"])
        self.assertNotIn("FULL1", self.app.full_read_jobs)

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for full-reading tests")
    def test_full_read_resume_reuses_successful_pages_and_cancellation_preserves_them(self):
        pdf = self.make_pdf("resume.pdf", "First page.", "Second page.")
        self.app.save_document({"key": "RESUME", "title": "Resume", "_path": str(pdf), "flags": []})
        version = server.FigureStore.version(pdf)
        saved = {"page": 1, "items": [{"id": "P1-I1", "locationStatus": "page_only"}], "warnings": []}
        value = {"runId": "resume", "status": "running", "pages": [saved], "items": [],
                 "warnings": [], "overview": None, "progress": {"current": 1, "total": 2}}
        second = {"page": 2, "items": [{"id": "P2-I1", "locationStatus": "page_only"}], "warnings": []}
        units = ([{"sourceItemIds": ["P1-I1", "P2-I1"]}],
                 {"units": 1, "assigned": 2, "missingItemIds": []}, [])
        with patch.object(self.app, "_analyze_full_read_page", return_value=second) as analyze, \
             patch.object(self.app, "_full_read_units", return_value=units), \
             patch.object(self.app, "_full_read_overview", return_value=({}, [])):
            self.app._run_full_read("resume", "RESUME", pdf, version, "zh", time.time(), 2, value)
        self.assertEqual(analyze.call_count, 1)
        self.assertEqual(analyze.call_args.args[1]["page"], 2)
        result = self.app.full_reads.get("RESUME", version, "zh")
        self.assertEqual(result["status"], "done")
        self.assertEqual([p["page"] for p in result["value"]["pages"]], [1, 2])

        event = threading.Event()
        event.set()
        cancelled = {"runId": "cancel", "status": "running", "pages": [saved], "items": [],
                     "warnings": [], "overview": None, "progress": {"current": 1, "total": 2}}
        with patch.object(self.app, "_analyze_full_read_page") as analyze:
            self.app._run_full_read("cancel", "RESUME", pdf, version, "zh", time.time(), 2, cancelled, event)
        analyze.assert_not_called()
        result = self.app.full_reads.get("RESUME", version, "zh")
        self.assertEqual(result["status"], "cancelled")
        self.assertEqual(len(result["value"]["pages"]), 1)

    @unittest.skipUnless(fitz is not None, 'PyMuPDF is required for full-reading tests')
    def test_resume_reanalyzes_duplicate_and_invalid_cached_page_numbers(self):
        pdf = self.make_pdf('resume-page-ids.pdf', 'First.', 'Second.', 'Third.')
        self.app.save_document({'key': 'PAGEIDS', 'title': 'Page IDs', '_path': str(pdf)})
        version = server.FigureStore.version(pdf)
        def page(number):
            return {'page': number, 'items': [{'id': f'P{number}-I1', 'locationStatus': 'page_only'}], 'warnings': []}
        previous = {'status': 'partial', 'pages': [page(1), page(1), page(2), page(999), page('3')],
                    'items': [], 'warnings': [], 'progress': {'current': 2, 'total': 3}}
        self.app.full_reads.save('old-page-ids', 'PAGEIDS', version, 'zh', previous)
        units = ([{'sourceItemIds': ['P1-I1', 'P2-I1', 'P3-I1']}],
                 {'units': 1, 'assigned': 3, 'missingItemIds': []}, [])
        with patch.object(self.app, 'model_configured', return_value=True), \
             patch.object(self.app, '_analyze_full_read_page', side_effect=lambda path, source, language, **kw: page(source['page'])) as analyze, \
             patch.object(self.app, '_full_read_units', return_value=units), \
             patch.object(self.app, '_full_read_overview', return_value=({}, [])):
            self.app.start_full_read('PAGEIDS', 'resume')
            worker = self.app.full_read_jobs.get('PAGEIDS')
            if worker:
                worker.join(5)
        self.assertEqual([call.args[1]['page'] for call in analyze.call_args_list], [1, 3])
        current = self.app.full_reads.get('PAGEIDS', version, 'zh')
        self.assertEqual(current['status'], 'done')
        self.assertEqual([item['page'] for item in current['value']['pages']], [1, 2, 3])
        old = json.loads(self.app.db.execute("SELECT value FROM full_reads WHERE run_id='old-page-ids'").fetchone()[0])
        self.assertEqual([item['page'] for item in old['pages']], [1, 1, 2, 999, '3'])

    @unittest.skipUnless(fitz is not None, 'PyMuPDF is required for full-reading tests')
    def test_full_read_rejects_wrong_result_page_and_requires_exact_page_set(self):
        pdf = self.make_pdf('wrong-page-id.pdf', 'First.', 'Second.')
        self.app.save_document({'key': 'WRONGPAGE', 'title': 'Page IDs', '_path': str(pdf)})
        version = server.FigureStore.version(pdf)
        def page(number):
            return {'page': number, 'items': [{'id': f'P{number}-I1', 'locationStatus': 'page_only'}], 'warnings': []}
        units = ([{'sourceItemIds': ['P1-I1']}], {'units': 1, 'assigned': 1, 'missingItemIds': []}, [])
        with patch.object(self.app, '_analyze_full_read_page', side_effect=[page(1), page(1)]), \
             patch.object(self.app, '_full_read_units', return_value=units), \
             patch.object(self.app, '_full_read_overview', return_value=({}, [])):
            self.app._run_full_read('wrong-result', 'WRONGPAGE', pdf, version, 'zh', time.time(), 2)
        result = self.app.full_reads.get('WRONGPAGE', version, 'zh')
        self.assertEqual(result['status'], 'partial')
        self.assertEqual([item['page'] for item in result['value']['pages']], [1])
        self.assertEqual(result['value']['coverage']['failedPages'], 1)
        self.assertTrue(any('页码与请求页码不一致' in warning['message'] for warning in result['value']['warnings']))

        # Even a malformed index returning the same page twice cannot satisfy the completion gate.
        with patch.object(self.app.evidence, 'pages', return_value=[{'page': 1}, {'page': 1}]), \
             patch.object(self.app, '_analyze_full_read_page', return_value=page(1)), \
             patch.object(self.app, '_full_read_units', return_value=units), \
             patch.object(self.app, '_full_read_overview', return_value=({}, [])):
            self.app._run_full_read('duplicate-index', 'WRONGPAGE', pdf, version, 'zh', time.time(), 2)
        result = self.app.full_reads.get('WRONGPAGE', version, 'zh')
        self.assertEqual(len(result['value']['pages']), 2)
        self.assertEqual(result['status'], 'partial')
        self.assertFalse(result['value']['coverage']['pageSetValid'])
        self.assertTrue(any('页码不完整或存在重复' in warning['message'] for warning in result['value']['warnings']))

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for full-reading tests")
    def test_full_read_cancel_then_resume_does_not_repeat_completed_page(self):
        pdf = self.make_pdf("cancel-resume.pdf", "First page.", "Second page.")
        self.app.save_document({"key": "RUN", "title": "Run", "_path": str(pdf), "flags": []})
        entered, release = threading.Event(), threading.Event()
        calls = []
        def analyze(path, page, language, **kwargs):
            calls.append(page['page'])
            if page['page'] == 1:
                entered.set()
                self.assertTrue(release.wait(5))
            return {"page": page['page'], "items": [{"id": f"P{page['page']}-I1", "locationStatus": "page_only"}], "warnings": []}
        units = ([{"sourceItemIds": ["P1-I1", "P2-I1"]}],
                 {"units": 1, "assigned": 2, "missingItemIds": []}, [])
        with patch.object(self.app, "model_configured", return_value=True), \
             patch.object(self.app, "_analyze_full_read_page", side_effect=analyze), \
             patch.object(self.app, "_full_read_units", return_value=units), \
             patch.object(self.app, "_full_read_overview", return_value=({}, [])):
            self.app.start_full_read('RUN')
            self.assertTrue(entered.wait(5))
            self.assertEqual(self.app.state()['health']['fullReadActive'], 1)
            self.app.start_full_read('RUN', 'cancel')
            worker = self.app.full_read_jobs['RUN']
            release.set()
            worker.join(5)
            self.assertFalse(worker.is_alive())
            self.assertEqual(self.app.get_full_read('RUN')['status'], 'cancelled')
            self.app.start_full_read('RUN', 'resume')
            worker = self.app.full_read_jobs.get('RUN')
            if worker:
                worker.join(5)
            self.assertEqual(self.app.get_full_read('RUN')['status'], 'done')
        self.assertEqual(calls, [1, 2])

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for full-reading tests")
    def test_resume_filters_cached_bibliography_without_reprocessing_pages(self):
        pdf=self.make_pdf('resume-bibliography.pdf','A paper with its results and bibliography.')
        self.app.save_document({'key':'REF','title':'Reference test','_path':str(pdf)})
        version=server.FigureStore.version(pdf)
        body={'id':'P1-I1','kind':'paragraph','heading':'Results','locationStatus':'located_quote'}
        references={'id':'P1-I2','kind':'paragraph','heading':'参考文献列表（Smith至Jones）','locationStatus':'located_quote'}
        original={'status':'partial','pages':[{'page':1,'items':[body,references],'warnings':[]}],
                  'items':[body,references],'progress':{'current':1,'total':1}}
        self.app.full_reads.save('old','REF',version,'zh',original)
        def group(items, language):
            self.assertEqual([item['id'] for item in items],['P1-I1'])
            return ([{'sourceItemIds':['P1-I1']}],{'units':1,'assigned':1,'missingItemIds':[]},[])
        with patch.object(self.app,'model_configured',return_value=True), \
             patch.object(self.app,'_analyze_full_read_page') as analyze, \
             patch.object(self.app,'_full_read_units',side_effect=group), \
             patch.object(self.app,'_full_read_overview',return_value=({},[])):
            self.app.start_full_read('REF','resume')
            worker=self.app.full_read_jobs.get('REF')
            if worker: worker.join(5)
        analyze.assert_not_called()
        current=self.app.full_reads.get('REF',version,'zh')
        self.assertEqual(current['status'],'done')
        self.assertEqual([item['id'] for item in current['value']['items']],['P1-I1'])
        saved=json.loads(self.app.db.execute("SELECT value FROM full_reads WHERE run_id='old'").fetchone()[0])
        self.assertEqual([item['id'] for item in saved['items']],['P1-I1','P1-I2'])

    @unittest.skipUnless(fitz is not None, 'PyMuPDF is required for full-reading tests')
    def test_resume_reanalyzes_legacy_page_with_possible_source_truncation(self):
        pdf = self.make_pdf('resume-long.pdf', 'A result in a single page.')
        self.app.save_document({'key': 'LONG', 'title': 'Long source', '_path': str(pdf)})
        version = server.FigureStore.version(pdf)
        old = {'id': 'P1-I1', 'page': 1, 'kind': 'paragraph', 'heading': 'Result',
               'sourceText': 'a' * 5000, 'sourceVerified': True, 'locationStatus': 'located_quote'}
        previous = {'status': 'partial', 'pages': [{'page': 1, 'items': [old], 'warnings': []}],
                    'items': [old], 'warnings': [], 'progress': {'current': 1, 'total': 1}}
        self.app.full_reads.save('old-long', 'LONG', version, 'zh', previous)
        new_item = {'id': 'P1-I1', 'page': 1, 'kind': 'paragraph', 'heading': 'New',
                    'sourceText': 'New source', 'sourceVerified': True, 'locationStatus': 'located_quote'}
        page = {'page': 1, 'sourceValidationVersion': 2, 'items': [new_item], 'warnings': []}
        units = ([{'sourceItemIds': ['P1-I1']}], {'units': 1, 'assigned': 1, 'missingItemIds': []}, [])
        with patch.object(self.app, 'model_configured', return_value=True), \
             patch.object(self.app, '_analyze_full_read_page', return_value=page) as analyze, \
             patch.object(self.app, '_full_read_units', return_value=units), \
             patch.object(self.app, '_full_read_overview', return_value=({}, [])):
            self.app.start_full_read('LONG', 'resume')
            worker = self.app.full_read_jobs.get('LONG')
            if worker:
                worker.join(5)
        analyze.assert_called_once()
        current = self.app.full_reads.get('LONG', version, 'zh')
        self.assertEqual(current['value']['items'][0]['sourceText'], 'New source')
        persisted = json.loads(self.app.db.execute("SELECT value FROM full_reads WHERE run_id='old-long'").fetchone()[0])
        self.assertTrue(persisted['items'][0]['sourceVerified'])

    def test_full_read_keeps_overlapping_units_from_one_chunk_separate(self):
        items = [dict(id=f'I{i}', page=1, kind='paragraph', heading=f'Item {i}',
                      summary='Summary', analysis='Analysis', figureNumber='') for i in (1, 2, 3)]
        def unit(heading, ids):
            return dict(unitType='experiment', heading=heading, status='reported_result',
                        interpretation='This is a detailed interpretation of a separate experiment.',
                        sourceItemIds=ids, figureItemIds=[])
        response = dict(units=[unit('Experiment A', ['I1', 'I2']), unit('Experiment B', ['I2', 'I3'])])
        with patch.object(self.app, 'call_model', return_value=json.dumps(response)):
            units, coverage, warnings = self.app._full_read_units(items, 'en')
        self.assertEqual([unit['heading'] for unit in units], ['Experiment A', 'Experiment B'])
        self.assertEqual(coverage['assigned'], 3)
        self.assertEqual(coverage['duplicateItemIds'], ['I2'])
        self.assertTrue(any('I2' in warning for warning in warnings))

    def test_full_read_splits_truncated_unit_response_and_keeps_all_items(self):
        items = [dict(id=f'I{i}', page=1, kind='paragraph', heading=f'Item {i}',
                      summary='Summary', analysis='Analysis', figureNumber='') for i in range(4)]
        self.app.full_read_context.usage = {'retries': 0}
        def respond(messages, *args, **kwargs):
            chunk = json.loads(messages[1]['content'])['items']
            if len(chunk) > 2:
                raise ValueError('模型输出未完整结束，请重试。')
            return json.dumps({'units': [dict(unitType='experiment', heading='Recovered',
                status='reported_result', interpretation='A detailed interpretation of the recovered source items.',
                sourceItemIds=[item['id'] for item in chunk], figureItemIds=[])]})
        with patch.object(self.app, 'call_model', side_effect=respond) as model:
            units, coverage, warnings = self.app._full_read_units(items, 'en')
        self.assertEqual(model.call_count, 3)
        self.assertEqual(self.app.full_read_context.usage['retries'], 2)
        self.assertEqual(coverage['missingItemIds'], [])
        self.assertEqual({item for unit in units for item in unit['sourceItemIds']}, {item['id'] for item in items})
        self.assertTrue(any('拆分重试' in warning for warning in warnings))

    def test_full_read_retries_omitted_items_with_neighbours(self):
        items = [dict(id=f'I{i}', page=1, kind='paragraph', heading=f'Item {i}',
                      summary='Summary', analysis='Analysis') for i in range(1, 8)]
        self.app.full_read_context.usage = {'retries': 0}
        calls = []
        def respond(messages, *_args, **_kwargs):
            ids = [item['id'] for item in json.loads(messages[1]['content'])['items']]
            calls.append(ids)
            sources = ['I1', 'I4', 'I5', 'I7'] if len(calls) == 1 else ids
            return json.dumps({'units': [dict(unitType='methods', heading='Methods',
                interpretation='A sufficiently detailed interpretation of the reported methods.',
                status='author_stated', sourceItemIds=sources, figureItemIds=[])]})
        with patch.object(self.app, 'call_model', side_effect=respond):
            units, coverage, warnings = self.app._full_read_units(items, 'en')
        self.assertEqual(calls[1:], [['I1', 'I2', 'I3', 'I4'], ['I5', 'I6', 'I7']])
        self.assertEqual(self.app.full_read_context.usage['retries'], 2)
        self.assertEqual(coverage['missingItemIds'], [])
        self.assertEqual({i for unit in units for i in unit['sourceItemIds']}, {i['id'] for i in items})
        self.assertTrue(any('遗漏细项及相邻上下文' in warning for warning in warnings))

    def test_full_read_omission_retry_is_bounded_and_preserves_missing(self):
        items = [dict(id=f'I{i}', page=1, kind='paragraph', heading=f'Item {i}',
                      summary='Summary', analysis='Analysis') for i in range(1, 12)]
        def respond(messages, *_args, **_kwargs):
            ids = [item['id'] for item in json.loads(messages[1]['content'])['items']]
            sources = [i for i in ids if int(i[1:]) % 2 == 0]
            return json.dumps({'units': [dict(unitType='methods', heading='Methods',
                interpretation='A sufficiently detailed interpretation of the reported methods.',
                status='author_stated', sourceItemIds=sources, figureItemIds=[])]})
        with patch.object(self.app, 'call_model', side_effect=respond) as model:
            _, coverage, _ = self.app._full_read_units(items, 'en')
        self.assertEqual(model.call_count, 4)
        self.assertEqual(coverage['missingItemIds'], ['I1', 'I3', 'I5', 'I7', 'I9', 'I11'])

    def test_full_read_omission_retry_failure_and_cancellation(self):
        items = [dict(id=f'I{i}', page=1, kind='paragraph', heading=f'Item {i}',
                      summary='Summary', analysis='Analysis') for i in range(1, 3)]
        response = json.dumps({'units': [dict(unitType='methods', heading='Methods',
            interpretation='A sufficiently detailed interpretation of the reported methods.',
            status='author_stated', sourceItemIds=['I1'], figureItemIds=[])]})
        with patch.object(self.app, 'call_model', side_effect=[response, RuntimeError('retry failed')]):
            _, coverage, warnings = self.app._full_read_units(items, 'en')
        self.assertEqual(coverage['missingItemIds'], ['I2'])
        self.assertEqual(coverage['failedUnitBatches'], 1)
        self.assertTrue(any('重试失败' in warning for warning in warnings))
        event = threading.Event()
        self.app.full_read_context.cancel = event
        def cancel_after_first(*_args, **_kwargs):
            event.set()
            return response
        with patch.object(self.app, 'call_model', side_effect=cancel_after_first) as model, \
             self.assertRaises(server.FullReadCancelled):
            self.app._full_read_units(items, 'en')
        self.assertEqual(model.call_count, 1)

    def test_full_read_remembers_failed_batch_after_omissions_recovered(self):
        items = [dict(id=f'I{i}', page=1, kind='paragraph', heading=f'Item {i}',
                      summary='Summary', analysis='Analysis') for i in range(1, 31)]
        calls = 0
        def respond(messages, *_args, **_kwargs):
            nonlocal calls
            calls += 1
            if calls == 2:
                raise RuntimeError('batch unavailable')
            ids = [item['id'] for item in json.loads(messages[1]['content'])['items']]
            return json.dumps({'units': [dict(unitType='methods', heading='Methods',
                interpretation='A sufficiently detailed interpretation of the reported methods.',
                status='author_stated', sourceItemIds=ids, figureItemIds=[])]})
        forced_budget = lambda messages: 30000 if len(json.loads(messages[1]['content'])['items']) > 26 else 10000
        with patch('server.input_units', side_effect=forced_budget), \
             patch.object(self.app, 'call_model', side_effect=respond):
            _, coverage, warnings = self.app._full_read_units(items, 'en')
        self.assertEqual(coverage['missingItemIds'], [])
        self.assertEqual(coverage['failedUnitBatches'], 1)
        self.assertTrue(any('实验整理失败' in warning for warning in warnings))

    def test_full_read_split_retry_counts_only_requests_before_cancellation(self):
        items = [dict(id=f'I{i}', page=1, kind='paragraph', heading=f'Item {i}',
                      summary='Summary', analysis='Analysis', figureNumber='') for i in range(4)]
        event = threading.Event()
        self.app.full_read_context.cancel = event
        self.app.full_read_context.usage = {'retries': 0}
        def respond(messages, *args, **kwargs):
            chunk = json.loads(messages[1]['content'])['items']
            if len(chunk) > 2:
                raise ValueError('模型输出未完整结束，请重试。')
            event.set()
            return json.dumps({'units': [dict(unitType='experiment', heading='Recovered',
                status='reported_result', interpretation='A detailed interpretation of the recovered source items.',
                sourceItemIds=[item['id'] for item in chunk], figureItemIds=[])]})
        with patch.object(self.app, 'call_model', side_effect=respond), self.assertRaises(server.FullReadCancelled):
            self.app._full_read_units(items, 'en')
        self.assertEqual(self.app.full_read_context.usage['retries'], 1)

    def test_full_read_chunk_merge_preserves_ambiguous_bridges(self):
        items = [dict(id=f'I{i}', page=(i - 1) // 10 + 1,
                      kind='figure' if i == 25 else 'paragraph', heading=f'Item {i}',
                      summary='Summary', analysis='Analysis', figureNumber='1' if i == 25 else '')
                 for i in range(1, 31)]
        def unit(ids, figures=()):
            return dict(unitType='experiment', heading='Experiment', status='reported_result',
                        interpretation='This experiment combines several source items and reports a measured result.',
                        sourceItemIds=ids, figureItemIds=list(figures), figureInterpretation='Figure supports the result.')
        chunks = [dict(units=[unit([f'I{i}' for i in range(1, 20)] + ['I30']),
                              unit(['I20', 'I21', 'I22'])]),
                  dict(units=[unit([f'I{i}' for i in range(19, 30)], ['I25'])])]
        forced_budget=lambda messages: 30000 if len(json.loads(messages[1]['content'])['items'])>26 else 10000
        with patch('server.input_units', side_effect=forced_budget), \
             patch.object(self.app, 'call_model', side_effect=[json.dumps(chunk) for chunk in chunks]):
            units, coverage, _ = self.app._full_read_units(items, 'en')
        self.assertEqual(len(units), 3)
        self.assertEqual(coverage['missingItemIds'], ['I30'])
        self.assertEqual(coverage['duplicateItemIds'], ['I19', 'I20', 'I21', 'I22'])
        self.assertEqual(units[2]['figureItemIds'], ['I25'])
        self.assertEqual(units[2]['figureNumbers'], ['1'])
        self.assertEqual(units[2]['pages'], [2, 3])

    def test_full_read_chunk_merge_preserves_figure_reference_warnings(self):
        items = [dict(id=f'I{i}', page=1, kind='figure' if i in (1, 30) else 'paragraph',
                      heading=f'Item {i}', summary='Summary', analysis='Analysis',
                      figureNumber=str(i) if i in (1, 30) else '')
                 for i in range(1, 31)]
        def unit(ids, figures, result):
            return dict(unitType='experiment', heading='Experiment', status='reported_result',
                        result=result,
                        interpretation='This experiment reports a measured comparison and its related figures.',
                        sourceItemIds=ids, figureItemIds=figures)
        calls = 0
        def respond(messages, *_args, **_kwargs):
            nonlocal calls
            call = calls
            calls += 1
            ids = [item['id'] for item in json.loads(messages[1]['content'])['items']]
            figure = 'I30' if call else 'I1'
            base = [identifier for identifier in ids if identifier not in ('I19', figure)]
            result = 'Figure 2 reports the treated comparison.' if call == 0 \
                else 'Figure 1 reports the control comparison.'
            return json.dumps({'units': [
                unit(['I19'], [figure], result),
                unit(base, [], 'The methods support the reported experimental setup.')]})
        forced_budget = lambda messages: 30000 if len(json.loads(messages[1]['content'])['items']) > 26 else 10000
        with patch('server.input_units', side_effect=forced_budget), \
             patch.object(self.app, 'call_model', side_effect=respond):
            units, coverage, _ = self.app._full_read_units(items, 'en')
        merged = next(value for value in units if value['heading'] == 'Experiment')
        self.assertEqual(len(merged['sourceWarnings']), 2)
        self.assertTrue(any('Figure 1' in value for value in merged['sourceWarnings']))
        self.assertTrue(any('Figure 2' in value for value in merged['sourceWarnings']))
        self.assertEqual(coverage['missingItemIds'], [])

    def test_full_read_chunk_merge_preserves_one_to_many_matches(self):
        items = [dict(id=f'I{i}', page=1, kind='paragraph', heading=f'Item {i}',
                      summary='Summary', analysis='Analysis') for i in range(1, 31)]
        def unit(ids):
            return dict(unitType='experiment', heading='Experiment', status='reported_result',
                        interpretation='A detailed interpretation of this experimental result.',
                        sourceItemIds=ids, figureItemIds=[])
        chunks = [dict(units=[unit([f'I{i}' for i in range(1, 23)])]),
                  dict(units=[unit(['I19', 'I23']), unit(['I20', 'I24'])])]
        forced_budget = lambda messages: 30000 if len(json.loads(messages[1]['content'])['items']) > 26 else 10000
        with patch('server.input_units', side_effect=forced_budget), \
             patch.object(self.app, 'call_model', side_effect=[json.dumps(chunk) for chunk in chunks]):
            units, coverage, warnings = self.app._full_read_units(items, 'en')
        self.assertEqual(len(units), 3)
        self.assertEqual(coverage['duplicateItemIds'], ['I19', 'I20'])
        self.assertTrue(any('I19' in warning for warning in warnings))

    def test_full_read_merge_preserves_conflicting_statuses_across_three_chunks(self):
        items = [dict(id=f'I{i}', page=1, kind='paragraph', heading=f'Item {i}',
                      summary='Summary', analysis='Analysis') for i in range(1, 49)]
        def unit(ids, status):
            return dict(unitType='experiment', heading='Experiment', status=status,
                        interpretation='A sufficiently detailed interpretation of this experiment.',
                        sourceItemIds=ids, figureItemIds=[])
        chunks = [dict(units=[unit([f'I{i}' for i in range(1, 23)], 'inferred')]),
                  dict(units=[unit([f'I{i}' for i in range(19, 45)], 'reported_result')]),
                  dict(units=[unit([f'I{i}' for i in range(41, 49)], 'author_stated')])]
        forced_budget = lambda messages: 30000 if len(json.loads(messages[1]['content'])['items']) > 26 else 10000
        with patch('server.input_units', side_effect=forced_budget), \
             patch.object(self.app, 'call_model', side_effect=[json.dumps(chunk) for chunk in chunks]):
            units, coverage, _ = self.app._full_read_units(items, 'en')
        self.assertEqual(coverage['assigned'], 48)
        self.assertEqual(len(units), 1)
        self.assertEqual(units[0]['status'], 'unclear')
        self.assertEqual(units[0]['mergedStatuses'], ['inferred', 'reported_result', 'author_stated'])

        chunks[1]['units'][0]['status'] = 'inferred'
        chunks[2]['units'][0]['status'] = 'inferred'
        with patch('server.input_units', side_effect=forced_budget), \
             patch.object(self.app, 'call_model', side_effect=[json.dumps(chunk) for chunk in chunks]):
            units, _, _ = self.app._full_read_units(items, 'en')
        self.assertEqual(units[0]['status'], 'inferred')
        self.assertNotIn('mergedStatuses', units[0])

    def test_full_read_multiple_chunks_preserve_unit_fields_and_figures(self):
        items = [dict(id=f'I{i}', page=(i - 1) // 10 + 1,
                      kind='figure' if i in (25, 45) else 'paragraph', heading=f'Item {i}',
                      summary='Summary', analysis='Analysis', figureNumber={25: '1', 45: '2'}.get(i, ''))
                 for i in range(1, 49)]

        def unit(heading, ids, question, design, result, interpretation, limitations=(), figures=()):
            return dict(unitType='experiment', heading=heading, question=question, design=design,
                        result=result, interpretation=interpretation,
                        figureInterpretation=f'{heading} figure evidence.', figureItemIds=list(figures),
                        sourceItemIds=ids, limitations=list(limitations), status='reported_result')

        first = dict(units=[unit('Experiment A, question', [f'I{i}' for i in range(1, 23)],
                                  'Question from first chunk.', 'Design from first chunk.',
                                  'Result from first chunk.', 'The first chunk describes this measured experiment in detail.',
                                  ['Limit from first chunk.'])])
        second = dict(units=[unit('Experiment A, design', [f'I{i}' for i in range(19, 23)],
                                   'Question from second chunk.', 'Design from second chunk.',
                                   'Result from second chunk.', 'The second chunk adds a separate measured experiment detail.',
                                   ['Limit from second chunk.']),
                             unit('Experiment B, first result', [f'I{i}' for i in range(23, 45)],
                                  'Question B.', 'Design B.', 'Result B first part.',
                                  'This second experiment has a sufficiently detailed reported interpretation.',
                                  ['Limit B first.'], ['I25'])])
        third = dict(units=[unit('Experiment B, figure result', [f'I{i}' for i in range(41, 49)],
                                  'Question B, continued.', 'Design B, continued.', 'Result B second part.',
                                  'This second experiment also reports a distinct figure based interpretation.',
                                  ['Limit B second.'], ['I45'])])

        forced_budget=lambda messages: 30000 if len(json.loads(messages[1]['content'])['items'])>26 else 10000
        with patch('server.input_units', side_effect=forced_budget), \
             patch.object(self.app, 'call_model', side_effect=[json.dumps(first), json.dumps(second), json.dumps(third)]):
            units, coverage, warnings = self.app._full_read_units(items, 'en')

        self.assertEqual(len(units), 2)
        self.assertEqual(coverage, dict(items=48, assigned=48, missingItemIds=[], figures=2, units=2))
        self.assertEqual(warnings, [])
        a, b = units
        self.assertEqual(a['heading'], 'Experiment A, question；Experiment A, design')
        for field, values in {
            'question': ['Question from first chunk.', 'Question from second chunk.'],
            'design': ['Design from first chunk.', 'Design from second chunk.'],
            'result': ['Result from first chunk.', 'Result from second chunk.'],
            'interpretation': ['first chunk', 'second chunk'],
        }.items():
            for value in values:
                self.assertIn(value, a[field])
        self.assertEqual(a['limitations'], ['Limit from first chunk.', 'Limit from second chunk.'])
        self.assertEqual(b['figureItemIds'], ['I25', 'I45'])
        self.assertEqual(b['figureNumbers'], ['1', '2'])
        self.assertEqual(b['pages'], [3, 4, 5])
        self.assertEqual(b['limitations'], ['Limit B first.', 'Limit B second.'])
        self.assertIn('Experiment B, first result figure evidence.', b['figureInterpretation'])
        self.assertIn('Experiment B, figure result figure evidence.', b['figureInterpretation'])

    def test_full_read_unit_synthesis_receives_values_and_respects_budget(self):
        source='The control was 93.69% ± 2.21% and the treatment was 71.31% ± 8.33%.'
        items=[dict(id=f'I{i}',page=i,kind='paragraph',heading=f'观察 {i}',summary='概'*800,
                    analysis='解'*700,evidence=source,sourceText=source+'实'*4900,
                    sourceVerified=(i!=2),figureNumber='', limitations=['Random allocation not reported']) for i in range(1,5)]
        seen=[]
        def respond(messages,*_args,**_kwargs):
            self.assertLessEqual(server.input_units(messages)+6000+1024,32768)
            chunk=json.loads(messages[1]['content'])['items']
            seen.extend(chunk)
            return json.dumps({'units':[{'unitType':'experiment','heading':'Result',
                'question':'Comparison','design':'Two groups','result':source,
                'interpretation':'This unit reports a measured comparison across two groups with a defined outcome and experimental conditions.',
                'sourceItemIds':[item['id'] for item in chunk], 'figureItemIds':[],
                'limitations':[],'status':'reported_result'}]})
        with patch.object(self.app,'call_model',side_effect=respond):
            units,coverage,_=self.app._full_read_units(items,'zh')
        self.assertEqual(coverage['missingItemIds'],[])
        self.assertEqual({item['id'] for item in seen},{item['id'] for item in items})
        self.assertTrue(all(source in item['evidence'] and source in item['sourceText'] for item in seen))
        self.assertFalse(next(item for item in seen if item['id']=='I2')['sourceVerified'])
        self.assertTrue(all(item['limitations'] == ['Random allocation not reported'] for item in seen))
        self.assertTrue(all(source in unit['result'] for unit in units))
        units[0]['figureInterpretation'] = 'Figure 1 depicts EOF; Figure 3 depicts MDA.'
        units[0]['status'] = 'unclear'
        units[0]['mergedStatuses'] = ['inferred', 'reported_result']
        def overview_response(messages,*_args,**_kwargs):
            self.assertIn(source,messages[1]['content'])
            entries = json.loads(messages[1]['content'])['pages']
            self.assertEqual(entries[0]['figureInterpretation'], units[0]['figureInterpretation'])
            self.assertEqual(entries[0]['status'], 'unclear')
            self.assertEqual(entries[0]['mergedStatuses'], ['inferred', 'reported_result'])
            return json.dumps({'oneSentence':source,'researchQuestion':'Comparison','studyDesign':'Two groups',
                               'mainFindings':[source],'argumentMap':[],'limitations':[]})
        with patch.object(self.app,'call_model',side_effect=overview_response):
            overview,warnings=self.app._full_read_overview([], 'zh', units)
        self.assertEqual(warnings,[])
        self.assertEqual(overview['mainFindings'],[source])

    def test_full_read_unit_synthesis_receives_complete_long_source_and_limitations(self):
        source = 'A measured outcome was compared. ' * 200 + 'End of source.'
        item = dict(id='P1-I1', page=1, kind='paragraph', heading='Result',
                    summary='Summary', analysis='Analysis', evidence='Evidence', sourceText=source,
                    sourceVerified=True, figureNumber='', limitations=['Limit'] * 6 + ['Last caveat'])
        def respond(messages, *_args, **_kwargs):
            self.assertLessEqual(server.input_units(messages) + 6000 + 1024, 32768)
            sent = json.loads(messages[1]['content'])['items'][0]
            self.assertEqual(sent['sourceText'], source)
            self.assertEqual(sent['limitations'][-1], 'Last caveat')
            return json.dumps({'units': [{'unitType': 'experiment', 'heading': 'Result',
                'interpretation': 'This interpretation describes the experimental comparison and the measured outcomes in both groups.',
                'sourceItemIds': ['P1-I1'], 'status': 'reported_result'}]})
        with patch.object(self.app, 'call_model', side_effect=respond):
            _, coverage, _ = self.app._full_read_units([item], 'en')
        self.assertEqual(coverage['missingItemIds'], [])

    def test_full_read_oversized_source_is_reported_as_unassigned(self):
        item = dict(id='P1-I1', page=1, kind='paragraph', heading='Result',
                    summary='Summary', analysis='Analysis', evidence='', sourceText='文' * 40000,
                    sourceVerified=True, figureNumber='', limitations=[])
        with patch.object(self.app, 'call_model') as call_model:
            units, coverage, warnings = self.app._full_read_units([item], 'zh')
        call_model.assert_not_called()
        self.assertEqual(units, [])
        self.assertEqual(coverage['missingItemIds'], ['P1-I1'])
        self.assertTrue(any('超过实验整理输入预算' in warning for warning in warnings))

    def test_full_read_failed_overview_chunk_preserves_unit_fields_and_other_partials(self):
        pages = [{'page': n, 'pageSummary': f'Page {n}'} for n in (1, 5, 10)]
        units = [dict(heading=str(i), pages=[10 if i < 14 else 5], question='', design='',
                      result=f'Result {i}', interpretation='', figureNumbers=[],
                      figureInterpretation=f'Figure interpretation {i}', limitations=[]) for i in range(15)]
        valid = json.dumps(dict(oneSentence='Result', researchQuestion='', studyDesign='',
                                mainFindings=[], argumentMap=[], limitations=[]))
        with patch.object(self.app, 'call_model', side_effect=[ValueError('failed'), valid]) as model:
            overview, warnings = self.app._full_read_overview(pages, 'en', units)
        self.assertTrue(warnings)
        self.assertEqual(model.call_count, 2)
        self.assertIn('could not be merged', overview['oneSentence'])
        self.assertIn('result: Result 0', '\n'.join(overview['mainFindings']))
        self.assertIn('result: Result 13', '\n'.join(overview['mainFindings']))
        self.assertIn('figureInterpretation: Figure interpretation 0', '\n'.join(overview['mainFindings']))
        self.assertIn('Result', overview['mainFindings'])

    def test_full_read_overview_chunks_long_units_within_budget(self):
        units = [dict(heading=f'unit-{i}', pages=[i + 1], question='问题' * 300,
                      design='设计' * 300, result='结果' * 300, interpretation='解释' * 300,
                      figureNumbers=[], limitations=[]) for i in range(20)]
        seen = []
        def respond(messages, *args, **kwargs):
            self.assertLessEqual(server.input_units(messages) + 3000 + 1024, 32768)
            material = json.loads(messages[1]['content'])
            seen.extend(item['heading'] for item in material.get('pages', []))
            return json.dumps(dict(oneSentence='Summary', researchQuestion='', studyDesign='',
                                   mainFindings=[], argumentMap=[], limitations=[]))
        with patch.object(self.app, 'call_model', side_effect=respond) as model:
            overview, warnings = self.app._full_read_overview([], 'zh', units)
        self.assertEqual(overview['oneSentence'], 'Summary')
        self.assertEqual(warnings, [])
        self.assertEqual(seen, [unit['heading'] for unit in units])
        self.assertGreater(model.call_count, 2)

    def test_full_read_overview_splits_single_oversized_unit_without_losing_fields(self):
        unit = dict(heading='Merged experiment', pages=[3, 7], question='Question',
                    design='design-' * 1100, result='测量结果' * 6500 + ' 0.6 mM versus 50 mM',
                    interpretation='Interpretation', figureNumbers=['Table 3'], figureInterpretation='Figure details ' * 1700,
                    limitations=['First limitation', 'Second limitation'], status='unclear',
                    mergedStatuses=['inferred', 'reported_result'])
        received = {field: [] for field in ('question', 'design', 'result', 'interpretation', 'figureInterpretation', 'limitations')}
        def respond(messages, tokens, **kwargs):
            self.assertLessEqual(server.input_units(messages) + tokens + 1024, 32768)
            for entry in json.loads(messages[1]['content']).get('pages', []):
                self.assertEqual(entry['heading'], unit['heading'])
                self.assertEqual(entry['pages'], [3, 7])
                self.assertEqual(entry['figures'], ['Table 3'])
                self.assertEqual(entry['status'], 'unclear')
                self.assertEqual(entry['mergedStatuses'], ['inferred', 'reported_result'])
                for field in received:
                    if field in entry:
                        received[field].append(entry[field])
            return json.dumps(dict(oneSentence='Summary', mainFindings=[]))
        with patch.object(self.app, 'call_model', side_effect=respond):
            overview, warnings = self.app._full_read_overview([], 'zh', [unit])
        self.assertEqual(warnings, [])
        self.assertEqual(overview['oneSentence'], 'Summary')
        for field in ('question', 'design', 'result', 'interpretation', 'figureInterpretation'):
            self.assertEqual(''.join(received[field]), unit[field])
        self.assertEqual(received['limitations'], unit['limitations'])

    def test_full_read_overview_retries_truncated_merge_with_larger_output_budget(self):
        units = [dict(heading=str(i), pages=[i + 1], question='', design='', result='',
                      interpretation='', figureNumbers=[], limitations=[]) for i in range(15)]
        self.app.full_read_context.usage = {'retries': 0}
        valid = json.dumps(dict(oneSentence='Merged', researchQuestion='', studyDesign='',
                                mainFindings=[], argumentMap=[], limitations=[]))
        calls = []
        def respond(messages, tokens, **kwargs):
            self.assertLessEqual(server.input_units(messages) + tokens + 1024, 32768)
            calls.append(tokens)
            if len(calls) == 3:
                raise ValueError('模型输出未完整结束，请重试。')
            return valid
        with patch.object(self.app, 'call_model', side_effect=respond):
            overview, warnings = self.app._full_read_overview([], 'en', units)
        self.assertEqual(overview['oneSentence'], 'Merged')
        self.assertEqual(calls, [3000, 3000, 3000, 6000])
        self.assertEqual(self.app.full_read_context.usage['retries'], 1)
        self.assertEqual(warnings, [])

    def test_full_read_overview_retries_incomplete_json_with_larger_output_budget(self):
        units = [dict(heading=str(i), pages=[i + 1], question='', design='', result='',
                      interpretation='', figureNumbers=[], limitations=[]) for i in range(2)]
        self.app.full_read_context.usage = {'retries': 0}
        valid = json.dumps(dict(oneSentence='Merged', researchQuestion='', studyDesign='',
                                mainFindings=[], argumentMap=[], limitations=[]))
        calls = []
        def respond(_messages, tokens, **_kwargs):
            calls.append(tokens)
            return '{"oneSentence":"broken" "missing":1}' if len(calls) == 1 else valid
        with patch.object(self.app, 'call_model', side_effect=respond):
            overview, warnings = self.app._full_read_overview([], 'zh', units)
        self.assertEqual(overview['oneSentence'], 'Merged')
        self.assertEqual(calls, [3000, 6000])
        self.assertEqual(self.app.full_read_context.usage['retries'], 1)
        self.assertEqual(warnings, [])

    def test_full_read_overview_does_not_retry_when_extra_output_exceeds_budget(self):
        result = ''.join(chr(0x4E00 + i % 300) for i in range(8800))
        unit = dict(heading='Result', pages=[1], question='', design='', result=result,
                    interpretation='', figureNumbers=[], limitations=[])
        pages = [dict(page=1, pageSummary='Page summary')]
        self.app.full_read_context.usage = {'retries': 0}
        calls = []
        def respond(messages, tokens, **kwargs):
            calls.append(tokens)
            self.assertLessEqual(server.input_units(messages) + tokens + 1024, 32768)
            self.assertGreater(server.input_units(messages) + 6000 + 1024, 32768)
            raise ValueError('模型输出未完整结束，请重试。')
        with patch.object(self.app, 'call_model', side_effect=respond) as model:
            overview, warnings = self.app._full_read_overview(pages, 'en', [unit])
        self.assertTrue(calls)
        self.assertEqual(set(calls), {3000})
        self.assertEqual(self.app.full_read_context.usage['retries'], 0)
        self.assertIn('could not be merged', overview['oneSentence'])
        # Oversized fields are kept as labeled fallback fragments; together they
        # must still contain the complete original text.
        preserved = sum(1 for char in ''.join(overview['mainFindings'])
                        if 0x4E00 <= ord(char) <= 0x4E00 + 299)
        self.assertEqual(preserved, 8800)
        self.assertTrue(warnings)

    def test_full_read_page_fallback_keeps_all_summaries(self):
        pages = [dict(page=i, pageSummary=f'Page summary {i}') for i in range(1, 10)]
        result = self.app._full_read_fallback_overview(pages, 'en')
        self.assertEqual(result['mainFindings'], [page['pageSummary'] for page in pages])
        self.assertIn('Overview failed', result['oneSentence'])

    def test_full_read_overview_splits_truncated_chunk_and_retains_all_units(self):
        units = [dict(heading=f'U{i}', pages=[i + 1], question='', design='', result='',
                      interpretation='', figureNumbers=[], limitations=[]) for i in range(3)]
        self.app.full_read_context.usage = {'retries': 0}
        seen = []
        def respond(messages, tokens, **kwargs):
            material = json.loads(messages[1]['content'])
            entries = material.get('pages')
            if entries is not None and len(entries) > 1:
                raise ValueError('模型输出未完整结束，请重试。')
            if entries is not None:
                seen.extend(entry['heading'] for entry in entries)
            return json.dumps(dict(oneSentence='Complete', researchQuestion='', studyDesign='',
                                   mainFindings=[], argumentMap=[], limitations=[]))
        with patch.object(self.app, 'call_model', side_effect=respond):
            overview, warnings = self.app._full_read_overview([], 'en', units)
        self.assertEqual(overview['oneSentence'], 'Complete')
        self.assertEqual(seen, ['U0', 'U1', 'U2'])
        self.assertEqual(warnings, [])
        self.assertGreater(self.app.full_read_context.usage['retries'], 0)

    def test_full_read_overview_splits_incomplete_json_chunk(self):
        units = [dict(heading=f'U{i}', pages=[i + 1], question='', design='', result='',
                      interpretation='', figureNumbers=[], limitations=[]) for i in range(3)]
        self.app.full_read_context.usage = {'retries': 0}
        seen = []
        def respond(messages, tokens, **kwargs):
            entries = json.loads(messages[1]['content']).get('pages')
            if entries is not None and len(entries) > 1:
                raise ValueError('模型返回的 JSON 不完整，请重试。')
            if entries is not None:
                seen.extend(entry['heading'] for entry in entries)
            return json.dumps(dict(oneSentence='Complete', researchQuestion='', studyDesign='',
                                   mainFindings=[], argumentMap=[], limitations=[]))
        with patch.object(self.app, 'call_model', side_effect=respond):
            overview, warnings = self.app._full_read_overview([], 'en', units)
        self.assertEqual(overview['oneSentence'], 'Complete')
        self.assertEqual(seen, ['U0', 'U1', 'U2'])
        self.assertEqual(warnings, [])

    def test_full_read_overview_reports_unmergeable_partials(self):
        units = [dict(heading=str(i), pages=[i + 1], question='', design='', result='',
                      interpretation='', figureNumbers=[], limitations=[]) for i in range(15)]
        huge = dict(oneSentence='概' * 800, researchQuestion='问' * 1200, studyDesign='法' * 1200,
                    mainFindings=['果' * 600] * 6, argumentMap=['论' * 600] * 10, limitations=['限' * 600] * 6)
        with patch.object(self.app, 'call_model', return_value=json.dumps(huge)) as model:
            _, warnings = self.app._full_read_overview([], 'zh', units)
        self.assertEqual(model.call_count, 2)
        self.assertTrue(any('无法在输入预算内合并' in warning for warning in warnings))

    def test_full_read_overview_merges_non_adjacent_partials_that_fit(self):
        units = [dict(heading=str(i), pages=[i + 1], question='', design='', result='',
                      interpretation='', figureNumbers=[], limitations=[]) for i in range(29)]
        first = dict(oneSentence='A' * 8000, researchQuestion='', studyDesign='',
                     mainFindings=[], argumentMap=[], limitations=[])
        second = dict(oneSentence='B' * 22000, researchQuestion='', studyDesign='',
                      mainFindings=[], argumentMap=[], limitations=[])
        third = dict(oneSentence='C' * 2500, researchQuestion='', studyDesign='',
                     mainFindings=[], argumentMap=[], limitations=[])
        condensed = dict(oneSentence='D' * 1000, researchQuestion='', studyDesign='',
                         mainFindings=[], argumentMap=[], limitations=[])
        final = dict(oneSentence='Merged', researchQuestion='', studyDesign='',
                     mainFindings=[], argumentMap=[], limitations=[])
        responses = [first, second, third, condensed, final]
        calls = []
        def respond(messages, *_args, **_kwargs):
            material = json.loads(messages[1]['content'])
            if 'partialOverviews' in material:
                self.assertIn('Do not assert document-level absence', messages[0]['content'])
                self.assertIn('keep the detail and drop the missing claim', messages[0]['content'])
            calls.append('partialOverviews' if 'partialOverviews' in material else 'pages')
            return json.dumps(responses[len(calls) - 1])
        with patch.object(self.app, 'call_model', side_effect=respond):
            overview, warnings = self.app._full_read_overview([], 'en', units)
        self.assertEqual(warnings, [])
        self.assertEqual(overview['oneSentence'], 'Merged')
        self.assertEqual(calls, ['pages', 'pages', 'pages', 'partialOverviews', 'partialOverviews'])

    def test_full_read_overview_excludes_editorial_metadata_units(self):
        def unit(heading, result):
            return dict(heading=heading, pages=[1], question='', design='', result=result,
                        interpretation='', figureNumbers=[], limitations=[])
        units = [unit('结果', 'Measured result'), unit('利益冲突声明', 'Competing interests'),
                 unit('First Person与同行评审历史', 'Peer review link')]
        def respond(messages, *_args, **_kwargs):
            entries = json.loads(messages[1]['content'])['pages']
            self.assertEqual([entry['heading'] for entry in entries], ['结果'])
            return json.dumps(dict(oneSentence='Result', researchQuestion='', studyDesign='',
                                   mainFindings=[], argumentMap=[], limitations=[]))
        with patch.object(self.app, 'call_model', side_effect=respond):
            overview, warnings = self.app._full_read_overview([], 'zh', units)
        self.assertEqual(warnings, [])
        self.assertEqual(overview['oneSentence'], 'Result')

    def test_full_read_overview_ledger_preserves_conflicts_and_table_pointers(self):
        units = [dict(id='U2', heading='Formulation', result='Table S2 reports cysteine values.')]
        audit = dict(conflicts=[dict(
            quantity='cysteine concentration', values=['12 mM', '0.145 g/L'],
            evidence=[dict(itemId='P2-I1'), dict(itemId='P3-I2')])])
        overview = dict(oneSentence='Overview', researchQuestion='', studyDesign='',
                        mainFindings=['Finding'], argumentMap=[], limitations=['Limit'])
        result = self.app._full_read_overview_ledger(overview, units, audit, 'en')
        self.assertEqual(result['ledgerAdditions'], 2)
        self.assertIn('12 mM / 0.145 g/L', '\n'.join(result['limitations']))
        self.assertIn('Table S2', '\n'.join(result['limitations']))
        retained = dict(overview, mainFindings=['Table S2 reports 12 mM versus 0.145 g/L.'])
        self.assertEqual(self.app._full_read_overview_ledger(retained, units, audit, 'en')
                         ['ledgerAdditions'], 0)

    def test_full_read_failed_final_merge_preserves_each_partial_summary(self):
        units = [dict(heading=str(i), pages=[i + 1], question='', design='', result='',
                      interpretation='', figureNumbers=[], limitations=[]) for i in range(15)]
        def partial(title, finding):
            return json.dumps(dict(oneSentence=title, researchQuestion=f'Question {title}',
                                   studyDesign=f'Design {title}', mainFindings=[finding],
                                   argumentMap=[], limitations=[]))
        with patch.object(self.app, 'call_model', side_effect=[partial('First', 'Finding A'),
                                                               partial('Second', 'Finding B'),
                                                               ValueError('service error')]):
            overview, warnings = self.app._full_read_overview([], 'en', units)
        self.assertIn('could not be merged', overview['oneSentence'])
        self.assertEqual(overview['mainFindings'], ['First', 'Finding A', 'Second', 'Finding B'])
        self.assertIn('Question First', overview['researchQuestion'])
        self.assertIn('Design Second', overview['studyDesign'])
        self.assertTrue(any('最终全文概述汇总失败' in warning for warning in warnings))

    def test_full_read_conflict_audit_reports_verified_candidate(self):
        items = [dict(id='P8-I1', page=8, sourceVerified=True, sourceText='CDMA contains 0.6 mM lactate.'),
                 dict(id='P8-I2', page=8, sourceVerified=True, sourceText='CDMA was supplemented with 50 mM lactate.'),
                 dict(id='P8-I3', page=8, sourceVerified=False, sourceText='An unverified 500 mM observation.')]
        response = {'conflicts': [dict(quantity='CDMA lactate', values=['0.6 mM', '50 mM'], evidence=[
            dict(itemId='P8-I1', quote='CDMA contains 0.6 mM lactate.'),
            dict(itemId='P8-I2', quote='CDMA was supplemented with 50 mM lactate.')])]}
        with patch.object(self.app, 'call_model', return_value=json.dumps(response)) as model:
            result, warnings = self.app._full_read_conflicts(items)
        sent = json.loads(model.call_args.args[0][1]['content'])['items']
        self.assertEqual([item['id'] for item in sent], ['P8-I1', 'P8-I2'])
        self.assertEqual(result['status'], 'partial')
        self.assertEqual(result['checkedItems'], 2)
        self.assertEqual(result['unverifiedNumericItems'], 1)
        self.assertEqual(len(result['conflicts']), 1)
        self.assertEqual(result['valueMatchVersion'], 2)
        self.assertEqual(result['evidenceValidationVersion'], 2)
        self.assertTrue(any('可能的数值冲突' in warning and 'P8-I1' in warning for warning in warnings))

    def test_full_read_conflict_audit_marks_invalid_extra_evidence_partial(self):
        items = [dict(id='I1', page=1, sourceVerified=True, sourceText='Measured 0.6 mM in medium.'),
                 dict(id='I2', page=2, sourceVerified=True, sourceText='Measured 50 mM in medium.')]
        evidence = [dict(itemId=item['id'], quote=item['sourceText']) for item in items]
        evidence.append(dict(itemId='I2', quote='Invented supporting quotation.'))
        response = {'conflicts': [dict(quantity='concentration', values=['0.6 mM', '50 mM'], evidence=evidence)]}
        with patch.object(self.app, 'call_model', return_value=json.dumps(response)):
            result, warnings = self.app._full_read_conflicts(items)
        self.assertEqual(result['conflicts'], [])
        self.assertEqual(result['rejectedCandidates'], 1)
        self.assertEqual(result['status'], 'partial')
        self.assertTrue(any('未能核验' in warning for warning in warnings))

    def test_full_read_conflict_audit_marks_truncated_sources_partial(self):
        items = [dict(id='I1', page=1, sourceVerified=True, sourceText='1 ' + 'x' * 2200)]
        with patch.object(self.app, 'call_model', return_value='{"conflicts": []}'):
            result, warnings = self.app._full_read_conflicts(items)
        self.assertEqual(result['status'], 'partial')
        self.assertEqual(result['truncatedItems'], 1)
        self.assertTrue(any('前 2000 字符' in warning for warning in warnings))

    def test_full_read_conflict_audit_rejects_values_embedded_in_larger_numbers(self):
        items = [dict(id='I1', page=1, sourceVerified=True, sourceText='The concentration was 10.6 mM.'),
                 dict(id='I2', page=2, sourceVerified=True, sourceText='The concentration was 50 mM.')]
        response = {'conflicts': [dict(quantity='concentration', values=['0.6 mM', '50 mM'], evidence=[
            dict(itemId=item['id'], quote=item['sourceText']) for item in items])]}
        with patch.object(self.app, 'call_model', return_value=json.dumps(response)):
            result, _ = self.app._full_read_conflicts(items)
        self.assertEqual(result['conflicts'], [])
        self.assertEqual(result['rejectedCandidates'], 1)
        self.assertEqual(result['status'], 'partial')
        self.assertEqual(result['valueMatchVersion'], 2)

    def test_full_read_conflict_audit_keeps_overlapping_failed_batch_partial(self):
        items = [dict(id=f'I{i}', page=i, sourceVerified=True, sourceText=f'Observation {i}.')
                 for i in range(5)]
        def input_budget(messages):
            count = len(json.loads(messages[1]['content'])['items'])
            return 40000 if count > 3 else 10000
        with patch('server.input_units', side_effect=input_budget), \
             patch.object(self.app, 'call_model', side_effect=['{"conflicts": []}', ValueError('failed'),
                                                               '{"conflicts": []}']):
            result, warnings = self.app._full_read_conflicts(items)
        self.assertEqual(result['checkedItems'], 5)
        self.assertEqual(result['failedBatches'], 1)
        self.assertEqual(result['status'], 'partial')
        self.assertTrue(any('数值冲突检查未完成' in warning for warning in warnings))

    def test_full_read_conflict_audit_reports_unverifiable_candidates_and_exclusions(self):
        items = [dict(id='I1', page=1, sourceVerified=True, sourceText='A value of 1 mM.'),
                 dict(id='I2', page=2, sourceVerified=False, sourceText='Another value of 2 mM.')]
        with patch.object(self.app, 'call_model', return_value='{"conflicts": [{"quantity":"missing"}]}'):
            result, _ = self.app._full_read_conflicts(items)
        self.assertEqual(result['status'], 'partial')
        self.assertEqual(result['rejectedCandidates'], 1)
        self.assertEqual(result['unverifiedNumericItems'], 1)
        with patch.object(self.app, 'call_model') as model:
            result, _ = self.app._full_read_conflicts(items[1:])
        model.assert_not_called()
        self.assertEqual(result['status'], 'not_applicable')
        self.assertEqual(result['unverifiedNumericItems'], 1)

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for full-reading tests")
    def test_full_read_duplicate_assignments_mark_run_partial(self):
        pdf = self.make_pdf('duplicate.pdf', 'The study reports one result.')
        self.app.save_document({'key': 'DUPLICATE', 'title': 'Study', '_path': str(pdf)})
        page = dict(page=1, pageKind='content', section='Results', pageSummary='Result', warnings=[],
                    items=[dict(id='P1-I1', locationStatus='located_quote')])
        coverage = dict(items=1, assigned=1, missingItemIds=[], duplicateItemIds=['P1-I1'], figures=0, units=2)
        with patch.object(self.app, '_analyze_full_read_page', return_value=page), \
             patch.object(self.app, '_full_read_units', return_value=([{'id': 'U1'}, {'id': 'U2'}], coverage, ['重复 P1-I1'])), \
             patch.object(self.app, '_full_read_overview', return_value=({}, [])):
            self.app._run_full_read('duplicate-run', 'DUPLICATE', pdf, server.FigureStore.version(pdf),
                                    'zh', time.time(), 1)
        record = self.app.get_full_read('DUPLICATE')
        self.assertEqual(record['status'], 'partial')
        self.assertEqual(record['value']['coverage']['duplicateItemIds'], ['P1-I1'])

    @unittest.skipUnless(fitz is not None, 'PyMuPDF is required for full-reading tests')
    def test_full_read_adds_figure_reference_warnings_without_rewriting_old_record(self):
        pdf = self.make_pdf('reference-warning.pdf', 'The study reports one result.')
        self.app.save_document({'key': 'REFWARN', 'title': 'Study', '_path': str(pdf)})
        version = server.FigureStore.version(pdf)
        value = {'status': 'done',
                 'items': [dict(id='I1', page=1, kind='paragraph'),
                           dict(id='F1', page=1, kind='figure', figureNumber='1')],
                 'units': [dict(id='U1', heading='Experiment', result='Figure 2 reports the treated result.',
                                figureInterpretation='', figureItemIds=['F1'])]}
        self.app.full_reads.save('reference-warning-run', 'REFWARN', version, 'zh', value)
        before = tuple(self.app.db.execute(
            'SELECT prompt_version, status, value, updated FROM full_reads WHERE run_id=?',
            ('reference-warning-run',)).fetchone())
        record = self.app.get_full_read('REFWARN')
        self.assertIn('Figure 2', record['value']['units'][0]['sourceWarnings'][0])
        self.assertEqual(before, tuple(self.app.db.execute(
            'SELECT prompt_version, status, value, updated FROM full_reads WHERE run_id=?',
            ('reference-warning-run',)).fetchone()))

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for full-reading tests")
    def test_full_read_failed_unit_batch_marks_run_partial_even_when_items_assigned(self):
        pdf = self.make_pdf('failed-unit-batch.pdf', 'The study reports one result.')
        self.app.save_document({'key': 'FAILEDUNIT', 'title': 'Study', '_path': str(pdf)})
        page = dict(page=1, pageKind='content', section='Results', pageSummary='Result', warnings=[],
                    items=[dict(id='P1-I1', locationStatus='located_quote')])
        coverage = dict(items=1, assigned=1, missingItemIds=[], failedUnitBatches=1, figures=0, units=1)
        with patch.object(self.app, '_analyze_full_read_page', return_value=page), \
             patch.object(self.app, '_full_read_units', return_value=([{'id': 'U1'}], coverage, ['整理失败'])), \
             patch.object(self.app, '_full_read_overview', return_value=({}, [])):
            self.app._run_full_read('failed-unit-run', 'FAILEDUNIT', pdf, server.FigureStore.version(pdf),
                                    'zh', time.time(), 1)
        record = self.app.get_full_read('FAILEDUNIT')
        self.assertEqual(record['status'], 'partial')
        self.assertEqual(record['value']['coverage']['failedUnitBatches'], 1)

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for full-reading tests")
    def test_full_read_overview_fallback_marks_run_partial(self):
        pdf = self.make_pdf('overview-fallback.pdf', 'The study reports one result.')
        self.app.save_document({'key': 'FALLBACK', 'title': 'Study', '_path': str(pdf)})
        page = dict(page=1, pageKind='content', section='Results', pageSummary='Result', warnings=[],
                    items=[dict(id='P1-I1', locationStatus='located_quote')])
        coverage = dict(items=1, assigned=1, missingItemIds=[], figures=0, units=1)
        with patch.object(self.app, '_analyze_full_read_page', return_value=page), \
             patch.object(self.app, '_full_read_units', return_value=([{'id': 'U1'}], coverage, [])), \
             patch.object(self.app, '_full_read_overview', return_value=({}, ['Overview fallback'])):
            self.app._run_full_read('fallback-run', 'FALLBACK', pdf, server.FigureStore.version(pdf),
                                    'zh', time.time(), 1)
        record = self.app.get_full_read('FALLBACK')
        self.assertEqual(record['status'], 'partial')
        self.assertTrue(any(warning['message'] == 'Overview fallback' for warning in record['value']['warnings']))

    @unittest.skipUnless(fitz is not None, 'PyMuPDF is required for full-reading tests')
    def test_historical_full_read_is_viewable_but_never_resumed_or_rewritten(self):
        pdf = self.make_pdf('historical-read.pdf', 'A historical reading.')
        self.app.save_document({'key': 'HIST', 'title': 'Historical', '_path': str(pdf)})
        version = server.FigureStore.version(pdf)
        value = {'status': 'running', 'pages': [{'page': 1}], 'items': [], 'progress': {}}
        self.app.full_reads.save('old-run', 'HIST', version, 'zh', value)
        self.app.db.execute('UPDATE full_reads SET prompt_version=? WHERE run_id=?', (server.PROMPT_VERSION - 1, 'old-run'))
        self.app.db.commit()
        before = tuple(self.app.db.execute('SELECT prompt_version, status, value, updated FROM full_reads WHERE run_id=?', ('old-run',)).fetchone())
        record = self.app.get_full_read('HIST')
        self.assertTrue(record['historical'])
        self.assertEqual(record['status'], 'interrupted')
        self.assertEqual(record['runId'], 'old-run')
        self.assertEqual(before, tuple(self.app.db.execute('SELECT prompt_version, status, value, updated FROM full_reads WHERE run_id=?', ('old-run',)).fetchone()))
        with patch.object(self.app, 'model_configured', return_value=True):
            with self.assertRaisesRegex(ValueError, '没有可继续'):
                self.app.start_full_read('HIST', 'resume')
        self.app.full_reads.save('new-run', 'HIST', version, 'zh', {'status': 'done', 'items': []})
        current = self.app.get_full_read('HIST')
        self.assertEqual(current['runId'], 'new-run')
        self.assertNotIn('historical', current)

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for full-reading HTTP tests")
    def test_full_read_http_starts_background_job_and_restores_latest_result(self):
        pdf = self.make_pdf("full-read-http.pdf", "HTTP paragraph.")
        self.app.save_document({"key": "FULLHTTP", "title": "Full read", "_path": str(pdf), "flags": []})
        version = server.FigureStore.version(pdf)
        value = {"status": "running", "items": [{"heading": "Heading"}], "progress": {"current": 0, "total": 1}}
        record = {"runId": "http-run", "document": "FULLHTTP", "pdfVersion": version,
                  "language": "zh", "promptVersion": server.PROMPT_VERSION,
                  "status": "running", "created": time.time(), "updated": time.time(), "value": value}
        httpd, port = self.start_http()
        payload = json.dumps({"key": "FULLHTTP"}).encode()
        request = urllib.request.Request(f"http://127.0.0.1:{port}/api/full-read", data=payload,
            headers={"Content-Type": "application/json", "Origin": f"http://127.0.0.1:{port}",
                     "X-Workbench-Token": self.app.csrf}, method="POST")
        with patch.object(self.app, "start_full_read", return_value=record):
            with urllib.request.urlopen(request, timeout=3) as response:
                self.assertEqual(response.status, 202)
                self.assertEqual(json.loads(response.read())["runId"], "http-run")
        self.app.full_reads.save("http-run", "FULLHTTP", version, "zh", value)
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/full-read?key=FULLHTTP", timeout=3) as response:
            restored = json.loads(response.read())
        self.assertEqual(restored["status"], "interrupted")
        self.assertIn("中断", restored["value"]["progress"]["message"])
        self.assertEqual(restored["value"]["items"][0]["heading"], "Heading")

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for image fallback tests")
    def test_full_read_discloses_text_only_fallback_when_image_is_rejected(self):
        text = ("This measured paragraph compares treated and control groups across the complete prespecified "
                "experiment and reports how the outcome was assessed after intervention.")
        pdf = self.make_pdf("full-read-image-fallback.pdf", text)
        self.app.save_document({"key": "FULLIMAGE", "title": "Fallback", "_path": str(pdf), "flags": []})
        index = self.app.evidence.index("FULLIMAGE", pdf)
        page = self.app.evidence.pages(index)[0]
        response = {"page": 1, "pageKind": "content", "pageSummary": "A measured comparison.",
                    "items": [{"kind": "paragraph", "heading": "Measured comparison",
                               "sourceText": text, "startQuote": text[:40], "endQuote": text[-40:],
                               "summary": "Groups were compared.",
                               "analysis": "This paragraph describes the measured comparison and the post-intervention assessment. It does not provide effect estimates or uncertainty.",
                               "evidence": "treated and control groups", "limitations": ["No effect estimate"],
                               "status": "author_stated"}]}
        rejected = urllib.error.HTTPError("https://model", 400, "image unsupported", {}, None)
        captured = []
        def respond(messages, *args, **kwargs):
            captured.append(json.loads(json.dumps(messages)))
            if len(captured) == 1:
                raise rejected
            return json.dumps(response)
        with patch.object(self.app, "_full_read_page_image", return_value="image"), \
             patch.object(self.app, "call_model", side_effect=respond) as model:
            result = self.app._analyze_full_read_page(
                pdf, page, "en",
                previous_page={"page": 0, "text": "Previous ending context."},
                next_page={"page": 2, "text": "Next beginning context."})
        first_content = model.call_args_list[0].args[0][1]["content"]
        first_material = json.loads(first_content if isinstance(first_content, str) else first_content[0]["text"])
        self.assertEqual(first_material["previousPageTail"]["text"], "Previous ending context.")
        self.assertEqual(first_material["nextPageHead"]["text"], "Next beginning context.")
        self.assertIsInstance(model.call_args_list[1].args[0][1]["content"], str)
        self.assertIn("page image is the layout authority", captured[0][0]["content"])
        self.assertIn("No page image is provided", captured[1][0]["content"])
        self.assertTrue(any("只分析可搜索文本" in warning["message"] for warning in result["warnings"]))

    def test_full_read_image_failure_without_text_does_not_send_placeholder(self):
        page = {"page": 1, "text": "  "}
        with patch.object(self.app, "_full_read_page_image", side_effect=ValueError("render failure")), \
             patch.object(self.app, "call_model") as model:
            with self.assertRaisesRegex(ValueError, "没有可提取文本"):
                self.app._analyze_full_read_page("unused.pdf", page, "zh")
        model.assert_not_called()

        rejected = urllib.error.HTTPError("https://model", 415, "image unsupported", {}, None)
        with patch.object(self.app, "_full_read_page_image", return_value="image"), \
             patch.object(self.app, "call_model", side_effect=rejected) as model:
            with self.assertRaisesRegex(ValueError, "模型未接受页面图像"):
                self.app._analyze_full_read_page("unused.pdf", page, "zh")
        self.assertEqual(model.call_count, 1)
        material = json.loads(model.call_args.args[0][1]["content"][0]["text"])
        self.assertEqual(material["text"], "  ")

    def test_full_read_render_failure_uses_text_only_prompt(self):
        page = {"page": 1, "text": "Readable text."}
        response = {"page": 1, "pageKind": "content", "pageSummary": "Text.", "items": [
            {"kind": "caption", "heading": "Caption", "sourceText": "Readable text.",
             "analysis": "This caption describes the reported material. The image is unavailable for visual verification.",
             "status": "unclear"}]}
        with patch.object(self.app, "_full_read_page_image", side_effect=ValueError("render failure")), \
             patch.object(self.app, "call_model", return_value=json.dumps(response)) as model:
            result = self.app._analyze_full_read_page("unused.pdf", page, "zh")
        self.assertIn("未提供页面图像", model.call_args.args[0][0]["content"])
        self.assertTrue(any("只分析可搜索文本" in warning["message"] for warning in result["warnings"]))

    def test_call_model_serializes_multimodal_request_with_fixed_image_budget(self):
        self.app.settings.update(model_name="fixture-model", model_url="http://127.0.0.1:9000/v1")
        self.app.credentials["model_key"] = "fixture-key"
        response = io.BytesIO(json.dumps({"choices": [{"message": {"content": "Seen."}}]}).encode())
        opener = unittest.mock.MagicMock()
        opener.open.return_value.__enter__.return_value = response
        messages = [{"role": "user", "content": [
            {"type": "text", "text": "Describe this."},
            {"type": "image_url", "image_url": {"url": "data:image/png;base64," + "A" * 2_000_000}},
        ]}]
        with patch("server.urllib.request.build_opener", return_value=opener):
            self.assertEqual(self.app.call_model(messages), "Seen.")
        payload = json.loads(opener.open.call_args.args[0].data)
        self.assertEqual(payload["messages"], messages)

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for project search tests")
    def test_project_search_is_scoped_and_rejects_changed_pdf(self):
        a = self.make_pdf('project-a.pdf', 'Antibody epitope binding site.')
        b = self.make_pdf('project-b.pdf', 'Another epitope in a different paper.')
        self.app.save_document({'key':'PROJA','title':'A','_path':str(a)})
        self.app.save_document({'key':'PROJB','title':'B','_path':str(b)})
        self.app.library_search.set_members('alpha', ['PROJA'])
        self.app.library_search.set_members('beta', ['PROJB'])
        self.assertEqual(self.app.index_project('alpha')['indexed'], 1)
        self.assertEqual(self.app.index_project('beta')['indexed'], 1)
        result = self.app.search_project('alpha', '表位', ['epitope'])
        self.assertEqual([item['paper'] for item in result['results']], ['PROJA'])
        hit = result['results'][0]
        self.assertEqual(self.app.locate_project_hit('alpha', 'PROJA', hit['version'], hit['page'], hit['quote'])['page'], 1)
        with self.assertRaises(ValueError):
            self.app.locate_project_hit('beta', 'PROJA', hit['version'], hit['page'], hit['quote'])
        with a.open('ab') as handle:
            handle.write(b'\n% changed')
        self.assertEqual(self.app.search_project('alpha', 'epitope')['results'], [])
        with self.assertRaisesRegex(ValueError, '更改'):
            self.app.locate_project_hit('alpha', 'PROJA', hit['version'], hit['page'], hit['quote'])

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for project search tests")
    def test_project_search_http_workflow(self):
        pdf = self.make_pdf('project-http.pdf', 'Antibody epitope binding site.')
        self.app.save_document({'key':'HTTPP','title':'HTTP paper','_path':str(pdf)})
        httpd, port = self.start_http()
        base = f'http://127.0.0.1:{port}'
        def send(route, payload):
            request = urllib.request.Request(base + route, data=json.dumps(payload).encode(),
                headers={'Content-Type':'application/json', 'Origin':base, 'X-Workbench-Token':self.app.csrf}, method='POST')
            with urllib.request.urlopen(request, timeout=5) as response:
                return json.loads(response.read())
        self.assertEqual(send('/api/library-project', {'project':'alpha','action':'members','keys':['HTTPP']})['members'], ['HTTPP'])
        self.assertEqual(send('/api/library-project', {'project':'alpha','action':'index'})['indexed'], 1)
        result = send('/api/library-search', {'project':'alpha','query':'表位','synonyms':['epitope']})
        hit = result['results'][0]
        self.assertEqual(hit['paper'], 'HTTPP')
        located = send('/api/library-search', {'action':'locate','project':'alpha','document':'HTTPP',
                                               'version':hit['version'],'page':hit['page'],'quote':hit['quote']})
        self.assertEqual(located['state'], 'located_quote')
        self.assertTrue(located['rects'])
        self.assertEqual(send('/api/library-search', {'project':'other','query':'epitope'})['results'], [])

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for matrix tests")
    def test_matrix_retrieves_controls_despite_long_focus(self):
        pdf = self.make_pdf('matrix-controls.pdf',
                            'Airway epithelial basal cells respond to injury and inflammation in primary culture.',
                            'Control cells were untreated and non-injured, while intervention cells received treatment.')
        self.app.save_document({'key': 'MX1', 'title': 'Study', '_path': str(pdf)})
        self.app.save_document({'key': 'MX2', 'title': 'Metadata only'})
        self.app.library_search.set_members('matrix-focus', ['MX1', 'MX2'])
        def respond(messages, *args, **kwargs):
            passages = json.loads(messages[1]['content'])['passages']
            control = next(item for item in passages if 'Control cells were untreated' in item['quote'])
            return json.dumps({'controls': {'value': 'Untreated cells', 'status': 'supported',
                                            'evidenceIds': [control['id']]}})
        focus = 'airway epithelial basal cells injury inflammation culture response outcome system'
        with patch.object(self.app, 'call_model', side_effect=respond):
            matrix = self.app.generate_evidence_matrix('matrix-focus', ['MX1', 'MX2'], focus)
        cell = matrix['cells']['MX1']['controls']
        self.assertEqual(cell['status'], 'supported')
        self.assertEqual(cell['sources'][0]['page'], 2)

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for matrix tests")
    def test_matrix_preserves_bounded_source_context(self):
        document = fitz.open()
        page = document.new_page()
        passage = ('Research question and experiment in airway cells. ' * 24
                   + 'Differentiated cells were grown at an air-liquid interface.')
        self.assertGreater(page.insert_textbox(fitz.Rect(40, 40, 560, 700), passage, fontsize=10), 0)
        pdf = self.input / 'matrix-context.pdf'
        document.save(pdf)
        document.close()
        self.app.save_document({'key':'CONTEXT','title':'Study','_path':str(pdf)})
        self.app.save_document({'key':'EMPTY','title':'Metadata only'})
        self.app.library_search.set_members('context', ['CONTEXT','EMPTY'])
        def respond(messages, *args, **kwargs):
            passages = json.loads(messages[1]['content'])['passages']
            hit = next(item for item in passages if 'air-liquid interface' in item['quote'])
            return json.dumps({'sample':{'value':'Air-liquid interface', 'status':'supported',
                                        'evidenceIds':[hit['id']]}})
        with patch.object(self.app, 'call_model', side_effect=respond):
            matrix = self.app.generate_evidence_matrix('context', ['CONTEXT','EMPTY'])
        source = matrix['cells']['CONTEXT']['sample']['sources'][0]
        self.assertGreater(source['quote'].index('air-liquid interface'), 1100)
        self.assertEqual(self.app.locate_synthesis_source('CONTEXT', source['version'], source['page'],
                                                          source['quote'])['state'], 'located_quote')
        with patch.object(self.app, 'call_model', return_value='Air-liquid interface [P1E1].') as model:
            synthesis = self.app.compare_synthesis(['CONTEXT','EMPTY'], project='context')
        material = json.loads(model.call_args.args[0][1]['content'])
        self.assertIn('air-liquid interface', material[0]['passages'][0]['quote'])
        self.assertIn('air-liquid interface', synthesis['sources'][0]['passages'][0]['quote'])

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for matrix tests")
    def test_matrix_mixed_valid_and_unknown_citations_need_review(self):
        pdf = self.make_pdf('matrix-mixed.pdf', 'The experiment measured binding in 12 samples against a control group.')
        self.app.save_document({'key':'MIX1','title':'One','_path':str(pdf)})
        self.app.save_document({'key':'MIX2','title':'Two','_abstract':'Metadata only'})
        self.app.library_search.set_members('mixed', ['MIX1','MIX2'])

        def respond(messages, *args, **kwargs):
            source_id = json.loads(messages[1]['content'])['passages'][0]['id']
            return json.dumps({
                'sample': {'value':'12 samples', 'status':'supported', 'evidenceIds':[source_id, 'E999']},
                'controls': {'value':'A control group', 'status':'supported', 'evidenceIds':[source_id, source_id]},
                'results': {'value':'A claimed conflict', 'status':'conflict', 'evidenceIds':[source_id, 'E999']},
                'endpoint': {'value':'No usable reference', 'status':'supported', 'evidenceIds':['E999']},
            })

        with patch.object(self.app, 'call_model', side_effect=respond):
            matrix = self.app.generate_evidence_matrix('mixed', ['MIX1','MIX2'])
        cells = matrix['cells']['MIX1']
        self.assertEqual(cells['sample']['status'], 'unknown')
        self.assertEqual(cells['sample']['value'], '12 samples')
        self.assertEqual(len(cells['sample']['sources']), 1)
        self.assertEqual(cells['sample']['generated']['citationValidation'],
                         {'rejectedCount':1, 'rejectedIds':['E999']})
        self.assertEqual(cells['controls']['status'], 'supported')
        self.assertEqual(len(cells['controls']['sources']), 1)
        self.assertEqual(cells['results']['status'], 'unknown')
        self.assertEqual(cells['results']['value'], 'A claimed conflict')
        self.assertEqual(cells['endpoint']['status'], 'unknown')
        self.assertEqual(cells['endpoint']['value'], '')
        self.assertEqual(cells['endpoint']['generated']['citationValidation']['rejectedIds'], ['E999'])

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for matrix tests")
    def test_matrix_uses_verified_passages_and_saved_reading_without_overwriting_edits(self):
        pdf = self.make_pdf('matrix.pdf', 'The experiment measured binding in 12 samples against a control group.')
        self.app.save_document({'key':'MAT1','title':'One','_path':str(pdf)})
        self.app.save_document({'key':'MAT2','title':'Two','_abstract':'Metadata only'})
        self.app.library_search.set_members('study', ['MAT1','MAT2'])
        version = server.FigureStore.version(pdf)
        quote = 'The experiment measured binding in 12 samples against a control group.'
        self.app.full_reads.save('prior','MAT1',version,'zh', {
            'status':'done','items':[{'id':'I1','sourceVerified':True,'sourceText':quote,'page':1}],
            'units':[{'heading':'Binding','question':'What binds?','design':'Control group',
                      'result':'12 samples','sourceItemIds':['I1']}],
        })
        captured = []
        def respond(messages, *args, **kwargs):
            material = json.loads(messages[1]['content'])
            captured.append(material)
            return json.dumps({'sample':{'value':'12 samples','status':'supported',
                                         'evidenceIds':[material['passages'][0]['id']]},
                               'results':{'value':'Unsubstantiated','status':'supported','evidenceIds':['FAKE']},
                               'limitations':{'value':'Absent','status':'not_reported','evidenceIds':[]}})
        with patch.object(self.app,'call_model',side_effect=respond):
            result = self.app.generate_evidence_matrix('study',['MAT1','MAT2'],'binding')
        self.assertEqual(len(captured),1)
        self.assertEqual(captured[0]['priorReadingUnits'][0]['heading'],'Binding')
        self.assertEqual(set(captured[0]['priorReadingUnits'][0]), {'heading','evidenceIds'})
        cell = result['cells']['MAT1']['sample']
        self.assertEqual(cell['value'],'12 samples')
        self.assertEqual(cell['sources'][0]['quote'], quote)
        self.assertEqual(result['cells']['MAT1']['results']['status'],'unknown')
        self.assertEqual(result['cells']['MAT1']['limitations']['status'],'unknown')
        self.assertEqual(result['cells']['MAT2']['sample']['status'],'unknown')
        self.app.matrices.save_edit('study','MAT1','sample','Corrected by reader','unknown')
        with patch.object(self.app,'call_model',side_effect=respond):
            revised = self.app.generate_evidence_matrix('study',['MAT1','MAT2'],'binding')
        self.assertEqual(revised['cells']['MAT1']['sample']['value'],'Corrected by reader')
        self.assertEqual(revised['cells']['MAT1']['sample']['generated']['value'],'12 samples')
        with self.assertRaisesRegex(ValueError,'课题'):
            self.app.generate_evidence_matrix('other',['MAT1','MAT2'])

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for matrix HTTP tests")
    def test_matrix_http_generate_edit_export_and_locate(self):
        pdf = self.make_pdf('matrix-http.pdf', 'The experiment measured binding in twelve samples.')
        self.app.save_document({'key':'M1','title':'One','_path':str(pdf)})
        self.app.save_document({'key':'M2','title':'Two','_abstract':'Abstract only'})
        self.app.library_search.set_members('study', ['M1','M2'])
        httpd, port = self.start_http()
        base = f'http://127.0.0.1:{port}'
        def send(payload):
            request = urllib.request.Request(base+'/api/evidence-matrix', data=json.dumps(payload).encode(),
                headers={'Content-Type':'application/json','Origin':base,'X-Workbench-Token':self.app.csrf}, method='POST')
            with urllib.request.urlopen(request, timeout=8) as response:
                return json.loads(response.read())
        with patch.object(self.app,'call_model',return_value=json.dumps({
            'sample':{'value':'twelve samples','status':'supported','evidenceIds':['E1']}})):
            matrix = send({'action':'generate','project':'study','keys':['M1','M2'],'focus':'binding'})['matrix']
        source = matrix['cells']['M1']['sample']['sources'][0]
        located = send({'action':'locate','project':'study',**source})
        self.assertEqual(located['state'],'located_quote')
        updated = send({'action':'edit','project':'study','paper':'M1','field':'sample',
                        'value':'Reader annotation','status':'unknown'})['matrix']
        self.assertEqual(updated['cells']['M1']['sample']['revision']['value'],'Reader annotation')
        self.assertIn('Reader annotation',send({'action':'export','project':'study','format':'csv'})['content'])
        with urllib.request.urlopen(base+'/api/evidence-matrix?project=study', timeout=5) as response:
            self.assertEqual(json.loads(response.read())['matrix']['papers'],['M1','M2'])
        with pdf.open('ab') as handle:
            handle.write(b'\n% changed')
        self.assertIn('(outdated)',send({'action':'export','project':'study','format':'markdown'})['content'])
        csv_export = send({'action':'export','project':'study','format':'csv'})['content']
        self.assertIn('""stale"": true',csv_export)

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for matrix comparison tests")
    def test_comparison_uses_current_project_matrix_with_grounded_sources(self):
        pdf = self.make_pdf('matrix-compare.pdf', 'The experiment enrolled twelve participants.')
        self.app.save_document({'key':'CMPM1','title':'One','_path':str(pdf)})
        self.app.save_document({'key':'CMPM2','title':'Two'})
        self.app.library_search.set_members('study', ['CMPM1','CMPM2'])
        index = self.app.evidence.index('CMPM1',pdf)
        source = {'paper':'CMPM1','version':index['version'],'page':1,
                  'quote':'The experiment enrolled twelve participants.'}
        self.app.matrices.merge_generated('study',['CMPM1','CMPM2'],{
            'CMPM1':{'sample':{'value':'12 participants','status':'supported','sources':[source]}}})
        with patch.object(self.app,'call_model',return_value='[P1]') as model:
            self.app.compare_synthesis(['CMPM1','CMPM2'],project='study')
        material = json.loads(model.call_args.args[0][1]['content'])
        self.assertEqual(material[0]['evidenceMatrix'][0]['sources'][0]['page'],1)
        self.assertEqual(material[0]['evidenceMatrix'][0]['origin'],'model interpretation')
        self.assertFalse(self.app.evidence_matrix_view('study')['cells']['CMPM1']['sample']['sources'][0]['stale'])
        with pdf.open('ab') as handle:
            handle.write(b'\n% changed')
        self.assertTrue(self.app.evidence_matrix_view('study')['cells']['CMPM1']['sample']['sources'][0]['stale'])
        with patch.object(self.app,'call_model',return_value='[P1]') as model:
            self.app.compare_synthesis(['CMPM1','CMPM2'],project='other')
        self.assertNotIn('evidenceMatrix',json.loads(model.call_args.args[0][1]['content'])[0])

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for matrix comparison tests")
    def test_comparison_omits_unsupported_generated_matrix_values_but_keeps_human_notes(self):
        pdf = self.make_pdf('matrix-unverified.pdf', 'The study measured the endpoint.')
        self.app.save_document({'key':'LEGACY1','title':'One','_path':str(pdf)})
        self.app.save_document({'key':'LEGACY2','title':'Two'})
        self.app.library_search.set_members('legacy',['LEGACY1','LEGACY2'])
        index = self.app.evidence.index('LEGACY1',pdf)
        source = {'paper':'LEGACY1','version':index['version'],'page':1,
                  'quote':'The study measured the endpoint.'}
        self.app.matrices.merge_generated('legacy',['LEGACY1','LEGACY2'],{
            'LEGACY1':{
                'sample':{'value':'Generated 3 mg/kg without a source','status':'unknown','sources':[]},
                'results':{'value':'Generated result with a rejected citation','status':'unknown',
                           'sources':[source],'citationValidation':{'rejectedCount':1,'rejectedIds':['P1E99']}},
                'method':{'value':'Measured the endpoint','status':'supported','sources':[source]},
                'endpoint':{'value':'Generated stale-source endpoint','status':'unknown',
                            'sources':[dict(source,version='outdated')]},
                'research_question':{'value':'Generated partly stale question','status':'unknown',
                                     'sources':[source,dict(source,version='outdated')]}}})
        self.app.matrices.save_edit('legacy','LEGACY1','controls','Human note without a quotation')
        with patch.object(self.app,'call_model',return_value='Grounded [P1E1].') as model:
            self.app.compare_synthesis(['LEGACY1','LEGACY2'],project='legacy')
        material = json.loads(model.call_args.args[0][1]['content'])
        cells = {cell['field']:cell for cell in material[0]['evidenceMatrix']}
        self.assertEqual(set(cells),{'controls','method'})
        self.assertEqual(cells['controls']['origin'],'user revision')
        self.assertEqual(cells['controls']['sources'],[])
        self.assertEqual(cells['method']['origin'],'model interpretation')
        self.assertEqual(cells['method']['sources'][0]['id'],'P1E1')

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for comparison evidence tests")
    def test_comparison_reuses_longer_passage_for_its_shorter_matrix_quote(self):
        quote='Binding was measured in twelve samples. A control group was included.'
        pdf=self.make_pdf('compare-overlap.pdf', quote)
        self.app.save_document({'key':'LONG','title':'Read paper','_path':str(pdf)})
        self.app.save_document({'key':'EMPTY','title':'Metadata'})
        self.app.library_search.set_members('overlap',['LONG','EMPTY'])
        version=server.FigureStore.version(pdf)
        self.app.full_reads.save('prior','LONG',version,'zh',{
            'status':'done','items':[{'id':'I1','sourceVerified':True,'sourceText':quote,'page':1}],
            'units':[{'heading':'Binding','question':'Binding?','design':'Control','result':'12 samples',
                      'sourceItemIds':['I1']}]})
        source={'paper':'LONG','version':version,'page':1,'quote':'Binding was measured in twelve samples.'}
        self.app.matrices.merge_generated('overlap',['LONG','EMPTY'],{
            'LONG':{'results':{'value':'12 samples','status':'supported','sources':[source]}}})
        with patch.object(self.app,'call_model',return_value='Twelve [P1E1].') as model:
            self.app.compare_synthesis(['LONG','EMPTY'],'binding','overlap')
        material=json.loads(model.call_args.args[0][1]['content'].split('\n\n',1)[-1])
        self.assertEqual(len(material[0]['passages']),1)
        self.assertEqual(material[0]['passages'][0]['quote'],quote)
        self.assertEqual(material[0]['evidenceMatrix'][0]['sources'][0]['id'],'P1E1')

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for comparison evidence tests")
    def test_comparison_prioritizes_matrix_result_source_over_search_hits(self):
        pdf = self.make_pdf('matrix-priority.pdf',
            *[f'Airway injury research question common background number {i}.' for i in range(4)],
            'The experiment observed 42 responsive cells in the treatment group.')
        self.app.save_document({'key': 'PR1', 'title': 'One', '_path': str(pdf)})
        self.app.save_document({'key': 'PR2', 'title': 'Two'})
        self.app.library_search.set_members('priority', ['PR1', 'PR2'])
        source = {'paper': 'PR1', 'version': server.FigureStore.version(pdf), 'page': 5,
                  'quote': 'The experiment observed 42 responsive cells in the treatment group.'}
        second_source = {'paper': 'PR1', 'version': source['version'], 'page': 4,
                         'quote': 'Airway injury research question common background number 3.'}
        self.app.matrices.merge_generated('priority', ['PR1', 'PR2'], {
            'PR1': {'results': {'value': '42 responsive cells', 'status': 'supported', 'sources': [source, second_source]}}})
        with patch.object(self.app, 'call_model', return_value='The result was 42 cells [P1E1].') as model:
            result = self.app.compare_synthesis(['PR1', 'PR2'], 'airway injury research question', 'priority')
        material = json.loads(model.call_args.args[0][1]['content'].split('\n\n', 1)[-1])
        result_cell = next(cell for cell in material[0]['evidenceMatrix'] if cell['field'] == 'results')
        self.assertEqual(result_cell['sources'][0]['page'], 5)
        self.assertEqual(result_cell['sources'][0]['id'], 'P1E1')
        self.assertEqual(result['sources'][0]['passages'][0]['page'], 5)
        self.assertEqual([item['page'] for item in result_cell['sources']], [5, 4])
        self.assertEqual(result['sources'][0]['passages'][1]['id'], 'P1E2')

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for comparison evidence tests")
    def test_comparison_respects_budget_with_twelve_large_matrices(self):
        pdf = self.make_pdf('comparison-budget.pdf', 'The experiment measured twelve samples against a control.')
        keys = [f'BUDGET{i}' for i in range(12)]
        version = server.FigureStore.version(pdf)
        for key in keys:
            self.app.save_document({'key': key, 'title': key, '_path': str(pdf)})
        self.app.library_search.set_members('budget', keys)
        rows = {}
        for key in keys:
            source = dict(paper=key, version=version, page=1,
                          quote='The experiment measured twelve samples against a control.')
            rows[key] = {field: dict(value='值' * 400, status='supported', sources=[source]) for field in server.FIELDS}
        self.app.matrices.merge_generated('budget', keys, rows)
        def respond(messages, *args, **kwargs):
            self.assertLessEqual(server.input_units(messages) + 4000 + 1024, 32768)
            return 'A bounded synthesis.'
        with patch.object(self.app, 'call_model', side_effect=respond) as model:
            result = self.app.compare_synthesis(keys, '研究' * 300, 'budget')
        material = json.loads(model.call_args.args[0][1]['content'].split('\n\n', 1)[-1])
        self.assertEqual(len(result['sources']), 12)
        self.assertTrue(all(entry.get('evidenceMatrix') for entry in material))
        for entry in material:
            available = {passage['id'] for passage in entry.get('passages', [])}
            for cell in entry.get('evidenceMatrix', []):
                self.assertTrue(all(source['id'] in available for source in cell['sources']))

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for comparison evidence tests")
    def test_comparison_reuses_reading_and_retrieves_source_without_reading(self):
        first=self.make_pdf('compare-read.pdf','Binding was measured in twelve samples with a control group.')
        second=self.make_pdf('compare-search.pdf','Binding was measured in six samples in a second experiment.')
        self.app.save_document({'key':'CR1','title':'Read paper','_path':str(first)})
        self.app.save_document({'key':'CR2','title':'Search paper','_path':str(second)})
        version=server.FigureStore.version(first)
        quote='Binding was measured in twelve samples with a control group.'
        self.app.full_reads.save('prior','CR1',version,'zh',{
            'status':'done','items':[{'id':'I1','sourceVerified':True,'sourceText':quote,'page':1}],
            'units':[{'heading':'Binding','question':'Binding?','design':'Control','result':'12 samples','sourceItemIds':['I1']}]})
        self.app.full_reads.save('interrupted','CR1',version,'zh',{'status':'interrupted','items':[],'units':[]})
        self.app.full_reads.save('empty-partial','CR1',version,'zh',{'status':'partial','items':[],'units':[]})
        with patch.object(self.app,'call_model',return_value='Twelve [P1E1], six [P2E1].') as model:
            result=self.app.compare_synthesis(['CR1','CR2'],'binding','study')
        self.assertEqual(model.call_count,1)
        material=json.loads(model.call_args.args[0][1]['content'].split('\n\n',1)[-1])
        self.assertEqual(material[0]['readingUnits'][0]['evidenceIds'],['P1E1'])
        self.assertEqual(set(material[0]['readingUnits'][0]), {'heading','evidenceIds'})
        self.assertEqual(material[0]['passages'][0]['quote'],quote)
        self.assertNotIn('readingUnits',material[1])
        self.assertIn('six samples',material[1]['passages'][0]['quote'])
        source=result['sources'][0]['passages'][0]
        self.assertEqual(source['id'],'P1E1')
        self.assertEqual(self.app.project_synthesis.get('study')['generated']['sources'][0]['passages'][0],source)
        self.assertEqual(self.app.locate_synthesis_source('CR1',source['version'],source['page'],source['quote'])['state'],'located_quote')
        _httpd,port=self.start_http()
        base=f'http://127.0.0.1:{port}'
        request=urllib.request.Request(base+'/api/project-synthesis',data=json.dumps({
            'action':'locate','project':'study','paper':'CR1',**source}).encode(),
            headers={'Content-Type':'application/json','Origin':base,'X-Workbench-Token':self.app.csrf},method='POST')
        with urllib.request.urlopen(request,timeout=5) as response:
            self.assertEqual(json.loads(response.read())['located']['state'],'located_quote')
        first.write_bytes(first.read_bytes()+b'\n% changed')
        with self.assertRaisesRegex(ValueError,'更改'):
            self.app.locate_synthesis_source('CR1',source['version'],source['page'],source['quote'])
        with patch.object(self.app,'call_model',return_value='Updated [P1E1].') as model:
            self.app.compare_synthesis(['CR1','CR2'],'binding','study')
        updated=json.loads(model.call_args.args[0][1]['content'].split('\n\n',1)[-1])
        self.assertNotIn('readingUnits',updated[0])

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for comparison evidence tests")
    def test_comparison_excludes_partially_sourced_reading_units(self):
        first=self.make_pdf('compare-partial.pdf','Binding in twelve samples.', 'Binding in six samples.')
        self.app.save_document({'key':'PARTIAL','title':'Read paper','_path':str(first)})
        self.app.save_document({'key':'EMPTY','title':'Metadata'})
        self.app.library_search.set_members('partial', ['PARTIAL','EMPTY'])
        version=server.FigureStore.version(first)
        self.app.full_reads.save('prior','PARTIAL',version,'zh',{
            'status':'partial','items':[
                {'id':'I1','sourceVerified':True,'sourceText':'Binding in twelve samples.','page':1},
                {'id':'I2','sourceVerified':False,'sourceText':'Unverified detail.','page':1},
                {'id':'I3','sourceVerified':True,'sourceText':'Binding in six samples.','page':2}],
            'units':[
                {'heading':'Binding partial','question':'Binding?','design':'','result':'Unsupported detail',
                 'sourceItemIds':['I1','I2']},
                {'heading':'Binding complete','question':'Binding?','design':'','result':'Six samples',
                 'sourceItemIds':['I3']},
                {'heading':'Binding repeated source','question':'Binding?','design':'','result':'Six samples',
                 'sourceItemIds':['I3']}]})
        with patch.object(self.app,'call_model',return_value='Six [P1E1].') as model:
            self.app.compare_synthesis(['PARTIAL','EMPTY'], 'binding')
        material=json.loads(model.call_args.args[0][1]['content'].split('\n\n',1)[-1])
        self.assertEqual([unit['heading'] for unit in material[0]['readingUnits']],
                         ['Binding complete','Binding repeated source'])
        self.assertTrue(all(unit['evidenceIds'] == ['P1E1'] for unit in material[0]['readingUnits']))
        self.assertEqual(material[0]['passages'][0]['quote'], 'Binding in six samples.')
        self.assertNotIn('Unsupported detail', json.dumps(material))
        with patch.object(self.app,'call_model',return_value='{}') as model:
            self.app.generate_evidence_matrix('partial', ['PARTIAL','EMPTY'])
        matrix_material=json.loads(model.call_args.args[0][1]['content'])
        self.assertEqual([unit['heading'] for unit in matrix_material['priorReadingUnits']],
                         ['Binding complete','Binding repeated source'])
        self.assertTrue(all(unit['evidenceIds'] == ['E1'] for unit in matrix_material['priorReadingUnits']))
        self.assertEqual(matrix_material['passages'][0]['quote'], 'Binding in six samples.')
        self.assertNotIn('Unsupported detail', json.dumps(matrix_material))

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for comparison evidence tests")
    def test_long_reading_source_is_complete_or_its_unit_is_omitted(self):
        lines=[f'Binding observation {i:02d} measured six samples in this experiment.' for i in range(38)]
        pdf=self.make_pdf('compare-long-unit.pdf', '\n'.join(lines), 'Binding independent result.')
        with fitz.open(pdf) as doc:
            quote=doc[0].get_text().strip()
        self.assertGreater(len(quote),1800)
        self.app.save_document({'key':'LONG','title':'Long source','_path':str(pdf)})
        self.app.save_document({'key':'EMPTY','title':'Metadata'})
        self.app.library_search.set_members('long', ['LONG','EMPTY'])
        version=server.FigureStore.version(pdf)
        self.app.full_reads.save('prior','LONG',version,'zh',{
            'status':'done','items':[
                {'id':'I1','sourceVerified':True,'sourceText':quote,'page':1},
                {'id':'I2','sourceVerified':True,'sourceText':'Binding independent result.','page':2}],
            'units':[
                {'heading':'Binding long','question':'','design':'','result':'','sourceItemIds':['I1']},
                {'heading':'Binding independent','question':'','design':'','result':'','sourceItemIds':['I2']}]})
        chunks=server.reading_source_chunks(quote)
        self.assertGreater(len(chunks),1)
        self.assertTrue(chunks[0].endswith('.'))
        self.assertEqual(' '.join(quote.split()),' '.join(' '.join(chunks).split()))
        unbroken='A' * 3601
        self.assertEqual(''.join(server.reading_source_chunks(unbroken)),unbroken)
        self.assertTrue(all(len(chunk)<=1800 for chunk in server.reading_source_chunks(unbroken)))
        validate=self.app.evidence.validate_quote
        for rejected in ('none','last','whole'):
            def check(index, page, text):
                if (rejected == 'last' and text == chunks[-1]) or (rejected == 'whole' and text == quote):
                    return {'state':'unverified'}
                return validate(index, page, text)
            with patch.object(self.app.evidence,'validate_quote',side_effect=check), \
                 patch.object(self.app.evidence,'retrieve',return_value={'evidence':[]}), \
                 patch.object(self.app,'call_model',return_value='{}') as model:
                self.app.compare_synthesis(['LONG','EMPTY'],'binding')
                comparison=json.loads(model.call_args.args[0][1]['content'].split('\n\n',1)[-1])[0]
                self.app.generate_evidence_matrix('long',['LONG','EMPTY'])
                matrix=json.loads(model.call_args.args[0][1]['content'])
            for material, key in ((comparison,'readingUnits'),(matrix,'priorReadingUnits')):
                units=material[key]
                self.assertEqual([unit['heading'] for unit in units],
                                 ['Binding long','Binding independent'] if rejected == 'none' else ['Binding independent'])
                passages={entry['id']:entry['quote'] for entry in material['passages']}
                if rejected != 'none':
                    self.assertNotIn(chunks[0],passages.values())
                else:
                    self.assertEqual([passages[identifier] for identifier in units[0]['evidenceIds']],chunks)

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for comparison evidence tests")
    def test_comparison_budget_drops_unit_if_any_source_is_removed(self):
        quotes=['Binding method in twelve samples.', 'Binding result in six samples.']
        pdf=self.make_pdf('compare-budget-unit.pdf', *quotes)
        self.app.save_document({'key':'TRIM','title':'Read paper','_path':str(pdf)})
        self.app.save_document({'key':'EMPTY','title':'Metadata'})
        version=server.FigureStore.version(pdf)
        items=[{'id':f'I{i}','sourceVerified':True,'sourceText':quote,'page':i}
               for i,quote in enumerate(quotes,1)]
        self.app.full_reads.save('prior','TRIM',version,'zh',{
            'status':'done','items':items,'units':[
                {'heading':'Binding both sources','sourceItemIds':['I1','I2']},
                {'heading':'Binding first source','sourceItemIds':['I1']}]})

        def budget(messages):
            material=json.loads(messages[1]['content'].split('\n\n',1)[-1])
            return 30000 if len(material[0].get('passages',[])) > 1 else 100

        with patch.object(self.app.evidence,'retrieve',return_value={'evidence':[]}), \
             patch.object(server,'input_units',side_effect=budget), \
             patch.object(self.app,'call_model',return_value='Draft') as model:
            self.app.compare_synthesis(['TRIM','EMPTY'],'binding')
        material=json.loads(model.call_args.args[0][1]['content'].split('\n\n',1)[-1])
        self.assertEqual([p['id'] for p in material[0]['passages']], ['P1E1'])
        self.assertEqual(material[0]['readingUnits'],
                         [{'heading':'Binding first source','evidenceIds':['P1E1']}])

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for comparison evidence tests")
    def test_reading_unit_reuse_reserves_focus_specific_passages(self):
        pages=['Binding method in twelve samples.','Binding control group.','Binding result in six samples.',
               'Binding outcome at day four.']
        pdf=self.make_pdf('compare-focus-reserve.pdf',*pages)
        self.app.save_document({'key':'RESERVE','title':'Read paper','_path':str(pdf)})
        self.app.save_document({'key':'EMPTY','title':'Metadata'})
        version=server.FigureStore.version(pdf)
        items=[{'id':f'I{i}','sourceVerified':True,'sourceText':quote,'page':i}
               for i,quote in enumerate(pages[:3],1)]
        self.app.full_reads.save('prior','RESERVE',version,'zh',{
            'status':'done','items':items,'units':[{
                'heading':'Binding experiment','question':'Binding?','design':'Control','result':'Result',
                'sourceItemIds':['I1','I2','I3']}]})
        focus_hit={'id':'E1','page':4,'quote':pages[3],'text':pages[3],'score':1.0,'rects':[],
                   'kind':'page_block','state':'located_quote'}
        with patch.object(self.app.evidence,'retrieve',return_value={'evidence':[focus_hit]}), \
             patch.object(self.app,'call_model',return_value='Result [P2E1].') as model:
            self.app.compare_synthesis(['RESERVE','EMPTY'],'binding')
        material=json.loads(model.call_args.args[0][1]['content'].split('\n\n',1)[-1])
        self.assertEqual(material[0]['readingUnits'][0]['evidenceIds'],['P1E1','P1E2','P1E3'])
        self.assertIn(pages[3], [passage['quote'] for passage in material[0]['passages']])

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for comparison evidence tests")
    def test_reading_unit_exceeding_source_limit_does_not_block_later_unit(self):
        quotes=[f'Binding experiment measurement number {i}.' for i in range(1,17)]
        pdf=self.make_pdf('compare-over-limit.pdf', *quotes)
        self.app.save_document({'key':'OVER','title':'Read paper','_path':str(pdf)})
        self.app.save_document({'key':'EMPTY','title':'Metadata'})
        self.app.library_search.set_members('over', ['OVER','EMPTY'])
        version=server.FigureStore.version(pdf)
        items=[{'id':f'I{i}','sourceVerified':True,'sourceText':quote,'page':i}
               for i,quote in enumerate(quotes,1)]
        self.app.full_reads.save('prior','OVER',version,'zh',{
            'status':'done','items':items,'units':[
                {'heading':'Binding too many','question':'','design':'','result':'Large unit',
                 'sourceItemIds':[f'I{i}' for i in range(1,16)]},
                {'heading':'Binding fits','question':'','design':'','result':'Small unit',
                 'sourceItemIds':['I16']}]})
        with patch.object(self.app,'call_model',return_value='Result [P1E1].') as model:
            self.app.compare_synthesis(['OVER','EMPTY'], 'binding')
        material=json.loads(model.call_args.args[0][1]['content'].split('\n\n',1)[-1])
        self.assertEqual([unit['heading'] for unit in material[0]['readingUnits']], ['Binding fits'])
        self.assertEqual(material[0]['passages'][0]['page'], 16)
        with patch.object(self.app,'call_model',return_value='{}') as model:
            self.app.generate_evidence_matrix('over', ['OVER','EMPTY'])
        material=json.loads(model.call_args.args[0][1]['content'])
        self.assertEqual([unit['heading'] for unit in material['priorReadingUnits']], ['Binding fits'])
        self.assertEqual(material['passages'][0]['page'], 16)

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for comparison evidence tests")
    def test_comparison_includes_existing_project_search_hits(self):
        pdf=self.make_pdf('compare-project.pdf','Binding was measured in twelve samples.')
        self.app.save_document({'key':'CP1','title':'Indexed','_path':str(pdf)})
        self.app.save_document({'key':'CP2','title':'Metadata'})
        self.app.library_search.set_members('study',['CP1','CP2'])
        self.app.evidence.index('CP1',pdf)
        with patch.object(self.app.evidence,'retrieve',return_value={'evidence':[]}), \
             patch.object(self.app,'call_model',return_value='Result [P1E1].') as model:
            self.app.compare_synthesis(['CP1','CP2'],'binding','study')
        material=json.loads(model.call_args.args[0][1]['content'].split('\n\n',1)[-1])
        self.assertIn('twelve samples',material[0]['passages'][0]['quote'])
        self.assertEqual(material[1]['evidenceBasis'],'metadata_only')

    def test_full_read_usage_counts_missing_and_stays_thread_local(self):
        self.app.settings.update(model_name="fixture", model_url="http://localhost:1234")
        usage = {"requests": 0, "prompt_tokens": 0, "completion_tokens": 0, "missing": 0}
        self.app.full_read_context.usage = usage
        payloads = [
            {"usage": {"prompt_tokens": 8, "completion_tokens": 3}, "choices": [{"message": {"content": "ok"}}]},
            {"choices": [{"message": {"content": "ok"}}]},
            {"choices": [{"message": {"content": "ok"}}]},
        ]
        with patch('server.urllib.request.build_opener') as build:
            build.return_value.open.side_effect = [io.BytesIO(json.dumps(item).encode()) for item in payloads]
            self.app.call_model([{"role": "user", "content": "one"}])
            thread = threading.Thread(target=lambda: self.app.call_model([{"role": "user", "content": "other"}]))
            thread.start()
            thread.join()
            self.app.call_model([{"role": "user", "content": "missing usage"}])
        self.assertEqual(usage, {"requests": 2, "prompt_tokens": 8, "completion_tokens": 3, "missing": 1})
        del self.app.full_read_context.usage

    def test_state_reports_active_full_read_jobs(self):
        self.app.full_read_jobs['TEST'] = object()
        self.assertEqual(self.app.state()['health']['fullReadActive'], 1)
        self.app.full_read_jobs.clear()
        self.assertEqual(self.app.state()['health']['fullReadActive'], 0)

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for crop preview tests")
    def test_deep_read_crop_validates_pdf_version_and_candidate_index(self):
        pdf = self.make_pdf("crop.pdf", "Candidate page.")
        self.app.save_document({"key": "CROP1", "title": "PDF", "_path": str(pdf), "flags": []})
        extracted = {"page_count": 1, "segments": [], "figure_candidates": [
            {"page": 1, "figure_number": "1", "caption": "Caption", "bbox": [0.1, 0.1, 0.9, 0.9], "status": "candidate", "confidence": "low", "reason": "fixture"}]}
        with patch("server.deep_read_pdf", return_value=extracted):
            version = server.FigureStore.version(pdf)
            self.assertTrue(self.app.deep_read_crop("CROP1", version, 0).startswith(b"\x89PNG"))
            with self.assertRaisesRegex(ValueError, "版本已变化"):
                self.app.deep_read_crop("CROP1", "stale", 0)
            with self.assertRaisesRegex(ValueError, "图编号无效"):
                self.app.deep_read_crop("CROP1", version, 1)

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for deep-reading HTTP tests")
    def test_deep_read_http_get_crop_and_analyze_contracts(self):
        pdf = self.make_pdf("http-deep.pdf", "A paper segment.")
        self.app.save_document({"key": "HTTPDEEP", "title": "PDF", "_path": str(pdf), "flags": []})
        extracted = {"page_count": 1, "segments": [{"type": "paragraph", "page": 1, "text": "A paper segment.", "bbox": [60, 60, 300, 110], "figure_numbers": ["1"]}],
                     "figure_candidates": [{"page": 1, "figure_number": "1", "caption": "Figure 1", "bbox": [0.1, 0.1, 0.9, 0.9], "status": "candidate", "confidence": "low", "reason": "fixture"}]}
        httpd, port = self.start_http()
        with patch("server.deep_read_pdf", return_value=extracted), patch.object(self.app, "call_model", return_value="Analysis"):
            with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/deep-read?key=HTTPDEEP", timeout=3) as response:
                listing = json.loads(response.read())
            self.assertEqual(listing["segments"][0]["figure_numbers"], ["1"])
            crop_url = f"http://127.0.0.1:{port}/api/deep-read/crop?key=HTTPDEEP&version={listing['version']}&index=0"
            with urllib.request.urlopen(crop_url, timeout=3) as response:
                self.assertEqual(response.headers.get("Content-Type"), "image/png")
                self.assertTrue(response.read().startswith(b"\x89PNG"))
            payload = json.dumps({"key": "HTTPDEEP", "version": listing["version"], "segment_index": 0,
                                  "candidate_index": 0, "include_image": False}).encode()
            request = urllib.request.Request(f"http://127.0.0.1:{port}/api/deep-read/analyze", data=payload,
                headers={"Content-Type": "application/json", "Origin": f"http://127.0.0.1:{port}", "X-Workbench-Token": self.app.csrf}, method="POST")
            with urllib.request.urlopen(request, timeout=3) as response:
                analyzed = json.loads(response.read())
            self.assertEqual(analyzed["analysis"], "Analysis")
            self.assertFalse(analyzed["image_included"])

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for PDF evidence tests")
    def test_paper_chat_binds_evidence_selection_and_history_to_pdf_version(self):
        quote = "The rare zephyr signal was observed."
        pdf = self.make_pdf("evidence.pdf", quote, "Second-page control text.")
        self.app.settings.update(summary_language="auto", ui_language="en")
        self.app.save_document({"key": "PDFCHAT", "title": "PDF paper", "_path": str(pdf), "flags": []})
        selection = {"segments": [{"page": 1, "text": quote}]}
        answer = "The signal was observed [E1] [Page 1] [E999] [Page 99]"
        with patch.object(self.app, "call_model", return_value=answer):
            result = self.app.paper_chat("PDFCHAT", "What was observed?", project="pdf-project", selection=selection)

        self.assertEqual(result["selection"]["status"], "located")
        self.assertEqual(result["evidence"][0]["kind"], "selection")
        citations = {item["id"]: item["state"] for item in result["citations"]}
        self.assertEqual(citations["E1"], "located_quote")
        self.assertEqual(citations["Page 1"], "page_only")
        self.assertEqual(citations["E999"], "unsupported")
        self.assertEqual(citations["Page 99"], "unsupported")
        self.assertEqual(result["coverage"]["located"], 2)
        self.assertEqual(result["coverage"]["unsupported"], 2)

        version = self.app.evidence.index("PDFCHAT", pdf)["version"]
        history = self.app.memory.history("pdf-project", "PDFCHAT")
        assistant = next(event for event in history if event["role"] == "assistant")
        self.assertEqual(assistant["evidence"]["evidence_version"], version)
        self.assertEqual(assistant["evidence"]["citations"], result["citations"])

        reopened = server.Workbench(self.app.data)
        try:
            restored = reopened.memory.history("pdf-project", "PDFCHAT")
            self.assertEqual(len(restored), 2)
            self.assertEqual(restored[-1]["evidence"]["evidence_version"], version)
        finally:
            reopened.db.close()

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for PDF evidence tests")
    def test_unverified_selection_is_never_promoted_to_located_evidence(self):
        pdf = self.make_pdf("wrong-page.pdf", "First page alpha.", "Second page omega.")
        self.app.save_document({"key": "PDFWRONG", "title": "PDF paper", "_path": str(pdf), "flags": []})
        with patch.object(self.app, "call_model", return_value="Not found [E1]") as call_model:
            result = self.app.paper_chat(
                "PDFWRONG", "What is on the first page?", project="wrong-page",
                selection={"segments": [{"page": 1, "text": "Second page omega."}]})
        self.assertEqual(result["selection"]["status"], "unverified")
        self.assertFalse(any(item["kind"] == "selection" for item in result["evidence"]))
        self.assertNotIn("not automatic proof", call_model.call_args.args[0][0]["content"])

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for PDF evidence tests")
    def test_excerpts_validate_and_survive_reopen_then_delete(self):
        quote = "A durable excerpt from the method section."
        pdf = self.make_pdf("excerpt.pdf", quote)
        self.app.save_document({"key": "EXCERPT1", "title": "Excerpt paper", "_path": str(pdf), "flags": []})
        version = self.app.evidence.index("EXCERPT1", pdf)["version"]
        saved = self.app.reading_memory({
            "action": "save-excerpt", "project": "excerpt-project", "paper": "EXCERPT1",
            "page": 1, "quote": quote, "version": version})["excerpt"]
        self.assertEqual(saved["state"], "located_quote")
        self.assertEqual(saved["version"], version)
        with self.assertRaisesRegex(ValueError, "未能.*定位"):
            self.app.reading_memory({
                "action": "save-excerpt", "project": "excerpt-project", "paper": "EXCERPT1",
                "page": 1, "quote": "This sentence is not in the PDF."})

        reopened = server.Workbench(self.app.data)
        try:
            listed = reopened.reading_memory({
                "action": "list", "project": "excerpt-project", "paper": "EXCERPT1"})["excerpts"]
            self.assertEqual([item["id"] for item in listed], [saved["id"]])
            exported = reopened.reading_memory({"action": "export", "project": "excerpt-project"})
            self.assertEqual(exported["excerpts"][0]["quote"], quote)
            reopened.reading_memory({
                "action": "delete-excerpt", "project": "excerpt-project", "id": saved["id"]})
            self.assertEqual(reopened.reading_memory({
                "action": "list", "project": "excerpt-project", "paper": "EXCERPT1"})["excerpts"], [])
        finally:
            reopened.db.close()

    def test_reading_memory_restart_context_disable_and_delete(self):
        self.app.save_document({'key':'MEM1','title':'Paper','_text':'Evidence '*30000,'flags':[]})
        preference=self.app.memory.remember('project-A','preference','Use short English paragraphs',[])
        with patch.object(self.app,'call_model',return_value='Answer [Page 1]') as model:
            first=self.app.paper_chat('MEM1','Explain receptor binding',project='project-A')
            second=self.app.paper_chat('MEM1','Continue the explanation',project='project-A')
            prompt=model.call_args.args[0][1]['content']
            self.assertIn('Use short English paragraphs',prompt)
            self.assertIn('Explain receptor binding',prompt)
            self.assertLessEqual(second['budget']['input_units']+2800+1024,32768)
            self.app.paper_chat('MEM1','No history',project='project-A',use_memory=False)
            self.assertNotIn('Use short English paragraphs',model.call_args.args[0][1]['content'])
        reopened=server.Workbench(self.app.data)
        try:
            self.assertEqual(len(reopened.memory.history('project-A','MEM1')),6)
            self.assertEqual(reopened.memory.recall('project-B','English'),[])
            reopened.reading_memory(dict(action='delete-event',project='project-A',id=first['event_ids'][0]))
            self.assertEqual(len(reopened.memory.history('project-A','MEM1')),4)
            reopened.reading_memory(dict(action='forget',project='project-A',id=preference['id']))
            self.assertEqual(reopened.memory.export('project-A')['memories'],[])
        finally:
            reopened.db.close()

    def test_empty_model_answer_does_not_leave_history(self):
        self.app.save_document({'key':'EMPTY1','title':'Paper','_text':'Evidence','flags':[]})
        with patch.object(self.app,'call_model',return_value='  '):
            with self.assertRaises(ValueError):
                self.app.paper_chat('EMPTY1','Question',project='empty')
        self.assertEqual(self.app.memory.history('empty','EMPTY1'),[])

    def test_named_session_chat_preserves_draft_scopes_history_and_retries(self):
        self.app.save_document({'key':'SESSION1','title':'Paper','_abstract':'Binding was observed.','flags':[]})
        session=self.app.sessions.create('project','SESSION1','Discussion')
        sid=session['session_id']
        self.app.sessions.save_exchange('project','SESSION1',sid,'Old question','Old answer',request_id='old')
        other=self.app.sessions.create('project','SESSION1','Other')
        self.app.sessions.save_exchange('project','SESSION1',other['session_id'],'Other secret','Other answer',request_id='other')
        with patch.object(self.app,'call_model',side_effect=ValueError('offline')):
            with self.assertRaisesRegex(ValueError,'offline'):
                self.app.paper_chat('SESSION1','Retry me',project='project',session_id=sid,request_id='retry')
        self.assertEqual(self.app.sessions.list('project','SESSION1')[0]['draft']['question'],'Retry me')
        with patch.object(self.app,'call_model',return_value='Supported [E1]') as model:
            first=self.app.paper_chat('SESSION1','Retry me',project='project',session_id=sid,request_id='retry')
            second=self.app.paper_chat('SESSION1','Retry me',project='project',session_id=sid,request_id='retry')
        self.assertEqual(model.call_count,1)
        context=json.dumps(model.call_args.args[0],ensure_ascii=False)
        self.assertIn('Old question',context)
        self.assertNotIn('Other secret',context)
        self.assertEqual(first['event_ids'],second['event_ids'])
        self.assertEqual(first['citations'],second['citations'])

    def test_reading_session_management_scope_and_legacy_history(self):
        self.app.save_document({'key':'PAPER','title':'Paper','_abstract':'An abstract.'})
        self.app.memory.add_event('one','PAPER','user','Old question')
        created=self.app.reading_session({'action':'create','project':'one','paper':'PAPER','title':'First'})
        sid=created['session_id']
        self.assertNotEqual(sid,'default')
        self.app.reading_session({'action':'rename','project':'one','paper':'PAPER','session_id':sid,'title':'Updated'})
        self.app.reading_session({'action':'draft','project':'one','paper':'PAPER','session_id':sid,'question':'Draft'})
        result=self.app.reading_session({'project':'one','paper':'PAPER','session_id':sid})
        self.assertEqual(result['draft']['question'],'Draft')
        self.assertEqual(result['sessions'][0]['title'],'Updated')
        self.assertEqual(result['history'],[])
        legacy=self.app.reading_session({'project':'one','paper':'PAPER'})
        self.assertEqual(legacy['history'][0]['content'],'Old question')
        with self.assertRaises(ValueError):
            self.app.reading_session({'project':'other','paper':'PAPER','session_id':sid})
        self.app.session_chat_active.add(('one','PAPER',sid))
        with self.assertRaisesRegex(ValueError,'正在处理'):
            self.app.reading_session({'action':'delete','project':'one','paper':'PAPER','session_id':sid})
        self.app.session_chat_active.clear()
        self.assertEqual(self.app.reading_session({'action':'delete','project':'one','paper':'PAPER','session_id':sid})['session_id'],'default')

    def test_reading_session_http_create_failure_retry_and_delete(self):
        self.app.save_document({'key':'CHAT','title':'Test paper','_abstract':'A documented result.'})
        httpd,port=self.start_http()
        base=f'http://127.0.0.1:{port}'
        def request(route,value):
            req=urllib.request.Request(base+route,data=json.dumps(value).encode(),
                headers={'Content-Type':'application/json','Origin':base,'X-Workbench-Token':self.app.csrf},method='POST')
            with urllib.request.urlopen(req,timeout=5) as response:
                return json.loads(response.read())
        created=request('/api/reading-session',{'action':'create','project':'A','paper':'CHAT','title':'Test'})
        sid=created['session_id']
        query={'key':'CHAT','project':'A','question':'What happened?','session_id':sid,'request_id':'one'}
        with patch.object(self.app,'call_model',side_effect=ValueError('offline')):
            with self.assertRaises(urllib.error.HTTPError):
                request('/api/paper-chat',query)
        self.assertEqual(request('/api/reading-session',{'project':'A','paper':'CHAT','session_id':sid})['draft']['question'],'What happened?')
        with patch.object(self.app,'call_model',return_value='Answer [E1]') as model:
            first=request('/api/paper-chat',query)
            second=request('/api/paper-chat',query)
        self.assertEqual(model.call_count,1)
        self.assertEqual(first['event_ids'],second['event_ids'])
        self.assertIsNone(request('/api/reading-session',{'project':'A','paper':'CHAT','session_id':sid})['draft'])
        self.assertEqual(request('/api/reading-session',{'action':'delete','project':'A','paper':'CHAT','session_id':sid})['session_id'],'default')

    def test_presaved_chat_does_not_replace_newer_draft(self):
        self.app.save_document({'key':'CHAT','title':'Test paper','_abstract':'A documented result.'})
        sid=self.app.sessions.create('A','CHAT')['session_id']
        self.app.sessions.set_draft('A','CHAT',sid,'Next question')
        with patch.object(self.app,'call_model',return_value='Answer'):
            self.app.paper_chat('CHAT','First question',project='A',session_id=sid,request_id='one',draft_saved=True)
        self.assertEqual(self.app.sessions.list('A','CHAT')[0]['draft']['question'],'Next question')

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for draft tests")
    def test_failed_session_selection_keeps_attachment_version(self):
        pdf=self.make_pdf('draft.pdf','A selected passage from the first page.')
        self.app.save_document({'key':'DRAFT','title':'Draft paper','_path':str(pdf)})
        sid=self.app.sessions.create('project','DRAFT')['session_id']
        selection={'segments':[{'page':1,'text':'selected passage'}]}
        with patch.object(self.app,'call_model',side_effect=ValueError('offline')):
            with self.assertRaises(ValueError):
                self.app.paper_chat('DRAFT','Explain',project='project',selection=selection,session_id=sid,request_id='req')
        draft=self.app.reading_session({'paper':'DRAFT','project':'project','session_id':sid})['draft']
        self.assertEqual(draft['selection']['segments'],selection['segments'])
        self.assertEqual(draft['selection']['_session_scope']['version'],server.FigureStore.version(pdf))

    def test_oversized_model_input_is_rejected_before_network(self):
        with patch('server.urllib.request.build_opener') as network:
            with self.assertRaisesRegex(ValueError,'32768'):
                self.app.call_model([dict(role='user',content='x'*40000)])
            network.assert_not_called()

    def test_compare_synthesis_uses_structured_cards(self):
        self.app.settings.update(summary_language="zh", ui_language="zh")
        for key, finding in (("CMP1", "Finding one"), ("CMP2", "Finding two")):
            self.app.save_document({"key": key, "title": key, "findings": [finding], "flags": []})
        with patch.object(self.app, "call_model", return_value="## 跨文献综合\n证据") as call_model:
            result = self.app.compare_synthesis(["CMP1", "CMP2"])
        material = call_model.call_args.args[0][1]["content"]
        self.assertIn("Finding one", material)
        self.assertIn("Finding two", material)
        self.assertEqual(result["language"], "zh")

    def test_comparison_prompt_permits_necessary_evidence_boundaries(self):
        for key in ('BOUND1', 'BOUND2'):
            self.app.save_document({'key': key, 'title': key, 'flags': []})
        for language, boundary in (('zh', '差异表达不等于激活'),
                                   ('en', 'differential expression not establishing activation')):
            with self.subTest(language=language):
                self.app.settings.update(summary_language=language, ui_language=language)
                with patch.object(self.app, 'call_model', return_value='Draft') as model:
                    self.app.compare_synthesis(['BOUND1', 'BOUND2'])
                instruction = model.call_args.args[0][0]['content']
                self.assertIn(boundary, instruction)
                self.assertNotIn('不使用“并不矛盾/不等于/不成立”', instruction)
                self.assertNotIn('Avoid preachy self-defensive phrasing', instruction)

    @unittest.skipUnless(fitz is not None, "PyMuPDF is required for dossier tests")
    def test_dossier_generation_binds_evidence_and_feeds_comparison(self):
        pdf = self.make_pdf(
            "dossier-fixture.pdf",
            "Introduction: the study asks how the endpoint changes.",
            "Methods: the assay measured the primary endpoint with a control arm.",
            "Results: the authors observed a reproducible increase in the endpoint.",
            "Discussion: the finding may inform follow-up work.",
        )
        self.app.save_document({"key": "DOS1", "title": "Dossier fixture", "_path": str(pdf), "flags": []})
        self.app.save_document({"key": "DOS2", "title": "Plain card fixture", "findings": ["Card-only finding"], "flags": []})
        answer = json.dumps({
            "readingDecision": {"decision": "read", "fit": "Fits the fixture question.", "focus": ["Methods", "Endpoint"],
                                "concerns": [], "nextAction": "Verify the control arm."},
            "outline": [{"heading": "Results", "purpose": "Locate the central result.",
                         "keyPoint": "The endpoint increased [E2].", "evidenceIds": ["E2"]},
                        {"heading": "Unsupported", "purpose": "Must not be promoted.",
                         "keyPoint": "Invented source [E99].", "evidenceIds": ["E99"]}],
            "argument": [
                {"role": "method", "statement": "The assay used a control arm [E1].",
                 "status": "author_stated", "evidenceIds": ["E1"]},
                {"role": "implication", "statement": "The result warrants follow-up.",
                 "status": "inferred", "evidenceIds": []},
            ],
            "methodsAudit": [{"aspect": "Controls", "observation": "A control arm was reported [E1].",
                              "status": "reported", "evidenceIds": ["E1"]}],
            "reusableNotes": [{"type": "insight", "text": "The endpoint result is source-grounded [E2].",
                               "evidenceIds": ["E2"]}],
        })
        with patch.object(self.app, "call_model", return_value=answer) as call_model:
            generated = self.app.generate_dossier("DOS1")
        self.assertEqual(generated["document"], "DOS1")
        self.assertFalse(generated["stale"])
        self.assertEqual(generated["value"]["outline"][0]["pageStart"], generated["value"]["evidence"][1]["page"])
        self.assertEqual(generated["value"]["outline"][0]["pageEnd"], generated["value"]["evidence"][1]["page"])
        self.assertEqual(len(generated["value"]["outline"]), 1)
        self.assertEqual(generated["value"]["referenceWarnings"]["rejectedEvidenceIds"], ["E99"])
        self.assertEqual(generated["value"]["referenceWarnings"]["droppedItems"], 1)
        self.assertEqual(generated["value"]["coverage"], {"items": 5, "withEvidence": 4, "inferred": 1})
        self.assertEqual(call_model.call_args.kwargs["json_mode"], True)
        prompt = call_model.call_args.args[0]
        material = json.loads(prompt[1]["content"])
        self.assertEqual(material["allowedEvidenceIds"], [item["id"] for item in material["evidence"]])
        self.assertIn("allowedEvidenceIds", prompt[0]["content"])

        stored = self.app.get_dossier("DOS1")
        self.assertFalse(stored["stale"])
        self.assertTrue(next(row for row in self.app.state()["documents"] if row["key"] == "DOS1")["hasDossier"])
        _httpd, port = self.start_http()
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/dossier?key=DOS1", timeout=3) as response:
            http_dossier = json.loads(response.read())
        self.assertEqual(http_dossier["dossier"]["value"]["readingDecision"]["decision"], "read")

        with patch.object(self.app, "call_model", return_value="Grounded comparison [P1].") as call_model:
            result = self.app.compare_synthesis(["DOS1", "DOS2"], "Compare methods")
        material = call_model.call_args.args[0][1]["content"]
        self.assertIn('"readingDecision"', material)
        self.assertIn("Methods", material)
        self.assertIn("Card-only finding", material)
        self.assertEqual(result["language"], "zh")

        pdf.write_bytes(pdf.read_bytes() + b"\nchanged")
        self.assertTrue(self.app.get_dossier("DOS1")["stale"])

    def test_dossier_evidence_skips_bibliography_blocks(self):
        pdf = self.make_pdf(
            "dossier-references.pdf",
            "Introduction: the study asks whether the intervention changes the primary outcome.",
            "Results: the intervention increased the primary outcome with a reported control arm.",
            "References\nSmith A, Jones B. Trial of an intervention. Journal 2020;12:1-9. doi:10.1/example. PubMed: 123.\n"
            "Brown C, et al. Follow-up study. Journal 2021;13:10-20. doi:10.1/example2. PubMed: 456.",
        )
        self.app.save_document({"key": "DOSREF", "title": "Reference filter fixture", "_path": str(pdf), "flags": []})
        index = self.app.evidence.index("DOSREF", pdf, max_pages=10)
        evidence, _page_map = self.app._dossier_evidence(index)
        self.assertTrue(evidence)
        self.assertTrue(all("PubMed" not in item["quote"] for item in evidence))

    def test_mini_review_supports_twelve_papers_focus_and_source_map(self):
        self.app.settings.update(summary_language="en", ui_language="en")
        for index in range(1, 7):
            row = {"key": f"REV{index}", "title": f"Paper {index}", "flags": []}
            if index < 6:
                row["findings"] = [f"Finding {index}"]
            if index == 1:
                row['authors'] = 'Author One'
            self.app.save_document(row)
        with patch.object(self.app, "call_model", return_value="Supported [P1].") as call_model:
            result = self.app.compare_synthesis([f"REV{index}" for index in range(1, 7)], "Compare evidence")
        system = call_model.call_args.args[0][0]["content"]
        user = call_model.call_args.args[0][1]["content"]
        self.assertIn("250–500 words", system)
        self.assertIn("use an explicit negative or distinction", system)
        self.assertIn("Focus question: Compare evidence", user)
        self.assertIn('"authors": "Author One"', user)
        self.assertIn('rather than guessing', system)
        self.assertIn('assay, cell type, intervention and endpoint', system)
        self.assertIn('reporter-screen hit does not establish a proliferation effect', system)
        self.assertIn('Differential expression alone does not establish activation, direction, or measured proliferation', system)
        self.assertIn('statistical thresholds attached to the exact comparison', system)
        self.assertIn('do not claim it was absent from the whole paper', system)
        self.assertIn('Place the citation immediately after each number with a unit', system)
        self.assertIn('"hasStructuredCard": false', user)
        self.assertEqual([source["id"] for source in result["sources"]], ["P1", "P2", "P3", "P4", "P5", "P6"])

    def test_document_state_merges_without_losing_private_text(self):
        self.app.save_document({"key": "READ1", "title": "Reading fixture", "_text": "private evidence", "flags": []})
        saved = self.app.set_document_state("READ1", "reading", "Check the control arm")
        private = next(row for row in self.app.documents(True) if row["key"] == "READ1")
        self.assertEqual(saved["readingStatus"], "reading")
        self.assertEqual(saved["readingNote"], "Check the control arm")
        self.assertEqual(private["_text"], "private evidence")
        with self.assertRaises(ValueError):
            self.app.set_document_state("READ1", "invalid", "")

    def test_legacy_document_added_time_comes_from_import_job(self):
        self.app.save_document({"key": "OLDADD", "title": "Legacy record", "flags": []})
        job = self.add_job(self.input / "legacy.pdf", status="imported")
        with self.app.lock, self.app.db:
            self.app.db.execute("UPDATE jobs SET item_key='OLDADD' WHERE id=?", (job["id"],))
        document = next(row for row in self.app.state()["documents"] if row["key"] == "OLDADD")
        self.assertGreater(document["addedAt"], 0)

    def test_external_recommend_rejects_private_pdf_url(self):
        with self.assertRaises(ValueError):
            self.app.ingest_external_pdf("https://127.0.0.1/private.pdf", "Private")

    def test_external_recommend_uses_openalex_helper(self):
        fixture = [{"title": "External fixture", "doi": "10.1/example"}]
        with patch("pipeline.search_external_literature", return_value=fixture):
            self.assertEqual(self.app.external_recommend("search", "epitope"), fixture)

    def test_model_endpoint_rejects_external_http_and_userinfo(self):
        for value in ("http://example.org/v1", "https://user:pass@example.org/v1"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                server.model_endpoint(value)
        self.assertEqual(server.model_endpoint("http://127.0.0.1:8080/v1"), "http://127.0.0.1:8080/v1/chat/completions")

    def test_baseline_stability_and_same_path_replacement(self):
        old_file = self.input / "old.pdf"
        old_file.write_bytes(b"old-baseline")
        self.app.baseline_folder(self.input)
        self.assertEqual(self.app.scan(), 0)
        with self.app.lock:
            self.assertIsNone(self.app.db.execute("SELECT 1 FROM jobs WHERE path=?", (str(old_file),)).fetchone())

        new_file = self.input / "new.pdf"
        new_file.write_bytes(b"first downloaded payload")
        self.assertEqual(self.app.scan(), 0)  # First observation starts the stability timer.
        with self.app.lock, self.app.db:
            self.app.db.execute("UPDATE seen SET observed=? WHERE path=?", (time.time() - 30, str(new_file)))
        self.app.scan()
        self.assertEqual(self.get_job(new_file)["status"], "queued")
        with self.app.lock, self.app.db:
            self.app.db.execute("UPDATE jobs SET status='imported',result='old result',sha256='old hash' WHERE path=?", (str(new_file),))

        new_file.write_bytes(b"replacement payload is longer")
        os.utime(new_file, ns=(time.time_ns(), time.time_ns()))
        self.app.scan()  # Changed stat starts a fresh stability window.
        self.assertEqual(self.get_job(new_file)["status"], "imported")
        with self.app.lock, self.app.db:
            self.app.db.execute("UPDATE seen SET observed=? WHERE path=?", (time.time() - 30, str(new_file)))
        self.app.scan()
        replacement = self.get_job(new_file)
        self.assertEqual(replacement["status"], "queued")
        self.assertIsNone(replacement["result"])
        self.assertIsNone(replacement["sha256"])
        self.assertIsNone(replacement["item_key"])

    def test_known_content_hash_skips_inspection_and_import(self):
        path = self.input / "duplicate.pdf"
        path.write_bytes(b"already imported bytes")
        sha = hashlib.sha256(path.read_bytes()).hexdigest()
        job = self.add_job(path)
        with self.app.lock, self.app.db:
            self.app.db.execute("INSERT INTO hashes VALUES (?,?)", (sha, "KNOWN123"))
        with patch.object(self.app, "import_job") as import_job, patch("pipeline.inspect_file") as inspect_file:
            self.app.process(job)
        self.assertEqual(self.get_job(path)["status"], "duplicate")
        import_job.assert_not_called()
        inspect_file.assert_not_called()

    def test_ready_file_imports_locally_without_zotero(self):
        path = self.input / "local.pdf"
        path.write_bytes(b"local import fixture")
        sha = hashlib.sha256(path.read_bytes()).hexdigest()
        job = self.add_job(path)
        result = {
            "status": "ready",
            "sha256": sha,
            "category": "研究方法与工具",
            "keywords": ["local intake"],
            "text": "Local full text",
            "metadata": {
                "itemType": "journalArticle",
                "title": "Local fixture",
                "DOI": "10.1234/local",
            },
        }
        self.app.health.update(zotero=False, authorized=False)
        with patch("pipeline.inspect_file", return_value=result), \
             patch.object(self.app, "import_job") as zotero_import:
            self.app.process(job)

        current = self.get_job(path)
        saved = next(row for row in self.app.documents(True) if row["key"] == current["item_key"])
        self.assertEqual(current["status"], "imported")
        self.assertIn("本地资料库", current["reason"])
        self.assertFalse(saved["zoteroLinked"])
        self.assertEqual(saved["attachmentURL"], "")
        self.assertTrue(Path(saved["_path"]).is_file())
        with self.app.lock:
            known = self.app.db.execute("SELECT item_key FROM hashes WHERE hash=?", (sha,)).fetchone()
        self.assertEqual(known[0], current["item_key"])
        zotero_import.assert_not_called()

    def test_verified_preprint_imports_locally_with_archive_identity(self):
        path = self.input / "preprint.pdf"
        path.write_bytes(b"preprint fixture")
        sha = hashlib.sha256(path.read_bytes()).hexdigest()
        job = self.add_job(path)
        result = {
            "status": "ready",
            "sha256": sha,
            "category": "研究方法与工具",
            "keywords": ["RNA design"],
            "text": "Preprint full text",
            "metadata": {
                "itemType": "preprint",
                "title": "RiboPO preprint",
                "DOI": "",
                "archiveID": "arXiv:2510.21161v2",
                "repository": "arXiv",
            },
        }
        self.app.health.update(zotero=False, authorized=False)
        with patch("pipeline.inspect_file", return_value=result), \
             patch.object(self.app, "import_job") as zotero_import:
            self.app.process(job)

        current = self.get_job(path)
        saved = next(row for row in self.app.documents(True) if row["key"] == current["item_key"])
        self.assertEqual(current["status"], "imported")
        self.assertEqual(saved["kind"], "preprint")
        self.assertEqual(saved["identifier"], "arXiv:2510.21161v2")
        self.assertEqual(saved["studyType"], "预印本")
        self.assertEqual(saved["source"], "arXiv")
        self.assertFalse(saved["zoteroLinked"])
        self.assertEqual(saved["attachmentURL"], "")
        zotero_import.assert_not_called()

    def test_waiting_job_reinspects_when_source_hash_changed(self):
        path = self.input / "changed.pdf"
        path.write_bytes(b"new file bytes")
        old_result = {"status": "ready", "metadata": {"itemType": "journalArticle", "title": "Old title", "DOI": "10.1/old"}}
        job = self.add_job(path, status="waiting_zotero", sha=hashlib.sha256(b"old file bytes").hexdigest(), result=old_result)
        fresh = {"status": "review", "reason": "fresh content requires review", "metadata": {"title": "Fresh title"}}
        with patch("pipeline.inspect_file", return_value=fresh) as inspect_file:
            self.app.process(job)
        inspect_file.assert_called_once_with(str(path))
        current = self.get_job(path)
        self.assertEqual(current["sha256"], hashlib.sha256(path.read_bytes()).hexdigest())
        self.assertEqual(current["title"], "Fresh title")
        self.assertEqual(current["status"], "review")

    def test_old_inspection_result_is_reclassified_without_replacing_pdf(self):
        path = self.input / "cached.pdf"
        path.write_bytes(b"unchanged classifier fixture")
        sha = hashlib.sha256(path.read_bytes()).hexdigest()
        old_result = {"status": "review", "sha256": sha, "reason": "old classifier", "metadata": {"title": "Old title"}}
        job = self.add_job(path, status="waiting_zotero", sha=sha, result=old_result)
        fresh = {"status": "review", "sha256": sha, "inspectorVersion": 2,
                 "reason": "fresh classifier", "metadata": {"title": "Fresh title"}}
        with patch("pipeline.inspect_file", return_value=fresh) as inspect_file:
            self.app.process(job)
        inspect_file.assert_called_once_with(str(path))
        current = self.get_job(path)
        self.assertEqual(current["title"], "Fresh title")
        self.assertEqual(current["status"], "review")

    def test_stale_reviews_requeue_once_without_touching_current_or_missing_files(self):
        stale_path = self.input / "stale.pdf"
        stale_path.write_bytes(b"stale")
        current_path = self.input / "current.pdf"
        current_path.write_bytes(b"current")
        missing_path = self.input / "missing.pdf"
        stale = self.add_job(stale_path, status="review", result={"inspectorVersion": 4})
        current = self.add_job(current_path, status="review", result={"inspectorVersion": pipeline.INSPECTION_VERSION})
        missing = self.add_job(missing_path, status="review", result={"inspectorVersion": 4})

        self.app.requeue_stale_reviews()

        self.assertEqual(self.get_job(stale_path)["status"], "queued")
        self.assertIn("分类规则已升级", self.get_job(stale_path)["reason"])
        self.assertEqual(self.get_job(current_path)["status"], "review")
        self.assertEqual(self.get_job(missing_path)["status"], "review")
        self.assertEqual(
            self.app.get_kv(f"review_requeued_v{pipeline.INSPECTION_VERSION}"),
            1,
        )

        with self.app.lock, self.app.db:
            self.app.db.execute("UPDATE jobs SET status='review' WHERE id=?", (stale["id"],))
        self.app.requeue_stale_reviews()
        self.assertEqual(self.get_job(stale_path)["status"], "review")

    def test_review_record_can_be_confirmed_into_import_queue(self):
        path = self.input / "confirmed.pdf"
        path.write_bytes(b"confirmed fixture")
        result = {
            "status": "review",
            "metadata": {"itemType": "journalArticle", "title": "Confirmed paper", "DOI": "10.1234/confirmed"},
            "basis": "Crossref title search",
        }
        job = self.add_job(path, status="review", result=result)
        visible = next(row for row in self.app.state()["jobs"] if row["id"] == job["id"])
        self.assertTrue(visible["canConfirm"])
        self.assertNotIn("result", visible)
        confirmed = self.app.confirm_job(job["id"])
        current = self.get_job(path)
        self.assertEqual(confirmed["title"], "Confirmed paper")
        self.assertEqual(current["status"], "queued")
        self.assertEqual(json.loads(current["result"])["status"], "ready")
        self.assertIn("人工确认", current["result"])

    @unittest.skipUnless(os.name == "nt", "Windows shell open")
    def test_review_record_opens_source_file(self):
        path = self.input / "review-source.pdf"
        path.write_bytes(b"review fixture")
        job = self.add_job(path, status="review", result={"status": "review"})
        visible = next(row for row in self.app.state()["jobs"] if row["id"] == job["id"])
        self.assertTrue(visible["fileAvailable"])
        with patch("server.os.startfile") as startfile:
            self.app.open_job_file(job["id"])
        startfile.assert_called_once_with(str(path))

    def test_parent_saved_child_failed_retry_adds_attachment_with_same_key(self):
        path = self.input / "partial.pdf"
        path.write_bytes(b"partial-write fixture")
        sha = hashlib.sha256(path.read_bytes()).hexdigest()
        job = self.add_job(path)
        result = {"status": "ready", "category": "研究方法与工具", "keywords": [], "text": "",
                  "metadata": {"itemType": "journalArticle", "title": "Fixture paper", "DOI": "10.1234/fixture"}}
        posted = []
        refresh_count = 0

        def refreshed():
            nonlocal refresh_count
            refresh_count += 1
            self.app.live_items = [{"key": self.get_job(path)["item_key"]}] if refresh_count > 1 else []
            self.app.health.update(zotero=True, authorized=True)
            return True

        def post(route, payload=None, token=None, timeout=12):
            posted.append((route, payload, token))
            return {"failed": {"1": {"code": 400}}} if len(posted) == 1 else {"successful": {"0": {}}}

        with patch.object(self.app, "ensure_collection", return_value="COLL"), \
             patch.object(self.app, "refresh_zotero", side_effect=refreshed), \
             patch.object(self.app, "zotero", side_effect=post):
            with self.assertRaises(ValueError):
                self.app.import_job(job, result, sha)
            retry = self.get_job(path)
            self.app.import_job(retry, result, sha)

        self.assertEqual(len(posted), 2)
        parent_key = retry["item_key"]
        attachment_key = retry["attachment_key"]
        self.assertEqual(len(posted[0][1]), 2)
        self.assertEqual(len(posted[1][1]), 1)
        self.assertEqual(posted[1][1][0]["key"], attachment_key)
        self.assertEqual(posted[1][1][0]["parentItem"], parent_key)
        self.assertEqual(self.get_job(path)["status"], "imported")

    def test_journal_zotero_payload_drops_patent_number(self):
        path = self.input / "journal.pdf"
        path.write_bytes(b"journal fixture")
        sha = hashlib.sha256(path.read_bytes()).hexdigest()
        job = self.add_job(path)
        result = {"status": "ready", "category": "研究方法与工具", "keywords": [], "text": "",
                  "metadata": {"itemType": "journalArticle", "title": "Fixture paper", "DOI": "10.1234/fixture",
                               "patentNumber": "", "publicationTitle": "Fixture Journal"}}
        payloads = []

        def refreshed():
            self.app.live_items = []
            self.app.health.update(zotero=True, authorized=True)
            return True

        with patch.object(self.app, "ensure_collection", return_value="COLL"), \
             patch.object(self.app, "refresh_zotero", side_effect=refreshed), \
             patch.object(self.app, "zotero", side_effect=lambda route, payload=None, token=None, timeout=12: payloads.append(payload) or {"successful": {"0": {}, "1": {}}}):
            self.app.import_job(job, result, sha)
        self.assertNotIn("patentNumber", payloads[0][0])

    def start_http(self):
        httpd = server.ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
        httpd.app = self.app
        httpd.daemon_threads = True
        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(httpd.server_close)
        self.addCleanup(httpd.shutdown)
        self.addCleanup(thread.join, 2)
        return httpd, httpd.server_port

    def test_http_rejects_bad_host_origin_and_missing_csrf(self):
        httpd, port = self.start_http()
        url = f"http://127.0.0.1:{port}/api/scan"
        base = {"Content-Type": "application/json", "Origin": f"http://127.0.0.1:{port}", "X-Workbench-Token": self.app.csrf}
        cases = (
            {**base, "Host": "attacker.example"},
            {**base, "Origin": "http://attacker.example", "Host": f"127.0.0.1:{port}"},
            {"Content-Type": "application/json", "Origin": f"http://127.0.0.1:{port}", "Host": f"127.0.0.1:{port}"},
        )
        for headers in cases:
            request = urllib.request.Request(url, data=b"{}", headers=headers, method="POST")
            with self.subTest(headers=headers), self.assertRaises(urllib.error.HTTPError) as caught:
                urllib.request.urlopen(request, timeout=3)
            self.assertEqual(caught.exception.code, 403)

    def test_http_static_routes_allow_only_known_assets(self):
        _httpd, port = self.start_http()
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/", timeout=3) as response:
            self.assertEqual(response.status, 200)
        for path in ("/server.py", "/..%2Fserver.py", "/api/../server.py"):
            request = urllib.request.Request(f"http://127.0.0.1:{port}{path}")
            with self.subTest(path=path), self.assertRaises(urllib.error.HTTPError) as caught:
                urllib.request.urlopen(request, timeout=3)
            self.assertEqual(caught.exception.code, 404)

    def test_document_pdf_serving_and_vendor_assets(self):
        _httpd, port = self.start_http()
        pdf_file = self.input / "sample_doc.pdf"
        pdf_body = b"%PDF-1.4 sample content"
        pdf_file.write_bytes(pdf_body)
        doc = dict(key="doc123", title="Sample Doc", zhTitle="示例论文", _path=str(pdf_file), readingStatus="unread")
        self.app.save_document(doc)

        with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/document/doc123/pdf", timeout=3) as resp:
            self.assertEqual(resp.status, 200)
            self.assertEqual(resp.headers.get("Content-Type"), "application/pdf")
            self.assertEqual(resp.read(), pdf_body)

        request = urllib.request.Request(
            f"http://127.0.0.1:{port}/api/document/doc123/pdf",
            headers={"Range": "bytes=0-7"})
        with urllib.request.urlopen(request, timeout=3) as resp:
            self.assertEqual(resp.status, 206)
            self.assertEqual(resp.headers.get("Content-Range"), f"bytes 0-7/{len(pdf_body)}")
            self.assertEqual(resp.read(), pdf_body[:8])

        request = urllib.request.Request(
            f"http://127.0.0.1:{port}/api/document/doc123/pdf",
            headers={"Range": "bytes=999-1000"})
        with self.assertRaises(urllib.error.HTTPError) as caught:
            urllib.request.urlopen(request, timeout=3)
        self.assertEqual(caught.exception.code, 416)
        self.assertEqual(caught.exception.headers.get("Content-Range"), f"bytes */{len(pdf_body)}")

        with self.assertRaises(urllib.error.HTTPError) as caught:
            urllib.request.urlopen(f"http://127.0.0.1:{port}/api/document/nonexistent/pdf", timeout=3)
        self.assertEqual(caught.exception.code, 404)

        with self.assertRaises(urllib.error.HTTPError) as caught:
            urllib.request.urlopen(f"http://127.0.0.1:{port}/api/document/bad..key/pdf", timeout=3)
        self.assertEqual(caught.exception.code, 400)

        with urllib.request.urlopen(f"http://127.0.0.1:{port}/vendor/pdfjs/pdf.min.mjs", timeout=3) as resp:
            self.assertEqual(resp.status, 200)
            self.assertIn("javascript", resp.headers.get("Content-Type"))

        with self.assertRaises(urllib.error.HTTPError) as caught:
            urllib.request.urlopen(f"http://127.0.0.1:{port}/vendor/..%2Fserver.py", timeout=3)
        self.assertEqual(caught.exception.code, 404)


if __name__ == "__main__":
    unittest.main()
