// What the timeline says about the Shopware API an extension uses, over the
// releases its composer range allows. Facts, not findings: each line says
// what holds in which releases. No dependencies, so a tool that reads the
// index can use it as is.
import { builtinMembers } from './builtin.ts';
import { runs } from './runs.ts';
import { memberOwner, parentOwner } from './surfaces.ts';
import { fromRanges, type Timeline, type TimelineItem, type Tracked } from './timeline.ts';

/** Looks items up by ID, case-insensitively for class and method names, like PHP. */
export class Lookup {
  readonly timeline: Timeline;
  readonly names: string[];
  readonly #byId: Map<string, TimelineItem>;
  readonly #indexes = new Map<TimelineItem, Map<string, Set<number>>>();
  readonly #present = new Map<TimelineItem, Set<number>>();
  #blocks: Map<string, TimelineItem[]> | undefined;

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

  /** The `#` members of a template or component: its blocks, in every release. */
  blocks(owner: string): TimelineItem[] {
    if (this.#blocks === undefined) {
      this.#blocks = new Map();
      for (const item of this.timeline.items) {
        const hash = item.id.indexOf('#');
        if (hash === -1) continue;
        const key = item.id.slice(0, hash).toLowerCase();
        this.#blocks.set(key, [...(this.#blocks.get(key) ?? []), item]);
      }
    }
    return this.#blocks.get(owner.toLowerCase()) ?? [];
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

  /** A frontend member at a release: its own item, or the one of the
   *  component or template its owner extends. */
  inherited(id: string, index: number, depth = 0): TimelineItem | undefined {
    const own = this.get(id);
    if (own !== undefined && this.present(own, index)) return own;
    const owner = memberOwner(id);
    const item = owner === undefined || depth > 12 ? undefined : this.get(owner);
    if (owner === undefined || item === undefined || !this.present(item, index)) return undefined;
    const parent = parentOwner(owner, this.value(item, 'signature', index));
    return parent === undefined ? undefined : this.inherited(`${parent}${id.slice(owner.length)}`, index, depth + 1);
  }

  /** The item `id` names at a release: itself, or the canonical class when
   *  the name is a runtime alias of a moved class. */
  canonical(id: string, index: number): TimelineItem | undefined {
    let item = this.get(id);
    for (let depth = 0; item !== undefined && depth < 12; depth += 1) {
      const alias = this.value(item, 'aliasOf', index);
      if (alias === undefined) return item;
      item = this.get(`php:${alias}`);
    }
    return item;
  }

  /** The item that declares `member` for `owner` at a release: the class
   *  itself (or the canonical class its name is an alias of), then its
   *  traits, parents, interfaces and their parents.
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
    if (klass === undefined) {
      if (seen.size === 1) return undefined;
      // A PHP built-in declares only its fixed members; other classes outside the index may declare anything.
      const builtin = builtinMembers(owner);
      return builtin === undefined || builtin.has(member.toLowerCase()) ? 'external' : undefined;
    }
    if (!this.present(klass, index)) return undefined;
    const alias = this.value(klass, 'aliasOf', index);
    if (alias !== undefined) return this.member(alias, member, index, seen);
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
  | 'bc-change'
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
