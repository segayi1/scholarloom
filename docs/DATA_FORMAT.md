# Configuration And Data Format

## Settings

Settings are stored in the local SQLite database and edited from the workbench Settings page.

| Key | Default | Meaning |
|---|---|---|
| `watch_folders` | current user's `Downloads` | Absolute paths, one per line |
| `watch_enabled` | `true` | Pause or resume folder scanning; also controlled by the one-click header switch |
| `model_url` | `https://api.openai.com/v1` | Chat Completions-compatible API base URL |
| `model_name` | empty | Model identifier |
| `auto_summary` | `true` | Generate a reading card after import |
| `summary_language` | `zh` | AI output language for reading cards, Q&A, and synthesis: `auto`, `zh`, or `en` |
| `ui_language` | `zh` | Interface language: `zh` or `en`; used when `summary_language` is `auto` |
| `prompt_presets` | built-in presets | Per-scenario `prompt_zh` and `prompt_en` text for `methodology`, `negative`, `mechanism`, `translation`, `conflict`, and `summary` |

The API key is stored separately in `data/secrets.bin` and is never returned by the state endpoint. External model URLs must use HTTPS; HTTP is accepted only for `localhost`, `127.0.0.1`, or `::1`.

`summary_language: auto` resolves from `ui_language`. An explicit `zh` or `en` value keeps all model-generated reading, Q&A, and synthesis text in that language regardless of the interface. Existing document fields are not migrated or rewritten when the preference changes.

Browser-local translation is configured through the browser and stores no translation model in ScholarLoom. The optional offline fallback downloads `data/translator/translate-en_zh-1_9.argosmodel` and unpacks it under `data/translator/translate-en_zh-1_9/`; the shipped package requires about 67.5 MB to download and 149.1 MB on disk after installation. These files are runtime data and stay out of Git. Online fallback sends only the selected text to `translate.googleapis.com`; it does not use the configured research-model endpoint.

## Optional Seed Files

`data/seed.json` is an array of reading-card objects. Each object uses the same public fields as `/api/state` documents:

```json
[
  {
    "key": "EXAMPLE1",
    "title": "An example article",
    "zhTitle": "一篇示例文献",
    "kind": "journalArticle",
    "category": "研究方法与工具",
    "identifier": "10.0000/example",
    "oneSentence": "A one-sentence summary."
  }
]
```

Private fields beginning with `_` are retained in the local database and omitted from browser responses. They can hold `_path`, `_abstract`, and `_text` for later summarization.

Document JSON may also contain `addedAt` (Unix timestamp in seconds), `readingStatus` (`unread`, `reading`, or `read`), `readingNote` (up to 4,000 characters), and `readingUpdatedAt`. A new or regenerated card may also contain `readingDecision` with `decision` (`deep_read`, `read`, `skim`, or `reference`), `fit`, `focus`, `concerns`, and `nextAction`; absence of this field is valid for historical cards. `zoteroLinked: false` marks a document saved only in ScholarLoom; its `attachmentURL` is empty and the browser suppresses Zotero navigation links. Older records without `addedAt` derive it from the matching import job when available. Reading-state updates merge into the existing JSON row, so private `_path`, `_abstract`, and `_text` values are preserved.

`figure_notes` holds manually selected figures and panel notes by paper and project. Each record stores a PDF content version, one-based page, normalized coordinates in the displayed page orientation, figure number, candidate caption and references, and note. Crops are rendered from the corresponding PDF; a changed PDF marks the selection stale and prevents serving a misleading crop. SQLite backups include these notes, while the associated PDF must also be backed up.

The `deep_read_analyses` value in `kv` stores on-demand paragraph interpretations by paper, PDF version, extraction-order version, segment index and optional automatic candidate index or manual `figure_id`, with the actual image-sent flag and update time. Existing entries without a `figure_id` remain valid. Earlier segment indexes are matched to the same page, coordinates and text under the current order at read time; the saved historical records are not rewritten. Manual selections are checked against the current paper, project and PDF version before use. The browser stores the selected figure per paper, PDF version, project and segment in local storage; the figure note and completed interpretation remain in SQLite. External search status and source records are stored in the assistant's `reading_events` evidence metadata, separate from paper citations. Online source material shares the model input budget with paper evidence and conversation context.

