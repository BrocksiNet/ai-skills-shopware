# MCP apps, resources, resource templates, and prompts

Scope: Shopware app MCP capabilities (`Resources/mcp.xml` and serverless app
scripts), PHP MCP resources (`#[McpResource]`), dynamic resource templates
(`#[McpResourceTemplate]`), and prompts (`#[McpPrompt]`). For general app
manifests and permissions see `sw-app-development`; for tool ACL enforcement see
`sw-security` (`SEC-011`).

## Serverless app MCP tools

- **MCP-007** **Serverless app MCP tools target `/api/script/{path}`, read
  POST form `arguments`, and never serve HTTP-cached responses.** Apps declare
  MCP capabilities in `Resources/mcp.xml` (validated against `mcp-1.0.xsd`).
  When a tool's `url` starts with `/`, `AppMcpCapabilityExecutor` dispatches an
  internal Symfony subrequest (no external server or `<setup>` required) and
  inherits auth headers from the parent MCP request:
  - Always use `/api/script/{path}` (Admin API, POST-only, auth-required, never
    HTTP-cached), never `/store-api/script/{path}` (which passes through
    Shopware's HTTP cache layer — if a Store API script is unavoidable, call
    `{% do response.cache.disable() %}` before `hook.setResponse()`).
  - Read arguments in the Twig script via
    `hook.request.request.all('arguments') ?? {}`. `AppMcpCapabilityExecutor`
    sends `arguments` as a POST form parameter because `JsonRequestTransformer`
    does not run on subrequests; reading raw JSON request content returns empty.
  - Return the JSON envelope `{"success": true, "data": ...}` or
    `{"success": false, "error": "..."}` via `services.response.json(...)` (app
    tools keep the envelope format; PHP tools use `McpToolResult` per
    `MCP-001`).
  - Every privilege declared in `<required-privileges>` in `mcp.xml` must also
    appear in `<permissions>` in `manifest.xml` (otherwise app install/update
    fails); `<required-privileges>` is informational for operators (`SEC-011`).

## Resources, resource templates, and prompts

- **MCP-008** **Keep MCP resource and prompt cache hints `private` (never
  `public`), and register resource templates with `mcp.resource_template`.**
  - Static resources (`#[McpResource(uri: '...', name: '...', description: '...')]`)
    return `['uri' => ..., 'mimeType' => ..., 'text' => ...]` or
    `McpResourceCacheHint::read([...], $requestContext, <ttl>)` with
    `McpResourceCacheHint::DEPLOYMENT_TTL_MS` (deployment/plugin-only data) or
    `McpResourceCacheHint::SHOP_CONFIGURATION_TTL_MS` (shop config or app-mutable
    data). Never set a `public` cache scope or `Cache-Control: public` on MCP
    lists or resources: every response is filtered by the caller's credentials
    and allowlist, so a shared cache leaks one caller's data to another.
  - Dynamic URI resources use
    `#[McpResourceTemplate(uriTemplate: 'shopware://.../{id}', name: '...', description: '...', mimeType: '...')]`
    with at least one URI placeholder and a `[a-zA-Z0-9_-]+` name, throw
    `Mcp\Exception\ResourceNotFoundException` (such as
    `McpException::toolResultNotFound($id)`) when missing, and register with the
    `mcp.resource_template` DI tag — **not** `mcp.resource`.
  - Prompts (`#[McpPrompt(name: '...', description: '...')]`) return a list of
    `['role' => '...', 'content' => '...']` messages. Tag plugin prompts and
    static resources with `shopware.mcp.prompt` / `shopware.mcp.resource` (or
    `shopware.store_api_mcp.*` for Store API); core in-tree bundles use
    `mcp.prompt` / `mcp.resource` / `mcp.resource_template`.
