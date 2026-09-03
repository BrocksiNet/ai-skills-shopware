<?php declare(strict_types=1);

// Token-only notes. Not a MigrationStep and no executable update().
// UPDATE acl_role
// SET privileges = JSON_ARRAY_APPEND(privileges, '$', :privilege)
// WHERE JSON_CONTAINS(privileges, JSON_QUOTE('swag_example.viewer'))
//   AND NOT JSON_CONTAINS(privileges, JSON_QUOTE('product:read'))
// product:read
// acl_role
