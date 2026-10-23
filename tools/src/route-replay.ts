// Route replay: the reference router measured on real pull requests. The
// review collector (review-store.ts) maps each review comment to the
// references whose routes match the comment's file and diff hunk. Replaying
// the router on the whole PR diff then shows
//
//   recall  the share of those comment-mapped references the router selects
//           for the PR, as a review agent would get them;
//   noise   references the router selects with no comment mapped to them.
//
// Comment mapping runs the same routes on a slice of the diff, so recall is
// a consistency check: a miss means the comment's hunk is gone from the
// merged diff (the thread went outdated) or a route excludes the path. Hand
// labels (`labels` in a corpus case) are the independent ground truth: a
// reference a person says the comment needed.
import { loadCatalog } from './catalog.ts';
import { mapIndex, mapSignal, type MapIndex } from './map-signal.ts';
import { touchesTests } from './replay-diff.ts';
import { BORROWED } from './route-borrow.ts';
import { routeDiff } from './routes.ts';
import type { Signal } from './signals.ts';
import { loadSources } from './sources.ts';
import { compareText } from './text.ts';

/** `sw-review-learnings/references/code-comments.md`: a reference under its
 *  owning skill, so a borrowed selection counts for the owner's file. */
export type RefKey = string;

/** A reference a person says a review comment needed. */
export interface Label {
  reference: RefKey;
  rule?: string;
  url: string;
  why: string;
}

export interface ReplayCase {
  repo: string;
  pr: number;
  title: string;
  /** Reference -> URLs of the review comments mapped to it. */
  expected: Record<RefKey, string[]>;
  labels: Label[];
  /** The commit the diff was taken at, when not the merged diff: a comment
   *  whose code changed later only routes on the diff it was written on. */
  commit?: string;
  diff: string;
}

/** The owner key of a reference selected under `skill`. */
export function ownerKey(skill: string, reference: string): RefKey {
  const borrowed = BORROWED.exec(reference);
  if (borrowed !== null) return `${borrowed[1] ?? skill}/${borrowed[2] ?? reference}`;
  return `${skill}/${reference}`;
}

/** The references the router selects for a diff, owner-keyed. */
export function selectedKeys(root: string, diff: string): Set<RefKey> {
  const { selected } = routeDiff(root, diff);
  const keys = Object.entries(selected).flatMap(([skill, refs]) => refs.map((r) => ownerKey(skill, r)));
  return new Set(keys);
}

/** The mapper of a skills tree, as the collector builds it. */
export const replayIndex = (root: string): MapIndex => mapIndex(root, loadCatalog(root), loadSources(root));

/** Reference -> comment URLs of one PR's signals, mapped with `index`. Only
 *  review comments count: a review body has no file or hunk to route. */
export function expectedRefs(signals: Signal[], index: MapIndex): Record<RefKey, string[]> {
  const out = new Map<RefKey, string[]>();
  for (const s of signals) {
    if (s.kind !== 'review-comment') continue;
    for (const m of mapSignal(s, index)) {
      if (m.reference === undefined) continue;
      const key = ownerKey(m.skill, m.reference);
      out.set(key, [...new Set([...(out.get(key) ?? []), s.url])]);
    }
  }
  return Object.fromEntries([...out].toSorted(([a], [b]) => compareText(a, b)));
}

/** Signals grouped by PR number, review comments only. */
export function byPr(signals: Signal[]): Map<number, Signal[]> {
  const prs = new Map<number, Signal[]>();
  for (const s of signals) {
    if (s.kind !== 'review-comment' || s.pr === undefined) continue;
    prs.set(s.pr.number, [...(prs.get(s.pr.number) ?? []), s]);
  }
  return prs;
}

// ---- measuring -------------------------------------------------------------

export interface CaseResult {
  pr: number;
  title: string;
  selected: RefKey[];
  expected: RefKey[];
  hits: RefKey[];
  misses: RefKey[];
  /** Selected with no comment mapped to them. */
  unmatched: RefKey[];
  labelHits: Label[];
  labelMisses: Label[];
  tests: boolean;
  /** Reference -> comment URLs, for the miss list. */
  comments: Record<RefKey, string[]>;
}

