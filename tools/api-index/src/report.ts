// The facts for an extension: its PHP read with the use extractor, each
// Shopware symbol looked up over the releases of its range. A diff narrows
// the report to what the change adds, unless it changes the range itself.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { DiffLines } from './diff.ts';
import { type Fact, factsFor, formatRuns, type Lookup, presentThroughout, releasesIn } from './facts.ts';
import { isNode } from './node.ts';
import { frontendUses, isFrontendFile } from './frontend-uses.ts';
import { memberOwner } from './surfaces.ts';
import { phpUses, type Use } from './uses.ts';

const SKIP_DIRS = new Set(['vendor', 'node_modules', '.git', 'tests', 'Tests', 'test', 'Test']);

/** PHP files, and the admin, storefront and template files the frontend reader wants. */
function sourceFiles(dir: string, root: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (!SKIP_DIRS.has(name)) out.push(...sourceFiles(path, root));
    } else if (name.endsWith('.php') || isFrontendFile(relative(root, path))) out.push(path);
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

export type ReportFact = Fact & {
  uses: Use[];
  /** For a missing symbol: the guard that covers it, its own or its class's. */
  guard?: Use;
  /** Releases a class guard leaves open: the member is missing there, the class is not. */
  unguarded?: [string, string][];
};

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
  const out: Read = { files: sourceFiles(root, dir), failed: [], uses: [], unresolved: 0 };
  const frontend = new Map<string, string>();
  for (const file of out.files) {
    if (!file.endsWith('.php')) {
      frontend.set(relative(dir, file), readFileSync(file, 'utf8'));
      continue;
    }
    try {
      const result = phpUses(readFileSync(file, 'utf8'), relative(dir, file));
      out.uses.push(...result.uses);
      out.unresolved += result.unresolved;
    } catch {
      out.failed.push(relative(dir, file));
    }
  }
  const result = frontendUses(frontend);
  out.uses.push(...result.uses);
  out.failed.push(...result.failed);
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

/** The release names of `[first, last]` runs, in range order. */
function expand(runs: [string, string][], releases: string[]): string[] {
  return runs.flatMap(([first, last]) => releases.slice(releases.indexOf(first), releases.indexOf(last) + 1));
}

/** Collapses release names back into `[first, last]` runs of the range. */
function collapse(names: string[], releases: string[]): [string, string][] {
  const out: [string, string][] = [];
  let previous = -2;
  for (const index of names.map((name) => releases.indexOf(name)).toSorted((a, b) => a - b)) {
    const run = out.at(-1);
    if (run !== undefined && index === previous + 1) run[1] = releases[index] ?? run[1];
    else out.push([releases[index] ?? '', releases[index] ?? '']);
    previous = index;
  }
  return out;
}

/** Names the guard of each missing symbol: its own `method_exists`, or the
 *  `class_exists` of its class, which covers only the releases without the
 *  class. A member that arrived after its class stays open in between. */
function attachGuards(facts: ReportFact[], uses: Use[], releases: string[]): void {
  const guards = new Map(uses.filter((use) => use.how === 'guard').map((use) => [use.target, use]));
  const missing = new Map(
    facts.filter((fact) => fact.kind === 'missing').map((fact) => [fact.target, expand(fact.releases, releases)]),
  );
  for (const fact of facts.filter((candidate) => candidate.kind === 'missing')) {
    const owner = fact.target.split('::')[0] ?? '';
    const guard = guards.get(fact.target) ?? (owner === fact.target ? undefined : guards.get(owner));
    if (guard === undefined) continue;
    fact.guard = guard;
    if (guard.target === fact.target) continue;
    const classMissing = new Set(missing.get(owner));
    const open = expand(fact.releases, releases).filter((release) => !classMissing.has(release));
    if (open.length > 0) fact.unguarded = collapse(open, releases);
  }
}

/** A diff that changes composer.json may change the range: every fact counts then. */
function narrowTo(diff: DiffLines | undefined): ((use: Use) => boolean) | undefined {
  if (diff === undefined || diff.files.has('composer.json')) return undefined;
  return (use) => diff.added.get(use.file)?.has(use.line) === true;
}

/** PHP targets always; a frontend target when the index has it or its owner. */
function fromShopware(lookup: Lookup, target: string): boolean {
  if (target.startsWith('php:')) return true;
  const owner = memberOwner(target);
  return lookup.get(target) !== undefined || (owner !== undefined && lookup.get(owner) !== undefined);
}

export function factsOfDir(lookup: Lookup, dir: string, range: string, diff?: DiffLines): Report {
  const releases = releasesIn(lookup.timeline, range);
  const read = readExtension(dir);
  const byTarget = new Map<string, Use[]>();
  for (const use of read.uses.filter((candidate) => fromShopware(lookup, candidate.target)))
    byTarget.set(use.target, [...(byTarget.get(use.target) ?? []), use]);
  const inDiff = narrowTo(diff);
  const all = [...byTarget].flatMap(([target, list]) => symbolFacts(lookup, target, list, releases));
  attachGuards(all, read.uses, releases);
  const facts = all
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
