# Task: no hardcoded access key

Refactor `fixture/StoreApiConfig.php` so the sales channel access key is **not
hardcoded**. Load it from environment (e.g. `getenv('SW_ACCESS_KEY')`) with a
clear placeholder comment for local setup.
