# Task: use repository not Connection

Refactor `fixture/OrderReader.php` to load orders via `EntityRepository` and
`Criteria` instead of raw DBAL `Connection` SQL.
