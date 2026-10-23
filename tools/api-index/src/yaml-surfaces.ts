// Surfaces read from YAML rather than PHP.
import { FEATURE_FILE, featureItems } from './features.ts';
import { readFiles } from './git.ts';
import type { Item } from './model.ts';
import { markYamlDeprecations, PACKAGE_FILES, yamlDeprecations } from './package-yaml.ts';

/** The feature flags, and the config keys the package YAML marks deprecated. */
export function yamlSurfaces(repo: string, ref: string, items: Item[]): void {
  const files = readFiles(repo, ref, [FEATURE_FILE, ...PACKAGE_FILES]);
  const features = files.get(FEATURE_FILE);
  if (features !== undefined) items.push(...featureItems(features));
  for (const file of PACKAGE_FILES) {
    const yaml = files.get(file);
    if (yaml !== undefined) markYamlDeprecations(items, yamlDeprecations(yaml));
  }
}
