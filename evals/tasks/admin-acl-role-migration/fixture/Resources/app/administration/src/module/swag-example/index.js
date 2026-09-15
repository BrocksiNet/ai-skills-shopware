Shopware.Module.register('swag-example', {
    type: 'plugin',
    name: 'swag-example',
    routes: {
        list: {
            component: 'swag-example-list',
            path: 'list',
        },
    },
});
