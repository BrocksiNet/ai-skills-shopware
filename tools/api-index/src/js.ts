// Reading the admin's and the storefront's JavaScript and TypeScript with
// @babel/parser: the calls that register components and plugins, and the
// object literals and classes they register.
import { parse } from '@babel/parser';
import type { Comment, File, Node, ObjectExpression, ObjectMember, Statement } from '@babel/types';

export function parseJs(code: string, file: string): File {
  return parse(code, {
    sourceType: 'module',
    sourceFilename: file,
    errorRecovery: true,
    plugins: file.endsWith('.ts') ? ['typescript', 'decorators'] : ['jsx', 'decorators'],
  });
}

function isNode(value: unknown): value is Node {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof value.type === 'string' &&
    !('leading' in value) &&
    value.type !== 'CommentBlock' &&
    value.type !== 'CommentLine'
  );
}

/** Calls every node of the tree, depth first; `visit` returns true to skip a node's children. */
export function walkJs(node: Node, visit: (node: Node) => boolean): void {
  if (visit(node)) return;
  for (const value of Object.values(node)) {
    const list: unknown[] = Array.isArray(value) ? value : [value];
    for (const entry of list) {
      if (isNode(entry)) walkJs(entry, visit);
    }
  }
}

/** The string a node holds: a literal, or a template literal without expressions. */
export function stringOf(node: Node | null | undefined): string | undefined {
  if (node?.type === 'StringLiteral') return node.value;
  if (node?.type === 'TemplateLiteral' && node.expressions.length === 0)
    return node.quasis[0]?.value.cooked ?? undefined;
  return undefined;
}

/** `a.b.c` as text, for a member chain of identifiers. */
export function memberName(node: Node | null | undefined): string | undefined {
  if (node?.type === 'Identifier') return node.name;
  if (node?.type === 'ThisExpression') return 'this';
  if (node?.type !== 'MemberExpression' || node.computed) return undefined;
  const object = memberName(node.object);
  const property = node.property.type === 'Identifier' ? node.property.name : undefined;
  return object === undefined || property === undefined ? undefined : `${object}.${property}`;
}

/** The key of an object member, when it is a name or a string. */
export function keyOf(member: ObjectMember | Node): string | undefined {
  if (member.type !== 'ObjectProperty' && member.type !== 'ObjectMethod' && member.type !== 'ClassMethod')
    return undefined;
  if (member.computed) return stringOf(member.key);
  if (member.key.type === 'Identifier') return member.key.name;
  return stringOf(member.key);
}

/** The value of a property of an object literal. */
export function propertyOf(object: ObjectExpression, name: string): Node | undefined {
  const member = object.properties.find((entry) => keyOf(entry) === name);
  if (member?.type === 'ObjectProperty') return member.value;
  return member;
}

/** The removal version of a `@deprecated` comment ('' without a tag), or undefined. */
export function deprecatedIn(comments: readonly Comment[] | null | undefined): string | undefined {
  const note = (comments ?? []).map((comment) => comment.value).find((text) => /@deprecated\b/u.test(text));
  if (note === undefined) return undefined;
  const parts = /tag:v?(\d+)\.(\d+)\.(\d+)/u.exec(note);
  return parts === null ? '' : `v${parts[1]}.${parts[2]}.${parts[3]}`;
}

/** A `@private` or `@internal` comment: not public API. */
export function privateIn(comments: readonly Comment[] | null | undefined): boolean {
  return (comments ?? []).some((comment) => /@(?:private|internal)\b/u.test(comment.value));
}

/** What a module default-exports (an expression or a class), and the
 *  comments above it. */
export function defaultExport(file: File): { value: Node | undefined; comments: Comment[] } {
  const statement: Statement | undefined = file.program.body.find((entry) => entry.type === 'ExportDefaultDeclaration');
  if (statement?.type !== 'ExportDefaultDeclaration') return { value: undefined, comments: [] };
  return { value: statement.declaration, comments: [...(statement.leadingComments ?? [])] };
}

/** `./x` and `../x` from the file `from`, as a path in the repository. */
export function relativePath(from: string, specifier: string): string | undefined {
  if (!specifier.startsWith('.')) return undefined;
  const parts = from.slice(0, from.lastIndexOf('/')).split('/');
  for (const part of specifier.split('/')) {
    if (part === '..') parts.pop();
    else if (part !== '.') parts.push(part);
  }
  return parts.join('/');
}

/** `src/…` (below `root`), `./x` and `../x` as a path in the repository,
 *  with the extension or `/index` the bundler would add, when the file exists. */
export function resolveImport(
  from: string,
  specifier: string,
  files: ReadonlySet<string>,
  root: string,
): string | undefined {
  const base = specifier.startsWith('src/')
    ? `${root}/${specifier.slice('src/'.length)}`
    : relativePath(from, specifier);
  if (base === undefined) return undefined;
  const candidates = [base, `${base}.ts`, `${base}.js`, `${base}/index.ts`, `${base}/index.js`];
  return candidates.find((candidate) => files.has(candidate));
}

/** The module an argument loads: `() => import('…')`, `import('…')`, or an imported name. */
export function sourceOf(arg: Node | null | undefined, imports: Map<string, string>): string | undefined {
  // Babel 8 parses `import('…')` as an ImportExpression; 6.5 passes it
  // without the arrow function.
  if (arg?.type === 'ImportExpression') return stringOf(arg.source);
  if (arg?.type === 'ArrowFunctionExpression' && arg.body.type === 'ImportExpression') return stringOf(arg.body.source);
  if (arg?.type === 'Identifier') return imports.get(arg.name);
  return undefined;
}

/** Local name → module specifier of a module's imports. */
export function importsOf(program: Node[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const statement of program) {
    if (statement.type !== 'ImportDeclaration') continue;
    for (const specifier of statement.specifiers) out.set(specifier.local.name, statement.source.value);
  }
  return out;
}
