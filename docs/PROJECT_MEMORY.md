# ScholarLoom Project Memory

Updated: 2026-11-06

## Project definition

ScholarLoom turns a messy download folder into a local-first research desk. It verifies PDFs and EPUBs before import, keeps a stable local copy even when Zotero is unavailable, and connects reading cards, page-grounded Q&A, cross-paper synthesis, discovery, and personal reading state in one local application. When connected, Zotero remains the bibliographic organization layer and owns the corresponding parent records, collections, tags, and linked attachments.

The product direction is broader than PDF chat: ScholarLoom should become the reading and knowledge workspace, while Zotero continues to manage records and source files.

## Current baseline

- Repository: `https://github.com/segayi1/scholarloom`
- Branch: `main`
- Source release: `v2.0.0`
- Release scope: local-first intake, evidence reader, reading memory, dossiers, figures, translation, and recovery controls
- Runtime: Python 3.12, standard-library HTTP server, SQLite, PyMuPDF
- Frontend: plain HTML, CSS, and JavaScript; no build step
- Default address: `http://127.0.0.1:8766`

## Delivered history

### 1.0: local intake

- Monitors download folders and waits for files to settle.
- Reads local file content, extracts DOI or patent signals, and checks Crossref metadata.
- Deduplicates by content hash, DOI, and patent number.
- Imports verified records into the stable local library, with optional Zotero parent/collection/attachment writes when authorized.

### 1.1-1.2: usable bilingual workbench

- Added English and Simplified Chinese interface switching.
- Renamed the project to ScholarLoom.
- Added explainable bilingual search across titles, authors, identifiers, and reading-card fields.

### 1.3: evidence-oriented reading

- Added structured reading cards and page-labelled PDF Q&A.
- Added comparison for 2-4 papers and evidence-led mini-reviews for 5-12 papers.
- Added six editable bilingual research prompts and independent AI output language.
- Added OpenAlex discovery, related-work lookup, and validated open-access PDF intake.
- Added unread/reading/read state, private notes, filters, and a seven-day home digest.

### 1.4: safer intake and resilient discovery

- Tightened automatic intake to high-confidence DOI-backed journal articles and structurally verified patents.
- Directly excludes obvious non-literature files while sending ambiguous records to review.
- Added manual confirmation for reviewed records.
- Added OpenAlex polite-pool access and Crossref fallback for rate limits, timeouts, and empty results.
- Fixed IME-triggered duplicate searches and the narrow external-card layout.

### 1.5: recognition recovery and attention boundaries

- Uses PDF document metadata as secondary identity evidence when page text is incomplete: a metadata DOI still must resolve through Crossref and agree with the metadata title or text evidence.
- Recognizes title-matched arXiv records and Crossref preprint records without inventing a journal DOI; verified preprints are stored with `kind: "preprint"` and a repository/archive identity.
- Keeps obvious non-literature in SQLite for audit but removes it from the default inbox and progress totals. The `Excluded` filter remains the explicit audit path.

Historical library counts belong to earlier local runtimes and are not part of the v2.0 release record.

### 2.0: complete local research reader

- Added a browser-like multi-paper PDF reader with independent page/zoom state and session restoration.
- Added SHA-bound evidence pages, page-locatable citations, quote validation, excerpts, persistent Q&amp;A, scoped reading memory, and bounded context.
- Added on-demand reading dossiers with reading decisions, outline, argument roles, methods audit, evidence repair, and stale-version detection.
- Added manual figure crops and project notes, selected-text translation, batch failure recovery, backup/health controls, and a one-click installation path.
- Kept intake, local library, and reader usable without Zotero or a configured model; AI features remain optional.

## Architecture

`server.py` owns the HTTP boundary, SQLite database, Zotero local API communication, model calls, prompt presets, and application state. `pipeline.py` owns local file inspection, metadata verification, conservative classification, PDF text extraction, and external literature search. `evidence.py`, `memory.py`, `dossier.py`, and `figure.py` own the versioned reading stores. `web/` is the browser client. Tests cover intake rules, secret handling, API boundaries, reading evidence, memory, dossiers, figures, synthesis, Zotero retry behavior, translation, and frontend checks.

Private fields are removed from `/api/state`. Zotero credentials and the model key are stored in `data/secrets.bin`, using Windows DPAPI when available. A fresh checkout starts with an empty library.

## Data and runtime

Historical runtime data is intentionally not shipped. A checkout starts with an empty `data/` library; the active local database, encrypted credentials, cached PDFs, translator models, and logs are runtime files and stay outside Git. Do not publish a populated data directory or migrate historical records as part of routine source work.

## Known gaps and next candidates

- An embedded PDF.js reader supports text selection and durable paper/project conversations; Zotero remains an optional opening path.
- A structured peer-review/annotation store and reliable Zotero annotation synchronization remain pending.
- Cross-library full-text retrieval and an editable claim/evidence relationship matrix are not implemented.
- External discovery and model calls depend on network availability; the intake path does not require a model.
- Zotero annotation round-tripping remains the highest-uncertainty integration area.

Attachment-version binding, quote validation, excerpts, and project reading memory are implemented. The next evidence milestone is longitudinal retrieval/answer evaluation and annotation interoperability.

## Working rules

Preserve historical results. Prefer additive, reversible changes. Keep scientific and product claims tied to inspected artifacts. Treat Zotero metadata, local PDFs, user notes, and model credentials as private. Verify behavior with tests and a real runtime path before calling a feature complete.

## Current memory implementation

The embedded PDF.js reader and shared SQLite reading-memory module persist completed exchanges, restore history, recall explicit scoped memories, and limit total request input. Reader memory controls support correction, deletion, export, and disabling recall. Release 2.0.0 describes the current behavior.
