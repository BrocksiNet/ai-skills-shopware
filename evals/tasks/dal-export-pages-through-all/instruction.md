# Task: nightly export of a category's product IDs

Implement `execute()` in `src/Command/ExportCategoryProductsCommand.php`. It
writes the IDs of all products assigned to the category in the first argument
to the file in the second argument, one ID per line. Operations runs the
command every night for each category of the catalog, so it has to finish
reliably. Inject what else the command needs.
