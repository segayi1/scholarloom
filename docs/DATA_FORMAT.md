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

`dossiers` stores one on-demand deep-reading dossier per document. Each record is bound to the PDF SHA-256 version and the AI output language, and contains the reading decision, page-grounded outline, argument structure, methods audit, reusable notes, evidence coverage, and any reference-repair warnings. A changed PDF makes the dossier stale until regenerated. The table stores the same local database as documents and reading memory; back up SQLite together with `data/Library/` PDFs.

Verified preprints use `kind: "preprint"` and may carry `repository`, `archiveID` (for example `arXiv:2510.21161v2`), and a repository `sourceURL` instead of a fabricated journal DOI. Import jobs whose status is `excluded` remain in SQLite for audit, but the default inbox and status totals omit them; selecting the `excluded` filter shows the retained records.

`data/guides.json` contains optional topic guides and reading routes:

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

Both files are optional. An installation without them starts with an empty workbench and all topic lists empty.

## Reading history and memory

`reading_events` stores project/paper, role, original text, evidence metadata and creation time. `reading_memories` stores project/paper, kind (`preference`, `project`, `hypothesis`), confirmed text, source event IDs, revision slot, active flag and creation time. Existing tables are preserved. Revisions retire old memories; forgetting removes their text. Explicit event deletion removes source-linked memories and the derived answer.

CSRF-protected `POST /api/reading-memory` supports `list`, `remember`, `forget`, `delete-event`, `export`. Project defaults to `default`; source IDs must belong to the project and optional paper. History supports `before` pagination. `POST /api/paper-chat` accepts `project` and `use_memory`; results include `budget` and saved `event_ids`. Full JSON export includes raw reading history; it can contain personal text.
