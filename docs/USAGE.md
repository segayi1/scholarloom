# Usage

## Daily Workflow

On Windows, a desktop shortcut to this project's `launch-desktop.ps1` opens the workbench at `http://127.0.0.1:8767`. When a Python source file is newer than the running service, opening the shortcut restarts that service before opening the browser. If an import, summary, authorization, or request is in progress, the launcher asks you to wait and open the shortcut again. Frontend files are served from the current project. The standard `launch.vbs` entry uses port 8766.

Download a PDF or EPUB into a watched folder. The workbench waits until the file stops changing, then shows its progress in the inbox. Verified journal articles, patents, and title-matched arXiv or Crossref preprints are saved to the stable local library. When Zotero is connected and authorized, the same record is also placed in a topic collection and linked to that local copy; without Zotero, intake still completes locally. If a model is configured, a reading card is generated from the publisher abstract or a bounded local text excerpt.

New reading cards also include a reading decision such as deep read, read, skim, or reference, plus the paper’s fit, reading focus, concerns, and a next action. Older cards remain valid and show no decision until regenerated. The decision is a triage aid generated from the paper text; verify it against the source.

Use the `Search and guides` tab to search titles, authors, DOI, patent number, reading cards, and keywords. Topic guides group the library by category automatically when no seed guides are configured. Research routes are generated only when you click **Generate research routes**; this makes one configured model call from bounded public title, research question, method, and one-sentence summaries. It connects existing paper IDs into question-based cross-paper reading paths. Loading the workbench does not call the model, so route generation uses model tokens only on request. A route is a reading aid; check scientific claims against each paper's evidence. A result states which fields matched and highlights direct search terms. Use the reading-status filter, or update a card's unread/reading/read state and short note without changing its summary. `Regenerate summary` retries only the current reading card. The home view lists literature added in the previous seven days.

Use the `EN` / `中文` button in the header to switch the interface language. In Settings, `AI output language` controls new and regenerated reading cards, single-paper Q&A, and cross-paper synthesis independently. `Follow interface` resolves to the active interface language; `简体中文` and `English` keep AI output fixed. Existing reading cards remain unchanged until regenerated, and bibliographic data keeps its source language.

Search uses weighted local matching across bibliographic fields and reading cards. Built-in Chinese/English synonym groups connect related research terms without sending queries to another service.

Expand **课题范围与正文检索** to select papers for a named project. Read the project, select its papers, and save the selection before building or rebuilding the local full-text index. Search within that project to see matched passages, index coverage, and page links. A result opens the corresponding PDF and project after checking that its attachment version is still current. Unindexed pages, image-only pages, and changed attachments are shown separately; an empty result covers only indexed text. Project membership stays in ScholarLoom and does not change Zotero collections.

The comparison synthesis prompt permits explicit distinctions when needed to describe an evidence boundary, such as differential expression not establishing activation. This changes future model requests only. It does not verify generated claims or revise saved drafts; review those claims against their sources.

## Evidence-Grounded Reading

Open the embedded reader to ask about a local PDF. ScholarLoom indexes extractable PDF pages and retrieves bounded passages for the question. Evidence citations link to the indexed page where available; citation coverage reports whether a reference was located, not whether a claim is scientifically correct. When page text is unavailable, the answer uses the available abstract or saved excerpt and labels that narrower basis. Image-only PDFs require OCR, which is not yet provided.

In `深读`, move through extracted paragraphs with the previous and next buttons and open the corresponding PDF page with `查看原文`. Select an automatic figure candidate or save a manual figure selection in `图像选区与笔记`; the saved selection becomes available for the current paragraph and project. Check the crop and caption against the paper. Click `解读这一段` for an on-demand interpretation; select the image checkbox only when you want to send the crop to the configured vision-capable model. The result states whether an image was sent. If the model rejects an image request with a supported format error, the application retries with text only. Paragraph order and automatic figure association are heuristic, especially for complex layouts and figures on different pages.

