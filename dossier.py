import json
import re
import time


DECISIONS = ("deep_read", "read", "skim", "reference")
ARGUMENT_ROLES = ("context", "question", "method", "finding", "mechanism", "limitation", "implication")
ARGUMENT_STATUSES = ("author_stated", "inferred")
METHOD_STATUSES = ("reported", "unclear", "missing")
NOTE_TYPES = ("insight", "question", "method", "quote", "followup")


class DossierError(ValueError):
    pass


def _clean(value, limit=2000):
    if not isinstance(value, str):
        return ""
    return re.sub(r"\s+", " ", value).strip()[:limit]


def _evidence_ids(value, evidence):
    if not isinstance(value, list):
        raise DossierError("深读档案的引用格式无效，请重试。")
    result = []
    for item in value[:8]:
        identifier = str(item or "").strip().upper()
        if not re.fullmatch(r"E\d+", identifier) or identifier not in evidence:
            raise DossierError("深读档案引用了未提供的原文证据，请重试。")
        if identifier not in result:
            result.append(identifier)
    return result


def _pages(ids, evidence):
    return sorted({int(evidence[identifier]["page"]) for identifier in ids})


def validate_reading_decision(value, required=False):
    if value is None and not required:
        return None
    if not isinstance(value, dict):
        raise DossierError("阅读决策格式无效，请重试。")
    decision = _clean(value.get("decision"), 40)
    if decision not in DECISIONS:
        raise DossierError("阅读决策不在允许范围内。")
    focus = value.get("focus", [])
    concerns = value.get("concerns", [])
    if not isinstance(focus, list) or not isinstance(concerns, list):
        raise DossierError("阅读决策字段格式无效，请重试。")
    return {
        "decision": decision,
        "fit": _clean(value.get("fit"), 400),
        "focus": [_clean(item, 180) for item in focus[:5] if _clean(item, 180)],
        "concerns": [_clean(item, 180) for item in concerns[:5] if _clean(item, 180)],
        "nextAction": _clean(value.get("nextAction"), 400),
    }


def repair_dossier_references(value, evidence):
    """Remove invented source IDs while preserving the epistemic status."""
    if not isinstance(value, dict):
        return value, {"rejectedEvidenceIds": [], "droppedItems": 0, "downgradedItems": 0}
    known = {str(item["id"]).upper() for item in evidence}
    rejected = set()

    def retain(item):
        original = item.get("evidenceIds", [])
        if not isinstance(original, list):
            original = []
        ids = []
        for identifier in original:
            identifier = str(identifier or "").strip().upper()
            if identifier in known:
                if identifier not in ids:
                    ids.append(identifier)
            elif identifier:
                rejected.add(identifier)
        item["evidenceIds"] = ids
        return bool(ids)

    dropped = downgraded = 0
    outline = []
    for item in value.get("outline") or []:
        if isinstance(item, dict) and retain(item):
            outline.append(item)
        else:
            dropped += 1
    value["outline"] = outline

    argument = []
    for item in value.get("argument") or []:
        if not isinstance(item, dict):
            argument.append(item)
            continue
        grounded = retain(item)
        if item.get("status") == "author_stated" and not grounded:
            item["status"] = "inferred"
            downgraded += 1
        argument.append(item)
    value["argument"] = argument

    methods = []
    for item in value.get("methodsAudit") or []:
        if not isinstance(item, dict):
            methods.append(item)
            continue
        grounded = retain(item)
        if item.get("status") == "reported" and not grounded:
            item["status"] = "unclear"
            downgraded += 1
        methods.append(item)
    value["methodsAudit"] = methods

    notes = []
    for item in value.get("reusableNotes") or []:
        if isinstance(item, dict) and retain(item):
            notes.append(item)
        else:
            dropped += 1
    value["reusableNotes"] = notes
    return value, {
        "rejectedEvidenceIds": sorted(rejected),
        "droppedItems": dropped,
        "downgradedItems": downgraded,
    }


