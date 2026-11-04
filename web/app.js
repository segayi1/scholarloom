(() => {
  'use strict';
  const el = id => document.getElementById(id);
  const state = { snapshot: null, docsSignature: '', summarySignature: '', view: 'home', category: '', kind: '', year: '', studyType: '', query: '', routeKeys: null, routeName: '', focusKey: null, comparison: [], limit: 24, jobsFilter: 'all', toastTimer: 0 };
  const statuses = [['queued','排队中'],['processing','处理中'],['ready','可导入'],['review','待核对'],['excluded','已排除'],['imported','已导入'],['duplicate','重复'],['ignored','已忽略'],['error','出错'],['waiting_zotero','等待 Zotero'],['summarizing','生成摘要中']];
  const statusNames = Object.fromEntries(statuses);
  const safeArray = value => Array.isArray(value) ? value : [];
  const text = value => value == null ? '' : String(value);
  const esc = value => text(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const list = value => Array.isArray(value) ? value : value ? [value] : [];
  const byKey = () => Object.fromEntries(safeArray(state.snapshot?.documents).filter(row => row?.key).map(row => [row.key,row]));
  function safeURL(value, allowZotero = false) {
    try { const url = new URL(value, location.href); return ['https:','http:'].includes(url.protocol) || (allowZotero && url.protocol === 'zotero:') ? url.href : ''; } catch { return ''; }
  }
  function statusLabel(status) { return statusNames[status] || text(status) || '状态未知'; }
  function formatUpdated(value) { const seconds=Number(value);if(!Number.isFinite(seconds)||seconds<=0)return '';const date=new Date(seconds*1000);return Number.isNaN(date.getTime())?'':new Intl.DateTimeFormat('zh-CN',{dateStyle:'medium',timeStyle:'short'}).format(date); }
  function toast(message) { const box=el('toast');box.textContent=message;box.classList.add('show');clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>box.classList.remove('show'),3500); }
  function setMessage(message, error=false) { const box=el('settings-message');box.textContent=message;box.style.color=error?'#963b32':''; }
  async function getState() {
    try {
      const response = await fetch('/api/state', { cache: 'no-store', headers: {'Accept':'application/json'} });
      if (!response.ok) throw new Error(`本地服务返回 ${response.status}`);
      const next = await response.json();
      if (!next || !Array.isArray(next.documents) || !Array.isArray(next.jobs)) throw new Error('本地服务返回的数据格式不完整');
      el('load-error').hidden = true;
      const docsSignature = JSON.stringify([next.documents,next.guides,next.routes]);
      state.snapshot = next;
      renderOverview(); renderHealth(); renderJobs();
      if (docsSignature !== state.docsSignature) { state.docsSignature = docsSignature; renderLibraryData(); }
      if (state.view === 'compare') renderComparison();
      return true;
    } catch (error) {
      el('load-error').textContent = `无法加载本地工作台：${error.message}。请确认本地服务已启动后重试。`;
      el('load-error').hidden = false;
      if (!state.snapshot) { el('overview-stats').textContent='本地服务未连接';el('jobs').innerHTML='<div class="empty">连接服务后会显示处理队列。</div>'; }
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
    el('overview-stats').innerHTML=`<div class="stat"><strong>${docs.filter(row=>row.kind==='journalArticle').length}</strong>期刊文献</div><div class="stat"><strong>${docs.filter(row=>row.kind==='patent').length}</strong>专利</div><div class="stat"><strong>${docs.length}</strong>可检索文献</div><div class="stat"><strong>${count('ready')}</strong>待导入</div><div class="stat"><strong>${count('review')}</strong>待核对</div>`;
    el('progress-grid').innerHTML=statuses.map(([key,label])=>`<div class="progress"><strong>${count(key)}</strong><span>${label}</span></div>`).join('');
    renderSummaryStatus();
    el('zotero-setting-status').textContent=state.snapshot?.health?.authorized?'已授权，可持续导入':'尚未授权';
    el('key-status').textContent=state.snapshot?.settings?.has_model_key?'本机已保存密钥；留空可保留当前密钥。':'尚未配置密钥；本地兼容端点可按需留空。';
    if(state.view!=='settings'){
      el('watch-enabled').checked=Boolean(state.snapshot?.settings?.watch_enabled);
      el('watch-folders').value=safeArray(state.snapshot?.settings?.watch_folders).join('\n');
      el('model-url').value=state.snapshot?.settings?.model_url || 'https://api.openai.com/v1';
      el('model-name').value=state.snapshot?.settings?.model_name || '';
      el('auto-summary').checked=state.snapshot?.settings?.auto_summary !== false;
    }
  }
  function renderHealth() {
    const h=state.snapshot?.health||{};
    const watching=state.snapshot?.settings?.watch_enabled!==false;
    const rows=[['Zotero',h.zotero?'正常':'未连接',h.zotero],['持续授权',h.authorized?'正常':'未授权',h.authorized],['文件监看',!watching?'已暂停':h.watcher?'运行中':'未运行',watching&&h.watcher],['摘要模型',h.model?'已配置':'未配置',h.model]];
    el('health-status').innerHTML=rows.map(([name,label,ok])=>`<span class="health-item ${ok?'ok':''}">${name}：${label}</span>`).join('');
    if(h.authorization==='pending') el('zotero-setting-status').textContent='正在等待 Zotero 授权…';
    else if(h.authorization==='error' && h.authorization_message) el('zotero-setting-status').textContent=h.authorization_message;
  }
  function renderSummaryStatus() {
    const summary=state.snapshot?.health?.summary, box=el('summary-status');
    if(!summary||!['running','done','error'].includes(summary.status)){box.hidden=true;box.textContent='';return;}
    const labels={running:'正在生成中文摘要',done:'中文摘要已完成',error:'中文摘要生成失败'};
    const message=text(summary.message).trim();
    box.className=`summary-status ${summary.status}`;
    box.textContent=message?`${labels[summary.status]}：${message}`:labels[summary.status];
    box.hidden=false;
    const signature=`${summary.status}\n${message}`;
    if(state.summarySignature&&signature!==state.summarySignature&&(summary.status==='done'||summary.status==='error'))toast(box.textContent);
    state.summarySignature=signature;
  }
  function renderJobs() {
    const all=safeArray(state.snapshot?.jobs), jobs=state.jobsFilter==='all'?all:all.filter(job=>job.status===state.jobsFilter);
    el('job-count').textContent=`${jobs.length} 条`;
    if(!jobs.length){el('jobs').innerHTML='<div class="empty">当前没有匹配记录。</div>';return;}
    el('jobs').innerHTML=jobs.map(job=>{
      const canRetry=['review','error','waiting_zotero'].includes(job.status);
      const canIgnore=!['imported','duplicate','excluded'].includes(job.status);
      const updated=formatUpdated(job.updated);
      return `<article class="job"><div><div class="job-name">${esc(job.name||job.path||'未命名文件')}</div><div class="job-title">${esc(job.title||job.path||'')}</div></div><div class="job-status">${esc(statusLabel(job.status))}${updated?` · ${esc(updated)}`:''}</div><div class="job-title">${esc(job.reason||'')}</div><div class="job-actions">${canRetry?`<button data-action="retry" data-id="${esc(job.id)}">重试</button>`:''}${canIgnore?`<button data-action="ignore" data-id="${esc(job.id)}">忽略</button>`:''}</div></article>`;
    }).join('');
  }
  function setView(view) {
    state.view=view;
    for(const name of ['home','library','compare','settings'])el(`${name}-view`).hidden=name!==view;
    document.querySelectorAll('[data-view]').forEach(button=>{const active=button.dataset.view===view;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    if(view==='library') renderResults(); if(view==='compare')renderComparison();
  }
  function normalized(value){return text(value).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');}
  const queryGroups=[['单b细胞','singlebcell','singlehumanbcell','singlecellrtpcr','单细胞抗体'],['重轻链','配对测序','pairedvh','vhvl','pairedrepertoire'],['噬菌体','phage','fabonphage'],['核糖体展示','ribosomedisplay'],['哺乳动物展示','mammaliandisplay'],['cart','嵌合抗原受体','chimericantigenreceptor'],['持久性','persistence','记忆分化','memorydevelopment','持续性'],['合成受体','synnotch','syntheticnotch','syntheticreceptor'],['表位','epitope','免疫逃逸','escapemutation'],['pd1','程序性死亡受体1'],['lag3','淋巴细胞激活基因3'],['mrna疫苗','mrnavaccine','信使rna疫苗'],['端粒','telomere','telomerase','shelterin'],['紫草','shikonin','紫草素'],['紫杉醇','paclitaxel','taxus','baccatin'],['基因编辑','crispr','cas9'],['神经','neuron','brain','脑'],['微生物','microbial','microbiome','菌群'],['蛋白质降解','degrader','分子胶','molecularglue']];
  function relevance(row,query){const q=normalized(query);if(!q)return 0;const title=normalized([row.title,row.zhTitle,row.oneSentence].join(' ')),tags=normalized([row.category,...list(row.subtopics),...list(row.keywords),row.identifier,row.authors].join(' ')),body=normalized([row.title,row.zhTitle,row.oneSentence,row.question,row.method,...list(row.findings),row.useCase,row.studyModel,row.category,...list(row.subtopics),...list(row.keywords),row.authors,row.identifier,...list(row.flags)].join(' '));let score=(title.includes(q)?80:0)+(tags.includes(q)?80:0)+(body.includes(q)?20:0);for(const group of queryGroups)if(group.some(term=>q.includes(term))){if(group.some(term=>title.includes(term)||tags.includes(term)))score+=32;else if(group.some(term=>body.includes(term)))score+=12;}const terms=new Set(text(query).toLowerCase().match(/[a-z0-9]+|[\u3400-\u9fff]{2,}/g)||[]);for(const term of [...terms])if(/[\u3400-\u9fff]/.test(term)&&term.length>2)for(let i=0;i<term.length-1;i++)terms.add(term.slice(i,i+2));const stop=new Set(['如何','怎样','研究','文献','需要','什么','进行','有关','通过','一个','哪些','可以','找到']);for(const term of terms)if(!stop.has(term)&&term.length>1){const t=normalized(term);score+=(title.includes(t)?7:0)+(tags.includes(t)?8:0)+(body.includes(t)?2:0);}return score;}
  function filteredDocs(){const rows=safeArray(state.snapshot?.documents);if(state.focusKey)return rows.filter(row=>row.key===state.focusKey);const candidates=rows.filter(row=>(!state.category||row.category===state.category)&&(!state.kind||row.kind===state.kind)&&(!state.year||text(row.year)===state.year)&&(!state.studyType||row.studyType===state.studyType)&&(!state.routeKeys||state.routeKeys.includes(row.key)));const found=candidates.map(row=>({row,score:relevance(row,state.query)})).filter(item=>!state.query.trim()||item.score>0);found.sort((a,b)=>state.query.trim()?b.score-a.score||Number(b.row.year)-Number(a.row.year):state.routeKeys?state.routeKeys.indexOf(a.row.key)-state.routeKeys.indexOf(b.row.key):Number(b.row.year)-Number(a.row.year)||text(a.row.zhTitle||a.row.title).localeCompare(text(b.row.zhTitle||b.row.title),'zh-CN'));return found.map(item=>item.row);}
  function renderLibraryData(){const docs=safeArray(state.snapshot?.documents), guides=safeArray(state.snapshot?.guides), routes=safeArray(state.snapshot?.routes);for(const name of ['category','year','studyType']){const select=el(name),keep=state[name];select.replaceChildren(new Option(name==='category'?'全部主题':name==='year'?'全部年份':'全部研究形式',''));const values=name==='category'?guides.map(x=>x.name).filter(Boolean):name==='year'?[...new Set(docs.map(x=>x.year).filter(Boolean))].sort().reverse():[...new Set(docs.map(x=>x.studyType).filter(Boolean))].sort();values.forEach(value=>select.add(new Option(value,value)));select.value=values.includes(keep)?keep:'';state[name]=select.value;}renderTopics();renderResults();}
  function renderTopics(){const guides=safeArray(state.snapshot?.guides),routes=safeArray(state.snapshot?.routes),docs=safeArray(state.snapshot?.documents);el('topic-grid').innerHTML=guides.map(guide=>`<button class="topic-item" data-category="${esc(guide.name)}">${esc(guide.name)}<small>${docs.filter(row=>row.category===guide.name).length} 篇 · 查看导读</small></button>`).join('')||'<span class="muted">暂无主题导读</span>';el('question-grid').innerHTML=routes.map((route,index)=>`<button class="question-item" data-route="${index}">${esc(route.title)}<small>${esc(route.description||'')} · ${safeArray(route.keys).length} 篇</small></button>`).join('')||'<span class="muted">暂无问题路线</span>';}
  function safeGuide(guide){const keys=safeArray(guide.reading), docs=byKey();return `<div class="guide"><h3>${esc(guide.name)}</h3><p>${esc(guide.summary||'')}</p><ul>${safeArray(guide.insights).map(item=>`<li>${esc(item)}</li>`).join('')}</ul><div class="reading-path">${keys.filter(key=>docs[key]).map((key,index)=>`<button class="reading-step" data-focus="${esc(key)}">${index+1}. ${esc(docs[key].zhTitle||docs[key].title||key)}</button>`).join('')}</div></div>`;}
  function cardMarkup(row){const key=esc(row.key),docs=byKey(),source=safeURL(row.sourceURL),attachment=safeURL(row.attachmentURL,true),locate=row.key&&/^[A-Za-z0-9]+$/.test(row.key)?`zotero://select/library/items/${encodeURIComponent(row.key)}`:'';const title=row.zhTitle||row.title||'题名未提供';const comparison=state.comparison.includes(row.key);return `<article class="card ${comparison?'selected':''}" id="doc-${key}"><div class="meta"><span>${esc(row.year||'年份未详')}</span>${row.studyType?`<span class="pill">${esc(row.studyType)}</span>`:''}${row.category?`<span class="pill">${esc(row.category)}</span>`:''}<span>${esc(row.source||'来源未详')}</span>${list(row.flags).map(flag=>`<span class="pill flag">${esc(text(flag).split('/').pop())}</span>`).join('')}</div><h3 class="zh-title">${esc(title)}</h3>${row.title&&row.title!==title?`<p class="en-title" lang="en">${esc(row.title)}</p>`:''}<p class="one">${esc(row.oneSentence||row.summary||'暂无中文摘要。')}</p>${list(row.findings).length?`<ul class="findings">${list(row.findings).map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`:''}<div class="keywords">${[...list(row.subtopics),...list(row.keywords)].slice(0,12).map(item=>`<span class="keyword">${esc(item)}</span>`).join('')}</div><details><summary>研究问题、方法与使用场景</summary><dl>${row.authors?`<dt>作者</dt><dd>${esc(row.authors)}</dd>`:''}${row.question?`<dt>研究问题</dt><dd>${esc(row.question)}</dd>`:''}${row.method||row.studyModel?`<dt>方法与对象</dt><dd>${esc(row.method||'')}${row.studyModel?`<br>研究模型：${esc(row.studyModel)}`:''}</dd>`:''}${row.useCase?`<dt>可用于</dt><dd>${esc(row.useCase)}</dd>`:''}${row.limitations?`<dt>已知边界</dt><dd>${esc(row.limitations)}</dd>`:''}</dl><div class="source-note">摘要依据：${esc(row.basis||'来源未提供')}${row.identifier?` · ${esc(row.identifier)}`:''}</div><div class="related"><strong class="source-note">关联文献</strong>${list(row.related).map(rel=>docs[rel]?`<button data-focus="${esc(rel)}">${esc(docs[rel].zhTitle||docs[rel].title||rel)}</button>`:'').join('')}</div></details><div class="links">${locate?`<a href="${locate}">在 Zotero 定位 ↗</a>`:''}${attachment?`<a href="${esc(attachment)}">${esc(row.attachmentLabel||'打开附件')}</a>`:''}${source?`<a href="${esc(source)}" target="_blank" rel="noopener noreferrer">查看来源摘要 ↗</a>`:''}<label class="compare-label"><input type="checkbox" class="compare-box" data-key="${key}" ${comparison?'checked':''} aria-label="加入对比：${esc(title)}">加入对比</label><button class="text-button" data-action="summarize" data-key="${key}">重新生成摘要</button></div></article>`;}
  function renderResults(){if(!state.snapshot)return;const rows=filteredDocs(),total=safeArray(state.snapshot.documents).length;el('result-count').textContent=`找到 ${rows.length} / ${total} 条文献${state.focusKey?' · 当前定位文献':''}`;el('results').innerHTML=rows.length?rows.slice(0,state.limit).map(cardMarkup).join(''):'<div class="empty">没有找到匹配文献，可尝试缩短问题或清除筛选条件。</div>';el('load-more').hidden=rows.length<=state.limit;const guide=safeArray(state.snapshot.guides).find(item=>item.name===state.category);el('guide-panel').hidden=!guide;el('guide-panel').innerHTML=guide?safeGuide(guide):'';el('active-route').hidden=!state.routeName&&!state.focusKey;el('active-route').textContent=state.routeName?`阅读路线：${state.routeName}`:state.focusKey?'已定位文献；点击“重置”返回全部文献。':'';renderCompareBar();}
  function showDocument(key){Object.assign(state,{focusKey:key,routeKeys:null,routeName:'',category:'',kind:'',year:'',studyType:'',query:'',limit:24});syncFilters();setView('library');renderResults();window.scrollTo({top:0,behavior:'smooth'});}
  function syncFilters(){for(const name of ['category','kind','year','studyType'])el(name).value=state[name]||'';el('query').value=state.query;}
  function renderCompareBar(message=''){const docs=byKey();state.comparison=state.comparison.filter(key=>docs[key]);el('compare-bar').hidden=!state.comparison.length;el('compare-tab-count').textContent=state.comparison.length?`(${state.comparison.length})`:'';el('compare-message').textContent=message||`已选择 ${state.comparison.length} 篇：${state.comparison.map(key=>docs[key]?.zhTitle||docs[key]?.title||key).join(' / ')}`;el('open-comparison').disabled=state.comparison.length<2;document.querySelectorAll('.compare-box').forEach(box=>{box.checked=state.comparison.includes(box.dataset.key);box.closest('.card')?.classList.toggle('selected',box.checked);});}
  function renderComparison(){const docs=byKey(),selected=state.comparison.map(key=>docs[key]).filter(Boolean);if(!selected.length){el('comparison-content').innerHTML='<div class="empty">在“检索与导读”中勾选 2–3 篇文献，即可查看对比。</div>';return;}const val=(row,key,fallback='')=>esc(row[key]||fallback);const fields=[['一句话摘要',row=>val(row,'oneSentence',row.summary||'未提供')],['研究问题',row=>val(row,'question','未提供')],['研究模型',row=>val(row,'studyModel','来源未明确说明')],['方法',row=>val(row,'method','未提供')],['主要发现',row=>list(row.findings).length?'<ul>'+list(row.findings).map(item=>`<li>${esc(item)}</li>`).join('')+'</ul>':'未提供'],['适用场景',row=>val(row,'useCase','未提供')],['已知边界',row=>val(row,'limitations','当前摘要未单列局限')],['摘要依据',row=>val(row,'basis','来源未提供')],['原文',row=>row.key&&/^[A-Za-z0-9]+$/.test(row.key)?`<a href="zotero://select/library/items/${encodeURIComponent(row.key)}">在 Zotero 定位 ↗</a>`:'未提供']];el('comparison-content').innerHTML='<div class="comparison-wrap"><table class="comparison"><thead><tr><th>比较维度</th>'+selected.map(row=>`<th>${esc(row.zhTitle||row.title||'题名未提供')}<br><small>${esc(row.year||'年份未详')} · ${esc(row.studyType||'文献')}</small></th>`).join('')+'</tr></thead><tbody>'+fields.map(([label,value])=>'<tr><th scope="row">'+label+'</th>'+selected.map(row=>'<td>'+value(row)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';}
  function clearComparison(){state.comparison=[];renderCompareBar();renderComparison();}
  function syncLibraryInputs(){syncFilters();}
  document.addEventListener('click',async event=>{const button=event.target.closest('button');if(!button)return;if(button.dataset.view){setView(button.dataset.view);return;}if(button.dataset.category!==undefined){state.category=button.dataset.category;state.kind='';state.year='';state.studyType='';state.query='';state.routeKeys=null;state.routeName='';state.focusKey=null;state.limit=24;syncLibraryInputs();setView('library');renderResults();return;}if(button.dataset.route!==undefined){const route=safeArray(state.snapshot?.routes)[Number(button.dataset.route)];if(route)Object.assign(state,{routeKeys:safeArray(route.keys),routeName:route.title||'阅读路线',focusKey:null,category:'',kind:'',year:'',studyType:'',query:'',limit:24});syncLibraryInputs();setView('library');renderResults();return;}if(button.dataset.focus){showDocument(button.dataset.focus);return;}if(button.id==='scan-new'||button.id==='scan-existing'){await runAction(async()=>{await post('/api/scan',button.id==='scan-existing'?{include_existing:true}:{});toast(button.id==='scan-existing'?'已开始识别已有下载文件。':'已开始扫描新增文件。');await getState();});return;}if(button.id==='open-comparison'){setView('compare');return;}if(button.id==='clear-compare'||button.id==='clear-compare-top'){clearComparison();return;}if(button.id==='load-more'){state.limit+=24;renderResults();return;}if(button.id==='home-search'){state.query=el('home-query').value;state.category='';state.kind='';state.year='';state.studyType='';state.routeKeys=null;state.routeName='';state.focusKey=null;syncFilters();setView('library');renderResults();return;}if(button.id==='authorize'){await runAction(async()=>{toast('请在 Zotero 弹窗中选择“始终允许”。该权限可随时在 Zotero 中撤销。');await post('/api/authorize',{});await getState();});return;}if(button.id==='open-folder'){await runAction(async()=>{await post('/api/open-folder',{});toast('已打开文献备份文件夹。');});return;}if(button.id==='save-settings'){await saveSettings();return;}if(button.id==='test-model'){await runAction(async()=>{const result=await post('/api/model-test',{});setMessage(result.message||'摘要模型连接成功。');});return;}if(button.dataset.action){await runAction(async()=>{const action=button.dataset.action;if(action==='retry'){await post('/api/retry',{id:button.dataset.id});toast('已重新加入处理队列。');await getState();}else if(action==='ignore'){await post('/api/ignore',{id:button.dataset.id});toast('已忽略此记录。');await getState();}else if(action==='summarize'){await post('/api/summarize',{key:button.dataset.key});toast('已请求重新生成摘要。');await getState();}});}});
  async function runAction(action){try{await action();}catch(error){toast(error.message);}}
  async function saveSettings(){const raw=el('model-url').value.trim()||'https://api.openai.com/v1';let parsed;try{parsed=new URL(raw);}catch{setMessage('API 地址格式无效。',true);return;}const loopback=['localhost','127.0.0.1','::1','[::1]'].includes(parsed.hostname);if(parsed.protocol!=='https:'&&!(parsed.protocol==='http:'&&loopback)){setMessage('API 地址须使用 HTTPS；仅本机回环地址可以使用 HTTP。',true);return;}const payload={watch_folders:el('watch-folders').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean),watch_enabled:el('watch-enabled').checked,model_url:raw,model_name:el('model-name').value.trim(),auto_summary:el('auto-summary').checked};const key=el('model-key').value;if(key)payload.model_key=key;await runAction(async()=>{await post('/api/settings',payload);el('model-key').value='';setMessage('设置已保存。');await getState();});}
  for(const name of ['category','kind','year','studyType'])el(name).addEventListener('change',event=>{state[name]=event.target.value;state.focusKey=null;state.routeKeys=null;state.routeName='';state.limit=24;renderResults();});
  el('query').addEventListener('input',event=>{state.query=event.target.value;state.focusKey=null;state.routeKeys=null;state.routeName='';state.limit=24;renderResults();});
  el('reset').addEventListener('click',()=>{Object.assign(state,{category:'',kind:'',year:'',studyType:'',query:'',routeKeys:null,routeName:'',focusKey:null,limit:24});syncFilters();renderResults();});
  el('job-filter').addEventListener('change',event=>{state.jobsFilter=event.target.value;renderJobs();});
  el('results').addEventListener('change',event=>{const box=event.target;if(!box.matches('.compare-box'))return;const next=state.comparison.filter(key=>key!==box.dataset.key);if(box.checked&&next.length>=3){box.checked=false;toast('最多比较三篇，请先移除一篇。');return;}state.comparison=box.checked?[...next,box.dataset.key]:next;renderCompareBar();});
  el('home-query').addEventListener('keydown',event=>{if(event.key==='Enter')el('home-search').click();});
  el('clear-compare').addEventListener('click',clearComparison);el('clear-compare-top').addEventListener('click',clearComparison);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)getState();});
  getState();setInterval(()=>{if(!document.hidden)getState();},20000);
})();
