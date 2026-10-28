// Signal to rule mapper (plan WP12 step 2). Ties a signal to the skills,
// references and rule IDs it touches, using only what the repo records:
//
//   1. core_guide_ids   a guide ID a rule cites
//   2. enforced_by      a rule class a rule cites
//   3. trunk.source     the file (and heading) a rule was taken from on trunk
//   4. upstream         the same, in an upstream source
//   5. routes           a skill's routes.json on the signal's path and lines
//   6. source           the source's skill list in rules/sources.json
//
// Rule-level matches (1 to 4) win; routes only run when none hit, and the
// source's skill list only when routes find nothing either.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { type Catalog, isActive, type Rule } from './catalog.ts';
import { TRUNK_SOURCE } from './mine-trunk.ts';
import { loadRoutes, routeMatches, type RouteFile } from './routes.ts';
import type { Signal, SignalMap, Via } from './signals.ts';
import { type Source, skillsForPath } from './sources.ts';
import { compareText } from './text.ts';

/** A place in a source repository a rule cites: path plus optional anchor. */
interface Cite {
  source: string;
  path: string;
  anchor?: string;
  rule: Rule;
}

export interface MapIndex {
  guideIds: Map<string, Rule[]>;
  tools: Map<string, Rule[]>;
  cites: Cite[];
  /** skill -> its routes, without borrowed ones: the owner maps those. */
  routes: { skill: string; routes: RouteFile }[];
  /** `skills/<skill>/<reference>` -> active rules defined there. */
  byFile: Map<string, string[]>;
  sources: Map<string, Source>;
}

const push = <K, V>(map: Map<K, V[]>, key: K, value: V): void => {
  map.set(key, [...(map.get(key) ?? []), value]);
};

function cite(source: string, place: string, rule: Rule): Cite {
  const [path = '', anchor] = place.split('#');
  return anchor === undefined || anchor === '' ? { source, path, rule } : { source, path, anchor, rule };
}

/** Everything the mapper looks up, read once per run. */
export function mapIndex(root: string, catalog: Catalog, sources: Source[]): MapIndex {
  const index: MapIndex = {
    guideIds: new Map(),
    tools: new Map(),
    cites: [],
    routes: [],
    byFile: new Map(),
    sources: new Map(sources.map((s) => [s.id, s])),
  };
  for (const rule of catalog.rules) {
    for (const g of rule.core_guide_ids) push(index.guideIds, g, rule);
    for (const e of rule.trunk?.enforced_by ?? []) push(index.tools, e.tool, rule);
    if (rule.trunk?.source !== undefined) index.cites.push(cite(TRUNK_SOURCE, rule.trunk.source, rule));
    for (const u of rule.upstream ?? []) index.cites.push(cite(u.source, u.path, rule));
    if (isActive(rule)) push(index.byFile, rule.file, rule.id);
  }
  for (const skill of readdirSync(join(root, 'skills')).toSorted(compareText)) {
    const routes = loadRoutes(join(root, 'skills', skill));
    if (routes === null) continue;
    const own = routes.routes.filter((r) => !r.reference.startsWith('../'));
    if (own.length > 0) index.routes.push({ skill, routes: { ...routes, routes: own } });
  }
  return index;
}

/** GitHub's heading anchor: lower case, punctuation dropped, spaces to dashes. */
export function slug(heading: string): string {
  return heading
    .replace(/^#+\s*/u, '')
    .trim()
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{N}\s_-]/gu, '')
    .replaceAll(/\s/gu, '-');
}

const ruleMaps = (rules: Rule[], via: Via): SignalMap[] => rules.map((r) => ({ skill: r.skill, rules: [r.id], via }));

/** A cite matches a signal in its file when it names no anchor, or when the
 *  signal is the heading the anchor points at. */
function citeMatches(c: Cite, s: Signal): boolean {
  if (c.source !== s.source || c.path !== s.path) return false;
  if (c.anchor === undefined) return true;
  return s.text.startsWith('#') && slug(s.text) === c.anchor;
}

function ruleLevel(s: Signal, index: MapIndex): SignalMap[] {
  if (s.kind === 'guide-id') return ruleMaps(index.guideIds.get(s.text) ?? [], 'core_guide_ids');
  if (s.kind === 'rule-class') return ruleMaps(index.tools.get(s.text) ?? [], 'enforced_by');
  const cited = index.cites.filter((c) => citeMatches(c, s));
  return cited.map((c) => ({
    skill: c.rule.skill,
    rules: [c.rule.id],
    via: c.source === TRUNK_SOURCE ? 'trunk.source' : 'upstream',
  }));
}

/** Review comments carry a code path and diff lines; a changed line in a
 *  guideline or skill file only has its text, so only anchors can match. */
function routeLevel(s: Signal, index: MapIndex): SignalMap[] {
  if (s.kind === 'rule-class' || s.kind === 'guide-id') return [];
  const code = s.kind === 'review-comment' || s.kind === 'api-break';
  const files = [{ path: code ? s.path : '', lines: s.lines ?? [s.text] }];
  return index.routes.flatMap(({ skill, routes }) =>
    [...new Set(routes.routes.filter((r) => routeMatches(r, files)).map((r) => r.reference))].map((reference) => ({
      skill,
      reference,
      rules: index.byFile.get(`skills/${skill}/${reference}`) ?? [],
      via: 'routes' as const,
    })),
  );
}

/** The skills, references and rules a signal touches; empty when unmapped. */
export function mapSignal(s: Signal, index: MapIndex): SignalMap[] {
  const rules = ruleLevel(s, index);
  if (rules.length > 0) return rules;
  const routes = routeLevel(s, index);
  if (routes.length > 0) return routes;
  const source = index.sources.get(s.source);
  if (source === undefined) return [];
  return skillsForPath(source, s.path).map((skill) => ({ skill, rules: [], via: 'source' as const }));
}

const withMap = (s: Signal, map: SignalMap[]): Signal => ({ ...s, map });

export const mapSignals = (signals: Signal[], index: MapIndex): Signal[] =>
  signals.map((s) => withMap(s, mapSignal(s, index)));
