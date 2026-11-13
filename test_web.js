const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync(__dirname + '/web/app.js', 'utf8');
const html = fs.readFileSync(__dirname + '/web/index.html', 'utf8');
const css = fs.readFileSync(__dirname + '/web/style.css', 'utf8');
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
assert(source.includes('data-watch-toggle='), 'File monitoring must have a one-click header switch independent of Zotero');
assert(source.includes('zoteroLinked!==false'), 'Local-only documents must suppress Zotero navigation links');
assert(source.includes("job.status!=='excluded'"), 'Obvious non-literature must stay out of the default inbox');
assert(html.includes('value="excluded"'), 'Excluded records must remain available through the audit filter');
assert(html.includes('value="preprint"'), 'The library must expose a preprint type filter');
assert(source.includes("row.kind==='preprint'"), 'The overview must account for preprints separately');
assert(source.includes('zotero://open-pdf/library/items/'), 'Q&A citations must link into Zotero PDF pages');
assert(source.includes('relatedButton=/^10\\.\\d{4,9}\\//'), 'Related-paper discovery must require a DOI');
assert(source.includes('/api/compare-synthesis'), 'Comparison synthesis must have a client API');
assert(source.includes("post('/api/compare-synthesis',{keys,focus,project})") && source.includes("::${project}`"), 'Comparison synthesis must use the library project in its request and cache signature');
assert(source.includes('/api/evidence-matrix?') && source.includes("action:'generate'") && source.includes("action:'edit'") && source.includes("action:'export'") && source.includes("action:'locate'"), 'Evidence matrix must load, generate, edit, export, and locate through its API');
assert(['research_question','sample','method','controls','endpoint','results','limitations'].every(field=>source.includes(`'${field}'`)), 'Evidence matrix must render all seven stored fields');
assert(source.includes('evidenceMatrixDrafts') && source.includes('Unsaved draft') && source.includes('matrix-cell-status'), 'Evidence matrix must retain unsaved per-cell drafts and expose evidence status');
assert(source.includes('data-version=') && source.includes('await showLocatedSource(located)'), 'Evidence source quotes must locate and highlight their source page');
assert(source.includes('/api/project-synthesis?') && source.includes("action:'edit',project,revision:value") && source.includes('project-synthesis-export'), 'Project drafts must restore, save, and export');
assert(source.includes("action:'locate',project,paper,version,page,quote") && source.includes("post('/api/project-synthesis',{action:'locate'") && source.includes('located=result.located'), 'Synthesis passage citations must use the located payload returned by the project synthesis API');
assert(css.includes('.synthesis-cite') && css.includes('.unsupported-cite'), 'Supported and unsupported synthesis citations must be visually distinct');
assert(source.includes('Select 2–12 papers first.') && source.includes('evidence-project'), 'Evidence matrix must enforce paper count and expose project scope');
assert(html.includes('可逐格修订并导出 Markdown 或 CSV'), 'Comparison view must describe the evidence matrix and exports');
assert(css.includes('.evidence-matrix-table') && css.includes('.matrix-origin.edited') && css.includes('.matrix-origin.draft'), 'Evidence matrix must style the wide table and distinguish generated, edited, and draft cells');
const matrixRoot={innerHTML:''};
const matrixContext={root:matrixRoot,el:id=>id==='evidence-matrix-root'?matrixRoot:{value:'project'},state:{evidenceMatrixProject:'project',evidenceMatrix:{project:'project',papers:['A','B'],cells:{A:{sample:{value:'Generated sample',status:'supported',sources:[],revision:null}},B:{sample:{value:'Edited sample',status:'supported',sources:[],revision:{}}}}},comparison:[],evidenceMatrixDrafts:{}},byKey:()=>({}),safeArray:value=>Array.isArray(value)?value:[],esc:value=>String(value),t:(zh,en)=>zh};
vm.createContext(matrixContext);
vm.runInContext(source.slice(source.indexOf('const matrixFields='),source.indexOf('const synthesisBase='))+'\n'+source.slice(source.indexOf('function matrixCitationWarning('),source.indexOf('function clearComparison()')),matrixContext);
matrixContext.renderEvidenceMatrix();
assert(matrixRoot.innerHTML.includes('生成值的状态由模型判断') && matrixRoot.innerHTML.includes('引句可定位不代表支持该结论') && matrixRoot.innerHTML.includes('人工修订也需自行确认'), 'The matrix must explain what generated and edited status labels establish');
assert(matrixRoot.innerHTML.includes('matrix-origin generated') && matrixRoot.innerHTML.includes('matrix-origin edited'), 'The matrix must distinguish generated and edited cells');
matrixContext.state.evidenceMatrix.cells.A.sample.generated={citationValidation:{rejectedCount:1,rejectedIds:['E999']}};
matrixContext.renderEvidenceMatrix();
assert(matrixRoot.innerHTML.includes('生成值引用了未提供的来源编号') && matrixRoot.innerHTML.includes('E999'), 'The matrix must show rejected generated citation IDs');
matrixContext.t=(zh,en)=>en;
matrixContext.renderEvidenceMatrix();
assert(matrixRoot.innerHTML.includes('Generated statuses are model judgments') && matrixRoot.innerHTML.includes('a locatable quote does not establish support') && matrixRoot.innerHTML.includes('Human edits also require confirmation'), 'The evidence boundary must also be visible in English');
assert(matrixRoot.innerHTML.includes('The generated value cited source IDs that were not supplied'), 'The citation warning must also be visible in English');
matrixContext.esc=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
assert(matrixContext.matrixCitationWarning({citationValidation:{rejectedCount:1,rejectedIds:['<img>']}}).includes('&lt;img&gt;'), 'Rejected IDs must be escaped');
assert(source.includes('/api/external-ingest'), 'Open-access discovery must support local ingestion');
assert(source.includes('/api/document-state'), 'Reading status and notes must persist through the local API');
assert(source.includes('/api/confirm'), 'Reviewed records must support explicit manual confirmation');
assert(source.includes("action==='open-file'") && source.includes('/api/open-job'), 'Reviewed records must open their source file');
assert(source.includes("job.status==='review'&&job.fileAvailable"), 'Only review records with an available source show the open-file action');
assert(source.includes('download-synthesis'), 'Evidence synthesis must support Markdown download');
assert(source.includes('next.length>=12'), 'Mini-review selection must support up to twelve papers');
assert(source.includes('async function navigateView'), 'View navigation must switch the active workspace view');
assert(!source.includes('scrollToTopSmooth') && source.includes('void target.offsetWidth'), 'View navigation must keep the scroll position and replay the horizontal transition');
assert(source.includes('view-enter-left') && source.includes('view-enter-right'), 'Workspace views must use directional horizontal transitions');
assert(html.includes('id="search-submit"'), 'Search submit button must exist');
assert(html.includes('id="result-hint"'), 'Result hint must have an id for dynamic updates');
assert(source.includes('isComposing'), 'Keydown handler must guard against IME composition');
assert(source.includes('external-card'), 'External search cards must be generated');
assert(source.includes('no-aside'), 'Search mode toggle must adjust grid layout for external mode');
assert(html.includes('id="reader-view"'), 'Reader view markup must exist');
assert(html.includes('vendor/pdfjs/pdf_viewer.css'), 'PDF viewer CSS must be included');
assert(html.includes('id="reader-tab"'), 'Reader tab must exist in navigation');
assert(html.includes('id="reader-viewport"'), 'Reader PDF viewport must exist');
assert(html.includes('id="reader-sidebar-qa"'), 'Reader AI Q&A sidebar must exist');
assert(source.includes('openReader'), 'Reader controller openReader must exist');
assert(source.includes('data-action="open-reader"'), 'Document cards must provide open-reader button');
assert(source.includes('/api/document/'), 'Reader must fetch PDF from document endpoint');
assert(source.includes('jumpToReaderPage'), 'Page citation jumping function must exist');
assert(source.includes('loadGeneration += 1'), 'Reader loads must be invalidated when switching documents');
assert(source.includes('loadingTask') && source.includes('task.destroy()'), 'Previous PDF loading tasks must be aborted and destroyed');
assert(source.includes('renderGeneration') && source.includes('renderTasks'), 'Page renders must be generation-guarded and cancellable');
assert(source.includes('data-retry-page='), 'Failed pages must expose an inline retry action');
assert(source.includes('releaseDistantPages'), 'Distant page canvases must be released to bound reader memory');
assert(source.includes('segments.push({ page:'), 'Reader selections must preserve page-local structured segments');
assert(source.includes("action: 'save-excerpt'"), 'Selected source text must be saveable as an excerpt');
assert(source.includes('data-delete-excerpt'), 'Saved excerpts must be deletable from the notes pane');
assert(source.includes('class="evidence-cite'), 'Evidence IDs in answers must render as citation controls');
assert(source.includes('readerState.evidence'), 'Evidence coordinates must be retained for page highlighting');
assert(source.includes('askingKeys.add'), 'Per-document Q&A loading state must prevent stale global disabling');
assert(html.includes('id="qa-save-excerpt"'), 'Reader selection toolbar must provide excerpt saving');
assert(html.includes('id="reader-excerpts"'), 'Reader notes must expose saved excerpts');
assert(html.includes('id="reader-open-tabs"'), 'Reader must provide a parallel document tab strip');
assert(!html.includes('tab-index'), 'Workspace and document tabs must not use sequence numbers');
assert(source.includes('openTabs: new Map()'), 'Reader must keep multiple open documents in a registry');
assert(source.includes('function activateReaderTab'), 'Reader tabs must switch without replacing other papers');
assert(source.includes('function closeReaderTab'), 'Reader tabs must close individually');
assert(source.includes('data-reader-tab=') && source.includes('data-close-reader-tab='), 'Reader tabs must expose switch and close actions');
assert(source.includes("storeReaderValue('tabs'"), 'Open reader tabs must persist across reloads');
const backHandler = source.match(/if\(button\.id==='reader-back-btn'\)\{[^}]+/);
assert(backHandler && backHandler[0].includes("navigateView('library')"), 'Reader back must leave tabs open when returning to the library');
assert(html.includes('id="summary-batch"'), 'Library must expose a batch reading-card toolbar');
assert(html.includes('id="summary-select-missing"') && html.includes('id="summary-generate"'), 'Batch toolbar must select missing cards and start generation');
assert(!source.includes('summarySelection') && !source.includes('summary-box'), 'Comparison and reading-card actions must share one selection');
assert(source.includes('const selected=state.comparison.length'), 'Batch generation must count the shared selection');
assert(source.includes("post('/api/summarize',{keys})"), 'Batch generation must submit selected document keys');
assert(source.includes("pending?'生成速读':'重新生成摘要'"), 'Card action must distinguish missing cards from regeneration');
assert(source.includes('function readingDecisionMarkup'), 'Reading cards must render the short reading decision');
assert(source.includes('data-action="open-dossier"'), 'Cards must provide a direct deep-reading dossier action');
assert(['card','dossier','qa','notes'].every(name => html.includes(`data-sidebar-tab="${name}"`)) && !html.includes('data-sidebar-tab="figure"'), 'Figure tools belong within deep reading');
assert(html.includes('id="deep-figure-tools"') && html.includes('id="figure-select"'), 'Deep reading retains figure selection');
assert(html.includes('id="dossier-generate"') && html.includes('id="dossier-content"'), 'Dossier pane must expose generation and rendered content');
assert(html.includes('id="reader-open-figure"') && source.includes("button.id==='reader-open-figure'"), 'Figure reading must open as a contextual assistant action');
assert(html.indexOf('class="reader-translate-rail"') < html.indexOf('id="reader-viewport"'), 'Selection and translation must use the left rail instead of the assistant sidebar');
assert(source.includes('function showReaderSidebarPane') && !html.includes('reader-sidebar-assistant'), 'Reading tools must switch peer panes without a hidden assistant wrapper');
assert(source.includes('caretPositionFromPoint') && source.includes('readerEndpointBefore') && source.includes('reader-selection-highlight'), 'PDF text selection must use character-level ranges with an explicit highlight overlay');
assert(css.includes('.reader-open-tabs') && /\.reader-open-tabs\s*\{[^}]*position:\s*sticky/s.test(css), 'Reader document tabs must remain pinned while scrolling');
assert(/\.reader-toolbar\s*\{[^}]*position:\s*sticky/s.test(css), 'Reader toolbar must remain pinned while scrolling');
assert(html.includes('id="reader-project"') && html.includes('class="reader-project-selector"'), 'Reader must provide one shared project selector');
assert(html.includes('id="qa-translate"') && html.includes('id="qa-translation"') && html.includes('data-translation-status') && html.includes('data-translation-result'), 'Selection toolbar must expose translation button and status/result region');
assert(html.includes('id="qa-translation-copy"'), 'Translation result must expose a copy action');
assert(source.includes("window.createScholarTranslation(window, async text =>") && source.includes("const result = await post('/api/translate',{text});") && source.includes("engine: result.engine || 'server'"), 'Reader must initialize the translation module with the API fallback and engine label');
assert(source.includes('readerSelectionText(selection)') && source.includes('segment.text'), 'Translation must use the complete selected segments');
assert(source.includes('checkReaderTranslationAvailability(readerState.selection, readerState.docKey)'), 'Selecting source text must check translation availability');
assert(source.includes('readerTranslation.translate(source') && source.includes('readerState.selection.segments === segments'), 'Translation must start from the click and ignore stale selection results');
assert(html.includes('id="translation-browser-configure"') && html.includes('id="translation-offline-download"') && html.includes('id="translation-offline-status"'), 'Settings must expose browser translation setup and offline model download controls');
assert(source.includes("readerTranslation.configure(loaded=>") && source.includes("post('/api/translator/offline',{})"), 'Translation settings must configure browser translation and install the offline fallback');
assert(html.includes('译文质量会下降') && html.includes('数字、缩写和学科术语尤其需要核对'), 'Offline model download must disclose reduced quality and verification needs');
assert(source.includes('navigator.clipboard.writeText'), 'Translation results must be copyable');
assert(html.indexOf('src="translation.js"') < html.indexOf('src="app.js"') && html.includes('src="translation.js" defer'), 'Translation script must load before app.js as a deferred script');
assert(source.includes("view: 'library'"), 'Library must be the default view');
assert(/<section id="library-view">/.test(html) && /<section id="home-view" hidden>/.test(html), 'Library must be the initially visible workspace view');
assert(source.includes("post('/api/dossier'"), 'Dossier generation must use the local API');
assert(source.includes('formatReaderAnswer(`[${id}]`, evidence)'), 'Dossier evidence IDs must become page-jump controls');
assert(source.includes('value.referenceWarnings'), 'Dossier must disclose discarded or downgraded unsupported references');
assert(source.includes("state.snapshot?.dossiers?.[row.key]"), 'Comparison must expose dossier readiness and coverage');
assert(html.includes('id="full-read-start"') && html.includes('id="full-read-content"'), 'Reader must expose automatic complete reading');
assert(html.includes('id="full-read-resume"') && html.includes('id="full-read-cancel"'), 'Complete reading must expose resume and cancel controls');
assert(html.includes('页面图像发送给所配置的模型服务'), 'Complete reading must disclose that page images are sent to the model service');
assert(source.includes("post('/api/full-read'") && source.includes("fetch(`/api/full-read?"), 'Complete reading must start and restore through the API');
assert(source.includes("{key, action}") && source.includes("updateFullRead('resume')") && source.includes("updateFullRead('cancel')"), 'Complete reading must submit explicit start, resume, and cancel actions');
assert(source.includes("['partial','interrupted','error','cancelled']") && source.includes('value.usage'), 'Complete reading must expose recovery, coverage, and available usage');
assert(html.includes('id="reading-session-select"') && html.includes('id="reading-session-create"') && html.includes('data-session-export="markdown"') && html.includes('data-session-export="text"'), 'Reader Q&A must expose session selection, creation, and both export formats');
assert(source.includes("post('/api/reading-session'") && source.includes("action:'rename'") && source.includes("action:'delete'"), 'Named reading sessions must support server backed list, create, rename, delete, draft, and export actions');
assert(source.includes('payload.session_id=requestSession') && source.includes('payload.request_id=sessionRequestId'), 'Named session chat must include a stable request id and session id');
assert(source.includes('await post(\'/api/reading-session\',{action:\'draft\'') && source.includes('await post(\'/api/paper-chat\', payload)'), 'Named session drafts must persist before chat submission');
assert(source.includes('scope?.paper===paper && scope.project===project && scope.version && scope.version===readerPdfVersion()'), 'Restored selection must match paper, project, and PDF version');
assert(source.includes('readerState.sessionDraftRevision!==revision || readerState.askingKeys.has(paper)') && source.includes('await flushReadingSessionDraft()'), 'Session refresh must protect active drafts and scope switches must flush captured autosaves');
assert(source.includes("session==='default'") && !source.includes("payload.session_id='default'"), 'Legacy default chat must continue without a session id');
assert(css.includes('.reading-session-controls'), 'Reading session controls must have a narrow-screen layout');
assert(css.includes('.full-read-source-warning'), 'Unlinked-figure warnings must have a visible warning style');
assert(source.includes('fullReadStateLabel') && source.includes('data-full-read-source'), 'Complete reading must render paragraph headings and verified source actions');
const fullReadLogic = source.slice(source.indexOf('function fullReadStateLabel('), source.indexOf('async function refreshFullRead('));
const fullReadContext = {nodes: {}, record: {
  status: 'partial', value: {
    coverage: {failedPages: 0, failedUnitBatches: 1, duplicateItemIds: ['P1-I1']},
    overview: {limitations: ['Overview limitation']},
    conflictAudit: {status:'partial', checkedItems:2, totalItems:3, truncatedItems:1, unverifiedNumericItems:1,
      failedBatches:1, rejectedCandidates:1, conflicts:[{quantity:'Lactate <quantity>', values:['0.6 mM','50 mM'],
        explanation:'Review <conditions>', evidence:[{itemId:'P1-I1',page:1,quote:'Original <quote>'},
          {itemId:'missing',page:2,quote:'Other quote'}]}]},
    items: [{id:'P1-I1', page:1, kind:'paragraph', heading:'Source <one>', sourceText:'Original', locationStatus:'located_quote', sourceVerified:true, summary:'Summary <model>', analysis:'Analysis <model>', evidence:'Evidence <model>', limitations:['Limit <model>']},
      {id:'P1-I2', page:1, kind:'figure', heading:'Figure only', sourceText:'Figure source', locationStatus:'located_quote', sourceVerified:false},
      {id:'P1-I3', page:1, kind:'paragraph', heading:'Old source', sourceText:'Old text', locationStatus:'located_quote', sourceVerified:false, sourceTextMayBeTruncated:true},
      {id:'P1-I4', page:2, kind:'caption', heading:'Verified caption', sourceText:'Caption', locationStatus:'located_quote', sourceVerified:true}],
    units: [
      {id:'U1', heading:'First <unit>', status:'unclear', mergedStatuses:['inferred','reported_result'], sourceItemIds:['P1-I1','P1-I3'], limitations:['Randomization <not reported>']},
      {id:'U2', heading:'Second unit', figureItemIds:['P1-I1', 'P1-I2', 'P1-I4', 'missing <figure>'], sourceWarnings:['Figure 2 <not linked>'], limitations:['Check sampling interval']},
      {id:'U3', heading:'Other unit', sourceItemIds:[], figureInterpretation:'Unlinked <figure>'}
    ]
  }
}};
vm.createContext(fullReadContext);
vm.runInContext(`const readerState = {}; const safeArray = v => Array.isArray(v) ? v : [];
  let t = (zh,en) => zh; const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const el = id => nodes[id] ||= {}; const applyLanguage = () => {};
  ${fullReadLogic} renderFullRead(record);`, fullReadContext);
