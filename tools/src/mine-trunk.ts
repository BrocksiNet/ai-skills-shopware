// Trunk mining (plan WP8): the shopware/shopware trunk commits of a window
// that touch the watched paths, with their deltas.
import { allPages, type GitHubApi } from './github.ts';
import { commitDeltas, type CommitDeltas, type TrunkCommit, type TrunkFile } from './trunk-deltas.ts';
import { compareText } from './text.ts';
import { inSeries } from './series.ts';

export const STATE_PATH = 'docs/.mining-state.json';
export const TRUNK = 'shopware/shopware';
const BRANCH = 'trunk';
export const WATCHED = [
  '.agents',
  'coding-guidelines',
  'src/Core/DevOps/StaticAnalyze',
  '.github/PULL_REQUEST_TEMPLATE.md',
];

/** The trunk commit the last mining pass read up to, and its date. A
 *  date without a time means "everything up to the end of that day". */
export interface MiningState {
  last_sha: string;
  last_date: string;
}

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
  window: Window;
  /** Trunk head at the end of the window: the next state. */
  head: CommitRef;
  commits: MinedCommit[];
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

async function commitDetail(api: GitHubApi, sha: string): Promise<TrunkCommit> {
  const body = await api(`repos/${TRUNK}/commits/${sha}`);
  const ref = commitRef(body);
  if (!isRecord(body) || !isRecord(body.commit) || !Array.isArray(body.files)) {
    throw new Error(`GitHub API: commit ${sha} has no files`);
  }
  const files: unknown[] = body.files;
  const title = text(body.commit.message, 'commit message').split('\n')[0] ?? '';
  return { ...ref, title, files: files.map((f) => trunkFile(f)) };
}

const query = (w: Window, path?: string): string =>
  `repos/${TRUNK}/commits?sha=${BRANCH}${path === undefined ? '' : `&path=${encodeURIComponent(path)}`}` +
  `&since=${encodeURIComponent(w.from)}&until=${encodeURIComponent(w.to)}`;

/** The newest trunk commit up to the end of the window. */
export async function trunkHead(api: GitHubApi, w: Window): Promise<CommitRef> {
  const body = await api(`repos/${TRUNK}/commits?sha=${BRANCH}&until=${encodeURIComponent(w.to)}&per_page=1`);
  if (!Array.isArray(body) || body.length === 0) throw new Error('GitHub API: no trunk commit in the window');
  const items: unknown[] = body;
  return commitRef(items[0]);
}

/** The commits of the window that touch a watched path, oldest first. */
export async function windowCommits(api: GitHubApi, w: Window): Promise<CommitRef[]> {
  const lists = await inSeries(WATCHED, (path) => allPages(api, query(w, path)));
  const refs = new Map(lists.flat().map((item) => [commitRef(item).sha, commitRef(item)]));
  return [...refs.values()]
    .filter((r) => r.sha !== w.skip)
    .toSorted((a, b) => compareText(a.date, b.date) || compareText(a.sha, b.sha));
}

export async function mineTrunk(api: GitHubApi, w: Window): Promise<Mined> {
  const head = await trunkHead(api, w);
  const refs = await windowCommits(api, w);
  const commits = await inSeries(refs, async (r) => {
    const commit = await commitDetail(api, r.sha);
    return { commit, deltas: commitDeltas(commit) };
  });
  return { window: w, head, commits };
}
