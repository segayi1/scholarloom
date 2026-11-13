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

## 2.1 亮点

- **整篇深读。** 逐页分析、实验分组、跨页概述、来源定位、断点续跑和任务取消。
- **项目检索与证据矩阵。** 检索课题内全部 PDF，在可编辑矩阵中比较 2–12 篇文献，分离人工修订与生成值，并检查来源版本冲突。
- **课题调研初稿。** 基于有限全文段落生成聚焦综述，保存修订、来源编号与可定位引文。
- **命名阅读会话。** 在同一篇论文内保留多条研究线索，恢复草稿与选区，导出会话，并避免重试产生重复回答。
- **阅读与桌面工作流。** 并行标签页、固定导航与滚动、可调阅读栏、段落解读、手动图表关联，以及带进行中任务保护的 Windows 启动器。
- **更明确的证据边界。** 校验概述、提示配方冲突、拒绝过期证据位置，并区分模型解释与论文证据。

## 下载与自动安装

发布包就是完整源码，不需要构建步骤、包管理器或云端账户即可使用本地收文和阅读功能。

### Windows PowerShell

```powershell
$zip = "$env:TEMP\ScholarLoom-2.1.2.zip"
$dst = Join-Path $env:LOCALAPPDATA "ScholarLoom"
Invoke-WebRequest "https://github.com/segayi1/scholarloom/releases/latest/download/ScholarLoom-2.1.2.zip" -OutFile $zip
Expand-Archive $zip $dst -Force
Set-Location (Join-Path $dst "ScholarLoom-2.1.2")
.\setup.ps1
```

安装后双击 `launch.vbs` 启动。

### macOS 和 Linux

```sh
curl -fL https://github.com/segayi1/scholarloom/releases/latest/download/ScholarLoom-2.1.2.tar.gz -o /tmp/ScholarLoom-2.1.2.tar.gz
tar -xzf /tmp/ScholarLoom-2.1.2.tar.gz
cd ScholarLoom-2.1.2
./setup.sh
./start.sh
```

`setup.cmd`、`setup.ps1` 和 `setup.sh` 会创建 `.venv`、安装固定版本依赖并验证运行时导入。可选离线翻译模型可单独下载：

Windows PowerShell：

```powershell
.\.venv\Scripts\python.exe install-translation-model.py
```

macOS/Linux：

```sh
.venv/bin/python install-translation-model.py
```

## 快速开始

### Windows

1. 打开 [最新版本](https://github.com/segayi1/scholarloom/releases/latest)，下载并解压到非系统保护目录。
2. 首次使用时双击 `setup.cmd`，脚本会创建 `.venv` 并安装依赖。
3. 双击 `launch.vbs` 打开 `http://127.0.0.1:8766`，或使用 `launch-desktop.ps1` 打开 `http://127.0.0.1:8767`。

### macOS 和 Linux

```sh
tar -xzf ScholarLoom-2.1.2.tar.gz
cd ScholarLoom-2.1.2
chmod +x setup.sh start.sh
./setup.sh
./start.sh
```

打开 `http://127.0.0.1:8766`。

### 授权与可选服务

- **本地工作区：** 收文、PDF 阅读、课题整理和本地检索不需要账户或 API Key。
- **AI 模型：** 在设置中填写 OpenAI 兼容接口、模型名和 API Key，再点击“测试模型”。Windows 使用当前用户的 DPAPI 加密保存密钥；密钥不会发送到浏览器，也不会写入阅读记录。本机回环接口可以省略密钥。
- **Zotero：** 点击 Zotero 连接按钮，并在 Zotero 弹窗中一次性选择“始终允许”。这是可选的分类、标签和附件关联写入接口，权限可随时在 Zotero 撤销。
- **翻译：** 浏览器本地翻译首次使用需要浏览器语言包权限；在线后备只把所选文本发送到 `translate.googleapis.com`。可选离线模型使用上方命令或在设置中点击下载。
- **下载：** 核心安装脚本只在安装 Python 包时需要网络；离线翻译模型单独下载，不包含在发布包内。

生成的摘要和综述仍是模型解读：引用可定位只证明来源页码存在，具体论断仍需逐项核对原文。

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

ScholarLoom 原创源代码采用 [MIT 许可证](LICENSE)。第三方组件保留各自的许可证；
其中 PyMuPDF 采用 AGPL-3.0 或商业许可证。再分发前请阅读
[第三方说明](THIRD_PARTY_NOTICES.md)。
