import json
import sqlite3
import threading
import unittest

from evidence import EvidenceStore
from library_search import LibrarySearch


class LibrarySearchTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.db.row_factory = sqlite3.Row
        self.addCleanup(self.db.close)
        self.lock = threading.RLock()
        self.evidence = EvidenceStore(self.db, self.lock)
        self.searcher = LibrarySearch(self.db, self.lock, self.evidence)

    def add_document(self, paper, page_count, pages, version='v1'):
        readable = sum(bool(text.strip()) for _, text, _ in pages)
        with self.db:
            self.db.execute(
                'INSERT INTO evidence_versions VALUES (?,?,?,?,?,?,?,?,?,?)',
                (paper, '', 0, 0, version, page_count, len(pages), readable,
                 'indexed' if readable else 'image_only', 0))
            for page, text, blocks in pages:
                self.db.execute(
                    'INSERT INTO evidence_pages VALUES (?,?,?,?,?,?,?)',
                    (paper, version, page, 600, 800, text,
                     json.dumps(blocks, ensure_ascii=False)))

    @staticmethod
    def block(text, rect=None):
        return dict(text=text, rect=rect or dict(x=0.1, y=0.2, width=0.5, height=0.1))

    def test_membership_is_project_scoped_and_results_jump_to_page(self):
        self.add_document('A', 1, [(1, 'Unique zephyr biomarker.', [self.block('Unique zephyr biomarker.')])])
        self.add_document('B', 1, [(1, 'Unique zephyr pathway.', [self.block('Unique zephyr pathway.')])])
        self.assertEqual(self.searcher.set_members('alpha', ['A', 'A']), ['A'])
        self.searcher.set_members('beta', ['B'])

        result = self.searcher.search('alpha', 'zephyr biomarker')
        self.assertEqual(self.searcher.members('alpha'), ['A'])
        self.assertEqual([hit['paper'] for hit in result['results']], ['A'])
        self.assertEqual(result['results'][0]['page'], 1)
        self.assertEqual(result['results'][0]['version'], 'v1')
        self.assertEqual(result['results'][0]['rects'][0]['x'], 0.1)
        self.assertEqual(result['results'][0]['matched_terms'], ['zephyr', 'biomarker'])
        self.assertEqual(result['coverage']['documents'][0]['state'], 'searchable')

    def test_english_and_chinese_lexical_queries(self):
        quote = '肿瘤免疫治疗 improves response in solid tumors.'
        self.add_document('BIO', 1, [(1, quote, [self.block(quote)])])
        self.searcher.set_members('study', ['BIO'])

        english = self.searcher.search('study', 'improves response')
        chinese = self.searcher.search('study', '肿瘤免疫治疗')
        self.assertEqual(english['status'], 'ok')
        self.assertIn('response', english['results'][0]['matched_terms'])
        self.assertEqual(chinese['status'], 'ok')
        self.assertIn('肿', chinese['results'][0]['matched_terms'])

    def test_coverage_reports_absent_partial_and_image_only_documents(self):
        self.add_document('PART', 3, [(1, 'A readable first page.', [self.block('A readable first page.')])])
        self.add_document('IMAGE', 2, [(1, '', []), (2, '', [])])
        self.searcher.set_members('study', ['MISSING', 'PART', 'IMAGE'])

        coverage = self.searcher.search('study', 'readable')['coverage']
        by_paper = {item['paper']: item for item in coverage['documents']}
        self.assertEqual(by_paper['MISSING']['state'], 'absent')
        self.assertEqual(by_paper['PART']['state'], 'partial')
        self.assertEqual(by_paper['PART']['unindexed_pages'], [2, 3])
        self.assertEqual(by_paper['IMAGE']['state'], 'image_only')
        self.assertEqual(by_paper['IMAGE']['pages'], [
            {'page': 1, 'state': 'image_only'}, {'page': 2, 'state': 'image_only'}])
        self.assertEqual(coverage['state'], 'partial')

    def test_no_matches_keeps_index_coverage_visible(self):
        self.add_document('PART', 2, [(1, 'Methods describe the control group.',
                                       [self.block('Methods describe the control group.')])])
        self.searcher.set_members('study', ['PART'])

        result = self.searcher.search('study', 'unrelated cytokine')
        self.assertEqual(result['status'], 'no_matches')
        self.assertEqual(result['results'], [])
        self.assertEqual(result['coverage']['state'], 'partial')
        self.assertEqual(result['coverage']['documents'][0]['unindexed_pages'], [2])

    def test_synonym_does_not_match_inside_unrelated_word(self):
        text = 'Cartilage tissue was studied.'
        self.add_document('A', 1, [(1, text, [self.block(text)])])
        self.searcher.set_members('study', ['A'])
        self.assertEqual(self.searcher.search('study', '嵌合抗原受体', ['cart'])['results'], [])

    def test_partial_image_only_index_reports_missing_pages(self):
        self.add_document('A', 2, [(1, '', [])])
        self.searcher.set_members('study', ['A'])
        paper = self.searcher.search('study', 'example')['coverage']['documents'][0]
        self.assertEqual(paper['state'], 'partial')
        self.assertEqual(paper['unindexed_pages'], [2])


if __name__ == '__main__':
    unittest.main()
