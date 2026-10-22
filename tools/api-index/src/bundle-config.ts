// The bundle configuration surface: every key of `shopware:`,
// `storefront:` and `elasticsearch:` from the Symfony tree builder in the
// bundle's `Configuration` class, with its node type, its default and
// `setDeprecated()`. The tree is read by following the fluent calls:
// `children()` enters a node, `arrayNode('x')` and its kin add a key,
// `end()` goes back one level, and `append($this->createXSection())` reads
// that method as a subtree.
import type { Flags, Item } from './model.ts';
import { walk } from './field-classes.ts';
import { child, children, nameOf, type Node, text } from './node.ts';
import { phpClasses } from './php.ts';
import type { Scope } from './php-scope.ts';
import { valueOf } from './php-value.ts';

const NODE_TYPES = new Map([
  ['arrayNode', 'array'],
  ['scalarNode', 'scalar'],
  ['booleanNode', 'boolean'],
  ['integerNode', 'integer'],
  ['floatNode', 'float'],
  ['enumNode', 'enum'],
  ['variableNode', 'variable'],
  ['stringNode', 'string'],
]);
/** Calls that open an expression builder whose `end()` returns to the node. */
const EXPRESSIONS = new Set(['beforeNormalization', 'validate']);

interface Key {
  type: string;
  default?: string;
  flags: Flags;
}

interface Frame {
  kind: 'node' | 'builder' | 'expression';
  path: string;
}

interface Call {
  name: string;
  args: Node[];
  /** The line of the call's name, from 1. */
  line: number;
}

function lineOf(node: Node | undefined): number {
  const loc = child(node ?? {}, 'loc');
  const start = child(loc ?? {}, 'start');
  return typeof start?.line === 'number' ? start.line : 0;
}

/** `$a->b()->c()` as its root and the calls from the root outwards. */
function flatten(node: Node): { root: Node; calls: Call[] } {
  const calls: Call[] = [];
  let current: Node = node;
  for (;;) {
    const lookup = current.kind === 'call' ? child(current, 'what') : undefined;
    if (lookup?.kind !== 'propertylookup' && lookup?.kind !== 'nullsafepropertylookup') break;
    const offset = child(lookup, 'offset');
    calls.unshift({ name: text(offset, 'name') ?? '', args: children(current, 'arguments'), line: lineOf(offset) });
    const inner = child(lookup, 'what');
    if (inner === undefined) break;
    current = inner;
  }
  return { root: current, calls };
}

/** Expression statements and returns of a body, also inside `if` blocks. */
function statements(node: Node): Node[] {
  const out: Node[] = [];
  const visit = (statement: Node): void => {
    if (statement.kind === 'expressionstatement') {
      const expression = child(statement, 'expression');
      if (expression !== undefined) out.push(expression);
    } else if (statement.kind === 'return') {
      const expression = child(statement, 'expr');
      if (expression !== undefined) out.push(expression);
    } else if (statement.kind === 'block') {
      for (const inner of children(statement, 'children')) visit(inner);
    } else if (statement.kind === 'if') {
      for (const key of ['body', 'alternate']) {
        const branch = child(statement, key);
        if (branch !== undefined) visit(branch);
      }
    }
  };
  for (const statement of children(child(node, 'body') ?? {}, 'children')) visit(statement);
  return out;
}

/** The name given to `new TreeBuilder('…')` in a method. */
function treeName(method: Node, scope: Scope): string | undefined {
  let found: string | undefined;
  walk(method, (node) => {
    if (found !== undefined) return true;
    if (node.kind !== 'new' || !(text(child(node, 'what'), 'name') ?? '').endsWith('TreeBuilder')) return false;
    const value = valueOf(children(node, 'arguments')[0], scope);
    if (typeof value === 'string') found = value;
    return true;
  });
  return found;
}

function version(value: string | undefined): string {
  if (value === undefined) return '';
  return `v${value.replace(/^v/u, '').split('.').slice(0, 3).join('.')}`;
}

class Reader {
  readonly keys = new Map<string, Key>();
  readonly #methods: Map<string, Node>;
  readonly #scope: Scope;
  readonly #lines: string[];

  constructor(methods: Map<string, Node>, scope: Scope, lines: string[]) {
    this.#methods = methods;
    this.#scope = scope;
    this.#lines = lines;
  }

  /** A `// @deprecated` comment at the end of the key's line or on the line
   *  above it: core marks keys that way as well as with `setDeprecated()`. */
  #comment(line: number): string | undefined {
    const own = this.#lines[line - 1] ?? '';
    const above = this.#lines[line - 2] ?? '';
    const note = [/\/\/[^'"]*$/u.exec(own)?.[0], /^\s*\/\/.*$/u.exec(above)?.[0]].find(
      (comment) => comment !== undefined && /@deprecated\b/u.test(comment),
    );
    return note === undefined ? undefined : version(/tag:v?([\d.]+)/u.exec(note)?.[1]);
  }

