# Task: add a stock badge component to the Administration

The `sw-stock` module in `src/Administration/Resources/app/administration/src/module/sw-stock/`
has one component, `sw-stock-legacy-card`. Add a second one.

- Create `sw-stock-badge` in `component/sw-stock-badge/` with its template.
- It takes a required `productId` prop and loads the product through the
  `product` repository.
- A `save()` method saves the product, reloads it and shows a success
  notification.
- Register it in the module's `index.ts` the way `sw-stock-legacy-card` is
  registered.
