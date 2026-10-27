# Task: review follow-up on ProductLoader

A reviewer flagged `fixture/ProductLoader.php` in our plugin as a production
risk for merchants with big catalogs. Fix it. Keep the read going through the
product repository (no raw SQL) and keep `loadAll()` returning product IDs.