`library_project_members` maps a local project name to paper keys. Full-text search uses the existing `evidence_versions` and `evidence_pages` caches; it reports page coverage and omits stale attachment versions. Membership is independent of Zotero collections and reading memories. Back up the database with the source PDFs; index data can be rebuilt from those PDFs.

`evidence_matrices` and `evidence_matrix_cells` store project-scoped paper selections and seven editable fields. Each cell retains its generated value and sources separately from a human revision and its source snapshot. Regeneration updates generated cells without overwriting revisions; a human review is required to mark an item as not reported. Source records include paper ID, PDF version, physical page, and quote. API responses and exports mark outdated sources, and source navigation rechecks the current PDF. Matrix creation uses selected indexed passages and matching full-reading units; the model's statements remain interpretations to review against the quoted source.

For newly generated matrix cells, a mixture of valid and invalid citation IDs retains the generated text and valid sources with status `unknown` (Needs review). The optional generated-cell `citationValidation` contains `rejectedCount` and at most 30 `rejectedIds`, each limited to 120 characters. It also appears for an empty cell if all its citation IDs were invalid. This metadata describes the generated value, not a human revision, and is included in Markdown and CSV exports. Older cells are not rewritten and previously discarded IDs cannot be recovered. Citation membership does not establish semantic support.

Comparison input sends a model-generated matrix value only when every stored source verifies against the current PDF and fits in the available passage slots; generated metadata recording any rejected citation also excludes it. A human revision is still supplied as user input, even when it has no current quotation, and the model is instructed to treat it as an interpretation. This filtering prevents source-less and partially supplied generated values from being reused as evidence; it does not verify that each retained quotation semantically supports every detail in the cell. Saved matrix cells and earlier comparisons are unchanged.

When comparison input is reduced to fit its budget, a reading-unit hint is omitted if any of its source passages is removed. The remaining passages and saved full-reading records are not changed by this rule; older generated comparisons are not rewritten.

When comparison or matrix generation reuses a reading unit, each long source text must be located in full, is divided into passages no longer than 1,800 characters, and all parts must be individually located and fit the source-slot limit before the unit hint is included. Splitting prefers a nearby sentence boundary, then whitespace, but may still cut within a word. This only governs unit hints; other retrieved excerpts or matrix quotations can still be truncated, and previously saved outputs are not rewritten.

`dossiers` stores one on-demand deep-reading dossier per document. Each record is bound to the PDF SHA-256 version and the AI output language, and contains the reading decision, page-grounded outline, argument structure, methods audit, reusable notes, evidence coverage, and any reference-repair warnings. A changed PDF makes the dossier stale until regenerated. The table stores the same local database as documents and reading memory; back up SQLite together with `data/Library/` PDFs.

`full_reads` stores separate runs for automatic complete reading. A run is keyed by a generated run ID and bound to the document, PDF SHA-256 version, AI output language, and prompt version. The stored value contains progress, per-page summaries, item-level source anchors, experiment-level reading units, whole-paper overview, coverage counts, and warnings. During page analysis, bounded text from the previous-page tail and next-page head is supplied as continuation context; items are still emitted and located only for the current page. Experiment units reference the item IDs that support their question, design, results, interpretation, limitations, and figures; the referenced source items carry the detailed close reading. AI-provided page numbers are never trusted as coordinates: exact text or start/end anchors are matched locally against indexed PDF pages. Complete transcription and anchor-only verification are labeled separately; unmatched items remain page-only. The latest matching run is returned by the API, while older prompt, language, PDF-version, and regeneration runs remain available in SQLite.

