# Contributing

Issues and pull requests are welcome. Keep changes local-first: the repository must never require a hosted database, must never include literature data or credentials, and must not weaken DOI/title checks.

## Development

```sh
python -m pip install -r requirements-dev.txt
python -m unittest -v test_evidence.py test_pipeline.py test_server.py test_memory.py test_figure.py test_dossier.py test_local_translation.py
node test_web.js
node test_translation.js
node --check web/app.js
node --check web/translation.js
```

Tests use temporary directories and mocked Zotero/model calls. Do not add fixtures containing personal paths, real API keys, or copyrighted full texts.

Windows users can run `setup.cmd` for a local virtual environment. Source checkouts can start with `start.ps1` or `launch.vbs`; POSIX users can run `./setup.sh` and `./start.sh`.

Run `python -m unittest -v test_pipeline.py test_server.py` for a quick core check, then run the complete command above before a release.

When changing document recognition, add a focused test in `test_pipeline.py`. When changing state, credentials, import recovery, or HTTP handling, add a focused test in `test_server.py`.

## Pull Requests

- Explain the behavior before and after the change.
- Keep the diff small and include tests for new branches or parsers.
- Run all checks before submitting.
- Use conventional commit messages such as `fix: normalize PDF ligatures in DOIs`.

By contributing, you agree that your code is licensed under the MIT License.
