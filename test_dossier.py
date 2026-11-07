import sqlite3
import tempfile
import threading
import time
import unittest

from dossier import (DossierError, DossierStore, repair_dossier_references,
                     validate_dossier, validate_reading_decision)


EVIDENCE = [
    {"id": "E1", "page": 2, "text": "The reported assay measured the primary endpoint."},
    {"id": "E2", "page": 3, "text": "The authors observed a reproducible increase."},
]


def fixture_value():
    return {
        "readingDecision": {
            "decision": "read",
            "fit": "Relevant to the current question.",
            "focus": ["Methods", "Endpoint"],
            "concerns": ["Single cohort"],
            "nextAction": "Check the control arm.",
        },
        "outline": [{
            "heading": "Results",
            "purpose": "Identify the central finding.",
            "keyPoint": "The endpoint increased [E2].",
            "evidenceIds": ["E2"],
        }],
        "argument": [
            {"role": "method", "statement": "The assay measured the endpoint.", "status": "author_stated", "evidenceIds": ["E1"]},
            {"role": "implication", "statement": "The finding may inform follow-up work.", "status": "inferred", "evidenceIds": []},
        ],
        "methodsAudit": [{
            "aspect": "Controls",
            "observation": "The assay design was reported.",
            "status": "reported",
            "evidenceIds": ["E1"],
        }],
        "reusableNotes": [{
            "type": "insight",
            "text": "The result is tied to the reported endpoint.",
            "evidenceIds": ["E2"],
        }],
    }


class DossierValidationTests(unittest.TestCase):
    def test_reading_decision_is_normalized_and_optional(self):
        self.assertIsNone(validate_reading_decision(None))
        value = validate_reading_decision({
            "decision": "deep_read", "fit": "  Strong fit  ",
            "focus": ["Question", "", "Evidence"], "concerns": ["Controls"],
            "nextAction": "Read methods",
        })
        self.assertEqual(value["decision"], "deep_read")
        self.assertEqual(value["fit"], "Strong fit")
        self.assertEqual(value["focus"], ["Question", "Evidence"])
        with self.assertRaises(DossierError):
            validate_reading_decision({"decision": "must_read"})

    def test_dossier_derives_pages_and_coverage_from_supplied_evidence(self):
        value = validate_dossier(fixture_value(), EVIDENCE)
        self.assertEqual(value["outline"][0]["pageStart"], 3)
        self.assertEqual(value["argument"][0]["pages"], [2])
        self.assertEqual(value["coverage"], {"items": 5, "withEvidence": 4, "inferred": 1})
        self.assertEqual(value["readingDecision"]["focus"], ["Methods", "Endpoint"])

    def test_dossier_repairs_unknown_evidence_and_ungrounded_author_claim(self):
        bad = fixture_value()
        bad["outline"][0]["evidenceIds"] = ["E99"]
        repaired, warnings = repair_dossier_references(bad, EVIDENCE)
        self.assertEqual(warnings["rejectedEvidenceIds"], ["E99"])
        self.assertEqual(warnings["droppedItems"], 1)
        self.assertEqual(repaired["outline"], [])
        with self.assertRaisesRegex(DossierError, "未提供"):
            validate_dossier(fixture_value() | {
                "outline": [{**fixture_value()["outline"][0], "evidenceIds": ["E99"]}],
            }, EVIDENCE)

        unsupported = fixture_value()
        unsupported["argument"][0]["evidenceIds"] = []
        with self.assertRaisesRegex(DossierError, "作者原述"):
            validate_dossier(unsupported, EVIDENCE)
        repaired, warnings = repair_dossier_references(unsupported, EVIDENCE)
        self.assertEqual(repaired["argument"][0]["status"], "inferred")
        self.assertEqual(warnings["downgradedItems"], 1)
        self.assertEqual(validate_dossier(repaired, EVIDENCE)["argument"][0]["status"], "inferred")

    def test_store_is_version_bound_and_reports_stale(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        db = sqlite3.connect(":memory:")
        db.row_factory = sqlite3.Row
        self.addCleanup(db.close)
        store = DossierStore(db, threading.RLock())
        value = validate_dossier(fixture_value(), EVIDENCE)
        created = store.save("DOC1", "sha-current", "zh", value)
        current = store.get("DOC1", "sha-current")
        self.assertEqual(current["pdfVersion"], "sha-current")
        self.assertFalse(current["stale"])
        self.assertGreater(current["created"], 0)
        self.assertEqual(store.summaries({"DOC1": "sha-current"})["DOC1"]["argument"], 2)
        self.assertTrue(store.get("DOC1", "sha-new")["stale"])
        self.assertEqual(store.summaries({"DOC1": "sha-new"}), {})


if __name__ == "__main__":
    unittest.main()
