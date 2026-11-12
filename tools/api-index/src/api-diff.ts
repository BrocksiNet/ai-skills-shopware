// What a change between two snapshots does to the public API: items removed
// or changed in a way a client or an extension notices, and items newly
// deprecated. A removal is a break unless the base already deprecated the
// item (CORE-063). Items `@internal` or `@experimental` in the base are
// skipped and counted. PHP signatures are left to core's `bc-check`; the PHP
// surface reports removals only, labelled as also checked there. A PHP
// member a parent, trait or interface took over, and a class that moved
// and keeps its old name as a runtime alias, are moves, not removals. A
// template block whose body changed is listed, but not as a break: an
// override of it still renders. Admin props, methods and computed members
// are compared by signature (member-signature.ts), and a new required prop
// on an existing component is a change.
import { Lookup } from './facts.ts';
import { addedChange, changeOf } from './item-change.ts';
import type { Item, Snapshot } from './model.ts';
import { ownerOf, type Surface, SURFACES, surfaceOf } from './surfaces.ts';
import { movedClass, movedMember } from './moves.ts';
import { mergeSnapshots } from './timeline.ts';

export { type Surface, SURFACES, surfaceOf };

export type ChangeKind = 'removed' | 'moved' | 'changed' | 'body-changed' | 'deprecated';

export interface Change {
  surface: Surface;
  kind: ChangeKind;
  id: string;
  /** For a removal: the base deprecated it, so the removal was announced. */
  announced?: boolean;
  /** What changed, in words. */
  detail: string;
  /** Where the item now is: a removed route under another id, a moved PHP
   *  member on the class that declares it now, a moved class under its
   *  canonical name. */
  movedTo?: string;
  file: string;
  /** The line in `file`: at the base for a removal, at the head otherwise.
   *  Set only when the refs come from a clone (`withLines`). */
  line?: number;
}

export interface ApiDiff {
  base: string;
  head: string;
  changes: Change[];
  /** Items skipped because the base marks them internal or experimental. */
  skipped: number;
}

/** Deprecated in the snapshot, by its own flag or its owner's. An item
 *  that exists only with a feature flag off counts: the flag announces it. */
function deprecatedIn(item: Item, byId: Map<string, Item>): boolean {
  let current: Item | undefined = item;
  for (let depth = 0; current !== undefined && depth < 12; depth += 1) {
    if (current.flags.deprecated !== undefined || current.flags.until !== undefined) return true;
    const owner = ownerOf(current);
    current = owner === undefined ? undefined : byId.get(owner);
  }
  return false;
}

function removedDetail(item: Item, surface: Surface): string {
  if (surface === 'php') return 'removed (also checked by bc-check)';
  return item.kind === 'route' ? `removed (${item.signature ?? ''})` : 'removed';
}

/** A config key whose every child key was deprecated: removing the parent
 *  was announced through them. */
function childrenDeprecated(item: Item, items: Item[]): boolean {
  if (item.kind !== 'config') return false;
  const prefix = `${item.id}.`;
  const descendants = items.filter((candidate) => candidate.id.startsWith(prefix));
  return descendants.length > 0 && descendants.every((candidate) => candidate.flags.deprecated !== undefined);
}

/** A removed route whose path and methods live on under a new name. Fields
 *  are not matched: two fields of one shape are too often unrelated. */
function movedTo(item: Item, head: Item[]): string | undefined {
  if (item.kind !== 'route') return undefined;
  return head.find((candidate) => candidate.kind === 'route' && candidate.signature === item.signature)?.id;
}

/** The removal of a base item, unless its owner's removal covers it or it
 *  lives on under a prototype key. */
interface Sides {
  base: Item[];
  baseById: Map<string, Item>;
  headById: Map<string, Item>;
  added: Item[];
  /** The head as a one-release timeline, to resolve PHP members through inheritance. */
  headLookup: Lookup | undefined;
}

function removal(item: Item, surface: Surface, sides: Sides): Change | undefined {
  const { baseById, headById } = sides;
  // A member goes with its class, a field with its entity and a key with
  // its parent key; report the outermost only.
  const owner = ownerOf(item);
  if (owner !== undefined && baseById.has(owner) && !headById.has(owner)) return undefined;
  // A key whose parent became a prototype is still accepted under it.
  if (item.kind === 'config' && headById.has(`${owner ?? ''}.*`)) return undefined;
  // The members of a moved class live on under its canonical name; the class's own line says so.
  if (owner !== undefined && headById.get(owner)?.aliasOf !== undefined) return undefined;
  if (surface === 'php' && owner !== undefined && sides.headLookup !== undefined) {
    const moved = movedMember(item, owner, sides.headLookup);
    if (moved !== undefined) return moved;
  }
  const change: Change = {
    surface,
    kind: 'removed',
    id: item.id,
    detail: removedDetail(item, surface),
    file: item.file,
  };
  if (deprecatedIn(item, baseById) || childrenDeprecated(item, sides.base)) change.announced = true;
  const moved = movedTo(item, sides.added);
  if (moved !== undefined) change.movedTo = moved;
  return change;
}

export interface DiffOptions {
  /** List blocks whose body changed (default true). */
  bodies?: boolean;
}

