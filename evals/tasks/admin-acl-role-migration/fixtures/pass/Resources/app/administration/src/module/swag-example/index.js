Shopware.Service('privileges').addPrivilegeMappingEntry({
    category: 'permissions',
    parent: null,
    key: 'swag_example',
    privileges: {
        viewer: ['product:read'],
    },
});

Shopware.Module.register('swag-example', {
    type: 'plugin',
    name: 'swag-example',
    routes: {
        list: {
            component: 'swag-example-list',
            path: 'list',
            privilege: 'swag_example.viewer',
        },
    },
});
