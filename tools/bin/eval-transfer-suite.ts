import { resolve } from 'node:path';
import { envOr } from '../src/env.ts';
import { errorMessage } from '../src/errors.ts';
import { prepareTransferSuite, runTransferSuite } from '../src/transfer-suite.ts';

async function main(): Promise<number> {
  const [destination, action = '--prepare', ...rest] = process.argv.slice(2);
  if (destination === undefined || destination === '' || rest.length > 0 || !['--prepare', '--run'].includes(action)) {
    console.error('usage: eval-transfer-suite.ts <new-output-directory> [--prepare|--run]');
    return 2;
  }
  const root = resolve(import.meta.dirname, '../..');
  try {
    const options = {
      root,
      plan: envOr(process.env, 'EVAL_TRANSFER_PLAN', 'evals/experiments/facts-transfer-v2.json'),
      destination: resolve(destination),
      repeats: 2,
      env: {
        ...process.env,
        EVAL_AGENT: 'claude',
        SKILLS_AGENT_CMD: resolve(root, 'evals/runner/claude-task.sh'),
        SKILLS_PROFILE_CMD: resolve(root, 'evals/runner/skills-profile.sh'),
        TASK_MAX_TURNS: '22',
        TASK_MAX_BUDGET_USD: '1.50',
        EVAL_AGENT_TIMEOUT_SECONDS: '240',
      },
      log: (text: string): void => {
        process.stdout.write(text);
      },
    };
    const prepared = prepareTransferSuite(options);
    console.log(`Frozen ${prepared.profiles.length} models before any task sessions.`);
    return action === '--run' ? await runTransferSuite(options, prepared) : 0;
  } catch (error) {
    console.error(`eval-transfer-suite: ${errorMessage(error)}`);
    return 2;
  }
}
process.exitCode = await main();
