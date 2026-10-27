Hi all, I maintain a small shipping plugin for Shopware 6.6 and now want to
support 6.7 too. I subscribe to `ProductEvents::PRODUCT_LOADED_EVENT` and
change the product's custom fields in there, and I add a new column to my
own table in a migration. Is there anything I should watch out for when I
bump the composer constraint to cover both versions? Should I ship one
plugin version for both or two separate ones?
