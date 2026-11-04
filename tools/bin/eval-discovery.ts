import { resolve } from 'node:path';
import { runDiscovery, prepareDiscovery } from '../src/discovery-pilot.ts';
import { envInt, envSet } from '../src/env.ts';
import { errorMessage } from '../src/errors.ts';

async function main(): Promise<number> {
  const [destination, action = '--prepare', ...rest] = process.argv.slice(2);
  if (destination === undefined || rest.length > 0 || !['--prepare', '--run'].includes(action)) {
    console.error('usage: eval-discovery.ts <new-output-directory> [--prepare|--run]');
    return 2;
  }
  const root = resolve(import.meta.dirname, '../..');
  try {
    if (action === '--prepare') {
      prepareDiscovery(root, resolve(destination));
      console.log(`Prepared current, merged and removed packages in ${resolve(destination)}`);
      return 0;
    }
    if (!envSet(process.env, 'SKILLS_AGENT_CMD')) throw new Error('SKILLS_AGENT_CMD must name a task adapter');
    return await runDiscovery({
      root,
      destination: resolve(destination),
      repeats: envInt(process.env, 'REPEATS', 1, 1),
      env: { ...process.env, SKILLS_PROFILE_CMD: resolve(root, 'evals/runner/skills-profile.sh') },
      log: (s) => {
        process.stdout.write(s);
      },
    });
  } catch (error) {
    console.error(`eval-discovery: ${errorMessage(error)}`);
    return 2;
  }
}
process.exitCode = await main();
