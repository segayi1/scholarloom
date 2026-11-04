# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## 1.3.0 - 2026-11-04

### Added

- Evidence-grounded single-paper Q&A using up to 60 page-labelled PDF pages, with `[Page N]` links into Zotero.
- Cross-paper comparison and focused mini-review for 2–12 papers, with an evidence ledger, optional focus question, paper-ID citations, and copy/download Markdown.
- Six editable Chinese/English research prompt presets with one-click restoration.
- Independent AI output language control (`auto`, `zh`, `en`).
- Free OpenAlex topic discovery and paper-to-paper related-work recommendations.
- Validated OA PDF download into the existing inbox, deduplication, and Zotero import workflow.
- Search match explanations and direct-term highlighting without changing result ranking.
- Unread/reading/read state, per-document reading notes, a reading-status filter, and a seven-day home digest.

### Changed

- Redesigned the workbench with an editorial research-library layout, clearer inbox hierarchy, clickable status filters, stronger scanability, keyboard focus states, and responsive desktop/mobile navigation. Tab changes now return the current page to the top before swapping views, avoiding an abrupt layout jump.

## 1.2.0 - 2026-11-03

### Changed

- New imports and manually regenerated reading cards now follow the selected English or Simplified Chinese interface language. Existing summaries remain unchanged.
- Renamed the project to ScholarLoom and added the subtitle **automatic intake, AI reading cards, and semantic matching**.
- Reframed search documentation around explainable bilingual synonym matching across titles, reading cards, research questions, methods, findings, and use cases.

## 1.1.0 - 2026-11-03

### Added

- English / Simplified Chinese interface switch with browser-persisted preference.
- Expanded README workflow and capability documentation.

## 1.0.0 - 2026-11-03

### Added

- Local download-folder monitoring with stable-file detection.
- Conservative journal article and patent recognition using DOI, Crossref metadata, title agreement, and patent front-page structure.
- Content hash, DOI, and patent number deduplication.
- Zotero local API authorization and persistent collection/tag/attachment import.
- Local SQLite processing queue and reading dashboard.
- Optional Chinese reading cards through Chat Completions-compatible endpoints.
- Empty-install startup, tests, CI workflow, and project documentation.

### Fixed

- Unicode ligatures in PDF-extracted DOIs.
- Author manuscripts without an embedded DOI.
- Published journal version resolution for preprints with a `posted-content` DOI.
- Empty arrays returned by models for an absent `limitations` field.
