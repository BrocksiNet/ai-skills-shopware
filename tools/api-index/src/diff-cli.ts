// The api-diff command, shared by bin/api-diff.ts and the bundled
// shopware-api.mjs the skills ship. Exit codes: 0 no breaking change,
// 3 breaking changes found, 2 usage or unknown ref, 1 any other error.
import { parseArgs } from 'node:util';
import { type ApiDiff, diffSnapshots, diffText, isBreak, SURFACES, type Surface } from './api-diff.ts';
import { readFiles } from './git.ts';
import { openSource } from './snapshot-source.ts';
import { lineOf, withLines } from './source-line.ts';

export const EXIT_BREAKS = 3;

export const DIFF_USAGE = `usage: diff [--repo <shopware clone>] --base <ref|release> --head <ref|release> [options]

Compares the public API of two Shopware versions: what was removed or
changed without a deprecation in the base (a break), and what was newly
deprecated.

  --repo <dir>      a shopware/shopware clone: base and head are its refs
                    (branches, tags, commits), built on the spot and cached.
                    Without it, base and head are releases from the index
                    (6.6.10.4, 6.7.0.0, trunk), downloaded once a week.
  --surface <list>  route,entity,feature,config,admin,storefront,twig,build,php
                    (default: all but php; core's bc-check covers PHP)
  --index <file>    api-index.json.gz; else $API_INDEX or the cached download
  --cache <dir>     where built snapshots are cached
  --no-fetch        never download the index
  --json            the changes as JSON

Exit code: 0 no breaking change, 3 breaking changes found, 2 usage error.
`;

function isSurface(value: string): value is Surface {
  return SURFACES.some((surface) => surface === value);
}

export interface Io {
  out: (text: string) => void;
  err: (text: string) => void;
  env: NodeJS.ProcessEnv;
}

/** The Io of a bin: stdout, stderr and the process environment. */
export function processIo(): Io {
  return {
    out: (text) => {
      process.stdout.write(text);
    },
    err: (text) => {
      process.stderr.write(text);
    },
    env: process.env,
  };
}

export async function runDiff(args: string[], io: Io): Promise<number> {
  const { values } = parseArgs({
    args,
    options: {
      repo: { type: 'string' },
      base: { type: 'string' },
      head: { type: 'string' },
      surface: { type: 'string', default: SURFACES.filter((surface) => surface !== 'php').join(',') },
      index: { type: 'string' },
      cache: { type: 'string' },
      'no-fetch': { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });
  if (values.help) {
    io.out(DIFF_USAGE);
    return 0;
  }
  const surfaces = values.surface.split(',').map((part) => part.trim());
  const unknown = surfaces.filter((surface) => !isSurface(surface));
  if (values.base === undefined || values.head === undefined || unknown.length > 0) {
    if (unknown.length > 0) io.err(`unknown surface: ${unknown.join(', ')}\n`);
    io.err(DIFF_USAGE);
    return 2;
  }
  const source = await openSource(
    { repo: values.repo, index: values.index, cache: values.cache, fetch: !values['no-fetch'] },
    io.env,
  );
  const base = source(values.base);
  const head = source(values.head);
  if (base === undefined || head === undefined) {
    const missing = [base === undefined ? values.base : undefined, head === undefined ? values.head : undefined];
    io.err(`not in the index: ${missing.filter((name) => name !== undefined).join(', ')}\n`);
    return 2;
  }
  let diff: ApiDiff = diffSnapshots(
    base,
    head,
    surfaces.filter((surface) => isSurface(surface)),
  );
  const { repo } = values;
  if (repo !== undefined) diff = withLines(diff, (ref, files) => readFiles(repo, ref, files), lineOf);
  io.out(values.json ? `${JSON.stringify(diff, null, 2)}\n` : diffText(diff));
  return diff.changes.some((change) => isBreak(change)) ? EXIT_BREAKS : 0;
}
