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
    const toggle = el('language-toggle');
    toggle.textContent = uiLanguage === 'en' ? '中文' : 'EN';
    toggle.setAttribute('aria-label', uiLanguage === 'en' ? '切换到中文' : 'Switch to English');
    toggle.setAttribute('aria-pressed', String(uiLanguage === 'en'));
    if (uiLanguage !== 'en') return;
    localizeNode(document.body);
  }
  async function setLanguage(language) {
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
  const state = { snapshot: null, docsSignature: '', summarySignature: '', languageSyncPending: false, view: 'library', category: '', kind: '', year: '', studyType: '', readingStatus: '', query: '', routeKeys: null, routeName: '', focusKey: null, comparison: [], compareFocus: '', searchReasons: {}, limit: 24, jobsFilter: 'all', searchMode: 'local', externalResults: [], externalLoading: false, paperAnswers: {}, paperDrafts: {}, paperOpen: new Set(), relatedResults: {}, synthesis: null, promptDirty: false, toastTimer: 0, translatorSettings: null };
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
      if (state.view === 'compare') renderComparison();
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
    if(!state.promptDirty && state.view!=='settings'){
      el('ai-output-language').value=state.snapshot?.settings?.summary_language || 'auto';
      renderPromptEditor();
    }
    if(state.view!=='settings'){
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
  let pendingViewNavigation=0;
  function scrollToTopSmooth(){
    if(window.scrollY<8||matchMedia('(prefers-reduced-motion: reduce)').matches){window.scrollTo({top:0,behavior:'auto'});return Promise.resolve();}
    return new Promise(resolve=>{
      let settled=false;
      const finish=()=>{if(settled)return;settled=true;document.removeEventListener('scrollend',finish);resolve();};
      document.addEventListener('scrollend',finish,{once:true});
      window.scrollTo({top:0,behavior:'smooth'});
      setTimeout(finish,700);
    });
  }
  async function navigateView(view){
    const request=++pendingViewNavigation;
    if(state.view!==view)await scrollToTopSmooth();
    if(request===pendingViewNavigation)setView(view);
  }
  function setView(view) {
    pendingViewNavigation++;
    const changed=state.view!==view;
    state.view=view;
    for(const name of ['home','library','compare','settings','reader']){const v=el(`${name}-view`);if(v)v.hidden=name!==view;}
    document.querySelectorAll('[data-view]').forEach(button=>{const active=button.dataset.view===view;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    el('compare-bar').hidden=view==='compare'||!state.comparison.length;
    if(view==='library') renderResults(); if(view==='compare')renderComparison();
    if(view==='settings') refreshTranslatorSettings();
    if(changed&&window.scrollY>8)window.scrollTo({top:0,behavior:'auto'});
  }
  function normalized(value){return text(value).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');}
  const queryGroups=[['单b细胞','singlebcell','singlehumanbcell','singlecellrtpcr','单细胞抗体'],['重轻链','配对测序','pairedvh','vhvl','pairedrepertoire'],['噬菌体','phage','fabonphage'],['核糖体展示','ribosomedisplay'],['哺乳动物展示','mammaliandisplay'],['cart','嵌合抗原受体','chimericantigenreceptor'],['持久性','persistence','记忆分化','memorydevelopment','持续性'],['合成受体','synnotch','syntheticnotch','syntheticreceptor'],['表位','epitope','免疫逃逸','escapemutation'],['pd1','程序性死亡受体1'],['lag3','淋巴细胞激活基因3'],['mrna疫苗','mrnavaccine','信使rna疫苗'],['端粒','telomere','telomerase','shelterin'],['紫草','shikonin','紫草素'],['紫杉醇','paclitaxel','taxus','baccatin'],['基因编辑','crispr','cas9'],['神经','neuron','brain','脑'],['微生物','microbial','microbiome','菌群'],['蛋白质降解','degrader','分子胶','molecularglue']];
  function relevance(row,query){const q=normalized(query);if(!q)return 0;const title=normalized([row.title,row.zhTitle,row.oneSentence].join(' ')),tags=normalized([row.category,...list(row.subtopics),...list(row.keywords),row.identifier,row.authors].join(' ')),body=normalized([row.title,row.zhTitle,row.oneSentence,row.question,row.method,...list(row.findings),row.useCase,row.studyModel,row.category,...list(row.subtopics),...list(row.keywords),row.authors,row.identifier,...list(row.flags)].join(' '));let score=(title.includes(q)?80:0)+(tags.includes(q)?80:0)+(body.includes(q)?20:0);for(const group of queryGroups)if(group.some(term=>q.includes(term))){if(group.some(term=>title.includes(term)||tags.includes(term)))score+=32;else if(group.some(term=>body.includes(term)))score+=12;}const terms=new Set(text(query).toLowerCase().match(/[a-z0-9]+|[\u3400-\u9fff]{2,}/g)||[]);for(const term of [...terms])if(/[\u3400-\u9fff]/.test(term)&&term.length>2)for(let i=0;i<term.length-1;i++)terms.add(term.slice(i,i+2));const stop=new Set(['如何','怎样','研究','文献','需要','什么','进行','有关','通过','一个','哪些','可以','找到']);for(const term of terms)if(!stop.has(term)&&term.length>1){const t=normalized(term);score+=(title.includes(t)?7:0)+(tags.includes(t)?8:0)+(body.includes(t)?2:0);}return score;}
  function matchTerms(query){const stop=new Set(['如何','怎样','研究','文献','需要','什么','进行','有关','通过','一个','哪些','可以','找到']);return [...new Set((text(query).toLowerCase().match(/[a-z0-9]+(?:-[a-z0-9]+)*|[\u3400-\u9fff]{2,}/g)||[]).filter(term=>term.length>1&&!stop.has(term)))].sort((a,b)=>b.length-a.length);}
  function highlighted(value,query){const raw=text(value),terms=matchTerms(query);if(!terms.length)return esc(raw);const pattern=new RegExp(`(${terms.map(term=>term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')})`,'giu');return raw.split(pattern).map((part,index)=>index%2?`<mark>${esc(part)}</mark>`:esc(part)).join('');}
  function matchExplanation(row,query){if(!query.trim())return '';const groups=[['题名','title',[row.title,row.zhTitle].join(' ')],['关键词','keywords',[row.category,...list(row.subtopics),...list(row.keywords)].join(' ')],['摘要内容','summary',[row.oneSentence,row.summary,row.question,row.method,...list(row.findings),row.useCase,row.limitations].join(' ')],['作者与标识符','authors and identifiers',[row.authors,row.identifier].join(' ')]];const terms=matchTerms(query).map(normalized).filter(Boolean),whole=normalized(query),found=groups.filter(([, ,value])=>{const haystack=normalized(value);return (whole&&haystack.includes(whole))||terms.some(term=>haystack.includes(term));}).map(([zh,en])=>uiLanguage==='en'?en:zh);return found.length?`${t('匹配依据：','Match basis: ')}${found.join(' · ')}`:'';}
  function filteredDocs(){const rows=safeArray(state.snapshot?.documents);if(state.focusKey)return rows.filter(row=>row.key===state.focusKey);const candidates=rows.filter(row=>(!state.category||row.category===state.category)&&(!state.kind||row.kind===state.kind)&&(!state.year||text(row.year)===state.year)&&(!state.studyType||row.studyType===state.studyType)&&(!state.readingStatus||(row.readingStatus||'unread')===state.readingStatus)&&(!state.routeKeys||state.routeKeys.includes(row.key)));const found=candidates.map(row=>({row,score:relevance(row,state.query)})).filter(item=>!state.query.trim()||item.score>0);found.sort((a,b)=>state.query.trim()?b.score-a.score||Number(b.row.year)-Number(a.row.year):state.routeKeys?state.routeKeys.indexOf(a.row.key)-state.routeKeys.indexOf(b.row.key):Number(b.row.year)-Number(a.row.year)||text(a.row.zhTitle||a.row.title).localeCompare(text(b.row.zhTitle||b.row.title),'zh-CN'));state.searchReasons=Object.fromEntries(found.map(item=>[item.row.key,matchExplanation(item.row,state.query)]));return found.map(item=>item.row);}
  function renderLibraryData(){const docs=safeArray(state.snapshot?.documents), guides=safeArray(state.snapshot?.guides), routes=safeArray(state.snapshot?.routes);for(const name of ['category','year','studyType']){const select=el(name),keep=state[name];select.replaceChildren(new Option(name==='category'?'全部主题':name==='year'?'全部年份':'全部研究形式',''));const values=name==='category'?guides.map(x=>x.name).filter(Boolean):name==='year'?[...new Set(docs.map(x=>x.year).filter(Boolean))].sort().reverse():[...new Set(docs.map(x=>x.studyType).filter(Boolean))].sort();values.forEach(value=>select.add(new Option(value,value)));select.value=values.includes(keep)?keep:'';state[name]=select.value;}el('readingStatus').value=state.readingStatus;renderTopics();renderResults();applyLanguage();}
  function renderTopics(){const guides=safeArray(state.snapshot?.guides),routes=safeArray(state.snapshot?.routes),docs=safeArray(state.snapshot?.documents);el('topic-grid').innerHTML=guides.map(guide=>`<button class="topic-item" data-category="${esc(guide.name)}">${esc(guide.name)}<small>${docs.filter(row=>row.category===guide.name).length} 篇 · 查看导读</small></button>`).join('')||'<span class="muted">暂无主题导读</span>';el('question-grid').innerHTML=routes.map((route,index)=>`<button class="question-item" data-route="${index}">${esc(route.title)}<small>${esc(route.description||'')} · ${safeArray(route.keys).length} 篇</small></button>`).join('')||'<span class="muted">暂无问题路线</span>';}
  function attachmentKey(row){const match=text(row.attachmentURL).match(/\/items\/([^?/#]+)/);return match?decodeURIComponent(match[1]):'';}
  function modelAnswer(markdown,row,sources=[]){
    const key=attachmentKey(row);
    const sourceMap=Object.fromEntries(safeArray(sources).map(source=>[source.id,source]));
    return esc(markdown).replace(/\[(P\d+)\]/g,(label,id)=>{const source=sourceMap[id],linked=source&&source.zoteroLinked!==false&&/^[A-Za-z0-9]+$/.test(source.key||'');return source?(linked?`<a class="paper-cite" href="zotero://select/library/items/${encodeURIComponent(source.key)}" title="${esc(source.title||id)}">${label}</a>`:`<span class="paper-cite" title="${esc(source.title||id)}">${label}</span>`):`<span class="paper-cite">${label}</span>`;}).replace(/\[(?:Page|P\.)\s*(\d+)\]/gi,(label,page)=>key?`<a class="page-cite" href="zotero://open-pdf/library/items/${encodeURIComponent(key)}?page=${page}">${label}</a>`:`<span class="page-cite">${label}</span>`).replace(/\n/g,'<br>');
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
  function showDocument(key){Object.assign(state,{focusKey:key,routeKeys:null,routeName:'',category:'',kind:'',year:'',studyType:'',readingStatus:'',query:'',limit:24,searchMode:'local'});syncFilters();setView('library');renderResults();window.scrollTo({top:0,behavior:'smooth'});}
  function syncFilters(){for(const name of ['category','kind','year','studyType','readingStatus'])el(name).value=state[name]||'';el('query').value=state.query;}
  function renderCompareBar(message=''){const docs=byKey();state.comparison=state.comparison.filter(key=>docs[key]);el('compare-bar').hidden=!state.comparison.length;el('compare-tab-count').textContent=state.comparison.length?`(${state.comparison.length})`:'';el('compare-message').textContent=message||`已选择 ${state.comparison.length} 篇：${state.comparison.map(key=>docs[key]?.zhTitle||docs[key]?.title||key).join(' / ')}`;el('open-comparison').disabled=state.comparison.length<2;document.querySelectorAll('.compare-box').forEach(box=>{box.checked=state.comparison.includes(box.dataset.key);box.closest('.card')?.classList.toggle('selected',box.checked);}); renderSummaryBatch();applyLanguage();}
  function renderComparison(){
    const docs=byKey(),selected=state.comparison.map(key=>docs[key]).filter(Boolean);
    if(!selected.length){el('comparison-content').innerHTML=`<div class="empty">${esc(t('在“检索与导读”中勾选 2–12 篇文献，即可查看对比或生成小综述。','Select 2–12 papers in Search & Guides to compare them or create a mini-review.'))}</div>`;applyLanguage();return;}
    const val=(row,key,fallback='')=>esc(row[key]||fallback),dossierFor=row=>state.snapshot?.dossiers?.[row.key]||null;
    const fields=[['一句话摘要',row=>val(row,'oneSentence',row.summary||'未提供')],['研究问题',row=>val(row,'question','未提供')],['研究模型',row=>val(row,'studyModel','来源未明确说明')],['方法',row=>val(row,'method','未提供')],['主要发现',row=>list(row.findings).length?'<ul>'+list(row.findings).map(item=>`<li>${esc(item)}</li>`).join('')+'</ul>':'未提供'],['深读档案',row=>{const d=dossierFor(row);return d?`${esc(decisionLabel(d.readingDecision)||t('已生成','Generated'))} · ${t('大纲','Outline')} ${Number(d.outline)||0} · ${t('论证','Arguments')} ${Number(d.argument)||0} · ${t('方法','Methods')} ${Number(d.methodsAudit)||0}${d.coverage?` · ${Number(d.coverage.withEvidence)||0}/${Number(d.coverage.items)||0} ${t('条有证据','with evidence')}`:''}`:esc(t('未生成；对比将使用速读卡字段','Not generated; synthesis uses card fields'))}],['适用场景',row=>val(row,'useCase','未提供')],['已知边界',row=>val(row,'limitations','当前摘要未单列局限')],['摘要依据',row=>val(row,'basis','来源未提供')],['原文',row=>row.zoteroLinked!==false&&row.key&&/^[A-Za-z0-9]+$/.test(row.key)?`<a href="zotero://select/library/items/${encodeURIComponent(row.key)}">在 Zotero 定位 ↗</a>`:'未提供']];
    const signature=`${state.comparison.join('|')}::${state.compareFocus.trim()}`;
    const synthesis=state.synthesis?.signature===signature?state.synthesis:null;
    const comparisonTable='<div class="comparison-wrap"><table class="comparison"><thead><tr><th>比较维度</th>'+selected.map(row=>`<th>${esc(row.zhTitle||row.title||'题名未提供')}<br><small>${esc(row.year||'年份未详')} · ${esc(row.studyType||'文献')}</small></th>`).join('')+'</tr></thead><tbody>'+fields.map(([label,value])=>'<tr><th scope="row">'+label+'</th>'+selected.map(row=>'<td>'+value(row)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
    const ledger='<div class="evidence-ledger">'+selected.map((row,index)=>`<article class="ledger-item"><strong>P${index+1} · ${esc(row.zhTitle||row.title||row.key)}</strong><span>${esc(row.year||'年份未详')} · ${esc(row.studyType||'文献')}</span><p>${esc(row.oneSentence||row.summary||'暂无摘要。')}</p><small>${row.question||row.method||list(row.findings).length?esc([row.question,row.method].filter(Boolean).join(' · ')):esc(t('仅题录，不作为结论依据','Metadata only; cannot support a conclusion'))}</small></article>`).join('')+'</div>';
    el('comparison-content').innerHTML=`<div class="focus-box"><label for="compare-focus">${esc(t('可选：综述聚焦问题','Optional: focus question'))}</label><textarea id="compare-focus" rows="2" placeholder="${esc(t('例如：这些研究在抗原表位结论上有哪些一致与冲突？','For example: where do these studies agree or conflict on antigen epitopes?'))}">${esc(state.compareFocus)}</textarea></div><div class="comparison-actions"><button class="btn primary" data-action="synthesize">${esc(t(selected.length>4?'生成聚焦小综述':'生成 AI 对比综述',selected.length>4?'Generate focused synthesis':'Generate AI synthesis'))}</button>${synthesis?`<button class="btn" data-action="copy-synthesis">${esc(t('复制 Markdown 报告','Copy Markdown report'))}</button><button class="btn" data-action="download-synthesis">${esc(t('下载 Markdown 报告','Download Markdown report'))}</button>`:''}</div>${selected.length<=4?comparisonTable:ledger}${synthesis?`<section class="synthesis"><h3>${esc(t('AI 证据综述','AI evidence synthesis'))}</h3><div class="model-answer">${modelAnswer(synthesis.markdown,{},synthesis.sources)}</div></section>`:''}`;
    applyLanguage();
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
    askingKeys: new Set(),
    pageObserver: null,
    openTabs: new Map(),
    preferredKey: null,
    tabsRestored: false,
  };

  function readerStored(name) {
    try { return localStorage.getItem(`scholarloom.reader.${name}`) || ''; } catch { return ''; }
  }

  function storeReaderValue(name, value) {
    try { localStorage.setItem(`scholarloom.reader.${name}`, String(value)); } catch { /* Local storage is optional. */ }
  }

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
    readerState.loadGeneration += 1;
    readerState.renderGeneration += 1;
    if (readerState.pageObserver) readerState.pageObserver.disconnect();
    readerState.pageObserver = null;
    readerState.renderTasks.forEach(task => { try { task.cancel(); } catch { /* Render already finished. */ } });
    readerState.renderTasks.clear();
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
    syncReaderTabState();
    cancelReaderWork();
    const generation = readerState.loadGeneration;
    const tab = readerTabRecord(key);
    readerState.docKey = key;
    readerState.preferredKey = key;
    readerState.doc = doc;
    readerState.figure = null;
    figureVersion = '';
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
    renderReaderExcerpts();
    el('reader-ask-btn').disabled = readerState.askingKeys.has(key);

    el('qa-selection-box').hidden = true;
    clearReaderTranslation();
    el('reader-qa-history').innerHTML = '';
    el('dossier-content').innerHTML = '';
    el('dossier-status').textContent = t('正在检查深读档案…', 'Checking the dossier…');
    refreshReadingMemory().catch(err => { if (generation === readerState.loadGeneration) toast(err.message); });
    refreshFigures().catch(err => { if (generation === readerState.loadGeneration) toast(err.message); });
    refreshDossier().catch(err => { if (generation === readerState.loadGeneration) toast(err.message); });

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

  function setupIntersectionObserver() {
    if (readerState.pageObserver) readerState.pageObserver.disconnect();
    const generation = readerState.loadGeneration;
    readerState.pageObserver = new IntersectionObserver((entries) => {
      if (generation !== readerState.loadGeneration) return;
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const pageNum = Number(visible.target.dataset.pageNumber);
      if (!pageNum) return;
      readerState.currentPage = pageNum;
      el('reader-page-num').value = pageNum;
      storeReaderValue(`page:${readerState.docKey}`, pageNum);
      syncReaderTabState();
      renderReaderPage(pageNum);
      releaseDistantPages(pageNum);
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
      const pageDiv = el(`reader-page-${pageNum}`);
      if (pageDiv) {
        pageDiv.innerHTML = '';
        pageDiv.classList.remove('is-loading');
        pageDiv.removeAttribute('aria-busy');
      }
      readerState.renderedPages.delete(pageNum);
    }
  }

  async function renderReaderPage(pageNum) {
    const pageDiv = el(`reader-page-${pageNum}`);
    if (!pageDiv || !readerState.pdfDoc) return;
    if (readerState.renderedPages.has(pageNum)) return;
    readerState.renderedPages.add(pageNum);
    const generation = readerState.renderGeneration;
    const pdfDoc = readerState.pdfDoc;

    try {
      pageDiv.querySelector('.render-error')?.remove();
      pageDiv.classList.add('is-loading');
      pageDiv.setAttribute('aria-busy', 'true');
      const page = await pdfDoc.getPage(pageNum);
      if (generation !== readerState.renderGeneration || pdfDoc !== readerState.pdfDoc) return;
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
      if (generation !== readerState.renderGeneration || pdfDoc !== readerState.pdfDoc) return;
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
      if (readerState.pdfjsLib.TextLayer) {
        const textLayer = new readerState.pdfjsLib.TextLayer({
          textContentSource: textContent,
          container: textLayerDiv,
          viewport,
        });
        await textLayer.render();
      }
    } catch (e) {
      if (generation !== readerState.renderGeneration || pdfDoc !== readerState.pdfDoc || e?.name === 'RenderingCancelledException') return;
      console.warn('Page render error:', pageNum, e);
      readerState.renderedPages.delete(pageNum);
      readerState.renderTasks.delete(pageNum);
      pageDiv.innerHTML = `<div class="render-error" role="status">
        <span>${esc(t('本页加载失败','This page failed to render'))}</span>
        <button class="btn" data-retry-page="${pageNum}">${esc(t('重试','Retry'))}</button>
      </div>`;
    } finally {
      if (generation === readerState.renderGeneration) {
        pageDiv.classList.remove('is-loading');
        pageDiv.removeAttribute('aria-busy');
      }
    }
  }

  async function setReaderZoom(newScale) {
    readerState.zoomScale = Math.max(0.6, Math.min(2.5, newScale));
    syncReaderTabState();
    el('reader-zoom-level').textContent = `${Math.round(readerState.zoomScale * 100)}%`;
    readerState.renderGeneration += 1;
    readerState.renderTasks.forEach(task => { try { task.cancel(); } catch {} });
    readerState.renderTasks.clear();
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
    pageNum = Math.max(1, Math.min(readerState.totalPages || 1, Number(pageNum) || 1));
    readerState.currentPage = pageNum;
    el('reader-page-num').value = pageNum;
    storeReaderValue(`page:${readerState.docKey}`, pageNum);
    syncReaderTabState();
    const target = el(`reader-page-${pageNum}`);
    if (target) {
      renderReaderPage(pageNum);
      releaseDistantPages(pageNum);
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      target.classList.remove('pulse');
      void target.offsetWidth;
      target.classList.add('pulse');
      setTimeout(() => target.classList.remove('pulse'), 1800);
    }
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
    const key = readerState.docKey, project = readingProject();
    const response = await fetch(`/api/figures?${new URLSearchParams({paper_id:key, project})}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '无法读取图像笔记。');
    if (key !== readerState.docKey || project !== readingProject()) return;
    figureVersion = data.pdf_version;
    figureItems = safeArray(data.figures);
    el('figure-list').innerHTML = figureItems.map(item => `<article>
      <strong>${esc(item.figure_number)}</strong> · ${esc(t('第','Page'))} ${Number(item.page)} ${item.stale ? esc(t('· PDF 已改变，选区已过期','· PDF changed; selection is stale')) : ''}
      <p>${esc(item.note)}</p><button class="text-button" data-open-figure="${esc(item.id)}" ${item.stale ? 'disabled' : ''}>${esc(t('查看','Open'))}</button>
      <button class="text-button" data-delete-figure="${esc(item.id)}">${esc(t('删除','Delete'))}</button></article>`).join('');
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
    if (box) box.hidden = true;
    clearReaderTranslation();
    window.getSelection()?.removeAllRanges();
  }

  function readerSelectionPages(selection) {
    return [...new Set(safeArray(selection?.segments).map(segment => Number(segment.page)).filter(Boolean))];
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
    readerState.selection = { segments };
    const pages = readerSelectionPages(readerState.selection);
    const combined = segments.map(segment => segment.text).join(' ');
    const box = el('qa-selection-box');
    const textEl = el('qa-selection-text');
    if (box && textEl) {
      box.hidden = false;
      textEl.textContent = `${t('第','Page ')} ${pages.join(', ')} ${t('页','')} · ${combined.length} ${t('字','chars')} · ${segments.length} ${t('段','segments')}\n"${combined.slice(0, 240)}${combined.length > 240 ? '…' : ''}"`;
    }
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

  async function refreshReadingMemory() {
    const key = readerState.docKey, project = readingProject();
    const result = await post('/api/reading-memory', {project, paper:key});
    if (readerState.docKey !== key || readingProject() !== project) return;
    el('reader-memory-list').innerHTML = safeArray(result.memories).map(m =>
      `<p>${esc(m.kind)}: ${esc(m.content)} <button class="text-button" data-edit-memory="${m.id}">${esc(t('修订','Revise'))}</button> <button class="text-button" data-forget-memory="${m.id}">${esc(t('删除','Delete'))}</button></p>`).join('');
    readerState.memories = result.memories;
    readerState.excerpts = safeArray(result.excerpts);
    syncReaderTabState();
    renderReaderExcerpts();
    el('reader-qa-history').innerHTML = safeArray(result.history).map(e => {
      const pages = readerSelectionPages(e.evidence?.selection);
      const selectionNote = e.role === 'user' && pages.length
        ? `<span class="qa-selection-note">${esc(t('引用第','Selected page(s)'))} ${pages.join(', ')} ${esc(t('页',''))}</span>` : '';
      return `<div class="qa-bubble ${e.role === 'user' ? 'user-q' : 'ai-a'}">${selectionNote}${e.role === 'user' ? esc(e.content) : formatReaderAnswer(e.content, e.evidence?.citations)} <button class="text-button" data-delete-event="${e.id}">${esc(t('删除','Delete'))}</button></div>`;
    }).join('');
  }

  document.addEventListener('change', event => {
    if (event.target.id === 'reader-project') {
      if (readerState.docKey) storeReaderValue(`project:${readerState.docKey}`, readingProject());
      readerState.replaces = null;
      el('reader-qa-history').innerHTML = '';
      refreshReadingMemory().catch(err => toast(err.message));
      refreshFigures().catch(err => toast(err.message));
    }
  });
  document.addEventListener('click', async event => {
    const button = event.target.closest('button');
    if (!button) return;
    try {
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
    const questionInput = el('reader-ask-input');
    const rawQuestion = questionInput.value.trim();
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

    questionInput.value = '';
    clearReaderSelection();

    readerState.askingKeys.add(requestKey);
    el('reader-ask-btn').disabled = true;
    try {
      const result = await post('/api/paper-chat', {
        key: requestKey,
        project: requestProject,
        use_memory: el('reader-use-memory').checked,
        question,
        preset,
        selection,
      });
      if (readerState.docKey === requestKey && readingProject() === requestProject) {
        readerState.evidence = new Map(safeArray(result.evidence).map(item => [item.id, item]));
        syncReaderTabState();
        aiBubble.innerHTML = formatReaderAnswer(result.answer || '', result.citations);
        const b = result.budget;
        const c = result.coverage;
        const context = b ? `${t('本次：','This turn: ')}${b.memory_ids.length} ${t('条记忆，','memories, ')}${b.history_ids.length} ${t('条历史；正文','history entries; evidence ')}${b.evidence_bytes} bytes${b.evidence_truncated ? t('（已截取）',' (truncated)') : ''}` : '';
        const citations = c ? `${t('；证据引用','; citations ')}${c.located}/${c.citation_count}${c.unsupported ? ` (${c.unsupported} ${t('未定位','unsupported')})` : ''}` : '';
        el('reader-context-report').textContent = context + citations;
        refreshReadingMemory().catch(err => toast(err.message));
      }
    } catch (err) {
      if (aiBubble.isConnected && readerState.docKey === requestKey) {
        aiBubble.textContent = t('问答失败：', 'Q&A failed: ') + err.message;
        aiBubble.classList.add('error');
      }
    } finally {
      readerState.askingKeys.delete(requestKey);
      if (readerState.docKey === requestKey) el('reader-ask-btn').disabled = false;
    }
  }

  function syncLibraryInputs(){syncFilters();}
  document.addEventListener('click',async event=>{const button=event.target.closest('button');if(!button)return;if(button.dataset.view){if(button.dataset.view==='reader'&&!readerState.docKey&&readerState.openTabs.size){const key=readerState.openTabs.has(readerState.preferredKey)?readerState.preferredKey:readerState.openTabs.keys().next().value;await openReader(key);return;}await navigateView(button.dataset.view);return;}if(button.dataset.jobStatus!==undefined){state.jobsFilter=button.dataset.jobStatus;el('job-filter').value=state.jobsFilter;renderOverview();renderJobs();return;}if(button.dataset.category!==undefined){state.category=button.dataset.category;state.kind='';state.year='';state.studyType='';state.readingStatus='';state.query='';state.routeKeys=null;state.routeName='';state.focusKey=null;state.limit=24;state.searchMode='local';syncLibraryInputs();setView('library');renderResults();return;}if(button.dataset.route!==undefined){const route=safeArray(state.snapshot?.routes)[Number(button.dataset.route)];if(route)Object.assign(state,{routeKeys:safeArray(route.keys),routeName:route.title||'阅读路线',focusKey:null,category:'',kind:'',year:'',studyType:'',readingStatus:'',query:'',limit:24,searchMode:'local'});syncLibraryInputs();setView('library');renderResults();return;}if(button.dataset.focus){showDocument(button.dataset.focus);return;}if(button.id==='scan-new'||button.id==='scan-existing'){await runAction(async()=>{await post('/api/scan',button.id==='scan-existing'?{include_existing:true}:{});toast(button.id==='scan-existing'?'已开始识别已有下载文件。':'已开始扫描新增文件。');await getState();});return;}if(button.id==='open-comparison'){setView('compare');return;}if(button.id==='clear-compare'||button.id==='clear-compare-top'){clearComparison();return;}if(button.id==='load-more'){state.limit+=24;renderResults();return;}if(button.id==='home-search'){state.query=el('home-query').value;state.category='';state.kind='';state.year='';state.studyType='';state.readingStatus='';state.routeKeys=null;state.routeName='';state.focusKey=null;state.searchMode='local';syncLibraryInputs();setView('library');renderResults();return;}if(button.id==='authorize'){await runAction(async()=>{toast('请在 Zotero 弹窗中选择“始终允许”。该权限可随时在 Zotero 中撤销。');await post('/api/authorize',{});await getState();});return;}if(button.id==='open-folder'){await runAction(async()=>{await post('/api/open-folder',{});toast('已打开文献备份文件夹。');});return;}if(button.id==='save-settings'){await saveSettings();return;}if(button.id==='test-model'){await runAction(async()=>{const result=await post('/api/model-test',{});setMessage(result.message||'摘要模型连接成功。');});return;}if(button.dataset.action){await runAction(async()=>{const action=button.dataset.action;if(action==='open-file'){await post('/api/open-job',{id:button.dataset.id});toast('已打开源文件。');}else if(action==='confirm'){await post('/api/confirm',{id:button.dataset.id});toast('已确认题录，正在保存到本地资料库。');await getState();}else if(action==='retry'){await post('/api/retry',{id:button.dataset.id});toast('已重新加入处理队列。');await getState();}else if(action==='ignore'){await post('/api/ignore',{id:button.dataset.id});toast('已忽略此记录。');await getState();}else if(action==='summarize'){const row=safeArray(state.snapshot?.documents).find(item=>item.key===button.dataset.key);await post('/api/summarize',{key:button.dataset.key});toast(row&&summaryPending(row)?'已开始生成速读。':'已请求重新生成摘要。');await getState();}});}});
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
      el('reader-sidebar-notes').hidden=true;
      el('reader-sidebar-figure').hidden=true;
      el('reader-sidebar-assistant').hidden=false;
      return;
    }
    if(button.id==='reader-back-btn'){
      await navigateView('library');
      return;
    }
    if(button.id==='reader-open-figure'){
      el('reader-sidebar-assistant').hidden=true;
      el('reader-sidebar-notes').hidden=true;
      el('reader-sidebar-figure').hidden=false;
      return;
    }
    if(button.id==='reader-back-assistant'){
      el('reader-sidebar-figure').hidden=true;
      el('reader-sidebar-notes').hidden=true;
      el('reader-sidebar-assistant').hidden=false;
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
      await runAction(async()=>{await post('/api/figures',figurePayload());await refreshFigures();toast(t('图像笔记已保存。','Figure note saved.'));});
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
      jumpToReaderPage(page);
      const item = readerState.evidence.get(button.dataset.evidence);
      if (item) setTimeout(() => showEvidenceRects(page, item.rects), 260);
      return;
    }
    if(button.classList.contains('page-cite')&&button.dataset.page){
      jumpToReaderPage(Number(button.dataset.page));
      return;
    }
    if(button.classList.contains('reader-sidebar-tab')){
      document.querySelectorAll('.reader-sidebar-tab').forEach(t=>t.classList.remove('active'));
      button.classList.add('active');
      const target=button.dataset.sidebarTab;
      el('reader-sidebar-assistant').hidden=target!=='assistant';
      el('reader-sidebar-notes').hidden=target!=='notes';
      el('reader-sidebar-figure').hidden=true;
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
      await runAction(async()=>{await post('/api/settings',{prompt_presets:promptPayload()});state.promptDirty=false;toast('提示词已保存。');await getState();});return;
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
      const keys=[...state.comparison],focus=state.compareFocus.trim();toast('正在综合证据台账…');
      await runAction(async()=>{const result=await post('/api/compare-synthesis',{keys,focus});state.synthesis={signature:`${keys.join('|')}::${focus}`,markdown:result.markdown,sources:safeArray(result.sources)};renderComparison();toast('对比综述已生成。');});return;
    }
    if(button.dataset.action==='copy-synthesis'&&state.synthesis){
      await navigator.clipboard.writeText(state.synthesis.markdown);toast('已复制 Markdown 报告。');return;
    }
    if(button.dataset.action==='download-synthesis'&&state.synthesis){
      const blob=new Blob([state.synthesis.markdown],{type:'text/markdown;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download=`scholarloom-evidence-${new Date().toISOString().slice(0,10)}.md`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),0);toast('Markdown 报告已下载。');return;
    }
  });
  async function runAction(action){try{await action();}catch(error){toast(error.message);}}
  async function saveSettings(){const raw=el('model-url').value.trim()||'https://api.openai.com/v1';let parsed;try{parsed=new URL(raw);}catch{setMessage('API 地址格式无效。',true);return;}const loopback=['localhost','127.0.0.1','::1','[::1]'].includes(parsed.hostname);if(parsed.protocol!=='https:'&&!(parsed.protocol==='http:'&&loopback)){setMessage('API 地址须使用 HTTPS；仅本机回环地址可以使用 HTTP。',true);return;}const payload={watch_folders:el('watch-folders').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean),watch_enabled:el('watch-enabled').checked,model_url:raw,model_name:el('model-name').value.trim(),auto_summary:el('auto-summary').checked,summary_language:el('ai-output-language').value,ui_language:uiLanguage,prompt_presets:promptPayload()};const key=el('model-key').value;if(key)payload.model_key=key;await runAction(async()=>{await post('/api/settings',payload);el('model-key').value='';state.promptDirty=false;setMessage('设置已保存。');await getState();});}
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
  el('prompt-editor').addEventListener('input',()=>{state.promptDirty=true;});
  el('results').addEventListener('input',event=>{const box=event.target.closest('[data-ask-question]');if(box)state.paperDrafts[box.dataset.askQuestion]=box.value;});
  el('comparison-content').addEventListener('input',event=>{if(event.target.id==='compare-focus')state.compareFocus=event.target.value;});
  el('reset').addEventListener('click',()=>{Object.assign(state,{category:'',kind:'',year:'',studyType:'',readingStatus:'',query:'',routeKeys:null,routeName:'',focusKey:null,limit:24,externalResults:[],externalLoading:false});syncFilters();renderResults();});
  el('job-filter').addEventListener('change',event=>{state.jobsFilter=event.target.value;renderOverview();renderJobs();});
  el('results').addEventListener('change',async event=>{const box=event.target;if(box.matches('.reading-status')){const card=box.closest('.reading-tools'),note=card?.querySelector('.reading-note')?.value||'';await runAction(async()=>{await post('/api/document-state',{key:box.dataset.key,readingStatus:box.value,readingNote:note});toast('已保存阅读状态与笔记。');await getState();});return;}if(!box.matches('.compare-box'))return;const next=state.comparison.filter(key=>key!==box.dataset.key);if(box.checked&&next.length>=12){box.checked=false;toast('最多选择十二篇，请先移除一篇。');return;}state.comparison=box.checked?[...next,box.dataset.key]:next;renderCompareBar();renderResults();});
  el('home-query').addEventListener('keydown',event=>{if(event.key==='Enter')el('home-search').click();});
  el('clear-compare').addEventListener('click',clearComparison);el('clear-compare-top').addEventListener('click',clearComparison);
  el('reader-page-num')?.addEventListener('change', event => {
    jumpToReaderPage(Number(event.target.value));
  });
  document.addEventListener('selectionchange', () => {
    if (state.view !== 'reader') return;
    captureReaderSelection();
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
