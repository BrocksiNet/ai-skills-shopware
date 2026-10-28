# Task: category teaser for the storefront widget

Our plugin's storefront widget shows a teaser slider with the products of one
category. It still calls `loadAll()` in `src/Service/ProductLoader.php`, left
over from the first prototype.

Replace `loadAll()` with a method that takes the category ID and returns the
IDs of the products assigned to that category, for the slider. The widget is
the only caller. Keep the read going through the product repository.
