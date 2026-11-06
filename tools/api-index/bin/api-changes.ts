// api-changes: what changed in Shopware's public API since the previous
// index, as Markdown. Trunk of the previous index against trunk of the new
// one, and each new release tag against the tag before it.
//
//   node tools/api-index/bin/api-changes.ts --previous old/api-index.json.gz --current dist/api-index.json.gz
//
// A missing --previous file is not an error: the first run has nothing to
// compare with and says so. api-index.yml writes the result to the run
// summary and uploads it as the `api-changes.md` asset of the release, which
// the weekly drift issue (mine-trunk.yml) adds as a section.
import { existsSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { errorMessage } from '../../src/errors.ts';
import { changesMarkdown } from '../src/api-changes.ts';
import { loadTimeline } from '../src/store.ts';

const USAGE = 'usage: api-changes.ts --current <api-index.json.gz> [--previous <api-index.json.gz>] [--out <file>]\n';

function main(): number {
  const { values } = parseArgs({
    options: { previous: { type: 'string' }, current: { type: 'string' }, out: { type: 'string' } },
  });
  if (values.current === undefined) {
    process.stderr.write(USAGE);
    return 2;
  }
  const previous =
    values.previous === undefined || !existsSync(values.previous) ? undefined : loadTimeline(values.previous);
  const text = changesMarkdown(previous, loadTimeline(values.current));
  if (values.out === undefined) process.stdout.write(text);
  else writeFileSync(values.out, text);
  return 0;
}

try {
  process.exitCode = main();
} catch (error) {
  process.stderr.write(`api-changes: ${errorMessage(error)}\n`);
  process.exitCode = 1;
}
