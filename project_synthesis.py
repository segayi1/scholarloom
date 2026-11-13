"""Persistent project-scoped comparison synthesis drafts."""

import json
import re

from memory import scope


MAX_MARKDOWN = 100000
MAX_SOURCES = 12


def normalize_synthesis(markdown, sources, language='zh'):
    passages = "\n".join(
        passage.get("quote", "")
        for source in sources if isinstance(source, dict)
        for passage in source.get("passages", []) if isinstance(passage, dict)
    )
    if "topflash" not in passages.casefold():
        markdown = re.sub(r"TOPFlash(?:\s*类)?\s*Wnt\s*报告(?:基因(?:检测)?)?", "Wnt 报告基因检测",
                          markdown, flags=re.I)
        markdown = re.sub(r"TOPFlash", "Wnt 报告基因检测", markdown, flags=re.I)
    if language == "zh":
        markdown = markdown.replace("通路显著激活", "相关功能类别富集；原文描述为 activation")
        markdown = markdown.replace("均显著激活细胞因子活性", "均富集细胞因子活性")
        markdown = markdown.replace("显著激活", "报告为激活")
        markdown = markdown.replace(
            "均激活细胞因子活性、炎症与抗菌防御反应通路",
            "细胞因子活性、炎症与抗菌防御反应相关功能类别富集",
        )
        markdown = markdown.replace("但激活的基因集不同", "但涉及基因集不同")
        markdown = markdown.replace("但两类细胞激活的基因集不同", "但两类细胞涉及的基因集不同")
        markdown = markdown.replace("细胞类型激活的基因集不同", "细胞类型涉及的基因集不同")
        markdown = markdown.replace("两个文库", "ENZO 与 Prestwick 两个化合物库")
        markdown = re.sub(r"\*\*P(\d+) 未([^*]+)\*\*", r"**所给材料未见 P\1 \2**", markdown)
        markdown = markdown.replace("P2 未检测 Wnt 通路", "所给材料未见 P2 检测 Wnt 通路的记录")
        markdown = markdown.replace("P2 的损伤转录数据未检测 Wnt 通路",
                                    "所给材料未见 P2 的损伤转录数据检测 Wnt 通路")
        markdown = markdown.replace("P2 未测量增殖本身", "所给引文未提供 P2 的直接增殖测量")
        markdown = markdown.replace("P1 未在损伤模型中检验", "所给材料未见 P1 在损伤模型中检验")
        markdown = markdown.replace(
            "P2 不使用任何 Wnt 配体、抑制剂或激活剂",
            "所给材料中 P2 未涉及 Wnt 配体、抑制剂或激活剂",
        )
        markdown = markdown.replace("P1 未报告损伤模型", "所给材料未见 P1 报告损伤模型")
    return markdown


