# Pattern catalog (living)

Established patterns we enforce with evals; candidate patterns graduate from
reviews into here.

## Established

| Pattern | Anti-pattern | Eval / owner |
| ------- | ------------ | ------------ |
| Bounded Criteria reads | Unlimited search | `dal-search-without-limit` |
| Repository for entity data | Connection CRUD | `no-dal-connection-for-entity-read` |
| Dual path behind feature flag | Delete legacy immediately | `core-http-client-behind-flag` |
| Interface injection | Concrete repository in constructor | `interface-di-repository` |
| Clock injection | `time()` in domain | `clock-interface-injection` |
| CacheTagCollector (6.7+) | Deprecated `*CacheTagsEvent` | `cache-tag-no-deprecated-event` |
| Thin controller | DAL in controller | `business-logic-in-controller` |

## Candidate (graduate when recurring)

| Pattern | When to propose |
| ------- | --------------- |
| Extract Criteria builder service | Same complex Criteria copied in 3+ callers |
| Gateway for external HTTP | HTTP calls scattered in subscribers |
| Domain event before framework hook | Business rules hidden in infrastructure listener |
| Strangler module behind flag | Whole subsystem replacement — needs ADR |
| Read port interface in Core | Storefront/Admin need opposite dependency today |

## How to add

1. Recurs in review ≥2 times (`shopware-review-learnings` delta principle).
2. Assign one owner in `REGISTRY.md`.
3. Add eval under `evals/tasks/<rule>/` when gradable.
4. Move row from Candidate → Established when eval lands.
