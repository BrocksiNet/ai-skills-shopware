// The PHP surface of one file: classes, interfaces, traits and enums, with
// their public and protected methods, properties and constants, and the
// flags from docblocks and attributes that decide whether the BC promise
// covers them.
import { Engine } from 'php-parser';
import type { Flags, Item, ItemKind } from './model.ts';
import { child, children, classFqcn, flag, isNode, nameOf, type Node, text } from './node.ts';
import { addUses, resolve, type Scope } from './php-scope.ts';

const BC_CHANGE = 'Shopware\\Core\\Framework\\Deprecation\\BCChange\\';
const CLASS_KINDS = new Set(['class', 'interface', 'trait', 'enum']);

const parser = new Engine({
  parser: { php8: true, extractDoc: true, suppressErrors: false },
  ast: { withPositions: false },
});
const positionParser = new Engine({
  parser: { php8: true, extractDoc: true, suppressErrors: false },
  ast: { withPositions: true },
});

function resolveNode(node: Node | undefined, scope: Scope): string | undefined {
  const name = text(node, 'name');
  return name === undefined ? undefined : resolve(name, text(node, 'resolution'), scope);
}

/** A type as written, with class names fully qualified. */
export function typeText(type: Node | undefined, nullable: boolean, scope: Scope): string {
  if (type === undefined) return '';
  let out: string;
  switch (type.kind) {
    case 'uniontype':
      out = children(type, 'types')
        .map((part) => {
          const inner = typeText(part, false, scope);
          return part.kind === 'intersectiontype' ? `(${inner})` : inner;
        })
        .join('|');
      break;
    case 'intersectiontype':
      out = children(type, 'types')
        .map((part) => typeText(part, false, scope))
        .join('&');
      break;
    case 'typereference':
      out = (text(type, 'name') ?? '').toLowerCase();
      break;
    case 'selfreference':
    case 'parentreference':
      out = (text(type, 'raw') ?? '').toLowerCase();
      break;
    default:
      out = resolveNode(type, scope) ?? '';
  }
  return nullable && out !== '' ? `?${out}` : out;
}

/** The docblock of a declaration: php-parser attaches it to the node, or to
 *  the first attribute group when there are attributes. */
export function docblock(node: Node): string {
  const comments = [
    ...children(node, 'leadingComments'),
    ...children(node, 'attrGroups').flatMap((group) => children(group, 'leadingComments')),
  ];
  const blocks = comments.map((comment) => text(comment, 'value') ?? '').filter((value) => value.startsWith('/**'));
  return blocks.at(-1) ?? '';
}

export function attributes(node: Node, scope: Scope): { name: string; args: Node[] }[] {
  return children(node, 'attrGroups')
    .flatMap((group) => children(group, 'attrs'))
    .map((attr) => ({ name: resolve(text(attr, 'name') ?? '', undefined, scope), args: children(attr, 'args') }));
}

function argText(args: Node[], named: string): string | undefined {
  const byName = args.find((arg) => arg.kind === 'namedargument' && text(arg, 'name') === named);
  const value = byName === undefined ? undefined : child(byName, 'value');
  return text(value, 'value');
}

/** Flags of a declaration from its docblock and attributes. */
export function flagsOf(node: Node, scope: Scope, isFinal: boolean): Flags {
  const doc = docblock(node);
  const flags: Flags = {};
  if (/@internal\b/u.test(doc)) flags.internal = true;
  const deprecated = /@deprecated\b[^\n]*/u.exec(doc)?.[0];
  if (deprecated !== undefined) flags.deprecated = /tag:(v[\d.]+)/u.exec(deprecated)?.[1] ?? '';
  const experimental = /@experimental\b[^\n]*/u.exec(doc)?.[0];
  if (experimental !== undefined) flags.experimental = /stableVersion:(v[\d.]+)/u.exec(experimental)?.[1] ?? '';
  if (isFinal) flags.final = 'keyword';
  else if (/@final\b/u.test(doc)) flags.final = 'doc';
  const changes = attributes(node, scope)
    .filter((attr) => attr.name.startsWith(BC_CHANGE))
    .map((attr) => `${attr.name.slice(BC_CHANGE.length)}@${argText(attr.args, 'version') ?? ''}`);
  if (changes.length > 0) flags.bcChanges = changes;
  return flags;
}

