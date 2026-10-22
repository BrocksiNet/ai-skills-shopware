// api-diff: what a change does to Shopware's public API. Reports, per
// surface, what was removed or changed without a deprecation in the base,
// and what was newly deprecated.
//
//   node tools/api-index/bin/api-diff.ts --repo ~/shopware --base origin/trunk --head HEAD
//   node tools/api-index/bin/api-diff.ts --base 6.6.10.4 --head 6.7.0.0
//
// With --repo, base and head are refs of a shopware/shopware clone, built
// (and cached) on the spot. Without it, they are releases in the index.
//     --surface <list>  route,entity,feature,config,php (default: all but php)
//     --index <file>    api-index.json.gz; else $API_INDEX or the cached release asset
//     --cache <dir>     where built snapshots are cached
//     --no-fetch        never download the index
//     --json            the changes as JSON
import { parseArgs } from 'node:util';
import { type ApiDiff, diffSnapshots, diffText, SURFACES, type Surface } from '../src/api-diff.ts';
import { errorMessage } from '../../src/errors.ts';
import { openSource } from '../src/snapshot-source.ts';

const USAGE =
  'usage: api-diff.ts [--repo <shopware clone>] --base <ref|release> --head <ref|release> [--surface <list>] [--index <file>] [--cache <dir>] [--no-fetch] [--json]\n';

function isSurface(value: string): value is Surface {
  return SURFACES.some((surface) => surface === value);
}

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      repo: { type: 'string' },
      base: { type: 'string' },
      head: { type: 'string' },
      surface: { type: 'string', default: 'route,entity,feature,config' },
      index: { type: 'string' },
      cache: { type: 'string' },
      'no-fetch': { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
    },
  });
  const surfaces = values.surface.split(',').map((part) => part.trim());
  const unknown = surfaces.filter((surface) => !isSurface(surface));
  if (values.base === undefined || values.head === undefined || unknown.length > 0) {
    if (unknown.length > 0) process.stderr.write(`unknown surface: ${unknown.join(', ')}\n`);
    process.stderr.write(USAGE);
    return 2;
  }
  const source = await openSource(
    { repo: values.repo, index: values.index, cache: values.cache, fetch: !values['no-fetch'] },
    process.env,
  );
  const base = source(values.base);
  const head = source(values.head);
  if (base === undefined || head === undefined) {
    const missing = [base === undefined ? values.base : undefined, head === undefined ? values.head : undefined];
    process.stderr.write(`not in the index: ${missing.filter((name) => name !== undefined).join(', ')}\n`);
    return 2;
  }
  const diff: ApiDiff = diffSnapshots(
    base,
    head,
    surfaces.filter((surface) => isSurface(surface)),
  );
  process.stdout.write(values.json ? `${JSON.stringify(diff, null, 2)}\n` : diffText(diff));
  return 0;
}

try {
  process.exitCode = await main();
} catch (error) {
  process.stderr.write(`api-diff: ${errorMessage(error)}\n`);
  process.exitCode = 1;
}
