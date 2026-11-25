# Task: make a mutating Shopware MCP tool safe with dry-run previews

`src/Mcp/Tool/AdjustPointsTool.php` is a Shopware 6.7.17+ / 6.8.0 plugin MCP
write tool that currently mutates customer loyalty balances immediately without
a dry-run preview mode.

Update `src/Mcp/Tool/AdjustPointsTool.php` so it follows Shopware's MCP write
tool safety pattern (safe default dry-run mode using Shopware's built-in
rollback helper). Keep the privilege check and `McpToolResult` return type.
