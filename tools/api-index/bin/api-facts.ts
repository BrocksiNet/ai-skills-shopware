// api-facts: does an extension's code fit the Shopware releases its composer
// range allows? Prints facts from the public API index, not findings.
//
//   node tools/api-index/bin/api-facts.ts [options] <extension dir>
//
// --help lists the options. The skills ship the same command bundled:
// skills/*/scripts/shopware-api.mjs facts.
import { errorMessage } from '../../src/errors.ts';
import { processIo } from '../src/diff-cli.ts';
import { runFacts } from '../src/facts-cli.ts';

try {
  process.exitCode = await runFacts(process.argv.slice(2), processIo());
} catch (error) {
  process.stderr.write(`api-facts: ${errorMessage(error)}\n`);
  process.exitCode = 1;
}