  /** Reads the tree a method builds, rooted at `path`. */
  method(name: string, path: string, depth = 0): void {
    const method = this.#methods.get(name);
    if (method === undefined || depth > 5) return;
    const roots = new Set<string>();
    for (const expression of statements(method)) {
      if (expression.kind === 'assign') {
        const target = text(child(expression, 'left'), 'name');
        const right = child(expression, 'right');
        if (
          target !== undefined &&
          right !== undefined &&
          flatten(right).calls.some((call) => call.name === 'getRootNode')
        ) {
          roots.add(target);
          this.#chain(flatten(right).calls, path, depth);
        }
        continue;
      }
      const { root, calls } = flatten(expression);
      const fromRoot = root.kind === 'variable' && roots.has(text(root, 'name') ?? '');
      if (fromRoot || calls.some((call) => call.name === 'getRootNode')) this.#chain(calls, path, depth);
    }
  }

  #key(path: string): Key {
    let key = this.keys.get(path);
    if (key === undefined) {
      key = { type: 'array', flags: {} };
      this.keys.set(path, key);
    }
    return key;
  }

  #chain(calls: Call[], path: string, depth: number): void {
    const stack: Frame[] = [{ kind: 'node', path }];
    for (const call of calls) {
      const top = stack.at(-1);
      if (top === undefined) return;
      const type = NODE_TYPES.get(call.name) ?? (call.name === 'node' ? 'node' : undefined);
      if (call.name === 'getRootNode') continue;
      if (call.name === 'children') stack.push({ kind: 'builder', path: top.path });
      else if (type !== undefined && top.kind === 'builder') {
        const name = valueOf(call.args[0], this.#scope);
        if (typeof name !== 'string') return;
        const keyPath = `${top.path}.${name}`;
        const nodeType = type === 'node' ? valueOf(call.args[1], this.#scope) : type;
        const key = this.#key(keyPath);
        key.type = typeof nodeType === 'string' ? nodeType : 'node';
        const deprecated = this.#comment(call.line);
        if (deprecated !== undefined) key.flags.deprecated = deprecated;
        stack.push({ kind: 'node', path: keyPath });
      } else if (/^(\w+Prototype|prototype)$/u.test(call.name) && top.kind === 'node') {
        // The prototype is a key of its own, `*`, so a key that moves under
        // it is not reported as removed.
        const prototype = /^(\w+)Prototype$/u.exec(call.name)?.[1];
        this.#key(`${top.path}.*`).type = prototype ?? 'prototype';
        stack.push({ kind: 'node', path: `${top.path}.*` });
      } else if (EXPRESSIONS.has(call.name) && top.kind === 'node') {
        stack.push({ kind: 'expression', path: top.path });
      } else if (call.name === 'end') stack.pop();
      else if (call.name === 'append' && top.kind === 'builder') {
        const inner = call.args[0];
        const callee = inner === undefined ? undefined : flatten(inner).calls.at(-1)?.name;
        const method = callee === undefined ? undefined : this.#methods.get(callee);
        const name = method === undefined ? undefined : treeName(method, this.#scope);
        if (callee !== undefined && name !== undefined) {
          this.#key(`${top.path}.${name}`);
          this.method(callee, `${top.path}.${name}`, depth + 1);
        }
      } else if (top.kind === 'node') this.#setting(call, top.path);
    }
  }

  #setting(call: Call, path: string): void {
    if (path.endsWith('.*') || !this.keys.has(path)) return;
    const key = this.#key(path);
    if (call.name === 'setDeprecated') {
      const since = valueOf(call.args[1], this.#scope);
      const message = valueOf(call.args[2], this.#scope);
      const removal = typeof message === 'string' ? /\bv?(\d+\.\d+(?:\.\d+)*)/u.exec(message)?.[1] : undefined;
      key.flags.deprecated = version(removal ?? (typeof since === 'string' ? since : undefined));
    } else if (call.name === 'defaultValue') {
      const value = valueOf(call.args[0], this.#scope);
      if (value !== undefined && (typeof value !== 'object' || value === null)) key.default = JSON.stringify(value);
    } else if (call.name === 'defaultTrue') key.default = 'true';
    else if (call.name === 'defaultFalse') key.default = 'false';
    else if (call.name === 'defaultNull') key.default = 'null';
  }
}

/** The keys of the bundle configuration classes in one PHP file. */
export function bundleConfigItems(code: string, file: string): Item[] {
  const items: Item[] = [];
  const lines = code.split('\n');
  for (const { node, scope } of phpClasses(code, file, true)) {
    const implemented = children(node, 'implements').map((name) => text(name, 'name') ?? '');
    if (!implemented.some((name) => name.endsWith('ConfigurationInterface'))) continue;
    const methods = new Map(
      children(node, 'body')
        .filter((member) => member.kind === 'method')
        .map((member) => [nameOf(member) ?? '', member]),
    );
    const builder = methods.get('getConfigTreeBuilder');
    const root = builder === undefined ? undefined : treeName(builder, scope);
    if (root === undefined) continue;
    const reader = new Reader(methods, scope, lines);
    reader.method('getConfigTreeBuilder', root);
    for (const [path, key] of reader.keys) {
      items.push({
        id: `config:${path}`,
        kind: 'config',
        file,
        signature: key.default === undefined ? key.type : `${key.type} = ${key.default}`,
        flags: key.flags,
      });
    }
  }
  return items;
}
