"""Project-scoped, editable cross-paper evidence matrices."""

import csv
import io
import json

from memory import scope


FIELDS = ("research_question", "sample", "method", "controls", "endpoint", "results", "limitations")
STATUSES = ("supported", "not_found", "not_reported", "unknown", "conflict", "incomparable")
MAX_PAPERS = 12


def _papers(values):
    if not isinstance(values, list) or not 2 <= len(values) <= MAX_PAPERS:
        raise ValueError("A matrix must contain 2-12 paper IDs.")
    if any(not isinstance(value, str) for value in values):
        raise ValueError("Paper IDs must be text.")
    papers = [value.strip() for value in values]
    if any(not paper or len(paper) > 120 for paper in papers) or len(set(papers)) != len(papers):
        raise ValueError("Paper IDs must be unique, non-empty, and at most 120 characters.")
    return papers


def _sources(values, papers):
    if not isinstance(values, list) or len(values) > 30:
        raise ValueError("Sources must be a list of at most 30 records.")
    result = []
    for source in values:
        if not isinstance(source, dict):
            raise ValueError("Invalid source record.")
        paper = str(source.get("paper") or "").strip()
        version = str(source.get("version") or "").strip()
        quote = str(source.get("quote") or "").strip()
        page = source.get("page")
        if paper not in papers or not version or len(version) > 200 or not quote or len(quote) > 6000:
            raise ValueError("Source must identify a selected paper, version, page, and quote.")
        if type(page) is not int or page < 1:
            raise ValueError("Source page must be a positive integer.")
        clean = {"paper": paper, "version": version, "page": page, "quote": quote}
        if clean not in result:
            result.append(clean)
    return result


