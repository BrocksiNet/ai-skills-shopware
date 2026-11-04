import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fail, type Grader } from './kit.ts';
import { transferVerdict } from './transfer.ts';

/** Execute fixture modules and PHP AST paths, without booting Shopware. */
export const factOutcome =
  (task: string): Grader =>
  ({ workdir }) => {
    const script = resolve(import.meta.dirname, '../../../evals/tools/ast/src/fact-outcomes.mjs');
    const result = spawnSync(process.execPath, ['--experimental-vm-modules', script, task, workdir], {
      encoding: 'utf8',
      timeout: 10000,
    });
    if (result.error !== undefined && 'code' in result.error && result.error.code === 'ETIMEDOUT')
      return fail('candidate code exceeded the fixture execution limit');
    if (result.error !== undefined || (result.status !== 0 && result.status !== 1))
      throw new Error(`fact grader failed: ${result.error?.message ?? result.stderr}`);
    return transferVerdict(result.stdout, result.status);
  };
