// The worktree and the free checks of `suggest-rules draft` (plan WP12 step
// 5): the same checks CI runs on every push, without a model.
import { existsSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { type RunResult, run } from './proc.ts';
import { inSeries } from './series.ts';

/** Runs a command; tests replace it to stub `gh`. */
export type Exec = (cmd: string, args: string[], o: { cwd: string; env: NodeJS.ProcessEnv }) => Promise<RunResult>;

export const exec: Exec = (cmd, args, o) => run(cmd, args, o);

/** One free check: a command run from a folder of the worktree. */
export interface FreeCheck {
  name: string;
  cmd: string;
  args: string[];
  /** Relative to the worktree; default its root. */
  dir?: string;
}

export interface CheckRun {
  name: string;
  ok: boolean;
  output: string;
}

/** What CI runs on every push (validate.yml), in the order a fix needs. */
export const FREE_CHECKS: FreeCheck[] = [
  { name: 'validate-skills', cmd: 'bash', args: ['scripts/validate-skills.sh'] },
  { name: 'tools typecheck', cmd: 'npm', args: ['run', 'typecheck'], dir: 'tools' },
  { name: 'tools lint', cmd: 'npm', args: ['run', 'lint'], dir: 'tools' },
  { name: 'tools tests', cmd: 'npm', args: ['test'], dir: 'tools' },
  { name: 'golden graders', cmd: 'bash', args: ['evals/test-graders.sh'] },
  {
    name: 'markdown lint',
    cmd: 'npx',
    args: [
      '--yes',
      'markdownlint-cli2',
      '**/*.md',
      '!**/node_modules/**',
      '!evals/tasks/**/fixture/**/*.md',
      '!evals/tasks/**/fixtures/**/*.md',
    ],
  },
];

/** Before the checks: the generators AGENTS.md says to run after a rule,
 *  route or skill change, and the formatter, as a person would. */
export const PREPARE: FreeCheck[] = [
  { name: 'render-routes', cmd: 'node', args: ['tools/bin/render-routes.ts'] },
  { name: 'render-enforced', cmd: 'node', args: ['tools/bin/render-enforced.ts'] },
  { name: 'render-router-index', cmd: 'node', args: ['tools/bin/render-router-index.ts'] },
  { name: 'format', cmd: 'npm', args: ['run', 'format'], dir: 'tools' },
];

/** Runs every check, also after a failure, so the retry sees all of them. */
export function runChecks(
  x: Exec,
  wt: string,
  env: NodeJS.ProcessEnv,
  checks: FreeCheck[],
  log: (t: string) => void,
): Promise<CheckRun[]> {
  return inSeries(checks, async (c) => {
    log(`  check: ${c.name}\n`);
    const r = await x(c.cmd, c.args, { cwd: join(wt, c.dir ?? '.'), env });
    return { name: c.name, ok: r.status === 0, output: `${r.stdout}${r.stderr}` };
  });
}

/** Installed dependencies the checks need; linked, not installed again. */
export const NODE_MODULES = ['tools/node_modules', 'tools/api-index/node_modules', 'evals/tools/ast/node_modules'];

/** The pathspec that keeps the linked node_modules out of a commit. */
export const COMMIT_PATHSPEC = ['.', ...NODE_MODULES.map((m) => `:(exclude)${m}`)];

export function linkNodeModules(root: string, wt: string): void {
  for (const dir of NODE_MODULES) {
    if (existsSync(join(root, dir)) && !existsSync(join(wt, dir))) symlinkSync(join(root, dir), join(wt, dir));
  }
}

/** `git` in `cwd`; throws with its output on a non-zero exit. */
export async function git(x: Exec, cwd: string, env: NodeJS.ProcessEnv, args: string[]): Promise<string> {
  const r = await x('git', args, { cwd, env });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr.trim() || r.stdout.trim()}`);
  return r.stdout;
}

/** Stages the agent's work and lists the changed files. */
export async function stagedFiles(x: Exec, wt: string, env: NodeJS.ProcessEnv): Promise<string[]> {
  await git(x, wt, env, ['add', '-A', '--', ...COMMIT_PATHSPEC]);
  const out = await git(x, wt, env, ['diff', '--cached', '--name-only']);
  return out.split('\n').filter((l) => l !== '');
}

/** Eval tasks a change adds or edits, plus the rule's own task. */
export function changedTasks(files: string[], wt: string, ruleEval: string | null | undefined): string[] {
  const touched = files.flatMap((f) => /^evals\/tasks\/([^/]+)\//u.exec(f)?.[1] ?? []);
  const graders = files.flatMap((f) => /^tools\/graders\/([^/]+)\.ts$/u.exec(f)?.[1] ?? []);
  const all = [...touched, ...graders, ...(ruleEval === null || ruleEval === undefined ? [] : [ruleEval])];
  return [...new Set(all)].filter((t) => existsSync(join(wt, 'evals/tasks', t, 'grade.sh'))).toSorted();
}
