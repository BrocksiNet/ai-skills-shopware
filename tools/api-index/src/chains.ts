// Chain targets of the use extractor, `Foo::getPage()->getProduct()`,
// resolved per release: each step's class is the return type the index
// stores in the previous method's signature. A step whose method is gone,
// or returns no single class, leaves the chain unresolved in that release.
// A return type names the declared class, often a base (`Struct`, `Page`)
// of what the call really returns, so a last method the declared class
// never has says nothing: such a chain stays unresolved, as does one that
// ends outside Shopware.
import type { Lookup } from './facts.ts';

/** True for a target the report has to resolve first. */
export function isChain(target: string): boolean {
  return target.includes('->');
}

/** The single class a signature returns; `self` and `static` are the receiver. */
export function returnClass(signature: string, receiver: string): string | undefined {
  const at = signature.lastIndexOf('): ');
  if (at === -1) return undefined;
  const parts = signature
    .slice(at + 3)
    .replace(/^\?/u, '')
    .split('|')
    .filter((part) => part !== 'null');
  const [type] = parts;
  if (parts.length !== 1 || type === undefined || type.includes('&')) return undefined;
  if (type === 'self' || type === 'static') return receiver;
  return /^[A-Z_\\]/iu.test(type) && type.includes('\\') ? type : undefined;
}

/** The target a chain names at one release, or undefined when a step cannot be followed. */
export function resolveChain(lookup: Lookup, target: string, index: number): string | undefined {
  const [first = '', ...rest] = target.replace(/^php:/u, '').split('->');
  let [owner = '', member = ''] = first.split('::');
  for (const next of rest) {
    const item = lookup.member(owner, member, index);
    if (item === undefined || item === 'external') return undefined;
    const signature = lookup.value(item, 'signature', index);
    const type = signature === undefined ? undefined : returnClass(signature, owner);
    if (type === undefined) return undefined;
    owner = type;
    member = next;
  }
  return `php:${owner}::${member}`;
}

/** True when a resolved target is a Shopware method some of its releases have. */
function checkable(lookup: Lookup, resolved: string, within: string[]): boolean {
  const [owner = '', member = ''] = resolved.replace(/^php:/u, '').split('::');
  if (!owner.startsWith('Shopware\\')) return false;
  return within.some((release) => {
    const item = lookup.member(owner, member, lookup.names.indexOf(release));
    return item !== undefined && item !== 'external';
  });
}

/** The releases of the range each resolved target of a chain holds in. */
export function chainTargets(lookup: Lookup, target: string, releases: string[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const release of releases) {
    const resolved = resolveChain(lookup, target, lookup.names.indexOf(release));
    if (resolved !== undefined) out.set(resolved, [...(out.get(resolved) ?? []), release]);
  }
  for (const [resolved, within] of out) if (!checkable(lookup, resolved, within)) out.delete(resolved);
  return out;
}
