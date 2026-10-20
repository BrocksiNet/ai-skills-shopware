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
// It also checks the field types, since the catalog is hand-edited JSON.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { enforcedChanges } from './enforced-files.ts';
import { AUDIENCES, ENFORCEMENT_KINDS, type Catalog, type Rule, isActive, loadCatalog, prefixOf } from './catalog.ts';

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

const ID = /^[A-Z]+-[0-9]{3}$/;
const DEFINITION = /\*\*([A-Z]+-[0-9]+)\*\*/g;
const REFERENCE = /`([A-Z]+-[0-9]+)`/g;
const STATUS = /^(active|retired|superseded:[A-Z]+-[0-9]{3})$/;
const DATE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

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

export function scanSkills(root: string): { definitions: Mention[]; references: Mention[]; files: Set<string> } {
  const definitions: Mention[] = [];
  const references: Mention[] = [];
  const files = new Set<string>();
  for (const path of markdownFiles(join(root, 'skills')).sort()) {
    const file = repoPath(root, path);
    files.add(file);
    readFileSync(path, 'utf8')
      .split('\n')
      .forEach((text, i) => {
        for (const m of text.matchAll(DEFINITION)) definitions.push({ id: m[1]!, file, line: i + 1 });
        for (const m of text.matchAll(REFERENCE)) references.push({ id: m[1]!, file, line: i + 1 });
      });
  }
  return { definitions, references, files };
}

function evalTasks(root: string): Set<string> {
  const dir = join(root, 'evals', 'tasks');
  if (!existsSync(dir)) return new Set();
  return new Set(readdirSync(dir).filter((name) => statSync(join(dir, name)).isDirectory()));
}

const isString = (v: unknown): v is string => typeof v === 'string';
const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every(isString);

function enforcementErrors(label: string, value: unknown): string[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return [`${label} must be an object`];
  const e = value as Record<string, unknown>;
  const errors: string[] = [];
  for (const key of ['tool', 'catches', 'misses'] as const) {
    if (!isString(e[key]) || e[key] === '') errors.push(`${label}.${key} must be a non-empty string`);
  }
  if (!(ENFORCEMENT_KINDS as readonly unknown[]).includes(e.kind)) {
    errors.push(`${label}.kind must be one of ${ENFORCEMENT_KINDS.join(', ')}`);
  }
  if (typeof e.trunk_only !== 'boolean') errors.push(`${label}.trunk_only must be true or false`);
  return errors;
}

/** Type errors for one entry; the semantic checks assume these passed. */
function shapeErrors(rule: Rule): string[] {
  const r = rule as unknown as Record<string, unknown>;
  const label = isString(r.id) ? r.id : JSON.stringify(r.id);
  const errors: string[] = [];
  for (const key of ['id', 'skill', 'file', 'title', 'status', 'since'] as const) {
    if (!isString(r[key])) errors.push(`${label}: ${key} must be a string`);
  }
  if (r.eval !== null && !isString(r.eval)) errors.push(`${label}: eval must be a string or null`);
  if (r.eval_reason !== undefined && !isString(r.eval_reason)) errors.push(`${label}: eval_reason must be a string`);
  if (!isStringArray(r.core_guide_ids)) errors.push(`${label}: core_guide_ids must be a list of strings`);
  if (!isStringArray(r.audience)) errors.push(`${label}: audience must be a list of strings`);
  if (typeof r.defer_on_trunk !== 'boolean') errors.push(`${label}: defer_on_trunk must be true or false`);
  if (r.see !== undefined && !isStringArray(r.see)) errors.push(`${label}: see must be a list of IDs`);
  if (r.trunk !== undefined) {
    const t = r.trunk as Record<string, unknown> | null;
    if (typeof t !== 'object' || t === null || Array.isArray(t)) errors.push(`${label}: trunk must be an object`);
    else if (t.enforced_by !== undefined) {
      if (!Array.isArray(t.enforced_by)) errors.push(`${label}: trunk.enforced_by must be a list`);
      else t.enforced_by.forEach((e: unknown, i: number) => errors.push(...enforcementErrors(`${label}: trunk.enforced_by[${i}]`, e)));
    }
  }
  return errors;
}

