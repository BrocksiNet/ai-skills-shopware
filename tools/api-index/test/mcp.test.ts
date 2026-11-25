import assert from 'node:assert/strict';
import { test } from 'node:test';
import { diffSnapshots, diffText, isBreak } from '../src/api-diff.ts';
import { mcpItems } from '../src/mcp.ts';
import type { Item, Snapshot } from '../src/model.ts';
import { lineOf } from '../src/source-line.ts';
import { surfaceOf } from '../src/surfaces.ts';
import { ATTRIBUTE_GROUP, BASE_TOOL, COMPILER_PASS, CONTEXT_INTERFACE, CORE_MCP_FILES } from './mcp-fixtures.ts';

function get(items: Map<string, Item>, id: string): Item {
  const found = items.get(id);
  assert.ok(found, `missing item ${id}`);
  return found;
}

function snap(ref: string, items: Item[]): Snapshot {
  return { schema: 1, generator: 'test', ref, sha: `sha-${ref}`, builtAt: '2026-11-25T00:00:00Z', failed: [], items };
}

test('mcpItems: extracts attributes, interfaces, abstract bases, traits, and DI tags', () => {
  const items = new Map(mcpItems(CORE_MCP_FILES).map((item) => [item.id, item]));
  const group = get(items, 'mcp:attribute:Shopware\\Core\\Framework\\Mcp\\Attribute\\McpToolGroup');
  assert.equal(surfaceOf(group), 'mcp');
  assert.equal(group.signature, 'attribute (string $group, ?string $description = …)');
  assert.equal(group.flags.experimental, 'v6.8.0');

  const iface = get(items, 'mcp:interface:Shopware\\Core\\Framework\\Mcp\\Context\\McpContextProviderInterface');
  assert.equal(iface.signature, 'interface getContext(): Shopware\\Core\\Framework\\Context');
  assert.equal(get(items, 'mcp:base:Shopware\\Core\\Framework\\Mcp\\Tool\\McpToolResponse').abstract, true);
  assert.equal(get(items, 'mcp:trait:Shopware\\Core\\Framework\\Mcp\\Tool\\McpEntityIncludes').signature, 'trait');
  assert.equal(items.has('mcp:base:Shopware\\Core\\Framework\\Mcp\\Context\\StoreApiMcpContextProvider'), false);
  assert.equal(items.has('mcp:base:Shopware\\Core\\Framework\\Mcp\\Tool\\EntitySearchTool'), false);

  const pluginTag = get(items, 'mcp:tag:shopware.mcp.tool');
  assert.equal(pluginTag.scope, 'admin');
  assert.equal(pluginTag.signature, 'tag -> mcp.tool');
  assert.equal(get(items, 'mcp:tag:shopware.store_api_mcp.tool').scope, 'store-api');
  assert.equal(get(items, 'mcp:tag:mcp.resource_template').signature, 'sdk tag');
  assert.equal(get(items, 'mcp:tag:mcp.loader').signature, 'sdk tag');
});

const DIFF_BASE: Item[] = [
  {
    id: 'mcp:tag:shopware.mcp.tool',
    kind: 'mcp',
    file: 'McpToolDiscoveryCompilerPass.php',
    scope: 'admin',
    signature: 'tag -> mcp.tool',
    flags: {},
  },
  {
    id: 'mcp:tag:shopware.mcp.old',
    kind: 'mcp',
    file: 'McpToolDiscoveryCompilerPass.php',
    scope: 'admin',
    signature: 'tag -> mcp.old',
    flags: { deprecated: 'v6.9.0' },
  },
  {
    id: 'mcp:attribute:Shopware\\Core\\Framework\\Mcp\\Attribute\\McpToolGroup',
    kind: 'mcp',
    file: 'McpToolGroup.php',
    signature: 'attribute (string $group, ?string $description = …)',
    flags: {},
  },
  {
    id: 'mcp:interface:Shopware\\Core\\Framework\\Mcp\\Context\\McpContextProviderInterface',
    kind: 'mcp',
    file: 'McpContextProviderInterface.php',
    signature: 'interface getContext(): Shopware\\Core\\Framework\\Context',
    flags: { experimental: 'v6.9.0' },
  },
];

const DIFF_HEAD: Item[] = [
  {
    id: 'mcp:tag:shopware.mcp.tool',
    kind: 'mcp',
    file: 'McpToolDiscoveryCompilerPass.php',
    scope: 'store-api',
    signature: 'tag -> mcp.store_tool',
    flags: {},
  },
  {
    id: 'mcp:attribute:Shopware\\Core\\Framework\\Mcp\\Attribute\\McpToolGroup',
    kind: 'mcp',
    file: 'McpToolGroup.php',
    signature: 'attribute (string $group)',
    flags: {},
  },
];

test('api-diff: reports MCP tag removals, remappings, and stable signature changes', () => {
  const diff = diffSnapshots(snap('v6.8.0', DIFF_BASE), snap('v6.9.0', DIFF_HEAD), ['mcp']);
  const byKey = new Map(diff.changes.map((c) => [`${c.kind} ${c.id}`, c]));
  assert.equal(diff.skipped, 1);

  const tagChanged = byKey.get('changed mcp:tag:shopware.mcp.tool');
  assert.ok(tagChanged);
  assert.equal(isBreak(tagChanged), true);
  assert.match(tagChanged.detail, /tag -> mcp\.tool → tag -> mcp\.store_tool/u);
  assert.match(tagChanged.detail, /scope admin → store-api/u);

  const oldRemoved = byKey.get('removed mcp:tag:shopware.mcp.old');
  assert.ok(oldRemoved);
  assert.equal(oldRemoved.announced, true);
  assert.equal(isBreak(oldRemoved), false);

  const attrChanged = byKey.get('changed mcp:attribute:Shopware\\Core\\Framework\\Mcp\\Attribute\\McpToolGroup');
  assert.ok(attrChanged);
  assert.equal(isBreak(attrChanged), true);
  assert.match(diffText(diff), /\nmcp\n/u);
});

test('source-line: locates MCP tags and PHP extension points', () => {
  assert.equal(lineOf('mcp:tag:shopware.mcp.tool', COMPILER_PASS), 15);
  assert.equal(lineOf('mcp:attribute:Shopware\\Core\\Framework\\Mcp\\Attribute\\McpToolGroup', ATTRIBUTE_GROUP), 6);
  assert.equal(
    lineOf('mcp:interface:Shopware\\Core\\Framework\\Mcp\\Context\\McpContextProviderInterface', CONTEXT_INTERFACE),
    7,
  );
  assert.equal(lineOf('mcp:base:Shopware\\Core\\Framework\\Mcp\\Tool\\McpToolResponse', BASE_TOOL), 5);
});