const rendered = fullReadContext.nodes['full-read-content'].innerHTML;
assert(rendered.includes('多次引用的原文，需核对') && rendered.includes('Source &lt;one&gt;'), 'Duplicate review must show the escaped original source');
assert(rendered.includes('data-full-read-unit="0">First &lt;unit&gt;') && rendered.includes('data-full-read-unit="1">Second unit'), 'Duplicate review must link every citing unit, including figure-only references');
assert(!rendered.includes('data-full-read-unit="2"'), 'Unrelated units must not appear in duplicate review');
assert(rendered.includes('转写文字匹配原文') && rendered.includes('按部分文字定位') && rendered.includes('不能证明关联或结论正确'), 'Source matching must not imply that scientific relationships are verified');
assert(rendered.includes('旧版转写可能截断，需重新分析'), 'Legacy truncation must be visible beside the affected source');
assert(rendered.includes('<span>P1-I2</span>') && rendered.includes('Figure source'), 'Figure-only references must appear with their ID and source text in the unit evidence');
const figureSection = rendered.slice(rendered.indexOf('<article class="full-read-unit ', rendered.indexOf('First &lt;unit&gt;')), rendered.indexOf('Other unit'));
assert(figureSection.includes('data-full-read-source="P1-I2">P1-I2 · Figure only') && figureSection.includes('图表来源转写未完全核验，请核对原文。'), 'The figure link must expose its identifier and unverified transcription');
assert(figureSection.includes('data-full-read-source="P1-I4">P1-I4 · Verified caption') && figureSection.includes('图表来源转写匹配原文；图表关联仍需核对。'), 'A transcription match must not be presented as a verified figure association');
assert(figureSection.includes('记录中缺少这些图表来源： missing &lt;figure&gt;') && !figureSection.includes('data-full-read-source="missing'), 'Unavailable figure IDs must remain visible and escaped without a broken source button');
assert(figureSection.includes('图表关联提示（待核对）') && figureSection.includes('Figure 2 &lt;not linked&gt;'), 'Mentioned but unlinked figures must be shown as an escaped review warning');
delete fullReadContext.record.value.items[1].sourceVerified;
vm.runInContext('renderFullRead(record)', fullReadContext);
assert(fullReadContext.nodes['full-read-content'].innerHTML.includes('图表来源转写未完全核验，请核对原文。'), 'An older figure without a match flag must not be treated as verified');
assert(rendered.includes('模型摘要</strong> Summary &lt;model&gt;') && rendered.includes('逐页解读（待核对）</strong> Analysis &lt;model&gt;') && rendered.includes('模型提取的依据（待核对）</strong> Evidence &lt;model&gt;') && rendered.includes('逐页局限提示（待核对）</strong><ul><li>Limit &lt;model&gt;</li>'), 'All saved page-level interpretations must be escaped, displayed and labeled as model output');
assert(rendered.includes('没有关联可用的图表来源。') && rendered.includes('Unlinked &lt;figure&gt;'), 'A saved figure interpretation must be visible even when its figure source is unavailable');
assert(rendered.includes('合并前的模型状态不一致') && rendered.includes('AI 推断 / 报告结果'), 'Differing model statuses must remain visible for human review');
assert(rendered.includes('数值冲突检查（待核对）') && rendered.includes('检查范围不完整') && rendered.includes('已检查／符合条件的细项: 2/3') && rendered.includes('未纳入的含数字未核验转写: 1') && rendered.includes('失败批次: 1') && rendered.includes('未能核验的候选: 1'), 'Audit coverage and exclusions must be displayed');
assert(rendered.includes('此记录的候选使用旧数字匹配规则'), 'Legacy numeric matching must be disclosed');
assert(rendered.includes('此记录的候选使用旧引文核验规则'), 'Legacy quotation checks must be disclosed');
assert(rendered.includes('Lactate &lt;quantity&gt;') && rendered.includes('Review &lt;conditions&gt;') && rendered.includes('Original &lt;quote&gt;') && rendered.includes('data-full-read-source="P1-I1"') && !rendered.includes('data-full-read-source="missing"'), 'Conflict evidence must be escaped and link only available source items');
const limitationSection = rendered.slice(rendered.indexOf('<details class="full-read-warnings"><summary>各单元的局限提示'), rendered.indexOf('多次引用的原文，需核对'));
assert(limitationSection.includes('可能有误或不完整') && limitationSection.includes('Randomization &lt;not reported&gt;') && limitationSection.includes('Check sampling interval'), 'Overview must expose each unit limitation as an unverified lead even when the overview omits it');
assert(limitationSection.includes('data-full-read-unit="0">First &lt;unit&gt;') && limitationSection.includes('data-full-read-unit="1">Second unit'), 'Unit limitations must link to their own source-bearing unit');
vm.runInContext('t = (zh,en) => en; renderFullRead(record)', fullReadContext);
assert(fullReadContext.nodes['full-read-content'].innerHTML.includes('Unit limitations (review needed)') && fullReadContext.nodes['full-read-content'].innerHTML.includes('may be inaccurate or incomplete'), 'Unit limitation review must be explained in English');
assert(fullReadContext.nodes['full-read-content'].innerHTML.includes('Page interpretation (review needed)') && fullReadContext.nodes['full-read-content'].innerHTML.includes('Model-extracted evidence (review needed)') && fullReadContext.nodes['full-read-content'].innerHTML.includes('Page limitations (review needed)') && fullReadContext.nodes['full-read-content'].innerHTML.includes('No figure source is available for this link.'), 'Page-level and unlinked figure labels must also be available in English');
assert(fullReadContext.nodes['full-read-content'].innerHTML.includes('Figure source transcription is not fully verified; check the original.') && fullReadContext.nodes['full-read-content'].innerHTML.includes('the figure association still needs review.') && fullReadContext.nodes['full-read-content'].innerHTML.includes('These figure sources are missing from the record:'), 'Figure source verification and missing references must be explained in English');
assert(fullReadContext.nodes['full-read-content'].innerHTML.includes('Figure association warning (review needed)'), 'Unlinked-figure warnings must be explained in English');
assert(fullReadContext.nodes['full-read-content'].innerHTML.includes('Model statuses differed before merging') && fullReadContext.nodes['full-read-content'].innerHTML.includes('AI inference / Reported result'), 'Conflicting statuses must be explained in English');
assert(fullReadContext.nodes['full-read-content'].innerHTML.includes('Numerical conflict check (review needed)') && fullReadContext.nodes['full-read-content'].innerHTML.includes('an empty list does not establish their absence'), 'Conflict audit limitations must be explained in English');
assert(fullReadContext.nodes['full-read-content'].innerHTML.includes('older numeric matching rule'), 'Legacy numeric matching must be disclosed in English');
assert(fullReadContext.nodes['full-read-content'].innerHTML.includes('older quotation checks'), 'Legacy quotation checks must be disclosed in English');
vm.runInContext('t = (zh,en) => zh', fullReadContext);
fullReadContext.record.value.conflictAudit.valueMatchVersion = 2;
fullReadContext.record.value.conflictAudit.evidenceValidationVersion = 2;
vm.runInContext('renderFullRead(record)', fullReadContext);
assert(!fullReadContext.nodes['full-read-content'].innerHTML.includes('此记录的候选使用旧数字匹配规则'), 'New numeric matching must not be labeled legacy');
assert(!fullReadContext.nodes['full-read-content'].innerHTML.includes('此记录的候选使用旧引文核验规则'), 'New quotation checks must not be labeled legacy');
delete fullReadContext.record.value.conflictAudit.failedBatches;
fullReadContext.record.value.conflictAudit.status = 'complete';
vm.runInContext('renderFullRead(record)', fullReadContext);
assert(fullReadContext.nodes['full-read-content'].innerHTML.includes('旧记录的检查状态待核对'), 'Older audit statuses lack failed-batch counts and must not imply complete coverage');
fullReadContext.record.value.conflictAudit.status = 'not_applicable';
vm.runInContext('renderFullRead(record)', fullReadContext);
assert(fullReadContext.nodes['full-read-content'].innerHTML.includes('没有可检查的已匹配数字转写'), 'An unavailable audit must not be described as finding no conflicts');
delete fullReadContext.record.value.conflictAudit;
vm.runInContext('renderFullRead(record)', fullReadContext);
assert(!fullReadContext.nodes['full-read-content'].innerHTML.includes('数值冲突检查（待核对）'), 'A historical record without an audit must not invent one');
fullReadContext.record.value.units.forEach(unit => delete unit.limitations);
vm.runInContext('renderFullRead(record)', fullReadContext);
assert(!fullReadContext.nodes['full-read-content'].innerHTML.includes('各单元的局限提示'), 'Unit limitation section must be absent when no units supply limitations');
assert(fullReadContext.nodes['full-read-status'].textContent.includes('单元整理失败批次: 1'), 'A failed unit batch must be visible even when no page failed');
fullReadContext.record.historical = true;
fullReadContext.record.status = 'interrupted';
vm.runInContext('renderFullRead(record)', fullReadContext);
assert(fullReadContext.nodes['full-read-resume'].hidden, 'Historical records must not offer resume');
assert(fullReadContext.nodes['full-read-status'].textContent.includes('旧版完整深读记录') && !fullReadContext.nodes['full-read-status'].textContent.includes('可继续未完成页面'), 'Historical interrupted records must explain regeneration without offering resume');
vm.runInContext('t = (zh,en) => en; renderFullRead(record)', fullReadContext);
assert(fullReadContext.nodes['full-read-status'].textContent.includes('historical complete reading') && fullReadContext.nodes['full-read-status'].textContent.includes('cannot be resumed'), 'Historical state must be explained in English');
assert(source.includes("readerState.fullReadTimer = setTimeout(() =>") && source.includes("record.status === 'running'"), 'Complete reading must poll and restore an in-progress background job');
assert(source.includes("按实验阅读") && source.includes('sourceItemIds') && source.includes('figureItemIds'), 'Complete reading must group source items into experiment units with supporting figures');
console.log('Web search ranking checks passed');