def validate_dossier(value, evidence):
    if not isinstance(value, dict):
        raise DossierError("深读档案格式不符合要求，请重试。")
    by_id = {str(item["id"]).upper(): item for item in evidence}

    def grounded(item, field):
        ids = _evidence_ids(item.get("evidenceIds", []), by_id)
        if not ids:
            raise DossierError(f"深读档案的{field}缺少原文证据。")
        item["evidenceIds"] = ids
        item["pages"] = _pages(ids, by_id)
        return item

    reading_decision = validate_reading_decision(value.get("readingDecision"), required=True)
    outline = []
    for item in (value.get("outline") or [])[:10]:
        if not isinstance(item, dict):
            raise DossierError("深读大纲格式无效，请重试。")
        item = grounded(item, "大纲")
        heading = _clean(item.get("heading"), 160)
        key_point = _clean(item.get("keyPoint"), 1200)
        if not heading or not key_point:
            raise DossierError("深读大纲缺少标题或要点。")
        outline.append({
            "heading": heading,
            "purpose": _clean(item.get("purpose"), 400),
            "pageStart": min(item["pages"]),
            "pageEnd": max(item["pages"]),
            "keyPoint": key_point,
            "evidenceIds": item["evidenceIds"],
        })
    if not outline:
        raise DossierError("深读档案未返回论文大纲。")

    argument = []
    for item in (value.get("argument") or [])[:12]:
        if not isinstance(item, dict):
            raise DossierError("论证链格式无效，请重试。")
        role = _clean(item.get("role"), 40)
        status = _clean(item.get("status"), 40)
        statement = _clean(item.get("statement"), 1600)
        if role not in ARGUMENT_ROLES or status not in ARGUMENT_STATUSES or not statement:
            raise DossierError("论证链字段格式无效，请重试。")
        ids = _evidence_ids(item.get("evidenceIds", []), by_id)
        if status == "author_stated" and not ids:
            raise DossierError("作者原述缺少原文证据。")
        argument.append({
            "role": role,
            "statement": statement,
            "status": status,
            "pages": _pages(ids, by_id),
            "evidenceIds": ids,
        })
    if not argument:
        raise DossierError("深读档案未返回论证链。")

    methods = []
    for item in (value.get("methodsAudit") or [])[:10]:
        if not isinstance(item, dict):
            raise DossierError("方法审查格式无效，请重试。")
        status = _clean(item.get("status"), 40)
        aspect = _clean(item.get("aspect"), 160)
        observation = _clean(item.get("observation"), 1200)
        if status not in METHOD_STATUSES or not aspect or not observation:
            raise DossierError("方法审查字段格式无效，请重试。")
        ids = _evidence_ids(item.get("evidenceIds", []), by_id)
        if status == "reported" and not ids:
            raise DossierError("已报告的方法信息缺少原文证据。")
        methods.append({
            "aspect": aspect,
            "observation": observation,
            "status": status,
            "pages": _pages(ids, by_id),
            "evidenceIds": ids,
        })

    notes = []
    for item in (value.get("reusableNotes") or [])[:12]:
        if not isinstance(item, dict):
            raise DossierError("复用笔记格式无效，请重试。")
        item = grounded(item, "复用笔记")
        note_type = _clean(item.get("type"), 40)
        text = _clean(item.get("text"), 1200)
        if note_type not in NOTE_TYPES or not text:
            raise DossierError("复用笔记字段格式无效，请重试。")
        notes.append({
            "type": note_type,
            "text": text,
            "pages": item["pages"],
            "evidenceIds": item["evidenceIds"],
        })

    grounded_items = outline + argument + methods + notes
    supported = sum(1 for item in grounded_items if item.get("evidenceIds"))
    return {
        "schemaVersion": 1,
        "generatedAt": int(time.time()),
        "readingDecision": reading_decision,
        "outline": outline,
        "argument": argument,
        "methodsAudit": methods,
        "reusableNotes": notes,
        "coverage": {
            "items": len(grounded_items),
            "withEvidence": supported,
            "inferred": sum(1 for item in argument if item["status"] == "inferred"),
        },
    }


class DossierStore:
    def __init__(self, db, lock):
        self.db, self.lock = db, lock
        with lock, db:
            db.execute("""CREATE TABLE IF NOT EXISTS dossiers (
                document TEXT PRIMARY KEY, pdf_version TEXT NOT NULL,
                language TEXT NOT NULL, value TEXT NOT NULL, created REAL NOT NULL)""")

    def save(self, document, pdf_version, language, value):
        created = time.time()
        with self.lock, self.db:
            self.db.execute(
                "INSERT OR REPLACE INTO dossiers VALUES (?,?,?,?,?)",
                (str(document), str(pdf_version), str(language), json.dumps(value, ensure_ascii=False), created),
            )
        return created

    def get(self, document, current_version=None):
        with self.lock:
            row = self.db.execute("SELECT * FROM dossiers WHERE document=?", (str(document),)).fetchone()
        if not row:
            return None
        try:
            value = json.loads(row["value"])
        except (TypeError, json.JSONDecodeError):
            return None
        return {
            "document": row["document"],
            "pdfVersion": row["pdf_version"],
            "language": row["language"],
            "created": row["created"],
            "stale": bool(current_version and current_version != row["pdf_version"]),
            "value": value,
        }

    def summaries(self, current_versions):
        result = {}
        for document, version in current_versions.items():
            item = self.get(document, version)
            if not item or item["stale"]:
                continue
            value = item["value"]
            result[document] = {
                "created": item["created"],
                "readingDecision": value.get("readingDecision", {}).get("decision"),
                "outline": len(value.get("outline", [])),
                "argument": len(value.get("argument", [])),
                "methodsAudit": len(value.get("methodsAudit", [])),
                "coverage": value.get("coverage", {}),
            }
        return result
