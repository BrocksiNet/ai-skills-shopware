import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bundleConfigItems } from '../src/bundle-config.ts';
import { featureItems } from '../src/features.ts';
import type { Item } from '../src/model.ts';
import { markYamlDeprecations, yamlDeprecations } from '../src/package-yaml.ts';

function byId(items: Item[]): Map<string, Item> {
  return new Map(items.map((item) => [item.id, item]));
}

function get(items: Map<string, Item>, id: string): Item {
  const found = items.get(id);
  assert.ok(found, `no item ${id}`);
  return found;
}

test('feature flags: major flags are deprecated for their major, experimental ones marked', () => {
  const yaml = `shopware:
  feature:
    flags:
      - name: STABLE
        default: false
        major: false
      - name: NEXT
        default: false
        major: v6.8.0.0
      - name: OLD
        major: true
      - name: TRY
        major: false
        description: "Experimental! Try it."
      # @deprecated tag:v6.8.0 - remove
      - name: GONE
        major: false
`;
  const items = byId(featureItems(yaml));
  assert.deepEqual(get(items, 'feature:STABLE').flags, {});
  assert.equal(get(items, 'feature:STABLE').signature, 'default=false major=false toggleable=-');
  assert.equal(get(items, 'feature:NEXT').flags.deprecated, 'v6.8.0');
  assert.equal(get(items, 'feature:OLD').flags.deprecated, '');
  assert.equal(get(items, 'feature:TRY').flags.experimental, '');
  assert.equal(get(items, 'feature:GONE').flags.deprecated, 'v6.8.0');
});

const CONFIGURATION = `<?php
namespace Shopware\\Core\\Demo;
use Symfony\\Component\\Config\\Definition\\Builder\\TreeBuilder;
use Symfony\\Component\\Config\\Definition\\ConfigurationInterface;
class Configuration implements ConfigurationInterface {
    public function getConfigTreeBuilder(): TreeBuilder {
        $treeBuilder = new TreeBuilder('shopware');
        $rootNode = $treeBuilder->getRootNode();
        $rootNode
            ->children()
                ->append($this->createCacheSection())
                ->arrayNode('pools')
                    ->useAttributeAsKey('name')
                    ->arrayPrototype()
                        ->children()
                            ->scalarNode('dsn')->end() // @deprecated tag:v6.8.0 - will be removed
                        ->end()
                    ->end()
                ->end()
            ->end();
        return $treeBuilder;
    }

    private function createCacheSection(): ArrayNodeDefinition {
        $rootNode = (new TreeBuilder('cache'))->getRootNode();
        $rootNode
            ->children()
                ->booleanNode('compress')
                    ->defaultFalse()
                    ->setDeprecated('shopware/core', '6.7.1.0', 'Removed in 6.8.0.0')
                ->end()
                ->integerNode('ttl')
                    ->beforeNormalization()->ifString()->then(fn ($v) => (int) $v)->end()
                    ->defaultValue(60)
                ->end()
            ->end();
        return $rootNode;
    }
}`;

test('bundle config: keys, prototypes, appended sections, defaults and deprecations', () => {
  const items = byId(bundleConfigItems(CONFIGURATION, 'Configuration.php'));
  assert.deepEqual([...items.keys()].toSorted(), [
    'config:shopware.cache',
    'config:shopware.cache.compress',
    'config:shopware.cache.ttl',
    'config:shopware.pools',
    'config:shopware.pools.*',
    'config:shopware.pools.*.dsn',
  ]);
  assert.equal(get(items, 'config:shopware.cache.compress').signature, 'boolean = false');
  assert.equal(get(items, 'config:shopware.cache.compress').flags.deprecated, 'v6.8.0');
  assert.equal(get(items, 'config:shopware.cache.ttl').signature, 'integer = 60');
  // A trailing comment deprecates the key it ends.
  assert.equal(get(items, 'config:shopware.pools.*.dsn').flags.deprecated, 'v6.8.0');
  assert.equal(get(items, 'config:shopware.pools').flags.deprecated, undefined);
});

test('package YAML: a comment above a key or the first key of a map deprecates it', () => {
  const yaml = `storefront:
    theme:
        # @deprecated tag:v6.7.0 - will be removed
        auto_prefix_css: false
        validate_on_compile: false
    jwt_key:
        other: 1
        # tag:v6.7.0 - delete setting, as it should be always enabled
        use_app_secret: false
`;
  const found = yamlDeprecations(yaml);
  assert.deepEqual(
    [...found.entries()].toSorted(([a], [b]) => a.localeCompare(b)),
    [
      ['storefront.jwt_key.use_app_secret', 'v6.7.0'],
      ['storefront.theme.auto_prefix_css', 'v6.7.0'],
    ],
  );
  const items: Item[] = [{ id: 'config:storefront.theme.auto_prefix_css', kind: 'config', file: 'c', flags: {} }];
  markYamlDeprecations(items, found);
  assert.equal(items[0]?.flags.deprecated, 'v6.7.0');
});
