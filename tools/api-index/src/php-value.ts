// Constant PHP expressions as plain values: what attribute arguments and
// field constructors are written with. Anything else is `undefined`, so a
// caller can count what it could not read instead of guessing.
import { child, children, type Node, text } from './node.ts';
import { resolve, type Scope } from './php-scope.ts';

const REFERENCES = new Map([
  ['selfreference', 'self'],
  ['staticreference', 'static'],
  ['parentreference', 'parent'],
]);

/** A class constant the value refers to: `Fqcn::NAME`, or `Fqcn::class`. */
export interface ConstantRef {
  constant: string;
}

export interface Entry {
  key: Value | undefined;
  value: Value;
}

export type Value = string | number | boolean | null | ConstantRef | { entries: Entry[] };

export function isConstant(value: Value | undefined): value is ConstantRef {
  return typeof value === 'object' && value !== null && 'constant' in value;
}

export function isArray(value: Value | undefined): value is { entries: Entry[] } {
  return typeof value === 'object' && value !== null && 'entries' in value;
}

/** A class constant's string value by `Fqcn::NAME`, when known. */
export type ConstantLookup = (constant: string) => string | undefined;

/** The value of a constant expression, or undefined when it is not one.
 *  With `constants`, a class constant in a concatenation is replaced by its
 *  value. */
export function valueOf(node: Node | undefined, scope: Scope, constants?: ConstantLookup): Value | undefined {
  if (node === undefined) return undefined;
  switch (node.kind) {
    case 'string':
    case 'nowdoc':
      return text(node, 'value');
    case 'number':
      return Number(text(node, 'value'));
    case 'boolean':
      return node.value === true;
    case 'nullkeyword':
      return null;
    case 'cast':
      return valueOf(child(node, 'expr'), scope, constants);
    case 'array': {
      const entries: Entry[] = [];
      for (const item of children(node, 'items')) {
        const isEntry = item.kind === 'entry';
        const value = valueOf(isEntry ? child(item, 'value') : item, scope);
        if (value === undefined) return undefined;
        const keyNode = isEntry ? child(item, 'key') : undefined;
        const key = keyNode === undefined ? undefined : valueOf(keyNode, scope);
        if (keyNode !== undefined && key === undefined) return undefined;
        entries.push({ key, value });
      }
      return { entries };
    }
    case 'staticlookup': {
      const what = child(node, 'what');
      const name = text(child(node, 'offset'), 'name');
      // `self::X` parses as a selfreference node, without a name.
      const owner = REFERENCES.get(text(what, 'kind') ?? '') ?? text(what, 'name');
      if (name === undefined || owner === undefined) return undefined;
      return { constant: `${resolve(owner, text(what, 'resolution'), scope)}::${name}` };
    }
    case 'bin': {
      if (text(node, 'type') !== '.') return undefined;
      const side = (key: string): Value | undefined => {
        const value = valueOf(child(node, key), scope, constants);
        return isConstant(value) && constants !== undefined ? constants(value.constant) : value;
      };
      const left = side('left');
      const right = side('right');
      return typeof left === 'string' && typeof right === 'string' ? left + right : undefined;
    }
    default:
      return undefined;
  }
}

/** The short name of a class: `Shopware\Core\Foo\Bar` → `Bar`. */
export function shortName(fqcn: string): string {
  return fqcn.split('\\').pop() ?? fqcn;
}

/** The value as a string list: one string, or an array of strings. */
export function stringList(value: Value | undefined): string[] | undefined {
  if (typeof value === 'string') return [value];
  if (!isArray(value)) return undefined;
  const out = value.entries.map((entry) => entry.value).filter((item) => typeof item === 'string');
  return out.length === value.entries.length ? out : undefined;
}

/** Arguments by parameter name: named arguments by name, positional ones by
 *  the position in `params`. */
export function bindArgs(args: Node[], params: string[], scope: Scope): Map<string, Value | undefined> {
  const bound = new Map<string, Value | undefined>();
  args.forEach((arg, index) => {
    if (arg.kind === 'namedargument') {
      const name = text(arg, 'name');
      if (name !== undefined) bound.set(name, valueOf(child(arg, 'value'), scope));
      return;
    }
    const name = params[index];
    if (name !== undefined) bound.set(name, valueOf(arg, scope));
  });
  return bound;
}