Resume reuses only uniquely numbered integer cached pages within the current PDF page range; all cached copies of a duplicated page are excluded and that page is analyzed again. New results whose page number differs from the requested page fail that page. New completed processing records include `coverage.pageSetValid`, which checks that the saved page numbers contain each integer from 1 through the PDF page count exactly once. A false value produces a warning and prevents `done`; older records may omit this field and are not rewritten. This check does not validate page contents or scientific conclusions.

Newly validated locations accept exact block matches of any length; substring overlap requires at least eight alphanumeric characters in the shorter string. This heuristic reduces incidental figure-label matches but can omit short partial blocks or match unrelated longer text. Rectangles in previously saved records are not recalculated.

The reader API prefers the latest current prompt-version run. If none exists for the same document, PDF version and language, it returns the most recent older prompt-version run with a response-only `historical: true` marker. An old running record is presented as interrupted without rewriting its database row. Historical runs are for viewing only: resume and downstream selection of usable units remain restricted to current-version records. Other PDF versions and languages are not used as fallbacks.

New runs include `coverage.duplicateItemIds` when persisting the final coverage; these IDs appear in more than one final unit and cause a partial status for manual review. Cross-chunk units are merged only when their shared-source match is unique in both directions within that batch; ambiguous matches stay separate and their shared IDs are flagged. Even a unique shared-source match does not establish scientific equivalence. Older records may omit the field and are not rewritten.

When merged cross-chunk units have differing model-generated statuses, new runs retain the distinct original statuses in `mergedStatuses` and set the combined `status` to `unclear`. The reader displays the disagreement for source review. The first overview requests, including fragments of oversized units, receive these fields; later model-generated summaries may still omit or misinterpret the distinction. Matching statuses are not evidence of accuracy. Existing records are not rewritten; synthesis prompt version 13 adds guidance about these unverified labels.

Unit grouping may retry up to three groups of omitted items with adjacent context. These calls count toward the run's request and retry usage. New runs record `coverage.failedUnitBatches`; a terminal grouping or omission-retry failure keeps the run partial even when other batches assign the same IDs. The field is absent from older records.

Page prompt version 7 and current synthesis retain model-generated descriptions and warnings containing boundary or truncation terms, subject to existing field length limits. Previously saved records are not rewritten. Page reuse on continuation requires a matching page prompt version. Synthesis prompt version 8 tells the model to verify generated interpretations and their claimed associations against source text; this is not a guarantee of scientific accuracy.

Page prompt version 8 explicitly identifies text-only requests when page rendering fails or the model rejects the image. If neither extractable page text nor an accepted image is available, the page fails rather than sending a placeholder as source text; failed pages can be retried on continuation. Version 7 page results are retained but are not reused by version 8 runs. The text-only prompt does not guarantee that the model avoids invented visual claims.

Resuming creates a new run and copies successful page results only from the latest matching document, PDF version, language and prompt version; missing pages are processed again. Each run records its own model request count, available input/output token totals, retries, count of requests without complete usage, and elapsed time; prior usage is separately carried forward on continuation. Cancellation is cooperative between model requests and retains completed pages. `health.fullReadActive` reports the number of registered background reading jobs so the desktop launcher can avoid restarting them.

New runs also record `synthesisPromptVersion` independently of the page prompt version. Unit synthesis receives bounded source transcriptions, model-extracted evidence and transcription verification states; it splits requests to fit the input budget. Multiple units returned in the same request remain separate even if they cite the same item, with a warning for the duplicate citation. Existing page results are not rewritten when the synthesis prompt changes.

When a unit-synthesis response ends at the output limit, a multi-item batch is split and retried at most twice in depth; warnings and retry counts remain in the run. Overview requests are grouped according to the local input budget and reduced in stages; a truncated overview may be retried once with a larger output allowance when the input budget permits, then split into smaller groups up to two levels. If an overview falls back or cannot be merged, the run is marked partial even when every page and item was otherwise processed.

