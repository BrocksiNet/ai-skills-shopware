# Task: review follow-up on OrderReader

Code review on our plugin flagged `fixture/OrderReader.php` as not following
Shopware conventions. Rework it so it does. `loadOrderIds()` must still return
up to 50 order IDs as hex strings.
