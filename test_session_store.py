import os
import sqlite3
import tempfile
import threading
import unittest

from memory import MemoryStore
from session_store import DEFAULT_SESSION, SessionStore


class SessionStoreTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.db.row_factory = sqlite3.Row
        self.addCleanup(self.db.close)
        self.lock = threading.RLock()
        self.memory = MemoryStore(self.db, self.lock)
        self.store = SessionStore(self.db, self.lock)

    def test_scope_rename_pagination_and_legacy_default(self):
        old = self.memory.add_event('A', 'P', 'user', 'Unmapped legacy question')
        first = self.store.create('A', 'P', 'First')
        second = self.store.create('A', 'P', 'Second')
        self.store.save_exchange('A', 'P', first['session_id'], 'Q1', 'A1')
        self.store.save_exchange('A', 'P', second['session_id'], 'Q2', 'A2')
        self.assertEqual([e['id'] for e in self.store.history('A', 'P', DEFAULT_SESSION)], [old['id']])
        self.assertEqual([e['content'] for e in self.store.history('A', 'P', first['session_id'])], ['Q1', 'A1'])
        renamed = self.store.rename('A', 'P', first['session_id'], 'Renamed')
        self.assertEqual(renamed['title'], 'Renamed')
        page = self.store.list('A', 'P', limit=1)
        self.assertEqual(page[0]['session_id'], second['session_id'])
        self.assertEqual(self.store.list('A', 'P', limit=1, before=page[0]['id'])[0]['session_id'], first['session_id'])
        for project, paper in [('B', 'P'), ('A', 'other')]:
            with self.assertRaises(ValueError):
                self.store.history(project, paper, first['session_id'])
            with self.assertRaises(ValueError):
                self.store.rename(project, paper, first['session_id'], 'Leaked')

    def test_delete_session_removes_its_events_but_preserves_memory_rows(self):
        session = self.store.create('A', 'P')
        events = self.store.save_exchange('A', 'P', session['session_id'], 'Private Q', 'Private A')
        explicit = self.memory.remember('A', 'project', 'Keep this explicit memory', [events[0]['id']], paper='P')
        self.assertEqual(self.store.delete('A', 'P', session['session_id']), 2)
        self.assertEqual(self.memory.list_memories('A')[0]['id'], explicit['id'])
        self.assertEqual(self.memory.list_memories('A')[0]['content'], 'Keep this explicit memory')
        self.assertEqual(self.memory.list_memories('A')[0]['source_ids'], [])
        with self.assertRaises(ValueError):
            self.store.history('A', 'P', session['session_id'])
        self.assertEqual(self.store.history('A', 'P', DEFAULT_SESSION), [])

    def test_draft_and_idempotent_exchange(self):
        session = self.store.create('A', 'P')
        sid = session['session_id']
        draft = {'question': 'Why here?', 'selection': {'text': 'selected quote', 'page': 4}}
        self.assertEqual(self.store.set_draft('A', 'P', sid, draft['question'], draft['selection']), draft)
        one = self.store.save_exchange('A', 'P', sid, 'Why here?', 'Answer', request_id='retry-1')
        again = self.store.save_exchange('A', 'P', sid, 'Why here?', 'Answer', request_id='retry-1')
        self.assertEqual([e['id'] for e in one], [e['id'] for e in again])
        self.assertEqual(self.store.history('A', 'P', sid), one)
        self.assertIsNone(self.store._session(self.store._get('A', 'P', sid))['draft'])

    def test_newer_draft_survives_completion_of_in_flight_request(self):
        sid = self.store.create('A','P')['session_id']
        submitted = self.store.set_draft('A','P',sid,'First')
        self.store.set_draft('A','P',sid,'Next question')
        self.store.save_exchange('A','P',sid,'First','Answer',request_id='one',expected_draft=submitted)
        self.assertEqual(self.store.list('A','P')[0]['draft']['question'],'Next question')

    def test_restart_recovers_sessions_draft_and_events(self):
        with tempfile.TemporaryDirectory() as folder:
            path = os.path.join(folder, 'reading.sqlite')
            db = sqlite3.connect(path)
            db.row_factory = sqlite3.Row
            lock = threading.RLock()
            MemoryStore(db, lock)
            store = SessionStore(db, lock)
            session = store.create('A', 'P', 'Persist me')
            store.save_exchange('A', 'P', session['session_id'], 'Saved question', 'Saved answer')
            store.set_draft('A', 'P', session['session_id'], 'Unsent question', {'text': 'quote', 'page': 2})
            db.close()

            db = sqlite3.connect(path)
            db.row_factory = sqlite3.Row
            try:
                MemoryStore(db, lock)
                reopened = SessionStore(db, lock)
                restored = reopened.list('A', 'P')[0]
                self.assertEqual(restored['title'], 'Persist me')
                self.assertEqual(restored['draft'], {'question': 'Unsent question', 'selection': {'text': 'quote', 'page': 2}})
                self.assertEqual([e['content'] for e in reopened.history('A', 'P', restored['session_id'])],
                                 ['Saved question', 'Saved answer'])
            finally:
                db.close()

    def test_attached_event_must_match_both_scopes(self):
        session = self.store.create('A', 'P')
        event = self.memory.add_event('A', 'other', 'user', 'wrong paper')
        with self.assertRaises(ValueError):
            self.store.attach_event('A', 'P', session['session_id'], event['id'])
        with self.assertRaises(ValueError):
            self.store.attach_event('B', 'P', session['session_id'], event['id'])

    def test_export_includes_source_context_and_all_paginated_session_events(self):
        session = self.store.create('A', 'P', 'Reading discussion')
        sid = session['session_id']
        self.store.save_exchange('A', 'P', sid, 'Question 0', 'Answer 0', {
            'evidence': [{'id': 'E1', 'page': 7, 'quote': 'Original paper quote', 'state': 'located_quote'}],
            'evidence_version': 'pdf-sha-1',
            'citations': [{'id': 'E1', 'page': 7, 'state': 'located_quote'}],
        }, user_evidence={'selection': {
            'status': 'located',
            'segments': [{'page': 7, 'text': 'Selected original quote', 'status': 'located'}],
        }})
        for number in range(1, 101):
            self.store.save_exchange('A', 'P', sid, f'Question {number}', f'Answer {number}')
        other = self.store.create('A', 'P')
        self.store.save_exchange('A', 'P', other['session_id'], 'Other session secret', 'Other answer')

        markdown = self.store.export('A', 'P', sid, {
            'title': 'Paper title', 'authors': 'A. Author', 'year': '2024',
            'source': 'Journal', 'doi': '10.1234/example',
        }, 'markdown')
        self.assertIn('# Paper title', markdown)
        self.assertIn('Authors: A. Author', markdown)
        self.assertIn('Original paper quote', markdown)
        self.assertIn('Selected original quote', markdown)
        self.assertIn('Page 7', markdown)
        self.assertIn('Status: located_quote', markdown)
        self.assertIn('PDF version: pdf-sha-1', markdown)
        self.assertIn('Citation E1: located_quote', markdown)
        self.assertIn('do not establish scientific support', markdown)
        self.assertIn('Question 100', markdown)
        self.assertLess(markdown.index('Question 0'), markdown.index('Question 100'))
        self.assertNotIn('Other session secret', markdown)

        plain = self.store.export('A', 'P', sid, {'title': 'Paper title'}, 'text')
        self.assertTrue(plain.startswith('Paper title\n'))
        with self.assertRaises(ValueError):
            self.store.export('A', 'P', sid, {}, 'html')
        with self.assertRaises(ValueError):
            self.store.export('B', 'P', sid, {}, 'markdown')

    def test_legacy_export_only_includes_unassigned_events(self):
        self.memory.add_event('A','P','user','Legacy question')
        session = self.store.create('A','P')
        self.store.save_exchange('A','P',session['session_id'],'Named question','Named answer')
        text = self.store.export('A','P',DEFAULT_SESSION,{'title':'Paper'},'text')
        self.assertIn('Legacy question',text)
        self.assertNotIn('Named question',text)


if __name__ == '__main__':
    unittest.main()
