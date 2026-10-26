// `suggest-rules draft` (plan WP12 step 5) with the fake agent
// (FAKE_AGENT_MODE=draft) in a throwaway git repository: the worktree and
// branch, the free checks with one retry, the A/B table from the results
// file, the PR body, and a stubbed `gh`. No model, no network.
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { editor } from '../src/draft-agent.ts';
import { branchName, evalSubject } from '../src/draft-prompt.ts';
import { draft, type DraftOptions } from '../src/draft-run.ts';
import { FAKE_TASK } from '../src/fake-draft.ts';
import { run } from '../src/proc.ts';
import { FAKE, proposal, realCatalog, ROOT, scratch } from './suggest-fixture.ts';

const tmp = scratch();
const repo = join(tmp, 'repo');
const dir = join(repo, 'suggestions');
const ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
  FAKE_AGENT_MODE: 'draft',
};
const EVIDENCE = ['https://github.com/shopware/shopware/pull/1#discussion_r1'];

const suggestion = (id: string, fields: object): object => ({
  ...proposal({ evidence: EVIDENCE, title: `Fake rule ${id}` }),
  id,
  cluster: 'area:Core/Fake',
  checks: [],
  ok: true,
  private: false,
  ...fields,
});

const git = async (args: string[]): Promise<string> => (await run('git', args, { cwd: repo, env: ENV })).stdout;

/** A repository with the real catalog and one suggestions file. */
async function setup(): Promise<void> {
  mkdirSync(join(repo, 'rules'), { recursive: true });
  cpSync(join(ROOT, 'rules/catalog.json'), join(repo, 'rules/catalog.json'));
  writeFileSync(join(repo, '.gitignore'), 'suggestions/\n');
  await git(['init', '--quiet', '-b', 'main']);
  await git(['add', '-A']);
  await git(['commit', '--quiet', '-m', 'init']);
  mkdirSync(dir);
  const suggestions = [
    suggestion('2026-10-23-01', {}),
    suggestion('2026-10-23-02', {}),
    suggestion('2026-10-23-03', {}),
    suggestion('2026-10-23-04', {}),
    suggestion('2026-10-23-05', { private: true }),
    suggestion('2026-10-23-06', { action: 'none', rule: 'REV-034' }),
    suggestion('2026-10-23-07', { ok: false }),
  ];
  writeFileSync(join(dir, '2026-10-23.json'), JSON.stringify({ suggestions }));
}

const calls: string[][] = [];
/** git and everything else run for real; `gh` and `git push` are recorded. */
const stubbed: DraftOptions['x'] = (cmd, args, o) => {
  if (cmd === 'gh' || (cmd === 'git' && args[0] === 'push')) {
    calls.push([cmd, ...args]);
    const stdout = cmd === 'gh' ? 'https://github.com/o/r/pull/7\n' : '';
    return Promise.resolve({ status: 0, stdout, stderr: '', timedOut: false });
  }
  return run(cmd, args, o);
};

const result = (task: string, verdict = 'improved'): string =>
  `${JSON.stringify({ task, repeats: 1, on: 1, off: verdict === 'improved' ? 0 : 1, on_done: 1, off_done: 1, verdict })}\n`;

function options(id: string, mode: string, noPr = true, verdict = 'improved'): DraftOptions {
  return {
    root: repo,
    id,
    dir,
    edit: editor(FAKE, { ...ENV, FAKE_DRAFT: mode }, () => {}),
    x: stubbed,
    env: ENV,
    agent: 'fake',
    model: 'none',
    base: 'main',
    noPr,
    prepare: [],
    checks: [{ name: 'draft fixed', cmd: 'grep', args: ['-q', 'fixed', 'DRAFT.md'] }],
    repeats: 1,
    evalLocal: (o) => {
      writeFileSync(
        o.env.EVAL_RESULTS ?? '',
        (o.env.EVAL_TASKS ?? '')
          .split(',')
          .map((t) => result(t, verdict))
          .join(''),
      );
      return Promise.resolve(0);
    },
    worktree: join(tmp, `wt-${id}`),
    log: () => {},
  };
}

