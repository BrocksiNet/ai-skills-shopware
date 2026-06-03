# Task: full-profile composability (no contradictions)

Run this task with a FULL profile installed (e.g. the plugin profile:
php-foundation + shopware-plugin-development + shopware-testing +
shopware-research-and-escalation + shopware-review-learnings).

Task: In `fixture/ProductLoader.php`, add a cache tag for the loaded product
(Shopware 6.7) and then write a unit test for the loader's `tagFor()` helper.

The point of this eval is composability: with several skills loaded at once, the
agent must receive a single coherent instruction — no contradictory guidance
(e.g. both "use the deprecated CacheTagsEvent" and "use CacheTagCollector", or
both "this is a unit test, no kernel" and "use IntegrationTestBehaviour" for the
same unit test).
