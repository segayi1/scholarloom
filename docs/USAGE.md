# Usage

## Daily Workflow

Download a PDF or EPUB into a watched folder. The workbench waits until the file stops changing, then shows its progress in the inbox. Valid journal articles and patents are imported into Zotero, placed in a topic collection, and linked to a stable local copy. If a model is configured, a reading card is generated from the publisher abstract or a bounded local text excerpt.

Use the `Search and guides` tab to search titles, authors, DOI, patent number, reading cards, and keywords. A result states which fields matched and highlights direct search terms. Use the reading-status filter, or update a card's unread/reading/read state and short note without changing its summary. `Regenerate summary` retries only the current reading card. The home view lists literature added in the previous seven days.

Use the `EN` / `中文` button in the header to switch the interface language. In Settings, `AI output language` controls new and regenerated reading cards, single-paper Q&A, and cross-paper synthesis independently. `Follow interface` resolves to the active interface language; `简体中文` and `English` keep AI output fixed. Existing reading cards remain unchanged until regenerated, and bibliographic data keeps its source language.

Search uses weighted local matching across bibliographic fields and reading cards. Built-in Chinese/English synonym groups connect related research terms without sending queries to another service.

## Evidence-Grounded Reading

Open the `Paper Q&A and related literature` panel on a reading card. Choose a built-in scenario or enter a specific question. For local PDFs, ScholarLoom extracts up to the first 60 text-bearing pages and asks the model to answer only from that evidence. `[Page N]` citations become links that open the matching Zotero attachment at that page. If PDF text is unavailable, the panel uses the publisher abstract or the saved local excerpt and labels that narrower evidence basis. A scanned PDF without embedded text therefore gets an abstract-level answer, not OCR.

The six editable prompt presets are:

- Methods and evidence audit
- Negative results and limits
- Core contribution and mechanism
- Translational assessment
- Cross-paper arbitration
- Structured reading card

Each preset has independent Chinese and English text. Edit it under `Settings -> Research prompt presets`; use `Restore defaults` to return every preset to its shipped text. The Summary preset also supplies the reading-card instructions appended to the strict JSON schema.

## Comparison Synthesis

Select 2–12 papers in `Search and guides`, open `Compare`, optionally enter a focus question, and generate the report. Two to four papers retain the side-by-side table. Five or more use a compact evidence ledger. The model receives paper IDs and structured reading cards, then must cite claims as `[P1]`, `[P2]`, and so on. Records without structured cards remain visible as metadata but cannot support a conclusion. The report covers scope and consensus, supporting evidence, disagreements and limits, heterogeneity, gaps, and a cautious 250–500-word synthesis. Copy or download the Markdown without changing the underlying records.

## Online Discovery And OA Import

In `Search and guides`, switch the search scope to `Discover online` and enter a topic. ScholarLoom queries the free OpenAlex API and returns titles, authors, citation counts, source links, abstracts when available, and open-access status. A reading card's related-literature panel uses OpenAlex related-work links for paper-to-paper discovery.

`Add to local library` is shown only for a public HTTPS OA PDF. The server validates every redirect, caps the file at 150 MB, verifies the PDF signature, and places the download in the same inbox used by watched folders. Journal/patent verification, duplicate checks, Zotero authorization, and automatic reading-card generation then proceed normally. A publisher landing page without an OA PDF is a discovery result only; ScholarLoom does not bypass a paywall.

External discovery and local matching are separate. Local synonym search remains deterministic and works offline. Online discovery requires access to `api.openalex.org`, and model-backed Q&A or synthesis requires a configured Chat Completions endpoint.

## Review Queue

Files that lack a readable DOI, that point to a preprint record, or whose first-page title disagrees with Crossref stay in the review queue. Defense presentations, course lesson plans, and lecture courseware are directly excluded before Crossref lookup so they do not enter the library or clutter the review queue. A title match without a first-page DOI is evidence for review, not enough for automatic import.

Use `Confirm import` when the displayed title and type are correct; the record then enters the normal Zotero import queue. Use `Retry` after a network error or after replacing a file. Use `Ignore` for files that are not literature. None of these actions deletes the downloaded file.

## Zotero Authorization

Zotero's single-use `Allow` grant is insufficient for unattended imports. Choose `Always Allow` once from the workbench connection button. The key is stored in `data/secrets.bin` and is bound to the Zotero server ID. Reauthorize if Zotero reports that the library changed.

## Existing Downloads

Newly watched folders are baselined so that the workbench does not process every old file at once. Click `Add existing downloads` to enqueue them. Imported content hashes and DOI matches prevent duplicate Zotero items.

## Backups

Stop the local server, then back up the entire application directory, especially `data/workbench.sqlite` and `data/Library/`. Moving the directory changes the absolute paths stored in Zotero linked attachments; update those paths after a move.

On Windows, encrypted credentials cannot be decrypted by a different Windows account. On other systems, `data/secrets.bin` is a local JSON file; protect it with filesystem permissions and never commit it.
