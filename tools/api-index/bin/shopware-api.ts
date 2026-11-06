// shopware-api: the entry of the bundled script the skills ship
// (skills/*/scripts/shopware-api.mjs, written by bin/bundle.ts). One file,
// no npm install, Node 20 or newer.
//
//   node scripts/shopware-api.mjs diff --repo . --base origin/trunk --head HEAD
//   node scripts/shopware-api.mjs diff --base 6.6.10.4 --head 6.7.0.0
//   node scripts/shopware-api.mjs facts <extension dir>
import { errorMessage } from '../../src/errors.ts';
import { processIo } from '../src/diff-cli.ts';
import { run } from '../src/main-cli.ts';

try {
  process.exitCode = await run(process.argv.slice(2), processIo(), process.versions.node);
} catch (error) {
  process.stderr.write(`shopware-api: ${errorMessage(error)}\n`);
  process.exitCode = 1;
}
