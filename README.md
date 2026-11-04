# Literature Workbench

A local-first workbench that watches download folders, identifies journal articles and patents, imports them into Zotero, and builds a searchable reading dashboard. Optional Chat Completions-compatible models generate Chinese reading cards from publisher abstracts or local text excerpts.

No literature records, personal files, database contents, API keys, or Zotero snapshots are included in this repository. The application starts with an empty library.

## What It Does

- Watches one or more local folders for finished PDF and EPUB downloads.
- Reads the first pages locally, resolves DOI metadata with Crossref, and checks title agreement before importing.
- Uses DOI, patent number, and file content to avoid duplicate Zotero items.
- Creates a stable copy of each accepted file and links it to Zotero.
- Imports journal articles and patents only; uncertain files stay in a review queue.
- Stores processing state, reading cards, and encrypted credentials on the local machine.
- Serves a browser UI at `http://127.0.0.1:8766` with search, filters, classification, reading cards, and three-item comparisons.
- Sends only the current document's abstract or a bounded text excerpt to the model endpoint configured by the user.

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