const synthesisRoot={innerHTML:''}, synthesisProject={value:'study'};
const renderedDrafts=[];
const synthesisContext={
  state:{projectSynthesisProject:'study',projectSynthesisEdits:{},projectSynthesis:{
    generated:{markdown:'New [P1]',sources:[{id:'P1',key:'NEW',title:'New paper',basis:'full_text',passages:[{id:'P1E1',page:2,quote:'New excerpt',version:'new-version'}]}]},
    revision:{markdown:'Edited [P1]',sources:[{id:'P1',key:'OLD',title:'Old paper',basis:'metadata_only',passages:[{id:'P1E1',page:1,quote:'Old excerpt',version:'old-version'}]}]}}},
  el(id){return id==='project-synthesis-root'?synthesisRoot:synthesisProject;},
  t(zh){return zh;}, esc(value){return String(value);}, safeArray(value){return Array.isArray(value)?value:[];},
  synthesisBasisLabel(basis){return basis==='metadata_only'?'仅题录':basis==='full_text'?'全文':basis||'未提供';},
  modelAnswer(value,row,sources,project){renderedDrafts.push({value,sources,project});return value;},
};
vm.createContext(synthesisContext);
vm.runInContext(source.slice(source.indexOf('function synthesisReviewHint()'),source.indexOf('function renderComparison()'))+
  source.slice(source.indexOf('function renderProjectSynthesis()'),source.indexOf('function loadEvidenceMatrix(')),synthesisContext);
