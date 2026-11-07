# Usage

## Daily Workflow

Download a PDF or EPUB into a watched folder. The workbench waits until the file stops changing, then shows its progress in the inbox. Verified journal articles, patents, and title-matched arXiv or Crossref preprints are saved to the stable local library. When Zotero is connected and authorized, the same record is also placed in a topic collection and linked to that local copy; without Zotero, intake still completes locally. If a model is configured, a reading card is generated from the publisher abstract or a bounded local text excerpt.

New reading cards also include a reading decision such as deep read, read, skim, or reference, plus the paper’s fit, reading focus, concerns, and a next action. Older cards remain valid and show no decision until regenerated. The decision is a triage aid generated from the paper text; verify it against the source.

Use the `Search and guides` tab to search titles, authors, DOI, patent number, reading cards, and keywords. A result states which fields matched and highlights direct search terms. Use the reading-status filter, or update a card's unread/reading/read state and short note without changing its summary. `Regenerate summary` retries only the current reading card. The home view lists literature added in the previous seven days.

Use the `EN` / `中文` button in the header to switch the interface language. In Settings, `AI output language` controls new and regenerated reading cards, single-paper Q&A, and cross-paper synthesis independently. `Follow interface` resolves to the active interface language; `简体中文` and `English` keep AI output fixed. Existing reading cards remain unchanged until regenerated, and bibliographic data keeps its source language.

Search uses weighted local matching across bibliographic fields and reading cards. Built-in Chinese/English synonym groups connect related research terms without sending queries to another service.

## Evidence-Grounded Reading

Open the embedded reader to ask about a local PDF. ScholarLoom indexes extractable PDF pages and retrieves bounded passages for the question. Evidence citations link to the indexed page where available; citation coverage reports whether a reference was located, not whether a claim is scientifically correct. When page text is unavailable, the answer uses the available abstract or saved excerpt and labels that narrower basis. Image-only PDFs require OCR, which is not yet provided.

For deeper reading, use the `深入理解` section of the reader’s `AI 助手` and generate a dossier on demand. It builds a page-grounded reading path, argument structure, methods audit, and reusable notes from the current PDF. Author-stated claims, outline items, reported methods, and reusable notes must cite supplied evidence; inferred or unclear items are labeled. Click an evidence marker to jump back to the page and highlight the located passage. A changed PDF marks the saved dossier stale. Citation coverage verifies that a source can be found, not that its scientific claim is correct. Generation is optional because it takes longer and uses more model tokens than the compact card.

The workbench offers a continue-reading shortcut for the browser's last open reader tab. Reading position and open tabs are stored in that browser. In the reader notes, export the current project's excerpts as Markdown with paper keys, page numbers, and evidence states. For a batch with failures, expand the status message to inspect and retry the failed papers; retrying calls the configured model again.

The reader sidebar keeps two entries: `AI 助手` and `笔记`. The shared project selector at the top of the reader links guides, questions, excerpts, and figure notes to the same project. Select text in the PDF to ask a question, save an excerpt, or translate it. In `AI 助手`, click `在原文中框选图像`, then drag over a figure or panel on a PDF page. Enter a figure number such as `2` or `S3` to search extracted text for caption and in-text reference candidates; click a page number to check the original. Add a note and save it to the current project. Saved selections retain the paper, page, selection coordinates and PDF version. If the PDF changes, the selection is marked stale. Caption matching depends on extractable text and is a starting point for manual verification; image-only PDFs are not searched by OCR. Figure selection and matching run locally and do not send an image to a model.

## Selected-Text Translation

Select English text in a PDF and click `翻译`. `Settings -> Translation` detects the browser’s built-in Translator API and can initiate its language-pack download from a button click. When browser translation is unavailable, ScholarLoom uses a free online translation endpoint; this sends only the selected text to `translate.googleapis.com` and does not consume the configured research-model tokens. The settings page also offers an offline model with a 67.5 MB download and about 149.1 MB on disk after installation. Offline results are labeled as lower quality so numbers, abbreviations, and terminology can be checked. The source text and page remain visible; translations are cached for the current browser session and are not added to the paper record.

