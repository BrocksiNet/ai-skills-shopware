import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePhp } from '../src/php.mjs';
import { evaluate as evalStructuredResult } from '../src/tasks/mcp-tool-structured-result.mjs';
import { evaluate as evalWriteDryRun } from '../src/tasks/mcp-write-tool-dry-run.mjs';

test('mcp-tool-structured-result: passes when extending McpToolResponse and returning McpToolResult', () => {
  const ast = parsePhp(`<?php
namespace Swag\\Demo\\Mcp\\Tool;
use Mcp\\Capability\\Attribute\\McpTool;
use Shopware\\Core\\Framework\\Mcp\\Result\\McpToolError;
use Shopware\\Core\\Framework\\Mcp\\Result\\McpToolResult;
use Shopware\\Core\\Framework\\Mcp\\Tool\\McpToolResponse;

#[McpTool(name: 'swag-demo-lookup', description: 'Lookup')]
class PointsLookupTool extends McpToolResponse {
    public function __invoke(string $id): McpToolResult {
        if ($id === '') {
            return $this->errorResult('missing', McpToolError::INVALID_ARGUMENTS);
        }
        return $this->successResult(['id' => $id]);
    }
}
`);
  assert.equal(evalStructuredResult(ast).score, 1);
});

test('mcp-tool-structured-result: rejects legacy string return even with McpToolResult in docblock', () => {
  const ast = parsePhp(`<?php
namespace Swag\\Demo\\Mcp\\Tool;
use Mcp\\Capability\\Attribute\\McpTool;
use Shopware\\Core\\Framework\\Mcp\\Tool\\McpToolResponse;

#[McpTool(name: 'swag-demo-lookup', description: 'Lookup')]
class PointsLookupTool extends McpToolResponse {
    /** McpToolResult successResult() errorResult() */
    public function __invoke(string $id): string {
        if ($id === '') {
            return $this->error('missing');
        }
        return $this->success(['id' => $id]);
    }
}
`);
  assert.equal(evalStructuredResult(ast).score, 0);
});

test('mcp-tool-structured-result: rejects union return type containing string', () => {
  const ast = parsePhp(`<?php
namespace Swag\\Demo\\Mcp\\Tool;
use Mcp\\Capability\\Attribute\\McpTool;
use Shopware\\Core\\Framework\\Mcp\\Result\\McpToolResult;
use Shopware\\Core\\Framework\\Mcp\\Tool\\McpToolResponse;

#[McpTool(name: 'swag-demo-lookup', description: 'Lookup')]
class PointsLookupTool extends McpToolResponse {
    public function __invoke(string $id): McpToolResult|string {
        if ($id === '') {
            return $this->errorResult('missing');
        }
        return $this->successResult(['id' => $id]);
    }
}
`);
  assert.equal(evalStructuredResult(ast).score, 0);
});

test('mcp-write-tool-dry-run: passes with bool $dryRun = true and executeWithDryRunResult', () => {
  const ast = parsePhp(`<?php
namespace Swag\\Demo\\Mcp\\Tool;
use Shopware\\Core\\Framework\\Mcp\\Result\\McpToolResult;
use Shopware\\Core\\Framework\\Mcp\\Tool\\McpToolResponse;

class AdjustPointsTool extends McpToolResponse {
    public function __invoke(string $id, int $delta, bool $dryRun = true): McpToolResult {
        $op = fn () => $this->successResult(['id' => $id]);
        return $dryRun ? $this->executeWithDryRunResult($this->connection, $context, $op) : $op();
    }
}
`);
  assert.equal(evalWriteDryRun(ast).score, 1);
});

test('mcp-write-tool-dry-run: rejects $dryRun = false or legacy executeWithDryRun()', () => {
  const wrongDefault = parsePhp(`<?php
namespace Swag\\Demo\\Mcp\\Tool;
use Shopware\\Core\\Framework\\Mcp\\Result\\McpToolResult;
use Shopware\\Core\\Framework\\Mcp\\Tool\\McpToolResponse;

class AdjustPointsTool extends McpToolResponse {
    public function __invoke(string $id, int $delta, bool $dryRun = false): McpToolResult {
        return $this->executeWithDryRunResult($this->connection, $context, fn () => $this->successResult([]));
    }
}
`);
  assert.equal(evalWriteDryRun(wrongDefault).score, 0);

  const legacyHelper = parsePhp(`<?php
namespace Swag\\Demo\\Mcp\\Tool;
use Shopware\\Core\\Framework\\Mcp\\Result\\McpToolResult;
use Shopware\\Core\\Framework\\Mcp\\Tool\\McpToolResponse;

class AdjustPointsTool extends McpToolResponse {
    public function __invoke(string $id, int $delta, bool $dryRun = true): McpToolResult {
        return $this->executeWithDryRun($this->connection, $context, fn () => $this->success([]));
    }
}
`);
  assert.equal(evalWriteDryRun(legacyHelper).score, 0);
});