export interface RefStats {
  reference: RefKey;
  selected: number;
  expected: number;
  hits: number;
  misses: number;
  unmatched: number;
}

export interface FocusStats {
  reference: RefKey;
  testPrs: number;
  selectedOnTests: number;
  selected: number;
  expected: number;
  hits: number;
}

export interface ReplayResult {
  cases: CaseResult[];
  /** PRs with at least one comment-mapped reference. */
  withExpected: number;
  expected: number;
  hits: number;
  /** Micro recall: hits over every expected (PR, reference) pair. */
  recall: number;
  /** Mean of per-PR recall over PRs with an expected reference. */
  meanRecall: number;
  /** Mean references selected per PR, and of those with no comment. */
  meanSelected: number;
  meanUnmatched: number;
  labels: number;
  labelHits: number;
  refs: RefStats[];
  focus?: FocusStats;
}

const ratio = (a: number, b: number): number => (b === 0 ? 1 : a / b);
const mean = (values: number[]): number =>
  values.length === 0 ? 0 : values.reduce((s, v) => s + v, 0) / values.length;

export function replayCase(root: string, c: ReplayCase): CaseResult {
  const selected = selectedKeys(root, c.diff);
  const expected = Object.keys(c.expected).toSorted(compareText);
  const want = new Set(expected);
  return {
    pr: c.pr,
    title: c.title,
    selected: [...selected].toSorted(compareText),
    expected,
    hits: expected.filter((r) => selected.has(r)),
    misses: expected.filter((r) => !selected.has(r)),
    unmatched: [...selected].filter((r) => !want.has(r)).toSorted(compareText),
    labelHits: c.labels.filter((l) => selected.has(l.reference)),
    labelMisses: c.labels.filter((l) => !selected.has(l.reference)),
    tests: touchesTests(c.diff),
    comments: c.expected,
  };
}

function refStats(cases: CaseResult[]): RefStats[] {
  const refs = new Set(cases.flatMap((c) => [...c.selected, ...c.expected]));
  return [...refs]
    .map((reference) => {
      const count = (pick: (c: CaseResult) => RefKey[]): number =>
        cases.filter((c) => pick(c).includes(reference)).length;
      return {
        reference,
        selected: count((c) => c.selected),
        expected: count((c) => c.expected),
        hits: count((c) => c.hits),
        misses: count((c) => c.misses),
        unmatched: count((c) => c.unmatched),
      };
    })
    .toSorted((a, b) => b.selected - a.selected || b.expected - a.expected || compareText(a.reference, b.reference));
}

function focusStats(cases: CaseResult[], refs: RefStats[], reference: RefKey): FocusStats {
  const tests = cases.filter((c) => c.tests);
  const stats = refs.find((r) => r.reference === reference);
  return {
    reference,
    testPrs: tests.length,
    selectedOnTests: tests.filter((c) => c.selected.includes(reference)).length,
    selected: stats?.selected ?? 0,
    expected: stats?.expected ?? 0,
    hits: stats?.hits ?? 0,
  };
}

export function summarize(cases: CaseResult[], focus?: RefKey): ReplayResult {
  const scored = cases.filter((c) => c.expected.length > 0);
  const expected = scored.reduce((n, c) => n + c.expected.length, 0);
  const hits = scored.reduce((n, c) => n + c.hits.length, 0);
  const labelHits = cases.reduce((n, c) => n + c.labelHits.length, 0);
  const refs = refStats(cases);
  return {
    cases,
    withExpected: scored.length,
    expected,
    hits,
    recall: ratio(hits, expected),
    meanRecall: mean(scored.map((c) => ratio(c.hits.length, c.expected.length))),
    meanSelected: mean(cases.map((c) => c.selected.length)),
    meanUnmatched: mean(cases.map((c) => c.unmatched.length)),
    labels: labelHits + cases.reduce((n, c) => n + c.labelMisses.length, 0),
    labelHits,
    refs,
    ...(focus === undefined ? {} : { focus: focusStats(cases, refs, focus) }),
  };
}
