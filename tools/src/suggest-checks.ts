// The checks `suggest-rules` runs on every proposal without a model (plan
// WP12 step 4), and the repo text the prompt quotes: a rule's current text,
// the topics a skill owns, and the README's inclusion criteria.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { type Catalog, isActive } from './catalog.ts';
import { changesRequested } from './suggest-cluster.ts';
import type { Proposal } from './suggest-schema.ts';
import type { Signal } from './signals.ts';

/** Topics per owning skill, from the REGISTRY.md coverage matrix. */
export function registryTopics(registry: string): Map<string, string[]> {
  const topics = new Map<string, string[]>();
  let inMatrix = false;
  for (const line of registry.split('\n')) {
    if (line.startsWith('## ')) inMatrix = line.startsWith('## Coverage matrix');
    if (!inMatrix || !line.startsWith('| ') || /^\|[ -]+\|/u.test(line)) continue;
    const [, topic = '', owner = ''] = line.split(/\s*\|\s*/u);
    const skill = /^`(sw-[a-z0-9-]+)`$/u.exec(owner.trim())?.[1];
    if (skill !== undefined) topics.set(skill, [...(topics.get(skill) ?? []), topic.trim()]);
  }
  return topics;
}

/** The five inclusion criteria, as the README states them. */
export function inclusionCriteria(readme: string): string {
  const start = readme.indexOf('## Curation');
  if (start < 0) return '';
  const items = readme
    .slice(start)
    .split('\n')
    .reduce<string[]>((acc, line) => {
      if (/^[1-5]\. /u.test(line)) acc.push(line.trim());
      else if (acc.length > 0 && acc.length <= 5 && /^ {3}\S/u.test(line))
        acc.push(`${acc.pop() ?? ''} ${line.trim()}`);
      return acc;
    }, []);
  return items.slice(0, 5).join('\n');
}

const ITEM = /^(\s*)(?:[-*]|[0-9]+\.)\s/u;

/** The bullet that states a rule, `**ID**` up to the next item, blank line
 *  or heading; empty when the file does not tag it. */
export function ruleText(markdown: string, id: string): string {
  const lines = markdown.split('\n');
  const at = lines.findIndex((l) => l.includes(`**${id}**`));
  if (at < 0) return '';
  const indent = ITEM.exec(lines[at] ?? '')?.[1]?.length ?? 0;
  const out = [lines[at] ?? ''];
  for (const line of lines.slice(at + 1)) {
    const item = ITEM.exec(line);
    if (line.trim() === '' || line.startsWith('#') || (item !== null && (item[1]?.length ?? 0) <= indent)) break;
    out.push(line);
  }
  return out.map((l) => l.trim()).join(' ');
}

/** Current text of a catalog rule, read from its owning file. */
export function currentRuleText(root: string, catalog: Catalog, id: string): string {
  const rule = catalog.rules.find((r) => r.id === id);
  if (rule === undefined) return '';
  const path = join(root, rule.file);
  return existsSync(path) ? ruleText(readFileSync(path, 'utf8'), id) : '';
}

export interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

export interface CheckContext {
  catalog: Catalog;
  topics: Map<string, string[]>;
  /** The signals the agent saw for this cluster. */
  shown: Signal[];
}

/** PRs (or commits, or comments) a set of signals comes from. */
const origin = (s: Signal): string =>
  s.pr === undefined ? (s.commit?.sha ?? s.url) : `${s.repo}#${String(s.pr.number)}`;

/** Every check for one proposal. A proposal passes when all are ok. */
export function checkProposal(p: Proposal, o: CheckContext): Check[] {
  const checks: Check[] = [];
  const byUrl = new Map(o.shown.map((s) => [s.url, s]));
  const foreign = p.evidence.filter((u) => !byUrl.has(u));
  checks.push({
    name: 'evidence in input',
    ok: foreign.length === 0,
    detail: foreign.length === 0 ? `${p.evidence.length} URL(s)` : `not in the input: ${foreign.join(', ')}`,
  });
  const owned = o.topics.get(p.skill) ?? [];
  checks.push({
    name: 'skill owns topic',
    ok: owned.length > 0,
    detail: owned.length > 0 ? `${p.skill} owns ${owned.length} topic(s) in REGISTRY.md` : `${p.skill} owns no topic`,
  });
  if (p.action === 'update' || p.action === 'retire' || (p.action === 'none' && p.rule !== '')) {
    const rule = o.catalog.rules.find((r) => r.id === p.rule);
    const ok = rule !== undefined && isActive(rule) && rule.skill === p.skill;
    let detail = `${p.rule} is active in ${p.skill}`;
    if (rule === undefined) detail = `${p.rule} is not in the catalog`;
    else if (!isActive(rule)) detail = `${p.rule} is ${rule.status}`;
    else if (rule.skill !== p.skill) detail = `${p.rule} belongs to ${rule.skill}`;
    checks.push({ name: 'rule exists', ok, detail });
  }
  if (p.action === 'new') {
    const evidence = p.evidence.flatMap((u) => {
      const s = byUrl.get(u);
      return s === undefined ? [] : [s];
    });
    const prs = new Set(evidence.map((s) => origin(s)));
    const changes = evidence.some((s) => changesRequested(s));
    checks.push({
      name: 'enough evidence',
      ok: prs.size >= 2 || changes,
      detail: `${prs.size} PR(s)${changes ? ', a review requested changes' : ''}`,
    });
  }
  return checks;
}
