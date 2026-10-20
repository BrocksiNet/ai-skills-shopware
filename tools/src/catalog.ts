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

export function loadCatalog(root: string): Catalog {
  return JSON.parse(readFileSync(join(root, CATALOG_PATH), 'utf8')) as Catalog;
}

export function isActive(rule: Rule): boolean {
  return rule.status === 'active';
}

export function prefixOf(id: RuleId): string {
  return id.split('-')[0] ?? '';
}