export function validateRules(root: string, catalog: Catalog = loadCatalog(root)): RulesReport {
  const errors: string[] = [];
  const { definitions, references, files } = scanSkills(root);
  const tasks = evalTasks(root);
  const rules = Array.isArray(catalog.rules) ? catalog.rules : [];
  if (!Array.isArray(catalog.rules)) errors.push('catalog: rules must be a list');
  const prefixes = catalog.prefixes ?? {};

  const byId = new Map<string, Rule>();
  const seen = new Set<string>();
  for (const rule of rules) {
    const shape = shapeErrors(rule);
    errors.push(...shape);
    if (shape.length > 0) continue;
    if (seen.has(rule.id)) errors.push(`${rule.id}: duplicated in the catalog`);
    seen.add(rule.id);
    byId.set(rule.id, rule);
  }
  const activeId = (id: string): boolean => {
    const rule = byId.get(id);
    return rule !== undefined && isActive(rule);
  };

  for (const rule of byId.values()) {
    const { id } = rule;
    if (!ID.test(id)) errors.push(`${id}: ID must be PREFIX-NNN`);
    const owner = prefixes[prefixOf(id)];
    if (owner === undefined) errors.push(`${id}: unknown prefix`);
    else if (owner !== rule.skill) errors.push(`${id}: prefix belongs to ${owner}, not ${rule.skill}`);
    if (!STATUS.test(rule.status)) errors.push(`${id}: bad status ${rule.status}`);
    if (rule.status.startsWith('superseded:')) {
      const by = rule.status.slice('superseded:'.length);
      if (!byId.has(by)) errors.push(`${id}: superseded by unknown ${by}`);
    }
    if (rule.title === '') errors.push(`${id}: missing title`);
    if (!DATE.test(rule.since)) errors.push(`${id}: since must be YYYY-MM-DD`);
    if (!rule.file.startsWith(`skills/${rule.skill}/`)) {
      errors.push(`${id}: file ${rule.file} is outside skills/${rule.skill}/`);
    }
    if (!files.has(rule.file)) errors.push(`${id}: file ${rule.file} not found`);
    if (rule.eval !== null && !tasks.has(rule.eval)) errors.push(`${id}: eval task ${rule.eval} not found`);
    if (isActive(rule) && rule.eval === null && !rule.eval_reason) {
      errors.push(`${id}: active rule needs eval or eval_reason`);
    }
    for (const a of rule.audience) {
      if (!(AUDIENCES as readonly string[]).includes(a)) errors.push(`${id}: unknown audience ${a}`);
    }
    for (const s of rule.see ?? []) {
      if (!activeId(s)) errors.push(`${id}: see ${s} is unknown or inactive`);
    }
    if (isActive(rule)) {
      const inline = definitions.filter((d) => d.id === id);
      const [first] = inline;
      if (first === undefined) errors.push(`${id}: active rule not found inline in skills/`);
      else if (inline.length > 1) {
        errors.push(`${id}: defined inline ${inline.length} times (${inline.map((d) => `${d.file}:${d.line}`).join(', ')})`);
      } else if (first.file !== rule.file) errors.push(`${id}: inline in ${first.file}, catalog says ${rule.file}`);
    }
  }

  for (const d of definitions) {
    const rule = byId.get(d.id);
    if (rule === undefined) errors.push(`${d.file}:${d.line}: ${d.id} has no catalog entry`);
    else if (!isActive(rule)) errors.push(`${d.file}:${d.line}: ${d.id} is ${rule.status} but still inline`);
  }
  for (const r of references) {
    if (!activeId(r.id)) errors.push(`${r.file}:${r.line}: reference to unknown or inactive ${r.id}`);
  }

  errors.push(...enforcedSectionErrors(root, { ...catalog, rules: [...byId.values()] }));

  const active = [...byId.values()].filter(isActive);
  const skills = [...new Set(active.map((r) => r.skill))].sort();
  return {
    errors,
    active: active.length,
    withEval: active.filter((r) => r.eval !== null).length,
    inactive: byId.size - active.length,
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
  } catch (e) {
    return [(e as Error).message];
  }
}
