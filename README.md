<div align="center">
  <img src="docs/assets/scholarloom-banner.svg" alt="ScholarLoom - a local-first research studio" width="100%">

  <h3>Automatic intake · Evidence-grounded reading · Project memory</h3>

  <p>
    <strong>Turn a crowded download folder into a research desk that remembers.</strong><br>
    ScholarLoom watches incoming papers, verifies each record, and connects parallel reading, page-level evidence, project notes, and cross-paper synthesis in one local workspace.
  </p>

  <p>
    <a href="https://github.com/segayi1/scholarloom/actions/workflows/ci.yml"><img src="https://github.com/segayi1/scholarloom/actions/workflows/ci.yml/badge.svg?branch=main" alt="Tests"></a>
    <a href="https://github.com/segayi1/scholarloom/releases/latest"><img src="https://img.shields.io/github/v/release/segayi1/scholarloom?color=174c42" alt="Latest release"></a>
    <img src="https://img.shields.io/badge/local--first-yes-d7b76d" alt="Local-first">
    <img src="https://img.shields.io/badge/Python-3.12%2B-174c42" alt="Python 3.12+">
    <img src="https://img.shields.io/badge/Windows%20%7C%20macOS%20%7C%20Linux-supported-d7b76d" alt="Windows, macOS, and Linux">
    <a href="LICENSE"><img src="https://img.shields.io/github/license/segayi1/scholarloom?color=c9705b" alt="MIT License"></a>
  </p>

  <p>
    <a href="https://github.com/segayi1/scholarloom/releases/latest"><strong>Download latest</strong></a>
    ·
    <a href="#quick-start">Quick start</a>
    ·
    <a href="#documentation">Documentation</a>
  </p>

  <p><strong>English</strong> · <a href="README.zh-CN.md">简体中文</a></p>
</div>

> **From incoming file to traceable synthesis.** ScholarLoom verifies papers before import, keeps every useful answer close to the page that supports it, and turns reading notes into reusable research state.

## One workspace for the whole reading loop

| Capture | Read | Connect |
| :--- | :--- | :--- |
| Watch the folders where papers actually arrive, verify each record, remove duplicates, and build a clean local library. | Open papers in parallel tabs, ask questions with page citations, study figures beside the source, and save excerpts and project notes. | Search across your library, compare 2–12 papers, generate a focused mini-review, and discover related open-access work. |

<div align="center">
  <img src="docs/assets/scholarloom-workflow.svg" alt="ScholarLoom end-to-end workflow" width="100%">
</div>

## Why ScholarLoom

### Intake that removes clutter

ScholarLoom waits for downloads to settle, reads the opening pages, checks DOI or patent signals against public metadata, and keeps ambiguous files in a review queue. Accepted papers move into a stable local library while the originals stay where they are.

### Answers you can inspect

Reading cards summarize the paper. Dossiers go further with an outline, argument chain, methods audit, author-stated claims, and reusable notes. Answers cite pages where evidence can be located, and every located citation jumps back into the PDF. Citation coverage is shown separately, so the evidence boundary of each answer stays visible.

### A memory you can edit

Save excerpts, project context, preferences, and completed Q&A. Project and paper scopes keep recall relevant; memory can be reviewed, revised, or deleted. Export a project as Markdown or the full reading history as JSON.

### A workspace that stays yours

Run the workbench on `127.0.0.1`, keep the library in SQLite and local files, and connect Zotero only when you want bibliographic organization. Use any OpenAI-compatible Chat Completions endpoint for AI features, or keep the intake and reading workspace running without one.

## New in 2.0

- **Parallel paper tabs.** Independent page and zoom state, restored after reload.
- **Page-grounded dossiers.** Reading decision, outline, argument roles, methods audit, and evidence-linked notes on demand.
- **Personal research memory.** Project isolation, bounded recall, revisions, deletion, and Markdown or JSON export.
- **Figure reading.** High-resolution local crops, caption and in-text reference candidates, project notes, and stale-version warnings.
- **Low-friction translation.** Browser-local translation, an online fallback, or an optional offline model with quality and size shown before installation.
- **Recoverable workflows.** Failed reading-card batches can be retried per paper, and health checks support an online-consistent library backup.

## Quick start

### Windows

1. [Download the latest release](https://github.com/segayi1/scholarloom/releases/latest) and extract it outside a protected system folder.
2. Double-click `setup.cmd` once to create `.venv` and install dependencies.
3. Double-click `launch.vbs` and open `http://127.0.0.1:8766`.

### macOS and Linux

```sh
git clone https://github.com/segayi1/scholarloom.git
cd scholarloom
chmod +x setup.sh start.sh
./setup.sh
./start.sh
```

Open `http://127.0.0.1:8766`.

### Connect what you need

- Add a download folder and use the header switch to pause or resume monitoring.
- Connect Zotero if you want collections, tags, and linked attachments managed there.
- Add an OpenAI-compatible endpoint, model name, and API key for reading cards, Q&A, dossiers, and synthesis.

## Built with

Python 3.12 · SQLite · PDF.js · Crossref · arXiv · OpenAlex · optional Zotero · any OpenAI-compatible Chat Completions endpoint

The server binds to localhost, and the browser UI ships with the project. Development checks are documented in [CONTRIBUTING.md](CONTRIBUTING.md), and GitHub Actions runs the full Python and JavaScript suites on pushes and pull requests.

## Documentation

| Start here | Go deeper |
| :--- | :--- |
| [Usage guide](docs/USAGE.md) | Intake, reading, Q&A, memory, figures, synthesis, and discovery |
| [Project memory](docs/PROJECT_MEMORY.md) | Product direction, architecture, and known gaps |
| [Data format](docs/DATA_FORMAT.md) | Storage shape, settings, and private fields |
| [Contributing](CONTRIBUTING.md) | Development setup and contribution flow |
| [Security policy](SECURITY.md) | Vulnerability reporting and trust boundaries |
| [Changelog](CHANGELOG.md) | Features and fixes by release |

## Contributors

**Primary contributor and maintainer:** [segayi1](https://github.com/segayi1)

## License

MIT. See [LICENSE](LICENSE).