synthesisContext.renderProjectSynthesis();
assert(synthesisRoot.innerHTML.includes('Edited [P1]') && synthesisRoot.innerHTML.includes('Old paper (OLD)') && synthesisRoot.innerHTML.includes('仅题录'), 'A revision must retain its source mapping and basis after regeneration');
assert(synthesisRoot.innerHTML.includes('data-paper="OLD" data-version="old-version"') && synthesisRoot.innerHTML.includes('Old excerpt') && synthesisRoot.innerHTML.includes('data-paper="NEW" data-version="new-version"') && synthesisRoot.innerHTML.includes('New excerpt'), 'Revision and latest generation must each expose the excerpts from their own snapshot');
assert(synthesisRoot.innerHTML.includes('引用可定位不代表支持具体结论'), 'A saved draft must explain that a citation requires claim-level review');
assert((source.match(/esc\(synthesisReviewHint\(\)\)/g)||[]).length===2, 'The citation-review guidance must appear on both current and saved synthesis');
synthesisContext.t=(zh,en)=>en;
synthesisContext.renderProjectSynthesis();
assert(synthesisRoot.innerHTML.includes('A locatable citation does not establish support'), 'The citation-review guidance must also appear in English');
synthesisContext.t=zh=>zh;
synthesisContext.state.projectSynthesisEdits.study={markdown:'Unsaved [P1]',useGenerated:false,base:{sources:[{id:'P1',key:'OLD',title:'Old paper'}]}};
synthesisContext.renderProjectSynthesis();
assert(synthesisRoot.innerHTML.includes('Unsaved [P1]') && synthesisRoot.innerHTML.includes('Old paper (OLD)'), 'An in-progress edit must retain its source mapping when a new draft arrives');
synthesisContext.state.projectSynthesisEdits.study={markdown:'Working [P1]',useGenerated:true,base:{sources:[{id:'P1',key:'NEW',title:'New paper'}]}};
synthesisContext.renderProjectSynthesis();
assert(synthesisRoot.innerHTML.includes('Working [P1]') && synthesisRoot.innerHTML.includes('New paper (NEW)'), 'Starting from a new draft must use its citation mapping');
assert(renderedDrafts.at(-1).project==='study' && renderedDrafts.at(-1).sources[0].key==='NEW', 'Rendered project draft citations must use that draft snapshot and project');

