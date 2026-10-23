// What an extension's admin and storefront code uses of core: the admin
// components it overrides or extends, with the methods and template blocks
// it replaces, and the core components its templates use as tags; the
// storefront templates it `sw_extends` and the blocks it overrides; the
// storefront plugins it overrides or looks up; the Twig functions, filters
// and tags its templates call; and the admin webpack config core used to
// read. Targets are index IDs, so the facts come from the same lookup as PHP.
import type { CallExpression, Node, ObjectExpression } from '@babel/types';
import { configOf } from './admin.ts';
import {
  defaultExport,
  importsOf,
  keyOf,
  memberName,
  parseJs,
  propertyOf,
  relativePath,
  stringOf,
  walkJs,
} from './js.ts';
import { scanTwig, lineAt } from './twig.ts';
import type { Use, UseKind } from './uses-context.ts';

const ADMIN = /(?:^|\/)Resources\/app\/administration\/src\//u;
const STOREFRONT = /(?:^|\/)Resources\/app\/storefront\/src\//u;
const VIEWS = /(?:^|\/)Resources\/views\//u;
const BUILDS: [RegExp, string][] = [
  [/(?:^|\/)Resources\/app\/administration\/build\/webpack\.config\.js$/u, 'build:admin.webpack'],
  [/(?:^|\/)Resources\/app\/storefront\/build\/webpack\.config\.js$/u, 'build:storefront.webpack'],
];

