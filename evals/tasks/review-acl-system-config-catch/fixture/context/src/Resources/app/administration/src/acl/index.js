Shopware.Service('privileges').addPrivilegeMappingEntry({
    category: 'permissions',
    parent: 'swag_loyalty',
    key: 'swag_loyalty',
    roles: {
        viewer: {
            privileges: ['swag_loyalty_program:read'],
            dependencies: [],
        },
        editor: {
            privileges: ['swag_loyalty_program:update'],
            dependencies: ['swag_loyalty.viewer'],
        },
    },
});
