# Task: least-privilege Shopware app manifest

This Shopware 6 app's `manifest.xml` currently requests overly broad
permissions. Tighten `<permissions>` to follow Shopware app least-privilege
manifest conventions so the app can only read products and orders (no write
permissions and no wildcards).
