// The `draft` command of tools/bin/suggest-rules.ts (plan WP12 step 5):
// options and environment to DraftOptions, and the summary it prints.
import { resolve } from 'node:path';
import { OPENCODE_FREE_MODEL } from './agents.ts';
import { editor } from './draft-agent.ts';
import { exec, FREE_CHECKS, PREPARE } from './draft-checks.ts';
import { type DraftSubject, evalSubject } from './draft-prompt.ts';
import { draft, type DraftResult } from './draft-run.ts';
import { loadCatalog } from './catalog.ts';
import { envInt, envOr } from './env.ts';
import { evalLocal } from './eval-local.ts';
import { SUGGESTIONS_DIR } from './suggest-run.ts';

export interface DraftFlags {
  agent: string;
  'no-pr': boolean;
  base?: string;
  out?: string;
  worktree?: string;
}

export function draftSummary(r: DraftResult): string {
  const lines = [
    `${r.id}: ${r.status} after ${String(r.attempts)} attempt(s), branch ${r.branch}`,
    ...r.checks.map((c) => `  ${c.ok ? 'pass' : 'FAIL'} ${c.name}`),
  ];
  if (r.tasks.length > 0)
    lines.push(`  A/B tasks: ${r.tasks.join(', ')}${r.ab?.file === undefined ? '' : ` (${r.ab.file})`}`);
  if (r.pr !== undefined) lines.push(`  PR: ${r.pr}`);
  else if (r.status === 'no-improvement') lines.push('  no PR: no task improved with the skill on');
  else if (r.status !== 'agent-error') lines.push(`  worktree: ${r.worktree}`);
  return `${lines.join('\n')}\n`;
}

export function draftCommand(
  root: string,
  id: string,
  flags: DraftFlags & { subject?: DraftSubject },
  env: NodeJS.ProcessEnv,
  log: (t: string) => void,
): Promise<DraftResult> {
  const model = envOr(env, 'DRAFT_MODEL', flags.agent === 'opencode' ? OPENCODE_FREE_MODEL : 'haiku');
  return draft({
    root,
    id,
    dir: resolve(root, flags.out ?? SUGGESTIONS_DIR),
    edit: editor(flags.agent, { ...env, DRAFT_MODEL: model }, log),
    x: exec,
    env,
    agent: flags.agent,
    model,
    base: flags.base ?? envOr(env, 'DRAFT_BASE', 'main'),
    noPr: flags['no-pr'],
    checks: FREE_CHECKS,
    prepare: PREPARE,
    repeats: envInt(env, 'DRAFT_REPEATS', 3, 1),
    evalLocal,
    ...(flags.worktree === undefined ? {} : { worktree: flags.worktree }),
    ...(flags.subject === undefined ? {} : { subject: flags.subject }),
    log,
  });
}

/** `draft-eval RULE`: an eval for a rule that has none, through the draft pipeline. */
export function draftEvalCommand(
  root: string,
  rule: string,
  flags: DraftFlags,
  env: NodeJS.ProcessEnv,
  log: (t: string) => void,
): Promise<DraftResult> {
  const subject = evalSubject(root, loadCatalog(root), rule);
  return draftCommand(root, subject.id, { ...flags, subject }, env, log);
}
