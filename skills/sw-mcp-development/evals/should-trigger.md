# sw-mcp-development — should trigger

- Add an MCP tool to my Shopware plugin that exports recent orders.
- My plugin's new #[McpTool] service does not show up in /api/_mcp or debug:mcp. What DI tag should it use?
- Refactor this Shopware MCP tool from returning a JSON string via $this->success() to McpToolResult.
- Can my plugin put its MCP tool in #[McpToolGroup('discovery')] so clients see it on the first tools/list?
- How should a write MCP tool handle dryRun and ToolAnnotations in Shopware?
- Add a serverless app MCP tool in Resources/mcp.xml using an Admin API app script.
- Add a dynamic #[McpResourceTemplate] resource to expose cached plugin reports over MCP.
- My entity search MCP tool accepts criteria JSON — how should it validate associations and bound returned fields?
