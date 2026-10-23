// `suggest-rules draft <id>` (plan WP12 step 5): one proposal becomes a
// branch in its own worktree. The agent makes the change, the free checks
// run (one retry with their output), the A/B runs for the changed tasks,
// and a draft PR opens unless --no-pr. An eval for an existing rule
// (`draft-eval`) gets a PR only when a task improved with the skill on;
// every outcome is appended to `<dir>/evals.jsonl`.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { loadCatalog } from './catalog.ts';
import type { Edit } from './draft-agent.ts';
import * as checks from './draft-checks.ts';
import { branchName, type DraftSubject, draftPrompt, loadSuggestion, nextFreeId, retryPrompt } from './draft-prompt.ts';
import { type AbSection, openPr, prBody, prTitle } from './draft-pr.ts';
import type { EvalLocalOptions } from './eval-local.ts';
import { type AbResult, parseResults } from './eval-results.ts';

export interface DraftOptions {
  root: string;
  id: string;
  /** Where suggestions/<date>.json is; the A/B results and PR body go there too. */
  dir: string;
  edit: Edit;
  x: checks.Exec;
  env: NodeJS.ProcessEnv;
  agent: string;
  model: string;
  /** The branch the worktree starts from and the PR targets. */
  base: string;
  noPr: boolean;
  checks: checks.FreeCheck[];
  /** Generators and the formatter, run before the checks; failures are left to the checks. */
  prepare: checks.FreeCheck[];
  repeats: number;
  evalLocal: (o: EvalLocalOptions) => Promise<number>;
  /** Default `.cache/drafts/<branch>` in the repo. */
  worktree?: string;
  /** Draft this instead of loading `id` from the suggestions. */
  subject?: DraftSubject;
  log: (t: string) => void;
}

export type DraftStatus = 'agent-error' | 'checks-failed' | 'no-change' | 'drafted' | 'pr-opened' | 'no-improvement';

export interface DraftResult {
  id: string;
  ruleId: string;
  branch: string;
  worktree: string;
  status: DraftStatus;
  attempts: number;
  checks: checks.CheckRun[];
  files: string[];
  tasks: string[];
  ab?: AbSection;
  body?: string;
  pr?: string;
}

function refuse(s: DraftSubject, noPr: boolean): void {
  if (s.action === 'none') throw new Error(`${s.id} proposes no change (action none)`);
  if (!s.ok) throw new Error(`${s.id} failed a check in suggest-rules; fix the proposal first`);
  if (s.private && !noPr) throw new Error(`${s.id} rests on private review evidence; use --no-pr`);
}

/** How many times the agent gets to make the checks pass. */
const MAX_ATTEMPTS = 2;

/** Agent, generators and format, checks; once more with the failures, then stop. */
async function attempt(o: DraftOptions, wt: string, prompt: string, r: DraftResult): Promise<DraftResult> {
  const n = r.attempts + 1;
  o.log(`attempt ${String(n)}: ${o.agent}\n`);
  const failedBefore = r.checks.filter((c) => !c.ok);
  const answer = await o.edit(n === 1 ? prompt : retryPrompt(prompt, failedBefore), wt);
  if (answer.status !== 0) return { ...r, attempts: n, status: 'agent-error' };
  await checks.runChecks(o.x, wt, o.env, o.prepare, o.log);
  const runs = await checks.runChecks(o.x, wt, o.env, o.checks, o.log);
  const next: DraftResult = { ...r, attempts: n, checks: runs };
  if (runs.every((c) => c.ok)) return { ...next, status: 'drafted' };
  if (n >= MAX_ATTEMPTS) return { ...next, status: 'checks-failed' };
  return attempt(o, wt, prompt, next);
}

/** The A/B for the changed tasks through eval-local, read back from its file. */
async function abRun(o: DraftOptions, wt: string, tasks: string[]): Promise<AbSection> {
  const section: AbSection = { results: [], agent: o.agent, model: o.model };
  if (tasks.length === 0) return section;
  const file = resolve(o.dir, `${o.id}-ab.jsonl`);
  mkdirSync(o.dir, { recursive: true });
  writeFileSync(file, '');
  const agent = o.agent === 'opencode' ? 'opencode' : 'claude';
  const env = {
    ...o.env,
    EVAL_LOCAL_AGENT: agent,
    EVAL_TASKS: tasks.join(','),
    EVAL_RESULTS: file,
    REPEATS: String(o.repeats),
    ...(agent === 'claude' ? { TASK_MODEL: o.model } : {}),
  };
  o.log(`A/B: ${tasks.join(', ')}\n`);
  await o.evalLocal({ root: wt, env, out: o.log, err: o.log });
  const results = existsSync(file) ? parseResults(readFileSync(file, 'utf8')) : [];
  // The body is public: name the file relative to the repository.
  return { ...section, file: relative(o.root, file), results };
}

