const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync(__dirname + '/web/app.js', 'utf8');
const html = fs.readFileSync(__dirname + '/web/index.html', 'utf8');
const logic = source.slice(source.indexOf('function normalized('), source.indexOf('function filteredDocs('));
const context = {};
vm.createContext(context);
vm.runInContext("const text=v=>v==null?'':String(v);const list=v=>Array.isArray(v)?v:v?[v]:[];" + logic, context);

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
assert(html.includes('id="language-toggle"'), 'Language switcher must remain in the page header');
assert(source.includes("localStorage.getItem(LANGUAGE_KEY)"), 'Language preference must persist');
console.log('Web search ranking checks passed');
