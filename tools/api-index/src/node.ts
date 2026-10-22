// Narrowing php-parser's AST without casts. The parser's own types are loose,
// so every node is read as unknown and checked field by field.

export type Node = Record<string, unknown>;

export function isNode(value: unknown): value is Node {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The child node at `key`, if it is one. */
export function child(node: Node, key: string): Node | undefined {
  const value = node[key];
  return isNode(value) ? value : undefined;
}

/** The child nodes at `key`; anything that is not a node is skipped. */
export function children(node: Node, key: string): Node[] {
  const value = node[key];
  return Array.isArray(value) ? value.filter((item) => isNode(item)) : [];
}

export function text(node: Node | undefined, key: string): string | undefined {
  const value = node?.[key];
  return typeof value === 'string' ? value : undefined;
}

export function flag(node: Node, key: string): boolean {
  return node[key] === true;
}

/** `name` of a node whose name is an identifier or a plain string. */
export function nameOf(node: Node): string | undefined {
  return text(child(node, 'name'), 'name') ?? text(node, 'name');
}
