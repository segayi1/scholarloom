import json
import tempfile
import threading
import unittest
import urllib.error
import urllib.parse
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

import server
from project_synthesis import normalize_synthesis


class ProjectSynthesisTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.data = Path(self.temp.name) / "data"
        self.app = server.Workbench(self.data)
        self.addCleanup(self.app.db.close)
        self.app.save_document({"key": "PAPER1", "title": "First paper", "findings": ["Finding"]})
        self.app.save_document({"key": "PAPER2", "title": "Second paper", "findings": ["Finding"]})

    def generate(self, keys, focus=""):
        with patch.object(self.app, "call_model", return_value=f"Draft for {keys[0]}"):
            return self.app.compare_synthesis(keys, focus, "project-a")

    def test_synthesis_normalizes_unsupported_assay_and_negative_scope(self):
        sources = [{"id": "P1", "passages": [{"quote": "The reporter assay measured Wnt activity."}]},
                   {"id": "P2", "passages": [{"quote": "The injury response was enriched for cytokine genes."}]}]
        markdown = ("Method: TOPFlash 类 Wnt 报告。\n"
                    "**P2 未检测 Wnt 通路。**\n"
                    "P2 不使用任何 Wnt 配体、抑制剂或激活剂。\n"
                    "P2 未测量增殖本身。\n"
                    "P1 未在损伤模型中检验 Wnt 激活剂。\n"
                    "结果均显示炎症通路显著激活。")
        result = normalize_synthesis(markdown, sources, "zh")
        self.assertNotIn("TOPFlash", result)
        self.assertIn("Wnt 报告基因检测", result)
        self.assertIn("所给材料未见 P2 检测 Wnt 通路", result)
        self.assertIn("所给引文未提供 P2 的直接增殖测量", result)
        self.assertIn("所给材料未见 P1 在损伤模型中检验", result)
        self.assertIn("所给材料中 P2 未涉及 Wnt 配体", result)
        self.assertIn("相关功能类别富集", result)
        supported = [{"id": "P1", "passages": [{"quote": "TOPFlash measured Wnt activity."}]}]
        self.assertIn("TOPFlash", normalize_synthesis("TOPFlash assay", supported, "en"))

    def test_project_isolation_and_no_project_semantics(self):
        self.generate(["PAPER1", "PAPER2"])
        self.assertIsNone(self.app.project_synthesis.get("project-b"))
        with patch.object(self.app, "call_model", return_value="No project"):
            self.app.compare_synthesis(["PAPER1", "PAPER2"])
        self.assertIsNone(self.app.project_synthesis.get("default"))

    def test_regeneration_preserves_revision_source_mapping_until_adopted(self):
        self.generate(["PAPER1", "PAPER2"], "first focus")
        original = self.app.project_synthesis.get("project-a")["generated"]
        self.app.project_synthesis.edit("project-a", "Human text cites [P1]")
        self.generate(["PAPER2", "PAPER1"], "second focus")
        draft = self.app.project_synthesis.get("project-a")
        self.assertEqual(draft["generated"]["keys"], ["PAPER2", "PAPER1"])
        self.assertEqual(draft["revision"]["markdown"], "Human text cites [P1]")
        self.assertEqual(draft["revision"]["keys"], original["keys"])
        self.assertEqual(draft["revision"]["sources"][0], original["sources"][0])
        self.assertEqual(draft["revision"]["sources"][0]["key"], "PAPER1")
        self.app.project_synthesis.edit("project-a", "Adopted [P1]", use_generated=True)
        self.assertEqual(self.app.project_synthesis.get("project-a")["revision"]["keys"], ["PAPER2", "PAPER1"])

    def test_failed_generation_keeps_saved_draft(self):
        self.generate(["PAPER1", "PAPER2"])
        previous = self.app.project_synthesis.get("project-a")
        with patch.object(self.app, "call_model", side_effect=ValueError("offline")):
            with self.assertRaisesRegex(ValueError, "offline"):
                self.app.compare_synthesis(["PAPER2", "PAPER1"], project="project-a")
        self.assertEqual(self.app.project_synthesis.get("project-a"), previous)
        with patch.object(self.app, "call_model", return_value="  "):
            with self.assertRaisesRegex(ValueError, "未返回"):
                self.app.compare_synthesis(["PAPER2", "PAPER1"], project="project-a")
        self.assertEqual(self.app.project_synthesis.get("project-a"), previous)

    def test_edit_started_before_regeneration_keeps_original_citation_mapping(self):
        self.generate(["PAPER1", "PAPER2"])
        base = self.app.project_synthesis.get("project-a")["generated"]
        self.generate(["PAPER2", "PAPER1"])
        self.app.project_synthesis.edit("project-a", "Working [P1]", base=base)
        self.assertEqual(self.app.project_synthesis.get("project-a")["revision"]["sources"][0]["key"], "PAPER1")

    def test_draft_survives_workbench_restart(self):
        self.generate(["PAPER1", "PAPER2"])
        self.app.project_synthesis.edit("project-a", "Saved revision")
        self.app.db.close()
        self.app = server.Workbench(self.data)
        self.addCleanup(self.app.db.close)
        self.assertEqual(self.app.project_synthesis.get("project-a")["revision"]["markdown"], "Saved revision")

    def test_http_contract_and_csrf(self):
        httpd = ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
        httpd.app = self.app
        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()
        def stop_http():
            httpd.shutdown()
            thread.join(3)
            httpd.server_close()
        self.addCleanup(stop_http)
        base = f"http://127.0.0.1:{httpd.server_port}"
        url = base + "/api/project-synthesis?" + urllib.parse.urlencode({"project": "project-a"})
        with urllib.request.urlopen(url, timeout=3) as response:
            self.assertEqual(json.load(response), {"ok": True, "draft": None})
        body = json.dumps({"action": "edit", "project": "project-a", "revision": "Human draft"}).encode()
        request = urllib.request.Request(base + "/api/project-synthesis", data=body,
                                         headers={"Content-Type": "application/json"}, method="POST")
        with self.assertRaises(urllib.error.HTTPError) as caught:
            urllib.request.urlopen(request, timeout=3)
        self.assertEqual(caught.exception.code, 403)
        request = urllib.request.Request(base + "/api/project-synthesis", data=body,
            headers={"Content-Type": "application/json", "Origin": base,
                     "X-Workbench-Token": self.app.csrf}, method="POST")
        with urllib.request.urlopen(request, timeout=3) as response:
            draft = json.load(response)["draft"]
        self.assertEqual(draft["project"], "project-a")
        self.assertEqual(draft["revision"], {"markdown": "Human draft", "sources": [], "keys": [], "focus": ""})

    def test_snapshot_validation_rejects_mismatched_source_ids(self):
        with self.assertRaisesRegex(ValueError, "mapping"):
            self.app.project_synthesis.save_generated("project-a", {
                "markdown": "Draft", "sources": [{"id": "P1", "key": "PAPER2", "title": "Second"}],
                "keys": ["PAPER1"], "focus": "",
            })

    def test_passage_snapshot_preserves_provenance_and_rejects_wrong_id(self):
        passage={'id':'P1E1','page':2,'quote':'Measured outcome','version':'pdf-version'}
        snapshot={'markdown':'Result [P1E1]','sources':[{'id':'P1','key':'PAPER1','title':'Paper',
                  'basis':'full_text','passages':[passage]}],'keys':['PAPER1'],'focus':'outcome'}
        stored=self.app.project_synthesis.save_generated('project-a',snapshot)
        self.assertEqual(stored['generated']['sources'][0]['passages'],[passage])
        snapshot['sources'][0]['passages'][0]['id']='P2E1'
        with self.assertRaisesRegex(ValueError,'passage'):
            self.app.project_synthesis.save_generated('project-a',snapshot)

    def test_snapshot_preserves_multiple_passages_for_one_paper(self):
        passages = [dict(id=f'P1E{i}', page=i, quote=f'Result {i}', version='pdf-version') for i in range(1, 13)]
        snapshot = {'markdown': 'Result [P1E12]', 'sources': [{'id': 'P1', 'key': 'PAPER1',
                    'title': 'Paper', 'basis': 'full_text', 'passages': passages}], 'keys': ['PAPER1'], 'focus': ''}
        stored = self.app.project_synthesis.save_generated('project-a', snapshot)
        self.assertEqual(stored['generated']['sources'][0]['passages'], passages)
        snapshot['sources'][0]['passages'].append(dict(id='P1E13', page=13, quote='Extra', version='pdf-version'))
        with self.assertRaisesRegex(ValueError, 'passages'):
            self.app.project_synthesis.save_generated('project-b', snapshot)


if __name__ == "__main__":
    unittest.main()
