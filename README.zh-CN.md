<div align="center">
  <img src="docs/assets/scholarloom-banner.svg" alt="ScholarLoom - 本地优先的科研工作台" width="100%">

  <h3>自动收文 · 证据研读 · 阅读记忆</h3>

  <p>
    <strong>把杂乱的下载文件夹变成私人科研工作台。</strong><br>
    本地收文、多篇并行阅读、逐页证据、AI 深度阅读报告与个人阅读记忆。
  </p>

  <p>
    <a href="https://github.com/segayi1/scholarloom/actions/workflows/ci.yml"><img src="https://github.com/segayi1/scholarloom/actions/workflows/ci.yml/badge.svg?branch=main" alt="测试"></a>
    <a href="https://github.com/segayi1/scholarloom/releases/latest"><img src="https://img.shields.io/github/v/release/segayi1/scholarloom?color=174c42" alt="最新版本"></a>
    <img src="https://img.shields.io/badge/Python-3.12%2B-174c42" alt="Python 3.12+">
    <img src="https://img.shields.io/badge/local--first-yes-d7b76d" alt="本地优先">
    <a href="LICENSE"><img src="https://img.shields.io/github/license/segayi1/scholarloom?color=c9705b" alt="MIT 许可证"></a>
  </p>

  <p><a href="README.md">English</a> · <strong>简体中文</strong></p>
</div>

ScholarLoom 会监视文献真正进入电脑的位置，在导入前核验文件，并把通过的文献稳定保存在本地资料库。连接 Zotero 后，它还会把父条目、分类、标签和本地附件链接写入 Zotero。研读区再把速读、全文问答、文献比较和新文献发现连到一起，同时不把你的文献库发送到 ScholarLoom 的托管账号。

> **从下载到理解，一条连续路径。** 文件在本地完成检查，元数据通过 Crossref 或 arXiv 解析，核验后的期刊论文、专利和预印本进入本地资料库，AI 给出的每个回答都能回到论文或具体 PDF 页面。

## 2.0 新功能

- **完整的阅读工作区。** 多篇论文在独立标签页中并行打开，各自保留页码和缩放；刷新后可以恢复上次阅读现场。
- **每个判断都回到证据。** 速读、问答与深度报告使用可核验的页码引用，点击即回到 PDF 对应段落；摘录可带页码、来源状态和项目信息导出。
- **有边界的个人记忆。** 问答历史、明确保存的项目记忆和摘录都保存在本地，支持项目隔离、修改、删除、上下文上限，以及 JSON/Markdown 导出。
- **不只停在摘要。** 按需生成阅读决策、论文大纲、论证链、方法审计、可复用笔记和逐页证据，并明确标出推断项或证据不足项。
- **图像和语言都在原文旁边。** 可框选 Figure 生成高清裁剪并保存项目笔记；选中文字可调用浏览器本地翻译、在线后备或可选离线模型。
- **失败可恢复，资料可检查。** 批量速读失败后可逐篇查看并重试；备份前可检查 SQLite 与本地附件库，并生成在线一致的备份快照。

## 三条主线，一个完整研究闭环

| 收文 | 研读 | 连接 |
| :--- | :--- | :--- |
| 监视文件夹、核验身份、去除重复文件，并把干净的记录保存到本地资料库。 | 生成结构化速读、向论文提问，并维护自己的阅读状态。 | 使用可解释的双语检索，比较文献证据，生成小综述，或发现相关研究。 |

## ScholarLoom 能做什么

### 把最杂乱的环节自动化

- **自动监视，无需反复守候。** 添加一个或多个下载文件夹。ScholarLoom 会等待 PDF 和 EPUB 下载完成，再让每个文件通过可见的队列。
- **先核验，再相信文件名。** 它在本地读取文件首页，提取 DOI 或专利号信号，查询 Crossref，并要求本地题名与出版方元数据相互吻合。
- **保持资料库干净。** 内容哈希、DOI 和专利号会阻止同一篇文献重复进入。核验通过的全文会复制到稳定的本地资料库，Downloads 中的原文件保持不变。
- **把不确定性明确留下。** 首页带可靠 DOI 的期刊论文、结构核验通过的专利，以及题名与 arXiv 或 Crossref 预印本记录相互匹配的预印本自动进入本地资料库，连接 Zotero 时再写入 Zotero。仅题名匹配的期刊记录、题录不一致、未核验预印本及其他模糊 PDF 留在待核对队列，并提供明确的手动确认导入操作；答辩 PPT、课程教案、教学课件与课堂讲义等明显非学术材料不进入默认收件箱和资料库，需要时可从“已排除”筛选审计。
- **没有模型或 Zotero 也能工作。** 自动本地收文、阅读工作台和可选的 Zotero 整理不依赖 AI 服务。待生成的速读可以稍后再处理。

