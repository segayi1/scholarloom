import csv
import io
import json
import sqlite3
import threading
import unittest

from matrix import EvidenceMatrixStore, FIELDS


class EvidenceMatrixTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.row_factory = sqlite3.Row
        self.addCleanup(self.db.close)
        self.store = EvidenceMatrixStore(self.db, threading.RLock())

    def generated(self, value, quote, version="v1", status="supported"):
        return {"value": value, "status": status, "sources": [
            {"paper": "P1", "version": version, "page": 4, "quote": quote}]}

    def test_project_isolation_and_paper_limit(self):
        self.store.merge_generated("topic-a", ["P1", "P2"], {})
        self.store.save_edit("topic-a", "P1", "sample", "edited sample")
        self.assertIsNone(self.store.load("topic-b"))
        with self.assertRaises(ValueError):
            self.store.merge_generated("topic-b", ["P1"], {})
        with self.assertRaises(ValueError):
            self.store.merge_generated("topic-a", ["P1", "P1"], {})
        with self.assertRaises(ValueError):
            self.store.merge_generated("topic-a", ["P1", 2], {})
        with self.assertRaises(ValueError):
            self.store.save_edit("topic-b", "P1", "sample", "outside project")

    def test_edit_and_sources_survive_regeneration(self):
        self.store.merge_generated("topic", ["P1", "P2"], {
            "P1": {"results": self.generated("generated result", "original value was 3 units")}})
        self.store.save_edit("topic", "P1", "results", "human corrected result")
        self.store.merge_generated("topic", ["P1", "P2"], {
            "P1": {"results": self.generated("regenerated result", "updated result was 5 units", "v2")}})
        cell = self.store.load("topic")["cells"]["P1"]["results"]
        self.assertEqual(cell["generated"]["value"], "regenerated result")
        self.assertEqual(cell["revision"]["value"], "human corrected result")
        self.assertEqual(cell["value"], "human corrected result")
        self.assertEqual({s["version"] for s in cell["sources"]}, {"v1"})
        self.assertEqual({s["version"] for s in cell["generated"]["sources"]}, {"v2"})
        self.assertEqual(cell['status'], 'unknown')
        self.store.save_edit('topic', 'P1', 'results', 'revised again', 'unknown')
        self.assertEqual(self.store.load('topic')['cells']['P1']['results']['sources'][0]['version'], 'v1')
        exported = list(csv.DictReader(io.StringIO(self.store.export_csv('topic'))))
        row = next(row for row in exported if row['paper_id'] == 'P1' and row['field'] == 'results')
        self.assertEqual(json.loads(row['generated_sources'])[0]['version'], 'v2')
        self.assertEqual(json.loads(row['revision_sources'])[0]['version'], 'v1')
        self.assertIn('regenerated result', self.store.export_markdown('topic'))
        self.assertIn('revised again', self.store.export_markdown('topic'))
        self.store.save_edit("topic", "P1", "results", None)
        self.assertEqual(self.store.load("topic")["cells"]["P1"]["results"]["value"], "regenerated result")

    def test_unknown_and_explicit_missing_conflict_and_provenance_exports(self):
        self.store.merge_generated("topic", ["P1", "P2"], {
            "P1": {
                "results": self.generated("Opposite outcome", "No difference was observed", status="conflict"),
            }})
        self.store.save_edit('topic', 'P1', 'sample', '', 'not_reported')
        matrix = self.store.load("topic")
        self.assertEqual(matrix["cells"]["P2"]["method"]["status"], "unknown")
        self.assertEqual(matrix["cells"]["P1"]["sample"]["status"], "not_reported")
        self.assertEqual(matrix["cells"]["P1"]["results"]["sources"][0], {
            "paper": "P1", "version": "v1", "page": 4, "quote": "No difference was observed"})
        markdown = self.store.export_markdown("topic")
        self.assertIn("not_reported", markdown)
        self.assertIn("P1 version v1 p.4", markdown)
        rows = list(csv.DictReader(io.StringIO(self.store.export_csv("topic"))))
        results = next(row for row in rows if row["paper_id"] == "P1" and row["field"] == "results")
        self.assertEqual(results["status"], "conflict")
        self.assertEqual(json.loads(results["sources"])[0]["quote"], "No difference was observed")
        self.assertEqual(len(rows), 2 * len(FIELDS))

    def test_rejects_unselected_or_incomplete_sources(self):
        with self.assertRaises(ValueError):
            self.store.merge_generated('topic', ['P1','P2'], {'P1': {'sample': {'status':'not_reported'}}})
        with self.assertRaises(ValueError):
            self.store.merge_generated('topic', ['P1','P2'], {'P1': {'sample': {'value':'x','status':'supported'}}})
        self.store.merge_generated('topic', ['P1','P2'], {})
        with self.assertRaises(ValueError):
            self.store.save_edit('topic', 'P1', 'sample', 'claim', 'supported')
        with self.assertRaises(ValueError):
            self.store.merge_generated("topic", ["P1", "P2"], {"P1": {
                "results": {"value": "x", "sources": [
                    {"paper": "P3", "version": "v1", "page": 1, "quote": "text"}]}}})
        with self.assertRaises(ValueError):
            self.store.merge_generated("topic", ["P1", "P2"], {"P1": {
                "results": {"value": "x", "sources": [
                    {"paper": "P1", "version": "v1", "quote": "text"}]}}})


    def test_citation_warning_survives_edit_and_exports(self):
        cell = self.generated('A claim', 'A source', status='unknown')
        cell['citationValidation'] = {'rejectedCount': 1, 'rejectedIds': ['E999']}
        self.store.merge_generated('topic', ['P1', 'P2'], {'P1': {'sample': cell}})
        self.store.save_edit('topic', 'P1', 'sample', 'Human revision', 'unknown')
        loaded = self.store.load('topic')['cells']['P1']['sample']
        self.assertEqual(loaded['generated']['citationValidation'], cell['citationValidation'])
        self.assertNotIn('citationValidation', loaded['revision'])
        exported = list(csv.DictReader(io.StringIO(self.store.export_csv('topic'))))
        row = next(row for row in exported if row['paper_id'] == 'P1' and row['field'] == 'sample')
        self.assertEqual(json.loads(row['generated_citation_validation']), cell['citationValidation'])
        self.assertIn('E999', self.store.export_markdown('topic'))
        cell['citationValidation'] = {'rejectedCount': 0, 'rejectedIds': ['E999']}
        with self.assertRaises(ValueError):
            self.store.merge_generated('topic', ['P1', 'P2'], {'P1': {'sample': cell}})


if __name__ == "__main__":
    unittest.main()
