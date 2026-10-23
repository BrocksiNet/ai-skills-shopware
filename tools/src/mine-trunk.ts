// Drift mining (plan WP8, WP12 step 1): the commits of a window that touch
// a source's watched paths, with their deltas. Sources: rules/sources.json.
import { allPages, type GitHubApi } from './github.ts';
import type { Source } from './sources.ts';
import { commitDeltas, type CommitDeltas, type TrunkCommit, type TrunkFile } from './trunk-deltas.ts';
import { compareText } from './text.ts';
import { inSeries } from './series.ts';

export const STATE_PATH = 'docs/.mining-state.json';
/** The source the state file described before it had one entry per source. */
export const TRUNK_SOURCE = 'shopware';

/** The commit the last mining pass of a source read up to, and its date. A
 *  date without a time means "everything up to the end of that day". */
export interface MiningState {
  last_sha: string;
  last_date: string;
}

/** Source ID -> its state. */
export type MiningStates = Record<string, MiningState>;

export interface Window {
  /** ISO 8601, inclusive. */
  from: string;
  /** ISO 8601, inclusive. */
  to: string;
  /** A commit at `from` that was already mined. */
  skip?: string;
}

export interface CommitRef {
  sha: string;
  date: string;
}

export interface MinedCommit {
  commit: TrunkCommit;
  deltas: CommitDeltas;
}

export interface Mined {
  source: Source;
  window: Window;
  /** Branch head at the end of the window: the next state. */
  head: CommitRef;
  commits: MinedCommit[];
  /** True when the source had no state: the pass only records where the
   *  next one starts. */
  first?: boolean;
}

type Json = Record<string, unknown>;
const isRecord = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown, field: string): string => {
  if (typeof v !== 'string') throw new Error(`GitHub API: ${field} is not a string`);
  return v;
};
const DAY = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/u;

export function parseState(value: unknown): MiningState {
  if (!isRecord(value) || typeof value.last_sha !== 'string' || typeof value.last_date !== 'string') {
    throw new Error(`${STATE_PATH} needs last_sha and last_date strings`);
  }
  return { last_sha: value.last_sha, last_date: value.last_date };
}

/** The state file: one entry per source. The single-source shape it had
 *  before WP12 reads as the `shopware` entry. */
export function parseStates(value: unknown): MiningStates {
  if (isRecord(value) && 'last_sha' in value) return { [TRUNK_SOURCE]: parseState(value) };
  if (!isRecord(value)) throw new Error(`${STATE_PATH} must be an object`);
  return Object.fromEntries(Object.entries(value).map(([id, state]) => [id, parseState(state)]));
}

/** The window after a mining state, up to `to`. */
export function windowAfter(state: MiningState, to: string): Window {
  if (DAY.test(state.last_date)) {
    const next = new Date(`${state.last_date}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    return { from: next.toISOString().replace('.000Z', 'Z'), to };
  }
  return { from: state.last_date, to, skip: state.last_sha };
}

/** Whole days, both inclusive. */
export function windowOfDays(since: string, until: string): Window {
  if (!DAY.test(since) || !DAY.test(until)) throw new Error('--since and --until take YYYY-MM-DD');
  return { from: `${since}T00:00:00Z`, to: `${until}T23:59:59Z` };
}

function commitRef(item: unknown): CommitRef {
  if (!isRecord(item) || !isRecord(item.commit) || !isRecord(item.commit.committer)) {
    throw new Error('GitHub API: unexpected commit shape');
  }
  return { sha: text(item.sha, 'sha'), date: text(item.commit.committer.date, 'commit date') };
}

function trunkFile(item: unknown): TrunkFile {
  if (!isRecord(item)) throw new Error('GitHub API: unexpected file shape');
  const file: TrunkFile = {
    filename: text(item.filename, 'filename'),
    status: text(item.status, 'status'),
    additions: typeof item.additions === 'number' ? item.additions : 0,
    deletions: typeof item.deletions === 'number' ? item.deletions : 0,
  };
  if (typeof item.patch === 'string') file.patch = item.patch;
  return file;
}

async function commitDetail(api: GitHubApi, source: Source, sha: string): Promise<TrunkCommit> {
  const body = await api(`repos/${source.repo}/commits/${sha}`);
  const ref = commitRef(body);
  if (!isRecord(body) || !isRecord(body.commit) || !Array.isArray(body.files)) {
    throw new Error(`GitHub API: commit ${sha} has no files`);
  }
  const files: unknown[] = body.files;
  const title = text(body.commit.message, 'commit message').split('\n')[0] ?? '';
  return { ...ref, title, files: files.map((f) => trunkFile(f)) };
}

const query = (source: Source, w: Window, path: string): string =>
  `repos/${source.repo}/commits?sha=${source.branch}&path=${encodeURIComponent(path)}` +
  `&since=${encodeURIComponent(w.from)}&until=${encodeURIComponent(w.to)}`;

/** The newest commit on the source's branch up to the end of the window. */
export async function branchHead(api: GitHubApi, source: Source, to: string): Promise<CommitRef> {
  const body = await api(
    `repos/${source.repo}/commits?sha=${source.branch}&until=${encodeURIComponent(to)}&per_page=1`,
  );
  if (!Array.isArray(body) || body.length === 0) throw new Error(`GitHub API: no ${source.id} commit in the window`);
  const items: unknown[] = body;
  return commitRef(items[0]);
}

/** The commits of the window that touch a watched path, oldest first. */
export async function windowCommits(api: GitHubApi, source: Source, w: Window): Promise<CommitRef[]> {
  const lists = await inSeries(source.paths, (path) => allPages(api, query(source, w, path)));
  const refs = new Map(lists.flat().map((item) => [commitRef(item).sha, commitRef(item)]));
  return [...refs.values()]
    .filter((r) => r.sha !== w.skip)
    .toSorted((a, b) => compareText(a.date, b.date) || compareText(a.sha, b.sha));
}

/** One source over a window. */
export async function mineSource(api: GitHubApi, source: Source, w: Window): Promise<Mined> {
  const head = await branchHead(api, source, w.to);
  const refs = await windowCommits(api, source, w);
  const commits = await inSeries(refs, async (r) => {
    const commit = await commitDetail(api, source, r.sha);
    return { commit, deltas: commitDeltas(commit, source.extractor) };
  });
  return { source, window: w, head, commits };
}

/** A source without a state starts at its branch head: nothing to read yet. */
export async function firstPass(api: GitHubApi, source: Source, to: string): Promise<Mined> {
  const head = await branchHead(api, source, to);
  return { source, window: { from: head.date, to, skip: head.sha }, head, commits: [], first: true };
}
