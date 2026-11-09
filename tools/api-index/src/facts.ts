// What the timeline says about the Shopware API an extension uses, over the
// releases its composer range allows. Facts, not findings: each line says
// what holds in which releases. No dependencies, so a tool that reads the
// index can use it as is.
import { Lookup } from './lookup.ts';
import { runs } from './runs.ts';
import { memberOwner } from './surfaces.ts';
import type { TimelineItem, Tracked } from './timeline.ts';

export { Lookup };

export type FactKind =
  | 'unknown'
  | 'missing'
  | 'internal'
  | 'deprecated'
  | 'experimental'
  | 'final-extended'
  | 'bc-change'
  /** A template block whose body differs from the release before it in the range. */
  | 'changed'
  /** The previous name of a moved class: a runtime alias of the canonical class, until `until`. */
  | 'moved'
  /** A `class_exists` or `method_exists` guard on a symbol every release of the range has. */
  | 'guarded-everywhere';

export interface Fact {
  target: string;
  kind: FactKind;
  /** The releases of the range the fact holds in, as ranges. */
  releases: [string, string][];
  /** The flag value, such as the removal version of a deprecation. */
  value?: string;
  /** The item that carries the flag, when it is not the target (its class or a parent). */
  via?: string;
  /** For a moved class: the version that removes the old name. */
  until?: string;
}

const FLAGS: { field: Tracked; kind: FactKind }[] = [
  { field: 'internal', kind: 'internal' },
  { field: 'deprecated', kind: 'deprecated' },
  { field: 'experimental', kind: 'experimental' },
  { field: 'bcChanges', kind: 'bc-change' },
];

interface Resolved {
  index: number;
  klass: TimelineItem | undefined;
  item: TimelineItem | undefined;
}

/** The flag facts of one target. The member's own flag and its class's flag
 *  are separate facts: both can hold, with different removal versions. */
function flagFacts(lookup: Lookup, target: string, isMember: boolean, resolved: Resolved[], indexes: number[]): Fact[] {
  const facts: Fact[] = [];
  for (const { field, kind } of FLAGS) {
    const hits = new Map<string, { indexes: number[]; via: string | undefined }>();
    for (const { index, item, klass } of resolved) {
      if (item === undefined || !lookup.present(item, index)) continue;
      const own = lookup.value(item, field, index);
      const fromClass =
        isMember && field !== 'bcChanges' && klass !== undefined ? lookup.value(klass, field, index) : undefined;
      const carriers: [string | undefined, string | undefined][] = [
        [own, item.id === target ? undefined : item.id],
        [fromClass, klass?.id],
      ];
      for (const [value, via] of carriers.filter(([carried]) => carried !== undefined)) {
        const key = `${value ?? ''}\0${via ?? ''}`;
        const entry = hits.get(key) ?? { indexes: [], via };
        entry.indexes.push(index);
        hits.set(key, entry);
      }
    }
    for (const [key, entry] of hits) {
      const value = key.split('\0')[0] ?? '';
      const fact: Fact = { target, kind, releases: runs(entry.indexes, indexes, lookup.names) };
      if (value !== 'true') fact.value = value;
      if (entry.via !== undefined) fact.via = entry.via;
      facts.push(fact);
    }
  }
  return facts;
}

/** True only when the index shows the target in every release of the
 *  range; false when it is missing or the index cannot say. */
export function presentThroughout(lookup: Lookup, target: string, range: string[]): boolean {
  const [owner = '', member] = target.replace(/^php:/u, '').split('::');
  const indexes = range.map((release) => lookup.names.indexOf(release));
  if (indexes.length === 0 || indexes.includes(-1)) return false;
  return indexes.every((index) => {
    const item = member === undefined ? lookup.get(target) : lookup.member(owner, member, index);
    return item !== undefined && item !== 'external' && lookup.present(item, index);
  });
}

function phpItem(lookup: Lookup, target: string, index: number): TimelineItem | 'external' | undefined {
  const [owner = '', member] = target.replace(/^php:/u, '').split('::');
  return member === undefined ? lookup.canonical(target, index) : lookup.member(owner, member, index);
}

