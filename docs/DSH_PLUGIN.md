# DSH 文献工作台插件

`dsh-plugin/` 把当前 ScholarLoom 文库接成一个 DeepSeek Harness 客户端插件。本地版（根目录 `server.py` + `web/`）仍然可以单独使用，两者共用同一份 `data/`，配置互相独立。ScholarLoom 仍是题录、阅读卡、PDF、问答和阅读记忆的唯一数据源；插件不复制数据库，也不建立第二份阅读状态。完整安装/配置矩阵见 [CONFIGURATION.md](CONFIGURATION.md)。

## 组成

| 文件 | 作用 |
| --- | --- |
| `dsh-plugin/lib/index.js` | Host 半：`/scholarloom` 回环代理、PDF Range 代理、PDF.js 静态资源代理、四个 Agent 工具、可选启动 `server.py`（默认关闭）。 |
| `dsh-plugin/lib/client.js` | Client 半：`main` 全页工作台与 `sidebar.panellist` 入口，手写 lazy-CJS bundle，无需构建。 |
| `dsh-plugin/cordis.patch.yml` | bundle 自带的 loader mount 行。 |
| `dsh-plugin/install.ps1` | 把包复制进指定 profile 并重建带配置的 mount 行；`-BaseUrl` / `-ProjectDir` / `-AutoStart` 可写配置，`-Uninstall` 可撤销。 |
| `dsh-plugin/config.example.yml` | 可直接复制到 profile 的插件配置示例。 |

## 面板能力

- **原文与解读并排**：打开一篇文献后，右侧常驻 PDF 原文，左侧「解读」栏保留 **速览 / 深读 / 问答 / 笔记 / 记忆** 五个页签。切换页签不会让原文消失，引用跳页直接更新右侧 PDF。
- **深读逐单元**：读取 `/api/full-read` 的 `units`，每个实验/背景/方法单元显示类型、页码、状态、研究问题、设计与对照、整理结果、解读、局限；单元头提供原文页按钮，来源卡先显示 **原文** 引文，再显示模型摘要、逐段解读、提取依据和局限。每个来源的「跳到原文」会把 PDF 滚动到该来源的精确 `rects` 位置（段落级，不是页顶），在页面上叠加约 6.5 秒的金色段落高亮，并闪烁 PDF 边框、提示页码；单元头部的 `p.N` 按钮仍是页级跳转。
- **阅读记忆**：读取/新增/删除 `/api/reading-memory` 的 project/paper 记忆与摘录；问答默认使用这些记忆。顶部「记忆」按钮可直接进入。
- 文库：按标题、作者、DOI、关键词、分类、阅读状态检索。
- 阅读卡：一句话、研究问题、方法、发现、局限、适用场景、关键词。
- **PDF.js 连续阅读器**：通过 `/scholarloom/vendor/pdfjs/*` 代理复用 ScholarLoom 自带的 PDF.js，按面板宽度连续渲染多页（上下滚动），每页叠加 PDF.js `TextLayer`，支持**文本选择与复制**、连续上下滚动、页码输入、上下页、适合宽度和「新标签页」；画布背板限制 6M 像素、DPR≤2，离屏页会释放 canvas/text layer，避免渲染器内存崩溃；新标签页由 Host 调用系统默认浏览器打开，避免 DSH 窗口拦截 `window.open`。不再依赖 Chromium 内置 PDF viewer 的缩放/侧栏。
- 证据问答：调用 `/api/paper-chat`，答案中的 `p.N` 可跳转右侧 PDF 页码，另附证据列表。
- 笔记与状态：写入 `/api/document-state`，同时更新面板内的乐观状态。
- **专注原文**：标题栏的「专注原文」按钮可隐藏解读栏，让 PDF 占满中间区域；再次点击恢复并排。

## Agent 工具

- `scholarloom_search`：按条件搜索本地文库。
- `scholarloom_paper`：读取一篇的完整阅读卡。
- `scholarloom_ask`：针对单篇调用 ScholarLoom 的分页证据问答；会消耗 ScholarLoom 配置的模型额度。
- `scholarloom_status`：连接状态与文库计数。

## 数据流与安全

```text
DSH 面板 ──同源 fetch/import──▶ /scholarloom/*
                                  │
                                  ├─ GET  /api/state, /api/full-read
                                  ├─ POST /api/paper-chat, /api/document-state,
                                  │       /api/reading-memory, /api/open-pdf
                                  │       （Host 附加 CSRF token；open-pdf 只打开当前 baseUrl 的 PDF）
                                  ├─ GET  /api/document/<key>/pdf（转发 Range）
                                  └─ GET  /vendor/pdfjs/*（代理 PDF.js 与 cmaps）
                                          │
                                          ▼
                             127.0.0.1:8766 ScholarLoom 2.1.2
```