(async()=>{
  const empty=()=>({projectSynthesisEdits:{},evidenceMatrixDrafts:{},promptDirty:false,settingsDirty:false,paperDrafts:{},comparison:[],compareFocus:'',snapshot:{csrf:'token'}});
  let confirmations=0,reloads=0,saves=0;
  const languageContext={uiLanguage:'zh',LANGUAGE_KEY:'language',state:empty(),t:(zh,en)=>zh,
    window:{confirm(){confirmations++;return false;}},localStorage:{setItem(){saves++;}},
    post:async()=>{saves++;},location:{reload(){reloads++;}},toast(){}};
  vm.createContext(languageContext);
  vm.runInContext(source.slice(source.indexOf('async function setLanguage('),source.indexOf('const el =')),languageContext);
  for(const change of [{projectSynthesisEdits:{study:{markdown:'draft'}}},{evidenceMatrixDrafts:{cell:{value:'draft'}}},
    {promptDirty:true},{settingsDirty:true},{paperDrafts:{paper:'question'}},{comparison:['paper']},{compareFocus:'question'}]){
    languageContext.state={...empty(),...change};
    await languageContext.setLanguage('en');
    assert.equal(languageContext.uiLanguage,'zh');
  }
  assert.equal(confirmations,7);
  assert.equal(reloads,0);
  assert.equal(saves,0);
  languageContext.state=empty();
  await languageContext.setLanguage('en');
  assert.equal(reloads,1);
  assert.equal(saves,2);
  languageContext.uiLanguage='zh';
  languageContext.state={...empty(),projectSynthesisEdits:{study:{markdown:'draft'}}};
  languageContext.window.confirm=()=>true;
  await languageContext.setLanguage('en');
  assert.equal(reloads,2);
  assert.equal(languageContext.uiLanguage,'en');
})().catch(error=>{console.error(error);process.exitCode=1;});

