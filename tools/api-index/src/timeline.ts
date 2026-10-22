// Many snapshots merged into one timeline: each item once, with the releases
// it exists in as ranges, and every flag and detail as the value it had over
// which releases. docs/plans/2026-10-wp11-public-api-index.md explains why.
import { GENERATOR, type Item, type ItemKind, SCHEMA, type Snapshot } from './model.ts';

/** First and last release of a run of consecutive releases; `null` as the
 *  end means "up to the newest build in the timeline". */
export type Range = [string, string | null];

/** A value and the releases it held in. */
export interface Span {
  value: string;
  ranges: Range[];
}

/** The fields tracked over time. Flags first, then the details that make a
 *  signature change visible. */
export const TRACKED = [
  'internal',
  'deprecated',
  'experimental',
  'final',
  'bcChanges',
  'visibility',
  'static',
  'abstract',
  'signature',
  'extends',
  'implements',
  'traits',
  'package',
  'scope',
  'schema',
] as const;

export type Tracked = (typeof TRACKED)[number];

export interface TimelineItem {
  id: string;
  kind: ItemKind;
  /** The file in the newest release that has the item. */
  file: string;
  present: Range[];
  /** Only fields that ever had a value; a release without a span had none. */
  history: Partial<Record<Tracked, Span[]>>;
}

export interface Release {
  /** Tag without the leading `v`, or the trunk label. */
  release: string;
  ref: string;
  sha: string;
  builtAt: string;
  generator: string;
}

export interface Timeline {
  schema: number;
  generator: string;
  /** Oldest first; ranges refer to these names. */
  releases: Release[];
  items: TimelineItem[];
}

/** `v6.7.2.0` → `6.7.2.0`. */
export function releaseName(ref: string): string {
  return ref.replace(/^v(?=\d)/u, '');
}

/** Numeric parts of a release, or undefined for a non-release such as trunk. */
export function versionParts(name: string): number[] | undefined {
  const match = /^v?(\d+(?:\.\d+)*)$/u.exec(name);
  return match?.[1]?.split('.').map(Number);
}

