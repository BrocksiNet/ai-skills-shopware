// The admin surface: components registered with `Component.register()` and
// `Component.extend()`, with their props, methods, emits, slots and twig
// blocks; literal `position-identifier`s; and the `Shopware` global. A
// component marked `@private` is not public API. Deprecations come from the
// comment above the export, a member or a block, and from a template whose
// first content is a `@deprecated` comment.
import type { CallExpression, ClassBody, Comment, Node, ObjectExpression } from '@babel/types';
import {
  defaultExport,
  deprecatedIn,
  importsOf,
  keyOf,
  memberName,
  parseJs,
  privateIn,
  propertyOf,
  relativePath,
  resolveImport,
  sourceOf,
  stringOf,
  walkJs,
} from './js.ts';
import type { Flags, Item, ItemKind } from './model.ts';
import { scanTwig } from './twig.ts';

export const ADMIN_SRC = 'src/Administration/Resources/app/administration/src';

/** Admin sources the index reads: no tests, mocks or type declarations. */
export function isAdminSource(path: string): boolean {
  return (
    path.startsWith(`${ADMIN_SRC}/`) &&
    /\.(?:js|ts|html\.twig)$/u.test(path) &&
    !/\.spec\.|\.d\.ts$|\/__mocks__\/|\/(?:test|tests|e2e)\//u.test(path)
  );
}

export interface Registration {
  name: string;
  /** The component it extends, for `Component.extend()`. */
  base?: string;
  /** The file of the component's config, resolved. */
  source?: string;
  /** A config passed inline, as older releases do. */
  config?: ObjectExpression;
  /** The comments above an inline registration. */
  comments?: Comment[];
  file: string;
}

interface Context {
  file: string;
  files: ReadonlySet<string>;
  imports: Map<string, string>;
}

/** A `Component.register()` or `Component.extend()` call as a registration. */
function registrationOf(node: CallExpression, context: Context, comments: Comment[]): Registration | undefined {
  const callee = memberName(node.callee) ?? '';
  const extend = /(?:^|\.)Component\.extend$/u.test(callee);
  if (!extend && !/(?:^|\.)Component\.register$/u.test(callee)) return undefined;
  const name = stringOf(node.arguments[0]);
  if (name === undefined) return undefined;
  const { file } = context;
  const registration: Registration = { name, file };
  const base = extend ? stringOf(node.arguments[1]) : undefined;
  if (base !== undefined) registration.base = base;
  const arg = node.arguments[extend ? 2 : 1];
  if (arg?.type === 'ObjectExpression') {
    registration.source = file;
    registration.config = arg;
    registration.comments = comments;
  }
  const specifier = sourceOf(arg, context.imports);
  const source = specifier === undefined ? undefined : resolveImport(file, specifier, context.files, ADMIN_SRC);
  if (source !== undefined) registration.source = source;
  return registration;
}

/** The components one file registers. */
export function registrations(code: string, file: string, files: ReadonlySet<string>): Registration[] {
  const ast = parseJs(code, file);
  const context: Context = { file, files, imports: importsOf(ast.program.body) };
  const out: Registration[] = [];
  for (const statement of ast.program.body) {
    const comments = [...(statement.leadingComments ?? [])];
    walkJs(statement, (node) => {
      if (node.type !== 'CallExpression') return false;
      const registration = registrationOf(node, context, comments);
      if (registration !== undefined) out.push(registration);
      return false;
    });
  }
  return out;
}

/** The config object of a component file: the default export, or the
 *  object passed to `wrapComponentConfig()` or `defineComponent()`. */
export function configOf(value: Node | undefined): ObjectExpression | undefined {
  if (value?.type === 'ObjectExpression') return value;
  if (value?.type === 'CallExpression') {
    const [arg] = (value satisfies CallExpression).arguments;
    return arg?.type === 'ObjectExpression' ? arg : undefined;
  }
  if (value?.type === 'TSAsExpression' || value?.type === 'TSSatisfiesExpression') return configOf(value.expression);
  return undefined;
}

function memberFlags(member: Node): Flags {
  const flags: Flags = {};
  const deprecated = deprecatedIn(member.leadingComments);
  if (deprecated !== undefined) flags.deprecated = deprecated;
  if (privateIn(member.leadingComments)) flags.internal = true;
  return flags;
}