function packageOf(node: Node, scope: Scope): string | undefined {
  const attr = attributes(node, scope).find((candidate) => candidate.name.endsWith('\\Package'));
  return text(attr?.args[0], 'value');
}

function kindOf(kind: string): ItemKind {
  if (kind === 'interface' || kind === 'trait' || kind === 'enum') return kind;
  return 'class';
}

function parentNames(node: Node, kind: string, scope: Scope): { extends: string[]; implements: string[] } {
  const names = (key: string): string[] => {
    const single = child(node, key);
    const list = single === undefined ? children(node, key) : [single];
    return list.map((parent) => resolveNode(parent, scope)).filter((value) => value !== undefined);
  };
  // An interface's parents are `extends`, which php-parser stores as an array.
  return { extends: names('extends'), implements: kind === 'interface' ? [] : names('implements') };
}

/** `public` and `protected` members are API; no modifier means public. */
function visibilityOf(node: Node): 'public' | 'protected' | undefined {
  const visibility = text(node, 'visibility');
  if (visibility === 'private') return undefined;
  return visibility === 'protected' ? 'protected' : 'public';
}

function paramText(param: Node, scope: Scope): string {
  const type = typeText(child(param, 'type'), flag(param, 'nullable'), scope);
  const ref = flag(param, 'byref') ? '&' : '';
  const variadic = flag(param, 'variadic') ? '...' : '';
  const value = child(param, 'value') === undefined ? '' : ' = …';
  return `${type === '' ? '' : `${type} `}${ref}${variadic}$${nameOf(param) ?? ''}${value}`;
}

/** A promoted constructor parameter is a property. `flags`: 1 public,
 *  2 protected, 4 private. */
function promotedItem(param: Node, fqcn: string, scope: Scope, file: string): Item[] {
  const bits = typeof param.flags === 'number' ? param.flags : 0;
  const visibility = (bits & 1) === 1 ? 'public' : (bits & 2) === 2 ? 'protected' : undefined;
  if (visibility === undefined) return [];
  return [
    {
      id: `php:${fqcn}::$${nameOf(param) ?? ''}`,
      kind: 'property',
      file,
      visibility,
      signature: typeText(child(param, 'type'), flag(param, 'nullable'), scope),
      flags: flagsOf(param, scope, false),
    },
  ];
}

function methodItems(method: Node, fqcn: string, scope: Scope, file: string): Item[] {
  const visibility = visibilityOf(method);
  const name = nameOf(method);
  if (visibility === undefined || name === undefined) return [];
  const params = children(method, 'arguments');
  const returns = typeText(child(method, 'type'), flag(method, 'nullable'), scope);
  const item: Item = {
    id: `php:${fqcn}::${name}()`,
    kind: 'method',
    file,
    visibility,
    signature: `(${params.map((param) => paramText(param, scope)).join(', ')})${returns === '' ? '' : `: ${returns}`}`,
    flags: flagsOf(method, scope, flag(method, 'isFinal')),
  };
  if (flag(method, 'isStatic')) item.static = true;
  if (flag(method, 'isAbstract')) item.abstract = true;
  const promoted = name === '__construct' ? params.flatMap((param) => promotedItem(param, fqcn, scope, file)) : [];
  return [item, ...promoted];
}

function propertyItems(statement: Node, fqcn: string, scope: Scope, file: string): Item[] {
  const visibility = visibilityOf(statement);
  if (visibility === undefined) return [];
  return children(statement, 'properties').map((property) => {
    const item: Item = {
      id: `php:${fqcn}::$${nameOf(property) ?? ''}`,
      kind: 'property',
      file,
      visibility,
      signature: typeText(child(property, 'type'), flag(property, 'nullable'), scope),
      flags: flagsOf(statement, scope, flag(statement, 'isFinal')),
    };
    if (flag(statement, 'isStatic')) item.static = true;
    return item;
  });
}

