# PR #21877: Add delivery time to the product listing Store-API response

## T1 — @reviewer-a on `src/Core/Content/Product/SalesChannel/Listing/ProductListingLoader.php:88`

```php
$deliveryTime = $product->getDeliveryTime()->getName();
```

> `getDeliveryTime()` is nullable. Products without a delivery time will crash
> the whole listing here.

## T2 — @reviewer-b on `src/Core/Content/Product/DependencyInjection/listing.xml:41`

```xml
<service id="Shopware\Core\Content\Product\SalesChannel\Listing\DeliveryTimeFormatter" public="true"/>
```

> Why is this service public?

Context: `DeliveryTimeFormatterTest` (an integration test) fetches the service
with `static::getContainer()->get(DeliveryTimeFormatter::class)`.

## T3 — @reviewer-c on `src/Core/Content/Product/SalesChannel/Listing/DeliveryTimeFormatter.php:23`

```php
if ($min === null || $min === 0) {
    return null;
}
```

> Nit: just use `empty($min)` here, it is shorter.

Context: the Shopware coding guidelines forbid `empty()` and ask for explicit
checks. `$min` is `?int`.