/** Props, methods and emits of a component config, as items under `id`. */
function members(config: ObjectExpression, id: string, file: string): Item[] {
  const items: Item[] = [];
  const add = (kind: ItemKind, name: string, signature: string, node: Node): void => {
    items.push({ id: `${id}.${kind}.${name}`, kind, file, signature, flags: memberFlags(node) });
  };
  const props = propertyOf(config, 'props');
  if (props?.type === 'ObjectExpression') {
    for (const prop of props.properties) {
      const name = keyOf(prop);
      if (name === undefined) continue;
      const value = prop.type === 'ObjectProperty' ? prop.value : undefined;
      const flag = value?.type === 'ObjectExpression' ? propertyOf(value, 'required') : undefined;
      const required = flag?.type === 'BooleanLiteral' && flag.value;
      add('prop', name, required ? 'required' : 'optional', prop);
    }
  } else if (props?.type === 'ArrayExpression') {
    for (const entry of props.elements) {
      const name = stringOf(entry);
      if (name !== undefined && entry !== null) add('prop', name, 'optional', entry);
    }
  }
  const methods = propertyOf(config, 'methods');
  if (methods?.type === 'ObjectExpression') {
    for (const method of methods.properties) {
      const name = keyOf(method);
      if (name !== undefined) add('js-method', name, '', method);
    }
  }
  const emits = propertyOf(config, 'emits');
  if (emits?.type === 'ArrayExpression') {
    for (const entry of emits.elements) {
      const name = stringOf(entry);
      if (name !== undefined && entry !== null) add('emit', name, '', entry);
    }
  }
  return items;
}

/** The items of one registered component. `read` returns a file's text. */
export function componentItems(registration: Registration, read: (path: string) => string | undefined): Item[] {
  const id = `admin:${registration.name}`;
  const file = registration.source ?? registration.file;
  const head: Item = {
    id,
    kind: 'component',
    file,
    signature: registration.base === undefined ? 'register' : `extends ${registration.base}`,
    flags: {},
  };
  const items: Item[] = [head];
  const seen = new Set<string>();
  const push = (item: Item): void => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    items.push(item);
  };
  const code = registration.source === undefined ? undefined : read(registration.source);
  if (code === undefined || registration.source === undefined) return items;
  const ast = parseJs(code, registration.source);
  const exported = defaultExport(ast);
  const comments = registration.comments ?? exported.comments;
  const deprecated = deprecatedIn(comments);
  if (deprecated !== undefined) head.flags.deprecated = deprecated;
  if (privateIn(comments) || privateIn(ast.program.body[0]?.leadingComments)) head.flags.internal = true;
  const config = registration.config ?? configOf(exported.value);
  if (config === undefined) return items;
  for (const item of members(config, id, registration.source)) push(item);
  const template = propertyOf(config, 'template');
  const imports = importsOf(ast.program.body);
  const specifier = template?.type === 'Identifier' ? imports.get(template.name) : undefined;
  const templateFile = specifier === undefined ? undefined : relativePath(registration.source, specifier);
  const twig = templateFile === undefined ? undefined : read(templateFile);
  if (templateFile === undefined || twig === undefined) return items;
  const scanned = scanTwig(twig);
  if (scanned.deprecated !== undefined && head.flags.deprecated === undefined)
    head.flags.deprecated = scanned.deprecated;
  for (const block of scanned.blocks) {
    const flags: Flags = {};
    if (block.deprecated !== undefined) flags.deprecated = block.deprecated;
    push({ id: `${id}#${block.name}`, kind: 'block', file: templateFile, signature: block.parent ?? '', flags });
  }
  for (const slot of scanned.slots) {
    push({ id: `${id}.slot.${slot}`, kind: 'slot', file: templateFile, signature: '', flags: {} });
  }
  return items;
}

/** Literal position identifiers of the admin templates. */
export function positionItems(twig: string, file: string): Item[] {
  return scanTwig(twig).positions.map((position) => ({
    id: `position:${position}`,
    kind: 'position',
    file,
    signature: '',
    flags: {},
  }));
}

function classMembers(body: ClassBody, prefix: string, file: string): Item[] {
  const items: Item[] = [];
  for (const member of body.body) {
    if (member.type !== 'ClassProperty' && member.type !== 'ClassMethod') continue;
    if (member.static || member.key.type !== 'Identifier') continue;
    if (member.type === 'ClassMethod' && member.kind === 'constructor') continue;
    if (member.type === 'ClassProperty' && member.accessibility === 'private') continue;
    const id = `${prefix}.${member.key.name}`;
    items.push({ id, kind: 'global', file, signature: '', flags: memberFlags(member) });
    const value = member.type === 'ClassProperty' ? member.value : undefined;
    if (value?.type !== 'ObjectExpression') continue;
    for (const property of value.properties) {
      const name = keyOf(property);
      if (name !== undefined)
        items.push({ id: `${id}.${name}`, kind: 'global', file, signature: '', flags: memberFlags(property) });
    }
  }
  return items;
}

export const SHOPWARE_GLOBAL = `${ADMIN_SRC}/core/shopware.ts`;

/** `Shopware.X` and `Shopware.X.y` from the class behind the global. */
export function globalItems(code: string, file: string): Item[] {
  const ast = parseJs(code, file);
  for (const statement of ast.program.body) {
    const declaration =
      statement.type === 'ExportDefaultDeclaration' || statement.type === 'ExportNamedDeclaration'
        ? statement.declaration
        : statement;
    if (declaration?.type === 'ClassDeclaration' && declaration.id?.name === 'ShopwareClass')
      return classMembers(declaration.body, 'global:Shopware', file);
  }
  return [];
}
