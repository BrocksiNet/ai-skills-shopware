# Task: filter ProductLoader by category

Our plugin's storefront widget calls `ProductLoader::loadAll()` in
`fixture/ProductLoader.php` to get product IDs. Add a category ID parameter so
it returns only the products assigned to that category. Keep the read going
through the product repository and keep returning product IDs.
