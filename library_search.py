"""Project-scoped lexical search over indexed page evidence."""

from collections import Counter
import re
import unicodedata

from memory import scope, terms


class LibrarySearch:
    def __init__(self, db, lock, evidence):
        self.db, self.lock, self.evidence = db, lock, evidence
        with lock, db:
            db.executescript('''
                CREATE TABLE IF NOT EXISTS library_project_members (
                  project TEXT NOT NULL, paper TEXT NOT NULL,
                  PRIMARY KEY(project, paper));
                CREATE INDEX IF NOT EXISTS library_members_project
                  ON library_project_members(project, paper);
            ''')

    def set_members(self, project, keys):
        """Replace a project's paper membership and return its sorted members."""
        project = scope(project)
        if not isinstance(keys, (list, tuple)) or any(not isinstance(p, str) or not p.strip() for p in keys):
            raise ValueError('Papers must be a list of non-empty paper IDs.')
        members = sorted({paper.strip() for paper in keys})
        with self.lock, self.db:
            self.db.execute('DELETE FROM library_project_members WHERE project=?', (project,))
            self.db.executemany(
                'INSERT INTO library_project_members(project,paper) VALUES (?,?)',
                [(project, paper) for paper in members])
        return members

    def members(self, project):
        with self.lock:
            return [row[0] for row in self.db.execute(
                'SELECT paper FROM library_project_members WHERE project=? ORDER BY paper',
                (scope(project),))]

    def _coverage(self, members):
        documents = []
        with self.lock:
            for paper in members:
                row = self.db.execute(
                    'SELECT sha256,page_count,indexed,readable,state FROM evidence_versions WHERE document=?',
                    (paper,)).fetchone()
                if not row:
                    documents.append(dict(paper=paper, state='absent', page_count=0,
                                          indexed=0, readable=0, image_only=0, version=''))
                    continue
                indexed_rows = self.db.execute(
                    'SELECT page,text FROM evidence_pages WHERE document=? AND version=? ORDER BY page',
                    (paper, row['sha256'])).fetchall()
                indexed_pages = len(indexed_rows)
                readable_pages = sum(bool((page['text'] or '').strip()) for page in indexed_rows)
                page_count = row['page_count'] or 0
                image_only = max(0, indexed_pages - readable_pages)
                if not indexed_pages:
                    state = 'absent'
                elif row['indexed'] < page_count or indexed_pages < row['indexed']:
                    state = 'partial'
                elif not readable_pages:
                    state = 'image_only'
                else:
                    state = 'searchable'
                documents.append(dict(paper=paper, state=state, page_count=page_count,
                                      indexed=indexed_pages, readable=readable_pages,
                                      image_only=image_only,
                                      unindexed_pages=sorted(set(range(1, page_count + 1)) -
                                                             {page['page'] for page in indexed_rows}),
                                      pages=[dict(page=page['page'], state=(
                                          'searchable' if (page['text'] or '').strip() else 'image_only'))
                                          for page in indexed_rows], version=row['sha256']))
        counts = {name: sum(doc['state'] == name for doc in documents)
                  for name in ('absent', 'partial', 'image_only', 'searchable')}
        if not members:
            state = 'no_members'
        elif counts['absent'] == len(members):
            state = 'absent'
        elif counts['absent'] or counts['partial']:
            state = 'partial'
        elif counts['image_only']:
            state = 'image_only'
        else:
            state = 'searchable'
        return dict(state=state, members=len(members), **counts, documents=documents)

    def search(self, project, query, synonyms=(), exclude=()):
        """Search only project members; return page/block hits and coverage."""
        project = scope(project)
        if not isinstance(query, str):
            raise ValueError('Query must be text.')
        members = self.members(project)
        coverage = self._coverage(members)
        query_terms = list(dict.fromkeys(terms(query)))
        if not query_terms:
            return dict(status='no_query_terms', query=query, results=[], coverage=coverage)

        if not isinstance(synonyms, (list, tuple)) or any(not isinstance(word, str) or len(word) > 100 for word in synonyms):
            raise ValueError('Synonyms must be a list of text terms.')
        compact = lambda text: ''.join(ch for ch in unicodedata.normalize('NFKC', text).lower() if ch.isalnum())
        synonyms = [compact(word) for word in synonyms if compact(word)]
        patterns = {word: re.compile(r'(?<![a-z0-9])' + r'[\W_]*'.join(map(re.escape, word)) + r'(?![a-z0-9])')
                    for word in synonyms if word.isascii()}
        candidates = []
        for document in coverage['documents']:
            if not document['version'] or document['paper'] in exclude:
                continue
            pages = self.evidence.pages(dict(document=document['paper'], version=document['version']))
            for page in pages:
                for block in page['blocks']:
                    quote = str(block.get('text') or '').strip()
                    if not quote:
                        continue
                    counts = Counter(terms(quote))
                    matched = [term for term in query_terms if counts[term]]
                    normalized_quote = unicodedata.normalize('NFKC', quote).lower()
                    matched_synonyms = [word for word in synonyms if
                                        (patterns[word].search(normalized_quote) if word in patterns else word in compact(quote))]
                    if not matched and not matched_synonyms:
                        continue
                    # Distinct query coverage drives relevance; a small capped frequency
                    # bonus favors repeated terms without letting long blocks dominate.
                    bonus = sum(min(counts[t], 3) for t in matched) * 0.02
                    score = len(matched) / len(query_terms) + bonus + (0.5 if matched_synonyms else 0)
                    candidates.append(dict(
                        paper=document['paper'], page=page['page'], version=document['version'],
                        quote=quote[:700], rects=[block['rect']] if block.get('rect') else [],
                        matched_terms=matched, score=round(score, 4),
                        explanation=(f'Matched {len(matched)}/{len(query_terms)} query terms' +
                                     (f'; related terms: {", ".join(matched_synonyms)}' if matched_synonyms else '') + '.')))
        candidates.sort(key=lambda item: (-item['score'], -len(item['matched_terms']),
                                          item['paper'], item['page'], item['quote']))
        results = candidates[:20]
        status = 'ok' if results else 'no_matches'
        return dict(status=status, query=query, results=results, coverage=coverage)
