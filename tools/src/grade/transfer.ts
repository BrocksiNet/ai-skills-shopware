import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fail, type Grader, type Verdict } from './kit.ts';

/** Exit 1 alone is not a model failure: Node startup failures also use it. */
export function transferVerdict(stdout: string, status: number | null): Verdict {
  let raw: unknown;
  try {
    raw = JSON.parse(stdout);
  } catch {
    throw new Error('transfer oracle did not return a structured outcome');
  }
  if (
    typeof raw !== 'object' ||
    raw === null ||
    !('outcome' in raw) ||
    !((status === 0 && raw.outcome === 'pass') || (status === 1 && raw.outcome === 'fail'))
  )
    throw new Error('transfer oracle returned an inconsistent outcome');
  return status === 0 ? { pass: true, detail: stdout.trim() } : fail(stdout.trim());
}

/** Execute hidden behavioral assertions without adding a Shopware/PHP runtime. */
export const transferOutcome =
  (task: string): Grader =>
  ({ workdir }) => {
    const script = resolve(import.meta.dirname, '../../../evals/tools/ast/src/transfer-outcomes.mjs');
    const result = spawnSync(process.execPath, ['--experimental-vm-modules', script, task, workdir], {
      encoding: 'utf8',
      timeout: 10000,
    });
    if (result.error !== undefined && 'code' in result.error && result.error.code === 'ETIMEDOUT')
      return fail('candidate code exceeded the fixture execution limit');
    if (result.error !== undefined || (result.status !== 0 && result.status !== 1)) {
      throw new Error(`transfer grader failed: ${result.error?.message ?? result.stderr}`);
    }
    return transferVerdict(result.stdout, result.status);
  };
