// Types and loader for rules/catalog.json. Field reference:
// rules/catalog.schema.json.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const AUDIENCES = ['core', 'plugin', 'app', 'storefront', 'admin'] as const;
export type Audience = (typeof AUDIENCES)[number];

export type RuleId = string;

/** `active`, `retired` or `superseded:<ID>`. */
export type RuleStatus = 'active' | 'retired' | `superseded:${RuleId}`;

export const ENFORCEMENT_KINDS = ['phpstan', 'danger', 'eslint', 'ecs', 'php-cs-fixer', 'phpunit', 'test'] as const;
export type EnforcementKind = (typeof ENFORCEMENT_KINDS)[number];

/** A CI check that already catches (part of) a rule. Rendered into the
 *  "Already enforced by CI" section of the owning skill (WP3). */
export interface Enforcement {
  /** Rule class, rule id or test name, e.g. `TestPackageMatchRule`. */
  tool: string;
  kind: EnforcementKind;
  /** What the check reports, as a sentence without the tool name. */
  catches: string;
  /** What it does not report, which a reviewer still flags. */
  misses: string;
  /** True when the check is not active in a plugin or app project by
   *  default (core-only config, or opt-in Shopware PHPStan rules whose
   *  default namespaces are Shopware\Tests\...). */
  trunk_only: boolean;
}

export interface TrunkSource {
  source?: string;
  commit?: string;
  /** CI checks that already catch the rule. */
  enforced_by?: Enforcement[];
}

export interface Rule {
  id: RuleId;
  skill: string;
  /** Markdown file under skills/<skill>/ that defines the rule as **ID**. */
  file: string;
  title: string;
  status: RuleStatus;
  since: string;
  /** Task name under evals/tasks/, or null with eval_reason. */
  eval: string | null;
  eval_reason?: string;
  trunk?: TrunkSource;
  core_guide_ids: string[];
  audience: Audience[];
  defer_on_trunk: boolean;
  see?: RuleId[];
}

export interface Catalog {
  $schema?: string;
  /** ID prefix -> owning skill. */
  prefixes: Record<string, string>;
  rules: Rule[];
}

export const CATALOG_PATH = 'rules/catalog.json';

// ---- shape checks: the catalog is hand-edited JSON ---------------------------

type Json = Record<string, unknown>;

const isRecord = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === 'string';
const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((s) => isString(s));
const isText = (v: unknown): v is string => isString(v) && v !== '';
const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T => list.some((item) => item === v);
const STATUS = /^(?:active|retired|superseded:[A-Z]+-[0-9]{3})$/u;

function enforcementErrors(label: string, e: unknown): string[] {
  if (!isRecord(e)) return [`${label} must be an object`];
  const errors: string[] = [];
  for (const key of ['tool', 'catches', 'misses'] as const) {
    if (!isText(e[key])) errors.push(`${label}.${key} must be a non-empty string`);
  }
  if (!oneOf(ENFORCEMENT_KINDS, e.kind)) errors.push(`${label}.kind must be one of ${ENFORCEMENT_KINDS.join(', ')}`);
  if (typeof e.trunk_only !== 'boolean') errors.push(`${label}.trunk_only must be true or false`);
  return errors;
}

function trunkErrors(label: string, t: unknown): string[] {
  if (t === undefined) return [];
  if (!isRecord(t)) return [`${label}: trunk must be an object`];
  const errors: string[] = [];
  if (t.source !== undefined && !isString(t.source)) errors.push(`${label}: trunk.source must be a string`);
  if (t.commit !== undefined && !isString(t.commit)) errors.push(`${label}: trunk.commit must be a string`);
  if (t.enforced_by === undefined) return errors;
  if (!Array.isArray(t.enforced_by)) return [...errors, `${label}: trunk.enforced_by must be a list`];
  return [...errors, ...t.enforced_by.flatMap((e, i) => enforcementErrors(`${label}: trunk.enforced_by[${i}]`, e))];
}

/** Field errors of one catalog entry; empty when it is a valid Rule. */
export function ruleErrors(r: unknown): string[] {
  if (!isRecord(r)) return [`${JSON.stringify(r)}: rule must be an object`];
  const label = isString(r.id) ? r.id : JSON.stringify(r.id);
  const errors: string[] = [];
  for (const key of ['id', 'skill', 'file', 'title', 'status', 'since'] as const) {
    if (!isString(r[key])) errors.push(`${label}: ${key} must be a string`);
  }
  if (isString(r.status) && !STATUS.test(r.status)) errors.push(`${label}: bad status ${r.status}`);
  if (r.eval !== null && !isString(r.eval)) errors.push(`${label}: eval must be a string or null`);
  if (r.eval_reason !== undefined && !isString(r.eval_reason)) errors.push(`${label}: eval_reason must be a string`);
  if (!isStringArray(r.core_guide_ids)) errors.push(`${label}: core_guide_ids must be a list of strings`);
  if (isStringArray(r.audience)) {
    for (const a of r.audience) if (!oneOf(AUDIENCES, a)) errors.push(`${label}: unknown audience ${a}`);
  } else {
    errors.push(`${label}: audience must be a list of strings`);
  }
  if (typeof r.defer_on_trunk !== 'boolean') errors.push(`${label}: defer_on_trunk must be true or false`);
  if (r.see !== undefined && !isStringArray(r.see)) errors.push(`${label}: see must be a list of IDs`);
  return [...errors, ...trunkErrors(label, r.trunk)];
}

const isRule = (r: unknown): r is Rule => ruleErrors(r).length === 0;

/** A parsed catalog split into the entries that are valid rules and the
 *  errors of the others. */
export interface CheckedCatalog {
  catalog: Catalog;
  errors: string[];
  /** String IDs of the entries that were left out, so callers do not report
   *  them a second time as unknown. */
  malformed: Set<string>;
}

export function checkCatalog(value: unknown): CheckedCatalog {
  const errors: string[] = [];
  const malformed = new Set<string>();
  const json = isRecord(value) ? value : {};
  if (!isRecord(value)) errors.push('catalog: must be an object');
  const prefixes: Record<string, string> = {};
  if (json.prefixes !== undefined && !isRecord(json.prefixes)) errors.push('catalog: prefixes must be an object');
  for (const [prefix, skill] of Object.entries(isRecord(json.prefixes) ? json.prefixes : {})) {
    if (isString(skill)) prefixes[prefix] = skill;
    else errors.push(`catalog: prefixes.${prefix} must be a skill name`);
  }
  if (!Array.isArray(json.rules)) errors.push('catalog: rules must be a list');
  const rules: Rule[] = [];
  for (const r of Array.isArray(json.rules) ? json.rules : []) {
    if (isRule(r)) {
      rules.push(r);
      continue;
    }
    errors.push(...ruleErrors(r));
    if (isRecord(r) && isString(r.id)) malformed.add(r.id);
  }
  return { catalog: { prefixes, rules }, errors, malformed };
}

/** rules/catalog.json as parsed JSON, not yet checked. */
export function readCatalog(root: string): unknown {
  return JSON.parse(readFileSync(join(root, CATALOG_PATH), 'utf8'));
}

/** The catalog; throws when an entry has a missing or mistyped field. */
export function loadCatalog(root: string): Catalog {
  const { catalog, errors } = checkCatalog(readCatalog(root));
  if (errors.length > 0) throw new Error(errors.join('; '));
  return catalog;
}

export function isActive(rule: Rule): boolean {
  return rule.status === 'active';
}

export function prefixOf(id: RuleId): string {
  return id.split('-')[0] ?? '';
}
