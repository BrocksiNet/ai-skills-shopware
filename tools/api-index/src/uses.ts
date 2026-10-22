// The Shopware API an extension's PHP uses, read from the AST: imports,
// extends and implements, `new`, static calls and constants, type hints,
// attributes, and method calls on a receiver whose type is declared in the
// same class (`$this->…`, a typed property or parameter). Anything else is
// counted as unresolved, never guessed.
import { Engine } from 'php-parser';
import { child, children, isNode, nameOf, type Node, text } from './node.ts';
import { addUses, resolve } from './php.ts';
import {
  add,
  classContext,
  classOfReference,
  type FileUses,
  methodName,
  receiverType,
  singleType,
  typeNames,
  type Use,
  type Walk,
} from './uses-context.ts';

export { type FileUses, isShopware, type Use, type UseKind } from './uses-context.ts';

const parser = new Engine({
  parser: { php8: true, extractDoc: false, suppressErrors: false },
  ast: { withPositions: true },
});

function visitCall(node: Node, walk: Walk): void {
  const what = child(node, 'what');
  if (what === undefined) return;
  if (what.kind === 'staticlookup') {
    const owner = classOfReference(child(what, 'what'), walk);
    const name = methodName(child(what, 'offset'));
    if (owner !== undefined && name !== undefined) add(walk, `php:${owner}::${name}()`, 'static-call', node);
    return;
  }
  if (what.kind === 'propertylookup' || what.kind === 'nullsafepropertylookup') {
    const name = methodName(child(what, 'offset'));
    const owner = receiverType(child(what, 'what'), walk);
    if (name === undefined) return;
    if (owner === undefined) walk.unresolved += 1;
    // `$this->foo()` on the extension's own class only matters when a
    // Shopware parent declares `foo`; the lookup walks the parents.
    else if (owner === walk.klass?.fqcn) {
      if (walk.klass.methods.has(name.toLowerCase())) return;
      if (walk.klass.parent === undefined || walk.klass.foreignTraits) walk.unresolved += 1;
      else add(walk, `php:${walk.klass.parent}::${name}()`, 'call', node);
    } else add(walk, `php:${owner}::${name}()`, 'call', node);
  }
}

/** `$x = new Foo()` types `$x` for the rest of the method. */
function typeVariable(node: Node, walk: Walk): void {
  const left = child(node, 'left');
  const right = child(node, 'right');
  const owner = right?.kind === 'new' ? classOfReference(child(right, 'what'), walk) : undefined;
  const name = left?.kind === 'variable' ? text(left, 'name') : undefined;
  if (owner !== undefined && name !== undefined) walk.vars.set(name, owner);
}

function visit(node: Node, walk: Walk): void {
  switch (node.kind) {
    case 'new': {
      const owner = classOfReference(child(node, 'what'), walk);
      if (owner !== undefined) add(walk, `php:${owner}`, 'new', node);
      break;
    }
    case 'call':
      visitCall(node, walk);
      break;
    case 'staticlookup': {
      const owner = classOfReference(child(node, 'what'), walk);
      const offset = child(node, 'offset');
      const name = offset?.kind === 'identifier' ? text(offset, 'name') : undefined;
      if (owner === undefined || name === undefined) break;
      add(
        walk,
        name.toLowerCase() === 'class' ? `php:${owner}` : `php:${owner}::${name}`,
        name.toLowerCase() === 'class' ? 'class-ref' : 'constant',
        node,
      );
      break;
    }
    case 'instanceof': {
      const owner = classOfReference(child(node, 'right'), walk);
      if (owner !== undefined) add(walk, `php:${owner}`, 'class-ref', node);
      break;
    }
    case 'catch':
      for (const name of children(node, 'what')) {
        const owner = classOfReference(name, walk);
        if (owner !== undefined) add(walk, `php:${owner}`, 'class-ref', node);
      }
      break;
    case 'attribute':
      add(walk, `php:${resolve(text(node, 'name') ?? '', undefined, walk.scope)}`, 'attribute', node);
      break;
    case 'parameter':
    case 'property':
      for (const name of typeNames(child(node, 'type'), walk.scope)) add(walk, `php:${name}`, 'type', node);
      break;
    case 'assign':
      typeVariable(node, walk);
      break;
    default:
      break;
  }
}

