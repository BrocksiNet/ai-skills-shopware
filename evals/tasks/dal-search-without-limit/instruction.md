# Task: bound DAL search

Fix `fixture/ProductLoader.php` so product reads use a **bounded** Criteria
(`setLimit` or equivalent pagination). Keep the repository-based read; do not
switch to raw SQL.
