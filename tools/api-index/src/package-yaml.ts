// Deprecations of configuration keys written as comments in the bundles'
// package YAML (`shopware.yaml`, `storefront.yaml`, `elasticsearch.yaml`),
// where core also marks a key it will remove:
//   # @deprecated tag:v6.7.0 - The setting "auto_prefix_css" is deprecated
//   # tag:v6.7.0 - delete setting, as it should be always enabled
import { isMap, isScalar, parseDocument } from 'yaml';
import type { Item } from './model.ts';

export const PACKAGE_FILES = [
  'src/Core/Framework/Resources/config/packages/shopware.yaml',
  'src/Storefront/Resources/config/packages/storefront.yaml',
  'src/Elasticsearch/Resources/config/packages/elasticsearch.yaml',
];

const REMOVAL = /@deprecated\b|tag:v[\d.]+ - (?:delete|remove)/iu;

/** `tag:v6.7.0.0` → `v6.7.0`; no tag gives ''. */
function versionOf(comment: string): string {
  const parts = /tag:v?(\d+)\.(\d+)\.(\d+)/u.exec(comment);
  return parts === null ? '' : `v${parts[1]}.${parts[2]}.${parts[3]}`;
}

/** Key paths of one package file whose comment announces their removal. */
export function yamlDeprecations(yaml: string): Map<string, string> {
  const out = new Map<string, string>();
  const visit = (node: unknown, path: string): void => {
    if (!isMap(node)) return;
    node.items.forEach((pair, index) => {
      if (!isScalar(pair.key)) return;
      const key = `${path === '' ? '' : `${path}.`}${String(pair.key.value)}`;
      const value = isScalar(pair.value) ? pair.value : undefined;
      // A comment above the first key of a nested map belongs to the map.
      const above = index === 0 ? node.commentBefore : undefined;
      const comment = [pair.key.commentBefore, above, value?.comment].find(
        (candidate) => typeof candidate === 'string' && REMOVAL.test(candidate),
      );
      if (comment !== undefined && comment !== null) out.set(key, versionOf(comment));
      visit(pair.value, key);
    });
  };
  visit(parseDocument(yaml).contents, '');
  return out;
}

/** Marks the config items a package file's comments deprecate. */
export function markYamlDeprecations(items: Item[], deprecations: Map<string, string>): void {
  for (const item of items) {
    if (item.kind !== 'config' || item.flags.deprecated !== undefined) continue;
    const version = deprecations.get(item.id.slice('config:'.length));
    if (version !== undefined) item.flags.deprecated = version;
  }
}
