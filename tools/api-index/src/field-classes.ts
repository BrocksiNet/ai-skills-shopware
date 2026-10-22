// Field classes of the DAL and their constructors: the parameters with
// their defaults, and what each passes on to `parent::__construct()`. With
// these, a `new XField(…)` in `defineFields()` has a property name even when
// the subclass fixes it, as `VersionField` does.
import { child, children, classFqcn, isNode, nameOf, type Node, text } from './node.ts';
import { phpClasses } from './php.ts';
import { resolve, type Scope } from './php-scope.ts';
import { type Value, valueOf } from './php-value.ts';

const FIELD = 'Shopware\\Core\\Framework\\DataAbstractionLayer\\Field\\Field';

export interface Param {
  name: string;
  default?: Value;
}

/** One argument of a constructor's `parent::__construct()` call: a constant
 *  value, or one of the constructor's own parameters passed on. */
export interface Forward {
  name?: string;
  value?: Value;
  param?: string;
}

export interface FieldClass {
  parent?: string;
  /** Constructor parameters with their default values, when the class has a constructor. */
  params?: Param[];
  /** The arguments its constructor passes to `parent::__construct()`. */
  forward?: Forward[];
}

/** Every node below `node`, depth first, without descending where `visit` returns true. */
export function walk(node: Node, visit: (node: Node) => boolean): void {
  if (visit(node)) return;
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const item of value) if (isNode(item)) walk(item, visit);
    } else if (isNode(value)) walk(value, visit);
  }
}

function parentCall(ctor: Node): Node | undefined {
  let found: Node | undefined;
  walk(ctor, (node) => {
    if (found !== undefined) return true;
    const what = child(node, 'what');
    if (node.kind !== 'call' || what?.kind !== 'staticlookup') return false;
    if (child(what, 'what')?.kind !== 'parentreference' || text(child(what, 'offset'), 'name') !== '__construct')
      return false;
    found = node;
    return true;
  });
  return found;
}

function forwardOf(call: Node, scope: Scope): Forward[] {
  return children(call, 'arguments').map((arg) => {
    const named = arg.kind === 'namedargument';
    const value = named ? child(arg, 'value') : arg;
    const forward: Forward = {};
    if (named) forward.name = text(arg, 'name') ?? '';
    if (value?.kind === 'variable') forward.param = text(value, 'name') ?? '';
    else {
      const literal = valueOf(value, scope);
      if (literal !== undefined) forward.value = literal;
    }
    return forward;
  });
}

/** Field classes by FQCN, from the classes of one file. */
export function fieldClasses(code: string, file: string): Map<string, FieldClass> {
  const out = new Map<string, FieldClass>();
  for (const { node, scope } of phpClasses(code, file)) {
    const fqcn = classFqcn(node, scope.namespace);
    if (fqcn === undefined || node.kind !== 'class') continue;
    const entry: FieldClass = {};
    const parent = child(node, 'extends');
    const parentName = text(parent, 'name');
    if (parentName !== undefined) entry.parent = resolve(parentName, text(parent, 'resolution'), scope);
    const ctor = children(node, 'body').find((member) => member.kind === 'method' && nameOf(member) === '__construct');
    if (ctor !== undefined) {
      entry.params = children(ctor, 'arguments').map((param) => {
        const value = child(param, 'value');
        const bound: Param = { name: nameOf(param) ?? '' };
        const literal = value === undefined ? undefined : valueOf(value, scope);
        if (literal !== undefined) bound.default = literal;
        return bound;
      });
      const call = parentCall(ctor);
      if (call !== undefined) entry.forward = forwardOf(call, scope);
    }
    out.set(fqcn, entry);
  }
  return out;
}

/** Whether `fqcn` is a DAL field, by its parents. */
export function isField(fqcn: string, classes: Map<string, FieldClass>): boolean {
  let current: string | undefined = fqcn;
  for (let depth = 0; current !== undefined && depth < 10; depth += 1) {
    if (current === FIELD) return true;
    current = classes.get(current)?.parent;
  }
  return false;
}

export function ctorParams(fqcn: string, classes: Map<string, FieldClass>): Param[] | undefined {
  let current: string | undefined = fqcn;
  for (let depth = 0; current !== undefined && depth < 10; depth += 1) {
    const entry = classes.get(current);
    if (entry?.params !== undefined) return entry.params;
    current = entry?.parent;
  }
  return undefined;
}

/** The constructor arguments of a field class by parameter name, with the
 *  defaults filled in and followed through `parent::__construct()`, so a
 *  subclass that passes a fixed property name on still has one. */
export function resolvedArgs(
  fqcn: string | undefined,
  bound: Map<string, Value | undefined>,
  classes: Map<string, FieldClass>,
  depth = 0,
): Map<string, Value | undefined> {
  const entry = fqcn === undefined ? undefined : classes.get(fqcn);
  if (entry === undefined || depth > 10) return bound;
  if (entry.params === undefined) return resolvedArgs(entry.parent, bound, classes, depth + 1);
  const full = new Map(bound);
  for (const param of entry.params)
    if (!full.has(param.name) && 'default' in param) full.set(param.name, param.default);
  if (entry.forward === undefined || entry.parent === undefined) return full;
  const names = (ctorParams(entry.parent, classes) ?? []).map((param) => param.name);
  const passed = new Map<string, Value | undefined>();
  entry.forward.forEach((forward, index) => {
    const name = forward.name ?? names[index];
    if (name === undefined) return;
    passed.set(name, forward.param === undefined ? forward.value : full.get(forward.param));
  });
  const inherited = resolvedArgs(entry.parent, passed, classes, depth + 1);
  return new Map([...inherited, ...full]);
}
