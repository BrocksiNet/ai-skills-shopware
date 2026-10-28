// The run behind tools/bin/collect-reviews.ts (plan WP12 step 3): for each
// review source, read the PRs merged since the store's cursor, map their
// review comments to skills and rules, and merge them into the store.
import { loadCatalog } from './catalog.ts';
import type { GitHubGraphql } from './github.ts';
import { mapIndex, mapSignals } from './map-signal.ts';
import { cursor, expire, mergeStore, readStore, writeReviewers } from './review-store.ts';
import { collectReviews } from './reviews.ts';
import { inSeries } from './series.ts';
import { loadReviewSources, loadSources, type ReviewSource } from './sources.ts';

export interface CollectOptions {
  root: string;
  gql: GitHubGraphql;
  /** The store: monthly JSON Lines files and reviewers.json. */
  dir: string;
  /** Only these review sources; default all. */
  sources?: string[];
  /** Leave private sources out: what CI runs for the public release. */
  publicOnly?: boolean;
  /** Whole days, inclusive. Default: from the store's cursor, or two days
   *  back for an empty store, up to now. */
  since?: string;
  until?: string;
  /** Monthly files kept; older ones are deleted. */
  keepMonths?: number;
  /** Now, as ISO 8601; tests fix it. */
  now: string;
  /** True in GitHub Actions: a private source is refused there. */
  ci?: boolean;
}

export interface SourceRun {
  source: string;
  from: string;
  to: string;
  prs: number;
  queries: number;
  signals: number;
  added: number;
  mapped: number;
}

export interface CollectResult {
  runs: SourceRun[];
  expired: string[];
  reviewers: number;
}

const DAY = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/u;
const FIRST_RUN_MS = 2 * 24 * 60 * 60 * 1000;

function pick(root: string, o: CollectOptions): ReviewSource[] {
  const all = loadReviewSources(root);
  const unknown = (o.sources ?? []).filter((id) => !all.some((s) => s.id === id));
  if (unknown.length > 0) throw new Error(`unknown review source ${unknown.join(', ')}`);
  const chosen = all
    .filter((s) => o.sources === undefined || o.sources.length === 0 || o.sources.includes(s.id))
    .filter((s) => o.publicOnly !== true || !s.private);
  const secret = chosen.filter((s) => s.private);
  if (o.ci === true && secret.length > 0) {
    throw new Error(`private review sources stay off CI: ${secret.map((s) => s.id).join(', ')}; pass --public`);
  }
  return chosen;
}

function windowFor(o: CollectOptions, start: string | undefined): { from: string; to: string } {
  if (o.since !== undefined && !DAY.test(o.since)) throw new Error('--since takes YYYY-MM-DD');
  if (o.until !== undefined && !DAY.test(o.until)) throw new Error('--until takes YYYY-MM-DD');
  const fallback = new Date(Date.parse(o.now) - FIRST_RUN_MS).toISOString().replace(/\.[0-9]{3}Z$/u, 'Z');
  const from = o.since === undefined ? (start ?? fallback) : `${o.since}T00:00:00Z`;
  const to = o.until === undefined ? o.now : `${o.until}T23:59:59Z`;
  return { from, to };
}

export async function collect(o: CollectOptions): Promise<CollectResult> {
  const sources = pick(o.root, o);
  const index = mapIndex(o.root, loadCatalog(o.root), loadSources(o.root));
  const runs = await inSeries(sources, async (source): Promise<SourceRun> => {
    const window = windowFor(o, cursor(readStore(o.dir, source.id), source.id));
    const got = await collectReviews(o.gql, source, window);
    const signals = mapSignals(got.signals, index);
    const { added } = mergeStore(o.dir, signals);
    return {
      source: source.id,
      ...window,
      prs: got.prs,
      queries: got.queries,
      signals: signals.length,
      added,
      mapped: signals.filter((s) => s.map.length > 0).length,
    };
  });
  const expired = expire(o.dir, o.now, o.keepMonths);
  return { runs, expired, reviewers: writeReviewers(o.dir, o.now).length };
}

/** One line per source for the log and the job summary. */
export function summary(r: CollectResult): string {
  const lines = r.runs.map(
    (s) =>
      `${s.source}: ${s.from}..${s.to}, ${s.prs} merged PR(s), ${s.queries} quer(ies), ` +
      `${s.signals} signal(s), ${s.added} new, ${s.mapped} mapped`,
  );
  if (r.expired.length > 0) lines.push(`expired: ${r.expired.join(', ')}`);
  lines.push(`reviewers.json: ${r.reviewers} reviewer(s)`);
  return `${lines.join('\n')}\n`;
}
