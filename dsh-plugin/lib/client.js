window.__ModuleLoader__.load({
  id: "dsh-scholarloom",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");
    const h = React.createElement;
    const { useState, useEffect, useMemo, useRef, useCallback } = React;

    const PANEL_ID = "scholarloom";
    const STORE_KEY = "dsh-scholarloom:v1";
    const EMPTY_LIBRARY = {
      connected: false,
      baseUrl: "http://127.0.0.1:8766",
      stats: { total: 0, unread: 0, reading: 0, read: 0, withPDF: 0, review: 0, categories: [] },
      presets: [],
      jobs: [],
      health: {},
      documents: [],
    };

    /* ── tiny utilities ─────────────────────────────────────────────── */

    function cx(...values) {
      return values.filter(Boolean).join(" ");
    }

    function apiGet(pathname) {
      return fetch(`/scholarloom${pathname}`, {
        headers: { accept: "application/json" },
        cache: "no-store",
      }).then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          const error = new Error((data && data.error) || `HTTP ${response.status}`);
          error.status = response.status;
          error.data = data;
          throw error;
        }
        return data;
      });
    }

    function apiPost(pathname, body) {
      return fetch(`/scholarloom${pathname}`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-scholarloom-client": "web" },
        body: JSON.stringify(body || {}),
      }).then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          const error = new Error((data && data.error) || `HTTP ${response.status}`);
          error.status = response.status;
          error.data = data;
          throw error;
        }
        return data;
      });
    }

    function stored(key, initial) {
      try {
        const raw = window.localStorage.getItem(`${STORE_KEY}:${key}`);
        if (raw == null) return initial;
        return JSON.parse(raw);
      } catch {
        return initial;
      }
    }

    function useStored(key, initial) {
      const [value, setValue] = useState(() => stored(key, initial));
      useEffect(() => {
        try {
          window.localStorage.setItem(`${STORE_KEY}:${key}`, JSON.stringify(value));
        } catch {
          /* storage unavailable */
        }
      }, [key, value]);
      return [value, setValue];
    }

    function dateLabel(timestamp) {
      const value = Number(timestamp);
      if (!value) return "";
      const date = new Date(value * 1000);
      if (Number.isNaN(date.getTime())) return "";
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }

    function firstAuthor(authors) {
      const value = String(authors || "").trim();
      if (!value) return "";
      const first = value.split(/[;；]/)[0].trim();
      const many = value.split(/[;；]/).length > 1;
      return many ? `${first} 等` : first;
    }

    function statusText(status) {
      return status === "read" ? "已读" : status === "reading" ? "在读" : "未读";
    }

    function statusTone(status) {
      return status === "read" ? "is-read" : status === "reading" ? "is-reading" : "is-unread";
    }

    function splitTitle(doc) {
      const zh = String(doc.zhTitle || "").trim();
      const en = String(doc.title || "").trim();
      if (zh && en && zh !== en) return { main: zh, sub: en };
      return { main: zh || en || "未命名文献", sub: "" };
    }

    function prefersNarrow(breakpoint) {
      return typeof window !== "undefined" && window.matchMedia(`(max-width: ${breakpoint}px)`).matches;
    }

    function useNarrow(breakpoint) {
      const query = `(max-width: ${breakpoint}px)`;
      const [narrow, setNarrow] = useState(() => (typeof window === "undefined" ? false : window.matchMedia(query).matches));
      useEffect(() => {
        const media = window.matchMedia(query);
        const onChange = () => setNarrow(media.matches);
        onChange();
        media.addEventListener("change", onChange);
        return () => media.removeEventListener("change", onChange);
      }, [query]);
      return narrow;
    }

    function useElementWidth(ref) {
      const [width, setWidth] = useState(0);
      useEffect(() => {
        const node = ref.current;
        if (!node) return undefined;
        const measure = () => {
          const next = node.getBoundingClientRect().width;
          setWidth((previous) => (Math.abs(next - previous) >= 1 ? next : previous));
        };
        measure();
        let frame = 0;
        const observer = new ResizeObserver(() => {
          if (frame) return;
          frame = window.requestAnimationFrame(() => {
            frame = 0;
            measure();
          });
        });
        observer.observe(node);
        return () => {
          if (frame) window.cancelAnimationFrame(frame);
          observer.disconnect();
        };
      }, [ref]);
      return width;
    }

    function copyText(value) {
      const raw = String(value || "");
      if (!raw) return Promise.resolve(false);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(raw).then(() => true, () => false);
      }
      try {
        const area = document.createElement("textarea");
        area.value = raw;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand("copy");
        area.remove();
        return Promise.resolve(ok);
      } catch {
        return Promise.resolve(false);
      }
    }

    function citationOf(doc) {
      const authors = String(doc.authors || "").trim() || "佚名";
      const year = String(doc.year || "").trim() || "n.d.";
      const title = String(doc.title || doc.zhTitle || "").trim();
      const source = String(doc.source || "").trim();
      const identifier = String(doc.identifier || "").trim();
      return [authors, `(${year}).`, `${title}.`, source ? `${source}.` : "", identifier ? identifier : ""]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
    }

    /* ── icons ──────────────────────────────────────────────────────── */

    function Icon({ name, size = 16, className }) {
      const paths = ICONS[name] || [];
      return h(
        "svg",
        {
          width: size,
          height: size,
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 1.7,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          className,
          "aria-hidden": "true",
          focusable: "false",
        },
        paths.map((d, index) => h("path", { key: index, d })),
      );
    }

    const ICONS = {
      search: ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z", "M21 21l-4.35-4.35"],
      refresh: ["M21 12a9 9 0 1 1-2.64-6.36", "M21 3v6h-6"],
      external: ["M14 4h6v6", "M20 4l-9 9", "M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"],
      close: ["M6 6l12 12", "M18 6L6 18"],
      book: ["M4 19.5A2.5 2.5 0 0 1 6.5 17H20", "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"],
      file: ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", "M14 2v6h6", "M9 13h6", "M9 17h4"],
      chat: ["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"],
      layers: ["M12 2l9 5-9 5-9-5 9-5z", "M3 12l9 5 9-5", "M3 17l9 5 9-5"],
      note: ["M4 4h11l5 5v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z", "M14 4v6h6", "M8 13h8", "M8 17h5"],
      send: ["M22 2L11 13", "M22 2l-7 20-4-9-9-4 20-7z"],
      chevron: ["M9 18l6-6-6-6"],
      check: ["M20 6L9 17l-5-5"],
      warning: ["M12 3l9 16H3l9-16z", "M12 9v5", "M12 17h.01"],
      spark: ["M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"],
      panel: ["M4 4h16v16H4z", "M9 4v16"],
      plus: ["M12 5v14", "M5 12h14"],
    };

    function PanelIcon({ size = 20, active }) {
      return h(Icon, { name: "book", size, className: cx("sl-panel-icon", active && "is-active") });
    }

    /* ── shared pieces ──────────────────────────────────────────────── */

    function Badge({ children, tone }) {
      return h("span", { className: cx("sl-badge", tone && `sl-badge-${tone}`) }, children);
    }

    function IconButton({ icon, label, onClick, disabled, active }) {
      return h(
        "button",
        {
          type: "button",
          className: cx("sl-iconbtn", active && "is-active"),
          title: label,
          "aria-label": label,
          onClick,
          disabled,
        },
        h(Icon, { name: icon, size: 16 }),
      );
    }

    function EmptyState({ icon, title, children }) {
      return h(
        "div",
        { className: "sl-empty" },
        h("div", { className: "sl-empty-icon" }, h(Icon, { name: icon, size: 26 })),
        h("div", { className: "sl-empty-title" }, title),
        children ? h("div", { className: "sl-empty-body" }, children) : null,
      );
    }

    function Section({ title, icon, children, aside }) {
      return h(
        "section",
        { className: "sl-section" },
        h(
          "div",
          { className: "sl-section-head" },
          h("div", { className: "sl-section-title" }, icon ? h(Icon, { name: icon, size: 15 }) : null, h("span", null, title)),
          aside || null,
        ),
        h("div", { className: "sl-section-body" }, children),
      );
    }

    function Spinner({ label }) {
      return h(
        "div",
        { className: "sl-spinner", role: "status" },
        h("span", { className: "sl-spinner-dot" }),
        label ? h("span", null, label) : null,
      );
    }

    /* ── library column ─────────────────────────────────────────────── */

    function LibraryColumn({ library, query, setQuery, status, setStatus, category, setCategory, selectedKey, onSelect, loading, onRefresh, open, onClose, drawer }) {
      const documents = library.documents || [];
      const stats = library.stats || EMPTY_LIBRARY.stats;
      const categories = stats.categories || [];
      const filtered = useMemo(() => {
        const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
        return documents
          .filter((doc) => {
            if (status !== "all" && (doc.readingStatus || "unread") !== status) return false;
            if (category !== "all" && doc.category !== category) return false;
            if (!terms.length) return true;
            const haystack = [doc.title, doc.zhTitle, doc.authors, doc.identifier, doc.category, doc.studyType, doc.source, doc.oneSentence, ...(doc.keywords || [])]
              .filter(Boolean)
              .join("\n")
              .toLowerCase();
            return terms.every((term) => haystack.includes(term));
          })
          .sort((a, b) => (Number(b.addedAt) || 0) - (Number(a.addedAt) || 0));
      }, [documents, query, status, category]);

      return h(
        "aside",
        { className: cx("sl-library", drawer && "is-drawer"), "data-open": open ? "true" : "false" },
        h(
          "div",
          { className: "sl-lib-head" },
          h(
            "div",
            { className: "sl-lib-title-row" },
            h("div", { className: "sl-lib-title" }, h(Icon, { name: "book", size: 16 }), h("span", null, "文库"), h("span", { className: "sl-count" }, stats.total || 0)),
            h("div", { className: "sl-lib-actions" }, h(IconButton, { icon: "refresh", label: "刷新文库", onClick: onRefresh, disabled: loading }), drawer ? h("button", { type: "button", className: "sl-iconbtn", title: "关闭文库", onClick: onClose }, h(Icon, { name: "close", size: 16 })) : null),
          ),
          h(
            "div",
            { className: "sl-search" },
            h(Icon, { name: "search", size: 15, className: "sl-search-icon" }),
            h("input", {
              value: query,
              onChange: (event) => setQuery(event.target.value),
              placeholder: "搜索标题、作者、DOI、关键词",
              "aria-label": "搜索文献",
              spellCheck: false,
            }),
            query ? h("button", { type: "button", className: "sl-search-clear", title: "清除", onClick: () => setQuery("") }, h(Icon, { name: "close", size: 12 })) : null,
          ),
          h(
            "div",
            { className: "sl-statuses", role: "tablist", "aria-label": "阅读状态" },
            [
              ["all", "全部", stats.total],
              ["unread", "未读", stats.unread],
              ["reading", "在读", stats.reading],
              ["read", "已读", stats.read],
            ].map(([value, label, count]) =>
              h(
                "button",
                {
                  key: value,
                  type: "button",
                  role: "tab",
                  "aria-selected": status === value,
                  className: cx("sl-status-tab", status === value && "is-active"),
                  onClick: () => setStatus(value),
                },
                label,
                h("span", { className: "sl-status-count" }, count || 0),
              ),
            ),
          ),
          categories.length > 1
            ? h(
                "select",
                { className: "sl-select", value: category, onChange: (event) => setCategory(event.target.value), "aria-label": "按分类筛选" },
                h("option", { value: "all" }, `全部分类（${categories.length}）`),
                categories.map((item) => h("option", { key: item.name, value: item.name }, `${item.name}（${item.count}）`)),
              )
            : null,
        ),
        h(
          "div",
          { className: "sl-lib-list", role: "listbox", "aria-label": "文献列表" },
          loading && !documents.length
            ? h("div", { className: "sl-lib-loading" }, h(Spinner, { label: "正在读取 ScholarLoom 文库…" }))
            : filtered.length === 0
              ? h(EmptyState, {
                  icon: "search",
                  title: documents.length ? "没有匹配的文献" : "文库还是空的",
                  children: documents.length
                    ? h(
                        React.Fragment,
                        null,
                        h("span", null, "换一个关键词，或清除筛选。"),
                        h("button", { type: "button", className: "sl-btn", style: { marginTop: "8px" }, onClick: () => { setQuery(""); setStatus("all"); setCategory("all"); } }, "清除筛选"),
                      )
                    : "先在 ScholarLoom 中扫描并确认入藏文献。",
                })
              : filtered.map((doc) =>
                  h(
                    "button",
                    {
                      key: doc.key,
                      type: "button",
                      role: "option",
                      "aria-selected": selectedKey === doc.key,
                      className: cx("sl-item", selectedKey === doc.key && "is-selected"),
                      onClick: () => onSelect(doc),
                      title: doc.title || doc.zhTitle,
                    },
                    h(
                      "div",
                      { className: "sl-item-top" },
                      h("span", { className: cx("sl-dot", statusTone(doc.readingStatus)) }),
                      h("span", { className: "sl-item-title" }, splitTitle(doc).main),
                      doc.hasPDF ? h("span", { className: "sl-mini-tag" }, "PDF") : null,
                    ),
                    h(
                      "div",
                      { className: "sl-item-meta" },
                      [firstAuthor(doc.authors), doc.year, doc.source].filter(Boolean).join(" · ") || "未登记来源",
                    ),
                    h(
                      "div",
                      { className: "sl-item-foot" },
                      doc.category ? h("span", { className: "sl-item-cat" }, doc.category) : null,
                      doc.studyType ? h("span", { className: "sl-item-type" }, doc.studyType) : null,
                      h("span", { className: "sl-item-status" }, statusText(doc.readingStatus)),
                    ),
                  ),
                ),
        ),
        (library.jobs || []).length
          ? h(
              "div",
              { className: "sl-review" },
              h(Icon, { name: "warning", size: 14 }),
              h("span", null, `${library.jobs.length} 条入藏待核对`),
            )
          : null,
      );
    }

    /* ── document header ────────────────────────────────────────────── */

    function DocHeader({ doc, onStatus, onCopy, onOpenExternal, onOpenChat, chatActive, focusPdf, onToggleFocus }) {
      const title = splitTitle(doc);
      return h(
        "header",
        { className: "sl-doc-head" },
        h(
          "div",
          { className: "sl-doc-title-row" },
          h(
            "div",
            { className: "sl-doc-titles" },
            h("h1", { className: "sl-doc-title", title: title.main }, title.main),
            title.sub ? h("div", { className: "sl-doc-subtitle", title: title.sub }, title.sub) : null,
          ),
          h(
            "div",
            { className: "sl-doc-actions" },
            h(IconButton, { icon: "panel", label: focusPdf ? "显示解读" : "专注原文", onClick: onToggleFocus, active: focusPdf }),
            h(IconButton, { icon: "chat", label: "证据问答", onClick: onOpenChat, active: chatActive }),
            h(IconButton, { icon: "external", label: "在新标签页打开 PDF", onClick: onOpenExternal, disabled: !doc.hasPDF }),
          ),
        ),
        h(
          "div",
          { className: "sl-doc-meta" },
          h("span", null, [firstAuthor(doc.authors), doc.year, doc.source].filter(Boolean).join(" · ") || "未登记来源"),
          doc.identifier ? h("span", { className: "sl-doc-doi" }, doc.identifier) : null,
          doc.category ? h(Badge, null, doc.category) : null,
          doc.studyType ? h(Badge, { tone: "muted" }, doc.studyType) : null,
        ),
        h(
          "div",
          { className: "sl-doc-toolbar" },
          h("div", { className: "sl-doc-context" }, h(Icon, { name: "panel", size: 14 }), h("span", null, "原文与解读并排")),
          h(
            "div",
            { className: "sl-doc-tools" },
            h(
              "div",
              { className: "sl-segmented", role: "group", "aria-label": "阅读状态" },
              ["unread", "reading", "read"].map((value) =>
                h(
                  "button",
                  {
                    key: value,
                    type: "button",
                    className: cx("sl-seg", (doc.readingStatus || "unread") === value && "is-active"),
                    onClick: () => onStatus(value),
                  },
                  statusText(value),
                ),
              ),
            ),
            h(
              "button",
              { type: "button", className: "sl-btn sl-btn-ghost", onClick: onCopy, title: "复制参考文献条目" },
              h(Icon, { name: "note", size: 14 }),
              h("span", null, "复制引用"),
            ),
          ),
        ),
      );
    }

    /* ── overview tab ───────────────────────────────────────────────── */

    function Paragraphs({ value, className }) {
      const raw = String(value || "").trim();
      if (!raw) return null;
      return h(
        "div",
        { className: cx("sl-prose", className) },
        raw.split(/\n{2,}/).map((block, index) => h("p", { key: index }, block)),
      );
    }

    function BulletList({ items, ordered }) {
      if (!Array.isArray(items) || items.length === 0) return null;
      const Tag = ordered ? "ol" : "ul";
      return h(
        Tag,
        { className: cx("sl-list", ordered && "is-ordered") },
        items.map((item, index) => h("li", { key: index }, String(item))),
      );
    }

    function OverviewTab({ doc, onOpenChat }) {
      return h(
        "div",
        { className: "sl-overview" },
        doc.oneSentence
          ? h(
              "div",
              { className: "sl-quote" },
              h("div", { className: "sl-quote-label" }, h(Icon, { name: "spark", size: 14 }), "一句话"),
              h("p", null, doc.oneSentence),
            )
          : null,
        h(
          "div",
          { className: "sl-grid-2" },
          doc.question ? h(Section, { title: "研究问题", icon: "search" }, h(Paragraphs, { value: doc.question })) : null,
          doc.method ? h(Section, { title: "方法与设计", icon: "layers" }, h(Paragraphs, { value: doc.method })) : null,
        ),
        doc.findings && doc.findings.length ? h(Section, { title: "主要发现", icon: "check" }, h(BulletList, { items: doc.findings, ordered: true })) : null,
        doc.limitations ? h(Section, { title: "局限与边界", icon: "warning" }, h(Paragraphs, { value: doc.limitations })) : null,
        doc.useCase ? h(Section, { title: "适用场景", icon: "book" }, h(Paragraphs, { value: doc.useCase })) : null,
        doc.keywords && doc.keywords.length
          ? h(
              "div",
              { className: "sl-keywords" },
              doc.keywords.map((keyword) => h("span", { key: keyword, className: "sl-keyword" }, keyword)),
            )
          : null,
        h(
          "button",
          { type: "button", className: "sl-cta", onClick: onOpenChat },
          h(Icon, { name: "chat", size: 16 }),
          h("span", null, "打开证据问答，针对这篇论文提问"),
        ),
        h(
          "div",
          { className: "sl-hintline" },
          h(Icon, { name: "warning", size: 13 }),
          h("span", null, "阅读卡是 ScholarLoom 的模型解读，引用定位仍需回到原文核对。"),
        ),
      );
    }

    /* ── full text tab ──────────────────────────────────────────────── */

    let pdfjsPromise = null;

    function loadPdfjs() {
      if (!pdfjsPromise) {
        pdfjsPromise = import("/scholarloom/vendor/pdfjs/pdf.min.mjs").then((lib) => {
          lib.GlobalWorkerOptions.workerSrc = "/scholarloom/vendor/pdfjs/pdf.worker.min.mjs";
          return lib;
        });
      }
      return pdfjsPromise;
    }

    function PdfContinuous({ doc, page, fitKey, jumpKey, target, onPageCount, onOpenExternal, flash, onPageChange }) {
      const wrapRef = useRef(null);
      const pagesRef = useRef([]);
      const pdfRef = useRef(null);
      const libRef = useRef(null);
      const sizesRef = useRef([]);
      const renderedRef = useRef(new Set());
      const tasksRef = useRef(new Map());
      const scrollDrivenRef = useRef(null);
      const [width, setWidth] = useState(0);
      const [pageSizes, setPageSizes] = useState([]);
      const [ready, setReady] = useState(false);
      const [error, setError] = useState("");

      useEffect(() => {
        const node = wrapRef.current;
        if (!node) return undefined;
        const measure = () => {
          const next = node.clientWidth;
          setWidth((previous) => (Math.abs(next - previous) >= 1 ? next : previous));
        };
        measure();
        let frame = 0;
        const observer = new ResizeObserver(() => {
          if (frame) return;
          frame = window.requestAnimationFrame(() => {
            frame = 0;
            measure();
          });
        });
        observer.observe(node);
        return () => {
          if (frame) window.cancelAnimationFrame(frame);
          observer.disconnect();
        };
      }, []);

      useEffect(() => {
        let cancelled = false;
        setReady(false);
        setError("");
        setPageSizes([]);
        sizesRef.current = [];
        renderedRef.current.clear();
        tasksRef.current.forEach((task) => {
          try {
            task.cancel();
          } catch {
            /* already finished */
          }
        });
        tasksRef.current.clear();
        loadPdfjs()
          .then(async (lib) => {
            const pdf = await lib.getDocument({
              url: `/scholarloom/pdf/${encodeURIComponent(doc.key)}`,
              cMapUrl: "/scholarloom/vendor/pdfjs/cmaps/",
              cMapPacked: true,
              isEvalSupported: false,
            }).promise;
            if (cancelled) {
              pdf.destroy().catch(() => {});
              return;
            }
            pdfRef.current = pdf;
            libRef.current = lib;
            const sizes = [];
            for (let number = 1; number <= pdf.numPages; number += 1) {
              const pdfPage = await pdf.getPage(number);
              const viewport = pdfPage.getViewport({ scale: 1 });
              sizes.push({ width: viewport.width, height: viewport.height });
              try {
                pdfPage.cleanup();
              } catch {
                /* best effort */
              }
              if (cancelled) return;
            }
            sizesRef.current = sizes;
            setPageSizes(sizes);
            onPageCount(pdf.numPages);
            setReady(true);
          })
          .catch((err) => {
            if (!cancelled) setError(err && err.message ? err.message : "PDF 加载失败。");
          });
        return () => {
          cancelled = true;
          tasksRef.current.forEach((task) => {
            try {
              task.cancel();
            } catch {
              /* already finished */
            }
          });
          tasksRef.current.clear();
          renderedRef.current.clear();
          if (pdfRef.current) {
            pdfRef.current.destroy().catch(() => {});
            pdfRef.current = null;
          }
        };
      }, [doc.key]);

      const renderPage = useCallback(
        async (number) => {
          const pdf = pdfRef.current;
          const lib = libRef.current;
          const size = sizesRef.current[number - 1];
          const element = pagesRef.current[number - 1];
          if (!pdf || !lib || !size || !element || !width || renderedRef.current.has(number)) return;
          renderedRef.current.add(number);
          try {
            const pdfPage = await pdf.getPage(number);
            const scale = Math.max(0.12, (width - 24) / size.width);
            const viewport = pdfPage.getViewport({ scale });
            const canvas = element.querySelector("canvas");
            const textLayer = element.querySelector(".textLayer");
            if (!canvas || !textLayer) return;
            // Cap the backing store: a page with an extreme aspect ratio or a
            // high-DPI display can otherwise ask Skia for a canvas far past
            // Chromium's texture limit, which kills the whole renderer.
            const MAX_CANVAS_PIXELS = 6 * 1024 * 1024;
            const area = Math.max(1, viewport.width * viewport.height);
            const dpr = Math.max(
              0.5,
              Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(MAX_CANVAS_PIXELS / area)),
            );
            canvas.width = Math.max(1, Math.floor(viewport.width * dpr));
            canvas.height = Math.max(1, Math.floor(viewport.height * dpr));
            canvas.style.width = `${Math.floor(viewport.width)}px`;
            canvas.style.height = `${Math.floor(viewport.height)}px`;
            const context = canvas.getContext("2d", { alpha: false });
            if (!context) throw new Error("浏览器无法为该 PDF 页面分配画布。");
            const previous = tasksRef.current.get(number);
            if (previous) {
              try {
                previous.cancel();
              } catch {
                /* already finished */
              }
            }
            const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null;
            const task = pdfPage.render({ canvasContext: context, viewport, transform });
            tasksRef.current.set(number, task);
            await task.promise;
            tasksRef.current.delete(number);
            if (!renderedRef.current.has(number)) return;
            element.style.setProperty("--scale-factor", String(scale));
            element.style.setProperty("--total-scale-factor", String(scale));
            element.style.setProperty("--scale-round-x", "1px");
            element.style.setProperty("--scale-round-y", "1px");
            if (lib.TextLayer) {
              textLayer.innerHTML = "";
              textLayer.style.width = `${Math.floor(viewport.width)}px`;
              textLayer.style.height = `${Math.floor(viewport.height)}px`;
              const textContent = await pdfPage.getTextContent();
              const layer = new lib.TextLayer({
                textContentSource: textContent,
                container: textLayer,
                viewport,
              });
              await layer.render();
            }
            try {
              pdfPage.cleanup();
            } catch {
              /* best effort */
            }
          } catch (err) {
            renderedRef.current.delete(number);
            if (err && err.name !== "RenderingCancelledException") {
              setError(err && err.message ? err.message : "PDF 页面渲染失败。");
            }
          }
        },
        [width],
      );

      useEffect(() => {
        if (!ready) return undefined;
        renderedRef.current.clear();
        tasksRef.current.forEach((task) => {
          try {
            task.cancel();
          } catch {
            /* already finished */
          }
        });
        tasksRef.current.clear();
        pagesRef.current.forEach((element) => {
          if (!element) return;
          const canvas = element.querySelector("canvas");
          const textLayer = element.querySelector(".textLayer");
          if (canvas) {
            canvas.width = 0;
            canvas.height = 0;
          }
          if (textLayer) textLayer.innerHTML = "";
        });
        renderPage(1);
        const wrap = wrapRef.current;
        if (!wrap) return undefined;
        const observer = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              const number = Number(entry.target.dataset.page);
              if (entry.isIntersecting) renderPage(number);
              else releasePage(number);
            }
          },
          { root: wrap, rootMargin: "250px 0px" },
        );
        pagesRef.current.forEach((element) => {
          if (element) observer.observe(element);
        });
        return () => observer.disconnect();
      }, [ready, width, fitKey, renderPage]);

      function releasePage(number) {
        const task = tasksRef.current.get(number);
        if (task) {
          try {
            task.cancel();
          } catch {
            /* already finished */
          }
          tasksRef.current.delete(number);
        }
        renderedRef.current.delete(number);
        const element = pagesRef.current[number - 1];
        if (!element) return;
        const canvas = element.querySelector("canvas");
        if (canvas) {
          canvas.width = 0;
          canvas.height = 0;
        }
        const textLayer = element.querySelector(".textLayer");
        if (textLayer) textLayer.innerHTML = "";
        const highlight = element.querySelector(".sl-pdf-highlight");
        if (highlight) highlight.remove();
      }

      function showHighlight(pageNumber, rects) {
        const element = pagesRef.current[pageNumber - 1];
        if (!element) return;
        const previous = element.querySelector(".sl-pdf-highlight");
        if (previous) previous.remove();
        const layer = document.createElement("div");
        layer.className = "sl-pdf-highlight";
        rects.slice(0, 24).forEach((rect) => {
          const mark = document.createElement("span");
          mark.style.left = `${(Number(rect.x) || 0) * 100}%`;
          mark.style.top = `${(Number(rect.y) || 0) * 100}%`;
          mark.style.width = `${(Number(rect.width) || 0) * 100}%`;
          mark.style.height = `${(Number(rect.height) || 0) * 100}%`;
          layer.appendChild(mark);
        });
        element.appendChild(layer);
        window.setTimeout(() => layer.remove(), 6500);
      }

      useEffect(() => {
        if (!ready) return undefined;
        if (scrollDrivenRef.current === page) {
          scrollDrivenRef.current = null;
          return undefined;
        }
        const element = pagesRef.current[page - 1];
        const wrap = wrapRef.current;
        if (!element || !wrap) return undefined;
        renderPage(page);
        const rects = target && target.page === page && Array.isArray(target.rects) ? target.rects : [];
        const first = rects[0];
        const offset = first ? (Number(first.y) || 0) * element.offsetHeight : 0;
        wrap.scrollTo({ top: Math.max(0, element.offsetTop + offset - 80), behavior: "auto" });
        if (rects.length) showHighlight(page, rects);
        return undefined;
      }, [ready, page, jumpKey, target, renderPage]);

      useEffect(() => {
        const wrap = wrapRef.current;
        if (!wrap || !ready) return undefined;
        const onScroll = () => {
          let current = 1;
          const top = wrap.scrollTop + 40;
          pagesRef.current.forEach((element, index) => {
            if (element && element.offsetTop <= top) current = index + 1;
          });
          if (current !== page) {
            scrollDrivenRef.current = current;
            onPageChange(current);
          }
        };
        wrap.addEventListener("scroll", onScroll, { passive: true });
        return () => wrap.removeEventListener("scroll", onScroll);
      }, [ready, page, onPageChange]);

      return h(
        "div",
        { className: cx("sl-pdf-wrap", flash && "is-flash"), ref: wrapRef },
        error
          ? h(
              "div",
              { className: "sl-pdf-error" },
              h(Icon, { name: "warning", size: 20 }),
              h("p", null, error),
              h("button", { type: "button", className: "sl-pdf-open", onClick: onOpenExternal }, "在系统浏览器打开 PDF"),
            )
          : null,
        pageSizes.length
          ? h(
              "div",
              { className: "sl-pdf-pages" },
              pageSizes.map((size, index) => {
                const scale = width > 24 ? (width - 24) / size.width : 1;
                const pageWidth = Math.floor(size.width * scale);
                const pageHeight = Math.floor(size.height * scale);
                return h(
                  "div",
                  {
                    key: index,
                    className: "sl-pdf-page",
                    "data-page": index + 1,
                    style: { width: `${pageWidth}px`, height: `${pageHeight}px` },
                    ref: (element) => {
                      pagesRef.current[index] = element;
                    },
                  },
                  h("canvas", { className: "sl-pdf-canvas" }),
                  h("div", { className: "textLayer" }),
                );
              }),
            )
          : null,
        !ready && !error ? h(Spinner, { label: "正在加载 PDF…" }) : null,
      );
    }

    function FullTextTab({ doc, page, setPage, jumpKey, target, onOpenExternal }) {
      const [pageCount, setPageCount] = useState(0);
      const [fitKey, setFitKey] = useState(0);
      const [flashing, setFlashing] = useState(false);
      useEffect(() => {
        if (!jumpKey) return undefined;
        setFlashing(true);
        const timer = window.setTimeout(() => setFlashing(false), 650);
        return () => window.clearTimeout(timer);
      }, [jumpKey]);
      if (!doc.hasPDF) {
        return h(
          "div",
          { className: "sl-fulltext sl-pdf-empty" },
          h(EmptyState, { icon: "file", title: "这篇文献没有本地 PDF", children: "在 ScholarLoom 中补充全文附件后即可在这里阅读。" }),
        );
      }
      const go = (next) => {
        const max = pageCount || Number(next) || 1;
        setPage(Math.min(Math.max(1, Number(next) || 1), max));
      };
      return h(
        "div",
        { className: "sl-fulltext" },
        h(
          "div",
          { className: "sl-fulltext-bar" },
          h("span", { className: "sl-fulltext-label" }, h(Icon, { name: "file", size: 14 }), "PDF 全文"),
          h(
            "div",
            { className: "sl-page-nav" },
            h("button", { type: "button", className: "sl-btn sl-btn-ghost", onClick: () => go(page - 1) }, "上一页"),
            h("input", {
              type: "number",
              min: 1,
              max: pageCount || undefined,
              value: page,
              onChange: (event) => go(event.target.value),
              "aria-label": "页码",
            }),
            h("span", { className: "sl-page-total" }, pageCount ? `/ ${pageCount}` : "/ ?"),
            h("button", { type: "button", className: "sl-btn sl-btn-ghost", onClick: () => go(page + 1), disabled: pageCount > 0 && page >= pageCount }, "下一页"),
          ),
          h("button", { type: "button", className: "sl-btn sl-btn-ghost", onClick: () => setFitKey((value) => value + 1) }, "适合宽度"),
          h(
            "button",
            { type: "button", className: "sl-btn sl-btn-ghost", onClick: onOpenExternal },
            h(Icon, { name: "external", size: 14 }),
            "新标签页",
          ),
        ),
        h(PdfContinuous, { doc, page, fitKey, jumpKey, target, onPageCount: setPageCount, onOpenExternal, flash: flashing, onPageChange: setPage }),
      );
    }

    /* ── deep read tab ──────────────────────────────────────────────── */

    const UNIT_TYPES = { experiment: "实验", background: "背景", methods: "方法", synthesis: "综合" };
    const UNIT_STATUS = {
      author_stated: "作者陈述",
      reported_result: "报告结果",
      inferred: "推断",
      model_inference: "模型推断",
      mixed: "混合",
      partial: "部分",
      not_reported: "未报告",
      under_review: "待核对",
      unknown: "待核对",
      verified: "已核验",
    };

    function SourceItem({ source, onCite }) {
      const kind = { paragraph: "正文", figure: "图", table: "表", caption: "图注" }[source.kind] || source.kind || "正文";
      return h(
        "article",
        { className: "sl-src" },
        h(
          "div",
          { className: "sl-src-head" },
          h("span", { className: "sl-src-page" }, source.page ? `p.${source.page}` : "无页码"),
          h("span", { className: "sl-src-id" }, source.id),
          h("span", { className: "sl-src-kind" }, kind),
          source.page
            ? h("button", { type: "button", className: "sl-src-jump", onClick: () => onCite(source.page, source.rects) }, "跳到原文")
            : null,
        ),
        h("div", { className: "sl-src-title" }, source.heading),
        h(
          "div",
          { className: "sl-src-original" },
          h("div", { className: "sl-src-label" }, "原文"),
          source.sourceText ? h("blockquote", { className: "sl-src-quote" }, source.sourceText) : h("p", { className: "sl-src-empty" }, "这条来源只有页码，没有可用的原文转写。"),
        ),
        h(
          "div",
          { className: "sl-src-reading" },
          h("div", { className: "sl-src-label" }, "模型解读（待核对）"),
          source.summary ? h("p", { className: "sl-src-line" }, h("strong", null, "摘要 "), source.summary) : null,
          source.analysis ? h("p", { className: "sl-src-line" }, h("strong", null, "逐段解读 "), source.analysis) : null,
          source.evidence ? h("p", { className: "sl-src-line" }, h("strong", null, "提取依据 "), source.evidence) : null,
          source.limitations && source.limitations.length
            ? h("ul", { className: "sl-src-limits" }, source.limitations.map((value, index) => h("li", { key: index }, value)))
            : null,
        ),
        h(
          "div",
          { className: "sl-src-verified" },
          source.sourceVerified ? "转写匹配原文" : source.locationStatus === "page_only" ? "仅页码" : "转写未完全核验",
        ),
      );
    }

    function UnitCard({ unit, index, onCite }) {
      const [open, setOpen] = useState(index === 0);
      const [sourcesOpen, setSourcesOpen] = useState(true);
      const type = UNIT_TYPES[unit.unitType] || unit.unitType || "单元";
      return h(
        "details",
        { className: "sl-unit", open, onToggle: (event) => setOpen(event.currentTarget.open) },
        h(
          "summary",
          { className: "sl-unit-summary" },
          h("span", { className: "sl-unit-type" }, type),
          h("span", { className: "sl-unit-title" }, unit.heading || unit.id),
          unit.pages && unit.pages.length ? h("span", { className: "sl-unit-pages" }, `第 ${unit.pages.join("、")} 页`) : null,
          h("span", { className: `sl-unit-status is-${unit.status || "unknown"}` }, UNIT_STATUS[unit.status] || unit.status || "待核对"),
        ),
        open
          ? h(
              "div",
              { className: "sl-unit-body" },
              unit.pages && unit.pages.length
                ? h(
                    "div",
                    { className: "sl-unit-pages-nav" },
                    h("span", null, "原文页"),
                    unit.pages.map((pageNumber) => h("button", { key: pageNumber, type: "button", className: "sl-src-jump", onClick: () => onCite(pageNumber) }, `p.${pageNumber}`)),
                  )
                : null,
              unit.question ? h("p", { className: "sl-unit-field" }, h("strong", null, "研究问题 "), unit.question) : null,
              unit.design ? h("p", { className: "sl-unit-field" }, h("strong", null, "设计与对照 "), unit.design) : null,
              unit.result ? h("p", { className: "sl-unit-field" }, h("strong", null, "整理的结果 "), unit.result) : null,
              unit.interpretation ? h("div", { className: "sl-unit-interp" }, h("strong", null, "解读"), h("p", null, unit.interpretation)) : null,
              unit.figureNumbers && unit.figureNumbers.length ? h("p", { className: "sl-unit-figs" }, `图表：${unit.figureNumbers.join("、")}`) : null,
              unit.figureInterpretation ? h("p", { className: "sl-unit-field" }, h("strong", null, "图表解读 "), unit.figureInterpretation) : null,
              unit.limitations && unit.limitations.length
                ? h("div", { className: "sl-unit-limits" }, h("strong", null, "局限"), h("ul", null, unit.limitations.map((value, i) => h("li", { key: i }, value))))
                : null,
              unit.sources && unit.sources.length
                ? h(
                    "details",
                    { className: "sl-unit-sources", open: sourcesOpen, onToggle: (event) => setSourcesOpen(event.currentTarget.open) },
                    h("summary", null, `原文依据（${unit.sources.length} 项）`),
                    unit.sources.map((source, i) => h(SourceItem, { key: source.id || i, source, onCite })),
                  )
                : null,
            )
          : null,
      );
    }

    function DeepReadTab({ doc, onToast, onCite }) {
      const [state, setState] = useState({ loading: true, record: null, error: "", unsupported: false, starting: false, message: "" });
      const timer = useRef(null);
      const load = useCallback(async (silent) => {
        if (!silent) setState((value) => ({ ...value, loading: true, error: "" }));
        try {
          const data = await apiGet(`/api/full-read?key=${encodeURIComponent(doc.key)}`);
          setState({ loading: false, record: data.record || null, error: "", unsupported: Boolean(data.unsupported), starting: false, message: data.message || "" });
          if (data.record && data.record.status === "running") {
            timer.current = window.setTimeout(() => load(true), 4000);
          }
        } catch (error) {
          setState({ loading: false, record: null, error: error.message, unsupported: false, starting: false, message: "" });
        }
      }, [doc.key]);
      useEffect(() => {
        load(false);
        return () => {
          if (timer.current) window.clearTimeout(timer.current);
        };
      }, [load]);

      async function start() {
        if (!window.confirm("完整深读会调用 ScholarLoom 配置的模型，按页分析并产生费用。确定开始吗？")) return;
        setState((value) => ({ ...value, starting: true, error: "" }));
        try {
          await apiPost("/api/full-read/start", { key: doc.key, action: "start" });
          onToast("深读任务已提交，结果会自动刷新。");
          await load(true);
        } catch (error) {
          setState((value) => ({ ...value, starting: false, error: error.message }));
        }
      }

      if (state.loading) return h("div", { className: "sl-tab-pad" }, h(Spinner, { label: "正在读取深读记录…" }));
      if (state.error) {
        return h(
          "div",
          { className: "sl-tab-pad" },
          h(EmptyState, { icon: "warning", title: "深读记录读取失败", children: state.error }),
          h("div", { className: "sl-center-row" }, h("button", { type: "button", className: "sl-btn", onClick: () => load(false) }, "重试")),
        );
      }
      if (!state.record) {
        return h(
          "div",
          { className: "sl-tab-pad" },
          h(EmptyState, {
            icon: "spark",
            title: state.unsupported ? "当前连接的 ScholarLoom 不支持深读接口" : "尚未生成完整深读",
            children: state.unsupported
              ? "请启动工作区中较新版本的 server.py，或直接在 ScholarLoom 网页里运行深读。"
              : state.message || "完整深读会逐页分析全文，归并实验单元，并生成跨页综述。它使用 ScholarLoom 模型额度。",
          }),
          !state.unsupported
            ? h(
                "div",
                { className: "sl-center-row" },
                h("button", { type: "button", className: "sl-btn sl-btn-primary", onClick: start, disabled: state.starting }, state.starting ? "提交中…" : "开始完整深读"),
              )
            : null,
        );
      }
      const record = state.record;
      const overview = record.overview;
      const coverage = record.coverage || {};
      return h(
        "div",
        { className: "sl-deep" },
        h(
          "div",
          { className: "sl-deep-status" },
          h(Badge, { tone: record.status === "done" ? "success" : record.status === "partial" || record.status === "running" ? "warn" : "muted" }, record.status === "done" ? "已完成" : record.status === "running" ? "运行中" : record.status === "partial" ? "部分完成" : record.status),
          record.promptVersion ? h("span", null, `提示词 v${record.promptVersion}`) : null,
          coverage.pages ? h("span", null, `${coverage.pages}/${coverage.pageCount || "?"} 页`) : null,
          coverage.units ? h("span", null, `${coverage.units} 个实验单元`) : null,
          record.status === "running" ? h(Spinner, { label: "分析中，稍后自动刷新" }) : null,
          h("button", { type: "button", className: "sl-btn sl-btn-ghost sl-push", onClick: () => load(false) }, "刷新"),
        ),
        record.warnings && record.warnings.length
          ? h(
              "div",
              { className: "sl-warning-box" },
              h(Icon, { name: "warning", size: 14 }),
              h("div", null, record.warnings.slice(0, 3).map((item, index) => h("p", { key: index }, item))),
            )
          : null,
        overview
          ? h(
              "div",
              { className: "sl-deep-overview" },
              overview.oneSentence ? h("div", { className: "sl-quote" }, h("div", { className: "sl-quote-label" }, h(Icon, { name: "spark", size: 14 }), "全文综述"), h("p", null, overview.oneSentence)) : null,
              overview.researchQuestion ? h(Section, { title: "研究问题", icon: "search" }, h(Paragraphs, { value: overview.researchQuestion })) : null,
              overview.studyDesign ? h(Section, { title: "研究设计", icon: "layers" }, h(Paragraphs, { value: overview.studyDesign })) : null,
              overview.mainFindings && overview.mainFindings.length ? h(Section, { title: "主要发现", icon: "check" }, h(BulletList, { items: overview.mainFindings, ordered: true })) : null,
              overview.argumentMap && overview.argumentMap.length ? h(Section, { title: "论证链", icon: "chevron" }, h(BulletList, { items: overview.argumentMap })) : null,
              overview.limitations && overview.limitations.length ? h(Section, { title: "局限", icon: "warning" }, h(BulletList, { items: overview.limitations })) : null,
            )
          : h(EmptyState, { icon: "spark", title: "尚无全文综述", children: "本次深读还没有生成可合并的概述，可以在 ScholarLoom 中续跑。" }),
        record.units && record.units.length
          ? h(
              "section",
              { className: "sl-units" },
              h(
                "div",
                { className: "sl-units-head" },
                h("strong", null, `实验单元 ${record.units.length}`),
                h("span", { className: "sl-muted" }, "逐段解读与原文对照"),
              ),
              record.units.map((unit, index) => h(UnitCard, { key: unit.id || index, unit, index, onCite })),
            )
          : null,
        h(
          "div",
          { className: "sl-hintline" },
          h(Icon, { name: "warning", size: 13 }),
          h("span", null, "深读综述仍是模型解读；页码、图号和数值请逐条回原文核对。"),
        ),
      );
    }

    /* ── notes tab ──────────────────────────────────────────────────── */

    function NotesTab({ doc, onSave }) {
      const [note, setNote] = useState(doc.readingNote || "");
      const [dirty, setDirty] = useState(false);
      const [saving, setSaving] = useState(false);
      const [savedAt, setSavedAt] = useState(0);
      useEffect(() => {
        setNote(doc.readingNote || "");
        setDirty(false);
        setSavedAt(0);
      }, [doc.key]);
      async function save() {
        setSaving(true);
        try {
          await onSave(note);
          setDirty(false);
          setSavedAt(Date.now());
        } finally {
          setSaving(false);
        }
      }
      return h(
        "div",
        { className: "sl-notes" },
        h(
          "div",
          { className: "sl-notes-head" },
          h("div", null, h("strong", null, "阅读笔记"), h("span", { className: "sl-muted" }, "保存在 ScholarLoom 的这篇文献记录上")),
          h(
            "div",
            { className: "sl-notes-actions" },
            savedAt ? h("span", { className: "sl-saved" }, h(Icon, { name: "check", size: 12 }), "已保存") : null,
            h("button", { type: "button", className: "sl-btn sl-btn-primary", onClick: save, disabled: saving || !dirty }, saving ? "保存中…" : "保存笔记"),
          ),
        ),
        h("textarea", {
          className: "sl-note-area",
          value: note,
          maxLength: 4000,
          placeholder: "记下论证链、可复现细节、可疑数值、图表与引用线索…",
          onChange: (event) => {
            setNote(event.target.value);
            setDirty(true);
          },
          onBlur: () => {
            if (dirty && !saving) save();
          },
        }),
        h("div", { className: "sl-note-foot" }, `${note.length} / 4000`, h("span", null, "失焦时自动保存")),
      );
    }

    /* ── chat panel ─────────────────────────────────────────────────── */

    function renderInline(value, evidence, onCite) {
      const raw = String(value || "");
      const pattern = /(\*\*[^*]+\*\*|\[E\d+\]|\b[Pp]age\s*\d+|第\s*\d+\s*页|\bp\.\s*\d+)/g;
      const parts = raw.split(pattern);
      return parts.map((part, index) => {
        if (!part) return null;
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return h("strong", { key: index }, part.slice(2, -2));
        }
        const evidenceMatch = /^\[(E\d+)\]$/.exec(part);
        if (evidenceMatch) {
          const item = (evidence || []).find((entry) => entry.id === evidenceMatch[1]);
          return h(
            "button",
            {
              key: index,
              type: "button",
              className: "sl-cite",
              title: item && item.quote ? item.quote : `证据 ${evidenceMatch[1]}`,
              onClick: () => item && item.page && onCite(item.page),
            },
            item && item.page ? `[${evidenceMatch[1]} · p.${item.page}]` : `[${evidenceMatch[1]}]`,
          );
        }
        const pageMatch = /\d+/.exec(part);
        if (pageMatch) {
          return h(
            "button",
            {
              key: index,
              type: "button",
              className: "sl-cite sl-page-cite",
              title: `跳到 ${part} 对应页`,
              onClick: () => onCite(Number(pageMatch[0])),
            },
            `p.${pageMatch[0]}`,
          );
        }
        return h(React.Fragment, { key: index }, part);
      });
    }

    function AnswerText({ message, onCite }) {
      const lines = String(message.content || "")
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);
      return h(
        "div",
        { className: "sl-answer" },
        lines.map((line, index) => {
          const heading = /^[一二三四五六七八九十]+、/.test(line) || /^#{1,4}\s+/.test(line);
          const bullet = /^[-*•]\s+/.test(line) || /^\d+[.、)]\s*/.test(line);
          const clean = heading ? line.replace(/^#{1,4}\s+/, "") : line;
          return h(
            "p",
            { key: index, className: cx(heading && "sl-answer-head", bullet && "sl-answer-item") },
            renderInline(clean, message.evidence, onCite),
          );
        }),
        message.evidence && message.evidence.length
          ? h(
              "details",
              { className: "sl-evidence" },
              h("summary", null, `证据 ${message.evidence.length} 条`),
              h(
                "div",
                { className: "sl-evidence-list" },
                message.evidence.slice(0, 8).map((item) =>
                  h(
                    "button",
                    { key: item.id, type: "button", className: "sl-evidence-row", onClick: () => item.page && onCite(item.page) },
                    h("span", { className: "sl-evidence-id" }, item.id),
                    h("span", { className: "sl-evidence-page" }, item.page ? `p.${item.page}` : "无页码"),
                    h("span", { className: "sl-evidence-quote" }, item.quote),
                  ),
                ),
              ),
            )
          : null,
        message.basis ? h("div", { className: "sl-answer-basis" }, message.basis) : null,
      );
    }

    function ChatPanel({ doc, library, messages, busy, onAsk, onCite, onClose, embedded }) {
      const [input, setInput] = useState("");
      const [preset, setPreset] = useState("");
      const listRef = useRef(null);
      const language = library.language || "zh";
      const presets = library.presets || [];
      useEffect(() => {
        const node = listRef.current;
        if (!node) return undefined;
        const scroll = () => {
          node.scrollTop = node.scrollHeight;
        };
        scroll();
        const frame = window.requestAnimationFrame(scroll);
        const timer = window.setTimeout(scroll, 140);
        return () => {
          window.cancelAnimationFrame(frame);
          window.clearTimeout(timer);
        };
      }, [messages, busy]);
      useEffect(() => {
        setInput("");
        setPreset("");
      }, [doc && doc.key]);
      function submit() {
        const question = input.trim();
        if ((!question && !preset) || busy) return;
        onAsk(question, preset);
        setInput("");
      }
      return h(
        "aside",
        { className: cx("sl-chat", embedded && "is-embedded"), "aria-label": "证据问答" },
        h(
          "div",
          { className: "sl-chat-head" },
          h("div", { className: "sl-chat-title" }, h(Icon, { name: "chat", size: 16 }), h("span", null, "证据问答"), doc ? h("span", { className: "sl-chat-doc" }, `${doc.key}`) : null),
          embedded ? null : h("button", { type: "button", className: "sl-iconbtn", title: "收起问答", onClick: onClose }, h(Icon, { name: "close", size: 15 })),
        ),
        !doc
          ? h(EmptyState, { icon: "chat", title: "先选择一篇文献", children: "问答会检索这篇论文的本地全文，回答里带页码证据。" })
          : h(
              React.Fragment,
              null,
              h(
                "div",
                { className: "sl-chat-body", ref: listRef },
                messages.length === 0
                  ? h(
                      "div",
                      { className: "sl-chat-empty" },
                      h("div", { className: "sl-chat-empty-title" }, "针对这篇论文提问"),
                      h("p", null, "ScholarLoom 会检索本地 PDF 的相关页，回答中标注证据编号与页码。"),
                      h(
                        "div",
                        { className: "sl-suggestions" },
                        ["这篇论文的核心结论是什么？", "实验对照是否足以支持结论？", "哪些结果属于阴性或边界结果？"].map((question) =>
                          h("button", { key: question, type: "button", className: "sl-suggestion", onClick: () => onAsk(question, "") }, question),
                        ),
                      ),
                    )
                  : messages.map((message, index) =>
                      h(
                        "div",
                        { key: index, className: cx("sl-msg", message.role === "user" ? "is-user" : "is-assistant", message.error && "is-error") },
                        message.role === "user"
                          ? h("div", { className: "sl-msg-user" }, message.content)
                          : message.error
                            ? h("div", { className: "sl-msg-error" }, h(Icon, { name: "warning", size: 14 }), message.content)
                            : h(AnswerText, { message, onCite }),
                      ),
                    ),
                busy
                  ? h(
                      "div",
                      { className: "sl-msg is-assistant" },
                      h("div", { className: "sl-thinking" }, h("span", { className: "sl-thinking-dot" }), h("span", null, "正在检索原文并生成回答…")),
                    )
                  : null,
              ),
              h(
                "div",
                { className: "sl-composer" },
                h(
                  "div",
                  { className: "sl-composer-top" },
                  h(
                    "select",
                    { className: "sl-select sl-select-mini", value: preset, onChange: (event) => setPreset(event.target.value), "aria-label": "场景提示词" },
                    h("option", { value: "" }, "自由提问"),
                    presets.map((item) => h("option", { key: item.id, value: item.id }, language === "en" ? item.en : item.zh)),
                  ),
                  h("span", { className: "sl-composer-hint" }, "Enter 发送 · Shift+Enter 换行"),
                ),
                h(
                  "div",
                  { className: "sl-composer-box" },
                  h("textarea", {
                    value: input,
                    rows: 3,
                    maxLength: 4000,
                    placeholder: preset ? "可补充具体要求；留空直接使用场景提示词" : "问这篇论文任何问题…",
                    onChange: (event) => setInput(event.target.value),
                    onKeyDown: (event) => {
                      if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                        event.preventDefault();
                        submit();
                      }
                    },
                  }),
                  h(
                    "button",
                    { type: "button", className: "sl-send", title: "发送", onClick: submit, disabled: busy || (!input.trim() && !preset) },
                    h(Icon, { name: "send", size: 16 }),
                  ),
                ),
              ),
            ),
      );
    }

    /* ── welcome ────────────────────────────────────────────────────── */

    function Welcome({ library, onSelect, onOpenExternal }) {
      const documents = library.documents || [];
      const stats = library.stats || EMPTY_LIBRARY.stats;
      const recent = documents.slice(0, 6);
      return h(
        "div",
        { className: "sl-welcome" },
        h(
          "div",
          { className: "sl-welcome-brand" },
          h("div", { className: "sl-mark" }, h(Icon, { name: "book", size: 28 })),
          h("div", null, h("h1", null, "ScholarLoom 文献工作台"), h("p", null, "从文库到证据问答，在一个面板里完成阅读闭环。")),
        ),
        h(
          "div",
          { className: "sl-stat-grid" },
          [
            ["文献", stats.total, "总收藏"],
            ["未读", stats.unread, "等待开始"],
            ["在读", stats.reading, "进行中"],
            ["已读", stats.read, "完成"],
          ].map(([label, value, hint]) =>
            h("div", { key: label, className: "sl-stat" }, h("div", { className: "sl-stat-value" }, value || 0), h("div", { className: "sl-stat-label" }, label), h("div", { className: "sl-stat-hint" }, hint)),
          ),
        ),
        recent.length
          ? h(
              "div",
              { className: "sl-welcome-recent" },
              h("div", { className: "sl-welcome-recent-head" }, h("strong", null, "最近入藏"), h("span", null, "从左侧选择，或直接点开")),
              h(
                "div",
                { className: "sl-recent-list" },
                recent.map((doc) =>
                  h(
                    "button",
                    { key: doc.key, type: "button", className: "sl-recent", onClick: () => onSelect(doc) },
                    h("span", { className: cx("sl-dot", statusTone(doc.readingStatus)) }),
                    h("span", { className: "sl-recent-title" }, splitTitle(doc).main),
                    h("span", { className: "sl-recent-meta" }, [firstAuthor(doc.authors), doc.year].filter(Boolean).join(" · ")),
                  ),
                ),
              ),
            )
          : h(EmptyState, { icon: "book", title: "文库还是空的", children: "先在 ScholarLoom 中扫描下载目录并确认入藏。" }),
        h(
          "div",
          { className: "sl-welcome-foot" },
          h("button", { type: "button", className: "sl-btn sl-btn-ghost", onClick: onOpenExternal }, h(Icon, { name: "external", size: 14 }), "打开 ScholarLoom 网页"),
          h("span", { className: "sl-muted" }, library.baseUrl || "http://127.0.0.1:8766"),
        ),
      );
    }

    /* ── reading memory ────────────────────────────────────────────── */

    const MEMORY_KINDS = [
      ["preference", "偏好"],
      ["project", "课题"],
      ["hypothesis", "假设"],
    ];

    function MemoryTab({ doc, onToast }) {
      const [data, setData] = useState({ loading: true, memories: [], excerpts: [], history: [], error: "" });
      const [kind, setKind] = useState("project");
      const [content, setContent] = useState("");
      const [paperOnly, setPaperOnly] = useState(false);
      const [saving, setSaving] = useState(false);

      const load = useCallback(async () => {
        setData((value) => ({ ...value, loading: true, error: "" }));
        try {
          const result = await apiPost("/api/memory", { action: "list", project: "default", paper: doc.key });
          setData({
            loading: false,
            memories: result.memories || [],
            excerpts: result.excerpts || [],
            history: result.history || [],
            error: "",
          });
        } catch (error) {
          setData((value) => ({ ...value, loading: false, error: error.message }));
        }
      }, [doc.key]);

      useEffect(() => {
        load();
      }, [load]);

      async function saveMemory() {
        const value = content.trim();
        if (!value || saving) return;
        setSaving(true);
        try {
          await apiPost("/api/memory", {
            action: "remember",
            project: "default",
            kind,
            content: value,
            paper: paperOnly ? doc.key : "",
            source_ids: [],
          });
          setContent("");
          onToast("阅读记忆已保存");
          await load();
        } catch (error) {
          onToast(`记忆保存失败：${error.message}`, "error");
        } finally {
          setSaving(false);
        }
      }

      async function forgetMemory(id) {
        if (!window.confirm("删除这条阅读记忆？")) return;
        try {
          await apiPost("/api/memory", { action: "forget", project: "default", id });
          onToast("记忆已删除");
          await load();
        } catch (error) {
          onToast(`删除失败：${error.message}`, "error");
        }
      }

      async function deleteExcerpt(id) {
        if (!window.confirm("删除这条摘录？")) return;
        try {
          await apiPost("/api/memory", { action: "delete-excerpt", project: "default", id });
          onToast("摘录已删除");
          await load();
        } catch (error) {
          onToast(`删除失败：${error.message}`, "error");
        }
      }

      return h(
        "div",
        { className: "sl-memory" },
        h(
          "div",
          { className: "sl-memory-head" },
          h("div", null, h("strong", null, "阅读记忆"), h("span", { className: "sl-muted" }, "项目 default · 问答默认使用这些记忆")),
          h("button", { type: "button", className: "sl-btn sl-btn-ghost", onClick: load, disabled: data.loading }, data.loading ? "刷新中…" : "刷新"),
        ),
        data.error ? h("div", { className: "sl-memory-error" }, data.error) : null,
        h(
          "div",
          { className: "sl-memory-add" },
          h(
            "div",
            { className: "sl-memory-add-row" },
            h(
              "select",
              { className: "sl-select sl-select-mini", value: kind, onChange: (event) => setKind(event.target.value), "aria-label": "记忆类型" },
              MEMORY_KINDS.map(([value, label]) => h("option", { key: value, value }, label)),
            ),
            h(
              "label",
              { className: "sl-memory-scope" },
              h("input", { type: "checkbox", checked: paperOnly, onChange: (event) => setPaperOnly(event.target.checked) }),
              h("span", null, "仅这篇论文"),
            ),
          ),
          h("textarea", {
            className: "sl-memory-input",
            rows: 3,
            maxLength: 4000,
            value: content,
            placeholder: "记下长期有用的偏好、课题约束或待验证假设；不要粘贴整段论文。",
            onChange: (event) => setContent(event.target.value),
          }),
          h(
            "div",
            { className: "sl-memory-add-foot" },
            h("span", { className: "sl-muted" }, `${content.length} / 4000`),
            h("button", { type: "button", className: "sl-btn sl-btn-primary", onClick: saveMemory, disabled: saving || !content.trim() }, saving ? "保存中…" : "保存记忆"),
          ),
        ),
        h(
          "div",
          { className: "sl-memory-section-title" },
          h("strong", null, `记忆 ${data.memories.length}`),
          data.history.length ? h("span", { className: "sl-muted" }, `问答历史 ${data.history.length} 条`) : null,
        ),
        data.memories.length
          ? h(
              "div",
              { className: "sl-memory-list" },
              data.memories.map((memory) =>
                h(
                  "div",
                  { key: memory.id, className: "sl-memory-item" },
                  h(
                    "div",
                    { className: "sl-memory-meta" },
                    h("span", { className: "sl-memory-kind" }, (MEMORY_KINDS.find(([value]) => value === memory.kind) || [null, memory.kind])[1]),
                    h("span", { className: "sl-memory-scope-tag" }, memory.paper ? "本篇" : "课题"),
                    memory.slot ? h("span", { className: "sl-memory-slot" }, memory.slot) : null,
                  ),
                  h("p", { className: "sl-memory-content" }, memory.content),
                  h("button", { type: "button", className: "sl-textbtn", onClick: () => forgetMemory(memory.id) }, "删除"),
                ),
              ),
            )
          : h(EmptyState, { icon: "book", title: "还没有阅读记忆", children: "在上方添加偏好、课题约束或假设；问答时 ScholarLoom 会按问题召回。" }),
        data.excerpts.length
          ? h(
              "div",
              { className: "sl-memory-excerpts" },
              h("div", { className: "sl-memory-section-title" }, h("strong", null, `摘录 ${data.excerpts.length}`)),
              data.excerpts.map((excerpt) =>
                h(
                  "div",
                  { key: excerpt.id, className: "sl-memory-excerpt" },
                  h("div", { className: "sl-memory-meta" }, h("span", { className: "sl-memory-kind" }, excerpt.page ? `p.${excerpt.page}` : "摘录")),
                  h("blockquote", null, excerpt.quote),
                  h("button", { type: "button", className: "sl-textbtn", onClick: () => deleteExcerpt(excerpt.id) }, "删除"),
                ),
              ),
            )
          : null,
        h(
          "div",
          { className: "sl-hintline" },
          h(Icon, { name: "warning", size: 13 }),
          h("span", null, "记忆是用户上下文，不是论文证据；问答引用仍以页码证据为准。"),
        ),
      );
    }

    /* ── interpretation pane ───────────────────────────────────────── */

    const INTERP_TABS = [
      ["overview", "速览", "layers"],
      ["deep", "深读", "spark"],
      ["chat", "问答", "chat"],
      ["notes", "笔记", "note"],
      ["memory", "记忆", "book"],
    ];

    function InterpretationPane({ doc, tab, setTab, library, messages, busy, onAsk, onCite, onSaveNote, onToast, onOpenChat }) {
      return h(
        "section",
        { className: "sl-interp" },
        h(
          "div",
          { className: "sl-interp-head" },
          h(
            "div",
            { className: "sl-interp-tabs", role: "tablist", "aria-label": "论文解读" },
            INTERP_TABS.map(([value, label, icon]) =>
              h(
                "button",
                {
                  key: value,
                  type: "button",
                  role: "tab",
                  "aria-selected": tab === value,
                  className: cx("sl-interp-tab", tab === value && "is-active"),
                  onClick: () => setTab(value),
                },
                h(Icon, { name: icon, size: 14 }),
                h("span", null, label),
              ),
            ),
          ),
        ),
        h(
          "div",
          { className: "sl-interp-body" },
          tab === "overview" ? h(OverviewTab, { doc, onOpenChat }) : null,
          tab === "deep" ? h(DeepReadTab, { doc, onToast, onCite }) : null,
          tab === "chat" ? h(ChatPanel, { doc, library, messages, busy, onAsk, onCite, embedded: true }) : null,
          tab === "notes" ? h(NotesTab, { doc, onSave: onSaveNote }) : null,
          tab === "memory" ? h(MemoryTab, { doc, onToast }) : null,
        ),
      );
    }

    /* ── main page ──────────────────────────────────────────────────── */

    function WorkbenchPage() {
      const [library, setLibrary] = useState(EMPTY_LIBRARY);
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState(null);
      const [query, setQuery] = useStored("query", "");
      const [status, setStatus] = useStored("status", "all");
      const [category, setCategory] = useStored("category", "all");
      const [selectedKey, setSelectedKey] = useStored("selected", "");
      const [tab, setTab] = useStored("tab", "overview");
      const [focusPdf, setFocusPdf] = useStored("focusPdf", false);
      const [pdfJumpKey, setPdfJumpKey] = useState(0);
      const [pdfTarget, setPdfTarget] = useState(null);
      const [page, setPage] = useState(1);
      const [libraryOpen, setLibraryOpen] = useState(false);
      const rootRef = useRef(null);
      const width = useElementWidth(rootRef);
      const withLibrary = width >= 820;
      const libraryDrawer = !withLibrary && libraryOpen;
      useEffect(() => {
        if (tab === "fulltext") setTab("overview");
      }, [tab, setTab]);
      const [chats, setChats] = useState({});
      const [busyKey, setBusyKey] = useState("");
      const [toast, setToast] = useState(null);
      const pollRef = useRef(null);
      const toastTimer = useRef(null);

      const showToast = useCallback((message, tone) => {
        setToast({ message, tone: tone || "info" });
        if (toastTimer.current) window.clearTimeout(toastTimer.current);
        toastTimer.current = window.setTimeout(() => setToast(null), 3200);
      }, []);

      const load = useCallback(async (quiet) => {
        if (!quiet) setLoading(true);
        try {
          const data = await apiGet("/api/library");
          setLibrary(data);
          setError(null);
          setLoading(false);
          if (pollRef.current) {
            window.clearInterval(pollRef.current);
            pollRef.current = null;
          }
        } catch (err) {
          setLoading(false);
          setError({ message: err.message, hint: err.data && err.data.hint, status: err.status });
        }
      }, []);

      useEffect(() => {
        load(false);
        return () => {
          if (pollRef.current) window.clearInterval(pollRef.current);
          if (toastTimer.current) window.clearTimeout(toastTimer.current);
        };
      }, [load]);

      useEffect(() => {
        if (!error) return undefined;
        pollRef.current = window.setInterval(() => load(true), 6000);
        return () => {
          if (pollRef.current) {
            window.clearInterval(pollRef.current);
            pollRef.current = null;
          }
        };
      }, [error, load]);

      const documents = library.documents || [];
      const doc = useMemo(() => documents.find((item) => item.key === selectedKey) || null, [documents, selectedKey]);
      const messages = (doc && chats[doc.key]) || [];
      const busy = Boolean(doc && busyKey === doc.key);

      useEffect(() => {
        if (selectedKey && !doc && documents.length) {
          const exists = documents.some((item) => item.key === selectedKey);
          if (!exists) setSelectedKey("");
        }
      }, [documents, doc, selectedKey, setSelectedKey]);

      function selectDoc(next) {
        setSelectedKey(next.key);
        setTab("overview");
        setFocusPdf(false);
        setPdfTarget(null);
        setPage(1);
        if (!withLibrary) setLibraryOpen(false);
      }

      async function updateStatus(nextStatus) {
        if (!doc) return;
        const previous = doc.readingStatus;
        setLibrary((value) => ({
          ...value,
          documents: value.documents.map((item) => (item.key === doc.key ? { ...item, readingStatus: nextStatus } : item)),
          stats: {
            ...value.stats,
            [previous || "unread"]: Math.max(0, (value.stats[previous || "unread"] || 0) - 1),
            [nextStatus]: (value.stats[nextStatus] || 0) + 1,
          },
        }));
        try {
          await apiPost("/api/document-state", { key: doc.key, readingStatus: nextStatus, readingNote: doc.readingNote || "" });
        } catch (err) {
          setLibrary((value) => ({
            ...value,
            documents: value.documents.map((item) => (item.key === doc.key ? { ...item, readingStatus: previous } : item)),
          }));
          showToast(`状态保存失败：${err.message}`, "error");
        }
      }

      async function saveNote(note) {
        if (!doc) return;
        try {
          await apiPost("/api/document-state", { key: doc.key, readingStatus: doc.readingStatus || "unread", readingNote: note });
          setLibrary((value) => ({ ...value, documents: value.documents.map((item) => (item.key === doc.key ? { ...item, readingNote: note } : item)) }));
          showToast("笔记已保存");
        } catch (err) {
          showToast(`笔记保存失败：${err.message}`, "error");
          throw err;
        }
      }

      function openChat() {
        setFocusPdf(false);
        setTab("chat");
      }

      async function ask(question, preset) {
        if (!doc || busy) return;
        const key = doc.key;
        const userMessage = { role: "user", content: question || (preset ? "使用场景提示词分析这篇论文" : "") };
        setChats((value) => ({ ...value, [key]: [...(value[key] || []), userMessage].slice(-30) }));
        setBusyKey(key);
        setFocusPdf(false);
        setTab("chat");
        try {
          const result = await apiPost("/api/chat", { key, question, preset });
          const assistant = {
            role: "assistant",
            content: result.answer,
            evidence: result.evidence || [],
            basis: [result.basis, result.pages ? `索引 ${result.pages} 页` : ""].filter(Boolean).join(" · "),
          };
          setChats((value) => ({ ...value, [key]: [...(value[key] || []), assistant].slice(-30) }));
        } catch (err) {
          setChats((value) => ({
            ...value,
            [key]: [...(value[key] || []), { role: "assistant", error: true, content: err.message }].slice(-30),
          }));
        } finally {
          setBusyKey("");
        }
      }

      function jumpToPage(nextPage, rects) {
        const value = Math.max(1, Number(nextPage) || 1);
        setPage(value);
        setPdfJumpKey((key) => key + 1);
        setPdfTarget({ page: value, rects: Array.isArray(rects) ? rects : [], nonce: Date.now() });
        showToast(`跳到第 ${value} 页`);
      }

      async function openPdfExternal() {
        if (!doc) return;
        try {
          await apiPost("/api/open-pdf", { key: doc.key });
          showToast("已在默认浏览器打开 PDF");
        } catch (error) {
          showToast(`打开失败：${error.message}`, "error");
        }
      }

      async function copyCitation() {
        if (!doc) return;
        const ok = await copyText(citationOf(doc));
        showToast(ok ? "参考文献条目已复制" : "复制失败，请手动选择", ok ? "info" : "error");
      }

      function openExternal() {
        if (doc && doc.hasPDF) {
          openPdfExternal();
          return;
        }
        window.open(library.baseUrl, "_blank", "noopener");
      }

      if (error && !documents.length) {
        return h(
          "div",
          { className: "sl-root sl-connect" },
          h(
            "div",
            { className: "sl-connect-card" },
            h("div", { className: "sl-mark" }, h(Icon, { name: "book", size: 28 })),
            h("h1", null, "连接 ScholarLoom"),
            h("p", null, "文献工作台需要本机的 ScholarLoom 服务。"),
            error.hint ? h("p", { className: "sl-muted" }, error.hint) : null,
            h("div", { className: "sl-connect-error" }, error.message),
            h(
              "div",
              { className: "sl-connect-actions" },
              h("button", { type: "button", className: "sl-btn sl-btn-primary", onClick: () => load(false) }, loading ? "连接中…" : "重新连接"),
              h("a", { className: "sl-btn sl-btn-ghost", href: library.baseUrl || "http://127.0.0.1:8766", target: "_blank", rel: "noreferrer" }, "打开 ScholarLoom"),
            ),
            h("p", { className: "sl-connect-note" }, "请先启动 ScholarLoom 的 server.py。若希望插件代启，可在插件配置中打开 autoStart；它会启动 projectDir 下配置的服务。"),
          ),
        );
      }

      const overlayOpen = libraryDrawer;
      const gridColumns = withLibrary ? "minmax(230px,24%) minmax(0,1fr)" : "minmax(0,1fr)";

      return h(
        "div",
        { className: "sl-root", ref: rootRef },
        h(
          "header",
          { className: "sl-top" },
          h(
            "div",
            { className: "sl-brand" },
            h("div", { className: "sl-brand-mark" }, h(Icon, { name: "book", size: 18 })),
            h("div", { className: "sl-brand-text" }, h("strong", null, "ScholarLoom"), h("span", null, "文献工作台")),
          ),
          h(
            "div",
            { className: "sl-top-stats" },
            h("span", null, `${library.stats.total || 0} 篇`),
            h("span", { className: "sl-top-divider" }),
            h("span", null, `未读 ${library.stats.unread || 0}`),
            h("span", null, `在读 ${library.stats.reading || 0}`),
            h("span", null, `已读 ${library.stats.read || 0}`),
          ),
          h("div", { className: "sl-top-spacer" }),
          h(
            "div",
            { className: "sl-top-actions" },
            h(
              "button",
              { type: "button", className: "sl-btn sl-btn-ghost", style: { display: withLibrary ? "none" : "inline-flex" }, onClick: () => setLibraryOpen(true) },
              h(Icon, { name: "panel", size: 15 }),
              "文库",
            ),
            h(
              "span",
              { className: cx("sl-conn", library.connected ? "is-on" : "is-off"), title: library.health && library.health.model ? "模型可用" : "模型未配置" },
              h("span", { className: "sl-conn-dot" }),
              library.connected ? "已连接" : "未连接",
            ),
            h(IconButton, { icon: "refresh", label: "刷新文库", onClick: () => load(false), disabled: loading }),
            h(IconButton, { icon: "external", label: "打开 ScholarLoom 网页", onClick: () => window.open(library.baseUrl, "_blank", "noopener") }),
            h(
              "button",
              { type: "button", className: "sl-btn sl-btn-ghost", onClick: openChat, "aria-pressed": tab === "chat" },
              h(Icon, { name: "chat", size: 15 }),
              "问答",
            ),
            h(
              "button",
              { type: "button", className: "sl-btn sl-btn-ghost", onClick: () => { setFocusPdf(false); setTab("memory"); }, "aria-pressed": tab === "memory" },
              h(Icon, { name: "book", size: 15 }),
              "记忆",
            ),
          ),
        ),
        h(
          "div",
          { className: "sl-body", style: { gridTemplateColumns: gridColumns } },
          h(LibraryColumn, {
            library,
            query,
            setQuery,
            status,
            setStatus,
            category,
            setCategory,
            selectedKey,
            onSelect: selectDoc,
            loading,
            onRefresh: () => load(false),
            open: libraryOpen,
            onClose: () => setLibraryOpen(false),
            drawer: libraryDrawer,
          }),
          h(
            "main",
            { className: "sl-center" },
            doc
              ? h(
                  React.Fragment,
                  null,
                  h(DocHeader, {
                    doc,
                    onStatus: updateStatus,
                    onCopy: copyCitation,
                    onOpenExternal: openExternal,
                    onOpenChat: openChat,
                    chatActive: tab === "chat",
                    focusPdf,
                    onToggleFocus: () => setFocusPdf((value) => !value),
                  }),
                  h(
                    "div",
                    { className: "sl-doc-body" },
                    h(
                      "div",
                      { className: cx("sl-split", focusPdf && "is-focus-pdf") },
                      h(InterpretationPane, {
                        doc,
                        tab,
                        setTab,
                        library,
                        messages,
                        busy,
                        onAsk: ask,
                        onCite: jumpToPage,
                        onSaveNote: saveNote,
                        onToast: showToast,
                        onOpenChat: openChat,
                      }),
                      h(
                        "section",
                        { className: "sl-pdf-pane" },
                        h(FullTextTab, { doc, page, setPage, jumpKey: pdfJumpKey, target: pdfTarget, onOpenExternal: openPdfExternal }),
                      ),
                    ),
                  ),
                )
              : h(Welcome, { library, onSelect: selectDoc, onOpenExternal: () => window.open(library.baseUrl, "_blank", "noopener") }),
          ),
          overlayOpen ? h("div", { className: "sl-backdrop", onClick: () => setLibraryOpen(false) }) : null,
        ),
        toast ? h("div", { className: cx("sl-toast", toast.tone === "error" && "is-error") }, toast.message) : null,
      );
    }

    /* ── plugin wiring ──────────────────────────────────────────────── */

    const STYLE_ID = "dsh-scholarloom-styles";

    function applyStyles() {
      let node = document.getElementById(STYLE_ID);
      if (!node) {
        node = document.createElement("style");
        node.id = STYLE_ID;
        node.textContent = CSS;
        document.head.appendChild(node);
      }
      return () => {
        const current = document.getElementById(STYLE_ID);
        if (current) current.remove();
      };
    }

    function apply(ctx) {
      ctx.effect(applyStyles, "dsh-scholarloom: styles");
      ctx.slots.inject("main", () =>
        ctx.slots.register({ name: "main", key: PANEL_ID }, WorkbenchPage),
      );
      ctx.slots.inject("sidebar.panellist", () =>
        ctx.slots.register(
          { name: "sidebar.panellist", id: PANEL_ID, order: 1, label: () => "文献工作台" },
          PanelIcon,
        ),
      );
    }

    const CSS = `
.sl-root{position:relative;container-type:inline-size;container-name:sl;display:flex;flex-direction:column;height:100%;min-height:0;background:var(--dsw-alias-bg-base,#0f1115);color:var(--dsw-alias-label-primary,#e7e8ea);font-family:var(--dsw-font-family-sans,system-ui,-apple-system,"Segoe UI",sans-serif);font-size:13px;line-height:1.55;overflow:hidden;--sl-bg:var(--dsw-alias-bg-base,#0f1115);--sl-layer:var(--dsw-alias-bg-layer-1,#17191d);--sl-layer2:var(--dsw-alias-bg-layer-2,#1e2127);--sl-overlay:var(--dsw-alias-bg-overlay,#23262d);--sl-border:var(--dsw-alias-border-l1,rgba(140,146,160,.2));--sl-border2:var(--dsw-alias-border-l2,rgba(140,146,160,.38));--sl-text:var(--dsw-alias-label-primary,#e7e8ea);--sl-text2:var(--dsw-alias-label-secondary,#9ba0aa);--sl-accent:var(--dsw-alias-brand-primary,#7b9cff);--sl-success:var(--dsw-alias-state-success-primary,#53c88b);--sl-warn:var(--dsw-alias-state-warn-primary,#e2ad5c);--sl-danger:var(--dsw-alias-state-error-primary,#e5787f);--sl-radius:10px}
.sl-root *{box-sizing:border-box}
.sl-root button{font:inherit;color:inherit}
.sl-root ::selection{background:color-mix(in srgb,var(--sl-accent) 34%,transparent)}
.sl-muted{color:var(--sl-text2)}
.sl-top{flex:none;display:flex;align-items:center;gap:14px;height:54px;padding:0 16px;border-bottom:1px solid var(--sl-border);background:var(--sl-layer);z-index:5}
.sl-brand{display:flex;align-items:center;gap:9px;min-width:0}
.sl-brand-mark{display:grid;place-items:center;width:30px;height:30px;border-radius:9px;background:linear-gradient(145deg,color-mix(in srgb,var(--sl-accent) 26%,transparent),color-mix(in srgb,var(--sl-accent) 6%,transparent));border:1px solid color-mix(in srgb,var(--sl-accent) 36%,transparent);color:var(--sl-accent)}
.sl-brand-text{display:flex;flex-direction:column;line-height:1.2}
.sl-brand-text strong{font-size:13.5px;letter-spacing:.2px}
.sl-brand-text span{font-size:11px;color:var(--sl-text2)}
.sl-top-stats{display:flex;align-items:center;gap:10px;font-size:11.5px;color:var(--sl-text2);white-space:nowrap}
.sl-top-divider{width:1px;height:12px;background:var(--sl-border2)}
.sl-top-spacer{flex:1}
.sl-top-actions{display:flex;align-items:center;gap:6px}
.sl-conn{display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border:1px solid var(--sl-border);border-radius:999px;font-size:11px;color:var(--sl-text2)}
.sl-conn-dot{width:6px;height:6px;border-radius:50%;background:var(--sl-warn)}
.sl-conn.is-on .sl-conn-dot{background:var(--sl-success)}
.sl-conn.is-off .sl-conn-dot{background:var(--sl-danger)}
.sl-body{position:relative;flex:1;min-height:0;display:grid;grid-template-columns:clamp(250px,23%,320px) minmax(0,1fr)}
.sl-library{display:flex;flex-direction:column;min-height:0;border-right:1px solid var(--sl-border);background:color-mix(in srgb,var(--sl-layer) 72%,var(--sl-bg));z-index:3}
.sl-lib-head{flex:none;padding:12px 12px 10px;border-bottom:1px solid var(--sl-border);display:flex;flex-direction:column;gap:9px}
.sl-lib-title-row{display:flex;align-items:center;justify-content:space-between;gap:8px}
.sl-lib-title{display:flex;align-items:center;gap:7px;font-weight:600;font-size:12.5px}
.sl-count{font-weight:400;color:var(--sl-text2);font-size:11px}
.sl-lib-actions{display:flex;gap:2px}
.sl-search{position:relative;display:flex;align-items:center}
.sl-search-icon{position:absolute;left:9px;color:var(--sl-text2);pointer-events:none}
.sl-search input{width:100%;height:30px;padding:0 26px 0 29px;border:1px solid var(--sl-border);border-radius:8px;background:var(--sl-bg);color:var(--sl-text);font:inherit;font-size:12px;outline:none}
.sl-search input:focus{border-color:color-mix(in srgb,var(--sl-accent) 60%,var(--sl-border))}
.sl-search-clear{position:absolute;right:5px;display:grid;place-items:center;width:20px;height:20px;border:0;border-radius:5px;background:transparent;color:var(--sl-text2);cursor:pointer}
.sl-search-clear:hover{background:var(--sl-layer2);color:var(--sl-text)}
.sl-statuses{display:flex;gap:3px;padding:2px;border:1px solid var(--sl-border);border-radius:8px;background:var(--sl-bg)}
.sl-status-tab{flex:1;display:flex;align-items:center;justify-content:center;gap:4px;height:24px;border:0;border-radius:6px;background:transparent;color:var(--sl-text2);font-size:11px;cursor:pointer;white-space:nowrap}
.sl-status-tab:hover{color:var(--sl-text)}
.sl-status-tab.is-active{background:var(--sl-layer2);color:var(--sl-text);box-shadow:0 1px 2px rgba(0,0,0,.18)}
.sl-status-count{font-size:10px;color:var(--sl-text2)}
.sl-status-tab.is-active .sl-status-count{color:var(--sl-accent)}
.sl-select{height:28px;padding:0 8px;border:1px solid var(--sl-border);border-radius:7px;background:var(--sl-bg);color:var(--sl-text);font:inherit;font-size:11.5px;outline:none}
.sl-lib-list{flex:1;min-height:0;overflow:auto;padding:5px 6px 12px;scrollbar-width:thin}
.sl-lib-loading{padding:22px 10px}
.sl-item{display:flex;flex-direction:column;gap:3px;width:100%;padding:9px 10px;border:1px solid transparent;border-radius:8px;background:transparent;text-align:left;cursor:pointer;color:var(--sl-text)}
.sl-item:hover{background:color-mix(in srgb,var(--sl-layer2) 72%,transparent)}
.sl-item.is-selected{background:color-mix(in srgb,var(--sl-accent) 12%,var(--sl-layer2));border-color:color-mix(in srgb,var(--sl-accent) 34%,var(--sl-border))}
.sl-item-top{display:flex;align-items:center;gap:6px;min-width:0}
.sl-dot{flex:none;width:6px;height:6px;border-radius:50%;background:var(--sl-text2)}
.sl-dot.is-unread{background:var(--sl-text2)}
.sl-dot.is-reading{background:var(--sl-warn)}
.sl-dot.is-read{background:var(--sl-success)}
.sl-item-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12.3px;font-weight:550}
.sl-mini-tag{flex:none;padding:0 4px;border:1px solid var(--sl-border);border-radius:4px;color:var(--sl-text2);font-size:9px;line-height:14px;letter-spacing:.3px}
.sl-item-meta{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--sl-text2);font-size:10.7px}
.sl-item-foot{display:flex;align-items:center;gap:6px;color:var(--sl-text2);font-size:10px;min-width:0}
.sl-item-cat{max-width:48%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 5px;border-radius:4px;background:color-mix(in srgb,var(--sl-accent) 12%,transparent);color:color-mix(in srgb,var(--sl-accent) 80%,var(--sl-text))}
.sl-item-type{max-width:30%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sl-item-status{margin-left:auto;white-space:nowrap}
.sl-review{flex:none;display:flex;align-items:center;gap:6px;padding:7px 12px;border-top:1px solid var(--sl-border);color:var(--sl-warn);font-size:11px;background:color-mix(in srgb,var(--sl-warn) 7%,transparent)}
.sl-center{display:flex;flex-direction:column;min-width:0;min-height:0;background:var(--sl-bg)}
.sl-doc-head{flex:none;padding:14px 20px 0;border-bottom:1px solid var(--sl-border);background:var(--sl-bg)}
.sl-doc-title-row{display:flex;align-items:flex-start;gap:16px}
.sl-doc-titles{min-width:0;flex:1}
.sl-doc-title{margin:0;font-size:17px;line-height:1.35;font-weight:650;letter-spacing:.1px;word-break:break-word}
.sl-doc-subtitle{margin-top:2px;color:var(--sl-text2);font-size:11.5px;line-height:1.4;word-break:break-word}
.sl-doc-actions{display:flex;gap:2px;padding-top:2px}
.sl-doc-meta{display:flex;flex-wrap:wrap;align-items:center;gap:7px;margin-top:7px;color:var(--sl-text2);font-size:11.5px}
.sl-doc-doi{font-family:var(--dsw-font-family-mono,ui-monospace,monospace);font-size:10.5px;padding:1px 5px;border-radius:4px;background:var(--sl-layer2)}
.sl-doc-toolbar{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-top:11px}
.sl-tabs{display:flex;gap:2px;min-width:0}
.sl-tab{display:flex;align-items:center;gap:5px;height:33px;padding:0 10px;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--sl-text2);font-size:12px;cursor:pointer;white-space:nowrap}
.sl-tab:hover{color:var(--sl-text)}
.sl-tab.is-active{color:var(--sl-text);border-bottom-color:var(--sl-accent)}
.sl-doc-tools{display:flex;align-items:center;gap:8px;padding-bottom:6px}
.sl-segmented{display:flex;gap:2px;padding:2px;border:1px solid var(--sl-border);border-radius:7px;background:var(--sl-layer)}
.sl-seg{height:22px;padding:0 8px;border:0;border-radius:5px;background:transparent;color:var(--sl-text2);font-size:10.5px;cursor:pointer}
.sl-seg.is-active{background:var(--sl-layer2);color:var(--sl-text)}
.sl-doc-body{flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column}
.sl-doc-context{display:flex;align-items:center;gap:6px;color:var(--sl-text2);font-size:10.5px;padding-bottom:7px;white-space:nowrap}
.sl-doc-context svg{color:var(--sl-accent)}
.sl-split{display:flex;flex:1;min-height:0;min-width:0}
.sl-split.is-focus-pdf .sl-interp{display:none}
.sl-interp{display:flex;flex-direction:column;width:42%;min-width:320px;max-width:520px;min-height:0;border-right:1px solid var(--sl-border);background:var(--sl-bg)}
.sl-interp-head{flex:none;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 8px 0;border-bottom:1px solid var(--sl-border)}
.sl-interp-tabs{display:flex;gap:1px;min-width:0;overflow:auto;scrollbar-width:none}
.sl-interp-tab{flex:none;display:flex;align-items:center;gap:4px;height:31px;padding:0 8px;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--sl-text2);font-size:11.5px;cursor:pointer;white-space:nowrap}
.sl-interp-tab:hover{color:var(--sl-text)}
.sl-interp-tab.is-active{color:var(--sl-text);border-bottom-color:var(--sl-accent)}
.sl-interp-hint{flex:none;padding-right:4px;color:var(--sl-text2);font-size:9.5px;letter-spacing:.4px}
.sl-interp-body{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;scrollbar-width:thin}
.sl-interp-body > .sl-overview,.sl-interp-body > .sl-deep{flex:none}
.sl-interp-body > .sl-chat.is-embedded,.sl-interp-body > .sl-notes{flex:1;min-height:0}
.sl-pdf-pane{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;background:#26282c}
.sl-interp .sl-overview,.sl-interp .sl-deep{padding:14px 16px 24px;max-width:none}
.sl-overview{padding:18px 22px 30px;display:flex;flex-direction:column;gap:16px;max-width:980px}
.sl-quote{margin:0;padding:13px 15px;border:1px solid color-mix(in srgb,var(--sl-accent) 24%,var(--sl-border));border-left:3px solid var(--sl-accent);border-radius:0 9px 9px 0;background:color-mix(in srgb,var(--sl-accent) 6%,var(--sl-layer))}
.sl-quote-label{display:flex;align-items:center;gap:6px;margin-bottom:5px;color:var(--sl-accent);font-size:10.5px;font-weight:600;letter-spacing:.4px;text-transform:uppercase}
.sl-quote p{margin:0;font-size:13.5px;line-height:1.7}
.sl-grid-2{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}
.sl-section{border:1px solid var(--sl-border);border-radius:var(--sl-radius);background:color-mix(in srgb,var(--sl-layer) 55%,transparent);overflow:hidden}
.sl-section-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 12px 7px;border-bottom:1px solid var(--sl-border)}
.sl-section-title{display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;letter-spacing:.2px;color:var(--sl-text)}
.sl-section-title svg{color:var(--sl-accent)}
.sl-section-body{padding:10px 13px 12px}
.sl-prose p{margin:0 0 8px;line-height:1.7;font-size:12.5px}
.sl-prose p:last-child{margin-bottom:0}
.sl-list{margin:0;padding-left:1.35em;display:flex;flex-direction:column;gap:6px;font-size:12.5px;line-height:1.65}
.sl-list li::marker{color:var(--sl-accent)}
.sl-keywords{display:flex;flex-wrap:wrap;gap:6px}
.sl-keyword{padding:2px 8px;border:1px solid var(--sl-border);border-radius:999px;color:var(--sl-text2);font-size:10.5px;background:var(--sl-layer)}
.sl-cta{display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px dashed color-mix(in srgb,var(--sl-accent) 42%,var(--sl-border));border-radius:9px;background:color-mix(in srgb,var(--sl-accent) 5%,transparent);color:var(--sl-accent);font-size:12px;cursor:pointer;text-align:left}
.sl-cta:hover{background:color-mix(in srgb,var(--sl-accent) 10%,transparent)}
.sl-hintline{display:flex;align-items:flex-start;gap:6px;color:var(--sl-text2);font-size:10.5px;line-height:1.5}
.sl-hintline svg{flex:none;margin-top:2px;color:var(--sl-warn)}
.sl-fulltext{position:relative;display:flex;flex-direction:column;height:100%;min-height:0;background:#26282c}
.sl-pdf-empty{justify-content:center;align-items:center;background:var(--sl-bg)}
.sl-fulltext-bar{flex:none;display:flex;align-items:center;flex-wrap:wrap;gap:6px 12px;padding:6px 12px;border-bottom:1px solid var(--sl-border);background:var(--sl-layer)}
.sl-fulltext-label{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--sl-text2);white-space:nowrap}
.sl-page-nav{display:flex;align-items:center;gap:4px}
.sl-page-nav input{width:52px;height:24px;padding:0 5px;border:1px solid var(--sl-border);border-radius:5px;background:var(--sl-bg);color:var(--sl-text);font:inherit;font-size:11px;text-align:center}
.sl-pdf{flex:1;width:100%;min-height:0;border:0;background:#fff}
.sl-pdf-fallback{position:absolute;inset:auto 0 0;padding:10px;background:var(--sl-warn);color:#231a08;font-size:12px;text-align:center}
.sl-pdf-wrap{position:relative;flex:1;min-height:0;overflow:auto;background:#2b2d31;display:flex;flex-direction:column;align-items:center;gap:8px;padding:10px;scrollbar-width:thin}
.sl-pdf-wrap.is-flash{animation:sl-pdf-flash .65s ease-out}
@keyframes sl-pdf-flash{0%{box-shadow:inset 0 0 0 2px var(--sl-accent)}100%{box-shadow:inset 0 0 0 0 transparent}}
.sl-pdf-canvas{display:block;flex:none;background:#fff;box-shadow:0 3px 18px rgba(0,0,0,.35)}
.sl-pdf-pages{display:flex;flex-direction:column;align-items:center;gap:12px;width:100%}
.sl-pdf-page{position:relative;flex:none;background:#fff;box-shadow:0 3px 18px rgba(0,0,0,.35);overflow:hidden}
.sl-pdf-page canvas{display:block;width:100%;height:100%;position:relative;z-index:1}
.sl-pdf-page .sl-pdf-canvas{box-shadow:none;background:transparent}
.textLayer{position:absolute;inset:0;overflow:clip;line-height:1;-webkit-text-size-adjust:none;text-size-adjust:none;forced-color-adjust:none;transform-origin:0 0;z-index:3}
.textLayer :is(span,br){color:transparent;position:absolute;white-space:pre;cursor:text;transform-origin:0% 0%}
.textLayer ::selection{background:rgba(0,100,255,.28);background:color-mix(in srgb, AccentColor, transparent 70%)}
.textLayer br::selection{background:transparent}
.textLayer .endOfContent{display:block;position:absolute;inset:100% 0 0;z-index:0;cursor:default;-webkit-user-select:none;user-select:none}
.textLayer.selecting .endOfContent{top:0}
.sl-pdf-highlight{position:absolute;inset:0;z-index:2;pointer-events:none}
.sl-pdf-highlight span{position:absolute;border-radius:2px;background:rgba(219,166,54,.36);box-shadow:inset 0 -1px 0 rgba(123,79,11,.5);animation:sl-highlight-in .2s ease-out}
@keyframes sl-highlight-in{from{opacity:0}to{opacity:1}}
.sl-pdf-error{display:flex;flex-direction:column;align-items:center;gap:8px;color:var(--sl-warn);font-size:11.5px;padding:24px;text-align:center}
.sl-pdf-error p{margin:0;max-width:320px;line-height:1.6}
.sl-pdf-error a{color:var(--sl-accent);font-size:11px}
.sl-page-total{color:var(--sl-text2);font-size:10.5px;white-space:nowrap}
.sl-tab-pad{padding:22px}
.sl-center-row{display:flex;justify-content:center;margin-top:12px}
.sl-deep{padding:18px 22px 30px;display:flex;flex-direction:column;gap:14px;max-width:1000px}
.sl-deep-status{display:flex;align-items:center;gap:10px;flex-wrap:wrap;color:var(--sl-text2);font-size:11px}
.sl-push{margin-left:auto}
.sl-warning-box{display:flex;gap:8px;padding:9px 11px;border:1px solid color-mix(in srgb,var(--sl-warn) 40%,var(--sl-border));border-radius:8px;background:color-mix(in srgb,var(--sl-warn) 7%,transparent);color:var(--sl-warn);font-size:11px}
.sl-warning-box p{margin:0 0 3px}
.sl-deep-overview{display:flex;flex-direction:column;gap:13px}
.sl-units{display:flex;flex-direction:column;gap:8px;margin-top:6px}
.sl-units-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;padding:2px 0 3px}
.sl-units-head strong{font-size:12.5px}
.sl-units-head .sl-muted{font-size:10px}
.sl-unit{border:1px solid var(--sl-border);border-radius:9px;background:color-mix(in srgb,var(--sl-layer) 62%,transparent);overflow:hidden}
.sl-unit summary{display:flex;align-items:center;gap:6px;padding:8px 9px;cursor:pointer;list-style:none;min-width:0}
.sl-unit summary::-webkit-details-marker{display:none}
.sl-unit summary::before{content:"›";flex:none;width:10px;color:var(--sl-text2);font-size:14px;line-height:1;transition:transform .12s ease}
.sl-unit[open] summary::before{transform:rotate(90deg)}
.sl-unit-type{flex:none;padding:0 5px;border-radius:4px;background:color-mix(in srgb,var(--sl-accent) 13%,transparent);color:color-mix(in srgb,var(--sl-accent) 82%,var(--sl-text));font-size:9px}
.sl-unit-title{flex:1;min-width:0;font-size:11.5px;font-weight:600;line-height:1.45;word-break:break-word}
.sl-unit-pages{flex:none;color:var(--sl-text2);font-size:9px;white-space:nowrap}
.sl-unit-status{flex:none;font-size:9px;color:var(--sl-text2)}
.sl-unit-status.is-author_stated,.sl-unit-status.is-model_inference{color:var(--sl-warn)}
.sl-unit-body{padding:8px 10px 10px;border-top:1px solid var(--sl-border);display:flex;flex-direction:column;gap:6px}
.sl-unit-pages-nav{display:flex;align-items:center;gap:5px;flex-wrap:wrap;color:var(--sl-text2);font-size:9.5px}
.sl-unit-field{margin:0;font-size:11px;line-height:1.65;color:var(--sl-text2)}
.sl-unit-field strong,.sl-unit-interp strong,.sl-unit-limits strong{color:var(--sl-text);font-size:10.5px}
.sl-unit-interp{padding:7px 9px;border-left:2px solid var(--sl-accent);border-radius:0 6px 6px 0;background:color-mix(in srgb,var(--sl-accent) 6%,var(--sl-layer))}
.sl-unit-interp p{margin:3px 0 0;font-size:11px;line-height:1.7}
.sl-unit-figs{margin:0;font-size:10px;color:var(--sl-text2)}
.sl-unit-limits ul{margin:3px 0 0;padding-left:1.2em;font-size:10.5px;line-height:1.6;color:var(--sl-text2)}
.sl-unit-sources{margin-top:2px;border-top:1px dashed var(--sl-border);padding-top:5px}
.sl-unit-sources > summary{cursor:pointer;color:var(--sl-text2);font-size:10.5px;font-weight:600;padding:2px 0}
.sl-src{margin-top:7px;padding:8px;border:1px solid var(--sl-border);border-radius:7px;background:var(--sl-bg)}
.sl-src-head{display:flex;align-items:center;gap:5px;flex-wrap:wrap}
.sl-src-page{color:var(--sl-accent);font-size:9px;font-weight:600}
.sl-src-id{font-family:var(--dsw-font-family-mono,ui-monospace,monospace);color:var(--sl-text2);font-size:9px}
.sl-src-kind{padding:0 4px;border-radius:3px;background:var(--sl-layer2);color:var(--sl-text2);font-size:8.5px}
.sl-src-jump{margin-left:auto;padding:1px 6px;border:1px solid color-mix(in srgb,var(--sl-accent) 40%,var(--sl-border));border-radius:4px;background:color-mix(in srgb,var(--sl-accent) 8%,transparent);color:var(--sl-accent);font-size:9.5px;cursor:pointer}
.sl-src-jump:hover{text-decoration:underline}
.sl-src-title{margin-top:3px;font-size:11px;font-weight:600;line-height:1.45}
.sl-src-line{margin:4px 0 0;font-size:10.5px;line-height:1.65;color:var(--sl-text2)}
.sl-src-line strong{color:var(--sl-text)}
.sl-src-limits{margin:4px 0 0;padding-left:1.2em;font-size:10px;line-height:1.55;color:var(--sl-text2)}
.sl-src-quote{margin:6px 0 0;padding:6px 8px;border-left:2px solid var(--sl-border2);background:var(--sl-layer);font-size:10.3px;line-height:1.65;color:var(--sl-text2);max-height:190px;overflow:auto}
.sl-src-original{margin-top:6px;padding:6px 8px;border:1px solid var(--sl-border);border-radius:6px;background:var(--sl-layer)}
.sl-src-original .sl-src-quote{margin:0}
.sl-src-reading{margin-top:6px;padding:6px 8px;border-left:2px solid var(--sl-accent);border-radius:0 6px 6px 0;background:color-mix(in srgb,var(--sl-accent) 5%,var(--sl-layer))}
.sl-src-label{margin-bottom:3px;color:var(--sl-text2);font-size:8.5px;font-weight:600;letter-spacing:.4px;text-transform:uppercase}
.sl-src-original .sl-src-label{color:var(--sl-success)}
.sl-src-reading .sl-src-label{color:var(--sl-accent)}
.sl-src-empty{margin:0;color:var(--sl-text2);font-size:10px}
.sl-pdf-open{padding:2px 0;border:0;background:transparent;color:var(--sl-accent);font-size:11px;text-decoration:underline;cursor:pointer}
.sl-src-verified{margin-top:5px;color:var(--sl-text2);font-size:9px}
.sl-memory{display:flex;flex-direction:column;gap:9px;padding:12px 14px 24px}
.sl-memory-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
.sl-memory-head strong{font-size:13px;margin-right:6px}
.sl-memory-head .sl-muted{display:block;margin-top:2px;font-size:9.5px}
.sl-memory-error{padding:7px 9px;border:1px solid color-mix(in srgb,var(--sl-danger) 40%,var(--sl-border));border-radius:7px;background:color-mix(in srgb,var(--sl-danger) 7%,transparent);color:var(--sl-danger);font-size:10.5px}
.sl-memory-add{display:flex;flex-direction:column;gap:7px;padding:9px;border:1px solid var(--sl-border);border-radius:9px;background:var(--sl-layer)}
.sl-memory-add-row{display:flex;align-items:center;justify-content:space-between;gap:8px}
.sl-memory-scope{display:flex;align-items:center;gap:5px;color:var(--sl-text2);font-size:10px}
.sl-memory-scope input{accent-color:var(--sl-accent)}
.sl-memory-input{width:100%;min-height:58px;resize:vertical;padding:7px 8px;border:1px solid var(--sl-border);border-radius:7px;background:var(--sl-bg);color:var(--sl-text);font:inherit;font-size:11.5px;line-height:1.6;outline:none}
.sl-memory-input:focus{border-color:color-mix(in srgb,var(--sl-accent) 50%,var(--sl-border))}
.sl-memory-add-foot{display:flex;align-items:center;justify-content:space-between}
.sl-memory-section-title{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-top:4px}
.sl-memory-section-title strong{font-size:12px}
.sl-memory-section-title .sl-muted{font-size:9.5px}
.sl-memory-list,.sl-memory-excerpts{display:flex;flex-direction:column;gap:6px}
.sl-memory-item,.sl-memory-excerpt{padding:8px 9px;border:1px solid var(--sl-border);border-radius:8px;background:var(--sl-layer)}
.sl-memory-meta{display:flex;align-items:center;gap:5px;flex-wrap:wrap}
.sl-memory-kind{padding:0 5px;border-radius:4px;background:color-mix(in srgb,var(--sl-accent) 12%,transparent);color:color-mix(in srgb,var(--sl-accent) 82%,var(--sl-text));font-size:9px}
.sl-memory-scope-tag{padding:0 5px;border-radius:4px;background:var(--sl-layer2);color:var(--sl-text2);font-size:9px}
.sl-memory-slot{color:var(--sl-text2);font-size:9px}
.sl-memory-content{margin:5px 0 3px;font-size:11.5px;line-height:1.65;white-space:pre-wrap;word-break:break-word}
.sl-textbtn{padding:1px 0;border:0;background:transparent;color:var(--sl-accent);font-size:9.5px;cursor:pointer}
.sl-textbtn:hover{text-decoration:underline}
.sl-memory-excerpt blockquote{margin:5px 0 3px;padding-left:8px;border-left:2px solid var(--sl-border2);color:var(--sl-text2);font-size:10.5px;line-height:1.6;max-height:120px;overflow:auto}
.sl-notes{display:flex;flex-direction:column;height:100%;min-height:0;padding:16px 20px}
.sl-notes-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}
.sl-notes-head strong{font-size:13px;margin-right:8px}
.sl-notes-head .sl-muted{font-size:11px}
.sl-notes-actions{display:flex;align-items:center;gap:9px}
.sl-saved{display:flex;align-items:center;gap:4px;color:var(--sl-success);font-size:11px}
.sl-note-area{flex:1;min-height:180px;resize:none;padding:12px 14px;border:1px solid var(--sl-border);border-radius:9px;background:var(--sl-layer);color:var(--sl-text);font:inherit;font-size:13px;line-height:1.8;outline:none}
.sl-note-area:focus{border-color:color-mix(in srgb,var(--sl-accent) 55%,var(--sl-border))}
.sl-note-foot{display:flex;justify-content:space-between;padding-top:6px;color:var(--sl-text2);font-size:10.5px}
.sl-chat{display:flex;flex-direction:column;min-height:0;border-left:1px solid var(--sl-border);background:color-mix(in srgb,var(--sl-layer) 72%,var(--sl-bg));z-index:4}
.sl-chat.is-embedded{width:auto;height:100%;min-height:0;border:0;background:transparent;z-index:auto}
.sl-chat.is-embedded .sl-chat-head{display:none}
.sl-chat-head{flex:none;display:flex;align-items:center;justify-content:space-between;gap:8px;height:44px;padding:0 12px;border-bottom:1px solid var(--sl-border)}
.sl-chat-title{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:600;min-width:0}
.sl-chat-title svg{color:var(--sl-accent)}
.sl-chat-doc{font-family:var(--dsw-font-family-mono,ui-monospace,monospace);font-size:9.5px;font-weight:400;color:var(--sl-text2);padding:1px 5px;border-radius:4px;background:var(--sl-layer2)}
.sl-chat-body{flex:1;min-height:0;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:11px;scrollbar-width:thin}
.sl-chat-empty{margin:26px 4px auto;text-align:center;color:var(--sl-text2)}
.sl-chat-empty-title{color:var(--sl-text);font-size:13px;font-weight:600;margin-bottom:5px}
.sl-chat-empty p{font-size:11.5px;line-height:1.6;margin:0 auto 12px;max-width:280px}
.sl-suggestions{display:flex;flex-direction:column;gap:6px}
.sl-suggestion{padding:7px 9px;border:1px solid var(--sl-border);border-radius:7px;background:var(--sl-bg);color:var(--sl-text);font-size:11px;text-align:left;cursor:pointer}
.sl-suggestion:hover{border-color:color-mix(in srgb,var(--sl-accent) 45%,var(--sl-border))}
.sl-msg{display:flex;flex-direction:column;max-width:100%}
.sl-msg.is-user{align-items:flex-end}
.sl-msg-user{padding:8px 11px;border-radius:10px 10px 3px 10px;background:color-mix(in srgb,var(--sl-accent) 20%,var(--sl-layer2));font-size:12px;line-height:1.6;white-space:pre-wrap;max-width:92%}
.sl-msg.is-assistant .sl-answer{padding:9px 11px;border:1px solid var(--sl-border);border-radius:10px 10px 10px 3px;background:var(--sl-layer);font-size:12px;line-height:1.7}
.sl-answer p{margin:0 0 6px}
.sl-answer-head{margin-top:10px !important;font-weight:650;color:var(--sl-text);font-size:12.5px}
.sl-answer-item{padding-left:12px;text-indent:-10px;color:var(--sl-text)}
.sl-page-cite{font-variant-numeric:tabular-nums}
.sl-answer p:last-child{margin-bottom:0}
.sl-cite{display:inline-flex;align-items:center;margin:0 1px;padding:0 4px;border:1px solid color-mix(in srgb,var(--sl-accent) 40%,var(--sl-border));border-radius:4px;background:color-mix(in srgb,var(--sl-accent) 10%,transparent);color:var(--sl-accent);font-size:9.5px;line-height:15px;cursor:pointer;vertical-align:1px}
.sl-evidence{margin-top:8px;border-top:1px dashed var(--sl-border);padding-top:6px}
.sl-evidence summary{cursor:pointer;color:var(--sl-text2);font-size:10.5px}
.sl-evidence-list{display:flex;flex-direction:column;gap:5px;margin-top:6px}
.sl-evidence-row{display:grid;grid-template-columns:34px 46px minmax(0,1fr);gap:6px;padding:4px 0;border:0;background:transparent;text-align:left;cursor:pointer;color:var(--sl-text2);font-size:10px}
.sl-evidence-row:hover{color:var(--sl-text)}
.sl-evidence-id{color:var(--sl-accent)}
.sl-evidence-quote{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sl-answer-basis{margin-top:6px;padding-top:5px;border-top:1px solid var(--sl-border);color:var(--sl-text2);font-size:9.5px}
.sl-msg-error{display:flex;gap:6px;padding:8px 10px;border:1px solid color-mix(in srgb,var(--sl-danger) 40%,var(--sl-border));border-radius:8px;background:color-mix(in srgb,var(--sl-danger) 8%,transparent);color:var(--sl-danger);font-size:11.5px;line-height:1.5}
.sl-thinking{display:flex;align-items:center;gap:7px;color:var(--sl-text2);font-size:11.5px;padding:7px 2px}
.sl-thinking-dot{width:7px;height:7px;border-radius:50%;background:var(--sl-accent);animation:sl-pulse 1.1s ease-in-out infinite}
@keyframes sl-pulse{0%,100%{opacity:.25;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}
.sl-composer{flex:none;padding:8px 10px 10px;border-top:1px solid var(--sl-border);background:var(--sl-layer)}
.sl-composer-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}
.sl-select-mini{height:25px;font-size:10.5px}
.sl-composer-hint{color:var(--sl-text2);font-size:9.5px;white-space:nowrap}
.sl-composer-box{position:relative;display:flex;align-items:flex-end;gap:6px;padding:7px 7px 7px 9px;border:1px solid var(--sl-border);border-radius:9px;background:var(--sl-bg)}
.sl-composer-box:focus-within{border-color:color-mix(in srgb,var(--sl-accent) 50%,var(--sl-border))}
.sl-composer-box textarea{flex:1;min-height:42px;max-height:130px;resize:none;border:0;background:transparent;color:var(--sl-text);font:inherit;font-size:12px;line-height:1.55;outline:none}
.sl-send{flex:none;display:grid;place-items:center;width:30px;height:30px;border:0;border-radius:8px;background:var(--sl-accent);color:#fff;cursor:pointer}
.sl-send:disabled{opacity:.35;cursor:default}
.sl-welcome{height:100%;overflow:auto;padding:34px 30px 40px;display:flex;flex-direction:column;gap:22px;max-width:1000px;margin:0 auto;width:100%}
.sl-welcome-brand{display:flex;align-items:center;gap:14px}
.sl-mark{display:grid;place-items:center;width:52px;height:52px;border-radius:14px;background:linear-gradient(145deg,color-mix(in srgb,var(--sl-accent) 26%,transparent),color-mix(in srgb,var(--sl-accent) 5%,transparent));border:1px solid color-mix(in srgb,var(--sl-accent) 34%,transparent);color:var(--sl-accent);flex:none}
.sl-welcome-brand h1{margin:0;font-size:21px;letter-spacing:.2px}
.sl-welcome-brand p{margin:3px 0 0;color:var(--sl-text2);font-size:12.5px}
.sl-stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.sl-stat{padding:11px 13px;border:1px solid var(--sl-border);border-radius:10px;background:var(--sl-layer)}
.sl-stat-value{font-size:22px;font-weight:650;line-height:1.15}
.sl-stat-label{font-size:11px;margin-top:2px}
.sl-stat-hint{font-size:9.5px;color:var(--sl-text2)}
.sl-welcome-recent-head{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px}
.sl-welcome-recent-head span{color:var(--sl-text2);font-size:10.5px}
.sl-recent-list{display:flex;flex-direction:column;gap:3px}
.sl-recent{display:flex;align-items:center;gap:8px;padding:7px 9px;border:1px solid transparent;border-radius:7px;background:transparent;text-align:left;cursor:pointer;color:var(--sl-text)}
.sl-recent:hover{background:var(--sl-layer2);border-color:var(--sl-border)}
.sl-recent-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}
.sl-recent-meta{color:var(--sl-text2);font-size:10.5px;white-space:nowrap}
.sl-welcome-foot{display:flex;align-items:center;gap:10px;padding-top:4px}
.sl-empty{display:flex;flex-direction:column;align-items:center;text-align:center;gap:7px;padding:26px 18px;color:var(--sl-text2)}
.sl-empty-icon{display:grid;place-items:center;width:48px;height:48px;border-radius:12px;background:var(--sl-layer2);color:var(--sl-text2)}
.sl-empty-title{color:var(--sl-text);font-size:12.5px;font-weight:600}
.sl-empty-body{font-size:11px;line-height:1.6;max-width:300px}
.sl-btn{display:inline-flex;align-items:center;justify-content:center;gap:5px;height:29px;padding:0 10px;border:1px solid var(--sl-border);border-radius:7px;background:var(--sl-layer);color:var(--sl-text);font-size:11.5px;cursor:pointer;text-decoration:none;white-space:nowrap}
.sl-btn:hover{border-color:var(--sl-border2)}
.sl-btn:disabled{opacity:.5;cursor:default}
.sl-btn-primary{background:var(--sl-accent);border-color:var(--sl-accent);color:#fff}
.sl-btn-ghost{background:transparent}
.sl-iconbtn{display:grid;place-items:center;width:28px;height:28px;border:1px solid transparent;border-radius:7px;background:transparent;color:var(--sl-text2);cursor:pointer}
.sl-iconbtn:hover{background:var(--sl-layer2);color:var(--sl-text)}
.sl-iconbtn.is-active{background:color-mix(in srgb,var(--sl-accent) 14%,transparent);color:var(--sl-accent)}
.sl-iconbtn:disabled{opacity:.4;cursor:default}
.sl-badge{display:inline-flex;align-items:center;padding:0 6px;height:17px;border-radius:4px;border:1px solid color-mix(in srgb,var(--sl-accent) 26%,var(--sl-border));background:color-mix(in srgb,var(--sl-accent) 8%,transparent);color:color-mix(in srgb,var(--sl-accent) 78%,var(--sl-text));font-size:9.5px}
.sl-badge-muted{border-color:var(--sl-border);background:var(--sl-layer2);color:var(--sl-text2)}
.sl-badge-success{border-color:color-mix(in srgb,var(--sl-success) 40%,var(--sl-border));background:color-mix(in srgb,var(--sl-success) 10%,transparent);color:var(--sl-success)}
.sl-badge-warn{border-color:color-mix(in srgb,var(--sl-warn) 40%,var(--sl-border));background:color-mix(in srgb,var(--sl-warn) 10%,transparent);color:var(--sl-warn)}
.sl-spinner{display:flex;align-items:center;justify-content:center;gap:7px;color:var(--sl-text2);font-size:11.5px}
.sl-spinner-dot{width:11px;height:11px;border-radius:50%;border:2px solid color-mix(in srgb,var(--sl-accent) 25%,transparent);border-top-color:var(--sl-accent);animation:sl-spin .8s linear infinite}
@keyframes sl-spin{to{transform:rotate(360deg)}}
.sl-toast{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);z-index:20;padding:7px 13px;border:1px solid var(--sl-border2);border-radius:8px;background:var(--sl-overlay);color:var(--sl-text);font-size:11.5px;box-shadow:0 8px 28px rgba(0,0,0,.28);animation:sl-toast-in .18s ease-out}
.sl-toast.is-error{border-color:color-mix(in srgb,var(--sl-danger) 50%,var(--sl-border));color:var(--sl-danger)}
@keyframes sl-toast-in{from{opacity:0;transform:translate(-50%,6px)}to{opacity:1;transform:translate(-50%,0)}}
.sl-backdrop{display:none}
.sl-panel-icon{display:grid;place-items:center;color:currentColor}
.sl-panel-icon.is-active{color:var(--dsw-alias-brand-primary,#7b9cff)}
.sl-connect{display:grid;place-items:center;padding:24px;background:radial-gradient(900px 500px at 30% 10%,color-mix(in srgb,var(--dsw-alias-brand-primary,#7b9cff) 7%,transparent),transparent),var(--dsw-alias-bg-base,#0f1115)}
.sl-connect-card{width:min(440px,100%);display:flex;flex-direction:column;align-items:flex-start;gap:10px;padding:26px;border:1px solid var(--dsw-alias-border-l1,rgba(140,146,160,.2));border-radius:14px;background:var(--dsw-alias-bg-layer-1,#17191d);box-shadow:0 24px 70px rgba(0,0,0,.24)}
.sl-connect-card h1{margin:4px 0 0;font-size:19px}
.sl-connect-card p{margin:0;font-size:12px;color:var(--dsw-alias-label-secondary,#9ba0aa);line-height:1.6}
.sl-connect-error{width:100%;padding:8px 10px;border:1px solid color-mix(in srgb,var(--sl-danger) 40%,var(--sl-border));border-radius:7px;background:color-mix(in srgb,var(--sl-danger) 7%,transparent);color:var(--sl-danger);font-size:11.5px}
.sl-connect-actions{display:flex;gap:8px;margin-top:4px}
.sl-connect-note{font-size:10.5px !important;color:var(--dsw-alias-label-secondary,#9ba0aa) !important}
.sl-only-narrow{display:inline-flex}
.sl-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.3);z-index:2}
.sl-library.is-drawer{position:absolute;top:0;left:0;bottom:0;width:min(330px,92%);border-right:1px solid var(--sl-border2);background:var(--sl-layer);box-shadow:18px 0 50px rgba(0,0,0,.3);transform:translateX(-102%);transition:transform .18s ease;z-index:5}
.sl-library.is-drawer[data-open="true"]{transform:none}
@container sl (max-width:900px){
.sl-interp-hint{display:none}
.sl-split{flex-direction:column}
.sl-interp{width:auto;max-width:none;height:46%;border-right:0;border-bottom:1px solid var(--sl-border)}
.sl-pdf-pane{height:54%}
}
@container sl (max-width:760px){
.sl-top-stats{display:none}
.sl-doc-head{padding:12px 14px 0}
.sl-overview,.sl-deep{padding:14px 14px 24px}
.sl-doc-toolbar{overflow:auto}
.sl-doc-tools{display:none}
.sl-stat-grid{grid-template-columns:repeat(2,1fr)}
.sl-welcome{padding:22px 16px 30px}
}
@container sl (max-width:520px){
.sl-brand-text span{display:none}
.sl-top{padding:0 10px;gap:8px}
.sl-top-actions .sl-btn span{display:none}
.sl-doc-title{font-size:15px}
.sl-doc-actions{display:none}
}`;

    exports.apply = apply;
    exports.inject = ["slots", "layout"];
    return module.exports;
  },
});