In `问答`, the optional online search sends the question to literature search providers and supplies up to five linked results to the model. External sources are shown separately from the paper's page evidence and restored with the conversation; a failed or empty search is labeled. Follow each source to verify the background claim and its relevance.

In `问答`, create named sessions for separate lines of inquiry within the current project and paper. The default history keeps earlier conversations. Named sessions can be renamed, deleted, and exported as Markdown or plain text with their paper details and saved source passages. Deleting a session removes its questions and answers but keeps explicit reading memories. A named session saves an unfinished question and selection locally; a selection is restored only for the same PDF version. A failed request retains its draft, and retrying a completed request does not save the exchange twice. Project JSON export and session exports serve different purposes; keep a SQLite backup to restore sessions and drafts.

For deeper reading, use the `深入理解` section of the reader’s `AI 助手` and generate a dossier on demand. It builds a page-grounded reading path, argument structure, methods audit, and reusable notes from the current PDF. Author-stated claims, outline items, reported methods, and reusable notes must cite supplied evidence; inferred or unclear items are labeled. Click an evidence marker to jump back to the page and highlight the located passage. A changed PDF marks the saved dossier stale. Citation coverage verifies that a source can be found, not that its scientific claim is correct. Generation is optional because it takes longer and uses more model tokens than the compact card.

For experiment-based reading, open `深读` and click `生成完整深读`. This starts a background job that sends each page image together with its searchable text to the configured model. Each page request also receives a bounded tail from the previous page and head from the next page so complete sentences and experiments that cross a page boundary can be understood without treating them as truncated. Page-level items remain the source-grounded evidence layer; a second AI pass attempts to group them into experiment units instead of displaying layout paragraphs separately. A unit can combine its question, rationale, design, groups and controls, results, interpretation, limitations, and supporting figures or tables. Cross-page grouping is model-generated and may need correction. Each experiment’s evidence section shows the saved page-level heading, model summary, interpretation, extracted evidence, limitations, and source transcription when available. These model fields can be wrong and must be checked against the PDF. A saved figure interpretation is shown even when its linked figure source is unavailable, with a notice. Items whose complete transcription cannot be matched may still receive a verified position from exact start and end phrases; unresolved items are labeled and remain page-only. Processing continues when the browser is closed and progress resumes after reopening the paper. A changed PDF or AI output language starts a separate result, while previous runs remain stored.

Each figure link displays its source ID and whether its saved transcription matched the source. A missing or false match flag is shown as not fully verified. Figure IDs present in a unit but absent from its saved items are listed without a link. Matching transcription does not verify the model's figure association or interpretation; inspect the original PDF.

If a result or saved figure interpretation names a figure or table that is not represented by the unit's linked figure/table items, the unit shows **图表关联提示（待核对）/ Figure association warning (review needed)**. The same notice appears when a unit with a linked figure or table also cites a paragraph headed as a method or procedure without a result or formulation heading; check whether that method is direct evidence for the figure claim. Both checks are recomputed in the response for older readings without changing stored records. They catch explicit links and heading-based mixing only; they cannot detect an unstated association or prove that a linked caption supports the claim.

When cross-batch units have different model-assigned statuses, the merged unit is marked unclear and shows the earlier statuses so each claim can be checked against the source. These labels are themselves model-generated; agreement does not establish accuracy, and an overview may still miss the distinction.

When the page-analysis prompt changes, an older reading for the same PDF and output language remains viewable if no current-version run exists. It is labeled as historical and cannot be resumed; regenerate it to use the current prompt. Historical units are not automatically reused by comparison workflows.

Near the whole-paper overview, expand **各单元的局限提示（待核对）** to see limitations retained in each unit, including ones omitted from the overview. Select a unit to inspect its source evidence. These notes are model-generated, may themselves be wrong or incomplete, and must be checked against the paper. Previously saved runs with unit limitations can also show this list.

The current synthesis prompt asks the model to distinguish an unreported method from one known not to have been performed. A targeted recheck still produced an unsupported statistical-method claim, so this instruction does not replace checking the source.

