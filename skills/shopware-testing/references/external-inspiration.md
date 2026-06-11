# External PHPUnit references

## FriendsOfShopware — shopware-phpunit

[FriendsOfShopware/agent-skills — shopware-phpunit](https://github.com/FriendsOfShopware/agent-skills/tree/main/skills/shopware-phpunit)

Best starting point for **plugin and app** projects. High-value reference files
we have not duplicated here (load from upstream when needed):

| FoS reference | Topic |
| ------------- | ----- |
| `setup-kernel-bootstrap.md` | Kernel bootstrap in plugin tests |
| `setup-base-test-class.md` | Plugin base test classes |
| `data-product-builder.md` | Rich product fixtures |
| `data-test-fixtures.md` | Fixture cleanup patterns |
| `mock-static-entity-repository.md` | `StaticEntityRepository` in unit tests |
| `mock-static-system-config-service.md` | Config service mocks |
| `mock-service-decoration.md` | Decoration in tests |
| `api-store-api-testing.md` | Store API route tests |

Install alongside this repo when working on plugins:

```bash
npx skills add FriendsOfShopware/agent-skills --skill shopware-phpunit -a cursor
```

## shopware/shopware core

- `coding-guidelines/core/unit-tests.md` — platform conventions.
- `tests/unit/`, `tests/integration/`, `tests/migration/` — copy patterns from
  neighbouring tests in the same area.

## What we own vs FoS

| Topic | Owning skill here |
| ----- | ----------------- |
| shopware/shopware migration + Codecov placement | `shopware-testing` → `core-platform-patterns.md` |
| Plugin fixture builders, Store API plugin routes | FoS `shopware-phpunit` (install separately) |
| Auto-generate + review loop with MCP test-rules | shopware-ai-coding-tools plugin (optional; see `docs/tooling-stack.md`) |
