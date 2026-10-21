// Is a newer release of this skills repo available? tools/src/check-update.ts
// documents where the pin comes from. scripts/check-update.sh is a wrapper
// for this file.
//
//   node tools/bin/check-update.ts
import { resolve } from 'node:path';
import { checkUpdate, latestRelease } from '../src/check-update.ts';
import { stdout } from '../src/cli.ts';

process.exitCode = await checkUpdate({
  root: resolve(import.meta.dirname, '../..'),
  cwd: process.cwd(),
  env: process.env,
  out: stdout,
  latest: () => latestRelease(process.env),
});
