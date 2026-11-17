// api-changes: what changed in Shopware's public API since the previous
// index, as Markdown. Trunk of the previous index against trunk of the new
// one, and each new release tag against the tag before it.
//
//   node tools/api-index/bin/api-changes.ts --previous old/api-index.json.gz --current dist/api-index.json.gz
//
// A missing --previous file is not an error: the first run has nothing to
// compare with and says so.
//
// When the previous index comes from another generator version, --repo (a
// shopware/shopware clone) rebuilds its trunk commit with the current
// generator, so new generator features do not read as trunk changes. Without
// --repo, or when the commit is gone, the report only warns. --cache is the
// snapshot cache of timeline.ts. api-index.yml writes the result to the run
// summary and uploads it as the `api-changes.md` asset of the release, which
// the weekly drift issue (mine-trunk.yml) adds as a section.
import { existsSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { errorMessage } from '../../src/errors.ts';
import { changesMarkdown, previousTrunkSha } from '../src/api-changes.ts';
import type { Snapshot } from '../src/model.ts';
import { defaultCacheDir, loadTimeline, snapshotFor } from '../src/store.ts';
import type { Timeline } from '../src/timeline.ts';

const USAGE =
  'usage: api-changes.ts --current <api-index.json.gz> [--previous <api-index.json.gz>] [--repo <shopware clone>] [--cache <dir>] [--out <file>]\n';

/** The previous trunk commit built with the current generator, or nothing
 *  when the generator did not change or the commit cannot be built. */
function rebuiltTrunk(
  previous: Timeline,
  current: Timeline,
  repo: string | undefined,
  cache: string | undefined,
): Snapshot | undefined {
  if (repo === undefined || previous.generator === current.generator) return undefined;
  const sha = previousTrunkSha(previous);
  if (sha === undefined) return undefined;
  try {
    const { snapshot } = snapshotFor(repo, sha, cache ?? defaultCacheDir(process.env), 'trunk');
    process.stderr.write(`rebuilt the previous trunk ${sha.slice(0, 8)} with ${current.generator}\n`);
    return snapshot;
  } catch (error) {
    process.stderr.write(`api-changes: cannot rebuild the previous trunk ${sha.slice(0, 8)}: ${errorMessage(error)}\n`);
    return undefined;
  }
}

function main(): number {
  const { values } = parseArgs({
    options: {
      previous: { type: 'string' },
      current: { type: 'string' },
      repo: { type: 'string' },
      cache: { type: 'string' },
      out: { type: 'string' },
    },
  });
  if (values.current === undefined) {
    process.stderr.write(USAGE);
    return 2;
  }
  const previous =
    values.previous === undefined || !existsSync(values.previous) ? undefined : loadTimeline(values.previous);
  const current = loadTimeline(values.current);
  const trunkBase = previous === undefined ? undefined : rebuiltTrunk(previous, current, values.repo, values.cache);
  const text = changesMarkdown(previous, current, trunkBase);
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
