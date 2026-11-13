# ScholarLoom Project Memory

Updated: 2026-11-12

A proposed source-role grouping prompt was replayed on the public AIRWAY 58-item set and rejected. It increased output from the prior structure to 55 units, repeated 20 source IDs, and produced 19 explicit figure-link warnings while fragmenting method details into duplicate units. The run used 11 requests, 60,970 input and 35,988 output tokens including one retry; it is one non-blind sample but showed no evidence that the prompt improved overall grouping. Production remains at grouping prompt v8. Raw input/output is in `data/fullread-acceptance-20261112-grouping-role-v9/`; scientific acceptance remains open.

New complete-reading units store deterministic `sourceWarnings` when an explicit Fig./Figure/图/Table/表 number in `result` or `figureInterpretation` is not represented by the unit's linked figure/table items. The server preserves these across cross-batch merges, and `GET /api/full-read` recomputes and combines them for older records without rewriting storage. The UI labels them **图表关联提示（待核对）/ Figure association warning (review needed)**. A read-only replay found 8 explicit warnings in two production records, 15 of 48 public AIRWAY units, and 2 of 10 public MEDIUM units; these are review leads. The check misses unstated or semantically wrong associations, including AIRWAY U28/U32/U33 where a related figure number is linked but the source grouping is still incorrect. No warning does not establish scientific acceptance.

A second deterministic notice flags a unit that links a figure or table while also citing a paragraph whose heading identifies a method or procedure (method, protocol, passage, preparation, staining, imaging, transduction, production, and similar) but not a result or formulation. A read-only replay hit the known AIRWAY v6 U28 mixing of Fig. 3 with culture/transduction methods, one AIRWAY v5 methods unit, and AIRWAY v8 U30/U31 where organoid culture/imaging methods share Fig. 3 with organoid results; the current MEDIUM record had none. The heading filter deliberately excludes result, composition, medium, and formulation headings to avoid recipe-table false positives; a hit can still be legitimate methods background, and it misses sources without a methods heading and cannot judge whether a linked caption supports the claim.

DONKEY v9/v12 preserves the main design and values but is not scientifically accepted. It correctly reports the 12 donkeys, six per group, 200 mg/kg AA 30 minutes before packing, alternating three-day schedule, 0.3% NaCl EOF contrast, MDA pre/post increases, post-treatment P > 0.05, and the unresolved 35.97/35.07 conflict. It still turns the author's EOF causal discussion into a result, asserts uncorrected multiple t-tests and unused MDA pairing where the paper only leaves the statistical methods unclear, says dose/timing were unassessed although one dose and timing were used, and lets an abstract-only limitation deny the five concentrations shown in Figs. 1-2. It also makes an unsupported legal conclusion from ethics approval and overstates the ambiguous “maximum haemolysis (0%)” wording as proven contradiction. See `docs/experiments/donkey-methods-review-20261111.md`.

AIRWAY v6 now passes source-level checks for the principal numerical and experimental claims: the 1,429-compound primary proliferation screen, 17 independently retested hits, ENZO-only untransduced CellTiter-Glo 9/9 check, Fig. 3 Wnt assays, and Fig. 4 tissue-specific Myc/Ccnd1/Lef1/Axin2 results all match the public paper. Whole-paper acceptance is still blocked by source grouping: U2 discusses Fig. 2/S2 while linking only the Fig. 1 caption; U28 mixes the Fig. 3 experiment with compound-library and transduction methods; U32 attaches the Fig. 3 caption to library preparation; U33 attaches library preparation to the Fig. 3 evaluation. Correct result text and complete item coverage do not repair these semantic associations.

The saved MEDIUM 10-unit merge covers all 30 source items and most result statements match the paper, but U2/U4/U6/U9 present one side of four unexplained paper-internal formulation conflicts as settled: 12 mM cysteine versus Table 2's 0.145 g/L, 50 mM D,L-lactic acid versus Table 3's 0.6 mM, 0.1% acetate versus Table 1's 10 mM, and potassium acetate in prose versus ammonium acetate in Table 3. Its overview preserves the lactic-acid conflict but still says high cysteine was excluded even though Fig. 1C uses 10x L-cysteine, upgrades “without substantially affecting” to “not significantly affect,” and states potassium acetate without the table conflict. Coverage is not scientific acceptance; see `docs/experiments/medium-composition-review-20261111.md` and `docs/experiments/full-read-three-20261111.md`.

Comparison input now omits model-generated evidence-matrix values unless every stored source verifies against the current PDF and fits in the available passage slots; generated `citationValidation` with rejected citations also excludes the value. This removes source-less, stale, partly supplied, and rejected-citation values from new synthesis requests without rewriting saved matrices or older drafts. Human revisions remain supplied and are labeled as user interpretations, including those without a quotation. A real-PDF integration test covers omission and retention.

A controlled non-blind replay against the historical public AIRWAY/AIR3 matrix used 5,288 input and 2,694 output tokens (one request). The request retained the page-7 Fig. 4 source containing `3 mg/kg`; the response's request-local `P1E5` pointed to that page. An earlier request-local `P1E5` had pointed to page 1, whose quotation did not contain the dose. The response also distinguished P2 differential expression from measured proliferation. It still put TOPFlash in its methods table without citing a supplied excerpt; the full paper supports it, but the supplied citations do not. It repeated the P2 paper's own “activation” wording for GO-enrichment results, which is an analysis-level interpretation rather than a functional assay. One replay does not establish stable improvement or P3 acceptance; see `docs/experiments/matrix-reserved-sources-audit-20261111.md`.

An isolated Edge desktop review of a public DONKEY record displayed the new figure-source labels for a synthetically unverified P3-I3, a verified P3-I5, and a synthetic missing source ID together. After clicking P3-I3, its Fig. 1 caption was visible on page 3; page 3 was already selected and the screenshot did not confirm highlighting, so this is not a cross-page navigation or highlight test. Only Chinese and one record were reviewed. The isolated service was stopped; the original record and user services were unchanged.

