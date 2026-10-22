// The known breaks `api-diff` is measured against: what the UPGRADE files of
// each major name for the surfaces the index covers, as item ids. A major
// that has shipped expects each break as a removal or change between the
// last minor before it and its first release. A major still on trunk
// expects each break deprecated there. Reported breaks the UPGRADE file
// does not name count as right only when they were checked and listed as
// `confirmed`.
import type { Change } from './api-diff.ts';
import type { Item, Snapshot } from './model.ts';

export interface Major {
  major: string;
  base: string;
  head: string;
  /** `removed`: the major has shipped; `deprecated`: it is still on trunk. */
  expect: 'removed' | 'deprecated';
}

export interface KnownBreak {
  major: string;
  id: string;
  kind: string;
  heading: string;
  /** Why the break is not counted: it names no item of the surfaces. */
  excluded?: string;
}

export interface Confirmed {
  major: string;
  id: string;
  evidence: string;
}

export interface KnownBreaks {
  majors: Major[];
  breaks: KnownBreak[];
  confirmed: Confirmed[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function strings(value: unknown, keys: string[]): value is Record<string, string> {
  return isRecord(value) && keys.every((key) => typeof value[key] === 'string');
}

export function isKnownBreaks(value: unknown): value is KnownBreaks {
  if (!isRecord(value)) return false;
  const { majors, breaks, confirmed } = value;
  return (
    Array.isArray(majors) &&
    majors.every(
      (entry) =>
        strings(entry, ['major', 'base', 'head']) && (entry.expect === 'removed' || entry.expect === 'deprecated'),
    ) &&
    Array.isArray(breaks) &&
    breaks.every((entry) => strings(entry, ['major', 'id', 'kind', 'heading'])) &&
    Array.isArray(confirmed) &&
    confirmed.every((entry) => strings(entry, ['major', 'id', 'evidence']))
  );
}

/** A change to `outer` takes `inner` with it: the same item, a field of the
 *  entity, or a key below the config key. */
export function covers(outer: string, inner: string): boolean {
  if (outer === inner) return true;
  if (outer.startsWith('entity:') && inner.startsWith('field:'))
    return inner.startsWith(`field:${outer.slice('entity:'.length)}.`);
  return outer.startsWith('config:') && inner.startsWith(`${outer}.`);
}

/** The item or one of its owners is deprecated in the snapshot. */
function deprecatedAt(id: string, byId: Map<string, Item>): boolean {
  const owners = [id];
  if (id.startsWith('field:')) owners.push(`entity:${id.slice('field:'.length).split('.')[0] ?? ''}`);
  if (id.startsWith('config:')) {
    const parts = id.split('.');
    for (let length = parts.length - 1; length > 0; length -= 1) owners.push(parts.slice(0, length).join('.'));
  }
  return owners.some((owner) => byId.get(owner)?.flags.deprecated !== undefined);
}

export interface MajorResult {
  major: Major;
  /** Known breaks counted, and the ones `api-diff` found. */
  known: string[];
  found: string[];
  /** Breaks `api-diff` reported, and the ones a known break or a confirmation explains. */
  reported: string[];
  right: string[];
}

/** Recall and precision of one major's diff. */
export function checkMajor(major: Major, known: KnownBreaks, changes: Change[], head: Snapshot): MajorResult {
  const counted = known.breaks.filter((entry) => entry.major === major.major && entry.excluded === undefined);
  const headById = new Map(head.items.map((item) => [item.id, item]));
  const isFound = (entry: KnownBreak): boolean => {
    const changed = changes.some(
      (change) => (major.expect === 'deprecated' || change.kind !== 'deprecated') && covers(change.id, entry.id),
    );
    return changed || (major.expect === 'deprecated' && deprecatedAt(entry.id, headById));
  };
  const reported = changes.filter((change) => change.kind !== 'deprecated' && change.announced !== true);
  const confirmed = new Set(known.confirmed.filter((entry) => entry.major === major.major).map((entry) => entry.id));
  const isRight = (change: Change): boolean =>
    confirmed.has(change.id) || counted.some((entry) => covers(change.id, entry.id) || covers(entry.id, change.id));
  return {
    major,
    known: counted.map((entry) => entry.id),
    found: counted.filter((entry) => isFound(entry)).map((entry) => entry.id),
    reported: reported.map((change) => change.id),
    right: reported.filter((change) => isRight(change)).map((change) => change.id),
  };
}

function percent(part: number, whole: number): string {
  return whole === 0 ? '-' : `${((100 * part) / whole).toFixed(1)} %`;
}

export interface Totals {
  recall: number;
  precision: number;
}

export function totals(results: MajorResult[]): Totals {
  const sum = (pick: (result: MajorResult) => string[]): number =>
    results.reduce((total, result) => total + pick(result).length, 0);
  const known = sum((result) => result.known);
  const reported = sum((result) => result.reported);
  return {
    recall: known === 0 ? 1 : sum((result) => result.found) / known,
    precision: reported === 0 ? 1 : sum((result) => result.right) / reported,
  };
}

/** The results as text: per major the counts, what was missed and what is unexplained. */
export function resultText(results: MajorResult[], gate: number): string {
  const out: string[] = [];
  for (const result of results) {
    const { major, known, found, reported, right } = result;
    out.push(
      `${major.major} (${major.base} → ${major.head}, expects ${major.expect}): found ${found.length}/${known.length} (${percent(found.length, known.length)}), right ${right.length}/${reported.length} (${percent(right.length, reported.length)})\n`,
    );
    for (const id of known.filter((entry) => !found.includes(entry))) out.push(`  missed: ${id}\n`);
    for (const id of reported.filter((entry) => !right.includes(entry))) out.push(`  unexplained: ${id}\n`);
  }
  const { recall, precision } = totals(results);
  const passed = recall >= gate && precision >= gate;
  out.push(
    `\nrecall ${percent(recall, 1)}, precision ${percent(precision, 1)}, gate ${percent(gate, 1)}: ${passed ? 'passed' : 'failed'}\n`,
  );
  return out.join('');
}
