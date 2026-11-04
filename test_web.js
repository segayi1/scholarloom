const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync(__dirname + '/web/app.js', 'utf8');
const html = fs.readFileSync(__dirname + '/web/index.html', 'utf8');
const logic = source.slice(source.indexOf('function normalized('), source.indexOf('function filteredDocs('));
const context = {};
vm.createContext(context);
vm.runInContext("const text=v=>v==null?'':String(v);const list=v=>Array.isArray(v)?v:v?[v]:[];const uiLanguage='zh';"
  + "const esc=v=>text(v).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]));"
  + "const t=(zh,en)=>zh;" + logic, context);

const rows = [
  { key: 'A1', title: 'PD-1 epitopes', zhTitle: 'PD-1 表位', oneSentence: '表位分析', category: '抗体', subtopics: [], keywords: ['FG loop'], identifier: '10.1/example', authors: '', question: '', method: '', findings: [], useCase: '', studyModel: '', flags: [], attachmentURL: 'zotero://open-pdf/library/items/X' },
  { key: 'B1', title: 'An unrelated article', zhTitle: '无关论文', oneSentence: '细胞培养', category: '方法', subtopics: [], keywords: ['culture'], identifier: '10.2/example', authors: '', question: '', method: '', findings: [], useCase: '', studyModel: '', flags: [] },
  { key: 'P1', title: 'A patent', zhTitle: '专利', oneSentence: '公开号', category: '专利技术', subtopics: [], keywords: [], identifier: 'CN123456789A', authors: '', question: '', method: '', findings: [], useCase: '', studyModel: '', flags: [] },
];
const rank = q => rows.map(row => ({ row, score: context.relevance(row, q) })).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

assert.equal(rank('PD-1 表位')[0].row.key, 'A1');
assert.equal(rank('zotero')[0], undefined, 'Attachment URLs must not count as search content');
assert.equal(rank('CN123456789A')[0].row.key, 'P1');
assert.equal(rank('sdfqzzzxxyy').length, 0);
assert(context.highlighted('PD-1 epitope', 'PD-1').includes('<mark>PD-1</mark>'));
assert(context.matchExplanation(rows[0], 'PD-1 表位').includes('题名'));
assert(html.includes('id="language-toggle"'), 'Language switcher must remain in the page header');
assert(html.includes('<h1>ScholarLoom</h1>'), 'Product name must appear in the page header');
assert(html.includes('自动收文 · AI 速读 · 语义匹配'), 'Header must explain the core capabilities');
assert(source.includes("document.title = 'ScholarLoom'"), 'Document title must use the product name');
assert(source.includes("localStorage.getItem(LANGUAGE_KEY)"), 'Language preference must persist');
assert(html.includes('id="ai-output-language"'), 'AI output language control must exist');
assert(html.includes('id="prompt-editor"'), 'Prompt editor must exist');
assert(html.includes('id="search-mode-external"'), 'Online discovery mode must exist');
assert(html.includes('class="home-dashboard"'), 'Home layout must separate inbox and reading shortcuts');
assert(html.includes('class="hero-grid"'), 'Header must keep the capability summary and health overview distinct');
assert(source.includes('data-job-status='), 'Inbox summary states must provide direct filters');
assert(source.includes('zotero://open-pdf/library/items/'), 'Q&A citations must link into Zotero PDF pages');
assert(source.includes('relatedButton=/^10\\.\\d{4,9}\\//'), 'Related-paper discovery must require a DOI');
assert(source.includes('/api/compare-synthesis'), 'Comparison synthesis must have a client API');
assert(source.includes('/api/external-ingest'), 'Open-access discovery must support local ingestion');
assert(source.includes('/api/document-state'), 'Reading status and notes must persist through the local API');
assert(source.includes('download-synthesis'), 'Evidence synthesis must support Markdown download');
assert(source.includes('next.length>=12'), 'Mini-review selection must support up to twelve papers');
assert(source.includes('async function navigateView'), 'View navigation must coordinate scrolling before content changes');
assert(source.indexOf('await scrollToTopSmooth()') < source.indexOf('if(request===pendingViewNavigation)setView(view)'), 'Navigation must reach the top before swapping views');
console.log('Web search ranking checks passed');
