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
    import fitz
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
            self.app.save_document(row)
        with patch.object(self.app, "call_model", return_value="Supported [P1].") as call_model:
            result = self.app.compare_synthesis([f"REV{index}" for index in range(1, 7)], "Compare evidence")
        system = call_model.call_args.args[0][0]["content"]
        user = call_model.call_args.args[0][1]["content"]
        self.assertIn("250–500 words", system)
        self.assertIn("not-X-but-Y", system)
        self.assertIn("Focus question: Compare evidence", user)
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
