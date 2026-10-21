// Check that the rule IDs in skills/**/*.md and rules/catalog.json agree.
//
// A rule is defined inline by a bold ID, `**TEST-014**`, exactly once. Other
// text may point at a rule with a code span, `TEST-014`.
//
// Errors when:
//   1. an inline ID has no catalog entry, or an active rule is not inline
//   2. an ID is duplicated (catalog or inline), malformed, or its prefix does
//      not match the owning skill (see "prefixes" in the catalog)
//   3. the entry's `file` does not contain the inline ID
//   4. the `eval` task does not exist, or an active rule has neither `eval`
//      nor `eval_reason`
//   5. a retired or superseded ID still appears inline, or a code-span
//      reference or `see` entry names an unknown or inactive ID
//   6. a skill's "Already enforced by CI" section or references/enforced-by-ci.md
//      does not match the catalog (run tools/bin/render-enforced.ts)
//   7. a skill that borrows references for an audience does not name a rule
//      in them that is for another audience (see borrow-audience.ts)
//   8. a review task expects a rule that is not tagged in a file its
//      reviewing skill reads (see borrow-audience.ts)
// It also checks the field types, since the catalog is hand-edited JSON.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { borrowedAudienceErrors, reviewReachErrors } from './borrow-audience.ts';
import { type Catalog, type Rule, checkCatalog, isActive, prefixOf, readCatalog } from './catalog.ts';
import { enforcedChanges } from './enforced-files.ts';
import { errorMessage } from './errors.ts';
import { compareText } from './text.ts';

export interface Mention {
  id: string;
  file: string;
  line: number;
}

export interface Coverage {
  skill: string;
  active: number;
  withEval: number;
}

export interface RulesReport {
  errors: string[];
  active: number;
  withEval: number;
  inactive: number;
  bySkill: Coverage[];
}

const ID = /^[A-Z]+-[0-9]{3}$/u;
const DEFINITION = /\*\*([A-Z]+-[0-9]+)\*\*/gu;
const REFERENCE = /`([A-Z]+-[0-9]+)`/gu;
const DATE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/u;

function markdownFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...markdownFiles(path));
    else if (entry.isFile() && entry.name.endsWith('.md')) out.push(path);
  }
  return out;
}

/** Repo-relative POSIX path, the form the catalog uses. */
function repoPath(root: string, path: string): string {
  return relative(root, path).split(sep).join('/');
}

/** Every `pattern` match in `text` as a mention of its first group. */
function mentions(text: string, pattern: RegExp, file: string, line: number): Mention[] {
  return [...text.matchAll(pattern)].flatMap((m) => (m[1] === undefined ? [] : [{ id: m[1], file, line }]));
}

export function scanSkills(root: string): { definitions: Mention[]; references: Mention[]; files: Set<string> } {
  const definitions: Mention[] = [];
  const references: Mention[] = [];
  const files = new Set<string>();
  for (const path of markdownFiles(join(root, 'skills')).toSorted(compareText)) {
    const file = repoPath(root, path);
    files.add(file);
    for (const [i, text] of readFileSync(path, 'utf8').split('\n').entries()) {
      definitions.push(...mentions(text, DEFINITION, file, i + 1));
      references.push(...mentions(text, REFERENCE, file, i + 1));
    }
  }
  return { definitions, references, files };
}

function evalTasks(root: string): Set<string> {
  const dir = join(root, 'evals', 'tasks');
  if (!existsSync(dir)) return new Set();
  return new Set(readdirSync(dir).filter((name) => statSync(join(dir, name)).isDirectory()));
}

/** What the per-rule checks look rules, files and tasks up in. */
interface Context {
  prefixes: Record<string, string>;
  byId: Map<string, Rule>;
  files: Set<string>;
  tasks: Set<string>;
  definitions: Mention[];
}

const activeId = (ctx: Context, id: string): boolean => {
  const rule = ctx.byId.get(id);
  return rule !== undefined && isActive(rule);
};

/** ID, prefix, status, title, date and file of one rule. */
function identityErrors(rule: Rule, ctx: Context): string[] {
  const { id } = rule;
  const errors: string[] = [];
  if (!ID.test(id)) errors.push(`${id}: ID must be PREFIX-NNN`);
  const owner = ctx.prefixes[prefixOf(id)];
  if (owner === undefined) errors.push(`${id}: unknown prefix`);
  else if (owner !== rule.skill) errors.push(`${id}: prefix belongs to ${owner}, not ${rule.skill}`);
  if (rule.status.startsWith('superseded:')) {
    const by = rule.status.slice('superseded:'.length);
    if (!ctx.byId.has(by)) errors.push(`${id}: superseded by unknown ${by}`);
  }
  if (rule.title === '') errors.push(`${id}: missing title`);
  if (!DATE.test(rule.since)) errors.push(`${id}: since must be YYYY-MM-DD`);
  if (!rule.file.startsWith(`skills/${rule.skill}/`)) {
    errors.push(`${id}: file ${rule.file} is outside skills/${rule.skill}/`);
  }
  if (!ctx.files.has(rule.file)) errors.push(`${id}: file ${rule.file} not found`);
  return errors;
}

