"""Small, source-linked literature context lookup for reader questions."""

from urllib.parse import urlparse

import pipeline


MAX_SOURCES = 5
MAX_ABSTRACT_LENGTH = 1200


def search_literature_context(question: str) -> dict:
    """Return bounded bibliographic sources for a question, without model calls."""
    try:
        results = pipeline.search_external_literature(question, limit=MAX_SOURCES)
    except (TypeError, ValueError, OSError) as exc:
        return {"status": "error", "sources": [], "error": str(exc)}
    except Exception:
        return {"status": "error", "sources": [], "error": "Literature search failed."}

    sources = []
    for result in results:
        title = str(result.get("title") or "").strip()
        url = str(result.get("sourceURL") or "").strip()
        parsed = urlparse(url)
        if not title or parsed.scheme not in {"http", "https"} or not parsed.netloc:
            continue
        source = {"title": title, "url": url}
        abstract = str(result.get("abstract") or "").strip()
        if abstract:
            source["abstract"] = abstract[:MAX_ABSTRACT_LENGTH]
        for field in ("authors", "year", "venue", "doi", "provider"):
            value = result.get(field)
            if value:
                source[field] = value
        sources.append(source)
        if len(sources) == MAX_SOURCES:
            break

    if not sources:
        return {"status": "no_results", "sources": [], "error": None}
    return {"status": "ok", "sources": sources, "error": None}
