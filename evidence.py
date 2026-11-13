"""Versioned, page-local paper evidence and citation verification."""

import hashlib
import json
import re
import time
import unicodedata
from pathlib import Path

from memory import terms


class EvidenceError(ValueError):
    pass


def normalize(text):
    """Normalize extraction and browser text without losing the source quote."""
    value = str(text or "")
    value = value.replace("\u00ad", "").replace("\ufb01", "fi").replace("\ufb02", "fl")
    value = unicodedata.normalize("NFKC", value)
    value = re.sub(r"(?<=\w)-\s+(?=\w)", "", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip().casefold()


def _sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _rects(values):
    result = []
    for rect in values if isinstance(values, list) else []:
        try:
            x, y, width, height = (float(rect[key]) for key in ("x", "y", "width", "height"))
        except (KeyError, TypeError, ValueError):
            continue
        if all(0 <= item <= 1 for item in (x, y, width, height)) and width > 0 and height > 0:
            result.append(dict(x=x, y=y, width=width, height=height))
    return result[:200]


class EvidenceStore:
    def __init__(self, db, lock):
        self.db, self.lock = db, lock
        with lock, db:
            db.executescript("""
                CREATE TABLE IF NOT EXISTS evidence_versions (
                  document TEXT PRIMARY KEY, path TEXT, size INTEGER, mtime INTEGER,
                  sha256 TEXT, page_count INTEGER, indexed INTEGER, readable INTEGER,
                  state TEXT, built REAL);
                CREATE TABLE IF NOT EXISTS evidence_pages (
                  document TEXT, version TEXT, page INTEGER, width REAL, height REAL,
                  text TEXT, blocks TEXT, PRIMARY KEY(document, version, page));
            """)

    def index(self, document, path, max_pages=120, expected_version=None, force=False):
        path = Path(path)
        if not path.is_file():
            raise EvidenceError("未找到本地 PDF 全文文件。")
        stat = path.stat()
        if stat.st_size == 0:
            raise EvidenceError("PDF 文件为空。")
        with self.lock:
            row = self.db.execute("SELECT * FROM evidence_versions WHERE document=?", (str(document),)).fetchone()
            cached = self.db.execute(
                "SELECT COUNT(*) FROM evidence_pages WHERE document=? AND version=?",
                (str(document), row["sha256"] if row else ""),
            ).fetchone()[0] if row else 0
        if not force and row and (not expected_version or row["sha256"] == expected_version) and row["path"] == str(path) and row["size"] == stat.st_size and row["mtime"] == stat.st_mtime_ns and cached == row["indexed"] and row["indexed"] >= min(max(0, int(max_pages)), row["page_count"]):
            return self._summary(row)

        version = expected_version or (row["sha256"] if row and row["sha256"] and row["size"] == stat.st_size and row["mtime"] == stat.st_mtime_ns else _sha256(path))
        with self.lock:
            existing = self.db.execute(
                "SELECT * FROM evidence_versions WHERE document=? AND sha256=?",
                (str(document), version),
            ).fetchone()
            page_rows = self.db.execute("SELECT COUNT(*) FROM evidence_pages WHERE document=? AND version=?", (str(document), version)).fetchone()[0]
        if not force and existing and page_rows == existing["indexed"] and existing["indexed"] >= min(max(0, int(max_pages)), existing["page_count"]):
            with self.lock, self.db:
                self.db.execute(
                    "UPDATE evidence_versions SET path=?,size=?,mtime=?,built=? WHERE document=? AND sha256=?",
                    (str(path), stat.st_size, stat.st_mtime_ns, time.time(), str(document), version),
                )
            return self._summary(existing)

        try:
            import pymupdf as fitz
        except ImportError as exc:
            raise EvidenceError("缺少 PDF 解析组件，请安装 PyMuPDF。") from exc
        try:
            pdf = fitz.open(str(path))
        except Exception as exc:
            raise EvidenceError("PDF 文件损坏或无法解析。") from exc
        try:
            if getattr(pdf, "needs_pass", False):
                raise EvidenceError("PDF 已加密，暂时无法建立可检索页码索引。")
            page_count = len(pdf)
            indexed = min(max(0, int(max_pages)), page_count)
            pages = []
            readable = 0
            for page_number in range(1, indexed + 1):
                page = pdf.load_page(page_number - 1)
                width, height = float(page.rect.width), float(page.rect.height)
                blocks = []
                for raw in page.get_text("blocks", sort=True):
                    if len(raw) < 7 or int(raw[6]) != 0:
                        continue
                    text = re.sub(r"\s+", " ", str(raw[4] or "")).strip()
                    cleaned = normalize(text)
                    if not cleaned:
                        continue
                    x0, y0, x1, y1 = (float(value) for value in raw[:4])
                    rect = dict(x=x0 / width, y=y0 / height, width=(x1 - x0) / width, height=(y1 - y0) / height)
                    blocks.append(dict(text=text, rect=rect))
                if not blocks:
                    text = re.sub(r"\s+", " ", page.get_text("text", sort=True)).strip()
                    if normalize(text):
                        blocks.append(dict(text=text, rect=dict(x=0.04, y=0.04, width=0.92, height=0.92)))
                page_text = "\n".join(block["text"] for block in blocks)
                readable += bool(page_text)
                pages.append((page_number, width, height, page_text, json.dumps(blocks, ensure_ascii=False)))
        except EvidenceError:
            raise
        except Exception as exc:
            raise EvidenceError("PDF 页面无法读取，请检查文件是否完整。") from exc
        finally:
            pdf.close()

        state = "indexed" if readable else "image_only"
        built = time.time()
        with self.lock, self.db:
            self.db.execute(
                "INSERT OR REPLACE INTO evidence_versions VALUES (?,?,?,?,?,?,?,?,?,?)",
                (str(document), str(path), stat.st_size, stat.st_mtime_ns, version, page_count, indexed, readable, state, built),
            )
            self.db.executemany(
                "INSERT OR REPLACE INTO evidence_pages VALUES (?,?,?,?,?,?,?)",
                [(str(document), version, *page) for page in pages],
            )
        return dict(document=str(document), version=version, page_count=page_count, indexed=indexed,
                    readable=readable, state=state, cached=False)

    @staticmethod
    def _summary(row):
        return dict(document=row["document"], version=row["sha256"], page_count=row["page_count"],
                    indexed=row["indexed"], readable=row["readable"], state=row["state"], cached=True)

    def _pages(self, index):
        with self.lock:
            rows = self.db.execute(
                "SELECT page,width,height,text,blocks FROM evidence_pages WHERE document=? AND version=? ORDER BY page",
                (index["document"], index["version"]),
            ).fetchall()
        return [dict(page=row["page"], width=row["width"], height=row["height"],
                     text=row["text"], blocks=json.loads(row["blocks"])) for row in rows]

    def pages(self, index):
        return self._pages(index)

    @staticmethod
    def _segment(selection):
        if not isinstance(selection, dict):
            return []
        segments = selection.get("segments")
        if isinstance(segments, list):
            return [item for item in segments if isinstance(item, dict)]
        if selection.get("text"):
            return [dict(page=selection.get("page", 1), text=selection.get("text"), rects=selection.get("rects", []))]
        return []

    def validate_selection(self, pages, selection):
        by_page = {row["page"]: row for row in pages}
        accepted, rejected = [], []
        for item in self._segment(selection)[:12]:
            try:
                page_number = int(item.get("page", 0))
            except (TypeError, ValueError):
                page_number = 0
            quote = str(item.get("text") or "").strip()
            if page_number not in by_page or not quote:
                rejected.append(dict(page=page_number, text=quote, state="out_of_range" if quote else "empty"))
                continue
            normalized = normalize(quote)
            page_text = normalize(by_page[page_number]["text"])
            if len(normalized) < 3:
                rejected.append(dict(page=page_number, text=quote, state="too_short"))
                continue
            if normalized not in page_text:
                rejected.append(dict(page=page_number, text=quote, state="unverified"))
                continue
            rects = _rects(item.get("rects"))
            if not rects:
                rects = [block["rect"] for block in by_page[page_number]["blocks"]
                         if normalized in normalize(block["text"]) or normalize(block["text"]) in normalized][:40]
            accepted.append(dict(page=page_number, text=quote, rects=rects))
        status = "located" if accepted and not rejected else (
            "partial" if accepted else (
                "not_provided" if selection is None else ("empty" if not rejected else rejected[0]["state"])))
        return dict(status=status, segments=accepted, rejected=rejected)

    def retrieve(self, index, question="", selection=None, limit=8):
        pages = self._pages(index)
        selection_result = self.validate_selection(pages, selection)
        query = normalize(question)
        query_terms = set(terms(question))
        selected_pages = {item["page"] for item in selection_result["segments"]}
        evidence = []
        for item in selection_result["segments"]:
            evidence.append(dict(page=item["page"], quote=item["text"], text=item["text"],
                                 rects=item["rects"], score=1000, kind="selection"))

        ranked = []
        for page in pages:
            page_text = normalize(page["text"])
            for block_index, block in enumerate(page["blocks"]):
                text = normalize(block["text"])
                words = set(terms(block["text"]))
                overlap = len(query_terms & words)
                score = overlap / max(1, len(query_terms)) ** 0.5
                if query and len(query) >= 4 and query in text:
                    score += 2
                if page["page"] in selected_pages:
                    score += 0.35
                if not query_terms and not query:
                    score = 1 / (page["page"] + block_index / 100)
                if score:
                    ranked.append((score, page["page"], block_index, block, text, page_text))
        ranked.sort(key=lambda item: (-item[0], item[1], item[2]))

        page_counts = {}
        chosen_keys = set()
        for score, page_number, block_index, block, text, page_text in ranked:
            if len(evidence) >= max(1, min(12, int(limit))):
                break
            if page_counts.get(page_number, 0) >= 2:
                continue
            if any(item["page"] == page_number and (text in normalize(item["quote"]) or normalize(item["quote"]) in text) for item in evidence):
                continue
            chosen_keys.add((page_number, block_index))
            page_counts[page_number] = page_counts.get(page_number, 0) + 1
            evidence.append(dict(page=page_number, quote=block["text"][:1800], text=block["text"][:1800],
                                 rects=[block["rect"]], score=round(float(score), 4), kind="page_block"))

        if not evidence:
            for page in pages:
                for block in page["blocks"][:2]:
                    evidence.append(dict(page=page["page"], quote=block["text"][:1800], text=block["text"][:1800],
                                         rects=[block["rect"]], score=0, kind="page_block"))
                    if len(evidence) >= min(4, max(1, int(limit))):
                        break
                if len(evidence) >= min(4, max(1, int(limit))):
                    break

        evidence.sort(key=lambda item: (item["page"], 0 if item["kind"] == "selection" else 1, -item["score"]))
        for number, item in enumerate(evidence, 1):
            item["id"] = f"E{number}"
            item["state"] = "located_quote" if item.get("quote") else "page_only"
        return dict(evidence=evidence, selection=selection_result)

    def validate_quote(self, index, page, quote):
        page_number = int(page or 0)
        found = next((row for row in self._pages(index) if row["page"] == page_number), None)
        text = str(quote or "").strip()
        if not found or not text:
            return dict(state="out_of_range", page=page_number, quote=text, rects=[])
        normalized = normalize(text)
        if len(normalized) < 3:
            return dict(state="too_short", page=page_number, quote=text, rects=[])
        if normalized not in normalize(found["text"]):
            return dict(state="unverified", page=page_number, quote=text, rects=[])
        rects = [block["rect"] for block in found["blocks"]
                 if normalized in normalize(block["text"]) or normalize(block["text"]) in normalized][:40]
        return dict(state="located_quote", page=page_number, quote=text, rects=rects)

    @staticmethod
    def format(evidence):
        return "\n\n".join(
            f"[{item['id']}] [Page {item['page']}]\n{item['text']}" if item.get("page") else
            f"[{item['id']}] [Abstract]\n{item['text']}"
            for item in evidence
        )

    @staticmethod
    def verify_citations(answer, evidence, index=None):
        by_id = {item["id"]: item for item in evidence}
        by_page = {}
        for item in evidence:
            by_page.setdefault(item["page"], item)
        seen, citations = set(), []
        for match in re.finditer(r"\[(E\d+)\]", answer or "", re.I):
            identifier = match.group(1).upper()
            if identifier in seen:
                continue
            seen.add(identifier)
            item = by_id.get(identifier)
            citations.append(dict(id=identifier, page=item["page"] if item else None,
                                  state=item["state"] if item else "unsupported"))
        for match in re.finditer(r"\[(?:Page|P\.)\s*(\d+)\]", answer or "", re.I):
            page = int(match.group(1))
            key = f"page:{page}"
            if key in seen:
                continue
            seen.add(key)
            citations.append(dict(id=f"Page {page}", page=page,
                                  state="page_only" if page in by_page else "unsupported"))
        unsupported = [item for item in citations if item["state"] == "unsupported"]
        coverage = dict(
            citation_count=len(citations),
            located=len(citations) - len(unsupported),
            unsupported=len(unsupported),
            evidence_pages=len({item["page"] for item in evidence}),
            indexed_pages=(index or {}).get("indexed", 0),
            page_count=(index or {}).get("page_count", 0),
        )
        return citations, coverage