The page count and image-sending notice appear before starting. Cancel stops further requests after the current model call returns; that request may still be billed. For an interrupted, cancelled, failed, or partial run, **继续未完成页面** starts a new run using successful pages from the matching document, PDF version, language, and prompt version, then retries the remaining pages and rebuilds the experiment units and overview. **重新生成完整深读** starts over. Previous runs remain stored. Request and token totals apply to the new run; unavailable usage is counted separately rather than estimated.

Resume reanalyzes a page if its cached page number appears more than once; non-integer and out-of-range cached page numbers are not reused. These extra page requests may incur charges. Completion requires the exact set of PDF page numbers and a warning is shown if that set is incomplete or duplicated. This checks page numbering, not scientific accuracy; existing runs are not rewritten.

New runs show source items cited by multiple experiment units in an expanded review list. Open the original page and select a unit in the list to inspect its grouping; sharing a source may be appropriate, so a flag is not itself proof of an error. Unassigned items and failed unit batches are also reported. These checks do not establish scientific accuracy. Older runs may not contain the duplicate or failed-batch fields and are not retrospectively checked.

During unit grouping, the workbench may make up to three additional model requests for omitted items and their neighbours. Any remaining omissions, repeated item references and failed grouping batches are reported for review; a failed batch keeps the run partial even if other batches covered its item IDs. Grouping and recovery are model-generated and must be checked against the paper.

Page-item limitations are also supplied as unverified leads during grouping. They can flag missing design information, but the model may misinterpret them or add unsupported details; check allocation, sampling and other methods against the original paper.

If an overview segment fails, the overview shows the successful segment summaries alongside the failed segment's unmerged model-generated unit fields. Page-only fallback retains all available page summaries. The run remains partial; these fields are not a verified replacement for the original paper.

Page and unit descriptions retain model statements and warnings mentioning truncation or page boundaries: these words can also describe scientific results or real missing context. Neighboring-page text is bounded, so review any such warning against the original document. The updated page prompt uses a new version; continuing a previous run cannot reuse pages generated with the older prompt version.

Check the experiment grouping, numerical results, units, and figure interpretations against the cited pages. A located excerpt confirms its position, not the correctness of the model's interpretation or its association with an experiment. The evidence section shows each source ID and includes figure-only references, so that an association can be checked against its source. The model can also leave an item unassigned or split one experiment across units. New runs with items assigned to multiple units are marked partial and list the IDs in processing notes for review; shared evidence can sometimes be appropriate. Resuming reuses the existing page interpretations, so it does not correct mistakes in those interpretations.

New deep reads include additional model requests to flag possible numerical conflicts in verified source text. **数值冲突检查（待核对）** near the overview shows saved candidates, their quoted evidence, links to available source items, and audit coverage. It also counts known unverified numeric transcriptions excluded from new audits, failed batches and rejected candidates; missing transcriptions and numbers not recognized as digits are not included in that count. Older records may lack these counts. Check the original pages and experimental conditions. A public-paper trial missed a known conflict and flagged a difference between formulations, so neither a candidate nor an empty result establishes whether a conflict exists. Long passages may be truncated and separate batches can miss conflicts between them. The task usage includes these requests.

New candidates are checked for numeric text boundaries, so a reported `0.6 mM` is not accepted solely because a quotation contains `10.6 mM`. The interface flags older saved candidates checked with the previous matching rule; they are not revalidated automatically. Even a matched value and quotation require human review of their scientific meaning and context.

The workbench offers a continue-reading shortcut for the browser's last open reader tab. Reading position and open tabs are stored in that browser. In the reader notes, export the current project's excerpts as Markdown with paper keys, page numbers, and evidence states. For a batch with failures, expand the status message to inspect and retry the failed papers; retrying calls the configured model again.

