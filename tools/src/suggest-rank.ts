// The order to draft the proposals of a `suggest-rules` run in, without a
// model. A proposal scores the evidence behind it, once per PR: the
// heaviest of its signals in that PR (reviewer trust, more when the thread
// went outdated and when the review requested changes). That favours
// several PRs and trusted reviewers over one long thread. The score halves
// when the rule is for core only, since this library is for extension
// developers too, and halves again when a higher proposal says much the
// same, in any skill: a second owner of one topic is the worse duplicate. A proposal that failed a check, or proposes no
// change, gets no rank.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Catalog } from './catalog.ts';
import { skillMetadata } from './router-index.ts';
import type { Signal } from './signals.ts';
import type { Suggestion } from './suggest-ask.ts';
import { weight } from './suggest-cluster.ts';
import { terms } from './suggest-related.ts';
import { compareText } from './text.ts';

/** Factor for a proposal whose rule is not for plugins or apps. */
export const CORE_ONLY_FACTOR = 0.5;
/** Factor for a proposal that overlaps a higher one. */
export const OVERLAP_FACTOR = 0.5;
/** Shared share of words (title and draft) from which two proposals
 *  overlap. Set on the first full run of 129 proposals: it marks the two
 *  route deprecation updates, the test placement proposals, the two
 *  kernel reset updates and three skills' Admin API ACL rules, and
 *  nothing else. */
export const OVERLAP_THRESHOLD = 0.18;

export interface Rank {
  /** 1 for the proposal to draft first; 0 for one without a rank. */
  position: number;
  score: number;
  /** PRs among the evidence, and how many of them requested changes. */
  prs: number;
  changes_requested: number;
  /** The rule is for plugin or app developers. */
  extensions: boolean;
  /** A higher proposal, of any skill, that says much the same. */
  overlaps?: string;
  /** Why there is no rank. */
  unranked?: string;
}

export interface RankContext {
  catalog: Catalog;
  /** Signals of the run by URL. */
  signals: Map<string, Signal>;
  trustOf: (s: Signal) => number;
  /** Skill name to its `metadata.contexts`. */
  contexts: Map<string, string[]>;
}

const EXTENSION_AUDIENCES = new Set(['plugin', 'app']);

/** `metadata.contexts` of every skill a proposal names. */
export function skillContexts(root: string, skills: string[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const skill of new Set(skills)) {
    try {
      out.set(skill, skillMetadata(readFileSync(join(root, 'skills', skill, 'SKILL.md'), 'utf8')).meta.contexts);
    } catch {
      out.set(skill, []);
    }
  }
  return out;
}

/** For plugin or app developers: the rule's audience, else the skill's contexts. */
export function forExtensions(s: Suggestion, x: RankContext): boolean {
  const audience = x.catalog.rules.find((r) => r.id === s.rule)?.audience ?? [];
  const list = audience.length > 0 ? audience : (x.contexts.get(s.skill) ?? []);
  return list.some((a) => EXTENSION_AUDIENCES.has(a));
}

const prOf = (s: Signal): string => (s.pr === undefined ? s.url : `${s.repo}#${String(s.pr.number)}`);

/** Evidence weight once per PR, and the PR counts. */
export function evidenceScore(
  urls: string[],
  x: RankContext,
): { score: number; prs: number; changes_requested: number } {
  const best = new Map<string, { w: number; changes: boolean }>();
  for (const url of urls) {
    const s = x.signals.get(url);
    // A retirement cites its evidence ID, not a review: it counts as one.
    const key = s === undefined ? url : prOf(s);
    const w = s === undefined ? (url.startsWith('retire:') ? 1 : 0) : weight(s, x.trustOf(s));
    const changes = s?.review?.state === 'CHANGES_REQUESTED';
    const seen = best.get(key);
    best.set(key, { w: Math.max(w, seen?.w ?? 0), changes: changes || (seen?.changes ?? false) });
  }
  const values = [...best.values()].filter((v) => v.w > 0);
  return {
    score: values.reduce((sum, v) => sum + v.w, 0),
    prs: values.length,
    changes_requested: values.filter((v) => v.changes).length,
  };
}

const words = (s: Suggestion): Set<string> => new Set(terms(`${s.title} ${s.draft}`));

/** Shared words over all words of the two. */
export function overlap(a: Set<string>, b: Set<string>): number {
  const shared = [...a].filter((w) => b.has(w)).length;
  const all = a.size + b.size - shared;
  return all === 0 ? 0 : shared / all;
}

const round = (n: number): number => Math.round(n * 100) / 100;

/** The suggestions with a `rank`, in their original order. */
export function rankSuggestions(list: Suggestion[], x: RankContext): Suggestion[] {
  const scored = list.map((s) => {
    if (!s.ok)
      return {
        s,
        rank: { position: 0, score: 0, prs: 0, changes_requested: 0, extensions: false, unranked: 'failed a check' },
      };
    const e = evidenceScore(s.evidence, x);
    const extensions = forExtensions(s, x);
    const base: Rank = {
      position: 0,
      score: round(e.score * (extensions ? 1 : CORE_ONLY_FACTOR)),
      prs: e.prs,
      changes_requested: e.changes_requested,
      extensions,
    };
    return { s, rank: s.action === 'none' ? { ...base, score: 0, unranked: 'proposes no change' } : base };
  });
  const byScore = (a: (typeof scored)[number], b: (typeof scored)[number]): number =>
    b.rank.score - a.rank.score || compareText(a.s.id, b.s.id);
  // Overlaps: walk from the top; a proposal close to a higher one is
  // marked and loses half its score.
  const kept: { s: Suggestion; w: Set<string> }[] = [];
  for (const item of scored.filter((i) => i.rank.unranked === undefined).toSorted(byScore)) {
    const w = words(item.s);
    const close = kept
      .map((k) => ({ id: k.s.id, o: overlap(w, k.w) }))
      .filter((k) => k.o >= OVERLAP_THRESHOLD)
      .toSorted((a, b) => b.o - a.o)[0];
    if (close !== undefined) {
      item.rank.overlaps = close.id;
      item.rank.score = round(item.rank.score * OVERLAP_FACTOR);
    }
    kept.push({ s: item.s, w });
  }
  scored
    .filter((i) => i.rank.unranked === undefined)
    .toSorted(byScore)
    .forEach((item, i) => {
      item.rank.position = i + 1;
    });
  const out: Suggestion[] = [];
  for (const { s, rank } of scored) out.push({ ...s, rank });
  return out;
}

/** Ranked suggestions first, by position; the rest in their order. */
export const inRankOrder = (list: Suggestion[]): Suggestion[] =>
  list.toSorted((a, b) => {
    const pa = a.rank?.position ?? 0;
    const pb = b.rank?.position ?? 0;
    if (pa === 0 || pb === 0) return pa === pb ? compareText(a.id, b.id) : pa === 0 ? 1 : -1;
    return pa - pb;
  });
