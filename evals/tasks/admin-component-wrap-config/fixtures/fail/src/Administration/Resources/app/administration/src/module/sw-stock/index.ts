/**
 * @sw-package inventory
 */
Shopware.Component.register('sw-stock-legacy-card', () => import('./component/sw-stock-legacy-card'));
Shopware.Component.register('sw-stock-badge', () => import('./component/sw-stock-badge'));

Shopware.Module.register('sw-stock', {
    type: 'core',
    name: 'stock',
    title: 'sw-stock.general.mainMenuItemGeneral',
    color: '#57D9A3',
    icon: 'regular-products',
    routes: {
        index: {
            component: 'sw-stock-legacy-card',
            path: 'index',
        },
    },
});
