Shopware.Service('privileges').addPrivilegeMappingEntry({
    category: 'permissions',
    parent: null,
    key: 'swag_example',
    roles: {
        viewer: {
            privileges: ['product:read'],
            dependencies: [],
        },
    },
});
