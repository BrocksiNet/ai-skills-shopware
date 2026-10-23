// The fake agent's edit for `suggest-rules draft` (FAKE_AGENT_MODE=draft).
// It works in its current directory, the draft worktree, by FAKE_DRAFT:
//
//   ok      (default) write DRAFT.md with "fixed" and an eval task
//           evals/tasks/fake-draft-task/ with a grade.sh
//   broken  write DRAFT.md with "broken"
//   fix     broken on the first prompt, ok on the retry prompt
//   noop    change nothing
//   error   exit 4 like a failed session
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { envOr } from './env.ts';

export const FAKE_TASK = 'fake-draft-task';

function write(cwd: string, fixed: boolean): void {
  writeFileSync(join(cwd, 'DRAFT.md'), fixed ? 'fixed\n' : 'broken\n');
  if (!fixed) return;
  const task = join(cwd, 'evals/tasks', FAKE_TASK);
  mkdirSync(task, { recursive: true });
  writeFileSync(join(task, 'grade.sh'), '#!/usr/bin/env bash\necho score=1\n');
}

/** The exit code; the summary goes to `out`. Undefined for an unknown mode. */
export function fakeDraft(cwd: string, prompt: string, env: NodeJS.ProcessEnv, out: (t: string) => void): number {
  const mode = envOr(env, 'FAKE_DRAFT', 'ok');
  const retry = prompt.includes('These checks failed');
  switch (mode) {
    case 'ok':
    case 'broken':
    case 'fix':
      write(cwd, mode === 'ok' || (mode === 'fix' && retry));
      out(`Changed DRAFT.md (${mode}${retry ? ', retry' : ''}).\n`);
      return 0;
    case 'noop':
      out('Nothing to change.\n');
      return 0;
    case 'error':
      return 4;
    default:
      return 2;
  }
}
