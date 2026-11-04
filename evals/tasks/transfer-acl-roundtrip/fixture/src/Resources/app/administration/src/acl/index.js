Shopware.Service('privileges').addPrivilegeMappingEntry({
    category: 'permissions', parent: 'settings', key: 'swag_delivery_zone',
    privileges: {
        viewer: ['swag_delivery_zone:read'],
        editor: ['swag_delivery_zone:update'],
        creator: ['swag_delivery_zone:create'],
        deleter: ['swag_delivery_zone:delete'],
    },
});
