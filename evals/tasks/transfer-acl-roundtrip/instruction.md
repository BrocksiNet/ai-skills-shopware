# Task: prepare this Shopware plugin release

The next Shopware 6.7 delivery-zone release adds a DAL entity. Its working-tree Administration privilege registration is broken, and the existing migration is an **unshipped stub that has never run**. Fix the registration and complete that non-destructive migration before first deployment. Keep main.js, the ACL registration entry point, and the migration identity.

The feature key and entity are both swag_delivery_zone. A viewer may read zones; an editor inherits viewer and may update; a creator inherits editor and may create; a deleter inherits viewer and may delete. The persisted role snapshots in data/existing-roles.json include the inherited feature keys, as Shopware's role-save workflow does. Extend those roles with their entity capabilities and preserve unrelated privileges. A role holding no delivery-zone role must stay unchanged. Use the platform migration mechanism instead of rewriting acl_role JSON or granting system_config privileges. Do not alter the supplied snapshots.

Before editing, check the installed local Shopware guidance for this change and read the relevant references. Do not add dependencies or change the advertised Shopware range. Implement the fix, then summarize the decision and what you verified.