- 代理只监听 DSH 的回环服务；POST 检查 `Origin`/`Host`，PDF key 限定 `[A-Za-z0-9_-]`。
- `/scholarloom/vendor/` 只允许 `[A-Za-z0-9._/-]`，拒绝 `..`，只转发 `/vendor/` 下的静态资源。
- CSRF token 只留在 Host 内存，不返回浏览器。
- 不新增远端请求、遥测或第三方服务。
- 当 8766 已有服务时直接复用，绝不启动第二个实例。
- `autoStart` 默认关闭；需要插件代启时，它只会启动 `projectDir` 指定的服务。

## 兼容性与崩溃防护

- 当前 DSH 为 `0.2.2-rc.3`，插件 version `0.1.3`，`@deepseek-ai/dsh-tools` peer 已同步为 `0.2.2-rc.3`；旧 rc.1 依赖会被 loader 判为不兼容并禁用。
- 之前 63 单元深读 + 连续 PDF 曾触发 renderer OOM（日志：`ResizeObserver loop completed with undelivered notifications`）。现在画布按 6M 像素上限、DPR≤2 渲染，IntersectionObserver 只保留视口附近页面，离屏立即释放 canvas/text layer，ResizeObserver 经 rAF + 1px 阈值。

## 当前运行状态（2026-11-13）

- 8766 已从历史运行时切换到**工作区 2.1.2**（91 篇、90 篇有 PDF、2 条待核对入藏）。
- 历史运行时目录仍完整保留，只是停止；旧 152 篇库没有迁移或合并。
- `server.py` 增加 `PRAGMA temp_store=MEMORY`：工作区有 345 条 job 时，`/api/state` 的 `ORDER BY ... LIMIT 500` 会因临时文件路径失败；改为内存临时表后恢复。

## 验收记录

已在实际桌面 profile（DSH 0.2.2-rc.1）检查：

- `scholarloom-workbench` loader 行激活；`main` 与 `sidebar.panellist` 均有 `scholarloom` occupant。
- `/scholarloom/health` 返回 `connected: true`；`/scholarloom/api/library` 返回 91 篇、90 篇有 PDF。
- 打开 IL-6 论文后，左侧速览与右侧 PDF 同屏；PDF.js canvas 按面板宽度完整显示第 1 页，页码 1/19。
- 切到深读后 PDF 仍在；深读显示 `partial`、17/19 页、27 个实验单元；单元卡片展开后可见逐条原文依据、模型摘要、逐段解读和原始 `sourceText`。
- 记忆页可新增 project 记忆并显示在列表，删除接口可用；顶部「记忆」按钮和解读栏页签都能进入。
- PDF Range 经代理返回 `206 Partial Content` 和 `content-range`；PDF.js vendor/worker 经代理返回 200。
- 证据问答经代理返回 200、4 条证据和 `p.N` 页码；阅读状态与笔记写入后在 `/api/state` 同步可见。
- 页码输入从 1 改到 3 后 PDF 连续阅读器实际滚动到第 3 页。
- 深读来源卡 payload 已带 `rects`（CHD8 首条来源 p.1 两个矩形，y≈0.636），「跳到原文」会按矩形纵向位置滚动并绘制段落高亮。
- PDF 连续滚动实测可见第 1 页底部与第 2 页顶部同屏；在标题上拖选后 Ctrl+C，剪贴板得到真实 PDF 文本（含作者与机构行）。
- 「新标签页」经 `/scholarloom/api/open-pdf` 在系统默认浏览器打开 PDF，返回 200。
- `scholarloom_status`、`scholarloom_search`、`scholarloom_paper`、`scholarloom_ask` 实际返回当前文库结果。
- DSH 重启到新端口后，插件入口、配置和工具仍自动恢复。

尚未验证：真实用户长会话、OCR/影像页、极窄窗口下的上下堆叠交互，以及历史 152 篇库迁移到工作区后的表现。

## 已知限制

- 历史 152 篇库与工作区 91 篇库是两套数据；切换服务不会自动合并。要回到旧库，需要重新启动历史运行时。
- PDF.js 连续阅读器已支持文本选择/复制，但「跳到原文」的金色段落高亮约 6.5 秒后消失，不是持久批注；扫描版/纯图片 PDF 没有可选中文本。
- 记忆页目前固定使用 `project=default`；其他课题的记忆不会出现在面板里。
- DSH 桌面窗口小于其布局视口时，页面右侧会被窗口裁切；最大化窗口即可完整显示。这是宿主窗口/视口差异，不是面板内部溢出。
- 问答质量、页码定位和科学正确性仍受 ScholarLoom 模型与证据检索限制，面板只负责呈现与回跳。