/** The extension files the frontend reader wants, by path. */
export function isFrontendFile(path: string): boolean {
  if (/\.spec\.|\.d\.ts$|\/__mocks__\//u.test(path)) return false;
  if (BUILDS.some(([pattern]) => pattern.test(path))) return true;
  if (VIEWS.test(path) || ADMIN.test(path)) return path.endsWith('.twig') || /\.[jt]s$/u.test(path);
  return STOREFRONT.test(path) && /\.[jt]s$/u.test(path);
}

class Collector {
  readonly uses: Use[] = [];
  readonly files: ReadonlyMap<string, string>;

  constructor(files: ReadonlyMap<string, string>) {
    this.files = files;
  }

  add(target: string, how: UseKind, file: string, line: number): void {
    this.uses.push({ target, how, file, line });
  }

  /** A relative import of `from`, with the extension a bundler would add. */
  resolve(from: string, specifier: string): string | undefined {
    const base = relativePath(from, specifier);
    if (base === undefined) return undefined;
    return [base, `${base}.js`, `${base}.ts`, `${base}/index.js`, `${base}/index.ts`].find((path) =>
      this.files.has(path),
    );
  }
}

function lineOf(node: Node): number {
  return node.loc?.start.line ?? 1;
}

/** The blocks of a component template the extension replaces, and the
 *  methods its config redefines, as members of `target`. */
function configUses(
  config: ObjectExpression,
  file: string,
  imports: Map<string, string>,
  target: string,
  out: Collector,
): void {
  const methods = propertyOf(config, 'methods');
  if (methods?.type === 'ObjectExpression') {
    for (const method of methods.properties) {
      const name = keyOf(method);
      if (name !== undefined) out.add(`${target}.js-method.${name}`, 'override', file, lineOf(method));
    }
  }
  const template = propertyOf(config, 'template');
  const specifier = template?.type === 'Identifier' ? imports.get(template.name) : undefined;
  const twigFile = specifier === undefined ? undefined : relativePath(file, specifier);
  const twig = twigFile === undefined ? undefined : out.files.get(twigFile);
  if (twigFile === undefined || twig === undefined) return;
  for (const block of scanTwig(twig).blocks) out.add(`${target}#${block.name}`, 'block', twigFile, block.line);
}

/** The config an override or extend passes: inline, or the default export of the module it loads. */
function configFor(
  arg: Node | undefined,
  file: string,
  imports: Map<string, string>,
  out: Collector,
): { config: ObjectExpression; file: string; imports: Map<string, string> } | undefined {
  if (arg?.type === 'ObjectExpression') return { config: arg, file, imports };
  let specifier: string | undefined;
  if (arg?.type === 'Identifier') specifier = imports.get(arg.name);
  else if (arg?.type === 'ImportExpression') specifier = stringOf(arg.source);
  else if (arg?.type === 'ArrowFunctionExpression' && arg.body.type === 'ImportExpression')
    specifier = stringOf(arg.body.source);
  const source = specifier === undefined ? undefined : out.resolve(file, specifier);
  const code = source === undefined ? undefined : out.files.get(source);
  if (source === undefined || code === undefined) return undefined;
  const ast = parseJs(code, source);
  const config = configOf(defaultExport(ast).value);
  return config === undefined ? undefined : { config, file: source, imports: importsOf(ast.program.body) };
}

function componentCall(node: CallExpression, file: string, imports: Map<string, string>, out: Collector): void {
  const method = /(?:^|\.)Component\.(override|extend)$/u.exec(memberName(node.callee) ?? '')?.[1];
  if (method === undefined) return;
  const target = stringOf(node.arguments[method === 'extend' ? 1 : 0]);
  if (target === undefined) return;
  out.add(`admin:${target}`, method === 'extend' ? 'extends' : 'override', file, lineOf(node));
  const found = configFor(node.arguments[method === 'extend' ? 2 : 1], file, imports, out);
  if (found !== undefined) configUses(found.config, found.file, found.imports, `admin:${target}`, out);
}

const PLUGIN_CALL = /(?:^|\.)PluginManager\.(override|getPluginInstances|getPlugin|getPluginInstanceFromElement)$/u;

function pluginCall(node: CallExpression, file: string, out: Collector): void {
  const method = PLUGIN_CALL.exec(memberName(node.callee) ?? '')?.[1];
  if (method === undefined) return;
  const name = stringOf(node.arguments[method === 'getPluginInstanceFromElement' ? 1 : 0]);
  if (name !== undefined) out.add(`js-plugin:${name}`, method === 'override' ? 'override' : 'call', file, lineOf(node));
}

function scriptUses(code: string, file: string, out: Collector): void {
  const ast = parseJs(code, file);
  const imports = importsOf(ast.program.body);
  walkJs(ast.program, (node) => {
    if (node.type !== 'CallExpression') return false;
    if (ADMIN.test(file)) componentCall(node, file, imports, out);
    else pluginCall(node, file, out);
    return false;
  });
}

const TWIG_CODE = /\{\{([\s\S]*?)\}\}|\{%-?\s*(\w+)([\s\S]*?)-?%\}/gu;

/** Functions, filters and tags a storefront template calls. */
function twigCalls(twig: string, file: string, out: Collector): void {
  for (const match of twig.matchAll(TWIG_CODE)) {
    const line = lineAt(twig, match.index);
    const tag = match[2];
    if (tag !== undefined) out.add(`twig:tag:${tag}`, 'twig', file, line);
    const code = (match[1] ?? match[3] ?? '').replaceAll(/'[^']*'|"[^"]*"/gu, "''");
    for (const call of code.matchAll(/(?<![.\w|])([a-z_]\w*)\s*\(/gu))
      out.add(`twig:function:${call[1] ?? ''}`, 'twig', file, line);
    for (const filter of code.matchAll(/\|\s*([a-z_]\w*)/gu))
      out.add(`twig:filter:${filter[1] ?? ''}`, 'twig', file, line);
  }
}

function templateUses(twig: string, file: string, out: Collector): void {
  if (ADMIN.test(file)) {
    for (const tag of twig.matchAll(/<(sw-[a-z0-9-]+)/gu))
      out.add(`admin:${tag[1] ?? ''}`, 'tag', file, lineAt(twig, tag.index));
    return;
  }
  const scanned = scanTwig(twig);
  twigCalls(twig, file, out);
  if (scanned.extends?.startsWith('@Storefront/') !== true) return;
  const template = `storefront:${scanned.extends}`;
  out.add(template, 'extends', file, lineAt(twig, Math.max(0, twig.indexOf(scanned.extends))));
  for (const block of scanned.blocks) out.add(`${template}#${block.name}`, 'block', file, block.line);
}

/** The frontend uses of an extension's files, by path relative to its root. */
export function frontendUses(files: ReadonlyMap<string, string>): { uses: Use[]; failed: string[] } {
  const out = new Collector(files);
  const failed: string[] = [];
  for (const [file, code] of files) {
    try {
      const build = BUILDS.find(([pattern]) => pattern.test(file));
      if (build !== undefined) out.add(build[1], 'build', file, 1);
      else if (file.endsWith('.twig')) templateUses(code, file, out);
      else if (ADMIN.test(file) || STOREFRONT.test(file)) scriptUses(code, file, out);
    } catch {
      failed.push(file);
    }
  }
  return { uses: out.uses, failed };
}
