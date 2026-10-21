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

## Services live longer than a request

Workers, `messenger:consume` and runtimes like RoadRunner or FrankenPHP keep
the container alive across requests and messages.

- **ARCH-001** **A service that memoizes in a property resets it.** Implement
  Symfony's `ResetInterface` and clear the property in `reset()`, or tag the
  service `kernel.reset`. Without it, the next request or message sees the
  previous customer's, sales channel's or language's data. Key the memo by
  every input it depends on as well; a reset does not fix a memo keyed by
  product ID alone when the price depends on the sales channel.

## Plugins

See `shopware-plugin-development` → `symfony-first.md` for extension-layer
choices (HttpClient vs curl, etc.).

## Core modernization

Dual path required: new Symfony path behind major flag; legacy until major.
See `progressive-enhancement.md` and eval `core-http-client-behind-flag`.
