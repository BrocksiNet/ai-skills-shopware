// Rules a cluster's signals talk about even when no route maps them
// (plan WP12 step 4). A review comment on a history comment in a PHP file
// maps to nothing when the diff hunk has no comment line, so the agent would
// propose a rule that exists. A keyword match (BM25) of each signal against
// every active rule finds the candidates; the agent decides.
import type { Catalog } from './catalog.ts';
import type { Signal } from './signals.ts';
import { currentRuleText } from './suggest-checks.ts';

export interface IndexedRule {
  id: string;
  skill: string;
  title: string;
  text: string;
  terms: Map<string, number>;
  length: number;
}

export interface RuleIndex {
  rules: IndexedRule[];
  idf: Map<string, number>;
  avgLength: number;
}

const STOP = new Set(
  'this that with from have when they them then than what which will would should could there their these those into only also does done more most some such other each over under your about after before because while where very just like here been were being same make made uses used using need needs code file files test tests rule rules'.split(
    ' ',
  ),
);

/** Lowercase words of four letters or more, camelCase split, stop words out. */
export function terms(text: string): string[] {
  return text
    .replaceAll(/([a-z])([A-Z])/gu, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .filter((w) => w.length >= 4 && !STOP.has(w) && !/^\d+$/u.test(w));
}

const counts = (words: string[]): Map<string, number> => {
  const m = new Map<string, number>();
  for (const w of words) m.set(w, (m.get(w) ?? 0) + 1);
  return m;
};

export function indexRules(rules: { id: string; skill: string; title: string; text: string }[]): RuleIndex {
  const indexed = rules.map((r) => {
    const words = terms(`${r.title} ${r.title} ${r.text}`);
    return { ...r, terms: counts(words), length: words.length };
  });
  const df = counts(indexed.flatMap((r) => [...r.terms.keys()]));
  const n = indexed.length;
  const idf = new Map([...df].map(([t, d]) => [t, Math.log(1 + (n - d + 0.5) / (d + 0.5))]));
  const avgLength = indexed.reduce((a, r) => a + r.length, 0) / Math.max(1, n);
  return { rules: indexed, idf, avgLength };
}

/** Every active rule with its current text. */
export const catalogIndex = (root: string, catalog: Catalog): RuleIndex =>
  indexRules(
    catalog.rules
      .filter((r) => r.status === 'active')
      .map((r) => ({ id: r.id, skill: r.skill, title: r.title, text: currentRuleText(root, catalog, r.id) })),
  );

const K1 = 1.2;
const B = 0.75;

/** BM25 of one rule for a set of query terms, and how many terms matched. */
function score(index: RuleIndex, rule: IndexedRule, query: Set<string>): { score: number; matched: number } {
  let total = 0;
  let matched = 0;
  for (const t of query) {
    const tf = rule.terms.get(t) ?? 0;
    if (tf === 0) continue;
    matched += 1;
    const norm = tf + K1 * (1 - B + (B * rule.length) / index.avgLength);
    total += ((index.idf.get(t) ?? 0) * tf * (K1 + 1)) / norm;
  }
  return { score: total, matched };
}

/** Least distinct terms a signal must share with a rule. */
const MIN_MATCHED = 3;
const PER_SIGNAL = 2;

/** The rules most signals point at, best first, without `exclude`. */
export function relatedRules(index: RuleIndex, signals: Signal[], exclude: string[], max: number): IndexedRule[] {
  const votes = new Map<string, number>();
  for (const s of signals) {
    const query = new Set(terms(s.text));
    const best = index.rules
      .map((rule) => ({ rule, ...score(index, rule, query) }))
      .filter((r) => r.matched >= MIN_MATCHED && !exclude.includes(r.rule.id))
      .toSorted((a, b) => b.score - a.score)
      .slice(0, PER_SIGNAL);
    for (const b of best) votes.set(b.rule.id, (votes.get(b.rule.id) ?? 0) + b.score);
  }
  return [...votes]
    .toSorted((a, b) => b[1] - a[1])
    .slice(0, max)
    .flatMap(([id]) => index.rules.filter((r) => r.id === id));
}
