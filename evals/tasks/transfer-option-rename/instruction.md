# Task: maintain this Shopware extension

A released Shopware plugin has a DeliveryNote widget. Add handlingFee as the preferred option name. Existing themes that pass legacySurcharge must keep their behavior, including zero; when both names are supplied the new name wins, including zero. Keep the default fee of 5, total(base), and the released registration. Work in src/Resources/app/storefront/src/plugin/delivery-note.plugin.js. Keep the existing module entry points and do not add dependencies.

Implement the change in the provided files. Use local guidance when useful. Summarize what you changed and what you verified.
