# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
