// shopware-api: the entry of the `shopware-api-index` npm package
// (npm/shopware-api.mjs, written by bin/bundle.ts). One file,
// no npm install, Node 26 or newer.
//
//   npx shopware-api-index diff --repo . --base origin/trunk --head HEAD
//   npx shopware-api-index diff --base 6.6.10.4 --head 6.7.0.0
//   npx shopware-api-index facts <extension dir>
import { errorMessage } from '../../src/errors.ts';
import { processIo } from '../src/diff-cli.ts';
import { run } from '../src/main-cli.ts';

try {
  process.exitCode = await run(process.argv.slice(2), processIo(), process.versions.node);
} catch (error) {
  process.stderr.write(`shopware-api: ${errorMessage(error)}\n`);
  process.exitCode = 1;
}
