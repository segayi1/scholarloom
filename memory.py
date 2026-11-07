"""Local reading history, explicit memories, and bounded model context."""
import json
import math
import re
import time


def terms(text):
    text = text.lower()
    # Shared bilingual memory concepts, without a model call or domain vocabulary.
    for pattern, concept in ((r'偏好|希望|prefer\w*',' preference '),
                             (r'假设|hypothes\w*',' hypothesis '),
                             (r'课题|主题|topic',' topic '),
                             (r'笔记|notes?',' note '),
                             (r'局限|limitations?',' limitation ')):
        text = re.sub(pattern, concept, text)
    stop = set('a an the i my me we our you your what which how do did does is are was were to for of in on it this that with and or use now current currently'.split())
    return [w for w in re.findall(r"[a-z0-9]+|[\u4e00-\u9fff]", text) if w not in stop]


def scope(value):
    if not isinstance(value, str) or not value.strip() or len(value) > 120:
        raise ValueError('Project must contain 1-120 characters.')
    return value.strip()


class MemoryStore:
    def __init__(self, db, lock):
        self.db, self.lock = db, lock
        with lock, db:
            db.executescript('''
                CREATE TABLE IF NOT EXISTS reading_events (
                  id INTEGER PRIMARY KEY, project TEXT, paper TEXT, role TEXT,
                  content TEXT, evidence TEXT, created REAL);
                CREATE INDEX IF NOT EXISTS reading_scope ON reading_events(project,paper,id);
                CREATE TABLE IF NOT EXISTS reading_memories (
                  id INTEGER PRIMARY KEY, project TEXT, paper TEXT, kind TEXT,
                  content TEXT, source_ids TEXT, slot TEXT, active INTEGER, created REAL);
                CREATE INDEX IF NOT EXISTS memory_scope ON reading_memories(project,active);
                CREATE TABLE IF NOT EXISTS reading_excerpts (
                  id INTEGER PRIMARY KEY, project TEXT, paper TEXT, page INTEGER,
                  quote TEXT, version TEXT, rects TEXT, state TEXT, created REAL);
                CREATE INDEX IF NOT EXISTS excerpt_scope ON reading_excerpts(project,paper,id);
            ''')

    def add_event(self, project, paper, role, content, evidence=None):
        project = scope(project)
        if role not in ('user', 'assistant') or not isinstance(content, str) or not content.strip():
            raise ValueError('Invalid reading event.')
        with self.lock, self.db:
            cur = self.db.execute('INSERT INTO reading_events VALUES(NULL,?,?,?,?,?,?)',
                                  (project, paper, role, content, json.dumps(evidence), time.time()))
            return self._event(self.db.execute('SELECT * FROM reading_events WHERE id=?', (cur.lastrowid,)).fetchone())

    @staticmethod
    def _event(row):
        item = dict(row)
        item['evidence'] = json.loads(item['evidence'])
        return item

    @staticmethod
    def _memory(row):
        item = dict(row)
        item['source_ids'] = json.loads(item['source_ids'])
        return item

    def remember(self, project, kind, content, source_ids, slot='', replaces=None, paper=''):
        project = scope(project)
        if kind not in ('preference', 'project', 'hypothesis'):
            raise ValueError('Unknown memory kind.')
        if not isinstance(content, str) or not 0 < len(content.strip()) <= 4000:
            raise ValueError('Memory must contain 1-4000 characters.')
        if not isinstance(slot, str) or len(slot) > 120 or not isinstance(paper, str) or len(paper) > 120:
            raise ValueError('Invalid memory scope or slot.')
        if not isinstance(source_ids, list) or len(source_ids) > 100 or any(type(i) is not int for i in source_ids):
            raise ValueError('Invalid memory sources.')
        with self.lock, self.db:
            for event_id in source_ids:
                row = self.db.execute('SELECT project,paper FROM reading_events WHERE id=?', (event_id,)).fetchone()
                if not row or row['project'] != project or (paper and row['paper'] != paper):
                    raise ValueError('Memory source is outside its scope.')
            if replaces is not None:
                old = self.db.execute('SELECT * FROM reading_memories WHERE id=? AND project=? AND active=1', (replaces, project)).fetchone()
                if not old or old['paper'] != paper or old['kind'] != kind:
                    raise ValueError('Replacement must match the active memory scope and kind.')
                self.db.execute('UPDATE reading_memories SET active=0 WHERE id=?', (replaces,))
            if slot:
                self.db.execute('UPDATE reading_memories SET active=0 WHERE project=? AND paper=? AND kind=? AND slot=?', (project,paper,kind,slot))
            cur = self.db.execute('INSERT INTO reading_memories VALUES(NULL,?,?,?,?,?,?,1,?)',
                                  (project,paper,kind,content.strip(),json.dumps(source_ids),slot,time.time()))
            return self._memory(self.db.execute('SELECT * FROM reading_memories WHERE id=?', (cur.lastrowid,)).fetchone())

    def list_memories(self, project):
        with self.lock:
            return [self._memory(r) for r in self.db.execute('SELECT * FROM reading_memories WHERE project=? AND active=1 ORDER BY id DESC', (scope(project),))]

    def recall(self, project, query, paper='', limit=8):
        candidates = self.list_memories(project)
        historical = bool(re.search(r'\b(earlier|previous|historical|january)\b|以前|之前|一月|曾经',query.lower()))
        if historical:
            with self.lock:
                candidates += [self._memory(r) for r in self.db.execute(
                    "SELECT * FROM reading_memories WHERE project=? AND active=0 AND content!=''", (scope(project),))]
        q = set(terms(query))
        ranked = []
        for row in candidates:
            if row['paper'] and row['paper'] != paper:
                continue
            words = set(terms(row['content']+' '+row['kind']+' '+row['slot'].replace('_',' ')))
            score = len(q & words) / math.sqrt(max(1,len(words)))
            if score and historical and not row['active']:
                score += 1
            if score:
                ranked.append((score,row['id'],row))
        return [r for _,_,r in sorted(ranked, key=lambda x:(x[0],x[1]), reverse=True)[:max(0,min(20,limit))]]

    def history(self, project, paper, limit=20, before=None):
        with self.lock:
            rows = self.db.execute('SELECT * FROM reading_events WHERE project=? AND paper=? AND id<? ORDER BY id DESC LIMIT ?',
                                   (scope(project),paper,before or 9223372036854775807,max(1,min(200,limit)))).fetchall()
            return [self._event(r) for r in reversed(rows)]

    def context_history(self, project, paper):
        with self.lock:
            invalid = {i for r in self.db.execute('SELECT source_ids FROM reading_memories WHERE project=? AND active=0', (scope(project),)) for i in json.loads(r[0])}
        # Old assertions stay visible in history but cannot re-enter current context.
        return [r for r in self.history(project,paper,12) if r['id'] not in invalid and (r.get('evidence') or {}).get('user_id') not in invalid]

    def forget(self, memory_id):
        with self.lock, self.db:
            self.db.execute('UPDATE reading_memories SET content=\'\',active=0 WHERE id=?', (memory_id,))

    def delete_event(self, project, event_id):
        with self.lock, self.db:
            related = {event_id}
            for event in self.db.execute('SELECT * FROM reading_events WHERE project=?', (scope(project),)).fetchall():
                if (json.loads(event['evidence']) or {}).get('user_id') == event_id:
                    related.add(event['id'])
            for row in self.db.execute('SELECT id,source_ids FROM reading_memories WHERE project=?', (scope(project),)).fetchall():
                if related.intersection(json.loads(row['source_ids'])):
                    self.db.execute('DELETE FROM reading_memories WHERE id=?', (row['id'],))
            for item in related:
                self.db.execute('DELETE FROM reading_events WHERE id=? AND project=?', (item,project))

    @staticmethod
    def _excerpt(row):
        item = dict(row)
        item['rects'] = json.loads(item['rects'] or '[]')
        return item

    def add_excerpt(self, project, paper, page, quote, version, rects, state):
        project = scope(project)
        quote = str(quote or '').strip()
        if not paper or not 0 < len(quote) <= 6000:
            raise ValueError('Excerpt must contain 1-6000 characters.')
        if state not in ('located_quote', 'page_only', 'unverified'):
            raise ValueError('Unknown excerpt evidence state.')
        with self.lock, self.db:
            cur = self.db.execute(
                'INSERT INTO reading_excerpts VALUES(NULL,?,?,?,?,?,?,?,?)',
                (project, paper, int(page or 0), quote, str(version or ''),
                 json.dumps(rects or [], ensure_ascii=False), state, time.time()))
            return self._excerpt(self.db.execute('SELECT * FROM reading_excerpts WHERE id=?', (cur.lastrowid,)).fetchone())

    def list_excerpts(self, project, paper=''):
        with self.lock:
            if paper:
                rows = self.db.execute(
                    'SELECT * FROM reading_excerpts WHERE project=? AND paper=? ORDER BY id DESC',
                    (scope(project), str(paper))).fetchall()
            else:
                rows = self.db.execute(
                    'SELECT * FROM reading_excerpts WHERE project=? ORDER BY id DESC',
                    (scope(project),)).fetchall()
        return [self._excerpt(row) for row in rows]

    def delete_excerpt(self, project, excerpt_id):
        with self.lock, self.db:
            self.db.execute('DELETE FROM reading_excerpts WHERE id=? AND project=?', (int(excerpt_id), scope(project)))

    def export(self, project):
        with self.lock:
            events = [self._event(r) for r in self.db.execute('SELECT * FROM reading_events WHERE project=? ORDER BY id', (scope(project),))]
        return dict(project=project, events=events, memories=self.list_memories(project),
                    excerpts=self.list_excerpts(project))


