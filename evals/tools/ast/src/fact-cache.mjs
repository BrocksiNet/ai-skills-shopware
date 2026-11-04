import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { phpClass, serviceState, methodValue } from "./fact-php.mjs";
const eventName = "Shopware\\Storefront\\Page\\Product\\ProductPageLoadedEvent";
export function cacheOutcome(workdir) {
  const parsed = phpClass(
    workdir,
    "src/Subscriber/DeliveryBadgeSubscriber.php",
    "DeliveryBadgeSubscriber",
  );
  const xml = readFileSync(resolve(workdir, "src/Resources/config/services.xml"), "utf8");
  assert.match(
    xml,
    /Swag\\DeliveryTools\\Subscriber\\DeliveryBadgeSubscriber/u,
    "subscriber service retained",
  );
  for (const hasAddTag of [false, true])
    for (const channel of ["channel-a", "channel-b"]) {
      const collected = [];
      const invalidated = [];
      const collector = hasAddTag ? { addTag: (...tags) => collected.push(...tags) } : {};
      const services = {
        "Shopware\\Core\\Framework\\Adapter\\Cache\\CacheTagCollector": collector,
        "Shopware\\Core\\Framework\\Adapter\\Cache\\CacheInvalidator": {
          invalidate: (tags) => invalidated.push(...tags),
        },
        "Symfony\\Contracts\\EventDispatcher\\EventDispatcherInterface": {
          dispatch: (event) => {
            assert.ok(Array.isArray(event.tags), "dispatch AddCacheTagEvent");
            collected.push(...event.tags);
            return event;
          },
        },
      };
      const state = serviceState(
        parsed,
        (type) => {
          assert.ok(type in services, `known service ${type}`);
          return services[type];
        },
        { hasAddTag, collector, version: hasAddTag ? "6.7.2+" : "6.7.0" },
      );
      const subscriptions = methodValue(state, "getSubscribedEvents");
      const listener = subscriptions[eventName];
      const method = typeof listener === "string" ? listener : listener?.[0];
      assert.equal(typeof method, "string", "ProductPageLoadedEvent subscription retained");
      methodValue(state, method, [
        { getSalesChannelContext: () => ({ getSalesChannelId: () => channel }) },
      ]);
      assert.deepEqual(
        collected,
        [`delivery-badge-${channel}`],
        "one channel-specific cache tag collected",
      );
      methodValue(state, "invalidate", [channel]);
      assert.deepEqual(invalidated, collected, "invalidation uses the collected tag");
    }
}
