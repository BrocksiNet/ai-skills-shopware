# Symfony-first (plugins & project code)

Load this when implementing **new** plugin or project backend code and you are
about to hand-roll something Symfony already provides on the **pinned** stack.

Core/platform changes that must preserve BC use
[`shopware-core-development/references/modernization-and-flags.md`](../../shopware-core-development/references/modernization-and-flags.md)
(feature flags + dual paths). **Plugins** adopt the modern API when the supported
`shopware/core` range allows it — gate with `class_exists` / version checks only
when you still support an older minor ([`version-compatibility.md`](version-compatibility.md)).

## Before building custom code

1. Check `composer.json` / `composer.lock` for the Symfony major Shopware ships.
2. Ask: does Symfony already solve this **on that version**?
3. Ask: does Shopware expose a **platform** API (DAL, cache, Messenger wiring,
   ACL)? Use the platform contract; Symfony belongs inside your services.
4. If unsure, research via `shopware-research-and-escalation` — not latest Symfony docs.

## Prefer Symfony over custom (when pinned version allows)

| Instead of | Prefer |
| ---------- | ------ |
| `curl` / `file_get_contents` for HTTP | `Symfony\Contracts\HttpClient\HttpClientInterface` |
| Hand-rolled retry/backoff loops | Messenger retries, or HttpClient retry config where appropriate |
| `time()` / `date()` for business logic | `Psr\Clock\ClockInterface` (`php-foundation`) |
| Ad-hoc validation in controllers | Symfony Validator + constraints / `#[MapRequestPayload]` where the stack allows |
| Custom job queue glue | `MessageBusInterface` + message handlers |
| String UUIDs from `uniqid` / random | `Symfony\Component\Uid\Uuid` when available on pinned Symfony |
| Fat controllers with orchestration | Thin controller + injected service (`shopware-plugin-development`) |

## Do not replace Shopware with Symfony

These stay **platform-first** (Symfony may implement internals, but you call Shopware):

- Entity reads/writes → DAL (`Criteria`, repository interfaces)
- HTTP cache tags (6.7+) → `CacheTagCollector` / `CacheInvalidator`
- Plugin lifecycle, migrations → `MigrationStep`, plugin class hooks
- Store-API / Admin routes → Shopware routing, ACL, OpenAPI conventions

## Copying from core

Do **not** copy a historic core workaround into plugin code if:

- Core still has it for BC only, and
- A Symfony or 6.7+ replacement exists for **new** extensions.

Example: deprecated `*CacheTagsEvent` in old core samples → use `CacheTagCollector`
in new plugin code ([`cache-tags.md`](cache-tags.md)).

## Cross-version plugins (6.6 + 6.7)

- Prefer bumping `composer.json` min version when the project allows.
- Otherwise capability-gate the modern path; test both branches.
- Align Symfony API usage to the **lowest** minor’s Symfony version, not trunk’s.

## Modernization tooling

Cross-version PHP/Symfony upgrades: **Rector** + `frosh/shopware-rector` — dry-run,
review, then apply ([`version-compatibility.md`](version-compatibility.md)). Do not
transcribe Rector rules into this repo.

## Done

- [ ] Supported Shopware/Symfony range identified from `composer.json` / lockfile.
- [ ] Custom HTTP/time/validation/queue code justified, or replaced with Symfony on pinned version.
- [ ] Platform APIs used for DAL, cache, migrations, routes — not reimplemented.
- [ ] No deprecated Shopware extension API copied from old core examples.