(async()=>{
  const nodes=Object.fromEntries(['model-url','model-name','model-key','watch-folders','watch-enabled','auto-summary','ai-output-language']
    .map(id=>[id,{value:'',checked:false}]));
  nodes['model-url'].value='https://example.org/v1';
  nodes['model-key'].value='first-key';
  const state={settingsDirty:true,settingsRevision:1,promptDirty:true,promptRevision:1};
  let resolvePost;
  const context={URL,uiLanguage:'zh',state,el:id=>nodes[id],promptPayload:()=>({}),setMessage(){},getState:async()=>{},
    runAction:async action=>action(),post:()=>new Promise(resolve=>{resolvePost=resolve;})};
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('async function saveSettings()'),source.indexOf("for(const name of ['category'",source.indexOf('async function saveSettings()'))),context);
  const saving=context.saveSettings();
  state.settingsRevision++;state.promptRevision++;
  nodes['model-key'].value='newer-key';
  resolvePost();
  await saving;
  assert.equal(state.settingsDirty,true,'New settings entered during a save must remain unsaved');
  assert.equal(state.promptDirty,true,'New prompt edits entered during a save must remain unsaved');
  assert.equal(nodes['model-key'].value,'newer-key','A newer credential input must not be cleared');
  const retry=context.saveSettings();
  resolvePost();
  await retry;
  assert.equal(state.settingsDirty,false);
  assert.equal(state.promptDirty,false);
  assert.equal(nodes['model-key'].value,'');
})().catch(error=>{console.error(error);process.exitCode=1;});

