// Cross-check of api-diff against core's sw-impact CI check (plan WP D). Our
// index keeps its own ids; their element names appear only in the mapping
// table below, so a rename on their side changes one table, not the index.
import { type Change, isBreak } from './api-diff.ts';

/** One sw-impact annotation: the rule (`vue:prop:type:changed`) and the
 *  element it names (`vue.sw-vector-field.prop.value`). */
export interface TheirFinding {
  rule: string;
  symbol: string;
  path: string;
  line: number;
}

/** A commit sw-impact checked: their findings and the refs to diff. */
export interface CrossCase {
  /** Where it came from, for the report: a PR URL or a run URL. */
  label: string;
  base: string;
  head: string;
  theirs: TheirFinding[];
}

/** Their member kinds under `vue.<component>.` and ours under `admin:<component>.`.
 *  Null: a surface our index does not record yet. */
const MEMBERS: Readonly<Record<string, string | null>> = {
  prop: 'prop',
  method: 'js-method',
  emit: 'emit',
  slot: 'slot',
  computed: 'computed',
  watch: null,
};

/** Our id for one of their symbols; null for a surface we do not record,
 *  undefined for a symbol the table does not know. */
export function ourIdOf(symbol: string): string | null | undefined {
  const match = /^vue\.([^.]+)\.([^.]+)\.(.+)$/u.exec(symbol);
  if (match?.[1] === undefined || match[2] === undefined || match[3] === undefined) return undefined;
  const member = MEMBERS[match[2]];
  if (member === undefined) return undefined;
  return member === null ? null : `admin:${match[1]}.${member}.${match[3]}`;
}

/** Their rules that need a detail our items do not carry: a type, the
 *  parameters, the return type. A miss under one of them is a WP C gap, not
 *  a bug in the diff. */
const NEEDS_DETAIL: Readonly<Record<string, string>> = {
  'vue:prop:type:changed': 'prop types',
  'vue:required:prop:added': 'new required props',
  'ts:method:param:type:changed': 'method parameter types',
  'ts:method:param:removed': 'method parameters',
  'ts:method:required:param:added': 'method parameters',
  'ts:method:return:type:changed': 'method return types',
};

export type MissReason = 'no-surface' | 'no-detail' | 'unmapped' | 'miss';

export interface Miss {
  finding: TheirFinding;
  reason: MissReason;
  /** What our index would need: the surface or the detail. */
  needs: string;
}

export interface CaseResult {
  label: string;
  base: string;
  head: string;
  /** Their findings our diff also reports as a break on the same element. */
  both: { finding: TheirFinding; id: string }[];
  onlyTheirs: Miss[];
  /** Our breaks they do not report: their miss or our false alarm. */
  onlyOurs: Change[];
}

/** The annotation's element, from `... surface 'vue.x.prop.y': ...` (quotes
 *  or backticks). Undefined for annotations that are not findings. */
export function symbolOf(message: string): string | undefined {
  return /surface [`']([^`']+)[`']/u.exec(message)?.[1];
}

function missOf(finding: TheirFinding, ourId: string | null | undefined): Miss {
  const member = finding.symbol.split('.')[2] ?? finding.symbol;
  if (ourId === undefined) return { finding, reason: 'unmapped', needs: finding.symbol };
  if (ourId === null) return { finding, reason: 'no-surface', needs: `${member} members` };
  const detail = NEEDS_DETAIL[finding.rule];
  if (detail !== undefined) return { finding, reason: 'no-detail', needs: detail };
  return { finding, reason: 'miss', needs: finding.rule };
}

/** Matches their findings with our breaks by id. */
export function crossCheck(c: CrossCase, ours: Change[]): CaseResult {
  const breaks = ours.filter((change) => isBreak(change));
  const ourIds = new Set(breaks.map((change) => change.id));
  const matched = new Set<string>();
  const both: { finding: TheirFinding; id: string }[] = [];
  const onlyTheirs: Miss[] = [];
  for (const finding of c.theirs) {
    const id = ourIdOf(finding.symbol);
    if (typeof id === 'string' && ourIds.has(id)) {
      matched.add(id);
      both.push({ finding, id });
    } else onlyTheirs.push(missOf(finding, id));
  }
  const onlyOurs = breaks.filter((change) => !matched.has(change.id));
  return { label: c.label, base: c.base, head: c.head, both, onlyTheirs, onlyOurs };
}

/** Recall per their member kind (prop, method, ...): found by both / theirs. */
export function recallByMember(results: CaseResult[]): Map<string, { found: number; total: number }> {
  const recall = new Map<string, { found: number; total: number }>();
  const bump = (symbol: string, found: boolean): void => {
    const member = symbol.split('.')[2] ?? 'other';
    const row = recall.get(member) ?? { found: 0, total: 0 };
    row.total += 1;
    if (found) row.found += 1;
    recall.set(member, row);
  };
  for (const result of results) {
    for (const { finding } of result.both) bump(finding.symbol, true);
    for (const miss of result.onlyTheirs) bump(miss.finding.symbol, false);
  }
  return new Map([...recall].toSorted(([a], [b]) => a.localeCompare(b)));
}

const short = (sha: string): string => sha.slice(0, 10);

/** The report as Markdown: totals, recall per member kind, what our index
 *  lacks (the WP C rows that matter), then each case. */
export function crossCheckReport(results: CaseResult[]): string {
  const theirs = results.reduce((sum, r) => sum + r.both.length + r.onlyTheirs.length, 0);
  const both = results.reduce((sum, r) => sum + r.both.length, 0);
  const ours = results.reduce((sum, r) => sum + r.onlyOurs.length, 0);
  const out = [
    '# api-diff vs sw-impact',
    '',
    `${results.length} commits; sw-impact findings: ${theirs}, found by both: ${both}, only ours: ${ours}.`,
    '',
    '| Member | Found | Theirs | Recall |',
    '| ------ | ----- | ------ | ------ |',
  ];
  for (const [member, row] of recallByMember(results)) {
    const share = row.total === 0 ? '-' : `${Math.round((100 * row.found) / row.total)}%`;
    out.push(`| ${member} | ${row.found} | ${row.total} | ${share} |`);
  }
  const needs = new Map<string, number>();
  for (const r of results)
    for (const miss of r.onlyTheirs) {
      const key = `${miss.reason}: ${miss.needs}`;
      needs.set(key, (needs.get(key) ?? 0) + 1);
    }
  out.push('', '## Why we missed', '');
  if (needs.size === 0) out.push('Nothing missed.');
  for (const [key, count] of [...needs].toSorted(([, a], [, b]) => b - a)) out.push(`- ${key} (${count})`);
  for (const r of results) {
    out.push('', `## ${r.label}`, '', `\`${short(r.base)}..${short(r.head)}\``, '');
    for (const { finding, id } of r.both) out.push(`- both: \`${finding.rule}\` \`${id}\``);
    for (const miss of r.onlyTheirs)
      out.push(`- only sw-impact (${miss.reason}, ${miss.needs}): \`${miss.finding.rule}\` \`${miss.finding.symbol}\``);
    for (const change of r.onlyOurs) out.push(`- only ours: \`${change.id}\` ${change.kind}, ${change.detail}`);
    if (r.both.length + r.onlyTheirs.length + r.onlyOurs.length === 0) out.push('- no breaks on either side');
  }
  return `${out.join('\n')}\n`;
}
