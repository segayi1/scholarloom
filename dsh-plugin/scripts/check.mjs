import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => readFileSync(path.join(root, name));
const text = (name) => read(name).toString("utf8");

const pkg = JSON.parse(text("package.json"));
assert.equal(pkg.name, "dsh-scholarloom");
assert.ok(pkg.version, "version is required");
assert.equal(pkg.type, "module");
assert.equal(pkg.main, "lib/index.js");
assert.equal(pkg.exports["./client"], "./lib/client.js");
assert.equal(pkg.dsh.bundle.patch, "./cordis.patch.yml");
assert.equal(pkg.dsh.client.platform, "web");
assert.ok(Array.isArray(pkg.dsh.client.inject) && pkg.dsh.client.inject.length > 0);

for (const file of ["lib/index.js", "lib/client.js", "cordis.patch.yml", "README.md", "install.ps1"]) {
  assert.ok(existsSync(path.join(root, file)), `${file} is missing`);
}

for (const file of ["package.json", "lib/index.js", "lib/client.js", "cordis.patch.yml"]) {
  const bytes = read(file);
  assert.notEqual(bytes[0], 0xef, `${file} must not start with a UTF-8 BOM`);
}

const patch = text("cordis.patch.yml");
assert.match(patch, /scholarloom-workbench/);
assert.match(patch, /dsh-scholarloom/);

const host = text("lib/index.js");
for (const name of ["scholarloom_search", "scholarloom_paper", "scholarloom_ask", "scholarloom_status"]) {
  assert.match(host, new RegExp(`name: "${name}"`), `${name} tool is missing`);
}
assert.match(host, /\/scholarloom\/api\/library/);
assert.match(host, /\/scholarloom\/pdf\//);

const client = text("lib/client.js");
assert.match(client, /function WorkbenchPage/);
assert.match(client, /sidebar\.panellist/);
assert.match(client, /\.sl-root/);
assert.match(client, /evidence/);

let captured;
const sandbox = {
  window: { __ModuleLoader__: { load: (entry) => { captured = entry; } } },
  console,
  Symbol,
  Object,
  URL,
  URLSearchParams,
  setTimeout,
  clearTimeout,
};
vm.runInNewContext(client, sandbox, { filename: "client.js" });
assert.equal(captured.id, "dsh-scholarloom");
assert.equal(typeof captured.factory, "function");

const react = { createElement: (...args) => args, Fragment: Symbol("Fragment"), useState: () => [undefined, () => {}], useEffect: () => {}, useMemo: () => undefined, useRef: () => ({ current: null }), useCallback: (fn) => fn };
const loaded = captured.factory((id) => (id === "react" ? react : {}));
assert.equal(typeof loaded.apply, "function");
assert.ok(Array.isArray(loaded.inject));

console.log("dsh-scholarloom checks passed");

// Execute the production converters and renderer with controlled inputs.
const helpers = host.slice(host.indexOf("  function summarizeFullReadUnits("), host.indexOf("  /* ── agent tools"));
const textHelper = host.slice(host.indexOf("function text("), host.indexOf("function shortAuthors("));
const converters = {};
vm.runInNewContext(textHelper + helpers + ";this.convert = summarizeFullRead", converters);
const record = converters.convert({historical: true, value: {status: "done", conflictAudit: {status: "partial"},
  items: [{id: "body", page: 1}, {id: "figure", page: 2}],
  units: [{sourceItemIds: ["body"], figureItemIds: ["figure", "missing"], sourceWarnings: ["review"]}]}});
assert.equal(record.historical, true);
assert.equal(record.conflictAudit.status, "partial");
assert.equal(record.units[0].sources.length, 2);
assert.equal(record.units[0].sourceWarnings[0], "review");
assert.equal(record.units[0].missingFigureIds[0], "missing");
const renderer = {h: (type, props, ...children) => ({type, props, children}), React: {Fragment: "text"}};
vm.runInNewContext(client.slice(client.indexOf("    function renderInline("), client.indexOf("    function AnswerText(")) + ";this.render = renderInline", renderer);
for (const sentence of ["The study enrolled 17 patients.", "剂量为 3 mg/kg，P < 0.05。", "No numerical change."]) {
  assert.equal(renderer.render(sentence, [], () => {})[0].children[0], sentence);
}
assert.equal(renderer.render("[E99]", [], () => {}).filter(Boolean)[0].props.disabled, true);
assert.equal(renderer.render("p.99", [], () => {}).filter(Boolean)[0].props.disabled, true);
assert.equal(renderer.render("p.2", [], () => {}, [{page: 2, state: "page_only"}]).filter(Boolean)[0].props.disabled, false);
assert.equal(renderer.render("[E1]", [{id: "E1", page: 2}], () => {}, [{id: "E1", page: 2, state: "located_quote"}]).filter(Boolean)[0].props.disabled, false);
console.log("DSH reading regressions passed");

const start = {disposed: false, starting: null, child: null, autoStart: true, projectDir: "project", baseUrl: "http://127.0.0.1:8767", existsSync: () => true, path, process, URL, cache: {}, log: console,
  ping: async () => Boolean(start.spawned), sleep: async () => {}, resolvePython: () => "python",
  spawn: (python, args, options) => { start.spawned = {args, options}; return {unref() {}, on() {}}; }};
vm.runInNewContext(host.slice(host.indexOf("  async function ensureServer("), host.indexOf("  async function loadState(")) + ";this.startServer = ensureServer", start);
assert.equal(await start.startServer(), true);
assert.equal(start.spawned.args.join(" "), "server.py --port 8767");
assert.equal(start.spawned.options.detached, true);
let cleanup;
vm.runInNewContext(host.slice(host.lastIndexOf("  ctx.effect("), host.lastIndexOf("}")), {ctx: {effect: (fn) => {cleanup = fn();}}, child: {kill() {throw Error("must preserve background work");}}});
cleanup();
const updates = {doc: {key: "paper", readingNote: "stale", readingStatus: "unread"}, setLibrary: () => {}, showToast: () => {}, apiPost: async (route, payload) => {updates.payload = payload;}};
vm.runInNewContext(client.slice(client.indexOf("      async function updateStatus("), client.indexOf("      function openChat(")) + ";this.status = updateStatus;this.note = saveNote", updates);
await updates.status("read");
assert.equal(Object.hasOwn(updates.payload, "readingNote"), false);
await updates.note("new note");
assert.equal(Object.hasOwn(updates.payload, "readingStatus"), false);
console.log("DSH lifecycle and partial-update regressions passed");
