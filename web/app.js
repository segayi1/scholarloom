(() => {
  'use strict';
  const LANGUAGE_KEY = 'literature-workbench-language';
  let uiLanguage = (() => { try { return localStorage.getItem(LANGUAGE_KEY) === 'en' ? 'en' : 'zh'; } catch { return 'zh'; } })();
  const zhToEn = new Map(Object.entries({
    '自动收文 · AI 速读 · 语义匹配，把散落的文献编织成可检索的私人知识库。': 'Automatic intake · AI reading cards · semantic matching. Weave scattered papers into a searchable private knowledge base.',
    '下载、整理、速读与 Zotero 文献库在这里衔接。': 'Download, organize, and read literature with Zotero in one place.',
    '搜索': 'Search',
    '检索中…': 'Searching...',
    '支持查看原文出处与一键下载公开全文入库': 'View online records or add open-access papers to your library',
    '无公开PDF': 'No open PDF',
    '暂无在线摘要': 'No abstract available',
    '正在连接本地服务…': 'Connecting to the local service...',
    '工作台页面': 'Workbench pages',
    '工作台': 'Workbench',
    '检索与导读': 'Search & Guides',
    '对比阅读': 'Compare',
    '设置': 'Settings',
    '收件箱': 'Inbox',
    '查看新文件识别、导入与摘要进度。': 'Track recognition, import, and summary progress for new files.',
    '扫描新增文件': 'Scan for new files',
    '把已有下载文件加入识别': 'Add existing downloads',
    '显示': 'Show',
    '收件箱状态筛选': 'Filter inbox status',
    '全部状态': 'All statuses',
    '排队中': 'Queued',
    '处理中': 'Processing',
    '可导入': 'Ready to import',
    '待核对': 'Needs review',
    '已排除': 'Excluded',
    '已导入': 'Imported',
    '重复': 'Duplicate',
    '已忽略': 'Ignored',
    '出错': 'Error',
    '等待 Zotero': 'Waiting for Zotero',
    '生成摘要中': 'Generating summary',
    '快速检索': 'Quick search',
    '搜索已有和新导入文献的题名、摘要、作者与关键词。': 'Search titles, reading cards, authors, and keywords across the library.',
    '打开文献检索 →': 'Open literature search →',
    '输入题名、主题或关键词': 'Enter a title, topic, or keyword',
    '快速检索文献': 'Quick literature search',
    '搜索文献': 'Search literature',
    '本地文献': 'Local library',
    '全网发现': 'Discover online',
    '检索范围': 'Search scope',
    '例如：单B细胞抗体克隆 / CAR-T持久性 / PD-1表位': 'Try: single B-cell cloning / CAR-T persistence / PD-1 epitope',
    '重置': 'Reset',
    '研究主题': 'Research topic',
    '文献类型': 'Document type',
    '年份': 'Year',
    '研究形式': 'Study type',
    '阅读状态': 'Reading status',
    '全部主题': 'All topics',
    '全部类型': 'All types',
    '期刊文献': 'Journal articles',
    '专利': 'Patents',
    '预印本': 'Preprints',
    '全部年份': 'All years',
    '全部研究形式': 'All study types',
    '全部阅读状态': 'All reading statuses',
    '未读': 'Unread',
    '在读': 'Reading',
    '已读': 'Read',
    '可检索文献': 'Searchable documents',
    '待导入': 'Ready to import',
    '支持中英文题名、摘要、作者、关键词和常见主题词。新文献随服务状态更新加入检索。': 'Searches English and Chinese titles, summaries, authors, keywords, and related terms. New records appear as the local service updates.',
    '问题路线': 'Question paths',
    '勾选 2–12 篇可对比或生成小综述': 'Select 2–12 papers to compare or synthesize',
    '加载更多文献': 'Load more literature',
    '对比与证据综述': 'Comparison and evidence synthesis',
    '2–4 篇快速对比；5–12 篇用证据台账生成聚焦小综述。': 'Compare 2–4 papers directly; synthesize 5–12 through an evidence ledger.',
    '生成问题路线': 'Generate research routes',
    '主题随资料自动整理；路线按需生成。': 'Topics update automatically; generate routes on demand.',
    '最多选取 80 篇文献，生成会使用模型额度。': 'Uses up to 80 papers and the configured model.',
    '清空选择': 'Clear selection',
    '清空': 'Clear',
    '开始对比': 'Start comparison',
    '本机连接与摘要': 'Local connections and summaries',
    '设置保存在本机。授权与模型密钥仅由你在本机配置。': 'Settings stay on this computer. Configure Zotero access and model credentials locally.',
    '下载监看': 'Download monitoring',
    '监看以下文件夹': 'Watch these folders',
    '新增的 PDF/EPUB 会进入收件箱识别。': 'New PDF and EPUB files enter the recognition inbox.',
    '文件夹路径（每行一个绝对路径）': 'Folder paths (one absolute path per line)',
    '例如：C:\\Users\\你\\Downloads': 'Example: C:\\Users\\you\\Downloads',
    '打开文献备份文件夹': 'Open literature backup folder',
    '连接后 ScholarLoom 可读写你的 Zotero 文献库。首次请在 Zotero 权限弹窗选择 Always Allow（始终允许），即可持续自动导入。之后可在 Zotero 高级设置撤销授权。': 'After connecting, ScholarLoom can read and write your Zotero library. Choose Always Allow in Zotero once to support automatic imports. You can revoke access later in Zotero Advanced settings.',
    '连接 Zotero': 'Connect Zotero',
    '科研模型': 'Research model',
    'API 地址': 'API URL',
    '模型名称': 'Model name',
    '填写模型名称': 'Enter a model name',
    '留空表示保留当前密钥': 'Leave blank to keep the current key',
    'AI 输出语言': 'AI output language',
    '跟随界面': 'Follow interface',
    '简体中文': 'Simplified Chinese',
    '导入后按所选 AI 输出语言生成速读': 'Generate reading cards in the selected AI output language after import',
    '速读、单篇问答与跨篇综述使用同一种输出语言。只会把当前文献的摘要或正文提取文本发送到你填写的模型。': 'Reading cards, paper Q&A, and cross-paper synthesis share one output language. Only the selected document abstract or extracted text is sent to your model.',
    '保存全部设置': 'Save all settings',
    '测试科研模型': 'Test research model',
    '场景科研提示词': 'Research prompt presets',
    '按实际审稿与证据综合任务定制': 'Customize prompts for review and evidence-synthesis tasks',
    '每种场景都有中英文版本；模型会根据“AI 输出语言”使用对应版本。已保存的旧速读不会被改写。': 'Each preset has Chinese and English versions. The model uses the one that matches AI output language. Existing reading cards are not rewritten.',
    '恢复默认提示词': 'Restore defaults',
    '保存提示词': 'Save prompts',
    '智能科研问答与相似文献': 'Paper Q&A and related literature',
    '选择场景': 'Choose a preset',
    '可补充具体问题': 'Add a specific question',
    '提问': 'Ask',
    '找相似文献': 'Find related papers',
    '正在阅读全文并核对证据…': 'Reading the full text and checking evidence...',
    '正在检索开放学术图谱…': 'Searching open scholarly graphs...',
    '没有找到开放获取结果。': 'No open-access results found.',
    '被引': 'cited by',
    '开放获取': 'Open access',
    '一键收入本地': 'Add to local library',
    '查看记录': 'View record',
    '生成 AI 对比综述': 'Generate AI synthesis',
    '生成聚焦小综述': 'Generate focused synthesis',
    '复制 Markdown 报告': 'Copy Markdown report',
    '下载 Markdown 报告': 'Download Markdown report',
    'AI 对比综述': 'AI cross-paper synthesis',
    '对比综述已生成。': 'Cross-paper synthesis generated.',
    '已复制 Markdown 报告。': 'Markdown report copied.',
    'Markdown 报告已下载。': 'Markdown report downloaded.',
    '已保存阅读状态与笔记。': 'Reading status and note saved.',
    '阅读进度与笔记': 'Reading status and notes',
    '保存笔记': 'Save note',
    '记录关键结论、疑问或后续实验': 'Record key conclusions, questions, or follow-up experiments',
    '匹配依据：': 'Match basis: ',
    '题名': 'title',
    '关键词': 'keywords',
    '摘要内容': 'summary',
    '作者与标识符': 'authors and identifiers',
    '近 7 天新增': 'Added in the last 7 days',
    '从新近入库文献直接进入速读。': 'Open new arrivals directly in their reading cards.',
    '近 7 天没有新增文献。': 'No new literature was added in the last 7 days.',
    '可选：综述聚焦问题': 'Optional: focus question',
    '例如：这些研究在抗原表位结论上有哪些一致与冲突？': 'For example: where do these studies agree or conflict on antigen epitopes?',
    'AI 证据综述': 'AI evidence synthesis',
    '仅题录，不作为结论依据': 'Metadata only; cannot support a conclusion',
    '正在综合证据台账…': 'Synthesizing the evidence ledger...',
    '提示词已保存。': 'Prompts saved.',
    '提示词已恢复默认。': 'Default prompts restored.',
    '已下载开放获取全文并加入收件箱。': 'Open-access PDF downloaded and added to the inbox.',
    '输入主题后查找全网开放文献。': 'Enter a topic to discover open literature online.',
    '当前全文没有可定位的页码。': 'No page locations are available for the current evidence.',
    'ScholarLoom · 文献原件保存在本机。Zotero 定位通过 Zotero 链接打开。': 'ScholarLoom · Full texts stay on this computer. Zotero links open the matching item.',
    '已授权，可持续导入': 'Authorized for continuous import',
    '尚未授权': 'Not authorized',
    '本机已保存密钥；留空可保留当前密钥。': 'A model key is saved locally. Leave the field blank to keep it.',
    '尚未配置密钥；本地兼容端点可按需留空。': 'No model key is configured. Local compatible endpoints may not require one.',
    '正在等待 Zotero 授权…': 'Waiting for Zotero authorization...',
    '持续授权': 'Authorization',
    '文件监看': 'Folder monitoring',
    '摘要模型': 'Reading-card model',
    '正常': 'Ready',
    '连接': 'Connect',
    '未连接': 'Disconnected',
    '已暂停': 'Paused',
    '运行中': 'Running',
    '未运行': 'Not running',
    '已配置': 'Configured',
    '未配置': 'Not configured',
    '未授权': 'Not authorized',
    '正在生成摘要': 'Generating reading card',
    '摘要已完成': 'Reading card ready',
    '摘要生成失败': 'Reading-card generation failed',
    '状态未知': 'Unknown status',
    '当前没有匹配记录。': 'No matching records.',
    '未命名文件': 'Unnamed file',
    '重试': 'Retry',
    '忽略': 'Ignore',
    '暂无主题导读': 'No topic guides yet',
    '暂无问题路线': 'No question paths yet',
    '查看导读': 'View guide',
    '篇': 'papers',
    '条': 'items',
    '研究问题、方法与使用场景': 'Research question, method, and use case',
    '作者': 'Authors',
    '方法与对象': 'Method and study object',
    '研究模型：': 'Study model: ',
    '可用于': 'Useful for',
    '已知边界': 'Known limitations',
    '摘要依据：': 'Summary basis: ',
    '关联文献': 'Related literature',
    '题名未提供': 'Title unavailable',
    '年份未详': 'Year unknown',
    '来源未详': 'Source unknown',
    '暂无可读摘要。': 'No reading summary yet.',
    '暂无摘要。': 'No reading summary yet.',
    '在 Zotero 定位 ↗': 'Locate in Zotero ↗',
    '查看来源摘要 ↗': 'View source abstract ↗',
    '打开本地全文': 'Open local full text',
    '打开附件': 'Open attachment',
    '加入对比': 'Add to comparison',
    '重新生成摘要': 'Regenerate summary',
    '一句话摘要': 'One-sentence summary',
    '研究问题': 'Research question',
    '研究模型': 'Study model',
    '方法': 'Method',
    '主要发现': 'Key findings',
    '适用场景': 'Use cases',
    '原文': 'Source',
    '未提供': 'Not available',
    '来源未明确说明': 'Not stated in the source',
    '当前摘要未单列局限': 'The current summary does not list limitations',
    '来源未提供': 'Source not provided',
    '比较维度': 'Dimension',
    '没有找到匹配文献，可尝试缩短问题或清除筛选条件。': 'No matching literature. Try a shorter query or clear the filters.',
    '在“检索与导读”中勾选 2–12 篇文献，即可查看对比或生成小综述。': 'Select 2–12 papers in Search & Guides to compare them or create a mini-review.',
    '已定位文献；点击“重置”返回全部文献。': 'Document focused. Use Reset to return to the full list.',
    '当前定位文献': 'Focused document',
    '阅读路线': 'Reading path',
    '开始扫描新增文件。': 'Scanning for new files.',
    '已开始扫描新增文件。': 'Scanning for new files.',
    '已开始识别已有下载文件。': 'Queued existing downloads for recognition.',
    '已打开文献备份文件夹。': 'Opened the literature backup folder.',
    '设置已保存。': 'Settings saved.',
    '已重新加入处理队列。': 'Returned to the processing queue.',
    '已忽略此记录。': 'Record ignored.',
    '确认导入': 'Confirm import',
    '打开文件': 'Open file',
    '选区与翻译': 'Selection & translation',
    '在 PDF 中精确拖选文字，保存摘录或翻译。': 'Select text precisely in the PDF, then save an excerpt or translate it.',
    '选中文本引用': 'Selected text',
    '清除': 'Clear',
    '先在原文中拖选文字。': 'Drag to select text in the PDF first.',
    '保存摘录': 'Save excerpt',
    '拖动时只按字符位置扩展选择；Ctrl+C 可复制当前选区。': 'Selection follows character positions. Press Ctrl+C to copy the current selection.',
    '速读': 'Quick read',
    '深读': 'Deep read',
    '问答': 'Q&A',
    '笔记': 'Notes',
    '图像': 'Figures',
    '翻译选区': 'Translate selection',
    '复制译文': 'Copy translation',
    '已打开源文件。': 'Opened the source file.',
    '已确认题录，正在保存到本地资料库。': 'Record confirmed. Saving to the local library.',
    '已确认题录，等待导入 Zotero。': 'Record confirmed. Waiting to import into Zotero.',
    '已请求重新生成摘要。': 'Reading-card regeneration requested.',
    '最多选择十二篇，请先移除一篇。': 'You can select up to twelve papers. Remove one first.',
    '摘要模型连接成功。': 'Reading-card model connected.',
    '已导入 Zotero，并生成中文速读': 'Imported to Zotero with a reading card',
    '已导入 Zotero，并生成速读': 'Imported to Zotero with a reading card',
    '相同 DOI 已收录；中文速读已补全': 'Same DOI already present; reading card completed',
    '清单内中文速读已全部补全': 'All reading cards in this batch are complete',
    '首页未发现 DOI；不能仅凭文件名确认期刊论文。': 'No DOI found on the first page. A filename alone is not enough to confirm a journal article.',
    '文件内容尚不能可靠确认文献类型，需人工核对。': 'The document type cannot be confirmed reliably; manual review is required.',
    '无结果': 'No results',
    '本地服务未连接': 'Local service is not connected'
  }));
  const englishPatterns = [
    [/^找到 (\d+) \/ (\d+) 条文献( · 当前定位文献)?$/, m => `Found ${m[1]} / ${m[2]} documents${m[3] ? ' · focused document' : ''}`],
    [/^(\d+) 条$/, m => `${m[1]} items`],
    [/^(\d+) 篇 · 查看导读$/, m => `${m[1]} papers · View guide`],
    [/^(\d+) 篇$/, m => `${m[1]} papers`],
    [/^读路线：(.*)$/, m => `Reading path: ${m[1]}`],
    [/^阅读路线：(.*)$/, m => `Reading path: ${m[1]}`],
    [/^摘要依据：(.*)$/, m => `Summary basis: ${m[1]}`],
    [/^研究模型：(.*)$/, m => `Study model: ${m[1]}`],
    [/^已选择 (\d+) 篇：(.*)$/, m => `Selected ${m[1]}: ${m[2]}`],
    [/^加入对比：(.*)$/, m => `Add to comparison: ${m[1]}`],
    [/^导入完成；速读生成失败：(.*)$/, m => `Imported; reading-card generation failed: ${m[1]}`],
    [/^本地服务返回 (\d+)$/, m => `Local service returned ${m[1]}`],
    [/^请求失败（(\d+)）$/, m => `Request failed (${m[1]})`],
    [/^无法加载本地工作台：(.*)。请确认本地服务已启动后重试。$/, m => `Unable to load the local workbench: ${m[1]}. Confirm that the local service is running and try again.`],
    [/^(Zotero|持续授权|文件监看|摘要模型)：(正常|未连接|未授权|已暂停|运行中|未运行|已配置|未配置)$/, m => `${m[1] === 'Zotero' ? 'Zotero' : m[1] === '持续授权' ? 'Authorization' : m[1] === '文件监看' ? 'Folder monitoring' : 'Reading-card model'}: ${m[2] === '正常' ? 'Ready' : m[2] === '未连接' ? 'Disconnected' : m[2] === '未授权' ? 'Not authorized' : m[2] === '已暂停' ? 'Paused' : m[2] === '运行中' ? 'Running' : m[2] === '未运行' ? 'Not running' : m[2] === '已配置' ? 'Configured' : 'Not configured'}`],
    [/^(排队中|处理中|可导入|待核对|已排除|已导入|重复|已忽略|出错|等待 Zotero|生成摘要中)( · .*)$/, m => `${zhToEn.get(m[1])}${m[2]}`],
    [/^(正在生成中文摘要|中文摘要已完成|中文摘要生成失败|正在生成摘要|摘要已完成|摘要生成失败)[：:](.*)$/, m => `${['正在生成中文摘要','正在生成摘要'].includes(m[1]) ? 'Generating reading card' : ['中文摘要已完成','摘要已完成'].includes(m[1]) ? 'Reading card ready' : 'Reading-card generation failed'}: ${zhToEn.get(m[2]) || m[2]}`]
  ];
  function localizeValue(value) {
    const raw = text(value);
    const match = raw.match(/^(\s*)(.*?)(\s*)$/s);
    const body = match?.[2] || raw;
    let translated = zhToEn.get(body);
    if (!translated) for (const [pattern, replace] of englishPatterns) {
      const found = body.match(pattern);
      if (found) { translated = replace(found); break; }
    }
    if (!translated) translated = body.replace(/(\d+) 篇/g, '$1 papers').replace(/(\d+) 条/g, '$1 items');
    return translated ? `${match?.[1] || ''}${translated}${match?.[3] || ''}` : raw;
  }
  function localizeTextNode(node) {
    if (uiLanguage !== 'en' || !node.nodeValue || node.parentElement?.closest('[data-no-translate]')) return;
    const translated = localizeValue(node.nodeValue);
    if (translated !== node.nodeValue) node.nodeValue = translated;
  }
  function localizeAttributes(element) {
    if (uiLanguage !== 'en' || element.closest?.('[data-no-translate]')) return;
    for (const name of ['aria-label', 'placeholder', 'title']) {
      if (!element.hasAttribute?.(name)) continue;
      const value = element.getAttribute(name);
      const translated = localizeValue(value);
      if (translated !== value) element.setAttribute(name, translated);
    }
  }
  function localizeNode(root) {
    if (root.nodeType === Node.TEXT_NODE) return localizeTextNode(root);
    if (root.nodeType !== Node.ELEMENT_NODE || root.matches?.('script,style,noscript')) return;
    localizeAttributes(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) localizeTextNode(walker.currentNode);
  }
  function applyLanguage() {
    document.documentElement.lang = uiLanguage === 'en' ? 'en' : 'zh-CN';
    document.title = 'ScholarLoom';
    el('reader-viewport').dataset.selectionHint=t('在正文中拖选文字，即可打开选区与翻译。','Select PDF text to open selection and translation.');
    const toggle = el('language-toggle');
    toggle.textContent = uiLanguage === 'en' ? '中文' : 'EN';
    toggle.setAttribute('aria-label', uiLanguage === 'en' ? '切换到中文' : 'Switch to English');
    toggle.setAttribute('aria-pressed', String(uiLanguage === 'en'));
    if (uiLanguage !== 'en') return;
    localizeNode(document.body);
  }
  async function setLanguage(language) {
    const unsaved=Object.keys(state.projectSynthesisEdits).length || Object.keys(state.evidenceMatrixDrafts).length ||
      state.promptDirty || state.settingsDirty || Object.values(state.paperDrafts).some(value=>String(value||'').trim()) ||
      state.comparison.length || state.compareFocus.trim();
    if(unsaved && !window.confirm(t('切换语言会重新加载页面，清除未保存的草稿、设置和当前对比选择。请先保存需要保留的内容。仍要切换吗？','Changing language reloads the page and clears unsaved drafts, settings and the current comparison selection. Save anything you need first. Change language anyway?')))return;
    uiLanguage = language === 'en' ? 'en' : 'zh';
    try { localStorage.setItem(LANGUAGE_KEY, uiLanguage); } catch {}
    try {
      if (state.snapshot?.csrf) await post('/api/settings', {ui_language: uiLanguage});
    } catch (error) {
      toast(`无法同步界面语言：${error.message}`);
    }
    location.reload();
  }
  const el = id => document.getElementById(id);
  const state = { snapshot: null, docsSignature: '', summarySignature: '', languageSyncPending: false, view: 'library', viewScroll: {}, category: '', kind: '', year: '', studyType: '', readingStatus: '', query: '', routeKeys: null, routeName: '', focusKey: null, comparison: [], compareFocus: '', searchReasons: {}, limit: 24, jobsFilter: 'all', searchMode: 'local', externalResults: [], externalLoading: false, paperAnswers: {}, paperDrafts: {}, paperOpen: new Set(), relatedResults: {}, synthesis: null, evidenceMatrix: null, evidenceMatrixProject: '', evidenceMatrixLoading: '', evidenceMatrixRequest: 0, evidenceMatrixDrafts: {}, projectSynthesis: null, projectSynthesisProject: '', projectSynthesisRequest: 0, projectSynthesisEdits: {}, evidenceProject: '', promptDirty: false, promptRevision: 0, settingsDirty: false, settingsRevision: 0, toastTimer: 0, translatorSettings: null };
  const statuses = [['queued','排队中'],['processing','处理中'],['ready','可导入'],['review','待核对'],['excluded','已排除'],['imported','已导入'],['duplicate','重复'],['ignored','已忽略'],['error','出错'],['waiting_zotero','等待 Zotero'],['summarizing','生成摘要中']];
  const statusNames = Object.fromEntries(statuses);
  const safeArray = value => Array.isArray(value) ? value : [];
  const text = value => value == null ? '' : String(value);
  const t = (zh,en) => uiLanguage === 'en' ? en : zh;
  const esc = value => text(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const list = value => Array.isArray(value) ? value : value ? [value] : [];
  const byKey = () => Object.fromEntries(safeArray(state.snapshot?.documents).filter(row => row?.key).map(row => [row.key,row]));
  function safeURL(value, allowZotero = false) {
    try { const url = new URL(value, location.href); return ['https:','http:'].includes(url.protocol) || (allowZotero && url.protocol === 'zotero:') ? url.href : ''; } catch { return ''; }
  }
  function statusLabel(status) { return statusNames[status] || text(status) || '状态未知'; }
  function formatUpdated(value) { const seconds=Number(value);if(!Number.isFinite(seconds)||seconds<=0)return '';const date=new Date(seconds*1000);return Number.isNaN(date.getTime())?'':new Intl.DateTimeFormat(uiLanguage==='en'?'en-US':'zh-CN',{dateStyle:'medium',timeStyle:'short'}).format(date); }
  function toast(message) { const box=el('toast');box.textContent=uiLanguage==='en'?localizeValue(message):message;box.classList.add('show');clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>box.classList.remove('show'),3500); }
  function setMessage(message, error=false) { const box=el('settings-message');box.textContent=uiLanguage==='en'?localizeValue(message):message;box.style.color=error?'#963b32':''; }
  async function getState() {
    try {
      const response = await fetch('/api/state', { cache: 'no-store', headers: {'Accept':'application/json'} });
      if (!response.ok) throw new Error(`本地服务返回 ${response.status}`);
      const next = await response.json();
      if (!next || !Array.isArray(next.documents) || !Array.isArray(next.jobs)) throw new Error('本地服务返回的数据格式不完整');
      el('load-error').hidden = true;
      const docsSignature = JSON.stringify([next.documents,next.guides,next.routes]);
      state.snapshot = next;
      if (!readerState.tabsRestored) {
        readerState.tabsRestored = true;
        restoreReaderTabs();
      }
      if (next.settings?.ui_language !== uiLanguage && !state.languageSyncPending) {
        state.languageSyncPending = true;
        try {
          await post('/api/settings', {ui_language: uiLanguage});
          next.settings.ui_language = uiLanguage;
        } catch {} finally {
          state.languageSyncPending = false;
        }
      }
      renderOverview(); renderHealth(); renderJobs();
      if (docsSignature !== state.docsSignature) {
        state.docsSignature = docsSignature;
        renderLibraryData();
        if (state.view === 'reader' && readerState.docKey) {
          const doc = readerDocFor(readerState.docKey);
          if (doc) renderReaderCard(doc);
        }
      }
      const comparisonSignature=JSON.stringify([next.documents,next.dossiers]);
      if (state.view === 'compare' && comparisonSignature!==state.comparisonSignature &&
          !el('comparison-content').contains(document.activeElement)) renderComparison();
      return true;
    } catch (error) {
      const message = uiLanguage === 'en' ? `Unable to load the local workbench: ${localizeValue(error.message)}. Confirm that the local service is running and try again.` : `无法加载本地工作台：${error.message}。请确认本地服务已启动后重试。`;
      el('load-error').textContent = message;
      el('load-error').hidden = false;
      if (!state.snapshot) { el('overview-stats').textContent=uiLanguage === 'en' ? 'Local service is not connected' : '本地服务未连接';el('jobs').innerHTML=uiLanguage === 'en' ? '<div class="empty">Connect to the local service to show the processing queue.</div>' : '<div class="empty">连接服务后会显示处理队列。</div>'; }
      return false;
    }
  }
  async function post(path, payload={}) {
    if (!state.snapshot?.csrf) throw new Error('缺少本地安全令牌，请刷新工作台后重试。');
    const response = await fetch(path, {method:'POST',headers:{'Content-Type':'application/json','X-Workbench-Token':state.snapshot.csrf},body:JSON.stringify(payload)});
    let result={}; try { result=await response.json(); } catch {}
    if (!response.ok || result.ok === false) throw new Error(result.error || result.message || `请求失败（${response.status}）`);
    return result;
  }
  const readerTranslation = window.createScholarTranslation(window, async text => {
    const result = await post('/api/translate',{text});
    return {text: result.translation, engine: result.engine || 'server'};
  });
  let translatorSettingsRequest = 0;
  function formatBytes(bytes) {
    const value=Number(bytes);
    if(!Number.isFinite(value)||value<=0)return '';
    const units=['B','KB','MB','GB'];
    let size=value,index=0;
    while(size>=1024&&index<units.length-1){size/=1024;index++;}
    return `${size.toFixed(index?1:0)} ${units[index]}`;
  }
  function renderBrowserTranslation(availability='unknown', error='') {
    const status=el('translation-browser-status'),button=el('translation-browser-configure');
    const labels={
      available:t('浏览器本地翻译已可用。','Browser-local translation is available.'),
      downloadable:t('浏览器支持本地翻译；首次启用会下载语言包。','Your browser supports local translation and will download a language pack on first use.'),
      downloading:t('浏览器语言包正在准备中。','The browser language pack is being prepared.'),
      unavailable:t('当前浏览器不支持本地翻译；翻译时会改用在线服务。','This browser does not provide local translation; online translation will be used.'),
      unknown:t('尚未检测浏览器翻译能力。','Browser translation has not been checked.'),
    };
    status.textContent=error?t(`启用失败：${error}。仍可使用在线翻译。`,`Setup failed: ${error}. Online translation remains available.`):(labels[availability]||labels.unknown);
    button.textContent=availability==='available'?t('启用本地翻译','Enable local translation'):availability==='unavailable'?t('重新检测','Check again'):t('检测并启用','Check and enable');
    button.disabled=!state.snapshot?.csrf;
  }
  function renderOfflineTranslation(offline) {
    const status=el('translation-offline-status'),button=el('translation-offline-download');
    if(!offline){status.textContent=t('无法读取离线模型状态。','Unable to read offline model status.');button.disabled=false;return;}
    const download=formatBytes(offline.downloadBytes),disk=formatBytes(offline.diskBytes),expected=formatBytes(offline.expectedDiskBytes);
    if(offline.installed){
      status.textContent=t(`已安装；当前占用 ${disk||expected}。`,`Installed; currently using ${disk||expected}.`);
      button.textContent=t('已安装','Installed');
      button.disabled=true;
    }else{
      status.textContent=t(`未安装；需下载 ${download}，安装后约占用 ${expected}。`,`Not installed; download ${download}, about ${expected} on disk after installation.`);
      button.textContent=t('下载离线模型','Download offline model');
      button.disabled=false;
    }
  }
  async function refreshTranslatorSettings() {
    const request=++translatorSettingsRequest;
    el('translation-settings-title').textContent=t('翻译','Translation');
    el('translation-browser-label').textContent=t('浏览器本地翻译','Browser-local translation');
    el('translation-offline-label').textContent=t('离线翻译模型','Offline translation model');
    el('translation-privacy-note').textContent=t(
      '优先使用浏览器内置翻译，文本留在设备内。不可用时会把所选文本发送到 translate.googleapis.com 免费在线翻译；可下载离线模型作为无网络兜底。以上翻译均不消耗科研模型 token。',
      'Browser-local translation is preferred and keeps text on the device. Otherwise selected text is sent to the free translate.googleapis.com service. The offline model is a no-network fallback. Neither consumes research-model tokens.'
    );
    renderBrowserTranslation('unknown');
    try {
      const [availability,response]=await Promise.all([readerTranslation.availability(),fetch('/api/translator',{cache:'no-store',headers:{'Accept':'application/json'}})]);
      if(!response.ok)throw new Error(`本地服务返回 ${response.status}`);
      const result=await response.json();
      if(request!==translatorSettingsRequest)return;
      state.translatorSettings=result.offline;
      renderBrowserTranslation(availability);
      renderOfflineTranslation(result.offline);
    } catch(error) {
      if(request!==translatorSettingsRequest)return;
      renderBrowserTranslation('unknown',error.message);
      renderOfflineTranslation(state.translatorSettings);
    }
  }
  function clearReaderTranslation() {
    el('qa-translation-status').textContent = '';
    el('qa-translation-result').textContent = '';
    el('qa-translation-copy').hidden = true;
    el('qa-translate').disabled = false;
  }
  function readerSelectionText(selection) { return safeArray(selection?.segments).map(segment => text(segment.text).trim()).filter(Boolean).join(' '); }
  async function checkReaderTranslationAvailability(selection, key) {
    const button = el('qa-translate'), status = el('qa-translation-status');
    button.disabled = true;
    status.textContent = t('正在检查翻译能力…','Checking translation availability…');
    try {
      const availability = await readerTranslation.availability();
      if (readerState.docKey !== key || readerState.selection !== selection) return;
      status.textContent = availability === 'unavailable'
        ? t('浏览器本地翻译不可用，将使用免费在线翻译（不消耗模型 token）。','Browser-local translation is unavailable; free online translation will be used without model tokens.')
        : t('已就绪；点击后开始翻译。','Ready. Click to translate.');
    } catch (error) {
      if (readerState.docKey === key && readerState.selection === selection) status.textContent = error.message;
    } finally {
      if (readerState.docKey === key && readerState.selection === selection) button.disabled = false;
    }
  }
  async function translateReaderSelection() {
    const selection = readerState.selection, key = readerState.docKey;
    const segments = selection?.segments, source = readerSelectionText(selection);
    if (!selection || !key || !segments?.length || !source) return;
    const status = el('qa-translation-status'), result = el('qa-translation-result'), button = el('qa-translate');
    const isCurrent = () => readerState.docKey === key && readerState.selection === selection && readerState.selection.segments === segments;
    button.disabled = true;
    el('qa-translation-copy').hidden = true;
    result.textContent = '';
    status.textContent = t('正在翻译…','Translating…');
    const pending = readerTranslation.translate(source, loaded => {
      if (isCurrent()) status.textContent = t(`正在下载翻译模型：${Math.round(loaded * 100)}%`,`Downloading translation model: ${Math.round(loaded * 100)}%`);
    });
    try {
      const translated = await pending;
      if (!isCurrent()) return;
      result.textContent = translated.text;
      status.textContent = translated.engine === 'local'
        ? t('翻译完成；当前使用本地离线模型，质量有限，请核对数字与术语。','Translation complete. The local offline model was used; check numbers and terminology.')
        : t('翻译完成','Translation complete');
      el('qa-translation-copy').hidden = !text(translated).trim();
    } catch (error) {
      if (isCurrent()) status.textContent = `${t('翻译失败：','Translation failed: ')}${error.message}`;
    } finally {
      if (isCurrent()) button.disabled = false;
    }
  }
  function renderOverview() {
    const docs=safeArray(state.snapshot?.documents), jobs=safeArray(state.snapshot?.jobs);
    const visibleJobs=jobs.filter(job=>job.status!=='excluded');
    const count=key=>visibleJobs.filter(job=>job.status===key).length;
    el('overview-stats').innerHTML=`<div class="stat stat-feature"><strong>${docs.length}</strong><span>可检索文献</span></div><div class="stat"><strong>${docs.filter(row=>row.kind==='journalArticle').length}</strong><span>期刊文献</span></div><div class="stat"><strong>${docs.filter(row=>row.kind==='preprint').length}</strong><span>预印本</span></div><div class="stat"><strong>${docs.filter(row=>row.kind==='patent').length}</strong><span>专利</span></div><div class="stat"><strong>${count('ready')}</strong><span>待导入</span></div><div class="stat ${count('review')?'needs-attention':''}"><strong>${count('review')}</strong><span>待核对</span></div>`;
    const activeStatuses=statuses.map(([key,label])=>({key,label,count:count(key)})).filter(item=>item.count);
    el('progress-grid').innerHTML=activeStatuses.length?activeStatuses.map(item=>`<button type="button" class="progress ${state.jobsFilter===item.key?'selected':''}" data-job-status="${esc(item.key)}" aria-pressed="${state.jobsFilter===item.key}"><span>${esc(item.label)}</span><strong>${item.count}</strong></button>`).join('')+`<button type="button" class="progress progress-all ${state.jobsFilter==='all'?'selected':''}" data-job-status="all" aria-pressed="${state.jobsFilter==='all'}"><span>${esc(t('全部状态','All statuses'))}</span><strong>${visibleJobs.length}</strong></button>`:`<div class="progress-empty"><span>${esc(t('当前没有处理中的任务','No active workflow items'))}</span><button type="button" data-job-status="all">${esc(t('查看全部','View all'))}</button></div>`;
    renderSummaryStatus();
    el('zotero-setting-status').textContent=state.snapshot?.health?.authorized?'已授权，可持续导入':'尚未授权';
    el('key-status').textContent=state.snapshot?.settings?.has_model_key?'本机已保存密钥；留空可保留当前密钥。':'尚未配置密钥；本地兼容端点可按需留空。';
    if(!state.promptDirty && !state.settingsDirty && state.view!=='settings'){
      el('ai-output-language').value=state.snapshot?.settings?.summary_language || 'auto';
      renderPromptEditor();
    }
    if(!state.settingsDirty && state.view!=='settings'){
      el('watch-enabled').checked=Boolean(state.snapshot?.settings?.watch_enabled);
      el('watch-folders').value=safeArray(state.snapshot?.settings?.watch_folders).join('\n');
      el('model-url').value=state.snapshot?.settings?.model_url || 'https://api.openai.com/v1';
      el('model-name').value=state.snapshot?.settings?.model_name || '';
      el('auto-summary').checked=state.snapshot?.settings?.auto_summary !== false;
    }
    renderDigest();
    const resume = readerDocFor(readerState.preferredKey);
    el('resume-reading').hidden = !resume?.hasPDF;
    if (resume?.hasPDF) el('resume-reading-button').textContent = `${resume.zhTitle || resume.title} · ${t('第','Page ')} ${readerState.openTabs.get(resume.key)?.page || 1} ${t('页','')}`;
    applyLanguage();
  }
  function renderDigest(){
    const cutoff=Date.now()/1000-7*86400;
    const rows=safeArray(state.snapshot?.documents).filter(row=>Number(row.addedAt)>cutoff).sort((a,b)=>Number(b.addedAt)-Number(a.addedAt)).slice(0,6);
    el('recent-digest').innerHTML=rows.length?rows.map((row,index)=>`<button class="digest-item" data-focus="${esc(row.key)}"><span class="digest-number" aria-hidden="true">${String(index+1).padStart(2,'0')}</span><span class="digest-copy"><strong>${esc(row.zhTitle||row.title||row.key)}</strong><small>${esc([row.year,row.category,row.readingStatus==='read'?t('已读','Read'):row.readingStatus==='reading'?t('在读','Reading'):t('未读','Unread')].filter(Boolean).join(' · '))}</small></span></button>`).join(''):`<div class="empty compact-empty">${esc(t('近 7 天没有新增文献。','No new literature was added in the last 7 days.'))}</div>`;
  }
  function renderPromptEditor(){
    const presets=state.snapshot?.settings?.prompt_presets || {};
    const box=el('prompt-editor');
    box.innerHTML=Object.entries(presets).map(([id,preset])=>`<details class="prompt-item"><summary>${esc(preset[uiLanguage==='en'?'name_en':'name_zh']||id)}</summary><div class="prompt-columns"><label>${esc(t('中文提示词','Chinese prompt'))}<textarea rows="5" data-prompt-id="${esc(id)}" data-prompt-lang="zh">${esc(preset.prompt_zh||'')}</textarea></label><label>${esc(t('English prompt','English prompt'))}<textarea rows="5" data-prompt-id="${esc(id)}" data-prompt-lang="en">${esc(preset.prompt_en||'')}</textarea></label></div></details>`).join('');
  }
  function promptPayload(){
    const result={};
    document.querySelectorAll('[data-prompt-id]').forEach(box=>{
      const id=box.dataset.promptId;
      result[id]=result[id]||{};
      result[id][box.dataset.promptLang==='en'?'prompt_en':'prompt_zh']=box.value.trim();
    });
    return result;
  }
  function renderHealth() {
    const h=state.snapshot?.health||{};
    const watching=state.snapshot?.settings?.watch_enabled!==false;
    const rows=[['Zotero',h.zotero?'正常':'未连接',h.zotero],['持续授权',h.authorized?'正常':'未授权',h.authorized],['摘要模型',h.model?'已配置':'未配置',h.model]];
    el('health-status').innerHTML=rows.map(([name,label,ok])=>`<span class="health-item ${ok?'ok':''}">${name}：${label}</span>`).join('')
      +`<button class="health-item health-toggle ${watching&&h.watcher?'ok':''}" data-watch-toggle="${watching?'off':'on'}" title="${watching?t('暂停文件监看','Pause file monitoring'):t('开启文件监看','Start file monitoring')}">${t('文件监看','File monitoring')}：${watching?t('已开启 · 点击暂停','on · click to pause'):t('已关闭 · 点击开启','off · click to start')}</button>`;
    if(h.authorization==='pending') el('zotero-setting-status').textContent='正在等待 Zotero 授权…';
    else if(h.authorization==='error' && h.authorization_message) el('zotero-setting-status').textContent=h.authorization_message;
    applyLanguage();
  }
  function renderSummaryStatus() {
    const summary=state.snapshot?.health?.summary, box=el('summary-status');
    if(!summary||!['running','done','error'].includes(summary.status)){box.hidden=true;box.textContent='';return;}
    const labels={running:'正在生成摘要',done:'摘要已完成',error:'摘要生成失败'};
    const message=text(summary.message).trim();
    box.className=`summary-status ${summary.status}`;
    box.textContent=message?`${labels[summary.status]}：${message}`:labels[summary.status];
    const failures=safeArray(summary.failures);
    if (failures.length && summary.status !== 'running') {
      const details=document.createElement('details');
      const heading=document.createElement('summary');
      heading.textContent=t(`查看 ${failures.length} 篇失败记录`,`View ${failures.length} failed papers`);
      details.append(heading);
      failures.forEach(item=>{ const line=document.createElement('p'); line.textContent=`${item.title}: ${item.message}`; details.append(line); });
      const retry=document.createElement('button'); retry.type='button'; retry.id='retry-summary-failures'; retry.className='btn'; retry.textContent=t('重试失败的速读','Retry failed cards'); details.append(retry); box.append(details);
    }
    box.hidden=false;
    const signature=`${summary.status}\n${message}`;
    if(state.summarySignature&&signature!==state.summarySignature&&(summary.status==='done'||summary.status==='error'))toast(box.textContent);
    state.summarySignature=signature;
    applyLanguage();
  }
  function renderJobs() {
    const all=safeArray(state.snapshot?.jobs), jobs=state.jobsFilter==='all'?all.filter(job=>job.status!=='excluded'):all.filter(job=>job.status===state.jobsFilter);
    el('job-count').textContent=`${jobs.length} 条`;
    if(!jobs.length){el('jobs').innerHTML='<div class="empty">当前没有匹配记录。</div>';applyLanguage();return;}
    el('jobs').innerHTML=jobs.map((job,index)=>{
      const canRetry=['review','error','waiting_zotero'].includes(job.status);
      const canConfirm=job.canConfirm;
      const canOpenFile=job.status==='review'&&job.fileAvailable;
      const canIgnore=!['imported','duplicate','excluded'].includes(job.status);
      const updated=formatUpdated(job.updated);
      return `<article class="job" data-status="${esc(job.status)}"><span class="job-order" aria-hidden="true">${String(index+1).padStart(2,'0')}</span><div class="job-main"><div class="job-name">${esc(job.name||job.path||'未命名文件')}</div><div class="job-title">${esc(job.title||job.path||'')}</div></div><div class="job-state"><span class="job-status">${esc(statusLabel(job.status))}</span>${updated?`<span class="job-time">${esc(updated)}</span>`:''}</div><div class="job-note">${esc(job.reason||'')}</div><div class="job-actions">${canOpenFile?`<button data-action="open-file" data-id="${esc(job.id)}">打开文件</button>`:''}${canConfirm?`<button data-action="confirm" data-id="${esc(job.id)}">确认导入</button>`:''}${canRetry?`<button data-action="retry" data-id="${esc(job.id)}">重试</button>`:''}${canIgnore?`<button data-action="ignore" data-id="${esc(job.id)}">忽略</button>`:''}</div></article>`;
    }).join('');
    applyLanguage();
  }
  const viewOrder=['home','library','compare','settings','reader'];
  async function navigateView(view){setView(view);}
  function setView(view) {
    const changed=state.view!==view;
    const previous=state.view;
    if(changed)state.viewScroll[previous]=el(`${previous}-view`).scrollTop;
    state.view=view;
    document.body.classList.toggle('reader-mode',view==='reader');
    for(const name of ['home','library','compare','settings','reader']){const v=el(`${name}-view`);if(v)v.hidden=name!==view;}
    if(changed){
      const target=el(`${view}-view`);
      if(target){
        target.classList.remove('view-enter-left','view-enter-right');
        void target.offsetWidth;
        target.classList.add(viewOrder.indexOf(view)>=viewOrder.indexOf(previous)?'view-enter-right':'view-enter-left');
      }
      el(`${view}-view`).scrollTop=state.viewScroll[view] ?? 0;
    }
    document.querySelectorAll('[data-view]').forEach(button=>{const active=button.dataset.view===view;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    el('compare-bar').hidden=view==='compare'||!state.comparison.length;
    if(view==='library') renderResults(); if(view==='compare')renderComparison();
    if(view==='settings') refreshTranslatorSettings();
  }
  function normalized(value){return text(value).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');}
  const queryGroups=[['单b细胞','singlebcell','singlehumanbcell','singlecellrtpcr','单细胞抗体'],['重轻链','配对测序','pairedvh','vhvl','pairedrepertoire'],['噬菌体','phage','fabonphage'],['核糖体展示','ribosomedisplay'],['哺乳动物展示','mammaliandisplay'],['cart','嵌合抗原受体','chimericantigenreceptor'],['持久性','persistence','记忆分化','memorydevelopment','持续性'],['合成受体','synnotch','syntheticnotch','syntheticreceptor'],['表位','epitope','免疫逃逸','escapemutation'],['pd1','程序性死亡受体1'],['lag3','淋巴细胞激活基因3'],['mrna疫苗','mrnavaccine','信使rna疫苗'],['端粒','telomere','telomerase','shelterin'],['紫草','shikonin','紫草素'],['紫杉醇','paclitaxel','taxus','baccatin'],['基因编辑','crispr','cas9'],['神经','neuron','brain','脑'],['微生物','microbial','microbiome','菌群'],['蛋白质降解','degrader','分子胶','molecularglue']];
  function relevance(row,query){const q=normalized(query);if(!q)return 0;const title=normalized([row.title,row.zhTitle,row.oneSentence].join(' ')),tags=normalized([row.category,...list(row.subtopics),...list(row.keywords),row.identifier,row.authors].join(' ')),body=normalized([row.title,row.zhTitle,row.oneSentence,row.question,row.method,...list(row.findings),row.useCase,row.studyModel,row.category,...list(row.subtopics),...list(row.keywords),row.authors,row.identifier,...list(row.flags)].join(' '));let score=(title.includes(q)?80:0)+(tags.includes(q)?80:0)+(body.includes(q)?20:0);for(const group of queryGroups)if(group.some(term=>q.includes(term))){if(group.some(term=>title.includes(term)||tags.includes(term)))score+=32;else if(group.some(term=>body.includes(term)))score+=12;}const terms=new Set(text(query).toLowerCase().match(/[a-z0-9]+|[\u3400-\u9fff]{2,}/g)||[]);for(const term of [...terms])if(/[\u3400-\u9fff]/.test(term)&&term.length>2)for(let i=0;i<term.length-1;i++)terms.add(term.slice(i,i+2));const stop=new Set(['如何','怎样','研究','文献','需要','什么','进行','有关','通过','一个','哪些','可以','找到']);for(const term of terms)if(!stop.has(term)&&term.length>1){const t=normalized(term);score+=(title.includes(t)?7:0)+(tags.includes(t)?8:0)+(body.includes(t)?2:0);}return score;}
  function matchTerms(query){const stop=new Set(['如何','怎样','研究','文献','需要','什么','进行','有关','通过','一个','哪些','可以','找到']);return [...new Set((text(query).toLowerCase().match(/[a-z0-9]+(?:-[a-z0-9]+)*|[\u3400-\u9fff]{2,}/g)||[]).filter(term=>term.length>1&&!stop.has(term)))].sort((a,b)=>b.length-a.length);}
  function highlighted(value,query){const raw=text(value),terms=matchTerms(query);if(!terms.length)return esc(raw);const pattern=new RegExp(`(${terms.map(term=>term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')})`,'giu');return raw.split(pattern).map((part,index)=>index%2?`<mark>${esc(part)}</mark>`:esc(part)).join('');}
  function matchExplanation(row,query){if(!query.trim())return '';const groups=[['题名','title',[row.title,row.zhTitle].join(' ')],['关键词','keywords',[row.category,...list(row.subtopics),...list(row.keywords)].join(' ')],['摘要内容','summary',[row.oneSentence,row.summary,row.question,row.method,...list(row.findings),row.useCase,row.limitations].join(' ')],['作者与标识符','authors and identifiers',[row.authors,row.identifier].join(' ')]];const terms=matchTerms(query).map(normalized).filter(Boolean),whole=normalized(query),found=groups.filter(([, ,value])=>{const haystack=normalized(value);return (whole&&haystack.includes(whole))||terms.some(term=>haystack.includes(term));}).map(([zh,en])=>uiLanguage==='en'?en:zh);return found.length?`${t('匹配依据：','Match basis: ')}${found.join(' · ')}`:'';}
  function filteredDocs(){const rows=safeArray(state.snapshot?.documents);if(state.focusKey)return rows.filter(row=>row.key===state.focusKey);const candidates=rows.filter(row=>(!state.category||row.category===state.category)&&(!state.kind||row.kind===state.kind)&&(!state.year||text(row.year)===state.year)&&(!state.studyType||row.studyType===state.studyType)&&(!state.readingStatus||(row.readingStatus||'unread')===state.readingStatus)&&(!state.routeKeys||state.routeKeys.includes(row.key)));const found=candidates.map(row=>({row,score:relevance(row,state.query)})).filter(item=>!state.query.trim()||item.score>0);found.sort((a,b)=>state.query.trim()?b.score-a.score||Number(b.row.year)-Number(a.row.year):state.routeKeys?state.routeKeys.indexOf(a.row.key)-state.routeKeys.indexOf(b.row.key):Number(b.row.year)-Number(a.row.year)||text(a.row.zhTitle||a.row.title).localeCompare(text(b.row.zhTitle||b.row.title),'zh-CN'));state.searchReasons=Object.fromEntries(found.map(item=>[item.row.key,matchExplanation(item.row,state.query)]));return found.map(item=>item.row);}
  function renderLibraryData(){const docs=safeArray(state.snapshot?.documents), guides=safeArray(state.snapshot?.guides), routes=safeArray(state.snapshot?.routes);for(const name of ['category','year','studyType']){const select=el(name),keep=state[name];select.replaceChildren(new Option(name==='category'?'全部主题':name==='year'?'全部年份':'全部研究形式',''));const values=name==='category'?guides.map(x=>x.name).filter(Boolean):name==='year'?[...new Set(docs.map(x=>x.year).filter(Boolean))].sort().reverse():[...new Set(docs.map(x=>x.studyType).filter(Boolean))].sort();values.forEach(value=>select.add(new Option(value,value)));select.value=values.includes(keep)?keep:'';state[name]=select.value;}el('readingStatus').value=state.readingStatus;renderTopics();renderResults();applyLanguage();}
  async function generateGuides() {
    const button=el('guides-generate'),status=el('guides-status');
    button.disabled=true;
    status.textContent=t('正在整理问题路线…','Building question routes…');
    try {
      await post('/api/guides-generate',{});
      await getState();
      status.textContent=t('路线已更新，点击问题开始阅读。','Routes updated. Choose a question to begin.');
    } catch(error) {
      status.textContent=error.message;
    } finally { button.disabled=false; applyLanguage(); }
  }
  el('guides-generate').addEventListener('click',generateGuides);
  function renderTopics(){const guides=safeArray(state.snapshot?.guides),routes=safeArray(state.snapshot?.routes),docs=safeArray(state.snapshot?.documents);el('topic-grid').innerHTML=guides.map(guide=>`<button class="topic-item" data-category="${esc(guide.name)}">${esc(guide.name)}<small>${docs.filter(row=>row.category===guide.name).length} 篇 · 查看导读</small></button>`).join('')||'<span class="muted">暂无主题导读</span>';el('question-grid').innerHTML=routes.map((route,index)=>`<button class="question-item" data-route="${index}">${esc(route.title)}<small>${esc(route.description||'')} · ${safeArray(route.keys).length} 篇</small></button>`).join('')||'<span class="muted">暂无问题路线</span>';}
  function attachmentKey(row){const match=text(row.attachmentURL).match(/\/items\/([^?/#]+)/);return match?decodeURIComponent(match[1]):'';}
  function modelAnswer(markdown,row,sources=[],project=''){
    const key=attachmentKey(row);
    const sourceMap=Object.fromEntries(safeArray(sources).map(source=>[source.id,source]));
    const passages=Object.fromEntries(safeArray(sources).flatMap(source=>safeArray(source.passages).map(passage=>[passage.id,{...passage,paper:source.key}])));
    return esc(markdown).replace(/\[(P\d+E\d+(?:\s*[,，;；]\s*P\d+E\d+)+)\]/gi,
      (_,group)=>group.split(/\s*[,，;；]\s*/).map(id=>`[${id}]`).join(' '))
      .replace(/\[(P\d+E\d+|P\d+|(?:Page|P\.)\s*\d+)\]/gi,(label,raw)=>{
      const id=raw.toUpperCase();
      if(/^P\d+E\d+$/.test(id)){
        const passage=passages[id];
        return passage?`<button type="button" class="synthesis-cite" data-action="synthesis-source" data-project="${esc(project)}" data-paper="${esc(passage.paper)}" data-version="${esc(passage.version)}" data-page="${Number(passage.page)||1}" data-quote="${esc(passage.quote)}" title="${esc(passage.quote)}">${label}</button>`:`<span class="unsupported-cite" title="${esc(t('来源未提供','Source not provided'))}">${label}</span>`;
      }
      if(/^P\d+$/.test(id)){
        const source=sourceMap[id],linked=source&&source.zoteroLinked!==false&&/^[A-Za-z0-9]+$/.test(source.key||'');
        return source?(linked?`<a class="paper-cite" href="zotero://select/library/items/${encodeURIComponent(source.key)}" title="${esc(source.title||id)}">${label}</a>`:`<span class="paper-cite" title="${esc(source.title||id)}">${label}</span>`):`<span class="paper-cite">${label}</span>`;
      }
      const page=id.match(/\d+$/)[0];
      return key?`<a class="page-cite" href="zotero://open-pdf/library/items/${encodeURIComponent(key)}?page=${page}">${label}</a>`:`<span class="page-cite">${label}</span>`;
    }).replace(/\n/g,'<br>');
  }
  function presetOptions(selected=''){
    const presets=state.snapshot?.settings?.prompt_presets || {};
    return `<option value="">${esc(t('选择场景','Choose a preset'))}</option>`+Object.entries(presets).map(([id,item])=>`<option value="${esc(id)}" ${selected===id?'selected':''}>${esc(item[uiLanguage==='en'?'name_en':'name_zh']||id)}</option>`).join('');
  }
  function cardToolsMarkup(row){
    const answer=state.paperAnswers[row.key];
    const related=safeArray(state.relatedResults[row.key]);
    const answerBox=answer?`<div class="model-answer ${answer.error?'error':''}">${answer.loading?esc(t('正在阅读全文并核对证据…','Reading the full text and checking evidence...')):answer.error?esc(answer.error):modelAnswer(answer.answer||'',row)}${answer.basis?`<small>${esc(answer.basis)}${answer.pages?` · ${answer.pages} ${esc(t('页','pages'))}`:''}</small>`:''}</div>`:'';
    const relatedBox=related.length?`<div class="external-list compact">${externalMarkup(related,'related')}</div>`:'';
    const relatedButton=/^10\.\d{4,9}\//.test(row.identifier||'')?`<button class="btn" data-action="related-online" data-key="${esc(row.key)}">${esc(t('找相似文献','Find related papers'))}</button>`:'';
    return `<details class="card-tools" ${state.paperOpen.has(row.key)?'open':''}><summary>${esc(t('智能科研问答与相似文献','Paper Q&A and related literature'))}</summary><div class="ask-controls"><select data-ask-preset="${esc(row.key)}" aria-label="${esc(t('选择场景','Choose a preset'))}">${presetOptions()}</select><textarea rows="3" data-ask-question="${esc(row.key)}" placeholder="${esc(t('可补充具体问题','Add a specific question'))}">${esc(state.paperDrafts[row.key]||'')}</textarea><div class="actions"><button class="btn primary" data-action="paper-chat" data-key="${esc(row.key)}">${esc(t('提问','Ask'))}</button>${relatedButton}</div></div>${answerBox}${relatedBox}</details>`;
  }
  function externalMarkup(items,scope='search'){
    const isSearch=scope==='search';
    return safeArray(items).map(item=>{
      const pdf=safeURL(item.pdfURL),source=safeURL(item.sourceURL);
      const year=item.year?`<span>${esc(item.year)}</span>`:`<span>${esc(t('年份未详','Year unknown'))}</span>`;
      const type=item.type?`<span class="pill">${esc(item.type)}</span>`:'';
      const venue=item.venue?`<span class="pill venue" title="${esc(item.venue)}">${esc(item.venue)}</span>`:'';
      const oa=item.isOpenAccess?`<span class="pill flag">${esc(t('开放获取','Open access'))}</span>`:'';
      const cited=item.citedBy!==undefined?`<span>${esc(t('被引','cited by'))} ${Number(item.citedBy||0)}</span>`:'';
      const provider=item.provider?`<span class="pill provider">${esc(item.provider)}</span>`:'';
      const authors=safeArray(item.authors).slice(0,6).join(', ')||t('作者未提供','Authors unavailable');
      const abstractContent=text(item.abstract);
      const abstractHtml=abstractContent?`<p class="external-abstract">${esc(abstractContent.slice(0,500))}</p>`:`<p class="external-abstract muted-empty">${esc(t('暂无在线摘要','No abstract available'))}</p>`;
      return `<article class="card external-card ${isSearch?'full-view':'compact-view'}"><div class="meta">${year}${type}${venue}${oa}${cited}${provider}</div><h3 lang="${uiLanguage}">${esc(item.title||t('题名未提供','Title unavailable'))}</h3><p class="authors">${esc(authors)}</p>${abstractHtml}<div class="links">${source?`<a class="btn small ghost-link" href="${esc(source)}" target="_blank" rel="noopener noreferrer">${esc(t('查看记录','View record'))} ↗</a>`:''}${pdf?`<button class="btn primary small" data-action="ingest-external" data-url="${esc(pdf)}" data-title="${esc(item.title||'')}">${esc(t('一键收入本地','Add to local library'))}</button>`:`<span class="no-pdf-hint">${esc(t('无公开PDF','No open PDF'))}</span>`}</div></article>`;
    }).join('');
  }
  function summaryPending(row){return list(row.flags).includes('速读/待生成')||!text(row.oneSentence).trim()||text(row.oneSentence)==='暂无摘要。';}
  function renderSummaryBatch(){
    const docs=safeArray(state.snapshot?.documents),pending=docs.filter(summaryPending);
    const selected=state.comparison.length;
    el('summary-selection-count').textContent=selected?t(`已选择 ${selected} 篇`,`${selected} selected`):t('未选择文献','No papers selected');
    el('summary-select-missing').textContent=t(`选择待生成（最多 12 篇；${pending.length} 篇）`,`Select pending (up to 12; ${pending.length} total)`);
    el('summary-generate').disabled=!selected;
  }
  function safeGuide(guide){const keys=safeArray(guide.reading), docs=byKey();return `<div class="guide"><h3>${esc(guide.name)}</h3><p>${esc(guide.summary||'')}</p><ul>${safeArray(guide.insights).map(item=>`<li>${esc(item)}</li>`).join('')}</ul><div class="reading-path">${keys.filter(key=>docs[key]).map((key,index)=>`<button class="reading-step" data-focus="${esc(key)}">${index+1}. ${esc(docs[key].zhTitle||docs[key].title||key)}</button>`).join('')}</div></div>`;}
  function decisionLabel(decision){return {deep_read:t('精读','Deep read'),read:t('通读','Read'),skim:t('略读','Skim'),reference:t('备用参考','Reference')}[decision]||'';}
  function readingDecisionMarkup(decision){if(!decision||!decisionLabel(decision.decision))return '';const cls=decision.decision==='deep_read'?'':` ${decision.decision}-decision`;const focus=list(decision.focus).slice(0,3).join('；');return `<div class="reading-decision-line"><span class="decision-pill${cls}">${esc(decisionLabel(decision.decision))}</span>${decision.fit?` ${esc(decision.fit)}`:''}${focus?` <span class="muted">· ${esc(focus)}</span>`:''}${decision.nextAction?`<br><span class="muted">${esc(t('下一步','Next'))}：${esc(decision.nextAction)}</span>`:''}</div>`;}
  function cardMarkup(row){const key=esc(row.key),docs=byKey(),source=safeURL(row.sourceURL),attachment=safeURL(row.attachmentURL,true),zoteroLinked=row.zoteroLinked!==false,locate=zoteroLinked&&row.key&&/^[A-Za-z0-9]+$/.test(row.key)?`zotero://select/library/items/${encodeURIComponent(row.key)}`:'',title=row.zhTitle||row.title||'题名未提供',selected=state.comparison.includes(row.key),pending=summaryPending(row);return `<article class="card ${selected?'selected':''}" id="doc-${key}"><div class="meta"><span>${esc(row.year||'年份未详')}</span>${row.studyType?`<span class="pill">${esc(row.studyType)}</span>`:''}${row.category?`<span class="pill">${esc(row.category)}</span>`:''}<span>${esc(row.source||'来源未详')}</span>${list(row.flags).map(flag=>`<span class="pill flag">${esc(text(flag).split('/').pop())}</span>`).join('')}</div><h3 class="zh-title">${highlighted(title,state.query)}</h3>${state.searchReasons[row.key]?`<div class="match-note">${esc(state.searchReasons[row.key])}</div>`:''}${row.title&&row.title!==title?`<p class="en-title" lang="en">${esc(row.title)}</p>`:''}<p class="one">${highlighted(row.oneSentence||row.summary||'暂无摘要。',state.query)}</p>${readingDecisionMarkup(row.readingDecision)}<div class="keywords">${[...list(row.subtopics),...list(row.keywords)].slice(0,6).map(item=>`<span class="keyword">${esc(item)}</span>`).join('')}</div><details><summary>研究问题、方法与使用场景</summary><dl>${row.authors?`<dt>作者</dt><dd>${esc(row.authors)}</dd>`:''}${row.question?`<dt>研究问题</dt><dd>${esc(row.question)}</dd>`:''}${row.method||row.studyModel?`<dt>方法与对象</dt><dd>${esc(row.method||'')}${row.studyModel?`<br>研究模型：${esc(row.studyModel)}`:''}</dd>`:''}${row.useCase?`<dt>可用于</dt><dd>${esc(row.useCase)}</dd>`:''}${row.limitations?`<dt>已知边界</dt><dd>${esc(row.limitations)}</dd>`:''}</dl><div class="source-note">摘要依据：${esc(row.basis||'来源未提供')}${row.identifier?` · ${esc(row.identifier)}`:''}</div><div class="related"><strong class="source-note">关联文献</strong>${list(row.related).map(rel=>docs[rel]?`<button data-focus="${esc(rel)}">${esc(docs[rel].zhTitle||docs[rel].title||rel)}</button>`:'').join('')}</div></details><details class="reading-tools"><summary>阅读进度与笔记</summary><div class="reading-controls"><select class="reading-status" data-key="${key}" aria-label="阅读状态"><option value="unread" ${(!row.readingStatus||row.readingStatus==='unread')?'selected':''}>未读</option><option value="reading" ${row.readingStatus==='reading'?'selected':''}>在读</option><option value="read" ${row.readingStatus==='read'?'selected':''}>已读</option></select><textarea rows="3" class="reading-note" data-key="${key}" placeholder="记录关键结论、疑问或后续实验">${esc(row.readingNote||'')}</textarea><button class="text-button" data-action="save-reading" data-key="${key}">保存笔记</button></div></details><div class="links">${row.hasPDF?`<button class="btn read-btn" data-action="open-reader" data-key="${key}">${esc(t('全文精读','Full-text reader'))}</button>`:''}${locate?`<a href="${locate}">在 Zotero 定位 ↗</a>`:''}${attachment?`<a href="${esc(attachment)}">${esc(row.attachmentLabel||'打开附件')}</a>`:''}${source?`<a href="${esc(source)}" target="_blank" rel="noopener noreferrer">查看来源摘要 ↗</a>`:''}<label class="compare-label"><input type="checkbox" class="compare-box" data-key="${key}" ${selected?'checked':''} aria-label="选择用于对比或生成速读：${esc(title)}">选择</label><button class="text-button" data-action="open-dossier" data-key="${key}">深读档案</button><button class="text-button" data-action="summarize" data-key="${key}">${pending?'生成速读':'重新生成摘要'}</button></div></article>`;}
  function renderResults(){
    if(!state.snapshot)return;
    renderSearchMode();
    const hintEl=el('result-hint');
    const submitBtn=el('search-submit');
    if(state.searchMode==='external'){
      el('summary-batch').hidden=true;
      el('result-count').textContent=state.externalLoading?t('正在检索开放学术图谱…','Searching open scholarly graphs...'):`${t('全网发现','Discover online')} · ${state.externalResults.length}`;
      if(hintEl)hintEl.textContent=t('支持查看原文出处与一键下载公开全文入库','View online records or add open-access papers to your library');
      if(submitBtn){
        if(state.externalLoading){submitBtn.setAttribute('disabled','true');submitBtn.textContent=t('检索中…','Searching...');}
        else{submitBtn.removeAttribute('disabled');submitBtn.textContent=t('搜索','Search');}
      }
      el('results').innerHTML=state.externalLoading?`<div class="empty">${esc(t('正在检索开放学术图谱…','Searching open scholarly graphs...'))}</div>`:state.externalResults.length?externalMarkup(state.externalResults):`<div class="empty">${esc(t('输入主题后查找全网开放文献。','Enter a topic to discover open literature online.'))}</div>`;
      el('load-more').hidden=true;el('guide-panel').hidden=true;el('active-route').hidden=true;renderCompareBar();applyLanguage();return;
    }
    el('summary-batch').hidden=false;
    if(hintEl)hintEl.textContent=t('勾选 2–12 篇可对比或生成小综述','Select 2–12 papers to compare or synthesize');
    if(submitBtn){submitBtn.removeAttribute('disabled');submitBtn.textContent=t('搜索','Search');}
    const rows=filteredDocs(),total=safeArray(state.snapshot.documents).length;
    el('result-count').textContent=`${t('找到','Found')} ${rows.length} / ${total} ${t('条文献','documents')}${state.focusKey?` · ${t('当前定位文献','focused document')}`:''}`;
    el('results').innerHTML=rows.length?rows.slice(0,state.limit).map(cardMarkup).join(''):`<div class="empty">${esc(t('没有找到匹配文献，可尝试缩短问题或清除筛选条件。','No matching literature. Try a shorter query or clear the filters.'))}</div>`;
    state.snapshot.documents.filter(row=>rows.slice(0,state.limit).some(item=>item.key===row.key)).forEach(row=>{const card=el(`doc-${row.key}`);if(card&&!card.querySelector('.card-tools'))card.insertAdjacentHTML('beforeend',cardToolsMarkup(row));});
    el('load-more').hidden=rows.length<=state.limit;const guide=safeArray(state.snapshot.guides).find(item=>item.name===state.category);el('guide-panel').hidden=!guide;el('guide-panel').innerHTML=guide?safeGuide(guide):'';el('active-route').hidden=!state.routeName&&!state.focusKey;el('active-route').textContent=state.routeName?`${t('阅读路线','Reading path')}：${state.routeName}`:state.focusKey?t('已定位文献；点击“重置”返回全部文献。','Document focused. Use Reset to return to the full list.'):'';renderSummaryBatch();renderCompareBar();applyLanguage();
  }
  function renderSearchMode(){
    el('search-mode-local').classList.toggle('active',state.searchMode==='local');el('search-mode-external').classList.toggle('active',state.searchMode==='external');
    el('search-mode-local').setAttribute('aria-pressed',String(state.searchMode==='local'));el('search-mode-external').setAttribute('aria-pressed',String(state.searchMode==='external'));
    document.querySelector('.filters').hidden=state.searchMode==='external';
    const aside=document.querySelector('.library-layout aside');
    if(aside)aside.hidden=state.searchMode==='external';
    document.querySelector('.library-layout')?.classList.toggle('no-aside',state.searchMode==='external');
  }
  let loadedProject = '', loadedProjectMembers = [], projectHits = [];
  const libraryProject = () => el('library-project').value.trim() || 'default';
  async function loadProject() {
    const project = libraryProject();
    const response = await fetch(`/api/library-project?${new URLSearchParams({project})}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '无法读取课题。');
    if (libraryProject() !== project) return;
    loadedProject = project;
    const members = new Set(safeArray(result.members));
    loadedProjectMembers = [...members].sort();
    el('project-members').innerHTML = safeArray(state.snapshot?.documents).map(doc =>
      `<label><input type="checkbox" data-project-member="${esc(doc.key)}" ${members.has(doc.key)?'checked':''}>${esc(doc.zhTitle||doc.title||doc.key)}</label>`).join('');
    el('project-status').textContent = t(`课题“${project}”：${members.size} 篇文献。`, `Project “${project}”: ${members.size} papers.`);
    el('project-results').innerHTML = '';
    projectHits = [];
  }
  function requireLoadedProject() {
    if (loadedProject !== libraryProject()) throw new Error(t('请先读取当前课题。','Load the current project first.'));
    return loadedProject;
  }
  function requireSavedProject() {
    const project = requireLoadedProject();
    const current = [...el('project-members').querySelectorAll('[data-project-member]:checked')].map(box=>box.dataset.projectMember).sort();
    if (JSON.stringify(current) !== JSON.stringify(loadedProjectMembers)) throw new Error(t('请先保存课题文献。','Save project papers first.'));
    return project;
  }
  async function saveProjectMembers() {
    const project = requireLoadedProject();
    const keys = [...el('project-members').querySelectorAll('[data-project-member]:checked')].map(box => box.dataset.projectMember);
    await post('/api/library-project', {action:'members', project, keys});
    if (libraryProject() === project) await loadProject();
  }
  async function indexProject(rebuild) {
    const project = requireSavedProject();
    el('project-status').textContent = t('正在更新正文索引…','Updating full-text index…');
    const result = await post('/api/library-project', {action:'index', project, rebuild});
    if (libraryProject() !== project) return;
    const failed = safeArray(result.errors);
    el('project-status').textContent = t(`索引完成：${Number(result.indexed)||0} 篇；失败 ${failed.length} 篇。`, `Indexed ${Number(result.indexed)||0} papers; ${failed.length} failed.`)
      + (failed.length ? ' ' + failed.map(item=>`${item.key}: ${item.error}`).join('；') : '');
  }
  async function searchProject() {
    const project = requireSavedProject(), query = el('project-query').value.trim();
    if (!query) throw new Error(t('请输入问题或关键词。','Enter a question or keywords.'));
    el('project-status').textContent = t('正在搜索正文…','Searching full text…');
    const synonyms = queryGroups.filter(group=>group.some(term=>normalized(query).includes(term))).flat();
    const result = await post('/api/library-search', {project, query, synonyms});
    if (libraryProject() !== project || el('project-query').value.trim() !== query) return;
    projectHits = safeArray(result.results);
    const docs = byKey();
    const coverage = safeArray(result.coverage?.documents);
    const missingPages = coverage.reduce((n,item)=>n+safeArray(item.unindexed_pages).length,0);
    const imagePages = coverage.reduce((n,item)=>n+(Number(item.image_only)||0),0);
    const unindexed = coverage.filter(item=>['absent','summary_only'].includes(item.state)).length;
    const stale = coverage.filter(item=>item.state==='stale').length;
    el('project-status').textContent = t(`课题 ${coverage.length} 篇；未索引 ${unindexed} 篇，未索引页面 ${missingPages} 页，无文字页面 ${imagePages} 页，版本已更改 ${stale} 篇。未覆盖的内容未参与搜索。`,
      `Project: ${coverage.length} papers; ${unindexed} unindexed, ${missingPages} unindexed pages, ${imagePages} pages without text, ${stale} outdated. Uncovered content was not searched.`);
    const states = {absent:t('未索引','Not indexed'),partial:t('部分索引','Partially indexed'),image_only:t('需要 OCR','Needs OCR'),searchable:t('正文已索引','Indexed'),stale:t('版本已更改','Outdated'),summary_only:t('仅有摘要','Abstract only')};
    const coverageMarkup = coverage.length ? `<details><summary>${esc(t('各文献索引状态','Index status by paper'))}</summary><ul>${coverage.map(item=>`<li>${esc(docs[item.paper]?.zhTitle||docs[item.paper]?.title||item.paper)}：${esc(states[item.state]||item.state)} · ${Number(item.indexed)||0}/${Number(item.page_count)||0} ${esc(t('页','pages'))} · ${Number(item.image_only)||0} ${esc(t('页无文字','pages without text'))}</li>`).join('')}</ul></details>` : '';
    const hitsMarkup = projectHits.length ? projectHits.map((item,index)=>
      `<article class="project-hit"><strong>${esc(docs[item.paper]?.zhTitle||docs[item.paper]?.title||item.paper)}</strong> · ${esc(t('第','Page'))} ${Number(item.page)||0}<p>${esc(item.quote)}</p><small>${esc(item.explanation||'')}</small> <button class="text-button" data-project-hit="${index}">${esc(t('查看原文','View source'))}</button></article>`).join('') :
      `<p>${esc(t('已索引范围内没有匹配段落。','No matching passages in the indexed scope.'))}</p>`;
    el('project-results').innerHTML = coverageMarkup + hitsMarkup;
  }
  async function openProjectHit(index) {
    const project = requireSavedProject(), hit = projectHits[index];
    if (!hit) return;
    const located = await post('/api/library-search', {action:'locate',project,document:hit.paper,version:hit.version,page:hit.page,quote:hit.quote});
    if (libraryProject() !== project) return;
    readerTabRecord(hit.paper).page = located.page;
    await openReader(hit.paper);
    if (readerState.docKey !== hit.paper) return;
    el('reader-project').value = project;
    storeReaderValue(`project:${hit.paper}`, project);
    refreshReadingMemory().catch(err => toast(err.message));
    refreshFigures().catch(err => toast(err.message));
    await showLocatedSource(located);
  }
  async function runExternalSearch(){
    if(state.externalLoading)return;
    const query=el('query').value.trim();
    if(!query){toast(t('输入主题后查找全网开放文献。','Enter a topic to discover open literature online.'));return;}
    state.searchMode='external';state.query=query;state.externalLoading=true;renderResults();
    try{
      await runAction(async()=>{
        const result=await post('/api/external-recommend',{mode:'search',query});
        state.externalResults=safeArray(result.results);
      });
    }catch(err){
      // runAction already toasts the error if any
    }finally{
      state.externalLoading=false;
      renderResults();
    }
  }
  function showDocument(key){Object.assign(state,{focusKey:key,routeKeys:null,routeName:'',category:'',kind:'',year:'',studyType:'',readingStatus:'',query:'',limit:24,searchMode:'local'});syncFilters();setView('library');renderResults();el('library-view').scrollTo({top:0,behavior:'instant'});}
  function syncFilters(){for(const name of ['category','kind','year','studyType','readingStatus'])el(name).value=state[name]||'';el('query').value=state.query;}
  function renderCompareBar(message=''){const docs=byKey();state.comparison=state.comparison.filter(key=>docs[key]);el('compare-bar').hidden=!state.comparison.length;el('compare-tab-count').textContent=state.comparison.length?`(${state.comparison.length})`:'';el('compare-message').textContent=message||`已选择 ${state.comparison.length} 篇：${state.comparison.map(key=>docs[key]?.zhTitle||docs[key]?.title||key).join(' / ')}`;el('open-comparison').disabled=state.comparison.length<2;document.querySelectorAll('.compare-box').forEach(box=>{box.checked=state.comparison.includes(box.dataset.key);box.closest('.card')?.classList.toggle('selected',box.checked);}); renderSummaryBatch();applyLanguage();}
  function synthesisReviewHint(){return t('引用可定位不代表支持具体结论；请核对原文中的对象、实验方法和数值。','A locatable citation does not establish support; check the population, methods, and values against the source.');}
  function synthesisSourceIndex(sources,project){
    const entries=safeArray(sources);
    if(!entries.length)return '';
    const papers=entries.map(source=>{
      const passages=safeArray(source.passages);
      return `<li><strong>[${esc(source.id)}] ${esc(source.title||source.key||'')}</strong> · ${esc(synthesisBasisLabel(source.basis))}${passages.length?`<ul>${passages.map(passage=>`<li><button type="button" class="text-button synthesis-cite" data-action="synthesis-source" data-project="${esc(project)}" data-paper="${esc(source.key)}" data-version="${esc(passage.version||'')}" data-page="${Number(passage.page)||1}" data-quote="${esc(passage.quote||'')}">[${esc(passage.id)}] ${esc(t('第','Page '))}${Number(passage.page)||1}${esc(t(' 页',''))}</button><blockquote>${esc(passage.quote||'')}</blockquote></li>`).join('')}</ul>`:`<p class="hint">${esc(t('该稿未保存原文摘录。','No source excerpts were saved with this draft.'))}</p>`}</li>`;
    }).join('');
    return `<details class="synthesis-sources"><summary>${esc(t('查看该稿保存的原文摘录','View source excerpts saved with this draft'))}</summary><p class="hint">${esc(t('包括未被正文引用的摘录；速读卡等其他输入未列于此。摘录可能不覆盖全文，结论仍需核对。','Includes excerpts not cited in the text; other inputs such as reading cards are not listed. Excerpts may not cover the whole paper; check each claim.'))}</p><ul>${papers}</ul></details>`;
  }
  function renderComparison(){
    state.comparisonSignature=JSON.stringify([state.snapshot?.documents,state.snapshot?.dossiers]);
    const docs=byKey(),selected=state.comparison.map(key=>docs[key]).filter(Boolean);
    if(!state.evidenceProject)state.evidenceProject=libraryProject();
    if(!selected.length){el('comparison-content').innerHTML=`<div class="empty">${esc(t('在“检索与导读”中勾选 2–12 篇文献，即可查看对比、生成小综述或证据矩阵。','Select 2–12 papers in Search & Guides to compare them, synthesize them, or create an evidence matrix.'))}</div><section class="evidence-matrix panel"><h3>${esc(t('跨文献证据矩阵','Cross-paper evidence matrix'))}</h3><label for="evidence-project">${esc(t('课题 / Project','Project'))}</label><input id="evidence-project" maxlength="120" value="${esc(state.evidenceProject)}"><div id="evidence-matrix-root" aria-live="polite"></div><div id="project-synthesis-root" aria-live="polite"></div></section>`;loadEvidenceMatrix(state.evidenceProject);loadProjectSynthesis(state.evidenceProject);applyLanguage();return;}
    const val=(row,key,fallback='')=>esc(row[key]||fallback),dossierFor=row=>state.snapshot?.dossiers?.[row.key]||null;
    const fields=[['一句话摘要',row=>val(row,'oneSentence',row.summary||'未提供')],['研究问题',row=>val(row,'question','未提供')],['研究模型',row=>val(row,'studyModel','来源未明确说明')],['方法',row=>val(row,'method','未提供')],['主要发现',row=>list(row.findings).length?'<ul>'+list(row.findings).map(item=>`<li>${esc(item)}</li>`).join('')+'</ul>':'未提供'],['深读档案',row=>{const d=dossierFor(row);return d?`${esc(decisionLabel(d.readingDecision)||t('已生成','Generated'))} · ${t('大纲','Outline')} ${Number(d.outline)||0} · ${t('论证','Arguments')} ${Number(d.argument)||0} · ${t('方法','Methods')} ${Number(d.methodsAudit)||0}${d.coverage?` · ${Number(d.coverage.withEvidence)||0}/${Number(d.coverage.items)||0} ${t('条有证据','with evidence')}`:''}`:esc(t('未生成；对比将使用速读卡字段','Not generated; synthesis uses card fields'))}],['适用场景',row=>val(row,'useCase','未提供')],['已知边界',row=>val(row,'limitations','当前摘要未单列局限')],['摘要依据',row=>val(row,'basis','来源未提供')],['原文',row=>row.zoteroLinked!==false&&row.key&&/^[A-Za-z0-9]+$/.test(row.key)?`<a href="zotero://select/library/items/${encodeURIComponent(row.key)}">在 Zotero 定位 ↗</a>`:'未提供']];
    const signature=`${state.comparison.join('|')}::${state.compareFocus.trim()}::${state.evidenceProject || libraryProject()}`;
    const synthesis=state.synthesis?.signature===signature?state.synthesis:null;
    const comparisonTable='<div class="comparison-wrap"><table class="comparison"><thead><tr><th>比较维度</th>'+selected.map(row=>`<th>${esc(row.zhTitle||row.title||'题名未提供')}<br><small>${esc(row.year||'年份未详')} · ${esc(row.studyType||'文献')}</small></th>`).join('')+'</tr></thead><tbody>'+fields.map(([label,value])=>'<tr><th scope="row">'+label+'</th>'+selected.map(row=>'<td>'+value(row)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
    const ledger='<div class="evidence-ledger">'+selected.map((row,index)=>`<article class="ledger-item"><strong>P${index+1} · ${esc(row.zhTitle||row.title||row.key)}</strong><span>${esc(row.year||'年份未详')} · ${esc(row.studyType||'文献')}</span><p>${esc(row.oneSentence||row.summary||'暂无摘要。')}</p><small>${row.question||row.method||list(row.findings).length?esc([row.question,row.method].filter(Boolean).join(' · ')):esc(t('仅题录，不作为结论依据','Metadata only; cannot support a conclusion'))}</small></article>`).join('')+'</div>';
    el('comparison-content').innerHTML=`<div class="focus-box"><label for="compare-focus">${esc(t('可选：综述聚焦问题','Optional: focus question'))}</label><textarea id="compare-focus" rows="2" placeholder="${esc(t('例如：这些研究在抗原表位结论上有哪些一致与冲突？','For example: where do these studies agree or conflict on antigen epitopes?'))}">${esc(state.compareFocus)}</textarea></div><div class="comparison-actions"><button class="btn primary" data-action="synthesize">${esc(t(selected.length>4?'生成聚焦小综述':'生成 AI 对比综述',selected.length>4?'Generate focused synthesis':'Generate AI synthesis'))}</button>${synthesis?`<button class="btn" data-action="copy-synthesis">${esc(t('复制 Markdown 报告','Copy Markdown report'))}</button><button class="btn" data-action="download-synthesis">${esc(t('下载 Markdown 报告','Download Markdown report'))}</button>`:''}</div>${selected.length<=4?comparisonTable:ledger}${synthesis?`<section class="synthesis"><h3>${esc(t('AI 证据综述','AI evidence synthesis'))}</h3><p class="hint">${esc(synthesisReviewHint())}</p><div class="model-answer">${modelAnswer(synthesis.markdown,{},synthesis.sources,state.evidenceProject||libraryProject())}</div>${synthesisSourceIndex(synthesis.sources,state.evidenceProject||libraryProject())}</section>`:''}<section class="evidence-matrix panel"><h3>${esc(t('跨文献证据矩阵','Cross-paper evidence matrix'))}</h3><p class="hint">${esc(t('按课题保存；人工修订保留独立于生成值，并为每格明确选择证据状态。','Saved by project. Human edits remain separate from generated values; choose a status for each saved cell.'))}</p><label for="evidence-project">${esc(t('课题 / Project','Project'))}</label><input id="evidence-project" maxlength="120" value="${esc(state.evidenceProject)}"><div id="evidence-matrix-root" aria-live="polite"></div><div id="project-synthesis-root" aria-live="polite"></div></section>`;
    loadEvidenceMatrix(state.evidenceProject);
    loadProjectSynthesis(state.evidenceProject);
    applyLanguage();
  }
  const matrixFields=[['research_question','研究问题'],['sample','对象 / 样本'],['method','方法'],['controls','对照'],['endpoint','终点'],['results','结果数值 / 单位'],['limitations','局限']];
  const matrixStatuses={supported:'有原文支持',not_found:'未检索到',not_reported:'原文未报告',unknown:'待核对',conflict:'结果相反',incomparable:'条件不可比'};
  const matrixDraftKey=(project,paper,field)=>JSON.stringify([project,paper,field]);
  const synthesisBase=source=>({markdown:'',sources:safeArray(source?.sources),keys:safeArray(source?.keys),focus:source?.focus||''});
  function synthesisBasisLabel(basis){return ({full_text:t('原文摘录','Source excerpts'),reading_card:t('速读卡','Reading card'),metadata_only:t('仅题录','Metadata only')})[basis]||basis||t('未提供','Unspecified');}
  function projectSynthesisReferences(sources){return safeArray(sources).map(source=>`- [${source.id}] ${source.title||source.key} (${source.key}) · basis: ${source.basis||'unspecified'}${safeArray(source.passages).map(passage=>`\n  - [${passage.id}] p. ${Number(passage.page)||1} · ${source.key} · version: ${passage.version||''}\n\n    > ${String(passage.quote||'').replace(/\r?\n/g,'\n    > ')}`).join('')}`).join('\n');}
  function synthesisMarkdown(markdown,sources){return `${markdown}\n\n## ${t('文献编号','References')}\n\n${projectSynthesisReferences(sources)}\n`;}
  function loadProjectSynthesis(project,force=false){
    const root=el('project-synthesis-root');if(!root)return;
    if(!project){root.innerHTML='';return;}
    if(!force&&state.projectSynthesisProject===project){renderProjectSynthesis();return;}
    const request=++state.projectSynthesisRequest;
    root.innerHTML=`<p class="hint">${esc(t('正在读取课题调研初稿…','Loading project draft…'))}</p>`;
    fetch(`/api/project-synthesis?${new URLSearchParams({project})}`).then(async response=>{
      const result=await response.json();if(!response.ok||result.ok===false)throw new Error(result.error||'无法读取调研初稿。');
      if(request!==state.projectSynthesisRequest||el('evidence-project')?.value.trim()!==project)return;
      state.projectSynthesis=result.draft;state.projectSynthesisProject=project;renderProjectSynthesis();
    }).catch(error=>{if(request===state.projectSynthesisRequest&&el('evidence-project')?.value.trim()===project)root.innerHTML=`<p class="hint" role="status">${esc(error.message)}</p>`;});
  }
  function renderProjectSynthesis(){
    const root=el('project-synthesis-root'),project=el('evidence-project')?.value.trim();if(!root||!project)return;
    const draft=state.projectSynthesisProject===project?state.projectSynthesis:null;
    if(!draft){root.innerHTML=`<h3>${esc(t('课题调研初稿','Project research draft'))}</h3><p class="hint">${esc(t('生成对比综述后，初稿会保存在此课题。','Generate a synthesis to save a draft for this project.'))}</p>`;return;}
    const edit=state.projectSynthesisEdits[project],active=edit?.base||(draft.revision||draft.generated);
    const value=edit?.markdown??active.markdown??'';
    const sources=safeArray(active.sources).map(source=>`[${source.id}] ${source.title||source.key} (${source.key}) — ${esc(t('依据','Basis'))}: ${esc(synthesisBasisLabel(source.basis))}`).join(' · ');
    root.innerHTML=`<h3>${esc(t('课题调研初稿','Project research draft'))}</h3><p class="hint">${esc(draft.revision&&!edit?.useGenerated?t('显示人工修订；最新生成稿单独保留。','Showing the human revision; the latest generated draft is retained separately.'):t('显示生成稿；保存后成为人工修订。','Showing the generated draft; saving creates a human revision.'))}</p><p class="hint">${esc(synthesisReviewHint())}</p><p class="hint">${esc(sources)}</p><label for="project-synthesis-edit">${esc(t('编辑 Markdown 初稿','Edit Markdown draft'))}</label><textarea id="project-synthesis-edit" rows="12" maxlength="100000">${esc(value)}</textarea><div class="model-answer synthesis-preview">${modelAnswer(value,{},active.sources,project)}</div>${synthesisSourceIndex(active.sources,project)}<div class="comparison-actions"><button class="btn primary" data-action="project-synthesis-save">${esc(t('保存修订','Save revision'))}</button><button class="btn" data-action="project-synthesis-export">${esc(t('导出 Markdown','Export Markdown'))}</button>${draft.revision&&draft.generated?`<button class="btn" data-action="project-synthesis-adopt" ${edit?'disabled':''}>${esc(t('以最新生成稿开始修订','Start from latest generated draft'))}</button>`:''}</div>${edit?`<p class="hint">${esc(t('未保存的修改','Unsaved changes'))}</p>`:''}${draft.generated?`<details><summary>${esc(t('查看最新生成稿','View latest generated draft'))}</summary><div class="model-answer">${modelAnswer(draft.generated.markdown||'',{},draft.generated.sources,project)}</div>${synthesisSourceIndex(draft.generated.sources,project)}</details>`:''}`;
  }
  function loadEvidenceMatrix(project,force=false){
    const root=el('evidence-matrix-root');if(!root)return;
    if(!project){root.innerHTML=`<p class="hint">${esc(t('请输入课题名称。','Enter a project name.'))}</p>`;return;}
    if(!force&&state.evidenceMatrixProject===project){renderEvidenceMatrix();return;}
    if(!force&&state.evidenceMatrixLoading===project){root.innerHTML=`<p class="hint">${esc(t('正在读取课题证据矩阵…','Loading project evidence matrix…'))}</p>`;return;}
    const request=++state.evidenceMatrixRequest;state.evidenceMatrixLoading=project;
    root.innerHTML=`<p class="hint">${esc(t('正在读取课题证据矩阵…','Loading project evidence matrix…'))}</p>`;
    fetch(`/api/evidence-matrix?${new URLSearchParams({project})}`).then(async response=>{const result=await response.json();if(!response.ok||result.ok===false)throw new Error(result.error||'无法读取证据矩阵。');if(request!==state.evidenceMatrixRequest||el('evidence-project')?.value.trim()!==project)return;state.evidenceMatrix=result.matrix||null;state.evidenceMatrixProject=project;state.evidenceMatrixLoading='';renderEvidenceMatrix();}).catch(error=>{if(request!==state.evidenceMatrixRequest)return;state.evidenceMatrixLoading='';root.innerHTML=`<p class="hint" role="status">${esc(error.message)}</p>`;});
  }
  function matrixCitationWarning(generated){
    const validation=generated?.citationValidation;
    if(!validation || !Number.isInteger(validation.rejectedCount) || validation.rejectedCount<1)return '';
    const ids=safeArray(validation.rejectedIds).map(id=>esc(id)).join(', ');
    return `<p class="hint">${esc(t('生成值引用了未提供的来源编号，需核对。','The generated value cited source IDs that were not supplied; review it.'))} ${esc(t('无效引用数','Invalid citations'))}: ${validation.rejectedCount}${ids?` · ${ids}`:''} ${esc(t('最多显示 30 条，每条最多 120 字符。','Up to 30 entries, 120 characters each.'))}</p>`;
  }
  function renderEvidenceMatrix(){
    const root=el('evidence-matrix-root'),project=el('evidence-project')?.value.trim();if(!root||!project)return;
    const matrix=state.evidenceMatrixProject===project?state.evidenceMatrix:null,selected=state.comparison.map(key=>byKey()[key]).filter(Boolean),papers=matrix?.papers||[];
    const actions=`<div class="comparison-actions"><button class="btn primary" data-action="matrix-generate" ${selected.length<2||selected.length>12?'disabled':''}>${esc(t('生成 / 更新矩阵（使用当前所选文献）','Generate / update from current selection'))}</button><button class="btn" data-action="matrix-export" data-format="markdown" ${matrix?'':'disabled'}>Markdown</button><button class="btn" data-action="matrix-export" data-format="csv" ${matrix?'':'disabled'}>CSV</button></div>`;
    if(!matrix){root.innerHTML=`${actions}<p class="hint">${esc(selected.length<2?t('先在检索页选择 2–12 篇文献。','Select 2–12 papers in Search & Guides first.'):t(`当前选择 ${selected.length} 篇。生成后会按课题保存矩阵。`,`Current selection: ${selected.length} papers. Generate to save a project matrix.`))}</p>`;return;}
    const docs=byKey();
    const table=`<div class="comparison-wrap evidence-matrix-wrap"><table class="comparison evidence-matrix-table"><thead><tr><th>${esc(t('字段','Field'))}</th>${papers.map(paper=>`<th>${esc(docs[paper]?.zhTitle||docs[paper]?.title||paper)}<small>${esc(docs[paper]?.year||'')}</small></th>`).join('')}</tr></thead><tbody>${matrixFields.map(([field,label])=>`<tr><th scope="row">${esc(t(label,({research_question:'Research question',sample:'Sample',method:'Method',controls:'Controls',endpoint:'Endpoint',results:'Results / units',limitations:'Limitations'})[field]))}</th>${papers.map(paper=>{const cell=matrix.cells?.[paper]?.[field]||{value:'',status:'unknown',sources:[],generated:{value:'',status:'unknown',sources:[]},revision:null},key=matrixDraftKey(project,paper,field),draft=state.evidenceMatrixDrafts[key],value=draft?.value??cell.value??'',status=draft?.status??cell.status??'unknown',sources=safeArray(cell.sources);return `<td class="${draft?'has-draft':''}"><textarea class="matrix-cell-value" data-matrix-paper="${esc(paper)}" data-matrix-field="${field}" rows="3" maxlength="6000" aria-label="${esc(label)} · ${esc(paper)}">${esc(value)}</textarea><div class="matrix-cell-meta"><span class="matrix-origin ${draft?'draft':cell.revision?'edited':'generated'}">${esc(draft?t('未保存草稿','Unsaved draft'):cell.revision?t('人工修订','Edited'):t('生成值','Generated'))}</span><label>${esc(t('状态','Status'))}<select class="matrix-cell-status" data-matrix-paper="${esc(paper)}" data-matrix-field="${field}" aria-label="${esc(t('证据状态','Evidence status'))}">${Object.entries(matrixStatuses).map(([value,label])=>`<option value="${value}" ${status===value?'selected':''}>${esc(t(label,({supported:'Supported',not_found:'Not found',not_reported:'Not reported',unknown:'Needs review',conflict:'Conflict',incomparable:'Incomparable'})[value]))}</option>`).join('')}</select></label><button class="text-button" data-action="matrix-save" data-matrix-paper="${esc(paper)}" data-matrix-field="${field}">${esc(t('保存此格','Save cell'))}</button></div>${matrixCitationWarning(cell.generated)}${sources.length?`<ul class="matrix-sources">${sources.map(source=>`<li><button class="text-button matrix-source" data-action="matrix-locate" data-matrix-paper="${esc(paper)}" data-version="${esc(source.version)}" data-page="${Number(source.page)||1}" data-quote="${esc(source.quote)}">${source.stale?esc(t('来源版本已过期 · ','Outdated source · ')):''}${esc(t(`原文第 ${Number(source.page)||1} 页`,`Source page ${Number(source.page)||1}`))} · ${esc(source.quote)}</button></li>`).join('')}</ul>`:`<small class="hint">${esc(t('此格没有原文引句。','No source quote for this cell.'))}</small>`}</td>`;}).join('')}</tr>`).join('')}</tbody></table></div>`;
    root.innerHTML=`${actions}<p class="hint">${esc(t(`已保存课题“${matrix.project}”的 ${papers.length} 篇矩阵。生成值与人工修订分别保留。`,`Project “${matrix.project}”: saved matrix for ${papers.length} papers. Generated values and edits are retained separately.`))}</p><p class="hint">${esc(t('生成值的状态由模型判断，需对照原文核对；引句可定位不代表支持该结论。人工修订也需自行确认。','Generated statuses are model judgments and require source review; a locatable quote does not establish support. Human edits also require confirmation.'))}</p>${table}`;
  }
  function clearComparison(){state.comparison=[];state.compareFocus='';state.synthesis=null;renderCompareBar();renderComparison();}

  const readerState = {
    docKey: null,
    doc: null,
    pdfDoc: null,
    pdfjsLib: null,
    loadingTask: null,
    loadGeneration: 0,
    renderGeneration: 0,
    renderTasks: new Map(),
    renderJobs: new Map(),
    navigationGeneration: 0,
    zoomTask: null,
    currentPage: 1,
    totalPages: 0,
    zoomScale: 1.25,
    renderedPages: new Set(),
    selection: null,
    figure: null,
    figureSelecting: false,
    evidence: new Map(),
    excerpts: [],
    dossier: null,
    fullReading: null,
    fullReadTimer: null,
    askingKeys: new Set(),
    pageObserver: null,
    openTabs: new Map(),
    preferredKey: null,
    tabsRestored: false,
    sessionId: 'default',
    sessions: [],
    sessionDraftTimer: null,
    pendingSessionDraft: null,
    sessionDraftSave: null,
    sessionDraftRevision: 0,
  };

  function readerStored(name) {
    try { return localStorage.getItem(`scholarloom.reader.${name}`) || ''; } catch { return ''; }
  }

  function storeReaderValue(name, value) {
    try { localStorage.setItem(`scholarloom.reader.${name}`, String(value)); } catch { /* Local storage is optional. */ }
  }

  const readerLayout = document.querySelector('.reader-layout');
  const readerWidths = { left: Number(readerStored('leftWidth')) || 260, right: Number(readerStored('rightWidth')) || 420 };
  function resizeReaderColumn(side, width) {
    const other = side === 'left' ? 'right' : 'left';
    const minimum = side === 'left' ? 180 : 260;
    const maximum = Math.max(minimum, readerLayout.clientWidth - readerWidths[other] - 350);
    readerWidths[side] = Math.round(Math.max(minimum, Math.min(width, maximum)));
    readerLayout.style.setProperty(`--reader-${side}`, `${readerWidths[side]}px`);
  }
  document.querySelectorAll('[data-reader-split]').forEach(handle => {
    const side = handle.dataset.readerSplit;
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      const start = event.clientX, width = readerWidths[side];
      handle.setPointerCapture(event.pointerId);
      const move = e => resizeReaderColumn(side, width + (e.clientX - start) * (side === 'left' ? 1 : -1));
      const finish = () => {
        handle.removeEventListener('pointermove', move);
        storeReaderValue(`${side}Width`, readerWidths[side]);
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('lostpointercapture', finish, { once: true });
    });
    handle.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      resizeReaderColumn(side, readerWidths[side] + (event.key === 'ArrowRight' ? 20 : -20) * (side === 'left' ? 1 : -1));
      storeReaderValue(`${side}Width`, readerWidths[side]);
    });
  });
  new ResizeObserver(() => {
    if (readerLayout.clientWidth < 1100) return;
    resizeReaderColumn('left', readerWidths.left);
    resizeReaderColumn('right', readerWidths.right);
  }).observe(readerLayout);

  function readerDocFor(key) {
    return safeArray(state.snapshot?.documents).find(doc => doc.key === key) || null;
  }

  function readerTabRecord(key) {
    let tab = readerState.openTabs.get(key);
    if (!tab) {
      tab = { key, page: 1, zoomScale: null, evidence: new Map(), excerpts: [] };
      readerState.openTabs.set(key, tab);
    }
    return tab;
  }

  function syncReaderTabState() {
    if (!readerState.docKey) return;
    const tab = readerTabRecord(readerState.docKey);
    tab.page = readerState.currentPage;
    tab.zoomScale = readerState.zoomScale;
    tab.evidence = readerState.evidence;
    tab.excerpts = readerState.excerpts;
    persistReaderTabs();
  }

  function persistReaderTabs() {
    const tabs = [...readerState.openTabs.values()].map(tab => ({
      key: tab.key,
      page: Number(tab.page) || 1,
      zoomScale: Number(tab.zoomScale) || null,
    }));
    const active = readerState.docKey || readerState.preferredKey || '';
    storeReaderValue('tabs', JSON.stringify({ tabs, active }));
  }

  function renderReaderTabs() {
    const container = el('reader-open-tabs');
    if (!container) return;
    const keys = [...readerState.openTabs.keys()];
    container.hidden = !keys.length;
    container.innerHTML = keys.map(key => {
      const doc = readerDocFor(key);
      const title = doc?.zhTitle || doc?.title || key;
      const active = key === readerState.docKey;
      return `<div class="reader-open-tab${active ? ' active' : ''}">
        <button type="button" class="reader-tab-select" role="tab" aria-selected="${active}" data-reader-tab="${esc(key)}" title="${esc(title)}"><span>${esc(title)}</span></button>
        <button type="button" class="reader-tab-close" data-close-reader-tab="${esc(key)}" aria-label="${esc(t('关闭','Close'))} ${esc(title)}" title="${esc(t('关闭','Close'))}">×</button>
      </div>`;
    }).join('');
    const navButton = el('reader-tab');
    if (navButton) navButton.hidden = !keys.length;
    const navTitle = el('reader-tab-title');
    if (navTitle) navTitle.textContent = keys.length ? `${t('全文精读','Reader')} · ${keys.length}` : t('全文精读','Reader');
  }

  function restoreReaderTabs() {
    let saved = {};
    try { saved = JSON.parse(readerStored('tabs') || '{}'); } catch { saved = {}; }
    safeArray(saved.tabs).forEach(item => {
      const key = text(item?.key);
      const doc = readerDocFor(key);
      if (!key || !doc?.hasPDF || readerState.openTabs.has(key)) return;
      const tab = readerTabRecord(key);
      tab.page = Math.max(1, Number(item.page) || Number(readerStored(`page:${key}`)) || 1);
      tab.zoomScale = Number(item.zoomScale) > 0 ? Math.max(0.6, Math.min(2.5, Number(item.zoomScale))) : null;
    });
    const keys = [...readerState.openTabs.keys()];
    readerState.preferredKey = keys.includes(saved.active) ? saved.active : keys[0] || null;
    renderReaderTabs();
  }

  function cancelReaderWork() {
    stopFullReadPoll();
    readerState.loadGeneration += 1;
    readerState.renderGeneration += 1;
    if (readerState.pageObserver) readerState.pageObserver.disconnect();
    readerState.pageObserver = null;
    readerState.renderTasks.forEach(task => { try { task.cancel(); } catch { /* Render already finished. */ } });
    readerState.renderTasks.clear();
    readerState.renderJobs.clear();
    readerState.navigationGeneration += 1;
    readerState.zoomTask = null;
    const task = readerState.loadingTask;
    readerState.loadingTask = null;
    if (task) task.destroy().catch(() => {});
    const pdf = readerState.pdfDoc;
    readerState.pdfDoc = null;
    if (pdf) pdf.destroy().catch(() => {});
    readerState.renderedPages.clear();
    readerState.totalPages = 0;
  }

  async function closeReaderTab(key = readerState.docKey) {
    if (!key || !readerState.openTabs.has(key)) return;
    const wasActive = readerState.docKey === key;
    const keys = [...readerState.openTabs.keys()];
    const index = keys.indexOf(key);
    readerState.openTabs.delete(key);
    if (!wasActive) {
      if (readerState.preferredKey === key) readerState.preferredKey = readerState.docKey || readerState.openTabs.keys().next().value || null;
      renderReaderTabs();
      persistReaderTabs();
      return;
    }
    cancelReaderWork();
    readerState.docKey = null;
    readerState.doc = null;
    readerState.selection = null;
    readerState.evidence = new Map();
    readerState.excerpts = [];
    readerState.currentPage = 1;
    el('reader-pages-container').innerHTML = '';
    const remaining = [...readerState.openTabs.keys()];
    if (remaining.length) {
      const next = remaining[Math.min(index, remaining.length - 1)];
      readerState.preferredKey = next;
      await openReader(next);
    } else {
      readerState.preferredKey = null;
      renderReaderTabs();
      persistReaderTabs();
      setView('library');
    }
  }

  async function activateReaderTab(key) {
    if (!readerState.openTabs.has(key)) return;
    if (readerState.docKey === key) {
      setView('reader');
      return;
    }
    await openReader(key);
  }

  function renderReaderCard(doc) {
    const pending = summaryPending(doc);
    const status = el('reader-card-status');
    if (status) status.textContent = pending
      ? t('尚未生成。点击生成研究问题、方法、发现与阅读重点。', 'Not generated yet. Generate the question, method, findings and reading focus.')
      : t('速读已生成。', 'Quick-read card ready.');
    const button = el('reader-card-generate');
    if (button) button.textContent = pending ? t('生成速读', 'Generate quick read') : t('重新生成', 'Regenerate');
    el('reader-structured-card').innerHTML = pending
      ? ''
      : `${readingDecisionMarkup(doc.readingDecision)}<dl>
        ${doc.authors ? `<dt>${esc(t('作者','Authors'))}</dt><dd>${esc(doc.authors)}</dd>` : ''}
        ${doc.question ? `<dt>${esc(t('研究问题','Question'))}</dt><dd>${esc(doc.question)}</dd>` : ''}
        ${doc.method ? `<dt>${esc(t('方法方案','Method'))}</dt><dd>${esc(doc.method)}</dd>` : ''}
        ${doc.studyModel ? `<dt>${esc(t('研究模型','Model'))}</dt><dd>${esc(doc.studyModel)}</dd>` : ''}
        ${list(doc.findings).length ? `<dt>${esc(t('核心发现','Findings'))}</dt><dd>${list(doc.findings).map(f => `<div>• ${esc(f)}</div>`).join('')}</dd>` : ''}
        ${doc.useCase ? `<dt>${esc(t('使用场景','Use case'))}</dt><dd>${esc(doc.useCase)}</dd>` : ''}
        ${doc.limitations ? `<dt>${esc(t('已知局限','Limits'))}</dt><dd>${esc(doc.limitations)}</dd>` : ''}
      </dl>`;
  }

  async function openReader(key) {
    const docs = safeArray(state.snapshot?.documents);
    const doc = docs.find(d => d.key === key);
    if (!doc) {
      toast(t('未找到该文献记录。', 'Document record not found.'));
      return;
    }
    if (!doc.hasPDF) {
      toast(t('该文献未检测到本地 PDF 全文文件。', 'No local PDF full text detected for this document.'));
      return;
    }
    if (readerState.docKey === key) {
      readerState.preferredKey = key;
      setView('reader');
      return;
    }
    try{await flushReadingSessionDraft();}catch(err){toast(err.message);return;}
    syncReaderTabState();
    cancelReaderWork();
    const generation = readerState.loadGeneration;
    const tab = readerTabRecord(key);
    readerState.docKey = key;
    readerState.preferredKey = key;
    readerState.doc = doc;
    readerState.figure = null;
    figureVersion = '';
    figureItems = [];
    readerState.figureSelecting = false;
    el('reader-viewport').classList.remove('selecting-figure');
    el('figure-select').setAttribute('aria-pressed', 'false');
    el('figure-current').hidden = true;
    el('figure-list').innerHTML = '';
    readerState.currentPage = Math.max(1, Number(tab.page) || Number(readerStored(`page:${key}`)) || 1);
    readerState.zoomScale = Number(tab.zoomScale) > 0 ? Number(tab.zoomScale) : 1.25;
    readerState.selection = null;
    readerState.evidence = tab.evidence instanceof Map ? tab.evidence : new Map();
    readerState.excerpts = safeArray(tab.excerpts);
    readerState.dossier = null;

    renderReaderTabs();
    persistReaderTabs();
    setView('reader');

    el('reader-doc-title').textContent = doc.zhTitle || doc.title || '文献全文';
    el('reader-doc-meta').textContent = [doc.year, doc.studyType, doc.authors].filter(Boolean).join(' · ');
    const zoteroLink = el('reader-zotero-link');
    if (zoteroLink) {
      if (doc.zoteroLinked !== false && doc.key && /^[A-Za-z0-9]+$/.test(doc.key)) {
        zoteroLink.hidden = false;
        zoteroLink.href = `zotero://select/library/items/${encodeURIComponent(doc.key)}`;
      } else {
        zoteroLink.hidden = true;
      }
    }

    renderReaderCard(doc);

    el('reader-status-select').value = doc.readingStatus || 'unread';
    el('reader-notes-textarea').value = doc.readingNote || '';
    el('reader-project').value = readerStored(`project:${key}`) || 'default';
    readerState.sessionId = readerStored(`session:${readingProject()}:${key}`) || 'default';
    renderReaderExcerpts();
    el('reader-ask-btn').disabled = readerState.askingKeys.has(key);

    el('qa-selection-box').classList.remove('has-selection');
    el('qa-selection-text').textContent = t('先在原文中拖选文字。','Drag to select text in the PDF first.');
    renderReaderSelectionHighlights([]);
    clearReaderTranslation();
    el('reader-qa-history').innerHTML = '';
    el('dossier-content').innerHTML = '';
    stopFullReadPoll();
    readerState.fullReading = null;
    el('full-read-content').innerHTML = '';
    el('full-read-page-count').textContent = '';
    el('full-read-status').textContent = t('正在检查完整深读…','Checking the complete reading…');
    el('dossier-status').textContent = t('正在检查深读档案…', 'Checking the dossier…');
    refreshReadingMemory().catch(err => { if (generation === readerState.loadGeneration) toast(err.message); });
    refreshReadingSession().catch(err => { if (generation === readerState.loadGeneration) toast(err.message); });
    refreshFigures().catch(err => { if (generation === readerState.loadGeneration) toast(err.message); });
    refreshDossier().catch(err => { if (generation === readerState.loadGeneration) toast(err.message); });
    refreshFullRead().catch(err => { if (generation === readerState.loadGeneration) el('full-read-status').textContent = err.message; });
    refreshDeepRead().catch(err => { if (generation === readerState.loadGeneration) el('deep-status').textContent = err.message; });

    const container = el('reader-pages-container');
    container.innerHTML = '';
    const loadingEl = el('reader-loading');
    loadingEl.hidden = false;
    loadingEl.textContent = t('正在加载 PDF 全文…', 'Loading PDF full text…');

    try {
      if (!readerState.pdfjsLib) {
        readerState.pdfjsLib = await import('./vendor/pdfjs/pdf.min.mjs');
        readerState.pdfjsLib.GlobalWorkerOptions.workerSrc = './vendor/pdfjs/pdf.worker.min.mjs';
      }
      if (generation !== readerState.loadGeneration) return;
      const pdfUrl = `/api/document/${encodeURIComponent(key)}/pdf`;
      const loadingTask = readerState.pdfjsLib.getDocument({
        url: pdfUrl,
        cMapUrl: './vendor/pdfjs/cmaps/',
        cMapPacked: true,
      });
      readerState.loadingTask = loadingTask;
      const pdfDoc = await loadingTask.promise;
      if (generation !== readerState.loadGeneration) {
        pdfDoc.destroy().catch(() => {});
        return;
      }
      readerState.loadingTask = null;
      readerState.pdfDoc = pdfDoc;
      readerState.totalPages = pdfDoc.numPages;
      el('reader-total-pages').textContent = readerState.totalPages;
      el('full-read-page-count').textContent = t(`共 ${readerState.totalPages} 页`, `${readerState.totalPages} pages`);
      el('reader-page-num').max = readerState.totalPages;
      loadingEl.hidden = true;

      const firstPage = await pdfDoc.getPage(1);
      if (generation !== readerState.loadGeneration || pdfDoc !== readerState.pdfDoc) return;
      const unscaled = firstPage.getViewport({ scale: 1 });
      if (window.innerWidth <= 900 && !(Number(tab.zoomScale) > 0)) {
        const available = Math.max(180, el('reader-viewport').clientWidth - 32);
        readerState.zoomScale = Math.max(0.6, Math.min(2.5, available / unscaled.width));
      }
      el('reader-zoom-level').textContent = `${Math.round(readerState.zoomScale * 100)}%`;
      const placeholder = firstPage.getViewport({ scale: readerState.zoomScale });
      for (let i = 1; i <= readerState.totalPages; i++) {
        const pageDiv = document.createElement('div');
        pageDiv.className = 'pdf-page';
        pageDiv.id = `reader-page-${i}`;
        pageDiv.dataset.pageNumber = i;
        pageDiv.style.width = `${placeholder.width}px`;
        pageDiv.style.height = `${placeholder.height}px`;
        pageDiv.setAttribute('aria-label', `${t('第','Page ')}${i}${t('页','')}`);
        container.appendChild(pageDiv);
      }

      setupIntersectionObserver();
      const requestedPage = Math.max(1, Math.min(readerState.totalPages, readerState.currentPage || 1));
      readerState.currentPage = requestedPage;
      el('reader-page-num').value = requestedPage;
      syncReaderTabState();
      await renderReaderPage(requestedPage);
      if (requestedPage > 1) el(`reader-page-${requestedPage}`)?.scrollIntoView({ block: 'start' });
    } catch (err) {
      if (generation !== readerState.loadGeneration || err?.name === 'AbortException') return;
      loadingEl.hidden = false;
      loadingEl.textContent = t('加载 PDF 失败：', 'Failed to load PDF: ') + err.message;
    }
  }

  function updateVisibleReaderPage() {
    const viewport = el('reader-viewport').getBoundingClientRect();
    if (!readerState.pdfDoc || viewport.height <= 0) return;
    let visiblePage = 0, visibleHeight = 0;
    el('reader-pages-container').querySelectorAll('.pdf-page').forEach(pageEl => {
      const rect = pageEl.getBoundingClientRect();
      const height = Math.max(0, Math.min(rect.bottom, viewport.bottom) - Math.max(rect.top, viewport.top));
      if (height > visibleHeight) {
        visibleHeight = height;
        visiblePage = Number(pageEl.dataset.pageNumber);
      }
    });
    if (!visiblePage) return;
    if (readerState.currentPage !== visiblePage) {
      readerState.currentPage = visiblePage;
      el('reader-page-num').value = visiblePage;
      storeReaderValue(`page:${readerState.docKey}`, visiblePage);
      syncReaderTabState();
    }
    renderReaderPage(visiblePage);
    releaseDistantPages(visiblePage);
  }

  function setupIntersectionObserver() {
    if (readerState.pageObserver) readerState.pageObserver.disconnect();
    const generation = readerState.loadGeneration;
    readerState.pageObserver = new IntersectionObserver(() => {
      if (generation !== readerState.loadGeneration) return;
      updateVisibleReaderPage();
    }, {
      root: el('reader-viewport'),
      rootMargin: '400px 0px',
      threshold: 0.05,
    });
    el('reader-pages-container').querySelectorAll('.pdf-page').forEach(pageEl => {
      readerState.pageObserver.observe(pageEl);
    });
  }

  function releaseDistantPages(currentPage) {
    for (const pageNum of [...readerState.renderedPages]) {
      if (Math.abs(pageNum - currentPage) <= 6) continue;
      const task = readerState.renderTasks.get(pageNum);
      if (task) { try { task.cancel(); } catch {} readerState.renderTasks.delete(pageNum); }
      readerState.renderJobs.delete(pageNum);
      const pageDiv = el(`reader-page-${pageNum}`);
      if (pageDiv) {
        pageDiv.innerHTML = '';
        pageDiv.classList.remove('is-loading');
        pageDiv.removeAttribute('aria-busy');
      }
      readerState.renderedPages.delete(pageNum);
    }
  }

  function renderReaderPage(pageNum) {
    const pageDiv = el(`reader-page-${pageNum}`);
    if (!pageDiv || !readerState.pdfDoc) return Promise.resolve(false);
    const existing = readerState.renderJobs.get(pageNum);
    if (existing) return existing.promise;
    if (readerState.renderedPages.has(pageNum)) return Promise.resolve(true);
    readerState.renderedPages.add(pageNum);
    const generation = readerState.renderGeneration;
    const pdfDoc = readerState.pdfDoc;
    const job = {};
    const active = () => generation === readerState.renderGeneration && pdfDoc === readerState.pdfDoc && readerState.renderJobs.get(pageNum) === job;
    job.promise = Promise.resolve().then(async () => {

    try {
      if (!active()) return false;
      pageDiv.querySelector('.render-error')?.remove();
      pageDiv.classList.add('is-loading');
      pageDiv.setAttribute('aria-busy', 'true');
      const page = await pdfDoc.getPage(pageNum);
      if (!active()) return false;
      const viewport = page.getViewport({ scale: readerState.zoomScale });
      pageDiv.style.width = `${viewport.width}px`;
      pageDiv.style.height = `${viewport.height}px`;

      let canvas = pageDiv.querySelector('canvas');
      if (!canvas) {
        canvas = document.createElement('canvas');
        pageDiv.appendChild(canvas);
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      const previousTask = readerState.renderTasks.get(pageNum);
      if (previousTask) { try { previousTask.cancel(); } catch {} }
      const renderTask = page.render({ canvasContext: ctx, viewport });
      readerState.renderTasks.set(pageNum, renderTask);
      await renderTask.promise;
      if (!active()) return false;
      if (readerState.renderTasks.get(pageNum) === renderTask) readerState.renderTasks.delete(pageNum);

      let textLayerDiv = pageDiv.querySelector('.textLayer');
      if (!textLayerDiv) {
        textLayerDiv = document.createElement('div');
        textLayerDiv.className = 'textLayer';
        pageDiv.appendChild(textLayerDiv);
      }
      textLayerDiv.innerHTML = '';
      textLayerDiv.style.width = `${viewport.width}px`;
      textLayerDiv.style.height = `${viewport.height}px`;

      const textContent = await page.getTextContent();
      if (!active()) return false;
      if (readerState.pdfjsLib.TextLayer) {
        const textLayer = new readerState.pdfjsLib.TextLayer({
          textContentSource: textContent,
          container: textLayerDiv,
          viewport,
        });
        await textLayer.render();
      }
      return active();
    } catch (e) {
      if (!active()) return false;
      if (e?.name === 'RenderingCancelledException') {
        readerState.renderedPages.delete(pageNum);
        readerState.renderTasks.delete(pageNum);
        return false;
      }
      console.warn('Page render error:', pageNum, e);
      readerState.renderedPages.delete(pageNum);
      readerState.renderTasks.delete(pageNum);
      pageDiv.innerHTML = `<div class="render-error" role="status">
        <span>${esc(t('本页加载失败','This page failed to render'))}</span>
        <button class="btn" data-retry-page="${pageNum}">${esc(t('重试','Retry'))}</button>
      </div>`;
      return false;
    } finally {
      if (active()) {
        pageDiv.classList.remove('is-loading');
        pageDiv.removeAttribute('aria-busy');
        readerState.renderJobs.delete(pageNum);
      }
    }
    });
    readerState.renderJobs.set(pageNum, job);
    return job.promise;
  }

  function setReaderZoom(newScale) {
    const task = applyReaderZoom(newScale);
    readerState.zoomTask = task;
    const clear = () => { if (readerState.zoomTask === task) readerState.zoomTask = null; };
    task.then(clear, clear);
    return task;
  }

  async function applyReaderZoom(newScale) {
    readerState.zoomScale = Math.max(0.6, Math.min(2.5, newScale));
    syncReaderTabState();
    el('reader-zoom-level').textContent = `${Math.round(readerState.zoomScale * 100)}%`;
    readerState.renderGeneration += 1;
    readerState.renderTasks.forEach(task => { try { task.cancel(); } catch {} });
    readerState.renderTasks.clear();
    readerState.renderJobs.clear();
    readerState.navigationGeneration += 1;
    readerState.renderedPages.clear();
    const container = el('reader-pages-container');
    if (!container || !readerState.pdfDoc) return;
    const generation = readerState.renderGeneration;
    const pdfDoc = readerState.pdfDoc;
    try {
      const firstPage = await pdfDoc.getPage(1);
      if (generation !== readerState.renderGeneration || pdfDoc !== readerState.pdfDoc) return;
      const placeholder = firstPage.getViewport({ scale: readerState.zoomScale });
      for (let i = 1; i <= readerState.totalPages; i++) {
        const pageDiv = el(`reader-page-${i}`);
        if (!pageDiv) continue;
        pageDiv.innerHTML = '';
        pageDiv.classList.remove('is-loading');
        pageDiv.removeAttribute('aria-busy');
        pageDiv.style.width = `${placeholder.width}px`;
        pageDiv.style.height = `${placeholder.height}px`;
      }
      setupIntersectionObserver();
      await renderReaderPage(readerState.currentPage);
    } catch (err) {
      if (generation === readerState.renderGeneration) toast(err.message);
    }
  }

  async function fitReaderWidth() {
    const vp = el('reader-viewport');
    if (!vp || !readerState.pdfDoc) return;
    const w = vp.clientWidth - 48;
    if (w <= 100) return;
    const pdfDoc = readerState.pdfDoc;
    try {
      const page = await pdfDoc.getPage(1);
      if (pdfDoc !== readerState.pdfDoc) return;
      const unscaled = page.getViewport({ scale: 1.0 });
      await setReaderZoom(w / unscaled.width);
    } catch (err) { toast(err.message); }
  }

  function jumpToReaderPage(pageNum) {
    readerState.navigationGeneration += 1;
    pageNum = Math.max(1, Math.min(readerState.totalPages || 1, Number(pageNum) || 1));
    readerState.currentPage = pageNum;
    el('reader-page-num').value = pageNum;
    storeReaderValue(`page:${readerState.docKey}`, pageNum);
    syncReaderTabState();
    const target = el(`reader-page-${pageNum}`);
    if (target) {
      const rendering = renderReaderPage(pageNum);
      releaseDistantPages(pageNum);
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      target.classList.remove('pulse');
      void target.offsetWidth;
      target.classList.add('pulse');
      setTimeout(() => target.classList.remove('pulse'), 1800);
      return rendering;
    }
    return Promise.resolve(false);
  }

  async function showLocatedSource(located) {
    const key = readerState.docKey, generation = readerState.loadGeneration, beforeZoom = readerState.navigationGeneration;
    const page = Number(located.page);
    if (!readerState.pdfDoc || page < 1 || page > readerState.totalPages) throw new Error(t('PDF 页面尚未加载。','PDF page is not available.'));
    if (readerState.zoomTask) await readerState.zoomTask;
    if (readerState.docKey !== key || readerState.loadGeneration !== generation || readerState.navigationGeneration !== beforeZoom) return;
    const renderGeneration = readerState.renderGeneration;
    const rendering = jumpToReaderPage(page), navigation = readerState.navigationGeneration;
    const rendered = await rendering;
    if (rendered && readerState.docKey === key && readerState.loadGeneration === generation && readerState.renderGeneration === renderGeneration && readerState.navigationGeneration === navigation) showEvidenceRects(page, located.rects);
  }

  async function previewFigure(pageNum, rect) {
    const pdf = readerState.pdfDoc, key = readerState.docKey;
    const page = await pdf.getPage(pageNum);
    const view = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round((rect[2] - rect[0]) * view.width));
    canvas.height = Math.max(1, Math.round((rect[3] - rect[1]) * view.height));
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: view,
      transform: [1, 0, 0, 1, -rect[0] * view.width, -rect[1] * view.height] }).promise;
    if (key !== readerState.docKey || pdf !== readerState.pdfDoc) return;
    readerState.figure = { page: pageNum, rect, version: figureVersion };
    el('figure-preview').src = canvas.toDataURL('image/png');
    el('figure-current').hidden = false;
    el('figure-context').innerHTML = '';
    el('figure-note').value = '';
    el('figure-status').textContent = `${t('已选中第','Selected page ')} ${pageNum} ${t('页','')}`;
  }

  let figureVersion = '', figureItems = [];
  async function refreshFigures() {
    const key = readerState.docKey, project = readingProject(), generation = readerState.loadGeneration;
    const response = await fetch(`/api/figures?${new URLSearchParams({paper_id:key, project})}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '无法读取图像笔记。');
    if (key !== readerState.docKey || project !== readingProject() || generation !== readerState.loadGeneration) return;
    figureVersion = data.pdf_version;
    figureItems = safeArray(data.figures);
    el('figure-list').innerHTML = figureItems.map(item => `<article>
      <strong>${esc(item.figure_number)}</strong> · ${esc(t('第','Page'))} ${Number(item.page)} ${item.stale ? esc(t('· PDF 已改变，选区已过期','· PDF changed; selection is stale')) : ''}
      <p>${esc(item.note)}</p><button class="text-button" data-open-figure="${esc(item.id)}" ${item.stale ? 'disabled' : ''}>${esc(t('查看','Open'))}</button>
      <button class="text-button" data-delete-figure="${esc(item.id)}">${esc(t('删除','Delete'))}</button></article>`).join('');
    if (deepReading && figureVersion === deepReading.version) renderDeepRead();
  }

  function renderFigureContext(item) {
    const caption = item.caption ? `<p>${esc(t('图注候选','Caption candidate'))}</p><blockquote>${esc(item.caption)}</blockquote>` : `<p>${esc(t('未找到图注候选。','No caption candidate found.'))}</p>`;
    el('figure-context').innerHTML = caption + safeArray(item.mentions).map(m => `<article><button class="text-button" data-figure-page="${Number(m.page)}">${esc(t('第','Page'))} ${Number(m.page)}</button><blockquote>${esc(m.text)}</blockquote></article>`).join('');
  }

  function figurePayload() {
    if (!readerState.figure || !readerState.figure.version) throw new Error(t('请等待文献加载完成后选择图像。','Wait for the document to load, then select a figure.'));
    const [x0,y0,x1,y1] = readerState.figure.rect;
    return {paper_id:readerState.docKey,project:readingProject(),pdf_version:readerState.figure.version,page:readerState.figure.page,
      rect:{x0,y0,x1,y1},figure_number:el('figure-number').value.trim(),note:el('figure-note').value.trim()};
  }

  let figureDrag = null;
  const figurePages = el('reader-pages-container');
  figurePages.addEventListener('pointerdown', event => {
    if (!readerState.figureSelecting || event.button !== 0) return;
    const page = event.target.closest('.pdf-page');
    if (!page || !page.querySelector('canvas')) return;
    event.preventDefault();
    const bounds = page.getBoundingClientRect();
    const point = e => [Math.max(0, Math.min(1, (e.clientX - bounds.left) / bounds.width)), Math.max(0, Math.min(1, (e.clientY - bounds.top) / bounds.height))];
    const start = point(event), box = document.createElement('div');
    box.className = 'figure-selection';
    page.appendChild(box);
    figureDrag = { page, start, point, box, pointerId: event.pointerId };
    page.setPointerCapture(event.pointerId);
  });
  figurePages.addEventListener('pointermove', event => {
    if (!figureDrag || event.pointerId !== figureDrag.pointerId) return;
    const end = figureDrag.point(event), start = figureDrag.start, box = figureDrag.box;
    box.style.left = `${Math.min(start[0], end[0]) * 100}%`;
    box.style.top = `${Math.min(start[1], end[1]) * 100}%`;
    box.style.width = `${Math.abs(end[0] - start[0]) * 100}%`;
    box.style.height = `${Math.abs(end[1] - start[1]) * 100}%`;
  });
  function finishFigureDrag(event, canceled = false) {
    if (!figureDrag || event.pointerId !== figureDrag.pointerId) return;
    const { page, start, point, box } = figureDrag, end = point(event);
    figureDrag = null;
    box.remove();
    if (canceled || Math.abs(end[0] - start[0]) < 0.01 || Math.abs(end[1] - start[1]) < 0.01) return;
    readerState.figureSelecting = false;
    el('reader-viewport').classList.remove('selecting-figure');
    el('figure-select').setAttribute('aria-pressed', 'false');
    previewFigure(Number(page.dataset.pageNumber), [Math.min(start[0], end[0]), Math.min(start[1], end[1]), Math.max(start[0], end[0]), Math.max(start[1], end[1])]).catch(err => toast(err.message));
  }
  figurePages.addEventListener('pointerup', event => finishFigureDrag(event));
  figurePages.addEventListener('pointercancel', event => finishFigureDrag(event, true));

  let readerTextDrag = null;
  let readerSelectionFrame = 0;
  function scheduleReaderSelectionCapture() {
    cancelAnimationFrame(readerSelectionFrame);
    readerSelectionFrame = requestAnimationFrame(captureReaderSelection);
  }

  function readerCaretAtPoint(x, y) {
    let node = null, offset = 0;
    if (document.caretPositionFromPoint) {
      const position = document.caretPositionFromPoint(x, y);
      if (position) { node = position.offsetNode; offset = position.offset; }
    } else if (document.caretRangeFromPoint) {
      const range = document.caretRangeFromPoint(x, y);
      if (range) { node = range.startContainer; offset = range.startOffset; }
    }
    const element = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    const layer = element?.closest?.('#reader-pages-container .textLayer');
    const page = layer?.closest('.pdf-page');
    if (!layer || !page || element.closest('.endOfContent')) return null;
    return { node, offset, page: Number(page.dataset.pageNumber) || 1 };
  }

  function readerEndpointBefore(a, b) {
    if (a.node === b.node) return a.offset <= b.offset;
    return Boolean(a.node.compareDocumentPosition(b.node) & Node.DOCUMENT_POSITION_FOLLOWING);
  }

  function updateReaderTextSelection(endpoint) {
    if (!readerTextDrag?.anchor || !endpoint) return;
    const range = document.createRange();
    try {
      const [start, end] = readerEndpointBefore(readerTextDrag.anchor, endpoint)
        ? [readerTextDrag.anchor, endpoint] : [endpoint, readerTextDrag.anchor];
      range.setStart(start.node, start.offset);
      range.setEnd(end.node, end.offset);
    } catch {
      return;
    }
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    scheduleReaderSelectionCapture();
  }

  figurePages.addEventListener('pointerdown', event => {
    if (readerState.figureSelecting || event.button !== 0 || event.target.closest('button, input, textarea, select, a')) return;
    const anchor = readerCaretAtPoint(event.clientX, event.clientY);
    if (!anchor) return;
    event.preventDefault();
    clearReaderSelection();
    readerTextDrag = {
      anchor,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  });
  figurePages.addEventListener('pointermove', event => {
    if (!readerTextDrag || event.pointerId !== readerTextDrag.pointerId) return;
    if (!readerTextDrag.active && Math.hypot(event.clientX - readerTextDrag.startX, event.clientY - readerTextDrag.startY) < 4) return;
    readerTextDrag.active = true;
    event.preventDefault();
    updateReaderTextSelection(readerCaretAtPoint(event.clientX, event.clientY));
  });
  function finishReaderTextSelection(event, canceled = false) {
    if (!readerTextDrag || event.pointerId !== readerTextDrag.pointerId) return;
    const active = readerTextDrag.active;
    readerTextDrag = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    cancelAnimationFrame(readerSelectionFrame);
    if (active && !canceled) captureReaderSelection();
  }
  figurePages.addEventListener('pointerup', event => finishReaderTextSelection(event));
  figurePages.addEventListener('pointercancel', event => finishReaderTextSelection(event, true));

  function formatReaderAnswer(rawText, citations = []) {
    const byId = new Map();
    const byPage = new Map();
    safeArray(citations).forEach(citation => {
      if (/^E\d+$/i.test(String(citation.id || ''))) byId.set(String(citation.id).toUpperCase(), citation);
      if (Number(citation.page) > 0 && !byPage.has(Number(citation.page))) byPage.set(Number(citation.page), citation);
    });
    const evidenceButton = (match, identifier) => {
      const citation = byId.get(identifier.toUpperCase());
      const page = Number(citation?.page) || 0;
      const state = citation?.state || 'unsupported';
      const label = state === 'unsupported'
        ? t('未定位到原文','Not located in source')
        : state === 'page_only' ? t('仅定位到页码','Page located only') : t('定位到原文','Located in source');
      return `<button class="evidence-cite ${esc(state)}" data-evidence="${esc(identifier.toUpperCase())}" data-page="${page || ''}" title="${esc(label)}" ${state === 'unsupported' ? 'disabled' : ''}>[${esc(identifier.toUpperCase())}]</button>`;
    };
    const pageButton = (match, page) => {
      const number = Number(page);
      const citation = byPage.get(number);
      const state = citation?.state || 'unsupported';
      return `<button class="page-cite ${esc(state)}" data-page="${number}" title="${esc(state === 'unsupported' ? t('原文中未找到该页','Page not found in indexed text') : t('跳转到该页','Jump to page'))}" ${state === 'unsupported' ? 'disabled' : ''}>[Page ${number}]</button>`;
    };
    return esc(rawText)
      .replace(/\[(E\d+)\]/gi, evidenceButton)
      .replace(/\[(?:Page|P\.)\s*(\d+)\]/gi, pageButton)
      .replace(/\(第\s*(\d+)\s*页\)/gi, (match, page) => {
        const number = Number(page);
        const citation = byPage.get(number);
        const state = citation?.state || 'unsupported';
        return `<button class="page-cite ${esc(state)}" data-page="${number}" ${state === 'unsupported' ? 'disabled' : ''}>[第 ${number} 页]</button>`;
      })
      .replace(/\n/g, '<br>');
  }

  function clearReaderSelection() {
    readerState.selection = null;
    const box = el('qa-selection-box');
    if (box) box.classList.remove('has-selection');
    const textEl = el('qa-selection-text');
    if (textEl) textEl.textContent = t('先在原文中拖选文字。','Drag to select text in the PDF first.');
    renderReaderSelectionHighlights([]);
    clearReaderTranslation();
    window.getSelection()?.removeAllRanges();
  }

  function readerSelectionPages(selection) {
    return [...new Set(safeArray(selection?.segments).map(segment => Number(segment.page)).filter(Boolean))];
  }

  function renderReaderSelectionHighlights(segments) {
    document.querySelectorAll('#reader-pages-container .reader-selection-highlight').forEach(node => node.remove());
    for (const segment of safeArray(segments)) {
      const page = document.querySelector(`#reader-pages-container .pdf-page[data-page-number="${Number(segment.page) || 1}"]`);
      if (!page) continue;
      const overlay = document.createElement('div');
      overlay.className = 'reader-selection-highlight';
      for (const rect of safeArray(segment.rects)) {
        const span = document.createElement('span');
        span.style.left = `${rect.x * 100}%`;
        span.style.top = `${rect.y * 100}%`;
        span.style.width = `${rect.width * 100}%`;
        span.style.height = `${rect.height * 100}%`;
        overlay.append(span);
      }
      page.append(overlay);
    }
  }

  function captureReaderSelection() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return;
    const source = selection.getRangeAt(0);
    const segments = [];
    for (const textLayer of document.querySelectorAll('#reader-pages-container .textLayer')) {
      const pageEl = textLayer.closest('.pdf-page');
      if (!pageEl) continue;
      let pageRange;
      try {
        if (!source.intersectsNode(textLayer)) continue;
        pageRange = document.createRange();
        pageRange.selectNodeContents(textLayer);
        if (textLayer.contains(source.startContainer)) {
          pageRange.setStart(source.startContainer, source.startOffset);
        }
        if (textLayer.contains(source.endContainer)) {
          pageRange.setEnd(source.endContainer, source.endOffset);
        }
      } catch {
        continue;
      }
      const text = pageRange.toString().replace(/\s+/g, ' ').trim();
      if (text.length < 3) continue;
      const box = pageEl.getBoundingClientRect();
      if (!box.width || !box.height) continue;
      const rects = [...pageRange.getClientRects()].map(rect => {
        const left = Math.max(box.left, rect.left), right = Math.min(box.right, rect.right);
        const top = Math.max(box.top, rect.top), bottom = Math.min(box.bottom, rect.bottom);
        return {
          x: (left - box.left) / box.width,
          y: (top - box.top) / box.height,
          width: (right - left) / box.width,
          height: (bottom - top) / box.height,
        };
      }).filter(rect => rect.width > 0 && rect.height > 0)
        .map(rect => Object.fromEntries(Object.entries(rect).map(([key, value]) => [key, Math.max(0, Math.min(1, value))])))
        .filter((rect, index, all) => all.findIndex(other =>
          Math.abs(other.x - rect.x) < 0.001 && Math.abs(other.y - rect.y) < 0.001 &&
          Math.abs(other.width - rect.width) < 0.001 && Math.abs(other.height - rect.height) < 0.001) === index)
        .slice(0, 40);
      if (rects.length) segments.push({ page: Number(pageEl.dataset.pageNumber) || 1, text, rects });
    }
    if (!segments.length) return;
    segments.sort((a, b) => a.page - b.page);
    if (readerTextDrag) {
      renderReaderSelectionHighlights(segments);
      return;
    }
    readerState.selection = { segments };
    if(readerState.sessionId!=='default')scheduleReadingSessionDraft();
    const pages = readerSelectionPages(readerState.selection);
    const combined = segments.map(segment => segment.text).join(' ');
    const box = el('qa-selection-box');
    const textEl = el('qa-selection-text');
    if (box && textEl) {
      box.classList.add('has-selection');
      textEl.textContent = `${t('第','Page ')} ${pages.join(', ')} ${t('页','')} · ${combined.length} ${t('字','chars')} · ${segments.length} ${t('段','segments')}\n"${combined.slice(0, 240)}${combined.length > 240 ? '…' : ''}"`;
    }
    renderReaderSelectionHighlights(segments);
    clearReaderTranslation();
    checkReaderTranslationAvailability(readerState.selection, readerState.docKey);
  }

  function renderReaderExcerpts() {
    const container = el('reader-excerpts');
    if (!container) return;
    const excerpts = safeArray(readerState.excerpts);
    const count = el('reader-excerpt-count');
    if (count) count.textContent = excerpts.length ? String(excerpts.length) : '';
    container.innerHTML = excerpts.length ? excerpts.map(excerpt => `
      <article class="excerpt-item">
        <div class="excerpt-item-head">
          <button class="page-cite" data-page="${Number(excerpt.page) || 1}">[Page ${Number(excerpt.page) || 1}]</button>
          <button class="text-button danger" data-delete-excerpt="${excerpt.id}">${esc(t('删除','Delete'))}</button>
        </div>
        <blockquote>${esc(excerpt.quote)}</blockquote>
      </article>`).join('') : `<p class="muted">${esc(t('在 PDF 中选择原文后保存摘录。','Select source text in the PDF to save an excerpt.'))}</p>`;
  }

  async function saveReaderSelection() {
    const selection = readerState.selection;
    const key = readerState.docKey, project = readingProject();
    if (!selection || !key) return;
    const button = el('qa-save-excerpt');
    if (button) button.disabled = true;
    try {
      for (const segment of safeArray(selection.segments)) {
        await post('/api/reading-memory', {
          action: 'save-excerpt', project, paper: key, page: segment.page,
          quote: segment.text, rects: segment.rects,
        });
      }
      await refreshReadingMemory();
      toast(t('摘录已保存。','Excerpt saved.'));
    } finally {
      if (button) button.disabled = false;
    }
  }

  function showEvidenceRects(page, rects) {
    const pageEl = document.querySelector(`#reader-pages-container .pdf-page[data-page-number="${Number(page) || 1}"]`);
    if (!pageEl || !safeArray(rects).length) return;
    pageEl.querySelector('.evidence-highlight')?.remove();
    const layer = document.createElement('div');
    layer.className = 'evidence-highlight';
    safeArray(rects).forEach(rect => {
      const mark = document.createElement('span');
      Object.assign(mark.style, {
        left: `${rect.x * 100}%`, top: `${rect.y * 100}%`,
        width: `${rect.width * 100}%`, height: `${rect.height * 100}%`,
      });
      layer.appendChild(mark);
    });
    pageEl.appendChild(layer);
    setTimeout(() => layer.remove(), 3200);
  }

  function readingProject() { return el('reader-project').value.trim() || 'default'; }

  function dossierRefs(ids, evidence) {
    return safeArray(ids).map(id => formatReaderAnswer(`[${id}]`, evidence)).join(' ');
  }

  function dossierField(value, evidence) {
    return formatReaderAnswer(value, evidence);
  }

  function renderDossier(record) {
    readerState.dossier = record || null;
    const content = el('dossier-content'), status = el('dossier-status');
    if (!record) {
      content.innerHTML = '';
      status.textContent = t('尚未生成。需要时会从当前 PDF 的原文证据中建立阅读路径、论证结构、方法审计和可复用笔记。', 'Not generated yet. Generate a source-grounded reading path, argument structure, methods audit, and reusable notes from the current PDF.');
      return;
    }
    const value = record.value || {}, evidence = safeArray(value.evidence);
    evidence.forEach(item => {
      if (item?.id) readerState.evidence.set(String(item.id).toUpperCase(), item);
    });
    const created = Number(record.created) ? new Date(Number(record.created) * 1000).toLocaleString() : '';
    const warnings = value.referenceWarnings || {};
    const warningText = (Number(warnings.droppedItems) || Number(warnings.downgradedItems))
      ? ` · ${t(`已忽略 ${Number(warnings.droppedItems) || 0} 条无效内容，降级 ${Number(warnings.downgradedItems) || 0} 条无来源论断`,
        `Ignored ${Number(warnings.droppedItems) || 0} invalid items; downgraded ${Number(warnings.downgradedItems) || 0} unsupported claims`)}`
      : '';
    status.textContent = record.stale
      ? t('PDF 内容已改变，档案需要重新生成。', 'The PDF changed; regenerate this dossier.')
      : `${t('已生成','Generated')}${created ? ` · ${created}` : ''}${value.coverage ? ` · ${value.coverage.withEvidence}/${value.coverage.items} ${t('条带原文证据','items with source evidence')}` : ''}${warningText}`;
    const decision = value.readingDecision ? `<div class="dossier-decision">${readingDecisionMarkup(value.readingDecision)}</div>` : '';
    const outline = safeArray(value.outline).map(item => `<article class="dossier-item"><strong>${esc(item.heading)}</strong><p>${dossierField(item.keyPoint, evidence)}</p><small>${esc(item.purpose || '')}${item.pageStart ? ` · ${t('第','Page')} ${item.pageStart}${item.pageEnd && item.pageEnd !== item.pageStart ? `–${item.pageEnd}` : ''} ${t('页','')}` : ''} ${dossierRefs(item.evidenceIds, evidence)}</small></article>`).join('');
    const roleNames = {context:'背景',question:'问题',method:'方法',finding:'发现',mechanism:'机制',limitation:'局限',implication:'启示'};
    const argument = safeArray(value.argument).map(item => `<article class="dossier-item ${item.status === 'inferred' ? 'inferred' : ''}"><strong>${esc(t(roleNames[item.role] || item.role, item.role))}</strong> · ${esc(item.status === 'inferred' ? t('AI 推断','AI inference') : t('作者原述','Author-stated'))}<p>${dossierField(item.statement, evidence)}</p><small>${safeArray(item.pages).length ? `${t('第','Page')} ${safeArray(item.pages).join(', ')} ${t('页','')} · ` : ''}${dossierRefs(item.evidenceIds, evidence)}</small></article>`).join('');
    const methodNames = {reported:'已报告',unclear:'不明确',missing:'未报告'};
    const methods = safeArray(value.methodsAudit).map(item => `<article class="dossier-item ${item.status === 'unclear' || item.status === 'missing' ? 'inferred' : ''}"><strong>${esc(item.aspect)}</strong> · ${esc(t(methodNames[item.status] || item.status, item.status))}<p>${dossierField(item.observation, evidence)}</p><small>${safeArray(item.pages).length ? `${t('第','Page')} ${safeArray(item.pages).join(', ')} ${t('页','')} · ` : ''}${dossierRefs(item.evidenceIds, evidence)}</small></article>`).join('');
    const noteNames = {insight:'洞察',question:'问题',method:'方法',quote:'原文',followup:'后续'};
    const notes = safeArray(value.reusableNotes).map(item => `<article class="dossier-item"><strong>${esc(t(noteNames[item.type] || item.type, item.type))}</strong><p>${dossierField(item.text, evidence)}</p><small>${safeArray(item.pages).length ? `${t('第','Page')} ${safeArray(item.pages).join(', ')} ${t('页','')} · ` : ''}${dossierRefs(item.evidenceIds, evidence)}</small></article>`).join('');
    const section = (title, body) => body ? `<section class="dossier-section"><h3>${esc(title)}</h3>${body}</section>` : '';
    content.innerHTML = `${record.stale ? `<p class="dossier-stale">${esc(t('这份档案绑定旧版 PDF。重新生成后再用于正式阅读。','This dossier is bound to an older PDF. Regenerate it before relying on it.'))}</p>` : ''}${decision}${section(t('阅读路径','Reading path'), outline)}${section(t('论证结构','Argument structure'), argument)}${section(t('方法审计','Methods audit'), methods)}${section(t('可复用笔记','Reusable notes'), notes)}`;
    applyLanguage();
  }

  async function refreshDossier() {
    const key = readerState.docKey;
    if (!key) return;
    const response = await fetch(`/api/dossier?${new URLSearchParams({key})}`);
    const result = await response.json().catch(() => ({}));
    if (key !== readerState.docKey) return;
    if (response.status === 404) {
      renderDossier(null);
      return;
    }
    if (!response.ok) throw new Error(result.error || '无法读取深读档案。');
    renderDossier(result.dossier);
  }

  async function generateDossier() {
    const key = readerState.docKey, focus = el('dossier-focus').value.trim(), button = el('dossier-generate');
    if (!key) return;
    button.disabled = true;
    el('dossier-status').textContent = t('正在从 PDF 定位证据并生成档案；这可能需要一分钟。', 'Locating evidence in the PDF and generating the dossier; this may take a minute.');
    try {
      const result = await post('/api/dossier', {key, focus});
      if (key !== readerState.docKey) return;
      renderDossier({document:key, pdfVersion:result.pdfVersion, language:result.language, created:result.created, stale:false, value:result.value});
      if (state.snapshot?.dossiers) {
        state.snapshot.dossiers[key] = {created:result.created, readingDecision:result.value?.readingDecision?.decision, outline:safeArray(result.value?.outline).length, argument:safeArray(result.value?.argument).length, methodsAudit:safeArray(result.value?.methodsAudit).length, coverage:result.value?.coverage || {}};
      }
      const row = readerDocFor(key);
      if (row) row.hasDossier = true;
      toast(t('深读档案已生成。','Deep-reading dossier generated.'));
    } finally {
      button.disabled = false;
    }
  }

  function stopFullReadPoll() {
    if (readerState.fullReadTimer) clearTimeout(readerState.fullReadTimer);
    readerState.fullReadTimer = null;
  }

  function fullReadStateLabel(item) {
    return {
      author_stated: t('作者原述','Author-stated'),
      reported_result: t('报告结果','Reported result'),
      inferred: t('AI 推断','AI inference'),
      unclear: t('未明确','Unclear'),
    }[item.status] || item.status;
  }

  function renderFullRead(record) {
    readerState.fullReading = record || null;
    const content = el('full-read-content'), status = el('full-read-status'), button = el('full-read-start');
    const resumeButton = el('full-read-resume'), cancelButton = el('full-read-cancel');
    if (!record) {
      content.innerHTML = '';
      status.textContent = t('尚未生成。点击后会自动通读全部页面，并把正文、完整结果和对应图表整理为实验单元。',
        'Not generated. Generate a complete reading with automatic page coverage and consolidated experiment units.');
      button.textContent = t('生成完整深读','Generate complete reading');
      button.disabled = false;
      resumeButton.hidden = true;
      cancelButton.hidden = true;
      return;
    }
    const value = record.value || {}, progress = value.progress || {}, running = record.status === 'running';
    button.disabled = running;
    button.textContent = safeArray(value.items).length ? t('重新生成完整深读','Regenerate complete reading') : t('生成完整深读','Generate complete reading');
    resumeButton.hidden = record.historical || running || !['partial','interrupted','error','cancelled'].includes(record.status);
    resumeButton.disabled = !resumeButton.hidden && !record.runId;
    cancelButton.hidden = !running;
    const failed = Number(value.coverage?.failedPages) || 0;
    status.textContent = `${running ? progress.message || t('正在处理','Working') :
      record.status === 'error' ? t('完整深读失败','Complete reading failed') :
        record.status === 'interrupted' ? (record.historical ? t('上次完整深读中断','The previous run was interrupted') : t('上次完整深读中断，可继续未完成页面','The previous run was interrupted; resume missing pages')) :
        record.status === 'cancelled' ? (record.historical ? t('完整深读已取消','Complete reading cancelled') : t('完整深读已取消，可继续未完成页面','Complete reading cancelled; resume missing pages')) :
        record.status === 'partial' ? t(`完整深读部分完成；${failed} 页失败`, `Complete reading partially finished; ${failed} pages failed`) :
          t('完整深读已完成','Complete reading finished')}`
      + (progress.total ? ` · ${Number(progress.current)||0}/${Number(progress.total)}` : '');
    if (record.historical) status.textContent = t(
      '这是旧版完整深读记录，仅供查看；请重新生成以使用当前版本，旧版页面不能续跑。',
      'This is a historical complete reading for review. Regenerate with the current version; historical pages cannot be resumed.') + ' · ' + status.textContent;
    const coverage = value.coverage || {}, usage = value.usage;
    if (coverage.pageCount != null) status.textContent += ` · ${t('页面覆盖','Pages')}: ${Number(coverage.pages)||0}/${Number(coverage.pageCount)||0} · ${t('失败','failed')}: ${Number(coverage.failedPages)||0}`;
    if (Number(coverage.failedUnitBatches)>0) status.textContent += ` · ${t('单元整理失败批次','Failed unit batches')}: ${Number(coverage.failedUnitBatches)}`;
    if (usage && typeof usage === 'object') {
      const labels = [['requests','请求','requests'],['prompt_tokens','输入 tokens','prompt tokens'],['completion_tokens','输出 tokens','completion tokens'],['missing','用量缺失','usage missing'],['retries','重试','retries'],['elapsedSeconds','耗时（秒）','seconds']];
      const shown = labels.filter(([key]) => usage[key] != null).map(([key, zh, en]) => `${t(zh,en)}: ${Number(usage[key])||0}`);
      if (shown.length) status.textContent += ` · ${t('本次','This run')}: ${shown.join(' · ')}`;
      if (value.priorUsage) status.textContent += ` · ${t('此前累计请求','Previous requests')}: ${Number(value.priorUsage.requests)||0} · ${t('此前累计输入/输出 tokens','Previous input/output tokens')}: ${Number(value.priorUsage.prompt_tokens)||0}/${Number(value.priorUsage.completion_tokens)||0} · ${t('此前用量缺失','Previous usage missing')}: ${Number(value.priorUsage.missing)||0}`;
    }
    const overview = value.overview;
    const items = safeArray(value.items), units = safeArray(value.units);
    const unitLimitations = units.map((unit, index) => ({unit, index, limitations: safeArray(unit.limitations)}))
      .filter(({limitations}) => limitations.length);
    const unitLimitationsMarkup = unitLimitations.length ? `<details class="full-read-warnings"><summary>${esc(t('各单元的局限提示（待核对）','Unit limitations (review needed)'))} (${unitLimitations.length})</summary>
      <p>${esc(t('以下提示来自模型生成的单元，可能有误或不完整；请打开相应单元并对照原文核对。','These notes come from model-generated units and may be inaccurate or incomplete. Open each unit and check it against the source.'))}</p>
      ${unitLimitations.map(({unit, index, limitations}) => `<div><button class="text-button" data-full-read-unit="${index}">${esc(unit.heading || unit.id || String(index + 1))}</button><ul>${limitations.map(item => `<li>${esc(item)}</li>`).join('')}</ul></div>`).join('')}</details>` : '';
    const overviewMarkup = overview ? `<section class="full-read-overview"><h3>${esc(t('全文理解','Whole-paper understanding'))}</h3>
      ${overview.oneSentence ? `<p class="full-read-lead">${esc(overview.oneSentence)}</p>` : ''}
      ${overview.researchQuestion ? `<p><strong>${esc(t('研究问题','Research question'))}</strong> ${esc(overview.researchQuestion)}</p>` : ''}
      ${overview.studyDesign ? `<p><strong>${esc(t('研究设计','Study design'))}</strong> ${esc(overview.studyDesign)}</p>` : ''}
      ${safeArray(overview.mainFindings).length ? `<div><strong>${esc(t('主要发现','Main findings'))}</strong><ul>${safeArray(overview.mainFindings).map(item=>`<li>${esc(item)}</li>`).join('')}</ul></div>` : ''}
      ${safeArray(overview.argumentMap).length ? `<div><strong>${esc(t('论证路径','Argument path'))}</strong><ol>${safeArray(overview.argumentMap).map(item=>`<li>${esc(item)}</li>`).join('')}</ol></div>` : ''}
      ${safeArray(overview.limitations).length ? `<div><strong>${esc(t('阅读边界','Limits'))}</strong><ul>${safeArray(overview.limitations).map(item=>`<li>${esc(item)}</li>`).join('')}</ul></div>` : ''}
    </section>` : '';
    const itemById = new Map(items.map((item, index) => [item.id || String(index), { ...item, _index: index }]));
    const audit = value.conflictAudit;
    const auditStates = {
      complete: t('已检查所选转写','Selected transcriptions checked'),
      partial: t('检查范围不完整','Check coverage incomplete'),
      not_applicable: t('没有可检查的已匹配数字转写','No matched numeric transcription available')
    };
    const auditState = audit?.failedBatches == null && audit?.status === 'complete'
      ? t('旧记录的检查状态待核对','Older check status needs review') : auditStates[audit?.status] || t('状态未知','Status unknown');
    const conflictAuditMarkup = audit && typeof audit === 'object' ? `<details class="full-read-warnings" open>
      <summary>${esc(t('数值冲突检查（待核对）','Numerical conflict check (review needed)'))} · ${esc(auditState)}</summary>
      <p>${esc(t('仅检查部分已匹配转写；模型可能漏报或误报，未列出不代表没有冲突。请核对原文、单位和实验条件。','Only selected matched transcriptions are checked. The model can miss or misidentify conflicts; an empty list does not establish their absence. Check the original, units and conditions.'))}</p>
      ${(Number(audit.valueMatchVersion)||0) < 2 ? `<p>${esc(t('此记录的候选使用旧数字匹配规则，数值可能只匹配到较大数值的一部分；请对照引文复查。','Candidates in this record used an older numeric matching rule and may match part of a larger number; check the quotations.'))}</p>` : ''}
      ${(Number(audit.evidenceValidationVersion)||0) < 2 ? `<p>${esc(t('此记录的候选使用旧引文核验规则，重复引文或未核验的额外引文可能未被标记；请逐条复查。','Candidates in this record used older quotation checks; duplicate or unverified extra quotations may not have been flagged. Review each one.'))}</p>` : ''}
      <p>${esc(t('已检查／符合条件的细项','Checked / eligible items'))}: ${Number(audit.checkedItems)||0}/${Number(audit.totalItems)||0}${audit.truncatedItems != null?` · ${esc(t('仅检查前 2000 字符','Only first 2000 characters checked'))}: ${Number(audit.truncatedItems)||0}`:''}${audit.unverifiedNumericItems != null?` · ${esc(t('未纳入的含数字未核验转写','Unverified numeric transcriptions excluded'))}: ${Number(audit.unverifiedNumericItems)||0}`:''}${audit.failedBatches != null?` · ${esc(t('失败批次','Failed batches'))}: ${Number(audit.failedBatches)||0}`:''}${audit.rejectedCandidates != null?` · ${esc(t('未能核验的候选','Candidates not verified'))}: ${Number(audit.rejectedCandidates)||0}`:''}</p>
      ${safeArray(audit.conflicts).map(conflict=>`<div class="full-read-duplicate"><strong>${esc(conflict.quantity)}</strong> · ${safeArray(conflict.values).map(esc).join(' / ')}${conflict.explanation?`<p>${esc(conflict.explanation)}</p>`:''}<ul>${safeArray(conflict.evidence).map(entry=>`<li>${itemById.has(entry.itemId)?`<button class="text-button" data-full-read-source="${esc(entry.itemId)}">${esc(entry.itemId)} · ${esc(t('第','Page'))} ${Number(entry.page)||0} ${esc(t('页',''))}</button>`:esc(entry.itemId || '')}<blockquote>${esc(entry.quote)}</blockquote></li>`).join('')}</ul></div>`).join('')}
    </details>` : '';
    const sourceItemMarkup = item => {
      const located = item.locationStatus === 'located_quote';
      const kind = {paragraph:t('正文','Paragraph'),figure:t('图','Figure'),table:t('表','Table'),caption:t('图注','Caption')}[item.kind] || item.kind;
      const reference = item.id || String(item._index);
      return `<article class="full-read-source-item">
        <div class="full-read-item-meta"><span>${esc(reference)}</span><span>${esc(kind)}</span><span>${esc(t('第','Page'))} ${Number(item.page)||0} ${esc(t('页',''))}</span>${item.sourceTextMayBeTruncated?`<span>${esc(t('旧版转写可能截断，需重新分析','Older transcription may be truncated; reanalysis needed'))}</span>`:located?(item.sourceVerified?`<span>${esc(t('转写文字匹配原文','Transcription matches source'))}</span>`:`<span>${esc(t('按部分文字定位','Located using partial text'))}</span>`):`<span>${esc(t('仅页码','Page only'))}</span>`}</div>
        <strong>${esc(item.heading)}</strong>
        ${item.summary?`<p><strong>${esc(t('模型摘要','Model summary'))}</strong> ${esc(item.summary)}</p>`:''}
        ${item.analysis?`<p><strong>${esc(t('逐页解读（待核对）','Page interpretation (review needed)'))}</strong> ${esc(item.analysis)}</p>`:''}
        ${item.evidence?`<p><strong>${esc(t('模型提取的依据（待核对）','Model-extracted evidence (review needed)'))}</strong> ${esc(item.evidence)}</p>`:''}
        ${safeArray(item.limitations).length?`<div><strong>${esc(t('逐页局限提示（待核对）','Page limitations (review needed)'))}</strong><ul>${safeArray(item.limitations).map(value=>`<li>${esc(value)}</li>`).join('')}</ul></div>`:''}
        <blockquote>${esc(item.sourceText)}</blockquote>
        <button class="text-button" data-full-read-source="${esc(reference)}">${esc(located?t('定位并高亮这条原文','Locate this source'):t('打开所在页','Open source page'))}</button>
      </article>`;
    };
    const unitMarkup = units.map(unit => {
      const sourceItems = [...new Set([...safeArray(unit.sourceItemIds), ...safeArray(unit.figureItemIds)])].map(id => itemById.get(id)).filter(Boolean);
      const figureItems = safeArray(unit.figureItemIds).map(id => itemById.get(id)).filter(Boolean);
      const missingFigures = safeArray(unit.figureItemIds).filter(id => !itemById.has(id));
      const unitType = {experiment:t('实验','Experiment'),background:t('研究背景','Background'),methods:t('方法','Methods'),synthesis:t('综合','Synthesis')}[unit.unitType] || unit.unitType;
      return `<article class="full-read-unit ${esc(unit.status)}" id="full-read-unit-${esc(unit.id)}">
        <div class="full-read-item-meta"><span>${esc(unitType)}</span><span>${esc(t('第','Page'))} ${safeArray(unit.pages).join(', ')} ${esc(t('页',''))}</span><span>${esc(fullReadStateLabel(unit))}</span></div>
        ${safeArray(unit.mergedStatuses).length>1?`<p class="hint">${esc(t('合并前的模型状态不一致，请逐条核对原文：','Model statuses differed before merging; check each claim against the source:'))} ${safeArray(unit.mergedStatuses).map(status=>esc(fullReadStateLabel({status}))).join(' / ')}</p>`:''}
        <h4>${esc(unit.heading)}</h4>
        ${safeArray(unit.sourceWarnings).length?`<div class="full-read-source-warning"><strong>${esc(t('图表关联提示（待核对）','Figure association warning (review needed)'))}</strong><ul>${safeArray(unit.sourceWarnings).map(value=>`<li>${esc(value)}</li>`).join('')}</ul></div>`:''}
        ${unit.question?`<p><strong>${esc(t('研究问题','Question'))}</strong> ${esc(unit.question)}</p>`:''}
        ${unit.design?`<p><strong>${esc(t('实验设计与对照','Design and controls'))}</strong> ${esc(unit.design)}</p>`:''}
        ${unit.result?`<p><strong>${esc(t('整理的结果','Summarized results'))}</strong> ${esc(unit.result)}</p>`:''}
        ${unit.interpretation?`<div class="full-read-unit-interpretation"><strong>${esc(t('解读','Interpretation'))}</strong><p>${esc(unit.interpretation)}</p></div>`:''}
        ${figureItems.length || missingFigures.length || unit.figureInterpretation?`<section class="full-read-unit-figures"><strong>${esc(t('图表解读（待核对）','Figure interpretation (review needed)'))}</strong>${figureItems.length?'':`<p>${esc(t('没有关联可用的图表来源。','No figure source is available for this link.'))}</p>`}${figureItems.map(item=>`<button class="full-read-figure-link" data-full-read-source="${esc(item.id || item._index)}">${esc(item.id || item._index)} · ${esc(item.figureNumber?`Figure ${item.figureNumber}`:item.heading)} · ${esc(t('第','Page'))} ${Number(item.page)||0}</button><p class="hint">${esc(item.sourceVerified === true ? t('图表来源转写匹配原文；图表关联仍需核对。','Transcription matches the source; the figure association still needs review.') : t('图表来源转写未完全核验，请核对原文。','Figure source transcription is not fully verified; check the original.'))}</p>${item.analysis?`<p>${esc(item.analysis)}</p>`:''}`).join('')}${missingFigures.length?`<p class="hint">${esc(t('记录中缺少这些图表来源：','These figure sources are missing from the record:'))} ${missingFigures.map(esc).join(', ')}</p>`:''}${unit.figureInterpretation?`<p>${esc(unit.figureInterpretation)}</p>`:''}</section>`:''}
        ${safeArray(unit.limitations).length?`<div><strong>${esc(t('局限','Limitations'))}</strong><ul>${safeArray(unit.limitations).map(value=>`<li>${esc(value)}</li>`).join('')}</ul></div>`:''}
        <details class="full-read-unit-sources"><summary>${esc(t(`原文依据（${sourceItems.length} 项）`,`Source evidence (${sourceItems.length} items)`))}</summary>${sourceItems.map(sourceItemMarkup).join('')}</details>
      </article>`;
    }).join('');
    const flatItems = units.length ? '' : items.map(sourceItemMarkup).join('');
    const unassigned = units.length ? safeArray(value.coverage?.missingItemIds).map(id => itemById.get(id)).filter(Boolean) : [];
    const duplicates = safeArray(coverage.duplicateItemIds).map(id => ({
      id, item: itemById.get(id),
      units: units.map((unit, index) => ({unit, index})).filter(({unit}) =>
        safeArray(unit.sourceItemIds).includes(id) || safeArray(unit.figureItemIds).includes(id))
    }));
    const duplicateMarkup = duplicates.length ? `<details class="full-read-warnings" open><summary>${esc(t('多次引用的原文，需核对','Source items cited by multiple units; review needed'))} (${duplicates.length})</summary>
      <p>${esc(t('同一原文可能合理支持多个单元，也可能表示归组有误；请对照原文检查。','A source may legitimately support multiple units, or its grouping may be incorrect. Check it against the original.'))}</p>
      ${duplicates.map(({id, item, units: matches}) => `<div class="full-read-duplicate"><strong>${esc(id)}</strong>${item ? ` · ${esc(item.heading)} <details><summary>${esc(t('查看原文','View source'))}</summary>${sourceItemMarkup(item)}</details>` : ''}
        <div>${esc(t('引用此原文的单元','Units citing this source'))}: ${matches.map(({unit, index}) => `<button class="text-button" data-full-read-unit="${index}">${esc(unit.heading || unit.id || String(index + 1))}</button>`).join(' · ')}</div></div>`).join('')}</details>` : '';
    const warnings = safeArray(value.warnings);
    const reviewNote = (overview || units.length) ? `<p class="muted">${esc(t('全文概述、实验归组和图表关联由模型生成，需对照原文核对；文字匹配只确认转写位置，不能证明关联或结论正确。','The overview, experiment grouping and figure links are model-generated and need review against the source. A text match confirms the transcription location, not the association or conclusion.'))}</p>` : '';
    content.innerHTML = `${reviewNote}${overviewMarkup}${conflictAuditMarkup}${unitLimitationsMarkup}${duplicateMarkup}${units.length?`<section class="full-read-items"><h3>${esc(t('按实验阅读','Experiment-by-experiment reading'))}</h3>${unitMarkup}</section>`:
      (flatItems?`<section class="full-read-items"><h3>${esc(t('旧版逐段结果','Previous paragraph-level result'))}</h3>${flatItems}</section>`:`<p class="muted">${esc(t('完整深读尚未返回内容。','No complete-reading content has been returned yet.'))}</p>`)}
      ${unassigned.length?`<details class="full-read-warnings"><summary>${esc(t('未归入实验单元的原文','Unassigned source items'))} (${unassigned.length})</summary>${unassigned.map(sourceItemMarkup).join('')}</details>`:''}
      ${warnings.length?`<details class="full-read-warnings"><summary>${esc(t('定位与处理提示','Location and processing notes'))} (${warnings.length})</summary><ul>${warnings.map(item=>`<li>${item.page?`Page ${Number(item.page)} · `:''}${esc(item.message)}</li>`).join('')}</ul></details>`:''}`;
    applyLanguage();
  }

  async function refreshFullRead() {
    const key = readerState.docKey, generation = readerState.loadGeneration;
    if (!key) return;
    const response = await fetch(`/api/full-read?${new URLSearchParams({key})}`);
    const result = await response.json().catch(() => ({}));
    if (key !== readerState.docKey || generation !== readerState.loadGeneration) return;
    if (response.status === 404) {
      renderFullRead(null);
      return;
    }
    if (!response.ok) throw new Error(result.error || '无法读取完整深读。');
    renderFullRead(result);
    if (result.status === 'running') {
      stopFullReadPoll();
      readerState.fullReadTimer = setTimeout(() => {
        refreshFullRead().catch(err => {
          if (key === readerState.docKey) el('full-read-status').textContent = err.message;
        });
      }, 1500);
    }
  }

  async function updateFullRead(action) {
    const key = readerState.docKey, generation = readerState.loadGeneration;
    if (!key) return;
    stopFullReadPoll();
    const button = el(`full-read-${action}`);
    button.disabled = true;
    if (action !== 'cancel') el('full-read-status').textContent = action === 'resume' ? t('正在继续未完成页面…','Resuming unfinished pages…') : t('正在启动逐页完整深读…','Starting the complete page-by-page reading…');
    try {
      const result = await post('/api/full-read', {key, action});
      if (key !== readerState.docKey || generation !== readerState.loadGeneration) return;
      renderFullRead(result);
      if (result.status === 'running') {
        stopFullReadPoll();
        readerState.fullReadTimer = setTimeout(() => refreshFullRead().catch(err => {
          if (key === readerState.docKey) el('full-read-status').textContent = err.message;
        }), 1000);
      }
    } catch (err) {
      if (key === readerState.docKey && generation === readerState.loadGeneration) el('full-read-status').textContent = err.message;
    } finally {
      if (key === readerState.docKey && generation === readerState.loadGeneration) button.disabled = action === 'cancel' ? false : readerState.fullReading?.status === 'running';
    }
  }

  async function startFullRead() { return updateFullRead('start'); }

  async function generateReaderCard() {
    const key = readerState.docKey, button = el('reader-card-generate');
    if (!key) return;
    button.disabled = true;
    el('reader-card-status').textContent = t('正在生成速读，请稍候。', 'Generating the quick-read card.');
    try {
      await post('/api/summarize', {key});
      if (key === readerState.docKey) toast(t('速读已生成。', 'Quick-read card generated.'));
      await getState();
    } finally {
      button.disabled = false;
    }
  }

  function externalSourcesMarkup(status, sources) {
    if (!status || status === 'disabled') return '';
    const items = safeArray(sources).map((source, i) => {
      const url = safeURL(source.url);
      return url ? `<li>[W${i + 1}] <a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(source.title)}</a></li>` : '';
    }).join('');
    return `<div class="source-note">${esc(t('外部文献来源','External sources'))}: ${items ? `<ol>${items}</ol>` : esc(status === 'error' ? t('检索失败','Search failed') : t('未找到结果','No results'))}</div>`;
  }
  async function refreshReadingMemory() {
    const key = readerState.docKey, project = readingProject(), generation = readerState.loadGeneration;
    const result = await post('/api/reading-memory', {project, paper:key});
    if (readerState.docKey !== key || readingProject() !== project || readerState.loadGeneration !== generation) return;
    el('reader-memory-list').innerHTML = safeArray(result.memories).map(m =>
      `<p>${esc(m.kind)}: ${esc(m.content)} <button class="text-button" data-edit-memory="${m.id}">${esc(t('修订','Revise'))}</button> <button class="text-button" data-forget-memory="${m.id}">${esc(t('删除','Delete'))}</button></p>`).join('');
    readerState.memories = result.memories;
    readerState.excerpts = safeArray(result.excerpts);
    syncReaderTabState();
    renderReaderExcerpts();
    refreshReadingSession().catch(err => toast(err.message));
  }

  function sessionScopeKey(project=readingProject(), paper=readerState.docKey, session=readerState.sessionId) {
    return `session-request:${project}:${paper}:${session}`;
  }
  function readerPdfVersion() { return deepReading?.version || readerState.doc?.pdf_version || ''; }
  async function refreshReadingSession() {
    const paper=readerState.docKey, project=readingProject(), session=readerState.sessionId, generation=readerState.loadGeneration;
    const revision=readerState.sessionDraftRevision;
    if (!paper) return;
    const result=await post('/api/reading-session',{action:'list',project,paper,session_id:session});
    if(readerState.docKey!==paper||readingProject()!==project||readerState.sessionId!==session||readerState.loadGeneration!==generation)return;
    readerState.sessions=safeArray(result.sessions);
    const select=el('reading-session-select');
    select.innerHTML=`<option value="default">${esc(t('默认历史','Legacy history'))}</option>${readerState.sessions.map(item=>`<option value="${esc(item.session_id)}">${esc(item.title)}</option>`).join('')}`;
    select.value=session;
    if(document.activeElement!==el('reading-session-title'))el('reading-session-title').value=readerState.sessions.find(item=>item.session_id===session)?.title||'';
    const named=session!=='default';
    el('reading-session-rename').disabled=!named;
    el('reading-session-delete').disabled=!named;
    const draft=result.draft, editingDraft=document.activeElement===el('reader-ask-input') ||
      readerState.sessionDraftRevision!==revision || readerState.askingKeys.has(paper);
    if(draft && typeof draft==='object') {
      if(!editingDraft)el('reader-ask-input').value=draft.question||'';
      const saved=draft.selection, scope=saved?._session_scope;
      if(!editingDraft && saved && scope?.paper===paper && scope.project===project && scope.version && scope.version===readerPdfVersion()) {
        const selection={...saved}; delete selection._session_scope;
        readerState.selection=selection;
        el('qa-selection-box').classList.add('has-selection');
        el('qa-selection-text').textContent=readerSelectionText(selection);
        renderReaderSelectionHighlights(selection.segments);
      } else if (!editingDraft && saved) clearReaderSelection();
    } else if(named && !editingDraft) {
      el('reader-ask-input').value='';
      clearReaderSelection();
    }
    el('reader-qa-history').innerHTML=safeArray(result.history).map(e=>{
      const pages=readerSelectionPages(e.evidence?.selection);
      const note=e.role==='user'&&pages.length?`<span class="qa-selection-note">${esc(t('引用第','Selected page(s)'))} ${pages.join(', ')} ${esc(t('页',''))}</span>`:'';
      return `<div class="qa-bubble ${e.role==='user'?'user-q':'ai-a'}">${note}${e.role==='user'?esc(e.content):formatReaderAnswer(e.content,e.evidence?.citations)+externalSourcesMarkup(e.evidence?.external_search_status,e.evidence?.external_sources)} <button class="text-button" data-delete-event="${e.id}">${esc(t('删除','Delete'))}</button></div>`;
    }).join('');
  }
  async function flushReadingSessionDraft() {
    clearTimeout(readerState.sessionDraftTimer);readerState.sessionDraftTimer=null;
    if(readerState.sessionDraftSave)return readerState.sessionDraftSave;
    readerState.sessionDraftSave=(async()=>{
      while(readerState.pendingSessionDraft){
        const draft=readerState.pendingSessionDraft;
        await post('/api/reading-session',{action:'draft',...draft.payload});
        if(readerState.pendingSessionDraft===draft){readerState.pendingSessionDraft=null;readerState.sessionDraftRevision++;}
      }
    })();
    try{await readerState.sessionDraftSave;}finally{readerState.sessionDraftSave=null;}
  }
  function scheduleReadingSessionDraft() {
    readerState.sessionDraftRevision++;
    const paper=readerState.docKey, project=readingProject(), session=readerState.sessionId;
    if(!paper||session==='default')return;
    const selection=readerState.selection?{...readerState.selection,_session_scope:{paper,project,version:readerPdfVersion()}}:null;
    const pending={payload:{action:'draft',project,paper,session_id:session,question:el('reader-ask-input').value,selection}};
    readerState.pendingSessionDraft=pending;
    clearTimeout(readerState.sessionDraftTimer);
    readerState.sessionDraftTimer=setTimeout(()=>flushReadingSessionDraft().catch(err=>toast(err.message)),250);
  }

  document.addEventListener('change', async event => {
    if(event.target.id==='reading-session-select') {
      try{await flushReadingSessionDraft();}catch(err){toast(err.message);event.target.value=readerState.sessionId;return;}
      readerState.sessionDraftRevision++;
      readerState.sessionId=event.target.value;
      storeReaderValue(`session:${readingProject()}:${readerState.docKey}`,readerState.sessionId);
      el('reader-ask-input').value='';clearReaderSelection();
      refreshReadingSession().catch(err=>toast(err.message));return;
    }
    if (event.target.id === 'reader-project') {
      try{await flushReadingSessionDraft();}catch(err){toast(err.message);return;}
      readerState.sessionDraftRevision++;
      if (readerState.docKey) storeReaderValue(`project:${readerState.docKey}`, readingProject());
      readerState.replaces = null;
      el('reader-qa-history').innerHTML = '';
      readerState.sessionId=readerStored(`session:${readingProject()}:${readerState.docKey}`)||'default';
      refreshReadingSession().catch(err=>toast(err.message));
      figureItems = [];
      if (deepReading) renderDeepRead();
      refreshReadingMemory().catch(err => toast(err.message));
      refreshFigures().catch(err => toast(err.message));
    }
  });
  document.addEventListener('click', async event => {
    const button = event.target.closest('button');
    if (!button) return;
    try {
      if(button.dataset.action==='project-synthesis-adopt'){
        const project=el('evidence-project').value.trim(),draft=state.projectSynthesis;
        if(draft&&state.projectSynthesisProject===project&&!state.projectSynthesisEdits[project]){
          state.projectSynthesisEdits[project]={markdown:draft.generated.markdown,useGenerated:true,base:synthesisBase(draft.generated)};renderProjectSynthesis();
        }
        return;
      }
      if(button.dataset.action==='project-synthesis-save'){
        const project=el('evidence-project').value.trim(),value=el('project-synthesis-edit').value;
        const edit=state.projectSynthesisEdits[project]||{markdown:value,useGenerated:false,base:synthesisBase(state.projectSynthesis.revision||state.projectSynthesis.generated)};
        state.projectSynthesisEdits[project]=edit;button.disabled=true;
        let result;
        try{result=await post('/api/project-synthesis',{action:'edit',project,revision:value,use_generated:edit.useGenerated,base:edit.base});}
        finally{button.disabled=false;}
        if(state.projectSynthesisEdits[project]===edit)delete state.projectSynthesisEdits[project];
        if(el('evidence-project')?.value.trim()===project){state.projectSynthesisRequest++;state.projectSynthesis=result.draft;state.projectSynthesisProject=project;renderProjectSynthesis();}
        toast(t('课题调研修订已保存。','Project draft revision saved.'));return;
      }
      if(button.dataset.action==='project-synthesis-export'){
        const project=el('evidence-project').value.trim(),draft=state.projectSynthesis,edit=state.projectSynthesisEdits[project];
        if(!draft||state.projectSynthesisProject!==project)return;
        const source=edit?.base||(draft.revision||draft.generated);
        const body=synthesisMarkdown(el('project-synthesis-edit').value,source.sources);
        const url=URL.createObjectURL(new Blob([body],{type:'text/markdown;charset=utf-8'})),link=document.createElement('a');
        link.href=url;link.download='scholarloom-project-draft.md';link.click();setTimeout(()=>URL.revokeObjectURL(url),0);return;
      }
      if (button.id === 'project-load') { await loadProject(); return; }
      if(button.id==='reading-session-create'){
        await flushReadingSessionDraft();
        const title=el('reading-session-title').value.trim()||t('新会话','New conversation');
        const result=await post('/api/reading-session',{action:'create',project:readingProject(),paper:readerState.docKey,title});
        readerState.sessionId=result.session_id;storeReaderValue(`session:${readingProject()}:${readerState.docKey}`,result.session_id);
        el('reader-ask-input').value='';clearReaderSelection();await refreshReadingSession();return;
      }
      if(button.id==='reading-session-rename'){
        const title=el('reading-session-title').value.trim();
        await post('/api/reading-session',{action:'rename',project:readingProject(),paper:readerState.docKey,session_id:readerState.sessionId,title});await refreshReadingSession();return;
      }
      if(button.id==='reading-session-delete'){
        if(!window.confirm(t('删除此会话及其问答？','Delete this conversation and its Q&A?')))return;
        clearTimeout(readerState.sessionDraftTimer);readerState.sessionDraftTimer=null;readerState.pendingSessionDraft=null;
        await post('/api/reading-session',{action:'delete',project:readingProject(),paper:readerState.docKey,session_id:readerState.sessionId});
        readerState.sessionId='default';storeReaderValue(`session:${readingProject()}:${readerState.docKey}`,'default');el('reader-ask-input').value='';clearReaderSelection();await refreshReadingSession();return;
      }
      if(button.dataset.sessionExport){
        const format=button.dataset.sessionExport;
        const result=await post('/api/reading-session',{action:'export',project:readingProject(),paper:readerState.docKey,session_id:readerState.sessionId,format});
        const url=URL.createObjectURL(new Blob([result.content],{type:format==='text'?'text/plain;charset=utf-8':'text/markdown;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download=`reading-session-${readerState.sessionId}.${format==='text'?'txt':'md'}`;link.click();setTimeout(()=>URL.revokeObjectURL(url),0);return;
      }
      if (button.id === 'project-save') { await saveProjectMembers(); return; }
      if (button.id === 'project-index' || button.id === 'project-rebuild') { await indexProject(button.id === 'project-rebuild'); return; }
      if (button.id === 'project-search') { await searchProject(); return; }
      if (button.dataset.projectHit != null) { await openProjectHit(Number(button.dataset.projectHit)); return; }
      if (button.dataset.action === 'synthesis-source') {
        const {project,paper,version,quote}=button.dataset,page=Number(button.dataset.page);
        const result=await post('/api/project-synthesis',{action:'locate',project,paper,version,page,quote}),located=result.located;
        if(!located)throw new Error(t('未返回原文位置。','The source location was not returned.'));
        readerTabRecord(paper).page=located.page;
        await openReader(paper);if(readerState.docKey!==paper)return;
        el('reader-project').value=project;storeReaderValue(`project:${paper}`,project);
        refreshReadingMemory().catch(err=>toast(err.message));refreshFigures().catch(err=>toast(err.message));
        await showLocatedSource(located);return;
      }
      if (button.dataset.action === 'matrix-generate') {
        const project=el('evidence-project')?.value.trim(),keys=[...state.comparison],focus=state.compareFocus.trim();
        if(!project)throw new Error(t('请输入课题名称。','Enter a project name.'));
        if(keys.length<2||keys.length>12)throw new Error(t('请先选择 2–12 篇文献。','Select 2–12 papers first.'));
        button.disabled=true;
        try {
          const result=await post('/api/evidence-matrix',{action:'generate',project,keys,focus});
          if(el('evidence-project')?.value.trim()!==project)return;
          state.evidenceMatrixRequest++;state.evidenceProject=project;state.evidenceMatrix=result.matrix||null;state.evidenceMatrixProject=project;state.evidenceMatrixLoading='';renderEvidenceMatrix();toast(t('证据矩阵已更新；人工修订已保留。','Evidence matrix updated; human edits were preserved.'));
        } finally { button.disabled=false; }
        return;
      }
      if (button.dataset.action === 'matrix-save') {
        const project=el('evidence-project')?.value.trim(),paper=button.dataset.matrixPaper,field=button.dataset.matrixField,cell=button.closest('td'),value=cell?.querySelector('.matrix-cell-value')?.value||'',status=cell?.querySelector('.matrix-cell-status')?.value||'unknown';
        const result=await post('/api/evidence-matrix',{action:'edit',project,paper,field,value,status});
        delete state.evidenceMatrixDrafts[matrixDraftKey(project,paper,field)];if(result.matrix){state.evidenceMatrix=result.matrix;state.evidenceMatrixProject=project;}renderEvidenceMatrix();toast(t('此单元格已保存。','Cell saved.'));return;
      }
      if (button.dataset.action === 'matrix-export') {
        const project=el('evidence-project')?.value.trim(),format=button.dataset.format,result=await post('/api/evidence-matrix',{action:'export',project,format});
        const blob=new Blob([result.content],{type:format==='csv'?'text/csv;charset=utf-8':'text/markdown;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`evidence-matrix-${project}.${format==='csv'?'csv':'md'}`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),0);return;
      }
      if (button.dataset.action === 'matrix-locate') {
        const project=el('evidence-project')?.value.trim(),paper=button.dataset.matrixPaper,version=button.dataset.version,page=Number(button.dataset.page),quote=button.dataset.quote;
        const located=await post('/api/evidence-matrix',{action:'locate',project,paper,version,page,quote});
        if(el('evidence-project')?.value.trim()!==project)return;
        readerTabRecord(paper).page=located.page;
        await openReader(paper);if(readerState.docKey!==paper)return;el('reader-project').value=project;storeReaderValue(`project:${paper}`,project);refreshReadingMemory().catch(err=>toast(err.message));refreshFigures().catch(err=>toast(err.message));await showLocatedSource(located);return;
      }
      if (button.id === 'dossier-generate') {
        await generateDossier();
        return;
      }
      if (button.id === 'reader-card-generate') {
        await generateReaderCard();
        return;
      }
      if (button.id === 'export-project-excerpts') {
        const result = await post('/api/reading-memory',{project:readingProject(),action:'export'});
        const excerpts=safeArray(result.excerpts);
        const lines=[`# ${readingProject()} · ${t('原文摘录','Excerpts')}`, ''];
        excerpts.forEach(excerpt=>{
          const doc=readerDocFor(excerpt.paper);
          lines.push(`## ${doc?.title || excerpt.paper} (${excerpt.paper})`, `Page ${excerpt.page} · ${excerpt.state} · ${excerpt.version || ''}`, '', ...text(excerpt.quote).split('\n').map(line=>`> ${line}`), '');
        });
        const url=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/markdown;charset=utf-8'}));
        const link=document.createElement('a'); link.href=url; link.download='scholarloom-excerpts.md'; link.click(); setTimeout(()=>URL.revokeObjectURL(url),0);
        return;
      }
      if (button.dataset.editMemory) {
        const m = safeArray(readerState.memories).find(m => m.id === Number(button.dataset.editMemory));
        if (!m) return;
        el('reader-memory-text').value = m.content;
        el('reader-memory-kind').value = m.kind;
        el('reader-memory-slot').value = m.slot;
        readerState.replaces = m.id;
      } else if (button.id === 'reader-memory-save') {
        await post('/api/reading-memory', {action:'remember',project:readingProject(),kind:el('reader-memory-kind').value,
          content:el('reader-memory-text').value,slot:el('reader-memory-slot').value,replaces:readerState.replaces || null,source_ids:[]});
        readerState.replaces = null;
        el('reader-memory-text').value = '';
        await refreshReadingMemory();
      } else if (button.dataset.forgetMemory || button.dataset.deleteEvent) {
        await post('/api/reading-memory', {project:readingProject(),action:button.dataset.forgetMemory?'forget':'delete-event',id:Number(button.dataset.forgetMemory || button.dataset.deleteEvent)});
        await refreshReadingMemory();
      } else if (button.id === 'reader-memory-export') {
        const result = await post('/api/reading-memory',{project:readingProject(),action:'export'});
        const url = URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}));
        const link = document.createElement('a'); link.href=url; link.download='reading-memory.json'; link.click(); URL.revokeObjectURL(url);
      }
    } catch (err) { toast(err.message); }
  });

  async function askReaderQuestion() {
    if (!readerState.docKey || readerState.askingKeys.has(readerState.docKey)) return;
    const requestKey = readerState.docKey, requestProject = readingProject();
    const requestSession=readerState.sessionId, questionInput = el('reader-ask-input');
    const originalQuestion = questionInput.value, rawQuestion = originalQuestion.trim();
    const selection = readerState.selection;
    if (!rawQuestion && !selection) {
      toast(t('请输入问题或先在原文中框选内容', 'Enter a question or select text in the paper first'));
      return;
    }
    const question = rawQuestion || (selection
      ? t('请结合本文解析选中内容的核心含义与依据。','Explain the selected passage in the context of the paper.')
      : '');

    const historyContainer = el('reader-qa-history');
    const userBubble = document.createElement('div');
    userBubble.className = 'qa-bubble user-q';
    const selectedPages = readerSelectionPages(selection);
    userBubble.innerHTML = `${selectedPages.length ? `<span class="qa-selection-note">${esc(t('引用第','Selected page(s)'))} ${selectedPages.join(', ')} ${esc(t('页',''))}</span>` : ''}${esc(question)}`;
    historyContainer.prepend(userBubble);

    const aiBubble = document.createElement('div');
    aiBubble.className = 'qa-bubble ai-a';
    aiBubble.textContent = t('正在阅读全文并核对证据…', 'Reading full text and verifying evidence citations...');
    historyContainer.insertBefore(aiBubble, userBubble.nextSibling);

    readerState.askingKeys.add(requestKey);
    el('reader-ask-btn').disabled = true;
    try {
      let sessionRequestId='';
      if(requestSession!=='default') {
        const scopeKey=sessionScopeKey(requestProject,requestKey,requestSession), signature=JSON.stringify({question,selection});
        let pending;try{pending=JSON.parse(localStorage.getItem(scopeKey)||'null');}catch{}
        if(!pending||pending.signature!==signature)pending={signature,id:window.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`};
        try{localStorage.setItem(scopeKey,JSON.stringify(pending));}catch{}sessionRequestId=pending.id;
        readerState.pendingSessionDraft={payload:{project:requestProject,paper:requestKey,session_id:requestSession,question,
          selection:selection?{...selection,_session_scope:{paper:requestKey,project:requestProject,version:readerPdfVersion()}}:null}};
        await flushReadingSessionDraft();
      }
      const payload = {
        key: requestKey,
        project: requestProject,
        use_memory: el('reader-use-memory').checked,
        question,
        selection,
        online_search: el('reader-online-search').checked,
      };
      if(requestSession!=='default'){payload.session_id=requestSession;payload.request_id=sessionRequestId;payload.draft_saved=true;}
      const result = await post('/api/paper-chat', payload);
      if (readerState.docKey === requestKey && readingProject() === requestProject && readerState.sessionId===requestSession) {
        if(questionInput.value===originalQuestion && JSON.stringify(readerState.selection)===JSON.stringify(selection)) {
          questionInput.value='';clearReaderSelection();
        } else scheduleReadingSessionDraft();
        if(requestSession!=='default')try{localStorage.removeItem(sessionScopeKey(requestProject,requestKey,requestSession));}catch{}
        readerState.evidence = new Map(safeArray(result.evidence).map(item => [item.id, item]));
        syncReaderTabState();
        aiBubble.innerHTML = formatReaderAnswer(result.answer || '', result.citations);
        aiBubble.insertAdjacentHTML('beforeend', externalSourcesMarkup(result.external_search_status, result.external_sources));
        const b = result.budget;
        const c = result.coverage;
        const context = b ? `${t('本次：','This turn: ')}${b.memory_ids.length} ${t('条记忆，','memories, ')}${b.history_ids.length} ${t('条历史；正文','history entries; evidence ')}${b.evidence_bytes} bytes${b.evidence_truncated ? t('（已截取）',' (truncated)') : ''}` : '';
        const citations = c ? `${t('；证据引用','; citations ')}${c.located}/${c.citation_count}${c.unsupported ? ` (${c.unsupported} ${t('未定位','unsupported')})` : ''}` : '';
        el('reader-context-report').textContent = context + citations;
        refreshReadingMemory().catch(err => toast(err.message));
      }
    } catch (err) {
      if (aiBubble.isConnected && readerState.docKey === requestKey && readingProject() === requestProject && readerState.sessionId===requestSession) {
        aiBubble.textContent = t('问答失败：', 'Q&A failed: ') + err.message;
        aiBubble.classList.add('error');
      }
    } finally {
      readerState.askingKeys.delete(requestKey);
      if (readerState.docKey === requestKey) el('reader-ask-btn').disabled = false;
    }
  }

  el('reader-ask-input').addEventListener('input',scheduleReadingSessionDraft);
  el('reading-session-title').addEventListener('input',()=>{
    if(readerState.sessionId==='default')return;
    const current=readerState.sessions.find(item=>item.session_id===readerState.sessionId);
    el('reading-session-rename').disabled=!current||!el('reading-session-title').value.trim();
  });

  function syncLibraryInputs(){syncFilters();}
  document.addEventListener('click',async event=>{const button=event.target.closest('button');if(!button)return;if(button.dataset.view){if(button.dataset.view==='reader'&&!readerState.docKey&&readerState.openTabs.size){const key=readerState.openTabs.has(readerState.preferredKey)?readerState.preferredKey:readerState.openTabs.keys().next().value;await openReader(key);return;}await navigateView(button.dataset.view);return;}if(button.dataset.jobStatus!==undefined){state.jobsFilter=button.dataset.jobStatus;el('job-filter').value=state.jobsFilter;renderOverview();renderJobs();return;}if(button.dataset.category!==undefined){state.category=button.dataset.category;state.kind='';state.year='';state.studyType='';state.readingStatus='';state.query='';state.routeKeys=null;state.routeName='';state.focusKey=null;state.limit=24;state.searchMode='local';syncLibraryInputs();setView('library');renderResults();return;}if(button.dataset.route!==undefined){const route=safeArray(state.snapshot?.routes)[Number(button.dataset.route)];if(route)Object.assign(state,{routeKeys:safeArray(route.keys),routeName:route.title||'阅读路线',focusKey:null,category:'',kind:'',year:'',studyType:'',readingStatus:'',query:'',limit:24,searchMode:'local'});syncLibraryInputs();setView('library');renderResults();return;}if(button.dataset.focus){showDocument(button.dataset.focus);return;}if(button.id==='scan-new'||button.id==='scan-existing'){await runAction(async()=>{await post('/api/scan',button.id==='scan-existing'?{include_existing:true}:{});toast(button.id==='scan-existing'?'已开始识别已有下载文件。':'已开始扫描新增文件。');await getState();});return;}if(button.id==='open-comparison'){setView('compare');return;}if(button.id==='clear-compare'||button.id==='clear-compare-top'){clearComparison();return;}if(button.id==='load-more'){state.limit+=24;renderResults();return;}if(button.id==='home-search'){state.query=el('home-query').value;state.category='';state.kind='';state.year='';state.studyType='';state.readingStatus='';state.routeKeys=null;state.routeName='';state.focusKey=null;state.searchMode='local';syncLibraryInputs();setView('library');renderResults();return;}if(button.id==='authorize'){await runAction(async()=>{toast('请在 Zotero 弹窗中选择“始终允许”。该权限可随时在 Zotero 中撤销。');await post('/api/authorize',{});await getState();});return;}if(button.id==='open-folder'){await runAction(async()=>{await post('/api/open-folder',{});toast('已打开文献备份文件夹。');});return;}if(button.id==='save-settings'){await saveSettings();return;}if(button.id==='test-model'){await runAction(async()=>{const result=await post('/api/model-test',{});setMessage(result.message||'摘要模型连接成功。');});return;}if(button.dataset.action){await runAction(async()=>{const action=button.dataset.action;if(action==='open-file'){await post('/api/open-job',{id:button.dataset.id});toast('已打开源文件。');}else if(action==='confirm'){await post('/api/confirm',{id:button.dataset.id});toast('已确认题录，正在保存到本地资料库。');await getState();}else if(action==='retry'){await post('/api/retry',{id:button.dataset.id});toast('已重新加入处理队列。');await getState();}else if(action==='ignore'){await post('/api/ignore',{id:button.dataset.id});toast('已忽略此记录。');await getState();}else if(action==='summarize'){const row=safeArray(state.snapshot?.documents).find(item=>item.key===button.dataset.key);await post('/api/summarize',{key:button.dataset.key});toast(row&&summaryPending(row)?'已开始生成速读。':'已请求重新生成摘要。');await getState();}});}});
  let deepReading = null, deepIndex = 0;
  async function refreshDeepRead() {
    const key = readerState.docKey, generation = readerState.loadGeneration;
    deepReading = null;
    el('deep-analyze').disabled = false;
    el('deep-reader').hidden = true;
    el('deep-status').textContent = t('正在整理原文…', 'Preparing the paper…');
    const response = await fetch(`/api/deep-read?${new URLSearchParams({key})}`);
    const data = await response.json();
    if (!response.ok || data.ok === false) throw new Error(data.error || '无法读取全文。');
    if (readerState.docKey !== key || readerState.loadGeneration !== generation) return;
    deepReading = data;
    refreshReadingSession().catch(err=>toast(err.message));
    deepIndex = Math.min(Math.max(0, Number(readerStored(`deep:v2:${key}:${data.version}`)) || 0), data.segments.length - 1);
    el('deep-status').textContent = data.segments.length ? t('请核对自动划分及图文关联。', 'Check the automatic segmentation and figure links.') : t('未能提取正文。', 'No text could be extracted.');
    el('deep-reader').hidden = !data.segments.length;
    if (data.segments.length) renderDeepRead();
  }
  function deepFigureKey(index = deepIndex) {
    return `deep-figure:v2:${readerState.docKey}:${deepReading.version}:${readingProject()}:${index}`;
  }
  function renderDeepRead() {
    if (!deepReading) return;
    const segment = deepReading.segments[deepIndex];
    storeReaderValue(`deep:v2:${readerState.docKey}:${deepReading.version}`, deepIndex);
    el('deep-position').textContent = `${deepIndex + 1} / ${deepReading.segments.length} · ${t('第','Page ')} ${segment.page} ${t('页','')}`;
    el('deep-text').textContent = segment.text;
    el('deep-prev').disabled = deepIndex === 0;
    el('deep-next').disabled = deepIndex === deepReading.segments.length - 1;
    const numbers = segment.figure_numbers || [];
    const options = deepReading.candidates.map(c => `<option value="a:${Number(c.index)}">${esc(`Figure ${c.figure_number} · ${t('第','Page ')} ${c.page}`)}${numbers.includes(c.figure_number) ? ' ★' : ''}</option>`).join('') +
      figureItems.filter(item => !item.stale && item.pdf_version === deepReading.version).map(item => `<option value="m:${esc(item.id)}">${esc(t('手动选区','Manual selection'))}: ${esc(item.figure_number)} · ${esc(t('第','Page'))} ${Number(item.page)}</option>`).join('');
    el('deep-figures').innerHTML = `<label for="deep-candidate">${esc(t('关联图像（★ 为正文引用，请核对；手动选区请先保存）','Figure (★ mentioned in text; verify; save manual selections first)'))}</label><select id="deep-candidate"><option value="none">${esc(t('不关联图像','No figure'))}</option>${options}</select><div id="deep-preview"></div>`;
    const matched = deepReading.candidates.find(c => numbers.includes(c.figure_number));
    const saved = readerStored(deepFigureKey());
    const choice = saved || (matched ? `a:${matched.index}` : 'none');
    el('deep-candidate').value = [...el('deep-candidate').options].some(option => option.value === choice) ? choice : 'none';
    el('deep-send-image').checked = false;
    renderDeepCandidate();
    renderDeepAnswer();
  }
  function renderDeepCandidate() {
    const select = el('deep-candidate'), preview = el('deep-preview');
    if (!select || !preview) return;
    const candidate = select.value.startsWith('a:') ? deepReading.candidates.find(c => `a:${c.index}` === select.value) : figureItems.find(item => `m:${item.id}` === select.value && !item.stale);
    preview.textContent = candidate ? `Figure ${candidate.figure_number} · ${candidate.caption} (${t('候选，请核对','candidate; verify')})` : '';
    if (candidate) {
      const img = document.createElement('img');
      img.alt = t('图像候选，请核对原文','Figure candidate; check the original');
      img.style.maxWidth = '100%';
      img.src = candidate.id ? candidate.crop_url : `/api/deep-read/crop?${new URLSearchParams({key:readerState.docKey, version:deepReading.version, index:candidate.index})}`;
      preview.prepend(img);
    }
    renderDeepAnswer();
  }
  function renderDeepAnswer() {
    if (!deepReading) return;
    const selected = el('deep-candidate')?.value || 'none';
    const candidate = selected.startsWith('a:') ? Number(selected.slice(2)) : null;
    const figure = selected.startsWith('m:') ? selected.slice(2) : null;
    const analysis = [...safeArray(deepReading.analyses)].reverse().find(a => a.segment_index === deepIndex && a.candidate_index === candidate && (a.figure_id || null) === figure);
    el('deep-answer').textContent = analysis ? `${analysis.image_included ? t('已发送图像。','Image sent.'):t('未发送图像。','No image sent.')}\n${analysis.analysis}` : '';
  }
  el('deep-prev').addEventListener('click', () => { if (deepIndex > 0) { deepIndex--; renderDeepRead(); } });
  el('deep-next').addEventListener('click', () => { if (deepReading && deepIndex < deepReading.segments.length - 1) { deepIndex++; renderDeepRead(); } });
  el('deep-source').addEventListener('click', () => { if (deepReading) jumpToReaderPage(deepReading.segments[deepIndex].page); });
  el('deep-figures').addEventListener('change', () => { storeReaderValue(deepFigureKey(), el('deep-candidate').value); renderDeepCandidate(); });
  el('deep-analyze').addEventListener('click', async () => {
    if (!deepReading) return;
    const key = readerState.docKey, version = deepReading.version, index = deepIndex, project = readingProject(), generation = readerState.loadGeneration;
    const selected = el('deep-candidate')?.value || 'none';
    const candidate_index = selected.startsWith('a:') ? Number(selected.slice(2)) : null;
    const figure_id = selected.startsWith('m:') ? selected.slice(2) : null;
    el('deep-analyze').disabled = true;
    el('deep-status').textContent = t('正在解读…','Analyzing…');
    try {
      const result = await post('/api/deep-read/analyze', {key, version, project, segment_index:index, candidate_index, figure_id, include_image:el('deep-send-image').checked});
      if (readerState.docKey !== key || readerState.loadGeneration !== generation || deepReading?.version !== version || readingProject() !== project) return;
      deepReading.analyses.push(result);
      if (deepIndex === index) renderDeepAnswer();
      el('deep-status').textContent = result.image_included ? t('解读已保存；模型接收了图像。','Saved; the model received the image.') : t('解读已保存；模型未接收图像。','Saved; no image was sent.');
    } catch (err) { if (readerState.loadGeneration === generation && readingProject() === project) el('deep-status').textContent = err.message; }
    finally { if (readerState.loadGeneration === generation) el('deep-analyze').disabled = false; }
  });
  function showReaderSidebarPane(target) {
    if (target === 'figure') { target = 'dossier'; el('deep-figure-tools').open = true; }
    const panes = {
      card: 'reader-sidebar-card',
      dossier: 'reader-sidebar-dossier',
      qa: 'reader-sidebar-qa',
      notes: 'reader-sidebar-notes',
    };
    for (const [name, id] of Object.entries(panes)) el(id).hidden = name !== target;
    document.querySelectorAll('.reader-sidebar-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.sidebarTab === target));
  }

  document.addEventListener('click',async event=>{
    const button=event.target.closest('button');
    if(!button)return;
    if(button.dataset.watchToggle){
      const watching=state.snapshot?.settings?.watch_enabled!==false;
      await runAction(async()=>{
        await post('/api/settings',{watch_enabled:!watching});
        await getState();
        toast(watching?'文件监看已暂停。':'文件监看已开启。');
      });
      return;
    }
    if(button.id==='resume-reading-button') { await activateReaderTab(readerState.preferredKey); return; }
    if(button.id==='translation-browser-configure') {
      button.disabled=true;
      el('translation-browser-status').textContent=t('正在启用浏览器本地翻译…','Enabling browser-local translation…');
      try {
        const result=await readerTranslation.configure(loaded=>{
          if(Number.isFinite(loaded))el('translation-browser-status').textContent=t(`正在下载浏览器语言包：${Math.round(loaded*100)}%`,`Downloading browser language pack: ${Math.round(loaded*100)}%`);
        });
        renderBrowserTranslation(result.availability,result.error);
        if(result.ready)toast(t('浏览器本地翻译已启用。','Browser-local translation is enabled.'));
      } catch(error) {
        renderBrowserTranslation('unknown',error.message);
      }
      return;
    }
    if(button.id==='translation-offline-download') {
      button.disabled=true;
      el('translation-offline-status').textContent=t('正在下载并安装离线模型，请保持页面打开…','Downloading and installing the offline model. Keep this page open…');
      try {
        const result=await post('/api/translator/offline',{});
        state.translatorSettings=result.offline;
        renderOfflineTranslation(result.offline);
        toast(t('离线翻译模型已安装。','Offline translation model installed.'));
      } catch(error) {
        el('translation-offline-status').textContent=t(`安装失败：${error.message}`,`Installation failed: ${error.message}`);
        button.disabled=false;
      }
      return;
    }
    if(button.id==='retry-summary-failures') {
      const keys=safeArray(state.snapshot?.health?.summary?.failures).map(item=>item.key);
      if(keys.length && window.confirm(t(`重试 ${keys.length} 篇速读将调用模型，继续吗？`,`Retry ${keys.length} cards using the model?`))) await runAction(async()=>{ await post('/api/summarize',{keys}); await getState(); });
      return;
    }
    if(button.id==='summary-select-missing'){
      const pending=safeArray(state.snapshot?.documents).filter(summaryPending);
      state.comparison=[...new Set([...state.comparison,...pending.map(row=>row.key)])].slice(0,12);
      renderResults();
      return;
    }
    if(button.id==='summary-clear-selection'){
      clearComparison();
      renderResults();
      return;
    }
    if(button.id==='summary-generate'){
      const keys=[...state.comparison];
      if(!keys.length)return;
      if(keys.length>1&&!window.confirm(t(`将依次为 ${keys.length} 篇文献生成速读，这会调用所选模型。继续吗？`,`Generate reading cards for ${keys.length} papers? This will call the selected model. Continue?`)))return;
      await runAction(async()=>{
        await post('/api/summarize',{keys});
        state.comparison=[];
        renderResults();
        toast(t(`已开始生成 ${keys.length} 篇速读。`,`Started generating ${keys.length} reading cards.`));
        await getState();
      });
      return;
    }
    if(button.id==='search-mode-local'){
      state.searchMode='local';state.externalLoading=false;renderResults();return;
    }
    if(button.dataset.readerTab){
      await activateReaderTab(button.dataset.readerTab);
      return;
    }
    if(button.dataset.closeReaderTab){
      await closeReaderTab(button.dataset.closeReaderTab);
      return;
    }
    if(button.dataset.action==='open-reader'){
      await openReader(button.dataset.key);
      return;
    }
    if(button.id==='qa-translate'){
      await translateReaderSelection();
      return;
    }
    if(button.id==='qa-translation-copy'){
      try {
        await navigator.clipboard.writeText(el('qa-translation-result').textContent);
        el('qa-translation-status').textContent = t('译文已复制。','Translation copied.');
      } catch (error) {
        el('qa-translation-status').textContent = `${t('复制失败：','Copy failed: ')}${error.message}`;
      }
      return;
    }
    if(button.dataset.action==='open-dossier'){
      await openReader(button.dataset.key);
      showReaderSidebarPane('dossier');
      return;
    }
    if(button.id==='reader-back-btn'){
      await navigateView('library');
      return;
    }
    if(button.id==='reader-open-figure'){
      showReaderSidebarPane('figure');
      return;
    }
    if(button.id==='reader-prev-page'){
      jumpToReaderPage(readerState.currentPage - 1);
      return;
    }
    if(button.id==='reader-next-page'){
      jumpToReaderPage(readerState.currentPage + 1);
      return;
    }
    if(button.id==='reader-zoom-in'){
      setReaderZoom(readerState.zoomScale + 0.2);
      return;
    }
    if(button.id==='reader-zoom-out'){
      setReaderZoom(readerState.zoomScale - 0.2);
      return;
    }
    if(button.id==='reader-zoom-fit'){
      fitReaderWidth();
      return;
    }
    if(button.id==='full-read-start'){
      await startFullRead();
      return;
    }
    if(button.id==='full-read-resume'){
      await updateFullRead('resume');
      return;
    }
    if(button.id==='full-read-cancel'){
      await updateFullRead('cancel');
      return;
    }
    if(button.dataset.fullReadUnit!==undefined){
      const unit=el('full-read-content').querySelectorAll('.full-read-unit')[Number(button.dataset.fullReadUnit)];
      if(unit) unit.scrollIntoView({behavior:'smooth', block:'start'});
      return;
    }
    if(button.dataset.fullReadSource!==undefined){
      const source=safeArray(readerState.fullReading?.value?.items);
      const item=source.find(item=>String(item.id)===String(button.dataset.fullReadSource))
        || source[Number(button.dataset.fullReadSource)];
      if(!item) return;
      const page=Number(item.page)||1;
      await runAction(() => showLocatedSource({page, rects:item.rects}));
      return;
    }
    if(button.id==='figure-select'){
      readerState.figureSelecting = !readerState.figureSelecting;
      el('reader-viewport').classList.toggle('selecting-figure', readerState.figureSelecting);
      button.setAttribute('aria-pressed', String(readerState.figureSelecting));
      el('figure-status').textContent = readerState.figureSelecting ? t('在 PDF 上拖动选择图或子图。','Drag over a figure or panel in the PDF.') : t('已退出框选。','Selection canceled.');
      return;
    }
    if(button.id==='figure-source' && readerState.figure){
      jumpToReaderPage(readerState.figure.page);
      return;
    }
    if(button.id==='figure-find'){
      await runAction(async()=>{const result=await post('/api/figures/context',figurePayload());renderFigureContext(result);});
      return;
    }
    if(button.id==='figure-save'){
      await runAction(async()=>{const key=readerState.docKey, project=readingProject(), reading=deepReading, index=deepIndex; const result=await post('/api/figures',figurePayload()); if(readerState.docKey!==key || readingProject()!==project || deepReading!==reading) return; if(reading && reading.version===result.figure.pdf_version) storeReaderValue(deepFigureKey(index), `m:${result.figure.id}`); await refreshFigures(); toast(t('图像笔记已保存。','Figure note saved.'));});
      return;
    }
    if(button.dataset.figurePage){ jumpToReaderPage(Number(button.dataset.figurePage)); return; }
    if(button.dataset.openFigure){
      await runAction(async()=>{
        const item=figureItems.find(x=>x.id===button.dataset.openFigure);
        if (!item || item.stale) return;
        const r=item.rect;
        await previewFigure(item.page,[r.x0,r.y0,r.x1,r.y1]);
        el('figure-number').value=item.figure_number;
        el('figure-note').value=item.note;
        renderFigureContext(item);
      });
      return;
    }
    if(button.dataset.deleteFigure){
      if (!window.confirm(t('删除这条图像笔记？','Delete this figure note?'))) return;
      await runAction(async()=>{
        const response=await fetch(`/api/figures/${encodeURIComponent(button.dataset.deleteFigure)}`,{method:'DELETE',headers:{'X-Workbench-Token':state.snapshot.csrf}});
        const result=await response.json();
        if (!response.ok) throw new Error(result.error || '删除失败');
        await refreshFigures();
      });
      return;
    }
    if(button.id==='reader-ask-btn'){
      await askReaderQuestion();
      return;
    }
    if(button.id==='qa-clear-selection'){
      clearReaderSelection();
      scheduleReadingSessionDraft();
      return;
    }
    if(button.id==='qa-save-excerpt'){
      await saveReaderSelection();
      return;
    }
    if(button.dataset.retryPage){
      renderReaderPage(Number(button.dataset.retryPage));
      return;
    }
    if(button.dataset.deleteExcerpt){
      await post('/api/reading-memory',{project:readingProject(),action:'delete-excerpt',id:Number(button.dataset.deleteExcerpt)});
      await refreshReadingMemory();
      return;
    }
    if(button.id==='reader-save-notes'){
      if(!readerState.docKey)return;
      const status=el('reader-status-select').value;
      const note=el('reader-notes-textarea').value;
      await runAction(async()=>{
        await post('/api/document-state',{key:readerState.docKey,readingStatus:status,readingNote:note});
        toast(t('已保存阅读状态与笔记。','Reading status and notes saved.'));
        await getState();
      });
      return;
    }
    if(button.classList.contains('evidence-cite')&&button.dataset.page){
      const page = Number(button.dataset.page);
      const item = readerState.evidence.get(button.dataset.evidence);
      if (item) await runAction(() => showLocatedSource({page, rects:item.rects}));
      else jumpToReaderPage(page);
      return;
    }
    if(button.classList.contains('page-cite')&&button.dataset.page){
      jumpToReaderPage(Number(button.dataset.page));
      return;
    }
    if(button.classList.contains('reader-sidebar-tab')){
      showReaderSidebarPane(button.dataset.sidebarTab);
      return;
    }
    if(button.id==='search-submit'){
      if(state.searchMode==='external'){
        await runExternalSearch();
      }else{
        const resultsEl=el('results');
        if(resultsEl)resultsEl.scrollIntoView({behavior:'smooth',block:'start'});
      }
      return;
    }
    if(button.id==='search-mode-external'){
      state.searchMode='external';renderResults();
      if(el('query').value.trim())await runExternalSearch();return;
    }
    if(button.id==='save-prompts'){
      const revision=state.promptRevision,prompts=promptPayload();await runAction(async()=>{await post('/api/settings',{prompt_presets:prompts});if(state.promptRevision===revision)state.promptDirty=false;toast('提示词已保存。');await getState();});return;
    }
    if(button.id==='reset-prompts'){
      await runAction(async()=>{const result=await post('/api/prompt-presets/reset',{});state.snapshot.settings.prompt_presets=result.prompts;state.promptDirty=false;renderPromptEditor();toast('提示词已恢复默认。');});return;
    }
    if(button.dataset.action==='paper-chat'){
      const key=button.dataset.key,card=button.closest('.card-tools'),question=card?.querySelector('[data-ask-question]')?.value.trim()||'',preset=card?.querySelector('[data-ask-preset]')?.value||'';
      state.paperDrafts[key]=question;state.paperOpen.add(key);state.paperAnswers[key]={loading:true};renderResults();
      try{const result=await post('/api/paper-chat',{key,question,preset});state.paperAnswers[key]=result;}catch(error){state.paperAnswers[key]={error:error.message};}renderResults();return;
    }
    if(button.dataset.action==='related-online'){
      const key=button.dataset.key;state.paperOpen.add(key);toast('正在检索开放学术图谱…');
      await runAction(async()=>{const result=await post('/api/external-recommend',{mode:'related',query:key});state.relatedResults[key]=safeArray(result.results);renderResults();});return;
    }
    if(button.dataset.action==='ingest-external'){
      button.disabled=true;await runAction(async()=>{await post('/api/external-ingest',{url:button.dataset.url,title:button.dataset.title});toast('已下载开放获取全文并加入收件箱。');await getState();});button.disabled=false;return;
    }
    if(button.dataset.action==='save-reading'){
      const card=button.closest('.reading-tools'),key=button.dataset.key,status=card?.querySelector('.reading-status')?.value||'unread',note=card?.querySelector('.reading-note')?.value||'';
      await runAction(async()=>{await post('/api/document-state',{key,readingStatus:status,readingNote:note});toast('已保存阅读状态与笔记。');await getState();});return;
    }
    if(button.dataset.action==='synthesize'){
      const keys=[...state.comparison],focus=state.compareFocus.trim(),project=state.evidenceProject || libraryProject();toast('正在综合证据台账…');
      await runAction(async()=>{const result=await post('/api/compare-synthesis',{keys,focus,project});state.synthesis={signature:`${keys.join('|')}::${focus}::${project}`,markdown:result.markdown,sources:safeArray(result.sources)};renderComparison();if(state.evidenceProject===project)loadProjectSynthesis(project,true);toast('对比综述已生成。');});return;
    }
    if(button.dataset.action==='copy-synthesis'&&state.synthesis){
      await navigator.clipboard.writeText(synthesisMarkdown(state.synthesis.markdown,state.synthesis.sources));toast('已复制 Markdown 报告。');return;
    }
    if(button.dataset.action==='download-synthesis'&&state.synthesis){
      const blob=new Blob([synthesisMarkdown(state.synthesis.markdown,state.synthesis.sources)],{type:'text/markdown;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download=`scholarloom-evidence-${new Date().toISOString().slice(0,10)}.md`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),0);toast('Markdown 报告已下载。');return;
    }
  });
  async function runAction(action){try{await action();}catch(error){toast(error.message);}}
  async function saveSettings(){const raw=el('model-url').value.trim()||'https://api.openai.com/v1';let parsed;try{parsed=new URL(raw);}catch{setMessage('API 地址格式无效。',true);return;}const loopback=['localhost','127.0.0.1','::1','[::1]'].includes(parsed.hostname);if(parsed.protocol!=='https:'&&!(parsed.protocol==='http:'&&loopback)){setMessage('API 地址须使用 HTTPS；仅本机回环地址可以使用 HTTP。',true);return;}const payload={watch_folders:el('watch-folders').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean),watch_enabled:el('watch-enabled').checked,model_url:raw,model_name:el('model-name').value.trim(),auto_summary:el('auto-summary').checked,summary_language:el('ai-output-language').value,ui_language:uiLanguage,prompt_presets:promptPayload()};const key=el('model-key').value,settingsRevision=state.settingsRevision,promptRevision=state.promptRevision;if(key)payload.model_key=key;await runAction(async()=>{await post('/api/settings',payload);if(state.settingsRevision===settingsRevision){el('model-key').value='';state.settingsDirty=false;}if(state.promptRevision===promptRevision)state.promptDirty=false;setMessage('设置已保存。');await getState();});}
  for(const name of ['category','kind','year','studyType','readingStatus'])el(name).addEventListener('change',event=>{state[name]=event.target.value;state.focusKey=null;state.routeKeys=null;state.routeName='';state.limit=24;renderResults();});
  el('query').addEventListener('input',event=>{if(state.searchMode==='external')return;state.query=event.target.value;state.focusKey=null;state.routeKeys=null;state.routeName='';state.limit=24;renderResults();});
  el('query').addEventListener('keydown',event=>{
    if(event.isComposing||event.keyCode===229)return;
    if(event.key==='Enter'){
      event.preventDefault();
      if(state.searchMode==='external'){
        runExternalSearch();
      }else{
        const resultsEl=el('results');
        if(resultsEl)resultsEl.scrollIntoView({behavior:'smooth',block:'start'});
      }
    }
  });
  el('prompt-editor').addEventListener('input',()=>{state.promptDirty=true;state.promptRevision++;});
  const settingFields=new Set(['watch-enabled','watch-folders','model-url','model-name','model-key','ai-output-language','auto-summary']);
  for(const eventName of ['input','change'])el('settings-view').addEventListener(eventName,event=>{if(settingFields.has(event.target.id)){state.settingsDirty=true;state.settingsRevision++;}});
  el('results').addEventListener('input',event=>{const box=event.target.closest('[data-ask-question]');if(box)state.paperDrafts[box.dataset.askQuestion]=box.value;});
  el('comparison-content').addEventListener('input',event=>{const target=event.target;if(target.id==='compare-focus')state.compareFocus=target.value;if(target.id==='evidence-project')state.evidenceProject=target.value.trim();if(target.id==='project-synthesis-edit'){const project=el('evidence-project')?.value.trim(),previous=state.projectSynthesisEdits[project],draft=state.projectSynthesis;state.projectSynthesisEdits[project]={markdown:target.value,useGenerated:previous?.useGenerated||false,base:previous?.base||synthesisBase(draft.revision||draft.generated)};const preview=el('project-synthesis-root')?.querySelector('.synthesis-preview');if(preview)preview.innerHTML=modelAnswer(target.value,{},state.projectSynthesisEdits[project].base.sources,project);const adopt=el('project-synthesis-root')?.querySelector('[data-action="project-synthesis-adopt"]');if(adopt)adopt.disabled=true;}if(target.matches('.matrix-cell-value,.matrix-cell-status')){const project=el('evidence-project')?.value.trim(),key=matrixDraftKey(project,target.dataset.matrixPaper,target.dataset.matrixField),cell=target.closest('td'),draft=state.evidenceMatrixDrafts[key]||{},status=cell?.querySelector('.matrix-cell-status');if(target.matches('.matrix-cell-value')&&status)status.value='unknown';draft.value=cell?.querySelector('.matrix-cell-value')?.value??draft.value??'';draft.status=status?.value??draft.status??'unknown';state.evidenceMatrixDrafts[key]=draft;}});
  el('comparison-content').addEventListener('change',event=>{if(event.target.id==='evidence-project'){state.evidenceProject=event.target.value.trim();state.evidenceMatrixProject='';loadEvidenceMatrix(state.evidenceProject);loadProjectSynthesis(state.evidenceProject);}});
  el('reset').addEventListener('click',()=>{Object.assign(state,{category:'',kind:'',year:'',studyType:'',readingStatus:'',query:'',routeKeys:null,routeName:'',focusKey:null,limit:24,externalResults:[],externalLoading:false});syncFilters();renderResults();});
  el('job-filter').addEventListener('change',event=>{state.jobsFilter=event.target.value;renderOverview();renderJobs();});
  el('results').addEventListener('change',async event=>{const box=event.target;if(box.matches('.reading-status')){const card=box.closest('.reading-tools'),note=card?.querySelector('.reading-note')?.value||'';await runAction(async()=>{await post('/api/document-state',{key:box.dataset.key,readingStatus:box.value,readingNote:note});toast('已保存阅读状态与笔记。');await getState();});return;}if(!box.matches('.compare-box'))return;const next=state.comparison.filter(key=>key!==box.dataset.key);if(box.checked&&next.length>=12){box.checked=false;toast('最多选择十二篇，请先移除一篇。');return;}state.comparison=box.checked?[...next,box.dataset.key]:next;renderCompareBar();renderResults();});
  el('home-query').addEventListener('keydown',event=>{if(event.key==='Enter')el('home-search').click();});
  el('clear-compare').addEventListener('click',clearComparison);el('clear-compare-top').addEventListener('click',clearComparison);
  el('reader-page-num')?.addEventListener('change', event => {
    jumpToReaderPage(Number(event.target.value));
  });
  let readerScrollFrame = null;
  el('reader-viewport')?.addEventListener('scroll', () => {
    if (readerScrollFrame !== null) return;
    readerScrollFrame = requestAnimationFrame(() => {
      readerScrollFrame = null;
      updateVisibleReaderPage();
    });
  }, { passive: true });
  document.addEventListener('selectionchange', () => {
    if (state.view !== 'reader') return;
    const selection = window.getSelection();
    if (selection?.isCollapsed) {
      if (!readerTextDrag) clearReaderSelection();
      return;
    }
    scheduleReaderSelectionCapture();
  });
  document.addEventListener('copy', event => {
    if (state.view !== 'reader' || !readerState.selection || !event.clipboardData) return;
    event.clipboardData.setData('text/plain', readerState.selection.segments.map(segment => segment.text).join('\n\n'));
    event.preventDefault();
  });
  document.addEventListener('keydown', event => {
    if (state.view !== 'reader' || !readerState.docKey) return;
    if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (!window.getSelection()?.isCollapsed) return;
    const actions = {
      ArrowLeft: () => jumpToReaderPage(readerState.currentPage - 1),
      PageUp: () => jumpToReaderPage(readerState.currentPage - 1),
      ArrowRight: () => jumpToReaderPage(readerState.currentPage + 1),
      PageDown: () => jumpToReaderPage(readerState.currentPage + 1),
      Home: () => jumpToReaderPage(1),
      End: () => jumpToReaderPage(readerState.totalPages),
      '+': () => setReaderZoom(readerState.zoomScale + 0.2),
      '=': () => setReaderZoom(readerState.zoomScale + 0.2),
      '-': () => setReaderZoom(readerState.zoomScale - 0.2),
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)getState();});
  el('language-toggle').addEventListener('click',()=>setLanguage(uiLanguage==='en'?'zh':'en'));
  applyLanguage();
  getState();setInterval(()=>{if(!document.hidden)getState();},20000);
})();