/** Orders release names by version; names that are not versions go last. */
export function compareReleases(a: string, b: string): number {
  const left = versionParts(a);
  const right = versionParts(b);
  if (left === undefined || right === undefined) return (left === undefined ? 1 : 0) - (right === undefined ? 1 : 0);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Release tags (no `-rc`) at or after `from`, oldest first. */
export function releaseTags(tags: string[], from: string): string[] {
  return tags
    .filter((tag) => versionParts(tag) !== undefined && compareReleases(releaseName(tag), from) >= 0)
    .toSorted((a, b) => compareReleases(releaseName(a), releaseName(b)));
}

/** The value of a tracked field as one string, or undefined when unset. */
export function fieldValue(item: Item, field: Tracked): string | undefined {
  switch (field) {
    case 'internal':
      return item.flags.internal === true ? 'true' : undefined;
    case 'deprecated':
    case 'experimental':
    case 'final':
      return item.flags[field];
    case 'bcChanges':
      return item.flags.bcChanges?.join(', ');
    case 'static':
    case 'abstract':
    case 'schema':
      return item[field] === true ? 'true' : undefined;
    case 'extends':
    case 'implements':
    case 'traits':
      return item[field] === undefined || item[field].length === 0 ? undefined : item[field].join(', ');
    case 'visibility':
    case 'signature':
    case 'package':
    case 'scope':
      return item[field];
  }
  return undefined;
}

/** Turns the sorted indexes of releases into ranges of consecutive ones. */
export function toRanges(indexes: number[], names: string[]): Range[] {
  const ranges: Range[] = [];
  let start: number | undefined;
  let previous = -2;
  const close = (): void => {
    if (start === undefined) return;
    const end = previous === names.length - 1 ? null : (names[previous] ?? null);
    ranges.push([names[start] ?? '', end]);
  };
  for (const index of indexes) {
    if (index !== previous + 1) {
      close();
      start = index;
    }
    previous = index;
  }
  close();
  return ranges;
}

/** Expands ranges back to release indexes. */
export function fromRanges(ranges: Range[], names: string[]): Set<number> {
  const out = new Set<number>();
  for (const [first, last] of ranges) {
    const start = names.indexOf(first);
    const end = last === null ? names.length - 1 : names.indexOf(last);
    if (start === -1 || end === -1) continue;
    for (let index = start; index <= end; index += 1) out.add(index);
  }
  return out;
}

interface Accumulator {
  item: Item;
  present: number[];
  values: Map<Tracked, Map<string, number[]>>;
}

/** Merges snapshots into a timeline. The snapshots are ordered by release
 *  version; a ref that is not a version (trunk) goes last. */
export function mergeSnapshots(snapshots: Snapshot[]): Timeline {
  const ordered = snapshots.toSorted((a, b) => compareReleases(releaseName(a.ref), releaseName(b.ref)));
  const names = ordered.map((snapshot) => releaseName(snapshot.ref));
  const items = new Map<string, Accumulator>();
  ordered.forEach((snapshot, index) => {
    for (const item of snapshot.items) {
      let entry = items.get(item.id);
      if (entry === undefined) {
        entry = { item, present: [], values: new Map() };
        items.set(item.id, entry);
      }
      entry.item = item;
      entry.present.push(index);
      for (const field of TRACKED) {
        const value = fieldValue(item, field);
        if (value === undefined) continue;
        let byValue = entry.values.get(field);
        if (byValue === undefined) {
          byValue = new Map();
          entry.values.set(field, byValue);
        }
        byValue.set(value, [...(byValue.get(value) ?? []), index]);
      }
    }
  });
  const merged: TimelineItem[] = [];
  for (const { item, present, values } of items.values()) {
    const history: Partial<Record<Tracked, Span[]>> = {};
    for (const field of TRACKED) {
      const byValue = values.get(field);
      if (byValue === undefined) continue;
      history[field] = [...byValue].map(([value, indexes]) => ({ value, ranges: toRanges(indexes, names) }));
    }
    merged.push({ id: item.id, kind: item.kind, file: item.file, present: toRanges(present, names), history });
  }
  merged.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return {
    schema: SCHEMA,
    generator: GENERATOR,
    releases: ordered.map((snapshot) => ({
      release: releaseName(snapshot.ref),
      ref: snapshot.ref,
      sha: snapshot.sha,
      builtAt: snapshot.builtAt,
      generator: snapshot.generator,
    })),
    items: merged,
  };
}

/** What a timeline says about one item at one release. */
export interface ItemAt {
  present: boolean;
  values: Partial<Record<Tracked, string>>;
}

export function itemAt(timeline: Timeline, item: TimelineItem, release: string): ItemAt {
  const names = timeline.releases.map((entry) => entry.release);
  const index = names.indexOf(release);
  const values: Partial<Record<Tracked, string>> = {};
  if (index === -1) return { present: false, values };
  for (const field of TRACKED) {
    const span = item.history[field]?.find((entry) => fromRanges(entry.ranges, names).has(index));
    if (span !== undefined) values[field] = span.value;
  }
  return { present: fromRanges(item.present, names).has(index), values };
}

/** The items of one release, rebuilt from the timeline, so two releases can
 *  be compared without a clone. */
export function snapshotAt(timeline: Timeline, ref: string): Snapshot | undefined {
  const release = releaseName(ref);
  const entry = timeline.releases.find((candidate) => candidate.release === release);
  if (entry === undefined) return undefined;
  const items: Item[] = [];
  for (const item of timeline.items) {
    const at = itemAt(timeline, item, release);
    if (!at.present) continue;
    const { values } = at;
    const rebuilt: Item = { id: item.id, kind: item.kind, file: item.file, flags: {} };
    if (values.internal === 'true') rebuilt.flags.internal = true;
    if (values.deprecated !== undefined) rebuilt.flags.deprecated = values.deprecated;
    if (values.experimental !== undefined) rebuilt.flags.experimental = values.experimental;
    if (values.final === 'keyword' || values.final === 'doc') rebuilt.flags.final = values.final;
    if (values.bcChanges !== undefined) rebuilt.flags.bcChanges = values.bcChanges.split(', ');
    if (values.visibility === 'public' || values.visibility === 'protected') rebuilt.visibility = values.visibility;
    if (values.static === 'true') rebuilt.static = true;
    if (values.abstract === 'true') rebuilt.abstract = true;
    if (values.signature !== undefined) rebuilt.signature = values.signature;
    if (values.extends !== undefined) rebuilt.extends = values.extends.split(', ');
    if (values.implements !== undefined) rebuilt.implements = values.implements.split(', ');
    if (values.traits !== undefined) rebuilt.traits = values.traits.split(', ');
    if (values.package !== undefined) rebuilt.package = values.package;
    if (values.scope !== undefined) rebuilt.scope = values.scope;
    if (values.schema === 'true') rebuilt.schema = true;
    items.push(rebuilt);
  }
  return {
    schema: timeline.schema,
    generator: entry.generator,
    ref: entry.release,
    sha: entry.sha,
    builtAt: entry.builtAt,
    failed: [],
    items,
  };
}
