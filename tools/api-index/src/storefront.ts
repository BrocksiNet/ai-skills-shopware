// The storefront surface: the templates under `@Storefront/storefront/` with
// their blocks, and the JavaScript plugins `main.js` registers with
// `PluginManager.register()`, with their options and public methods. A
// method whose name starts with `_` or that is marked `@private` is not API.
import type { ClassBody, Node } from '@babel/types';
import {
  defaultExport,
  deprecatedIn,
  importsOf,
  keyOf,
  memberName,
  parseJs,
  privateIn,
  resolveImport,
  sourceOf,
  stringOf,
  walkJs,
} from './js.ts';
import type { Flags, Item } from './model.ts';
import { scanTwig } from './twig.ts';

export const STOREFRONT_VIEWS = 'src/Storefront/Resources/views/storefront';
export const STOREFRONT_SRC = 'src/Storefront/Resources/app/storefront/src';
export const STOREFRONT_MAIN = `${STOREFRONT_SRC}/main.js`;

/** A template of the storefront's views. */
export function isStorefrontTemplate(path: string): boolean {
  return path.startsWith(`${STOREFRONT_VIEWS}/`) && path.endsWith('.html.twig');
}

/** Storefront scripts the index reads: no tests or type declarations. */
export function isStorefrontSource(path: string): boolean {
  return (
    path.startsWith(`${STOREFRONT_SRC}/`) &&
    /\.[jt]s$/u.test(path) &&
    !/\.spec\.|\.d\.ts$|\/__mocks__\/|\/(?:test|tests)\//u.test(path)
  );
}

function deprecation(deprecated: string | undefined): Flags {
  return deprecated === undefined ? {} : { deprecated };
}

/** A template and its blocks; the template's signature is the one it extends. */
export function templateItems(twig: string, file: string): Item[] {
  const id = `storefront:@Storefront/storefront/${file.slice(STOREFRONT_VIEWS.length + 1)}`;
  const scanned = scanTwig(twig);
  const items: Item[] = [
    { id, kind: 'template', file, signature: scanned.extends ?? '', flags: deprecation(scanned.deprecated) },
  ];
  const seen = new Set<string>();
  for (const block of scanned.blocks) {
    if (seen.has(block.name)) continue;
    seen.add(block.name);
    items.push({
      id: `${id}#${block.name}`,
      kind: 'block',
      file,
      signature: block.parent ?? '',
      flags: deprecation(block.deprecated),
    });
  }
  return items;
}

export interface PluginRegistration {
  name: string;
  selector?: string;
  /** The plugin's module, resolved. */
  source?: string;
}

/** The plugins `main.js` registers. */
export function pluginRegistrations(code: string, files: ReadonlySet<string>): PluginRegistration[] {
  const ast = parseJs(code, STOREFRONT_MAIN);
  const imports = importsOf(ast.program.body);
  const out: PluginRegistration[] = [];
  walkJs(ast.program, (node) => {
    if (node.type !== 'CallExpression' || memberName(node.callee) !== 'PluginManager.register') return false;
    const name = stringOf(node.arguments[0]);
    if (name === undefined) return false;
    const registration: PluginRegistration = { name };
    const selector = stringOf(node.arguments[2]);
    if (selector !== undefined) registration.selector = selector;
    const specifier = sourceOf(node.arguments[1], imports);
    const source =
      specifier === undefined ? undefined : resolveImport(STOREFRONT_MAIN, specifier, files, STOREFRONT_SRC);
    if (source !== undefined) registration.source = source;
    out.push(registration);
    return true;
  });
  return out;
}

function memberFlags(member: Node): Flags {
  return deprecation(deprecatedIn(member.leadingComments));
}

function pluginMembers(body: ClassBody, id: string, file: string): Item[] {
  const items: Item[] = [];
  for (const member of body.body) {
    const name = keyOf(member);
    if (member.type === 'ClassProperty' && member.static && member.key.type === 'Identifier') {
      if (member.key.name !== 'options' || member.value?.type !== 'ObjectExpression') continue;
      for (const option of member.value.properties) {
        const key = keyOf(option);
        if (key !== undefined)
          items.push({ id: `${id}.option.${key}`, kind: 'option', file, signature: '', flags: memberFlags(option) });
      }
    } else if (member.type === 'ClassMethod' && !member.static && member.kind === 'method' && name !== undefined) {
      if (name.startsWith('_') || privateIn(member.leadingComments)) continue;
      items.push({ id: `${id}.js-method.${name}`, kind: 'js-method', file, signature: '', flags: memberFlags(member) });
    }
  }
  return items;
}

/** The items of one plugin. `read` returns a file's text. */
export function pluginItems(registration: PluginRegistration, read: (path: string) => string | undefined): Item[] {
  const id = `js-plugin:${registration.name}`;
  const file = registration.source ?? STOREFRONT_MAIN;
  const head: Item = { id, kind: 'js-plugin', file, signature: registration.selector ?? '', flags: {} };
  const code = registration.source === undefined ? undefined : read(registration.source);
  if (code === undefined) return [head];
  const exported = defaultExport(parseJs(code, file));
  head.flags = deprecation(deprecatedIn(exported.comments));
  const value = exported.value;
  if (value?.type !== 'ClassDeclaration' && value?.type !== 'ClassExpression') return [head];
  return [head, ...pluginMembers(value.body, id, file)];
}
