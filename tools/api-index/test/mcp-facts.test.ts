import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import { Lookup } from '../src/facts.ts';
import { isMcpConfigFile, mcpItems, mcpUses } from '../src/mcp.ts';
import { phpItems } from '../src/php.ts';
import { describe, factsOfDir } from '../src/report.ts';
import { mergeSnapshots } from '../src/timeline.ts';
import { ATTRIBUTE_GROUP, BASE_TOOL, CORE_MCP_FILES } from './mcp-fixtures.ts';

function writePluginFixture(dir: string): void {
  mkdirSync(`${dir}/src/Resources/config`, { recursive: true });
  mkdirSync(`${dir}/src/Mcp/Tool`, { recursive: true });
  writeFileSync(`${dir}/composer.json`, JSON.stringify({ require: { 'shopware/core': '~6.6.0 || ~6.7.0' } }));
  writeFileSync(
    `${dir}/src/Resources/config/services.xml`,
    '<container><services><service id="Swag\\Demo\\Mcp\\Tool\\PointsTool"><tag name="shopware.mcp.tool"/></service></services></container>',
  );
  writeFileSync(
    `${dir}/src/Resources/config/services.php`,
    "<?php return static function ($c): void { $c->services()->set('p')->tag('shopware.mcp.prompt'); };",
  );
  writeFileSync(
    `${dir}/src/Mcp/Tool/PointsTool.php`,
    `<?php declare(strict_types=1);
namespace Swag\\Demo\\Mcp\\Tool;
use Shopware\\Core\\Framework\\Mcp\\Attribute\\McpToolGroup;
use Shopware\\Core\\Framework\\Mcp\\Tool\\McpToolResponse;

#[McpToolGroup('swag-demo')]
class PointsTool extends McpToolResponse {}
`,
  );
}

test('mcpUses: extracts MCP DI tags from XML and PHP service config only', () => {
  assert.equal(isMcpConfigFile('src/Resources/config/services.xml'), true);
  assert.equal(isMcpConfigFile('src/Resources/config/services.php'), true);
  assert.equal(isMcpConfigFile('src/Mcp/Tool/PointsTool.php'), false);

  const xmlUses = mcpUses(
    'src/Resources/config/services.xml',
    '<services>\n  <service id="A"><tag name="shopware.mcp.tool"/></service>\n  <service id="B"><tag name="kernel.event_subscriber"/></service>\n</services>',
  );
  assert.deepEqual(xmlUses, [
    { target: 'mcp:tag:shopware.mcp.tool', how: 'mcp-tag', file: 'src/Resources/config/services.xml', line: 2 },
  ]);
});

test('api-facts: detects missing MCP tags and experimental PHP classes across a plugin range', () => {
  const v66 = {
    schema: 1 as const,
    generator: 'test',
    ref: 'v6.6.10.0',
    sha: 'sha-66',
    builtAt: '2026-11-25T00:00:00Z',
    failed: [],
    items: [],
  };
  const v67 = {
    ...v66,
    ref: 'v6.7.15.0',
    sha: 'sha-67',
    items: [
      ...mcpItems(CORE_MCP_FILES),
      ...phpItems(BASE_TOOL, 'src/Core/Framework/Mcp/Tool/McpToolResponse.php'),
      ...phpItems(ATTRIBUTE_GROUP, 'src/Core/Framework/Mcp/Attribute/McpToolGroup.php'),
    ],
  };
  const lookup = new Lookup(mergeSnapshots([v66, v67]));
  const dir = mkdtempSync(`${tmpdir()}/mcp-facts-`);
  try {
    writePluginFixture(dir);
    const summary = factsOfDir(lookup, dir, '~6.6.0 || ~6.7.0').facts.map(
      (fact) => `${fact.target} => ${describe(fact)}`,
    );
    assert.ok(summary.includes('mcp:tag:shopware.mcp.tool => missing in 6.6.10.0'), summary.join('\n'));
    assert.ok(summary.includes('mcp:tag:shopware.mcp.prompt => missing in 6.6.10.0'), summary.join('\n'));
    assert.ok(
      summary.includes('php:Shopware\\Core\\Framework\\Mcp\\Tool\\McpToolResponse => missing in 6.6.10.0'),
      summary.join('\n'),
    );
    assert.ok(
      summary.includes('php:Shopware\\Core\\Framework\\Mcp\\Tool\\McpToolResponse => @experimental in 6.7.15.0'),
      summary.join('\n'),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
