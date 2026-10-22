// The HTTP surface: Store API, Admin API and storefront routes from the
// `#[Route]` attributes of controllers, and whether the OpenAPI schema files
// of core document them. A route is public API even when its controller
// class is `@internal`, so only the route method's own docblock and a
// deprecated controller decide its flags.
import type { Constants } from './constants.ts';
import type { Flags, Item } from './model.ts';
import { child, children, classFqcn, isNode, type Node, text } from './node.ts';
import { featureTest } from './field-flow.ts';
import { attributes, flagsOf, phpClasses } from './php.ts';
import type { Scope } from './php-scope.ts';
import { bindArgs, isArray, isConstant, shortName, type Value, valueOf } from './php-value.ts';

const ROUTE = 'Symfony\\Component\\Routing\\Attribute\\Route';
const ROUTE_ANNOTATION = 'Symfony\\Component\\Routing\\Annotation\\Route';
const ROUTE_PARAMS = ['path', 'name', 'requirements', 'options', 'defaults', 'host', 'methods'];
const SCOPE_KEYS = new Set(['_routeScope', 'Shopware\\Core\\PlatformRequest::ATTRIBUTE_ROUTE_SCOPE']);

/** Where the OpenAPI path files live, and the prefix their paths are under. */
export const SCHEMA_DIRS: [string, string][] = [
  ['/StoreApi/paths/', '/store-api'],
  ['/AdminApi/paths/', '/api'],
];

interface RouteAttr {
  path?: string;
  name?: string;
  methods: string[];
  scope?: string;
}

/** `StoreApiRouteScope::ID` → `store-api`; a string scope stays as it is. */
function scopeName(value: Value): string | undefined {
  if (typeof value === 'string') return value;
  if (!isConstant(value)) return undefined;
  const owner = shortName(value.constant.split('::')[0] ?? '');
  const base = owner.replace(/RouteScope$/u, '');
  if (base === owner) return undefined;
  return base
    .replaceAll(/([a-z])([A-Z])/gu, '$1-$2')
    .replace(/^Api$/u, 'api')
    .toLowerCase();
}

/** `['GET', Request::METHOD_POST]` → `['GET', 'POST']`. */
function methodsOf(value: Value | undefined): string[] {
  const list = isArray(value) ? value.entries.map((entry) => entry.value) : value === undefined ? [] : [value];
  return list
    .map((item) => (isConstant(item) ? /::METHOD_(\w+)$/u.exec(item.constant)?.[1] : item))
    .filter((item) => typeof item === 'string')
    .map((item) => item.toUpperCase());
}

/** A string, or a class constant that holds one; `self::` is the class itself. */
function stringOf(value: Value | undefined, fqcn: string, constants: Constants | undefined): string | undefined {
  if (typeof value === 'string') return value;
  if (!isConstant(value)) return undefined;
  return constants?.(value.constant.replace(/^(self|static)::/u, `${fqcn}::`));
}

function routeAttrs(node: Node, scope: Scope, fqcn: string, constants: Constants | undefined): RouteAttr[] {
  return attributes(node, scope)
    .filter((attr) => attr.name === ROUTE || attr.name === ROUTE_ANNOTATION)
    .map((attr) => {
      const args = bindArgs(attr.args, ROUTE_PARAMS, scope);
      const path = stringOf(args.get('path'), fqcn, constants);
      const name = stringOf(args.get('name'), fqcn, constants);
      const out: RouteAttr = { methods: methodsOf(args.get('methods')) };
      if (typeof path === 'string') out.path = path;
      if (typeof name === 'string') out.name = name;
      const defaults = args.get('defaults');
      if (isArray(defaults)) {
        for (const entry of defaults.entries) {
          const key = isConstant(entry.key) ? entry.key.constant : entry.key;
          if (typeof key !== 'string' || !SCOPE_KEYS.has(key)) continue;
          const first = isArray(entry.value) ? entry.value.entries[0]?.value : entry.value;
          const found = first === undefined ? undefined : scopeName(first);
          if (found !== undefined) out.scope = found;
        }
      }
      return out;
    });
}

/** A version like `v6.8.0.0` in the form the flags use, `v6.8.0`. */
function flagVersion(raw: string): string {
  const parts = /^v?(\d+)\.(\d+)\.(\d+)/u.exec(raw);
  return parts === null ? '' : `v${parts[1]}.${parts[2]}.${parts[3]}`;
}

/** A deprecation the method states other than in its docblock: a plain
 *  comment with `@deprecated`, or a `Feature::triggerDeprecationOrThrow()`
 *  the handler makes on every call (not one under a request check). */
