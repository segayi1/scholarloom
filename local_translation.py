"""Zero-token English to Simplified Chinese translation with an offline fallback."""

import json
import re
import shutil
import sys
import tempfile
import threading
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path


MODEL_URL = "https://data.argosopentech.com/argospm/v1/translate-en_zh-1_9.argosmodel"
MODEL_DIR = "translate-en_zh-1_9"
MODEL_DOWNLOAD_BYTES = 70_743_021
MODEL_UNPACKED_BYTES = 85_640_765
MAX_TEXT_LENGTH = 12000
MAX_DOWNLOAD_BYTES = 100_000_000
MAX_MODEL_BYTES = 200_000_000
TARGET_PREFIX = ">>cmn_Hans<<"
ONLINE_URL = "https://translate.googleapis.com/translate_a/single"
ONLINE_CHUNK = 4000


class LocalTranslator:
    def __init__(self, data_dir, online=True):
        self.data_dir = Path(data_dir)
        self.package_dir = self.data_dir / "packages" / MODEL_DIR
        self.archive = self.data_dir / "translate-en_zh-1_9.argosmodel"
        self.deps_dir = self.data_dir.parent / "translator-deps"
        self.online = online
        self.lock = threading.Lock()
        self._engine = None

    @staticmethod
    def _directory_bytes(path):
        return sum(item.stat().st_size for item in path.rglob("*") if item.is_file()) if path.is_dir() else 0

    def status(self):
        installed = (
            (self.package_dir / "model" / "model.bin").is_file()
            and (self.package_dir / "sentencepiece.model").is_file()
        )
        archive_bytes = self.archive.stat().st_size if self.archive.is_file() else 0
        package_bytes = self._directory_bytes(self.package_dir)
        download_bytes = archive_bytes or MODEL_DOWNLOAD_BYTES
        disk_bytes = archive_bytes + package_bytes
        return {
            "installed": installed,
            "downloadBytes": download_bytes,
            "diskBytes": disk_bytes,
            "expectedDiskBytes": max(disk_bytes, download_bytes + MODEL_UNPACKED_BYTES),
        }

    def install_offline(self):
        with self.lock:
            if not self.status()["installed"]:
                self._install_model()
            return self.status()

    def _install_model(self):
        self.data_dir.mkdir(parents=True, exist_ok=True)
        if not self.archive.is_file():
            temporary = self.archive.with_suffix(".argosmodel.part")
            try:
                request = urllib.request.Request(MODEL_URL, headers={"User-Agent": "ScholarLoom/1.0"})
                with urllib.request.urlopen(request, timeout=30) as response, temporary.open("wb") as output:
                    total = 0
                    while chunk := response.read(1024 * 1024):
                        total += len(chunk)
                        if total > MAX_DOWNLOAD_BYTES:
                            raise ValueError("翻译模型下载文件超过大小限制。")
                        output.write(chunk)
                temporary.replace(self.archive)
            except Exception:
                temporary.unlink(missing_ok=True)
                raise

        with tempfile.TemporaryDirectory(prefix="argos-", dir=self.data_dir) as temporary_dir:
            stage = Path(temporary_dir)
            total = 0
            with zipfile.ZipFile(self.archive) as package:
                for member in package.infolist():
                    target = (stage / member.filename).resolve()
                    if not target.is_relative_to(stage.resolve()):
                        raise ValueError("翻译模型文件结构无效。")
                    total += member.file_size
                    if total > MAX_MODEL_BYTES:
                        raise ValueError("翻译模型解压后超过大小限制。")
                    if not member.is_dir():
                        target.parent.mkdir(parents=True, exist_ok=True)
                        with package.open(member) as source, target.open("wb") as output:
                            while chunk := source.read(1024 * 1024):
                                output.write(chunk)
            model_root = stage / MODEL_DIR
            metadata = json.loads((model_root / "metadata.json").read_text(encoding="utf-8"))
            if metadata.get("from_code") != "en" or metadata.get("to_code") != "zh":
                raise ValueError("下载的翻译模型语言不匹配。")
            if not (model_root / "model" / "model.bin").is_file() or not (model_root / "sentencepiece.model").is_file():
                raise ValueError("翻译模型文件不完整。")
            self.package_dir.parent.mkdir(parents=True, exist_ok=True)
            staged_package = self.package_dir.with_name(self.package_dir.name + ".new")
            if staged_package.exists():
                shutil.rmtree(staged_package)
            staged_package.mkdir()
            for item in model_root.iterdir():
                target = staged_package / item.name
                if item.is_dir():
                    shutil.copytree(item, target)
                else:
                    shutil.copy2(item, target)
            staged_package.replace(self.package_dir)

    def _load(self):
        if self._engine:
            return self._engine
        if self.deps_dir.is_dir() and str(self.deps_dir) not in sys.path:
            sys.path.insert(0, str(self.deps_dir))
        try:
            import ctranslate2
            import sentencepiece
        except ImportError as exc:
            raise RuntimeError("本地翻译依赖未安装；请安装 requirements.txt 后重试。") from exc
        if not self.package_dir.is_dir():
            self._install_model()
        tokenizer = sentencepiece.SentencePieceProcessor(model_file=str(self.package_dir / "sentencepiece.model"))
        translator = ctranslate2.Translator(str(self.package_dir / "model"), device="cpu")
        self._engine = tokenizer, translator
        return self._engine

    @staticmethod
    def _sentences(text):
        # Keep common abbreviations and decimal points inside the sentence.
        protected = re.sub(r"\b(?:Mr|Mrs|Ms|Dr|Prof|Fig|e\.g|i\.e)\.", lambda m: m.group().replace(".", "\u2024"), text)
        parts = re.split(r"(?<=[.!?。！？])\s+", protected)
        return [part.replace("\u2024", ".") for part in parts if part.strip()]

    def translate_record(self, text):
        if not isinstance(text, str) or not text.strip():
            raise ValueError("请输入要翻译的文本。")
        if len(text) > MAX_TEXT_LENGTH:
            raise ValueError(f"单次翻译最多支持 {MAX_TEXT_LENGTH} 个字符。")
        if self.online:
            try:
                return {"translation": self._translate_online(text.strip()), "engine": "online"}
            except Exception:
                pass
        with self.lock:
            tokenizer, translator = self._load()
            sentences = self._sentences(text.strip())
            tokenized = [tokenizer.encode(sentence, out_type=str) for sentence in sentences]
            batches = translator.translate_batch(
                tokenized,
                target_prefix=[[TARGET_PREFIX]] * len(tokenized),
                replace_unknowns=True,
                beam_size=4,
                length_penalty=0.2,
            )
            translated = []
            for batch in batches:
                value = tokenizer.decode(batch.hypotheses[0])
                if value.startswith(TARGET_PREFIX):
                    value = value[len(TARGET_PREFIX):].lstrip()
                translated.append(value)
            return {"translation": " ".join(translated), "engine": "local"}

    def translate(self, text):
        return self.translate_record(text)["translation"]

    @staticmethod
    def _chunks(text, limit=ONLINE_CHUNK):
        parts = []
        remaining = text
        while len(remaining) > limit:
            cut = max(remaining.rfind(". ", 0, limit), remaining.rfind("? ", 0, limit),
                      remaining.rfind("! ", 0, limit), remaining.rfind("\n", 0, limit))
            cut = cut + 1 if cut >= limit // 2 else limit
            parts.append(remaining[:cut].strip())
            remaining = remaining[cut:].strip()
        if remaining:
            parts.append(remaining)
        return parts

    @classmethod
    def _translate_online(cls, text):
        translated = []
        for chunk in cls._chunks(text):
            query = urllib.parse.urlencode({
                "client": "gtx", "sl": "en", "tl": "zh-CN", "dt": "t", "q": chunk,
            })
            request = urllib.request.Request(
                f"{ONLINE_URL}?{query}", headers={"User-Agent": "ScholarLoom/1.0"}
            )
            with urllib.request.urlopen(request, timeout=20) as response:
                payload = json.loads(response.read().decode("utf-8"))
            value = "".join(item[0] for item in payload[0] if item and item[0])
            if not value.strip():
                raise ValueError("在线翻译返回空结果。")
            translated.append(value.strip())
        return "\n".join(translated)
