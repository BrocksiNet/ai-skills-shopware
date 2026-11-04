// Freeze the CI plan before any A/B starts. EVAL_TASKS is the full plan,
// including the tasks assigned to other shards of the same model profile.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { shortSha } from '../src/revision.ts';
import { envInt, envOr } from '../src/env.ts';
import { errorMessage } from '../src/errors.ts';
import { manifest } from '../src/eval-experiment.ts';

function main(): number {
  const [file, ...rest] = process.argv.slice(2);
  if (file === undefined || rest.length > 0) {
    console.error(
      'usage: eval-manifest.ts <manifest.json> (EVAL_TASKS, REPEATS, EVAL_EXPERIMENT_ID, EVAL_AGENT, TASK_MODEL)',
    );
    return 2;
  }
  try {
    const tasks = envOr(process.env, 'EVAL_TASKS', '')
      .split(',')
      .filter((t) => t !== '');
    const result = manifest(
      tasks,
      envInt(process.env, 'REPEATS', 3, 1),
      process.env,
      shortSha(resolve(import.meta.dirname, '../..')),
    );
    writeFileSync(file, `${JSON.stringify(result, null, 2)}\n`);
    return 0;
  } catch (error) {
    console.error(`eval-manifest: ${errorMessage(error)}`);
    return 2;
  }
}
process.exitCode = main();
