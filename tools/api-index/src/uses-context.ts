// What the use extractor knows while it walks one file: the namespace and
// imports, the class it is in, and the types of variables and properties.
import { child, children, nameOf, type Node, text } from './node.ts';
import { resolve, type Scope } from './php-scope.ts';

export type UseKind =
  | 'import'
  | 'extends'
  | 'implements'
  | 'new'
  | 'static-call'
  | 'call'
  | 'constant'
  | 'class-ref'
  | 'type'
  | 'attribute'
  /** `class_exists(Foo::class)`, `method_exists(Foo::class, 'bar')` and the like. */
  | 'guard';

export interface Use {
  /** `php:Fqcn` or `php:Fqcn::member()` / `php:Fqcn::CONSTANT`, as in the index. */
  target: string;
  how: UseKind;
  file: string;
  line: number;
}

export interface FileUses {
  uses: Use[];
  /** Method calls whose receiver type is not known in the file. */
  unresolved: number;
}

const SCALARS = new Set([
  'array',
  'bool',
  'callable',
  'false',
  'float',
  'int',
  'iterable',
  'mixed',
  'never',
  'null',
  'object',
  'string',
  'true',
  'void',
  'self',
  'static',
  'parent',
]);

/** Classes worth looking up: Shopware's own namespaces. */
export function isShopware(fqcn: string): boolean {
  return /^Shopware\\(Core|Storefront|Administration|Elasticsearch)\\/u.test(fqcn);
}

function lineOf(node: Node): number {
  const start = child(child(node, 'loc') ?? {}, 'start');
  const line = start?.line;
  return typeof line === 'number' ? line : 0;
}

export interface ClassContext {
  fqcn: string;
  parent: string | undefined;
  /** Property name → class type. */
  properties: Map<string, string>;
  /** Methods the class declares itself, lower-cased. */
  methods: Set<string>;
  /** True when the class uses a trait that is not Shopware's, whose methods are unknown here. */
  foreignTraits: boolean;
}

export interface Walk {
  file: string;
  scope: Scope;
  out: Use[];
  unresolved: number;
  klass: ClassContext | undefined;
  /** Variable name → class type, from parameters and `new` assignments. */
  vars: Map<string, string>;
}

/** Class names in a type node (union and intersection parts). */
export function typeNames(type: Node | undefined, scope: Scope): string[] {
  if (type === undefined) return [];
  if (type.kind === 'uniontype' || type.kind === 'intersectiontype') {
    return children(type, 'types').flatMap((part) => typeNames(part, scope));
  }
  if (type.kind !== 'name') return [];
  const name = text(type, 'name') ?? '';
  if (SCALARS.has(name.toLowerCase())) return [];
  return [resolve(name, text(type, 'resolution'), scope)];
}

/** The single class of a type, for receivers: `?Foo` and `Foo` count, a union does not. */
export function singleType(type: Node | undefined, scope: Scope): string | undefined {
  const names = typeNames(type, scope);
  return names.length === 1 && type?.kind === 'name' ? names[0] : undefined;
}

export function add(walk: Walk, target: string, how: UseKind, node: Node): void {
  const fqcn = target.replace(/^php:/u, '').split('::')[0] ?? '';
  if (!isShopware(fqcn)) return;
  walk.out.push({ target, how, file: walk.file, line: lineOf(node) });
}

/** The class a `Foo::`, `self::`, `static::` or `parent::` refers to. */
export function classOfReference(node: Node | undefined, walk: Walk): string | undefined {
  if (node === undefined) return undefined;
  if (node.kind === 'name') return resolve(text(node, 'name') ?? '', text(node, 'resolution'), walk.scope);
  if (node.kind === 'parentreference') return walk.klass?.parent;
  if (node.kind === 'selfreference' || node.kind === 'staticreference') return walk.klass?.fqcn;
  return undefined;
}

/** The class of a receiver expression, when the file declares it. */
export function receiverType(node: Node | undefined, walk: Walk): string | undefined {
  if (node === undefined) return undefined;
  if (node.kind === 'variable') {
    const name = text(node, 'name');
    if (name === 'this') return walk.klass?.fqcn;
    return name === undefined ? undefined : walk.vars.get(name);
  }
  if (node.kind === 'propertylookup' || node.kind === 'nullsafepropertylookup') {
    const owner = child(node, 'what');
    if (owner?.kind !== 'variable' || text(owner, 'name') !== 'this') return undefined;
    const property = nameOf(child(node, 'offset') ?? {});
    return property === undefined ? undefined : walk.klass?.properties.get(property);
  }
  return undefined;
}

export function methodName(offset: Node | undefined): string | undefined {
  return offset?.kind === 'identifier' ? text(offset, 'name') : undefined;
}

export function classContext(node: Node, walk: Walk): ClassContext {
  const name = nameOf(node) ?? '';
  const fqcn = walk.scope.namespace === '' ? name : `${walk.scope.namespace}\\${name}`;
  const parentNode = child(node, 'extends');
  const parent = parentNode === undefined ? undefined : classOfReference(parentNode, walk);
  const properties = new Map<string, string>();
  const methods = new Set<string>();
  let foreignTraits = false;
  for (const member of children(node, 'body')) {
    if (member.kind === 'method') methods.add((nameOf(member) ?? '').toLowerCase());
    if (member.kind === 'traituse') {
      for (const trait of children(member, 'traits')) {
        const traitName = classOfReference(trait, walk);
        if (traitName === undefined || !isShopware(traitName)) foreignTraits = true;
      }
    }
    if (member.kind === 'propertystatement') {
      for (const property of children(member, 'properties')) {
        const type = singleType(child(property, 'type'), walk.scope);
        const propertyName = nameOf(property);
        if (type !== undefined && propertyName !== undefined) properties.set(propertyName, type);
      }
    }
    if (member.kind === 'method' && nameOf(member) === '__construct') {
      for (const param of children(member, 'arguments')) {
        const type = singleType(child(param, 'type'), walk.scope);
        const paramName = nameOf(param);
        if (type !== undefined && paramName !== undefined && param.flags !== 0) properties.set(paramName, type);
      }
    }
  }
  return { fqcn, parent, properties, methods, foreignTraits };
}
