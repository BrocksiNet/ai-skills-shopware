// Types and loader for rules/catalog.json. Field reference:
// rules/catalog.schema.json.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const AUDIENCES = ['core', 'plugin', 'app', 'storefront', 'admin'] as const;
export type Audience = (typeof AUDIENCES)[number];

export type RuleId = string;

/** `active`, `retired` or `superseded:<ID>`. */
export type RuleStatus = 'active' | 'retired' | `superseded:${RuleId}`;

export interface TrunkSource {
  source?: string;
  commit?: string;
  /** CI tools that already catch the rule. */
  enforced_by?: string[];
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

export function loadCatalog(root: string): Catalog {
  return JSON.parse(readFileSync(join(root, CATALOG_PATH), 'utf8')) as Catalog;
}

export function isActive(rule: Rule): boolean {
  return rule.status === 'active';
}

export function prefixOf(id: RuleId): string {
  return id.split('-')[0] ?? '';
}
