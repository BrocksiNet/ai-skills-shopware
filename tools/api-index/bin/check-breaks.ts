// check-breaks: measures api-diff against the breaks the UPGRADE files name
// (known-breaks.json). Recall is the share of known breaks found, precision
// the share of reported breaks a known break or a checked confirmation
// explains. Exits 1 when either is below the gate.
//
//   node tools/api-index/bin/check-breaks.ts --repo ~/shopware
//   node tools/api-index/bin/check-breaks.ts --major 6.7
//
//     --repo <dir>      build the refs from a shopware/shopware clone; else the index
//     --known <file>    the known breaks (default: known-breaks.json next to bin/)
//     --major <list>    only these majors
//     --gate <share>    the bar for recall and precision (default 0.9)
//     --index, --cache, --no-fetch as for api-diff
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { errorMessage } from '../../src/errors.ts';
import { diffSnapshots } from '../src/api-diff.ts';
import { checkMajor, isKnownBreaks, type Major, type MajorResult, resultText, totals } from '../src/known-breaks.ts';
import { openSource } from '../src/snapshot-source.ts';
import { readJson } from '../src/store.ts';

const KNOWN = fileURLToPath(new URL('../known-breaks.json', import.meta.url));

/** Reject misspelled selectors rather than passing an empty comparison. */
function selectedMajors(majors: Major[], selector: string | undefined): Major[] {
  const wanted = selector?.split(',').map((part) => part.trim());
  for (const name of wanted ?? [])
    if (!majors.some((major) => major.major === name)) throw new Error(`unknown major: ${name}`);
  const selected = wanted === undefined ? majors : majors.filter((major) => wanted.includes(major.major));
  if (selected.length === 0) throw new Error('no majors selected for comparison');
  return selected;
}

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      repo: { type: 'string' },
      known: { type: 'string', default: KNOWN },
      major: { type: 'string' },
      gate: { type: 'string', default: '0.9' },
      index: { type: 'string' },
      cache: { type: 'string' },
      'no-fetch': { type: 'boolean', default: false },
    },
  });
  const known = readJson(values.known);
  if (!isKnownBreaks(known)) throw new Error(`${values.known}: not a known-breaks file`);
  const gate = Number(values.gate);
  if (values.gate.trim() === '' || !Number.isFinite(gate) || gate < 0 || gate > 1)
    throw new Error('--gate must be a number between 0 and 1');
  const selected = selectedMajors(known.majors, values.major);
  const source = await openSource(
    { repo: values.repo, index: values.index, cache: values.cache, fetch: !values['no-fetch'] },
    process.env,
  );
  const results: MajorResult[] = [];
  for (const major of selected) {
    const base = source(major.base);
    const head = source(major.head);
    if (base === undefined || head === undefined) throw new Error(`${major.base} or ${major.head} not in the index`);
    if (base.failed.length > 0 || head.failed.length > 0)
      throw new Error('cannot compare snapshots with parse failures');
    const diff = diffSnapshots(base, head, ['route', 'entity', 'feature', 'config']);
    results.push(checkMajor(major, known, diff.changes, head));
  }
  process.stdout.write(resultText(results, gate));
  const { recall, precision } = totals(results);
  return recall >= gate && precision >= gate ? 0 : 1;
}

try {
  process.exitCode = await main();
} catch (error) {
  process.stderr.write(`check-breaks: ${errorMessage(error)}\n`);
  process.exitCode = 2;
}
