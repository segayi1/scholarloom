# Usage

## Daily Workflow

Download a PDF or EPUB into a watched folder. The workbench waits until the file stops changing, then shows its progress in the inbox. Valid journal articles and patents are imported into Zotero, placed in a topic collection, and linked to a stable local copy. If a model is configured, a Chinese reading card is generated from the publisher abstract or a bounded local text excerpt.

Use the `Search and guides` tab to search titles, authors, DOI, patent number, Chinese reading cards, and keywords. Select two or three cards for a side-by-side comparison. `Regenerate summary` retries only the current reading card.

## Review Queue

Files that lack a readable DOI, that point to a preprint record, or whose first-page title disagrees with Crossref stay in the review queue. This is deliberate: the workbench does not guess an article's identity from its filename. Manually add a correct record in Zotero when necessary; the workbench will synchronize it on its next refresh.

Use `Retry` after a network error or after replacing a file. Use `Ignore` for files that are not literature. Neither action deletes the downloaded file.

## Zotero Authorization

Zotero's single-use `Allow` grant is insufficient for unattended imports. Choose `Always Allow` once from the workbench connection button. The key is stored in `data/secrets.bin` and is bound to the Zotero server ID. Reauthorize if Zotero reports that the library changed.

## Existing Downloads

Newly watched folders are baselined so that the workbench does not process every old file at once. Click `Add existing downloads` to enqueue them. Imported content hashes and DOI matches prevent duplicate Zotero items.

## Backups

Stop the local server, then back up the entire application directory, especially `data/workbench.sqlite` and `data/Library/`. Moving the directory changes the absolute paths stored in Zotero linked attachments; update those paths after a move.

On Windows, encrypted credentials cannot be decrypted by a different Windows account. On other systems, `data/secrets.bin` is a local JSON file; protect it with filesystem permissions and never commit it.
