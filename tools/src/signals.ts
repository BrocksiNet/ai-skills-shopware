// Signals (plan WP12): one record per change a skill author may have to act
// on, whatever its source. The drift report, the review collector and the
// suggest command share this shape; JSON Lines on disk.
import type { MinedCommit } from './mine-trunk.ts';
import type { Source } from './sources.ts';
import type { Change, LineDelta } from './trunk-deltas.ts';

export const SIGNAL_KINDS = [
  'skill-bullet',
  'guideline-heading',
  'guide-id',
  'rule-class',
  'template-line',
  'upstream-line',
  'review-comment',
  'review-body',
  'api-break',
] as const;
export type SignalKind = (typeof SIGNAL_KINDS)[number];

/** How a signal was tied to a skill. Rule-level first, then reference, then
 *  the source's skill list. */
export const VIAS = ['core_guide_ids', 'enforced_by', 'trunk.source', 'upstream', 'routes', 'source'] as const;
export type Via = (typeof VIAS)[number];

export interface SignalMap {
  skill: string;
  /** Skill-relative reference a route selected, e.g. `references/cache.md`. */
  reference?: string;
  /** Rule IDs the signal concerns; empty when only the skill is known. */
  rules: string[];
  via: Via;
}

export interface Signal {
  /** Stable: a re-run never produces a second signal for the same change. */
  id: string;
  /** Source ID from rules/sources.json, or the collector's name. */
  source: string;
  kind: SignalKind;
  repo: string;
  url: string;
  /** ISO 8601: commit date, or when the comment was written. */
  date: string;
  /** File in the source repository the change is in. */
  path: string;
  /** Added or removed, for line and ID changes. */
  change?: Change;
  /** GitHub file status of a rule class: added, removed, modified, renamed. */
  status?: string;
  /** The changed line, guide ID, class name or comment text. */
  text: string;
  /** Diff lines the reference routes run their anchors on; defaults to `text`. */
  lines?: string[];
  commit?: { sha: string; title: string };
  pr?: { number: number; title: string; merged_at: string };
  author?: { login: string; association: string };
  thread?: { replies: number; outdated: boolean };
  /** Filled by the mapper. */
  map: SignalMap[];
}

const commitUrl = (repo: string, sha: string): string => `https://github.com/${repo}/commit/${sha}`;

/** The signals of one mined commit, not yet mapped. */
export function commitSignals(source: Source, mined: MinedCommit): Signal[] {
  const { commit, deltas } = mined;
  const base = {
    source: source.id,
    repo: source.repo,
    url: commitUrl(source.repo, commit.sha),
    date: commit.date,
    commit: { sha: commit.sha, title: commit.title },
    map: [],
  };
  const id = (path: string, rest: string): string => `${source.repo}@${commit.sha.slice(0, 12)}:${path}:${rest}`;
  const make = (fields: Pick<Signal, 'id' | 'kind' | 'path' | 'text'> & Partial<Signal>): Signal => ({
    ...base,
    ...fields,
  });
  const lines = (kind: SignalKind, list: LineDelta[]): Signal[] =>
    list.map((d) =>
      make({ id: id(d.file, `${d.change}${d.text}`), kind, path: d.file, change: d.change, text: d.text }),
    );
  const upstream = source.extractor === 'markdown';
  return [
    ...lines(upstream ? 'upstream-line' : 'skill-bullet', deltas.bullets),
    ...lines(upstream ? 'upstream-line' : 'guideline-heading', deltas.headings),
    ...lines('guide-id', deltas.guideIds),
    ...lines('template-line', deltas.template),
    ...deltas.classes.map((c) =>
      make({
        id: id(c.file, `class:${c.status}`),
        kind: 'rule-class',
        path: c.file,
        status: c.status,
        text: c.name,
        lines: [],
      }),
    ),
  ];
}

type Json = Record<string, unknown>;
const isRecord = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === 'string';
const isKind = (v: unknown): v is SignalKind => SIGNAL_KINDS.some((k) => k === v);
const isVia = (v: unknown): v is Via => VIAS.some((k) => k === v);
const isMap = (v: unknown): v is SignalMap =>
  isRecord(v) &&
  isString(v.skill) &&
  (v.reference === undefined || isString(v.reference)) &&
  Array.isArray(v.rules) &&
  v.rules.every((r) => isString(r)) &&
  isVia(v.via);

/** A signal read back from JSON Lines. Checks the fields every consumer
 *  relies on; the optional context objects pass through. */
export function isSignal(v: unknown): v is Signal {
  if (!isRecord(v)) return false;
  const text = ['id', 'source', 'repo', 'url', 'date', 'path', 'text'].every((k) => isString(v[k]));
  return text && isKind(v.kind) && Array.isArray(v.map) && v.map.every((m) => isMap(m));
}

/** Signals from JSON Lines; throws on the first line that is not one. */
export function parseSignals(jsonl: string): Signal[] {
  return jsonl
    .split('\n')
    .map((line, i) => ({ line: line.trim(), n: i + 1 }))
    .filter(({ line }) => line !== '')
    .map(({ line, n }) => {
      const value: unknown = JSON.parse(line);
      if (!isSignal(value)) throw new Error(`line ${n} is not a signal`);
      return value;
    });
}

export const toJsonLines = (signals: Signal[]): string => signals.map((s) => `${JSON.stringify(s)}\n`).join('');
