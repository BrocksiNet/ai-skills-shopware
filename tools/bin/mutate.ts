// Run Stryker from the repository root so recorded routing fixtures stay in its sandbox.
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { envOr } from '../src/env.ts';

const [profile = envOr(process.env, 'STRYKER_PROFILE', 'manifest'), ...args] = process.argv.slice(2);
const root = resolve(import.meta.dirname, '../..');
const result = spawnSync(
  process.execPath,
  [
    resolve(root, 'tools/node_modules/@stryker-mutator/core/bin/stryker.js'),
    'run',
    'tools/stryker.config.mjs',
    ...args,
  ],
  { cwd: root, env: { ...process.env, STRYKER_PROFILE: profile }, stdio: 'inherit' },
);
if (result.error !== undefined) console.error(result.error.message);
process.exitCode = result.status ?? 2;
