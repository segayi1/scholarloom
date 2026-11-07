"""Conservative local document inspection for the literature workbench."""

from __future__ import annotations

import hashlib
import html
import json
import re
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from difflib import SequenceMatcher
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from xml.etree import ElementTree

try:
    import pymupdf as fitz
except ImportError:  # pragma: no cover - deployment environment supplies PyMuPDF
    fitz = None

USER_AGENT = "ScholarLoom/2.0.0"
OPENALEX_USER_AGENT = f"{USER_AGENT} (mailto:scholarloom@openalex-client.org)"


CATEGORIES = (
    "抗体结构、表位与免疫机制",
    "疫苗、病毒与感染",
    "细胞生物学与药物机制",
    "植物生物技术与天然产物",
    "神经科学与行为",
    "研究方法与工具",
    "组学、遗传与进化",
    "生态、微生物与环境",
    "抗体发现与表达",
    "合成受体与细胞治疗",
    "专利技术",
)
MAX_TEXT = 18_000
INSPECTION_VERSION = 6
MAX_EPUB_TOTAL = 100 * 1024 * 1024
MAX_EPUB_ENTRY = 20 * 1024 * 1024
MAX_EPUB_RATIO = 100
DOI_RE = re.compile(r"\b10\.\d{4,9}/[-._;()/:A-Z0-9]+", re.I)
ARXIV_ID_RE = re.compile(
    r"(?i)\barxiv(?:\.org/(?:abs|pdf)/|[\s:：_-]+)"
    r"([a-z][a-z.-]*(?:\.[a-z]{2})?/\d{7}|\d{4}\.\d{4,5})(v\d+)?"
)
PATENT_NO_RE = re.compile(
    r"\b(?:CN\s*\d{7,}(?:\s*[A-Z]\d?)?|US\s*\d{7,}(?:\s*[A-Z]\d?)?|"
    r"WO\s*\d{4}/?\d{5,}(?:\s*[A-Z]\d?)?|EP\s*\d{7,}(?:\s*[A-Z]\d?)?|"
    r"JP\s*\d{7,}(?:\s*[A-Z]\d?)?|KR\s*\d{7,}(?:\s*[A-Z]\d?)?)\b", re.I
)
_GREEK_TRANSLATION = str.maketrans({
    "α": "a", "β": "b", "γ": "g", "δ": "d", "ε": "e", "ζ": "z", "η": "e",
    "θ": "th", "ι": "i", "κ": "k", "λ": "l", "μ": "m", "ν": "n", "ξ": "x",
    "ο": "o", "π": "p", "ρ": "r", "σ": "s", "τ": "t", "υ": "u", "φ": "f",
    "χ": "x", "ψ": "ps", "ω": "o",
})
_TITLE_LABEL_RE = re.compile(
    r"(?i)^(?:research\s+article|review\s+article|original\s+article|technical\s+note|"
    r"research\s+paper|article\s+recommendations?|article|review|letter|report|"
    r"brief\s+communication)\s*[:|\-–—]?\s*"
)
_TITLE_NOISE_RE = re.compile(
    r"(?i)^(?:doi\b|https?://|www\.|received\b|accepted\b|published\b|revised\b|"
    r"available\s+online\b|copyright\b|©|creative\s+commons\b|check\s+for\s+updates|"
    r"cite\s+this\b|read\s+online\b|metrics\b|access\b|"
    r"(?:page\s*)?\d{1,4}(?:\s*(?:/|of)\s*\d{1,4})?$|"
    r"(?:nature|science|cell)(?:\s+\w+)?\s*\|.*\bvol(?:ume)?\.?\s*\d+\b|"
    r"volume\s+\d+\b|vol(?:ume)?\.?\s+\d+\b)"
)
_TITLE_STOP_RE = re.compile(
    r"(?i)^(?:abstract\b|summary\b|introduction\b|background\b|摘要\b|关键词\b|"
    r"引言\b|前言\b|contents?\b|outline\b)"
)
_CATEGORY_TERMS = {
    "抗体结构、表位与免疫机制": "antibody monoclonal immunoglobulin epitope paratope antigen-antibody immune receptor tcr bcr 抗体 单克隆 表位 免疫球蛋白 免疫机制 抗原抗体",
    "疫苗、病毒与感染": "vaccine vaccination virus viral infection pathogen coronavirus influenza hepatitis 疫苗 病毒 感染 病原体",
    "细胞生物学与药物机制": "cellular cell biology drug mechanism pharmacology target apoptosis ferroptosis receptor signaling 细胞 药物 作用机制 信号通路 靶向",
    "植物生物技术与天然产物": "plant botanical natural product phytochemistry biosynthesis crop 植物 天然产物 生物合成",
    "神经科学与行为": "neuroscience neural neuron brain behavior behaviour cognition memory 神经 神经元 脑 行为 认知",
    "组学、遗传与进化": "genomics transcriptomics genome genetics gene evolution phylogeny single-cell multiomics 组学 遗传 基因组 进化 单细胞",
    "生态、微生物与环境": "microbiome microbiota microbial ecology environment bacteria fungi environmental 微生物 菌群 生态 环境",
    "抗体发现与表达": "antibody discovery antibody engineering expression antibody production phage display hybridoma b-cell repertoire 抗体发现 抗体表达 噬菌体展示",
    "合成受体与细胞治疗": "CAR-T chimeric antigen receptor synthetic receptor cell therapy adoptive cellular immunotherapy 嵌合抗原受体 细胞治疗 细胞疗法",
    "研究方法与工具": "method protocol assay platform tool software pipeline 方法 工具 技术",
}


def _base_result(path: Path, digest: str, text: str = "") -> dict[str, Any]:
    return {
        "status": "review", "reason": "文件内容尚不能可靠确认文献类型，需人工核对。",
        "inspectorVersion": INSPECTION_VERSION,
        "sha256": digest, "text": text[:MAX_TEXT],
        "metadata": {"itemType": "journalArticle", "title": "", "DOI": "", "creators": [],
                     "date": "", "publicationTitle": "", "abstractNote": "", "patentNumber": ""},
        "category": "研究方法与工具", "keywords": [], "sourceURL": "", "basis": "本地文件文本；待核对",
    }


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _strip_markup(value: str) -> str:
    value = re.sub(r"(?is)<(script|style|svg|head)\b[^>]*>.*?</\1\s*>", " ", value)
    value = re.sub(r"(?s)<[^>]+>", " ", value)
    value = html.unescape(value)
    return re.sub(r"\s+", " ", value).strip()


class _TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.skip = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() in {"script", "style", "svg", "head"}:
            self.skip += 1
        elif not self.skip and tag.lower() in {"p", "div", "br", "h1", "h2", "h3", "li"}:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() in {"script", "style", "svg", "head"} and self.skip:
            self.skip -= 1
        elif not self.skip and tag.lower() in {"p", "div", "br", "h1", "h2", "h3", "li"}:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if not self.skip:
            self.parts.append(data)


def _html_text(raw: bytes) -> str:
    parser = _TextExtractor()
    parser.feed(raw.decode("utf-8", errors="replace"))
    return re.sub(r"[ \t\r\f]+", " ", "".join(parser.parts)).strip()