Resume now excludes all cached copies of duplicated page numbers and non-integer or out-of-range page numbers, and retries the corresponding missing PDF pages. New page results must match the requested page. New completion records require the exact PDF page-number set, expose `coverage.pageSetValid`, and warn when it is invalid; older records remain unchanged. Prior inspection found no such numbering anomalies in a limited sample of 24 records; the repair is preventive and does not establish scientific accuracy.

An isolated single-call replay of the current comparison prompt with the same public-paper material and preset as the previous replay distinguished differential expression from measured proliferation. It still made study-wide Wnt absence claims from excerpts, omitted the scope of an expression threshold, repeated the source paper's disputed GO pairing/activation wording, and cited a passage that did not contain a stated dose. This non-blind sample does not establish prompt effectiveness or P3 acceptance; see `docs/experiments/matrix-reserved-sources-audit-20261111.md`.

The comparison synthesis instruction previously prohibited negative phrasing such as “不等于” while also requiring evidence boundaries. It now permits explicit distinctions when necessary, including that differential expression does not establish activation; the English instruction is aligned. This is a prompt change, not a scientific accuracy check, and saved drafts are unchanged. A targeted bilingual prompt test covers the actual request; real-model re-evaluation and P3 scientific acceptance remain open.

The saved DONKEY P3-I2 location included eight unrelated one-character figure labels or numbers matched as substrings of its 678-character source, alongside the target paragraph. New location validation requires at least eight alphanumeric characters for substring overlaps, while permitting exact short block matches; recomputing this example yields one paragraph rectangle. This remains a block-level heuristic that may miss short fragments or admit unrelated longer matches; saved old rectangles are untouched. Targeted Python regression passed; live browser highlighting remains unverified.

An isolated desktop browser check with an old public DONKEY record and a synthetic partial conflict audit displayed review warnings, page-level source details, and an unlinked figure interpretation. Clicking the P3-I2 source moved the PDF from page 1 to page 3; the screenshot did not establish a visible text highlight. A 480×850 viewport screenshot showed a very small desktop-style layout, requiring further investigation of narrow-screen readability and intended support. The check did not establish scientific accuracy or cover all controls or both languages; no model call or existing service restart occurred. The temporary service was stopped and the viewport reset.

The reading resume path reuses saved pages and completion compares the saved page count with the PDF page count, rather than checking the exact page-number set. A read-only spot check of 4 production and 20 isolated-evaluation records found no duplicate, noninteger, or out-of-range page numbers relative to recorded integer totals; this is not proof that every store or future record is valid. Source-batched overview experiments on DONKEY and MEDIUM have already been performed and still showed scientific errors or truncation; future work must address those results rather than count source batching itself as a fix.

DONKEY MDA targeted review distinguishes within-group pre/post results, the post-packing between-group comparison, and the unreported group-by-time/changes comparison. Neither significance comparisons across tests nor mean subtraction establish an interaction; the conflicting reported post-AA values remain unresolved. See `docs/experiments/donkey-methods-review-20261111.md`; scientific acceptance remains open.

Numerical-conflict candidate validation now checks numeric text boundaries inside each individual quotation, rather than accepting a number embedded in a larger or negative number. This applies to new audits; old candidates are not revalidated or rewritten. Text matching cannot establish scientific equivalence or a genuine conflict.

MEDIUM Fig. 1 distinguishes panel A's five-minute readings and five-point rolling SEM from panel B/C hourly readings and per-time-point SEM. An older source-batched overview generalized the statistical method without those panel-specific caption details, which were missing from the final merge input. It also repeated an upstream claim that high cysteine was excluded, although panel C used tenfold L-cysteine. This targeted historical audit is not whole-paper acceptance; see `docs/experiments/medium-composition-review-20261111.md`.

Release review at the 2026-11-11 checkpoint: the three runtime dependency
versions in `THIRD_PARTY_NOTICES.md` matched that environment. The 2026-11-12
audit found PyMuPDF 1.27.2.3 and no local CTranslate2 or SentencePiece
installation; `requirements.txt` now pins the three notices' versions. License
files and other new release files remain untracked. The isolated backup/restore
test and nine mocked desktop-launcher decisions passed; this does not establish
hosted CI or release readiness.

An additional AIR3 synthesis check found GO term-name inconsistencies already present in the paper's prose: Table 1 and the current ontology distinguish GO:0001817 from cytokine activity, and GO:0002684 is not specifically antibacterial defense. The current term names were initially reported before an external lookup; subsequent AmiGO search results support all three names, as documented in the audit. Enrichment alone does not establish functional activation. The 2018 ontology version and analysis files were not checked; details and sources are in `docs/experiments/matrix-reserved-sources-audit-20261111.md`.

Complete-reading source entries now expose saved page-level model interpretations, extracted evidence and limitations alongside the transcription, labeled for review; saved figure interpretations also remain visible when their linked source is unavailable. This is a display change, not validation of model claims. Rendering tests and JavaScript syntax checks passed; no browser acceptance or runtime restart was performed.

Targeted review of the latest AIRWAY/AIR3 comparison draft found remaining scientific errors: differential expression became activation, phenotype screening became pathway-directed screening, the comparison attached to an expression threshold was omitted, and limited excerpts were treated as proof of study-wide absence. Two separately checked result statements were supported. This is not a complete claim-level audit or P3 acceptance; see `docs/experiments/matrix-reserved-sources-audit-20261111.md`.

Comparison generation now requests faithful screening objectives, threshold comparisons, expression direction and excerpt-scoped absence claims. A production-path recheck and an exact-material replay both retained the previous threshold-scope and study-wide absence errors; the replay also misdescribed screening and validation as two library screens. Scientific acceptance remains open; results and usage are in the audit above.

## Project definition