The shared project selector at the top of the reader links questions, excerpts, and figure notes to the same project. Select text in the PDF to ask a question, save an excerpt, or translate it. In `深读` → `图像选区与笔记`, click `框选图像`, then drag over a figure or panel on a PDF page. Enter a figure number such as `2` or `S3` to search extracted text for caption and in-text reference candidates; click a page number to check the original. Add a note and save it to the current project. Saved selections retain the paper, page, selection coordinates and PDF version. If the PDF changes, the selection is marked stale. Caption matching depends on extractable text and is a starting point for manual verification; image-only PDFs are not searched by OCR. Figure selection and matching run locally; sending a crop for analysis requires the image checkbox.

## Selected-Text Translation

Select English text in a PDF and click `翻译`. `Settings -> Translation` detects the browser’s built-in Translator API and can initiate its language-pack download from a button click. When browser translation is unavailable, ScholarLoom uses a free online translation endpoint; this sends only the selected text to `translate.googleapis.com` and does not consume the configured research-model tokens. The settings page also offers an offline model with a 67.5 MB download and about 149.1 MB on disk after installation. Offline results are labeled as lower quality so numbers, abbreviations, and terminology can be checked. The source text and page remain visible; translations are cached for the current browser session and are not added to the paper record.

The translation flow does not create a second reading card or change the paper’s bibliographic data. Prompt presets remain available for model-backed research prompts under `Settings -> Research prompt presets`, but the reader uses one question box instead of presenting the presets as separate reading modes.

## Comparison Synthesis

Comparison instructions ask the model to retain the comparison behind a statistical threshold, distinguish differential expression from activation, and limit absence claims to the supplied excerpts. Targeted rechecks still produced unsupported threshold and absence claims; check the original paper and supplements before relying on the draft.

The comparison view includes an evidence matrix scoped to a named project. Add the selected papers to that project in the full-text search panel, select 2–12 papers, and generate the matrix. Generation sends bounded original passages and any matching prior reading-unit summaries to the configured model; paper IDs and source pages stay attached to each cell. Only passages verified against the current PDF can be cited. The model's interpretation still requires review against its sources, and a paper without readable passages receives an unknown state.

When a generated matrix cell cites both supplied and nonexistent passage IDs, its text and valid quotations are retained with **Needs review** status. A warning records the number of invalid references and up to 30 rejected IDs, each limited to 120 characters; it belongs to the generated value even when a human revision is shown, and is included in matrix exports. A cell with no valid citation is left empty, with the warning retained. These checks do not verify whether a valid quotation supports the claim. Previously generated cells are not changed, and their discarded IDs cannot be recovered.

Edit a cell and save it with an evidence status. Changing the text sets its status to **Needs review** until a status is chosen again. Generated values and human edits are kept separately, including their own source snapshots; regenerated values do not overwrite edits. Sources whose PDFs have changed are labeled outdated. Export Markdown or CSV to retain both values and their provenance. The existing synthesis uses the current project's saved matrix when available and labels human revisions and model interpretations separately from source quotations. A generated matrix value is sent only when every stored source still verifies against the current PDF and all of those sources fit in the synthesis input; rejected citations also exclude it. Human revisions remain available to the model, including revisions without a quotation, and are labeled as interpretations.

Select 2–12 papers in `Search and guides`, open `Compare`, optionally enter a focus question, and generate the report. Two to four papers retain the side-by-side table. Five or more use a compact evidence ledger. The model receives paper IDs and structured reading cards. When a current deep-reading dossier exists, comparison also receives its outline, argument roles, methods audit, and reusable notes. Records without a structured card or verified original passages remain metadata only and cannot support a conclusion. The report covers scope and consensus, supporting evidence, disagreements and limits, heterogeneity, gaps, and a cautious 250–500-word synthesis. Expand **View source excerpts saved with this draft** to inspect all saved quotations, including passages the generated text did not cite, and select a passage number to locate it in the current PDF. Reading cards and other model inputs are not shown in this list, and saved excerpts may cover only part of a paper. A locatable quotation does not establish that a claim is supported; check the comparison, conditions and values. Copy or download the Markdown with its paper-number list and available source quotations, without changing the underlying records.