def _pdf_text(path: Path) -> tuple[str, str]:
    if fitz is None:
        raise RuntimeError("未安装 PyMuPDF，无法读取 PDF")
    doc = fitz.open(path)
    try:
        if not doc.page_count:
            return "", ""
        indices = list(range(min(3, doc.page_count)))
        if doc.page_count > 3:
            indices.append(doc.page_count - 1)
        chunks = [doc.load_page(i).get_text("text") for i in indices]
        return "\n".join(chunks)[:MAX_TEXT], chunks[0] if chunks else ""
    finally:
        doc.close()


def _pdf_metadata(path: Path) -> dict[str, str]:
    """Read descriptive PDF metadata without making it required for inspection."""
    if fitz is None:
        return {}
    try:
        doc = fitz.open(path)
    except Exception:
        return {}
    try:
        raw = doc.metadata or {}
        return {
            key: re.sub(r"\s+", " ", str(raw.get(key) or "")).strip()
            for key in ("title", "author", "subject", "keywords", "creator")
        }
    except Exception:
        return {}
    finally:
        doc.close()


def _safe_epub_text(path: Path) -> tuple[str, str, str]:
    with zipfile.ZipFile(path) as archive:
        infos = archive.infolist()
        if len(infos) > 10_000 or sum(i.file_size for i in infos) > MAX_EPUB_TOTAL:
            raise ValueError("EPUB 解压目录超过安全限制")
        for info in infos:
            if info.file_size > MAX_EPUB_ENTRY or (info.compress_size == 0 and info.file_size > 0) or (
                info.compress_size and info.file_size / info.compress_size > MAX_EPUB_RATIO
            ):
                raise ValueError("EPUB 单文件大小或压缩率超过安全限制")
            if info.flag_bits & 1:
                raise ValueError("EPUB 含加密条目，无法安全读取")
        names = {i.filename for i in infos}
        opf = ""
        try:
            container = ElementTree.fromstring(archive.read("META-INF/container.xml"))
            rootfile = next(e.attrib["full-path"] for e in container.iter() if e.tag.endswith("rootfile"))
            opf = rootfile.replace("\\", "/")
        except (KeyError, StopIteration, ElementTree.ParseError):
            pass
        metadata_title = ""
        ordered: list[str] = []
        if opf in names:
            root = ElementTree.fromstring(archive.read(opf))
            ns = {"opf": "http://www.idpf.org/2007/opf", "dc": "http://purl.org/dc/elements/1.1/"}
            metadata_title = (root.findtext(".//dc:title", namespaces=ns) or "").strip()
            manifest = {e.attrib.get("id", ""): e.attrib.get("href", "") for e in root.findall(".//opf:manifest/opf:item", ns)}
            base = opf.rsplit("/", 1)[0] if "/" in opf else ""
            for itemref in root.findall(".//opf:spine/opf:itemref", ns):
                href = manifest.get(itemref.attrib.get("idref", ""), "")
                name = str(Path(base, urllib.parse.unquote(href))).replace("\\", "/")
                if name in names and name.lower().endswith((".xhtml", ".html", ".htm")):
                    ordered.append(name)
        if not ordered:
            ordered = [i.filename for i in infos if i.filename.lower().endswith((".xhtml", ".html", ".htm")) and "nav" not in i.filename.lower()]
        chunks: list[str] = []
        for name in ordered[:8]:
            with archive.open(name) as stream:
                raw = stream.read(MAX_EPUB_ENTRY + 1)
            if len(raw) > MAX_EPUB_ENTRY:
                raise ValueError("EPUB 正文条目超过安全限制")
            chunks.append(_html_text(raw))
            if sum(map(len, chunks)) >= MAX_TEXT:
                break
        text = "\n".join(chunks)[:MAX_TEXT]
        return text, text[:8000], metadata_title


def extract_text(path: str | Path) -> str:
    """Return a bounded local text excerpt from a PDF or EPUB."""
    file_path = Path(path)
    if file_path.suffix.lower() == ".pdf":
        return _pdf_text(file_path)[0][:MAX_TEXT]
    if file_path.suffix.lower() == ".epub":
        return _safe_epub_text(file_path)[0][:MAX_TEXT]
    raise ValueError("仅支持 PDF 和 EPUB 文件。")


def extract_pdf_pages(path: str | Path, max_pages: int = 60) -> tuple[str, int]:
    """Return page-labelled text for grounded Q&A."""
    if fitz is None:
        raise RuntimeError("未安装 PyMuPDF，无法读取 PDF")
    doc = fitz.open(Path(path))
    try:
        count = min(doc.page_count, max(1, min(int(max_pages), 60)))
        chunks = []
        for index in range(count):
            page_text = doc.load_page(index).get_text("text").strip()
            if page_text:
                chunks.append(f"[Page {index + 1}]\n{page_text}")
        return "\n\n".join(chunks), count
    finally:
        doc.close()


def _openalex_json(url: str) -> dict[str, Any]:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": OPENALEX_USER_AGENT},
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        return json.loads(response.read(3_000_000))


def _openalex_abstract(inverted: dict[str, list[int]] | None) -> str:
    if not isinstance(inverted, dict):
        return ""
    words: dict[int, str] = {}
    for word, positions in inverted.items():
        if isinstance(positions, list):
            for position in positions:
                if isinstance(position, int):
                    words[position] = str(word)
    return " ".join(words[index] for index in sorted(words))[:2200]


def _openalex_item(work: dict[str, Any]) -> dict[str, Any]:
    authors = []
    for authorship in work.get("authorships") or []:
        name = str((authorship.get("author") or {}).get("display_name") or "").strip()
        if name:
            authors.append(name)
    best = work.get("best_oa_location") or {}
    primary = work.get("primary_location") or {}
    source = primary.get("source") or {}
    open_access = work.get("open_access") or {}
    doi = str(work.get("doi") or "").removeprefix("https://doi.org/").lower()
    return {
        "id": str(work.get("id") or "").rsplit("/", 1)[-1],
        "title": str(work.get("display_name") or "Untitled").strip(),
        "doi": doi,
        "year": work.get("publication_year") or "",
        "venue": str(source.get("display_name") or "").strip(),
        "authors": authors,
        "citedBy": int(work.get("cited_by_count") or 0),
        "type": str(work.get("type") or "")[:80],
        "abstract": _openalex_abstract(work.get("abstract_inverted_index")),
        "sourceURL": str(primary.get("landing_page_url") or (f"https://doi.org/{doi}" if doi else work.get("id") or "")),
        "pdfURL": str(best.get("pdf_url") or open_access.get("oa_url") or ""),
        "isOpenAccess": bool(open_access.get("is_oa") and best.get("pdf_url")),
        "provider": "OpenAlex",
    }


def _crossref_item(item: dict[str, Any]) -> dict[str, Any]:
    doi = _clean_doi(item.get("DOI") or "")
    title_list = item.get("title") or []
    title = title_list[0].strip() if title_list else "Untitled"
    authors = []
    for a in item.get("author") or []:
        name = f"{a.get('given', '')} {a.get('family', '')}".strip()
        if not name:
            name = str(a.get("name") or "").strip()
        if name:
            authors.append(name)
    dates = item.get("published-print") or item.get("published-online") or item.get("created") or {}
    date_parts = dates.get("date-parts", [[]])[0]
    year = str(date_parts[0]) if date_parts else ""
    venue_list = item.get("container-title") or []
    venue = venue_list[0].strip() if venue_list else ""
    pdf_url = ""
    is_oa = False
    for link in item.get("link") or []:
        ct = str(link.get("content-type") or "").lower()
        u = str(link.get("URL") or "")
        if "pdf" in ct and u.startswith("https://"):
            pdf_url = u
            is_oa = True
            break
    abstract = re.sub(r"<[^>]+>", "", item.get("abstract") or "").strip()[:2200]
    return {
        "id": doi or title,
        "title": title,
        "doi": doi,
        "year": year,
        "venue": venue,
        "authors": authors,
        "citedBy": int(item.get("is-referenced-by-count") or 0),
        "type": str(item.get("type") or "journal-article")[:80],
        "abstract": abstract,
        "sourceURL": str(item.get("URL") or (f"https://doi.org/{doi}" if doi else "")),
        "pdfURL": pdf_url,
        "isOpenAccess": is_oa,
        "provider": "Crossref",
    }


