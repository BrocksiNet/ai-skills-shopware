# Task: update a plugin MCP tool to Shopware's structured result contract

`src/Mcp/Tool/PointsLookupTool.php` is a Shopware 6.7.17+ / 6.8.0 plugin MCP
tool that still builds JSON strings by hand and does not inherit from
Shopware's MCP tool base class.

Update `src/Mcp/Tool/PointsLookupTool.php` so it follows Shopware's current MCP
tool result contract without legacy JSON string results. Keep the existing
customer lookup logic and privilege check intact.
