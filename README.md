# Literature Workbench

A local-first workbench that watches download folders, identifies journal articles and patents, imports them into Zotero, and builds a searchable reading dashboard. Optional Chat Completions-compatible models generate Chinese reading cards from publisher abstracts or local text excerpts.

No literature records, personal files, database contents, API keys, or Zotero snapshots are included in this repository. The application starts with an empty library.

## What It Does

Literature Workbench turns the messy moment after a PDF download into a reviewable local workflow. It is built for researchers who want Zotero to remain their source of truth, while gaining a faster way to triage new papers, spot duplicates, and search their own reading notes.

- **Watch without babysitting.** Add one or more download folders. The workbench notices finished PDF and EPUB files, waits for downloads to settle, and shows every file as it moves through the queue.
- **Verify before importing.** It extracts the opening pages locally, reads DOI or patent-number signals, queries Crossref for bibliographic data, and requires the local title and publisher metadata to agree. A filename alone is never treated as proof of identity.
- **Keep the library clean.** File hashes, DOI values, and patent numbers prevent the same work from being imported twice. Accepted full texts are copied to a stable local library; originals in Downloads are left untouched.
- **Separate certainty from guesses.** Journal articles and patents that pass verification go to Zotero with topic collections, source tags, and linked full texts. Scanned, ambiguous, or mismatched files remain in a review queue for a deliberate manual decision.
- **Make the library navigable.** The local dashboard supports full-text-style metadata search, topic guides, year and document-type filters, reading routes, and a side-by-side comparison view for up to three papers.
- **Turn abstracts into starting points.** With a user-supplied Chat Completions-compatible endpoint, the workbench creates structured Chinese reading cards: a one-sentence claim, research question, model, method, findings, use case, limits, and the evidence basis for the summary. The model receives only the current abstract or a bounded local excerpt.
- **Stay local by default.** The server binds to `127.0.0.1`, write requests require a per-process CSRF token, private text fields are omitted from browser responses, and credentials are kept outside Git. There is no hosted account, telemetry service, or bundled literature corpus.
- **Switch the interface language.** Use the `EN` / `中文` control in the header to change the interface between English and Simplified Chinese. The choice is remembered in the browser; bibliographic records and generated summaries remain in their original language.

### The Working Loop

```text
Download -> settle -> inspect locally -> resolve metadata -> deduplicate
        -> import to Zotero -> build a reading card -> search, compare, revisit
```

Every step leaves a visible status. When the network, Zotero, or the model is unavailable, the item goes back to a recoverable queue instead of disappearing.

## Requirements

- Python 3.12+
- PyMuPDF (`pip install -r requirements.txt`)
- Zotero Desktop with its local API enabled
- Node.js 20+ only for the optional JavaScript check
- An OpenAI-compatible Chat Completions endpoint, model name, and API key for automatic reading cards

On Windows, API keys and Zotero authorization are encrypted with the current user's DPAPI credentials. On other systems, the key file is stored locally without DPAPI protection; keep `data/secrets.bin` private.

## Quick Start

```sh
git clone https://github.com/segayi1/literature-workbench.git
cd literature-workbench
python -m pip install -r requirements.txt
python server.py
```

Open `http://127.0.0.1:8766`.

Windows users can double-click `launch.vbs`; PowerShell and POSIX users can run `./start.ps1` or `./start.sh`. The Windows launcher uses `pythonw.exe` from `PATH`.

## First-Time Setup

1. Open Zotero. In `Settings -> Advanced`, enable `Allow other applications on this computer to communicate with Zotero`.
2. In the workbench `Settings` tab, click `Connect Zotero`. Choose `Always Allow` in Zotero to permit future background imports. Revoke this permission in Zotero at any time.
3. Enter a Chat Completions-compatible HTTPS API base URL, model name, and API key. Local loopback endpoints may use HTTP. Click `Save all settings`, then `Test summary model`.
4. Set the folders to watch. The default is the current user's `Downloads` folder. Existing files in a newly added folder are baselined; use `Add existing downloads` to process them deliberately.

Automatic import can also work without a model. Reading cards then stay in a pending state and can be generated later.

## Data And Privacy

| Path | Purpose | Tracked by Git |
|---|---|---|
| `data/workbench.sqlite` | Documents, jobs, settings, and content hashes | No |
| `data/secrets.bin` | Encrypted API key and Zotero authorization | No |
| `data/Library/` | Stable copies of imported full texts | No |
| `data/seed.json` | Optional local starting records | No |
| `data/guides.json` | Optional local topic guides and reading routes | No |
| `web/` | Browser UI | Yes |

The server listens on `127.0.0.1` only, validates `Host`, `Origin`, and a per-process CSRF token on write requests, and exposes only known static routes. Model text requests use the endpoint configured in Settings and can incur provider charges. The application does not bypass publisher paywalls or Zotero permission prompts.

The optional `data/seed.json` and `data/guides.json` files are read on first startup if present. Their shapes are shown in [docs/DATA_FORMAT.md](docs/DATA_FORMAT.md).

## Tests

```sh
python -m unittest -v test_pipeline.py test_server.py
node test_web.js
node --check web/app.js
```

GitHub Actions runs the Python and JavaScript checks on pushes and pull requests.

## Documentation

- [Usage guide](docs/USAGE.md)
- [Configuration and data format](docs/DATA_FORMAT.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Changelog](CHANGELOG.md)

## License

MIT. See [LICENSE](LICENSE).