def _crossref_search(query: str, limit: int = 10) -> list[dict[str, Any]]:
    params = urllib.parse.urlencode({
        "query": query[:300],
        "rows": max(1, min(int(limit), 20)),
        "mailto": "scholarloom@openalex-client.org",
    })
    url = "https://api.crossref.org/works?" + params
    request = urllib.request.Request(
        url,
        headers={"User-Agent": OPENALEX_USER_AGENT},
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        payload = json.loads(response.read(3_000_000))
        items = (payload.get("message") or {}).get("items") or []
        return [_crossref_item(item) for item in items if isinstance(item, dict)]


def search_external_literature(query: str, limit: int = 10) -> list[dict[str, Any]]:
    """Search OpenAlex with polite pool and automatic Crossref fallback."""
    query = query.strip()
    if len(query) < 2:
        raise ValueError("请输入至少两个字符的主题词。")
    openalex_err = None
    openalex_items: list[dict[str, Any]] = []
    params = urllib.parse.urlencode(
        {
            "search": query[:300],
            "per-page": max(1, min(int(limit), 20)),
            "select": "id,doi,display_name,publication_year,authorships,cited_by_count,"
            "primary_location,best_oa_location,open_access,abstract_inverted_index,type",
            "mailto": "scholarloom@openalex-client.org",
        }
    )
    try:
        payload = _openalex_json("https://api.openalex.org/works?" + params)
        openalex_items = [_openalex_item(work) for work in payload.get("results", []) if isinstance(work, dict)]
    except (urllib.error.URLError, TimeoutError, OSError, ValueError, json.JSONDecodeError) as exc:
        openalex_err = exc

    if openalex_items:
        return openalex_items

    try:
        crossref_items = _crossref_search(query, limit)
        if crossref_items:
            return crossref_items
    except (urllib.error.URLError, TimeoutError, OSError, ValueError, json.JSONDecodeError) as exc:
        if openalex_err:
            raise ValueError("学术检索服务暂时无法连接（OpenAlex / Crossref），请检查网络连接后重试。") from exc

    if openalex_err:
        raise ValueError("学术检索服务暂时无法连接，请检查网络连接后重试。") from openalex_err

    return []


def get_related_literature(doi: str, limit: int = 8) -> list[dict[str, Any]]:
    """Use OpenAlex related-work links for paper-to-paper discovery."""
    clean = re.sub(r"^https?://(?:dx\.)?doi\.org/", "", doi.strip(), flags=re.I)
    if not clean:
        raise ValueError("该文献没有可用于关联推荐的 DOI。")
    try:
        seed = _openalex_json(
            "https://api.openalex.org/works/https://doi.org/"
            + urllib.parse.quote(clean, safe="/")
            + "?select=id,related_works&mailto=scholarloom@openalex-client.org"
        )
        ids = [str(value).rsplit("/", 1)[-1] for value in seed.get("related_works") or []][: max(1, min(int(limit), 20))]
        if not ids:
            return []
        params = urllib.parse.urlencode(
            {
                "filter": "openalex_id:" + "|".join(ids),
                "per-page": len(ids),
                "select": "id,doi,display_name,publication_year,authorships,cited_by_count,"
                "primary_location,best_oa_location,open_access,abstract_inverted_index,type",
                "mailto": "scholarloom@openalex-client.org",
            }
        )
        payload = _openalex_json("https://api.openalex.org/works?" + params)
    except (urllib.error.URLError, TimeoutError, OSError, ValueError, json.JSONDecodeError) as exc:
        raise ValueError("OpenAlex 暂时无法连接，请检查网络后重试。") from exc
    return [_openalex_item(work) for work in payload.get("results", []) if isinstance(work, dict)]


def _clean_doi(value: str) -> str:
    value = value.rstrip(".,;:]>}").lower()
    value = re.sub(r"^(10\.\d{4,9})/+", r"\1/", value)
    while value.endswith(")") and value.count(")") > value.count("("):
        value = value[:-1]
    return value


def _first_doi(first_page: str) -> str:
    # PDFs often encode "fi" as a single ligature, including inside DOIs.
    text = unicodedata.normalize("NFKC", first_page)
    text = text.replace("\u00ad", "").replace("\u200b", "").replace("\ufeff", "")
    # Some Chinese PDF fonts map a visible hyphen to a private-use glyph.
    text = re.sub(r"[\ue000-\uf8ff]", "-", text)
    # Some PDF text extractors insert a space at a wrapped numeric DOI boundary.
    text = re.sub(r"(?<=\.)[ \t]+(?=\d)", "", text)
    text = re.sub(r"(?<=\d\.)\s+(?=\d)", "", text)
    refs = re.search(r"(?im)^\s*(?:references|bibliography|参考文献)\s*$", text)
    if refs:
        text = text[:refs.start()]
    match = DOI_RE.search(text)
    return _clean_doi(match.group(0)) if match else ""


def _filename_doi(filename: str) -> str:
    """Recover official article IDs when a PDF omits its title-page DOI."""
    stem = Path(filename).stem
    nature = re.fullmatch(r"(s\d{5}-\d{3}-\d{5}-[\dxX])", stem)
    if nature:
        return "10.1038/" + nature.group(1).lower()
    elife = re.fullmatch(r"elife-(\d+)", stem, re.I)
    if elife:
        return "10.7554/elife." + elife.group(1)
    sciimmunol = re.fullmatch(r"sciimmunol\.([a-z0-9]+)", stem, re.I)
    if sciimmunol:
        return "10.1126/sciimmunol." + sciimmunol.group(1).lower()
    return ""


def _compact_text(value: str) -> str:
    value = html.unescape(re.sub(r"<[^>]+>", "", value))
    value = unicodedata.normalize("NFKC", value).translate(_GREEK_TRANSLATION)
    value = unicodedata.normalize("NFKD", value).casefold()
    return "".join(c for c in value if c.isalnum())


def _metadata_title(metadata: dict[str, str], filename: str) -> str:
    """Accept useful PDF metadata titles, but not generic export artifacts."""
    title = re.sub(r"\s+", " ", metadata.get("title", "")).strip(" .")
    if not 8 <= len(title) <= 500:
        return ""
    compact = _compact_text(title)
    if not compact or compact == _compact_text(Path(filename).stem):
        return ""
    if compact in {"untitled", "untitleddocument", "document", "microsoftword", "latexdocument"}:
        return ""
    if re.match(r"(?i)^(?:untitled|microsoft\s+word|latex|powerpoint)\b", title):
        return ""
    return title


def _arxiv_id(first_page: str, metadata: dict[str, str], filename: str) -> str:
    sources = (
        first_page[:6000],
        " ".join(metadata.get(key, "") for key in ("subject", "keywords", "creator")),
        Path(filename).stem,
    )
    for source in sources:
        match = ARXIV_ID_RE.search(source)
        if match:
            return match.group(1) + (match.group(2) or "")
    return ""


def _title_match(local: str, remote: str) -> bool:
    a, b = _compact_text(local), _compact_text(remote)
    if len(b) < 8 or len(a) < 8:
        return False
    if a == b:
        return True
    shorter, longer = sorted((a, b), key=len)
    # Long first-page text containing a cited title is not itself a title match.
    if shorter in longer and len(shorter) / len(longer) >= 0.72:
        return True
    if re.search(r"[\u3400-\u9fff]", b):
        return SequenceMatcher(None, a[:len(b) + 24], b).ratio() >= 0.86
    words_a = set(re.findall(r"[a-z0-9]+", local.casefold()))
    words_b = set(re.findall(r"[a-z0-9]+", remote.casefold()))
    significant = {w for w in words_b if len(w) > 2}
    coverage = len(significant & words_a) / len(significant) if significant else 0
    return coverage >= 0.9 and SequenceMatcher(
        None, " ".join(re.findall(r"[a-z0-9]+", local.casefold())),
        " ".join(re.findall(r"[a-z0-9]+", remote.casefold())),
    ).ratio() >= 0.78


def _title_evidence(text: str, remote_title: str) -> bool:
    """Require the Crossref title to appear in the paper's opening matter."""
    front = text[:12_000]
    refs = re.search(r"(?im)^\s*(?:references|bibliography|参考文献)\s*$", front)
    if refs:
        front = front[:refs.start()]
    # Line-numbered preprints often put a bare number between wrapped title lines.
    front = "\n".join(line for line in front.splitlines() if not re.fullmatch(r"\d{1,3}", line.strip()))
    needle = _compact_text(remote_title)
    return len(needle) >= 20 and needle in _compact_text(front)


def _looks_like_author_line(line: str) -> bool:
    if "@" in line or re.search(
        r"(?i)\b(?:university|department|institute|college|school|laborator(?:y|ies)|"
        r"centre|center|hospital|academy)\b",
        line,
    ):
        return True
    names = re.findall(r"\b[A-Z][a-z]+(?:\s+[A-Z]\.?)*(?:\s+[A-Z][a-z]+)?\b", line)
    if len(names) >= 3 and bool(re.search(r",|&|\bet\s+al\b", line)):
        return True
    return bool(re.search(
        r"\b[A-Z][a-z]+\s+[A-Z][a-z]+\s+(?:and|&)\s+[A-Z][a-z]+", line
    ))


def _looks_like_abstract_line(line: str) -> bool:
    words = re.findall(r"[A-Za-z\u3400-\u9fff-]+", line)
    return len(words) >= 35 and bool(re.search(r"[.!?。]$", line))


def _clean_title_lines(first_page: str) -> list[str]:
    lines: list[str] = []
    for raw in first_page.splitlines():
        line = re.sub(r"\s+", " ", raw).strip(" \t-–—")
        line = _TITLE_LABEL_RE.sub("", line).strip(" :：.-–—")
        if not line or len(line) < 4 or _TITLE_NOISE_RE.search(line) or DOI_RE.search(line):
            continue
        if PATENT_NO_RE.search(line) or re.search(r"[\w.+-]+@[\w.-]+", line):
            continue
        lines.append(line)
    return lines


def _local_title(first_page: str, epub_title: str = "") -> str:
    if epub_title.strip():
        return epub_title.strip()
    candidates: list[str] = []
    for line in _clean_title_lines(first_page):
        if _TITLE_STOP_RE.search(line):
            break
        if _looks_like_abstract_line(line):
            break
        if _looks_like_author_line(line):
            break
        if candidates and (len(line) > 420 or len(re.findall(r"[A-Za-z]+", line)) > 45):
            break
        candidates.append(line)
        if len(" ".join(candidates)) >= 260 or len(candidates) >= 4:
            break
    title = " ".join(candidates).strip(" .;:，。")
    return title[:500] if len(title) >= 8 else ""


def _crossref(doi: str) -> dict[str, Any]:
    url = "https://api.crossref.org/works/" + urllib.parse.quote(doi, safe="")
    request = urllib.request.Request(url, headers={"User-Agent": f"{USER_AGENT} (metadata lookup)"})
    data = _fetch_json(request)
    return data["message"]


def _fetch_json(request: urllib.request.Request) -> dict[str, Any]:
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                return json.loads(response.read(2_000_000).decode("utf-8"))
        except urllib.error.HTTPError as exc:
            if exc.code not in (429, 502, 503, 504) or attempt == 2:
                raise
            time.sleep(attempt + 1)
    raise RuntimeError("unreachable")


def _arxiv_record(arxiv_id: str) -> dict[str, Any] | None:
    query = urllib.parse.urlencode({"id_list": arxiv_id})
    request = urllib.request.Request(
        f"https://export.arxiv.org/api/query?{query}",
        headers={"User-Agent": f"{USER_AGENT} (preprint verification)"},
    )
    namespaces = {
        "a": "http://www.w3.org/2005/Atom",
        "arxiv": "http://arxiv.org/schemas/atom",
    }
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                raw = response.read(2_000_000)
            break
        except urllib.error.HTTPError as exc:
            if exc.code not in (429, 502, 503, 504) or attempt == 2:
                raise
            time.sleep(attempt + 1)
    else:  # pragma: no cover - loop always breaks or raises
        return None
    root = ElementTree.fromstring(raw)
    entry = root.find("a:entry", namespaces)
    if entry is None:
        return None
    remote_id = (entry.findtext("a:id", "", namespaces) or "").strip()
    remote_title = re.sub(r"\s+", " ", entry.findtext("a:title", "", namespaces) or "").strip()
    published = (entry.findtext("a:published", "", namespaces) or "").strip()[:10]
    creators = [
        {"creatorType": "author", "name": re.sub(
            r"\s+", " ", author.findtext("a:name", "", namespaces) or ""
        ).strip()}
        for author in entry.findall("a:author", namespaces)
    ]
    creators = [author for author in creators if author["name"]]
    if not remote_title or "/abs/" not in remote_id:
        return None
    archive_id = remote_id.rsplit("/abs/", 1)[-1]
    return {
        "title": remote_title,
        "archiveID": f"arXiv:{archive_id}",
        "creators": creators,
        "date": published,
        "abstractNote": _abstract(entry.findtext("a:summary", "", namespaces) or ""),
        "sourceURL": f"https://arxiv.org/abs/{archive_id}",
        "repository": "arXiv",
    }


def _verified_arxiv(arxiv_id: str, text: str, titles: list[str]) -> dict[str, Any] | None:
    if not arxiv_id:
        return None
    record = _arxiv_record(arxiv_id)
    if not record:
        return None
    remote_title = record["title"]
    if _title_evidence(text, remote_title) or any(_title_match(title, remote_title) for title in titles):
        return record
    return None


def _crossref_title(title: str, first_page: str = "", text: str = "") -> dict[str, Any] | None:
    """Resolve a DOI from a title for author manuscripts without an embedded DOI."""
    lines = _clean_title_lines(first_page)
    queries: list[str] = []
    if 15 <= len(title.strip()) <= 500:
        queries.append(title[:500])
    queries.extend(" ".join(lines[:count]) for count in (2, 3) if len(lines) >= count)
    evidence_text = text or first_page
    for candidate in dict.fromkeys(query for query in queries if len(query.strip()) >= 15):
        query = urllib.parse.urlencode({"query.title": candidate[:500], "rows": 10,
                                        "select": "DOI,title,type"})
        request = urllib.request.Request(
            f"https://api.crossref.org/works?{query}",
        headers={"User-Agent": f"{USER_AGENT} (metadata lookup)"},
        )
        data = _fetch_json(request)
        for item in data.get("message", {}).get("items", []):
            remote_title = " ".join(item.get("title") or [])
            if (item.get("type") == "journal-article" and item.get("DOI")
                    and (_title_evidence(evidence_text, remote_title)
                         or _title_match(candidate, remote_title))):
                return _crossref(str(item["DOI"]))
    return None


def _abstract(value: str) -> str:
    return re.sub(r"\s+", " ", _strip_markup(value or "")).strip()


def _crossref_metadata(item: dict[str, Any], item_type: str = "journalArticle") -> dict[str, Any]:
    authors = item.get("author") or []
    creators = [{"creatorType": "author", "firstName": a.get("given", ""), "lastName": a.get("family", "")}
                for a in authors if a.get("given") or a.get("family")]
    issued = item.get("issued", {}).get("date-parts", [[]])
    date = "-".join(map(str, issued[0])) if issued and issued[0] else ""
    metadata = {"itemType": item_type, "title": _strip_markup(" ".join(item.get("title") or [])),
            "DOI": item.get("DOI", ""), "creators": creators, "date": date,
            "publicationTitle": " ".join(item.get("container-title") or []),
            "abstractNote": _abstract(item.get("abstract", "")), "patentNumber": ""}
    if item_type == "preprint":
        institutions = item.get("institution") or []
        metadata["repository"] = (
            " ".join(item.get("container-title") or [])
            or next((str(entry.get("name", "")) for entry in institutions if entry.get("name")), "")
            or "Crossref 预印本"
        )
        metadata["archiveID"] = item.get("DOI", "")
    return metadata


def _chinese_article_record(first_page: str, doi: str) -> dict[str, Any] | None:
    """Recognize a Chinese journal article from its structured first page."""
    if not doi:
        return None
    page = unicodedata.normalize("NFKC", first_page)
    page = re.sub(r"[\ue000-\uf8ff]", "-", page)
    if not (re.search(r"摘要", page) and re.search(r"关键词", page)):
        return None
    abstract_at = re.search(r"摘要", page)
    front_lines = [re.sub(r"\s+", " ", line).strip() for line in page[:abstract_at.start()].splitlines()]
    title = ""
    for line in reversed(front_lines):
        if not (5 <= len(line) <= 160):
            continue
        if re.search(
            r"引用格式|作者|单位|通信作者|大学|学院|医院|研究所|中心|实验室|"
            r"doi|http|@|\[J\]|第?\d+卷|·综述·",
            line,
            re.I,
        ):
            continue
        if len(re.findall(r"[\u3400-\u9fff]", line)) >= 5:
            title = line.strip(" .;:，。")
            break
    if not title:
        return None
    issue = re.search(r"\[J\]\s*[.．]\s*([^，,；;]+)", page, re.I)
    abstract = re.search(r"摘要[:：]?\s*(.{20,2000}?)关键词", page, re.S)
    year = re.search(r"(?:19|20)\d{2}", page[:abstract_at.start()])
    category, keywords, category_basis = _classify(
        title, abstract.group(1) if abstract else "",
    )
    return {
        "metadata": {
            "itemType": "journalArticle",
            "title": title[:500],
            "DOI": doi,
            "creators": [],
            "date": year.group(0) if year else "",
            "publicationTitle": issue.group(1).strip()[:300] if issue else "",
            "abstractNote": _abstract(abstract.group(1)).strip("】] [:：") if abstract else "",
            "patentNumber": "",
        },
        "category": category,
        "keywords": keywords,
        "category_basis": category_basis,
    }


def _classify(title: str, abstract: str, is_patent: bool = False) -> tuple[str, list[str], str]:
    if is_patent:
        return "专利技术", _keywords(title, abstract), "专利首页公开号与专利标志"
    haystack = f"{title} {abstract}".casefold()
    scores = {name: sum(1 for term in terms.split() if term.casefold() in haystack)
              for name, terms in _CATEGORY_TERMS.items()}
    ranked = sorted(scores.items(), key=lambda row: row[1], reverse=True)
    if ranked and ranked[0][1] >= 2 and (len(ranked) == 1 or ranked[0][1] > ranked[1][1]):
        return ranked[0][0], _keywords(title, abstract), "题名和摘要主题词"
    return "研究方法与工具", _keywords(title, abstract), "默认研究类别"


def _keywords(title: str, abstract: str) -> list[str]:
    known = ("抗体", "表位", "疫苗", "病毒", "感染", "细胞", "药物", "植物", "天然产物", "神经", "行为",
             "基因组", "遗传", "进化", "微生物", "生态", "CAR-T", "免疫", "抗原", "蛋白", "受体",
             "antibody", "epitope", "vaccine", "virus", "infection", "cell", "genomics", "microbiome")
    text = f"{title} {abstract}".casefold()
    return [word for word in known if word.casefold() in text][:12]


def _patent_title(first_page: str) -> str:
    for line in first_page.splitlines():
        match = re.search(r"(?:\(54\)|54\s*[:：.]|发明名称\s*[:：]?|\bTitle\s*[:：])\s*(.+)", line, re.I)
        if match:
            value = match.group(1).strip(" :：.\t")
            if len(value) > 2:
                return value[:500]
    return ""


def _exclusion_reason(first_page: str, text: str = "", filename: str = "") -> str:
    """Identify non-journal/non-patent documents that should be excluded directly."""
    combined_head = f"{first_page[:6000]}\n{filename}".casefold()
    low = (first_page + "\n" + text[:6000]).casefold()

    # 1. 电子发票与财务报销单
    invoice_pats = (
        r"电子发票|增值税发票|普通发票|专用发票|发票号码|开票人|购买方信息|客运服务费|旅客运输服务|统一社会信用代码/纳税",
    )
    if any(re.search(p, combined_head) for p in invoice_pats):
        return "文件明确为电子发票或财务凭证，直接剔除不导入。"

    # 2. 个人简历
    if re.search(r"个人简历|求职简历|\bcurriculum\s+vitae\b|\bresume\b", combined_head):
        return "文件明确为个人简历，直接剔除不导入。"

    # 3. 课程表
    if re.search(r"课表|课程表|选课结果", combined_head):
        return "文件明确为学生课程表，直接剔除不导入。"

    # 4. WHO INN
    if ("international nonproprietary names" in low or "proposed inn" in low or "recommended inn" in low
            or "国际非专利名称" in first_page or re.search(r"\bWHO\s+INN\b", first_page, re.I)):
        return "文件明确为 WHO INN 名称清单，不作为文献导入。"

    # 5. 答辩PPT与开题报告
    defense_pats = (
        r"答辩(?:ppt|报告|文稿|演示|幻灯片|材料|幻灯|展示|提纲)?",
        r"毕业答辩|学位答辩|开题报告|中期考核|中期答辩|预答辩|结题答辩|论文答辩|开题答辩|毕业设计答辩|讲述提纲",
        r"\b(?:thesis|dissertation|oral|proposal|project|graduation)\s+(?:defense|defence|presentation|slides?|ppt|pptx)\b",
        r"\b(?:defense|defence)\s+(?:slides?|presentation|ppt|report)\b",
        r"\bpowerpoint\s+(?:presentation|slides?)\b",
        r"\b(?:presentation|slide)\s+(?:deck|slides?)\b",
        r"演示文稿|幻灯片放映|汇报ppt|答辩汇报|演讲幻灯片|逐页内容",
        r"全流程科研配图|科研配图包",
    )
    if any(re.search(p, combined_head) for p in defense_pats):
        return "文件明确为答辩PPT、开题报告或汇报演示，直接剔除不导入。"

    # 6. 学位论文
    if ("doctoral dissertation" in low or "master's thesis" in low or "ph.d. thesis" in low
            or "学位论文" in low or "博士学位论文" in low or "硕士学位论文" in low
            or "博士毕业论文" in low or "硕士毕业论文" in low):
        return "首页明确标注为学位论文，不作为期刊论文导入。"

    # 7. 课程教案、教学方案与教学大纲
    lesson_pats = (
        r"课程教案|教学教案|授课教案|备课教案|教学设计|教学方案|授课方案|备课笔记|教案首页|教案设计|学期教案|课时教案",
        r"教学进度表|授课计划|教学大纲|课程简介及大纲|预习课件",
        r"\b(?:lesson|teaching|instructional)\s+plans?\b",
        r"\b(?:teaching|instructional)\s+design\b",
        r"\b(?:course|class)\s+syllabus\b",
    )
    if any(re.search(p, combined_head) for p in lesson_pats):
        return "文件明确为课程教案、教学设计或授课大纲，直接剔除不导入。"

    # 8. 课程作业、习题、实验与试卷
    exercise_pats = (
        r"【考核试题】|考核试题|期末考核|期中考核|课程作业|课后作业|课堂练习|作业\s*\d+|homework\s*\d*",
        r"\blab\s*\d+.*(?:answer|习题|导论|陈淏文)?\b|\bhomework\s*\d*\b|\boop_ex\b",
        r"实验\s*\d+.*(?:层析|检测|色谱|指导|报告|预习)?",
        r"实验步骤\s*–|实验步骤\s*[-—]|细胞转染及蛋白表达|质粒提取|细胞转染|"
        r"亲和层析|蛋白纯化|活性检测|引物设计|pcr引物设计",
        r"习题解答|课后习题|作业指导书|思考题解答",
    )
    if any(re.search(p, combined_head) for p in exercise_pats):
        return "文件明确为课程作业、实验操作指导或考核试卷，直接剔除不导入。"

    # 9. 课程复习资料、知识点汇编
    review_guide_pats = (
        r"复习纲要|复习资料|期中复习|期末复习|总复习|知识点精华|知识点汇编|药理学复习|毛概复习",
    )
    if any(re.search(p, combined_head) for p in review_guide_pats):
        return "文件明确为课程复习资料或知识点汇编，直接剔除不导入。"

    # 10. 课件讲义与章节
    is_lncs = bool(re.search(
        r"(?i)\blecture\s+notes\s+in\s+(?:computer\s+science|mathematics|physics|chemistry|ai|control|earth|business)\b|\bLNCS\b",
        combined_head,
    ))
    if not is_lncs:
        courseware_pats = (
            r"\bchap(?:ter)?\s*\d+\b|\bchap\d+[a-z]?\b",
            r"\b(?:lecture|course|class|seminar)\s+(?:notes?|slides?|materials?|handout)\b",
            r"\b(?:teaching|course)\s+(?:slides?|materials?|notes?)\b",
            r"\bslides?\s+for\b|\bslide\d+\b",
            r"\blecture\s*\d+\b",
            r"课程讲义|教学课件|课堂讲义|授课课件|课堂课件|课程课件",
            r"第[一二三四五六七八九十\d]+[讲章课节]",
            r"本课件由.*编写|推荐系统.*课程",
        )
        if any(re.search(p, combined_head) for p in courseware_pats):
            return "文件明确为教学课件、课程讲义或教材章节，直接剔除不导入。"

    # 11. 图书与电子书
    if re.search(r"\bISBN\b", low, re.I) and re.search(r"(?i)\b(?:edition|textbook|publisher)\b|出版社|第.{1,4}版|教材", low):
        return "首页同时出现 ISBN 与图书/出版社信息，判定为图书。"

    book_filename_pats = (
        r"(?:second|third|fourth|fifth|1st|2nd|3rd|4th|5th)[-_\s]+edition",
        r"97[89][\d-]{10,14}",
        r"z-library|全本全注全译|中单書局|中华书局|pdffactory",
    )
    if any(re.search(p, filename.casefold()) for p in book_filename_pats):
        return "首页包含图书出版或电子书特征，判定为图书直接剔除。"

    # 12. 独立配图文件
    if re.search(r"^g\d{2}\.pdf$|^enrichment_heatmap.*\.pdf$|^graphs_in_python\.pdf$", filename.casefold()) \
       or (len(text.strip()) < 200 and re.search(r"go:\d+|log10\(p\)|heatmap", low)):
        return "文件为独立科研配图、图表或图片包，直接剔除不导入。"

    # 13. 调研汇报
    if "调研汇报" in combined_head or "流程调研" in combined_head:
        return "文件为主题调研汇报或调研总结，直接剔除不导入。"

    # High-signal non-paper labels. These use explicit phrases rather than
    # topical keywords so real articles mentioning the same subjects survive.
    front_head = first_page[:2200].casefold()
    compact_head = _compact_text(front_head)
    evidence_groups = (
        ("文献汇报、阅读笔记或汇报幻灯片",
         r"文献汇报|文献精读|组会汇报|文献分享|^journal\s+club\b|^paper\s+presentation\b|"
         r"^汇报人[:：]|其余组员|^\s*group\s*\d+"),
        ("知情同意、行程单或行政表单",
         r"知情同意书|^participant\s+consent\b|^informed\s+consent\s+form\b|"
         r"高德地图.*行程单|taxi\s+itinerary|itinerary\s+receipt|"
         r"准考证|活动参与证明|停电通知|学籍在线验证|奖项公示|获奖名单|"
         r"公示时间|各参赛单位|^领队[:：]|^活动时间[:：]|任务书|"
         r"conformance\s+request\s+guide|wage\s+determination"),
        ("学生作业、实验报告或课程材料",
         r"优秀作业|实验报告|实验指导|实验操作|课程介绍|课程大纲|教学大纲|"
         r"课程作业|课后习题|习题集|练习册|\bquiz\s*0*\d+\b|"
         r"\bexercises?\s*\d+\b|实验总流程设计图|^实验目的\b|辅导讲义|"
         r"实验教学示范中心|^计算生物学[:：]|^exp\.\s*\d+"),
        ("产品说明、质检报告或试剂手册",
         r"产品说明书|使用说明书|用户手册|操作手册|安全数据表|质检报告|"
         r"质控报告|试剂盒说明书|^product\s+manual\b|^user\s+manual\b"),
        ("金融研究报告、新闻或杂志",
         r"证券研究报告|投资评级|投资建议|年度策略|资本市场展望|"
         r"证券研究团队|分析师证明|投资策略|new\s+york\s+times|\bnews\s+article\b|"
         r"发布平台[:：].*官方博客"),
        ("行政通知、表单或指南",
         r"研究生培养计划|graduate\s+training\s+plan|^目录\s*$"),
    )
    for reason, pattern in evidence_groups:
        if re.search(pattern, front_head, re.I | re.M):
            return reason

    filename_groups = (
        ("文献补充材料",
         r"(?:^|[_\-.])sm$|supplementary|supplemental|supporting[_\-. ]?information"),
        ("数据图或组学导出文件",
         r"(?:enrichment|volcano|heatmap|dotplot|go[_\-. ]?(?:bp|cc|mf|enrichment)|"
         r"limma[_\-. ]?analysis|diff[_\-.].*(?:go|kegg)|pca[_\-. ]?plot|"
         r"^(?:human|langya|nipah)_[a-z]_|趋势图)"),
        ("课程资料或作业",
         r"^(?:quiz\d*|ex(?:ercise)?\d*|homework\d*|hw\d*|cellbio\b|"
         r"ch\d+(?:\.\d+)?|chapter\d+)|"
         r"课程介绍|课程大纲|教学大纲|优秀作业|思维导图|辅导讲义|实验教学|"
         r"专业实习|实践操作|羽毛球\s*\d+|实验报告"),
        ("项目报告或汇报材料",
         r"(?:^|[_\-. ])(?:pre|presentation|中期|结题|立项|开题|prp)(?:[_\-. ]|$)|"
         r"智能管理平台立项|项目任务书|汇报材料|pre$|[（(]组[)）]|"
         r"method.*v\d+|技术方案|方法说明"),
        ("书籍或非学术读物",
         r"volume\s*\d+|普通心理学|小说|诗集|文集|龙族|故去的呢喃"),
        ("行政通知、表单或指南",
         r"公示|通知|告知单|邀请函|招新|评优|任务书|评审规则|参赛组别|"
         r"生源核对|宣传资料|准备会|日程|时程表|值班|入住手册|工作指南|"
         r"简历模板|聊天曝光|官方公告|操作指南|检查报告模板|培养计划"),
    )
    filename_key = Path(filename).stem.casefold()
    for reason, pattern in filename_groups:
        if re.search(pattern, filename_key, re.I):
            return reason

    if re.search(r"supplementary\s+materials?\s+for|^\s*supporting\s+information\b",
                 front_head[:1500], re.I):
        return "文献补充材料"
    if any(marker in compact_head for marker in (
        "实验总流程设计图", "实验教学示范中心", "本书编写组",
    )):
        return "学生作业、实验报告或课程材料"
    if len(text.strip()) < 2500 and re.search(r"group\d+", compact_head):
        return "文献汇报、阅读笔记或汇报幻灯片"
    if (0 < len(text.strip()) < 400 and re.search(r"[\u3400-\u9fff]", filename)
            and not re.search(r"[0-9a-f]{16}", filename.casefold())):
        return "正文内容不足，仅见标题或零散知识点，判定为课程资料或演示文稿。"
    if re.search(
        r"\bndc\b|dosage\s+and\s+administration|warnings\s+and\s+precautions|"
        r"\binjection,\s+solution\b",
        front_head,
        re.I,
    ):
        return "药品标签或说明书"
    if (len(text.strip()) < 5000 and re.search(r"《[^》]+》", first_page)
            and re.search(r"作者[:：]|本书编写组", first_page)):
        return "书籍或非学术读物"
    if re.search(r"page\s+\d+\s+of\s+\d+", front_head, re.I) and re.search(
        r"magazine|newspaper|nytimes\.com|newyorker\.com", front_head, re.I
    ):
        return "新闻、杂志或网页打印件"
    return ""


def _lecture_reason(first_page: str, text: str, filename: str = "") -> str:
    """Backward-compatible helper returning exclusion reason for lecture/slides."""
    return _exclusion_reason(first_page, text, filename)


def inspect_file(path: str | Path) -> dict[str, Any]:
    """Inspect a local PDF or EPUB and return a conservative Zotero-ready record."""
    file_path = Path(path)
    try:
        digest = _sha256(file_path)
    except OSError as exc:
        return _base_result(file_path, "", "") | {"reason": f"无法读取文件：{exc}"}
    result = _base_result(file_path, digest)
    suffix = file_path.suffix.lower()
    if suffix not in {".pdf", ".epub"}:
        result["status"] = "excluded"
        result["reason"] = "仅处理 PDF 和 EPUB 文件。"
        return result
    try:
        if suffix == ".pdf":
            text, first_page = _pdf_text(file_path)
            pdf_metadata = _pdf_metadata(file_path)
            epub_title = ""
        else:
            text, first_page, epub_title = _safe_epub_text(file_path)
            pdf_metadata = {}
    except (OSError, RuntimeError, ValueError, zipfile.BadZipFile, ElementTree.ParseError) as exc:
        result["reason"] = f"文件损坏或无法安全解析：{exc}"
        result["basis"] = "本地文件解析失败"
        return result
    result["text"] = text[:MAX_TEXT]

    exclusion = _exclusion_reason(first_page, text, file_path.name)
    if exclusion:
        result.update(status="excluded", reason=exclusion, basis="首页明确文献类型")
        return result

    patent_no_match = PATENT_NO_RE.search(first_page)
    chinese_gazette = (re.search(r"\(19\)", first_page) and re.search(r"\(10\)", first_page)
                       and re.search(r"\(54\)", first_page)
                       and (re.search(r"\(12\)", first_page) or "国家知识产权局" in first_page))
    english_gazette = (re.search(r"(?i)\b(?:United States Patent|European patent application|International publication)\b", first_page)
                       and re.search(r"(?i)(?:\(54\)|\bTitle\s*[:：])", first_page))
    if patent_no_match and (chinese_gazette or english_gazette):
        patent_no = re.sub(r"\s+", "", patent_no_match.group(0)).upper()
        title = _patent_title(first_page)
        if title:
            result["status"] = "ready"
            result["reason"] = "首页公开号、专利标志和专利题名相互支持。"
            result["metadata"] = {"itemType": "patent", "title": title, "DOI": "", "creators": [],
                                  "date": "", "publicationTitle": "", "abstractNote": "", "patentNumber": patent_no}
            result["category"], result["keywords"], result["basis"] = _classify(title, "", True)
            result["sourceURL"] = ""
        else:
            result["reason"] = "首页存在专利公开号和专利标志，但未能可靠提取题名。"
            result["basis"] = "本地专利首页；题名待核对"
        return result

    local_title = _local_title(first_page, epub_title)
    metadata_title = _metadata_title(pdf_metadata, file_path.name)
    metadata_doi = _first_doi(pdf_metadata.get("subject", "")) or _first_doi(pdf_metadata.get("keywords", ""))
    doi = _first_doi(first_page) or _first_doi(text[:9000])
    doi_source = "正文 DOI" if doi else ""
    if not doi:
        doi = _filename_doi(file_path.name)
        doi_source = "文件名 DOI" if doi else ""
    if not doi and metadata_doi:
        doi = metadata_doi
        doi_source = "PDF 元数据 DOI"
    titles = list(dict.fromkeys(title for title in (local_title, metadata_title) if title))
    arxiv_id = _arxiv_id(first_page, pdf_metadata, file_path.name)
    if not doi and not titles:
        result["reason"] = "未能从正文提取题名或 DOI，需人工核对。"
        result["basis"] = "本地正文标识不足"
        return result

    chinese_article = _chinese_article_record(first_page, doi)
    if chinese_article:
        result.update(
            status="ready",
            reason="中文期刊首页的题名、摘要、关键词与 DOI 相互支持。",
            basis=f"本地{doi_source}；中文期刊结构化首页",
            metadata=chinese_article["metadata"],
            category=chinese_article["category"],
            keywords=chinese_article["keywords"],
        )
        result["basis"] += f"；{chinese_article['category_basis']}"
        result["sourceURL"] = f"https://doi.org/{doi}" if doi else ""
        return result

    remote = None
    lookup_error = None
    try:
        if doi:
            remote = _crossref(doi)
            if remote.get("type") == "component":
                parent_doi = re.sub(r"(?i)^(10\.7554/elife\.\d+)\.\d+$", r"\1", doi)
                if parent_doi != doi:
                    parent = _crossref(parent_doi)
                    if parent.get("type") == "journal-article":
                        remote = parent
                        doi = parent_doi
                        doi_source = "正文 DOI"
            if remote.get("type") != "journal-article":
                for title in titles:
                    journal_version = _crossref_title(title, first_page, text)
                    if journal_version:
                        remote = journal_version
                        doi = ""
                        doi_source = ""
                        break
        elif titles:
            for title in titles:
                remote = _crossref_title(title, first_page, text)
                if remote:
                    break
    except (urllib.error.URLError, TimeoutError, OSError, ValueError, KeyError, json.JSONDecodeError) as exc:
        lookup_error = exc

    if (not remote or remote.get("type") not in ("journal-article", "posted-content", "preprint")) and arxiv_id:
        arxiv_error = None
        try:
            preprint = _verified_arxiv(arxiv_id, text, titles)
        except (urllib.error.URLError, TimeoutError, OSError, ValueError, ElementTree.ParseError) as exc:
            preprint = None
            arxiv_error = type(exc).__name__
        if preprint:
            result.update(
                status="ready",
                reason="arXiv 编号、预印本元数据和题名证据相互匹配。",
                basis="本地 arXiv 标识；arXiv 元数据；题名证据",
                metadata={
                    "itemType": "preprint",
                    "title": preprint["title"],
                    "DOI": "",
                    "creators": preprint["creators"],
                    "date": preprint["date"],
                    "publicationTitle": "",
                    "abstractNote": preprint["abstractNote"],
                    "patentNumber": "",
                    "repository": preprint["repository"],
                    "archiveID": preprint["archiveID"],
                },
                sourceURL=preprint["sourceURL"],
            )
            result["category"], result["keywords"], category_basis = _classify(
                preprint["title"], preprint["abstractNote"]
            )
            result["basis"] += f"；{category_basis}"
            return result
        if lookup_error and arxiv_error:
            result["reason"] = f"Crossref 与 arXiv 查询均失败，可稍后重试：{arxiv_error}。"
            result["basis"] = "本地正文；外部元数据暂不可用"
            return result

    if lookup_error and not remote:
        detail = f"{doi_source} 为 {doi}，" if doi else "正文未发现 DOI，已按题名查询，"
        result["reason"] = f"{detail}Crossref 查询失败，可稍后重试：{type(lookup_error).__name__}。"
        result["basis"] = "本地正文；Crossref 暂不可用"
        return result
    if not remote:
        detail = f"{doi_source} 为 {doi}，" if doi else "正文未发现 DOI，"
        if arxiv_id:
            result["reason"] = f"{detail}arXiv 标识 {arxiv_id} 未获题名匹配的预印本元数据。"
            result["basis"] = "本地正文与 arXiv 元数据"
        else:
            result["reason"] = f"{detail}按题名也未匹配到 Crossref 期刊文章或预印本记录。"
            result["basis"] = "本地正文与 Crossref 题名检索"
        return result
    returned_doi = _clean_doi(str(remote.get("DOI", "")))
    if doi and returned_doi != doi:
        result["reason"] = "Crossref 返回的 DOI 与本地 DOI 不一致，需人工核对。"
        result["basis"] = "本地 DOI 与 Crossref 返回 DOI 不匹配"
        return result
    remote_type = remote.get("type")
    if remote_type in ("posted-content", "preprint"):
        result["metadata"] = _crossref_metadata(remote, "preprint")
        result["metadata"]["DOI"] = returned_doi
        result["sourceURL"] = f"https://doi.org/{returned_doi}" if returned_doi else ""
        remote_title = result["metadata"]["title"]
        if not (_title_evidence(text, remote_title) or any(_title_match(title, remote_title) for title in titles)):
            result["reason"] = f"预印本题名证据与 Crossref 元数据不匹配（本地：{local_title[:100] or '未提取到题名'}），需核对。"
            result["basis"] = "本地题名证据与 Crossref 预印本题名不匹配"
            return result
        result["status"] = "ready"
        result["reason"] = "Crossref 预印本记录、DOI 与题名证据相互匹配。"
        result["basis"] = "Crossref 预印本元数据；题名证据"
        result["category"], result["keywords"], category_basis = _classify(
            remote_title, result["metadata"]["abstractNote"]
        )
        result["basis"] += f"；{category_basis}"
        return result
    if remote_type != "journal-article":
        result["reason"] = f"DOI 元数据类型为 {remote_type or '未知'}，不是期刊文章，需核对。"
        result["basis"] = "Crossref DOI元数据类型"
        return result
    result["metadata"] = _crossref_metadata(remote)
    result["metadata"]["DOI"] = returned_doi
    result["sourceURL"] = f"https://doi.org/{returned_doi}" if returned_doi else ""
    remote_title = result["metadata"]["title"]
    # An official publisher filename already encodes the exact DOI; requiring
    # another title to be extracted would reject valid PDFs with cover pages.
    title_evidence = _title_evidence(text, remote_title)
    metadata_title_match = any(_title_match(title, remote_title) for title in titles)
    if not (doi_source == "文件名 DOI" or title_evidence or metadata_title_match):
        result["reason"] = f"正文或 PDF 元数据题名与 DOI 元数据题名不匹配（本地：{local_title[:100] or metadata_title[:100] or '未提取到题名'}），需核对。"
        result["basis"] = "本地题名证据与 Crossref 题名不匹配"
        return result
    result["status"] = "ready"
    if doi_source == "文件名 DOI":
        result["reason"] = "文件名 DOI、Crossref 期刊文章类型和 DOI 元数据相互匹配。"
        result["basis"] = "本地文件名 DOI；Crossref DOI元数据"
    elif doi_source == "PDF 元数据 DOI":
        title_source = "PDF 元数据题名证据" if metadata_title_match else "正文题名证据"
        result["reason"] = f"PDF 元数据 DOI、Crossref 期刊文章类型和{title_source}相互匹配。"
        result["basis"] = f"PDF 元数据 DOI；Crossref DOI元数据；{title_source}"
    elif doi:
        title_source = "正文题名证据" if title_evidence else "PDF 元数据题名证据"
        result["reason"] = f"{doi_source}、Crossref 期刊文章类型和{title_source}均匹配。"
        result["basis"] = f"本地{doi_source}；Crossref DOI元数据；{title_source}"
    else:
        result["reason"] = "正文题名与 Crossref 期刊文章匹配并可由 DOI 唯一标识。"
        result["basis"] = "本地正文题名证据；Crossref 题名检索"
    result["category"], result["keywords"], category_basis = _classify(
        remote_title, result["metadata"]["abstractNote"]
    )
    result["basis"] += f"；{category_basis}"
    return result