/** A task the skill made better: the eval shows the rule helps. */
export const improved = (results: AbResult[]): boolean => results.some((r) => r.verdict === 'improved');

async function finish(o: DraftOptions, s: DraftSubject, wt: string, r: DraftResult): Promise<DraftResult> {
  const files = await checks.stagedFiles(o.x, wt, o.env);
  if (files.length === 0) return { ...r, status: 'no-change' };
  const title = prTitle(s, r.ruleId);
  await checks.git(o.x, wt, o.env, ['commit', '--quiet', '-m', title, '--', ...checks.COMMIT_PATHSPEC]);
  const rule = loadCatalog(o.root).rules.find((x) => x.id === s.rule);
  const tasks = checks.changedTasks(files, wt, s.action === 'update' ? rule?.eval : undefined);
  const ab = await abRun(o, wt, tasks);
  const body = prBody({ suggestion: s, ruleId: r.ruleId, files, checks: r.checks, attempts: r.attempts, ab });
  const bodyFile = resolve(o.dir, `${o.id}-pr.md`);
  writeFileSync(bodyFile, body);
  const done = { ...r, files, tasks, ab, body };
  if (o.noPr) return done;
  if (s.action === 'eval' && !improved(ab.results)) {
    await checks.git(o.x, o.root, o.env, ['worktree', 'remove', '--force', wt]);
    await checks.git(o.x, o.root, o.env, ['branch', '-D', r.branch]);
    return { ...done, status: 'no-improvement' };
  }
  const pr = await openPr({ x: o.x, wt, env: o.env, branch: r.branch, base: o.base, title, bodyFile });
  await checks.git(o.x, o.root, o.env, ['worktree', 'remove', '--force', wt]);
  return { ...done, status: 'pr-opened', pr };
}

/** One line per eval draft in `<dir>/evals.jsonl`, for the triage. */
function logEval(o: DraftOptions, s: DraftSubject, r: DraftResult): void {
  if (s.action !== 'eval') return;
  mkdirSync(o.dir, { recursive: true });
  const line = {
    rule: s.rule,
    skill: s.skill,
    status: r.status,
    tasks: r.tasks,
    ab: (r.ab?.results ?? []).map((a) => ({
      task: a.task,
      on: a.on,
      off: a.off,
      repeats: a.repeats,
      verdict: a.verdict,
    })),
    ...(r.pr === undefined ? {} : { pr: r.pr }),
    at: new Date().toISOString(),
  };
  appendFileSync(join(o.dir, 'evals.jsonl'), `${JSON.stringify(line)}\n`);
}

async function draftSubject(o: DraftOptions, s: DraftSubject): Promise<DraftResult> {
  refuse(s, o.noPr);
  const catalog = loadCatalog(o.root);
  const branch = branchName(s);
  const wt = resolve(o.worktree ?? join(o.root, '.cache/drafts', branch.replace('/', '-')));
  if (existsSync(wt)) throw new Error(`${wt} exists; remove it with git worktree remove`);
  mkdirSync(join(wt, '..'), { recursive: true });
  // Start from the remote branch when there is one: the local one may lag.
  const remote = await o.x('git', ['rev-parse', '--verify', '--quiet', `origin/${o.base}`], {
    cwd: o.root,
    env: o.env,
  });
  const from = remote.status === 0 ? `origin/${o.base}` : o.base;
  await checks.git(o.x, o.root, o.env, ['worktree', 'add', '--quiet', '--no-track', '-b', branch, wt, from]);
  checks.linkNodeModules(o.root, wt);
  const ruleId = s.action === 'new' ? nextFreeId(catalog, s.skill) : s.rule;
  const start: DraftResult = {
    id: o.id,
    ruleId,
    branch,
    worktree: wt,
    status: 'drafted',
    attempts: 0,
    checks: [],
    files: [],
    tasks: [],
  };
  const r = await attempt(o, wt, draftPrompt({ suggestion: s, catalog }), start);
  return r.status === 'drafted' ? finish(o, s, wt, r) : r;
}

export async function draft(o: DraftOptions): Promise<DraftResult> {
  const s = o.subject ?? loadSuggestion(o.dir, o.id);
  const r = await draftSubject(o, s);
  logEval(o, s, r);
  return r;
}
