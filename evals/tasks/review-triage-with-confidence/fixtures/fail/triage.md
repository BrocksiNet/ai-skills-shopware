## T1

Fix. The reviewer is right: `getDeliveryTime()` is nullable. Use the nullsafe
operator and add a test.

## T2

Reply. The service is public because the integration test fetches it from the
container.

## T3

Push back. The coding guidelines forbid `empty()`, the explicit check stays.
