# Task: repair this Shopware plugin

This single Administration bundle is shipped for Shopware 6.5 and 6.6. The receipt-caption editor saves correctly on 6.5, but changes appear lost after Save on 6.6. Repair the field binding so a changed or empty caption is submitted on both versions. Keep the existing sw-text-field, Twig component, registration name, save() entry point, and unrelated footerCode value. Do not add a second bundle or migrate the component to an SFC.

Before editing, check the installed local Shopware guidance for this change and read the relevant references. Do not add dependencies or change the advertised Shopware range. Implement the fix, then summarize the decision and what you verified.
