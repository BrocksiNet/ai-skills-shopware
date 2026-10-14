Hello Ms. Hoffmann,

Great question! The cart calculates prices live — but the product pages come
from the HTTP cache. Please clear it once:

```text
Settings > System > Caches & indexes > Clear caches
```

If you run Varnish or a CDN, purge it as well.

I hope this helps!
