<div align="center">
  <img src="docs/assets/scholarloom-banner.svg" alt="ScholarLoom - 本地优先的科研工作台" width="100%">

  <h3>自动收文 · 逐页证据 · 项目记忆</h3>

  <p>
    <strong>把堆满 PDF 的下载文件夹，变成会积累的研究工作台。</strong><br>
    ScholarLoom 自动接收并核验文献，把并行阅读、页码证据、项目笔记与跨篇综合放在同一个本地工作区。
  </p>

  <p>
    <a href="https://github.com/segayi1/scholarloom/actions/workflows/ci.yml"><img src="https://github.com/segayi1/scholarloom/actions/workflows/ci.yml/badge.svg?branch=main" alt="测试"></a>
    <a href="https://github.com/segayi1/scholarloom/releases/latest"><img src="https://img.shields.io/github/v/release/segayi1/scholarloom?color=174c42" alt="最新版本"></a>
    <img src="https://img.shields.io/badge/local--first-yes-d7b76d" alt="本地优先">
    <img src="https://img.shields.io/badge/Python-3.12%2B-174c42" alt="Python 3.12+">
    <img src="https://img.shields.io/badge/Windows%20%7C%20macOS%20%7C%20Linux-supported-d7b76d" alt="支持 Windows、macOS 和 Linux">
    <a href="LICENSE"><img src="https://img.shields.io/github/license/segayi1/scholarloom?color=c9705b" alt="MIT 许可证"></a>
  </p>

  <p>
    <a href="https://github.com/segayi1/scholarloom/releases/latest"><strong>下载最新版</strong></a>
    ·
    <a href="#快速开始">快速开始</a>
    ·
    <a href="#进一步了解">文档</a>
  </p>

  <p><a href="README.md">English</a> · <strong>简体中文</strong></p>
</div>

> **从收到文件，到形成有引用的综合结论。** ScholarLoom 在导入前核验文献，让回答始终靠近支撑它的原文页面，也把零散阅读变成可继续使用的研究积累。

## 一个工作台，完成整条阅读链路

| 收文 | 研读 | 连接 |
| :--- | :--- | :--- |
| 监视文献真正进入电脑的位置，核验题录、去除重复文件，建立干净的本地资料库。 | 多篇论文并行打开，向正文提问并跳到引用页，在原文旁研究 Figure，保存摘录和项目笔记。 | 在资料库中检索，比较 2–12 篇文献，生成聚焦小综述，也可以发现相关开放论文。 |

<div align="center">
  <img src="docs/assets/scholarloom-workflow.zh-CN.svg" alt="ScholarLoom 全流程工作流" width="100%">
</div>

## 为什么选 ScholarLoom

### 收文先替你清理杂乱

ScholarLoom 会等待下载完成，读取文件首页，用 DOI、专利号或预印本信息核对公开题录，并把模糊文件留在待核对队列。核验通过的全文进入稳定的本地资料库，下载目录中的原文件保持原位。

### 答案可以回到原文

速读卡帮你判断一篇论文值不值得读。深度报告继续给出论文大纲、论证链、方法审计、作者明确陈述和可复用笔记。回答在能够定位时给页码引用，点击即可回到 PDF 对应段落；引用覆盖率单独显示，证据不足的地方不会被藏起来。

### 阅读过程会积累

摘录、项目背景、研究偏好和完成的问答都可以保存。项目与论文范围控制召回内容，记忆可以检查、修改和删除。项目可导出 Markdown，完整阅读历史可导出 JSON。

### 本地工作台，始终属于你

工作台运行在 `127.0.0.1`，资料库使用 SQLite 和本地文件，需要文献整理时再连接 Zotero。AI 功能支持任意 OpenAI Chat Completions 兼容接口，也可以先只使用自动收文和阅读工作台。

## 2.0 亮点

- **多篇论文并行阅读。** 每篇独立保存页码和缩放，刷新后恢复阅读现场。
- **逐页深度阅读报告。** 按需生成阅读决策、论文大纲、论证角色、方法审计和带证据的笔记。
- **项目隔离的阅读记忆。** 支持修改、删除、上下文上限，以及 Markdown 或 JSON 导出。
- **把 Figure 和正文一起读。** 本地高清裁剪、图注与正文提及候选、项目笔记，以及 PDF 变化后的过期提示。
- **低门槛翻译。** 支持浏览器本地、在线后备或可选离线模型；安装前展示体积、质量和使用边界。
- **失败可恢复。** 批量速读失败后可以逐篇重试，资料库检查支持在线一致的备份。

## 快速开始

### Windows

1. 打开 [最新版本](https://github.com/segayi1/scholarloom/releases/latest)，下载并解压到非系统保护目录。
2. 首次使用时双击 `setup.cmd`，脚本会创建 `.venv` 并安装依赖。
3. 双击 `launch.vbs`，打开 `http://127.0.0.1:8766`。

### macOS 和 Linux

```sh
git clone https://github.com/segayi1/scholarloom.git
cd scholarloom
chmod +x setup.sh start.sh
./setup.sh
./start.sh
```

打开 `http://127.0.0.1:8766`。

### 按需连接

- 添加一个下载文件夹，用页面顶部的开关暂停或恢复监听。
- 需要在 Zotero 中管理分类、标签和附件链接时，再连接 Zotero。
- 需要速读、问答、深度报告和跨篇综合时，添加 OpenAI 兼容接口、模型名和 API Key。

## 技术栈

Python 3.12 · SQLite · PDF.js · Crossref · arXiv · OpenAlex · 可选 Zotero · 任意 OpenAI Chat Completions 兼容接口

服务只绑定本机，浏览器界面随项目一起提供。开发检查见 [CONTRIBUTING.md](CONTRIBUTING.md)，GitHub Actions 会在推送和 Pull Request 时运行完整的 Python 与 JavaScript 测试。

## 进一步了解

| 从这里开始 | 深入了解 |
| :--- | :--- |
| [使用指南](docs/USAGE.md) | 收文、阅读、问答、记忆、Figure、综述和发现 |
| [项目记忆](docs/PROJECT_MEMORY.md) | 产品方向、架构和已知缺口 |
| [数据格式](docs/DATA_FORMAT.md) | 存储结构、设置和私有字段 |
| [参与贡献](CONTRIBUTING.md) | 开发环境与贡献流程 |
| [安全策略](SECURITY.md) | 漏洞报告与信任边界 |
| [更新日志](CHANGELOG.md) | 各版本的功能与修复 |

## 贡献者

**主要贡献人与维护者：** [segayi1](https://github.com/segayi1)

## 许可证

MIT，详见 [LICENSE](LICENSE)。
