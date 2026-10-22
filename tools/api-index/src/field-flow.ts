// The shapes `defineFields()` builds fields with: a `new XField(…)` with
// calls chained on it, flags added to a variable in later statements, and
// fields that depend on a feature flag.
import { walk } from './field-classes.ts';
import { child, children, type Node, text } from './node.ts';
import { resolve, type Scope } from './php-scope.ts';
import { valueOf } from './php-value.ts';

export interface Chain {
  root: Node;
  calls: { name: string; args: Node[] }[];
}

/** `(new X(…))->addFlags(…)->setDescription(…)` as its `new` and the calls on it. */
export function chainOf(node: Node): Chain | undefined {
  const calls: { name: string; args: Node[] }[] = [];
  let current: Node | undefined = node;
  while (current?.kind === 'call') {
    const lookup = child(current, 'what');
    if (lookup?.kind !== 'propertylookup' && lookup?.kind !== 'nullsafepropertylookup') return undefined;
    calls.unshift({ name: text(child(lookup, 'offset'), 'name') ?? '', args: children(current, 'arguments') });
    current = child(lookup, 'what');
  }
  return current?.kind === 'new' ? { root: current, calls } : undefined;
}

/** `if (Feature::isActive('v6.7.0.0'))`, the same as a ternary, or their
 *  negation: the flag tested and the keys of the branch with the flag off
 *  and on. */
export function featureTest(node: Node, scope: Scope): { flag: string; off: string; on: string } | undefined {
  if (node.kind !== 'if' && node.kind !== 'retif') return undefined;
  let test = child(node, 'test');
  let negated = false;
  if (test?.kind === 'unary' && text(test, 'type') === '!') {
    negated = true;
    test = child(test, 'what');
  }
  const what = test?.kind === 'call' ? child(test, 'what') : undefined;
  if (what?.kind !== 'staticlookup' || text(child(what, 'offset'), 'name') !== 'isActive') return undefined;
  const owner = child(what, 'what');
  if (!resolve(text(owner, 'name') ?? '', text(owner, 'resolution'), scope).endsWith('\\Feature')) return undefined;
  const flag = valueOf(children(test ?? {}, 'arguments')[0], scope);
  if (typeof flag !== 'string') return undefined;
  const [whenTrue, whenFalse] = node.kind === 'if' ? ['body', 'alternate'] : ['trueExpr', 'falseExpr'];
  return negated ? { flag, off: whenTrue, on: whenFalse } : { flag, off: whenFalse, on: whenTrue };
}

/** The feature flags a body tests. */
export function testedFlags(body: Node, scope: Scope): Set<string> {
  const out = new Set<string>();
  walk(body, (node) => {
    const flag = featureTest(node, scope)?.flag;
    if (flag !== undefined) out.add(flag);
    return false;
  });
  return out;
}

/** Calls made on a variable in statements of their own, such as
 *  `$field->addFlags(new ApiAware())`, by variable name. Under a feature
 *  test only the branch for the flags in `on` is read. */
export function variableCalls(body: Node, scope: Scope, on: ReadonlySet<string>): Map<string, Chain['calls']> {
  const out = new Map<string, Chain['calls']>();
  walk(body, (node) => {
    const test = featureTest(node, scope);
    if (test !== undefined) {
      const branch = child(node, on.has(test.flag) ? test.on : test.off);
      if (branch !== undefined)
        for (const [name, calls] of variableCalls(branch, scope, on))
          out.set(name, [...(out.get(name) ?? []), ...calls]);
      return true;
    }
    if (node.kind !== 'expressionstatement') return false;
    const calls: Chain['calls'] = [];
    let current = child(node, 'expression');
    while (current?.kind === 'call') {
      const lookup = child(current, 'what');
      if (lookup?.kind !== 'propertylookup') break;
      calls.unshift({ name: text(child(lookup, 'offset'), 'name') ?? '', args: children(current, 'arguments') });
      current = child(lookup, 'what');
    }
    const name = current?.kind === 'variable' ? text(current, 'name') : undefined;
    if (name !== undefined && calls.length > 0) out.set(name, [...(out.get(name) ?? []), ...calls]);
    return false;
  });
  return out;
}
