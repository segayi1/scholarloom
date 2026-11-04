# Configuration And Data Format

## Settings

Settings are stored in the local SQLite database and edited from the workbench Settings page.

| Key | Default | Meaning |
|---|---|---|
| `watch_folders` | current user's `Downloads` | Absolute paths, one per line |
| `watch_enabled` | `true` | Pause or resume folder scanning |
| `model_url` | `https://api.openai.com/v1` | Chat Completions-compatible API base URL |
| `model_name` | empty | Model identifier |
| `auto_summary` | `true` | Generate a reading card after import |
| `summary_language` | `zh` | AI output language for reading cards, Q&A, and synthesis: `auto`, `zh`, or `en` |
| `ui_language` | `zh` | Interface language: `zh` or `en`; used when `summary_language` is `auto` |
| `prompt_presets` | built-in presets | Per-scenario `prompt_zh` and `prompt_en` text for `methodology`, `negative`, `mechanism`, `translation`, `conflict`, and `summary` |

The API key is stored separately in `data/secrets.bin` and is never returned by the state endpoint. External model URLs must use HTTPS; HTTP is accepted only for `localhost`, `127.0.0.1`, or `::1`.

`summary_language: auto` resolves from `ui_language`. An explicit `zh` or `en` value keeps all model-generated reading, Q&A, and synthesis text in that language regardless of the interface. Existing document fields are not migrated or rewritten when the preference changes.

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

Document JSON may also contain `addedAt` (Unix timestamp in seconds), `readingStatus` (`unread`, `reading`, or `read`), `readingNote` (up to 4,000 characters), and `readingUpdatedAt`. Older records without `addedAt` derive it from the matching import job when available. Reading-state updates merge into the existing JSON row, so private `_path`, `_abstract`, and `_text` values are preserved.

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