const citationLogic=source.slice(source.indexOf('function attachmentKey('),source.indexOf('function presetOptions('));
const citationContext={
  safeArray(value){return Array.isArray(value)?value:[];},
  text(value){return value==null?'':String(value);},
  esc(value){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));},
  t(zh){return zh;},
};
vm.createContext(citationContext);
vm.runInContext(citationLogic,citationContext);
const passageSources=[{id:'P1',key:'A1',title:'Paper',basis:'full_text',passages:[{id:'P1E1',page:7,quote:'A <safe> quote & more',version:'sha256:abc'}]}];
const citationMarkup=citationContext.modelAnswer('Claim [P1E1], paper [P1], missing [P2E9]',{},passageSources,'study');
const groupedCitation=citationContext.modelAnswer('Claim [P1E1, P2E9] and [P1E1对应P2E9]',{},passageSources,'study');
assert(groupedCitation.includes('data-paper="A1"') && groupedCitation.includes('class="unsupported-cite"') && groupedCitation.includes('[P1E1对应P2E9]'), 'Citation lists must yield separate controls while ambiguous prose remains unchanged');
assert(citationMarkup.includes('data-action="synthesis-source"') && citationMarkup.includes('data-project="study"') && citationMarkup.includes('data-paper="A1"') && citationMarkup.includes('data-version="sha256:abc"') && citationMarkup.includes('data-page="7"'), 'Known passage citations must carry their source, page, version, and project');
assert(citationMarkup.includes('data-quote="A &lt;safe&gt; quote &amp; more"') && citationMarkup.includes('title="A &lt;safe&gt; quote &amp; more"'), 'Passage quote attributes and titles must be HTML escaped');
assert(citationMarkup.includes('class="paper-cite"') && citationMarkup.includes('class="unsupported-cite"') && !citationMarkup.includes('data-paper="undefined"'), 'Paper citations remain supported and unknown passage IDs stay visibly unlinked');
const quotedCitation=citationContext.modelAnswer('Claim [P1E1]',{},[{...passageSources[0],zoteroLinked:false,passages:[{...passageSources[0].passages[0],quote:'Reference [P1]'}]}],'study');
assert(quotedCitation.includes('data-quote="Reference [P1]"'), 'Citation-like text in a source quotation must remain intact');
assert(!citationContext.modelAnswer('Paper [P1]',{},[{...passageSources[0],zoteroLinked:false}]).includes('zotero://'), 'Local-only papers must not create Zotero links');
vm.runInContext(source.slice(source.indexOf('function synthesisSourceIndex('),source.indexOf('function renderComparison()')),citationContext);
citationContext.synthesisBasisLabel=basis=>basis;
const sourceIndex=citationContext.synthesisSourceIndex([...passageSources,{id:'P2',key:'B2',title:'No excerpts',basis:'metadata_only'}],'study');
assert(sourceIndex.includes('查看该稿保存的原文摘录') && sourceIndex.includes('[P1E1]') && sourceIndex.includes('A &lt;safe&gt; quote &amp; more'), 'Source index must expose saved quotations, including uncited excerpts, with escaped text');
assert(sourceIndex.includes('data-action="synthesis-source"') && sourceIndex.includes('data-project="study"') && sourceIndex.includes('data-paper="A1"') && sourceIndex.includes('data-version="sha256:abc"') && sourceIndex.includes('data-page="7"'), 'Each saved excerpt must locate its own paper, version, page, and project');
assert(sourceIndex.includes('该稿未保存原文摘录') && sourceIndex.includes('速读卡等其他输入未列于此'), 'The index must distinguish missing excerpts and other inputs from complete full-text coverage');
assert.equal(citationContext.synthesisSourceIndex([],'study'),'');
assert(source.includes('synthesisSourceIndex(synthesis.sources,state.evidenceProject||libraryProject())') && source.includes('synthesisSourceIndex(active.sources,project)') && source.includes('synthesisSourceIndex(draft.generated.sources,project)'), 'Current synthesis, revision snapshot and latest generation must each show their own saved source mapping');

const referencesLogic=source.slice(source.indexOf('function synthesisBasisLabel('),source.indexOf('function loadProjectSynthesis('));
const referenceContext={safeArray(value){return Array.isArray(value)?value:[];},t(zh){return zh;}};
vm.createContext(referenceContext);
vm.runInContext(referencesLogic,referenceContext);
const exportedReferences=referenceContext.projectSynthesisReferences(passageSources);
assert(exportedReferences.includes('[P1] Paper (A1) · basis: full_text') && exportedReferences.includes('[P1E1] p. 7 · A1 · version: sha256:abc') && exportedReferences.includes('> A <safe> quote & more'), 'Markdown references must retain source basis and paper/passage provenance');
const report=referenceContext.synthesisMarkdown('Claim [P1E1]',passageSources);
assert(report.startsWith('Claim [P1E1]\n\n## 文献编号\n\n') && report.includes(exportedReferences), 'Synthesis reports must include the text and its source mapping');
assert(source.includes('navigator.clipboard.writeText(synthesisMarkdown(state.synthesis.markdown,state.synthesis.sources))') && source.includes('new Blob([synthesisMarkdown(state.synthesis.markdown,state.synthesis.sources)]') && source.includes("synthesisMarkdown(el('project-synthesis-edit').value,source.sources)"), 'Copy, download and project export must all include their own source mappings');
assert(referenceContext.synthesisBasisLabel('reading_card')==='速读卡' && referenceContext.synthesisBasisLabel('missing')==='missing', 'Known basis values must be labeled and unknown contract values remain visible');
assert(referenceContext.synthesisBasisLabel('full_text')==='原文摘录', 'A few supplied passages must not be described as the whole full text');

// A slow autosave must finish before a later draft is sent.
const draftPosts = [], draftResolvers = [];
const draftContext = {
  readerState:{sessionDraftTimer:null,pendingSessionDraft:{payload:{question:'first'}},sessionDraftSave:null,sessionDraftRevision:0},
  clearTimeout(){},
  post(path,payload){draftPosts.push(payload.question);return new Promise(resolve=>draftResolvers.push(resolve));},
};
vm.createContext(draftContext);
vm.runInContext(source.slice(source.indexOf('async function flushReadingSessionDraft()'),source.indexOf('function scheduleReadingSessionDraft()')),draftContext);
(async()=>{
  const first=draftContext.flushReadingSessionDraft();
  draftContext.readerState.pendingSessionDraft={payload:{question:'newer'}};
  const second=draftContext.flushReadingSessionDraft();
  assert.deepEqual(draftPosts,['first']);
  draftResolvers.shift()();
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(draftPosts,['first','newer']);
  draftResolvers.shift()();
  await Promise.all([first,second]);
  assert.equal(draftContext.readerState.pendingSessionDraft,null);
})().catch(error=>{console.error(error);process.exitCode=1;});

// Switching changes only each view's internal scroll position, never the window.
const navigationState = {view:'library',viewScroll:{},comparison:[]};
const navigationNodes = new Map();
const navigationContext = {
  state:navigationState, viewOrder:['home','library','compare','settings','reader'],
  window:{scrollTo(){throw Error('View switching must not scroll the window');}},
  document:{body:{classList:{toggle(){}}},querySelectorAll:()=>[]},
  el(id){if(!navigationNodes.has(id))navigationNodes.set(id,{hidden:false,scrollTop:0,classList:{add(){},remove(){}},offsetWidth:100});return navigationNodes.get(id);},
  renderResults(){},renderComparison(){},refreshTranslatorSettings(){},
};
vm.createContext(navigationContext);
vm.runInContext(source.slice(source.indexOf('function setView(view)'),source.indexOf('function normalized(')),navigationContext);
navigationContext.el('library-view').scrollTop=650;
navigationContext.setView('compare');
assert.equal(navigationContext.el('compare-view').scrollTop,0);
navigationContext.setView('library');
assert.equal(navigationContext.el('library-view').scrollTop,650);
navigationContext.setView('settings');
assert.equal(navigationContext.el('settings-view').scrollTop,0);
navigationContext.el('settings-view').scrollTop=120;
navigationContext.setView('reader');
navigationContext.setView('settings');
assert.equal(navigationContext.el('settings-view').scrollTop,120);

