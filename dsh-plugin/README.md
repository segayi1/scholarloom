# ScholarLoom for DeepSeek Harness

**把本地文献库接成 DSH 原生阅读工作台。** 左侧文库、中间解读、右侧原文；阅读卡、逐单元深读、证据问答、阅读记忆和阅读笔记都在一个面板里完成。

ScholarLoom 仍是题录、PDF、阅读卡、问答和阅读记忆的唯一数据源。插件不复制数据库，不新增云端服务，只通过 `127.0.0.1` 的本地 API 读写。

- 插件版本：`0.1.3`
- 运行环境：DeepSeek Harness `0.2.2-rc.3`
- 配套 ScholarLoom：`2.1.2`
- 数据库兼容：现有 ScholarLoom 数据库，无需迁移

## 本地版与插件版

- **本地版**：仓库根目录的 `server.py` + `web/`，浏览器打开 `127.0.0.1:8766`；
- **DSH 插件版**：`dsh-plugin/`，在 DSH 左侧「文献工作台」里使用；
- 两者**可以同时存在**，共用同一份 `data/`；插件不建第二份数据库；
- 两者**分别配置**：本地版配端口/模型/Zotero，插件配 `baseUrl`/`projectDir`/`autoStart`。

完整对照、三种部署组合和常见问题见 [docs/CONFIGURATION.md](../docs/CONFIGURATION.md)。

## 为什么做这个

ScholarLoom 网页版适合完整管理，但日常读论文时更希望：

- 不离开 DSH 就能查文库、看阅读卡、读 PDF；
- 原文和模型解读始终同屏，而不是点一个页签就丢掉原文；
- 深读不是只有一段总述，而是每个实验单元都能回到对应原文；
- 问答的页码引用可以直接跳转并定位到具体段落；
- 阅读记忆、笔记和阅读状态写回同一篇文献。

这个插件就是按这个工作流做的。

## 功能

### 文库与阅读卡

- 按标题、作者、DOI、关键词、分类、阅读状态检索；
- 一句话、研究问题、方法、主要发现、局限、适用场景、关键词；
- 阅读状态（未读 / 在读 / 已读）与笔记直接写回 ScholarLoom。

### 原文与解读并排

打开文献后：

- 右侧是 **PDF.js 连续阅读器**：多页纵向排列、连续上下滚动、按面板宽度适配；
- 每页叠加 PDF.js `TextLayer`，**可以拖选文本、Ctrl+C 复制**；
- 左侧「解读」栏切换 **速览 / 深读 / 问答 / 笔记 / 记忆**；
- 切页签不会隐藏 PDF；「专注原文」可以暂时收起解读栏。

### 深读：逐单元对应原文

深读读取 ScholarLoom 的 `/api/full-read`，显示：

- 全文综述、研究问题、研究设计、主要发现、论证链、局限；
- 全部实验 / 背景 / 方法单元；
- 每个单元的研究问题、设计与对照、整理结果、解读、局限；
- 每条来源先显示 **原文引文**，再显示模型摘要、逐段解读、提取依据和局限；
- 单元头部的 `p.1`、`p.2`… 是页级跳转；
- 来源卡「跳到原文」按 `rects` **定位到具体段落**，叠加约 6.5 秒金色高亮，并闪烁 PDF 边框、提示页码。

### 证据问答

- 调用 ScholarLoom 的分页证据问答；
- 答案中的 `p.N` 可跳转 PDF；
- 附证据列表；
- 默认使用项目阅读记忆。

### 阅读记忆

- 顶部「记忆」按钮或解读栏「记忆」页签；
- 列出 project / 本篇记忆；
- 新增偏好、课题、假设三类记忆；
- 可标记「仅这篇论文」；
- 删除记忆和阅读摘录；
- 问答默认使用这些记忆。

### Agent 工具

| 工具 | 作用 |
| --- | --- |
| `scholarloom_search` | 搜索本地文库 |
| `scholarloom_paper` | 读取一篇的完整阅读卡 |
| `scholarloom_ask` | 针对单篇做分页证据问答（消耗 ScholarLoom 模型额度） |
| `scholarloom_status` | 连接状态与文库计数 |

## 安装

### 前置条件

1. 已安装 DeepSeek Harness，并至少启动过一次桌面 profile；
2. 本机有可运行的 ScholarLoom，默认 `http://127.0.0.1:8766`；
3. Windows 上建议使用项目自带的 `.venv` 启动 ScholarLoom。

启动 ScholarLoom：

```powershell
.\.venv\Scripts\python.exe server.py
```

或双击 `launch.vbs`。

### 本地安装插件

```powershell
powershell -ExecutionPolicy Bypass -File .\dsh-plugin\install.ps1 -Profile desktop
```

安装脚本会：

- 复制 `dsh-plugin/` 到 `%USERPROFILE%\.dsh\profiles\desktop\node_modules\dsh-scholarloom`；
- 在 profile 的 `cordis.patch.yml` 写入一行带标记的 mount 配置；
- 重复执行会重建这一行，不会重复插入；可用 `-BaseUrl` / `-ProjectDir` / `-AutoStart` 更新配置。

开发时可以用链接安装，改代码后切换插件即可重新加载：

```powershell
powershell -ExecutionPolicy Bypass -File .\dsh-plugin\install.ps1 -Profile desktop -Link
```

卸载：

```powershell
powershell -ExecutionPolicy Bypass -File .\dsh-plugin\install.ps1 -Profile desktop -Uninstall
```

安装时可以直接写配置：

