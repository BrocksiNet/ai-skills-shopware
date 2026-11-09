// Items of the timeline by ID, and what each holds at a release: present or
// not, a tracked value, the member a class inherits.
import { builtinMembers } from './builtin.ts';
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
