Shopware.Service('privileges').addPrivilegeMappingEntry({
    category: 'permissions',
    parent: null,
    key: 'swag_example',
});

const leftover = {
    roles: {
        viewer: {
            privileges: ['product:read'],
            dependencies: [],
        },
    },
};

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
