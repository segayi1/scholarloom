# Security Policy

## Supported Versions

Security fixes apply to the `main` branch and the latest tagged release.

## Reporting

Report vulnerabilities privately through GitHub's repository security advisory form. Include reproduction steps, affected version, and impact. Do not include API keys, Zotero authorization keys, personal files, or `data/secrets.bin`.

## Local Security Model

The HTTP server binds to `127.0.0.1` and enforces local `Host` and `Origin` values, a per-process CSRF token, content type and request size checks, and a fixed list of static assets. It is intended for a cooperating operator on their own computer; it is not a multi-user or internet-facing service.

On Windows, credentials are encrypted with DPAPI for the current user. On other platforms, `data/secrets.bin` uses local filesystem permissions. Keep this file outside version control, restrict access to it, and never publish it.

The configured model endpoint receives bounded paper text and the reading context needed for the requested action, such as a reading card, page evidence, a dossier, or a cross-paper comparison. PDF files, figure images, private notes, and reading memory are not uploaded unless a request explicitly includes the relevant text. Crossref receives DOI or title queries; OpenAlex receives a topic or DOI. The optional online translation fallback sends only selected text to `translate.googleapis.com`; the offline translation model stays under `data/`.
