// Where collected review signals live (plan WP12 step 3): one JSON Lines file
// per review source and month of merge, `<source>-YYYY-MM.jsonl`, plus
// `reviewers.json`. The daily workflow keeps the public ones as assets of
// the `review-signals` release; private sources stay in the local cache.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseSignals, type Signal, toJsonLines } from './signals.ts';
import { compareText } from './text.ts';

export const RELEASE = 'review-signals';
/** The local cache, relative to the repository root. Git-ignored. */
export const CACHE_DIR = '.cache/review-signals';
export const REVIEWERS_FILE = 'reviewers.json';
export const KEEP_MONTHS = 12;
const FILE = /^([a-z0-9-]+)-([0-9]{4}-[0-9]{2})\.jsonl$/u;

/** A PR files under the month it was merged in. */
const merged = (s: Signal): string => s.pr?.merged_at ?? s.date;
export const monthFile = (s: Signal): string => `${s.source}-${merged(s).slice(0, 7)}.jsonl`;

const storeFiles = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => FILE.test(f))
        .toSorted(compareText)
    : [];

/** Every stored signal, or those of one source. */
export function readStore(dir: string, source?: string): Signal[] {
  return storeFiles(dir)
    .filter((f) => source === undefined || FILE.exec(f)?.[1] === source)
    .flatMap((f) => parseSignals(readFileSync(join(dir, f), 'utf8')));
}

/** The newest merge time of a source's stored signals: where the next run
 *  starts. Re-reading that PR is harmless, IDs dedupe. */
export function cursor(signals: Signal[], source: string): string | undefined {
  return signals
    .filter((s) => s.source === source)
    .map((s) => merged(s))
    .toSorted(compareText)
    .at(-1);
}

const order = (a: Signal, b: Signal): number =>
  compareText(merged(a), merged(b)) || compareText(a.date, b.date) || compareText(a.id, b.id);

/** Adds signals to their monthly files. A signal already stored is replaced,
 *  so a re-run refreshes the mapping. Returns how many IDs were new. */
export function mergeStore(dir: string, signals: Signal[]): { added: number; files: string[] } {
  mkdirSync(dir, { recursive: true });
  const byFile = new Map<string, Signal[]>();
  for (const s of signals) byFile.set(monthFile(s), [...(byFile.get(monthFile(s)) ?? []), s]);
  let added = 0;
  for (const [file, incoming] of byFile) {
    const path = join(dir, file);
    const stored = existsSync(path) ? parseSignals(readFileSync(path, 'utf8')) : [];
    const byId = new Map(stored.map((s) => [s.id, s]));
    for (const s of incoming) {
      if (!byId.has(s.id)) added += 1;
      byId.set(s.id, s);
    }
    writeFileSync(path, toJsonLines([...byId.values()].toSorted(order)));
  }
  return { added, files: [...byFile.keys()].toSorted(compareText) };
}

/** Deletes monthly files older than `keep` months before `now`'s month.
 *  Returns the deleted names. */
export function expire(dir: string, now: string, keep = KEEP_MONTHS): string[] {
  const d = new Date(now);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - keep + 1);
  const oldest = d.toISOString().slice(0, 7);
  const old = storeFiles(dir).filter((f) => compareText(FILE.exec(f)?.[2] ?? '', oldest) < 0);
  for (const f of old) rmSync(join(dir, f));
  return old;
}

export interface Reviewer {
  login: string;
  /** Every author association seen, e.g. MEMBER, CONTRIBUTOR. */
  associations: string[];
  /** Review threads they started. */
  comments: number;
  /** Of those, threads whose code changed afterwards. */
  outdated: number;
  /** Review bodies, and of those, reviews that requested changes. */
  reviews: number;
  changes_requested: number;
  prs: number;
  sources: string[];
  first: string;
  last: string;
  /** 0 to 1; see `trust`. */
  trust: number;
}

/** Comments it takes before a reviewer's own record outweighs the prior. */
const PRIOR_WEIGHT = 4;
const ORG = new Set(['MEMBER', 'OWNER']);

/** How much a reviewer's comments tend to change code: the share of their
 *  threads that went outdated, pulled toward 0.5 for org members and 0.25
 *  for everyone else while they have few comments. Trust is earned by a
 *  record, so a new employee and a long-time contributor both start low
 *  and rise with comments the code follows. */
export function trust(r: Pick<Reviewer, 'associations' | 'comments' | 'outdated'>): number {
  const prior = r.associations.some((a) => ORG.has(a)) ? 0.5 : 0.25;
  return Math.round(((r.outdated + PRIOR_WEIGHT * prior) / (r.comments + PRIOR_WEIGHT)) * 100) / 100;
}

const uniq = (values: string[]): string[] => [...new Set(values)].toSorted(compareText);

/** One record per reviewer over the given signals, most trusted first. */
export function reviewers(signals: Signal[]): Reviewer[] {
  const byLogin = new Map<string, Signal[]>();
  for (const s of signals) {
    if (s.author === undefined) continue;
    byLogin.set(s.author.login, [...(byLogin.get(s.author.login) ?? []), s]);
  }
  const records = [...byLogin].map(([login, own]): Reviewer => {
    const comments = own.filter((s) => s.kind === 'review-comment');
    const bodies = own.filter((s) => s.kind === 'review-body');
    const dates = own.map((s) => s.date).toSorted(compareText);
    const r: Reviewer = {
      login,
      associations: uniq(own.map((s) => s.author?.association ?? '')),
      comments: comments.length,
      outdated: comments.filter((s) => s.thread?.outdated === true).length,
      reviews: bodies.length,
      changes_requested: bodies.filter((s) => s.review?.state === 'CHANGES_REQUESTED').length,
      prs: new Set(own.map((s) => `${s.repo}#${s.pr?.number ?? 0}`)).size,
      sources: uniq(own.map((s) => s.source)),
      first: dates[0] ?? '',
      last: dates.at(-1) ?? '',
      trust: 0,
    };
    r.trust = trust(r);
    return r;
  });
  return records.toSorted((a, b) => b.trust - a.trust || b.comments - a.comments || compareText(a.login, b.login));
}

/** Rewrites `reviewers.json` from every signal in the store. */
export function writeReviewers(dir: string, now: string): Reviewer[] {
  const list = reviewers(readStore(dir));
  const body = { generated: now, prior_weight: PRIOR_WEIGHT, reviewers: list };
  writeFileSync(join(dir, REVIEWERS_FILE), `${JSON.stringify(body, null, 2)}\n`);
  return list;
}