If a segment overview fails, the output explicitly labels the result as unmerged and retains the failed segment's unit fields alongside successful partial summaries. Page-only fallback retains all available page summaries. Further model merging is skipped when a segment fails, and the warning keeps the run partial. If the final overview merge fails, the output similarly retains the available partial summaries, findings and limitations. Older records are unchanged.

The grouping request includes the existing page-item limitations, marked in the prompt as model-generated leads rather than verified source text. Synthesis prompt version 9 asks the model not to invent allocation or sampling details. This changes generation only; it does not verify or rewrite stored records.

New runs also store `conflictAudit`, a model-assisted check of numeric statements in verified source transcriptions. Candidates are retained only when at least two quoted passages and the reported values match those supplied transcriptions; the candidates still require human review of conditions and units. The audit reports how many eligible items were checked and whether long passages were truncated or multiple batches were needed. It cannot guarantee that all conflicts were found, especially across batches. Audit failures are recorded and make the run partial; older runs remain unchanged.

New audit records additionally report `unverifiedNumericItems` (only unverified saved transcriptions that visibly contain digits), `failedBatches`, and `rejectedCandidates`. A failed overlapping batch or rejected candidate makes the audit partial even if other batches covered all eligible item IDs; excluded numeric transcriptions also make it partial when an audit is performed. `not_applicable` means no eligible transcriptions, not that no numeric statements exist. Items with missing transcriptions or undetected numbers are not counted by `unverifiedNumericItems`. Existing records may omit the new fields, and their audit status cannot establish whether overlapping batches failed. Audit status describes this bounded check, not scientific correctness or the overall run status.

For new audits, `valueMatchVersion: 2` indicates numeric candidate values must match within an individual quoted passage at numeric boundaries: for example, `0.6 mM` does not match inside `10.6 mM`, and `50` does not match the magnitude in `-50`. This is a text check, not numerical equivalence, a unit conversion check, or proof that two quantities conflict. Previously saved candidates are not revalidated or rewritten; records without the version display a review notice.

Verified preprints use `kind: "preprint"` and may carry `repository`, `archiveID` (for example `arXiv:2510.21161v2`), and a repository `sourceURL` instead of a fabricated journal DOI. Import jobs whose status is `excluded` remain in SQLite for audit, but the default inbox and status totals omit them; selecting the `excluded` filter shows the retained records.

`data/guides.json` may seed topic guides and reading routes:

```json
{
  "guides": [
    { "name": "研究方法与工具", "summary": "Topic overview", "insights": ["A reading hint"], "reading": ["EXAMPLE1"] }
  ],
  "routes": [
    { "title": "An example route", "description": "Route description", "keys": ["EXAMPLE1"] }
  ]
}
```

Seed guides remain in use when supplied. Without seed guides, `/api/state` groups public documents by their `category` and returns guides with the same `name`, `summary`, `insights`, and `reading` fields. Generated routes are saved as the `guide_routes` value in the existing SQLite `kv` table and override seeded routes; each route has `title`, `description`, and paper `keys`. `POST /api/guides-generate` is CSRF protected and makes an on-demand model call using only bounded public title, question, method, and one-sentence fields. It retains only known paper IDs and removes duplicates. Invalid output leaves the previously saved routes intact. No model call occurs when loading state.

## Reading history and memory

`reading_events` stores project/paper, role, original text, evidence metadata and creation time. `reading_memories` stores project/paper, kind (`preference`, `project`, `hypothesis`), confirmed text, source event IDs, revision slot, active flag and creation time. Existing tables are preserved. Revisions retire old memories; forgetting removes their text. Explicit event deletion removes source-linked memories and the derived answer.

`reading_sessions` stores named sessions and their unfinished question and selection for a project and paper; `reading_session_events` associates saved exchanges and request IDs with those sessions. Events without an association remain in the default history. A session deletion removes its events and unlinks them from explicit memories, which remain saved. The session export contains bibliographic fields, the conversation, and recorded source pages and quotations; SQLite backup retains session names and drafts.

