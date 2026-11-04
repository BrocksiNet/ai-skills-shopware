// Fixture modules execute; external framework dependencies are supplied explicitly.
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { createContext, SourceTextModule } from "node:vm";
export async function loadFixture(workdir, entry, globals) {
  const context = createContext({ ...globals, console: { log() {}, warn() {}, error() {} } });
  const modules = new Map();
  const module = (filename) => {
    if (!modules.has(filename)) {
      const text = readFileSync(filename, "utf8");
      const source = filename.endsWith(".twig") ? `export default ${JSON.stringify(text)};` : text;
      modules.set(filename, new SourceTextModule(source, { context, identifier: filename }));
    }
    return modules.get(filename);
  };
  const linker = (specifier, parent) => {
    assert.ok(specifier.startsWith("."), `unexpected external module ${specifier}`);
    let path = resolve(dirname(parent.identifier), specifier);
    assert.ok(!relative(workdir, path).startsWith(".."), "module left the fixture");
    if (existsSync(path) && statSync(path).isDirectory()) path = resolve(path, "index.js");
    if (!existsSync(path) && existsSync(`${path}.js`)) path += ".js";
    return module(path);
  };
  const top = module(resolve(workdir, entry));
  await top.link(linker);
  await top.evaluate({ timeout: 2000 });
  return top.namespace;
}