function constantItems(statement: Node, fqcn: string, scope: Scope, file: string): Item[] {
  const visibility = visibilityOf(statement);
  if (visibility === undefined) return [];
  return children(statement, 'constants').map((constant) => ({
    id: `php:${fqcn}::${nameOf(constant) ?? ''}`,
    kind: 'constant',
    file,
    visibility,
    flags: flagsOf(statement, scope, flag(statement, 'final')),
  }));
}

function memberItems(member: Node, fqcn: string, scope: Scope, file: string): Item[] {
  switch (member.kind) {
    case 'method':
      return methodItems(member, fqcn, scope, file);
    case 'propertystatement':
      return propertyItems(member, fqcn, scope, file);
    case 'classconstant':
      return constantItems(member, fqcn, scope, file);
    case 'enumcase':
      return [{ id: `php:${fqcn}::${nameOf(member) ?? ''}`, kind: 'case', file, visibility: 'public', flags: {} }];
    default:
      return [];
  }
}

function classItems(node: Node, scope: Scope, file: string): Item[] {
  const fqcn = classFqcn(node, scope.namespace);
  if (fqcn === undefined) return [];
  const kind = String(node.kind);
  const head: Item = {
    id: `php:${fqcn}`,
    kind: kindOf(kind),
    file,
    flags: flagsOf(node, scope, flag(node, 'isFinal')),
  };
  if (flag(node, 'isAbstract')) head.abstract = true;
  const parents = parentNames(node, kind, scope);
  if (parents.extends.length > 0) head.extends = parents.extends;
  if (parents.implements.length > 0) head.implements = parents.implements;
  const area = packageOf(node, scope);
  if (area !== undefined) head.package = area;
  const traits = children(node, 'body')
    .filter((member) => member.kind === 'traituse')
    .flatMap((member) => children(member, 'traits'))
    .map((trait) => resolveNode(trait, scope))
    .filter((value) => value !== undefined);
  if (traits.length > 0) head.traits = traits;
  const members = children(node, 'body').flatMap((member) => memberItems(member, fqcn, scope, file));
  return [head, ...members];
}

/** Class-likes in a statement, also inside `if (class_exists(…))` blocks,
 *  which core uses for classes that depend on an optional bundle. */
function declarations(node: Node): Node[] {
  if (CLASS_KINDS.has(String(node.kind))) return [node];
  if (node.kind === 'block') return children(node, 'children').flatMap((statement) => declarations(statement));
  if (node.kind !== 'if') return [];
  return [child(node, 'body'), child(node, 'alternate')].flatMap((branch) =>
    branch === undefined ? [] : declarations(branch),
  );
}

/** The class-likes of one PHP file with the scope each is declared in.
 *  Throws when the file does not parse. */
export function phpClasses(code: string, file: string, positions = false): { node: Node; scope: Scope }[] {
  const program: unknown = (positions ? positionParser : parser).parseCode(code, file);
  if (!isNode(program)) return [];
  const out: { node: Node; scope: Scope }[] = [];
  const top = children(program, 'children');
  const namespaces = top.filter((node) => node.kind === 'namespace');
  for (const block of namespaces.length > 0 ? namespaces : [program]) {
    const scope: Scope = { namespace: text(block, 'name') ?? '', uses: new Map() };
    for (const node of children(block, 'children')) {
      if (node.kind === 'usegroup') addUses(scope, node);
      else out.push(...declarations(node).map((declaration) => ({ node: declaration, scope })));
    }
  }
  return out;
}

/** Items of one PHP file. Throws when the file does not parse. */
export function phpItems(code: string, file: string): Item[] {
  return phpClasses(code, file).flatMap(({ node, scope }) => classItems(node, scope, file));
}
