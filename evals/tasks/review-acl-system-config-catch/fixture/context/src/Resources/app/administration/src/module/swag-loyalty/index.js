import './page/swag-loyalty-list';

Shopware.Module.register('swag-loyalty', {
    type: 'plugin',
    name: 'swag-loyalty',
    title: 'swag-loyalty.general.mainMenuItemGeneral',
    description: 'swag-loyalty.general.descriptionTextModule',
    color: '#9AA8B5',
    icon: 'regular-star',

    routes: {
        list: {
            component: 'swag-loyalty-list',
            path: 'list',
            meta: {
                privilege: 'swag_loyalty.viewer',
            },
        },
    },

    navigation: [{
        id: 'swag-loyalty',
        label: 'swag-loyalty.general.mainMenuItemGeneral',
        path: 'swag.loyalty.list',
        parent: 'sw-customer',
        privilege: 'swag_loyalty.viewer',
    }],
});
