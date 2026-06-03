# Shopware docs map (topic -> where to look)

Load this when you need to find the authoritative source for a Shopware topic.
Always cross-check behavior-sensitive details against the installed vendor code
or the matching release tag — docs are the starting point, not the final word.

## Primary sources

- **Developer docs:** https://developer.shopware.com/docs — concepts, guides, API.
- **Core source:** `vendor/shopware/core` in the project, or `shopware/shopware`
  at the **release tag matching the project version** (never `trunk`).
- **Coding guidelines:** `shopware/shopware` `coding-guidelines/` and `adr/`.

## Topic map

| Topic | Where to look |
| ----- | ------------- |
| Architecture & concepts | developer docs "Concepts"; `src/Core` structure |
| DAL (Criteria, entities, associations) | docs "Data Abstraction Layer"; `Core/Framework/DataAbstractionLayer` |
| Store API | docs "Store API"; `Core/.../SalesChannel` routes |
| Admin API | docs "Admin API"; `Core/Framework/Api` |
| HTTP cache & cache tags (6.7) | docs "HTTP cache"; `Core/Framework/Adapter/Cache` |
| Messaging & scheduled tasks | docs "Message queue", "Scheduled tasks"; `Core/Framework/MessageQueue` |
| Indexing (DAL indexers) | docs "Indexing"; `*Indexer` classes in core |
| Migrations | docs "Database migrations"; `Core/Framework/Migration` |
| Plugin fundamentals & lifecycle | docs "Plugin base guide"; `Core/Framework/Plugin` |
| Apps & app scripts | docs "App base guide", "App scripts" |
| Storefront (Twig, JS plugins, theme) | docs "Storefront"; `src/Storefront` |
| Administration (Vue, modules, components) | docs "Administration"; `src/Administration` |
| Flow Builder / business events | docs "Flow Builder"; `Core/Content/Flow` |
| Testing | docs "Testing"; `IntegrationTestBehaviour`, `tests/` in core |

## Rule

If the answer affects behavior (not just naming), open the actual class in the
installed version and read it. Cite what you read.
