```text
Hello Ms. Hoffmann,

thank you for the detailed description.

The cart calculates prices live, but the product pages come from the HTTP
cache. Pages that were cached before the price change can still show the old
price until the cache entry expires or the products are indexed again.

Please clear the cache once:

1. Open the Administration.
2. Go to Settings > System > Caches & indexes.
3. Click "Clear caches", then "Update indexes".

If you run a reverse proxy such as Varnish or a CDN in front of the shop,
please purge it as well.

After that every customer should see the new prices. If some pages still show
old prices, send us the product numbers and we will check them directly.

Kind regards
Your Shopware Support
```
