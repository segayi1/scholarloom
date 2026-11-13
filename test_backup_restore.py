"""Isolated backup and restore of reading state and linked local evidence."""

from pathlib import Path
import shutil
import tempfile
import unittest

import pymupdf
import server


class BackupRestoreTests(unittest.TestCase):
    def test_restore_preserves_reading_state_and_requires_original_pdf_path(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            original, backup = root / 'original', root / 'backup'
            original.mkdir()
            app = server.Workbench(original / 'data')
            try:
                library = original / 'data' / 'Library'
                library.mkdir(exist_ok=True)
                pdf_path = library / 'paper.pdf'
                pdf = pymupdf.open()
                pdf.new_page().insert_text((50, 100), 'A controlled experiment measured twelve samples.')
                pdf.save(pdf_path)
                pdf.close()
                app.save_document({'key': 'P1', 'title': 'Study one', '_path': str(pdf_path)})
                app.save_document({'key': 'P2', 'title': 'Study two'})
                app.library_search.set_members('study', ['P1', 'P2'])
                version = server.FigureStore.version(pdf_path)
                app.evidence.index('P1', pdf_path)
                session = app.sessions.create('study', 'P1', 'Reading session')['session_id']
                events = app.sessions.save_exchange('study', 'P1', session, 'What was measured?', 'Twelve samples.')
                app.sessions.set_draft('study', 'P1', session, 'Follow-up question')
                app.memory.remember('study', 'preference', 'Prefer explicit controls', [events[0]['id']], paper='P1')
                app.full_reads.save('run', 'P1', version, app.effective_language(),
                                    {'status': 'done', 'items': [], 'units': [{'heading': 'Experiment'}]})
                source = {'paper': 'P1', 'version': version, 'page': 1,
                          'quote': 'A controlled experiment measured twelve samples.'}
                app.matrices.merge_generated('study', ['P1', 'P2'], {
                    'P1': {'sample': {'value': 'Twelve samples', 'status': 'supported', 'sources': [source]}}})
                app.matrices.save_edit('study', 'P1', 'sample', '12 samples checked', 'supported')
                app.project_synthesis.save_generated('study', {'markdown': 'Original [P1]',
                    'sources': [{'id': 'P1', 'key': 'P1', 'title': 'Study one'},
                                {'id': 'P2', 'key': 'P2', 'title': 'Study two'}],
                    'keys': ['P1', 'P2'], 'focus': 'Study design'})
                app.project_synthesis.edit('study', 'Human revision [P1]')
            finally:
                app.db.close()

            shutil.copytree(original, backup)
            original.rename(root / 'original-parked')
            shutil.copytree(backup, original)
            restored = server.Workbench(original / 'data')
            try:
                self.assertEqual(restored.db.execute('PRAGMA integrity_check').fetchone()[0], 'ok')
                self.assertEqual(restored.get_document_pdf_path('P1'), pdf_path)
                self.assertEqual(restored.library_search.members('study'), ['P1', 'P2'])
                self.assertEqual(restored.sessions.history('study', 'P1', session)[0]['content'], 'What was measured?')
                self.assertEqual(restored.sessions.list('study', 'P1')[0]['draft']['question'], 'Follow-up question')
                self.assertEqual(restored.memory.list_memories('study')[0]['content'], 'Prefer explicit controls')
                self.assertEqual(restored.get_full_read('P1')['runId'], 'run')
                cell = restored.evidence_matrix_view('study')['cells']['P1']['sample']
                self.assertEqual(cell['generated']['value'], 'Twelve samples')
                self.assertEqual(cell['revision']['value'], '12 samples checked')
                self.assertEqual(restored.locate_synthesis_source('P1', version, 1, source['quote'])['state'], 'located_quote')
                self.assertEqual(restored.project_synthesis.get('study')['revision']['markdown'], 'Human revision [P1]')
                self.assertIn('12 samples checked', restored.matrices.export_csv('study'))
            finally:
                restored.db.close()
            original.rename(root / 'restored-parked')
            relocated = server.Workbench(backup / 'data')
            try:
                self.assertIsNone(relocated.get_document_pdf_path('P1'))
            finally:
                relocated.db.close()


if __name__ == '__main__':
    unittest.main()