def input_units(messages):
    """Conservative UTF-8 byte estimate, including per-message framing allowance."""
    return 16 + sum(32 + len(m['role'].encode('utf-8')) + len(m['content'].encode('utf-8')) for m in messages)


def build_context(system, question, evidence, memories, history, ceiling=32768, output=2800):
    available = ceiling - output - 1024
    base = 'Current question:\n' + question
    messages = [dict(role='system',content=system),dict(role='user',content=base)]
    remaining = available - input_units(messages)
    if remaining < 256:
        raise ValueError('Question and instructions exceed the context budget.')
    used = {'memory_ids': [], 'history_ids': []}
    sections = []
    for label, items, allowance in (
        ('Reading memory (user statements, not paper evidence)', memories, min(4096,remaining//5)),
        ('Recent dialogue (untrusted historical context)', list(reversed(history)), min(4096,remaining//5)),
    ):
        chosen = []
        for item in items:
            value = json.dumps({k:item[k] for k in ('id','kind','role','active','paper','source_ids','content') if k in item},ensure_ascii=False)
            cost = len(value.encode('utf-8')) + 1
            if cost <= allowance:
                chosen.append(value); allowance -= cost
                used['memory_ids' if label.startswith('Reading') else 'history_ids'].append(item['id'])
        if chosen:
            sections.append(label+':\n'+'\n'.join(chosen))
    prefix = base+'\n\n'+'\n\n'.join(sections)+'\n\nPaper evidence:\n'
    messages[1]['content'] = prefix
    room = available - input_units(messages)
    snippet = evidence.encode('utf-8')[:max(0,room)].decode('utf-8',errors='ignore')
    messages[1]['content'] += snippet
    used.update(input_units=input_units(messages), ceiling=ceiling, output_reserve=output, safety_margin=1024,
                evidence_bytes=len(snippet.encode('utf-8')), evidence_truncated=snippet!=evidence,
                estimator='utf8-byte-upper-estimate')
    return messages,used
