"""Conservative local document inspection for the literature workbench."""

from __future__ import annotations

import hashlib
import html
import json
import re
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
    import fitz
except ImportError:  # pragma: no cover - deployment environment supplies PyMuPDF
    fitz = None


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
INSPECTION_VERSION = 4
MAX_EPUB_TOTAL = 100 * 1024 * 1024
MAX_EPUB_ENTRY = 20 * 1024 * 1024
MAX_EPUB_RATIO = 100
DOI_RE = re.compile(r"\b10\.\d{4,9}/[-._;()/:A-Z0-9]+", re.I)
PATENT_NO_RE = re.compile(
    r"\b(?:CN\s*\d{7,}(?:\s*[A-Z]\d?)?|US\s*\d{7,}(?:\s*[A-Z]\d?)?|"
    r"WO\s*\d{4}/?\d{5,}(?:\s*[A-Z]\d?)?|EP\s*\d{7,}(?:\s*[A-Z]\d?)?|"
    r"JP\s*\d{7,}(?:\s*[A-Z]\d?)?|KR\s*\d{7,}(?:\s*[A-Z]\d?)?)\b", re.I
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
        headers={"User-Agent": "ScholarLoom/1.3 (mailto:scholarloom@openalex-client.org)"},
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
        headers={"User-Agent": "ScholarLoom/1.3 (mailto:scholarloom@openalex-client.org)"},
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
    while value.endswith(")") and value.count(")") > value.count("("):
        value = value[:-1]
    return value


def _first_doi(first_page: str) -> str:
    # PDFs often encode "fi" as a single ligature, including inside DOIs.
    text = unicodedata.normalize("NFKC", first_page)
    refs = re.search(r"(?im)^\s*(?:references|bibliography|参考文献)\s*$", text)
    if refs:
        text = text[:refs.start()]
    match = DOI_RE.search(text)
    return _clean_doi(match.group(0)) if match else ""


def _title_match(local: str, remote: str) -> bool:
    def norm(value: str) -> str:
        value = unicodedata.normalize("NFKC", value).casefold()
        return "".join(c for c in value if c.isalnum())
    a, b = norm(local), norm(remote)
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


def _local_title(first_page: str, epub_title: str = "") -> str:
    if epub_title.strip():
        return epub_title.strip()
    lines = [re.sub(r"\s+", " ", line).strip(" \t-–—") for line in first_page.splitlines()]
    ignored = re.compile(r"(?i)^(?:doi|https?://|received\b|accepted\b|published\b|copyright|abstract|摘要|关键词|key words|keywords|\d{1,4}\s*$)")
    stop = re.compile(
        r"(?i)^(?:abstract\b|summary\b|introduction\b|background\b|摘要\b|关键词\b|"
        r"引言\b|前言\b|contents?\b|outline\b)"
    )
    candidates: list[str] = []
    for line in lines:
        if not line or ignored.search(line) or DOI_RE.search(line) or PATENT_NO_RE.search(line):
            continue
        if candidates and stop.search(line):
            break
        if len(line) < 8:
            continue
        if re.search(r"(?i)^(?:authors?|correspondence|journal|vol(?:ume)?\.?\s+\d|www\.)", line):
            continue
        candidates.append(line)
        if len(" ".join(candidates)) >= 260 or len(candidates) >= 4:
            break
    return " ".join(candidates)[:500]


def _crossref(doi: str) -> dict[str, Any]:
    url = "https://api.crossref.org/works/" + urllib.parse.quote(doi, safe="")
    request = urllib.request.Request(url, headers={"User-Agent": "LocalLiteratureWorkbench/1.0 (metadata lookup)"})
    with urllib.request.urlopen(request, timeout=15) as response:
        data = json.loads(response.read(2_000_000).decode("utf-8"))
    return data["message"]


def _crossref_title(title: str, first_page: str = "") -> dict[str, Any] | None:
    """Resolve a DOI from a title for author manuscripts without an embedded DOI."""
    lines = [re.sub(r"\s+", " ", line).strip() for line in first_page.splitlines()]
    lines = [line for line in lines if len(line) >= 8 and not DOI_RE.search(line)]
    queries = [" ".join(lines[:count]) for count in (2, 3) if len(lines) >= count]
    queries.append(title[:500])
    for candidate in dict.fromkeys(queries):
        query = urllib.parse.urlencode({"query.title": candidate[:500], "rows": 10,
                                        "select": "DOI,title,type"})
        request = urllib.request.Request(
            f"https://api.crossref.org/works?{query}",
            headers={"User-Agent": "LocalLiteratureWorkbench/1.0 (metadata lookup)"},
        )
        with urllib.request.urlopen(request, timeout=15) as response:
            data = json.loads(response.read(2_000_000).decode("utf-8"))
        for item in data.get("message", {}).get("items", []):
            remote_title = " ".join(item.get("title") or [])
            if (item.get("type") == "journal-article" and item.get("DOI")
                    and _title_match(candidate, remote_title)):
                return _crossref(str(item["DOI"]))
    return None


def _abstract(value: str) -> str:
    return re.sub(r"\s+", " ", _strip_markup(value or "")).strip()


def _crossref_metadata(item: dict[str, Any]) -> dict[str, Any]:
    authors = item.get("author") or []
    creators = [{"creatorType": "author", "firstName": a.get("given", ""), "lastName": a.get("family", "")}
                for a in authors if a.get("given") or a.get("family")]
    issued = item.get("issued", {}).get("date-parts", [[]])
    date = "-".join(map(str, issued[0])) if issued and issued[0] else ""
    return {"itemType": "journalArticle", "title": " ".join(item.get("title") or []),
            "DOI": item.get("DOI", ""), "creators": creators, "date": date,
            "publicationTitle": " ".join(item.get("container-title") or []),
            "abstractNote": _abstract(item.get("abstract", "")), "patentNumber": ""}


def _classify(title: str, abstract: str, is_patent: bool = False) -> tuple[str, list[str], str]:
    if is_patent:
        return "专利技术", _keywords(title, abstract), "专利首页公开号与专利标志"
    haystack = f"{title} {abstract}".casefold()
    scores = {name: sum(1 for term in terms.split() if term.casefold() in haystack)
              for name, terms in _CATEGORY_TERMS.items()}
    ranked = sorted(scores.items(), key=lambda row: row[1], reverse=True)
    if ranked and ranked[0][1] >= 2 and (len(ranked) == 1 or ranked[0][1] > ranked[1][1]):
        return ranked[0][0], _keywords(title, abstract), "题名和摘要主题词"
    return "研究方法与工具", _keywords(title, abstract), "分类线索不足，类别待核对"


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
        r"实验步骤\s*–|实验步骤\s*[-—]|细胞转染及蛋白表达|亲和层析|蛋白纯化|活性检测|引物设计|pcr引物设计",
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
            epub_title = ""
        else:
            text, first_page, epub_title = _safe_epub_text(file_path)
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
    if not local_title:
        result["reason"] = "未能从首页提取题名，需人工核对。"
        result["basis"] = "本地首页题名待核对"
        return result
    doi = _first_doi(first_page)
    try:
        if doi:
            remote = _crossref(doi)
            if remote.get("type") != "journal-article":
                journal_version = _crossref_title(local_title, first_page)
                if journal_version:
                    remote = journal_version
                    doi = ""
        else:
            remote = _crossref_title(local_title, first_page)
    except (urllib.error.URLError, TimeoutError, OSError, ValueError, KeyError, json.JSONDecodeError) as exc:
        detail = f"首页 DOI 为 {doi}，" if doi else "首页未发现 DOI，已按题名查询，"
        result["reason"] = f"{detail}Crossref 查询失败，可稍后重试：{type(exc).__name__}。"
        result["basis"] = "本地首页；Crossref 暂不可用"
        return result
    if not remote:
        result["reason"] = "首页未发现 DOI，按题名也未匹配到 Crossref 期刊文章。"
        result["basis"] = "本地首页与 Crossref 题名检索"
        return result
    result["metadata"] = _crossref_metadata(remote)
    returned_doi = _clean_doi(str(remote.get("DOI", "")))
    if doi and returned_doi != doi:
        result["reason"] = "Crossref 返回的 DOI 与首页 DOI 不一致，需人工核对。"
        result["basis"] = "本地首页 DOI 与 Crossref 返回 DOI 不匹配"
        return result
    result["metadata"]["DOI"] = returned_doi
    result["sourceURL"] = f"https://doi.org/{returned_doi}"
    remote_title = result["metadata"]["title"]
    if remote.get("type") != "journal-article":
        result["reason"] = f"DOI 元数据类型为 {remote.get('type') or '未知'}，不是期刊文章，需核对。"
        result["basis"] = "Crossref DOI元数据类型"
        return result
    if not _title_match(local_title, remote_title):
        result["reason"] = f"首页题名与 DOI 元数据题名不匹配（本地：{local_title[:100]}），疑似引用 DOI，需核对。"
        result["basis"] = "首页 DOI 与 Crossref 题名不匹配"
        return result
    if doi:
        result["status"] = "ready"
        result["reason"] = "首页 DOI、Crossref 期刊文章类型和题名均匹配。"
        result["basis"] = "本地首页；Crossref DOI元数据"
    else:
        result["reason"] = "题名与 Crossref 期刊文章匹配，但首页没有 DOI；请确认全文后可手动导入。"
        result["basis"] = "本地首页题名；Crossref 题名检索；仅题名匹配"
    result["category"], result["keywords"], category_basis = _classify(remote_title, result["metadata"]["abstractNote"])
    if category_basis.startswith("分类线索不足"):
        result["reason"] += " 主题线索不足，分类待核对。"
    result["basis"] += f"；{category_basis}"
    return result