// Observer entries describe only changed intersections, not all visible pages.
{
  const page = (number, top, bottom) => ({dataset:{pageNumber:String(number)},getBoundingClientRect:()=>({top,bottom})});
  const pages = [page(2,-900,-10),page(3,0,1200),page(4,1220,2400)];
  const input = {value:2}, rendered = [], stored = [];
  let callback;
  const context = {readerState:{pdfDoc:{},docKey:'A',currentPage:2,loadGeneration:1},
    el(id){return id==='reader-viewport'?{getBoundingClientRect:()=>({top:0,bottom:600,height:600})}:
      id==='reader-pages-container'?{querySelectorAll:()=>pages}:input;},
    IntersectionObserver:class {constructor(fn){callback=fn;} observe(){} disconnect(){}},
    storeReaderValue(key,value){stored.push(value);},syncReaderTabState(){},
    renderReaderPage(number){rendered.push(number);},releaseDistantPages(){}};
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('function updateVisibleReaderPage('),source.indexOf('function releaseDistantPages(')),context);
  context.setupIntersectionObserver();
  callback([{target:pages[0],isIntersecting:true,intersectionRatio:0.9}]);
  assert.equal(input.value,3,'Select from actual viewport geometry, not the observer’s changed entries or its expanded margin');
  assert.deepEqual(rendered,[3]);
  context.updateVisibleReaderPage();
  assert.deepEqual(stored,[3],'Scrolling within the same page must not repeatedly persist the page');
  context.readerState.loadGeneration++;
  callback([{target:pages[0],isIntersecting:true,intersectionRatio:1}]);
  assert.equal(rendered.length,2,'A stale observer must not update the current document');
}

// A source location waits for the shared page render and cannot cross reader changes.
function readerHarness() {
  const nodes = new Map(), highlights = [], requests = [];
  function node() {
    const children = [];
    return {style:{}, classList:{add(){},remove(){}}, offsetWidth:1,
      setAttribute(){}, removeAttribute(){}, scrollIntoView(){},
      querySelector(selector){return children.find(child=>selector==='canvas' ? child.kind==='canvas' : selector==='.textLayer' && child.className==='textLayer') || null;},
      appendChild(child){children.push(child);}, set innerHTML(value){if(!value) children.length=0;},
    };
  }
  const page = {getViewport:()=>({width:100,height:150}), render:()=>({promise:Promise.resolve(),cancel(){}}), getTextContent:()=>Promise.resolve({})};
  const pdf = {getPage(number){return new Promise(resolve=>requests.push({number,resolve}));}};
  const state = {pdfDoc:pdf,docKey:'A',loadGeneration:1,renderGeneration:1,navigationGeneration:0,
    renderJobs:new Map(),renderTasks:new Map(),renderedPages:new Set(),totalPages:12,currentPage:1,zoomScale:1,pdfjsLib:{}};
  const context = {readerState:state,window:{devicePixelRatio:1},Promise,console,
    document:{createElement(tag){return tag==='canvas'?{kind:'canvas',style:{},getContext:()=>({scale(){}})}:{style:{}};}},
    el(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},
    showEvidenceRects(page,rects){highlights.push({page,rects});},
    storeReaderValue(){},syncReaderTabState(){},setupIntersectionObserver(){},toast(message){throw Error(message);},
    setTimeout(){},esc:value=>value,t:(zh,en)=>zh,
  };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('function releaseDistantPages('),source.indexOf('async function previewFigure(')),context);
  return {context,state,requests,highlights,page};
}
(async()=>{
  const h=readerHarness();
  const location=h.context.showLocatedSource({page:3,rects:[{x:0.2}]});
  const shared=h.context.renderReaderPage(3);
  await Promise.resolve();
  assert.equal(h.requests.length,1,'Concurrent requests must share one render');
  assert.equal(h.highlights.length,0,'Do not highlight before a slow page finishes rendering');
  h.requests.shift().resolve(h.page);
  assert.equal(await shared,true);
  await location;
  assert.equal(h.highlights.length,1);
  assert.equal(h.highlights[0].page,3);

  const stale=h.context.showLocatedSource({page:4,rects:[{}]});
  await Promise.resolve();
  h.state.docKey='B'; h.state.loadGeneration++; h.state.renderGeneration++;
  h.state.renderJobs.clear(); h.state.renderedPages.clear();
  h.requests.shift().resolve(h.page);
  await stale;
  assert.equal(h.highlights.length,1,'A previous document must never paint onto the new one');

  const navigated=h.context.showLocatedSource({page:5,rects:[{}]});
  await Promise.resolve();
  const other=h.context.jumpToReaderPage(6);
  await Promise.resolve();
  h.requests.shift().resolve(h.page);
  await navigated;
  assert.equal(h.highlights.length,1,'A later page navigation cancels the old location');
  h.requests.shift().resolve(h.page);
  await other;

  const zoomed=h.context.showLocatedSource({page:7,rects:[{}]});
  await Promise.resolve();
  const zoom=h.context.setReaderZoom(1.5);
  await Promise.resolve();
  h.requests.shift().resolve(h.page);
  await zoomed;
  assert.equal(h.highlights.length,1,'A zoom invalidates a pending location');
  h.requests.shift().resolve(h.page);
  await new Promise(resolve=>setImmediate(resolve));
  h.requests.shift().resolve(h.page);
  await zoom;

  const activeZoom=h.context.setReaderZoom(1.7);
  const duringZoom=h.context.showLocatedSource({page:8,rects:[{}]});
  await Promise.resolve();
  assert.equal(h.requests.length,1,'A location requested during zoom waits for zoom setup');
  h.requests.shift().resolve(h.page);
  await new Promise(resolve=>setImmediate(resolve));
  h.requests.shift().resolve(h.page);
  await activeZoom;
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.requests[0].number,8,'Location starts after zoom has finished');
  h.requests.shift().resolve(h.page);
  await duringZoom;
  assert.equal(h.highlights.length,2,'Location after zoom must remain visible');

  const released=h.context.showLocatedSource({page:1,rects:[{}]});
  await Promise.resolve();
  h.context.releaseDistantPages(12);
  const retry=h.context.renderReaderPage(1);
  await Promise.resolve();
  h.requests.shift().resolve(h.page);
  await released;
  assert.equal(h.highlights.length,2,'A released page cannot finish a stale location');
  h.requests.shift().resolve(h.page);
  assert.equal(await retry,true,'A released page can be rendered again');
})().catch(error=>{console.error(error);process.exitCode=1;});