ScholarLoom turns a messy download folder into a local-first research desk. It verifies PDFs and EPUBs before import, keeps a stable local copy even when Zotero is unavailable, and connects reading cards, page-grounded Q&A, cross-paper synthesis, discovery, and personal reading state in one local application. When connected, Zotero remains the bibliographic organization layer and owns the corresponding parent records, collections, tags, and linked attachments.

The product direction is broader than PDF chat: ScholarLoom should become the reading and knowledge workspace, while Zotero continues to manage records and source files.

## Current baseline

- Repository: `https://github.com/segayi1/scholarloom`
- Branch: `main`
- Source release: `v2.1.0`
- Release scope: local-first intake, evidence reader, whole-paper deep reading, project retrieval, evidence matrices, synthesis drafts, named sessions, dossiers, figures, translation, and recovery controls
- Runtime: Python 3.12, standard-library HTTP server, SQLite, PyMuPDF
- Frontend: plain HTML, CSS, and JavaScript; no build step
- Standard launcher address: `http://127.0.0.1:8766`
- Local desktop launcher: `launch-desktop.ps1`, `http://127.0.0.1:8767`; historical 8766 runtime remains separate

Release 2.1.0 includes the reader, deep-reading, retrieval, matrix, session and
desktop-launcher changes described below. Earlier acceptance records retain
their original dates and scope; the latest source regression and release gates
are recorded separately.

The overview offers a collapsed list of limitations retained in individual
units, with links back to those units. It exposes notes omitted from the
overview; these model-generated notes can still be incomplete or wrong and
require source review. Existing saved unit records can also be displayed.

Synthesis prompt v12 distinguishes methods not reported from methods known not
to have been performed. A single targeted DONKEY overview recheck still made an
unsupported assertion about paired analysis, repeated an erroneous claim about
dose citations, and omitted a conflicting value from one finding. It does not
pass scientific acceptance; see the three-paper experiment record.

The isolated AIRWAY synthesis prompt v6 recheck used 9 requests (51,482 input
and 34,550 output tokens, including 2 retries), assigned 58/58 items and flagged
24 duplicate IDs. P7-I3 (compound-library preparation) remains attached to
Fig. 3 units U28 and U33; U32 also attaches the Fig. 3 caption to that method.
This does not pass scientific acceptance. No overview was rerun.

Page and synthesis prompt v7 no longer suppress sentences or warnings solely
because they mention truncation or a page boundary. Such text can describe a
real scientific construct or missing context; cross-page warnings require
review and can still be false. Page prompt version changes prevent reuse of
older page analyses in resumed runs. Existing records are unchanged.

The AIRWAY P7-I3 page analysis incorrectly describes the compound library as
background for a Fig. 3 screen; the source paragraph does not make that link.
In a seven-item isolated comparison both model calls kept that paragraph in a
separate unit, but the source-first variant still asserted a Fig. 3 association
in its figure interpretation. This small comparison cannot identify the cause
of the full-run error. Synthesis prompt v8 asks the model to check generated
interpretations against the source. A traced full grouping still attached the
Fig. 3 caption to the library paragraph in raw calls 5 and 6, before the merge;
the resulting U22 and U29 retain that association. It used 7 requests (44,879
input and 26,543 output tokens), assigned 58/58 items and flagged 24 duplicate
IDs. No overview or full scientific acceptance was performed.
The deep-reading interface now labels transcription matches explicitly, warns
that model-generated associations require source review, and displays source
IDs and figure-only citations in each unit's evidence section.
A five-pair source-only model spot check of AIRWAY figure links flagged the
known incorrect screen/figure associations but also rejected the matching
iCRT14 method and Fig. 3C. It is not reliable enough to remove links
automatically; see the three-paper experiment record for the limited sample.

The complete-reading interface now exposes new-run duplicate source IDs with
their original passages and links to citing units, as well as failed unit-batch
counts. A repeated source can legitimately support more than one unit; these
flags assist review and do not establish scientific accuracy. Older records
without the fields are not retrospectively checked.

Targeted AIRWAY review found that the omission-retry output incorrectly attached
a compound-library preparation paragraph to the Fig. 3 assay and listed Fig. 3
as support for a Fig. 2 validation unit. Synthesis prompt v6 permits genuinely
shared evidence and instructs the model to keep unrelated adjacent items apart
and preserve tissue and statistical uncertainty. The change requires isolated
model recheck and does not itself establish scientific correctness.

## Delivered history

### 1.0: local intake

- Monitors download folders and waits for files to settle.
- Reads local file content, extracts DOI or patent signals, and checks Crossref metadata.
- Deduplicates by content hash, DOI, and patent number.
- Imports verified records into the stable local library, with optional Zotero parent/collection/attachment writes when authorized.

### 1.1-1.2: usable bilingual workbench

- Added English and Simplified Chinese interface switching.
- Renamed the project to ScholarLoom.
- Added explainable bilingual search across titles, authors, identifiers, and reading-card fields.

### 1.3: evidence-oriented reading

- Added structured reading cards and page-labelled PDF Q&A.
- Added comparison for 2-4 papers and evidence-led mini-reviews for 5-12 papers.
- Added six editable bilingual research prompts and independent AI output language.
- Added OpenAlex discovery, related-work lookup, and validated open-access PDF intake.
- Added unread/reading/read state, private notes, filters, and a seven-day home digest.

### 1.4: safer intake and resilient discovery

- Tightened automatic intake to high-confidence DOI-backed journal articles and structurally verified patents.
- Directly excludes obvious non-literature files while sending ambiguous records to review.
- Added manual confirmation for reviewed records.
- Added OpenAlex polite-pool access and Crossref fallback for rate limits, timeouts, and empty results.
- Fixed IME-triggered duplicate searches and the narrow external-card layout.

### 1.5: recognition recovery and attention boundaries

