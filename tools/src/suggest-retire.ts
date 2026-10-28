// Retirement candidates for `suggest-rules` (plan WP12 step 4), from
// deterministic evidence only; the agent only explains them:
//
//   enforced  a check in `enforced_by` catches the rule, and its
//             `extensions_run` proves plugins and apps run it, so it
//             belongs in "Already enforced"
//   api       every class the rule names is gone from the API index in
//             every supported release
//   ab        the latest A/B baseline passes the rule's task with the skill
//             off in every repeat, so the delta principle no longer holds
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { type Catalog, isActive, type Rule } from './catalog.ts';
import { type AbResult, latestPerTask, parseResults } from './eval-results.ts';
import { errorMessage } from './errors.ts';
import type { Signal } from './signals.ts';
import { currentRuleText } from './suggest-checks.ts';
import type { Cluster } from './suggest-cluster.ts';
import { compareText } from './text.ts';

export const RETIRE_KINDS = ['enforced', 'api', 'ab'] as const;
export type RetireKind = (typeof RETIRE_KINDS)[number];

export interface RetireCandidate {
  rule: string;
  skill: string;
  kind: RetireKind;
  /** The evidence in a sentence. */
  evidence: string;
}

/** Active rules a retirement pass may propose: not those with a
 *  `keep_reason`, which stay for weaker models although no A/B shows an effect. */
export const retirable = (r: Rule): boolean => isActive(r) && r.keep_reason === undefined;

/** Rules whose `enforced_by` has a check that extensions provably run.
 *  "Not trunk-only" is not enough: an opt-in PHPStan package or a guard
 *  that needs Shopware's test bootstrap exists outside core, yet most
 *  plugins never run it. */
export function enforcedCandidates(catalog: Catalog): RetireCandidate[] {
  return catalog.rules.filter(retirable).flatMap((r) => {
    const checks = (r.trunk?.enforced_by ?? []).filter((e) => !e.trunk_only && e.extensions_run !== undefined);
    return checks.length === 0
      ? []
      : [
          {
            rule: r.id,
            skill: r.skill,
            kind: 'enforced' as const,
            evidence: checks
              .map((e) => `\`${e.tool}\` (${e.kind}) runs in extensions: ${e.extensions_run ?? ''}`)
              .join('; '),
          },
        ];
  });
}

/** The latest baseline in `evals/baselines/`, or undefined. */
export function latestBaseline(root: string): string | undefined {
  const dir = join(root, 'evals/baselines');
  if (!existsSync(dir)) return undefined;
  const file = readdirSync(dir)
    .filter((f) => f.endsWith('.jsonl'))
    .toSorted(compareText)
    .at(-1);
  return file === undefined ? undefined : join(dir, file);
}

const offPassesAll = (r: AbResult): boolean =>
  r.repeats > 0 && r.off === r.repeats && (r.off_done ?? r.repeats) === r.repeats;

/** Rules whose task the skill-off arm passes in every repeat. */
export function abCandidates(catalog: Catalog, results: AbResult[], file: string): RetireCandidate[] {
  const byTask = new Map(latestPerTask(results).map((r) => [r.task, r]));
  return catalog.rules.filter(retirable).flatMap((rule) => {
    const r = rule.eval === null ? undefined : byTask.get(rule.eval);
    return r === undefined || !offPassesAll(r)
      ? []
      : [
          {
            rule: rule.id,
            skill: rule.skill,
            kind: 'ab' as const,
            evidence: `skill off passed \`${r.task}\` ${r.off}/${r.repeats} in ${file}`,
          },
        ];
  });
}

export const readBaseline = (path: string): AbResult[] => parseResults(readFileSync(path, 'utf8'));

// ---- the API index -------------------------------------------------------------

type Json = Record<string, unknown>;
const isRecord = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

export interface ApiIndex {
  /** Release names, oldest first, as the timeline orders them. */
  releases: string[];
  /** Class-like items: FQCN and short name -> the index of the last release
   *  each copy is present in. */
  lastSeen: Map<string, number[]>;
}

const CLASS_KINDS = new Set(['class', 'interface', 'trait', 'enum']);

