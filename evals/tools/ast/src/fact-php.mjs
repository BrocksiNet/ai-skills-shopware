// A deliberately small AST contract evaluator, not a PHP/Shopware runtime.
// Unsupported rewrites are infrastructure/ungradable, never silently model failures.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parsePhp, findClass, findMethod, walkPhp, nodeName } from "./php.mjs";
export class UnsupportedPhp extends Error {}
export function phpClass(workdir, file, name) {
  const ast = parsePhp(readFileSync(resolve(workdir, file), "utf8"));
  assert.ok(ast, "PHP must parse");
  const klass = findClass(ast, name);
  assert.ok(klass, `class ${name} must remain`);
  const imports = new Map();
  walkPhp(ast, (n) => {
    if (n.kind === "useitem") imports.set(nodeName(n.alias) || n.name.split("\\").at(-1), n.name);
  });
  return { klass, imports };
}
const full = (name, s) => s.imports.get(name.replace(/^\\/u, "")) ?? name.replace(/^\\/u, "");
function arrayValue(n, s) {
  const entries = n.items.map((item) => [
    item.key ? expression(item.key, s) : null,
    expression(item.value, s),
  ]);
  return entries.some(([key]) => key !== null)
    ? Object.fromEntries(entries)
    : entries.map(([, value]) => value);
}
function call(n, s) {
  const args = (n.arguments ?? []).map((a) =>
    expression(a.kind === "namedargument" ? a.value : a, s),
  );
  if (n.what.kind === "propertylookup") {
    const receiver = expression(n.what.what, s);
    const method = nodeName(n.what.offset);
    if (receiver === s.self && findMethod(s.klass, method)) return methodValue(s, method, args);
    assert.equal(
      typeof receiver?.[method],
      "function",
      `unavailable method ${method} on ${s.version ?? "fixture"}`,
    );
    return receiver[method](...args);
  }
  const name = nodeName(n.what).replace(/^\\/u, "");
  if (name === "method_exists")
    return (
      args[1] === "addTag" &&
      s.hasAddTag &&
      (args[0] === s.collector ||
        args[0] === "Shopware\\Core\\Framework\\Adapter\\Cache\\CacheTagCollector")
    );
  if (name === "class_exists") return /CacheTagCollector$|AddCacheTagEvent$/u.test(args[0]);
  if (name === "sprintf") {
    let i = 1;
    return args[0].replace(/%s/gu, () => String(args[i++]));
  }
  throw new UnsupportedPhp(`unsupported PHP call ${name}`);
}
export function expression(n, s) {
  if (n === null || n === undefined) return null;
  if (n.kind === "string" || n.kind === "boolean") return n.value;
  if (n.kind === "number") return Number(n.value);
  if (n.kind === "variable") return n.name === "this" ? s.self : s.vars.get(n.name);
  if (n.kind === "array") return arrayValue(n, s);
  if (n.kind === "encapsed")
    return n.value.map((part) => expression(part.expression ?? part, s)).join("");
  if (n.kind === "encapsedpart") return expression(n.expression, s);
  if (n.kind === "propertylookup") return expression(n.what, s)?.[nodeName(n.offset)];
  if (n.kind === "staticlookup" && nodeName(n.offset) === "class") return full(nodeName(n.what), s);
  if (n.kind === "staticlookup" && ["self", "static"].includes(nodeName(n.what) || n.what.raw)) {
    const name = nodeName(n.offset);
    const declaration = s.klass.body.find(
      (item) =>
        item.kind === "classconstant" && item.constants.some((c) => nodeName(c.name) === name),
    );
    const constant = declaration?.constants.find((c) => nodeName(c.name) === name);
    if (!constant) throw new UnsupportedPhp(`unknown class constant ${name}`);
    return expression(constant.value, s);
  }
  if (n.kind === "new") {
    const name = full(nodeName(n.what), s);
    if (name === "Shopware\\Core\\Framework\\Adapter\\Cache\\Event\\AddCacheTagEvent")
      return {
        tags: n.arguments.flatMap((a) => (a.unpack ? expression(a, s) : [expression(a, s)])),
      };
    throw new UnsupportedPhp(`unsupported constructor ${name}`);
  }
  if (n.kind === "call") return call(n, s);
  if (n.kind === "unary" && n.type === "!") return !expression(n.what, s);
  if (n.kind === "bin") {
    const left = expression(n.left, s);
    if (n.type === "&&") return left && expression(n.right, s);
    if (n.type === "||") return left || expression(n.right, s);
    const right = expression(n.right, s);
    if (n.type === ".") return String(left) + String(right);
    if (n.type === "===" || n.type === "==") return left === right;
    if (n.type === "!==") return left !== right;
  }
  if (n.kind === "retif")
    return expression(n.test, s) ? expression(n.trueExpr, s) : expression(n.falseExpr, s);
  if (n.kind === "assign" && n.left.kind === "variable") {
    const value = expression(n.right, s);
    s.vars.set(n.left.name, value);
    return value;
  }
  if (n.kind === "assign" && n.left.kind === "propertylookup") {
    const value = expression(n.right, s);
    expression(n.left.what, s)[nodeName(n.left.offset)] = value;
    return value;
  }
  throw new UnsupportedPhp(`unsupported PHP expression ${n.kind}/${n.type ?? ""}`);
}
function statements(body, s) {
  const children = body?.kind === "block" ? body.children : Array.isArray(body) ? body : [body];
  for (const n of children.filter(Boolean)) {
    if (n.kind === "return") return { value: expression(n.expr, s) };
    if (n.kind === "if") {
      const result = statements(expression(n.test, s) ? n.body : n.alternate, s);
      if (result) return result;
    } else if (n.kind === "expressionstatement") expression(n.expression, s);
    else if (n.kind === "block") {
      const result = statements(n, s);
      if (result) return result;
    } else if (n.kind !== "noop") throw new UnsupportedPhp(`unsupported PHP statement ${n.kind}`);
  }
  return null;
}
export function methodValue(s, method, args = []) {
  assert.ok((s.depth ?? 0) < 8, "bounded helper recursion");
  const node = findMethod(s.klass, method);
  assert.ok(node, `method ${method} must remain`);
  const vars = new Map((node.arguments ?? []).map((arg, i) => [nodeName(arg.name), args[i]]));
  return statements(node.body, { ...s, vars, depth: (s.depth ?? 0) + 1 })?.value;
}
export function serviceState(parsed, dependencies, extras = {}) {
  const self = {};
  const constructor = findMethod(parsed.klass, "__construct");
  const args = (constructor?.arguments ?? []).map((arg) => {
    const type = full(nodeName(arg.type), parsed);
    const value = dependencies(type);
    if (arg.flags) self[nodeName(arg.name)] = value;
    return value;
  });
  const state = { ...parsed, self, vars: new Map(), ...extras };
  if (constructor) methodValue(state, "__construct", args);
  return state;
}
export function extendsClass(parsed, wanted) {
  return full(nodeName(parsed.klass.extends), parsed) === wanted;
}
