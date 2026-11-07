import sqlite3
import threading
import unittest

from memory import MemoryStore, build_context, input_units


class MemoryTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.db.row_factory = sqlite3.Row
        self.addCleanup(self.db.close)
        self.store = MemoryStore(self.db, threading.RLock())

    def test_correction_scope_and_sources(self):
        event = self.store.add_event('A','P','user','Initial receptor hypothesis')
        old = self.store.remember('A','hypothesis','Receptor blocks signaling',[event['id']],slot='mechanism')
        new = self.store.remember('A','hypothesis','Receptor activates signaling',[],slot='mechanism')
        self.assertEqual([r['id'] for r in self.store.recall('A','receptor')],[new['id']])
        self.assertEqual(self.store.recall('B','receptor'),[])
        self.assertEqual(self.store.context_history('A','P'),[])
        self.assertEqual(len(self.store.history('A','P')),1)
        with self.assertRaises(ValueError):
            self.store.remember('B','project','Bad source',[event['id']])
        with self.assertRaises(ValueError):
            self.store.remember('B','hypothesis','Bad replacement',[],replaces=old['id'])

    def test_delete_event_removes_derived_memory_and_export(self):
        e = self.store.add_event('A','P','user','Private observation')
        self.store.remember('A','project','Private derived memory',[e['id']])
        self.store.delete_event('A',e['id'])
        self.assertEqual(self.store.export('A')['events'],[])
        self.assertEqual(self.store.recall('A','Private'),[])

    def test_forget_does_not_reintroduce_source(self):
        e = self.store.add_event('A','P','user','Obsolete preference')
        m = self.store.remember('A','preference','Obsolete preference',[e['id']])
        self.store.forget(m['id'])
        self.assertEqual(self.store.context_history('A','P'),[])
        self.assertEqual(self.store.export('A')['memories'],[])

    def test_context_bound_includes_all_parts_and_unicode(self):
        for evidence in ('a'*100000,'中文证据'*100000):
            messages,report = build_context('system','question',evidence,
                [dict(id=1,content='memory'*5000)], [dict(id=2,role='assistant',content='history'*5000)])
            self.assertLessEqual(input_units(messages)+2800+1024,32768)
            self.assertTrue(report['evidence_truncated'])
            self.assertIn('Current question:',messages[1]['content'])
        with self.assertRaises(ValueError):
            build_context('x'*40000,'q','e',[],[])

    def test_historical_query_is_labeled_and_forgotten_content_stays_absent(self):
        old = self.store.remember('A','preference','English explanations',[],slot='language')
        new = self.store.remember('A','preference','Chinese explanations',[],slot='language')
        current = self.store.recall('A','current language preference')
        self.assertEqual([r['id'] for r in current],[new['id']])
        earlier = self.store.recall('A','earlier language preference')
        self.assertEqual(earlier[0]['id'],old['id'])
        self.assertEqual(earlier[0]['active'],0)
        self.store.forget(old['id'])
        self.assertNotIn(old['id'],[r['id'] for r in self.store.recall('A','earlier language preference')])

    def test_long_scope_and_unrelated_historical_query(self):
        gold = self.store.remember('A','project','Review zephyr protein',[],slot='target')
        self.store.remember('A','preference','Concise style',[],slot='style')
        self.store.remember('A','preference','Detailed style',[],slot='style')
        for i in range(300):
            self.store.remember('A','project',f'Other topic {i}',[])
            self.store.remember('B','project','Review zephyr protein',[])
        self.assertEqual(self.store.recall('A','zephyr protein')[0]['id'],gold['id'])
        self.assertEqual(self.store.recall('A','previous supplier catalog'),[])


if __name__ == '__main__':
    unittest.main()
