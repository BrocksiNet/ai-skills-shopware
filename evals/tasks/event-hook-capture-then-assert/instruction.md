# Task: prove the restock notification is dispatched

`Swag\Restock\ProductRestockNotifier` dispatches a `ProductRestockedEvent`
when a product comes back in stock. The service is wired in the plugin
container.

Fill in `testNotifyDispatchesRestockedEvent()` in
`tests/integration/ProductRestockNotifierTest.php`, or replace it with a
better-placed test. The test must prove that calling `notify()` with a
positive stock dispatches `ProductRestockedEvent` carrying the product id.

Only change test files.
