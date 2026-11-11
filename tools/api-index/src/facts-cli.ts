// The api-facts command, shared by bin/api-facts.ts and the
// shopware-api-index npm package the skills run. Exit codes: 0 a report (facts are not
// findings, so finding some is not an error), 2 usage, 1 any other error.
import { readFileSync, rmSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { appliedCopy, type DiffLines, parseDiff } from './diff.ts';
import type { Io } from './diff-cli.ts';
import { Lookup } from './facts.ts';
import { formatRuns } from './runs.ts';
import { locateIndex } from './locate.ts';
import { coreConstraint, describe, factsOfDir, kindRank, type Report, type ReportFact } from './report.ts';
import { loadTimeline } from './store.ts';
import type { Timeline } from './timeline.ts';

export const FACTS_USAGE = `usage: facts [options] <extension dir>

Lists, for every Shopware release the extension's composer range allows,
the Shopware API it uses that is missing, deprecated, internal or
experimental there: PHP classes and members, admin components and blocks,
storefront templates, blocks and JS plugins, and Twig functions. A class
that moved and keeps its old name as a runtime alias is listed as moved.
A block whose body core reworked is listed as changed, with the releases
that changed it: the override still renders, so judge it against the new
markup.

  --range <constraint>  instead of shopware/core in composer.json
  --diff <patch|->      the tree has the change; report only what it adds
  --apply <patch>       apply the patch to a copy of the tree first
  --index <file>        api-index.json.gz; else $API_INDEX or the cached download
  --no-fetch            never download the index
  --json                the full report as JSON

These are facts from the source of each release, not findings.
`;

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

/** Counts by kind, the ones that break a release first. */
export function factsSummary(facts: readonly { kind: string }[]): string {
  const counts = new Map<string, number>();
  for (const fact of facts) counts.set(fact.kind, (counts.get(fact.kind) ?? 0) + 1);
  const parts = [...counts]
    .toSorted(([a], [b]) => kindRank(a) - kindRank(b))
    .map(([kind, count]) => `${count} ${kind}`);
  return `Summary: ${facts.length} ${facts.length === 1 ? 'fact' : 'facts'}${parts.length === 0 ? '' : ` (${parts.join(', ')})`}.`;
}

const NEARBY_SHOWN = 6;

/** `; blocks there: a (whole range), b, +3 more; core template at 6.7.0.0: <url>`
 *  for a missing block. */
export function nearbyText(fact: ReportFact): string {
  if (fact.nearby === undefined || fact.nearby.length === 0) return '';
  const shown = fact.nearby
    .slice(0, NEARBY_SHOWN)
    .map((block) => `${block.name}${block.throughout ? ' (whole range)' : ''}`);
  const more = fact.nearby.length - shown.length;
  const source = fact.source === undefined ? '' : `; core template at ${fact.releases[0]?.[0] ?? ''}: ${fact.source}`;
  return `; blocks there: ${shown.join(', ')}${more > 0 ? `, +${more} more` : ''}${source}`;
}

export function factsText(report: Report, timeline: Timeline, note: string | undefined): string {
  const out = [header(report, timeline, note), `${factsSummary(report.facts)}\n`];
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
    out.push(`- ${fact.target.replace(/^php:/u, '')}: ${describe(fact)}${guarded}${nearbyText(fact)}  [${at}]\n`);
  }
  if (report.facts.length === 0) out.push('- no version facts for this code\n');
  if (report.unresolved > 0)
    out.push(`- ${report.unresolved} method calls not checked (receiver type unknown in the file)\n`);
  if (report.failed.length > 0) out.push(`- not parsed: ${report.failed.join(', ')}\n`);
  out.push(
    'These are facts from the source of each release, not findings: judge each one by where the plugin runs that code in those releases.\n',
  );
  return out.join('');
}

export async function runFacts(args: string[], io: Io): Promise<number> {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      index: { type: 'string' },
      range: { type: 'string' },
      diff: { type: 'string' },
      apply: { type: 'string' },
      'no-fetch': { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });
  if (values.help) {
    io.out(FACTS_USAGE);
    return 0;
  }
  const [given] = positionals;
  if (given === undefined || (values.diff !== undefined && values.apply !== undefined)) {
    io.err(FACTS_USAGE);
    return 2;
  }
  const patch = values.apply ?? values.diff;
  const diff: DiffLines | undefined =
    patch === undefined ? undefined : parseDiff(readFileSync(patch === '-' ? 0 : patch, 'utf8'));
  const dir = values.apply === undefined ? given : appliedCopy(given, values.apply);
  try {
    const range = values.range ?? coreConstraint(dir);
    if (range === undefined) {
      io.err(`${given}: no --range and no shopware/core in composer.json\n`);
      return 2;
    }
    const located = await locateIndex(values.index, io.env, !values['no-fetch']);
    const timeline = loadTimeline(located.path);
    const report = factsOfDir(new Lookup(timeline), dir, range, diff);
    report.dir = given;
    io.out(values.json ? `${JSON.stringify(report, null, 2)}\n` : factsText(report, timeline, located.note));
    return 0;
  } finally {
    if (dir !== given) rmSync(dir, { recursive: true, force: true });
  }
}
