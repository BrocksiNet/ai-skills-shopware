# Testing and debugging MCP capabilities

Scope: verifying MCP registration, clearing compiled description caches,
placing Storefront-dependent tools, and writing focused unit/integration tests
for MCP capabilities. General PHPUnit conventions stay in `sw-testing`.

## Clear cache after editing descriptions

`#[McpTool(description: ...)]` and `#[Schema(description: ...)]` are extracted
at container compile time and baked into the compiled DI container. Edits to
tool or parameter descriptions do not appear in `debug:mcp` or `tools/list`
until you run `bin/console cache:clear`. (`ShopwareContextPrompt` computes its
content dynamically in `__invoke()`, so prompt text updates immediately.)

## Inspecting loaded capabilities

- `bin/console debug:mcp` builds the same `Registry` instances as `/api/_mcp`
  and `/store-api/_mcp` and lists tools with their Group, Source, Dependencies,
  and Privileges. Use `--scope=api`, `--scope=store-api`, or
  `--integration=SWIA...` to filter. Any capability assigned to no server is
  reported in the footer.
- `bin/console debug:mcp --native` (alias `debug:mcp:native`) shows the MCP
  bundle's view: configured servers, prompts, resources, **Resource Templates**,
  and capabilities assigned to no server.

## Testing tools

- **Unit tests** invoke `$tool(...)` directly with a stubbed
  `McpContextProviderInterface` / `McpContextProvider` and assert on the
  returned `McpToolResult` (`$result->isError()`, `$result->data`,
  `$result->meta`, `$result->error?->code`). Test both dry-run (`$dryRun: true`)
  and commit paths for write tools, plus missing-privilege paths (`SEC-011`)
  and invalid criteria handling (`MCP-006`).
- **Core integration discovery:** when adding a new core tool, prompt, or
  resource in `shopware/shopware`, add its capability name to `expectedTools()`,
  `expectedPrompts()`, or `expectedResources()` in
  `tests/integration/Core/Framework/Mcp/McpCapabilityDiscoveryTest.php` (the
  authoritative full-kernel HTTP check).
- **Storefront-dependent core tools** live under `src/Storefront/Mcp/` and
  register in `src/Storefront/DependencyInjection/mcp.php` with `mcp.tool`
  (never add a `Core -> Storefront` dependency).

## Checking plugin MCP compatibility across Shopware versions

Because MCP classes and tags arrived in 6.7.15+ and remain `@experimental`
until 6.8.0, check your plugin's supported `shopware/core` range with:

```bash
git diff origin/main...HEAD | npx -y shopware-api-index@0.1.0-beta.2 facts --diff - .
```
