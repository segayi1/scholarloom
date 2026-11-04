import hashlib
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

import server


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
            if os.name == "nt":
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


if __name__ == "__main__":
    unittest.main()
