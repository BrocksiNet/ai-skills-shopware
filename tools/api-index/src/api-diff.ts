// What a change between two snapshots does to the public API: items removed
// or changed in a way a client or an extension notices, and items newly
// deprecated. A removal is a break unless the base already deprecated the
// item (CORE-063). Items `@internal` or `@experimental` in the base are
// skipped and counted. PHP signatures are left to core's `bc-check`; the PHP
// surface reports removals only, labelled as also checked there.
import type { Item, Snapshot } from './model.ts';
import { frontendChange, ownerOf, type Surface, SURFACES, surfaceOf } from './surfaces.ts';

export { type Surface, SURFACES, surfaceOf };

export type ChangeKind = 'removed' | 'changed' | 'deprecated';

export interface Change {
  surface: Surface;
  kind: ChangeKind;
  id: string;
  /** For a removal: the base deprecated it, so the removal was announced. */
  announced?: boolean;
  /** What changed, in words. */
  detail: string;
  /** Where the item now is, when a removed route or field reappears under another id. */
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

function changeOf(base: Item, head: Item): string | undefined {
  if (base.kind === 'route') return routeChange(base, head);
  if (base.kind === 'field') return fieldChange(base.signature ?? '', head.signature ?? '');
  if (base.kind === 'config') return configChange(base, head);
  return frontendChange(base, head);
}

/** Deprecated in the snapshot, by its own flag or its owner's. */
function deprecatedIn(item: Item, byId: Map<string, Item>): boolean {
  let current: Item | undefined = item;
  for (let depth = 0; current !== undefined && depth < 12; depth += 1) {
    if (current.flags.deprecated !== undefined) return true;
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
}

function removal(item: Item, surface: Surface, sides: Sides): Change | undefined {
  const { baseById, headById } = sides;
  // A member goes with its class, a field with its entity and a key with
  // its parent key; report the outermost only.
  const owner = ownerOf(item);
  if (owner !== undefined && baseById.has(owner) && !headById.has(owner)) return undefined;
  // A key whose parent became a prototype is still accepted under it.
  if (item.kind === 'config' && headById.has(`${owner ?? ''}.*`)) return undefined;
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

export function diffSnapshots(base: Snapshot, head: Snapshot, surfaces: Surface[] = SURFACES): ApiDiff {
  const wanted = new Set(surfaces);
  const baseById = new Map(base.items.map((item) => [item.id, item]));
  const headById = new Map(head.items.map((item) => [item.id, item]));
  const added = head.items.filter((item) => !baseById.has(item.id));
  const sides: Sides = { base: base.items, baseById, headById, added };
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
    const detail = changeOf(item, after);
    if (detail !== undefined) {
      const change: Change = { surface, kind: 'changed', id: item.id, detail, file: after.file };
      if (deprecatedIn(item, baseById)) change.announced = true;
      changes.push(change);
    }
    if (after.flags.deprecated !== undefined && item.flags.deprecated === undefined) {
      changes.push({
        surface,
        kind: 'deprecated',
        id: item.id,
        detail: after.flags.deprecated === '' ? 'deprecated' : `deprecated for ${after.flags.deprecated}`,
        file: after.file,
      });
    }
  }
  return { base: base.ref, head: head.ref, changes, skipped };
}

function labelOf(change: Change): string {
  if (change.kind === 'deprecated') return 'deprecated';
  if (change.announced === true) return `${change.kind} after deprecation`;
  return `BREAK ${change.kind}`;
}

/** A removal or change without a deprecation in the base. */
export function isBreak(change: Change): boolean {
  return change.kind !== 'deprecated' && change.announced !== true;
}

/** Sets each change's line from the file text at the ref that has the item:
 *  the base for a removal, the head otherwise. `read` returns undefined for
 *  a file it cannot read. */
export function withLines(
  diff: ApiDiff,
  read: (ref: string, files: string[]) => Map<string, string>,
  lineOf: (id: string, text: string) => number | undefined,
): ApiDiff {
  const files = (removed: boolean): string[] => [
    ...new Set(diff.changes.filter((change) => (change.kind === 'removed') === removed).map((change) => change.file)),
  ];
  const atBase = read(diff.base, files(true));
  const atHead = read(diff.head, files(false));
  const changes = diff.changes.map((change) => {
    const text = (change.kind === 'removed' ? atBase : atHead).get(change.file);
    const line = text === undefined ? undefined : lineOf(change.id, text);
    return line === undefined ? change : { ...change, line };
  });
  return { ...diff, changes };
}

const plural = (count: number, one: string, many: string): string => `${count} ${count === 1 ? one : many}`;

/** One line an agent can act on: the breaks first, then what was announced. */
export function diffSummary(diff: ApiDiff): string {
  const breaks = diff.changes.filter((change) => isBreak(change)).length;
  const announced = diff.changes.filter((change) => change.kind !== 'deprecated' && change.announced === true).length;
  const deprecated = diff.changes.filter((change) => change.kind === 'deprecated').length;
  return (
    `Summary: ${plural(breaks, 'breaking change', 'breaking changes')} without a deprecation in ${diff.base}, ` +
    `${plural(announced, 'removal or change', 'removals or changes')} after a deprecation, ` +
    `${plural(deprecated, 'new deprecation', 'new deprecations')}.`
  );
}

const ORDER: Record<ChangeKind, number> = { removed: 0, changed: 1, deprecated: 2 };

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
      const moved = change.movedTo === undefined ? '' : ` (same path now ${change.movedTo})`;
      const where = change.line === undefined ? change.file : `${change.file}:${change.line}`;
      out.push(`- ${label}: ${change.id}: ${change.detail}${moved}  [${where}]\n`);
    }
  }
  if (diff.skipped > 0) out.push(`\n${diff.skipped} internal or experimental items skipped.\n`);
  return out.join('');
}
