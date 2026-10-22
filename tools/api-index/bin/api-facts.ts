// api-facts: does an extension's PHP fit the Shopware releases its composer
// range allows? Prints facts from the public API index, not findings.
//
//   node tools/api-index/bin/api-facts.ts [options] <extension dir>
//     --range <constraint>  instead of shopware/core in composer.json
//     --diff <patch|->      the tree has the change; report what it adds
//     --apply <patch>       apply the patch to a copy of the tree first
//     --index <file>        api-index.json.gz; else $API_INDEX or the cached release asset
//     --no-fetch            never download the index
//     --json                the full report as JSON
import { readFileSync, rmSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { appliedCopy, type DiffLines, parseDiff } from '../src/diff.ts';
import { formatRuns, Lookup } from '../src/facts.ts';
import { locateIndex } from '../src/locate.ts';
import { coreConstraint, describe, factsOfDir, type Report } from '../src/report.ts';
import { loadTimeline } from '../src/store.ts';
import type { Timeline } from '../src/timeline.ts';

const USAGE =
  'usage: api-facts.ts [--range <constraint>] [--diff <patch|->] [--apply <patch>] [--index <file>] [--no-fetch] [--json] <extension dir>\n';

function header(report: Report, timeline: Timeline, note: string | undefined): string {
  const releases = timeline.releases.filter((release) => /^\d/u.test(release.release));
  const newest = releases.at(-1);
  const built =
    releases
      .map((release) => release.builtAt.slice(0, 10))
      .toSorted()
      .at(-1) ?? '?';
  const scope = report.narrowed ? 'Shopware API this change adds' : 'Shopware API this extension uses';
  const lines = [
    `${scope}, checked against ${report.releases[0] ?? '?'} … ${report.releases.at(-1) ?? '?'}` +
      ` (${report.releases.length} releases of ${report.range}; api-index built ${built}, newest ${newest?.release ?? '?'}):`,
  ];
  if (note !== undefined) lines.push(`Note: ${note}.`);
  return `${lines.join('\n')}\n`;
}

function text(report: Report, timeline: Timeline, note: string | undefined): string {
  const out = [header(report, timeline, note)];
  for (const fact of report.facts) {
    const at = fact.uses
      .map((use) => `${use.file}:${use.line}`)
      .slice(0, 3)
      .join(', ');
    const guard = fact.guard === undefined ? '' : `${fact.guard.file}:${fact.guard.line}`;
    const guarded =
      fact.guard === undefined
        ? ''
        : fact.unguarded === undefined
          ? `, guarded at ${guard}`
          : `, not guarded in ${formatRuns(fact.unguarded)}: the class guard at ${guard} only covers releases without the class`;
    out.push(`- ${fact.target.replace(/^php:/u, '')}: ${describe(fact)}${guarded}  [${at}]\n`);
  }
  if (report.facts.length === 0) out.push('- no version facts for this code\n');
  if (report.unresolved > 0)
    out.push(`- ${report.unresolved} method calls not checked (receiver type unknown in the file)\n`);
  if (report.failed.length > 0) out.push(`- not parsed: ${report.failed.join(', ')}\n`);
  out.push(
    'These are facts from the source of each release, not findings. Check each one against the code before you report it.\n',
  );
  return out.join('');
}

async function main(): Promise<number> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      index: { type: 'string' },
      range: { type: 'string' },
      diff: { type: 'string' },
      apply: { type: 'string' },
      'no-fetch': { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
    },
  });
  const [given] = positionals;
  if (given === undefined || (values.diff !== undefined && values.apply !== undefined)) {
    process.stderr.write(USAGE);
    return 2;
  }
  const patch = values.apply ?? values.diff;
  const diff: DiffLines | undefined =
    patch === undefined ? undefined : parseDiff(readFileSync(patch === '-' ? 0 : patch, 'utf8'));
  const dir = values.apply === undefined ? given : appliedCopy(given, values.apply);
  try {
    const range = values.range ?? coreConstraint(dir);
    if (range === undefined) {
      process.stderr.write(`${given}: no --range and no shopware/core in composer.json\n`);
      return 2;
    }
    const located = await locateIndex(values.index, process.env, !values['no-fetch']);
    const timeline = loadTimeline(located.path);
    const report = factsOfDir(new Lookup(timeline), dir, range, diff);
    report.dir = given;
    process.stdout.write(values.json ? `${JSON.stringify(report, null, 2)}\n` : text(report, timeline, located.note));
    return 0;
  } finally {
    if (dir !== given) rmSync(dir, { recursive: true, force: true });
  }
}

process.exitCode = await main();