CSRF-protected `POST /api/reading-memory` supports `list`, `remember`, `forget`, `delete-event`, `export`. Project defaults to `default`; source IDs must belong to the project and optional paper. History supports `before` pagination. `POST /api/paper-chat` accepts `project` and `use_memory`; results include `budget` and saved `event_ids`. Full JSON export includes raw reading history; it can contain personal text.

`project_synthesis` stores one generated research draft and an independent human revision per project. Both snapshots contain Markdown, focus, paper IDs, their `[P1]`-style source mapping, and any original passages with `[P1E1]` identifiers, pages, quotations and PDF versions. Generation updates only the generated snapshot; edits retain the source mapping captured when editing began. `GET /api/project-synthesis` reads a project draft; CSRF-protected `POST /api/project-synthesis` saves a revision or checks a source against the current PDF. SQLite backups include these snapshots.

Synthesis prompt version 10 also supplies unit `figureInterpretation` as an unverified overview lead; fallback keeps this field and oversized units may split it from other fields. Figure attribution and all other summary claims still need source review; old records are unchanged.

Synthesis prompt version 11 asks every overview field to preserve session duration, counts and spacing; this is a generation instruction, not a validation guarantee.

Synthesis prompt version 12 asks grouping and overview generation to distinguish unreported methods from methods known not to have been performed. Unit limitations remain unverified model output; a targeted recheck still produced an unsupported statistical-method assertion. Existing records are not rewritten.

Overview validation normalizes whitespace and retains all returned text and list entries instead of clipping field lengths or list counts. Model response and subsequent merge requests remain subject to their request budgets; oversized or failed merges retain separate partial summaries and warnings. Existing records are not rewritten.

New page validation retains full model-returned source text and checks the entire normalized transcription against the extracted page; it retains full page descriptions and limitations. Unit validation retains returned units, descriptive fields and limitations. Grouping receives complete saved source text and associated context, subject to its input budget: an individually oversized item is reported and remains unassigned rather than silently clipped. Existing page records and verification flags are unchanged, including records that may have been clipped under the former limits.

Page results produced by the new validator carry `sourceValidationVersion: 2`. On reading older records, a source of exactly 5,000 characters is conservatively exposed with `sourceVerified: false` and `sourceTextMayBeTruncated: true`, plus a page warning; the stored record is not rewritten. Resuming omits affected cached pages so they are analyzed again. Length alone does not prove truncation, and the check cannot detect other old omissions.

新生成的全文来源矩形优先根据完整转写在连续提取块中的匹配计算；完全匹配无法建立时仍采用原有锚点和部分文字回退。相同转写的多处匹配均保留，矩形上限及旧记录保持原有行为；该定位不证明图表关联或模型结论正确。

New reading units may include `sourceWarnings`. These are deterministic review notices for explicit figure or table numbers in `result` or `figureInterpretation` that have no corresponding linked figure/table item; the linked item's `figureNumbers` supplies the comparison. A second notice appears when a unit with a linked figure or table also cites a paragraph whose heading identifies a method or procedure but not a result or formulation; it asks the reader to check whether that method directly supports the figure claim. For older records, `GET /api/full-read` recombines these notices in the response without saving or rewriting the stored record. A notice is only a review lead: it does not prove the link is wrong, and its absence does not prove that every figure or table association is correct.

新数值审计的 `evidenceValidationVersion: 2` 表示候选的所有提交引文均按完整引文核验，去重后至少有两个不同的 `(itemId, normalized quote)`；无效额外引文会拒绝整个候选，并计入 `rejectedCandidates`。同一引文的不同来源 ID 不保证独立或支持冲突。旧审计不重写，缺少该版本的记录显示提示；旧校验可能已丢弃部分引文，不能由提示恢复。

`POST /api/document-state` accepts either reading field independently. Omitted `readingStatus` or `readingNote` retains its current database value; supplied fields are merged atomically.