```powershell
powershell -ExecutionPolicy Bypass -File .\dsh-plugin\install.ps1 `
  -Profile desktop `
  -BaseUrl http://127.0.0.1:8767 `
  -ProjectDir E:\path\to\scholarloom `
  -AutoStart
```

也可以把 [config.example.yml](config.example.yml) 的 `insert` 块复制到 profile 的 `cordis.patch.yml`，或在 DSH 的「插件」页面编辑该行。重跑安装脚本会重建这个 managed 块，因此请不要把额外配置写在标记块内部。

### 作为 bundle 安装

如果包已发布到 npm，可以使用 DSH 的插件安装流程：

```powershell
dsh plugin --profile desktop add dsh-scholarloom
```

包内 `dsh.bundle.patch` 会自动挂载 `scholarloom-workbench`。**不要再保留手工 mount 行**，否则同一 id 会重复插入导致 loader 失败。

## 配置

插件行支持以下字段：

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `baseUrl` | `http://127.0.0.1:8766` | ScholarLoom 本地服务地址 |
| `projectDir` | 空 | 包含 `server.py` 的 ScholarLoom 目录；仅在 `autoStart` 开启时使用 |
| `pythonPath` | 空 | 显式 Python 路径；为空时优先 `.venv`，再退回 `python` |
| `autoStart` | `false` | 服务不可用时是否由插件启动 `projectDir` 下的 `server.py` |
| `requestTimeoutMs` | `60000` | 普通 API 请求超时 |

示例：

```yaml
- insert:
    - id: scholarloom-workbench
      name: 'dsh-scholarloom'
      config:
        baseUrl: http://127.0.0.1:8766
        projectDir: E:\path\to\scholarloom
        autoStart: false
```

`autoStart` 默认关闭，是为了避免旧服务停止时静默切换到另一个数据库。开启前请确认 `projectDir` 指向你想服务的文库。机器可读示例见 [config.example.yml](config.example.yml)，两种形态的完整配置见 [docs/CONFIGURATION.md](../docs/CONFIGURATION.md)。

## 使用

1. 启动 ScholarLoom 服务；
2. 在 DSH 左侧点「文献工作台」；
3. 从文库选择一篇文献；
4. 右侧读原文，左侧看速览 / 深读 / 问答 / 笔记 / 记忆；
5. 深读来源卡点「跳到原文」看段落定位与高亮；
6. 需要文字选择时直接在 PDF 上拖选，Ctrl+C 复制。

## 架构

```text
DSH 客户端
  ├─ main 面板（文献工作台）
  ├─ sidebar.panellist（入口图标）
  ├─ PDF.js 连续阅读器 + TextLayer
  └─ Agent 工具（search / paper / ask / status）
        │
        ▼  同源 fetch / import
/scholarloom/*（DSH Host 代理）
  ├─ GET  /api/state, /api/full-read
  ├─ POST /api/paper-chat, /api/document-state, /api/reading-memory
  ├─ POST /api/open-pdf（调用系统默认浏览器）
  ├─ GET  /api/document/<key>/pdf（Range）
  └─ GET  /vendor/pdfjs/*（PDF.js / cmaps）
        │
        ▼
127.0.0.1:8766 ScholarLoom 2.1.2
  data/workbench.sqlite + PDF 原件
```

### 安全边界

- 所有代理只监听 DSH 的回环 HTTP 服务；
- POST 检查 `Origin` / `Host`；
- PDF key 只允许 `[A-Za-z0-9_-]`；
- `/vendor/` 只允许 `[A-Za-z0-9._/-]`，拒绝 `..`；
- CSRF token 只留在 Host 内存，不下发给浏览器；
- `open-pdf` 只打开当前 `baseUrl` 的 PDF，不接受任意 URL；
- 不新增远端请求、遥测或第三方服务。

## 开发与自检

```powershell
node dsh-plugin/scripts/check.mjs
node --check dsh-plugin/lib/client.js
node --check dsh-plugin/lib/index.js
python -m py_compile server.py
node test_web.js
```

`install.ps1 -Link` 安装后，修改 `lib/client.js` 或 `lib/index.js`，切换 `scholarloom-workbench` 插件即可重新加载。

### PDF 渲染安全

在 DSH renderer 中跑 PDF.js/canvas 时：

- canvas 背板限制 6M 像素，`devicePixelRatio ≤ 2`；
- `getContext` 为空时抛错，不继续；
- IntersectionObserver 只保留视口附近页面，离屏释放 canvas / text layer；
- ResizeObserver 经 `requestAnimationFrame` 并设置 1px 阈值；
- renderer 崩溃日志在 `%APPDATA%\@deepseek-ai\dsh-desktop\logs\crash-*-renderer.log`。

## 已验证

- `/scholarloom/health` 连接正常；
- 文库 91 篇、90 篇有 PDF；
- PDF.js 连续多页、文本选择/复制、页码定位；
- 深读 63 个单元，来源卡片带原文、解读和 `rects`；
- 阅读记忆新增 / 列出 / 删除；
- 证据问答、笔记、阅读状态写回；
- `scholarloom_status` / `search` / `paper` 工具；
- DSH 重启后插件入口和工具恢复。

## 已知限制

- 「跳到原文」的金色高亮约 6.5 秒后消失，不是持久批注；暂不支持把选区保存为摘录。
- 扫描版 / 纯图片 PDF 没有文本层，不能选择文字。
- 记忆页目前固定 `project=default`，其他课题的记忆不会显示。
- 历史运行时与工作区数据库是两套数据；插件不自动合并。
- DSH 桌面窗口小于布局视口时，右侧可能被窗口裁切；最大化窗口即可。

## License

MIT。见 [LICENSE](LICENSE)。
