// cross-check: api-diff against core's sw-impact CI check (plan WP D). Reads
// the annotations sw-impact left on core PRs (label `sw-impact`), runs
// api-diff on the same commits and lists what both found, what only
// sw-impact found (our miss: a bug or a surface we lack) and what only we
// found (their miss or our false alarm, check by hand).
//
//   node tools/api-index/bin/cross-check.ts --repo ~/shopware
//
//     --repo <dir>   a shopware/shopware clone; the commits are fetched into it
//     --out <dir>    report.md, results.json and the fetched cases.json
//                    (default: tools/api-index/.cross-check, git-ignored)
//     --refresh      fetch the runs again instead of reading cases.json
//     --limit <n>    the newest n commits (default 25)
//     --cache        as for api-diff
//
// Run by hand or monthly; never part of the index build. Needs `gh`.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { errorMessage } from '../../src/errors.ts';
import { diffSnapshots, SURFACES } from '../src/api-diff.ts';
import { type CrossCase, crossCheck, crossCheckReport, symbolOf, type TheirFinding } from '../src/cross-check.ts';
import { openSource } from '../src/snapshot-source.ts';
import { readJson, writeJson } from '../src/store.ts';

const OUT = fileURLToPath(new URL('../.cross-check', import.meta.url));
const CORE = 'repos/shopware/shopware';
const WORKFLOW = `${CORE}/actions/workflows/sw-impact.yml/runs`;
const JOB = 'sw-impact check';

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const list = (value: unknown): Json[] => (Array.isArray(value) ? value.filter((entry) => isObject(entry)) : []);
const text = (value: unknown): string => (typeof value === 'string' ? value : '');

function gh(path: string): unknown {
  const out = execFileSync('gh', ['api', path], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const parsed: unknown = JSON.parse(out);
  return parsed;
}

function git(repo: string, args: string[]): string {
  return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

/** The workflow's PR runs that got as far as a result, newest first. */
function prRuns(): Json[] {
  const runs: Json[] = [];
  for (const status of ['success', 'failure'])
    for (let page = 1; page <= 10; page++) {
      const response = gh(`${WORKFLOW}?per_page=100&page=${page}&status=${status}&event=pull_request`);
      const batch = isObject(response) ? list(response.workflow_runs) : [];
      runs.push(...batch);
      if (batch.length < 100) break;
    }
  return runs.toSorted((a, b) => text(b.created_at).localeCompare(text(a.created_at)));
}

function annotations(jobId: number): TheirFinding[] {
  const findings: TheirFinding[] = [];
  for (const entry of list(gh(`${CORE}/check-runs/${jobId}/annotations?per_page=100`))) {
    const symbol = symbolOf(text(entry.message));
    if (symbol === undefined) continue;
    const line = typeof entry.start_line === 'number' ? entry.start_line : 0;
    findings.push({ rule: text(entry.title), symbol, path: text(entry.path), line });
  }
  return findings;
}

function jobsOf(runId: number): unknown {
  const response = gh(`${CORE}/actions/runs/${runId}/jobs`);
  return isObject(response) ? response.jobs : [];
}

/** One case per head commit: the newest run whose job finished. */
function fetchCases(limit: number): CrossCase[] {
  const cases: CrossCase[] = [];
  const seen = new Set<string>();
  for (const run of prRuns()) {
    const head = text(run.head_sha);
    if (head === '' || seen.has(head) || typeof run.id !== 'number') continue;
    const job = list(jobsOf(run.id)).find(
      (entry) => entry.name === JOB && (entry.conclusion === 'success' || entry.conclusion === 'failure'),
    );
    if (job === undefined || typeof job.id !== 'number') continue;
    seen.add(head);
    // A run's pull_requests is empty for fork PRs; the commit still knows its PR.
    const [pr] = [...list(run.pull_requests), ...list(gh(`${CORE}/commits/${head}/pulls`))];
    const base = isObject(pr?.base) ? text(pr.base.sha) : '';
    const number = typeof pr?.number === 'number' ? pr.number : undefined;
    const label = number === undefined ? text(run.html_url) : `https://github.com/shopware/shopware/pull/${number}`;
    cases.push({ label, base: base === '' ? 'trunk' : base, head, theirs: annotations(job.id) });
    if (cases.length >= limit) break;
  }
  return cases;
}

function isCrossCase(value: unknown): value is CrossCase {
  return (
    isObject(value) &&
    typeof value.label === 'string' &&
    typeof value.base === 'string' &&
    typeof value.head === 'string' &&
    Array.isArray(value.theirs)
  );
}

/** The base as the PR saw it: the merge base of the head with the PR's
 *  base commit, or with trunk when no PR is found. Undefined when the head
 *  is already in that base (nothing to compare). */
function resolveBase(repo: string, c: CrossCase): string | undefined {
  let base = c.base;
  if (base === 'trunk') {
    git(repo, ['fetch', '-q', 'origin', 'trunk']);
    base = git(repo, ['rev-parse', 'FETCH_HEAD']);
  }
  git(repo, ['fetch', '-q', 'origin', c.head, base]);
  const mergeBase = git(repo, ['merge-base', base, c.head]);
  return mergeBase === c.head ? undefined : mergeBase;
}

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      repo: { type: 'string' },
      out: { type: 'string', default: OUT },
      refresh: { type: 'boolean', default: false },
      limit: { type: 'string', default: '25' },
      cache: { type: 'string' },
    },
  });
  const { repo } = values;
  const limit = Number(values.limit);
  if (repo === undefined || !Number.isInteger(limit) || limit < 1) {
    process.stderr.write('usage: cross-check --repo <shopware clone> [--out <dir>] [--refresh] [--limit <n>]\n');
    return 2;
  }
  mkdirSync(values.out, { recursive: true });
  const casesFile = join(values.out, 'cases.json');
  let cases: CrossCase[];
  if (!values.refresh && existsSync(casesFile)) {
    const stored = readJson(casesFile);
    cases = Array.isArray(stored) ? stored.filter((entry) => isCrossCase(entry)) : [];
  } else {
    cases = fetchCases(limit);
    writeJson(casesFile, cases);
  }
  const source = await openSource({ repo, cache: values.cache, fetch: false }, process.env);
  const surfaces = SURFACES.filter((surface) => surface !== 'php');
  const results = [];
  for (const c of cases.slice(0, limit)) {
    const base = resolveBase(repo, c);
    if (base === undefined) {
      process.stderr.write(`${c.label} ${c.head.slice(0, 10)}: already in its base, skipped\n`);
      continue;
    }
    const before = source(base);
    const after = source(c.head);
    if (before === undefined || after === undefined) throw new Error(`cannot build ${base} or ${c.head}`);
    process.stderr.write(`${c.label} ${c.head.slice(0, 10)}\n`);
    results.push(crossCheck({ ...c, base }, diffSnapshots(before, after, surfaces).changes));
  }
  writeJson(join(values.out, 'results.json'), results);
  writeFileSync(join(values.out, 'report.md'), crossCheckReport(results));
  process.stdout.write(`${join(values.out, 'report.md')}\n`);
  return 0;
}

try {
  process.exitCode = await main();
} catch (error) {
  process.stderr.write(`cross-check: ${errorMessage(error)}\n`);
  process.exitCode = 1;
}
