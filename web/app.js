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
  const state = { snapshot: null, docsSignature: '', summarySignature: '', languageSyncPending: false, view: 'home', category: '', kind: '', year: '', studyType: '', readingStatus: '', query: '', routeKeys: null, routeName: '', focusKey: null, comparison: [], compareFocus: '', searchReasons: {}, limit: 24, jobsFilter: 'all', searchMode: 'local', externalResults: [], externalLoading: false, paperAnswers: {}, paperDrafts: {}, paperOpen: new Set(), relatedResults: {}, synthesis: null, promptDirty: false, toastTimer: 0 };
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
      if (docsSignature !== state.docsSignature) { state.docsSignature = docsSignature; renderLibraryData(); }
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
  function renderOverview() {
    const docs=safeArray(state.snapshot?.documents), jobs=safeArray(state.snapshot?.jobs);
    const count=key=>jobs.filter(job=>job.status===key).length;
    el('overview-stats').innerHTML=`<div class="stat stat-feature"><strong>${docs.length}</strong><span>可检索文献</span></div><div class="stat"><strong>${docs.filter(row=>row.kind==='journalArticle').length}</strong><span>期刊文献</span></div><div class="stat"><strong>${docs.filter(row=>row.kind==='patent').length}</strong><span>专利</span></div><div class="stat"><strong>${count('ready')}</strong><span>待导入</span></div><div class="stat ${count('review')?'needs-attention':''}"><strong>${count('review')}</strong><span>待核对</span></div>`;
    const activeStatuses=statuses.map(([key,label])=>({key,label,count:count(key)})).filter(item=>item.count);
    el('progress-grid').innerHTML=activeStatuses.length?activeStatuses.map(item=>`<button type="button" class="progress ${state.jobsFilter===item.key?'selected':''}" data-job-status="${esc(item.key)}" aria-pressed="${state.jobsFilter===item.key}"><span>${esc(item.label)}</span><strong>${item.count}</strong></button>`).join('')+`<button type="button" class="progress progress-all ${state.jobsFilter==='all'?'selected':''}" data-job-status="all" aria-pressed="${state.jobsFilter==='all'}"><span>${esc(t('全部状态','All statuses'))}</span><strong>${jobs.length}</strong></button>`:`<div class="progress-empty"><span>${esc(t('当前没有处理中的任务','No active workflow items'))}</span><button type="button" data-job-status="all">${esc(t('查看全部','View all'))}</button></div>`;
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
    const rows=[['Zotero',h.zotero?'正常':'未连接',h.zotero],['持续授权',h.authorized?'正常':'未授权',h.authorized],['文件监看',!watching?'已暂停':h.watcher?'运行中':'未运行',watching&&h.watcher],['摘要模型',h.model?'已配置':'未配置',h.model]];
    el('health-status').innerHTML=rows.map(([name,label,ok])=>`<span class="health-item ${ok?'ok':''}">${name}：${label}</span>`).join('');
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
    box.hidden=false;
    const signature=`${summary.status}\n${message}`;
    if(state.summarySignature&&signature!==state.summarySignature&&(summary.status==='done'||summary.status==='error'))toast(box.textContent);
    state.summarySignature=signature;
    applyLanguage();
  }
  function renderJobs() {
    const all=safeArray(state.snapshot?.jobs), jobs=state.jobsFilter==='all'?all:all.filter(job=>job.status===state.jobsFilter);
    el('job-count').textContent=`${jobs.length} 条`;
    if(!jobs.length){el('jobs').innerHTML='<div class="empty">当前没有匹配记录。</div>';applyLanguage();return;}
    el('jobs').innerHTML=jobs.map((job,index)=>{
      const canRetry=['review','error','waiting_zotero'].includes(job.status);
      const canConfirm=job.canConfirm;
      const canIgnore=!['imported','duplicate','excluded'].includes(job.status);
      const updated=formatUpdated(job.updated);
      return `<article class="job" data-status="${esc(job.status)}"><span class="job-order" aria-hidden="true">${String(index+1).padStart(2,'0')}</span><div class="job-main"><div class="job-name">${esc(job.name||job.path||'未命名文件')}</div><div class="job-title">${esc(job.title||job.path||'')}</div></div><div class="job-state"><span class="job-status">${esc(statusLabel(job.status))}</span>${updated?`<span class="job-time">${esc(updated)}</span>`:''}</div><div class="job-note">${esc(job.reason||'')}</div><div class="job-actions">${canConfirm?`<button data-action="confirm" data-id="${esc(job.id)}">确认导入</button>`:''}${canRetry?`<button data-action="retry" data-id="${esc(job.id)}">重试</button>`:''}${canIgnore?`<button data-action="ignore" data-id="${esc(job.id)}">忽略</button>`:''}</div></article>`;
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
    for(const name of ['home','library','compare','settings'])el(`${name}-view`).hidden=name!==view;
    document.querySelectorAll('[data-view]').forEach(button=>{const active=button.dataset.view===view;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    el('compare-bar').hidden=view==='compare'||!state.comparison.length;
    if(view==='library') renderResults(); if(view==='compare')renderComparison();
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
    return esc(markdown).replace(/\[(P\d+)\]/g,(label,id)=>{const source=sourceMap[id];return source?`<a class="paper-cite" href="${/^[A-Za-z0-9]+$/.test(source.key||'')?`zotero://select/library/items/${encodeURIComponent(source.key)}`:'#'}" title="${esc(source.title||id)}">${label}</a>`:`<span class="paper-cite">${label}</span>`;}).replace(/\[(?:Page|P\.)\s*(\d+)\]/gi,(label,page)=>key?`<a class="page-cite" href="zotero://open-pdf/library/items/${encodeURIComponent(key)}?page=${page}">${label}</a>`:`<span class="page-cite">${label}</span>`).replace(/\n/g,'<br>');
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
  function safeGuide(guide){const keys=safeArray(guide.reading), docs=byKey();return `<div class="guide"><h3>${esc(guide.name)}</h3><p>${esc(guide.summary||'')}</p><ul>${safeArray(guide.insights).map(item=>`<li>${esc(item)}</li>`).join('')}</ul><div class="reading-path">${keys.filter(key=>docs[key]).map((key,index)=>`<button class="reading-step" data-focus="${esc(key)}">${index+1}. ${esc(docs[key].zhTitle||docs[key].title||key)}</button>`).join('')}</div></div>`;}
  function cardMarkup(row){const key=esc(row.key),docs=byKey(),source=safeURL(row.sourceURL),attachment=safeURL(row.attachmentURL,true),locate=row.key&&/^[A-Za-z0-9]+$/.test(row.key)?`zotero://select/library/items/${encodeURIComponent(row.key)}`:'';const title=row.zhTitle||row.title||'题名未提供';const comparison=state.comparison.includes(row.key);return `<article class="card ${comparison?'selected':''}" id="doc-${key}"><div class="meta"><span>${esc(row.year||'年份未详')}</span>${row.studyType?`<span class="pill">${esc(row.studyType)}</span>`:''}${row.category?`<span class="pill">${esc(row.category)}</span>`:''}<span>${esc(row.source||'来源未详')}</span>${list(row.flags).map(flag=>`<span class="pill flag">${esc(text(flag).split('/').pop())}</span>`).join('')}</div><h3 class="zh-title">${highlighted(title,state.query)}</h3>${state.searchReasons[row.key]?`<div class="match-note">${esc(state.searchReasons[row.key])}</div>`:''}${row.title&&row.title!==title?`<p class="en-title" lang="en">${esc(row.title)}</p>`:''}<p class="one">${highlighted(row.oneSentence||row.summary||'暂无摘要。',state.query)}</p>${list(row.findings).length?`<ul class="findings">${list(row.findings).map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`:''}<div class="keywords">${[...list(row.subtopics),...list(row.keywords)].slice(0,12).map(item=>`<span class="keyword">${esc(item)}</span>`).join('')}</div><details><summary>研究问题、方法与使用场景</summary><dl>${row.authors?`<dt>作者</dt><dd>${esc(row.authors)}</dd>`:''}${row.question?`<dt>研究问题</dt><dd>${esc(row.question)}</dd>`:''}${row.method||row.studyModel?`<dt>方法与对象</dt><dd>${esc(row.method||'')}${row.studyModel?`<br>研究模型：${esc(row.studyModel)}`:''}</dd>`:''}${row.useCase?`<dt>可用于</dt><dd>${esc(row.useCase)}</dd>`:''}${row.limitations?`<dt>已知边界</dt><dd>${esc(row.limitations)}</dd>`:''}</dl><div class="source-note">摘要依据：${esc(row.basis||'来源未提供')}${row.identifier?` · ${esc(row.identifier)}`:''}</div><div class="related"><strong class="source-note">关联文献</strong>${list(row.related).map(rel=>docs[rel]?`<button data-focus="${esc(rel)}">${esc(docs[rel].zhTitle||docs[rel].title||rel)}</button>`:'').join('')}</div></details><details class="reading-tools"><summary>阅读进度与笔记</summary><div class="reading-controls"><select class="reading-status" data-key="${key}" aria-label="阅读状态"><option value="unread" ${(!row.readingStatus||row.readingStatus==='unread')?'selected':''}>未读</option><option value="reading" ${row.readingStatus==='reading'?'selected':''}>在读</option><option value="read" ${row.readingStatus==='read'?'selected':''}>已读</option></select><textarea rows="3" class="reading-note" data-key="${key}" placeholder="记录关键结论、疑问或后续实验">${esc(row.readingNote||'')}</textarea><button class="text-button" data-action="save-reading" data-key="${key}">保存笔记</button></div></details><div class="links">${locate?`<a href="${locate}">在 Zotero 定位 ↗</a>`:''}${attachment?`<a href="${esc(attachment)}">${esc(row.attachmentLabel||'打开附件')}</a>`:''}${source?`<a href="${esc(source)}" target="_blank" rel="noopener noreferrer">查看来源摘要 ↗</a>`:''}<label class="compare-label"><input type="checkbox" class="compare-box" data-key="${key}" ${comparison?'checked':''} aria-label="加入对比：${esc(title)}">加入对比</label><button class="text-button" data-action="summarize" data-key="${key}">重新生成摘要</button></div></article>`;}
  function renderResults(){
    if(!state.snapshot)return;
    renderSearchMode();
    const hintEl=el('result-hint');
    const submitBtn=el('search-submit');
    if(state.searchMode==='external'){
      el('result-count').textContent=state.externalLoading?t('正在检索开放学术图谱…','Searching open scholarly graphs...'):`${t('全网发现','Discover online')} · ${state.externalResults.length}`;
      if(hintEl)hintEl.textContent=t('支持查看原文出处与一键下载公开全文入库','View online records or add open-access papers to your library');
      if(submitBtn){
        if(state.externalLoading){submitBtn.setAttribute('disabled','true');submitBtn.textContent=t('检索中…','Searching...');}
        else{submitBtn.removeAttribute('disabled');submitBtn.textContent=t('搜索','Search');}
      }
      el('results').innerHTML=state.externalLoading?`<div class="empty">${esc(t('正在检索开放学术图谱…','Searching open scholarly graphs...'))}</div>`:state.externalResults.length?externalMarkup(state.externalResults):`<div class="empty">${esc(t('输入主题后查找全网开放文献。','Enter a topic to discover open literature online.'))}</div>`;
      el('load-more').hidden=true;el('guide-panel').hidden=true;el('active-route').hidden=true;renderCompareBar();applyLanguage();return;
    }
    if(hintEl)hintEl.textContent=t('勾选 2–12 篇可对比或生成小综述','Select 2–12 papers to compare or synthesize');
    if(submitBtn){submitBtn.removeAttribute('disabled');submitBtn.textContent=t('搜索','Search');}
    const rows=filteredDocs(),total=safeArray(state.snapshot.documents).length;
    el('result-count').textContent=`${t('找到','Found')} ${rows.length} / ${total} ${t('条文献','documents')}${state.focusKey?` · ${t('当前定位文献','focused document')}`:''}`;
    el('results').innerHTML=rows.length?rows.slice(0,state.limit).map(cardMarkup).join(''):`<div class="empty">${esc(t('没有找到匹配文献，可尝试缩短问题或清除筛选条件。','No matching literature. Try a shorter query or clear the filters.'))}</div>`;
    state.snapshot.documents.filter(row=>rows.slice(0,state.limit).some(item=>item.key===row.key)).forEach(row=>{const card=el(`doc-${row.key}`);if(card&&!card.querySelector('.card-tools'))card.insertAdjacentHTML('beforeend',cardToolsMarkup(row));});
    el('load-more').hidden=rows.length<=state.limit;const guide=safeArray(state.snapshot.guides).find(item=>item.name===state.category);el('guide-panel').hidden=!guide;el('guide-panel').innerHTML=guide?safeGuide(guide):'';el('active-route').hidden=!state.routeName&&!state.focusKey;el('active-route').textContent=state.routeName?`${t('阅读路线','Reading path')}：${state.routeName}`:state.focusKey?t('已定位文献；点击“重置”返回全部文献。','Document focused. Use Reset to return to the full list.'):'';renderCompareBar();applyLanguage();
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
  function renderCompareBar(message=''){const docs=byKey();state.comparison=state.comparison.filter(key=>docs[key]);el('compare-bar').hidden=!state.comparison.length;el('compare-tab-count').textContent=state.comparison.length?`(${state.comparison.length})`:'';el('compare-message').textContent=message||`已选择 ${state.comparison.length} 篇：${state.comparison.map(key=>docs[key]?.zhTitle||docs[key]?.title||key).join(' / ')}`;el('open-comparison').disabled=state.comparison.length<2;document.querySelectorAll('.compare-box').forEach(box=>{box.checked=state.comparison.includes(box.dataset.key);box.closest('.card')?.classList.toggle('selected',box.checked);});applyLanguage();}
  function renderComparison(){
    const docs=byKey(),selected=state.comparison.map(key=>docs[key]).filter(Boolean);
    if(!selected.length){el('comparison-content').innerHTML=`<div class="empty">${esc(t('在“检索与导读”中勾选 2–12 篇文献，即可查看对比或生成小综述。','Select 2–12 papers in Search & Guides to compare them or create a mini-review.'))}</div>`;applyLanguage();return;}
    const val=(row,key,fallback='')=>esc(row[key]||fallback);
    const fields=[['一句话摘要',row=>val(row,'oneSentence',row.summary||'未提供')],['研究问题',row=>val(row,'question','未提供')],['研究模型',row=>val(row,'studyModel','来源未明确说明')],['方法',row=>val(row,'method','未提供')],['主要发现',row=>list(row.findings).length?'<ul>'+list(row.findings).map(item=>`<li>${esc(item)}</li>`).join('')+'</ul>':'未提供'],['适用场景',row=>val(row,'useCase','未提供')],['已知边界',row=>val(row,'limitations','当前摘要未单列局限')],['摘要依据',row=>val(row,'basis','来源未提供')],['原文',row=>row.key&&/^[A-Za-z0-9]+$/.test(row.key)?`<a href="zotero://select/library/items/${encodeURIComponent(row.key)}">在 Zotero 定位 ↗</a>`:'未提供']];
    const signature=`${state.comparison.join('|')}::${state.compareFocus.trim()}`;
    const synthesis=state.synthesis?.signature===signature?state.synthesis:null;
    const comparisonTable='<div class="comparison-wrap"><table class="comparison"><thead><tr><th>比较维度</th>'+selected.map(row=>`<th>${esc(row.zhTitle||row.title||'题名未提供')}<br><small>${esc(row.year||'年份未详')} · ${esc(row.studyType||'文献')}</small></th>`).join('')+'</tr></thead><tbody>'+fields.map(([label,value])=>'<tr><th scope="row">'+label+'</th>'+selected.map(row=>'<td>'+value(row)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
    const ledger='<div class="evidence-ledger">'+selected.map((row,index)=>`<article class="ledger-item"><strong>P${index+1} · ${esc(row.zhTitle||row.title||row.key)}</strong><span>${esc(row.year||'年份未详')} · ${esc(row.studyType||'文献')}</span><p>${esc(row.oneSentence||row.summary||'暂无摘要。')}</p><small>${row.question||row.method||list(row.findings).length?esc([row.question,row.method].filter(Boolean).join(' · ')):esc(t('仅题录，不作为结论依据','Metadata only; cannot support a conclusion'))}</small></article>`).join('')+'</div>';
    el('comparison-content').innerHTML=`<div class="focus-box"><label for="compare-focus">${esc(t('可选：综述聚焦问题','Optional: focus question'))}</label><textarea id="compare-focus" rows="2" placeholder="${esc(t('例如：这些研究在抗原表位结论上有哪些一致与冲突？','For example: where do these studies agree or conflict on antigen epitopes?'))}">${esc(state.compareFocus)}</textarea></div><div class="comparison-actions"><button class="btn primary" data-action="synthesize">${esc(t(selected.length>4?'生成聚焦小综述':'生成 AI 对比综述',selected.length>4?'Generate focused synthesis':'Generate AI synthesis'))}</button>${synthesis?`<button class="btn" data-action="copy-synthesis">${esc(t('复制 Markdown 报告','Copy Markdown report'))}</button><button class="btn" data-action="download-synthesis">${esc(t('下载 Markdown 报告','Download Markdown report'))}</button>`:''}</div>${selected.length<=4?comparisonTable:ledger}${synthesis?`<section class="synthesis"><h3>${esc(t('AI 证据综述','AI evidence synthesis'))}</h3><div class="model-answer">${modelAnswer(synthesis.markdown,{},synthesis.sources)}</div></section>`:''}`;
    applyLanguage();
  }
  function clearComparison(){state.comparison=[];state.compareFocus='';state.synthesis=null;renderCompareBar();renderComparison();}
  function syncLibraryInputs(){syncFilters();}
  document.addEventListener('click',async event=>{const button=event.target.closest('button');if(!button)return;if(button.dataset.view){await navigateView(button.dataset.view);return;}if(button.dataset.jobStatus!==undefined){state.jobsFilter=button.dataset.jobStatus;el('job-filter').value=state.jobsFilter;renderOverview();renderJobs();return;}if(button.dataset.category!==undefined){state.category=button.dataset.category;state.kind='';state.year='';state.studyType='';state.readingStatus='';state.query='';state.routeKeys=null;state.routeName='';state.focusKey=null;state.limit=24;state.searchMode='local';syncLibraryInputs();setView('library');renderResults();return;}if(button.dataset.route!==undefined){const route=safeArray(state.snapshot?.routes)[Number(button.dataset.route)];if(route)Object.assign(state,{routeKeys:safeArray(route.keys),routeName:route.title||'阅读路线',focusKey:null,category:'',kind:'',year:'',studyType:'',readingStatus:'',query:'',limit:24,searchMode:'local'});syncLibraryInputs();setView('library');renderResults();return;}if(button.dataset.focus){showDocument(button.dataset.focus);return;}if(button.id==='scan-new'||button.id==='scan-existing'){await runAction(async()=>{await post('/api/scan',button.id==='scan-existing'?{include_existing:true}:{});toast(button.id==='scan-existing'?'已开始识别已有下载文件。':'已开始扫描新增文件。');await getState();});return;}if(button.id==='open-comparison'){setView('compare');return;}if(button.id==='clear-compare'||button.id==='clear-compare-top'){clearComparison();return;}if(button.id==='load-more'){state.limit+=24;renderResults();return;}if(button.id==='home-search'){state.query=el('home-query').value;state.category='';state.kind='';state.year='';state.studyType='';state.readingStatus='';state.routeKeys=null;state.routeName='';state.focusKey=null;state.searchMode='local';syncLibraryInputs();setView('library');renderResults();return;}if(button.id==='authorize'){await runAction(async()=>{toast('请在 Zotero 弹窗中选择“始终允许”。该权限可随时在 Zotero 中撤销。');await post('/api/authorize',{});await getState();});return;}if(button.id==='open-folder'){await runAction(async()=>{await post('/api/open-folder',{});toast('已打开文献备份文件夹。');});return;}if(button.id==='save-settings'){await saveSettings();return;}if(button.id==='test-model'){await runAction(async()=>{const result=await post('/api/model-test',{});setMessage(result.message||'摘要模型连接成功。');});return;}if(button.dataset.action){await runAction(async()=>{const action=button.dataset.action;if(action==='confirm'){await post('/api/confirm',{id:button.dataset.id});toast('已确认题录，等待导入 Zotero。');await getState();}else if(action==='retry'){await post('/api/retry',{id:button.dataset.id});toast('已重新加入处理队列。');await getState();}else if(action==='ignore'){await post('/api/ignore',{id:button.dataset.id});toast('已忽略此记录。');await getState();}else if(action==='summarize'){await post('/api/summarize',{key:button.dataset.key});toast('已请求重新生成摘要。');await getState();}});}});
  document.addEventListener('click',async event=>{
    const button=event.target.closest('button');
    if(!button)return;
    if(button.id==='search-mode-local'){
      state.searchMode='local';state.externalLoading=false;renderResults();return;
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
  el('results').addEventListener('change',async event=>{const box=event.target;if(box.matches('.reading-status')){const card=box.closest('.reading-tools'),note=card?.querySelector('.reading-note')?.value||'';await runAction(async()=>{await post('/api/document-state',{key:box.dataset.key,readingStatus:box.value,readingNote:note});toast('已保存阅读状态与笔记。');await getState();});return;}if(!box.matches('.compare-box'))return;const next=state.comparison.filter(key=>key!==box.dataset.key);if(box.checked&&next.length>=12){box.checked=false;toast('最多选择十二篇，请先移除一篇。');return;}state.comparison=box.checked?[...next,box.dataset.key]:next;renderCompareBar();});
  el('home-query').addEventListener('keydown',event=>{if(event.key==='Enter')el('home-search').click();});
  el('clear-compare').addEventListener('click',clearComparison);el('clear-compare-top').addEventListener('click',clearComparison);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)getState();});
  el('language-toggle').addEventListener('click',()=>setLanguage(uiLanguage==='en'?'zh':'en'));
  applyLanguage();
  getState();setInterval(()=>{if(!document.hidden)getState();},20000);
})();