def _snapshot(value):
    if not isinstance(value, dict):
        raise ValueError("Synthesis snapshot must be an object.")
    markdown, sources, keys, focus = (value.get(name) for name in ("markdown", "sources", "keys", "focus"))
    if not isinstance(markdown, str) or len(markdown) > MAX_MARKDOWN:
        raise ValueError("Synthesis markdown must be text of at most 100000 characters.")
    if not isinstance(sources, list) or len(sources) > MAX_SOURCES:
        raise ValueError("Synthesis sources must be a list of at most 12 records.")
    if not isinstance(keys, list) or len(keys) > MAX_SOURCES or any(not isinstance(key, str) or not key or len(key) > 120 for key in keys):
        raise ValueError("Synthesis keys must contain at most 12 valid paper IDs.")
    if len(set(keys)) != len(keys):
        raise ValueError("Synthesis paper IDs must be unique.")
    if not isinstance(focus, str) or len(focus) > 1000:
        raise ValueError("Synthesis focus must be text of at most 1000 characters.")
    clean_sources = []
    for index, source in enumerate(sources, 1):
        if (not isinstance(source, dict) or source.get("id") != f"P{index}"
                or source.get("key") != (keys[index - 1] if index <= len(keys) else None)
                or not isinstance(source.get("title"), str) or len(source["title"]) > 2000):
            raise ValueError("Synthesis source mapping does not match its paper IDs.")
        clean = {"id": source["id"], "key": source["key"], "title": source["title"]}
        if "zoteroLinked" in source:
            if type(source["zoteroLinked"]) is not bool:
                raise ValueError("Invalid Zotero link state.")
            clean["zoteroLinked"] = source["zoteroLinked"]
        if "basis" in source:
            if source["basis"] not in ("full_text", "reading_card", "metadata_only"):
                raise ValueError("Invalid synthesis evidence basis.")
            clean["basis"] = source["basis"]
        if "passages" in source:
            passages = source["passages"]
            if not isinstance(passages, list) or len(passages) > 12:
                raise ValueError("Invalid synthesis passages.")
            clean["passages"] = []
            for number, passage in enumerate(passages, 1):
                if (not isinstance(passage, dict) or passage.get("id") != f"P{index}E{number}"
                        or type(passage.get("page")) is not int or passage["page"] < 1
                        or not isinstance(passage.get("quote"), str) or not 3 <= len(passage["quote"]) <= 1800
                        or not isinstance(passage.get("version"), str) or not 1 <= len(passage["version"]) <= 200):
                    raise ValueError("Invalid synthesis passage.")
                clean["passages"].append({key: passage[key] for key in ("id", "page", "quote", "version")})
        clean_sources.append(clean)
    if len(clean_sources) != len(keys):
        raise ValueError("Synthesis sources must map every paper ID.")
    return {"markdown": markdown, "sources": clean_sources, "keys": list(keys), "focus": focus}


class ProjectSynthesisStore:
    def __init__(self, db, lock):
        self.db, self.lock = db, lock
        with lock, db:
            db.execute("""CREATE TABLE IF NOT EXISTS project_synthesis (
                project TEXT PRIMARY KEY, generated TEXT, revision TEXT)""")

    def get(self, project):
        project = scope(project)
        with self.lock:
            row = self.db.execute("SELECT generated,revision FROM project_synthesis WHERE project=?", (project,)).fetchone()
        if not row:
            return None
        if not row["generated"] and not row["revision"]:
            return None
        return {"project": project,
                "generated": json.loads(row["generated"]) if row["generated"] else None,
                "revision": json.loads(row["revision"]) if row["revision"] else None}

    def save_generated(self, project, generated):
        project, generated = scope(project), _snapshot(generated)
        with self.lock, self.db:
            self.db.execute("""INSERT INTO project_synthesis(project,generated,revision) VALUES (?, ?, NULL)
                ON CONFLICT(project) DO UPDATE SET generated=excluded.generated""",
                (project, json.dumps(generated, ensure_ascii=False)))
        return self.get(project)

    def edit(self, project, markdown, use_generated=False, base=None):
        project = scope(project)
        if not isinstance(markdown, (str, type(None))) or (isinstance(markdown, str) and len(markdown) > MAX_MARKDOWN):
            raise ValueError("Revision must be null or text of at most 100000 characters.")
        if type(use_generated) is not bool:
            raise ValueError("use_generated must be a boolean.")
        if base is not None:
            base = _snapshot(base)
        with self.lock, self.db:
            row = self.db.execute("SELECT generated,revision FROM project_synthesis WHERE project=?", (project,)).fetchone()
            if markdown is None:
                revision = None
            else:
                generated = json.loads(row["generated"]) if row and row["generated"] else None
                current = json.loads(row["revision"]) if row and row["revision"] else None
                source = base if base is not None else (generated if use_generated or current is None else current)
                revision = {"markdown": markdown,
                            "sources": source["sources"] if source else [],
                            "keys": source["keys"] if source else [],
                            "focus": source["focus"] if source else ""}
            if row:
                self.db.execute("UPDATE project_synthesis SET revision=? WHERE project=?",
                                (json.dumps(revision, ensure_ascii=False) if revision is not None else None, project))
            elif revision is not None:
                self.db.execute("INSERT INTO project_synthesis(project,generated,revision) VALUES (?,NULL,?)",
                                (project, json.dumps(revision, ensure_ascii=False)))
        return self.get(project)
