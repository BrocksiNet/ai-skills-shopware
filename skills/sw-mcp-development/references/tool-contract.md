# MCP tool contract, registration, and DAL usage

Scope: PHP MCP tool classes (`#[McpTool]`), their return values, tool groups,
DI registration, dry-run write safety, annotations, and DAL entity handling.
ACL and privilege checks (`#[McpToolRequires]`, `#[McpToolRequiresNoPrivilege]`,
`requirePrivilegeResult()`, Store API vs Admin API ACL) belong to `sw-security`
(`SEC-011`).

## Result contract

- **MCP-001** **Extend `McpToolResponse` and return `McpToolResult`, never a
  legacy JSON string.** Every `#[McpTool]` PHP class must extend
  `Shopware\Core\Framework\Mcp\Tool\McpToolResponse`, declare
  `__invoke(): McpToolResult` (not `string`, `?string`, `mixed`, or omitted),
  and return `$this->successResult($data, $meta, $summary)`,
  `$this->errorResult($message, $code, $details)`, or `McpToolResult::text()`
  for plain text. Do not hand-build `{"success": ...}` JSON strings or call the
  deprecated string helpers (`success()`, `error()`, `requirePrivilege()`,
  `missingPrivilegesError()`, `invalidCriteriaError()`, `decodeJsonOrError()`,
  `executeWithDryRun()` — all `@deprecated tag:v6.8.0`; use the `*Result()`
  counterparts). `McpToolResultRenderer` owns wire formatting (`structuredContent`,
  legacy envelope fallback, and oversized `resource_link` storage); tools never
  serialize their own MCP envelope. For expected business errors (not found,
  invalid arguments, missing privilege), use `McpToolError` constants
  (`NOT_FOUND`, `INVALID_ARGUMENTS`, `MISSING_PRIVILEGE`, `TOOL_ERROR`) instead
  of letting expected exceptions escape as opaque JSON-RPC `-32603` errors; let
  unexpected infrastructure exceptions (such as database failures) propagate for
  server-side logging.

## Tool groups and naming

- **MCP-002** **Never claim the reserved `discovery` tool group or the
  `shopware-` name prefix in an extension.** Assign every tool to an explicit
  toolset with `#[McpToolGroup('...', description: '...')]` (set `description`
  on one tool of the group, describing the tasks the toolset covers; without a
  group the tool falls into `other`). The `discovery` group is reserved for
  Shopware's three meta-tools (`shopware-tool-search`, `shopware-toolsets-list`,
  `shopware-toolset-enable`): any plugin or bundle tool declaring
  `#[McpToolGroup('discovery')]` is silently demoted to `other` at container
  compile time and loses its group description. To expose an extension's tools
  on the first `tools/list`, select its own toolset via `?toolsets=<group>` on
  the connect URL instead. Capability names must match `[a-zA-Z0-9_-]+` (no
  dots) and use `{plugin-name}-{capability-name}` for plugins or
  `{app-name}-{capability-name}` for apps; the `shopware-` prefix is reserved
  for core tools (and app tools starting with `shopware-` are silently skipped).
  Extensions may add tools to a core group such as `entity`, but a core bundle's
  group description always wins.

## DI registration and attribute placement

- **MCP-003** **Tag plugin and third-party bundle tools with
  `shopware.mcp.tool` (not `mcp.tool`) and place `#[McpTool]` on the class.**
  Core and in-tree bundles (`Shopware\Core\Framework\Mcp\`,
  `Shopware\Storefront\Mcp\`) sit under namespace prefixes configured in
  `packages/mcp.php`, so they use the `mcp.tool` SDK tag directly. Plugins and
  third-party Symfony bundles sit outside those prefixes: tag their Admin API
  tools with `shopware.mcp.tool` (or `shopware.store_api_mcp.tool` for Store API
  tools) so `McpToolDiscoveryCompilerPass` re-tags them as `mcp.tool` and
  appends their class to `mcp.servers.elements`. Tagging a plugin tool only with
  `mcp.tool` leaves it unassigned to any server (silently absent from HTTP
  endpoints), and placing `#[McpTool]` on `__invoke()` instead of the class
  prevents `McpToolDiscoveryCompilerPass` from extracting its name and skips the
  tool.

## Write safety and dry-run previews

- **MCP-004** **Write tools default to `bool $dryRun = true` and execute
  previews through `executeWithDryRunResult()`.** Any MCP tool that creates,
  updates, deletes, or transitions shop data or configuration must accept
  `bool $dryRun = true` so AI clients preview impact safely before committing.
  Run the dry-run path through
  `$this->executeWithDryRunResult($this->connection, $context, fn () => ...)`,
  which adds `Context::SKIP_TRIGGER_FLOW` (preventing Flow Builder actions and
  emails during preview), wraps the operation in a DBAL transaction, catches
  `\Throwable` into `$this->errorResult()`, and rolls back automatically. Do not
  hand-roll a dry-run flag that skips rollback or forgets `SKIP_TRIGGER_FLOW`,
  and validate inputs before running mutations.

## Annotations, schemas, and dependencies

- **MCP-005** **Declare `ToolAnnotations` and `#[Schema]` parameter
  descriptions on `#[McpTool]`, and use `#[McpToolDependsOn]` only for true
  prerequisites.** Every `#[McpTool]` should pass
  `annotations: new ToolAnnotations(...)` so clients know whether to ask for
  confirmation instead of assuming a destructive open-world tool:
  - Read-only tools set `readOnlyHint: true, openWorldHint: ...` and omit
    `destructiveHint` and `idempotentHint`.
  - Any tool with a write action sets `readOnlyHint: false` even when
    `$dryRun = true` by default; set `destructiveHint: true` whenever the tool
    can overwrite or delete existing data (not only delete), and
    `openWorldHint: true` only when it reaches external systems.
  - Put parameter descriptions in `#[Schema(description: '...')]`
    (`Mcp\Capability\Attribute\Schema`) on `__invoke()` parameters so the SDK
    emits them into `inputSchema` (not only PHPDoc `@param`), and give optional
    parameters a PHP default (`''` or `null`) so JSON Schema does not mark them
    `required`.
  - Declare real tool prerequisites with repeatable
    `#[McpToolDependsOn('other-tool')]` (not prose in `description`), and only
    when genuinely required — every dependency auto-expands every integration's
    allowlist.

## DAL entity tools

- **MCP-006** **Entity MCP tools validate criteria with `AclCriteriaValidator`
  and bound responses with `McpEntityIncludes` and `JsonEntityEncoder`.**
  Before running DAL queries built from caller criteria JSON:
  1. Check `$this->registry->has($entity)` before ACL checks so unknown entities
     return a clear `McpToolError::NOT_FOUND` result.
  2. Wrap **only** `RequestCriteriaBuilder::fromArray()` in
     `try / catch (ShopwareHttpException)` and return
     `$this->invalidCriteriaResult($e)` — keep the subsequent repository call
     outside that `try` so real DAL failures still propagate to server logs.
  3. Validate the built `Criteria` with `AclCriteriaValidator` before calling
     the repository: top-level `requirePrivilegeResult()` (`SEC-011`) does not
     check association reads, filters, or aggregations.
  4. For tools returning entity records, use the `McpEntityIncludes` trait
     (`$this->applyDefaultIncludes($definition, $criteria)`) and serialize via
     `JsonEntityEncoder` (never raw `jsonSerialize()`), so unrequested
     associations are stripped while `translated` fields stay intact.
  5. Keep search tools and aggregation tools separate: never add aggregation
     output to a row-returning search tool, because combining entity rows and
     bucket aggregations pushes responses past the inline budget.