- Uses PDF document metadata as secondary identity evidence when page text is incomplete: a metadata DOI still must resolve through Crossref and agree with the metadata title or text evidence.
- Recognizes title-matched arXiv records and Crossref preprint records without inventing a journal DOI; verified preprints are stored with `kind: "preprint"` and a repository/archive identity.
- Keeps obvious non-literature in SQLite for audit but removes it from the default inbox and progress totals. The `Excluded` filter remains the explicit audit path.

Historical library counts belong to earlier local runtimes and are not part of the v2.0 release record.

### 2.0: complete local research reader

- Added a browser-like multi-paper PDF reader with independent page/zoom state and session restoration.
- Added SHA-bound evidence pages, page-locatable citations, quote validation, excerpts, persistent Q&amp;A, scoped reading memory, and bounded context.
- Added on-demand reading dossiers with reading decisions, outline, argument roles, methods audit, evidence repair, and stale-version detection.
- Added manual figure crops and project notes, selected-text translation, batch failure recovery, backup/health controls, and a one-click installation path.
- Kept intake, local library, and reader usable without Zotero or a configured model; AI features remain optional.

### 2.1: whole-paper reading and project research

- Added fixed workspace navigation, per-view scrolling, adjustable reader columns, and shared project controls.
- Added paragraph interpretation, manual figure association, and online sources within bounded Q&A input.
- Added automatic page-by-page reading, experiment-level units, figure links, a whole-paper overview, and locally checked source anchors.
- Full-reading runs persist page results, detect interruption after restart, and provide continuation of missing pages, cooperative cancellation, and per-run usage accounting. The desktop launcher checks registered reading jobs before restarting.
- The recorded real-model acceptance covers two pages of one paper, with 11 located source items grouped into three units. Whole-paper and broader-layout acceptance remains pending.
- Project-scoped full-text retrieval, editable evidence matrices, saved research
  drafts and named reading sessions are implemented. Public-paper evaluation
  distinguishes a locatable quotation from proof that it supports a claim.
- The three-paper prompt-version-5 run completed all 29 pages. DONKEY passed
  targeted key-result review; AIRWAY and MEDIUM failed content acceptance
  because of an unsupported figure interpretation and an incorrect table
  identifier/conflict summary. Page prompt version 6 restricts unsupported
  image-derived statistics; synthesis version 5 preserves figure/table
  identifiers and numerical conflicts in the overview. Focused rechecks are
  recorded in `docs/experiments/full-read-three-20261111.md`.
- A frozen controlled longitudinal memory fixture based on three public papers
  passed 16-query retrieval regression and eight real-model answer-context
  calls. It is scripted evidence, not a real-user longitudinal trial.
- The focused recheck corrected AIRWAY's audited gene account in rebuilt
  units, but exhausted its shared 10-call limit during overview synthesis.
  MEDIUM received no new model calls. Neither staged overview is accepted;
  unit duplication and MEDIUM's unassigned methods item remain open.
- Independent per-paper overview rechecks subsequently ran for both papers.
  AIRWAY still truncates and misstates the primary screen despite the correct
  details being present in saved unit U9. MEDIUM retains the known Table 3
  lactate conflict, but its unit assignment and wider review remain open.
  New runs warn on duplicate source assignments and stay partial; duplicate
  references are preserved for human review. See
  `docs/experiments/full-read-three-20261111.md` for scope and usage.
- The latest full Python regression passed 219 tests. Web, translation,
  JavaScript syntax and nine Windows launcher decision paths also passed.
  Desktop and 390 px browser checks passed after fixing filter overflow.
- Project and dependency licenses are separated. PyMuPDF 1.27.2.3 is AGPL-3.0 or
  commercially licensed; `THIRD_PARTY_NOTICES.md` and `licenses/` record the
  project MIT boundary and third-party texts.

## Architecture

`server.py` owns the HTTP boundary, SQLite database, Zotero local API communication, model calls, prompt presets, and application state. `pipeline.py` owns local file inspection, metadata verification, conservative classification, PDF text extraction, and external literature search. `evidence.py`, `memory.py`, `dossier.py`, and `figure.py` own the versioned reading stores. `web/` is the browser client. Tests cover intake rules, secret handling, API boundaries, reading evidence, memory, dossiers, figures, synthesis, Zotero retry behavior, translation, and frontend checks.

Private fields are removed from `/api/state`. Zotero credentials and the model key are stored in `data/secrets.bin`, using Windows DPAPI when available. A fresh checkout starts with an empty library.

Local development adds `deep_read.py` for paragraph/figure interpretation, `external_context.py` for online question context, and `full_read.py` for page results, experiment units, validation, and run storage. These modules are present in the uncommitted working tree.

## Data and runtime

Historical runtime data is intentionally not shipped. A checkout starts with an empty `data/` library; the active local database, encrypted credentials, cached PDFs, translator models, and logs are runtime files and stay outside Git. Do not publish a populated data directory or migrate historical records as part of routine source work.

## Known gaps and next candidates

- The immediate milestone is resolving and reviewing the failed AIRWAY and
  MEDIUM checks from the completed three-paper run. Unassigned methods items
  and scientific-content errors remain distinct from execution coverage.
- A structured peer-review/annotation store and reliable Zotero annotation synchronization remain pending.
- Local development includes project membership, indexed paragraph retrieval with coverage and source jumps, and fixed-query and real-library performance records. The editable evidence matrix is connected to comparison, source navigation and export; targeted public-paper failures have been corrected, while general semantic accuracy still requires claim-level review.
- Comparison reuses saved full-reading units only to select and map original
  evidence; generated unit summaries are not sent as scientific source material.
- External discovery and model calls depend on network availability; the intake path does not require a model.
- Zotero annotation round-tripping remains the highest-uncertainty integration area.

