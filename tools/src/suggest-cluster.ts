// Clusters for `suggest-rules` (plan WP12 step 4), built without a model:
// a mapped signal joins the cluster of each rule or reference it maps to
// (or of its skill when only the skill is known); an unmapped one the
// cluster of its file area. A cluster of one signal is dropped unless the
// review requested changes. Clusters are ranked by the summed weight of
// their signals: reviewer trust, more when the thread went outdated (the
// code followed the comment) and when the review requested changes.
import type { Signal, SignalMap } from './signals.ts';
import { compareText } from './text.ts';

/** Weight factor for a thread whose code changed afterwards. */
export const OUTDATED_FACTOR = 1.5;
/** Weight factor for a comment in a review that requested changes. */
export const CHANGES_FACTOR = 1.5;

export interface Weighted {
  signal: Signal;
  weight: number;
}

export interface Cluster {
  /** Stable key: `<skill>/<reference>`, `<skill>/<rule>`, `<skill>` or `area:<area>`. */
  key: string;
  skill?: string;
  reference?: string;
  /** Rules the cluster's maps name: the rules in the reference, or the rule. */
  rules: string[];
  signals: Weighted[];
  score: number;
}

const RULE_VIAS = new Set(['core_guide_ids', 'enforced_by', 'trunk.source', 'upstream']);

/** The first two path segments under `src/`, else the first two of the path;
 *  a review body (no path) files under its own area. */
export function fileArea(path: string): string {
  if (path === '') return '(no file)';
  const parts = path.split('/');
  const from = parts[0] === 'src' ? 1 : 0;
  return parts.slice(from, from + 2).join('/');
}

function keyOf(m: SignalMap): { key: string; reference?: string } {
  const [rule] = m.rules;
  if (RULE_VIAS.has(m.via) && rule !== undefined) return { key: `${m.skill}/${rule}` };
  if (m.reference !== undefined) return { key: `${m.skill}/${m.reference}`, reference: m.reference };
  return { key: m.skill };
}

export const changesRequested = (s: Signal): boolean => s.review?.state === 'CHANGES_REQUESTED';

export function weight(s: Signal, trust: number): number {
  const outdated = s.thread?.outdated === true ? OUTDATED_FACTOR : 1;
  const changes = changesRequested(s) ? CHANGES_FACTOR : 1;
  return Math.round(trust * outdated * changes * 100) / 100;
}

const round = (n: number): number => Math.round(n * 100) / 100;

export interface Clustering {
  /** Kept clusters, highest score first. */
  clusters: Cluster[];
  /** Clusters of one signal without requested changes. */
  dropped: Cluster[];
}

/** Clusters of the signals; `trustOf` gives a signal's reviewer trust. */
export function cluster(signals: Signal[], trustOf: (s: Signal) => number): Clustering {
  const byKey = new Map<string, Cluster>();
  const add = (key: string, s: Signal, fields: Partial<Cluster>, rules: string[]): void => {
    const c = byKey.get(key) ?? { key, rules: [], signals: [], score: 0, ...fields };
    if (c.signals.some((w) => w.signal.id === s.id)) return;
    c.signals.push({ signal: s, weight: weight(s, trustOf(s)) });
    c.rules = [...new Set([...c.rules, ...rules])].toSorted(compareText);
    byKey.set(key, c);
  };
  for (const s of signals) {
    if (s.map.length === 0) {
      add(`area:${fileArea(s.path)}`, s, {}, []);
      continue;
    }
    for (const m of s.map) {
      const { key, reference } = keyOf(m);
      add(key, s, { skill: m.skill, ...(reference === undefined ? {} : { reference }) }, m.rules);
    }
  }
  const all = [...byKey.values()];
  for (const c of all) {
    c.signals.sort((a, b) => b.weight - a.weight || compareText(a.signal.id, b.signal.id));
    c.score = round(c.signals.reduce((sum, w) => sum + w.weight, 0));
  }
  const keep = (c: Cluster): boolean => c.signals.length > 1 || c.signals.some((w) => changesRequested(w.signal));
  const ranked = all.toSorted((a, b) => b.score - a.score || compareText(a.key, b.key));
  return { clusters: ranked.filter((c) => keep(c)), dropped: ranked.filter((c) => !keep(c)) };
}

/** Clusters a `--skill` run looks at: the skill's own, plus the unmapped
 *  ones only when no skill is named. */
export const forSkill = (clusters: Cluster[], skill: string | undefined): Cluster[] =>
  skill === undefined ? clusters : clusters.filter((c) => c.skill === skill);