class EvidenceMatrixStore:
    """SQLite store; pass the application's shared connection and lock."""

    def __init__(self, db, lock):
        self.db, self.lock = db, lock
        with lock, db:
            db.execute("""CREATE TABLE IF NOT EXISTS evidence_matrices (
                project TEXT PRIMARY KEY, papers TEXT NOT NULL)""")
            db.execute("""CREATE TABLE IF NOT EXISTS evidence_matrix_cells (
                project TEXT NOT NULL, paper TEXT NOT NULL, field TEXT NOT NULL,
                generated TEXT NOT NULL, revision TEXT,
                PRIMARY KEY(project,paper,field))""")

    def load(self, project):
        project = scope(project)
        with self.lock:
            matrix = self.db.execute("SELECT papers FROM evidence_matrices WHERE project=?", (project,)).fetchone()
            if not matrix:
                return None
            papers = json.loads(matrix["papers"])
            rows = self.db.execute(
                "SELECT paper,field,generated,revision FROM evidence_matrix_cells WHERE project=? ORDER BY paper,field",
                (project,)).fetchall()
        cells = {paper: {} for paper in papers}
        for row in rows:
            if row["paper"] not in cells:
                continue
            generated = json.loads(row["generated"])
            revision = json.loads(row["revision"]) if row["revision"] else None
            cells[row["paper"]][row["field"]] = {
                "generated": generated,
                "revision": revision,
                "value": revision["value"] if revision else generated["value"],
                "status": (revision.get("status") or generated["status"]) if revision else generated["status"],
                "sources": revision.get("sources", []) if revision else generated["sources"],
            }
        for paper in papers:
            for field in FIELDS:
                cells[paper].setdefault(field, {
                    "generated": {"value": "", "status": "unknown", "sources": []},
                    "revision": None, "value": "", "status": "unknown", "sources": [],
                })
        return {"project": project, "papers": papers, "cells": cells}

    def merge_generated(self, project, paper_ids, rows):
        """Set selected papers and merge {paper: {field: {value,status,sources}}} output."""
        project, papers = scope(project), _papers(paper_ids)
        if not isinstance(rows, dict) or set(rows) - set(papers):
            raise ValueError("Generated rows must be keyed by selected paper IDs.")
        prepared = {}
        for paper, row in rows.items():
            if not isinstance(row, dict) or set(row) - set(FIELDS):
                raise ValueError("Generated rows contain an unknown field.")
            for field, cell in row.items():
                if not isinstance(cell, dict):
                    raise ValueError("Generated cells must be objects.")
                value = cell.get("value", "")
                status = cell.get("status", "unknown")
                if not isinstance(value, str) or len(value) > 6000 or status not in STATUSES:
                    raise ValueError("Invalid generated cell value or status.")
                sources = _sources(cell.get("sources", []), papers)
                if status == 'not_reported':
                    raise ValueError('Only a human review can mark a field as not reported.')
                if status == 'supported' and not sources:
                    raise ValueError('A supported cell requires a source.')
                if any(source['paper'] != paper for source in sources):
                    raise ValueError('A paper cell must cite its own source.')
                prepared[(paper, field)] = {"value": value.strip(), "status": status, "sources": sources}
                validation = cell.get('citationValidation')
                if validation is not None:
                    if (not isinstance(validation, dict) or type(validation.get('rejectedCount')) is not int
                            or validation['rejectedCount'] < 1 or not isinstance(validation.get('rejectedIds'), list)
                            or len(validation['rejectedIds']) > min(30, validation['rejectedCount'])
                            or any(not isinstance(identifier, str) or len(identifier) > 120 for identifier in validation['rejectedIds'])):
                        raise ValueError('Invalid citation validation metadata.')
                    prepared[(paper, field)]['citationValidation'] = validation
        with self.lock, self.db:
            self.db.execute("INSERT OR IGNORE INTO evidence_matrices VALUES (?,?)",
                            (project, json.dumps(papers, ensure_ascii=False)))
            self.db.execute("UPDATE evidence_matrices SET papers=? WHERE project=?",
                            (json.dumps(papers, ensure_ascii=False), project))
            for (paper, field), generated in prepared.items():
                old = self.db.execute(
                    "SELECT generated,revision FROM evidence_matrix_cells WHERE project=? AND paper=? AND field=?",
                    (project, paper, field)).fetchone()
                if old:
                    self.db.execute("UPDATE evidence_matrix_cells SET generated=? WHERE project=? AND paper=? AND field=?",
                                    (json.dumps(generated, ensure_ascii=False), project, paper, field))
                else:
                    self.db.execute("INSERT INTO evidence_matrix_cells VALUES (?,?,?,?,NULL)",
                                    (project, paper, field, json.dumps(generated, ensure_ascii=False)))
        return self.load(project)

    def save_edit(self, project, paper, field, value, status=None):
        """Save a human value/status; a missing status is unknown; None clears the edit."""
        project = scope(project)
        if field not in FIELDS or not isinstance(paper, str) or not paper:
            raise ValueError("Unknown paper or matrix field.")
        if value is not None and (not isinstance(value, str) or len(value) > 6000):
            raise ValueError("Revision must be text of at most 6000 characters, or None to clear it.")
        if status is not None and status not in STATUSES:
            raise ValueError("Unknown evidence status.")
        with self.lock, self.db:
            matrix = self.db.execute("SELECT papers FROM evidence_matrices WHERE project=?", (project,)).fetchone()
            if not matrix or paper not in json.loads(matrix["papers"]):
                raise ValueError("Paper is not selected in this project matrix.")
            row = self.db.execute(
                "SELECT generated,revision FROM evidence_matrix_cells WHERE project=? AND paper=? AND field=?",
                (project, paper, field)).fetchone()
            generated = json.loads(row["generated"]) if row else {"value": "", "status": "unknown", "sources": []}
            old_revision = json.loads(row['revision']) if row and row['revision'] else None
            sources = old_revision.get('sources', []) if old_revision else generated['sources']
            if status == 'supported' and not sources:
                raise ValueError('A supported cell requires a source.')
            revision = None if value is None and status is None else {
                "value": value.strip() if value is not None else generated["value"],
                "status": status or 'unknown', "sources": sources}
            self.db.execute("""INSERT INTO evidence_matrix_cells VALUES (?,?,?,?,?)
                ON CONFLICT(project,paper,field) DO UPDATE SET revision=excluded.revision""",
                (project, paper, field, json.dumps(generated, ensure_ascii=False),
                 json.dumps(revision, ensure_ascii=False) if revision is not None else None))
        return self.load(project)["cells"][paper][field]

    def export_markdown(self, project, matrix=None):
        matrix = matrix if matrix is not None else self.load(project)
        if not matrix:
            return ""
        esc = lambda value: str(value).replace("|", "\\|").replace("\r", "").replace("\n", "<br>")
        lines = ["| Paper | Field | Generated | Edited | Status | Generated sources | Edited sources | Generated citation validation |", "|---|---|---|---|---|---|---|---|"]
        for paper in matrix["papers"]:
            for field in FIELDS:
                cell = matrix["cells"][paper][field]
                def sources(items):
                    return "<br>".join(f'{s["paper"]} version {s["version"]} p.{s["page"]}{" (outdated)" if s.get("stale") else ""}: “{s["quote"]}”' for s in items)
                revision = cell['revision']
                lines.append("| " + " | ".join(map(esc, (paper, field, cell['generated']['value'],
                    revision['value'] if revision else '', cell['status'], sources(cell['generated']['sources']),
                    sources(revision.get('sources', [])) if revision else '',
                    json.dumps(cell['generated'].get('citationValidation', {}), ensure_ascii=False)))) + " |")
        return "\n".join(lines)

    def export_csv(self, project, matrix=None):
        matrix = matrix if matrix is not None else self.load(project)
        output = io.StringIO(newline="")
        writer = csv.writer(output)
        writer.writerow(("project", "paper_id", "field", "generated_value", "revision_value", "value", "status", "sources", "generated_sources", "revision_sources", "generated_citation_validation"))
        if matrix:
            for paper in matrix["papers"]:
                for field in FIELDS:
                    cell = matrix["cells"][paper][field]
                    writer.writerow((matrix["project"], paper, field, cell["generated"]["value"],
                                     cell["revision"]["value"] if cell["revision"] else "", cell["value"],
                                     cell["status"], json.dumps(cell["sources"], ensure_ascii=False),
                                     json.dumps(cell['generated']['sources'], ensure_ascii=False),
                                     json.dumps(cell['revision'].get('sources', []) if cell['revision'] else [], ensure_ascii=False),
                                     json.dumps(cell['generated'].get('citationValidation', {}), ensure_ascii=False)))
        return output.getvalue()
