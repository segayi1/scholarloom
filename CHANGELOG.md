# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## 2.1.0 - 2026-11-12

### Added

- Resumable whole-paper reading with page analysis, experiment units, a cross-page overview, source anchors, restart recovery, cancellation, and per-run usage accounting.
- Project-scoped full-text search with index coverage, stale-version checks, and direct navigation from a matched passage to its page.
- Editable cross-paper evidence matrices with generated values, human revisions, source-version checks, conflict candidates, and CSV export.
- Project research drafts, saved revisions, source indexes, and project-scoped synthesis normalization.
- Named reading sessions with switching, rename, delete, draft recovery, request deduplication, and Markdown or text export.
- Deterministic overview validation and formulation-conflict detection for whole-paper and synthesis output.
- Windows desktop launcher with service reuse, restart, in-progress work protection, and the separate `8767` address.
- Paragraph interpretation, manual figure association, bounded online reading sources, fixed workspace navigation, and adjustable reader columns.
- An optional offline translation model installer at `install-translation-model.py`.

### Changed

- Raised the application version to 2.1.0 and pinned PyMuPDF 1.27.2.3, CTranslate2 4.8.5, and SentencePiece 0.2.3.
- Expanded GitHub Actions coverage to the complete Python, Web, translation, and Windows launcher suites.
- Documented release downloads, one-command setup, optional credentials, Zotero authorization, and third-party license boundaries.

### Fixed

- Page and source references now reject duplicate, invalid, stale, or out-of-range evidence positions instead of silently reusing cached content.
- Reading-memory deletion, revision, project isolation, and restart recovery now clear source-linked records and keep historical recall bounded.
- Generated synthesis no longer promotes limited excerpts into whole-paper negatives or unsupported functional-activation claims.

## 2.0.0 - 2026-11-06

### Added

- Local-first intake that completes without Zotero while preserving optional Zotero parent records, collections, tags, and linked attachments.
- One-click file-monitoring control, prior watch-folder restoration, metadata recovery, verified arXiv and Crossref preprint intake, and local save/health paths.
- Embedded PDF.js reader with browser-like multi-paper tabs, per-tab page and zoom state, session restoration, selection capture, and source-page navigation.
- Version-bound evidence store, page-locatable citations, quote validation, coverage reporting, reading excerpts, and project Markdown export.
- Persistent Q&amp;A history and explicit reading memory with project/paper scope, bounded recall, correction, deletion, JSON export, and disabled-recall mode.
- On-demand reading dossiers with reading decisions, paper outline, argument structure, methods audit, reusable notes, evidence repair warnings, and stale-version detection.
- Manual Figure crop selection, caption and mention candidates, project notes, high-resolution rendering, and staleness protection.
- Selected-text translation through the browser Translator API, online fallback, and optional offline model, with visible privacy and quality boundaries.
- Batch reading-card failure details and retries, online-consistent SQLite backup, library health checks, review-file opening, and project export.
- Windows `setup.cmd` plus PowerShell and POSIX setup scripts, virtual-environment startup helpers, and a downloadable release archive.

### Changed

- Expanded intake exclusions so obvious courseware, forms, figures, and other non-literature files stay out of the default inbox while remaining in the audit filter.
- Reading cards now include a structured reading decision while remaining backward compatible with historical cards.
- Comparison synthesis can use current dossiers and falls back to structured cards for papers without one.
- External service and application user agents identify ScholarLoom 2.0.0.
- CI now runs the complete Python and JavaScript regression suites.

### Fixed

- Summary failures caused by truncated, empty, or reasoning-only model responses now remain visible and retryable.
- Local-only documents suppress Zotero navigation links; malformed or unavailable PDFs report actionable errors instead of stale content.
- Figure crops honor rotated page display coordinates; evidence references reject absent or stale PDF versions.
- Offline translation is visibly labeled as a lower-quality fallback, and online translation no longer consumes research-model tokens.

## 1.4.0 - 2026-11-05

### Added

- Manual import confirmation action (`/api/confirm`) for reviewed records, allowing user-verified items to enter the import queue.
- Resilient external scholarly search with OpenAlex polite pool and seamless fallback to Crossref on rate-limit, empty results, or timeout.
- Dedicated search submit button (`#search-submit`) and dynamic result hints for external scholarly discovery.
- Venue and data provider badges on external paper cards with bottom-aligned action buttons.

### Changed

- Tightened automatic intake: only high-confidence DOI-backed journal articles and structurally verified patents import automatically; title-only matches wait for review.
- Direct exclusion of non-literature materials (defense PPTs, course lesson plans, lecture courseware, exams, homework, and invoices) without cluttering the review queue.
- Reclassify cached inspection jobs automatically when the local classifier upgrades (`INSPECTION_VERSION = 4`).
- Upgraded external search layout to responsive full-width multi-column grid when sidebar is hidden.

### Fixed

- Eliminated duplicate search requests and false 429 errors caused by IME composition enter keys and rapid concurrent submissions.
- Fixed 236px narrow-column layout bug on external search cards when sidebar is hidden.

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