Attachment-version binding, quote validation, excerpts, and project reading
memory are implemented. Scoped library retrieval and experiment-backed evidence
matrices have public-paper acceptance records. Whole-paper reading uses
page prompt version 6 and synthesis version 5; the three-paper scientific
acceptance milestone remains open. Oversized merged units are split by labeled
fields before overview generation rather than discarded by the input budget.
Cross-chunk unit merging now preserves ambiguous many-to-one or one-to-many
source overlaps and flags duplicate item IDs. Unique overlap is a heuristic,
not evidence that units describe the same experiment. A new isolated public
recheck assigned 53/58 AIRWAY items with 14 duplicate IDs and 30/30 MEDIUM
items with nine duplicate IDs. Their scientific review remains open.
Unit grouping now retries up to three omitted-item groups with adjacent context;
terminal grouping failures are recorded separately and keep a run partial even
if overlapping batches assign all item IDs. A fresh AIRWAY isolated recheck
assigned 58/58 items after one retry, with 15 shared IDs still requiring review.
When an overview segment fails, the result now retains its unmerged unit fields
and the other partial summaries without another model merge; page fallback keeps
all summaries. This prevents fallback data loss but does not validate generated
interpretations or resolve the three-paper scientific acceptance.
The controlled public longitudinal memory
evaluation is complete, while a real-user longitudinal trial remains deferred
until actual reading history exists. OCR and Zotero annotation interoperability
remain demand-led extensions.

## Working rules

Preserve historical results. Prefer additive, reversible changes. Keep scientific and product claims tied to inspected artifacts. Treat Zotero metadata, local PDFs, user notes, and model credentials as private. Verify behavior with tests and a real runtime path before calling a feature complete.

## Current memory implementation

The embedded PDF.js reader and shared SQLite reading-memory module persist completed exchanges, restore history, recall explicit scoped memories, and limit total request input. Reader memory controls support correction, deletion, export, and disabling recall. Release 2.0.0 describes the current behavior.

The current uncommitted work adds named project/paper sessions, saved drafts, session exports, and request retry deduplication. Earlier conversations remain available as default history. Real long-term reading and model-answer evaluation remains open; the local implementation is not a released baseline.

Project comparison synthesis now saves its generated draft and separate human revision locally. Each keeps its own paper-number mapping; regenerating does not replace a revision. Model and scientific-content acceptance remain open.

Comparison also reuses matching complete-reading units and retrieves bounded original passages for selected PDFs. Passage citations retain a PDF version and page for local verification; unverified model-generated citation IDs are not clickable. This has been checked with isolated synthetic PDFs and a model stub, not a real-model scientific evaluation.


## 2026-11-11 DONKEY 设计细节复验

DONKEY 原文未说明随机分组，也未明确每日采血；旧单元及概述出现过这两项无来源断言，逐页限制却已提示未报告随机化。分组提示现接收逐页 limitations 作为未经核验线索，整理及概述提示 v9 要求保留分配和采样的不确定性。隔离复用旧逐页结果重跑 5 次请求（22,390 输入/8,427 输出 tokens，含 1 次重试）：25/25 归属、10 个重复来源待审，新单元和概述未再出现这两项断言，并提示未说明随机化；概述仍错把 Fig. 3 引到 EOF。见 `docs/experiments/full-read-three-20261111.md`。一次针对性复验不等于科学验收，旧记录不变。Python 完整回归 230 项通过（既有 SSL socket ResourceWarning）。


## 2026-11-11 概述逐图信息

概述输入现包含单元 figureInterpretation，作为未验证的逐图对应线索；提示避免把单元全部图号附到每条发现。超长单元可能跨字段分段，失败回退保留图表解释，故不保证逐项图表关系。复用 DONKEY v9 单元的 v10 早期提示单次概述（1 次、5,454 输入/1,999 输出 tokens）不再把 Fig. 3 附在 EOF 结果上，却把隔日共三天错写为连续三天，证明科学核验仍是开放问题。复验后仅微调图号保留措辞，未再运行模型；实验与原始输出见 `docs/experiments/full-read-three-20261111.md`。

图表解释传递及回退修改后，完整 `python -m unittest discover` 230 项通过（既有 SSL socket ResourceWarning）；`git diff --check` 通过（CRLF 提示）。


## 2026-11-11 DONKEY 时程与共享来源核对

原论文第 2 页为三次工作、每次四小时、间隔一天；v10 单元输入正确，概述模型输出仍造出连续三天。v11 要求概述各字段保留次数、单次时长与间隔；复用 v9 单元一次请求（5,503 输入/2,027 输出 tokens），时程正确，但遗漏了未说明随机化的局限，argumentMap 使用 35.97 时未同步提 35.07 冲突。单次非盲复验不足以证明准确性。10 个重复来源已做用途核对：多为方法、结果、讨论及综合共享；P4-I2 结论不直接报告 MDA，不应当作 U8 的直接 MDA 证据。另查出“剂量无文献依据”与原文给药处引用不符，伦理批准不等于独立法律结论；详见三篇论文实验记录，科学验收未完成。

## 2026-11-11 概述原文上下文探查

现有概述收到单元字段而非其引用原文。对 DONKEY 的一次非盲探查人工补充七条来源转写，使用 1 次请求、7,178 输入/2,128 输出 tokens；之前配对及剂量文献的两项错误断言未重复，但冲突数值在某一条发现中仍被单独陈述，且未提供图像时输出了图内视觉解读。全部 25 条来源与 12 单元直接放入同一请求的保守估算超出预算。未改生产流程；需设计来源分配及跨段保留，再跨论文验证。详见 `docs/experiments/full-read-three-20261111.md` 和隔离实验脚本及结果；三篇科学验收仍未完成。

## 2026-11-11 来源分批及概述截断

隔离实验将单元与引用来源分批提供给概述模型：DONKEY 三次请求（15,699 输入/6,593 输出 tokens）仍错误断言未使用配对，MEDIUM 四次请求（22,422 输入/8,836 输出）最终归并因输出不完整失败；提高输出预算重试一次（4,846 输入/3,817 输出）返回有效内容。生产概述校验此前静默截短列表和字段，丢掉 MEDIUM 原始响应中的 50/0.6 mM 冲突条目；现保留全部模型响应文字和条目，归并输入预算及失败回退仍生效。旧记录不变。原始模型结论仍未验证，详见 `docs/experiments/full-read-three-20261111.md`。

