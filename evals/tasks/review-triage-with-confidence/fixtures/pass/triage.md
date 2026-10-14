## T1

Fix (95%). The reviewer is right: `getDeliveryTime()` returns `?DeliveryTimeEntity`.
Guard it with the nullsafe operator and add a test with a product without a
delivery time.

## T2

Reply (80%). The service is public only because the integration test fetches
it from the container. Explain that, or switch the test to construct the
formatter directly and drop `public="true"`.

## T3

Push back (90%). The coding guidelines forbid `empty()`; the explicit check is
intended. Suggested reply: "We keep the explicit check because the coding
guidelines ask us to avoid empty(). It also keeps the 0 case visible."