/** The AST nodes right below `node`, without positions and comments. */
function childNodes(node: Node): Node[] {
  return Object.entries(node)
    .filter(([key]) => key !== 'loc' && key !== 'leadingComments')
    .flatMap(([, value]): unknown[] => (Array.isArray(value) ? value : [value]))
    .filter((entry): entry is Node => isNode(entry) && typeof entry.kind === 'string');
}

/** Visits every node below `node`; methods and closures get their own variables. */
function walkTree(node: Node, walk: Walk): void {
  if (node.kind === 'method' || node.kind === 'function' || node.kind === 'closure' || node.kind === 'arrowfunc') {
    const vars = new Map(node.kind === 'arrowfunc' ? walk.vars : []);
    for (const param of children(node, 'arguments')) {
      const type = singleType(child(param, 'type'), walk.scope);
      const name = nameOf(param);
      if (type !== undefined && name !== undefined) vars.set(name, type);
    }
    for (const type of typeNames(child(node, 'type'), walk.scope)) add(walk, `php:${type}`, 'type', node);
    const inner: Walk = { ...walk, vars, unresolved: 0 };
    for (const entry of childNodes(node)) walkTree(entry, inner);
    walk.unresolved += inner.unresolved;
    return;
  }
  visit(node, walk);
  if (node.kind === 'call' && child(node, 'what')?.kind === 'staticlookup') {
    // The lookup is the call's target, not a constant; only the arguments are left.
    for (const argument of children(node, 'arguments')) walkTree(argument, walk);
    return;
  }
  for (const entry of childNodes(node)) walkTree(entry, walk);
}

function visitClass(node: Node, walk: Walk): void {
  const klass = classContext(node, walk);
  const inner: Walk = { ...walk, klass, unresolved: 0 };
  if (klass.parent !== undefined) add(inner, `php:${klass.parent}`, 'extends', node);
  for (const parent of children(node, 'implements')) {
    const owner = classOfReference(parent, walk);
    if (owner !== undefined) add(inner, `php:${owner}`, 'implements', node);
  }
  if (node.kind === 'interface') {
    for (const parent of children(node, 'extends')) {
      const owner = classOfReference(parent, walk);
      if (owner !== undefined) add(inner, `php:${owner}`, 'extends', node);
    }
  }
  for (const key of ['attrGroups', 'body']) {
    for (const entry of children(node, key)) walkTree(entry, inner);
  }
  walk.unresolved += inner.unresolved;
}

const CLASS_KINDS = new Set(['class', 'interface', 'trait', 'enum']);

/** The condition and branches of an `if` or the statements of a block. */
function branchNodes(statement: Node): Node[] {
  return ['test', 'body', 'alternate', 'children']
    .map((key) => statement[key])
    .flatMap((value): unknown[] => (Array.isArray(value) ? value : [value]))
    .filter((entry) => isNode(entry));
}

function visitStatements(statements: Node[], walk: Walk): void {
  for (const statement of statements) {
    if (statement.kind === 'usegroup') {
      addUses(walk.scope, statement);
      for (const item of children(statement, 'items')) {
        const prefix = text(statement, 'name');
        const name = text(item, 'name') ?? '';
        const full = (prefix === undefined ? name : `${prefix}\\${name}`).replace(/^\\/u, '');
        add(walk, `php:${full}`, 'import', statement);
      }
    } else if (CLASS_KINDS.has(String(statement.kind))) {
      visitClass(statement, walk);
    } else if (statement.kind === 'if' || statement.kind === 'block') {
      for (const entry of branchNodes(statement)) {
        if (entry.kind === 'block') visitStatements(children(entry, 'children'), walk);
        else if (CLASS_KINDS.has(String(entry.kind))) visitClass(entry, walk);
        else walkTree(entry, walk);
      }
    } else walkTree(statement, walk);
  }
}

/** The Shopware API one PHP file uses. Throws when the file does not parse. */
export function phpUses(code: string, file: string): FileUses {
  const program: unknown = parser.parseCode(code, file);
  if (!isNode(program)) return { uses: [], unresolved: 0 };
  const top = children(program, 'children');
  const namespaces = top.filter((node) => node.kind === 'namespace');
  const out: Use[] = [];
  let unresolved = 0;
  for (const block of namespaces.length > 0 ? namespaces : [program]) {
    const walk: Walk = {
      file,
      scope: { namespace: text(block, 'name') ?? '', uses: new Map() },
      out,
      unresolved: 0,
      klass: undefined,
      vars: new Map(),
    };
    visitStatements(children(block, 'children'), walk);
    unresolved += walk.unresolved;
  }
  return { uses: out, unresolved };
}
