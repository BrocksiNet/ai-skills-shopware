# Task: repair this Shopware plugin

A merchant on Shopware 6.7.0 reports a fatal error when the product page loads; the same released plugin works on 6.7.3. Repair DeliveryBadgeSubscriber for every release allowed by composer.json. Keep the product-page subscription, the sales-channel-specific delivery-badge tag, and matching invalidation; do not disable HTTP caching or move the logic to a deprecated cache-tags event. Keep the existing services and public methods. Make the smallest compatible fix.

Before editing, check the installed local Shopware guidance for this change and read the relevant references. Do not add dependencies or change the advertised Shopware range. Implement the fix, then summarize the decision and what you verified.
