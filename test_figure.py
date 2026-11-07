import sqlite3
import json
import tempfile
import threading
import unittest
from pathlib import Path
import urllib.request
import urllib.error

import pymupdf as fitz
import server

from figure import FigureStore


class FigureStoreTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.db = sqlite3.connect(self.root / 'workbench.sqlite')
        self.db.row_factory = sqlite3.Row
        self.addCleanup(self.db.close)
        self.lock = threading.RLock()
        self.figures = FigureStore(self.db, self.lock)
        self.pdf_path = self.root / 'paper.pdf'
        pdf = fitz.open()
        page = pdf.new_page(width=400, height=300)
        page.insert_text((30, 35), 'Figure 2. Receptor binding assay.')
        page.insert_text((30, 80), 'Results are shown in Fig. 2 across samples.')
        page.draw_rect(fitz.Rect(100, 110, 300, 250), color=(1, 0, 0), fill=(1, 0, 0))
        pdf.new_page().insert_text((50, 50), 'See Figure 2 for details.')
        pdf.save(self.pdf_path)
        pdf.close()
        self.version = FigureStore.version(self.pdf_path)

    def create(self, **changes):
        args = dict(paper_id='P1', project='topic', version=self.version, page=1,
                    rect={'x0': .25, 'y0': .35, 'x1': .75, 'y1': .85},
                    figure_number='2', note='binding panel', pdf_path=self.pdf_path)
        args.update(changes)
        return self.figures.create(**args)

    def test_create_extracts_caption_and_cross_page_mentions_and_renders_png(self):
        item = self.create()
        self.assertIn('Figure 2. Receptor binding assay', item['caption'])
        self.assertEqual([hit['page'] for hit in item['mentions']], [1, 2])
        body = FigureStore.crop(self.pdf_path, self.figures.get(item['id']))
        self.assertTrue(body.startswith(b'\x89PNG\r\n\x1a\n'))
        self.assertEqual(self.figures.list('P1', 'topic', self.version)[0]['stale'], False)

    def test_pdf_change_marks_note_stale_and_prevents_crop(self):
        item = self.create()
        with self.pdf_path.open('ab') as stream:
            stream.write(b'changed')
        current = FigureStore.version(self.pdf_path)
        self.assertTrue(self.figures.list('P1', 'topic', current)[0]['stale'])
        with self.assertRaisesRegex(ValueError, '版本'):
            self.create(version='old-version')

    def test_context_is_nonpersistent_and_checks_pdf_version(self):
        result = self.figures.inspect(self.pdf_path, self.version, 1, '2')
        self.assertEqual(result['caption_status'], 'candidate')
        self.assertIn('Figure 2.', result['caption'])
        self.assertEqual(self.figures.list('P1', 'topic', self.version), [])
        with self.assertRaisesRegex(ValueError, '版本'):
            self.figures.inspect(self.pdf_path, 'old-version', 1, '2')

    def test_rotated_page_crop_uses_display_coordinates(self):
        pdf = fitz.open(self.pdf_path)
        pdf[0].set_rotation(90)
        rotated_path = self.root / 'rotated.pdf'
        pdf.save(rotated_path)
        pdf.close()
        version = FigureStore.version(rotated_path)
        item = self.figures.create('P2', 'topic', version, 1,
                                   {'x0': .15, 'y0': .24, 'x1': .65, 'y1': .76},
                                   '2', '', rotated_path)
        png = FigureStore.crop(rotated_path, self.figures.get(item['id']))
        pix = fitz.Pixmap(png)
        self.assertEqual((pix.width, pix.height), (600, 832))
        rgb = fitz.Pixmap(fitz.csRGB, pix)
        center = (rgb.height // 2 * rgb.width + rgb.width // 2) * rgb.n
        self.assertGreater(rgb.samples[center], 240)
        self.assertLess(rgb.samples[center + 1], 15)
        self.assertLess(rgb.samples[center + 2], 15)

    def test_project_isolation_delete_and_rect_validation(self):
        item = self.create()
        self.assertEqual(self.figures.list('P1', 'other', self.version), [])
        self.assertTrue(self.figures.delete(item['id']))
        self.assertFalse(self.figures.delete(item['id']))
        with self.assertRaisesRegex(ValueError, '坐标'):
            self.create(rect={'x0': .8, 'y0': .2, 'x1': .2, 'y1': .8})


class FigureHTTPTests(unittest.TestCase):
    def test_preview_create_list_crop_delete_contract(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        root = Path(temp.name)
        app = server.Workbench(root / 'data')
        self.addCleanup(app.db.close)
        pdf = fitz.open()
        pdf.new_page(width=200, height=300).insert_text((20, 30), 'Figure 1. Example caption.')
        pdf.save(root / 'paper.pdf')
        pdf.close()
        app.save_document(dict(key='P1', _path=str(root / 'paper.pdf')))
        httpd = server.ThreadingHTTPServer(('127.0.0.1', 0), server.Handler)
        httpd.app = app
        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(httpd.server_close)
        self.addCleanup(httpd.shutdown)
        self.addCleanup(thread.join, 2)
        base = f'http://127.0.0.1:{httpd.server_port}'
        headers = {'Content-Type': 'application/json', 'Origin': base,
                   'X-Workbench-Token': app.csrf}

        def post(path, payload):
            request = urllib.request.Request(base + path, data=json.dumps(payload).encode(),
                                             headers=headers, method='POST')
            with urllib.request.urlopen(request, timeout=3) as response:
                return response.status, response.read()

        with urllib.request.urlopen(base + '/api/figures?paper_id=P1', timeout=3) as response:
            version = json.load(response)['pdf_version']
        context = dict(paper_id='P1', page=1, figure_number='1', pdf_version=version)
        _, body = post('/api/figures/context', context)
        self.assertEqual(json.loads(body)['caption_status'], 'candidate')
        self.assertEqual(app.figures.list('P1', 'default', version), [])
        stale_request = urllib.request.Request(base + '/api/figures/context',
            data=json.dumps({**context, 'pdf_version': 'stale'}).encode(), headers=headers, method='POST')
        with self.assertRaises(urllib.error.HTTPError) as caught:
            urllib.request.urlopen(stale_request, timeout=3)
        self.assertEqual(caught.exception.code, 409)
        selection = dict(context, rect=dict(x0=.1, y0=.1, x1=.9, y1=.9), note='')
        status, body = post('/api/figures', selection)
        self.assertEqual(status, 201)
        item = json.loads(body)['figure']
        with urllib.request.urlopen(base + item['crop_url'], timeout=3) as response:
            self.assertEqual(response.headers.get('Content-Type'), 'image/png')
            self.assertTrue(response.read().startswith(b'\x89PNG\r\n\x1a\n'))
        request = urllib.request.Request(base + '/api/figures/' + item['id'], method='DELETE')
        with self.assertRaises(urllib.error.HTTPError) as caught:
            urllib.request.urlopen(request, timeout=3)
        self.assertEqual(caught.exception.code, 403)
        request = urllib.request.Request(base + '/api/figures/' + item['id'], headers=headers, method='DELETE')
        with urllib.request.urlopen(request, timeout=3) as response:
            self.assertEqual(json.load(response), {'ok': True})


if __name__ == '__main__':
    unittest.main()
