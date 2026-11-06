// What an `instanceof` tells the use extractor: the class a variable has
// inside the branch a test guards, and after an `if` that leaves the block
// when the test fails.
import { child, children, type Node, text } from './node.ts';
import { classOfReference, type Walk } from './uses-context.ts';

/** `$x instanceof Foo` in a condition: the variables it types, also through `&&`. */
export function narrowing(test: Node, walk: Walk): Map<string, string> {
  if (test.kind !== 'bin') return new Map<string, string>();
  const left = child(test, 'left');
  const right = child(test, 'right');
  if (text(test, 'type') === '&&') {
    return new Map<string, string>([...(left ? narrowing(left, walk) : []), ...(right ? narrowing(right, walk) : [])]);
  }
  if (text(test, 'type') !== 'instanceof' || left?.kind !== 'variable') return new Map<string, string>();
  const name = text(left, 'name');
  const owner = classOfReference(right, walk);
  const types = new Map<string, string>();
  if (name !== undefined && owner !== undefined) types.set(name, owner);
  return types;
}

export interface Branch {
  test: Node;
  /** What runs only when the test holds. */
  guarded: Node[];
  rest: Node[];
}

/** A ternary, an `if` or an `&&`, split into its test and the part the test guards. */
export function narrowedBranch(node: Node): Branch | undefined {
  const pick = (key: string): Node[] => {
    const value = child(node, key);
    return value === undefined ? [] : [value];
  };
  const test = child(node, node.kind === 'bin' ? 'left' : 'test');
  if (test === undefined) return undefined;
  if (node.kind === 'retif') return { test, guarded: pick('trueExpr'), rest: pick('falseExpr') };
  if (node.kind === 'if') return { test, guarded: pick('body'), rest: pick('alternate') };
  if (node.kind === 'bin' && text(node, 'type') === '&&') return { test, guarded: pick('right'), rest: [] };
  return undefined;
}

/** `!$x instanceof Foo`, also through `||`: the variables typed when the test is false. */
function negatedNarrowing(test: Node, walk: Walk): Map<string, string> {
  if (test.kind === 'unary' && text(test, 'type') === '!') {
    const inner = child(test, 'what');
    return inner === undefined ? new Map<string, string>() : narrowing(inner, walk);
  }
  if (test.kind !== 'bin' || text(test, 'type') !== '||') return new Map<string, string>();
  const left = child(test, 'left');
  const right = child(test, 'right');
  return new Map<string, string>([
    ...(left ? negatedNarrowing(left, walk) : []),
    ...(right ? negatedNarrowing(right, walk) : []),
  ]);
}

const EXITS = new Set(['return', 'throw', 'continue', 'break']);

/** A statement that never falls through: a return, throw, continue or break, or a block ending in one. */
function exits(node: Node | undefined): boolean {
  if (node === undefined) return false;
  if (EXITS.has(String(node.kind))) return true;
  if (node.kind === 'expressionstatement') return exits(child(node, 'expression'));
  return node.kind === 'block' && exits(children(node, 'children').at(-1));
}

/** The variables an `if` without `else` types for the statements after it,
 *  when its body leaves the block: `if (!$x instanceof Foo) { return; }`. */
export function exitNarrowing(node: Node, walk: Walk): Map<string, string> {
  const test = child(node, 'test');
  if (node.kind !== 'if' || test === undefined || child(node, 'alternate') !== undefined) return new Map();
  return exits(child(node, 'body')) ? negatedNarrowing(test, walk) : new Map<string, string>();
}
