// The facts for an extension: its PHP read with the use extractor, each
// Shopware symbol looked up over the releases of its range. A diff narrows
// the report to what the change adds, unless it changes the range itself.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { DiffLines } from './diff.ts';
import { type Fact, factsFor, formatRuns, type Lookup, presentThroughout, releasesIn } from './facts.ts';
import { isNode } from './node.ts';
import { phpUses, type Use } from './uses.ts';

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

export type ReportFact = Fact & { uses: Use[] };

export interface Report {
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
  /** True when a diff narrowed the facts to the lines it adds. */
  narrowed: boolean;
  facts: ReportFact[];
}

interface Read {
  files: string[];
  failed: string[];
  uses: Use[];
  unresolved: number;
}

function readExtension(dir: string): Read {
  // The extension's own code; tool and cache folders next to it are not.
  const root = existsSync(join(dir, 'src')) ? join(dir, 'src') : dir;
  const out: Read = { files: phpFiles(root), failed: [], uses: [], unresolved: 0 };
  for (const file of out.files) {
    try {
      const result = phpUses(readFileSync(file, 'utf8'), relative(dir, file));
      out.uses.push(...result.uses);
      out.unresolved += result.unresolved;
    } catch {
      out.failed.push(relative(dir, file));
    }
  }
  return out;
}

/** Facts of one symbol, plus `guarded-everywhere` for a guard that is never false. */
function symbolFacts(lookup: Lookup, target: string, uses: Use[], releases: string[]): ReportFact[] {
  // An import only matters when nothing else in the file uses the class.
  const how = uses.some((use) => use.how === 'extends') ? 'extends' : (uses[0]?.how ?? 'import');
  const facts: ReportFact[] = factsFor(lookup, target, how, releases).map((fact) => Object.assign(fact, { uses }));
  const guards = uses.filter((use) => use.how === 'guard');
  const first = releases[0];
  const last = releases.at(-1);
  if (guards.length > 0 && first !== undefined && last !== undefined && presentThroughout(lookup, target, releases)) {
    facts.push({ target, kind: 'guarded-everywhere', releases: [[first, last]], uses: guards });
  }
  return facts;
}

/** A diff that changes composer.json may change the range: every fact counts then. */
function narrowTo(diff: DiffLines | undefined): ((use: Use) => boolean) | undefined {
  if (diff === undefined || diff.files.has('composer.json')) return undefined;
  return (use) => diff.added.get(use.file)?.has(use.line) === true;
}

export function factsOfDir(lookup: Lookup, dir: string, range: string, diff?: DiffLines): Report {
  const releases = releasesIn(lookup.timeline, range);
  const read = readExtension(dir);
  const byTarget = new Map<string, Use[]>();
  for (const use of read.uses) byTarget.set(use.target, [...(byTarget.get(use.target) ?? []), use]);
  const inDiff = narrowTo(diff);
  const facts = [...byTarget]
    .flatMap(([target, list]) => symbolFacts(lookup, target, list, releases))
    .filter((fact) => inDiff === undefined || fact.uses.some(inDiff))
    .toSorted((a, b) => a.kind.localeCompare(b.kind) || a.target.localeCompare(b.target));
  return {
    dir,
    range,
    releases,
    files: read.files.length,
    failed: read.failed,
    uses: read.uses.length,
    targets: byTarget.size,
    symbols: [...byTarget.keys()].toSorted(),
    unresolved: read.unresolved,
    narrowed: inDiff !== undefined,
    facts,
  };
}

export function describe(fact: Fact): string {
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
    case 'guarded-everywhere':
      return `guarded, but present in every release of the range (${where})`;
  }
  return fact.kind;
}
