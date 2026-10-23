// Records the GitHub API responses of one mining pass as a replay fixture
// for tools/test/mine-replay.test.ts. Needs network and GH_TOKEN; the tests
// replay the file offline.
//
//   GH_TOKEN=$(gh auth token) node tools/test/fixtures/mining/record.ts OUT.json \
//     --source php-modernization --since 2026-09-28 --until 2026-10-04
//   GH_TOKEN=$(gh auth token) node tools/test/fixtures/mining/record.ts OUT.json \
//     --source php-modernization --state '{"last_sha":"…","last_date":"…"}' --now 2026-10-05T05:00:00Z
//   GH_TOKEN=$(gh auth token) node tools/test/fixtures/mining/record.ts OUT.json \
//     --source all --since 2026-10-13 --until 2026-10-19    # every source in one file
//
// Responses are trimmed to what the miner reads: sha, first message line,
// committer date and parents of a commit; of its files only those under a
// watched path (and, for a Markdown source, every Markdown file), with the
// patch of Markdown files cut to hunk headers and the changed lines an
// extractor can read (bullets, headings, guide IDs; every PR template line).
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { githubApi, type GitHubApi } from '../../../src/github.ts';
import { report } from '../../../src/mine-run.ts';
import { parseState, STATE_PATH } from '../../../src/mine-trunk.ts';
import { loadSources, type Source } from '../../../src/sources.ts';

const ROOT = resolve(import.meta.dirname, '../../../..');
type Json = Record<string, unknown>;
const isRecord = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

function ref(item: unknown): Json {
  if (!isRecord(item) || !isRecord(item.commit) || !isRecord(item.commit.committer)) return {};
  const message = typeof item.commit.message === 'string' ? (item.commit.message.split('\n')[0] ?? '') : '';
  const parents = Array.isArray(item.parents) ? item.parents.map((p) => (isRecord(p) ? { sha: p.sha } : {})) : [];
  return { sha: item.sha, commit: { message, committer: { date: item.commit.committer.date } }, parents };
}

const watched = (source: Source, name: string): boolean =>
  source.paths.some((p) => name === p || name.startsWith(`${p}/`));
const patchRead = (name: string): boolean => name.endsWith('.md');
const TEMPLATE = '.github/PULL_REQUEST_TEMPLATE.md';
/** What an extractor can read on a changed line: a bullet, a heading or a
 *  guide ID entry. The PR template keeps every changed line. */
const READ_LINE = /^[+-]\s*(?:#|[-*]\s|\d+\.\s)/u;
/** Code fences and frontmatter delimiters, changed or not: they decide
 *  which lines are prose (`proseLines`). */
const STRUCTURE = /^[ +-](?:\s{0,3}(?:```|~~~)|---\s*$)/u;
const changedOnly = (name: string, patch: string): string =>
  patch
    .split('\n')
    .filter(
      (l) => l.startsWith('@@') || READ_LINE.test(l) || STRUCTURE.test(l) || (name === TEMPLATE && /^[+-]/u.test(l)),
    )
    .join('\n');

function file(source: Source, f: unknown): Json[] {
  if (!isRecord(f) || typeof f.filename !== 'string') return [];
  // Markdown outside the watched paths stays, so a test sees it ignored.
  const markdown = source.extractor === 'markdown' && f.filename.endsWith('.md');
  if (!watched(source, f.filename) && !markdown) return [];
  const { filename, status, additions, deletions, patch } = f;
  const kept: Json = { filename, status, additions, deletions };
  if (typeof patch === 'string' && patchRead(filename)) kept.patch = changedOnly(filename, patch);
  return [kept];
}

function trim(source: Source, path: string, body: unknown): unknown {
  if (Array.isArray(body)) return body.map((item) => ref(item));
  if (!isRecord(body)) return body;
  if (path.includes('/compare/')) {
    const commits: unknown[] = Array.isArray(body.commits) ? body.commits : [];
    return { total_commits: body.total_commits, commits: commits.map((c) => ref(c)) };
  }
  const files: unknown[] = Array.isArray(body.files) ? body.files : [];
  return { ...ref(body), files: files.flatMap((f) => file(source, f)) };
}

async function main(): Promise<number> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      source: { type: 'string' },
      since: { type: 'string' },
      until: { type: 'string' },
      state: { type: 'string' },
      now: { type: 'string' },
    },
  });
  const [out] = positionals;
  const all = loadSources(ROOT);
  const sources = values.source === 'all' ? all : all.filter((s) => s.id === values.source);
  const [source] = sources;
  if (out === undefined || source === undefined || (values.state !== undefined && sources.length > 1)) {
    process.stderr.write('usage: record.ts OUT.json --source ID|all (--since D --until D | --state JSON --now ISO)\n');
    return 2;
  }
  const sourceOf = (path: string): Source => sources.find((s) => path.startsWith(`repos/${s.repo}/`)) ?? source;
  // A scratch root: the repo's rules and skills, and the state to replay from.
  const root = mkdtempSync(join(tmpdir(), 'mine-record-'));
  for (const dir of ['rules', 'skills']) symlinkSync(join(ROOT, dir), join(root, dir));
  mkdirSync(join(root, 'docs'));
  const states = values.state === undefined ? {} : { [source.id]: parseState(JSON.parse(values.state)) };
  writeFileSync(join(root, STATE_PATH), JSON.stringify(states));

  const live = githubApi(process.env);
  const recorded: Json = {};
  const api: GitHubApi = async (path) => {
    const body = await live(path);
    recorded[path] = trim(sourceOf(path), path, body);
    return body;
  };
  const { since, until, now } = values;
  await report({
    root,
    api,
    ...(sources.length > 1 ? {} : { source: source.id }),
    ...(since === undefined ? {} : { since }),
    ...(until === undefined ? {} : { until }),
    ...(now === undefined ? {} : { now }),
  });
  writeFileSync(out, `${JSON.stringify(recorded, null, 1)}\n`);
  process.stdout.write(`${out}: ${Object.keys(recorded).length} responses\n`);
  return 0;
}

process.exitCode = await main();
