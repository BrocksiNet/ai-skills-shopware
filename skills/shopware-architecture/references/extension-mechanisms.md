# Extension mechanism choice

Load when adding extensibility or integrating with core.

## Decision table

| Need | Prefer |
| ---- | ------ |
| React to core lifecycle / domain event | `EventSubscriber` / `#[AsEventListener]` |
| Replace core service behaviour | **Decoration** (`decorates:` in DI) |
| Add fields to existing entity | Entity extension / custom fields |
| New HTTP surface for headless | Store-API or Admin route + OpenAPI (see plugin api-contracts) |
| Template-only customization | Twig inheritance / blocks (Storefront) |
| New provider-style hook already in core | Existing registry (do not invent parallel provider interfaces) |

## Rules

- **Plugins:** extend, do not modify core/vendor files.
- **Core:** prefer existing extension mechanisms over new provider interfaces
  when they already express the contract.
- **One listener** for one event → `#[AsEventListener]` over full subscriber
  boilerplate.

## Independence angle

When decoupling core modules, **events and narrow interfaces** beat shared
static helpers or cross-bundle class imports.
