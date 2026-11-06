// PHP API that moved rather than went away: a member a parent, trait or
// interface took over, and a class whose old name is a runtime alias.
import type { Change } from './api-diff.ts';
import type { Lookup } from './facts.ts';
import type { Item } from './model.ts';
import type { Surface } from './surfaces.ts';

/** A PHP member the head still declares in the owner's chain: a parent, a
 *  trait or an interface took it over, so every caller keeps it. */
export function movedMember(item: Item, owner: string, head: Lookup): Change | undefined {
  const found = head.member(owner.slice('php:'.length), item.id.slice(owner.length + 2), 0);
  if (found === undefined || found === 'external') return undefined;
  const declarer = found.id.split('::')[0]?.slice('php:'.length) ?? '';
  return {
    surface: 'php',
    kind: 'moved',
    id: item.id,
    detail: `now declared by ${declarer}`,
    movedTo: found.id,
    file: found.file,
  };
}

/** A class the head keeps under a new name, the old one a runtime alias. */
export function movedClass(surface: Surface, item: Item, after: Item): Change | undefined {
  if (after.aliasOf === undefined || item.aliasOf !== undefined) return undefined;
  const until = after.flags.deprecated;
  return {
    surface,
    kind: 'moved',
    id: item.id,
    detail: `now ${after.aliasOf}; the old name is a runtime alias${until === undefined || until === '' ? '' : ` until ${until}`}`,
    movedTo: `php:${after.aliasOf}`,
    file: after.file,
  };
}