验证：`python -m unittest discover` 230 项通过（既有 SSL socket ResourceWarning）；`node test_web.js`、隔离脚本语法检查及 `git diff --check` 通过（CRLF 提示）。未重启本地服务。

## 2026-11-11 逐页与单元内容保留

旧逐页校验先将模型转写裁到 5,000 字符再匹配 PDF，超长转写尾部错误可能被掩盖；现对完整转写核验，并保留逐页与单元文本、局限和条目。实验整理接收完整来源与相关上下文，单项超过预算时提示并计入未归属，不静默截断。旧记录不重写或重验。隔离历史响应检查发现 DONKEY v9 三次原始单元响应分别有 14、8、1 条局限超出旧每单元 6 条上限；其中包括无原文依据的统计方法断言，故保留不等于认定为事实。详见三篇实验记录。

验证：`python -m unittest discover` 234 项通过（既有 SSL socket ResourceWarning）；`node test_web.js` 和 `git diff --check` 通过（CRLF 提示）。本地服务未重启。

## 2026-11-11 历史转写兼容

只读检查工作数据库 332 条保存细项，有 1 条旧版转写长度恰为 5,000，存在截断可能但不能仅凭长度断定。新逐页结果标识 `sourceValidationVersion=2`；读取旧记录时仅在内存中将达到旧上限的项标记待核验并提示，停止将其作为已匹配整段转写使用；继续任务会重新分析对应页面。数据库历史不被重写，其他历史遗漏仍无法由长度判定。

位置定位可来自任一锚点或部分转写与页面块相交，不能表述为起止文字均已匹配。界面改为“按部分文字定位”，旧版可能截断项在原文旁单独提示。

## 2026-11-11 MEDIUM 配方抽查

MEDIUM 第 5 页正文的 CDML 12 mM cysteine 与第 6 页 Table 2 的 Cysteine-HCl·H2O 0.145 g/L 存在未解释的计量差异；S1 Fig 只提供两种条件相对十倍、无绝对浓度，不能判定实际配方。来源分批的一次原始回答同时收到正文和表格但未报告差异；其后的合并请求没有表格该数值。合并模型还将原文“影响不大”写成可能暗示统计检验的“不显著影响”；S3 表列出数值与 SEM，不能自行断言统计结果。详见 `docs/experiments/medium-composition-review-20261111.md`；仅作部分原文核查，三篇科学验收仍未完成。

后续抽查 MEDIUM Fig. 2/3：正文和 Fig. 3 图注称共培养添加乙酸钾，Table 3 列乙酸铵；保存的模型合并输出把 Table 3 接到乙酸钾条件上，但另有局限指出表中无乙酸钾，实际条件仍待核对。Fig. 2 实际包含菌株颜色图例，文本合并请求沿用了没有图例的错误中间描述。CFU 比较的主要数量级和 Fig. 3C 对应原文；不能据此声称全篇验收通过。详见同一审查记录。

## 2026-11-11 逐页图像失败处理

逐页图像生成失败或模型拒收图像时，纯文本请求现在明确告知模型没有图像；若也没有可提取正文则该页失败，不再将占位说明放进正文并发送模型。逐页提示版本升至 8，旧结果保留但不用于新版本续读。提示不能保证模型不会编造视觉内容；需核对 PDF。服务未重启，三篇论文科学验收仍未完成。

提示版本升级后，深读界面在无当前版本记录时回退显示同一文献、PDF 版本及语言的最近旧记录，明确标注旧版且不提供续跑；运行中的旧记录仅在响应中显示为中断，不写回数据库。当前版本记录优先，证据矩阵等用途及续跑仍不复用旧版。该改动尚需重启对应服务后生效。

验证：`python -m unittest discover` 238 项通过（既有 SSL socket ResourceWarning）；`node test_web.js` 和 `git diff --check` 通过（CRLF 提示）。没有执行真实模型复验。

2026-11-11: Comparison synthesis copy and download now include the report's paper-number mapping and available passage quotations, using the same Markdown formatter as project-draft export. Web regression and JS syntax checks passed; source quotations and generated conclusions still require review against the paper. The local service was not restarted.

2026-11-11 DONKEY source check: the v9 model calls the EOF normalization wording contradictory, but the printed 0% could refer to NaCl concentration (also shown on figures 1 and 2). The 0.02 µL blood volume is printed in the source and remains unresolved. Both groups underwent packing and sampling times differed; avoid inferring the causal effect of packing from the post-packing group difference alone. The v12 figure-letter inference also exceeds what the caption alone establishes. See docs/experiments/donkey-methods-review-20261111.md; scientific acceptance remains open.

2026-11-11 DONKEY cited-method follow-up: the original Oyewale et al. 2011 PDF p. 461 also prints Blood (0.02 μL) and explicitly includes 0.0% NaCl in six tubes. This strengthens the concentration interpretation but does not prove the DONKEY experiment's actual sample volume or preparation; Oyewale cites an earlier 1992 method not yet verified. Details and source link in docs/experiments/donkey-methods-review-20261111.md.

## 2026-11-11：综述草稿的原文摘录清单

比较结果、项目修订稿、最新生成稿分别展示各自来源快照中保存的全部原文摘录，包含正文未引用的摘录，可使用现有定位入口核对 PDF 版本、页码及原句。清单提示其他输入未列、摘录可能不覆盖全文；full_text 的界面标签改为原文摘录。没有迁移旧数据；没有原文摘录的来源会明确标示。Web 回归、JS 语法及 diff 检查通过；未进行浏览器实测，未重启现有服务。科学准确性仍须原文核对，三篇全文与 P3 科学验收仍开放。