/** What changed on an item both snapshots have. */
function keptChanges(
  item: Item,
  after: Item,
  surface: Surface,
  baseById: Map<string, Item>,
  bodies: boolean,
): Change[] {
  const changes: Change[] = [];
  const detail = changeOf(item, after);
  if (detail !== undefined) {
    const change: Change = { surface, kind: 'changed', id: item.id, detail, file: after.file };
    if (deprecatedIn(item, baseById)) change.announced = true;
    changes.push(change);
  }
  const before = item.kind === 'block' ? item.body : undefined;
  if (bodies && before !== undefined && after.body !== undefined && before !== after.body)
    changes.push({ surface, kind: 'body-changed', id: item.id, detail: 'body changed', file: after.file });
  if (after.flags.deprecated !== undefined && item.flags.deprecated === undefined) {
    const version = after.flags.deprecated;
    const text = version === '' ? 'deprecated' : `deprecated for ${version}`;
    changes.push({ surface, kind: 'deprecated', id: item.id, detail: text, file: after.file });
  }
  if (after.flags.until !== undefined && item.flags.until === undefined) {
    const gone = `gone with the ${after.flags.until} flag on`;
    changes.push({ surface, kind: 'deprecated', id: item.id, detail: gone, file: after.file });
  }
  return changes;
}

export function diffSnapshots(
  base: Snapshot,
  head: Snapshot,
  surfaces: Surface[] = SURFACES,
  options: DiffOptions = {},
): ApiDiff {
  const bodies = options.bodies ?? true;
  const wanted = new Set(surfaces);
  const baseById = new Map(base.items.map((item) => [item.id, item]));
  const headById = new Map(head.items.map((item) => [item.id, item]));
  const added = head.items.filter((item) => !baseById.has(item.id));
  const headLookup = wanted.has('php') ? new Lookup(mergeSnapshots([head])) : undefined;
  const sides: Sides = { base: base.items, baseById, headById, added, headLookup };
  const changes: Change[] = [];
  let skipped = 0;
  for (const item of base.items) {
    const surface = surfaceOf(item);
    if (!wanted.has(surface)) continue;
    if (item.flags.internal === true || item.flags.experimental !== undefined) {
      skipped += 1;
      continue;
    }
    const after = headById.get(item.id);
    if (after === undefined) {
      const change = removal(item, surface, sides);
      if (change !== undefined) changes.push(change);
      continue;
    }
    const moved = movedClass(surface, item, after);
    if (moved !== undefined) {
      changes.push(moved);
      continue;
    }
    changes.push(...keptChanges(item, after, surface, baseById, bodies));
  }
  if (wanted.has('admin')) {
    for (const item of added) {
      const detail = addedChange(item, baseById);
      if (detail !== undefined)
        changes.push({ surface: 'admin', kind: 'changed', id: item.id, detail, file: item.file });
    }
  }
  return { base: base.ref, head: head.ref, changes, skipped };
}

/** Kinds that are never a break: they tell, they do not remove. */
const NOT_BREAKS: ReadonlySet<ChangeKind> = new Set(['deprecated', 'moved', 'body-changed']);

function labelOf(change: Change): string {
  if (change.kind === 'body-changed') return 'body changed';
  if (NOT_BREAKS.has(change.kind)) return change.kind;
  if (change.announced === true) return `${change.kind} after deprecation`;
  return `BREAK ${change.kind}`;
}

/** A removal or change without a deprecation in the base. */
export function isBreak(change: Change): boolean {
  return !NOT_BREAKS.has(change.kind) && change.announced !== true;
}

const plural = (count: number, one: string, many: string): string => `${count} ${count === 1 ? one : many}`;

/** One line an agent can act on: the breaks first, then what was announced. */
export function diffSummary(diff: ApiDiff): string {
  const breaks = diff.changes.filter((change) => isBreak(change)).length;
  const announced = diff.changes.filter((change) => change.kind !== 'deprecated' && change.announced === true).length;
  const deprecated = diff.changes.filter((change) => change.kind === 'deprecated').length;
  const moved = diff.changes.filter((change) => change.kind === 'moved').length;
  const bodies = diff.changes.filter((change) => change.kind === 'body-changed').length;
  return (
    `Summary: ${plural(breaks, 'breaking change', 'breaking changes')} without a deprecation in ${diff.base}, ` +
    `${plural(announced, 'removal or change', 'removals or changes')} after a deprecation, ` +
    plural(deprecated, 'new deprecation', 'new deprecations') +
    (moved === 0 ? '' : `, ${plural(moved, 'move', 'moves')}`) +
    (bodies === 0 ? '' : `, ${plural(bodies, 'block body change', 'block body changes')}`) +
    '.'
  );
}

const ORDER: Record<ChangeKind, number> = { removed: 0, moved: 1, changed: 2, 'body-changed': 3, deprecated: 4 };

/** The diff as text: the summary, then by surface, breaks first. */
export function diffText(diff: ApiDiff): string {
  const out = [`Public API from ${diff.base} to ${diff.head}.\n${diffSummary(diff)}\n`];
  for (const surface of SURFACES) {
    const changes = diff.changes
      .filter((change) => change.surface === surface)
      .toSorted(
        (a, b) =>
          ORDER[a.kind] - ORDER[b.kind] ||
          Number(a.announced === true) - Number(b.announced === true) ||
          (a.id < b.id ? -1 : 1),
      );
    if (changes.length === 0) continue;
    out.push(`\n${surface}\n`);
    for (const change of changes) {
      const label = labelOf(change);
      const moved = change.movedTo === undefined || change.kind === 'moved' ? '' : ` (same path now ${change.movedTo})`;
      const where = change.line === undefined ? change.file : `${change.file}:${change.line}`;
      out.push(`- ${label}: ${change.id}: ${change.detail}${moved}  [${where}]\n`);
    }
  }
  if (diff.skipped > 0) out.push(`\n${diff.skipped} internal or experimental items skipped.\n`);
  return out.join('');
}
