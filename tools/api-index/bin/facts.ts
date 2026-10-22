// Phase 1 measurement: the facts the timeline gives for the Shopware API an
// extension's PHP uses, over its composer range. Phase 2 turns this into
// `tools/bin/api-facts.ts`; this one needs php-parser to read the extension.
//
//   node tools/api-index/bin/facts.ts --index api-index.json.gz [--range '~6.6.0 || ~6.7.0'] [--json] <extension dir>
//
// Without --range it reads `shopware/core` from the extension's composer.json.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseArgs } from 'node:util';
import { factsFor, type Fact, formatRuns, Lookup, releasesIn } from '../src/facts.ts';
import { isNode } from '../src/node.ts';
import { loadTimeline } from '../src/store.ts';
import { phpUses, type Use } from '../src/uses.ts';

const SKIP_DIRS = new Set(['vendor', 'node_modules', '.git', 'tests', 'Tests', 'test', 'Test']);

function phpFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (!SKIP_DIRS.has(name)) out.push(...phpFiles(path));
    } else if (name.endsWith('.php')) out.push(path);
  }
  return out;
}

/** `require.shopware/core` of the extension, if it has one. */
export function coreConstraint(dir: string): string | undefined {
  const path = join(dir, 'composer.json');
  if (!existsSync(path)) return undefined;
  const composer: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!isNode(composer) || !isNode(composer.require)) return undefined;
  const core = composer.require['shopware/core'];
  return typeof core === 'string' ? core : undefined;
}

interface Report {
  dir: string;
  range: string;
  releases: string[];
  files: number;
  failed: string[];
  uses: number;
  targets: number;
  /** Every Shopware class and member the extension refers to. */
  symbols: string[];
  unresolved: number;
  facts: (Fact & { uses: Use[] })[];
}

export function factsOfDir(lookup: Lookup, dir: string, range: string): Report {
  const releases = releasesIn(lookup.timeline, range);
  // The extension's own code; tool and cache folders next to it are not.
  const root = existsSync(join(dir, 'src')) ? join(dir, 'src') : dir;
  const files = phpFiles(root);
  const failed: string[] = [];
  const uses: Use[] = [];
  let unresolved = 0;
  for (const file of files) {
    try {
      const result = phpUses(readFileSync(file, 'utf8'), relative(dir, file));
      uses.push(...result.uses);
      unresolved += result.unresolved;
    } catch {
      failed.push(relative(dir, file));
    }
  }
  const byTarget = new Map<string, Use[]>();
  for (const use of uses) byTarget.set(use.target, [...(byTarget.get(use.target) ?? []), use]);
  const facts: Report['facts'] = [];
  for (const [target, list] of byTarget) {
    // An import only matters when nothing else in the file uses the class.
    const how = list.some((use) => use.how === 'extends') ? 'extends' : (list[0]?.how ?? 'import');
    for (const fact of factsFor(lookup, target, how, releases)) facts.push({ ...fact, uses: list });
  }
  facts.sort((a, b) => a.kind.localeCompare(b.kind) || a.target.localeCompare(b.target));
  return {
    dir,
    range,
    releases,
    files: files.length,
    failed,
    uses: uses.length,
    targets: byTarget.size,
    symbols: [...byTarget.keys()].toSorted(),
    unresolved,
    facts,
  };
}

function describe(fact: Fact): string {
  const where = formatRuns(fact.releases);
  const via = fact.via === undefined ? '' : ` (via ${fact.via.replace(/^php:/u, '')})`;
  switch (fact.kind) {
    case 'unknown':
      return 'not in the index for any release';
    case 'missing':
      return `missing in ${where}`;
    case 'deprecated':
      return `@deprecated${fact.value === '' || fact.value === undefined ? '' : ` ${fact.value}`} in ${where}${via}`;
    case 'experimental':
      return `@experimental in ${where}${via}`;
    case 'internal':
      return `@internal in ${where}${via}`;
    case 'final-extended':
      return `extended, but final in ${where}`;
    case 'bc-change':
      return `announced change ${fact.value ?? ''} in ${where}${via}`;
  }
  return fact.kind;
}

function main(): number {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { index: { type: 'string' }, range: { type: 'string' }, json: { type: 'boolean', default: false } },
  });
  const [dir] = positionals;
  if (values.index === undefined || dir === undefined) {
    process.stderr.write(
      'usage: facts.ts --index <api-index.json.gz> [--range <constraint>] [--json] <extension dir>\n',
    );
    return 2;
  }
  const range = values.range ?? coreConstraint(dir);
  if (range === undefined) {
    process.stderr.write(`${dir}: no --range and no shopware/core in composer.json\n`);
    return 2;
  }
  const report = factsOfDir(new Lookup(loadTimeline(values.index)), dir, range);
  if (values.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return 0;
  }
  const first = report.releases[0] ?? '?';
  const last = report.releases.at(-1) ?? '?';
  process.stdout.write(
    `Shopware API in ${dir} (${range}), checked against ${first} … ${last}, ${report.releases.length} releases:\n` +
      `${report.files} PHP files, ${report.targets} Shopware symbols, ${report.unresolved} calls not resolved, ${report.failed.length} files not parsed\n`,
  );
  for (const fact of report.facts) {
    const at = fact.uses[0];
    process.stdout.write(`- ${fact.target.replace(/^php:/u, '')}: ${describe(fact)}  [${at?.file}:${at?.line}]\n`);
  }
  return 0;
}

process.exitCode = main();