/** Eval, `see` links and the inline definition of one rule. */
function linkErrors(rule: Rule, ctx: Context): string[] {
  const { id } = rule;
  const errors: string[] = [];
  if (rule.eval !== null && !ctx.tasks.has(rule.eval)) errors.push(`${id}: eval task ${rule.eval} not found`);
  if (isActive(rule) && rule.eval === null && (rule.eval_reason ?? '') === '') {
    errors.push(`${id}: active rule needs eval or eval_reason`);
  }
  for (const s of rule.see ?? []) {
    if (!activeId(ctx, s)) errors.push(`${id}: see ${s} is unknown or inactive`);
  }
  if (!isActive(rule)) return errors;
  const inline = ctx.definitions.filter((d) => d.id === id);
  const [first] = inline;
  if (first === undefined) errors.push(`${id}: active rule not found inline in skills/`);
  else if (inline.length > 1) {
    errors.push(
      `${id}: defined inline ${inline.length} times (${inline.map((d) => `${d.file}:${d.line}`).join(', ')})`,
    );
  } else if (first.file !== rule.file) errors.push(`${id}: inline in ${first.file}, catalog says ${rule.file}`);
  return errors;
}

/** Inline IDs and code-span references that do not match an active rule.
 *  IDs of malformed entries were reported already and are skipped. */
function mentionErrors(ctx: Context, references: Mention[], malformed: Set<string>): string[] {
  const errors: string[] = [];
  for (const d of ctx.definitions) {
    const rule = ctx.byId.get(d.id);
    if (malformed.has(d.id)) continue;
    if (rule === undefined) errors.push(`${d.file}:${d.line}: ${d.id} has no catalog entry`);
    else if (!isActive(rule)) errors.push(`${d.file}:${d.line}: ${d.id} is ${rule.status} but still inline`);
  }
  for (const r of references) {
    if (!malformed.has(r.id) && !activeId(ctx, r.id)) {
      errors.push(`${r.file}:${r.line}: reference to unknown or inactive ${r.id}`);
    }
  }
  return errors;
}

function coverage(rules: Rule[]): Omit<RulesReport, 'errors'> {
  const active = rules.filter((r) => isActive(r));
  const skills = [...new Set(active.map((r) => r.skill))].toSorted(compareText);
  return {
    active: active.length,
    withEval: active.filter((r) => r.eval !== null).length,
    inactive: rules.length - active.length,
    bySkill: skills.map((skill) => {
      const own = active.filter((r) => r.skill === skill);
      return { skill, active: own.length, withEval: own.filter((r) => r.eval !== null).length };
    }),
  };
}

/** WP3: the generated sections and references match the catalog. */
export function enforcedSectionErrors(root: string, catalog: Catalog): string[] {
  try {
    return enforcedChanges(root, catalog).map(
      ({ file, next }) =>
        `${file}: ${next === null ? 'no longer generated, delete it' : 'out of date'}; run node tools/bin/render-enforced.ts`,
    );
  } catch (error) {
    return [errorMessage(error)];
  }
}

/** Checks the catalog (parsed JSON, read from `root` by default) against the
 *  skills under `root`. Throws only when the catalog cannot be read. */
export function validateRules(root: string, raw: unknown = readCatalog(root)): RulesReport {
  const checked = checkCatalog(raw);
  const errors = [...checked.errors];
  const { definitions, references, files } = scanSkills(root);
  const byId = new Map<string, Rule>();
  for (const rule of checked.catalog.rules) {
    if (byId.has(rule.id)) errors.push(`${rule.id}: duplicated in the catalog`);
    byId.set(rule.id, rule);
  }
  const ctx: Context = { prefixes: checked.catalog.prefixes, byId, files, tasks: evalTasks(root), definitions };
  for (const rule of byId.values()) errors.push(...identityErrors(rule, ctx), ...linkErrors(rule, ctx));
  errors.push(
    ...mentionErrors(ctx, references, checked.malformed),
    ...enforcedSectionErrors(root, { ...checked.catalog, rules: [...byId.values()] }),
    ...borrowedAudienceErrors(root, [...byId.values()], references),
    ...reviewReachErrors(root, byId),
  );
  return { errors, ...coverage([...byId.values()]) };
}