## 2026-11-11：原文定位浏览器复核

浏览器定位复核：隔离服务中旧 DONKEY 记录的 P3-I2 可跳至第 3 页并高亮目标段落；其历史矩形另有 8 个无关细小标记，记录未改写。截图和 DOM 确认的是已渲染页面，尚未证明新矩形规则或慢渲染场景。代码中 `renderedPages` 在异步渲染开始时即设置，可能使重复调用不等待完成；另外两个定位入口使用固定延时，也需要核查文献切换保护。隔离服务已停止，未重启既有服务或调用模型。后续项见 `tasks/todo.md`。

## 2026-11-11：DONKEY EOF 测量范围与图形

复核第 2 页方法和第 3 页图 1–2：EOF 是采集血样在不同 NaCl 浓度下体外孵育后的溶血比例，不能直接作为体内溶血量；驮运后 0.3% NaCl 组间差异不能单独确定驮运的独立效应。v9/v12 的部分驮运引起溶血的概括可能混淆测量对象，作者原文讨论也使用类似语言。v12 从摘要缺失推到无法评估完整曲线的局限可能使读者遗漏全文图 1–2 的多浓度柱状结果；图不能恢复精确原始数据。另区分已使用 200 mg/kg 与是否比较多个剂量。详见 docs/experiments/donkey-methods-review-20261111.md；为定向人工核对，未调用模型，三篇科学验收仍开放。

## 2026-11-11：跨批次阅读单元状态

跨批次唯一重叠归并原先会用后一单元的状态覆盖前一状态。新归并保留不同模型状态到 mergedStatuses，将总体状态设为 unclear；界面提示核对原文，概述首轮及超长单元分片携带状态。汇总提示 v13 提醒状态本身未经核实。旧记录不迁移，唯一重叠不证明单元属于同一实验，后续概述仍可能忽略差异。三篇全文及 P3 科学验收继续开放。

## 2026-11-11：数值冲突审计范围

数值审计候选在概述附近展示保存引文及已有原文定位入口，并提示空结果不证明没有冲突。新审计记录已知含数字但未核验的转写数、失败批次数和被拒候选数；任何失败批次或未核验候选均使审计为 partial，即使相邻重叠批次覆盖了全部细项 ID。缺失转写和未被数字字符筛选识别的数字不计入排除数；旧记录缺少新计数且不改写。审计仍可能遗漏跨批次或截断内容，科学准确性须核对原文。

## 2026-11-11：原文定位与异步渲染

同页渲染共享在途任务；定位等待缩放及实际渲染，并检查文献、加载、渲染和导航代次，两处固定延时定位改为同一路径。页面释放与缩放会取消或使旧任务失效。Web 模拟覆盖慢渲染、文献切换、后续导航、缩放和释放重渲染；隔离 Edge 中公开 DONKEY 旧记录连续放大与定位后，目标段落可见高亮。旧记录仍有之前保存的多余小矩形，新矩形未作浏览器验证。`node test_web.js`、`node --check web/app.js`、`git diff --check` 通过（CRLF 提示）；未重启既有服务或调用模型。三篇和 P3 科学验收仍开放。

隔离浏览器新矩形复核：另建数据库副本并以当前 `_locate` 和公开 DONKEY 原 PDF 的索引重新计算 P3-I2，两个保存副本均由 9 个矩形变为 1 个；Edge 185% 下第 3 页目标正文出现单块高亮，图表上的旧零碎高亮未出现。仅覆盖一条来源，旧生产记录未改写。平滑定位滚动过程中一度可见第 3 页而页码为 2，再次定位显示 3；尚不能判断是否停稳后仍不一致，需复现。隔离服务已停止，无模型调用。

2026-11-11 综合预算裁剪：以前摘录被预算裁剪时，只删除单元的对应来源编号，可能将不完整来源的单元标题作为线索发送；现删除受影响的整个单元线索，保留不受影响的单元与摘录。定向测试使用真实 PDF 和模拟预算条件验证。既有草稿和数据库未修改；科学验收仍未完成。

## 2026-11-11：阅读器页码同步

隔离浏览器复现跳到公开 DONKEY 第 3 页并停稳后页码仍为 2。IntersectionObserver 的 entries 仅包含变化的目标，且旧逻辑使用 400px 扩展区域；现在按实际阅读视口中各页可见高度确定当前页，滚动时按动画帧更新，观察器回调使用同一计算。隔离 Edge 185% 再次跳转第 3 页停稳后页面与页码均为 3；Web 回归覆盖变化条目不含当前页、重复更新与失效观察器。此浏览器验证仅一篇单次跳转，长文档滚动性能及更多页面布局未评估；未调用模型或重启用户服务。

## 2026-11-11 AIRWAY 筛选与复测范围

原文报告转导细胞复测验证 17 个命中（ENZO 10/10、Prestwick 7/15），未转导细胞 CellTiter-Glo 则只涉及 ENZO 命中物 9/9。保存的 v8 U3 将独立验证支持扩大为笼统排除报告体系伪影，并把 Fig. 1 图注作为谈及 Fig. 2A/S2 复测的图表来源；跨页同一图注 P2-I3 未匹配、P3-I2 匹配。筛选条件的部分统计值与原文一致，不能证明全篇准确。详见 `docs/experiments/full-read-three-20261111.md`；没有调用模型或改写历史记录，三篇论文和 P3 科学验收仍未完成。

## 2026-11-11 图表来源展示

深读单元的图表链接现直接显示来源 ID 和转写匹配状态；没有 `sourceVerified` 或其值为 false 时提示未完全核验，单元引用但记录内没有对应细项的图表 ID 会列出而不是静默隐藏。真实关联和模型解读仍需人工查 PDF；旧记录不改写。Web 渲染回归和 JavaScript 语法检查通过，未进行浏览器验收、模型复验或重启既有服务。三篇论文和 P3 科学验收仍未完成。