### 围绕论文建立的研读工作台

- **把摘要变成阅读判断。** 结构化速读覆盖核心结论、研究问题、模型、方法、发现、应用场景、局限，并给出深读、通读、略读或参考的阅读决策、匹配度、关注点、顾虑和下一步。
- **同时打开多篇论文。** 内嵌 PDF.js 阅读器使用类似浏览器的标签页，各篇分别保存页码和缩放。刷新后恢复已打开论文，不会覆盖当前阅读位置。
- **先问论文，再跳到原文。** 可对最多 60 页已提取的 PDF 文本提问。回答使用 `[Page N]` 引用页码；每个可定位引用都能打开对应页面并高亮段落，引用覆盖率单独展示。
- **按需生成深度阅读报告。** 报告包含逐页大纲、论证角色、作者明确陈述、方法审计、可复用笔记，并把推断或证据不足的项目标出来。
- **保留完整的证据链。** 在 PDF 中选中文字即可提问、保存摘录或翻译。摘录保留论文、页码、项目和来源状态；项目可导出 Markdown，完整阅读历史可导出 JSON。
- **保存有边界的个人研究记忆。** 完成的问答、确认过的偏好、项目背景和假设保存在本地。项目与论文范围限制召回，修订会退休旧记忆；关闭召回后当前问答不会使用个人记忆。
- **把 Figure 和正文一起读。** 框选图像或分面即可生成高清本地裁剪，搜索图注与正文提及候选，保存项目笔记并回到原页。PDF 改变后，旧选择会标记为过期。
- **跨篇综合，而不是堆叠摘要。** 2–4 篇文献并排比较；选择 5–12 篇时生成聚焦小综述。较大的集合会使用带编号的证据台账、可选的聚焦问题，以及一段谨慎的 250–500 字综合结论。
- **让比较保持可追溯。** 论文观点使用固定的 `[P1]`–`[P12]` 编号；没有速读记录的文献会明确标为仅元数据；当前深度报告会增强跨篇比较，完成的综述可复制或下载为 Markdown。
- **维护阅读流程。** 将论文标记为未读、在读或已读，保存私人笔记，按状态筛选，并在首页查看最近 7 天新增的文献。

### 让检索依据始终可见

- **跨语言匹配相近概念。** 本地同义词组可以连接 `single B-cell`、`单B细胞` 和 `单细胞抗体` 等表达，再在题名、作者、标识符、研究问题、方法、发现和应用场景之间排序。
- **看见结果为什么出现。** 每条结果都会高亮直接命中的查询词，并说明命中了哪些字段。本地检索不依赖封闭的向量服务。
- **走出已有书架。** 切换到 `Discover online` 可免费检索 OpenAlex，也可以从某一篇论文的速读卡查找相关研究。
- **把有价值的开放论文带回来。** 结果显示引用次数和开放获取状态。经过验证的公开 HTTPS PDF 可以一键进入同一个收件箱，继续去重、本地保存、可选 Zotero 写入和速读流程。

### 把关键控制权留在本地

- **默认本地运行。** 服务只绑定 `127.0.0.1`，写请求需要进程级 CSRF 令牌，私有正文字段不会出现在公开浏览器响应中，密钥也不会进入 Git。
- **使用你自己的模型。** 支持任意 OpenAI Chat Completions 兼容接口。ScholarLoom 使用你配置的端点，不附带文献语料库，也不要求托管账号。
- **分别选择界面和 AI 语言。** 界面可切换英文或简体中文；AI 输出可单独选择 `跟随界面`、`简体中文` 或 `English`。
- **翻译不消耗研究模型 token。** 选中文字可使用浏览器 Translator API、免费在线后备或可选离线模型。设置页会在安装前显示下载体积、磁盘占用、隐私边界和质量提示。
- **可编辑研究提示词。** 六套中英双语提示词覆盖方法与证据、阴性结果、机制贡献、转化评估、跨篇仲裁和结构化速读。所有提示词都可以恢复为内置版本。
- **可恢复、可检查。** 批量速读失败后可展开并逐篇重试；备份前检查 SQLite 与本地附件库，并生成在线一致的资料库快照。

## 从文件到发现

<div align="center">
  <img src="docs/assets/scholarloom-workflow.zh-CN.svg" alt="ScholarLoom 全流程工作流" width="100%">
</div>

每一步都有可见状态。网络、Zotero 或模型暂时不可用时，条目仍可恢复；本地保存不依赖 Zotero。

