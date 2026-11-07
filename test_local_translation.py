import json
import io
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
import zipfile
from http.server import ThreadingHTTPServer
from types import SimpleNamespace
from unittest.mock import patch

import server
from local_translation import LocalTranslator, MODEL_DOWNLOAD_BYTES


class LocalTranslationTests(unittest.TestCase):
    def test_sentence_split_keeps_punctuation_and_common_abbreviations(self):
        self.assertEqual(LocalTranslator._sentences("Dr. Lee tested it. It worked!"), ["Dr. Lee tested it.", "It worked!"])

    def test_translate_uses_local_model_and_removes_target_prefix(self):
        class Tokenizer:
            def encode(self, text, out_type=str):
                return [text]

            def decode(self, tokens):
                return ">>cmn_Hans<<译文"

        class Translator:
            def translate_batch(self, tokens, **kwargs):
                self.call = (tokens, kwargs)
                return [SimpleNamespace(hypotheses=[["translated"]]) for _ in tokens]

        with tempfile.TemporaryDirectory() as tmp:
            engine = LocalTranslator(tmp, online=False)
            engine._engine = Tokenizer(), Translator()
            self.assertEqual(engine.translate("First. Second!"), "译文 译文")
            self.assertEqual(engine.translate_record("First."),
                             {"translation": "译文", "engine": "local"})

    def test_online_translation_returns_joined_segments(self):
        class Response:
            def __init__(self, payload):
                self.payload = io.BytesIO(json.dumps(payload, ensure_ascii=False).encode())

            def __enter__(self):
                return self

            def __exit__(self, *_):
                return False

            def read(self):
                return self.payload.read()

        with tempfile.TemporaryDirectory() as tmp:
            engine = LocalTranslator(tmp)
            payload = [[["中文一", "One"]], None, "en"]
            with patch("local_translation.urllib.request.urlopen", return_value=Response(payload)) as open_url:
                self.assertEqual(engine.translate("One."), "中文一")
            self.assertEqual(open_url.call_count, 1)

    def test_http_translate_contract_validation_and_csrf(self):
        class FakeTranslator:
            def translate_record(self, text):
                return {"translation": "译文", "engine": "online"}
            def status(self):
                return {"installed": False, "downloadBytes": MODEL_DOWNLOAD_BYTES,
                        "diskBytes": 0, "expectedDiskBytes": MODEL_DOWNLOAD_BYTES + 1}
            def install_offline(self):
                return {"installed": True, "downloadBytes": MODEL_DOWNLOAD_BYTES,
                        "diskBytes": MODEL_DOWNLOAD_BYTES + 1, "expectedDiskBytes": MODEL_DOWNLOAD_BYTES + 1}

        app = SimpleNamespace(csrf="test-token", local_translator=FakeTranslator(), safe_error=str)
        httpd = ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
        httpd.app = app
        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(httpd.server_close)
        self.addCleanup(httpd.shutdown)
        self.addCleanup(thread.join, 2)
        url = f"http://127.0.0.1:{httpd.server_port}/api/translate"
        headers = {"Content-Type": "application/json", "X-Workbench-Token": app.csrf}

        with urllib.request.urlopen(f"http://127.0.0.1:{httpd.server_port}/api/translator", timeout=3) as response:
            self.assertFalse(json.loads(response.read())["offline"]["installed"])
        request = urllib.request.Request(f"http://127.0.0.1:{httpd.server_port}/api/translator/offline",
                                         data=b"{}", headers=headers, method="POST")
        with urllib.request.urlopen(request, timeout=3) as response:
            self.assertTrue(json.loads(response.read())["offline"]["installed"])

        request = urllib.request.Request(url, data=b'{"text":"hello"}', headers=headers, method="POST")
        with urllib.request.urlopen(request, timeout=3) as response:
            self.assertEqual(json.loads(response.read()), {"translation": "译文", "engine": "online"})

        for body in (b'{"text":" "}', b'{"text":7}'):
            request = urllib.request.Request(url, data=body, headers=headers, method="POST")
            with self.assertRaises(urllib.error.HTTPError) as caught:
                urllib.request.urlopen(request, timeout=3)
            self.assertEqual(caught.exception.code, 400)

        request = urllib.request.Request(url, data=b'{"text":"hello"}',
                                         headers={"Content-Type": "application/json"}, method="POST")
        with self.assertRaises(urllib.error.HTTPError) as caught:
            urllib.request.urlopen(request, timeout=3)
        self.assertEqual(caught.exception.code, 403)

    def test_text_limit_rejected_before_model_load(self):
        with tempfile.TemporaryDirectory() as tmp:
            engine = LocalTranslator(tmp, online=False)
            with self.assertRaisesRegex(ValueError, "最多支持"):
                engine.translate("x" * 12001)
            self.assertIsNone(engine._engine)

    def test_first_download_failure_is_retryable_and_installs_atomically(self):
        archive = io.BytesIO()
        with zipfile.ZipFile(archive, "w") as package:
            package.writestr("translate-en_zh-1_9/metadata.json",
                             json.dumps({"from_code": "en", "to_code": "zh"}))
            package.writestr("translate-en_zh-1_9/model/model.bin", b"model")
            package.writestr("translate-en_zh-1_9/sentencepiece.model", b"tokenizer")

        class Response:
            def __init__(self):
                self.content = io.BytesIO(archive.getvalue())

            def __enter__(self):
                return self

            def __exit__(self, *_):
                return False

            def read(self, size):
                return self.content.read(size)

        with tempfile.TemporaryDirectory() as tmp:
            engine = LocalTranslator(tmp, online=False)
            initial = engine.status()
            self.assertFalse(initial["installed"])
            self.assertEqual(initial["downloadBytes"], MODEL_DOWNLOAD_BYTES)
            with patch("local_translation.urllib.request.urlopen", side_effect=[
                    OSError("offline"), Response()]) as open_url:
                with self.assertRaisesRegex(OSError, "offline"):
                    engine._install_model()
                self.assertFalse(engine.archive.exists())
                self.assertFalse(engine.archive.with_suffix(".argosmodel.part").exists())
                engine._install_model()
            self.assertEqual(open_url.call_count, 2)
            self.assertTrue((engine.package_dir / "model/model.bin").is_file())
            self.assertTrue(engine.archive.is_file())
            installed = engine.install_offline()
            self.assertTrue(installed["installed"])
            self.assertGreater(installed["diskBytes"], 0)


if __name__ == "__main__":
    unittest.main()
