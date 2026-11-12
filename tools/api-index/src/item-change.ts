// How an item both snapshots have changed in a way a client or an
// extension notices, by kind: routes, entity fields, config keys, and the
// admin and storefront members (surfaces.ts). Also the one addition that
// breaks: a new required prop on a component the base already has.
import { parseProp } from './member-signature.ts';
import type { Item } from './model.ts';
import { frontendChange, ownerOf } from './surfaces.ts';

/** The flags that matter for a field, from its signature `Class →Ref autoload Flag…`. */
function fieldParts(signature: string): { type: string; reference?: string; flags: Set<string> } {
  const [type = '', ...rest] = signature.split(' ');
  const reference = rest.find((part) => part.startsWith('→'))?.slice(1);
  const flags = new Set(rest.filter((part) => !part.startsWith('→')));
  return reference === undefined ? { type, flags } : { type, reference, flags };
}

/** Flags whose loss or gain breaks a client or an extension. */
const LOST = ['ApiAware'];
const GAINED = ['Required', 'WriteProtected', 'Runtime', 'Computed', 'Immutable'];

function fieldChange(base: string, head: string): string | undefined {
  const before = fieldParts(base);
  const after = fieldParts(head);
  const notes: string[] = [];
  if (before.type !== after.type) notes.push(`type ${before.type} → ${after.type}`);
  if (before.reference !== after.reference)
    notes.push(`reference ${before.reference ?? '-'} → ${after.reference ?? '-'}`);
  for (const flag of LOST) if (before.flags.has(flag) && !after.flags.has(flag)) notes.push(`no longer ${flag}`);
  for (const flag of GAINED) if (!before.flags.has(flag) && after.flags.has(flag)) notes.push(`now ${flag}`);
  if (before.flags.has('autoload') && !after.flags.has('autoload')) notes.push('no longer autoloaded');
  return notes.length === 0 ? undefined : notes.join(', ');
}

function routeChange(base: Item, head: Item): string | undefined {
  const [beforeMethods = '', beforePath = ''] = (base.signature ?? '').split(' ');
  const [afterMethods = '', afterPath = ''] = (head.signature ?? '').split(' ');
  const notes: string[] = [];
  if (beforePath !== afterPath) notes.push(`path ${beforePath} → ${afterPath}`);
  const kept = new Set(afterMethods.split('|'));
  const lost = beforeMethods.split('|').filter((method) => afterMethods !== 'ANY' && !kept.has(method));
  if (lost.length > 0) notes.push(`no longer ${lost.join(', ')}`);
  if (base.scope !== head.scope) notes.push(`scope ${base.scope ?? '-'} → ${head.scope ?? '-'}`);
  return notes.length === 0 ? undefined : notes.join(', ');
}

function configChange(base: Item, head: Item): string | undefined {
  const before = (base.signature ?? '').split(' = ')[0];
  const after = (head.signature ?? '').split(' = ')[0];
  return before === after ? undefined : `type ${before} → ${after}`;
}

export function changeOf(base: Item, head: Item): string | undefined {
  if (base.kind === 'route') return routeChange(base, head);
  if (base.kind === 'field') return fieldChange(base.signature ?? '', head.signature ?? '');
  if (base.kind === 'config') return configChange(base, head);
  return frontendChange(base, head);
}

/** A required prop on a component the base already has: every place that
 *  renders the component must now pass it. A prop that exists only with a
 *  feature flag on is not required yet. */
export function addedChange(item: Item, baseById: Map<string, Item>): string | undefined {
  if (item.kind !== 'prop' || item.flags.from !== undefined || !parseProp(item.signature ?? '').required)
    return undefined;
  const owner = baseById.get(ownerOf(item) ?? '');
  if (owner === undefined || owner.flags.internal === true || owner.flags.experimental !== undefined) return undefined;
  return 'new required prop';
}
