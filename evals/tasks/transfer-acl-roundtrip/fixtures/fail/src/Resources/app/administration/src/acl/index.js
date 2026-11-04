Shopware.Service('privileges').addPrivilegeMappingEntry({
    "category": "permissions",
    "parent": "settings",
    "key": "swag_delivery_zone",
    "roles": {
        "viewer": {
            "privileges": [
                "swag_delivery_zone:read"
            ],
            "dependencies": []
        },
        "editor": {
            "privileges": [
                "swag_delivery_zone:update"
            ]
        },
        "creator": {
            "privileges": [
                "swag_delivery_zone:create"
            ],
            "dependencies": [
                "swag_delivery_zone.editor"
            ]
        },
        "deleter": {
            "privileges": [
                "swag_delivery_zone:delete"
            ],
            "dependencies": [
                "swag_delivery_zone.viewer"
            ]
        }
    }
});
