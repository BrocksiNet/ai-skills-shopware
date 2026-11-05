// api-diff: what a change does to Shopware's public API. Reports, per
// surface, what was removed or changed without a deprecation in the base,
// and what was newly deprecated. Exits 3 when it finds a breaking change.
//
//   node tools/api-index/bin/api-diff.ts --repo ~/shopware --base origin/trunk --head HEAD
//   node tools/api-index/bin/api-diff.ts --base 6.6.10.4 --head 6.7.0.0
//
// With --repo, base and head are refs of a shopware/shopware clone, built
// (and cached) on the spot, and each change names its line. Without it,
// they are releases in the index. --help lists the options. The skills
// ship the same command bundled: skills/*/scripts/shopware-api.mjs diff.
import { errorMessage } from '../../src/errors.ts';
import { processIo, runDiff } from '../src/diff-cli.ts';

try {
  process.exitCode = await runDiff(process.argv.slice(2), processIo());
} catch (error) {
  process.stderr.write(`api-diff: ${errorMessage(error)}\n`);
  process.exitCode = 1;
}
