# Task: maintain this Shopware extension

The Administration extension in src/Resources/app/administration/src/extension/order-delivery/index.js needs to refreshDeliveryBadge after an order is saved. Make its onSave override compose with core and other extensions, forward all arguments, preserve the inherited result, and refresh exactly once only after a successful save. A rejected save must propagate unchanged and must not refresh. Keep the component registration and do not add dependencies.

Implement the change in the provided files. Use local guidance when useful. Summarize what you changed and what you verified.