function codeDeprecation(method: Node, scope: Scope): string | undefined {
  const comments = [
    ...children(method, 'leadingComments'),
    ...children(method, 'attrGroups').flatMap((group) => children(group, 'leadingComments')),
  ].map((comment) => text(comment, 'value') ?? '');
  const note = comments.find((comment) => /@deprecated\b/u.test(comment));
  if (note !== undefined) return /tag:(v[\d.]+)/u.exec(note)?.[1] ?? '';
  const statements = (node: Node | undefined): Node[] =>
    children(node ?? {}, 'children').flatMap((statement) => {
      if (statement.kind !== 'if' || featureTest(statement, scope) === undefined) return [statement];
      return statements(child(statement, 'body'));
    });
  for (const statement of statements(child(method, 'body'))) {
    const call = statement.kind === 'expressionstatement' ? child(statement, 'expression') : undefined;
    const what = call?.kind === 'call' ? child(call, 'what') : undefined;
    if (what?.kind !== 'staticlookup' || text(child(what, 'offset'), 'name') !== 'triggerDeprecationOrThrow') continue;
    const version = valueOf(children(call ?? {}, 'arguments')[0], scope);
    return typeof version === 'string' ? flagVersion(version) : '';
  }
  return undefined;
}

function routeFlags(method: Node, klass: Flags, scope: Scope): Flags {
  const own = flagsOf(method, scope, false);
  if (own.deprecated === undefined) {
    const found = codeDeprecation(method, scope);
    if (found !== undefined) own.deprecated = found;
  }
  const flags: Flags = {};
  if (own.internal === true) flags.internal = true;
  const deprecated = own.deprecated ?? klass.deprecated;
  if (deprecated !== undefined) flags.deprecated = deprecated;
  const experimental = own.experimental ?? klass.experimental;
  if (experimental !== undefined) flags.experimental = experimental;
  return flags;
}

/** Routes declared in one PHP file. */
export function routeItems(code: string, file: string, constants?: Constants): Item[] {
  const items: Item[] = [];
  for (const { node, scope } of phpClasses(code, file)) {
    const fqcn = classFqcn(node, scope.namespace);
    if (fqcn === undefined) continue;
    const [prefix] = routeAttrs(node, scope, fqcn, constants);
    const klass = flagsOf(node, scope, false);
    for (const method of children(node, 'body').filter((member) => member.kind === 'method')) {
      for (const attr of routeAttrs(method, scope, fqcn, constants)) {
        if (attr.path === undefined) continue;
        // Symfony adds the leading slash a path is written without.
        const path = `/${`${prefix?.path ?? ''}${attr.path}`.replace(/^\/+/u, '')}`;
        const methods = attr.methods.length > 0 ? attr.methods.toSorted() : ['ANY'];
        const name = attr.name === undefined ? undefined : `${prefix?.name ?? ''}${attr.name}`;
        const item: Item = {
          id: `route:${name ?? `${methods.join('|')} ${path}`}`,
          kind: 'route',
          file,
          signature: `${methods.join('|')} ${path}`,
          flags: routeFlags(method, klass, scope),
        };
        const routeScope = attr.scope ?? prefix?.scope;
        if (routeScope !== undefined) item.scope = routeScope;
        items.push(item);
      }
    }
  }
  return items;
}

/** `GET /store-api/account/customer`-style keys of every operation in one
 *  OpenAPI paths file. */
export function schemaOperations(json: string, prefix: string): string[] {
  const parsed: unknown = JSON.parse(json);
  const paths = isNode(parsed) ? parsed.paths : undefined;
  if (!isNode(paths)) return [];
  const out: string[] = [];
  for (const [path, operations] of Object.entries(paths)) {
    if (!isNode(operations)) continue;
    for (const method of Object.keys(operations)) out.push(`${method.toUpperCase()} ${prefix}${path}`);
  }
  return out;
}

/** The path with its placeholders blanked, so `{id}` and `{productId}` match. */
function pathKey(path: string): string {
  return path.replaceAll(/\{[^}]*\}/gu, '{}').replace(/\/$/u, '');
}

/** Marks the routes the schema documents with at least one of their methods. */
export function markSchema(routes: Item[], operations: string[]): void {
  const documented = new Set(
    operations.map((operation) => {
      const [method = '', path = ''] = operation.split(' ');
      return `${method} ${pathKey(path)}`;
    }),
  );
  for (const route of routes) {
    const [methods = '', path = ''] = (route.signature ?? '').split(' ');
    const key = pathKey(path);
    const list = methods === 'ANY' ? ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'] : methods.split('|');
    if (list.some((method) => documented.has(`${method} ${key}`))) route.schema = true;
  }
}
