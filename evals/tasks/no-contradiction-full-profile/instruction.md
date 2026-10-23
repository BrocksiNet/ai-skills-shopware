# Task: full-profile composability (no contradictions)

Run this task with a FULL set of skills installed (e.g. the plugin + app
use-cases together: sw-php-foundation + sw-plugin-development +
sw-app-development + sw-testing + sw-research-and-escalation +
sw-review-learnings).

Task: In `fixture/ProductLoader.php`, add a cache tag for the loaded product
(Shopware 6.7) and then write a unit test for the loader's `tagFor()` helper.

The point of this eval is composability: with several skills loaded at once, the
agent must receive a single coherent instruction — no contradictory guidance
(e.g. both "use the deprecated CacheTagsEvent" and "use CacheTagCollector", or
both "this is a unit test, no kernel" and "use IntegrationTestBehaviour" for the
same unit test).
