"""Named, project- and paper-scoped reading conversations."""
import json
import time
import uuid

from memory import MemoryStore, scope


DEFAULT_SESSION = 'default'


class SessionStore:
    def __init__(self, db, lock):
        self.db, self.lock = db, lock
        with lock, db:
            db.executescript('''
                CREATE TABLE IF NOT EXISTS reading_sessions (
                  id INTEGER PRIMARY KEY, session_id TEXT UNIQUE NOT NULL,
                  project TEXT NOT NULL, paper TEXT NOT NULL, title TEXT NOT NULL,
                  draft TEXT, created REAL NOT NULL, updated REAL NOT NULL);
                CREATE INDEX IF NOT EXISTS session_scope
                  ON reading_sessions(project,paper,id);
                CREATE TABLE IF NOT EXISTS reading_session_events (
                  session_id TEXT NOT NULL, event_id INTEGER NOT NULL UNIQUE,
                  request_id TEXT, PRIMARY KEY(session_id,event_id));
                CREATE UNIQUE INDEX IF NOT EXISTS session_request
                  ON reading_session_events(session_id,request_id)
                  WHERE request_id IS NOT NULL;
            ''')

    @staticmethod
    def _session(row):
        result = dict(row)
        result['draft'] = json.loads(result['draft']) if result['draft'] else None
        return result

    @staticmethod
    def _event(row):
        return MemoryStore._event(row)

    def _get(self, project, paper, session_id):
        row = self.db.execute(
            'SELECT * FROM reading_sessions WHERE session_id=? AND project=? AND paper=?',
            (session_id, scope(project), paper)).fetchone()
        if not row:
            raise ValueError('Session not found in this project and paper.')
        return row

    def create(self, project, paper, title='New conversation'):
        project = scope(project)
        if not isinstance(paper, str) or not paper.strip() or len(paper) > 120:
            raise ValueError('Invalid paper scope.')
        if not isinstance(title, str) or not title.strip() or len(title.strip()) > 200:
            raise ValueError('Title must contain 1-200 characters.')
        now, session_id = time.time(), str(uuid.uuid4())
        with self.lock, self.db:
            cur = self.db.execute(
                'INSERT INTO reading_sessions(session_id,project,paper,title,created,updated) VALUES(?,?,?,?,?,?)',
                (session_id, project, paper, title.strip(), now, now))
            return self._session(self.db.execute(
                'SELECT * FROM reading_sessions WHERE id=?', (cur.lastrowid,)).fetchone())

    def rename(self, project, paper, session_id, title):
        if not isinstance(title, str) or not title.strip() or len(title.strip()) > 200:
            raise ValueError('Title must contain 1-200 characters.')
        with self.lock, self.db:
            self._get(project, paper, session_id)
            self.db.execute('UPDATE reading_sessions SET title=?,updated=? WHERE session_id=?',
                            (title.strip(), time.time(), session_id))
            return self._session(self._get(project, paper, session_id))

    def list(self, project, paper, limit=20, before=None):
        project = scope(project)
        limit = max(1, min(100, int(limit)))
        with self.lock:
            rows = self.db.execute(
                'SELECT * FROM reading_sessions WHERE project=? AND paper=? AND id<? ORDER BY id DESC LIMIT ?',
                (project, paper, before or 9223372036854775807, limit)).fetchall()
        return [self._session(row) for row in reversed(rows)]

    def delete(self, project, paper, session_id):
        with self.lock, self.db:
            self._get(project, paper, session_id)
            ids = [row[0] for row in self.db.execute(
                'SELECT event_id FROM reading_session_events WHERE session_id=?', (session_id,))]
            for row in self.db.execute('SELECT id,source_ids FROM reading_memories WHERE project=?', (scope(project),)).fetchall():
                sources = json.loads(row['source_ids'])
                remaining = [source for source in sources if source not in ids]
                if len(remaining) != len(sources):
                    self.db.execute('UPDATE reading_memories SET source_ids=? WHERE id=?', (json.dumps(remaining), row['id']))
            self.db.execute('DELETE FROM reading_events WHERE id IN '
                            '(SELECT event_id FROM reading_session_events WHERE session_id=?)', (session_id,))
            self.db.execute('DELETE FROM reading_session_events WHERE session_id=?', (session_id,))
            self.db.execute('DELETE FROM reading_sessions WHERE session_id=?', (session_id,))
            return len(ids)

    def set_draft(self, project, paper, session_id, question, selection=None):
        if not isinstance(question, str) or len(question) > 20000:
            raise ValueError('Invalid draft question.')
        value = json.dumps({'question': question, 'selection': selection}, ensure_ascii=False)
        with self.lock, self.db:
            self._get(project, paper, session_id)
            self.db.execute('UPDATE reading_sessions SET draft=?,updated=? WHERE session_id=?',
                            (value, time.time(), session_id))
            return self._session(self._get(project, paper, session_id))['draft']

    def clear_draft(self, project, paper, session_id):
        with self.lock, self.db:
            self._get(project, paper, session_id)
            self.db.execute('UPDATE reading_sessions SET draft=NULL,updated=? WHERE session_id=?',
                            (time.time(), session_id))

    def attach_event(self, project, paper, session_id, event_id):
        with self.lock, self.db:
            self._get(project, paper, session_id)
            row = self.db.execute(
                'SELECT project,paper FROM reading_events WHERE id=?', (event_id,)).fetchone()
            if not row or row['project'] != scope(project) or row['paper'] != paper:
                raise ValueError('Event is outside this session scope.')
            self.db.execute('INSERT INTO reading_session_events(session_id,event_id) VALUES(?,?)',
                            (session_id, event_id))

    def exchange(self, project, paper, session_id, request_id):
        with self.lock:
            self._get(project, paper, session_id)
            row = self.db.execute('''SELECT event_id FROM reading_session_events
                WHERE session_id=? AND request_id=?''', (session_id, request_id)).fetchone()
            if not row:
                return []
            events = self.db.execute('''SELECT e.* FROM reading_events e
                JOIN reading_session_events a ON a.event_id=e.id
                WHERE a.session_id=? ORDER BY e.id''', (session_id,)).fetchall()
            return [self._event(event) for event in events if event['id'] == row['event_id'] or
                    (json.loads(event['evidence']) or {}).get('user_id') == row['event_id']]

    def save_exchange(self, project, paper, session_id, question, answer, evidence=None, request_id=None, user_evidence=None, expected_draft=None):
        project = scope(project)
        if (not isinstance(question, str) or not question.strip() or
                not isinstance(answer, str) or not answer.strip()):
            raise ValueError('Question and answer are required.')
        if request_id is not None and (not isinstance(request_id, str) or not request_id or len(request_id) > 200):
            raise ValueError('Invalid request ID.')
        with self.lock, self.db:
            self._get(project, paper, session_id)
            if request_id:
                prior = self.db.execute('''SELECT e.* FROM reading_session_events a
                    JOIN reading_events e ON e.id=a.event_id
                    WHERE a.session_id=? AND a.request_id=? ORDER BY e.id''',
                    (session_id, request_id)).fetchall()
                if prior:
                    user_id = prior[0]['id']
                    paired = [row for row in self.db.execute('''SELECT e.* FROM reading_session_events a
                        JOIN reading_events e ON e.id=a.event_id WHERE a.session_id=? ORDER BY e.id''',
                        (session_id,)).fetchall() if row['id'] == user_id or
                        (json.loads(row['evidence']) or {}).get('user_id') == user_id]
                    if len(paired) != 2 or paired[0]['content'] != question:
                        raise ValueError('Request ID already belongs to another exchange.')
                    return [self._event(row) for row in paired]
            now = time.time()
            user = self.db.execute('INSERT INTO reading_events VALUES(NULL,?,?,?,?,?,?)',
                (project, paper, 'user', question, json.dumps(user_evidence if user_evidence is not None else evidence, ensure_ascii=False), now))
            user_id = user.lastrowid
            assistant_evidence = dict(evidence or {})
            assistant_evidence['user_id'] = user_id
            assistant = self.db.execute('INSERT INTO reading_events VALUES(NULL,?,?,?,?,?,?)',
                (project, paper, 'assistant', answer,
                 json.dumps(assistant_evidence, ensure_ascii=False), now))
            self.db.executemany(
                'INSERT INTO reading_session_events(session_id,event_id,request_id) VALUES(?,?,?)',
                ((session_id, user_id, request_id), (session_id, assistant.lastrowid, None)))
            current = self._get(project, paper, session_id)['draft']
            current = json.loads(current) if current else None
            if expected_draft is None or current == expected_draft:
                self.db.execute('UPDATE reading_sessions SET updated=?,draft=NULL WHERE session_id=?',
                                (now, session_id))
            else:
                self.db.execute('UPDATE reading_sessions SET updated=? WHERE session_id=?', (now, session_id))
            rows = self.db.execute('SELECT * FROM reading_events WHERE id IN (?,?) ORDER BY id',
                                   (user_id, assistant.lastrowid)).fetchall()
            return [self._event(row) for row in rows]

    def history(self, project, paper, session_id=DEFAULT_SESSION, limit=20, before=None):
        project = scope(project)
        limit = max(1, min(200, int(limit)))
        with self.lock:
            if session_id == DEFAULT_SESSION:
                rows = self.db.execute('''SELECT * FROM reading_events e
                    WHERE e.project=? AND e.paper=? AND e.id<? AND NOT EXISTS
                    (SELECT 1 FROM reading_session_events a WHERE a.event_id=e.id)
                    ORDER BY e.id DESC LIMIT ?''',
                    (project, paper, before or 9223372036854775807, limit)).fetchall()
            else:
                self._get(project, paper, session_id)
                rows = self.db.execute('''SELECT e.* FROM reading_events e
                    JOIN reading_session_events a ON a.event_id=e.id
                    WHERE a.session_id=? AND e.project=? AND e.paper=? AND e.id<?
                    ORDER BY e.id DESC LIMIT ?''',
                    (session_id, project, paper, before or 9223372036854775807, limit)).fetchall()
        return [self._event(row) for row in reversed(rows)]

    def context_history(self, project, paper, session_id):
        with self.lock:
            invalid = {item for row in self.db.execute(
                'SELECT source_ids FROM reading_memories WHERE project=? AND active=0', (scope(project),))
                for item in json.loads(row[0])}
        return [event for event in self.history(project, paper, session_id, limit=12)
                if event['id'] not in invalid and (event.get('evidence') or {}).get('user_id') not in invalid]

    def export(self, project, paper, session_id, document, format):
        """Format one complete session with its saved bibliographic and source context."""
        if format not in ('markdown', 'text'):
            raise ValueError('Export format must be markdown or text.')
        with self.lock:
            session = {'title': 'Earlier conversations'} if session_id == DEFAULT_SESSION else dict(self._get(project, paper, session_id))
        events, before = [], None
        while True:
            page = self.history(project, paper, session_id, limit=200, before=before)
            events = page + events
            if len(page) < 200:
                break
            before = page[0]['id']

        markdown = format == 'markdown'
        lines = ['# ' + str(document.get('title') or paper) if markdown else str(document.get('title') or paper)]
        fields = (
            ('Authors', 'authors'), ('Year', 'year'), ('Publication', 'source'),
            ('Identifier', 'doi' if document.get('doi') else 'identifier'),
        )
        for label, key in fields:
            value = document.get(key)
            if isinstance(value, (list, tuple)):
                value = ', '.join(str(item) for item in value)
            if value:
                lines.append(f'{label}: {value}')
        lines.extend((f'Session: {session["title"]}', f'Project: {scope(project)}', f'Paper: {paper}', '',
                      '## Conversation' if markdown else 'Conversation', ''))

        def add_evidence(items, version=''):
            for item in items:
                quote = item.get('quote') or item.get('text') or ''
                details = []
                if item.get('page') is not None:
                    details.append(f"Page {item['page']}")
                state = item.get('state') or item.get('status')
                if state:
                    details.append(f'Status: {state}')
                item_version = item.get('version') or item.get('pdf_version') or version
                if item_version:
                    details.append(f'PDF version: {item_version}')
                label = ', '.join(details) or 'Source record'
                lines.append(f'- **{label}**' if markdown else f'- {label}')
                if quote:
                    lines.append(f'  > {quote}' if markdown else f'  "{quote}"')

        for event in events:
            evidence = event.get('evidence') or {}
            role = 'Question' if event['role'] == 'user' else 'Answer'
            lines.extend(((f'### {role}' if markdown else role), '', event['content'], ''))
            if event['role'] == 'user':
                selection = evidence.get('selection') or {}
                if selection.get('status'):
                    lines.append(f"Selection status: {selection['status']}")
                add_evidence(selection.get('segments') or [], evidence.get('evidence_version', ''))
                add_evidence(selection.get('rejected') or [], evidence.get('evidence_version', ''))
            else:
                add_evidence(evidence.get('evidence') or [], evidence.get('evidence_version', ''))
                for citation in evidence.get('citations') or []:
                    state = citation.get('state')
                    if state:
                        label = citation.get('id') or citation.get('page') or 'Citation'
                        lines.append(f'- Citation {label}: {state}')
            lines.append('')
        lines.append('Quoted source text and saved statuses are reproduced as recorded; they do not establish scientific support.')
        return '\n'.join(lines).rstrip() + '\n'
