// Proposals a maintainer dropped, so suggest-rules does not bring them back
// (plan WP12 step 4). rules/rejected.json lists them with the reason; retired
// and superseded catalog rules count as dropped too. The prompt shows the
// ones a cluster's signals share words with, and `repeatsRejected` fails a
// proposal that is one of them again.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Catalog } from './catalog.ts';
import { errorMessage } from './errors.ts';
import { indexRules, type RuleIndex, terms } from './suggest-related.ts';
import type { Proposal } from './suggest-schema.ts';

export const REJECTED_PATH = 'rules/rejected.json';

export interface Rejected {
  proposal?: string;
  date: string;
  action: 'new' | 'update';
  rule?: string;
  skill: string;
  title: string;
  text: string;
  reason: string;
  pr?: string;
}

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const KEYS = new Set(['proposal', 'date', 'action', 'rule', 'skill', 'title', 'text', 'reason', 'pr']);

function entryErrors(v: unknown, label: string): string[] {
  if (!isObject(v)) return [`${label}: not an object`];
  const errors = Object.keys(v)
    .filter((k) => !KEYS.has(k))
    .map((k) => `${label}: unknown field ${k}`);
  for (const k of ['date', 'skill', 'title', 'text', 'reason'])
    if (typeof v[k] !== 'string' || v[k] === '') errors.push(`${label}: ${k} must be a non-empty string`);
  for (const k of ['proposal', 'rule', 'pr'])
    if (v[k] !== undefined && typeof v[k] !== 'string') errors.push(`${label}: ${k} must be a string`);
  if (v.action !== 'new' && v.action !== 'update') errors.push(`${label}: action must be new or update`);
  if (typeof v.date === 'string' && !/^\d{4}-\d{2}-\d{2}$/u.test(v.date))
    errors.push(`${label}: date is not YYYY-MM-DD`);
  if (typeof v.skill === 'string' && !/^sw-[a-z0-9-]+$/u.test(v.skill)) errors.push(`${label}: skill is not sw-*`);
  if (typeof v.rule === 'string' && !/^(?:[A-Z]+-\d{3})?$/u.test(v.rule)) errors.push(`${label}: rule is not an ID`);
  if (typeof v.pr === 'string' && !v.pr.startsWith('https://github.com/'))
    errors.push(`${label}: pr is not a GitHub URL`);
  return errors;
}

const isRejected = (v: unknown): v is Rejected => entryErrors(v, '').length === 0;

/** Entries and errors of a parsed rules/rejected.json. */
export function checkRejected(value: unknown): { rejected: Rejected[]; errors: string[] } {
  const list = isObject(value) ? value.rejected : undefined;
  if (!Array.isArray(list)) return { rejected: [], errors: [`${REJECTED_PATH}: rejected must be a list`] };
  const errors = list.flatMap((e, i) => entryErrors(e, `${REJECTED_PATH} rejected[${String(i)}]`));
  return { rejected: list.filter((e) => isRejected(e)), errors };
}

/** rules/rejected.json; none when the file is absent, throws when invalid. */
export function loadRejected(root: string): Rejected[] {
  const path = join(root, REJECTED_PATH);
  if (!existsSync(path)) return [];
  const { rejected, errors } = checkRejected(JSON.parse(readFileSync(path, 'utf8')));
  if (errors.length > 0) throw new Error(errors.join('; '));
  return rejected;
}

/** Errors of rules/rejected.json for validate-skills, with `skills` the skill folder names. */
export function rejectedErrors(root: string, skills: string[]): string[] {
  const path = join(root, REJECTED_PATH);
  if (!existsSync(path)) return [];
  try {
    const { rejected, errors } = checkRejected(JSON.parse(readFileSync(path, 'utf8')));
    for (const r of rejected)
      if (!skills.includes(r.skill)) errors.push(`${REJECTED_PATH}: ${r.title}: unknown skill ${r.skill}`);
    return errors;
  } catch (error) {
    return [`${REJECTED_PATH}: ${errorMessage(error)}`];
  }
}

/** Where a dropped rule came from, for the prompt: date, reason and PR. */
const why = (r: Rejected): string => `Dropped ${r.date}: ${r.reason}${r.pr === undefined ? '' : ` (${r.pr})`}`;

/** Rejected proposals and retired or superseded catalog rules, each with
 *  why it went in its text. IDs are the rule ID, or the proposal ID for a
 *  new rule that never got one. */
export function droppedIndex(catalog: Catalog, rejected: Rejected[]): RuleIndex {
  return indexRules([
    ...rejected.map((r) => ({
      id: r.rule === undefined || r.rule === '' ? `proposal ${r.proposal ?? r.date}` : r.rule,
      skill: r.skill,
      title: r.title,
      text: `${r.text} ${why(r)}`,
    })),
    ...catalog.rules
      .filter((r) => r.status !== 'active')
      .map((r) => ({
        id: r.id,
        skill: r.skill,
        title: r.title,
        text: `${r.status === 'retired' ? 'Retired' : `Status ${r.status}`}: ${r.retired_reason ?? ''}`,
      })),
  ]);
}

/** Share of a rejected title's words a proposal must repeat to count as it. */
export const REPEAT_SHARE = 0.6;
const MIN_WORDS = 3;

/** The rejected entry a proposal repeats: same skill, and for an update the
 *  same rule, with most words of the rejected title in its title or draft. */
export function repeatsRejected(p: Proposal, rejected: Rejected[]): Rejected | undefined {
  if (p.action !== 'new' && p.action !== 'update') return undefined;
  const words = new Set(terms(`${p.title} ${p.draft}`));
  return rejected.find((r) => {
    if (r.skill !== p.skill || r.action !== p.action) return false;
    if (p.action === 'update' && r.rule !== p.rule) return false;
    const title = [...new Set(terms(r.title))];
    const hits = title.filter((w) => words.has(w)).length;
    return hits >= Math.min(MIN_WORDS, title.length) && hits / Math.max(1, title.length) >= REPEAT_SHARE;
  });
}
