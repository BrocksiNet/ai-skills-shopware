// What the timeline says about the Shopware API an extension uses, over the
// releases its composer range allows. Facts, not findings: each line says
// what holds in which releases. No dependencies, so a tool that reads the
// index can use it as is.
import { parseConstraint } from './constraint.ts';
import { compareReleases, fromRanges, type Timeline, type TimelineItem, type Tracked } from './timeline.ts';

/** Releases of the timeline in the range, oldest first. Trunk is never in a range. */
export function releasesIn(timeline: Timeline, constraint: string): string[] {
  const test = parseConstraint(constraint);
  if (test === undefined) throw new Error(`cannot read the version constraint "${constraint}"`);
  return timeline.releases.map((release) => release.release).filter((name) => test(name));
}

/** Looks items up by ID, case-insensitively for class and method names, like PHP. */
export class Lookup {
  readonly timeline: Timeline;
  readonly names: string[];
  readonly #byId: Map<string, TimelineItem>;
  readonly #indexes = new Map<TimelineItem, Map<string, Set<number>>>();
  readonly #present = new Map<TimelineItem, Set<number>>();

  constructor(timeline: Timeline) {
    this.timeline = timeline;
    this.names = timeline.releases.map((release) => release.release);
    this.#byId = new Map(timeline.items.map((item) => [Lookup.key(item.id), item]));
  }

  /** Constants and properties keep their case; classes and methods do not. */
  static key(id: string): string {
    const [owner = '', member] = id.split('::');
    if (member === undefined) return owner.toLowerCase();
    return `${owner.toLowerCase()}::${member.endsWith('()') ? member.toLowerCase() : member}`;
  }

  get(id: string): TimelineItem | undefined {
    return this.#byId.get(Lookup.key(id));
  }

  present(item: TimelineItem, index: number): boolean {
    let set = this.#present.get(item);
    if (set === undefined) {
      set = fromRanges(item.present, this.names);
      this.#present.set(item, set);
    }
    return set.has(index);
  }

  /** The value of a tracked field at a release, if any. */
  value(item: TimelineItem, field: Tracked, index: number): string | undefined {
    let byField = this.#indexes.get(item);
    if (byField === undefined) {
      byField = new Map();
      this.#indexes.set(item, byField);
    }
    for (const span of item.history[field] ?? []) {
      let set = byField.get(`${field}\0${span.value}`);
      if (set === undefined) {
        set = fromRanges(span.ranges, this.names);
        byField.set(`${field}\0${span.value}`, set);
      }
      if (set.has(index)) return span.value;
    }
    return undefined;
  }

  /** The item that declares `member` for `owner` at a release: the class
   *  itself, then its traits, parents, interfaces and their parents.
   *  `external` when the chain reaches a class outside the index (Symfony,
   *  Doctrine), which may declare the member. */
  member(
    owner: string,
    member: string,
    index: number,
    seen = new Set<string>(),
  ): TimelineItem | 'external' | undefined {
    const key = owner.toLowerCase();
    if (seen.has(key)) return undefined;
    seen.add(key);
    const own = this.get(`php:${owner}::${member}`);
    if (own !== undefined && this.present(own, index)) return own;
    const klass = this.get(`php:${owner}`);
    if (klass === undefined) return seen.size > 1 ? 'external' : undefined;
    if (!this.present(klass, index)) return undefined;
    const parents = [
      this.value(klass, 'traits', index),
      this.value(klass, 'extends', index),
      this.value(klass, 'implements', index),
    ]
      .flatMap((value) => (value === undefined ? [] : value.split(', ')))
      .filter((name) => name !== '');
    let external = false;
    for (const parent of parents) {
      const found = this.member(parent, member, index, seen);
      if (found === 'external') external = true;
      else if (found !== undefined) return found;
    }
    return external ? 'external' : undefined;
  }
}

export type FactKind =
  | 'unknown'
  | 'missing'
  | 'internal'
  | 'deprecated'
  | 'experimental'
  | 'final-extended'
  | 'bc-change';

export interface Fact {
  target: string;
  kind: FactKind;
  /** The releases of the range the fact holds in, as ranges. */
  releases: [string, string][];
  /** The flag value, such as the removal version of a deprecation. */
  value?: string;
  /** The item that carries the flag, when it is not the target (its class or a parent). */
  via?: string;
}

/** Collapses release indexes into `[first, last]` runs within the range. */
function runs(indexes: number[], inRange: number[], names: string[]): [string, string][] {
  const out: [string, string][] = [];
  let start: number | undefined;
  let last: number | undefined;
  for (const index of inRange) {
    const hit = indexes.includes(index);
    if (hit && start === undefined) start = index;
    if (!hit && start !== undefined) {
      out.push([names[start] ?? '', names[last ?? start] ?? '']);
      start = undefined;
    }
    last = index;
  }
  if (start !== undefined) out.push([names[start] ?? '', names[last ?? start] ?? '']);
  return out;
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

/** Facts about one target over the releases of a range. A member inherits
 *  `internal`, `deprecated` and `experimental` from its class. */
export function factsFor(lookup: Lookup, target: string, how: string, range: string[]): Fact[] {
  const names = lookup.names;
  const indexes = range.map((release) => names.indexOf(release)).filter((index) => index !== -1);
  const [owner = '', member] = target.replace(/^php:/u, '').split('::');
  const found = indexes.map((index) => ({
    index,
    klass: lookup.get(`php:${owner}`),
    item: member === undefined ? lookup.get(target) : lookup.member(owner, member, index),
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
  facts.push(...flagFacts(lookup, target, member !== undefined, resolved, indexes));
  if (how === 'extends') {
    const final = resolved
      .filter(({ index, item }) => item !== undefined && lookup.value(item, 'final', index) !== undefined)
      .map(({ index }) => index);
    if (final.length > 0) facts.push({ target, kind: 'final-extended', releases: runs(final, indexes, names) });
  }
  return facts;
}

/** `6.6.0.0 … 6.6.10.29` or a single release. */
export function formatRuns(releases: [string, string][]): string {
  return releases.map(([first, last]) => (first === last ? first : `${first} … ${last}`)).join(', ');
}

export function sortReleases(names: string[]): string[] {
  return names.toSorted(compareReleases);
}
