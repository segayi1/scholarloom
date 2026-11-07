"""Persistent manual figure selections bound to a paper PDF content version."""

import hashlib
import json
import re
import secrets
import time


class FigureStore:
    def __init__(self, db, lock):
        self.db, self.lock = db, lock
        with lock, db:
            db.execute("""CREATE TABLE IF NOT EXISTS figure_notes (
                id TEXT PRIMARY KEY, paper_id TEXT NOT NULL, project TEXT NOT NULL, pdf_version TEXT NOT NULL,
                page INTEGER NOT NULL, rect TEXT NOT NULL, figure_number TEXT NOT NULL,
                caption TEXT NOT NULL, mentions TEXT NOT NULL, note TEXT NOT NULL,
                created REAL NOT NULL)""")

    @staticmethod
    def version(path):
        digest = hashlib.sha256()
        with path.open('rb') as stream:
            for chunk in iter(lambda: stream.read(1024 * 1024), b''):
                digest.update(chunk)
        return digest.hexdigest()

    @staticmethod
    def _metadata(pdf, page_number, figure_number):
        label = re.escape(figure_number)
        caption_pattern = re.compile(rf"\b(?:fig(?:ure)?\.?\s*{label})\b", re.I)
        captions, mentions = [], []
        for index, page in enumerate(pdf):
            text = re.sub(r"\s+", " ", page.get_text('text', sort=True)).strip()
            matches = list(caption_pattern.finditer(text))
            for match_index, match in enumerate(matches):
                excerpt = text[match.start():min(len(text), match.start() + 700)]
                (captions if index + 1 == page_number and not captions else mentions).append(
                    dict(page=index + 1, text=excerpt))
            if not matches and re.search(rf"\b(?:fig(?:ure)?\.?\s*{label})\b", text, re.I):
                mentions.append(dict(page=index + 1, text=text[:700]))
        return (captions[0]['text'] if captions else ''), mentions

    @classmethod
    def inspect(cls, pdf_path, version, page, figure_number):
        import fitz
        if cls.version(pdf_path) != version:
            raise ValueError('PDF 内容版本已变化，请刷新文献后重试。')
        pdf = fitz.open(str(pdf_path))
        try:
            if pdf.needs_pass:
                raise ValueError('PDF 已加密，无法读取图文信息。')
            page_number = int(page)
            if page_number < 1 or page_number > len(pdf):
                raise ValueError('页码超出 PDF 范围。')
            figure_number = str(figure_number).strip()
            if not figure_number or len(figure_number) > 40:
                raise ValueError('图编号无效。')
            caption, mentions = cls._metadata(pdf, page_number, figure_number)
            return dict(page=page_number, figure_number=figure_number, caption=caption,
                        caption_status='candidate' if caption else 'not_found', mentions=mentions)
        finally:
            pdf.close()

    def create(self, paper_id, project, version, page, rect, figure_number, note, pdf_path):
        import fitz
        if self.version(pdf_path) != version:
            raise ValueError('PDF 内容版本已变化，请刷新文献后重新选区。')
        try:
            pdf = fitz.open(str(pdf_path))
            if pdf.needs_pass:
                raise ValueError('PDF 已加密，无法读取图选区。')
            page_number = int(page)
            if page_number < 1 or page_number > len(pdf):
                raise ValueError('页码超出 PDF 范围。')
            values = [float(rect[k]) for k in ('x0', 'y0', 'x1', 'y1')]
            if not all(0 <= value <= 1 for value in values) or values[0] >= values[2] or values[1] >= values[3]:
                raise ValueError('选区坐标无效。')
            if not str(figure_number).strip() or len(str(figure_number)) > 40 or len(str(note)) > 4000:
                raise ValueError('图编号或笔记内容无效。')
            caption, mentions = self._metadata(pdf, page_number, str(figure_number).strip())
            item = dict(id=secrets.token_urlsafe(12), paper_id=paper_id, project=project, pdf_version=version,
                        page=page_number, rect=dict(zip(('x0', 'y0', 'x1', 'y1'), values)),
                        figure_number=str(figure_number).strip(), caption=caption,
                        caption_status='candidate' if caption else 'not_found', mentions=mentions,
                        note=str(note).strip(), created=time.time())
            with self.lock, self.db:
                self.db.execute('INSERT INTO figure_notes VALUES (?,?,?,?,?,?,?,?,?,?,?)',
                                (item['id'], paper_id, project, version, page_number, json.dumps(item['rect']),
                                 item['figure_number'], caption, json.dumps(mentions, ensure_ascii=False),
                                 item['note'], item['created']))
            pdf.close()
            return item
        except Exception:
            if 'pdf' in locals():
                pdf.close()
            raise

    def list(self, paper_id, project, current_version):
        with self.lock:
            rows = self.db.execute('SELECT * FROM figure_notes WHERE paper_id=? AND project=? ORDER BY created DESC',
                                   (paper_id, project)).fetchall()
        return [dict(id=row['id'], paper_id=row['paper_id'], project=row['project'], pdf_version=row['pdf_version'],
                     stale=row['pdf_version'] != current_version, page=row['page'], rect=json.loads(row['rect']),
                     figure_number=row['figure_number'], caption=row['caption'],
                     caption_status='candidate' if row['caption'] else 'not_found', mentions=json.loads(row['mentions']),
                     note=row['note'], created=row['created'], crop_url=f"/api/figures/{row['id']}/crop") for row in rows]

    def get(self, figure_id):
        with self.lock:
            row = self.db.execute('SELECT * FROM figure_notes WHERE id=?', (figure_id,)).fetchone()
        if not row:
            return None
        return dict(id=row['id'], paper_id=row['paper_id'], pdf_version=row['pdf_version'], page=row['page'],
                    rect=json.loads(row['rect']))

    def delete(self, figure_id):
        with self.lock, self.db:
            cursor = self.db.execute('DELETE FROM figure_notes WHERE id=?', (figure_id,))
            return cursor.rowcount > 0

    @staticmethod
    def crop(pdf_path, item):
        import fitz
        pdf = fitz.open(str(pdf_path))
        try:
            page = pdf.load_page(item['page'] - 1)
            rect = item['rect']
            shown = page.rect
            clip = fitz.Rect(rect['x0'] * shown.width, rect['y0'] * shown.height,
                             rect['x1'] * shown.width, rect['y1'] * shown.height)
            clip &= shown
            if clip.is_empty:
                raise ValueError('选区为空。')
            return page.get_pixmap(matrix=fitz.Matrix(4, 4), clip=clip, alpha=False).tobytes('png')
        finally:
            pdf.close()