## 快速开始

### 环境要求

- Python 3.12+
- 仅在需要写入 Zotero 时，才需要已启用本地 API 的 Zotero Desktop
- Node.js 20+，仅用于可选的 JavaScript 检查
- 用于 AI 研读、问答和综述的 OpenAI Chat Completions 兼容接口、模型名和 API Key
- 用于可选外部发现的 `api.openalex.org` 访问权限

### Windows：下载后直接运行

1. 打开 [Releases](https://github.com/segayi1/scholarloom/releases/latest)，下载 `scholarloom-v2.0.0.zip`。
2. 解压到任意非系统保护目录。
3. 首次使用时双击 `setup.cmd`，脚本会创建 `.venv` 并安装 Python 依赖。
4. 双击 `launch.vbs`，ScholarLoom 会在本机启动并打开 `http://127.0.0.1:8766`。

### 从源码运行

```sh
git clone https://github.com/segayi1/scholarloom.git
cd scholarloom
./setup.sh
./start.sh
```

打开 `http://127.0.0.1:8766`。

Windows 源码目录可运行 `setup.cmd`、`start.ps1` 或双击 `launch.vbs`。

### 连接各项服务

1. 添加需要监视的文件夹，并用页面顶部的文件监看开关暂停或恢复扫描。
2. 如需写入 Zotero，在 Zotero 中打开 `Settings -> Advanced`，启用 **Allow other applications on this computer to communicate with Zotero**。
3. 在 ScholarLoom 的 `Settings` 标签中点击 **Connect Zotero**。如需后台持续写入，请在 Zotero 中选择 **Always Allow**。
4. 输入 OpenAI 兼容的 HTTPS API 基础地址、模型名和 API Key。本机回环地址可以使用 HTTP。
5. 选择 AI 输出语言，保存设置，并运行 **Test research model**。
6. 新加入文件夹中的已有文件会先建立基线；需要处理时，使用 **Add existing downloads**。

## 隐私与数据

本仓库不包含任何文献记录、PDF、数据库内容、API Key 或 Zotero 快照。新克隆的项目会从空资料库开始。

| 本地路径 | 用途 | 是否进入 Git |
| :--- | :--- | :---: |
| `data/workbench.sqlite` | 文献、任务、设置、阅读记忆、深度报告、摘录和 Figure 笔记 | 否 |
| `data/secrets.bin` | 加密后的 API Key 与 Zotero 授权 | 否 |
| `data/Library/` | 已导入全文的稳定本地副本 | 否 |
| `data/translator/` | 可选的离线翻译模型 | 否 |
| `data/seed.json` | 可选的本地初始记录 | 否 |
| `data/guides.json` | 可选的主题指南与阅读路线 | 否 |
| `web/` | 浏览器界面 | 是 |

Windows 上，密钥和 Zotero 授权使用当前用户的 DPAPI 凭据加密。其他系统中，`data/secrets.bin` 仅保存在本机但不使用 DPAPI；请妥善保护。

模型请求只会发往设置中配置的接口，并可能产生服务商费用；请求包含完成任务所需的有限论文文本和阅读上下文，不会上传 PDF 文件或 Figure 图像。OpenAlex 查询只包含检索主题或 DOI，无需账号。可选的在线翻译后备只把选中的文字发送到 `translate.googleapis.com`。ScholarLoom 不会绕过出版方付费墙或 Zotero 权限确认。

## 质量检查

```sh
python -m unittest -v test_evidence.py test_pipeline.py test_server.py test_memory.py test_figure.py test_dossier.py test_local_translation.py
node test_web.js
node test_translation.js
node --check web/app.js
node --check web/translation.js
```

GitHub Actions 会在推送和 Pull Request 时运行完整的 Python 与 JavaScript 测试。

## 文档

| 从这里开始 | 深入了解 |
| :--- | :--- |
| [项目记忆](docs/PROJECT_MEMORY.md) | 产品沿革、架构、数据边界与已知缺口 |
| [使用指南](docs/USAGE.md) | 导入、阅读流程、问答、综述与外部发现 |
| [数据格式](docs/DATA_FORMAT.md) | 设置、存储结构、种子文件和私有字段 |
| [参与贡献](CONTRIBUTING.md) | 开发环境与贡献流程 |
| [安全策略](SECURITY.md) | 漏洞报告与信任边界 |
| [更新日志](CHANGELOG.md) | 各版本的功能与修复 |

## 贡献者

**主要贡献人与维护者：** [segayi1](https://github.com/segayi1)

## 许可证

MIT，详见 [LICENSE](LICENSE)。