Comparison also retrieves bounded passages from the selected local PDFs and reuses matching experiment units from an earlier complete or partial reading. The unit heading and its verified source mappings guide passage selection; the model receives the original quotations, not the unit's generated question, design, result or interpretation. A unit is used only when all its source items have verified quotations that fit within the available passage slots; otherwise the comparison can still retrieve original passages and use the saved matrix. Matrix generation applies the same rule to prior reading units. It does not start a new complete-reading job. Original passages use citations such as `[P1E1]`; select one to check the quotation in the PDF. The saved citation includes its PDF version, and navigation rejects a changed attachment. Experiment units and reading cards are model interpretations; check their claims against the quoted passages. A paper without usable text is labeled as reading-card or metadata-only material.

Long reading-unit source texts are checked in full against the current PDF, divided into passages of at most 1,800 characters, and checked again individually. The unit hint is omitted if the full source or any part cannot be checked, or if the parts do not fit in the available slots. Splitting prefers a nearby sentence boundary, then whitespace; if neither is available it can still cut within a word. Check the surrounding PDF context. Other retrieved excerpts and matrix quotations may still be truncated. Older generated comparisons and matrices are not rewritten.

If a comparison exceeds the model input budget, it may drop matrix fields and original passages. When a removed passage was associated with a prior reading unit, the whole unit hint is omitted rather than sent with an incomplete source list. Other retained passages may still be used, and the resulting report can have less evidence than the saved reading or matrix.

The generated synthesis is also saved under the selected project as a research draft. Reopen `Compare` and enter the project name to restore it without reselecting papers. Edit the Markdown and click **Save revision**; unsaved typing remains in the current page only. The latest generated draft and the saved revision are separate. Each revision keeps the paper-number mapping and saved excerpts it started with, even if a later generation uses different papers; each draft's excerpt list uses its own snapshot. Choose **Start from latest generated draft** to begin a new revision with its mapping. The project-draft Markdown export includes the current text and its paper-number list.

Changing the interface language reloads the page. When there is an unsaved project draft, matrix cell, paper question, prompt or settings edit, or an active comparison selection or focus, the workbench asks before discarding it.

## Online Discovery And OA Import

In `Search and guides`, switch the search scope to `Discover online` and enter a topic. ScholarLoom queries the free OpenAlex API and returns titles, authors, citation counts, source links, abstracts when available, and open-access status. A reading card's related-literature panel uses OpenAlex related-work links for paper-to-paper discovery.

`Add to local library` is shown only for a public HTTPS OA PDF. The server validates every redirect, caps the file at 150 MB, verifies the PDF signature, and places the download in the same inbox used by watched folders. Journal/patent verification, duplicate checks, local saving, optional Zotero import, and automatic reading-card generation then proceed normally. A publisher landing page without an OA PDF is a discovery result only; ScholarLoom does not bypass a paywall.

External discovery and local matching are separate. Local synonym search remains deterministic and works offline. Online discovery requires access to `api.openalex.org`, and model-backed Q&A or synthesis requires a configured Chat Completions endpoint.

## Review Queue

Files that lack reliable identity evidence, point to an unverified preprint record, or whose title evidence disagrees with Crossref stay in the review queue. A title-only Crossref match without a first-page DOI is evidence for review, not enough for automatic import. Defense presentations, course lesson plans, lecture courseware, and other obvious non-literature are excluded from the default inbox and library; select `Excluded` in the status filter when you need to audit them.

Use `Confirm import` when the displayed title and type are correct; the record then enters the normal local-save queue and is also written to Zotero when that connection is authorized. Use `Retry` after a network error or after replacing a file. Use `Ignore` for files that are not literature. None of these actions deletes the downloaded file.

## Zotero Authorization

Zotero is optional for automatic file intake. Its single-use `Allow` grant is insufficient for unattended Zotero imports; choose `Always Allow` once from the workbench connection button when you want records and linked attachments written into Zotero. The key is stored in `data/secrets.bin` and is bound to the Zotero server ID. Reauthorize if Zotero reports that the library changed.

## Existing Downloads