2026-11-11：全文来源定位优先匹配完整转写跨连续块的范围，减少共用图注结尾误高亮；失败及短文本使用旧回退，不改历史矩形。公开 DONKEY 三条图注各自匹配一个正确块，隔离 Edge 只复核 P3-I3 已呈现页面，148 项 Python 测试通过；重复全文及提取顺序仍有歧义。三篇全文及 P3 科学验收尚未完成。

2026-11-11：数值冲突新候选对所有完整引文逐条核验，并要求至少两个不同来源 ID 与标准化引文组合；无效额外引文拒绝候选、使审计 partial。新审计存 evidenceValidationVersion=2，旧记录提示旧规则且不改写。150 项定向 Python 回归、Web 测试和 JS 语法通过，未真实模型或浏览器复验；引用匹配仍不证明科学冲突，三篇及 P3 验收开放。

2026-11-11：综合和矩阵复用阅读单元时，先核验完整长来源，再分成至多 1800 字符的片段并逐段核验；任一步失败或超出槽位则回滚整条单元线索，后续预算裁剪仍会移除失去来源的单元。分段优先就近句界、其次空白，无可用边界时仍可切开单词。151 项定向 Python 回归通过；两次真实模型隔离复核使用从旧记录合成的当前版本单元，并不证明生产复用旧记录，第二次仍有阈值范围、富集解释和有限摘录泛化问题，P3 未通过科学验收。其他来源仍可能截断；旧结果不改，未重启服务。详见 `docs/experiments/matrix-reserved-sources-audit-20261111.md`。

2026-11-11：新生成的证据矩阵若混合有效与无效来源编号，保留文本与有效引文但降为 `unknown`（待核对），避免静默丢弃无效编号后仍显示有支持或冲突；无有效编号仍为空格。生成值现保存并展示无效引用数及有限数量的编号，导出同样包含，明确其属于生成值而非人工修订。旧结果不重写、旧编号无法找回，此规则不检查引用的语义支持。

2026-11-11：独立数据库的合成矩阵在隔离 Edge 桌面复核，人工修订旁的无效引用提示及中英文显示正常；实际键盘切换空课题再切回时结果按课题变化。仅覆盖一个合成单元格，浏览器下载与真实模型输出未验证；隔离服务已停止。

## 2026-11-12：概述确定性 ledger 与 AIRWAY 两轮验收

完整阅读概述生成后新增确定性 ledger：冲突候选的数值若未同时出现在任一概述字段，追加冲突提示；单元明确引用的 Table S1/S2 等表号若未进入概述，追加表指针提示。`validate_overview` 同时清理“未在输入中”“无法从所给材料核实”、局部“本页缺少图注”、名单截断和“未作为独立条目提供”等输入覆盖或局部排版表述，避免把它们写成论文缺失或主结果。

生产 `PROMPT_VERSION=11` 在隔离目录使用 v8 单元复跑一次（8 请求、48,946 输入/19,543 输出、1 次重试），再与既有 v12 结果分别经当前 validator+ledger 处理。两轮均保留 1,429、27、61、17、ENZO 10/10、Prestwick 7/15、未转导 9/9、3 mg/kg 和 Table S2，且不含输入覆盖或本页图注缺失表述；结果在 `data/fullread-acceptance-20261112-airway-overview-accepted/`。这只验收概述数值、表指针与上述措辞，不替代全部方法条件复核。

DONKEY 的两份独立概述经同一 validator 处理后，也通过必要数值和禁用断言的两轮检查：保留剂量、时程、NaCl 浓度和 EOF 数值，删除输入覆盖、无法评估完整曲线、未校正、未利用配对等超出原文的表述，结果在 `data/fullread-acceptance-20261112-donkey-overview-accepted/`。这是概述层验收；来源细项中的统计方法、配对结构和归一化措辞仍按人工阅读处理，不把历史模型断言升级为事实。

MEDIUM 的冲突提示加严复验未采用：漏掉已知 cysteine/acetate/盐型冲突，并新增 K2SO4/Na2SO4 与 fructose 条件疑似误报。Python 全量回归 272 项、Web/翻译/JS 语法和 launcher 9 条路径通过。受控公开论文纵向记忆证据仍在 `docs/experiments/memory-round-05-public-longitudinal.md`；真实用户长期历史尚不存在。

后续确定性验收接续了 MEDIUM 和 P3。MEDIUM 的 `formulation_conflicts()` 从 30 个来源细项识别出 CDML cysteine `12 mM` / `0.145 g/L` 与 CDMA lactate `0.6 mM` / `50 mM`，两份既有概述经 validator+ledger 处理后均保留冲突双方和禁用措辞检查通过，结果在 `data/fullread-acceptance-20261112-medium-overview-accepted/`。P3 的 `normalize_synthesis()` 对两份已保存综合稿移除无输入引文的 TOPFlash 名称、把富集层面的 activation 措辞降级为原文描述，并把有限摘录中的全文否定限定为“所给材料未见”；两轮检查均保留必要引用和 `3 mg/kg`、`150`、`P2E4`，结果在 `data/matrix-acceptance-20261112-p3-synthesis-accepted/`。两者均为概述/综合层确定性检查，不替代全篇逐句阅读。

同日的 `experiments/memory/user_simulation_20261112.py` 使用临时数据库、合成论文和模型桩走完一次读者流程：保存课题目标、表达偏好和待核验判断，首问与追问，关闭记忆后提问，同槽修订，历史召回，课题隔离，重启恢复，导出、删除对话和遗忘偏好。16 项检查全部通过，结果在 `data/memory-user-simulation-20261112/result.json`；流程说明在 `docs/experiments/memory-user-simulation-20261112.md`。当前 Web reader 只保存用户确认的记忆，不把模型回答自动提升为记忆；来源关联和论文范围是后端能力，不是现有 UI 的默认保存方式。该模拟不代替真实用户的长期使用证据。