The translation flow does not create a second reading card or change the paper’s bibliographic data. Prompt presets remain available for model-backed research prompts under `Settings -> Research prompt presets`, but the reader uses one question box instead of presenting the presets as separate reading modes.

## Comparison Synthesis

Select 2–12 papers in `Search and guides`, open `Compare`, optionally enter a focus question, and generate the report. Two to four papers retain the side-by-side table. Five or more use a compact evidence ledger. The model receives paper IDs and structured reading cards, then must cite claims as `[P1]`, `[P2]`, and so on. When a current deep-reading dossier exists, comparison also receives its outline, argument roles, methods audit, and reusable notes; papers without a current dossier fall back to their card fields. Records without structured cards remain visible as metadata but cannot support a conclusion. The report covers scope and consensus, supporting evidence, disagreements and limits, heterogeneity, gaps, and a cautious 250–500-word synthesis. Copy or download the Markdown without changing the underlying records.

## Online Discovery And OA Import

In `Search and guides`, switch the search scope to `Discover online` and enter a topic. ScholarLoom queries the free OpenAlex API and returns titles, authors, citation counts, source links, abstracts when available, and open-access status. A reading card's related-literature panel uses OpenAlex related-work links for paper-to-paper discovery.

`Add to local library` is shown only for a public HTTPS OA PDF. The server validates every redirect, caps the file at 150 MB, verifies the PDF signature, and places the download in the same inbox used by watched folders. Journal/patent verification, duplicate checks, local saving, optional Zotero import, and automatic reading-card generation then proceed normally. A publisher landing page without an OA PDF is a discovery result only; ScholarLoom does not bypass a paywall.

External discovery and local matching are separate. Local synonym search remains deterministic and works offline. Online discovery requires access to `api.openalex.org`, and model-backed Q&A or synthesis requires a configured Chat Completions endpoint.

## Review Queue

Files that lack reliable identity evidence, point to an unverified preprint record, or whose title evidence disagrees with Crossref stay in the review queue. A title-only Crossref match without a first-page DOI is evidence for review, not enough for automatic import. Defense presentations, course lesson plans, lecture courseware, and other obvious non-literature are excluded from the default inbox and library; select `Excluded` in the status filter when you need to audit them.

Use `Confirm import` when the displayed title and type are correct; the record then enters the normal local-save queue and is also written to Zotero when that connection is authorized. Use `Retry` after a network error or after replacing a file. Use `Ignore` for files that are not literature. None of these actions deletes the downloaded file.

## Zotero Authorization

Zotero is optional for automatic file intake. Its single-use `Allow` grant is insufficient for unattended Zotero imports; choose `Always Allow` once from the workbench connection button when you want records and linked attachments written into Zotero. The key is stored in `data/secrets.bin` and is bound to the Zotero server ID. Reauthorize if Zotero reports that the library changed.

## Existing Downloads

Use the file-monitoring switch in the header to pause or resume scanning without changing the Zotero connection. Newly watched folders are baselined so that the workbench does not process every old file at once. Click `Add existing downloads` to enqueue them. Imported content hashes and DOI matches prevent duplicate records.

## Backups

Stop the local server, then back up the entire application directory, especially `data/workbench.sqlite` and `data/Library/`. Moving the directory changes the absolute paths stored in Zotero linked attachments for Zotero-backed records; update those paths after a move.

On Windows, encrypted credentials cannot be decrypted by a different Windows account. On other systems, `data/secrets.bin` is a local JSON file; protect it with filesystem permissions and never commit it.

## Reading memory

In full-text reading, expand **Reading memory**. Choose a project name to separate research topics. Save confirmed goals, presentation preferences or tentative hypotheses. Give revisions the same revision-topic name, or click **Revise**, to replace the current memory. Memory applies to the selected project across papers; paper-specific scope is also available through the API.

Completed Q&A is saved locally and restored when a paper is reopened. Uncheck **Use memory** to omit historical dialogue and memories for a request; the completed exchange is still saved. Selected history and memories are sent to the configured model with paper excerpts. Memories guide personalization; they are not paper evidence. Delete memories/events with their buttons or export the complete project as JSON.

The context status shows how many history/memory entries and evidence bytes were included. Evidence can be truncated to fit the request. The local request ceiling uses a conservative UTF-8 estimate, not exact provider tokenization.