Use the file-monitoring switch in the header to pause or resume scanning without changing the Zotero connection. Newly watched folders are baselined so that the workbench does not process every old file at once. Click `Add existing downloads` to enqueue them. Imported content hashes and DOI matches prevent duplicate records.

## Backups

Stop the local server, then back up the entire application directory, especially `data/workbench.sqlite` and `data/Library/`. To restore without changing paths, restore the backup to its original location. ScholarLoom stores absolute PDF paths as well as Zotero linked-attachment paths; restoring to another location does not automatically redirect either. Moving a library requires a separate path migration and updates to the Zotero links.

On Windows, encrypted credentials cannot be decrypted by a different Windows account. On other systems, `data/secrets.bin` is a local JSON file; protect it with filesystem permissions and never commit it.

## Reading memory

In full-text reading, expand **Reading memory**. Choose a project name to separate research topics. Save confirmed goals, presentation preferences or tentative hypotheses. Give revisions the same revision-topic name, or click **Revise**, to replace the current memory. Memory applies to the selected project across papers; paper-specific scope is also available through the API.

Completed Q&A is saved locally and restored when a paper is reopened. Uncheck **Use memory** to omit historical dialogue and memories for a request; the completed exchange is still saved. Selected history and memories are sent to the configured model with paper excerpts. Memories guide personalization; they are not paper evidence. Delete memories/events with their buttons or export the complete project as JSON.

The context status shows how many history/memory entries and evidence bytes were included. Evidence can be truncated to fit the request. The local request ceiling uses a conservative UTF-8 estimate, not exact provider tokenization.

全文概述会收到单元的逐图解释作为未经核验的线索；图号仍可能被误用或遗漏，时程等设计细节也可能被概述写错。对重要结论请同时核对原文和对应图表。

概述可能改错实验次数、间隔或时长，也可能遗漏单元中的局限；请核对各字段，不要仅依赖一句话摘要。

新生成的概述保留模型返回的全部概述条目和字段文字，不再按条数或字符数静默截断；内容仍可能在模型生成或跨批次汇总时遗漏，必须核对原文。已有记录不会自动恢复被截掉的内容。

新逐页结果核验完整转写，实验整理接收完整原文和局限；单项超出模型输入预算时将提示且保留为未归属。模型生成的局限即使被完整保留也可能有误，应核对原文。旧记录不会重新核验或补回截断内容。

页面图像无法生成或模型拒收图像时，有可提取文字的页面会按纯文本分析并提示图表外观未核验；模型仍可能生成不准确的视觉描述，请对照 PDF。若既无可提取文字又无法发送图像，该页记为失败，修复 PDF 或模型图像支持后可继续重试。逐页提示更新到版本 8 后，旧版本的页面结果不会用于新任务的继续处理；已有记录仍保留。

旧版逐页转写若恰好达到 5,000 字符，打开时会提示可能被截断，并暂不视为完整转写匹配；继续该阅读任务时重新分析对应页面。恰好 5,000 字符不一定发生截断，不能从提示推断实际内容。
定位标签“按部分文字定位”表示有部分文字支持页面中的位置，不表示起止文字均已匹配，也不等于整段转写已核实。
新分析排除了仅因单个图表字母或数字出现在长段落中而产生的部分定位框；定位仍按 PDF 提取的文字块近似匹配，应对照原文。已经保存的旧定位框不会自动修正，可能仍包含无关区域。

原文定位优先用完整转写匹配相邻文字块，减少共用图注结尾造成的误高亮；完整转写无法映射时仍使用锚点或部分文字回退。完全相同的重复文本、提取顺序和文字块范围仍可能使定位不唯一或不精确，需对照原文。既存记录的矩形不会自动更新。

数值冲突新候选须含至少两条不同的来源 ID 与引文组合，所有提交的完整引文均须与送检原文匹配；重复同一引文不能充数，额外引文未通过核验则该候选被拒并使审计标为不完整。旧记录展示旧引文规则提示，无法自动恢复此前已丢弃的引文。不同 ID 仍可能指向同一段原文，应人工核对。
