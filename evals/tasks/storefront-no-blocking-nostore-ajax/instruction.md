# Task: slow listing pages under load

Since our plugin shipped, category listing pages are slow at traffic peaks
and every request reaches PHP. `ListingPageController.php` and the
storefront plugin under `Resources/app/storefront/` are involved. Fix the
cause. Logged-in customers must still see their personalized prices.
