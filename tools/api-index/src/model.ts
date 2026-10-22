// The shape of the public API index: one snapshot per ref, one item per
// symbol. docs/plans/2026-10-wp11-public-api-index.md explains the surfaces.

export const SCHEMA = 1;
export const GENERATOR = 'api-index/0.2.0';

export type ItemKind = 'class' | 'interface' | 'trait' | 'enum' | 'method' | 'property' | 'constant' | 'case';

/** Status that decides whether an item is covered by the BC promise. */
export interface Flags {
  /** `@internal`: not public API. */
  internal?: true;
  /** `@deprecated`: the removal version (`v6.8.0`), or '' when none is given. */
  deprecated?: string;
  /** `@experimental`: the planned stable version, or '' when none is given. */
  experimental?: string;
  /** `final` keyword, or `@final` in the docblock. */
  final?: 'keyword' | 'doc';
  /** Announced changes from `Shopware\Core\Framework\Deprecation\BCChange`, as `Name@version`. */
  bcChanges?: string[];
}

export interface Item {
  /** `php:Fqcn`, `php:Fqcn::method()`, `php:Fqcn::$property`, `php:Fqcn::CONSTANT`. */
  id: string;
  kind: ItemKind;
  /** Path in the repository. */
  file: string;
  visibility?: 'public' | 'protected';
  static?: true;
  abstract?: true;
  /** Methods: `(Type $a, ?Type $b = …): Return`. Properties and constants: their type. */
  signature?: string;
  extends?: string[];
  implements?: string[];
  /** Traits the class uses; their members are the class's members. */
  traits?: string[];
  /** The `#[Package]` area of a class. */
  package?: string;
  flags: Flags;
}

export interface Snapshot {
  schema: number;
  generator: string;
  ref: string;
  sha: string;
  builtAt: string;
  /** Files that did not parse; their items are missing. */
  failed: string[];
  items: Item[];
}
