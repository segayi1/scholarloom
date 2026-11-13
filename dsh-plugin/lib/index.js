/**
 * dsh-scholarloom — host half.
 *
 * Bridges the loopback-only ScholarLoom server (default http://127.0.0.1:8766)
 * into the DeepSeek Harness host process:
 *   • a narrow, same-origin JSON proxy for the workbench panel
 *   • a PDF range proxy so the panel can read inside the DSH window
 *   • four agent tools that read the local library and ask page-grounded questions
 *
 * The ScholarLoom server stays the source of truth. This plugin owns no
 * bibliographic state and never writes to the library beyond the reading
 * status/note field the user edits in the panel.
 */
import z from "@deepseek-ai/schemastery";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";

export const name = "scholarloom";

export const inject = ["webServer", "tools"];

export const Config = z.object({
  baseUrl: z.string().default("http://127.0.0.1:8766"),
  projectDir: z.string().default(""),
  pythonPath: z.string().default(""),
  autoStart: z.boolean().default(false),
  requestTimeoutMs: z.number().default(60000),
});

const DEFAULT_ASK_TIMEOUT_MS = 180000;
const MAX_BODY_BYTES = 1024 * 1024;
const KEY_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;

const PRESET_FALLBACK = [
  ["methodology", "方法与证据审查", "Methods and evidence audit"],
  ["negative", "阴性结果与边界", "Negative results and limits"],
  ["mechanism", "核心创新与机制", "Core contribution and mechanism"],
  ["translation", "转化前景评估", "Translational assessment"],
  ["conflict", "跨篇仲裁与矛盾", "Cross-paper arbitration"],
  ["summary", "结构化速读卡", "Structured reading card"],
];

