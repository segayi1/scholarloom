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
