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

The API key is stored separately in `data/secrets.bin` and is never returned by the state endpoint. External model URLs must use HTTPS; HTTP is accepted only for `localhost`, `127.0.0.1`, or `::1`.

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
