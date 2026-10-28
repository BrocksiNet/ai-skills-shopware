// Drift mining (plan WP8, WP12 step 1): the commits of a window that touch
// a source's watched paths, with their deltas. Sources: rules/sources.json.
import { errorMessage } from './errors.ts';
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

/** Whether state `a` reaches past state `b`; a date-only state covers its
 *  whole day. */
export function readsFurther(a: MiningState, b: MiningState): boolean {
  const time = (s: MiningState): string => (s.last_date.includes('T') ? s.last_date : `${s.last_date}T23:59:59Z`);
  return compareText(time(a), time(b)) > 0;
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
  /** More than one parent. Its diff against the first parent repeats the
   *  commits it merges, which are listed on their own. */
  merge?: boolean;
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
  /** Why the pass fell back from the commit range to dates. */
  note?: string;
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
  const ref = { sha: text(item.sha, 'sha'), date: text(item.commit.committer.date, 'commit date') };
  return Array.isArray(item.parents) && item.parents.length > 1 ? { ...ref, merge: true } : ref;
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

/** The API lists 300 files of a commit per page, up to 3000. */
const FILE_PAGE = 300;

async function commitPage(api: GitHubApi, source: Source, sha: string, page: number): Promise<Json> {
  const body = await api(`repos/${source.repo}/commits/${sha}${page === 1 ? '' : `?page=${page}`}`);
  if (!isRecord(body) || !isRecord(body.commit) || !Array.isArray(body.files)) {
    throw new Error(`GitHub API: commit ${sha} has no files`);
  }
  return body;
}

async function commitFiles(
  api: GitHubApi,
  source: Source,
  sha: string,
  first: unknown[],
  page = 1,
): Promise<unknown[]> {
  if (first.length < FILE_PAGE || page * FILE_PAGE >= 3000) return first;
  const next = await commitPage(api, source, sha, page + 1);
  const files: unknown[] = Array.isArray(next.files) ? next.files : [];
  return [...first, ...(await commitFiles(api, source, sha, files, page + 1))];
}

async function commitDetail(api: GitHubApi, source: Source, sha: string): Promise<TrunkCommit> {
  const body = await commitPage(api, source, sha, 1);
  const ref = commitRef(body);
  const commit = isRecord(body.commit) ? body.commit : {};
  const first: unknown[] = Array.isArray(body.files) ? body.files : [];
  const files = await commitFiles(api, source, sha, first);
  const title = text(commit.message, 'commit message').split('\n')[0] ?? '';
  return { sha: ref.sha, date: ref.date, title, files: files.map((f) => trunkFile(f)) };
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

/** The commits of the window that touch a watched path, oldest first.
 *  Merge commits are left out: the commits they merge are listed too, and a
 *  merge of the branch into a pull request would repeat older changes. */
export async function windowCommits(api: GitHubApi, source: Source, w: Window): Promise<CommitRef[]> {
  const lists = await inSeries(source.paths, (path) => allPages(api, query(source, w, path)));
  const refs = new Map(lists.flat().map((item) => [commitRef(item).sha, commitRef(item)]));
  return [...refs.values()]
    .filter((r) => r.sha !== w.skip && r.merge !== true)
    .toSorted((a, b) => compareText(a.date, b.date) || compareText(a.sha, b.sha));
}

const COMPARE_PAGE = 100;

/** The commits on `head` that `base` does not have, from the compare API,
 *  page by page. */
export async function rangeCommits(
  api: GitHubApi,
  source: Source,
  base: string,
  head: string,
  page = 1,
): Promise<CommitRef[]> {
  const body = await api(`repos/${source.repo}/compare/${base}...${head}?per_page=${COMPARE_PAGE}&page=${page}`);
  if (!isRecord(body) || !Array.isArray(body.commits) || typeof body.total_commits !== 'number') {
    throw new Error(`GitHub API: unexpected compare shape for ${source.id}`);
  }
  const items: unknown[] = body.commits;
  const refs = items.map((item) => commitRef(item));
  if (items.length < COMPARE_PAGE || page * COMPARE_PAGE >= body.total_commits) return refs;
  return [...refs, ...(await rangeCommits(api, source, base, head, page + 1))];
}

/** The commits after the state's commit up to `head` that touch a watched
 *  path. The commit range decides what is new, not the commit date: a pull
 *  request merged with a merge commit brings commits dated before the last
 *  pass, which a date window would skip for good. */
async function newCommits(
  api: GitHubApi,
  source: Source,
  w: Window,
  base: string,
  head: CommitRef,
): Promise<CommitRef[]> {
  if (base === head.sha) return [];
  const range = await rangeCommits(api, source, base, head.sha);
  const fresh = new Set(range.map((r) => r.sha));
  const oldest = range.map((r) => r.date).toSorted(compareText)[0];
  if (oldest === undefined) return [];
  const from = compareText(oldest, w.from) < 0 ? oldest : w.from;
  const listed = await windowCommits(api, source, { from, to: w.to });
  return listed.filter((r) => fresh.has(r.sha));
}

function minedCommits(api: GitHubApi, source: Source, refs: CommitRef[]): Promise<MinedCommit[]> {
  return inSeries(refs, async (r) => {
    const commit = await commitDetail(api, source, r.sha);
    return { commit, deltas: commitDeltas(commit, source.extractor, source.paths) };
  });
}

/** One source over a window. A window after a state (`skip` set) reads the
 *  commit range from the state's commit to the head; when the compare API
 *  cannot (the commit is gone after a force push), it falls back to dates
 *  and says so. */
export async function mineSource(api: GitHubApi, source: Source, w: Window): Promise<Mined> {
  const head = await branchHead(api, source, w.to);
  if (w.skip === undefined) {
    return { source, window: w, head, commits: await minedCommits(api, source, await windowCommits(api, source, w)) };
  }
  const base = w.skip;
  const fresh = await newCommits(api, source, w, base, head).then(
    (refs) => ({ refs }),
    (error: unknown) => ({ error: errorMessage(error) }),
  );
  if ('refs' in fresh) return { source, window: w, head, commits: await minedCommits(api, source, fresh.refs) };
  const note = `could not compare ${base.slice(0, 8)} with ${head.sha.slice(0, 8)} (${fresh.error}); read by commit date instead`;
  const commits = await minedCommits(api, source, await windowCommits(api, source, w));
  return { source, window: w, head, commits, note };
}

/** A source without a state starts at its branch head: nothing to read yet. */
export async function firstPass(api: GitHubApi, source: Source, to: string): Promise<Mined> {
  const head = await branchHead(api, source, to);
  return { source, window: { from: head.date, to, skip: head.sha }, head, commits: [], first: true };
}