/** The parts of the timeline (`api-index.json.gz`) this check needs. */
export function readApiIndex(path: string): ApiIndex {
  const raw = readFileSync(path);
  const value: unknown = JSON.parse((path.endsWith('.gz') ? gunzipSync(raw) : raw).toString('utf8'));
  if (!isRecord(value) || !Array.isArray(value.releases) || !Array.isArray(value.items))
    throw new Error(`${path} is not an API index timeline`);
  const releases = value.releases.map((r: unknown) => (isRecord(r) && typeof r.release === 'string' ? r.release : ''));
  const position = new Map(releases.map((r, i) => [r, i]));
  const lastSeen = new Map<string, number[]>();
  for (const item of value.items) {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.kind !== 'string') continue;
    if (!CLASS_KINDS.has(item.kind) || !item.id.startsWith('php:') || !Array.isArray(item.present)) continue;
    const ends = item.present.map((range: unknown) => {
      if (!Array.isArray(range)) return -1;
      const end: unknown = range[1];
      return end === null ? releases.length - 1 : (position.get(typeof end === 'string' ? end : '') ?? -1);
    });
    const last = Math.max(-1, ...ends);
    const fqcn = item.id.slice(4);
    for (const name of [fqcn, fqcn.split('\\').at(-1) ?? fqcn])
      lastSeen.set(name, [...(lastSeen.get(name) ?? []), last]);
  }
  return { releases, lastSeen };
}

/** `6.6.0.0` before `6.10.0.0`; `trunk` last. */
function versionAtLeast(release: string, from: string): boolean {
  if (release === 'trunk') return true;
  const a = release.split('.').map(Number);
  const b = from.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d > 0;
  }
  return true;
}

/** Class names a rule's text names in code spans. */
export const symbolsIn = (text: string): string[] => [
  ...new Set([...text.matchAll(/`\\?([A-Z][A-Za-z0-9_]*(?:\\[A-Z][A-Za-z0-9_]*)*)`/gu)].map((m) => m[1] ?? '')),
];

/** Rules every named class of which is gone in all releases from
 *  `supportedFrom` on. `textOf` gives a rule's current text. */
export function apiCandidates(
  catalog: Catalog,
  index: ApiIndex,
  supportedFrom: string,
  textOf: (rule: Rule) => string,
): RetireCandidate[] {
  const first = index.releases.findIndex((r) => versionAtLeast(r, supportedFrom));
  if (first < 0) return [];
  return catalog.rules.filter(retirable).flatMap((rule) => {
    const known = symbolsIn(textOf(rule)).filter((s) => index.lastSeen.has(s));
    const gone = known.filter((s) => (index.lastSeen.get(s) ?? []).every((last) => last < first));
    return known.length === 0 || gone.length < known.length
      ? []
      : [
          {
            rule: rule.id,
            skill: rule.skill,
            kind: 'api' as const,
            evidence: `${gone.map((s) => `\`${s}\``).join(', ')} not in any release since ${supportedFrom}`,
          },
        ];
  });
}

export interface RetireOptions {
  root: string;
  skill?: string;
  /** A/B results file; the A/B check is skipped without one. */
  baseline?: string;
  /** API index timeline; the API check is skipped when it is missing. */
  apiIndex?: string;
  supportedFrom: string;
}

/** Every retirement candidate; `notes` gets what could not be checked. */
export function retirements(o: RetireOptions, catalog: Catalog, notes: string[]): RetireCandidate[] {
  const found = enforcedCandidates(catalog);
  if (o.baseline !== undefined && existsSync(o.baseline))
    found.push(...abCandidates(catalog, readBaseline(o.baseline), o.baseline.replace(`${o.root}/`, '')));
  if (o.apiIndex !== undefined && existsSync(o.apiIndex)) {
    try {
      const index = readApiIndex(o.apiIndex);
      found.push(...apiCandidates(catalog, index, o.supportedFrom, (r) => currentRuleText(o.root, catalog, r.id)));
    } catch (error) {
      notes.push(`API index: ${errorMessage(error)}`);
    }
  } else {
    notes.push('API index not found; the API retirement check was skipped');
  }
  return found.filter((c) => o.skill === undefined || c.skill === o.skill);
}

/** A retirement candidate as a cluster of one pseudo-signal whose URL is
 *  the evidence ID, so the agent's answer goes through the same checks. */
export function retirementCluster(c: RetireCandidate): Cluster {
  const id = `retire:${c.kind}:${c.rule}`;
  const signal: Signal = {
    id,
    source: 'retirement',
    kind: 'api-break',
    repo: '',
    url: id,
    date: '',
    path: '',
    text: c.evidence,
    map: [{ skill: c.skill, rules: [c.rule], via: 'source' }],
  };
  return { key: id, skill: c.skill, rules: [c.rule], signals: [{ signal, weight: 1 }], score: 0 };
}
