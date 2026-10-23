// Live input of the route replay (route-replay.ts): review signals from the
// collector's store, PR diffs from the GitHub API cached on disk, and the
// recording of corpus cases.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { allPages, githubApi, githubToken, type GitHubApi } from './github.ts';
import { CASE_FILE, caseJson, DIFF_FILE, readCase } from './replay-corpus.ts';
import { allAnchors, filesToDiff, isPrFile, trimDiff } from './replay-diff.ts';
import { CACHE_DIR, readStore } from './review-store.ts';
import { byPr, expectedRefs, replayIndex, type ReplayCase } from './route-replay.ts';
import { inSeries } from './series.ts';
import { loadReviewSources } from './sources.ts';

type Json = Record<string, unknown>;
const isRecord = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

export interface LiveOptions {
  /** Skills tree whose routes map the comments. */
  root: string;
  /** The review store and the source in it. */
  signals: string;
  source: { id: string; repo: string };
  /** Diff cache directory. */
  diffs: string;
  api: GitHubApi;
}

/** Where PR diffs are cached, relative to the repository root. Git-ignored. */
export const DIFF_CACHE = '.cache/pr-diffs';

function token(): string {
  const fromEnv = githubToken(process.env);
  if (fromEnv !== '') return fromEnv;
  try {
    return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

/** Live options from the command line. Recording refuses a private review
 *  source: the corpus is committed to a public repository. */
export function liveSetup(
  repoRoot: string,
  a: { record: boolean; root?: string; signals?: string; source?: string; diffs?: string },
): LiveOptions {
  const id = a.source ?? 'core-reviews';
  const source = loadReviewSources(repoRoot).find((s) => s.id === id);
  if (source === undefined) throw new Error(`unknown review source ${id}`);
  if (a.record && source.private) throw new Error(`${id} is private; its data never goes into the repository`);
  return {
    root: resolve(a.root ?? repoRoot),
    signals: resolve(a.signals ?? join(repoRoot, CACHE_DIR)),
    source,
    diffs: resolve(a.diffs ?? join(repoRoot, DIFF_CACHE)),
    api: githubApi({ ...process.env, GH_TOKEN: token() }),
  };
}

/** The files of the PR at `sha`: its base compared with that commit. */
async function filesAt(api: GitHubApi, repo: string, pr: number, sha: string): Promise<unknown[]> {
  const pull = await api(`repos/${repo}/pulls/${pr}`);
  const base = isRecord(pull) && isRecord(pull.base) && typeof pull.base.sha === 'string' ? pull.base.sha : '';
  if (base === '') throw new Error(`#${pr}: no base commit`);
  const compare = await api(`repos/${repo}/compare/${base}...${sha}`);
  const files: unknown[] = isRecord(compare) && Array.isArray(compare.files) ? compare.files : [];
  return files;
}

/** The PR's diff as merged, or at the commit a review comment was written
 *  on, from the cache or the GitHub API. */
export async function prDiff(o: LiveOptions, pr: number, sha = ''): Promise<string> {
  const dir = join(o.diffs, o.source.repo.replace('/', '__'));
  const path = join(dir, sha === '' ? `${pr}.diff` : `${pr}@${sha.slice(0, 12)}.diff`);
  if (existsSync(path)) return readFileSync(path, 'utf8');
  const raw =
    sha === ''
      ? await allPages(o.api, `repos/${o.source.repo}/pulls/${pr}/files`)
      : await filesAt(o.api, o.source.repo, pr, sha);
  const diff = filesToDiff(raw.filter((f) => isPrFile(f)));
  mkdirSync(dir, { recursive: true });
  writeFileSync(path, diff);
  return diff;
}

/** Every PR with a review comment in the store. Expectations are mapped
 *  with `root`'s routes, as the drift issue maps them again. */
export function liveCases(o: LiveOptions): Promise<ReplayCase[]> {
  const index = replayIndex(o.root);
  const prs = [...byPr(readStore(o.signals, o.source.id))].toSorted(([a], [b]) => a - b);
  return inSeries(prs, async ([pr, signals]) => ({
    repo: o.source.repo,
    pr,
    title: signals[0]?.pr?.title ?? '',
    expected: expectedRefs(signals, index),
    labels: [],
    diff: await prDiff(o, pr),
  }));
}

/** `19917` (the merged diff) or `19917@1f0c407f…` (the diff at that commit). */
export function parsePick(value: string): { pr: number; sha: string } {
  const match = /^([0-9]+)(?:@([0-9a-f]{7,40}))?$/u.exec(value);
  if (match === null) throw new Error(`--pr takes N or N@SHA, not ${value}`);
  return { pr: Number(match[1]), sha: match[2] ?? '' };
}

/** Writes corpus cases for the picked PRs, keeping hand labels already
 *  recorded. Returns the case directories. */
export function recordCases(dir: string, cases: ReplayCase[], picks: string[], o: LiveOptions): Promise<string[]> {
  const anchors = allAnchors(o.root);
  return inSeries(picks, async (pick) => {
    const { pr, sha } = parsePick(pick);
    const c = cases.find((x) => x.pr === pr);
    if (c === undefined) throw new Error(`#${pr} has no review comment in the store`);
    const diff = sha === '' ? c.diff : await prDiff(o, pr, sha);
    const caseDir = join(dir, String(pr));
    const labels = existsSync(join(caseDir, CASE_FILE)) ? readCase(caseDir).labels : [];
    mkdirSync(caseDir, { recursive: true });
    writeFileSync(join(caseDir, CASE_FILE), caseJson({ ...c, labels, ...(sha === '' ? {} : { commit: sha }) }));
    writeFileSync(join(caseDir, DIFF_FILE), trimDiff(diff, anchors));
    return caseDir;
  });
}
