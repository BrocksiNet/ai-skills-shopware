import { join, resolve } from 'node:path';
import { envInt, envOr, envSet } from '../src/env.ts';
import { errorMessage } from '../src/errors.ts';
import { freezeTransfer, runTransfer } from '../src/transfer-eval.ts';
import { writeFileSync } from 'node:fs';
import { summarizeTransfer } from '../src/transfer-summary.ts';
import { transferCases } from '../src/transfer-plan.ts';

async function main(): Promise<number> {
  const [destination, action = '--prepare', ...rest] = process.argv.slice(2);
  if (destination === undefined || rest.length > 0 || !['--prepare', '--run'].includes(action)) {
    console.error('usage: eval-transfer.ts <new-output-directory> [--prepare|--run]');
    return 2;
  }
  const root = resolve(import.meta.dirname, '../..');
  try {
    const options = {
      root,
      plan: envOr(process.env, 'EVAL_TRANSFER_PLAN', 'evals/experiments/discovery-transfer-v1.json'),
      destination: resolve(destination),
      repeats: envInt(process.env, 'REPEATS', 2, 1),
      env: { ...process.env, SKILLS_PROFILE_CMD: resolve(root, 'evals/runner/skills-profile.sh') },
      log: (s: string): void => {
        process.stdout.write(s);
      },
    };
    if (action === '--prepare') {
      const jobs = freezeTransfer(options);
      console.log(`Frozen ${jobs.length} planned trials.`);
      return 0;
    }
    if (!envSet(process.env, 'SKILLS_AGENT_CMD') || process.env.EVAL_AGENT !== 'claude')
      throw new Error('this trace observer requires EVAL_AGENT=claude and SKILLS_AGENT_CMD');
    const result = await runTransfer(options);
    const summary = summarizeTransfer(transferCases(root, options.plan), result.trials);
    writeFileSync(join(options.destination, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
    console.log(JSON.stringify(summary, null, 2));
    return result.code;
  } catch (error) {
    console.error(`eval-transfer: ${errorMessage(error)}`);
    return 2;
  }
}
process.exitCode = await main();
