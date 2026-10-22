// Names in a PHP file: its namespace and `use` aliases, and resolving a name
// against them.
import { child, children, type Node, text } from './node.ts';

const SELF_NAMES = new Set(['self', 'static', 'parent']);

/** Names in scope: the namespace and the `use` aliases of a file. */
export interface Scope {
  namespace: string;
  uses: Map<string, string>;
}

function trimSlash(name: string): string {
  return name.replace(/^\\/u, '');
}

export function addUses(scope: Scope, group: Node): void {
  const type = text(group, 'type');
  if (type === 'function' || type === 'const') return;
  const prefix = text(group, 'name');
  for (const item of children(group, 'items')) {
    if (text(item, 'type') === 'function' || text(item, 'type') === 'const') continue;
    const name = text(item, 'name');
    if (name === undefined) continue;
    const full = trimSlash(prefix === undefined ? name : `${prefix}\\${name}`);
    const alias = text(child(item, 'alias'), 'name') ?? full.split('\\').pop() ?? full;
    scope.uses.set(alias.toLowerCase(), full);
  }
}

/** The fully qualified name of a `name` node, resolved against the scope. */
export function resolve(name: string, resolution: string | undefined, scope: Scope): string {
  if (resolution === 'fqn' || name.startsWith('\\')) return trimSlash(name);
  if (SELF_NAMES.has(name.toLowerCase())) return name.toLowerCase();
  const [first = name, ...rest] = name.split('\\');
  const used = scope.uses.get(first.toLowerCase());
  if (used !== undefined) return [used, ...rest].join('\\');
  return scope.namespace === '' ? name : `${scope.namespace}\\${name}`;
}
