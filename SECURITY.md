# Security Policy

## Supported Versions

Security fixes apply to the `main` branch and the latest tagged release.

## Reporting

Report vulnerabilities privately through GitHub's repository security advisory form. Include reproduction steps, affected version, and impact. Do not include API keys, Zotero authorization keys, personal files, or `data/secrets.bin`.

## Local Security Model

The HTTP server binds to `127.0.0.1` and enforces local `Host` and `Origin` values, a per-process CSRF token, content type and request size checks, and a fixed list of static assets. It is intended for a cooperating operator on their own computer; it is not a multi-user or internet-facing service.

On Windows, credentials are encrypted with DPAPI for the current user. On other platforms, `data/secrets.bin` uses local filesystem permissions. Keep this file outside version control, restrict access to it, and never publish it.

The model endpoint receives only the configured document's abstract or a bounded text excerpt from one reading card at a time. PDFs are not uploaded to the model. Crossref receives DOI or title queries; no full text is sent to Crossref.
