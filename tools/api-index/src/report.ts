// The facts for an extension: its PHP read with the use extractor, each
// Shopware symbol looked up over the releases of its range. A diff narrows
// the report to what the change adds, unless it changes the range itself.
import { chainTargets, isChain } from './chains.ts';
import type { DiffLines } from './diff.ts';
import { type Fact, factsFor, type Lookup, presentThroughout } from './facts.ts';
import { collapse, expand, formatRuns, releasesIn } from './runs.ts';
import { attachNearby, type Nearby } from './nearby.ts';
import { readExtension } from './extension-read.ts';
import { memberOwner } from './surfaces.ts';
import type { Use } from './uses.ts';

export type ReportFact = Fact & {
  uses: Use[];
  /** For a missing symbol: the guard that covers it, its own or its class's. */
  guard?: Use;
  /** Releases a class guard leaves open: the member is missing there, the class is not. */
  unguarded?: [string, string][];
  /** For a missing block: blocks of its owner that exist in those releases, nearest by name first. */
  nearby?: Nearby[];
  /** For a missing block: core's template at the first release it is missing in. */
  source?: string;
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

interface Chains {
  /** Chains that resolve to different targets across the range: each with its releases. */
  split: { target: string; uses: Use[]; within: string[] }[];
  /** Chain uses no release of the range resolves. */
  unresolved: number;
}

/** Replaces each chain target in `byTarget` by what it resolves to. A chain
 *  that names one target throughout joins that target's uses; one that
 *  changes across the range is checked per part of the range. */
function resolveChains(lookup: Lookup, byTarget: Map<string, Use[]>, releases: string[]): Chains {
  const out: Chains = { split: [], unresolved: 0 };
  for (const [target, uses] of [...byTarget].filter(([candidate]) => isChain(candidate))) {
    byTarget.delete(target);
    const resolved = [...chainTargets(lookup, target, releases)];
    if (resolved.length === 0) out.unresolved += uses.length;
    const [only] = resolved;
    if (resolved.length === 1 && only !== undefined && only[1].length === releases.length) {
      byTarget.set(only[0], [...(byTarget.get(only[0]) ?? []), ...uses]);
    } else for (const [resolvedTarget, within] of resolved) out.split.push({ target: resolvedTarget, uses, within });
  }
  return out;
}

/** Fact kinds, the ones that break a release first. */
export const KIND_ORDER = [
  'missing',
  'changed',
  'final-extended',
  'internal',
  'deprecated',
  'experimental',
  'bc-change',
  'moved',
  'guarded-everywhere',
];

/** The place of a kind in `KIND_ORDER`; unknown kinds go last. */
export function kindRank(kind: string): number {
  return KIND_ORDER.indexOf(kind) + 1 || 99;
}

export function factsOfDir(lookup: Lookup, dir: string, range: string, diff?: DiffLines): Report {
  const releases = releasesIn(lookup.timeline, range);
  const read = readExtension(dir);
  const byTarget = new Map<string, Use[]>();
  for (const use of read.uses.filter((candidate) => fromShopware(lookup, candidate.target)))
    byTarget.set(use.target, [...(byTarget.get(use.target) ?? []), use]);
  const inDiff = narrowTo(diff);
  const chains = resolveChains(lookup, byTarget, releases);
  const all = [
    ...[...byTarget].flatMap(([target, list]) => symbolFacts(lookup, target, list, releases)),
    ...chains.split.flatMap(({ target, uses, within }) => symbolFacts(lookup, target, uses, within)),
  ];
  attachGuards(all, read.uses, releases);
  attachNearby(all, lookup, releases);
  const facts = all
    .filter((fact) => inDiff === undefined || fact.uses.some(inDiff))
    .toSorted((a, b) => kindRank(a.kind) - kindRank(b.kind) || a.target.localeCompare(b.target));
  return {
    dir,
    range,
    releases,
    files: read.files.length,
    failed: read.failed,
    uses: read.uses.length,
    targets: byTarget.size,
    symbols: [...new Set([...byTarget.keys(), ...chains.split.map(({ target }) => target)])].toSorted(),
    unresolved: read.unresolved + chains.unresolved,
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
    case 'changed':
      return `body changed in ${where}`;
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
    case 'moved':
      return (
        `a runtime alias of ${(fact.value ?? '').replace(/^php:/u, '')} in ${where}` +
        (fact.until === undefined ? '' : `; the old name goes away in ${fact.until}`)
      );
  }
  return fact.kind;
}

export { coreConstraint } from './extension-read.ts';