describe('suggest-rules draft', async () => {
  await setup();

  test('drafts on a branch, runs the A/B and writes a body whose table is the results file', async () => {
    const r = await draft(options('2026-10-23-01', 'ok'));
    assert.equal(r.status, 'drafted');
    assert.equal(r.attempts, 1);
    assert.deepEqual(r.files, ['DRAFT.md', `evals/tasks/${FAKE_TASK}/grade.sh`]);
    assert.deepEqual(r.tasks, [FAKE_TASK]);
    assert.match(r.ruleId, /^REV-\d{3}$/u);
    const subject = await git(['log', '-1', '--format=%s', r.branch]);
    assert.equal(subject, `feat(sw-review-learnings): ${r.ruleId} Fake rule 2026-10-23-01\n`);
    const body = readFileSync(join(dir, '2026-10-23-01-pr.md'), 'utf8');
    assert.equal(body, r.body);
    assert.match(body, new RegExp(`\\| \`${FAKE_TASK}\` \\| 1/1 \\| 0/1 \\| improved \\|`, 'u'));
    assert.match(body, /discussion_r1/u);
    assert.ok(existsSync(r.worktree));
    assert.equal(calls.length, 0);
  });
  test('retries once with the failed output, then passes', async () => {
    const r = await draft(options('2026-10-23-02', 'fix'));
    assert.equal(r.status, 'drafted');
    assert.equal(r.attempts, 2);
  });
  test('stops after the retry when the checks still fail, without a commit', async () => {
    const r = await draft(options('2026-10-23-03', 'broken'));
    assert.equal(r.status, 'checks-failed');
    assert.equal(r.attempts, 2);
    assert.equal(r.body, undefined);
    assert.equal(await git(['log', '-1', '--format=%s', r.branch]), 'init\n');
  });
  test('opens a draft PR with the run-evals label and removes the worktree', async () => {
    const r = await draft(options('2026-10-23-04', 'ok', false));
    assert.equal(r.status, 'pr-opened');
    assert.equal(r.pr, 'https://github.com/o/r/pull/7');
    assert.deepEqual(calls[0], ['git', 'push', '-u', 'origin', r.branch]);
    const gh = calls[1] ?? [];
    assert.ok(gh.includes('--draft'));
    assert.equal(gh[gh.indexOf('--label') + 1], 'run-evals');
    assert.equal(existsSync(r.worktree), false);
  });
  test('refuses private evidence for a PR, a covered proposal and a failed one', async () => {
    await assert.rejects(draft(options('2026-10-23-05', 'ok', false)), /private review evidence/u);
    await assert.rejects(draft(options('2026-10-23-06', 'ok')), /no change/u);
    await assert.rejects(draft(options('2026-10-23-07', 'ok')), /failed a check/u);
    await assert.rejects(draft(options('2026-10-23-99', 'ok')), /is not in/u);
  });
  test('names the branch after the skill and the title', () => {
    const s = { ...proposal({ title: 'Keep history out of comments!' }), id: 'x', cluster: '', checks: [] };
    assert.equal(branchName({ ...s, ok: true, private: false }), 'rules/review-learnings-keep-history-out-of-comments');
  });
});

const evalDir = join(tmp, 'evals-out');
const logged = (): unknown[] =>
  readFileSync(join(evalDir, 'evals.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((l): unknown => JSON.parse(l));

describe('suggest-rules draft-eval', () => {
  const catalog = realCatalog();
  const [first, second] = catalog.rules.filter((r) => r.status === 'active' && r.eval === null);
  const withEval = catalog.rules.find((r) => r.status === 'active' && r.eval !== null);
  if (first === undefined || second === undefined || withEval === undefined) throw new Error('catalog fixture');
  const evalOptions = (rule: string, verdict: string): DraftOptions => ({
    ...options(`eval-${rule}`, 'ok', false, verdict),
    // A folder that does not exist yet, as --out for a first run.
    dir: evalDir,
    subject: evalSubject(ROOT, catalog, rule),
  });
  test('only a rule without an eval gets one', () => {
    assert.throws(() => evalSubject(ROOT, catalog, withEval.id), /already has the eval/u);
    assert.throws(() => evalSubject(ROOT, catalog, 'XYZ-999'), /is not in/u);
    const s = evalSubject(ROOT, catalog, first.id);
    assert.equal(branchName(s), `evals/${first.skill.replace(/^sw-/u, '')}-${first.id.toLowerCase()}`);
  });
  test('opens a PR when a task improved, and logs it', async () => {
    calls.length = 0;
    const r = await draft(evalOptions(first.id, 'improved'));
    assert.equal(r.status, 'pr-opened');
    const gh = calls[1] ?? [];
    assert.equal(gh[gh.indexOf('--title') + 1], `test(${first.skill}): eval for ${first.id}`);
    assert.match(r.body ?? '', /draft-eval/u);
    assert.match(JSON.stringify(logged().at(-1)), new RegExp(`"rule":"${first.id}".*"status":"pr-opened"`, 'u'));
    assert.match(JSON.stringify(logged().at(-1)), /"pr":"https:\/\/github.com\/o\/r\/pull\/7"/u);
  });
  test('opens no PR when nothing improved, and drops the worktree and branch', async () => {
    calls.length = 0;
    const r = await draft(evalOptions(second.id, 'held'));
    assert.equal(r.status, 'no-improvement');
    assert.equal(calls.length, 0);
    assert.equal(existsSync(r.worktree), false);
    assert.equal(await git(['branch', '--list', r.branch]), '');
    assert.match(JSON.stringify(logged().at(-1)), /"status":"no-improvement"/u);
  });
});
