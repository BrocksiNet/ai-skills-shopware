# Symfony components inside Shopware boundaries

Load when choosing Symfony vs custom code or Shopware platform services.

## Prefer Symfony when the pinned stack has it

| Need | Symfony / platform |
| ---- | ------------------ |
| HTTP outbound | `HttpClientInterface` |
| Async work | Messenger (when appropriate) |
| Validation | Validator component + constraints |
| Time | `ClockInterface` |
| IDs | `Symfony\Component\Uid\Uuid` where version allows |

**Always confirm** `composer.lock` — do not use APIs from newer Symfony docs than
the project pins (`shopware-research-and-escalation`).

## Stay on Shopware platform APIs for

- DAL reads/writes, indexing, versioning, translations
- Cache invalidation and HTTP cache tags (`CacheTagCollector` on 6.7+)
- ACL, sales channel context, feature flags (`Feature::isActive`)
- Extension points (events, decoration, entity extensions)

Symfony lives **inside** services — it does not replace the DAL or extension model.

## Plugins

See `shopware-plugin-development` → `symfony-first.md` for extension-layer
choices (HttpClient vs curl, etc.).

## Core modernization

Dual path required: new Symfony path behind major flag; legacy until major.
See `progressive-enhancement.md` and eval `core-http-client-behind-flag`.