function trimBase(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function text(value, limit = 4000) {
  const raw = typeof value === "string" ? value : value == null ? "" : String(value);
  return raw.length > limit ? `${raw.slice(0, limit)}…` : raw;
}

function shortAuthors(value, max = 3) {
  const parts = String(value || "")
    .split(/[;；]/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (!parts.length) return "";
  if (parts.length <= max) return parts.join("; ");
  return `${parts.slice(0, max).join("; ")} 等`;
}
function briefDoc(row) {
  return {
    key: row.key,
    title: text(row.title, 500),
    zhTitle: text(row.zhTitle || row.title, 500),
    authors: text(row.authors, 300),
    year: text(row.year, 12),
    source: text(row.source, 200),
    identifier: text(row.identifier, 200),
    category: text(row.category, 120),
    studyType: text(row.studyType, 80),
    keywords: Array.isArray(row.keywords) ? row.keywords.slice(0, 8).map((item) => text(item, 60)) : [],
    readingStatus: ["unread", "reading", "read"].includes(row.readingStatus) ? row.readingStatus : "unread",
    hasPDF: Boolean(row.hasPDF),
  };
}

function cardDoc(row) {
  return {
    ...briefDoc(row),
    subtopics: Array.isArray(row.subtopics) ? row.subtopics.slice(0, 12).map((item) => text(item, 80)) : [],
    oneSentence: text(row.oneSentence, 2000),
    question: text(row.question, 3000),
    method: text(row.method, 5000),
    findings: Array.isArray(row.findings) ? row.findings.slice(0, 20).map((item) => text(item, 2000)) : [],
    useCase: text(row.useCase, 2000),
    limitations: text(row.limitations, 3000),
    kind: text(row.kind, 80),
    basis: text(row.basis, 300),
    sourceURL: text(row.sourceURL, 1000),
    related: Array.isArray(row.related) ? row.related.slice(0, 30) : [],
    readingNote: text(row.readingNote, 4000),
    hasDossier: Boolean(row.hasDossier),
    addedAt: Number(row.addedAt) || 0,
  };
}

function createStore() {
  return { docs: [], loadedAt: 0, loading: null, csrf: "", source: "", stats: null };
}

export function apply(ctx, config, runtime = {}) {
  const log = runtime.logger || ctx.logger || console;
  const baseUrl = trimBase(config.baseUrl) || "http://127.0.0.1:8766";
  const projectDir = String(config.projectDir || "").trim();
  const autoStart = config.autoStart === true;
  const requestTimeoutMs = Number(config.requestTimeoutMs) > 0 ? Number(config.requestTimeoutMs) : 60000;
  const cache = createStore();
  let child = null;
  let starting = null;
  let disposed = false;

  function upstreamUrl(pathname) {
    const suffix = baseUrl.endsWith("/") ? "" : "/";
    return new URL(String(pathname).replace(/^\/+/, ""), `${baseUrl}${suffix}`);
  }

  // Deliberately node:http rather than fetch: the host runs Node 24.21 with
  // undici 7.29, whose parser asserts `!this.paused` when a response body is
  // abandoned and the peer closes the connection (undici#5360). One such
  // request kills the whole DSH host, so every response here is either read to
  // the end or destroyed deterministically.
  function requestJson(pathname, options = {}) {
    const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : requestTimeoutMs;
    const url = upstreamUrl(pathname);
    const transport = url.protocol === "https:" ? https : http;
    const method = options.method || "GET";
    const headers = { ...(options.headers || {}) };
    const body = options.body == null ? null : String(options.body);
    if (body != null) headers["content-length"] = String(Buffer.byteLength(body));
    const signal = options.signal;

    return new Promise((resolve, reject) => {
      let settled = false;
      let timer = null;
      let request = null;

      const cleanup = () => {
        if (timer) clearTimeout(timer);
        if (signal) signal.removeEventListener("abort", onAbort);
      };
      const fail = (error) => {
        if (settled) return;
        settled = true;
        cleanup();
        if (request && !request.destroyed) request.destroy();
        reject(error);
      };
      const onAbort = () => {
        const error = new Error("ScholarLoom 请求超时。");
        error.name = "AbortError";
        fail(error);
      };

      request = transport.request(url, { method, headers }, (response) => {
        const chunks = [];
        let size = 0;
        response.on("data", (chunk) => {
          size += chunk.length;
          if (size > 64 * 1024 * 1024) {
            fail(new Error("ScholarLoom 响应过大。"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("error", fail);
        response.on("aborted", () => fail(new Error("ScholarLoom 连接已中断。")));
        response.on("end", () => {
          if (settled) return;
          settled = true;
          cleanup();
          const raw = Buffer.concat(chunks).toString("utf8");
          let data = null;
          if (raw) {
            try {
              data = JSON.parse(raw);
            } catch {
              data = null;
            }
          }
          const status = Number(response.statusCode) || 0;
          if (status < 200 || status >= 300) {
            const message =
              data && typeof data.error === "string"
                ? data.error
                : data && typeof data.message === "string"
                  ? data.message
                  : `ScholarLoom HTTP ${status}`;
            const error = new Error(message);
            error.status = status;
            reject(error);
            return;
          }
          resolve(data);
        });
      });
      request.on("error", (error) => fail(error.name === "AbortError" ? error : new Error(`ScholarLoom 连接失败：${error.message}`)));
      timer = setTimeout(onAbort, timeoutMs);
      if (signal) {
        if (signal.aborted) {
          onAbort();
          return;
        }
        signal.addEventListener("abort", onAbort, { once: true });
      }
      if (body != null) request.write(body);
      request.end();
    });
  }

  async function ping() {
    try {
      const data = await requestJson("/api/health", { timeoutMs: 1500 });
      return Boolean(data && data.ok && data.app === "scholarloom");
    } catch {
      return false;
    }
  }

  function resolvePython() {
    const configured = String(config.pythonPath || "").trim();
    if (configured) return configured;
    if (projectDir) {
      const venv = path.join(projectDir, ".venv", process.platform === "win32" ? "Scripts" : "bin", process.platform === "win32" ? "python.exe" : "python");
      if (existsSync(venv)) return venv;
      const server = path.join(projectDir, "server.py");
      if (existsSync(server)) return process.platform === "win32" ? "python" : "python3";
    }
    return process.platform === "win32" ? "python" : "python3";
  }

  async function ensureServer() {
    if (await ping()) return true;
    if (!autoStart || !projectDir || !existsSync(path.join(projectDir, "server.py"))) return false;
    if (starting) return starting;
    starting = (async () => {
      if (disposed) return false;
      try {
        const serverUrl = new URL(baseUrl);
        const port = serverUrl.port || (serverUrl.protocol === "https:" ? "443" : "80");
        child = spawn(resolvePython(), ["server.py", "--port", port], {
          cwd: projectDir,
          windowsHide: true,
          detached: true,
          stdio: "ignore",
          env: { ...process.env, PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8" },
        });
        child.unref();
        child.on("exit", () => {
          child = null;
        });
        child.on("error", (error) => {
          log.warn?.(`dsh-scholarloom: cannot start ScholarLoom: ${error.message}`);
        });
      } catch (error) {
        log.warn?.(`dsh-scholarloom: cannot start ScholarLoom: ${error.message}`);
        return false;
      }
      for (let attempt = 0; attempt < 50 && !disposed; attempt += 1) {
        await sleep(500);
        if (await ping()) {
          cache.loadedAt = 0;
          return true;
        }
      }
      return false;
    })().finally(() => {
      starting = null;
    });
    return starting;
  }

  async function loadState(force = false, signal) {
    const now = Date.now();
    if (!force && cache.docs.length && now - cache.loadedAt < 5000) return cache;
    if (cache.loading) return cache.loading;
    cache.loading = (async () => {
      const data = await requestJson("/api/state", { timeoutMs: Math.max(requestTimeoutMs, 15000), signal });
      const documents = Array.isArray(data?.documents) ? data.documents : [];
      cache.docs = documents;
      cache.csrf = typeof data?.csrf === "string" ? data.csrf : "";
      cache.source = "live";
      cache.loadedAt = Date.now();
      cache.jobs = Array.isArray(data?.jobs) ? data.jobs : [];
      cache.health = data?.health || {};
      cache.settings = data?.settings || {};
      cache.presets = data?.settings?.prompt_presets || {};
      cache.stats = buildStats(documents, cache.jobs);
      return cache;
    })().finally(() => {
      cache.loading = null;
    });
    return cache.loading;
  }

  async function postApi(endpoint, payload, options = {}) {
    let state = await loadState(false, options.signal);
    const send = () =>
      requestJson(`/api/${endpoint}`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-workbench-token": state.csrf },
        body: JSON.stringify(payload),
        timeoutMs: options.timeoutMs,
        signal: options.signal,
      });
    try {
      return await send();
    } catch (error) {
      if (error.status !== 403) throw error;
      state = await loadState(true, options.signal);
      return send();
    }
  }

  function buildStats(documents, jobs) {
    const counts = { total: documents.length, unread: 0, reading: 0, read: 0, withPDF: 0, withDossier: 0 };
    const categories = new Map();
    for (const row of documents) {
      const status = ["unread", "reading", "read"].includes(row.readingStatus) ? row.readingStatus : "unread";
      counts[status] += 1;
      if (row.hasPDF) counts.withPDF += 1;
      if (row.hasDossier) counts.withDossier += 1;
      const category = String(row.category || "未分类");
      categories.set(category, (categories.get(category) || 0) + 1);
    }
    const review = Array.isArray(jobs) ? jobs.filter((job) => job.status === "review").length : 0;
    return {
      ...counts,
      review,
      categories: [...categories.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
    };
  }

  function normalizeDoc(row) {
    return {
      ...cardDoc(row),
      readingNote: text(row.readingNote, 4000),
    };
  }

  function scoreDoc(row, terms) {
    const haystack = [
      row.title,
      row.zhTitle,
      row.authors,
      row.identifier,
      row.category,
      row.studyType,
      row.source,
      row.oneSentence,
      ...(Array.isArray(row.keywords) ? row.keywords : []),
      ...(Array.isArray(row.subtopics) ? row.subtopics : []),
    ]
      .filter(Boolean)
      .join("\n")
      .toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (!haystack.includes(term)) return -1;
      if (String(row.zhTitle || row.title || "").toLowerCase().includes(term)) score += 4;
      if (String(row.title || "").toLowerCase().includes(term)) score += 3;
      if (String(row.authors || "").toLowerCase().includes(term)) score += 2;
      score += 1;
    }
    return score;
  }

  function queryDocs(input = {}) {
    const query = String(input.query || "").trim().toLowerCase();
    const terms = query.split(/\s+/).filter(Boolean).slice(0, 8);
    const category = String(input.category || "").trim();
    const status = String(input.status || "").trim();
    const withPdf = input.hasPDF === true;
    const limit = Math.min(Math.max(Number(input.limit) || 40, 1), 200);
    let rows = cache.docs.filter((row) => {
      if (category && String(row.category || "") !== category) return false;
      if (status && String(row.readingStatus || "unread") !== status) return false;
      if (withPdf && !row.hasPDF) return false;
      return true;
    });
    if (terms.length) {
      rows = rows
        .map((row) => ({ row, score: scoreDoc(row, terms) }))
        .filter((item) => item.score >= 0)
        .sort((a, b) => b.score - a.score || (Number(b.row.addedAt) || 0) - (Number(a.row.addedAt) || 0))
        .map((item) => item.row);
    } else {
      rows = rows.sort((a, b) => (Number(b.addedAt) || 0) - (Number(a.addedAt) || 0));
    }
    return { total: rows.length, items: rows.slice(0, limit) };
  }

  function findByKey(key) {
    return cache.docs.find((row) => row.key === key) || null;
  }

  async function resolveDoc(input) {
    if (!cache.docs.length) await loadState(true);
    const key = String(input.key || "").trim();
    if (key) {
      const found = findByKey(key);
      if (!found) throw new Error(`ScholarLoom 中找不到文献 ${key}。`);
      return found;
    }
    const query = String(input.query || "").trim();
    if (!query) throw new Error("请提供文献 key 或检索词。");
    const result = queryDocs({ query, limit: 5 });
    if (!result.items.length) throw new Error(`没有匹配“${query}”的文献。`);
    return result.items[0];
  }

  function presetList() {
    const presets = cache.presets || {};
    const result = [];
    for (const [id, fallbackZh, fallbackEn] of PRESET_FALLBACK) {
      const preset = presets[id] || {};
      result.push({ id, zh: text(preset.name_zh || fallbackZh, 80), en: text(preset.name_en || fallbackEn, 80) });
    }
    return result;
  }

  function publicJobs(jobs) {
    return (jobs || [])
      .filter((job) => job.status === "review" || job.status === "queued" || job.status === "processing")
      .slice(0, 40)
      .map((job) => ({
        id: job.id,
        name: text(job.name || job.path, 200),
        status: text(job.status, 40),
        reason: text(job.reason, 400),
        title: text(job.title, 300),
        canConfirm: Boolean(job.canConfirm),
      }));
  }

  function publicLibrary(stats) {
    return {
      connected: true,
      baseUrl,
      language: cache.settings?.ui_language === "en" ? "en" : "zh",
      stats,
      presets: presetList(),
      jobs: publicJobs(cache.jobs),
      health: {
        model: Boolean(cache.health?.model),
        watcher: Boolean(cache.health?.watcher),
        zotero: Boolean(cache.health?.zotero),
        fullReadActive: Number(cache.health?.fullReadActive) || 0,
        summary: cache.health?.summary || null,
      },
      documents: cache.docs.map(normalizeDoc),
    };
  }

  function writeJson(res, status, value) {
    const body = Buffer.from(JSON.stringify(value), "utf8");
    res.writeHead(status, {
      "content-type": "application/json; charset=utf-8",
      "content-length": String(body.length),
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    });
    res.end(body);
  }

  function sameOrigin(req) {
    const origin = req.headers.origin;
    const host = req.headers.host;
    if (!origin) return true;
    try {
      const parsed = new URL(origin);
      if (host && parsed.host === host) return true;
      return parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost" || parsed.hostname === "::1";
    } catch {
      return false;
    }
  }

  async function readBody(req) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) throw new Error("请求体超过 1 MB 限制。");
      chunks.push(chunk);
    }
    if (!chunks.length) return {};
    const raw = Buffer.concat(chunks).toString("utf8");
    const value = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function pathKey(pathname, prefix) {
    const raw = pathname.slice(prefix.length);
    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      return "";
    }
    return KEY_PATTERN.test(decoded) ? decoded : "";
  }

  function proxyPdf(key, req, res) {
    // Node's fetch (undici 7.29 on Node 24.21) asserts `!this.paused` from the
    // response socket "end" handler. A PDF stream that the browser abandons
    // (panel reload, tab close, page change) leaves the response body paused,
    // and that assertion is uncatchable: it kills the whole DSH host process.
    // node:http owns the socket directly and can cancel it on res.close.
    const suffix = baseUrl.endsWith("/") ? "" : "/";
    const url = new URL(`api/document/${encodeURIComponent(key)}/pdf`, `${baseUrl}${suffix}`);
    const transport = url.protocol === "https:" ? https : http;
    const headers = {};
    if (req.headers.range) headers.range = String(req.headers.range);

    let settled = false;
    const settle = (error) => {
      if (settled) return;
      settled = true;
      if (error && !res.headersSent && !res.destroyed) {
        const body = Buffer.from(JSON.stringify({ error: `PDF 读取失败：${error.message}` }), "utf8");
        res.writeHead(502, { "content-type": "application/json; charset=utf-8", "content-length": String(body.length) });
        res.end(body);
      } else if (error && !res.destroyed) {
        res.destroy();
      }
    };

    const upstream = transport.request(url, { method: "GET", headers }, (response) => {
      const status = Number(response.statusCode) || 502;
      if (res.destroyed) {
        response.resume();
        settle();
        return;
      }
      if (status >= 200 && status < 300) {
        const headersOut = {
          "content-type": response.headers["content-type"] || "application/pdf",
          "accept-ranges": "bytes",
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
        };
        for (const name of ["content-length", "content-range", "content-disposition"]) {
          if (response.headers[name]) headersOut[name] = response.headers[name];
        }
        res.writeHead(status, headersOut);
        response.on("error", (error) => settle(error));
        response.on("aborted", () => settle());
        response.on("end", () => settle());
        response.pipe(res);
        return;
      }

      // Never answer before the upstream body is drained: an unread body is
      // exactly the paused state that turns into the undici assertion.
      const chunks = [];
      let size = 0;
      response.on("data", (chunk) => {
        if (size < 8192) {
          chunks.push(chunk);
          size += chunk.length;
        }
      });
      response.on("end", () => {
        let message = `ScholarLoom 返回 ${status}`;
        const raw = Buffer.concat(chunks).toString("utf8");
        if (raw) {
          try {
            const data = JSON.parse(raw);
            if (data && typeof data.error === "string") message = data.error;
          } catch {
            /* keep the generic message */
          }
        }
        if (!res.headersSent && !res.destroyed) {
          const body = Buffer.from(JSON.stringify({ error: message }), "utf8");
          res.writeHead(status === 404 ? 404 : 502, {
            "content-type": "application/json; charset=utf-8",
            "content-length": String(body.length),
            "cache-control": "no-store",
          });
          res.end(body);
        }
        settle();
      });
      response.on("error", (error) => settle(error));
    });

    upstream.setTimeout(requestTimeoutMs, () => upstream.destroy(new Error("ScholarLoom PDF 请求超时。")));
    upstream.on("error", (error) => settle(error));
    res.on("close", () => {
      if (!upstream.destroyed) upstream.destroy();
      settle();
    });
    upstream.end();
  }

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: "prefix",
        path: "/scholarloom",
        handler: async (req, res) => {
          if (!sameOrigin(req)) {
            writeJson(res, 403, { error: "仅允许本机工作台页面访问。" });
            return;
          }
          let pathname = "/";
          try {
            pathname = new URL(req.url || "/", "http://127.0.0.1").pathname;
          } catch {
            writeJson(res, 400, { error: "请求地址无效。" });
            return;
          }
          try {
            if (pathname === "/scholarloom/health") {
              const connected = await ping();
              writeJson(res, 200, { ok: true, connected, baseUrl, autoStart, projectDir });
              return;
            }
            if (pathname === "/scholarloom/api/library") {
              const alive = await ensureServer();
              if (!alive) {
                writeJson(res, 503, {
                  error: "ScholarLoom 未运行。",
                  hint: `请启动 ${projectDir || "ScholarLoom"} 下的 server.py，或在插件配置中设置 baseUrl。`,
                  baseUrl,
                  autoStart,
                });
                return;
              }
              await loadState(true);
              writeJson(res, 200, publicLibrary(cache.stats));
              return;
            }
            if (pathname === "/scholarloom/api/paper") {
              const url = new URL(req.url || "/", "http://127.0.0.1");
              const key = url.searchParams.get("key") || "";
              if (!KEY_PATTERN.test(key)) {
                writeJson(res, 400, { error: "文献标识无效。" });
                return;
              }
              await loadState(false);
              const found = findByKey(key);
              if (!found) {
                writeJson(res, 404, { error: "找不到该文献。" });
                return;
              }
              writeJson(res, 200, { ok: true, paper: normalizeDoc(found), presets: presetList() });
              return;
            }
            if (pathname.startsWith("/scholarloom/vendor/")) {
              const rel = pathname.slice("/scholarloom/vendor/".length);
              if (!rel || !/^[A-Za-z0-9._/-]+$/.test(rel) || rel.includes("..")) {
                writeJson(res, 400, { error: "静态资源路径无效。" });
                return;
              }
              const url = upstreamUrl(`/vendor/${rel}`);
              const transport = url.protocol === "https:" ? https : http;
              const extension = rel.slice(rel.lastIndexOf(".")).toLowerCase();
              const contentType =
                extension === ".js" || extension === ".mjs"
                  ? "application/javascript; charset=utf-8"
                  : extension === ".css"
                    ? "text/css; charset=utf-8"
                    : extension === ".json"
                      ? "application/json; charset=utf-8"
                      : extension === ".wasm"
                        ? "application/wasm"
                        : "application/octet-stream";
              let vendorSettled = false;
              const vendorDone = () => {
                vendorSettled = true;
              };
              const vendor = transport.request(url, { method: "GET" }, (response) => {
                const status = Number(response.statusCode) || 502;
                const chunks = [];
                let size = 0;
                response.on("data", (chunk) => {
                  size += chunk.length;
                  if (size > 32 * 1024 * 1024) {
                    response.destroy();
                    return;
                  }
                  chunks.push(chunk);
                });
                response.on("error", () => {
                  if (!vendorSettled && !res.headersSent && !res.destroyed) writeJson(res, 502, { error: "静态资源读取失败。" });
                  else if (!res.destroyed) res.destroy();
                });
                response.on("end", () => {
                  if (vendorSettled || res.destroyed) return;
                  if (status < 200 || status >= 300) {
                    writeJson(res, status === 404 ? 404 : 502, { error: `静态资源 ${status}` });
                    vendorDone();
                    return;
                  }
                  const bytes = Buffer.concat(chunks);
                  res.writeHead(status, {
                    "content-type": contentType,
                    "content-length": String(bytes.length),
                    "cache-control": "no-store",
                    "x-content-type-options": "nosniff",
                  });
                  res.end(bytes);
                  vendorDone();
                });
              });
              vendor.setTimeout(requestTimeoutMs, () => vendor.destroy(new Error("静态资源请求超时。")));
              vendor.on("error", () => {
                if (!vendorSettled && !res.headersSent && !res.destroyed) writeJson(res, 502, { error: "静态资源请求失败。" });
                vendorDone();
              });
              res.on("close", () => {
                if (!vendor.destroyed) vendor.destroy();
              });
              vendor.end();
              return;
            }
            if (pathname.startsWith("/scholarloom/pdf/")) {
              const key = pathKey(pathname, "/scholarloom/pdf/");
              if (!key) {
                writeJson(res, 400, { error: "文献标识无效。" });
                return;
              }
              await proxyPdf(key, req, res);
              return;
            }
            if (pathname === "/scholarloom/api/document-state") {
              if (req.method !== "POST") {
                writeJson(res, 405, { error: "只接受 POST。" });
                return;
              }
              const body = await readBody(req);
              const key = String(body.key || "");
              const readingStatus = body.readingStatus;
              const readingNote = body.readingNote;
              if (!KEY_PATTERN.test(key)) {
                writeJson(res, 400, { error: "文献标识无效。" });
                return;
              }
              if (readingStatus !== undefined && !["unread", "reading", "read"].includes(readingStatus)) {
                writeJson(res, 400, { error: "阅读状态无效。" });
                return;
              }
              if (readingNote !== undefined && (typeof readingNote !== "string" || readingNote.length > 4000)) {
                writeJson(res, 400, { error: "阅读笔记请控制在 4000 字以内。" });
                return;
              }
              const result = await postApi("document-state", { key, readingStatus, readingNote });
              const row = findByKey(key);
              if (row) {
                if (readingStatus !== undefined) row.readingStatus = readingStatus;
                if (readingNote !== undefined) row.readingNote = readingNote;
                cache.loadedAt = 0;
              }
              writeJson(res, 200, { ok: true, document: result?.document || null });
              return;
            }
            if (pathname === "/scholarloom/api/chat") {
              if (req.method !== "POST") {
                writeJson(res, 405, { error: "只接受 POST。" });
                return;
              }
              const body = await readBody(req);
              const key = String(body.key || "");
              const question = String(body.question || "").trim();
              const preset = String(body.preset || "");
              if (!KEY_PATTERN.test(key)) {
                writeJson(res, 400, { error: "文献标识无效。" });
                return;
              }
              if (!question && !preset) {
                writeJson(res, 400, { error: "请输入问题或选择一个场景提示词。" });
                return;
              }
              if (question.length > 4000) {
                writeJson(res, 400, { error: "问题请控制在 4000 字以内。" });
                return;
              }
              await loadState(false);
              const result = await postApi(
                "paper-chat",
                {
                  key,
                  question,
                  preset,
                  project: String(body.project || "default"),
                  use_memory: body.useMemory !== false,
                  online_search: body.onlineSearch === true,
                },
                { timeoutMs: DEFAULT_ASK_TIMEOUT_MS },
              );
              const evidence = Array.isArray(result?.evidence)
                ? result.evidence.slice(0, 40).map((item) => ({
                    id: text(item.id, 20),
                    page: Number.isInteger(item.page) ? item.page : null,
                    quote: text(item.quote || item.text, 1200),
                    kind: text(item.kind, 40),
                  }))
                : [];
              writeJson(res, 200, {
                ok: true,
                answer: text(result?.answer, 20000),
                basis: text(result?.basis, 300),
                pages: Number(result?.pages) || 0,
                language: text(result?.language, 20),
                evidence,
                coverage: result?.coverage && typeof result.coverage === "object" ? result.coverage : null,
                citations: Array.isArray(result?.citations) ? result.citations.slice(0, 40) : [],
              });
              return;
            }
            if (pathname === "/scholarloom/api/open-pdf") {
              if (req.method !== "POST") {
                writeJson(res, 405, { error: "只接受 POST。" });
                return;
              }
              const body = await readBody(req);
              const key = String(body.key || "");
              if (!KEY_PATTERN.test(key)) {
                writeJson(res, 400, { error: "文献标识无效。" });
                return;
              }
              const url = `${baseUrl}/api/document/${encodeURIComponent(key)}/pdf`;
              try {
                const command = process.platform === "win32" ? "cmd" : process.platform === "darwin" ? "open" : "xdg-open";
                const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
                const child = spawn(command, args, { windowsHide: true, detached: true, stdio: "ignore" });
                child.unref();
                writeJson(res, 200, { ok: true, url });
              } catch (error) {
                writeJson(res, 502, { error: `无法打开浏览器：${error.message}` });
              }
              return;
            }
            if (pathname === "/scholarloom/api/memory") {
              if (req.method !== "POST") {
                writeJson(res, 405, { error: "只接受 POST。" });
                return;
              }
              const body = await readBody(req);
              const action = String(body.action || "list");
              if (!["list", "remember", "forget", "delete-excerpt"].includes(action)) {
                writeJson(res, 400, { error: "未知的记忆操作。" });
                return;
              }
              const project = String(body.project || "default");
              const paper = String(body.paper || "");
              if (paper && !KEY_PATTERN.test(paper)) {
                writeJson(res, 400, { error: "文献标识无效。" });
                return;
              }
              const payload = { action, project, paper };
              if (action === "remember") {
                const kind = String(body.kind || "project");
                const content = String(body.content || "").trim();
                if (!["preference", "project", "hypothesis"].includes(kind)) {
                  writeJson(res, 400, { error: "未知的记忆类型。" });
                  return;
                }
                if (!content || content.length > 4000) {
                  writeJson(res, 400, { error: "记忆内容请控制在 1–4000 字。" });
                  return;
                }
                payload.kind = kind;
                payload.content = content;
                payload.source_ids = [];
              } else if (action === "forget" || action === "delete-excerpt") {
                const id = Number(body.id);
                if (!Number.isInteger(id) || id <= 0) {
                  writeJson(res, 400, { error: "记忆标识无效。" });
                  return;
                }
                payload.id = id;
              }
              const result = await postApi("reading-memory", payload, { timeoutMs: 20000 });
              writeJson(res, 200, { ok: true, ...result });
              return;
            }
            if (pathname === "/scholarloom/api/full-read") {
              const url = new URL(req.url || "/", "http://127.0.0.1");
              const key = url.searchParams.get("key") || "";
              if (!KEY_PATTERN.test(key)) {
                writeJson(res, 400, { error: "文献标识无效。" });
                return;
              }
              try {
                const record = await requestJson(`/api/full-read?key=${encodeURIComponent(key)}`, { timeoutMs: 15000 });
                writeJson(res, 200, { ok: true, record: summarizeFullRead(record) });
              } catch (error) {
                if (error.status === 404) {
                  const message = String(error.message || "");
                  const routeMissing = /找不到页面|not found/i.test(message) && !/深读|full.?read/i.test(message);
                  writeJson(res, 200, { ok: true, record: null, unsupported: routeMissing, message: text(message, 300) });
                  return;
                }
                throw error;
              }
              return;
            }
            if (pathname === "/scholarloom/api/full-read/start") {
              if (req.method !== "POST") {
                writeJson(res, 405, { error: "只接受 POST。" });
                return;
              }
              const body = await readBody(req);
              const key = String(body.key || "");
              if (!KEY_PATTERN.test(key)) {
                writeJson(res, 400, { error: "文献标识无效。" });
                return;
              }
              const result = await postApi("full-read", { key, action: String(body.action || "start") }, { timeoutMs: 20000 });
              writeJson(res, 200, { ok: true, result });
              return;
            }
            writeJson(res, 404, { error: "未知的 ScholarLoom 工作台接口。" });
          } catch (error) {
            const message = error?.name === "AbortError" ? "ScholarLoom 请求超时。" : error?.message || "ScholarLoom 请求失败。";
            writeJson(res, error?.status && error.status >= 400 && error.status < 600 ? error.status : 502, {
              error: message,
              baseUrl,
            });
          }
        },
      }),
    "dsh-scholarloom: workbench routes",
  );

  function summarizeFullReadUnits(value) {
    const itemById = new Map(
      (Array.isArray(value.items) ? value.items : []).map((item) => [item.id, item]),
    );
    const units = Array.isArray(value.units) ? value.units : [];
    return units.slice(0, 200).map((unit) => ({
      id: text(unit.id, 20),
      unitType: text(unit.unitType, 30),
      heading: text(unit.heading, 300),
      pages: Array.isArray(unit.pages) ? unit.pages.slice(0, 20).map(Number).filter(Number.isInteger) : [],
      status: text(unit.status, 40),
      question: text(unit.question, 2000),
      design: text(unit.design, 3000),
      result: text(unit.result, 3000),
      interpretation: text(unit.interpretation, 4000),
      limitations: Array.isArray(unit.limitations) ? unit.limitations.slice(0, 12).map((item) => text(item, 1200)) : [],
      figureNumbers: Array.isArray(unit.figureNumbers) ? unit.figureNumbers.slice(0, 20).map((item) => text(item, 40)) : [],
      figureInterpretation: text(unit.figureInterpretation, 3000),
      sourceWarnings: unit.sourceWarnings || [],
      missingFigureIds: (unit.figureItemIds || []).filter((id) => !itemById.has(id)),
      sources: [...new Set([...(unit.sourceItemIds || []), ...(unit.figureItemIds || [])])]
        .map((id) => itemById.get(id))
        .filter(Boolean)
        .map((item) => ({
          id: text(item.id, 20),
          kind: text(item.kind, 30),
          page: Number.isInteger(item.page) ? item.page : 0,
          heading: text(item.heading, 300),
          sourceText: text(item.sourceText, 1800),
          summary: text(item.summary, 900),
          analysis: text(item.analysis, 1800),
          evidence: text(item.evidence, 1200),
          limitations: Array.isArray(item.limitations) ? item.limitations.slice(0, 8).map((entry) => text(entry, 800)) : [],
          sourceVerified: item.sourceVerified === true,
          locationStatus: text(item.locationStatus, 40),
          startQuote: text(item.startQuote, 240),
          endQuote: text(item.endQuote, 240),
          rects: Array.isArray(item.rects)
            ? item.rects.slice(0, 24).map((rect) => ({
                x: Number(rect && rect.x) || 0,
                y: Number(rect && rect.y) || 0,
                width: Number(rect && rect.width) || 0,
                height: Number(rect && rect.height) || 0,
              }))
            : [],
        })),
    }));
  }

  function summarizeFullRead(record) {
    if (!record || typeof record !== "object") return null;
    const value = record.value && typeof record.value === "object" ? record.value : record;
    const overview = value.overview && typeof value.overview === "object" ? value.overview : null;
    return {
      historical: record.historical === true,
      conflictAudit: value.conflictAudit || null,
      runId: text(record.runId || value.runId, 40),
      status: text(value.status, 30),
      promptVersion: Number(value.promptVersion) || 0,
      language: text(value.language, 10),
      pages: Array.isArray(value.pages) ? value.pages.length : Number(value.coverage?.pages) || 0,
      progress: value.progress && typeof value.progress === "object" ? value.progress : null,
      coverage: value.coverage && typeof value.coverage === "object" ? value.coverage : null,
      warnings: Array.isArray(value.warnings) ? value.warnings.map((item) => { if (typeof item === "string") return text(item, 500); const page = item && (item.page ?? item.pageIndex); const message = item && (item.message || item.text || item.detail); return `${page != null ? `P${page}: ` : ""}${text(message || JSON.stringify(item), 500)}`; }) : [],
      overview: overview
        ? {
            oneSentence: text(overview.oneSentence, 2000),
            researchQuestion: text(overview.researchQuestion, 3000),
            studyDesign: text(overview.studyDesign, 5000),
            mainFindings: Array.isArray(overview.mainFindings) ? overview.mainFindings.slice(0, 20).map((item) => text(item, 1500)) : [],
            argumentMap: Array.isArray(overview.argumentMap) ? overview.argumentMap.slice(0, 20).map((item) => text(item, 1200)) : [],
            limitations: Array.isArray(overview.limitations) ? overview.limitations.slice(0, 20).map((item) => text(item, 1200)) : [],
          }
        : null,
      units: summarizeFullReadUnits(value),
      usage: value.usage && typeof value.usage === "object" ? value.usage : null,
      finishedAt: Number(value.finishedAt) || 0,
    };
  }

  /* ── agent tools ─────────────────────────────────────────────────────── */

  const toolRender = (value) => [{ type: "text", text: value }];

  ctx.tools.register(
    defineTool({
      name: "scholarloom_search",
      description:
        "Search the user's local ScholarLoom literature library by title, author, DOI, keyword, category, or reading status. Use this before answering questions about papers the user has already collected. Returns compact cards; call scholarloom_paper for the full reading card.",
      parameters: {
        query: { type: "string", description: "Space-separated search terms; all terms must match." },
        category: { type: "string", description: "Exact ScholarLoom category filter." },
        status: { type: "string", enum: ["unread", "reading", "read"], description: "Reading status filter." },
        limit: { type: "integer", description: "Maximum cards, 1–50 (default 20)." },
      },
      output: {
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            total: { type: "integer", required: true },
            items: { type: "array", required: true, items: { type: "object", additionalProperties: true } },
          },
        },
        render: (_args, value) => toolRender(formatSearch(value)),
      },
      timeoutMs: 20000,
      isConcurrencySafe: () => true,
      async execute(args, exec) {
        const alive = await ensureServer();
        if (!alive) throw new Error(`ScholarLoom 未运行（${baseUrl}）。`);
        await loadState(false, exec.signal);
        const result = queryDocs({ ...args, limit: Math.min(Number(args.limit) || 20, 50) });
        return { total: result.total, items: result.items.map(briefDoc) };
      },
    }),
  );

  ctx.tools.register(
    defineTool({
      name: "scholarloom_paper",
      description:
        "Read one ScholarLoom reading card: metadata, one-sentence summary, research question, methods, findings, use case, limitations, keywords, and reading state. Identify the paper by key (preferred) or a search query.",
      parameters: {
        key: { type: "string", description: "ScholarLoom paper key, e.g. CZS6IFDB." },
        query: { type: "string", description: "Search query when the key is unknown; the best match is returned." },
      },
      output: {
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            paper: { type: "object", required: true, additionalProperties: true },
          },
        },
        render: (_args, value) => toolRender(formatPaper(value.paper)),
      },
      timeoutMs: 20000,
      isConcurrencySafe: () => true,
      async execute(args, exec) {
        const alive = await ensureServer();
        if (!alive) throw new Error(`ScholarLoom 未运行（${baseUrl}）。`);
        await loadState(false, exec.signal);
        const row = await resolveDoc(args);
        return { paper: cardDoc(row) };
      },
    }),
  );

  ctx.tools.register(
    defineTool({
      name: "scholarloom_ask",
      description:
        "Ask a page-grounded question about one ScholarLoom paper. ScholarLoom retrieves local full-text evidence and answers with evidence IDs [E1] and page numbers. This calls the user's configured ScholarLoom model and may take 30–90 seconds; use it only when the user asks about a specific collected paper.",
      parameters: {
        key: { type: "string", required: true, description: "ScholarLoom paper key." },
        question: { type: "string", required: true, description: "The question to answer from this paper." },
        preset: {
          type: "string",
          enum: ["methodology", "negative", "mechanism", "translation", "conflict", "summary"],
          description: "Optional ScholarLoom reading preset.",
        },
        useMemory: { type: "boolean", description: "Use the project's reading memory (default true)." },
      },
      output: {
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            answer: { type: "string", required: true },
            basis: { type: "string" },
            pages: { type: "integer" },
            citations: { type: "array", items: { type: "object", additionalProperties: true } },
            coverage: { type: "object", additionalProperties: true },
            evidence: { type: "array", required: true, items: { type: "object", additionalProperties: true } },
          },
        },
        render: (_args, value) => toolRender(formatAnswer(value)),
      },
      timeoutMs: DEFAULT_ASK_TIMEOUT_MS + 15000,
      isConcurrencySafe: () => false,
      async execute(args, exec) {
        const alive = await ensureServer();
        if (!alive) throw new Error(`ScholarLoom 未运行（${baseUrl}）。`);
        await loadState(false, exec.signal);
        const row = await resolveDoc({ key: args.key });
        const result = await postApi(
          "paper-chat",
          {
            key: row.key,
            question: String(args.question || "").trim(),
            preset: args.preset || "",
            project: "default",
            use_memory: args.useMemory !== false,
            online_search: false,
          },
          { timeoutMs: DEFAULT_ASK_TIMEOUT_MS, signal: exec.signal },
        );
        return {
          citations: result?.citations || [],
          coverage: result?.coverage || {},
          answer: text(result?.answer, 20000),
          basis: text(result?.basis, 300),
          pages: Number(result?.pages) || 0,
          evidence: Array.isArray(result?.evidence)
            ? result.evidence.slice(0, 40).map((item) => ({
                id: text(item.id, 20),
                page: Number.isInteger(item.page) ? item.page : null,
                quote: text(item.quote || item.text, 1200),
              }))
            : [],
        };
      },
    }),
  );

  ctx.tools.register(
    defineTool({
      name: "scholarloom_status",
      description:
        "Report ScholarLoom connection state and local library counts (total, unread, reading, read, PDFs, intake review queue). Use it to decide whether the literature workbench is available.",
      parameters: {},
      output: {
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            connected: { type: "boolean", required: true },
            baseUrl: { type: "string", required: true },
            stats: { type: "object", additionalProperties: true },
          },
        },
        render: (_args, value) =>
          toolRender(
            value.connected
              ? [
                  `ScholarLoom 已连接：${value.baseUrl}`,
                  `文献 ${value.stats?.total ?? 0} 篇 · 未读 ${value.stats?.unread ?? 0} · 在读 ${value.stats?.reading ?? 0} · 已读 ${value.stats?.read ?? 0}`,
                  `PDF ${value.stats?.withPDF ?? 0} 篇 · 待核对入藏 ${value.stats?.review ?? 0} 条`,
                ].join("\n")
              : `ScholarLoom 未连接：${value.baseUrl}`,
          ),
      },
      timeoutMs: 20000,
      isConcurrencySafe: () => true,
      async execute() {
        const connected = await ping();
        if (!connected) return { connected: false, baseUrl, stats: null };
        await loadState(true);
        return { connected: true, baseUrl, stats: cache.stats };
      },
    }),
  );

  function formatSearch(value) {
    const lines = [`ScholarLoom：${value.total} 篇匹配文献（最多显示 ${value.items.length} 篇）`];
    for (const item of value.items) {
      const title = (item.zhTitle && item.zhTitle !== item.title ? `${item.zhTitle} / ${item.title}` : item.title || item.zhTitle || "").slice(0, 180);
      const meta = [shortAuthors(item.authors), item.year, item.source].filter(Boolean).join(" · ");
      const flags = [item.readingStatus, item.hasPDF ? "PDF" : "无PDF", item.category].filter(Boolean).join(" · ");
      lines.push(`- [${item.key}] ${title}${meta ? ` — ${meta}` : ""}${flags ? ` (${flags})` : ""}`);
    }
    return lines.join("\n");
  }

  function formatPaper(paper) {
    const lines = [
      `[${paper.key}] ${paper.zhTitle && paper.zhTitle !== paper.title ? `${paper.zhTitle} / ${paper.title}` : paper.title || paper.zhTitle}`,
      [shortAuthors(paper.authors), paper.year, paper.source, paper.identifier].filter(Boolean).join(" · "),
      `阅读状态：${paper.readingStatus}${paper.hasPDF ? " · 有 PDF" : " · 无 PDF"}`,
      paper.oneSentence ? `\n一句话：${paper.oneSentence}` : "",
      paper.question ? `\n研究问题：${paper.question}` : "",
      paper.method ? `\n方法：${paper.method}` : "",
      paper.findings?.length ? `\n主要发现：\n${paper.findings.map((item, index) => `${index + 1}. ${item}`).join("\n")}` : "",
      paper.limitations ? `\n局限：${paper.limitations}` : "",
      paper.useCase ? `\n适用场景：${paper.useCase}` : "",
      paper.keywords?.length ? `\n关键词：${paper.keywords.join("、")}` : "",
    ];
    return lines.filter(Boolean).join("\n");
  }

  function formatAnswer(value) {
    const lines = [value.answer];
    for (const citation of value.citations || []) {
      lines.push(`引用 ${citation.id || citation.page}: ${({located_quote: "定位到原文", page_only: "仅定位到页码", unsupported: "未定位到原文"})[citation.state] || "未核验"}`);
    }
    if (value.basis) lines.push(`\n依据：${value.basis}${value.pages ? ` · 索引 ${value.pages} 页` : ""}`);
    if (value.evidence?.length) {
      lines.push("\n证据：");
      for (const item of value.evidence.slice(0, 12)) {
        lines.push(`- [${item.id}]${item.page ? ` 第 ${item.page} 页` : ""} ${text(item.quote, 320)}`);
      }
    }
    return lines.join("\n");
  }

  ctx.effect(
    () => () => {
      disposed = true;
      child = null;
    },
    "dsh-scholarloom: dispose plugin",
  );
}