/** The releases a class name is a runtime alias of a moved class in, one
 *  fact per canonical class and removal version. */
function movedFacts(lookup: Lookup, target: string, indexes: number[]): Fact[] {
  const own = lookup.get(target);
  if (own === undefined) return [];
  const hits = new Map<string, number[]>();
  for (const index of indexes) {
    const alias = lookup.present(own, index) ? lookup.value(own, 'aliasOf', index) : undefined;
    if (alias === undefined) continue;
    const key = `${alias}\0${lookup.value(own, 'deprecated', index) ?? ''}`;
    hits.set(key, [...(hits.get(key) ?? []), index]);
  }
  return [...hits].map(([key, hit]) => {
    const [alias = '', until = ''] = key.split('\0');
    const fact: Fact = { target, kind: 'moved', releases: runs(hit, indexes, lookup.names), value: `php:${alias}` };
    if (until !== '') fact.until = until;
    return fact;
  });
}

/** The releases of the range in which a block's body differs from the
 *  previous release that has the block. Each release is its own run: two
 *  changes in a row are two changes. */
function changedFacts(lookup: Lookup, target: string, resolved: Resolved[]): Fact[] {
  const changes: [string, string][] = [];
  let previous: string | undefined;
  for (const { index, item } of resolved) {
    if (item === undefined || !lookup.present(item, index)) continue;
    const body = lookup.value(item, 'body', index);
    if (body === undefined) continue;
    const name = lookup.names[index] ?? '';
    if (previous !== undefined && body !== previous) changes.push([name, name]);
    previous = body;
  }
  return changes.length === 0 ? [] : [{ target, kind: 'changed', releases: changes }];
}

/** Facts about one target over the releases of a range. A member inherits
 *  `internal`, `deprecated` and `experimental` from its class. A name that
 *  is a runtime alias of a moved class resolves to the canonical class,
 *  and says so in a `moved` fact. */
export function factsFor(lookup: Lookup, target: string, how: string, range: string[]): Fact[] {
  const names = lookup.names;
  const indexes = range.map((release) => names.indexOf(release)).filter((index) => index !== -1);
  const [owner = '', member] = target.replace(/^php:/u, '').split('::');
  // A frontend member inherits from its component or template, as a PHP member from its class.
  const frontend = memberOwner(target);
  const found = indexes.map((index) => ({
    index,
    klass: frontend === undefined ? lookup.canonical(`php:${owner}`, index) : lookup.get(frontend),
    item: frontend === undefined ? phpItem(lookup, target, index) : lookup.inherited(target, index),
  }));
  if (found.every(({ klass, item }) => klass === undefined && item === undefined)) {
    return [{ target, kind: 'unknown', releases: [] }];
  }
  // Inherited from outside Shopware in some release: the index cannot say.
  if (found.some(({ item }) => item === 'external')) return [];
  const resolved: Resolved[] = found.map(({ index, klass, item }) => ({
    index,
    klass,
    item: item === 'external' ? undefined : item,
  }));
  const facts: Fact[] = [];
  const missing = resolved.filter(({ index, item }) => item === undefined || !lookup.present(item, index));
  if (missing.length > 0) {
    facts.push({
      target,
      kind: 'missing',
      releases: runs(
        missing.map(({ index }) => index),
        indexes,
        names,
      ),
    });
  }
  if (frontend !== undefined && target.includes('#')) facts.push(...changedFacts(lookup, target, resolved));
  facts.push(...flagFacts(lookup, target, member !== undefined || frontend !== undefined, resolved, indexes));
  if (member === undefined && frontend === undefined) facts.push(...movedFacts(lookup, target, indexes));
  if (how === 'extends') {
    const final = resolved
      .filter(({ index, item }) => item !== undefined && lookup.value(item, 'final', index) !== undefined)
      .map(({ index }) => index);
    if (final.length > 0) facts.push({ target, kind: 'final-extended', releases: runs(final, indexes, names) });
  }
  return facts;
}
